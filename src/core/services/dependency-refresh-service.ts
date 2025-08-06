/**
 * Dependency Refresh Service - Functional Programming Approach
 * Pure functions for refreshing SQL model dependencies, replacing RefreshDependenciesCommand
 */

import { SqlModelEntity } from '@core/entities/sql-model';
import { SqlDecomposerParser } from '@/adapters/parsers/sql-decomposer-parser';

// Types for functional approach
export interface RefreshDependenciesParams {
  readonly targetModel: SqlModelEntity;
  readonly availableModels: ReadonlyArray<SqlModelEntity>;
  readonly useEditorContent: boolean;
}

export interface RefreshDependenciesResult {
  readonly success: boolean;
  readonly originalDependencies: ReadonlyArray<string>;
  readonly newDependencies: ReadonlyArray<string>;
  readonly error?: string;
}

export interface DependencyAnalysis {
  readonly modelName: string;
  readonly sqlContent: string;
  readonly detectedDependencies: ReadonlyArray<string>;
  readonly availableDependencies: ReadonlyArray<string>;
}

// Pure validation functions
export const validateRefreshParams = (params: RefreshDependenciesParams): string[] => {
  const errors: string[] = [];
  
  if (!params.targetModel) {
    errors.push('Target model is required');
  }
  
  if (!params.availableModels || params.availableModels.length === 0) {
    errors.push('Available models list is required');
  }
  
  return errors;
};

// Pure function to extract SQL content
const getSqlContentToAnalyze = (model: SqlModelEntity, useEditorContent: boolean): string => {
  return useEditorContent ? model.editorContent : model.sqlWithoutCte;
};

// Pure function to analyze dependencies
export const analyzeDependencies = async (
  model: SqlModelEntity,
  availableModels: ReadonlyArray<SqlModelEntity>,
  useEditorContent: boolean
): Promise<DependencyAnalysis> => {
  const sqlContent = getSqlContentToAnalyze(model, useEditorContent);
  
  // Extract dependencies from SQL content
  const parser = new SqlDecomposerParser();
  const detectedDependencies = await parser.extractDependencies(sqlContent);
  
  // Find available dependencies that match detected ones
  const availableDependencies = availableModels
    .filter(m => m.type === 'cte' && detectedDependencies.includes(m.name))
    .map(m => m.name);
  
  return {
    modelName: model.name,
    sqlContent,
    detectedDependencies,
    availableDependencies,
  };
};

// Pure function to create dependency update plan
interface DependencyUpdatePlan {
  readonly toRemove: ReadonlyArray<string>;
  readonly toAdd: ReadonlyArray<string>;
  readonly unchanged: ReadonlyArray<string>;
}

const createDependencyUpdatePlan = (
  currentDeps: ReadonlyArray<string>,
  newDeps: ReadonlyArray<string>
): DependencyUpdatePlan => {
  const currentSet = new Set(currentDeps);
  const newSet = new Set(newDeps);
  
  const toRemove = currentDeps.filter(dep => !newSet.has(dep));
  const toAdd = newDeps.filter(dep => !currentSet.has(dep));
  const unchanged = currentDeps.filter(dep => newSet.has(dep));
  
  return { toRemove, toAdd, unchanged };
};

// Pure function to apply dependency updates (this modifies the model but is isolated)
const applyDependencyUpdates = (
  targetModel: SqlModelEntity,
  availableModels: ReadonlyArray<SqlModelEntity>,
  updatePlan: DependencyUpdatePlan
): string[] => {
  // Clear current dependencies
  targetModel.dependents = [];
  
  // Add new dependencies
  const addedDependencies: string[] = [];
  for (const depName of updatePlan.toAdd.concat(updatePlan.unchanged)) {
    const depModel = availableModels.find(m => m.name === depName && m.type === 'cte');
    if (depModel) {
      targetModel.addDependency(depModel);
      addedDependencies.push(depName);
    }
  }
  
  return addedDependencies;
};

// Main dependency refresh function
export const refreshModelDependencies = async (params: RefreshDependenciesParams): Promise<RefreshDependenciesResult> => {
  // Validate input
  const validationErrors = validateRefreshParams(params);
  if (validationErrors.length > 0) {
    return {
      success: false,
      originalDependencies: [],
      newDependencies: [],
      error: `Validation failed: ${validationErrors.join(', ')}`
    };
  }
  
  try {
    const { targetModel, availableModels, useEditorContent } = params;
    
    // Backup original dependencies
    const originalDependencies = targetModel.dependents.map(d => d.name);
    
    // Analyze dependencies
    const analysis = await analyzeDependencies(targetModel, availableModels, useEditorContent);
    
    // Create update plan
    const updatePlan = createDependencyUpdatePlan(originalDependencies, analysis.availableDependencies);
    
    // Apply updates
    const newDependencies = applyDependencyUpdates(targetModel, availableModels, updatePlan);
    
    console.log('[DEBUG] Dependencies refreshed:', {
      targetModelName: targetModel.name,
      originalCount: originalDependencies.length,
      newCount: newDependencies.length,
      added: updatePlan.toAdd,
      removed: updatePlan.toRemove,
      unchanged: updatePlan.unchanged
    });
    
    return {
      success: true,
      originalDependencies,
      newDependencies
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DEBUG] Dependency refresh failed:', errorMessage);
    
    return {
      success: false,
      originalDependencies: params.targetModel.dependents.map(d => d.name),
      newDependencies: [],
      error: errorMessage
    };
  }
};

// Safe execution wrapper
export const refreshModelDependenciesSafe = async (params: RefreshDependenciesParams): Promise<RefreshDependenciesResult> => {
  try {
    return await refreshModelDependencies(params);
  } catch (error) {
    return {
      success: false,
      originalDependencies: [],
      newDependencies: [],
      error: `Safe execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Utility functions for dependency operations
export const getDependencyStats = (models: ReadonlyArray<SqlModelEntity>) => {
  const totalModels = models.length;
  const cteModels = models.filter(m => m.type === 'cte').length;
  const modelsWithDeps = models.filter(m => m.dependents.length > 0).length;
  const totalDependencies = models.reduce((sum, m) => sum + m.dependents.length, 0);
  
  return {
    totalModels,
    cteModels,
    modelsWithDeps,
    totalDependencies,
    avgDependenciesPerModel: totalModels > 0 ? totalDependencies / totalModels : 0
  };
};

export const validateDependencyIntegrity = (models: ReadonlyArray<SqlModelEntity>): string[] => {
  const issues: string[] = [];
  const modelNames = new Set(models.map(m => m.name));
  
  for (const model of models) {
    for (const dependent of model.dependents) {
      if (!modelNames.has(dependent.name)) {
        issues.push(`Model "${model.name}" has invalid dependency on "${dependent.name}"`);
      }
    }
  }
  
  return issues;
};

export const findCircularDependencies = (models: ReadonlyArray<SqlModelEntity>): string[] => {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[] = [];
  
  const detectCycle = (modelName: string, path: string[]): void => {
    if (recursionStack.has(modelName)) {
      const cycleStart = path.indexOf(modelName);
      const cyclePath = path.slice(cycleStart).concat(modelName);
      cycles.push(`Circular dependency: ${cyclePath.join(' -> ')}`);
      return;
    }
    
    if (visited.has(modelName)) {
      return;
    }
    
    visited.add(modelName);
    recursionStack.add(modelName);
    
    const model = models.find(m => m.name === modelName);
    if (model) {
      for (const dependent of model.dependents) {
        detectCycle(dependent.name, [...path, modelName]);
      }
    }
    
    recursionStack.delete(modelName);
  };
  
  for (const model of models) {
    if (!visited.has(model.name)) {
      detectCycle(model.name, []);
    }
  }
  
  return cycles;
};
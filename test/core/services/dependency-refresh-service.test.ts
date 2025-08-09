/**
 * Dependency Refresh Service Tests
 * Testing functional programming approach for dependency management
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  refreshModelDependencies,
  refreshModelDependenciesSafe,
  validateRefreshParams,
  analyzeDependencies,
  getDependencyStats,
  validateDependencyIntegrity,
  findCircularDependencies,
  type RefreshDependenciesParams,
} from '@core/services/dependency-refresh-service';
import { SqlModelEntity } from '@core/entities/sql-model';

describe('Dependency Refresh Service', () => {
  let targetModel: SqlModelEntity;
  let dependencyModel1: SqlModelEntity;
  let dependencyModel2: SqlModelEntity;
  let availableModels: SqlModelEntity[];
  let validParams: RefreshDependenciesParams;

  beforeEach(() => {
    // Create target model
    targetModel = {
      name: 'main_query',
      type: 'main',
      editorContent: 'SELECT * FROM cte1 JOIN cte2 ON cte1.id = cte2.id',
      sqlWithoutCte: 'SELECT * FROM cte1 JOIN cte2 ON cte1.id = cte2.id',
      dependents: [],
      addDependency: function(dep: SqlModelEntity) {
        this.dependents.push(dep);
      },
    } as any;

    // Create dependency models
    dependencyModel1 = {
      name: 'cte1',
      type: 'cte',
      dependents: [],
    } as any;

    dependencyModel2 = {
      name: 'cte2',
      type: 'cte',
      dependents: [],
    } as any;

    availableModels = [targetModel, dependencyModel1, dependencyModel2];

    validParams = {
      targetModel,
      availableModels,
      useEditorContent: true,
    };
  });

  describe('validateRefreshParams', () => {
    test('should return no errors for valid parameters', () => {
      const errors = validateRefreshParams(validParams);
      expect(errors).toHaveLength(0);
    });

    test('should return error for missing target model', () => {
      const params = { ...validParams, targetModel: undefined as any };
      const errors = validateRefreshParams(params);
      expect(errors).toContain('Target model is required');
    });

    test('should return error for empty available models', () => {
      const params = { ...validParams, availableModels: [] };
      const errors = validateRefreshParams(params);
      expect(errors).toContain('Available models list is required');
    });
  });

  describe('analyzeDependencies', () => {
    test('should analyze dependencies from editor content', async () => {
      const analysis = await analyzeDependencies(targetModel, availableModels, true);
      
      expect(analysis.modelName).toBe('main_query');
      expect(analysis.sqlContent).toBe(targetModel.editorContent);
      expect(analysis.detectedDependencies).toContain('cte1');
      expect(analysis.detectedDependencies).toContain('cte2');
      expect(analysis.availableDependencies).toContain('cte1');
      expect(analysis.availableDependencies).toContain('cte2');
    });

    test('should analyze dependencies from sqlWithoutCte', async () => {
      const analysis = await analyzeDependencies(targetModel, availableModels, false);
      
      expect(analysis.sqlContent).toBe(targetModel.sqlWithoutCte);
    });

    test('should only include CTE models in available dependencies', async () => {
      const mainModel = {
        name: 'main_table',
        type: 'main',
      } as SqlModelEntity;
      
      const modelsWithMain = [...availableModels, mainModel];
      
      const analysis = await analyzeDependencies(targetModel, modelsWithMain, true);
      
      expect(analysis.availableDependencies).not.toContain('main_table');
      expect(analysis.availableDependencies).toContain('cte1');
      expect(analysis.availableDependencies).toContain('cte2');
    });
  });

  describe('refreshModelDependencies', () => {
    test('should successfully refresh dependencies', async () => {
      // Add some initial dependencies to test replacement
      targetModel.dependents = [dependencyModel1];
      
      const result = await refreshModelDependencies(validParams);
      
      expect(result.success).toBe(true);
      expect(result.originalDependencies).toEqual(['cte1']);
      expect(result.newDependencies).toContain('cte1');
      expect(result.newDependencies).toContain('cte2');
      expect(result.error).toBeUndefined();
    });

    test('should handle validation errors', async () => {
      const invalidParams = { ...validParams, targetModel: undefined as any };
      const result = await refreshModelDependencies(invalidParams);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    test('should handle parser errors gracefully', async () => {
      // Create a model with invalid SQL that would cause parser to throw
      targetModel.editorContent = 'INVALID SQL SYNTAX!!!';
      
      const result = await refreshModelDependencies(validParams);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should clear dependencies when none detected', async () => {
      targetModel.editorContent = 'SELECT 1 as value';
      targetModel.dependents = [dependencyModel1, dependencyModel2];
      
      const result = await refreshModelDependencies(validParams);
      
      expect(result.success).toBe(true);
      expect(result.newDependencies).toHaveLength(0);
      expect(targetModel.dependents).toHaveLength(0);
    });
  });

  describe('refreshModelDependenciesSafe', () => {
    test('should handle exceptions gracefully', async () => {
      // Force an exception by corrupting the target model
      const corruptParams = {
        ...validParams,
        targetModel: null as any,
      };
      
      const result = await refreshModelDependenciesSafe(corruptParams);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Safe execution failed');
    });
  });

  describe('getDependencyStats', () => {
    test('should calculate correct statistics', () => {
      // Setup dependencies
      targetModel.dependents = [dependencyModel1, dependencyModel2];
      dependencyModel1.dependents = [dependencyModel2];
      
      const stats = getDependencyStats(availableModels);
      
      expect(stats.totalModels).toBe(3);
      expect(stats.cteModels).toBe(2);
      expect(stats.modelsWithDeps).toBe(2);
      expect(stats.totalDependencies).toBe(3);
      expect(stats.avgDependenciesPerModel).toBe(1);
    });

    test('should handle empty models list', () => {
      const stats = getDependencyStats([]);
      
      expect(stats.totalModels).toBe(0);
      expect(stats.avgDependenciesPerModel).toBe(0);
    });
  });

  describe('validateDependencyIntegrity', () => {
    test('should detect invalid dependencies', () => {
      const missingModel = { name: 'missing_model' } as SqlModelEntity;
      targetModel.dependents = [missingModel];
      
      const issues = validateDependencyIntegrity(availableModels);
      
      expect(issues).toContain(
        'Model "main_query" has invalid dependency on "missing_model"'
      );
    });

    test('should return no issues for valid dependencies', () => {
      targetModel.dependents = [dependencyModel1];
      
      const issues = validateDependencyIntegrity(availableModels);
      
      expect(issues).toHaveLength(0);
    });
  });

  describe('findCircularDependencies', () => {
    test('should detect simple circular dependency', () => {
      // Create circular dependency: cte1 -> cte2 -> cte1
      dependencyModel1.dependents = [dependencyModel2];
      dependencyModel2.dependents = [dependencyModel1];
      
      const cycles = findCircularDependencies([dependencyModel1, dependencyModel2]);
      
      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain('Circular dependency');
      expect(cycles[0]).toContain('cte1');
      expect(cycles[0]).toContain('cte2');
    });

    test('should detect self-referencing dependency', () => {
      dependencyModel1.dependents = [dependencyModel1];
      
      const cycles = findCircularDependencies([dependencyModel1]);
      
      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain('cte1 -> cte1');
    });

    test('should return empty array for acyclic dependencies', () => {
      targetModel.dependents = [dependencyModel1];
      dependencyModel1.dependents = [dependencyModel2];
      
      const cycles = findCircularDependencies(availableModels);
      
      expect(cycles).toHaveLength(0);
    });

    test('should handle models with no dependencies', () => {
      const cycles = findCircularDependencies(availableModels);
      
      expect(cycles).toHaveLength(0);
    });
  });
});
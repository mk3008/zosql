/**
 * Refresh Dependencies Command
 * Application Layer - Command for refreshing model dependencies during validation
 */

import { SqlModelEntity } from '@core/entities/sql-model';
import { SqlDecomposerParser } from '@/adapters/parsers/sql-decomposer-parser';

export interface RefreshDependenciesContext {
  /** The model to refresh dependencies for */
  targetModel: SqlModelEntity;
  /** All available models in the workspace */
  availableModels: SqlModelEntity[];
  /** Whether to use editor content or saved content */
  useEditorContent: boolean;
}

export interface RefreshDependenciesResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Original dependencies before refresh */
  originalDependencies: string[];
  /** New dependencies after refresh */
  newDependencies: string[];
  /** Error message if operation failed */
  error?: string;
}

/**
 * Command to refresh dependencies for a SQL model based on actual SQL content
 */
export class RefreshDependenciesCommand {
  constructor(private context: RefreshDependenciesContext) {}

  async execute(): Promise<RefreshDependenciesResult> {
    const { targetModel, availableModels, useEditorContent } = this.context;
    
    try {
      // Get the SQL content to analyze
      const sqlContent = useEditorContent ? targetModel.editorContent : targetModel.sqlWithoutCte;
      
      // Extract dependencies from the SQL content
      const parser = new SqlDecomposerParser();
      const detectedDependencies = await parser.extractDependencies(sqlContent);
      
      console.log('[DEBUG] RefreshDependenciesCommand:', {
        targetModelName: targetModel.name,
        currentDependents: targetModel.dependents.map(d => d.name),
        detectedDependencies,
        sqlContentPreview: sqlContent.substring(0, 100) + '...'
      });
      
      // Backup original dependencies
      const originalDependencies = targetModel.dependents.map(d => d.name);
      
      // Clear current dependencies
      targetModel.dependents = [];
      
      // Add dependencies for each detected reference
      const newDependencies: string[] = [];
      for (const depName of detectedDependencies) {
        const depModel = availableModels.find(m => m.name === depName && m.type === 'cte');
        if (depModel) {
          targetModel.addDependency(depModel);
          newDependencies.push(depName);
          console.log('[DEBUG] Added dependency:', depName);
        }
      }
      
      console.log('[DEBUG] Dependencies refreshed:', {
        targetModelName: targetModel.name,
        originalDependenciesCount: originalDependencies.length,
        newDependenciesCount: newDependencies.length,
        newDependencyNames: newDependencies
      });
      
      return {
        success: true,
        originalDependencies,
        newDependencies
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DEBUG] RefreshDependenciesCommand failed:', errorMessage);
      
      return {
        success: false,
        originalDependencies: targetModel.dependents.map(d => d.name),
        newDependencies: [],
        error: errorMessage
      };
    }
  }
}
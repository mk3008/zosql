/**
 * useMainContentExecution - SQL execution logic extracted from ViewModel
 * Phase 3: Complete execution functionality without ViewModel
 */

import { useCallback } from 'react';
import { WorkspaceEntity, Tab, QueryExecutionResult } from '@shared/types';
import { SqlModelEntity } from '@core/entities/sql-model';
import { executeSqlSafely } from '@core/services/sql-execution-service';
import { formatSqlSafely } from '@core/services/workspace-service';
import { createErrorResult } from '@core/types/query-types';
import { DebugLogger } from '../../utils/debug-logger';

export interface UseMainContentExecutionReturn {
  executeQuery: (
    activeTab: Tab | null,
    workspace: WorkspaceEntity | null,
    tabModelMap: Map<string, SqlModelEntity>,
    onSuccess: (result: QueryExecutionResult) => void,
    onError: (error: string) => void,
    onSqlExecuted?: (sql: string) => void
  ) => Promise<void>;
  
  executeDataTabQueries: (
    workspace: WorkspaceEntity,
    onSuccess: (results: Map<string, QueryExecutionResult>) => void,
    onError: (error: string) => void
  ) => Promise<void>;
  
  formatQuery: (
    activeTab: Tab | null,
    workspace: WorkspaceEntity,
    onSuccess: (formattedSql: string) => void,
    onError: (error: string) => void
  ) => Promise<void>;
  
  runStaticAnalysis: (
    workspace: WorkspaceEntity,
    tabs: Tab[],
    saveTab: (tabId: string) => void,
    onAnalysisComplete: () => void
  ) => Promise<void>;
}

/**
 * Execution logic hook - replaces MainContentViewModel execution methods
 */
export function useMainContentExecution(): UseMainContentExecutionReturn {
  
  const executeQuery = useCallback(async (
    activeTab: Tab | null,
    workspace: WorkspaceEntity | null,
    tabModelMap: Map<string, SqlModelEntity>,
    onSuccess: (result: QueryExecutionResult) => void,
    onError: (error: string) => void,
    onSqlExecuted?: (sql: string) => void
  ) => {
    if (!activeTab || !workspace) {
      onError('No active tab or workspace');
      return;
    }
    
    try {
      DebugLogger.debug('useMainContentExecution', `Executing query for tab: ${activeTab.id}`);
      
      // Get the model for the active tab
      const model = tabModelMap.get(activeTab.id);
      
      if (activeTab.type === 'main' || activeTab.type === 'cte') {
        if (!model) {
          onError('No SQL model found for tab');
          return;
        }
        
        // Create SQL execution parameters (functional approach)
        const executionParams = {
          sql: activeTab.content,
          workspace,
          sqlModel: model,
          tabType: activeTab.type
        };
        
        // Execute using service function
        const result = await executeSqlSafely(executionParams);
        
        if (result.status === 'completed' && result.errors.length === 0) {
          onSuccess(result);
          onSqlExecuted?.(activeTab.content);
        } else {
          const errorMessage = result.errors[0]?.message || 'Query execution failed';
          onError(errorMessage);
        }
      } else {
        onError('Cannot execute non-SQL tab');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Query execution failed';
      onError(message);
    }
  }, []);
  
  const executeDataTabQueries = useCallback(async (
    workspace: WorkspaceEntity,
    onSuccess: (results: Map<string, QueryExecutionResult>) => void,
    onError: (error: string) => void
  ) => {
    try {
      DebugLogger.debug('useMainContentExecution', 'Executing data tab queries');
      console.log('[DEBUG] executeDataTabQueries called with workspace:', workspace?.name);
      console.log('[DEBUG] SQL models count:', workspace?.sqlModels?.length);
      
      const results = new Map<string, QueryExecutionResult>();
      
      // Execute queries for each SQL model
      for (const model of workspace.sqlModels) {
        try {
          console.log('[DEBUG] Processing model:', model.name, 'type:', model.type);
          
          // Create SQL execution parameters (functional approach)
          const executionParams = {
            sql: model.editorContent || model.sqlWithoutCte,
            workspace,
            sqlModel: model,
            tabType: model.type as 'main' | 'cte'
          };
          
          console.log('[DEBUG] Parameters created, executing service...');
          const result = await executeSqlSafely(executionParams);
          console.log('[DEBUG] Service executed, result status:', result.status, 'errors:', result.errors.length);
          
          results.set(model.name, result);
          
        } catch (error) {
          console.error('[DEBUG] Error executing model:', model.name, error);
          // Create error result for this model
          const errorMessage = error instanceof Error ? error.message : 'Execution failed';
          const errorResult = createErrorResult(
            model.editorContent || model.sqlWithoutCte,
            {
              code: 'EXECUTION_FAILED',
              message: errorMessage,
              severity: 'error'
            }
          );
          results.set(model.name, errorResult);
        }
      }
      
      console.log('[DEBUG] All models processed, calling onSuccess with results:', results.size);
      onSuccess(results);
    } catch (error) {
      console.error('[DEBUG] Top-level error in executeDataTabQueries:', error);
      const message = error instanceof Error ? error.message : 'Data tab execution failed';
      onError(message);
    }
  }, []);
  
  const formatQuery = useCallback(async (
    activeTab: Tab | null,
    workspace: WorkspaceEntity,
    onSuccess: (formattedSql: string) => void,
    onError: (error: string) => void
  ) => {
    if (!activeTab || activeTab.type !== 'main' && activeTab.type !== 'cte') {
      onError('No SQL tab active');
      return;
    }
    
    try {
      // Create SQL formatting parameters (functional approach)
      const formatParams = {
        sql: activeTab.content,
        formatter: workspace.formatter
      };
      
      const result = formatSqlSafely(formatParams);
      
      if (result.success) {
        onSuccess(result.formattedSql);
      } else {
        onError(result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Format failed';
      onError(message);
    }
  }, []);
  
  const runStaticAnalysis = useCallback(async (
    workspace: WorkspaceEntity,
    tabs: Tab[],
    saveTab: (tabId: string) => void,
    onAnalysisComplete: () => void
  ) => {
    try {
      DebugLogger.debug('useMainContentExecution', 'Running static analysis');
      
      // Save all dirty tabs first
      tabs.forEach(tab => {
        if (tab.isDirty) {
          saveTab(tab.id);
        }
      });
      
      // Run validation on all schemas instead of analyzeSchema (which doesn't exist)
      await workspace.validateAllSchemas();
      
      onAnalysisComplete();
    } catch (error) {
      DebugLogger.error('useMainContentExecution', 'Static analysis failed:', error);
    }
  }, []);
  
  return {
    executeQuery,
    executeDataTabQueries,
    formatQuery,
    runStaticAnalysis
  };
}
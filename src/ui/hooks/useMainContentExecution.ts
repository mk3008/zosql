/**
 * useMainContentExecution - SQL execution logic extracted from ViewModel
 * Phase 3: Complete execution functionality without ViewModel
 */

import { useCallback } from 'react';
import { WorkspaceEntity, Tab, QueryExecutionResult } from '@shared/types';
import { SqlModelEntity } from '@core/entities/sql-model';
import { ExecuteQueryCommand } from '@core/commands/execute-query-command';
import { FormatQueryCommand } from '@core/commands/format-query-command';
import { commandExecutor } from '@core/services/command-executor';
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
        
        // Create ExecuteQueryCommand context
        const context = {
          workspace,
          sqlModel: model,
          tabContent: activeTab.content,
          tabType: activeTab.type
        };
        
        // Execute using the command
        const command = new ExecuteQueryCommand(context);
        
        const result = await commandExecutor.execute(command);
        
        if (result) {
          // Result is already in core QueryExecutionResult format
          onSuccess(result);
          onSqlExecuted?.(activeTab.content);
        } else {
          onError('Query execution failed');
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
      
      const results = new Map<string, QueryExecutionResult>();
      
      // Execute queries for each SQL model
      for (const model of workspace.sqlModels) {
        try {
          // Create ExecuteQueryCommand context
          const context = {
            workspace,
            sqlModel: model,
            tabContent: model.editorContent || model.sqlWithoutCte,
            tabType: model.type as 'main' | 'cte'
          };
          
          const command = new ExecuteQueryCommand(context);
          
          const result = await commandExecutor.execute(command);
          
          if (result) {
            // Result is already in core QueryExecutionResult format
            results.set(model.name, result);
          }
        } catch (error) {
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
      
      onSuccess(results);
    } catch (error) {
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
      // Create FormatQueryCommand context
      const context = {
        sql: activeTab.content,
        formatter: workspace.formatter
      };
      
      const command = new FormatQueryCommand(context);
      
      const formattedSql = await commandExecutor.execute(command);
      
      if (formattedSql) {
        onSuccess(formattedSql);
      } else {
        onError('Formatting failed');
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
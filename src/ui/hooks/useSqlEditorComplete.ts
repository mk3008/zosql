/**
 * useSqlEditorComplete Hook - Complete SQL Editor Functionality
 * Functional composition of SQL editor, execution, and formatting hooks
 * Replaces SqlEditorViewModel with pure functional approach
 */

import React, { useCallback, useMemo } from 'react';
import { WorkspaceEntity } from '@shared/types';
import { useSqlEditor, UseSqlEditorReturn } from './useSqlEditor';
import { useSqlFormatter, UseSqlFormatterReturn, SqlFormatOptions } from './useSqlFormatter';
import { executeSqlSafely, SqlExecutionParams } from '@core/services/sql-execution-service';

/**
 * Combined hook return type
 */
export interface UseSqlEditorCompleteReturn extends 
  Omit<UseSqlEditorReturn, 'executeQuery'>,
  Pick<UseSqlFormatterReturn, 'isFormatting' | 'formatOptions' | 'setFormatOptions'> {
  
  // Enhanced execution with formatting
  readonly executeQuery: () => Promise<void>;
  readonly formatAndExecute: () => Promise<void>;
  readonly formatSql: () => Promise<void>;
  
  // Combined state
  readonly isBusy: boolean;
  readonly hasAnyError: boolean;
  
  // Utility actions
  readonly resetAll: () => void;
}

/**
 * Complete SQL Editor hook with execution and formatting capabilities
 * Uses functional composition to combine multiple concerns
 */
export const useSqlEditorComplete = (
  workspace?: WorkspaceEntity | null,
  initialFormatOptions?: Partial<SqlFormatOptions>
): UseSqlEditorCompleteReturn => {
  
  // Create query executor function
  const queryExecutor = useCallback(async (sql: string, workspace: WorkspaceEntity | null) => {
    const params: SqlExecutionParams = {
      sql,
      workspace,
      tabType: 'main',
      timeout: 30000,
    };
    
    return await executeSqlSafely(params);
  }, []);

  // Initialize sub-hooks
  const sqlEditor = useSqlEditor(queryExecutor);
  const sqlFormatter = useSqlFormatter(initialFormatOptions);

  // Set initial workspace
  React.useEffect(() => {
    if (workspace !== undefined) {
      sqlEditor.setWorkspace(workspace);
    }
  }, [workspace, sqlEditor]);

  // Enhanced format SQL that updates editor content
  const formatSql = useCallback(async () => {
    if (!sqlEditor.sql) return;
    
    const result = await sqlFormatter.formatSql(sqlEditor.sql);
    if (result.success && result.formattedSql) {
      sqlEditor.setSql(result.formattedSql);
    }
  }, [sqlEditor, sqlFormatter]);

  // Format and then execute
  const formatAndExecute = useCallback(async () => {
    await formatSql();
    await sqlEditor.executeQuery();
  }, [formatSql, sqlEditor]);

  // Combined state computations
  const isBusy = useMemo(() => 
    sqlEditor.isExecuting || sqlFormatter.isFormatting,
    [sqlEditor.isExecuting, sqlFormatter.isFormatting]
  );

  const hasAnyError = useMemo(() => 
    (sqlEditor.result?.status === "failed" || (sqlEditor.result?.errors.length ?? 0) > 0) ||
    (sqlFormatter.lastFormatResult?.success === false),
    [sqlEditor.result, sqlFormatter.lastFormatResult]
  );

  // Reset everything
  const resetAll = useCallback(() => {
    sqlEditor.clearAll();
    sqlFormatter.clearResult();
    sqlFormatter.resetOptions();
  }, [sqlEditor, sqlFormatter]);

  return {
    // From SQL Editor
    sql: sqlEditor.sql,
    isExecuting: sqlEditor.isExecuting,
    result: sqlEditor.result,
    workspace: sqlEditor.workspace,
    canExecute: sqlEditor.canExecute,
    hasResult: sqlEditor.hasResult,
    isSuccessful: sqlEditor.isSuccessful,
    executionTime: sqlEditor.executionTime,
    setSql: sqlEditor.setSql,
    setWorkspace: sqlEditor.setWorkspace,
    clearResult: sqlEditor.clearResult,
    clearAll: sqlEditor.clearAll,
    
    // From SQL Formatter
    isFormatting: sqlFormatter.isFormatting,
    formatOptions: sqlFormatter.formatOptions,
    setFormatOptions: sqlFormatter.setFormatOptions,
    
    // Enhanced functionality
    executeQuery: sqlEditor.executeQuery,
    formatAndExecute,
    formatSql,
    
    // Combined state
    isBusy,
    hasAnyError,
    
    // Utility
    resetAll,
  };
};

// Re-export types for convenience
export type { SqlFormatOptions } from './useSqlFormatter';
export type { SqlExecutionParams } from '@core/services/sql-execution-service';
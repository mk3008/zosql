/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - This file will be removed in Phase 4
/**
 * useSqlEditor Hook - Functional Programming Approach
 * Composable hooks for SQL Editor functionality
 * Replaces SqlEditorViewModel with pure functional approach
 */

import { useReducer, useCallback, useMemo } from 'react';
import { QueryExecutionResult, WorkspaceEntity } from '@shared/types';

// Pure functions for SQL operations
const validateSqlQuery = (sql: string): boolean => sql.trim().length > 0;
const sanitizeSqlQuery = (sql: string): string => sql.trim();
const formatErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error occurred';

// State type for SQL Editor
type SqlEditorState = {
  readonly sql: string;
  readonly isExecuting: boolean;
  readonly result: QueryExecutionResult | null;
  readonly workspace: WorkspaceEntity | null;
  readonly lastExecutionTime: number;
};

// Actions for state management
type SqlEditorAction =
  | { type: 'SET_SQL'; payload: string }
  | { type: 'SET_WORKSPACE'; payload: WorkspaceEntity | null }
  | { type: 'START_EXECUTION' }
  | { type: 'EXECUTION_SUCCESS'; payload: QueryExecutionResult }
  | { type: 'EXECUTION_ERROR'; payload: string }
  | { type: 'CLEAR_RESULT' }
  | { type: 'CLEAR_ALL' };

const initialState: SqlEditorState = {
  sql: '',
  isExecuting: false,
  result: null,
  workspace: null,
  lastExecutionTime: 0,
};

// Pure reducer function
const sqlEditorReducer = (
  state: SqlEditorState,
  action: SqlEditorAction
): SqlEditorState => {
  switch (action.type) {
    case 'SET_SQL':
      return { ...state, sql: action.payload };
    
    case 'SET_WORKSPACE':
      return { ...state, workspace: action.payload };
    
    case 'START_EXECUTION':
      return {
        ...state,
        isExecuting: true,
        result: null,
        lastExecutionTime: Date.now(),
      };
    
    case 'EXECUTION_SUCCESS':
      return {
        ...state,
        isExecuting: false,
        result: {
          ...action.payload,
          executionTime: Date.now() - state.lastExecutionTime,
        },
      };
    
    case 'EXECUTION_ERROR':
      return {
        ...state,
        isExecuting: false,
        result: {
          success: false,
          error: action.payload,
          executionTime: Date.now() - state.lastExecutionTime,
        },
      };
    
    case 'CLEAR_RESULT':
      return { ...state, result: null };
    
    case 'CLEAR_ALL':
      return initialState;
    
    default:
      return state;
  }
};

/**
 * Hook return type
 */
export interface UseSqlEditorReturn {
  // State
  readonly sql: string;
  readonly isExecuting: boolean;
  readonly result: QueryExecutionResult | null;
  readonly workspace: WorkspaceEntity | null;
  
  // Computed properties
  readonly canExecute: boolean;
  readonly hasResult: boolean;
  readonly isSuccessful: boolean;
  readonly executionTime: number;
  
  // Actions
  readonly setSql: (sql: string) => void;
  readonly setWorkspace: (workspace: WorkspaceEntity | null) => void;
  readonly executeQuery: () => Promise<void>;
  readonly clearResult: () => void;
  readonly clearAll: () => void;
}

/**
 * Main SQL Editor hook using functional composition
 * @param queryExecutor - Function to execute SQL queries
 */
export const useSqlEditor = (
  queryExecutor?: (sql: string, workspace: WorkspaceEntity | null) => Promise<QueryExecutionResult>
): UseSqlEditorReturn => {
  const [state, dispatch] = useReducer(sqlEditorReducer, initialState);

  // Computed properties using pure functions
  const canExecute = useMemo(() =>
    validateSqlQuery(state.sql) && !state.isExecuting && state.workspace !== null,
    [state.sql, state.isExecuting, state.workspace]
  );

  const hasResult = useMemo(() => state.result !== null, [state.result]);
  
  const isSuccessful = useMemo(() => state.result?.success === true, [state.result]);
  
  const executionTime = useMemo(() => state.result?.executionTime ?? 0, [state.result]);

  // Action creators as pure functions
  const setSql = useCallback((sql: string) => {
    dispatch({ type: 'SET_SQL', payload: sanitizeSqlQuery(sql) });
  }, []);

  const setWorkspace = useCallback((workspace: WorkspaceEntity | null) => {
    dispatch({ type: 'SET_WORKSPACE', payload: workspace });
  }, []);

  const clearResult = useCallback(() => {
    dispatch({ type: 'CLEAR_RESULT' });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  // Main execution logic
  const executeQuery = useCallback(async (): Promise<void> => {
    if (!canExecute || !queryExecutor) {
      return;
    }

    dispatch({ type: 'START_EXECUTION' });

    try {
      const result = await queryExecutor(state.sql, state.workspace);
      dispatch({ type: 'EXECUTION_SUCCESS', payload: result });
    } catch (error) {
      dispatch({ type: 'EXECUTION_ERROR', payload: formatErrorMessage(error) });
    }
  }, [canExecute, queryExecutor, state.sql, state.workspace]);

  return {
    // State
    sql: state.sql,
    isExecuting: state.isExecuting,
    result: state.result,
    workspace: state.workspace,
    
    // Computed
    canExecute,
    hasResult,
    isSuccessful,
    executionTime,
    
    // Actions
    setSql,
    setWorkspace,
    executeQuery,
    clearResult,
    clearAll,
  };
};
/**
 * useQueryExecution - Query execution logic extracted from ViewModel
 * Phase 2: Extract execution logic while keeping ViewModel for complex operations
 * CRITICAL: Does not affect MonacoEditor behavior
 */

import { useState, useCallback } from 'react';
import { QueryExecutionResult } from '@core/types/query-types';
import { DebugLogger } from '../../utils/debug-logger';

export interface UseQueryExecutionReturn {
  // State
  isExecuting: boolean;
  queryResult: QueryExecutionResult | null;
  dataTabResults: Map<string, QueryExecutionResult>;
  
  // Operations
  setIsExecuting: (executing: boolean) => void;
  setQueryResult: (result: QueryExecutionResult | null) => void;
  clearQueryResult: () => void;
  setDataTabResults: (results: Map<string, QueryExecutionResult>) => void;
  clearDataTabResults: () => void;
}

/**
 * Query execution state management hook - Phase 2 of migration
 * Only manages execution state, actual execution remains in ViewModel
 */
export function useQueryExecution(): UseQueryExecutionReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResultState] = useState<QueryExecutionResult | null>(null);
  const [dataTabResults, setDataTabResultsState] = useState<Map<string, QueryExecutionResult>>(new Map());
  
  // Simple setters for ViewModel to update state
  const setQueryResult = useCallback((result: QueryExecutionResult | null) => {
    DebugLogger.debug('useQueryExecution', 'Setting query result');
    setQueryResultState(result);
  }, []);
  
  const clearQueryResult = useCallback(() => {
    DebugLogger.debug('useQueryExecution', 'Clearing query result');
    setQueryResultState(null);
  }, []);
  
  const setDataTabResults = useCallback((results: Map<string, QueryExecutionResult>) => {
    DebugLogger.debug('useQueryExecution', `Setting data tab results: ${results.size} results`);
    setDataTabResultsState(results);
  }, []);
  
  const clearDataTabResults = useCallback(() => {
    DebugLogger.debug('useQueryExecution', 'Clearing data tab results');
    setDataTabResultsState(new Map());
  }, []);
  
  return {
    isExecuting,
    queryResult,
    dataTabResults,
    setIsExecuting,
    setQueryResult,
    clearQueryResult,
    setDataTabResults,
    clearDataTabResults
  };
}
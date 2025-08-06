/**
 * SQL Execution Service - Functional Programming Approach
 * Pure functions for SQL query execution, replacing ExecuteQueryCommand
 */

import { QueryExecutionResult, WorkspaceEntity } from '@shared/types';

// Types for functional approach
export interface SqlExecutionParams {
  readonly sql: string;
  readonly workspace: WorkspaceEntity | null;
  readonly tabType?: 'main' | 'cte' | 'values' | 'formatter' | 'condition';
  readonly timeout?: number;
}

export interface SqlExecutionContext {
  readonly startTime: number;
  readonly userId?: string;
  readonly sessionId?: string;
}

// Pure validation functions
export const validateSqlExecution = (params: SqlExecutionParams): string[] => {
  const errors: string[] = [];
  
  if (!params.sql || params.sql.trim().length === 0) {
    errors.push('SQL query is required');
  }
  
  if (!params.workspace) {
    errors.push('Workspace context is required');
  }
  
  if (params.timeout && params.timeout < 1000) {
    errors.push('Timeout must be at least 1000ms');
  }
  
  return errors;
};

// Pure function to create execution context
const createExecutionContext = (userId?: string): SqlExecutionContext => ({
  startTime: Date.now(),
  userId,
  sessionId: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
});

// Pure function to calculate execution time
const calculateExecutionTime = (context: SqlExecutionContext): number =>
  Date.now() - context.startTime;

// Main SQL execution function (pure, testable)
export const executeSqlQuery = async (params: SqlExecutionParams): Promise<QueryExecutionResult> => {
  // Validate input
  const validationErrors = validateSqlExecution(params);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: `Validation failed: ${validationErrors.join(', ')}`,
      executionTime: 0,
    };
  }

  const context = createExecutionContext();
  
  try {
    // Dynamic import to avoid circular dependencies
    const { commandExecutor } = await import('@core/services/command-executor');
    const { ExecuteQueryCommand } = await import('@core/commands/execute-query-command');
    
    // Create command with functional approach
    const command = new ExecuteQueryCommand({
      workspace: params.workspace!,
      sqlModel: null, // Will be derived from workspace context
      tabContent: params.sql.trim(),
      tabType: params.tabType ?? 'main',
    });
    
    // Execute with timeout handling
    const executionPromise = commandExecutor.execute(command);
    const timeoutPromise = createTimeoutPromise(params.timeout ?? 30000);
    
    const result = await Promise.race([executionPromise, timeoutPromise]);
    
    return {
      ...result,
      executionTime: calculateExecutionTime(context),
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown execution error',
      executionTime: calculateExecutionTime(context),
    };
  }
};

// Helper function for timeout handling
const createTimeoutPromise = (timeoutMs: number): Promise<QueryExecutionResult> =>
  new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Query execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

// Functional composition helpers
export const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduce((acc, fn) => fn(acc), value);

export const compose = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduceRight((acc, fn) => fn(acc), value);

// Utility functions for SQL operations
export const normalizeSql = (sql: string): string =>
  sql.trim().replace(/\s+/g, ' ').replace(/;\s*$/, '');

export const extractSqlType = (sql: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DDL' | 'UNKNOWN' => {
  const normalizedSql = normalizeSql(sql).toUpperCase();
  
  if (normalizedSql.startsWith('SELECT') || normalizedSql.startsWith('WITH')) {
    return 'SELECT';
  }
  if (normalizedSql.startsWith('INSERT')) {
    return 'INSERT';
  }
  if (normalizedSql.startsWith('UPDATE')) {
    return 'UPDATE';
  }
  if (normalizedSql.startsWith('DELETE')) {
    return 'DELETE';
  }
  if (['CREATE', 'DROP', 'ALTER'].some(keyword => normalizedSql.startsWith(keyword))) {
    return 'DDL';
  }
  
  return 'UNKNOWN';
};

export const estimateQueryComplexity = (sql: string): 'LOW' | 'MEDIUM' | 'HIGH' => {
  const normalizedSql = normalizeSql(sql);
  
  // Simple heuristics for complexity estimation
  const joinCount = (normalizedSql.match(/\bJOIN\b/gi) || []).length;
  const subqueryCount = (normalizedSql.match(/\bSELECT\b/gi) || []).length - 1; // -1 for main SELECT
  const cteCount = (normalizedSql.match(/\bWITH\b/gi) || []).length;
  
  const complexityScore = joinCount + (subqueryCount * 2) + (cteCount * 3);
  
  if (complexityScore <= 2) return 'LOW';
  if (complexityScore <= 6) return 'MEDIUM';
  return 'HIGH';
};

// Safe execution wrapper with error handling
export const executeSqlSafely = async (params: SqlExecutionParams): Promise<QueryExecutionResult> => {
  try {
    return await executeSqlQuery(params);
  } catch (error) {
    return {
      success: false,
      error: `Safe execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTime: 0,
    };
  }
};
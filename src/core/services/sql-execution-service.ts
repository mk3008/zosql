/**
 * SQL Execution Service - Functional Programming Approach
 * Pure functions for SQL query execution, replacing ExecuteQueryCommand
 */

import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlModelEntity, DynamicSqlResult } from '@core/entities/sql-model';
import { TestValuesModel } from '@core/entities/test-values-model';
import { 
  hasQueryResultCapability,
  QueryResultBuilder,
  QueryExecutionResult, 
  createSuccessResult, 
  createErrorResult 
} from '@core/types/query-types';

// Types for functional approach
export interface SqlExecutionParams {
  readonly sql: string;
  readonly workspace: WorkspaceEntity | null;
  readonly sqlModel: SqlModelEntity | null;
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
  
  return errors;
};

// Pure function to get test values from workspace
const getTestValues = (workspace: WorkspaceEntity | null): TestValuesModel | string | undefined => {
  if (workspace?.testValues) {
    console.log('[DEBUG] getTestValues - Found test values:', workspace.testValues.withClause);
    return workspace.testValues;
  }
  console.log('[DEBUG] getTestValues - No test values found');
  return undefined;
};

// Pure function to execute SQL with PGlite
const executeSqlWithPGlite = async (sql: string, params: unknown[] = []): Promise<{ rows: Record<string, unknown>[] }> => {
  // Dynamically import PGlite
  const { PGlite } = await import('@electric-sql/pglite');
  
  // Initialize PGlite in memory-only mode
  const db = new PGlite();
  
  // Execute the SQL with parameters
  if (params.length > 0) {
    console.log('[DEBUG] Executing SQL with parameters:', { sql, params });
    return await db.query(sql, params);
  } else {
    console.log('[DEBUG] Executing SQL without parameters:', sql);
    return await db.query(sql);
  }
};

// Pure function to handle CTE execution logic
const handleCteExecution = async (
  params: SqlExecutionParams,
  startTime: number
): Promise<QueryExecutionResult> => {
  const { sqlModel, workspace, sql } = params;
  
  if (!sqlModel) {
    throw new Error('SQL model is required for CTE execution');
  }

  console.log('[DEBUG] CTE tab execution - updating CTE model content');
  
  // Update the CTE model's content
  sqlModel.updateEditorContent(sql);
  sqlModel.save();
  
  // For CTE tabs, execute the CTE with getDynamicSql and add wrapper if needed
  console.log('[DEBUG] Executing CTE independently using getDynamicSql');
  
  // Get test values and filter conditions from workspace
  const testValues = getTestValues(workspace);
  const filterConditions = workspace?.filterConditions;
  
  try {
    const dynamicResult = await sqlModel.getDynamicSql(testValues, filterConditions, true, true);
    console.log('[DEBUG] CTE getDynamicSql result:', dynamicResult.formattedSql.substring(0, 200) + '...');
    
    let executableSql = dynamicResult.formattedSql;
    
    // If the SQL doesn't start with WITH, it means it's a standalone CTE content
    // We need to wrap it to make it executable
    if (!executableSql.toLowerCase().trim().startsWith('with')) {
      const cteName = sqlModel.name;
      executableSql = `WITH ${cteName} AS (\n${executableSql}\n)\nSELECT * FROM ${cteName}`;
      console.log('[DEBUG] Wrapped standalone CTE with SELECT statement');
    }
    
    console.log('[DEBUG] Final executable SQL:', executableSql.substring(0, 200) + '...');
    
    // Execute the SQL with parameters
    const result = await executeSqlWithPGlite(executableSql, dynamicResult.params);
    const executionTime = Math.round(performance.now() - startTime);
    
    console.log('[DEBUG] CTE SQL execution result:', { 
      rowCount: result.rows?.length, 
      executionTime,
      hasResult: !!result 
    });
    
    const successResult = createSuccessResult(
      executableSql,
      result.rows || [],
      [],
      { executionTimeMs: executionTime, rowsReturned: result.rows?.length || 0 }
    );
    
    console.log('[DEBUG] CTE createSuccessResult completed, returning result');
    return successResult;
    
  } catch (cteError) {
    const errorMessage = cteError instanceof Error ? cteError.message : 'CTE execution failed';
    console.log('[DEBUG] CTE getDynamicSql execution failed:', errorMessage);
    
    return createErrorResult(
      sql,
      {
        code: 'CTE_EXECUTION_FAILED',
        message: `CTE execution failed: ${errorMessage}`,
        severity: 'error'
      }
    );
  }
};

// Pure function to handle regular SQL execution
const handleRegularExecution = async (
  params: SqlExecutionParams,
  startTime: number
): Promise<QueryExecutionResult> => {
  const { sqlModel, workspace, sql, tabType } = params;
  let dynamicResult: DynamicSqlResult | null = null;

  // If we have a model, use dynamic SQL generation
  if (sqlModel) {
    console.log('[DEBUG] Using sqlModel path for execution');
    
    // Update model's SQL with current tab content  
    sqlModel.updateEditorContent(sql);
    if (tabType === 'main') {
      sqlModel.save();
    }
    
    // Get test values and filter conditions from workspace
    const testValues = getTestValues(workspace);
    const filterConditions = workspace?.filterConditions;
    
    console.log('[DEBUG] Test values:', !!testValues, 'Filter conditions:', !!filterConditions);
    if (filterConditions) {
      const conditions = filterConditions.getFilterConditions();
      console.log('[DEBUG] Filter conditions content:', conditions);
      console.log('[DEBUG] Filter conditions keys:', Object.keys(conditions || {}));
    }
    
    // Generate dynamic SQL with parameterization for execution
    dynamicResult = await sqlModel.getDynamicSql(testValues, filterConditions, true);
    console.log('[DEBUG] Generated dynamic SQL length:', dynamicResult.formattedSql.length);
    
  } else if (tabType === 'main' && workspace) {
    console.log('[DEBUG] Using fallback main model path for execution');
    
    // Fallback: find main model in workspace
    const mainModel = workspace.sqlModels.find(m => m.type === 'main');
    if (mainModel) {
      console.log('[DEBUG] Found main model:', mainModel.name);
      mainModel.sqlWithoutCte = sql;
      const testValues = workspace.testValues;
      const filterConditions = workspace.filterConditions;
      
      console.log('[DEBUG] Fallback - Test values:', !!testValues, 'Filter conditions:', !!filterConditions);
      if (filterConditions) {
        const conditions = filterConditions.getFilterConditions();
        console.log('[DEBUG] Fallback filter conditions content:', conditions);
        console.log('[DEBUG] Fallback filter conditions keys:', Object.keys(conditions || {}));
      }
      
      // Generate dynamic SQL with parameterization for execution
      dynamicResult = await mainModel.getDynamicSql(testValues, filterConditions, true);
      console.log('[DEBUG] Fallback generated dynamic SQL length:', dynamicResult.formattedSql.length);
    } else {
      console.log('[DEBUG] No main model found in workspace');
    }
  } else {
    console.log('[DEBUG] No SQL model or workspace available, using plain SQL');
  }
  
  // If we don't have dynamic result, throw error
  if (!dynamicResult) {
    throw new Error('Unable to generate SQL with proper CTE composition. Please ensure all dependencies are available.');
  }
  
  // Log final SQL before execution
  console.log('[DEBUG] Final SQL to execute:', dynamicResult.formattedSql.substring(0, 200) + '...');
  console.log('[DEBUG] SQL includes WITH clause?', dynamicResult.formattedSql.toLowerCase().includes('with'));
  
  // Execute SQL using PGlite with parameters
  const result = await executeSqlWithPGlite(dynamicResult.formattedSql, dynamicResult.params);
  const executionTime = Math.round(performance.now() - startTime);
  const executionResult = createSuccessResult(
    dynamicResult.formattedSql,
    result.rows || [],
    [],
    { executionTimeMs: executionTime, rowsReturned: result.rows?.length || 0 }
  );
  
  // Save result to model if available - using type-safe approach
  if (sqlModel && hasQueryResultCapability(sqlModel)) {
    // Convert legacy result format to new type-safe format
    const typeSafeResult = new QueryResultBuilder(dynamicResult.formattedSql)
      .setStatus('completed')
      .setRows(result.rows || [])
      .setStats({
        rowsAffected: 0,
        rowsReturned: result.rows?.length || 0,
        executionTimeMs: executionTime
      })
      .build();
    
    sqlModel.setQueryResult(typeSafeResult);
  }
  
  return executionResult;
};

// Main SQL execution function (pure, testable)
export const executeSqlQuery = async (params: SqlExecutionParams): Promise<QueryExecutionResult> => {
  const startTime = performance.now();
  
  // Validate input
  const validationErrors = validateSqlExecution(params);
  if (validationErrors.length > 0) {
    return createErrorResult(
      params.sql,
      {
        code: 'VALIDATION_FAILED',
        message: `Validation failed: ${validationErrors.join(', ')}`,
        severity: 'error'
      }
    );
  }

  console.log('[DEBUG] executeSqlQuery context:', {
    hasSqlModel: !!params.sqlModel,
    sqlModelName: params.sqlModel?.name,
    sqlModelType: params.sqlModel?.type,
    tabType: params.tabType,
    hasWorkspace: !!params.workspace,
    tabContent: params.sql.substring(0, 100) + '...'
  });
  
  try {
    // Handle CTE execution separately
    if (params.tabType === 'cte' && params.sqlModel?.type === 'cte') {
      return await handleCteExecution(params, startTime);
    }
    
    // Handle regular execution
    return await handleRegularExecution(params, startTime);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'SQL execution failed';
    
    return createErrorResult(
      params.sql,
      {
        code: 'EXECUTION_FAILED',
        message: errorMessage,
        severity: 'error',
        detail: `Executed SQL:
${params.sql}`
      }
    );
  }
};

// Helper function for timeout handling (currently unused in functional implementation)
// const createTimeoutPromise = (timeoutMs: number): Promise<QueryExecutionResult> =>
//   new Promise((_, reject) => {
//     setTimeout(() => {
//       reject(new Error(`Query execution timed out after ${timeoutMs}ms`));
//     }, timeoutMs);
//   });

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

// Safe execution wrapper with comprehensive error handling
export const executeSqlSafely = async (params: SqlExecutionParams): Promise<QueryExecutionResult> => {
  try {
    return await executeSqlQuery(params);
  } catch (error) {
    return createErrorResult(
      params.sql,
      {
        code: 'SAFE_EXECUTION_FAILED',
        message: `Safe execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      }
    );
  }
};
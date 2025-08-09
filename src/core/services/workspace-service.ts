/**
 * Workspace Service - Functional Programming Approach
 * Pure functions for workspace operations, replacing Command pattern
 */

import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';
import { TestValuesModel } from '@core/entities/test-values-model';
import { SqlDecomposerUseCase } from '@core/usecases/sql-decomposer-usecase';
import { SqlDecomposerParser } from '@adapters/parsers/sql-decomposer-parser';
import { CteDependencyAnalyzerAdapter } from '@adapters/dependency-analyzer/cte-dependency-analyzer-adapter';

/**
 * SQL Formatting Service - Functional Programming Approach  
 * Pure functions for SQL query formatting, replacing FormatQueryCommand
 */

import { SelectQueryParser } from 'rawsql-ts';

// Types for SQL formatting functionality
export interface SqlFormattingParams {
  readonly sql: string;
  readonly formatter?: SqlFormatterEntity;
}

export interface SqlFormattingOptions {
  readonly timeout?: number;
  readonly fallbackToOriginal?: boolean;
  readonly validateSyntax?: boolean;
}

export type SqlFormattingResult = 
  | { success: true; formattedSql: string; originalSql: string }
  | { success: false; error: string; originalSql: string };

// Pure validation functions
export const validateSqlFormatting = (params: SqlFormattingParams): string[] => {
  const errors: string[] = [];
  
  if (!params.sql || params.sql.trim().length === 0) {
    errors.push('SQL query is required');
  }
  
  return errors;
};

// Pure function to create default formatter if none provided
const createDefaultFormatter = (): SqlFormatterEntity => new SqlFormatterEntity();

// Pure function to attempt SQL parsing with rawsql-ts
const tryParseSql = (sql: string): { success: boolean; query?: unknown; error?: string } => {
  try {
    const query = SelectQueryParser.parse(sql);
    return { success: true, query };
  } catch (error) {
    console.debug('[SQL Parser] Failed to parse SQL:', sql.substring(0, 100), '...', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'SQL parsing failed'
    };
  }
};

// Pure function to format parsed SQL
const formatParsedSql = (query: unknown, formatter: SqlFormatterEntity): { success: boolean; formatted?: string; error?: string } => {
  try {
    const sqlFormatter = formatter.getSqlFormatter();
    const formatted = sqlFormatter.format(query as never);
    
    // Handle both string and object return types from formatter
    const formattedSql = typeof formatted === 'string' ? formatted : formatted.formattedSql;
    
    return { success: true, formatted: formattedSql };
  } catch (error) {
    console.debug('[SQL Formatter] Failed to format query:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'SQL formatting failed'
    };
  }
};

// Main SQL formatting function (pure, testable)
export const formatSqlQuery = (
  params: SqlFormattingParams, 
  options: SqlFormattingOptions = {}
): SqlFormattingResult => {
  // Validate input
  const validationErrors = validateSqlFormatting(params);
  if (validationErrors.length > 0) {
    return {
      success: false,
      error: `Validation failed: ${validationErrors.join(', ')}`,
      originalSql: params.sql
    };
  }

  // Use provided formatter or create default
  const formatter = params.formatter || createDefaultFormatter();
  
  // Attempt to parse SQL
  const parseResult = tryParseSql(params.sql);
  if (!parseResult.success) {
    const errorMessage = parseResult.error || 'Unknown parsing error';
    
    // Return original SQL if fallback is enabled (default behavior)
    if (options.fallbackToOriginal !== false) {
      console.warn('Failed to format SQL, returning original:', errorMessage);
      return {
        success: true,
        formattedSql: params.sql,
        originalSql: params.sql
      };
    }
    
    return {
      success: false,
      error: `SQL parsing failed: ${errorMessage}`,
      originalSql: params.sql
    };
  }

  // Attempt to format parsed SQL
  const formatResult = formatParsedSql(parseResult.query, formatter);
  if (!formatResult.success) {
    const errorMessage = formatResult.error || 'Unknown formatting error';
    
    // Return original SQL if fallback is enabled (default behavior)
    if (options.fallbackToOriginal !== false) {
      console.warn('Failed to format SQL, returning original:', errorMessage);
      return {
        success: true,
        formattedSql: params.sql,
        originalSql: params.sql
      };
    }
    
    return {
      success: false,
      error: `SQL formatting failed: ${errorMessage}`,
      originalSql: params.sql
    };
  }

  return {
    success: true,
    formattedSql: formatResult.formatted || params.sql,
    originalSql: params.sql
  };
};

// Safe formatting wrapper with comprehensive error handling
export const formatSqlSafely = (
  params: SqlFormattingParams,
  options: SqlFormattingOptions = {}
): SqlFormattingResult => {
  try {
    return formatSqlQuery(params, options);
  } catch (error) {
    return {
      success: false,
      error: `Safe formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      originalSql: params.sql
    };
  }
};

// Utility function to check if SQL can be formatted
export const canFormatSql = (sql: string): boolean => {
  if (!sql || sql.trim().length === 0) {
    return false;
  }
  
  const parseResult = tryParseSql(sql);
  return parseResult.success;
};

// Utility function to get SQL formatting info
export const getSqlFormattingInfo = (sql: string): {
  canFormat: boolean;
  sqlType: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedTokens: number;
} => {
  const canFormat = canFormatSql(sql);
  
  // Basic SQL type detection
  const normalizedSql = sql.trim().toUpperCase();
  let sqlType = 'UNKNOWN';
  
  if (normalizedSql.startsWith('SELECT') || normalizedSql.startsWith('WITH')) {
    sqlType = 'SELECT';
  } else if (normalizedSql.startsWith('INSERT')) {
    sqlType = 'INSERT';
  } else if (normalizedSql.startsWith('UPDATE')) {
    sqlType = 'UPDATE';
  } else if (normalizedSql.startsWith('DELETE')) {
    sqlType = 'DELETE';
  }
  
  // Simple complexity estimation
  const keywordCount = (sql.match(/\b(SELECT|FROM|WHERE|JOIN|GROUP|ORDER|HAVING|WITH)\b/gi) || []).length;
  const complexity = keywordCount <= 5 ? 'LOW' : keywordCount <= 15 ? 'MEDIUM' : 'HIGH';
  
  // Rough token estimation
  const estimatedTokens = sql.split(/\s+/).length;
  
  return {
    canFormat,
    sqlType,
    complexity,
    estimatedTokens
  };
};

// Types for functional approach
export interface CreateWorkspaceParams {
  readonly name: string;
  readonly sql: string;
}

export interface WorkspaceCreationResult {
  readonly success: boolean;
  readonly workspace?: WorkspaceEntity;
  readonly error?: string;
}

// Pure function for input validation
export const validateWorkspaceParams = (params: CreateWorkspaceParams): string[] => {
  const errors: string[] = [];
  
  if (!params.name || params.name.trim().length === 0) {
    errors.push('Workspace name is required');
  }
  
  if (!params.sql || params.sql.trim().length === 0) {
    errors.push('SQL query is required');
  }
  
  if (params.name && params.name.trim().length > 100) {
    errors.push('Workspace name must be 100 characters or less');
  }
  
  return errors;
};

// Pure function to create decomposer dependencies
const createSqlDecomposer = (): SqlDecomposerUseCase => {
  const parser = new SqlDecomposerParser();
  const analyzer = new CteDependencyAnalyzerAdapter();
  return new SqlDecomposerUseCase(parser, analyzer);
};

// Pure function to generate workspace ID
const generateWorkspaceId = (): string => 
  `workspace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Pure function to create filename
const createWorkspaceFilename = (name: string): string => 
  `${name.trim().replace(/[^a-zA-Z0-9-_]/g, '_')}.sql`;

// Main workspace creation function
export const createWorkspace = async (params: CreateWorkspaceParams): Promise<WorkspaceEntity> => {
  // Validate input
  const validationErrors = validateWorkspaceParams(params);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  try {
    // Process SQL using functional composition
    const decomposer = createSqlDecomposer();
    const models = await decomposer.decomposeSql(params.sql, createWorkspaceFilename(params.name));

    // Create workspace entity using pure data transformation
    const workspace = new WorkspaceEntity(
      generateWorkspaceId(),
      params.name.trim(),
      createWorkspaceFilename(params.name),
      models,
      new TestValuesModel(''),
      new SqlFormatterEntity(),
      new FilterConditionsEntity(),
      {} // metadata
    );

    return workspace;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to create workspace: ${errorMessage}`);
  }
};

// Functional approach for workspace creation with result wrapper
export const createWorkspaceSafe = async (params: CreateWorkspaceParams): Promise<WorkspaceCreationResult> => {
  try {
    const workspace = await createWorkspace(params);
    return {
      success: true,
      workspace,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

// Utility functions for workspace operations
export const isValidWorkspaceName = (name: string): boolean =>
  name.trim().length > 0 && name.trim().length <= 100;

export const isValidSqlQuery = (sql: string): boolean =>
  sql.trim().length > 0;

export const sanitizeWorkspaceName = (name: string): string =>
  name.trim().replace(/[^a-zA-Z0-9-_\s]/g, '').substring(0, 100);

// Composition helpers
export const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduce((acc, fn) => fn(acc), value);

export const compose = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduceRight((acc, fn) => fn(acc), value);
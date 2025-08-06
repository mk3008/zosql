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
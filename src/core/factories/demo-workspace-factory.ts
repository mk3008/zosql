/**
 * Demo Workspace Factory
 * Core Layer - Business Logic
 * Creates standardized demoworkspace instances with proper initialization
 */

import { WorkspaceEntity } from '../entities/workspace';
import { SqlModelEntity } from '../entities/sql-model';
import { TestValuesModel } from '../entities/test-values-model';
import { SqlFormatterEntity } from '../entities/sql-formatter';
import { FilterConditionsEntity } from '../entities/filter-conditions';

export interface DemoWorkspaceConfig {
  /** Workspace ID - if not provided, auto-generated */
  id?: string;
  /** Main SQL query content */
  mainSql?: string;
  /** Test values content */
  testValues?: string;
}

/**
 * Creates a demo workspace with standard configuration
 * This function encapsulates all the initialization logic used in Layout.tsx
 */
export function createDemoWorkspace(config: DemoWorkspaceConfig = {}): WorkspaceEntity {
  // Default configuration
  const defaultMainSql = 'SELECT user_id, name FROM users;';
  const defaultTestValues = `-- Define test data CTEs here
-- Write WITH clauses, SELECT clauses can be omitted (they will be ignored if written)
-- Example:
with users(user_id, name) as (
  values
    (1::bigint, 'alice'::text),
    (2::bigint, 'bob'::text)
)`;

  // Extract configuration
  const {
    id = WorkspaceEntity.generateId(),
    mainSql = defaultMainSql,
    testValues = defaultTestValues
  } = config;

  // Create workspace instance
  const workspace = new WorkspaceEntity(
    id,
    'demoworkspace',
    'main.sql',
    [], // Will be populated with SQL models
    new TestValuesModel(testValues),
    new SqlFormatterEntity(),
    new FilterConditionsEntity(),
    {} // modelFilterConditions
  );

  // Create main SQL model
  const mainModel = new SqlModelEntity(
    'main',
    'main.sql',
    mainSql,
    [], // dependencies
    undefined, // columns (auto-detected)
    mainSql // originalSql
  );

  // Add SQL model to workspace
  workspace.addSqlModel(mainModel);

  // Initialize filter conditions from SQL models
  workspace.filterConditions.initializeFromModels([mainModel]);

  // Open main.sql tab by default in the workspace
  workspace.openSqlModelTab(mainModel);
  
  // CRITICAL: Verify that openedObjects was properly set
  if (workspace.openedObjects.length === 0) {
    throw new Error('CRITICAL: Demo workspace creation failed - openSqlModelTab did not add to openedObjects');
  }
  
  if (!workspace.activeObjectId) {
    throw new Error('CRITICAL: Demo workspace creation failed - no activeObjectId set');
  }
  
  console.log('[DEBUG] Demo workspace created successfully:', {
    openedObjectsCount: workspace.openedObjects.length,
    activeObjectId: workspace.activeObjectId,
    openedObjects: workspace.openedObjects.map(obj => `${obj.id} (${obj.type})`)
  });

  return workspace;
}

/**
 * Validates that a workspace is a properly initialized demo workspace
 */
export function validateDemoWorkspace(workspace: WorkspaceEntity): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Basic properties validation
  if (workspace.name !== 'demoworkspace') {
    errors.push(`Expected name 'demoworkspace', got '${workspace.name}'`);
  }

  if (workspace.originalFilePath !== 'main.sql') {
    errors.push(`Expected originalFilePath 'main.sql', got '${workspace.originalFilePath}'`);
  }

  // SQL models validation
  if (workspace.sqlModels.length !== 1) {
    errors.push(`Expected 1 SQL model, got ${workspace.sqlModels.length}`);
  } else {
    const mainModel = workspace.sqlModels[0];
    if (mainModel.type !== 'main') {
      errors.push(`Expected main model type 'main', got '${mainModel.type}'`);
    }
    if (mainModel.name !== 'main.sql') {
      errors.push(`Expected main model name 'main.sql', got '${mainModel.name}'`);
    }
    if (!mainModel.originalSql || mainModel.originalSql.length === 0) {
      errors.push('Main model originalSql is missing or empty');
    }
    if (!mainModel.sqlWithoutCte || mainModel.sqlWithoutCte.length === 0) {
      errors.push('Main model sqlWithoutCte is missing or empty');
    }
  }

  // TestValuesModel validation
  if (!workspace.testValues) {
    errors.push('TestValuesModel is missing');
  } else {
    const testValuesString = workspace.testValues.toString();
    if (testValuesString === 'undefined' || testValuesString === '') {
      errors.push('TestValuesModel has invalid content');
    }
    if (!testValuesString.includes('users')) {
      errors.push('TestValuesModel does not contain expected "users" table');
    }
  }

  // SqlFormatterEntity validation
  if (!workspace.formatter) {
    errors.push('SqlFormatterEntity is missing');
  } else {
    const formatterString = workspace.formatter.displayString;
    if (formatterString === 'undefined' || formatterString === '') {
      errors.push('SqlFormatterEntity has invalid content');
    }
    if (!formatterString.includes('identifierEscape')) {
      errors.push('SqlFormatterEntity does not contain expected configuration');
    }
  }

  // FilterConditionsEntity validation (the main issue we're solving)
  if (!workspace.filterConditions) {
    errors.push('FilterConditionsEntity is missing');
  } else {
    const conditionsString = workspace.filterConditions.displayString;
    if (conditionsString === 'undefined') {
      errors.push('FilterConditionsEntity has undefined content - initialization failed');
    }
    if (conditionsString === '{}') {
      errors.push('FilterConditionsEntity has empty content - columns not detected');
    }
    
    // Try to parse and validate structure
    try {
      const conditions = JSON.parse(conditionsString);
      
      // For default demo workspace, expect specific columns
      if (workspace.sqlModels.length > 0) {
        const mainSql = workspace.sqlModels[0].originalSql || workspace.sqlModels[0].sqlWithoutCte;
        if (mainSql === 'SELECT user_id, name FROM users;') {
          // Only validate specific columns for default SQL
          if (!conditions.user_id) {
            errors.push('FilterConditions missing user_id column');
          }
          if (!conditions.name) {
            errors.push('FilterConditions missing name column');
          }
        } else {
          // For custom SQL, just ensure we have some columns
          if (Object.keys(conditions).length === 0) {
            errors.push('FilterConditions has no columns - SQL analysis may have failed');
          }
        }
      }
    } catch (error) {
      errors.push(`FilterConditions JSON is invalid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates demo workspace and validates it in one step
 * Throws error if validation fails
 */
export function createValidatedDemoWorkspace(config: DemoWorkspaceConfig = {}): WorkspaceEntity {
  const workspace = createDemoWorkspace(config);
  const validation = validateDemoWorkspace(workspace);
  
  if (!validation.isValid) {
    throw new Error(`Demo workspace validation failed:\n${validation.errors.join('\n')}`);
  }
  
  return workspace;
}
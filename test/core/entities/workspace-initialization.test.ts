/**
 * Workspace Initialization Test
 * Core Layer - Hexagonal Architecture
 * t-wada style unit tests for workspace creation and filter conditions initialization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceEntity } from '../../../src/core/entities/workspace';
import { SqlModelEntity } from '../../../src/core/entities/sql-model';
import { TestValuesModel } from '../../../src/core/entities/test-values-model';
import { SqlFormatterEntity } from '../../../src/core/entities/sql-formatter';
import { FilterConditionsEntity } from '../../../src/core/entities/filter-conditions';

describe('WorkspaceEntity - demoworkspace initialization', () => {
  let workspace: WorkspaceEntity;
  const defaultMainSql = 'SELECT user_id, name FROM users;';

  beforeEach(() => {
    // Create demoworkspace instance as done in Layout.tsx
    workspace = new WorkspaceEntity(
      'ws_test_demo',
      'demoworkspace',
      'main.sql',
      [], // Will be populated when main.sql is decomposed
      new TestValuesModel(`-- Define test data CTEs here
-- Write WITH clauses, SELECT clauses can be omitted (they will be ignored if written)
-- Example:
with users(user_id, name) as (
  values
    (1::bigint, 'alice'::text),
    (2::bigint, 'bob'::text)
)`),
      new SqlFormatterEntity(),
      new FilterConditionsEntity(),
      {}
    );

    // Add default main SQL model
    const defaultMainModel = new SqlModelEntity(
      'main',
      'main.sql',
      defaultMainSql,
      [],
      undefined,
      defaultMainSql
    );
    workspace.addSqlModel(defaultMainModel);
  });

  describe('Basic workspace properties', () => {
    it('should create workspace with correct name', () => {
      expect(workspace.name).toBe('demoworkspace');
    });

    it('should have main.sql as originalFilePath', () => {
      expect(workspace.originalFilePath).toBe('main.sql');
    });

    it('should contain one SQL model after initialization', () => {
      expect(workspace.sqlModels).toHaveLength(1);
    });

    it('should have main SQL model with correct content', () => {
      const mainModel = workspace.getMainModels()[0];
      expect(mainModel).toBeDefined();
      expect(mainModel.name).toBe('main.sql');
      expect(mainModel.type).toBe('main');
      expect(mainModel.sqlWithoutCte).toBe(defaultMainSql);
      expect(mainModel.originalSql).toBe(defaultMainSql);
    });
  });

  describe('TestValuesModel initialization', () => {
    it('should have properly initialized test values', () => {
      expect(workspace.testValues).toBeInstanceOf(TestValuesModel);
      expect(workspace.testValues.withClause).toContain('users(user_id, name)');
      expect(workspace.testValues.toString()).toContain('alice');
      expect(workspace.testValues.toString()).toContain('bob');
    });

    it('should not return undefined for test values', () => {
      const content = workspace.testValues.toString();
      expect(content).not.toBe('undefined');
      expect(content).not.toBe('');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('FilterConditionsEntity initialization', () => {
    it('should start with undefined conditions before initialization', () => {
      expect(workspace.filterConditions.displayString).toBe('undefined');
    });

    it('should initialize filter conditions from SQL models', () => {
      // This is the key test - initialize from SQL models
      workspace.filterConditions.initializeFromModels(workspace.sqlModels);
      
      const conditions = workspace.filterConditions.displayString;
      expect(conditions).not.toBe('undefined');
      expect(conditions).not.toBe('{}');
      
      // Parse and verify structure
      const parsedConditions = JSON.parse(conditions);
      expect(parsedConditions).toHaveProperty('user_id');
      expect(parsedConditions).toHaveProperty('name');
    });

    it('should generate correct filter structure for user_id and name columns', () => {
      workspace.filterConditions.initializeFromModels(workspace.sqlModels);
      
      const conditions = JSON.parse(workspace.filterConditions.displayString);
      
      // user_id should have empty filter object (ready for conditions)
      expect(conditions.user_id).toBeDefined();
      expect(typeof conditions.user_id).toBe('object');
      
      // name should have empty filter object (ready for conditions)
      expect(conditions.name).toBeDefined();
      expect(typeof conditions.name).toBe('object');
    });

    it('should use SelectableColumnCollector correctly', () => {
      const mainModel = workspace.getMainModels()[0];
      const template = FilterConditionsEntity.generateTemplate([mainModel]);
      
      expect(template).not.toBe('undefined');
      expect(template).not.toBe('{}');
      
      const parsed = JSON.parse(template);
      expect(Object.keys(parsed)).toEqual(['user_id', 'name']);
    });
  });

  describe('SqlFormatterEntity initialization', () => {
    it('should have properly initialized formatter', () => {
      expect(workspace.formatter).toBeInstanceOf(SqlFormatterEntity);
      expect(workspace.formatter.displayString).toContain('identifierEscape');
      expect(workspace.formatter.displayString).toContain('keywordCase');
    });

    it('should not return undefined for formatter', () => {
      const content = workspace.formatter.displayString;
      expect(content).not.toBe('undefined');
      expect(content).not.toBe('');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('Workspace serialization/deserialization', () => {
    it('should serialize to JSON correctly', () => {
      workspace.filterConditions.initializeFromModels(workspace.sqlModels);
      
      const json = workspace.toJSON();
      expect(json.name).toBe('demoworkspace');
      expect(json.sqlModels).toHaveLength(1);
      expect(json.testValues.withClause).toContain('users');
      expect(json.filterConditions.conditions).not.toBe('undefined');
    });

    it('should deserialize from JSON correctly', () => {
      workspace.filterConditions.initializeFromModels(workspace.sqlModels);
      const json = workspace.toJSON();
      
      const restoredWorkspace = WorkspaceEntity.fromJSON(json);
      expect(restoredWorkspace.name).toBe('demoworkspace');
      expect(restoredWorkspace.sqlModels).toHaveLength(1);
      expect(restoredWorkspace.testValues.toString()).toContain('alice');
      expect(restoredWorkspace.filterConditions.displayString).not.toBe('undefined');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty SQL models gracefully', () => {
      const emptyWorkspace = new WorkspaceEntity(
        'ws_empty',
        'empty',
        null,
        []
      );
      
      emptyWorkspace.filterConditions.initializeFromModels([]);
      
      // Should fall back to default template or handle gracefully
      expect(emptyWorkspace.filterConditions.displayString).toBeDefined();
    });

    it('should handle invalid SQL gracefully', () => {
      const invalidSqlModel = new SqlModelEntity(
        'main',
        'invalid.sql',
        'INVALID SQL SYNTAX',
        [],
        undefined,
        'INVALID SQL SYNTAX'
      );
      
      const testWorkspace = new WorkspaceEntity(
        'ws_invalid',
        'test',
        null,
        [invalidSqlModel]
      );
      
      // Should not throw error and should fall back to default
      expect(() => {
        testWorkspace.filterConditions.initializeFromModels([invalidSqlModel]);
      }).not.toThrow();
      
      expect(testWorkspace.filterConditions.displayString).toBeDefined();
    });
  });
});
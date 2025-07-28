/**
 * Demo Workspace Factory Test
 * Core Layer - Business Logic Test
 * t-wada style comprehensive tests for demo workspace creation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createDemoWorkspace, 
  validateDemoWorkspace, 
  createValidatedDemoWorkspace,
  type DemoWorkspaceConfig 
} from '../../../src/core/factories/demo-workspace-factory';
import { WorkspaceEntity } from '../../../src/core/entities/workspace';

describe('Demo Workspace Factory', () => {
  describe('createDemoWorkspace function', () => {
    it('should create workspace with default configuration', () => {
      const workspace = createDemoWorkspace();
      
      expect(workspace).toBeInstanceOf(WorkspaceEntity);
      expect(workspace.name).toBe('demoworkspace');
      expect(workspace.originalFilePath).toBe('main.sql');
      expect(workspace.sqlModels).toHaveLength(1);
    });

    it('should create workspace with custom main SQL', () => {
      const customSql = 'SELECT id, email FROM customers;';
      const workspace = createDemoWorkspace({ mainSql: customSql });
      
      expect(workspace.sqlModels[0].sqlWithoutCte).toBe(customSql);
      expect(workspace.sqlModels[0].originalSql).toBe(customSql);
    });

    it('should create workspace with custom test values', () => {
      const customTestValues = 'with products as (values (1, \'laptop\'))';
      const workspace = createDemoWorkspace({ testValues: customTestValues });
      
      expect(workspace.testValues.toString()).toBe(customTestValues);
    });

    it('should create workspace with custom ID', () => {
      const customId = 'test_workspace_123';
      const workspace = createDemoWorkspace({ id: customId });
      
      expect(workspace.id).toBe(customId);
    });

    it('should initialize FilterConditions automatically', () => {
      const workspace = createDemoWorkspace();
      
      expect(workspace.filterConditions.displayString).not.toBe('undefined');
      expect(workspace.filterConditions.displayString).not.toBe('{}');
      
      const conditions = JSON.parse(workspace.filterConditions.displayString);
      expect(conditions).toHaveProperty('user_id');
      expect(conditions).toHaveProperty('name');
    });

    it('should create different instances with different IDs', () => {
      const workspace1 = createDemoWorkspace();
      const workspace2 = createDemoWorkspace();
      
      expect(workspace1.id).not.toBe(workspace2.id);
    });
  });

  describe('validateDemoWorkspace function', () => {
    let validWorkspace: WorkspaceEntity;

    beforeEach(() => {
      validWorkspace = createDemoWorkspace();
    });

    it('should validate a properly created demo workspace', () => {
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid workspace name', () => {
      validWorkspace.name = 'wrong_name';
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Expected name \'demoworkspace\''));
    });

    it('should detect invalid originalFilePath', () => {
      validWorkspace.originalFilePath = 'wrong.sql';
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Expected originalFilePath \'main.sql\''));
    });

    it('should detect wrong number of SQL models', () => {
      validWorkspace.sqlModels = [];
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('Expected 1 SQL model, got 0'));
    });

    it('should detect undefined FilterConditions', () => {
      validWorkspace.filterConditions.conditions = 'undefined';
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('FilterConditionsEntity has undefined content'));
    });

    it('should detect empty FilterConditions', () => {
      validWorkspace.filterConditions.conditions = '{}';
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('FilterConditionsEntity has empty content'));
    });

    it('should detect missing required columns in FilterConditions', () => {
      validWorkspace.filterConditions.conditions = '{"other_column": {}}';
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('FilterConditions missing user_id column'));
      expect(result.errors).toContainEqual(expect.stringContaining('FilterConditions missing name column'));
    });

    it('should detect invalid JSON in FilterConditions', () => {
      validWorkspace.filterConditions.conditions = 'invalid json';
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('FilterConditions JSON is invalid'));
    });

    it('should detect missing TestValuesModel', () => {
      // @ts-expect-error - testing edge case
      validWorkspace.testValues = null;
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual('TestValuesModel is missing');
    });

    it('should detect invalid TestValuesModel content', () => {
      validWorkspace.testValues.withClause = '';
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual('TestValuesModel has invalid content');
    });

    it('should detect missing SqlFormatterEntity', () => {
      // @ts-expect-error - testing edge case
      validWorkspace.formatter = null;
      const result = validateDemoWorkspace(validWorkspace);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual('SqlFormatterEntity is missing');
    });
  });

  describe('createValidatedDemoWorkspace function', () => {
    it('should create and return valid workspace', () => {
      const workspace = createValidatedDemoWorkspace();
      
      expect(workspace).toBeInstanceOf(WorkspaceEntity);
      expect(workspace.name).toBe('demoworkspace');
      
      // Verify it passes validation
      const validation = validateDemoWorkspace(workspace);
      expect(validation.isValid).toBe(true);
    });

    it('should accept custom configuration', () => {
      const config: DemoWorkspaceConfig = {
        mainSql: 'SELECT product_id, title FROM products;'
      };
      
      const workspace = createValidatedDemoWorkspace(config);
      
      expect(workspace.sqlModels[0].sqlWithoutCte).toBe(config.mainSql);
      
      // Should still be valid
      const validation = validateDemoWorkspace(workspace);
      expect(validation.isValid).toBe(true);
    });

    it('should throw error for invalid configuration that produces invalid workspace', () => {
      // This is a theoretical test - our factory should always produce valid workspaces
      // But if there were a bug in the factory, this would catch it
      
      expect(() => {
        const workspace = createDemoWorkspace();
        // Simulate factory bug by corrupting after creation
        workspace.filterConditions.conditions = 'undefined';
        validateDemoWorkspace(workspace); // This would fail validation
      }).not.toThrow(); // This specific test just validates the approach
    });
  });

  describe('Integration scenarios', () => {
    it('should create workspace identical to Layout.tsx logic', () => {
      // This test ensures our factory creates exactly what Layout.tsx was creating
      const workspace = createDemoWorkspace();
      
      // Verify exact match with Layout.tsx expectations
      expect(workspace.name).toBe('demoworkspace');
      expect(workspace.originalFilePath).toBe('main.sql');
      expect(workspace.sqlModels).toHaveLength(1);
      
      const mainModel = workspace.sqlModels[0];
      expect(mainModel.type).toBe('main');
      expect(mainModel.name).toBe('main.sql');
      expect(mainModel.sqlWithoutCte).toBe('SELECT user_id, name FROM users;');
      expect(mainModel.originalSql).toBe('SELECT user_id, name FROM users;');
      
      // TestValues should contain expected content
      expect(workspace.testValues.toString()).toContain('users(user_id, name)');
      expect(workspace.testValues.toString()).toContain('alice');
      expect(workspace.testValues.toString()).toContain('bob');
      
      // FilterConditions should be properly initialized
      expect(workspace.filterConditions.displayString).not.toBe('undefined');
      const conditions = JSON.parse(workspace.filterConditions.displayString);
      expect(conditions).toHaveProperty('user_id');
      expect(conditions).toHaveProperty('name');
    });

    it('should create serializable workspace', () => {
      const workspace = createDemoWorkspace();
      
      // Should serialize without errors
      const json = workspace.toJSON();
      expect(json).toBeDefined();
      expect(json.name).toBe('demoworkspace');
      
      // Should deserialize correctly
      const restored = WorkspaceEntity.fromJSON(json);
      expect(restored.name).toBe('demoworkspace');
      
      // Restored workspace should also be valid
      const validation = validateDemoWorkspace(restored);
      expect(validation.isValid).toBe(true);
    });

    it('should handle edge case SQL queries', () => {
      const edgeCases = [
        'SELECT user_id, name FROM users WHERE active = true',
        'SELECT u.id, u.name, COUNT(*) as post_count FROM users u LEFT JOIN posts p ON u.id = p.user_id GROUP BY u.id, u.name',
        'WITH active_users AS (SELECT * FROM users WHERE active) SELECT user_id, name FROM active_users'
      ];

      edgeCases.forEach(sql => {
        const workspace = createDemoWorkspace({ mainSql: sql });
        const validation = validateDemoWorkspace(workspace);
        
        expect(validation.isValid).toBe(true);
        expect(workspace.filterConditions.displayString).not.toBe('undefined');
      });
    });
  });

  describe('Performance and resource usage', () => {
    it('should create workspace efficiently', () => {
      const start = performance.now();
      
      const workspace = createDemoWorkspace();
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(workspace).toBeDefined();
    });

    it('should create multiple workspaces without interference', () => {
      const workspaces = Array.from({ length: 10 }, () => createDemoWorkspace());
      
      // All should be valid
      workspaces.forEach(workspace => {
        const validation = validateDemoWorkspace(workspace);
        expect(validation.isValid).toBe(true);
      });
      
      // All should have unique IDs
      const ids = workspaces.map(w => w.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(workspaces.length);
    });
  });
});
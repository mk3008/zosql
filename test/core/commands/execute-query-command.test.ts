/**
 * Execute Query Command Tests
 * Testing command pattern implementation for query execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecuteQueryCommand } from '@core/commands/execute-query-command';
import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlModelEntity } from '@core/entities/sql-model';
import { TestValuesModel } from '@core/entities/test-values-model';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';

// Mock PGlite
vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockResolvedValue({
      rows: [
        { user_id: 1, name: 'alice' },
        { user_id: 2, name: 'bob' }
      ]
    })
  }))
}));

describe('ExecuteQueryCommand', () => {
  let workspace: WorkspaceEntity;
  let sqlModel: SqlModelEntity;
  
  beforeEach(() => {
    // Create test workspace
    workspace = new WorkspaceEntity(
      'workspace-1',
      'Test Workspace',
      'main.sql',
      [],
      new TestValuesModel(`with users(user_id, name) as (
  values
    (1::bigint, 'alice'::text),
    (2::bigint, 'bob'::text)
)`),
      new SqlFormatterEntity(),
      new FilterConditionsEntity(),
      {}
    );
    
    // Create test SQL model
    sqlModel = new SqlModelEntity(
      'main',
      'main.sql',
      'SELECT user_id, name FROM users;',
      [],
      undefined,
      'SELECT user_id, name FROM users;'
    );
  });
  
  describe('canExecute', () => {
    it('should return true when tab content is not empty', () => {
      const command = new ExecuteQueryCommand({
        workspace,
        sqlModel,
        tabContent: 'SELECT * FROM users',
        tabType: 'main'
      });
      
      expect(command.canExecute()).toBe(true);
    });
    
    it('should return false when tab content is empty', () => {
      const command = new ExecuteQueryCommand({
        workspace,
        sqlModel,
        tabContent: '',
        tabType: 'main'
      });
      
      expect(command.canExecute()).toBe(false);
    });
    
    it('should return false when tab content is only whitespace', () => {
      const command = new ExecuteQueryCommand({
        workspace,
        sqlModel,
        tabContent: '   \n\t  ',
        tabType: 'main'
      });
      
      expect(command.canExecute()).toBe(false);
    });
  });
  
  describe('execute', () => {
    it('should execute SQL with CTE composition when model is provided', async () => {
      const command = new ExecuteQueryCommand({
        workspace,
        sqlModel,
        tabContent: 'SELECT user_id, name FROM users;',
        tabType: 'main'
      });
      
      const result = await command.execute();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]).toEqual({ user_id: 1, name: 'alice' });
      expect(result.executedSql).toContain('WITH users');
    });
    
    it('should execute raw SQL when no model is provided', async () => {
      const command = new ExecuteQueryCommand({
        workspace: null,
        sqlModel: null,
        tabContent: 'SELECT 1 as id',
        tabType: 'main'
      });
      
      const result = await command.execute();
      
      expect(result.success).toBe(true);
      expect(result.executedSql).toBe('SELECT 1 as id');
    });
    
    it('should use workspace model as fallback for main tab', async () => {
      // Add model to workspace
      workspace.addSqlModel(sqlModel);
      
      const command = new ExecuteQueryCommand({
        workspace,
        sqlModel: null, // No direct model
        tabContent: 'SELECT * FROM users;',
        tabType: 'main'
      });
      
      const result = await command.execute();
      
      expect(result.success).toBe(true);
      expect(result.executedSql).toContain('WITH users');
    });
    
    it('should handle SQL execution errors gracefully', async () => {
      // Mock error
      const { PGlite } = await import('@electric-sql/pglite') as any;
      PGlite.mockImplementationOnce(() => ({
        query: vi.fn().mockRejectedValue(new Error('relation "users" does not exist'))
      }));
      
      const command = new ExecuteQueryCommand({
        workspace: null,
        sqlModel: null,
        tabContent: 'SELECT * FROM users;',
        tabType: 'main'
      });
      
      const result = await command.execute();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('relation "users" does not exist');
      expect(result.error).toContain('Executed SQL:');
    });
    
    it('should update model SQL with current tab content', async () => {
      const command = new ExecuteQueryCommand({
        workspace,
        sqlModel,
        tabContent: 'SELECT id, username FROM users;', // Different from model
        tabType: 'main'
      });
      
      await command.execute();
      
      expect(sqlModel.sqlWithoutCte).toBe('SELECT id, username FROM users;');
    });
  });
});
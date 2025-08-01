import { describe, it, expect, beforeEach } from 'vitest';
import { ExecuteQueryCommand, ExecuteQueryContext } from '../../../src/core/commands/execute-query-command';
import { SqlModelEntity } from '../../../src/core/entities/sql-model';
import { WorkspaceEntity } from '../../../src/core/entities/workspace';

describe('ExecuteQueryCommand - CTE Testing', () => {
  let command: ExecuteQueryCommand;
  let context: ExecuteQueryContext;
  let workspace: WorkspaceEntity;
  let cteModel: SqlModelEntity;

  beforeEach(() => {
    // Create minimal workspace for testing (id, name, originalFilePath)
    workspace = new WorkspaceEntity('test-workspace', 'Test Workspace', null);
    
    // Create a CTE model (type, name, sql)
    cteModel = new SqlModelEntity('cte', 'test_cte', 'SELECT 1 as id, \'test\' as name');
    cteModel.updateEditorContent('SELECT 1 as id, \'test\' as name');
    workspace.addSqlModel(cteModel);
    
    // Set up context for CTE execution
    context = {
      workspace,
      sqlModel: cteModel,
      tabContent: 'SELECT 1 as id, \'test\' as name',
      tabType: 'cte'
    };
    
    command = new ExecuteQueryCommand(context);
  });

  it('should execute CTE independently using getDynamicSql with wrapper', async () => {
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.executedSql).toContain('WITH test_cte AS');
    expect(result.executedSql).toContain('SELECT * FROM test_cte');
  });

  it('should handle CTE execution errors gracefully', async () => {
    // Update CTE model with invalid SQL for this test
    cteModel.updateEditorContent('INVALID SQL SYNTAX');
    
    // Create context with invalid SQL
    const invalidContext: ExecuteQueryContext = {
      workspace,
      sqlModel: cteModel,
      tabContent: 'INVALID SQL SYNTAX',
      tabType: 'cte'
    };
    
    const invalidCommand = new ExecuteQueryCommand(invalidContext);
    const result = await invalidCommand.execute();
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('CTE execution failed');
    // getDynamicSql fails before SQL wrapping, so executedSql contains the original content
    expect(result.executedSql).toBe('INVALID SQL SYNTAX');
  });

  it('should properly format CTE test SQL using getDynamicSql', async () => {
    const result = await command.execute();
    
    // The SQL formatter from getDynamicSql produces lowercase and quoted identifiers
    expect(result.executedSql).toContain('WITH test_cte AS');
    expect(result.executedSql).toContain('select 1 as "id"');
    expect(result.executedSql).toContain('SELECT * FROM test_cte');
  });
});
/**
 * CreateWorkspaceCommand Test - t-wada Style TDD
 * テストファーストでビジネスロジックを実装
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateWorkspaceCommand } from '@ui/commands/create-workspace-command';
import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';
import { TestValuesModel } from '@core/entities/test-values-model';

describe('CreateWorkspaceCommand', () => {
  describe('入力検証', () => {
    it('名前が空文字の場合はエラーを投げる', async () => {
      // Arrange
      const command = new CreateWorkspaceCommand('', 'SELECT * FROM users');
      
      // Act & Assert
      await expect(command.execute()).rejects.toThrow('Workspace name is required');
    });

    it('名前が空白のみの場合はエラーを投げる', async () => {
      // Arrange
      const command = new CreateWorkspaceCommand('   ', 'SELECT * FROM users');
      
      // Act & Assert
      await expect(command.execute()).rejects.toThrow('Workspace name is required');
    });

    it('SQLが空文字の場合はエラーを投げる', async () => {
      // Arrange
      const command = new CreateWorkspaceCommand('test-workspace', '');
      
      // Act & Assert
      await expect(command.execute()).rejects.toThrow('SQL query is required');
    });

    it('SQLが空白のみの場合はエラーを投げる', async () => {
      // Arrange
      const command = new CreateWorkspaceCommand('test-workspace', '   ');
      
      // Act & Assert
      await expect(command.execute()).rejects.toThrow('SQL query is required');
    });
  });

  describe('正常なワークスペース作成', () => {
    it('有効な名前とSQLでワークスペースを作成できる', async () => {
      // Arrange
      const name = 'test-workspace';
      const sql = 'SELECT id, name FROM users WHERE active = true';
      const command = new CreateWorkspaceCommand(name, sql);
      
      // Act
      const result = await command.execute();
      
      // Assert
      expect(result).toBeInstanceOf(WorkspaceEntity);
      expect(result.name).toBe(name);
      expect(result.sqlModels).toHaveLength(1);
      expect(result.sqlModels[0].sqlWithoutCte).toBe(sql);
    });

    it('名前の前後の空白は自動でトリムされる', async () => {
      // Arrange
      const command = new CreateWorkspaceCommand('  test-workspace  ', 'SELECT 1');
      
      // Act
      const result = await command.execute();
      
      // Assert
      expect(result.name).toBe('test-workspace');
    });

    it('SQLの前後の空白は自動でトリムされる', async () => {
      // Arrange
      const sql = '  SELECT id, name FROM users  ';
      const command = new CreateWorkspaceCommand('test', sql);
      
      // Act
      const result = await command.execute();
      
      // Assert
      expect(result.sqlModels[0].sqlWithoutCte).toBe('SELECT id, name FROM users');
    });
  });

  describe('CTE含むSQL処理', () => {
    it('WITH句を含むSQLを正しく分解できる', async () => {
      // Arrange
      const sql = `
        WITH user_stats AS (
          SELECT user_id, COUNT(*) as order_count
          FROM orders
          GROUP BY user_id
        )
        SELECT u.name, us.order_count
        FROM users u
        JOIN user_stats us ON u.id = us.user_id
      `;
      const command = new CreateWorkspaceCommand('cte-test', sql);
      
      // Act
      const result = await command.execute();
      
      // Assert
      expect(result.sqlModels).toHaveLength(2); // main + CTE
      expect(result.sqlModels.some(m => m.name === 'user_stats')).toBe(true);
      expect(result.sqlModels.some(m => m.type === 'main')).toBe(true);
    });
  });

  describe('デフォルト設定の初期化', () => {
    it('新しいワークスペースには適切なデフォルト設定が含まれる', async () => {
      // Arrange
      const command = new CreateWorkspaceCommand('test', 'SELECT 1');
      
      // Act
      const result = await command.execute();
      
      // Assert
      expect(result.formatter).toBeInstanceOf(SqlFormatterEntity);
      expect(result.filterConditions).toBeInstanceOf(FilterConditionsEntity);
      expect(result.testValues).toBeInstanceOf(TestValuesModel);
      expect(result.openedObjects).toHaveLength(1); // main.sqlが自動で開かれる
    });

    it('フィルター条件はSQLモデルから自動初期化される', async () => {
      // Arrange
      const sql = 'SELECT id, name, age FROM users WHERE active = true';
      const command = new CreateWorkspaceCommand('test', sql);
      
      // Act
      const result = await command.execute();
      
      // Assert
      expect(result.filterConditions.displayString).not.toBe('{}');
      // SQLから抽出された列情報がフィルター条件に含まれることを確認
    });
  });

  describe('エラーハンドリング', () => {
    it('不正なSQL構文の場合は適切なエラーメッセージを返す', async () => {
      // Arrange
      const invalidSql = 'SELCT invalid syntax FROM';
      const command = new CreateWorkspaceCommand('test', invalidSql);
      
      // Act & Assert
      await expect(command.execute()).rejects.toThrow(/SQL parsing failed/);
    });
  });

  describe('実行可能性チェック', () => {
    it('有効な入力の場合はcanExecuteがtrueを返す', () => {
      // Arrange
      const command = new CreateWorkspaceCommand('test', 'SELECT 1');
      
      // Act & Assert
      expect(command.canExecute()).toBe(true);
    });

    it('名前が空の場合はcanExecuteがfalseを返す', () => {
      // Arrange
      const command = new CreateWorkspaceCommand('', 'SELECT 1');
      
      // Act & Assert
      expect(command.canExecute()).toBe(false);
    });

    it('SQLが空の場合はcanExecuteがfalseを返す', () => {
      // Arrange
      const command = new CreateWorkspaceCommand('test', '');
      
      // Act & Assert
      expect(command.canExecute()).toBe(false);
    });
  });
});
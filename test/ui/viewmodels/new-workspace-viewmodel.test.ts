/**
 * NewWorkspaceViewModel Test - t-wada Style TDD
 * ViewModelのUI状態管理ロジックをテストファーストで実装
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NewWorkspaceViewModel } from '@ui/viewmodels/new-workspace-viewmodel';
import { WorkspaceEntity } from '@core/entities/workspace';

// CommandのMock
vi.mock('@ui/commands/create-workspace-command', () => ({
  CreateWorkspaceCommand: vi.fn().mockImplementation((name: string, sql: string) => ({
    canExecute: () => name.trim().length > 0 && sql.trim().length > 0,
    execute: vi.fn().mockResolvedValue(new WorkspaceEntity(
      'test-id',
      name,
      `${name}.sql`,
      [],
      {} as any,
      {} as any,
      {} as any,
      {}
    ))
  }))
}));

describe('NewWorkspaceViewModel', () => {
  let viewModel: NewWorkspaceViewModel;

  beforeEach(() => {
    viewModel = new NewWorkspaceViewModel();
  });

  describe('初期状態', () => {
    it('初期状態では名前が空文字である', () => {
      expect(viewModel.name).toBe('');
    });

    it('初期状態ではSQLが空文字である', () => {
      expect(viewModel.sql).toBe('');
    });

    it('初期状態では実行中ではない', () => {
      expect(viewModel.isLoading).toBe(false);
    });

    it('初期状態ではエラーがない', () => {
      expect(viewModel.error).toBeNull();
    });

    it('初期状態では実行不可能である', () => {
      expect(viewModel.canExecute).toBe(false);
    });
  });

  describe('入力状態管理', () => {
    it('名前を設定できる', () => {
      // Act
      viewModel.name = 'test-workspace';
      
      // Assert
      expect(viewModel.name).toBe('test-workspace');
    });

    it('SQLを設定できる', () => {
      // Act
      viewModel.sql = 'SELECT * FROM users';
      
      // Assert
      expect(viewModel.sql).toBe('SELECT * FROM users');
    });

    it('名前とSQLが両方設定されていれば実行可能になる', () => {
      // Act
      viewModel.name = 'test';
      viewModel.sql = 'SELECT 1';
      
      // Assert
      expect(viewModel.canExecute).toBe(true);
    });

    it('名前のみでは実行不可能である', () => {
      // Act
      viewModel.name = 'test';
      
      // Assert
      expect(viewModel.canExecute).toBe(false);
    });

    it('SQLのみでは実行不可能である', () => {
      // Act
      viewModel.sql = 'SELECT 1';
      
      // Assert
      expect(viewModel.canExecute).toBe(false);
    });

    it('空白のみの名前では実行不可能である', () => {
      // Act
      viewModel.name = '   ';
      viewModel.sql = 'SELECT 1';
      
      // Assert
      expect(viewModel.canExecute).toBe(false);
    });

    it('空白のみのSQLでは実行不可能である', () => {
      // Act
      viewModel.name = 'test';
      viewModel.sql = '   ';
      
      // Assert
      expect(viewModel.canExecute).toBe(false);
    });
  });

  describe('ワークスペース作成', () => {
    it('有効な入力でワークスペースを作成できる', async () => {
      // Arrange
      viewModel.name = 'test-workspace';
      viewModel.sql = 'SELECT id, name FROM users';
      let createdWorkspace: WorkspaceEntity | null = null;
      
      viewModel.onWorkspaceCreated = (workspace) => {
        createdWorkspace = workspace;
      };

      // Act
      await viewModel.executeCreateWorkspace();

      // Assert
      expect(createdWorkspace).toBeInstanceOf(WorkspaceEntity);
      expect(createdWorkspace?.name).toBe('test-workspace');
    });

    it('実行中はisLoadingがtrueになる', async () => {
      // Arrange
      viewModel.name = 'test';
      viewModel.sql = 'SELECT 1';
      
      // Act
      const promise = viewModel.executeCreateWorkspace();
      
      // Assert
      expect(viewModel.isLoading).toBe(true);
      
      await promise;
      expect(viewModel.isLoading).toBe(false);
    });

    it('実行中は実行不可能になる', async () => {
      // Arrange
      viewModel.name = 'test';
      viewModel.sql = 'SELECT 1';
      
      // Act
      const promise = viewModel.executeCreateWorkspace();
      
      // Assert
      expect(viewModel.canExecute).toBe(false);
      
      await promise;
      expect(viewModel.canExecute).toBe(true);
    });

    it('エラーが発生した場合はエラー状態になる', async () => {
      // Arrange
      const mockCommand = {
        canExecute: () => true,
        execute: vi.fn().mockRejectedValue(new Error('Test error'))
      };
      
      // ViewModelの内部コマンドをモック
      (viewModel as any).createCommand = () => mockCommand;
      
      viewModel.name = 'test';
      viewModel.sql = 'SELECT 1';

      // Act
      await viewModel.executeCreateWorkspace();

      // Assert
      expect(viewModel.error).toBe('Test error');
      expect(viewModel.isLoading).toBe(false);
    });

    it('成功後はフォームがリセットされる', async () => {
      // Arrange
      viewModel.name = 'test-workspace';
      viewModel.sql = 'SELECT 1';

      // Act
      await viewModel.executeCreateWorkspace();

      // Assert
      expect(viewModel.name).toBe('');
      expect(viewModel.sql).toBe('');
      expect(viewModel.error).toBeNull();
    });
  });

  describe('エラー処理', () => {
    it('エラーをクリアできる', () => {
      // Arrange
      (viewModel as any)._error = 'Test error';

      // Act
      viewModel.clearError();

      // Assert
      expect(viewModel.error).toBeNull();
    });
  });

  describe('変更通知', () => {
    it('プロパティ変更時にイベントが発火される', () => {
      // Arrange
      const mockCallback = vi.fn();
      viewModel.addPropertyChangeListener(mockCallback);

      // Act
      viewModel.name = 'test';

      // Assert
      expect(mockCallback).toHaveBeenCalledWith('name', 'test');
    });

    it('同じ値の設定では変更通知が発火されない', () => {
      // Arrange
      viewModel.name = 'test';
      const mockCallback = vi.fn();
      viewModel.addPropertyChangeListener(mockCallback);

      // Act
      viewModel.name = 'test'; // 同じ値

      // Assert
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('リソース管理', () => {
    it('disposeでリスナーがクリアされる', () => {
      // Arrange
      const mockCallback = vi.fn();
      viewModel.addPropertyChangeListener(mockCallback);

      // Act
      viewModel.dispose();
      viewModel.name = 'test';

      // Assert
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
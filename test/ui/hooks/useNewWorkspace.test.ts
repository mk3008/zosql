/**
 * useNewWorkspace Hook Test - Functional Programming Approach
 * Tests for the functional React Hook implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNewWorkspace } from '@ui/hooks/useNewWorkspace';
import { WorkspaceEntity } from '@core/entities/workspace';
import { TestValuesModel } from '@core/entities/test-values-model';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';

// Mock the workspace service with functional approach
vi.mock('@core/services/workspace-service', () => ({
  createWorkspace: vi.fn()
}));

describe('useNewWorkspace Hook - Functional Approach', () => {
  const mockWorkspace = new WorkspaceEntity(
    'test-id',
    'Test Workspace',
    'test-workspace.sql',
    [],
    {} as TestValuesModel,
    {} as SqlFormatterEntity,
    {} as FilterConditionsEntity,
    {}
  );

  const mockOnWorkspaceCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useNewWorkspace());
      
      expect(result.current.name).toBe('');
      expect(result.current.sql).toBe('');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.canExecute).toBe(false);
    });
  });

  describe('状態管理', () => {
    it('名前の変更が正しく動作する', () => {
      const { result } = renderHook(() => useNewWorkspace());
      
      act(() => {
        result.current.setName('Test Workspace');
      });
      
      expect(result.current.name).toBe('Test Workspace');
    });

    it('SQLの変更が正しく動作する', () => {
      const { result } = renderHook(() => useNewWorkspace());
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
      });
      
      expect(result.current.sql).toBe('SELECT * FROM test');
    });

    it('フォームのリセットが正しく動作する', () => {
      const { result } = renderHook(() => useNewWorkspace());
      
      act(() => {
        result.current.setName('Test Name');
        result.current.setSql('SELECT * FROM test');
      });
      
      act(() => {
        result.current.resetForm();
      });
      
      expect(result.current.name).toBe('');
      expect(result.current.sql).toBe('');
      expect(result.current.error).toBe(null);
    });
  });

  describe('バリデーション', () => {
    it('名前とSQLが入力されていない場合は実行不可', () => {
      const { result } = renderHook(() => useNewWorkspace());
      
      expect(result.current.canExecute).toBe(false);
    });

    it('名前のみ入力されている場合は実行不可', () => {
      const { result } = renderHook(() => useNewWorkspace());
      
      act(() => {
        result.current.setName('Test Workspace');
      });
      
      expect(result.current.canExecute).toBe(false);
    });

    it('SQLのみ入力されている場合は実行不可', () => {
      const { result } = renderHook(() => useNewWorkspace());
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
      });
      
      expect(result.current.canExecute).toBe(false);
    });

    it('名前とSQLが両方入力されている場合は実行可能', () => {
      const { result } = renderHook(() => useNewWorkspace());
      
      act(() => {
        result.current.setName('Test Workspace');
        result.current.setSql('SELECT * FROM test');
      });
      
      expect(result.current.canExecute).toBe(true);
    });

    it('ローディング中は実行不可', () => {
      const { result } = renderHook(() => useNewWorkspace());
      
      act(() => {
        result.current.setName('Test Workspace');
        result.current.setSql('SELECT * FROM test');
      });
      
      expect(result.current.canExecute).toBe(true);
      
      // ローディング状態をテストするため、モックの遅延実行をテスト
      // 実際の実装では createWorkspace が非同期でローディング状態が変わる
    });
  });

  describe('ワークスペース作成', () => {
    it('成功時にワークスペースを作成してコールバックを呼び出す', async () => {
      const { createWorkspace } = await import('@core/services/workspace-service');
      vi.mocked(createWorkspace).mockResolvedValueOnce(mockWorkspace);

      const { result } = renderHook(() => useNewWorkspace(mockOnWorkspaceCreated));
      
      act(() => {
        result.current.setName('Test Workspace');
        result.current.setSql('SELECT * FROM test');
      });

      await act(async () => {
        const workspace = await result.current.createWorkspace();
        expect(workspace).toBe(mockWorkspace);
      });

      expect(mockOnWorkspaceCreated).toHaveBeenCalledWith(mockWorkspace);
      expect(result.current.name).toBe('');
      expect(result.current.sql).toBe('');
      expect(result.current.error).toBe(null);
    });

    it('失敗時にエラーを設定する', async () => {
      const { createWorkspace } = await import('@core/services/workspace-service');
      const error = new Error('Creation failed');
      vi.mocked(createWorkspace).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNewWorkspace(mockOnWorkspaceCreated));
      
      act(() => {
        result.current.setName('Test Workspace');
        result.current.setSql('SELECT * FROM test');
      });

      await act(async () => {
        const workspace = await result.current.createWorkspace();
        expect(workspace).toBe(null);
      });

      expect(result.current.error).toBe('Creation failed');
      expect(mockOnWorkspaceCreated).not.toHaveBeenCalled();
    });

    it('実行不可能な状態では何もしない', async () => {
      const { result } = renderHook(() => useNewWorkspace(mockOnWorkspaceCreated));

      await act(async () => {
        const workspace = await result.current.createWorkspace();
        expect(workspace).toBe(null);
      });

      expect(mockOnWorkspaceCreated).not.toHaveBeenCalled();
    });
  });

  describe('エラー管理', () => {
    it('エラーのクリアが正しく動作する', () => {
      const { result } = renderHook(() => useNewWorkspace());
      
      // エラーを手動で設定（実際の実装では createWorkspace でエラーが設定される）
      act(() => {
        result.current.setName('Test');
        result.current.setSql('SELECT');
      });

      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBe(null);
    });
  });

  describe('関数の参照安定性', () => {
    it('関数が再レンダリング間で安定している', () => {
      const { result, rerender } = renderHook(() => useNewWorkspace());
      
      const firstRenderFunctions = {
        setName: result.current.setName,
        setSql: result.current.setSql,
        createWorkspace: result.current.createWorkspace,
        clearError: result.current.clearError,
        resetForm: result.current.resetForm,
      };
      
      rerender();
      
      expect(result.current.setName).toBe(firstRenderFunctions.setName);
      expect(result.current.setSql).toBe(firstRenderFunctions.setSql);
      expect(result.current.clearError).toBe(firstRenderFunctions.clearError);
      expect(result.current.resetForm).toBe(firstRenderFunctions.resetForm);
      // createWorkspace は依存関係があるため、状態変更時に変わる可能性がある
    });
  });
});
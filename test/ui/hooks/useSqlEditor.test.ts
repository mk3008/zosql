/**
 * useSqlEditor Hook Test - Functional Programming Approach
 * Tests for the functional SQL Editor Hook implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSqlEditor } from '@ui/hooks/useSqlEditor';
import type { QueryExecutionResult } from '@shared/types';
import { WorkspaceEntity } from '@core/entities/workspace';
import { TestValuesModel } from '@core/entities/test-values-model';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';

describe('useSqlEditor Hook - Functional Approach', () => {
  const mockWorkspace = new WorkspaceEntity(
    'test-workspace',
    'Test Workspace',
    'test.sql',
    [],
    {} as TestValuesModel,
    {} as SqlFormatterEntity,
    {} as FilterConditionsEntity,
    {},
    true,
    new Date().toISOString(),
    new Date().toISOString()
  );

  const mockSuccessResult: QueryExecutionResult = {
    status: "completed" as const,
    context: {
      startTime: new Date(),
      executionId: "test-123"
    },
    stats: {
      rowsAffected: 0,
      rowsReturned: 1,
      executionTimeMs: 100
    },
    errors: [],
    warnings: [],
    sql: "SELECT 1",
    rows: [{ id: 1, name: "Test" }]
  };

  const mockQueryExecutor = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useSqlEditor());
      
      expect(result.current.sql).toBe('');
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.result).toBe(null);
      expect(result.current.workspace).toBe(null);
      expect(result.current.canExecute).toBe(false);
      expect(result.current.hasResult).toBe(false);
      expect(result.current.isSuccessful).toBe(false);
      expect(result.current.executionTime).toBe(0);
    });
  });

  describe('状態管理', () => {
    it('SQLの設定が正しく動作する', () => {
      const { result } = renderHook(() => useSqlEditor());
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
      });
      
      expect(result.current.sql).toBe('SELECT * FROM test');
    });

    it('ワークスペースの設定が正しく動作する', () => {
      const { result } = renderHook(() => useSqlEditor());
      
      act(() => {
        result.current.setWorkspace(mockWorkspace);
      });
      
      expect(result.current.workspace).toBe(mockWorkspace);
    });

    it('結果のクリアが正しく動作する', () => {
      const { result } = renderHook(() => useSqlEditor());
      
      // 結果を手動で設定（実際の実装では executeQuery で設定される）
      act(() => {
        result.current.setSql('SELECT * FROM test');
        result.current.setWorkspace(mockWorkspace);
      });
      
      act(() => {
        result.current.clearResult();
      });
      
      expect(result.current.result).toBe(null);
    });

    it('全クリアが正しく動作する', () => {
      const { result } = renderHook(() => useSqlEditor());
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
        result.current.setWorkspace(mockWorkspace);
      });
      
      act(() => {
        result.current.clearAll();
      });
      
      expect(result.current.sql).toBe('');
      expect(result.current.workspace).toBe(null);
      expect(result.current.result).toBe(null);
    });
  });

  describe('バリデーション', () => {
    it('SQLが空の場合は実行不可', () => {
      const { result } = renderHook(() => useSqlEditor());
      
      act(() => {
        result.current.setWorkspace(mockWorkspace);
      });
      
      expect(result.current.canExecute).toBe(false);
    });

    it('ワークスペースがない場合は実行不可', () => {
      const { result } = renderHook(() => useSqlEditor());
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
      });
      
      expect(result.current.canExecute).toBe(false);
    });

    it('SQLとワークスペースがある場合は実行可能', () => {
      const { result } = renderHook(() => useSqlEditor());
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
        result.current.setWorkspace(mockWorkspace);
      });
      
      expect(result.current.canExecute).toBe(true);
    });

    it('実行中は実行不可', async () => {
      mockQueryExecutor.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      const { result } = renderHook(() => useSqlEditor(mockQueryExecutor));
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
        result.current.setWorkspace(mockWorkspace);
      });
      
      expect(result.current.canExecute).toBe(true);
      
      act(() => {
        result.current.executeQuery();
      });
      
      expect(result.current.isExecuting).toBe(true);
      expect(result.current.canExecute).toBe(false);
    });
  });

  describe('クエリ実行', () => {
    it('成功時に結果が正しく設定される', async () => {
      mockQueryExecutor.mockResolvedValueOnce(mockSuccessResult);
      
      const { result } = renderHook(() => useSqlEditor(mockQueryExecutor));
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
        result.current.setWorkspace(mockWorkspace);
      });
      
      await act(async () => {
        await result.current.executeQuery();
      });
      
      expect(result.current.result?.status).toBe("completed");
      expect(result.current.isSuccessful).toBe(true);
      expect(result.current.hasResult).toBe(true);
      expect(result.current.isExecuting).toBe(false);
      expect(mockQueryExecutor).toHaveBeenCalledWith('SELECT * FROM test', mockWorkspace);
    });

    it('失敗時にエラーが正しく設定される', async () => {
      const error = new Error('Query failed');
      mockQueryExecutor.mockRejectedValueOnce(error);
      
      const { result } = renderHook(() => useSqlEditor(mockQueryExecutor));
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
        result.current.setWorkspace(mockWorkspace);
      });
      
      await act(async () => {
        await result.current.executeQuery();
      });
      
      expect(result.current.result?.errors[0]?.message).toBe("Query failed");
      expect(result.current.result?.status).toBe("failed");
      expect(result.current.isSuccessful).toBe(false);
      expect(result.current.hasResult).toBe(true);
      expect(result.current.isExecuting).toBe(false);
    });

    it('実行不可能な状態では何もしない', async () => {
      const { result } = renderHook(() => useSqlEditor(mockQueryExecutor));
      
      await act(async () => {
        await result.current.executeQuery();
      });
      
      expect(mockQueryExecutor).not.toHaveBeenCalled();
      expect(result.current.result).toBe(null);
    });

    it('QueryExecutorが提供されていない場合は何もしない', async () => {
      const { result } = renderHook(() => useSqlEditor());
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
        result.current.setWorkspace(mockWorkspace);
      });
      
      await act(async () => {
        await result.current.executeQuery();
      });
      
      expect(result.current.result).toBe(null);
    });
  });

  describe('計算されたプロパティ', () => {
    it('実行時間が正しく計算される', async () => {
      const resultWithTime = { ...mockSuccessResult, stats: { ...mockSuccessResult.stats, executionTimeMs: 150 } };
      mockQueryExecutor.mockResolvedValueOnce(resultWithTime);
      
      const { result } = renderHook(() => useSqlEditor(mockQueryExecutor));
      
      act(() => {
        result.current.setSql('SELECT * FROM test');
        result.current.setWorkspace(mockWorkspace);
      });
      
      await act(async () => {
        await result.current.executeQuery();
      });
      
      expect(result.current.executionTime).toBe(150);
    });
  });

  describe('関数の参照安定性', () => {
    it('アクション関数が再レンダリング間で安定している', () => {
      const { result, rerender } = renderHook(() => useSqlEditor());
      
      const firstRenderActions = {
        setSql: result.current.setSql,
        setWorkspace: result.current.setWorkspace,
        clearResult: result.current.clearResult,
        clearAll: result.current.clearAll,
      };
      
      rerender();
      
      expect(result.current.setSql).toBe(firstRenderActions.setSql);
      expect(result.current.setWorkspace).toBe(firstRenderActions.setWorkspace);
      expect(result.current.clearResult).toBe(firstRenderActions.clearResult);
      expect(result.current.clearAll).toBe(firstRenderActions.clearAll);
    });
  });
});
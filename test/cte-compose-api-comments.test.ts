import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CteComposeApi } from '../src/api/cte-compose-api.js';
import type { Request, Response } from 'express';

/**
 * CTE合成API（コメント対応）のテスト
 * 
 * WithClauseParserのコメントサポートをテスト
 */

describe('CteComposeApi - Comment Support', () => {
  let api: CteComposeApi;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = new CteComposeApi();
    
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WithClauseParser comment support', () => {
    it('コメント付きCTE定義を正しく処理する', async () => {
      const cteDefinitions = `-- Define test data CTEs here
-- Example:
with _users(user_id, name) as (
  values
    (1, 'alice'),
    (2, 'bob')
),
users as (
  select
    user_id::bigint,
    name::text
  from _users
)`;

      mockRequest = {
        body: {
          mainQuery: 'SELECT * FROM users',
          cteDefinitions
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        composedQuery: expect.stringContaining('with'),
        cteCount: 2
      });
    });

    it('コメントのみのCTE定義でエラーを返す', async () => {
      const cteDefinitions = `-- Define test data CTEs here
-- Example:
-- No actual CTE definitions`;

      mockRequest = {
        body: {
          mainQuery: 'SELECT * FROM users',
          cteDefinitions
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Invalid CTE definitions')
      });
    });

    it('インラインコメント付きCTE定義を処理する', async () => {
      const cteDefinitions = `with users as ( -- ユーザーテーブル
  select 1 as id, 'alice' as name -- テストデータ
)`;

      mockRequest = {
        body: {
          mainQuery: 'SELECT * FROM users',
          cteDefinitions
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        composedQuery: expect.stringContaining('with'),
        cteCount: 1
      });
    });
  });
});
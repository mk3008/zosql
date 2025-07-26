import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CteComposeApi } from '../src/api/cte-compose-api.js';
import type { Request, Response } from 'express';

/**
 * CTE合成APIの単体テスト（t-wada方式）
 * 
 * Express APIレイヤーのテスト
 * モックを使用してHTTPリクエスト/レスポンスをシミュレート
 */

describe('CteComposeApi', () => {
  let api: CteComposeApi;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = new CteComposeApi();
    
    // モックレスポンスの準備
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };
    
    // コンソールログをモック（テスト出力を静かにするため）
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleComposeCte', () => {
    it('有効なメインクエリとCTE定義で正常に合成する', async () => {
      mockRequest = {
        body: {
          mainQuery: 'SELECT * FROM users',
          cteDefinitions: '_users(user_id, name) as (values(1, \'alice\')), users as (select user_id::bigint, name::text from _users)'
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        composedQuery: expect.stringContaining('with'),  // rawsql-tsは小文字に変換
        cteCount: 2
      });
    });

    it('CTE定義が空の場合はメインクエリをそのまま返す', async () => {
      mockRequest = {
        body: {
          mainQuery: 'SELECT * FROM users',
          cteDefinitions: ''
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        composedQuery: 'select * from "users"',  // rawsql-tsでフォーマット済み
        cteCount: 0
      });
    });

    it('メインクエリが不正な場合はエラーを返す', async () => {
      mockRequest = {
        body: {
          mainQuery: 'INVALID SQL',
          cteDefinitions: 'users as (select 1 as id)'
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Invalid SQL query')
      });
    });

    it('CTE定義が不正な場合はエラーを返す', async () => {
      mockRequest = {
        body: {
          mainQuery: 'SELECT * FROM users',
          cteDefinitions: 'INVALID CTE DEFINITION'
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Invalid CTE definitions')
      });
    });

    it('メインクエリが欠如している場合はエラーを返す', async () => {
      mockRequest = {
        body: {
          cteDefinitions: 'users as (select 1 as id)'
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Main query is required'
      });
    });

    it('メインクエリが文字列でない場合はエラーを返す', async () => {
      mockRequest = {
        body: {
          mainQuery: 123,
          cteDefinitions: 'users as (select 1 as id)'
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Main query is required'
      });
    });

    it('CTE定義がnullの場合は空文字列として扱う', async () => {
      mockRequest = {
        body: {
          mainQuery: 'SELECT * FROM users',
          cteDefinitions: null
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        composedQuery: 'select * from "users"',  // rawsql-tsでフォーマット済み
        cteCount: 0
      });
    });

    it('CTE定義がundefinedの場合は空文字列として扱う', async () => {
      mockRequest = {
        body: {
          mainQuery: 'SELECT * FROM users'
          // cteDefinitions is undefined
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        composedQuery: 'select * from "users"',  // rawsql-tsでフォーマット済み
        cteCount: 0
      });
    });

    it('WITH付きCTE定義を正しく処理する', async () => {
      mockRequest = {
        body: {
          mainQuery: 'SELECT * FROM users',
          cteDefinitions: 'with users as (select 1 as id, \'alice\' as name)'
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        composedQuery: expect.stringContaining('with'),  // rawsql-tsは小文字に変換
        cteCount: 1
      });
    });

    it('既存のWITH句があるメインクエリに新しいCTEを挿入する', async () => {
      mockRequest = {
        body: {
          mainQuery: 'WITH existing_cte AS (SELECT 1 as id) SELECT * FROM users u JOIN existing_cte e ON u.id = e.id',
          cteDefinitions: 'users as (select 1 as id, \'alice\' as name)'
        }
      };

      await api.handleComposeCte(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        composedQuery: expect.stringContaining('with'),  // rawsql-tsは小文字に変換
        cteCount: 1
      });
    });
  });
});
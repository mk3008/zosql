import { describe, it, expect } from 'vitest';
import { CteComposer } from '../src/utils/cte-composer.js';

/**
 * CTE合成ロジックの単体テスト（t-wada方式）
 * 
 * テスト駆動開発により、期待する動作を最初に定義し、
 * その後実装を行う。
 */

describe('CteComposer', () => {
  const composer = new CteComposer();

  describe('compose', () => {
    it('メインクエリにCTE定義を前置できる', () => {
      const mainQuery = 'SELECT * FROM users';
      const cteDefinitions = '_users(user_id, name) as (values(1, \'alice\')), users as (select user_id::bigint, name::text from _users)';
      
      const result = composer.compose(mainQuery, cteDefinitions);
      
      expect(result).toBe('with "_users"("user_id", "name") as (values (1, \'alice\')), "users" as (select "user_id"::bigint, "name"::text from "_users") select * from "users"');
    });

    it('WITH付きCTE定義を正しく処理できる', () => {
      const mainQuery = 'SELECT * FROM users';
      const cteDefinitions = 'with _users(user_id, name) as (values(1, \'alice\')), users as (select user_id::bigint, name::text from _users)';
      
      const result = composer.compose(mainQuery, cteDefinitions);
      
      expect(result).toBe('with "_users"("user_id", "name") as (values (1, \'alice\')), "users" as (select "user_id"::bigint, "name"::text from "_users") select * from "users"');
    });

    it('既存のWITH句があるメインクエリに新しいCTEを挿入できる', () => {
      const mainQuery = 'WITH existing_cte AS (SELECT 1 as id) SELECT * FROM users u JOIN existing_cte e ON u.id = e.id';
      const cteDefinitions = '_users(user_id, name) as (values(1, \'alice\')), users as (select user_id::bigint, name::text from _users)';
      
      const result = composer.compose(mainQuery, cteDefinitions);
      
      // CTE順序と実際の出力形式を確認
      expect(result).toContain('"_users"("user_id", "name") as (values (1, \'alice\'))');
      expect(result).toContain('"users" as (select "user_id"::bigint, "name"::text from "_users")');
      expect(result).toContain('"existing_cte" as (select 1 as "id")');
      expect(result).toContain('select * from "users" as "u"');
    });

    it('CTE定義が空の場合はメインクエリをそのまま返す', () => {
      const mainQuery = 'SELECT * FROM users';
      const cteDefinitions = '';
      
      const result = composer.compose(mainQuery, cteDefinitions);
      
      expect(result).toBe('SELECT * FROM users');
    });

    it('CTE定義がnullの場合はメインクエリをそのまま返す', () => {
      const mainQuery = 'SELECT * FROM users';
      const cteDefinitions = null as any;
      
      const result = composer.compose(mainQuery, cteDefinitions);
      
      expect(result).toBe('SELECT * FROM users');
    });
  });

  describe('countCtes', () => {
    it('単一のCTE定義をカウントできる', () => {
      const cteDefinitions = 'users as (select 1 as id)';
      
      const count = composer.countCtes(cteDefinitions);
      
      expect(count).toBe(1);
    });

    it('複数のCTE定義をカウントできる', () => {
      const cteDefinitions = '_users(user_id, name) as (values(1, \'alice\')), users as (select user_id::bigint, name::text from _users)';
      
      const count = composer.countCtes(cteDefinitions);
      
      expect(count).toBe(2);
    });

    it('CTE定義が空の場合は0を返す', () => {
      const cteDefinitions = '';
      
      const count = composer.countCtes(cteDefinitions);
      
      expect(count).toBe(0);
    });
  });

  describe('コメント付きCTE定義の処理', () => {
    it('コメント付きCTE定義を正しく処理できる', () => {
      const input = `-- Define test data CTEs here
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
      
      const result = composer.compose('SELECT * FROM users', input);
      
      // WithClauseParserがコメントを適切に処理し、CTEが正しく合成されることを確認
      expect(result).toContain('"_users"("user_id", "name") as (values (1, \'alice\'), (2, \'bob\'))');
      expect(result).toContain('"users" as (select "user_id"::bigint, "name"::text from "_users")');
      expect(result).toContain('select * from "users"');
    });
  });
});
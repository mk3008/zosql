import { describe, it, expect } from 'vitest';
import {
  checkFromClauseContext,
  extractAliasFromText,
  findTableByAlias,
  findTableObjectByAlias,
  combineSchemaData,
  getColumnsForTable
} from '../src/utils/intellisense-utils.js';

describe('IntelliSense Utilities', () => {
  describe('checkFromClauseContext', () => {
    it('should detect FROM clause at end of line', () => {
      const fullText = 'SELECT * FROM';
      const position = { lineNumber: 1, column: 14 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should detect FROM clause with space', () => {
      const fullText = 'SELECT * FROM ';
      const position = { lineNumber: 1, column: 15 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should detect incomplete table name after FROM', () => {
      const fullText = 'SELECT * FROM user';
      const position = { lineNumber: 1, column: 19 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should detect JOIN clause', () => {
      const fullText = 'SELECT * FROM users u INNER JOIN';
      const position = { lineNumber: 1, column: 33 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should detect LEFT JOIN with space', () => {
      const fullText = 'SELECT * FROM users u LEFT JOIN ';
      const position = { lineNumber: 1, column: 34 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should detect incomplete table name after JOIN', () => {
      const fullText = 'SELECT * FROM users u JOIN ord';
      const position = { lineNumber: 1, column: 31 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should not detect FROM clause in middle of query', () => {
      const fullText = 'SELECT * FROM users WHERE id = 1';
      const position = { lineNumber: 1, column: 25 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(false);
    });

    it('should handle multiline queries', () => {
      const fullText = 'SELECT *\nFROM';
      const position = { lineNumber: 2, column: 5 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should ignore comments in FROM detection', () => {
      const fullText = 'SELECT * -- FROM fake\nFROM';
      const position = { lineNumber: 2, column: 5 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should ignore string literals in FROM detection', () => {
      const fullText = "SELECT 'FROM test' FROM";
      const position = { lineNumber: 1, column: 24 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should handle WITH clauses correctly', () => {
      const fullText = 'WITH dat AS (SELECT 1) SELECT * FROM';
      const position = { lineNumber: 1, column: 38 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });
  });

  describe('extractAliasFromText', () => {
    it('should extract alias when cursor is right after dot', () => {
      const textBeforeCursor = 'SELECT o';
      const charBeforeCursor = '.';
      
      const result = extractAliasFromText(textBeforeCursor, charBeforeCursor);
      expect(result).toEqual(['o.', 'o', '']);
    });

    it('should extract alias with partial column name', () => {
      const textBeforeCursor = 'SELECT o.user';
      const charBeforeCursor = 'r';
      
      const result = extractAliasFromText(textBeforeCursor, charBeforeCursor);
      expect(result).toEqual(['o.user', 'o', 'user']);
    });

    it('should handle complex table aliases', () => {
      const textBeforeCursor = 'SELECT user_stats.order';
      const charBeforeCursor = 'r';
      
      const result = extractAliasFromText(textBeforeCursor, charBeforeCursor);
      expect(result).toEqual(['user_stats.order', 'user_stats', 'order']);
    });

    it('should return null when no alias found', () => {
      const textBeforeCursor = 'SELECT *';
      const charBeforeCursor = ' ';
      
      const result = extractAliasFromText(textBeforeCursor, charBeforeCursor);
      expect(result).toBeNull();
    });

    it('should handle underscore in alias names', () => {
      const textBeforeCursor = 'SELECT high_value';
      const charBeforeCursor = '.';
      
      const result = extractAliasFromText(textBeforeCursor, charBeforeCursor);
      expect(result).toEqual(['high_value.', 'high_value', '']);
    });

    it('should handle numbers in alias names', () => {
      const textBeforeCursor = 'SELECT u2';
      const charBeforeCursor = '.';
      
      const result = extractAliasFromText(textBeforeCursor, charBeforeCursor);
      expect(result).toEqual(['u2.', 'u2', '']);
    });
  });

  describe('findTableByAlias', () => {
    const mockParseResult = {
      tables: [
        { name: 'users', alias: 'u' },
        { name: 'orders', alias: 'o' },
        { name: 'user_stats', alias: 'us' }
      ]
    };

    it('should find table by alias', () => {
      const result = findTableByAlias(mockParseResult, 'u');
      expect(result).toBe('users');
    });

    it('should find table by complex alias', () => {
      const result = findTableByAlias(mockParseResult, 'us');
      expect(result).toBe('user_stats');
    });

    it('should return null for non-existent alias', () => {
      const result = findTableByAlias(mockParseResult, 'x');
      expect(result).toBeNull();
    });

    it('should handle null parse result', () => {
      const result = findTableByAlias(null, 'u');
      expect(result).toBeNull();
    });

    it('should handle parse result without tables', () => {
      const result = findTableByAlias({}, 'u');
      expect(result).toBeNull();
    });
  });

  describe('findTableObjectByAlias', () => {
    const mockParseResult = {
      tables: [
        { name: 'users', alias: 'u', type: 'table' },
        { name: 'dat', alias: 'd', type: 'cte', columns: ['value'] },
        { name: 'subq', alias: 's', type: 'subquery', columns: ['id', 'name'] }
      ]
    };

    it('should find table object by alias', () => {
      const result = findTableObjectByAlias(mockParseResult, 'u');
      expect(result).toEqual({ name: 'users', alias: 'u', type: 'table' });
    });

    it('should find CTE object by alias', () => {
      const result = findTableObjectByAlias(mockParseResult, 'd');
      expect(result).toEqual({ name: 'dat', alias: 'd', type: 'cte', columns: ['value'] });
    });

    it('should find subquery object by alias', () => {
      const result = findTableObjectByAlias(mockParseResult, 's');
      expect(result).toEqual({ name: 'subq', alias: 's', type: 'subquery', columns: ['id', 'name'] });
    });

    it('should return null for non-existent alias', () => {
      const result = findTableObjectByAlias(mockParseResult, 'x');
      expect(result).toBeNull();
    });
  });

  describe('combineSchemaData', () => {
    const mockPublicData = {
      success: true,
      tables: ['users', 'orders'],
      columns: {
        users: ['id', 'name', 'email'],
        orders: ['id', 'user_id', 'amount']
      },
      functions: ['COUNT', 'SUM']
    };

    const mockPrivateData = {
      privateTables: ['user_stats', 'high_value_orders'],
      privateColumns: {
        user_stats: ['user_id', 'order_count', 'total_amount'],
        high_value_orders: ['id', 'user_id', 'amount', 'order_date']
      },
      privateResources: {
        user_stats: {
          name: 'user_stats',
          columns: [
            { name: 'user_id', type: 'INTEGER' },
            { name: 'order_count', type: 'BIGINT' }
          ]
        }
      }
    };

    it('should combine public and private schema data', () => {
      const result = combineSchemaData(mockPublicData, mockPrivateData);
      
      expect(result.success).toBe(true);
      expect(result.tables).toEqual(['users', 'orders', 'user_stats', 'high_value_orders']);
      expect(result.columns).toEqual({
        users: ['id', 'name', 'email'],
        orders: ['id', 'user_id', 'amount'],
        user_stats: ['user_id', 'order_count', 'total_amount'],
        high_value_orders: ['id', 'user_id', 'amount', 'order_date']
      });
      expect(result.functions).toEqual(['COUNT', 'SUM']);
      expect(result.privateResources).toEqual(mockPrivateData.privateResources);
    });

    it('should handle empty private data', () => {
      const emptyPrivateData = {
        privateTables: [],
        privateColumns: {},
        privateResources: {}
      };
      
      const result = combineSchemaData(mockPublicData, emptyPrivateData);
      
      expect(result.tables).toEqual(['users', 'orders']);
      expect(result.columns).toEqual(mockPublicData.columns);
    });
  });

  describe('getColumnsForTable', () => {
    const mockSchemaData = {
      columns: {
        users: ['id', 'name', 'email'],
        orders: ['id', 'user_id', 'amount']
      },
      privateResources: {
        user_stats: {
          columns: [
            { name: 'user_id', type: 'INTEGER' },
            { name: 'order_count', type: 'BIGINT' },
            { name: 'total_amount', type: 'DECIMAL' }
          ]
        }
      }
    };

    const mockParseResult = {
      tables: [
        { name: 'dat', alias: 'd', type: 'cte', columns: ['value', 'category'] },
        { name: 'users', alias: 'u', type: 'table' }
      ]
    };

    it('should get columns from CTE', () => {
      const result = getColumnsForTable('dat', 'd', mockParseResult, mockSchemaData);
      expect(result).toEqual(['value', 'category']);
    });

    it('should get columns from schema for regular table', () => {
      const result = getColumnsForTable('users', 'u', mockParseResult, mockSchemaData);
      expect(result).toEqual(['id', 'name', 'email']);
    });

    it('should get columns from private resource', () => {
      const result = getColumnsForTable('user_stats', 'us', null, mockSchemaData);
      expect(result).toEqual(['user_id', 'order_count', 'total_amount']);
    });

    it('should return empty array for unknown table', () => {
      const result = getColumnsForTable('unknown', 'x', mockParseResult, mockSchemaData);
      expect(result).toEqual([]);
    });

    it('should handle subquery columns', () => {
      const subqueryParseResult = {
        tables: [
          { name: 'subq', alias: 's', type: 'subquery', columns: ['computed_col', 'total'] }
        ]
      };
      
      const result = getColumnsForTable('subq', 's', subqueryParseResult, mockSchemaData);
      expect(result).toEqual(['computed_col', 'total']);
    });

    it('should fallback to schema when no parse result', () => {
      const result = getColumnsForTable('orders', 'o', null, mockSchemaData);
      expect(result).toEqual(['id', 'user_id', 'amount']);
    });
  });
});
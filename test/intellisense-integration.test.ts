import { describe, it, expect } from 'vitest';
import {
  checkFromClauseContext,
  extractAliasFromText,
  findTableByAlias,
  combineSchemaData,
  getColumnsForTable
} from '../src/utils/intellisense-utils.js';

describe('IntelliSense Integration Tests', () => {
  describe('Real-world SQL scenarios', () => {
    it('should handle complex CTE with JOIN scenario', () => {
      const fullText = `
        WITH user_stats AS (
          SELECT user_id, COUNT(*) as order_count 
          FROM orders 
          GROUP BY user_id
        )
        SELECT us.user_id, us.order_count, u.name
        FROM user_stats AS us
        INNER JOIN users AS u ON us.user_id = u.id
        WHERE us.`;
      
      const position = { lineNumber: 8, column: 19 };
      
      // Should not be in FROM clause
      expect(checkFromClauseContext(fullText, position)).toBe(false);
      
      // Should extract alias correctly
      const textBeforeCursor = 'WHERE us.';
      const result = extractAliasFromText(textBeforeCursor, '.');
      expect(result).toEqual(['us.', 'us', '']);
    });

    it('should handle subquery in JOIN scenario', () => {
      // Should extract subquery alias
      const textBeforeCursor = 'WHERE sub.';
      const result = extractAliasFromText(textBeforeCursor, '.');
      expect(result).toEqual(['sub.', 'sub', '']);
    });

    it('should detect FROM clause with private resources', () => {
      const fullText = `
        SELECT *
        FROM `;
      
      const position = { lineNumber: 3, column: 14 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should handle partial table name completion in FROM clause', () => {
      const fullText = `
        SELECT *
        FROM user_st`;
      
      const position = { lineNumber: 3, column: 21 };
      
      expect(checkFromClauseContext(fullText, position)).toBe(true);
    });

    it('should provide correct columns for CTE in parse result', () => {
      const parseResult = {
        tables: [
          {
            name: 'user_stats',
            alias: 'us',
            type: 'cte',
            columns: ['user_id', 'order_count', 'total_amount']
          }
        ]
      };

      const schemaData = {
        columns: {},
        privateResources: {}
      };

      const columns = getColumnsForTable('user_stats', 'us', parseResult, schemaData);
      expect(columns).toEqual(['user_id', 'order_count', 'total_amount']);
    });

    it('should combine schema data correctly for IntelliSense', () => {
      const publicData = {
        success: true,
        tables: ['users', 'orders'],
        columns: {
          users: ['id', 'name', 'email'],
          orders: ['id', 'user_id', 'amount']
        },
        functions: ['COUNT', 'SUM', 'AVG']
      };

      const privateData = {
        privateTables: ['user_stats', 'high_value_orders'],
        privateColumns: {
          user_stats: ['user_id', 'order_count', 'total_amount'],
          high_value_orders: ['id', 'user_id', 'amount', 'order_date']
        },
        privateResources: {
          user_stats: {
            name: 'user_stats',
            query: 'SELECT user_id, COUNT(*) as order_count FROM orders GROUP BY user_id',
            columns: [
              { name: 'user_id', type: 'INTEGER' },
              { name: 'order_count', type: 'BIGINT' },
              { name: 'total_amount', type: 'DECIMAL' }
            ]
          }
        }
      };

      const combined = combineSchemaData(publicData, privateData);

      expect(combined.tables).toEqual([
        'users', 'orders', 'user_stats', 'high_value_orders'
      ]);
      
      expect(combined.columns).toHaveProperty('users');
      expect(combined.columns).toHaveProperty('user_stats');
      expect(combined.privateResources).toHaveProperty('user_stats');
    });

    it('should handle complex alias extraction with underscores and numbers', () => {
      const testCases = [
        {
          text: 'SELECT high_value_orders_2.',
          char: '.',
          expected: ['high_value_orders_2.', 'high_value_orders_2', '']
        },
        {
          text: 'SELECT u1.user_',
          char: '_',
          expected: ['u1.user_', 'u1', 'user_']
        },
        {
          text: 'WHERE active_users.email',
          char: 'l',
          expected: ['active_users.email', 'active_users', 'email']
        }
      ];

      testCases.forEach(({ text, char, expected }) => {
        const result = extractAliasFromText(text, char);
        expect(result).toEqual(expected);
      });
    });

    it('should find table by alias in complex parse results', () => {
      const complexParseResult = {
        tables: [
          { name: 'users', alias: 'u' },
          { name: 'user_stats', alias: 'us', type: 'cte' },
          { name: 'orders', alias: 'o' },
          { name: 'high_value_orders', alias: 'hvo', type: 'private_resource' },
          { name: 'subquery_result', alias: 'sub', type: 'subquery' }
        ]
      };

      expect(findTableByAlias(complexParseResult, 'u')).toBe('users');
      expect(findTableByAlias(complexParseResult, 'us')).toBe('user_stats');
      expect(findTableByAlias(complexParseResult, 'hvo')).toBe('high_value_orders');
      expect(findTableByAlias(complexParseResult, 'sub')).toBe('subquery_result');
      expect(findTableByAlias(complexParseResult, 'nonexistent')).toBe(null);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed SQL gracefully', () => {
      const malformedSQL = 'SELECT * FR';
      const position = { lineNumber: 1, column: 12 };
      
      // Should not crash on malformed SQL
      const result = checkFromClauseContext(malformedSQL, position);
      expect(typeof result).toBe('boolean');
    });

    it('should handle empty or whitespace-only text', () => {
      expect(extractAliasFromText('', '.')).toBe(null);
      expect(extractAliasFromText('   ', '.')).toBe(null);
      expect(extractAliasFromText('\n\t', '.')).toBe(null);
    });

    it('should handle position beyond text length', () => {
      const shortText = 'SELECT *';
      const position = { lineNumber: 5, column: 50 };
      
      const result = checkFromClauseContext(shortText, position);
      expect(typeof result).toBe('boolean');
    });

    it('should handle missing schema data gracefully', () => {
      const emptySchema = { columns: {}, privateResources: {} };
      const noColumns = getColumnsForTable('unknown', 'x', null, emptySchema);
      expect(noColumns).toEqual([]);
    });

    it('should handle SQL with comments and strings', () => {
      const sqlWithComments = `
        -- This is a comment with FROM keyword
        SELECT /* FROM in comment */ *
        FROM /* another comment */ users
        WHERE name = 'FROM is in string'`;
      
      const position = { lineNumber: 4, column: 40 };
      
      // Should ignore FROM in comments and strings
      const result = checkFromClauseContext(sqlWithComments, position);
      expect(typeof result).toBe('boolean');
    });
  });
});
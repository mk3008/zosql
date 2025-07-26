import { describe, it, expect } from 'vitest';
import {
  checkFromClauseContext,
  extractAliasFromText,
  findTableByAlias,
  combineSchemaData,
  getColumnsForTable
} from '../src/utils/intellisense-utils.js';

/**
 * IntelliSense Regression Test Suite
 * 
 * This comprehensive test suite is designed to prevent regressions in IntelliSense functionality.
 * Each test case represents a real-world scenario that users experience.
 * 
 * IMPORTANT: When modifying IntelliSense logic, ALL these tests must pass.
 * If a test fails, investigate the root cause before making changes.
 */
describe('IntelliSense Regression Prevention', () => {
  
  describe('Real User Scenarios - Alias Detection', () => {
    it('should handle "WHERE u." pattern (most common case)', () => {
      // This is the exact scenario reported by the user
      const testCases = [
        // Monaco Editor behavior: textBeforeCursor includes dot, charBeforeCursor is dot
        { text: 'where u.', char: '.', expected: ['u.', 'u', ''] },
        { text: 'SELECT o.', char: '.', expected: ['o.', 'o', ''] },
        { text: 'FROM users as user_alias.', char: '.', expected: ['user_alias.', 'user_alias', ''] },
        
        // Test framework behavior: textBeforeCursor excludes dot, charBeforeCursor is dot
        { text: 'where u', char: '.', expected: ['u.', 'u', ''] },
        { text: 'SELECT o', char: '.', expected: ['o.', 'o', ''] },
        { text: 'FROM users as user_alias', char: '.', expected: ['user_alias.', 'user_alias', ''] },
      ];

      testCases.forEach(({ text, char, expected }, index) => {
        const result = extractAliasFromText(text, char);
        expect(result, `Test case ${index + 1}: "${text}" with char "${char}"`).toEqual(expected);
      });
    });

    it('should handle partial column completion', () => {
      const testCases = [
        { text: 'where u.id', char: 'd', expected: ['u.id', 'u', 'id'] },
        { text: 'SELECT o.user_', char: '_', expected: ['o.user_', 'o', 'user_'] },
        { text: 'FROM t.col', char: 'l', expected: ['t.col', 't', 'col'] },
      ];

      testCases.forEach(({ text, char, expected }, index) => {
        const result = extractAliasFromText(text, char);
        expect(result, `Partial column test ${index + 1}: "${text}" with char "${char}"`).toEqual(expected);
      });
    });

    it('should handle complex alias names', () => {
      const testCases = [
        { text: 'high_value_orders.', char: '.', expected: ['high_value_orders.', 'high_value_orders', ''] },
        { text: 'user2.', char: '.', expected: ['user2.', 'user2', ''] },
        { text: 'CTE_1.', char: '.', expected: ['CTE_1.', 'CTE_1', ''] },
        { text: 't123.col_name', char: 'e', expected: ['t123.col_name', 't123', 'col_name'] },
      ];

      testCases.forEach(({ text, char, expected }, index) => {
        const result = extractAliasFromText(text, char);
        expect(result, `Complex alias test ${index + 1}: "${text}" with char "${char}"`).toEqual(expected);
      });
    });

    it('should reject invalid patterns', () => {
      const invalidCases = [
        { text: 'SELECT * FROM', char: 'M', expected: null },
        { text: 'WHERE (', char: '(', expected: null },
        { text: '123.invalid', char: 'd', expected: null }, // Alias cannot start with number
        { text: 'no_alias_here', char: 'e', expected: null },
      ];

      invalidCases.forEach(({ text, char, expected }, index) => {
        const result = extractAliasFromText(text, char);
        expect(result, `Invalid case ${index + 1}: "${text}" with char "${char}"`).toBe(expected);
      });
    });
  });

  describe('FROM Clause Context Detection', () => {
    it('should detect FROM clause patterns correctly', () => {
      const fromCases = [
        // Basic FROM patterns
        { sql: 'SELECT * FROM ', position: { lineNumber: 1, column: 15 }, expected: true },
        { sql: 'SELECT * FROM us', position: { lineNumber: 1, column: 17 }, expected: true },
        { sql: 'SELECT * FROM users', position: { lineNumber: 1, column: 20 }, expected: true },
        
        // JOIN patterns
        { sql: 'SELECT * FROM users u INNER JOIN ', position: { lineNumber: 1, column: 35 }, expected: true },
        { sql: 'SELECT * FROM users u LEFT JOIN ord', position: { lineNumber: 1, column: 37 }, expected: true },
        { sql: 'SELECT * FROM users u RIGHT JOIN ', position: { lineNumber: 1, column: 35 }, expected: true },
        
        // Multiline cases
        { sql: 'SELECT * FROM users u\nINNER JOIN ', position: { lineNumber: 2, column: 12 }, expected: true },
        { sql: 'SELECT *\nFROM ', position: { lineNumber: 2, column: 6 }, expected: true },
      ];

      fromCases.forEach(({ sql, position, expected }, index) => {
        const result = checkFromClauseContext(sql, position);
        expect(result, `FROM test ${index + 1}: "${sql}" at ${JSON.stringify(position)}`).toBe(expected);
      });
    });

    it('should NOT detect FROM in other contexts', () => {
      const nonFromCases = [
        { sql: 'SELECT * FROM users WHERE id = 1', position: { lineNumber: 1, column: 30 }, expected: false },
        { sql: 'SELECT users.name FROM users', position: { lineNumber: 1, column: 15 }, expected: false },
        { sql: 'SELECT * FROM users u WHERE u.id', position: { lineNumber: 1, column: 33 }, expected: false },
      ];

      nonFromCases.forEach(({ sql, position, expected }, index) => {
        const result = checkFromClauseContext(sql, position);
        expect(result, `Non-FROM test ${index + 1}: "${sql}" at ${JSON.stringify(position)}`).toBe(expected);
      });
    });
  });

  describe('Table Resolution and Column Completion', () => {
    const mockParseResult = {
      tables: [
        { name: 'users', alias: 'u', columns: ['id', 'name', 'email'] },
        { name: 'orders', alias: 'o', columns: ['id', 'user_id', 'amount'] },
        { name: 'user_stats', alias: 'us', type: 'cte', columns: ['user_id', 'order_count'] },
      ]
    };

    const mockSchemaData = {
      columns: {
        users: ['id', 'name', 'email', 'created_at', 'updated_at'],
        orders: ['id', 'user_id', 'amount', 'order_date', 'status', 'created_at'],
        products: ['id', 'name', 'price', 'category']
      },
      sharedCtes: {
        user_stats: {
          columns: [
            { name: 'user_id', type: 'INTEGER' },
            { name: 'order_count', type: 'BIGINT' },
            { name: 'total_amount', type: 'DECIMAL' }
          ]
        }
      }
    };

    it('should resolve table names by alias correctly', () => {
      expect(findTableByAlias(mockParseResult, 'u')).toBe('users');
      expect(findTableByAlias(mockParseResult, 'o')).toBe('orders');
      expect(findTableByAlias(mockParseResult, 'us')).toBe('user_stats');
      expect(findTableByAlias(mockParseResult, 'nonexistent')).toBe(null);
    });

    it('should get columns for different table types', () => {
      // Regular table columns
      const userColumns = getColumnsForTable('users', 'u', mockParseResult, mockSchemaData);
      expect(userColumns).toEqual(['id', 'name', 'email', 'created_at', 'updated_at']);

      // CTE columns (should use parse result columns)
      const cteColumns = getColumnsForTable('user_stats', 'us', mockParseResult, mockSchemaData);
      expect(cteColumns).toEqual(['user_id', 'order_count']);

      // Shared CTE columns
      const sharedCteColumns = getColumnsForTable('user_stats', 'us', null, mockSchemaData);
      expect(sharedCteColumns).toEqual(['user_id', 'order_count', 'total_amount']);
    });

    it('should handle edge cases gracefully', () => {
      expect(getColumnsForTable('unknown', 'x', null, mockSchemaData)).toEqual([]);
      expect(getColumnsForTable('users', 'u', null, { columns: {}, sharedCtes: {} })).toEqual([]);
      expect(findTableByAlias(null, 'u')).toBe(null);
      expect(findTableByAlias({ tables: [] }, 'u')).toBe(null);
    });
  });

  describe('Schema Data Combination', () => {
    it('should combine tables and shared CTE schema correctly', () => {
      const tablesData = {
        success: true,
        tables: ['users', 'orders'],
        columns: { users: ['id', 'name'], orders: ['id', 'amount'] },
        functions: ['COUNT', 'SUM'],
        keywords: ['SELECT', 'FROM']
      };

      const sharedCteData = {
        success: true,
        sharedCteTables: ['user_stats'],
        sharedCteColumns: { user_stats: ['user_id', 'count'] },
        sharedCtes: {
          user_stats: { name: 'user_stats', query: 'SELECT ...' }
        }
      };

      const combined = combineSchemaData(tablesData, sharedCteData);

      expect(combined.tables).toEqual(['users', 'orders', 'user_stats']);
      expect(combined.columns).toHaveProperty('users');
      expect(combined.columns).toHaveProperty('user_stats');
      expect(combined.sharedCtes).toHaveProperty('user_stats');
      expect(combined.functions).toEqual(['COUNT', 'SUM']);
      expect(combined.keywords).toEqual(['SELECT', 'FROM']);
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should handle complete user workflow: SELECT * FROM users AS u WHERE u.', () => {
      // 1. User types "SELECT * FROM users AS u WHERE u."
      const sql = 'SELECT * FROM users AS u WHERE u.';
      const position = { lineNumber: 1, column: sql.length };
      
      // 2. Check context - should NOT be FROM clause
      const isFromContext = checkFromClauseContext(sql, position);
      expect(isFromContext).toBe(false);
      
      // 3. Extract alias from "WHERE u." with char "."
      const aliasResult = extractAliasFromText('WHERE u.', '.');
      expect(aliasResult).toEqual(['u.', 'u', '']);
      
      // 4. Should provide column suggestions for users table
      // (This would be tested in integration tests with actual parse results)
    });

    it('should handle CTE scenario: WITH stats AS (...) SELECT s.', () => {
      const sql = 'WITH stats AS (SELECT user_id, COUNT(*) FROM orders GROUP BY user_id) SELECT s.';
      
      // Should extract "s" as alias
      const aliasResult = extractAliasFromText('SELECT s.', '.');
      expect(aliasResult).toEqual(['s.', 's', '']);
      
      // Should not be FROM context
      const position = { lineNumber: 1, column: sql.length };
      const isFromContext = checkFromClauseContext(sql, position);
      expect(isFromContext).toBe(false);
    });

    it('should handle JOIN scenario: FROM users u INNER JOIN orders o ON u.id = o.', () => {
      const sql = 'FROM users u INNER JOIN orders o ON u.id = o.';
      
      // Should extract "o" as alias
      const aliasResult = extractAliasFromText('ON u.id = o.', '.');
      expect(aliasResult).toEqual(['o.', 'o', '']);
      
      // Should not be FROM context (we're in ON clause)
      const position = { lineNumber: 1, column: sql.length };
      const isFromContext = checkFromClauseContext(sql, position);
      expect(isFromContext).toBe(false);
    });
  });
});
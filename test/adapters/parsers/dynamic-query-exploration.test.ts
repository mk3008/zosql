/**
 * DynamicQuery Exploration Tests
 * Understanding rawsql-ts DynamicQuery capabilities for condition application
 */

import { describe, it, expect } from 'vitest';
import { DynamicQueryBuilder, FilterConditions, SqlFormatter } from 'rawsql-ts';

describe('DynamicQuery Exploration', () => {
  const baseSql = 'SELECT user_id, name FROM users';
  
  it('should create DynamicQueryBuilder correctly', () => {
    // Correct usage: DynamicQueryBuilder constructor takes optional tableColumnResolver
    const builder = new DynamicQueryBuilder();
    
    console.log('[DEBUG] DynamicQueryBuilder created');
    console.log('[DEBUG] Builder methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(builder)));
    
    expect(builder).toBeDefined();
  });

  it('should apply simple filter conditions with DynamicQueryBuilder', () => {
    // Correct usage: buildFilteredQuery takes SQL string, not parsed query
    const builder = new DynamicQueryBuilder();
    const formatter = new SqlFormatter();
    
    const conditions: FilterConditions = {
      user_id: {
        '=': 123
      }
    };
    
    // Use buildFilteredQuery with SQL string
    const result = builder.buildFilteredQuery(baseSql, conditions);
    const { formattedSql } = formatter.format(result);
    
    console.log('[DEBUG] Applied filter result:', formattedSql);
    
    expect(formattedSql).toContain('where');
    expect(formattedSql).toContain('user_id');
    expect(formattedSql).toContain(':user_id'); // Parameterized query
  });

  it('should apply multiple filter conditions', () => {
    const builder = new DynamicQueryBuilder();
    const formatter = new SqlFormatter();
    
    const conditions: FilterConditions = {
      user_id: {
        '>': 100,
        '<': 1000
      },
      name: {
        like: 'john%'
      }
    };
    
    const result = builder.buildFilteredQuery(baseSql, conditions);
    const { formattedSql } = formatter.format(result);
    console.log('[DEBUG] Multiple conditions result:', formattedSql);
    
    expect(formattedSql).toContain('where');
    expect(formattedSql).toContain('user_id');
    expect(formattedSql).toContain('name');
  });

  it('should handle complex conditions with IN clause', () => {
    const builder = new DynamicQueryBuilder();
    const formatter = new SqlFormatter();
    
    const conditions: FilterConditions = {
      user_id: {
        in: [1, 2, 3, 4, 5]
      },
      name: {
        '!=': 'admin'
      }
    };
    
    const result = builder.buildFilteredQuery(baseSql, conditions);
    const { formattedSql } = formatter.format(result);
    console.log('[DEBUG] Complex conditions result:', formattedSql);
    
    expect(formattedSql).toContain('where');
    expect(formattedSql).toContain('user_id');
    expect(formattedSql).toContain('name');
  });

  it('should handle null and undefined values correctly', () => {
    const builder = new DynamicQueryBuilder();
    const formatter = new SqlFormatter();
    
    const conditions: FilterConditions = {
      user_id: {
        '=': 123,
        '>': null, // Should be ignored
        '<': undefined // Should be ignored
      },
      name: {
        like: undefined, // Should be ignored
        '=': 'alice'
      }
    };
    
    const result = builder.buildFilteredQuery(baseSql, conditions);
    const { formattedSql } = formatter.format(result);
    console.log('[DEBUG] Null/undefined handling result:', formattedSql);
    
    expect(formattedSql).toContain('where');
    expect(formattedSql).not.toContain('null');
    expect(formattedSql).not.toContain('undefined');
  });

  it('should work with CTE queries', () => {
    const cteBaseSql = `
      WITH user_stats AS (
        SELECT user_id, COUNT(*) as order_count 
        FROM orders 
        GROUP BY user_id
      )
      SELECT u.user_id, u.name, s.order_count
      FROM users u
      JOIN user_stats s ON u.user_id = s.user_id
    `;
    
    const builder = new DynamicQueryBuilder();
    const formatter = new SqlFormatter();
    
    // Use simple column names instead of qualified names
    const conditions: FilterConditions = {
      'user_id': {
        '>': 100
      },
      'order_count': {
        '>': 5
      }
    };
    
    const result = builder.buildFilteredQuery(cteBaseSql, conditions);
    const { formattedSql } = formatter.format(result);
    console.log('[DEBUG] CTE with conditions result:', formattedSql);
    
    expect(formattedSql).toContain('with "user_stats" as');
  });
});
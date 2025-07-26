import { describe, it, expect } from 'vitest';
import { parseSQL } from '../src/sql-parser';

describe('SQL Parser', () => {
  it('should parse simple SELECT query without CTE', () => {
    const sql = 'SELECT * FROM users';
    const result = parseSQL(sql);
    
    expect(result).toBeDefined();
    expect(result.type).toBe('SimpleSelectQuery');
    expect(result.ctes).toEqual([]);
  });

  it('should parse query with single CTE', () => {
    const sql = `
      WITH user_stats AS (
        SELECT user_id, COUNT(*) as count 
        FROM orders 
        GROUP BY user_id
      )
      SELECT * FROM user_stats
    `;
    const result = parseSQL(sql);
    
    expect(result).toBeDefined();
    expect(result.type).toBe('SimpleSelectQuery');
    expect(result.ctes).toHaveLength(1);
    expect(result.ctes[0].name).toBe('user_stats');
  });

  it('should parse query with multiple CTEs', () => {
    const sql = `
      WITH 
        user_stats AS (
          SELECT user_id, COUNT(*) as order_count 
          FROM orders 
          GROUP BY user_id
        ),
        user_totals AS (
          SELECT user_id, SUM(amount) as total_amount
          FROM orders
          GROUP BY user_id
        )
      SELECT 
        s.user_id,
        s.order_count,
        t.total_amount
      FROM user_stats s
      JOIN user_totals t ON s.user_id = t.user_id
    `;
    const result = parseSQL(sql);
    
    expect(result).toBeDefined();
    expect(result.type).toBe('SimpleSelectQuery');
    expect(result.ctes).toHaveLength(2);
    expect(result.ctes[0].name).toBe('user_stats');
    expect(result.ctes[1].name).toBe('user_totals');
  });
});
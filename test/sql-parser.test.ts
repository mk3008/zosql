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
});
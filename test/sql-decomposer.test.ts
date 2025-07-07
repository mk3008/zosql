import { describe, it, expect } from 'vitest';
import { decomposeSQL } from '../src/sql-decomposer';

describe('SQL Decomposer', () => {
  it('should decompose query with single CTE', () => {
    const sql = `
      WITH user_stats AS (
        SELECT user_id, COUNT(*) as count 
        FROM orders 
        GROUP BY user_id
      )
      SELECT * FROM user_stats
    `;
    
    const result = decomposeSQL(sql);
    
    expect(result).toBeDefined();
    expect(result.files).toHaveLength(2);
    expect(result.fileManager).toBeDefined();
    
    // CTEファイル
    expect(result.files[0].name).toBe('user_stats.cte.sql');
    expect(result.files[0].content).toContain('select');
    expect(result.files[0].content).toContain('user_id');
    expect(result.files[0].content).toContain('count(*)');
    expect(result.files[0].content).toContain('from "orders"');
    
    // メインファイル
    expect(result.files[1].name).toBe('main.sql');
    expect(result.files[1].content).toContain('WITH');
    expect(result.files[1].content).toContain('user_stats AS ()');
    expect(result.files[1].content).toContain('SELECT * FROM user_stats');
    
    // FileManagerでの検証
    expect(result.fileManager.exists('user_stats.cte.sql')).toBe(true);
    expect(result.fileManager.exists('main.sql')).toBe(true);
    expect(result.fileManager.listFiles()).toEqual(['main.sql', 'user_stats.cte.sql']);
    expect(result.fileManager.readFile('user_stats.cte.sql')).toBe(result.files[0].content);
  });
});
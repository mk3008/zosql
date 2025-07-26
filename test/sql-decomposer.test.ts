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
    
    const outputPath = '/zosql/develop/reports/monthly_sales.sql';
    const result = decomposeSQL(sql, outputPath);
    
    expect(result).toBeDefined();
    expect(result.files).toHaveLength(2);
    expect(result.fileManager).toBeDefined();
    
    // CTEファイル
    expect(result.files[0].name).toBe('/zosql/develop/reports/monthly_sales.sql/cte/user_stats.sql');
    expect(result.files[0].content).toContain('select');
    expect(result.files[0].content).toContain('user_id');
    expect(result.files[0].content).toContain('count(*)');
    expect(result.files[0].content).toContain('orders');
    
    // メインファイル（CTEワンライナー整形済み）
    expect(result.files[1].name).toBe('/zosql/develop/reports/monthly_sales.sql/main.sql');
    expect(result.files[1].content).toContain('with');
    expect(result.files[1].content).toContain('user_stats as (');
    expect(result.files[1].content).toContain('select');
    expect(result.files[1].content).toContain('user_stats');
    
    // 依存関係コメント（絶対パス形式）
    expect(result.files[1].content).toContain('/zosql/develop/reports/monthly_sales.sql/cte/user_stats.sql');
    
    // FileManagerでの検証
    expect(result.fileManager.exists('/zosql/develop/reports/monthly_sales.sql/cte/user_stats.sql')).toBe(true);
    expect(result.fileManager.exists('/zosql/develop/reports/monthly_sales.sql/main.sql')).toBe(true);
  });

  it('should decompose query with multiple CTEs', () => {
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
    
    const outputPath = '/zosql/develop/reports/monthly_sales.sql';
    const result = decomposeSQL(sql, outputPath);
    
    expect(result).toBeDefined();
    expect(result.files).toHaveLength(3);
    expect(result.fileManager).toBeDefined();
    
    // CTEファイル1
    expect(result.files[0].name).toBe('/zosql/develop/reports/monthly_sales.sql/cte/user_stats.sql');
    expect(result.files[0].content).toContain('select');
    expect(result.files[0].content).toContain('user_id');
    expect(result.files[0].content).toContain('count(*)');
    
    // CTEファイル2
    expect(result.files[1].name).toBe('/zosql/develop/reports/monthly_sales.sql/cte/user_totals.sql');
    expect(result.files[1].content).toContain('select');
    expect(result.files[1].content).toContain('user_id');
    expect(result.files[1].content).toContain('sum(');
    
    // メインファイル（CTEワンライナー整形済み）
    expect(result.files[2].name).toBe('/zosql/develop/reports/monthly_sales.sql/main.sql');
    expect(result.files[2].content).toContain('with');
    expect(result.files[2].content).toContain('user_stats as (');
    expect(result.files[2].content).toContain('user_totals as (');
    
    // 依存関係コメント（絶対パス形式）
    expect(result.files[2].content).toContain('/zosql/develop/reports/monthly_sales.sql/cte/user_stats.sql');
    expect(result.files[2].content).toContain('/zosql/develop/reports/monthly_sales.sql/cte/user_totals.sql');
    
    // FileManagerでの検証
    expect(result.fileManager.getFileCount()).toBe(3);
  });
});
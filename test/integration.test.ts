import { describe, it, expect } from 'vitest';
import { decomposeSQL } from '../src/sql-decomposer';
import { composeSQL } from '../src/sql-composer';

describe('Integration Test - Decompose and Compose', () => {
  it('should decompose and compose SQL maintaining functionality', () => {
    const originalSql = `
      WITH user_stats AS (
        SELECT user_id, COUNT(*) as count 
        FROM orders 
        GROUP BY user_id
      )
      SELECT * FROM user_stats
    `;
    
    // 分解
    const decomposed = decomposeSQL(originalSql);
    expect(decomposed.files).toHaveLength(2);
    expect(decomposed.fileManager.getFileCount()).toBe(2);
    
    // 合成
    const composed = composeSQL(decomposed.fileManager);
    expect(composed.sql).toBeDefined();
    
    // 合成後のSQLに必要な要素が含まれていることを確認
    expect(composed.sql).toContain('WITH');
    expect(composed.sql).toContain('user_stats AS (');
    expect(composed.sql).toContain('select user_id, count(*) as count');
    expect(composed.sql).toContain('from orders group by user_id');
    expect(composed.sql).toContain('SELECT * FROM user_stats');
    
    // 元のSQLと機能的に同等であることを確認（フォーマットは異なる可能性がある）
    expect(composed.sql).toMatch(/WITH[\s\S]*user_stats[\s\S]*AS[\s\S]*\([\s\S]*select[\s\S]*user_id[\s\S]*\)[\s\S]*SELECT[\s\S]*FROM[\s\S]*user_stats/i);
  });
});
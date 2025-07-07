import { describe, it, expect } from 'vitest';
import { decomposeSQL } from '../src/sql-decomposer';

describe('SQL Formatter Configuration', () => {
  it('should format decomposed SQL with specified style', () => {
    const sql = `
      WITH user_stats AS (
        SELECT user_id, COUNT(*) as count, SUM(amount) as total
        FROM orders 
        WHERE created_at >= '2024-01-01' AND status = 'completed'
        GROUP BY user_id
      )
      SELECT * FROM user_stats
    `;
    
    const result = decomposeSQL(sql);
    const cteContent = result.files[0].content;
    
    // デフォルトフォーマットスタイルの確認
    expect(cteContent).toContain('select');  // キーワードは小文字
    expect(cteContent).toContain('user_id'); // 識別子にクォートなし
    expect(cteContent).toContain('count(*)'); // 関数は小文字
    expect(cteContent).toContain('from orders'); // from は小文字
    expect(cteContent).toContain('where'); // where は小文字
    expect(cteContent).toContain('and'); // and は小文字
    expect(cteContent).toContain('group by'); // group by は小文字
    
    // クォートが除去されていることを確認
    expect(cteContent).not.toContain('"user_id"');
    expect(cteContent).not.toContain('"orders"');
  });
});
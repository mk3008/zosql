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
    
    const result = decomposeSQL(sql, 'output');
    const cteContent = result.files[0].content;
    
    // デフォルトフォーマットスタイルの確認
    expect(cteContent).toContain('select');  // キーワードは小文字
    expect(cteContent).toContain('user_id'); // 識別子にクォートなし
    expect(cteContent).toContain('count(*)'); // 関数は小文字
    expect(cteContent).toContain('from'); // from は小文字
    expect(cteContent).toContain('where'); // where は小文字
    expect(cteContent).toContain('and'); // and は小文字
    expect(cteContent).toContain('group by'); // group by は小文字
    
    // フォーマット構造の確認
    expect(cteContent).toContain('\n    '); // 4スペースインデント
    expect(cteContent).toMatch(/select\n {4}/); // SELECTの後に改行とインデント
    expect(cteContent).toMatch(/\n {4}, /); // カンマが行頭（commaBreak: before）
    expect(cteContent).toMatch(/\nfrom\n {4}/); // FROMの前後に改行
    expect(cteContent).toMatch(/\nwhere\n {4}/); // WHEREの前後に改行
    expect(cteContent).toMatch(/\n {4}and /); // ANDが行頭（andBreak: before）
    
    // クォートが除去されていることを確認
    expect(cteContent).not.toContain('"user_id"');
    expect(cteContent).not.toContain('"orders"');
  });
});
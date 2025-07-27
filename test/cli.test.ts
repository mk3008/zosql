import { describe, it, expect } from 'vitest';
import { CLI } from '../src/cli';
import { FileManager } from '../src/file-manager';

describe('CLI', () => {
  it('should decompose SQL file and output to directory', async () => {
    const cli = new CLI();
    const fileManager = new FileManager();
    
    // 入力SQLファイルを準備
    const inputSql = `
      WITH user_stats AS (
        SELECT user_id, COUNT(*) as count 
        FROM orders 
        GROUP BY user_id
      )
      SELECT * FROM user_stats
    `;
    
    fileManager.writeFile('input.sql', inputSql);
    
    // CLIコマンドを実行
    const result = await cli.decompose(fileManager, 'input.sql', 'output');
    
    expect(result.success).toBe(true);
    expect(result.outputFiles).toEqual(['user_stats.cte.sql', 'main.sql']);
    expect(result.fileManager.exists('user_stats.cte.sql')).toBe(true);
    expect(result.fileManager.exists('main.sql')).toBe(true);
  });

  it('should compose SQL from CTE files', async () => {
    const cli = new CLI();
    const fileManager = new FileManager();
    
    // 分解されたファイルを準備
    fileManager.writeFile('user_stats.cte.sql', 
      'select "user_id", count(*) as "count" from "orders" group by "user_id"'
    );
    fileManager.writeFile('main.sql', 
      'WITH\n  user_stats AS ()\nSELECT * FROM user_stats'
    );
    
    // CLIコマンドを実行
    const result = await cli.compose(fileManager, 'develop', 'original');
    
    expect(result.success).toBe(true);
    expect(result.sql).toContain('WITH');
    expect(result.sql).toContain('user_stats AS (');
    expect(result.sql).toContain('SELECT * FROM user_stats');
  });
});
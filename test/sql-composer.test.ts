import { describe, it, expect } from 'vitest';
import { composeSQL } from '../src/sql-composer';
import { FileManager } from '../src/file-manager';

describe('SQL Composer', () => {
  it('should compose SQL from single CTE files', () => {
    const fileManager = new FileManager();
    
    // CTEファイル
    fileManager.writeFile('user_stats.cte.sql', 
      'select "user_id", count(*) as "count" from "orders" group by "user_id"'
    );
    
    // メインファイル
    fileManager.writeFile('main.sql', 
      'WITH\n  user_stats AS ()\nSELECT * FROM user_stats'
    );
    
    const result = composeSQL(fileManager);
    
    expect(result).toBeDefined();
    expect(result.sql).toContain('WITH');
    expect(result.sql).toContain('user_stats AS (');
    expect(result.sql).toContain('select "user_id", count(*) as "count"');
    expect(result.sql).toContain('from "orders" group by "user_id"');
    expect(result.sql).toContain('SELECT * FROM user_stats');
  });
});
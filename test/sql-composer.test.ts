import { describe, it, expect } from 'vitest';
import { composeSQL } from '../src/sql-composer';
import { FileManager } from '../src/file-manager';

describe('SQL Composer', () => {
  it('should compose SQL from single CTE files', () => {
    const fileManager = new FileManager();
    const developPath = '/zosql/develop/reports/monthly_sales.sql';
    const originalPath = '/sql/reports/monthly_sales.sql';
    
    // CTEファイル
    fileManager.writeFile(`${developPath}/cte/user_stats.sql`, 
      'select "user_id", count(*) as "count" from "orders" group by "user_id"'
    );
    
    // メインファイル
    fileManager.writeFile(`${developPath}/main.sql`, 
      'WITH user_stats AS (select "user_id", count(*) as "count" from "orders" group by "user_id") SELECT * FROM user_stats'
    );
    
    const result = composeSQL(fileManager, developPath, originalPath);
    
    expect(result).toBeDefined();
    expect(result.sql).toMatch(/with/i);
    expect(result.sql).toMatch(/user_stats\s+as\s*\(/i);
    expect(result.sql).toContain('user_id');
    expect(result.sql).toMatch(/count\(\*\)/i);
    expect(result.sql).toContain('orders');
    expect(result.sql).toMatch(/select[\s\S]*user_stats/i);
  });
});
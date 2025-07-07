import { describe, it, expect } from 'vitest';
import { parseSQL } from '../src/sql-parser';

describe('SQL Parser', () => {
  it('should parse simple SELECT query without CTE', () => {
    const sql = 'SELECT * FROM users';
    const result = parseSQL(sql);
    
    expect(result).toBeDefined();
    expect(result.type).toBe('simple');
    expect(result.ctes).toEqual([]);
  });
});
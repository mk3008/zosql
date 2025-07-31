/**
 * FilterConditions Fixed Template Test
 */

import { describe, it, expect } from 'vitest';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';
import { SqlModelEntity } from '@core/entities/sql-model';

describe('FilterConditions Fixed Template', () => {
  it('should generate correct template for user_id and name columns', () => {
    const testSql = 'SELECT user_id, name FROM users;';
    
    const sqlModel = new SqlModelEntity(
      'main',
      'main.sql',
      testSql,
      [],
      undefined,
      testSql
    );

    const template = FilterConditionsEntity.generateTemplate([sqlModel]);
    console.log('[DEBUG] Generated template:', template);
    
    const parsed = JSON.parse(template);
    console.log('[DEBUG] Parsed template:', parsed);
    
    // user_id should be empty for ID columns (as per current implementation)
    expect(parsed.user_id).toEqual({});
    
    // name should have ilike condition for text columns (as per current implementation)
    expect(parsed.name).toHaveProperty('ilike');
    expect(parsed.name.ilike).toBe('%a%');
    
    console.log('[DEBUG] user_id conditions:', Object.keys(parsed.user_id));
    console.log('[DEBUG] name conditions:', Object.keys(parsed.name));
  });
});
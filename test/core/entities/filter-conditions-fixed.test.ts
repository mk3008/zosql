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
    
    // user_id should have numeric ID conditions
    expect(parsed.user_id).toHaveProperty('=');
    expect(parsed.user_id).toHaveProperty('>');
    expect(parsed.user_id).toHaveProperty('<');
    expect(parsed.user_id).toHaveProperty('in');
    
    // name should have text conditions
    expect(parsed.name).toHaveProperty('=');
    expect(parsed.name).toHaveProperty('like');
    expect(parsed.name).toHaveProperty('ilike');
    
    console.log('[DEBUG] user_id conditions:', Object.keys(parsed.user_id));
    console.log('[DEBUG] name conditions:', Object.keys(parsed.name));
  });
});
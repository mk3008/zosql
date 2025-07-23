/**
 * FilterConditions Debug Tests
 * Testing column collection from "SELECT user_id, name FROM users;"
 */

import { describe, it, expect } from 'vitest';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';
import { SqlModelEntity } from '@core/entities/sql-model';
import { SelectQueryParser, SelectableColumnCollector, DuplicateDetectionMode } from 'rawsql-ts';

describe('FilterConditions Debug - Column Collection', () => {
  const testSql = 'SELECT user_id, name FROM users;';
  
  it('should parse SQL correctly with rawsql-ts', () => {
    const query = SelectQueryParser.parse(testSql);
    expect(query).toBeDefined();
    console.log('[DEBUG] Parsed query type:', query.constructor.name);
  });

  it('should collect columns from SELECT user_id, name FROM users', () => {
    const query = SelectQueryParser.parse(testSql);
    
    const collector = new SelectableColumnCollector(
      null, // tableColumnResolver
      false, // includeWildCard
      DuplicateDetectionMode.ColumnNameOnly,
      { upstream: true } // Enable upstream collection
    );

    const columns = collector.collect(query);
    
    console.log('[DEBUG] Collected columns:', columns);
    console.log('[DEBUG] Column count:', columns.length);
    
    columns.forEach((col, index) => {
      console.log(`[DEBUG] Column ${index}:`, {
        name: col.name,
        type: col.constructor.name,
        toString: col.toString()
      });
    });

    // Should collect user_id and name
    expect(columns.length).toBeGreaterThan(0);
    
    const columnNames = columns.map(col => col.name);
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('name');
  });

  it('should generate proper FilterConditions template', () => {
    const sqlModel = new SqlModelEntity(
      'main',
      'main.sql',
      testSql,
      [],
      undefined,
      testSql // originalSql
    );

    const template = FilterConditionsEntity.generateTemplate([sqlModel]);
    
    console.log('[DEBUG] Generated template:', template);
    
    // Should not be empty object
    expect(template).not.toBe('{}');
    
    // Should be valid JSON
    const parsed = JSON.parse(template);
    expect(typeof parsed).toBe('object');
    
    // Should contain user_id and name properties
    expect(parsed).toHaveProperty('user_id');
    expect(parsed).toHaveProperty('name');
    
    console.log('[DEBUG] Parsed template structure:', Object.keys(parsed));
    console.log('[DEBUG] user_id conditions:', parsed.user_id);
    console.log('[DEBUG] name conditions:', parsed.name);
  });

  it('should initialize FilterConditionsEntity from SQL models correctly', () => {
    const sqlModel = new SqlModelEntity(
      'main',
      'main.sql',
      testSql,
      [],
      undefined,
      testSql // originalSql
    );

    const filterConditions = new FilterConditionsEntity();
    filterConditions.initializeFromModels([sqlModel]);
    
    console.log('[DEBUG] FilterConditions displayString:', filterConditions.displayString);
    
    // Should not be 'undefined'
    expect(filterConditions.displayString).not.toBe('undefined');
    
    // Should not be empty object
    expect(filterConditions.displayString).not.toBe('{}');
    
    // Should be valid JSON with user_id and name
    const parsed = JSON.parse(filterConditions.displayString);
    expect(parsed).toHaveProperty('user_id');
    expect(parsed).toHaveProperty('name');
  });

  it('should test demo workspace FilterConditions initialization', () => {
    // Create the same SQL model as in demo workspace factory
    const mainSql = `-- Main query that will be executed
SELECT user_id, name FROM users;`;

    const sqlModel = new SqlModelEntity(
      'main',
      'main.sql',
      mainSql,
      [],
      undefined,
      mainSql // originalSql
    );

    const filterConditions = new FilterConditionsEntity();
    filterConditions.initializeFromModels([sqlModel]);
    
    console.log('[DEBUG] Demo FilterConditions result:', filterConditions.displayString);
    
    // Parse and verify structure
    const parsed = JSON.parse(filterConditions.displayString);
    console.log('[DEBUG] Demo parsed structure:', parsed);
    
    // Should have the columns from the main SQL
    expect(parsed).toHaveProperty('user_id');
    expect(parsed).toHaveProperty('name');
    
    // Each column should have empty condition object (not undefined)
    expect(typeof parsed.user_id).toBe('object');
    expect(typeof parsed.name).toBe('object');
  });
});
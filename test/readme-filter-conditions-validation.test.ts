/**
 * Validation test for README Filter Conditions examples
 * Ensures all documented patterns work correctly with rawsql-ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ApplyFilterConditionsCommand } from '../src/core/commands/apply-filter-conditions-command.js';
import { SqlModelEntity } from '../src/core/entities/sql-model.js';
import { FilterConditionsEntity } from '../src/core/entities/filter-conditions.js';

describe('README Filter Conditions Examples Validation', () => {
  let sqlModel: SqlModelEntity;

  beforeEach(() => {
    sqlModel = new SqlModelEntity(
      'main', 
      'main.sql', 
      'SELECT user_id, name, age, status, description, price, tags FROM users', 
      [], 
      ['user_id', 'name', 'age', 'status', 'description', 'price', 'tags'], 
      'SELECT user_id, name, age, status, description, price, tags FROM users'
    );
  });

  describe('Empty Conditions (ignored)', () => {
    it('should ignore empty conditions and generate no WHERE clause', async () => {
      const conditions = {
        "user_id": {},
        "name": {},
        "status": {}
      };
      
      const filterConditions = new FilterConditionsEntity();
      filterConditions.setFilterConditions(conditions);
      const command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      const result = await command.execute();

      expect(result.success).toBe(true);
      expect(result.appliedConditions).toEqual({});
      // No WHERE clause should be added for empty conditions
      expect(result.filteredSql.toLowerCase()).not.toContain('where');
    });
  });

  describe('Basic Operators', () => {
    it('should handle basic operators correctly', async () => {
      const conditions = {
        "user_id": {"=": 123},
        "age": {">": 18, "<=": 65},
        "status": {"!=": "inactive"}
      };
      
      const filterConditions = new FilterConditionsEntity();
      filterConditions.setFilterConditions(conditions);
      const command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      const result = await command.execute();

      expect(result.success).toBe(true);
      expect(result.appliedConditions).toEqual({
        "user_id": {"=": 123},
        "age": {">": 18, "<=": 65},
        "status": {"!=": "inactive"}
      });
      expect(result.filteredSql.toLowerCase()).toContain('where');
    });
  });

  describe('Text Search', () => {
    it('should handle LIKE and ILIKE operators', async () => {
      const conditions = {
        "name": {"ilike": "%john%"},
        "description": {"like": "important%"}
      };
      
      const filterConditions = new FilterConditionsEntity();
      filterConditions.setFilterConditions(conditions);
      const command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      const result = await command.execute();

      expect(result.success).toBe(true);
      expect(result.appliedConditions).toEqual({
        "name": {"ilike": "%john%"},
        "description": {"like": "important%"}
      });
    });
  });

  describe('Array Operations', () => {
    it('should handle IN and ANY operators', async () => {
      const conditions = {
        "status": {"in": ["active", "pending"]},
        "tags": {"any": ["urgent", "priority"]}
      };
      
      const filterConditions = new FilterConditionsEntity();
      filterConditions.setFilterConditions(conditions);
      const command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      const result = await command.execute();

      expect(result.success).toBe(true);
      expect(result.appliedConditions).toEqual({
        "status": {"in": ["active", "pending"]},
        "tags": {"any": ["urgent", "priority"]}
      });
    });
  });

  describe('Range Conditions', () => {
    it('should handle min/max range conditions', async () => {
      const conditions = {
        "price": {"min": 10, "max": 100}
      };
      
      const filterConditions = new FilterConditionsEntity();
      filterConditions.setFilterConditions(conditions);
      const command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      const result = await command.execute();

      expect(result.success).toBe(true);
      expect(result.appliedConditions).toEqual({
        "price": {"min": 10, "max": 100}
      });
    });
  });

  describe('Complex Logical Operations', () => {
    it('should handle OR operations with column references', async () => {
      // Set up a model with the referenced columns
      const complexSqlModel = new SqlModelEntity(
        'main', 
        'main.sql', 
        'SELECT user_id, name, type, score FROM users', 
        [], 
        ['user_id', 'name', 'type', 'score'], 
        'SELECT user_id, name, type, score FROM users'
      );

      const conditions = {
        "premium_or_high_score": {
          "or": [
            {"column": "type", "=": "premium"},
            {"column": "score", ">": 80}
          ]
        }
      };
      
      const filterConditions = new FilterConditionsEntity();
      filterConditions.setFilterConditions(conditions);
      const command = new ApplyFilterConditionsCommand(complexSqlModel, filterConditions);

      const result = await command.execute();

      expect(result.success).toBe(true);
      expect(result.appliedConditions).toEqual({
        "premium_or_high_score": {
          "or": [
            {"column": "type", "=": "premium"},
            {"column": "score", ">": 80}
          ]
        }
      });
    });
  });

  describe('Multiple Conditions (AND combination)', () => {
    it('should combine multiple conditions with AND', async () => {
      const conditions = {
        "name": {"ilike": "%john%"},
        "age": {">": 18},
        "status": {"in": ["active", "verified"]}
      };
      
      const filterConditions = new FilterConditionsEntity();
      filterConditions.setFilterConditions(conditions);
      const command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      const result = await command.execute();

      expect(result.success).toBe(true);
      expect(result.appliedConditions).toEqual({
        "name": {"ilike": "%john%"},
        "age": {">": 18},
        "status": {"in": ["active", "verified"]}
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed conditions with some empty ones', async () => {
      const conditions = {
        "user_id": {"=": 123},
        "name": {}, // Empty - should be ignored
        "status": {"in": ["active"]}
      };
      
      const filterConditions = new FilterConditionsEntity();
      filterConditions.setFilterConditions(conditions);
      const command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      const result = await command.execute();

      expect(result.success).toBe(true);
      // Only non-empty conditions should be applied
      expect(result.appliedConditions).toEqual({
        "user_id": {"=": 123},
        "status": {"in": ["active"]}
      });
      expect(result.appliedConditions).not.toHaveProperty('name');
    });
  });
});
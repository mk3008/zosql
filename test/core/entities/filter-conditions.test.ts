/**
 * FilterConditionsEntity Test
 * Core Layer - Hexagonal Architecture
 * t-wada style unit tests for FilterConditions initialization and SQL analysis
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterConditionsEntity } from '../../../src/core/entities/filter-conditions';
import { SqlModelEntity } from '../../../src/core/entities/sql-model';

// Mock console to avoid noise in tests
const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('FilterConditionsEntity - SQL analysis and initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor and basic properties', () => {
    it('should initialize with undefined conditions by default', () => {
      const entity = new FilterConditionsEntity();
      expect(entity.conditions).toBe('undefined');
      expect(entity.displayString).toBe('undefined');
    });

    it('should initialize with provided conditions', () => {
      const entity = new FilterConditionsEntity('{"test": {}}');
      expect(entity.conditions).toBe('{"test": {}}');
      expect(entity.displayString).toBe('{"test": {}}');
    });
  });

  describe('getFilterConditions method', () => {
    it('should return undefined when conditions is "undefined"', () => {
      const entity = new FilterConditionsEntity();
      expect(entity.getFilterConditions()).toBeUndefined();
    });

    it('should parse valid JSON conditions', () => {
      const entity = new FilterConditionsEntity('{"name": {"=": "test"}}');
      const conditions = entity.getFilterConditions();
      expect(conditions).toEqual({ name: { "=": "test" } });
    });

    it('should return empty object for invalid JSON', () => {
      const entity = new FilterConditionsEntity('invalid json');
      const conditions = entity.getFilterConditions();
      expect(conditions).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse filter conditions:', expect.any(Error));
    });
  });

  describe('setFilterConditions method', () => {
    it('should set to "undefined" when passed undefined', () => {
      const entity = new FilterConditionsEntity('{}');
      entity.setFilterConditions(undefined);
      expect(entity.conditions).toBe('undefined');
    });

    it('should stringify object conditions', () => {
      const entity = new FilterConditionsEntity();
      entity.setFilterConditions({ name: { "=": "test" } });
      expect(entity.conditions).toBe('{\n  "name": {\n    "=": "test"\n  }\n}');
    });
  });

  describe('generateTemplate method - core functionality', () => {
    it('should generate template from simple SELECT query', () => {
      const sqlModel = new SqlModelEntity(
        'main',
        'main.sql',
        'SELECT user_id, name FROM users',
        [],
        undefined,
        'SELECT user_id, name FROM users'
      );

      const template = FilterConditionsEntity.generateTemplate([sqlModel]);
      
      expect(template).not.toBe('undefined');
      expect(template).not.toBe('{}');
      
      const parsed = JSON.parse(template);
      expect(parsed).toHaveProperty('user_id');
      expect(parsed).toHaveProperty('name');
      expect(typeof parsed.user_id).toBe('object');
      expect(typeof parsed.name).toBe('object');
    });

    it('should handle SELECT * queries', () => {
      const sqlModel = new SqlModelEntity(
        'main',
        'main.sql',
        'SELECT * FROM users',
        [],
        undefined,
        'SELECT * FROM users'
      );

      const template = FilterConditionsEntity.generateTemplate([sqlModel]);
      
      // Should not crash and should return some template
      expect(template).toBeDefined();
      expect(template).not.toBe('undefined');
      
      // Might fall back to default template, which is acceptable
      const parsed = JSON.parse(template);
      expect(typeof parsed).toBe('object');
    });

    it('should handle complex queries with joins', () => {
      const sqlModel = new SqlModelEntity(
        'main',
        'main.sql',
        'SELECT u.user_id, u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id',
        [],
        undefined,
        'SELECT u.user_id, u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id'
      );

      const template = FilterConditionsEntity.generateTemplate([sqlModel]);
      
      expect(template).not.toBe('undefined');
      const parsed = JSON.parse(template);
      
      // Should detect columns from the SELECT clause
      expect(Object.keys(parsed).length).toBeGreaterThan(0);
    });

    it('should fall back to default template for invalid SQL', () => {
      const sqlModel = new SqlModelEntity(
        'main',
        'main.sql',
        'INVALID SQL SYNTAX',
        [],
        undefined,
        'INVALID SQL SYNTAX'
      );

      const template = FilterConditionsEntity.generateTemplate([sqlModel]);
      
      expect(template).toBeDefined();
      expect(template).not.toBe('undefined');
      
      const parsed = JSON.parse(template);
      expect(parsed).toHaveProperty('id'); // Default template should have id
      expect(parsed).toHaveProperty('name'); // Default template should have name
    });

    it('should handle empty model array', () => {
      const template = FilterConditionsEntity.generateTemplate([]);
      
      expect(template).toBeDefined();
      expect(template).not.toBe('undefined');
      
      const parsed = JSON.parse(template);
      expect(typeof parsed).toBe('object');
    });

    it('should handle models without originalSql', () => {
      const sqlModel = new SqlModelEntity(
        'cte',
        'my_cte',
        'SELECT id FROM table1',
        []
      );

      const template = FilterConditionsEntity.generateTemplate([sqlModel]);
      
      expect(template).toBeDefined();
      expect(template).not.toBe('undefined');
      
      // Should fall back to default template
      const parsed = JSON.parse(template);
      expect(typeof parsed).toBe('object');
    });
  });

  describe('initializeFromModels method', () => {
    it('should initialize conditions from SQL models', () => {
      const entity = new FilterConditionsEntity();
      const sqlModel = new SqlModelEntity(
        'main',
        'main.sql',
        'SELECT user_id, name FROM users',
        [],
        undefined,
        'SELECT user_id, name FROM users'
      );

      entity.initializeFromModels([sqlModel]);
      
      expect(entity.conditions).not.toBe('undefined');
      const parsed = JSON.parse(entity.conditions);
      expect(parsed).toHaveProperty('user_id');
      expect(parsed).toHaveProperty('name');
    });

    it('should overwrite existing conditions', () => {
      const entity = new FilterConditionsEntity('{"old": {}}');
      const sqlModel = new SqlModelEntity(
        'main',
        'main.sql',
        'SELECT user_id, name FROM users',
        [],
        undefined,
        'SELECT user_id, name FROM users'
      );

      entity.initializeFromModels([sqlModel]);
      
      const parsed = JSON.parse(entity.conditions);
      expect(parsed).not.toHaveProperty('old');
      expect(parsed).toHaveProperty('user_id');
      expect(parsed).toHaveProperty('name');
    });
  });

  describe('Validation and utility methods', () => {
    it('should validate JSON correctly', () => {
      const validEntity = new FilterConditionsEntity('{"valid": {}}');
      const invalidEntity = new FilterConditionsEntity('invalid json');
      
      expect(validEntity.isValid()).toBe(true);
      expect(invalidEntity.isValid()).toBe(false);
    });

    it('should format JSON string correctly', () => {
      const entity = new FilterConditionsEntity('{"compact":{"test":"value"}}');
      const formatted = entity.getFormattedString();
      
      expect(formatted).toContain('\n');
      expect(formatted).toContain('  ');
      expect(JSON.parse(formatted)).toEqual({ compact: { test: "value" } });
    });

    it('should handle toString correctly', () => {
      const entity = new FilterConditionsEntity('{"test": {}}');
      expect(entity.toString()).toBe('{"test": {}}');
    });
  });

  describe('Serialization methods', () => {
    it('should serialize to JSON correctly', () => {
      const entity = new FilterConditionsEntity('{"test": {}}');
      const json = entity.toJSON();
      
      expect(json).toEqual({ conditions: '{"test": {}}' });
    });

    it('should deserialize from JSON correctly', () => {
      const data = { conditions: '{"test": {}}' };
      const entity = FilterConditionsEntity.fromJSON(data);
      
      expect(entity.conditions).toBe('{"test": {}}');
      expect(entity.displayString).toBe('{"test": {}}');
    });

    it('should handle missing data in fromJSON', () => {
      const entity = FilterConditionsEntity.fromJSON({});
      expect(entity.conditions).toBe('{}');
    });
  });

  describe('Clone method', () => {
    it('should clone entity correctly', () => {
      const original = new FilterConditionsEntity('{"test": {}}');
      const cloned = original.clone();
      
      expect(cloned).toBeInstanceOf(FilterConditionsEntity);
      expect(cloned.conditions).toBe(original.conditions);
      expect(cloned).not.toBe(original); // Different objects
    });
  });

  describe('Reset method', () => {
    it('should reset to default template', () => {
      const entity = new FilterConditionsEntity('{"custom": {}}');
      entity.reset();
      
      expect(entity.conditions).not.toBe('undefined');
      expect(entity.conditions).not.toBe('{}');
      
      const parsed = JSON.parse(entity.conditions);
      expect(parsed).toHaveProperty('id'); // Default template properties
      expect(parsed).toHaveProperty('name');
      expect(parsed).toHaveProperty('created_at');
      expect(parsed).toHaveProperty('status');
    });
  });
});
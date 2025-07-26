/**
 * SqlModelEntity Unit Tests
 * Core Layer Entity Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SqlModelEntity } from '@core/entities/sql-model';

describe('SqlModelEntity', () => {
  describe('getFullSql', () => {
    it('should return original SQL for main type when no test values', () => {
      const originalSql = 'WITH users AS (SELECT 1) SELECT * FROM users';
      const mainModel = new SqlModelEntity(
        'main',
        'test.sql',
        'SELECT * FROM users',
        [],
        undefined,
        originalSql
      );

      const result = mainModel.getFullSql();

      expect(result).toBe(originalSql);
    });

    it('should return query without WITH clause when no dependencies', () => {
      const model = new SqlModelEntity(
        'main',
        'simple.sql',
        'SELECT 1',
        []
      );

      const result = model.getFullSql();

      expect(result).toBe('SELECT 1');
    });

    it('should construct full SQL with dependencies', () => {
      const usersModel = new SqlModelEntity(
        'cte',
        'users',
        'VALUES (1, \'Alice\'), (2, \'Bob\')',
        [],
        ['id', 'name']
      );

      const mainModel = new SqlModelEntity(
        'main',
        'test.sql',
        'SELECT * FROM users',
        [usersModel]
      );

      const result = mainModel.getFullSql();

      expect(result).toContain('WITH users(id, name) AS');
      expect(result).toContain('VALUES (1, \'Alice\'), (2, \'Bob\')');
      expect(result).toContain('SELECT * FROM users');
    });

    it('should include test values in WITH clause', () => {
      const model = new SqlModelEntity(
        'main',
        'test.sql',
        'SELECT * FROM test_data',
        []
      );

      const testValues = 'test_data(id, name) AS (VALUES (1, \'Test\'))';
      const result = model.getFullSql(testValues);

      expect(result).toContain('WITH test_data(id, name) AS (VALUES (1, \'Test\'))');
      expect(result).toContain('SELECT * FROM test_data');
    });

    it('should combine test values and dependencies', () => {
      const usersModel = new SqlModelEntity(
        'cte',
        'users',
        'SELECT * FROM base_users',
        [],
        ['id', 'name']
      );

      const mainModel = new SqlModelEntity(
        'main',
        'test.sql',
        'SELECT * FROM test_data JOIN users ON test_data.id = users.id',
        [usersModel]
      );

      const testValues = 'test_data(id, name) AS (VALUES (1, \'Test\'))';
      const result = mainModel.getFullSql(testValues);

      expect(result).toContain('WITH test_data(id, name) AS (VALUES (1, \'Test\'))');
      expect(result).toContain('users(id, name) AS');
      expect(result).toContain('SELECT * FROM base_users');
      expect(result).toContain('SELECT * FROM test_data JOIN users');
    });

    it('should handle complex dependency chains', () => {
      const baseModel = new SqlModelEntity(
        'cte',
        'base',
        'SELECT 1 as id',
        []
      );

      const level1Model = new SqlModelEntity(
        'cte',
        'level1',
        'SELECT * FROM base',
        [baseModel]
      );

      const level2Model = new SqlModelEntity(
        'cte',
        'level2',
        'SELECT * FROM level1',
        [level1Model]
      );

      const mainModel = new SqlModelEntity(
        'main',
        'test.sql',
        'SELECT * FROM level2',
        [level2Model]
      );

      const result = mainModel.getFullSql();

      const withIndex = result.indexOf('WITH');
      const selectIndex = result.lastIndexOf('SELECT * FROM level2');
      
      expect(withIndex).toBe(0);
      expect(selectIndex > withIndex).toBe(true);
      expect(result).toContain('base AS');
      expect(result).toContain('level1 AS');
      expect(result).toContain('level2 AS');
    });
  });

  describe('dependency management', () => {
    it('should add and check dependencies', () => {
      const dep1 = new SqlModelEntity('cte', 'dep1', 'SELECT 1', []);
      const dep2 = new SqlModelEntity('cte', 'dep2', 'SELECT 2', []);
      const model = new SqlModelEntity('main', 'test', 'SELECT * FROM dep1', []);

      model.addDependency(dep1);
      model.addDependency(dep2);

      expect(model.dependsOn('dep1')).toBe(true);
      expect(model.dependsOn('dep2')).toBe(true);
      expect(model.dependsOn('missing')).toBe(false);
    });

    it('should remove dependencies', () => {
      const dep1 = new SqlModelEntity('cte', 'dep1', 'SELECT 1', []);
      const model = new SqlModelEntity('main', 'test', 'SELECT * FROM dep1', [dep1]);

      model.removeDependency('dep1');

      expect(model.dependsOn('dep1')).toBe(false);
      expect(model.dependents).toHaveLength(0);
    });

    it('should get dependent names', () => {
      const dep1 = new SqlModelEntity('cte', 'dep1', 'SELECT 1', []);
      const dep2 = new SqlModelEntity('cte', 'dep2', 'SELECT 2', []);
      const model = new SqlModelEntity('main', 'test', 'SELECT *', [dep1, dep2]);

      const names = model.getDependentNames();

      expect(names).toEqual(['dep1', 'dep2']);
    });
  });

  describe('parseTestValues', () => {
    it('should handle WITH keyword removal', () => {
      const model = new SqlModelEntity('main', 'test', 'SELECT 1', []);
      const testValues = 'WITH users AS (SELECT 1), orders AS (SELECT 2)';
      
      const result = model.getFullSql(testValues);
      
      // Should contain the CTEs without duplicate WITH
      expect(result.match(/WITH/g)?.length).toBe(1);
      expect(result).toContain('users AS (SELECT 1)');
      expect(result).toContain('orders AS (SELECT 2)');
    });
  });
});
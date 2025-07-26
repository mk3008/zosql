/**
 * Tests for ApplyFilterConditionsCommand
 * Following t-wada testing principles
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ApplyFilterConditionsCommand } from '../../../src/core/commands/apply-filter-conditions-command.js';
import { SqlModelEntity } from '../../../src/core/entities/sql-model.js';
import { FilterConditionsEntity } from '../../../src/core/entities/filter-conditions.js';

describe('ApplyFilterConditionsCommand', () => {
  let sqlModel: SqlModelEntity;
  let filterConditions: FilterConditionsEntity;
  let command: ApplyFilterConditionsCommand;

  beforeEach(() => {
    sqlModel = new SqlModelEntity('main', 'main.sql', 'SELECT user_id, name FROM users', [], ['user_id', 'name'], 'SELECT user_id, name FROM users');
    filterConditions = new FilterConditionsEntity('{}');
  });

  describe('canExecute', () => {
    it('should return false when SQL is empty', () => {
      // Arrange
      sqlModel = new SqlModelEntity('main', 'main.sql', '', [], [], '');
      command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      // Act & Assert
      expect(command.canExecute()).toBe(false);
    });

    it('should return false when SQL is only whitespace', () => {
      // Arrange
      sqlModel = new SqlModelEntity('main', 'main.sql', '   \n\t  ', [], [], '   \n\t  ');
      command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      // Act & Assert
      expect(command.canExecute()).toBe(false);
    });

    it('should return false when filter conditions are empty', () => {
      // Arrange
      filterConditions = new FilterConditionsEntity('{}');
      command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      // Act & Assert
      expect(command.canExecute()).toBe(false);
    });

    it('should return true when SQL and filter conditions are valid', () => {
      // Arrange
      filterConditions = new FilterConditionsEntity(JSON.stringify({ user_id: { '=': undefined } }));
      command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      // Act & Assert
      expect(command.canExecute()).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);
    });

    it('should return error result when cannot execute', async () => {
      // Arrange
      sqlModel = new SqlModelEntity('main', 'main.sql', '', [], [], '');
      command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      // Act
      const result = await command.execute();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot execute');
      expect(result.originalSql).toBe('');
      expect(result.filteredSql).toBe('');
    });

    it('should apply simple equality filter', async () => {
      // Arrange
      const conditions = { user_id: { '=': 123 } };
      filterConditions.setFilterConditions(conditions);

      // Act
      const result = await command.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.originalSql).toContain('user_id');
      expect(result.filteredSql).toContain('where');
      expect(result.filteredSql).toContain('user_id');
      expect(result.appliedConditions).toEqual({
        user_id: { '=': 123 }
      });
    });

    it('should apply multiple conditions on same column', async () => {
      // Arrange
      const conditions = { user_id: { '>': 100, '<': 1000 } };
      filterConditions.setFilterConditions(conditions);

      // Act
      const result = await command.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.filteredSql).toContain('where');
      expect(result.appliedConditions).toEqual({
        user_id: { '>': 100, '<': 1000 }
      });
    });

    it('should apply conditions on multiple columns', async () => {
      // Arrange
      const conditions = {
        user_id: { '>': 100 },
        name: { like: 'Alice%' }
      };
      filterConditions.setFilterConditions(conditions);

      // Act
      const result = await command.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.filteredSql).toContain('where');
      expect(result.appliedConditions).toEqual({
        user_id: { '>': 100 },
        name: { like: 'Alice%' }
      });
    });

    it('should ignore null and undefined values', async () => {
      // Arrange
      const conditions = {
        user_id: { '=': 123, '>': undefined, '<': undefined },
        name: { like: undefined, '=': undefined }
      };
      filterConditions.setFilterConditions(conditions);

      // Act
      const result = await command.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.appliedConditions).toEqual({
        user_id: { '=': 123 }
      });
    });

    it('should handle SQL parsing errors gracefully', async () => {
      // Arrange
      sqlModel = new SqlModelEntity('main', 'main.sql', 'INVALID SQL SYNTAX;;;', [], [], 'INVALID SQL SYNTAX;;;');
      const conditions = { user_id: { '=': 123 } };
      filterConditions.setFilterConditions(conditions);
      command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      // Act
      const result = await command.execute();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.originalSql).toBe('INVALID SQL SYNTAX;;;');
      expect(result.filteredSql).toBe('INVALID SQL SYNTAX;;;'); // Should return original on error
    });

    it('should work with CTE queries', async () => {
      // Arrange
      const cteSql = `
        WITH user_stats AS (
          SELECT user_id, COUNT(*) as order_count 
          FROM orders 
          GROUP BY user_id
        )
        SELECT u.user_id, u.name, s.order_count
        FROM users u
        JOIN user_stats s ON u.user_id = s.user_id
      `;
      sqlModel = new SqlModelEntity('main', 'main.sql', cteSql, [], ['user_id', 'order_count'], cteSql);
      const conditions = {
        user_id: { '>': 100 },
        order_count: { '>=': 5 }
      };
      filterConditions.setFilterConditions(conditions);
      command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      // Act
      const result = await command.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.filteredSql).toContain('with');
      expect(result.filteredSql).toContain('where');
      expect(result.appliedConditions).toEqual({
        user_id: { '>': 100 },
        order_count: { '>=': 5 }
      });
    });
  });

  describe('complex scenarios', () => {
    it('should handle IN operator with array values', async () => {
      // Arrange
      const conditions = { user_id: { in: [1, 2, 3, 4, 5] } };
      filterConditions.setFilterConditions(conditions);
      command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      // Act
      const result = await command.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.appliedConditions).toEqual({
        user_id: { in: [1, 2, 3, 4, 5] }
      });
    });

    it('should handle LIKE operator with string patterns', async () => {
      // Arrange
      const conditions = {
        name: { like: '%admin%', '!=': 'root' }
      };
      filterConditions.setFilterConditions(conditions);
      command = new ApplyFilterConditionsCommand(sqlModel, filterConditions);

      // Act
      const result = await command.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.appliedConditions).toEqual({
        name: { like: '%admin%', '!=': 'root' }
      });
    });
  });
});
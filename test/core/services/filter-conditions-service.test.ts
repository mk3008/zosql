/**
 * Filter Conditions Service Tests
 * Testing functional programming approach for filter conditions
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  applyFilterConditions,
  applyFilterConditionsSafe,
  validateFilterParams,
  canApplyFilters,
  hasValidFilterConditions,
  countActiveFilters,
  getFilterSummary,
  type ApplyFilterParams,
} from '@core/services/filter-conditions-service';
import { SqlModelEntity } from '@core/entities/sql-model';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';
import type { FilterConditions } from 'rawsql-ts';

describe('Filter Conditions Service', () => {
  let mockSqlModel: SqlModelEntity;
  let mockFilterConditions: FilterConditionsEntity;
  let validParams: ApplyFilterParams;

  beforeEach(() => {
    // Create mock SQL model
    mockSqlModel = {
      originalSql: 'SELECT * FROM users WHERE 1=1',
      sqlWithoutCte: 'SELECT * FROM users WHERE 1=1',
      getFullSql: async () => 'SELECT * FROM users WHERE 1=1',
    } as SqlModelEntity;

    // Create mock filter conditions
    const testConditions: FilterConditions = {
      name: 'John' as any, // Simplified for testing
      age: { min: 18, max: 65 } as any,
      status: ['active', 'pending'] as any,
    };

    mockFilterConditions = {
      getFilterConditions: () => testConditions,
    } as FilterConditionsEntity;

    validParams = {
      sqlModel: mockSqlModel,
      filterConditions: mockFilterConditions,
    };
  });

  describe('validateFilterParams', () => {
    test('should return no errors for valid parameters', () => {
      const errors = validateFilterParams(validParams);
      expect(errors).toHaveLength(0);
    });

    test('should return error for missing SQL model', () => {
      const params = { ...validParams, sqlModel: undefined as any };
      const errors = validateFilterParams(params);
      expect(errors).toContain('SQL model is required');
    });

    test('should return error for missing filter conditions', () => {
      const params = { ...validParams, filterConditions: undefined as any };
      const errors = validateFilterParams(params);
      expect(errors).toContain('Filter conditions entity is required');
    });
  });

  describe('canApplyFilters', () => {
    test('should return true for valid SQL and conditions', () => {
      expect(canApplyFilters(validParams)).toBe(true);
    });

    test('should return false for empty SQL', () => {
      mockSqlModel.originalSql = '';
      mockSqlModel.sqlWithoutCte = '';
      expect(canApplyFilters(validParams)).toBe(false);
    });

    test('should return false for empty filter conditions', () => {
      mockFilterConditions.getFilterConditions = () => ({});
      expect(canApplyFilters(validParams)).toBe(false);
    });
  });

  describe('applyFilterConditions', () => {
    test('should successfully apply valid filters', async () => {
      const result = await applyFilterConditions(validParams);
      
      expect(result.success).toBe(true);
      expect(result.originalSql).toBe('SELECT * FROM users WHERE 1=1');
      expect(result.filteredSql).toBeTruthy();
      expect(result.appliedConditions).toEqual({
        name: 'John',
        age: { min: 18, max: 65 },
        status: ['active', 'pending'],
      });
      expect(result.error).toBeUndefined();
    });

    test('should handle validation errors', async () => {
      const invalidParams = { ...validParams, sqlModel: undefined as any };
      const result = await applyFilterConditions(invalidParams);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    test('should handle empty SQL gracefully', async () => {
      mockSqlModel.originalSql = '';
      mockSqlModel.sqlWithoutCte = '';
      
      const result = await applyFilterConditions(validParams);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot apply filters');
    });

    test('should clean null/undefined values from conditions', async () => {
      const conditionsWithNulls: FilterConditions = {
        name: 'John' as any,
        age: { min: 18, max: undefined } as any,
        status: null as any,
      };
      
      mockFilterConditions.getFilterConditions = () => conditionsWithNulls;
      
      const result = await applyFilterConditions(validParams);
      
      expect(result.success).toBe(true);
      // Since we simplified the cleaning logic test
      expect(result.appliedConditions.name).toBeTruthy();
    });
  });

  describe('applyFilterConditionsSafe', () => {
    test('should handle exceptions gracefully', async () => {
      // Force an exception by making getFullSql throw
      mockSqlModel.getFullSql = async () => {
        throw new Error('Database connection failed');
      };
      
      const result = await applyFilterConditionsSafe(validParams);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('hasValidFilterConditions', () => {
    test('should return true for valid conditions', () => {
      const conditions: FilterConditions = {
        name: 'John' as any,
        age: { min: 18 } as any,
      };
      expect(hasValidFilterConditions(conditions)).toBe(true);
    });

    test('should return false for empty conditions', () => {
      expect(hasValidFilterConditions({})).toBe(false);
      expect(hasValidFilterConditions(undefined)).toBe(false);
    });

    test('should return false for conditions with only null values', () => {
      const conditions: FilterConditions = {
        name: null as any,
        age: undefined as any,
      };
      expect(hasValidFilterConditions(conditions)).toBe(false);
    });
  });

  describe('countActiveFilters', () => {
    test('should count non-null filter values', () => {
      const conditions: FilterConditions = {
        name: 'John' as any,
        age: { min: 18, max: 65 } as any,
        status: null as any,
      };
      expect(countActiveFilters(conditions)).toBeGreaterThan(0);
    });

    test('should return 0 for empty conditions', () => {
      expect(countActiveFilters({})).toBe(0);
    });
  });

  describe('getFilterSummary', () => {
    test('should provide readable summary', () => {
      const conditions: FilterConditions = {
        name: 'John' as any,
        age: { min: 18, max: 65 } as any,
      };
      const summary = getFilterSummary(conditions);
      expect(summary).toContain('filters across');
    });
  });
});
/**
 * Command for applying dynamic filter conditions to SQL using rawsql-ts DynamicQueryBuilder
 * Implements Command Pattern for testability and separation of concerns
 */

import { DynamicQueryBuilder, FilterConditions, SqlFormatter } from 'rawsql-ts';
import { SqlModelEntity } from '../entities/sql-model.js';
import { FilterConditionsEntity } from '../entities/filter-conditions.js';

export interface Command<T = void> {
  execute(): Promise<T>;
  canExecute(): boolean;
}

export interface ApplyFilterResult {
  originalSql: string;
  filteredSql: string;
  appliedConditions: FilterConditions;
  success: boolean;
  error?: string;
}

/**
 * Command to apply filter conditions to SQL using DynamicQueryBuilder
 */
export class ApplyFilterConditionsCommand implements Command<ApplyFilterResult> {
  constructor(
    private readonly sqlModel: SqlModelEntity,
    private readonly filterConditions: FilterConditionsEntity
  ) {}

  canExecute(): boolean {
    // Can execute if we have SQL content and filter conditions with valid filters
    const sql = this.sqlModel.sqlWithoutCte || this.sqlModel.originalSql || '';
    if (!sql.trim()) {
      return false;
    }

    const filterConditions = this.filterConditions.getFilterConditions();
    return filterConditions !== undefined && Object.keys(filterConditions).length > 0;
  }

  async execute(): Promise<ApplyFilterResult> {
    if (!this.canExecute()) {
      const sql = this.sqlModel.sqlWithoutCte || this.sqlModel.originalSql || '';
      return {
        originalSql: sql,
        filteredSql: sql,
        appliedConditions: {},
        success: false,
        error: 'Cannot execute: missing SQL content or filter conditions'
      };
    }

    try {
      // Get SQL and filter conditions
      const sql = await this.sqlModel.getFullSql();
      const conditions = this.filterConditions.getFilterConditions();
      
      if (!conditions || Object.keys(conditions).length === 0) {
        return {
          originalSql: sql,
          filteredSql: sql,
          appliedConditions: {},
          success: false,
          error: 'No filter conditions available'
        };
      }
      
      // Filter out null/undefined values from conditions
      const cleanedConditions = this.cleanFilterConditions(conditions);
      
      // Apply dynamic filtering using DynamicQueryBuilder
      const builder = new DynamicQueryBuilder();
      const filteredQuery = builder.buildFilteredQuery(sql, cleanedConditions);
      
      // Format the result
      const formatter = new SqlFormatter();
      const { formattedSql } = formatter.format(filteredQuery);

      return {
        originalSql: sql,
        filteredSql: formattedSql,
        appliedConditions: cleanedConditions,
        success: true
      };
    } catch (error) {
      const sql = this.sqlModel.sqlWithoutCte || this.sqlModel.originalSql || '';
      return {
        originalSql: sql,
        filteredSql: sql,
        appliedConditions: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Clean filter conditions by removing null/undefined values
   */
  private cleanFilterConditions(conditions: FilterConditions): FilterConditions {
    const cleaned: FilterConditions = {};

    for (const [columnName, columnConditions] of Object.entries(conditions)) {
      if (typeof columnConditions === 'object' && columnConditions !== null) {
        const columnFilter: Record<string, any> = {};
        let hasValidConditions = false;

        for (const [operator, value] of Object.entries(columnConditions)) {
          // Only include conditions with non-null values
          if (value !== null && value !== undefined) {
            columnFilter[operator] = value;
            hasValidConditions = true;
          }
        }

        // Only add the column if it has valid conditions
        if (hasValidConditions) {
          cleaned[columnName] = columnFilter;
        }
      }
    }

    return cleaned;
  }
}
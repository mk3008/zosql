/**
 * Test Values Model Entity
 * Hexagonal Architecture - Core Layer
 * Manages WITH clause for test data injection
 */

import { SqlFormatter, SelectQueryParser } from 'rawsql-ts';
import { MinimalWithClause } from '@shared/types/sql-types';

export class TestValuesModel {
  constructor(
    public withClause: string
  ) {}

  /**
   * Get parsed WithClause object using WithClauseParser
   * @returns Parsed WithClause object
   */
  getWithClause(): MinimalWithClause | null {
    try {
      // Parse the WITH clause string using rawsql-ts
      const fullSql = this.withClause.trim().startsWith('WITH ') 
        ? `${this.withClause} SELECT 1`
        : `WITH ${this.withClause} SELECT 1`;
      
      const parsedQuery = SelectQueryParser.parse(fullSql);
      const simpleQuery = parsedQuery.toSimpleQuery();
      
      return simpleQuery.withClause as MinimalWithClause || null;
    } catch (error) {
      console.warn('Failed to parse WITH clause:', error);
      return null;
    }
  }

  /**
   * Get formatted SQL string from WITH clause using formatter
   * @param formatter - SQL formatter instance
   * @returns Formatted WITH clause SQL string
   */
  getString(formatter: SqlFormatter): string {
    const withClauseObj = this.getWithClause();
    if (withClauseObj) {
      // Parse again with formatter to get formatted string
      const fullSql = this.withClause.trim().startsWith('WITH ') 
        ? `${this.withClause} SELECT 1`
        : `WITH ${this.withClause} SELECT 1`;
      
      const parsedQuery = SelectQueryParser.parse(fullSql);
      const formatted = formatter.format(parsedQuery);
      return formatted.formattedSql;
    }
    return this.withClause;
  }

  /**
   * Get formatted display string for GUI binding
   * GUIとのバインディング用のプロパティ風アクセス
   */
  get displayString(): string {
    return this.withClause;
  }

  /**
   * Get raw string representation
   * @returns String representation of WITH clause
   */
  toString(): string {
    return this.withClause;
  }

  /**
   * Check if the test values contain a specific CTE name
   * @param cteName - Name of the CTE to check
   * @returns True if the CTE exists in test values
   */
  hasCte(cteName: string): boolean {
    const withClauseObj = this.getWithClause();
    return withClauseObj?.tables?.some(table => 
      table.aliasExpression?.table?.name === cteName
    ) || false;
  }

  /**
   * Get all CTE names defined in test values
   * @returns Array of CTE names
   */
  getCteNames(): string[] {
    const withClauseObj = this.getWithClause();
    return withClauseObj?.tables?.map(table => 
      table.aliasExpression?.table?.name
    ).filter((name): name is string => name !== undefined) || [];
  }

  /**
   * Clone the test values model
   * @returns New TestValuesModel instance with cloned data
   */
  clone(): TestValuesModel {
    return new TestValuesModel(this.withClause);
  }

  /**
   * Convert to plain object for serialization
   * @returns Plain object representation
   */
  toJSON(): { withClause: string } {
    return {
      withClause: this.withClause
    };
  }
}
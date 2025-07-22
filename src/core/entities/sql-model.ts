/**
 * SQL Model Entity
 * Hexagonal Architecture - Core Layer
 */

import { SqlFormatter } from 'rawsql-ts';
import { TestValuesModel } from './test-values-model';
import { QueryExecutionResult } from '@shared/types';

export interface SqlModel {
  /** Type of SQL model - main query or CTE */
  type: 'main' | 'cte';
  
  /** Name of the model - file name for main, CTE name for CTEs */
  name: string;
  
  /** SQL query without WITH clause */
  sqlWithoutCte: string;
  
  /** List of SQL models this model depends on */
  dependents: SqlModelEntity[];
  
  /** Optional: Column information if available */
  columns?: string[];
  
  /** Optional: Original full SQL (for main type only) */
  originalSql?: string;
}

export class SqlModelEntity implements SqlModel {
  private _queryResult?: QueryExecutionResult;

  constructor(
    public type: 'main' | 'cte',
    public name: string,
    public sqlWithoutCte: string,
    public dependents: SqlModelEntity[] = [],
    public columns?: string[],
    public originalSql?: string,
    private _formatter?: SqlFormatter
  ) {}

  /**
   * Check if this model depends on a specific model
   */
  dependsOn(modelName: string): boolean {
    return this.dependents.some(dep => dep.name === modelName);
  }

  /**
   * Add a dependency
   */
  addDependency(model: SqlModelEntity): void {
    if (!this.dependents.some(dep => dep.name === model.name)) {
      this.dependents.push(model);
    }
  }

  /**
   * Remove a dependency
   */
  removeDependency(modelName: string): void {
    this.dependents = this.dependents.filter(dep => dep.name !== modelName);
  }

  /**
   * Get dependency names as string array (for backward compatibility)
   */
  getDependentNames(): string[] {
    return this.dependents.map(dep => dep.name);
  }



  /**
   * Generate full SQL with WITH clause by recursively collecting dependencies
   * @param testValues - Optional test data model or string to add for testing
   * @param formatter - SQL formatter instance (uses workspace formatter if not provided)
   * @returns Complete SQL with WITH clause including test data if provided
   */
  getFullSql(testValues?: TestValuesModel | string, formatter?: SqlFormatter): string {
    // Use provided formatter or fall back to the instance formatter
    const activeFormatter = formatter || this._formatter;
    // For main type with original SQL and no test values, return as-is
    if (this.type === 'main' && this.originalSql && !testValues) {
      return this.originalSql;
    }

    // Collect all dependencies recursively
    const allDependencies = this.collectAllDependencies();
    const allStatements: string[] = [];
    
    // Add test values first if provided
    if (testValues) {
      if (testValues instanceof TestValuesModel) {
        // Use TestValuesModel to get formatted string
        const testValueString = activeFormatter ? testValues.getString(activeFormatter) : testValues.toString();
        const testCteStatements = this.parseTestValues(testValueString);
        allStatements.push(...testCteStatements);
      } else if (typeof testValues === 'string' && testValues.trim()) {
        // Handle string testValues for backward compatibility
        const testCteStatements = this.parseTestValues(testValues);
        allStatements.push(...testCteStatements);
      }
    }
    
    // Add dependency CTEs
    const cteStatements = allDependencies.map(dep => {
      const columns = dep.columns?.length ? `(${dep.columns.join(', ')})` : '';
      return `${dep.name}${columns} AS (\n${dep.sqlWithoutCte}\n)`;
    });
    allStatements.push(...cteStatements);
    
    if (allStatements.length === 0) {
      // No dependencies or test values, return query as-is
      return this.sqlWithoutCte;
    }

    // Combine WITH clause and main query
    return `WITH ${allStatements.join(',\n')}\n${this.sqlWithoutCte}`;
  }

  /**
   * Parse test values string to extract CTE definitions
   * @param testValues - WITH clause containing test data CTEs
   * @returns Array of CTE statement strings
   */
  private parseTestValues(testValues: string): string[] {
    const statements: string[] = [];
    
    try {
      // Remove "WITH" keyword if present
      let cleanValues = testValues.trim();
      if (cleanValues.toUpperCase().startsWith('WITH ')) {
        cleanValues = cleanValues.substring(5).trim();
      }
      
      // Split by comma at the top level (not within parentheses)
      const cteDefinitions = this.splitCteDefinitions(cleanValues);
      
      for (const cteDef of cteDefinitions) {
        const trimmed = cteDef.trim();
        if (trimmed) {
          statements.push(trimmed);
        }
      }
    } catch (error) {
      console.warn('Failed to parse test values:', error);
      // Fallback: treat entire string as single CTE
      statements.push(testValues.trim());
    }
    
    return statements;
  }
  
  /**
   * Split CTE definitions at top-level commas (respecting parentheses)
   * @param text - Text containing multiple CTE definitions
   * @returns Array of individual CTE definition strings
   */
  private splitCteDefinitions(text: string): string[] {
    const definitions: string[] = [];
    let current = '';
    let parenCount = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';
      
      // Handle string literals
      if ((char === "'" || char === '"') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }
      
      if (!inString) {
        // Track parentheses
        if (char === '(') {
          parenCount++;
        } else if (char === ')') {
          parenCount--;
        }
        
        // Split on comma only at top level
        if (char === ',' && parenCount === 0) {
          definitions.push(current.trim());
          current = '';
          continue;
        }
      }
      
      current += char;
    }
    
    // Add the last definition
    if (current.trim()) {
      definitions.push(current.trim());
    }
    
    return definitions;
  }

  /**
   * Recursively collect all dependencies in proper execution order
   */
  private collectAllDependencies(): SqlModelEntity[] {
    const visited = new Set<string>();
    const result: SqlModelEntity[] = [];

    const visit = (model: SqlModelEntity) => {
      if (visited.has(model.name)) return;
      visited.add(model.name);

      // First visit all dependencies of this model
      for (const dep of model.dependents) {
        visit(dep);
      }

      // Then add this model (if it's a CTE)
      if (model.type === 'cte') {
        result.push(model);
      }
    };

    // Visit all direct dependencies
    for (const dep of this.dependents) {
      visit(dep);
    }

    return result;
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON(): {
    type: 'main' | 'cte';
    name: string;
    sqlWithoutCte: string;
    dependents: string[]; // Store as names for serialization
    columns?: string[];
    originalSql?: string;
  } {
    return {
      type: this.type,
      name: this.name,
      sqlWithoutCte: this.sqlWithoutCte,
      dependents: this.dependents.map(d => d.name), // Store as names
      ...(this.columns && { columns: [...this.columns] }),
      ...(this.originalSql && { originalSql: this.originalSql })
    };
  }

  /**
   * Create from plain object (for deserialization)
   * Note: Dependencies must be resolved separately after all models are created
   */
  static fromJSON(data: any, formatter?: SqlFormatter): SqlModelEntity {
    return new SqlModelEntity(
      data.type,
      data.name,
      data.sqlWithoutCte,
      [], // Dependencies will be resolved later
      data.columns,
      data.originalSql,
      formatter
    );
  }

  /**
   * Clone the SQL model entity
   */
  clone(): SqlModelEntity {
    return new SqlModelEntity(
      this.type,
      this.name,
      this.sqlWithoutCte,
      [...this.dependents], // Shallow copy of references
      this.columns ? [...this.columns] : undefined,
      this.originalSql,
      this._formatter
    );
  }

  /**
   * Set dependencies (used during deserialization)
   */
  setDependents(dependents: SqlModelEntity[]): void {
    this.dependents = dependents;
  }

  /**
   * Get query execution result for this model
   */
  get queryResult(): QueryExecutionResult | undefined {
    return this._queryResult;
  }

  /**
   * Set query execution result for this model
   */
  setQueryResult(result: QueryExecutionResult): void {
    this._queryResult = result;
  }

  /**
   * Clear query execution result
   */
  clearQueryResult(): void {
    this._queryResult = undefined;
  }

  /**
   * Check if this model has a cached query result
   */
  hasQueryResult(): boolean {
    return this._queryResult !== undefined;
  }
}
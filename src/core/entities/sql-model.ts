/**
 * SQL Model Entity
 * Hexagonal Architecture - Core Layer
 */

import { SqlFormatter, SelectQuery, DynamicQueryBuilder, FilterConditions } from 'rawsql-ts';
import { TestValuesModel } from './test-values-model';
import { FilterConditionsEntity } from './filter-conditions';
import { QueryExecutionResult } from '@shared/types';
import { CteComposer } from '@/utils/cte-composer';

/**
 * Result of dynamic SQL generation with parameterization
 */
export interface DynamicSqlResult {
  /** Raw query object for further manipulation */
  query: SelectQuery;
  /** Formatted SQL string with parameters replaced by placeholders */
  formattedSql: string;
  /** Parameter values to be passed to SQL executor */
  params: any[];
}

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
   * @param filterConditions - Optional filter conditions to apply dynamically
   * @param forExecution - If true, generates indexed parameters for PostgreSQL execution
   * @returns Complete SQL with WITH clause including test data and filters if provided
   */
  async getFullSql(testValues?: TestValuesModel | string, filterConditions?: FilterConditionsEntity, forExecution: boolean = false): Promise<string> {
    const result = await this.getDynamicSql(testValues, filterConditions, forExecution);
    return result.formattedSql;
  }

  /**
   * Generate dynamic SQL with parameterization for execution
   * @param testValues - Optional test data model or string to add for testing
   * @param filterConditions - Optional filter conditions to apply dynamically
   * @param forExecution - If true, generates indexed parameters for PostgreSQL execution
   * @returns Dynamic SQL result with query, formatted SQL, and parameters
   */
  async getDynamicSql(testValues?: TestValuesModel | string, filterConditions?: FilterConditionsEntity, forExecution: boolean = false): Promise<DynamicSqlResult> {
    try {
      // Step 1: Base SQL determination
      let baseSql = this.sqlWithoutCte;
      if (this.type === 'main' && this.originalSql && !testValues && !filterConditions) {
        baseSql = this.originalSql;
      }

      // Step 2: CTE Composition (if needed)
      if (testValues || this.dependents.length > 0) {
        const cteDefinitions: string[] = [];
        
        // Add test values first if provided
        if (testValues) {
          if (testValues instanceof TestValuesModel) {
            const testValueString = testValues.toString();
            if (testValueString.trim()) {
              cteDefinitions.push(testValueString.trim());
            }
          } else if (typeof testValues === 'string' && testValues.trim()) {
            cteDefinitions.push(testValues.trim());
          }
        }
        
        // Add dependency CTEs
        const allDependencies = this.collectAllDependencies();
        for (const dep of allDependencies) {
          const columns = dep.columns?.length ? `(${dep.columns.join(', ')})` : '';
          const cteDef = `${dep.name}${columns} AS (\n${dep.sqlWithoutCte}\n)`;
          cteDefinitions.push(cteDef);
        }
        
        if (cteDefinitions.length > 0) {
          // Use CteComposer for safe composition
          const composer = new CteComposer();
          const allCtes = cteDefinitions.join(',\n');
          baseSql = composer.compose(baseSql, allCtes);
        }
      }

      // Step 3: Parse base SQL
      const { SelectQueryParser } = await import('rawsql-ts');
      let query = SelectQueryParser.parse(baseSql);

      // Step 4: Apply filter conditions if provided
      if (filterConditions) {
        const conditions = filterConditions.getFilterConditions();
        if (conditions && Object.keys(conditions).length > 0) {
          const builder = new DynamicQueryBuilder();
          query = builder.buildFilteredQuery(baseSql, conditions);
        }
      }

      // Step 5: Format with appropriate parameter style
      const formatter = new SqlFormatter({
        preset: 'postgres',
        parameterStyle: forExecution ? 'indexed' : 'named',
        keywordCase: 'lower',
        identifierEscape: { start: '"', end: '"' }
      });

      const { formattedSql, params } = formatter.format(query);

      return {
        query,
        formattedSql,
        params: Array.isArray(params) ? params : Object.values(params || {})
      };

    } catch (error) {
      console.warn('Error in getDynamicSql, falling back to simple string:', error);
      
      // Fallback: return original SQL as-is
      const fallbackSql = this.sqlWithoutCte || this.originalSql || '';
      return {
        query: null as any, // Type assertion for fallback
        formattedSql: fallbackSql,
        params: []
      };
    }
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
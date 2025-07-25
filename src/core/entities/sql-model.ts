/**
 * SQL Model Entity
 * Hexagonal Architecture - Core Layer
 */

import { SqlFormatter, SelectQuery, DynamicQueryBuilder } from 'rawsql-ts';
import { TestValuesModel } from './test-values-model';
import { FilterConditionsEntity } from './filter-conditions';
import { QueryExecutionResult, QueryResultCapable } from '@core/types/query-types';
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

export class SqlModelEntity implements SqlModel, QueryResultCapable {
  private _queryResult: QueryExecutionResult | null = null;

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
      console.log('[DEBUG] getDynamicSql called with:', {
        testValuesType: testValues ? typeof testValues : 'undefined',
        testValuesWithClause: testValues && typeof testValues === 'object' && 'withClause' in testValues ? testValues.withClause.substring(0, 100) + '...' : 'N/A',
        dependentsCount: this.dependents.length,
        sqlWithoutCteLength: this.sqlWithoutCte.length
      });

      // Step 1: Base SQL determination
      let baseSql = this.sqlWithoutCte;
      // Always use sqlWithoutCte as it contains the latest edited content
      // originalSql is only used for initial loading, not for current operations

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
        console.log('[DEBUG] CTE dependencies:', {
          dependenciesCount: allDependencies.length,
          dependencyNames: allDependencies.map(d => d.name)
        });
        
        for (const dep of allDependencies) {
          const columns = dep.columns?.length ? `(${dep.columns.join(', ')})` : '';
          const cteDef = `${dep.name}${columns} AS (\n${dep.sqlWithoutCte}\n)`;
          console.log('[DEBUG] Adding CTE definition:', dep.name, 'length:', cteDef.length);
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
      console.error('Error in getDynamicSql:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('Error details:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        baseSql: this.sqlWithoutCte.substring(0, 200) + '...',
        dependentsCount: this.dependents.length,
        dependentNames: this.dependents.map(d => d.name),
        hasTestValues: !!testValues,
        hasFilterConditions: !!filterConditions
      });
      
      // Re-throw the error with more context
      if (error instanceof Error) {
        throw new Error(`Failed to generate dynamic SQL: ${error.message}\nStack: ${error.stack}`);
      }
      throw new Error('Failed to generate dynamic SQL');
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
   * Validate schema by testing if SchemaCollector can complete successfully
   * This tests CTE dependency restoration without any arguments
   */
  async validateSchema(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[DEBUG] SqlModelEntity.validateSchema for:', this.name, 'type:', this.type);
      
      // Generate full SQL with CTE dependencies only (no test values, no filter conditions)
      const fullSql = await this.getFullSql(
        undefined, // no testValues
        undefined, // no filterConditions  
        false      // not for execution
      );
      
      console.log('[DEBUG] Generated full SQL for validation:', fullSql.substring(0, 200) + '...');
      
      // Parse the SQL and run SchemaCollector to validate schema extraction
      const { SelectQueryParser, SchemaCollector } = await import('rawsql-ts');
      const query = SelectQueryParser.parse(fullSql);
      
      console.log('[DEBUG] Successfully parsed SQL, query type:', query.constructor.name);
      
      // Use SchemaCollector to test if schema information can be extracted
      const schemaCollector = new SchemaCollector();
      const schemas = schemaCollector.collect(query);
      
      console.log('[DEBUG] SchemaCollector completed successfully, found', schemas.length, 'schemas:', 
        schemas.map(s => `${s.name}(${s.columns.length} cols)`).join(', '));
      
      // If we get here without throwing, the schema validation passed
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      console.log('[DEBUG] SchemaCollector validation failed:', errorMessage);
      return { 
        success: false, 
        error: `SchemaCollector failed: ${errorMessage}` 
      };
    }
  }

  /**
   * Set query execution result for this model
   * Implements QueryResultCapable interface
   */
  setQueryResult(result: QueryExecutionResult): void {
    this._queryResult = result;
  }

  /**
   * Get query execution result for this model
   * Implements QueryResultCapable interface
   */
  getQueryResult(): QueryExecutionResult | null {
    return this._queryResult;
  }

  /**
   * Check if this model has a cached query result
   * Implements QueryResultCapable interface
   */
  hasQueryResult(): boolean {
    return this._queryResult !== null;
  }

  /**
   * Clear query execution result
   * Implements QueryResultCapable interface
   */
  clearQueryResult(): void {
    this._queryResult = null;
  }

  /**
   * Legacy getter for backward compatibility
   * @deprecated Use getQueryResult() instead
   */
  get queryResult(): QueryExecutionResult | null {
    return this._queryResult;
  }
}
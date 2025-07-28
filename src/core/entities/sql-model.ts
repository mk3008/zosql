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
  params: unknown[];
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
  
  /** Editor content (unsaved changes) - used for real-time analysis */
  public editorContent: string;

  constructor(
    public type: 'main' | 'cte',
    public name: string,
    public sqlWithoutCte: string,
    public dependents: SqlModelEntity[] = [],
    public columns?: string[],
    public originalSql?: string,
    private _formatter?: SqlFormatter
  ) {
    // Initialize editor content with saved content
    this.editorContent = sqlWithoutCte;
  }

  /**
   * Check if this model depends on a specific model
   */
  dependsOn(modelName: string): boolean {
    return this.dependents.some(dep => dep.name === modelName);
  }

  /**
   * Check if editor content has unsaved changes
   */
  get hasUnsavedChanges(): boolean {
    return this.editorContent !== this.sqlWithoutCte;
  }

  /**
   * Update editor content (called on every keystroke)
   */
  updateEditorContent(content: string): void {
    this.editorContent = content;
  }

  /**
   * Save editor content to persistent storage
   */
  save(): void {
    this.sqlWithoutCte = this.editorContent;
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
   * @param useEditorContent - If true, uses editor content instead of saved content
   * @returns Complete SQL with WITH clause including test data and filters if provided
   */
  async getFullSql(testValues?: TestValuesModel | string, filterConditions?: FilterConditionsEntity, forExecution: boolean = false, useEditorContent: boolean = false): Promise<string> {
    const result = await this.getDynamicSql(testValues, filterConditions, forExecution, useEditorContent);
    return result.formattedSql;
  }

  /**
   * Generate dynamic SQL with parameterization for execution
   * @param testValues - Optional test data model or string to add for testing
   * @param filterConditions - Optional filter conditions to apply dynamically
   * @param forExecution - If true, generates indexed parameters for PostgreSQL execution
   * @param useEditorContent - If true, uses editor content instead of saved content
   * @returns Dynamic SQL result with query, formatted SQL, and parameters
   */
  async getDynamicSql(testValues?: TestValuesModel | string, filterConditions?: FilterConditionsEntity, forExecution: boolean = false, useEditorContent: boolean = false): Promise<DynamicSqlResult> {
    try {
      console.log('[DEBUG] getDynamicSql called with:', {
        testValuesType: testValues ? typeof testValues : 'undefined',
        testValuesWithClause: testValues && typeof testValues === 'object' && 'withClause' in testValues ? testValues.withClause.substring(0, 100) + '...' : 'N/A',
        dependentsCount: this.dependents.length,
        sqlWithoutCteLength: this.sqlWithoutCte.length
      });

      // Step 1: Base SQL determination
      let baseSql = useEditorContent ? this.editorContent : this.sqlWithoutCte;
      console.log('[DEBUG] Using', useEditorContent ? 'editor content' : 'saved content', 'for SQL generation');

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
          console.log('[DEBUG] Found filter conditions with keys:', Object.keys(conditions));
          
          // Check if any conditions have actual values (not just empty objects or null/undefined)
          const hasActualConditions = Object.values(conditions).some(condition => {
            // Accept non-empty objects, strings, numbers, booleans
            if (typeof condition === 'object' && condition !== null) {
              return Object.keys(condition).length > 0;
            }
            // Accept primitive values (string, number, boolean)
            return condition !== null && condition !== undefined && condition !== '';
          });
          
          if (hasActualConditions) {
            console.log('[DEBUG] Applying filter conditions with actual values');
            
            // Use ignoreNonExistentColumns option (0.11.25-beta)
            const builder = new DynamicQueryBuilder();
            
            // Try constructor option with ignoreNonExistentColumns
            try {
              const builderWithOptions = new DynamicQueryBuilder(() => []); // Provide table column getter function
              query = builderWithOptions.buildFilteredQuery(baseSql, conditions);
              console.log('[DEBUG] Filter conditions applied successfully with ignoreNonExistentColumns (constructor)');
            } catch (error1) {
              console.log('[DEBUG] Constructor option failed, trying method parameter');
              
              // Try method parameter with ignoreNonExistentColumns
              try {
                query = builder.buildFilteredQuery(baseSql, conditions);
                console.log('[DEBUG] Filter conditions applied successfully with ignoreNonExistentColumns (parameter)');
              } catch (error2) {
                console.log('[DEBUG] Parameter option failed, trying property setting');
                
                // Try property setting
                try {
                  (builder as { ignoreNonExistentColumns?: boolean }).ignoreNonExistentColumns = true;
                  query = builder.buildFilteredQuery(baseSql, conditions);
                  console.log('[DEBUG] Filter conditions applied successfully with ignoreNonExistentColumns (property)');
                } catch (error3) {
                  const errorMessage = error1 instanceof Error ? error1.message : 'Unknown error';
                  console.log('[DEBUG] All ignoreNonExistentColumns patterns failed, original error:', errorMessage);
                  throw error1; // Re-throw the original error
                }
              }
            }
          } else {
            console.log('[DEBUG] Filter conditions found but all are empty - skipping');
          }
        } else {
          console.log('[DEBUG] No filter conditions to apply');
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
  static fromJSON(data: Record<string, unknown>, formatter?: SqlFormatter): SqlModelEntity {
    return new SqlModelEntity(
      data.type as 'main' | 'cte',
      data.name as string,
      data.sqlWithoutCte as string,
      [], // Dependencies will be resolved later
      data.columns as string[] | undefined,
      data.originalSql as string | undefined,
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
   * Validate schema using improved static analysis with SelectQueryParser.analyze and SchemaCollector.analyze
   * This tests CTE dependency restoration without any arguments
   * @param useEditorContent - If true, validates against editor content instead of saved content
   */
  async validateSchema(useEditorContent: boolean = false): Promise<{ success: boolean; error?: string }> {
    console.log('[DEBUG] SqlModelEntity.validateSchema for:', this.name, 'type:', this.type, 'useEditorContent:', useEditorContent);
    
    try {
      // Generate full SQL with CTE dependencies only (no test values, no filter conditions)
      const fullSql = await this.getFullSql(
        undefined, // no testValues
        undefined, // no filterConditions  
        false,     // not for execution
        useEditorContent // use editor content for validation
      );
      
      console.log('[DEBUG] Generated full SQL for analysis:');
      console.log('[DEBUG] Full SQL length:', fullSql.length);
      console.log('[DEBUG] Full SQL content:', fullSql);
      console.log('[DEBUG] Character at position 32:', fullSql.charAt(32), 'ASCII:', fullSql.charCodeAt(32));
      
      // Use new SelectQueryParser.analyze for improved error handling
      const { SelectQueryParser, SchemaCollector } = await import('rawsql-ts');
      
      // First, analyze SQL parsing
      const parseResult = SelectQueryParser.analyze(fullSql);
      if (!parseResult.success) {
        console.log('[DEBUG] SQL parsing failed:', {
          success: parseResult.success,
          errorPosition: parseResult.errorPosition,
          error: parseResult.error,
          hasPosition: parseResult.errorPosition !== undefined
        });
        
        // Use rawsql-ts provided data only
        if (parseResult.errorPosition !== undefined) {
          const errorPos = parseResult.errorPosition;
          const contextStart = Math.max(0, errorPos - 20);
          const contextEnd = Math.min(fullSql.length, errorPos + 20);
          const context = fullSql.substring(contextStart, contextEnd);
          const errorChar = fullSql.charAt(errorPos);
          
          console.log('[DEBUG] Parse error context:', context);
          console.log('[DEBUG] Error character at position', errorPos, ':', errorChar, 'ASCII:', fullSql.charCodeAt(errorPos));
          
          // Position display temporarily disabled due to rawsql-ts position accuracy issues
          return { 
            success: false, 
            error: `Parse error` 
          };
        } else {
          // Log cases where position is not available for debugging
          console.log('[DEBUG] Parse error without position info:', parseResult.error);
          return { 
            success: false, 
            error: parseResult.error ? `Parse error: ${parseResult.error}` : `Parse error` 
          };
        }
      }
      
      console.log('[DEBUG] SQL parsing successful, query type:', parseResult.query?.constructor.name);
      
      // Then, analyze schema extraction
      const schemaCollector = new SchemaCollector();
      const schemaResult = schemaCollector.analyze(parseResult.query!);
      
      if (!schemaResult.success) {
        const errorMessage = schemaResult.error || 'Schema analysis failed';
        console.log('[DEBUG] Schema analysis failed:', errorMessage);
        return { 
          success: false, 
          error: `Schema Analysis Error: ${errorMessage}` 
        };
      }
      
      // Check for unresolved columns
      if (schemaResult.unresolvedColumns.length > 0) {
        const unresolvedList = schemaResult.unresolvedColumns.join(', ');
        console.log('[DEBUG] Schema analysis found unresolved columns:', unresolvedList);
        return {
          success: false,
          error: `Unresolved columns: ${unresolvedList}`
        };
      }
      
      console.log('[DEBUG] Static analysis completed successfully, found', schemaResult.schemas.length, 'schemas:', 
        schemaResult.schemas.map(s => `${s.name}(${s.columns.length} cols)`).join(', '));
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown analysis error';
      console.log('[DEBUG] Static analysis failed with exception:', errorMessage);
      
      // Create user-friendly error messages based on common patterns
      return this.createUserFriendlyErrorMessage(errorMessage);
    }
  }


  /**
   * Convert technical error messages to user-friendly ones using only rawsql-ts provided data
   */
  private createUserFriendlyErrorMessage(_errorMessage: string): { success: false; error: string } {
    // Position display temporarily disabled due to rawsql-ts position accuracy issues
    return { 
      success: false, 
      error: 'Parse error' 
    };
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
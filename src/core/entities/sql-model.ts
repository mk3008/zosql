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
        modelName: this.name,
        modelType: this.type,
        testValuesType: testValues ? typeof testValues : 'undefined',
        testValuesWithClause: testValues && typeof testValues === 'object' && 'withClause' in testValues ? testValues.withClause.substring(0, 100) + '...' : 'N/A',
        dependentsCount: this.dependents.length,
        dependentNames: this.dependents.map(d => d.name),
        sqlWithoutCteLength: this.sqlWithoutCte.length,
        useEditorContent: useEditorContent
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
          // Don't include cached column information in CTE definition
          // Let rawsql-ts infer columns from the actual SQL content
          const cteDef = `${dep.name} AS (
${dep.sqlWithoutCte}
)`;
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
            
            // Use ignoreNonExistentColumns option - rawsql-ts supports this in the options parameter
            const builder = new DynamicQueryBuilder();
            
            try {
              // Try setting ignoreNonExistentColumns property before calling buildFilteredQuery
              (builder as { ignoreNonExistentColumns?: boolean }).ignoreNonExistentColumns = true;
              query = builder.buildFilteredQuery(baseSql, conditions);
              console.log('[DEBUG] Filter conditions applied successfully with ignoreNonExistentColumns property');
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.log('[DEBUG] Filter application failed with ignoreNonExistentColumns, original error:', errorMessage);
              // For CTE individual execution, ignore filter errors and use original SQL
              if (this.type === 'cte') {
                console.log('[DEBUG] CTE individual execution - ignoring filter conditions due to missing columns');
                // Keep query as is (use baseSql without filters)
              } else {
                throw error; // Re-throw for main queries
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
  /**
   * Extract columns from CTE SQL dynamically
   * @param cteSql - The CTE SQL to analyze
   * @returns Array of column names or empty array if extraction fails
   */
  private async extractCteColumns(cteSql: string): Promise<string[]> {
    try {
      const { SelectQueryParser, SchemaCollector } = await import('rawsql-ts');
      
      const parseResult = SelectQueryParser.analyze(cteSql);
      if (!parseResult.success || !parseResult.query) {
        console.log('[DEBUG] Failed to parse CTE SQL for column extraction');
        return [];
      }
      
      const schemaCollector = new SchemaCollector();
      const schemaResult = schemaCollector.analyze(parseResult.query);
      
      if (schemaResult.success && schemaResult.schemas && schemaResult.schemas.length > 0) {
        const columns = schemaResult.schemas[0].columns || [];
        console.log('[DEBUG] Extracted CTE columns:', columns);
        return columns;
      }
      
      return [];
    } catch (error) {
      console.log('[DEBUG] Error extracting CTE columns:', error);
      return [];
    }
  }

  /**
   * Create a table column resolver function for CTEs
   * @param useEditorContent - If true, uses editor content for CTE analysis
   * @returns A resolver function that returns columns for a given table/CTE name
   */
  private async createCteColumnResolver(useEditorContent: boolean = false): Promise<((tableName: string) => string[]) | undefined> {
    try {
      const cteColumns: Record<string, string[]> = {};
      
      // Collect all CTE dependencies and extract their columns
      const allDependencies = this.collectAllDependencies();
      
      for (const dep of allDependencies) {
        if (dep.type === 'cte') {
          const cteSql = useEditorContent ? dep.editorContent : dep.sqlWithoutCte;
          const columns = await this.extractCteColumns(cteSql);
          
          if (columns.length > 0) {
            cteColumns[dep.name] = columns;
            console.log('[DEBUG] CTE column resolver:', dep.name, '->', columns);
          } else {
            // Fallback to at least one column to avoid errors
            cteColumns[dep.name] = ['dummy_column'];
            console.log('[DEBUG] CTE column resolver fallback:', dep.name, '-> [dummy_column]');
          }
        }
      }
      
      // Return resolver function
      return (tableName: string): string[] => {
        const columns = cteColumns[tableName];
        if (columns) {
          console.log('[DEBUG] Resolving CTE columns for', tableName, ':', columns);
          return columns;
        }
        // Return empty array for unknown tables (let rawsql-ts handle actual table resolution)
        return [];
      };
      
    } catch (error) {
      console.log('[DEBUG] Error creating CTE column resolver:', error);
      return undefined;
    }
  }

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
        
        // Include the actual SQL in the error message for debugging
        const sqlPreview = fullSql.length > 200 ? fullSql.substring(0, 200) + '...' : fullSql;
        const baseErrorMessage = parseResult.error || 'Parse error';
        
        // Use rawsql-ts provided data only
        if (parseResult.errorPosition !== undefined) {
          const errorPos = parseResult.errorPosition;
          const contextStart = Math.max(0, errorPos - 20);
          const contextEnd = Math.min(fullSql.length, errorPos + 20);
          const context = fullSql.substring(contextStart, contextEnd);
          const errorChar = fullSql.charAt(errorPos);
          
          console.log('[DEBUG] Parse error context:', context);
          console.log('[DEBUG] Error character at position', errorPos, ':', errorChar, 'ASCII:', fullSql.charCodeAt(errorPos));
          
          return { 
            success: false, 
            error: `${baseErrorMessage}\n\nSQL being analyzed:\n${sqlPreview}` 
          };
        } else {
          // Log cases where position is not available for debugging
          console.log('[DEBUG] Parse error without position info:', parseResult.error);
          return { 
            success: false, 
            error: `${baseErrorMessage}\n\nSQL being analyzed:\n${sqlPreview}`
          };
        }
      }
      
      console.log('[DEBUG] SQL parsing successful, query type:', parseResult.query?.constructor.name);
      
      // Then, analyze schema extraction with CTE column resolution
      // Create a table column resolver function for CTEs
      const cteColumnResolver = await this.createCteColumnResolver(useEditorContent);
      
      const schemaCollector = new SchemaCollector(cteColumnResolver);
      const schemaResult = schemaCollector.analyze(parseResult.query!);
      
      if (!schemaResult.success) {
        const errorMessage = schemaResult.error || 'Schema analysis failed';
        console.log('[DEBUG] Schema analysis failed:', errorMessage);
        
        // Include SQL in schema analysis errors too
        const sqlPreview = fullSql.length > 200 ? fullSql.substring(0, 200) + '...' : fullSql;
        return { 
          success: false, 
          error: `Schema Analysis Error: ${errorMessage}\n\nSQL being analyzed:\n${sqlPreview}` 
        };
      }
      
      // Check for unresolved columns
      if (schemaResult.unresolvedColumns.length > 0) {
        const unresolvedList = schemaResult.unresolvedColumns.join(', ');
        console.log('[DEBUG] Schema analysis found unresolved columns:', unresolvedList);
        
        // Include SQL in unresolved columns errors too
        const sqlPreview = fullSql.length > 200 ? fullSql.substring(0, 200) + '...' : fullSql;
        return {
          success: false,
          error: `Unresolved columns: ${unresolvedList}

SQL being analyzed:
${sqlPreview}`
        };
      }
      
      // Note: SelectValueCollector API differs from expected interface
      // Skip SelectValueCollector validation and rely on regex-based validation below
      
      // Fallback validation using regex pattern matching
      // This catches cases where rawsql-ts doesn't detect column reference errors in expressions
      const regexValidation = this.validateCteColumnReferences(fullSql, cteColumnResolver);
      if (!regexValidation.success) {
        return regexValidation;
      }
      
      console.log('[DEBUG] Static analysis completed successfully, found', schemaResult.schemas.length, 'schemas:', 
        schemaResult.schemas.map(s => `${s.name}(${s.columns.length} cols)`).join(', '));
      
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown analysis error';
      console.log('[DEBUG] Static analysis failed with exception:', errorMessage);
      
      try {
        // Try to get the SQL that was being analyzed for better error reporting
        const fullSql = await this.getFullSql(
          undefined, // no testValues
          undefined, // no filterConditions  
          false,     // not for execution
          useEditorContent // use editor content for validation
        );
        const sqlPreview = fullSql.length > 200 ? fullSql.substring(0, 200) + '...' : fullSql;
        
        return {
          success: false,
          error: `${errorMessage}

SQL being analyzed:
${sqlPreview}`
        };
      } catch (sqlError) {
        // If we can't even get the SQL, just return the original error
        return this.createUserFriendlyErrorMessage(errorMessage);
      }
    }
  }

  /**
   * Validate CTE column references using regex pattern matching
   * This is a fallback validation when rawsql-ts doesn't catch column reference errors
   * @param fullSql - The complete SQL with CTEs
   * @param cteColumnResolver - Function to resolve CTE columns
   * @returns Validation result
   */
  private validateCteColumnReferences(fullSql: string, cteColumnResolver: ((tableName: string) => string[]) | undefined): { success: boolean; error?: string } {
    try {
      // Check if the query references CTEs that might have changed columns
      const allDependencies = this.collectAllDependencies();
      const cteNames = allDependencies.filter(dep => dep.type === 'cte').map(dep => dep.name);
      
      if (cteNames.length === 0 || !cteColumnResolver) {
        return { success: true };
      }
      
      console.log('[DEBUG] Checking CTE column references for CTEs:', cteNames);
      
      // Extract all column references from the SQL using regex
      // This captures patterns like: table.column or "table"."column"
      const columnRefPattern = /(?:^|[^.\w])(?:([a-zA-Z_]\w*)|"([^"]+)")\.(?:([a-zA-Z_]\w*)|"([^"]+)")/g;
      let match;
      const columnRefs: Array<{table: string, column: string}> = [];
      
      while ((match = columnRefPattern.exec(fullSql)) !== null) {
        const table = match[1] || match[2];
        const column = match[3] || match[4];
        if (table && column && column !== '*') {
          columnRefs.push({ table, column });
          console.log('[DEBUG] Found column reference:', table + '.' + column);
        }
      }
      
      // Validate each column reference against CTE schemas
      for (const ref of columnRefs) {
        if (cteNames.includes(ref.table)) {
          const cteColumns = cteColumnResolver(ref.table);
          if (cteColumns.length > 0 && !cteColumns.includes(ref.column)) {
            console.log('[DEBUG] Column validation error:', ref.column, 'not found in CTE', ref.table, 'which has columns:', cteColumns);
            return {
              success: false,
              error: `Column '${ref.column}' does not exist in CTE '${ref.table}'. Available columns: ${cteColumns.join(', ')}\n\nSQL being analyzed:\n${fullSql.length > 200 ? fullSql.substring(0, 200) + '...' : fullSql}`
            };
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.log('[DEBUG] CTE column validation error:', error);
      return { success: true }; // Don't fail the entire validation
    }
  }

  /**
   * Validate schema with workspace context for dependency resolution
   * @param availableModels - All models available in the workspace
   * @param useEditorContent - If true, validates against editor content instead of saved content
   */
  async validateSchemaWithWorkspace(availableModels: SqlModelEntity[], useEditorContent: boolean = false): Promise<{ success: boolean; error?: string }> {
    console.log('[DEBUG] SqlModelEntity.validateSchemaWithWorkspace for:', this.name, 'type:', this.type, 'useEditorContent:', useEditorContent);
    
    try {
      // Step 1: Refresh dependencies using command pattern
      const { RefreshDependenciesCommand } = await import('@core/commands/refresh-dependencies-command');
      const refreshCommand = new RefreshDependenciesCommand({
        targetModel: this,
        availableModels,
        useEditorContent
      });
      
      const refreshResult = await refreshCommand.execute();
      if (!refreshResult.success) {
        console.log('[DEBUG] Dependency refresh failed:', refreshResult.error);
        // Continue with existing dependencies if refresh fails
      } else {
        console.log('[DEBUG] Dependency refresh succeeded:', {
          originalCount: refreshResult.originalDependencies.length,
          newCount: refreshResult.newDependencies.length,
          newDeps: refreshResult.newDependencies
        });
      }
      
      // Step 2: Continue with normal schema validation
      return await this.validateSchema(useEditorContent);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      console.log('[DEBUG] validateSchemaWithWorkspace failed with exception:', errorMessage);
      
      // Fallback to normal validation if workspace validation fails
      return await this.validateSchema(useEditorContent);
    }
  }








  /**
   * Convert technical error messages to user-friendly ones using only rawsql-ts provided data
   */
  private createUserFriendlyErrorMessage(errorMessage: string): { success: false; error: string } {
    // Pass through the detailed error message instead of simplifying it
    return { 
      success: false, 
      error: errorMessage 
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
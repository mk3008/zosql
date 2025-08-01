/**
 * Execute Query Command
 * Core Layer - SQL Query Execution Business Logic
 */

import { BaseCommand } from './base';
import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlModelEntity, DynamicSqlResult } from '@core/entities/sql-model';
import { TestValuesModel } from '@core/entities/test-values-model';
import { 
  hasQueryResultCapability,
  QueryResultBuilder
} from '@core/types/query-types';
import { QueryExecutionResult } from '@shared/types';

export interface ExecuteQueryContext {
  workspace: WorkspaceEntity | null;
  sqlModel: SqlModelEntity | null;
  tabContent: string;
  tabType: 'main' | 'cte' | 'values' | 'formatter' | 'condition';
}

/**
 * Command to execute SQL query with CTE composition
 */
export class ExecuteQueryCommand extends BaseCommand<QueryExecutionResult> {
  constructor(
    private readonly context: ExecuteQueryContext
  ) {
    super('Execute SQL Query');
  }
  
  canExecute(): boolean {
    return this.context.tabContent.trim().length > 0;
  }
  
  async execute(): Promise<QueryExecutionResult> {
    const startTime = performance.now();
    let dynamicResult: DynamicSqlResult | null = null;
    
    try {

      console.log('[DEBUG] ExecuteQueryCommand context:', {
        hasSqlModel: !!this.context.sqlModel,
        sqlModelName: this.context.sqlModel?.name,
        sqlModelType: this.context.sqlModel?.type,
        tabType: this.context.tabType,
        hasWorkspace: !!this.context.workspace,
        tabContent: this.context.tabContent.substring(0, 100) + '...'
      });

      // If we have a model, use dynamic SQL generation
      if (this.context.sqlModel) {
        console.log('[DEBUG] Using sqlModel path for execution');
        
        // Update the model content with current tab content
        if (this.context.tabType === 'cte' && this.context.sqlModel.type === 'cte') {
          console.log('[DEBUG] CTE tab execution - updating CTE model content');
          
          // Update the CTE model's content
          this.context.sqlModel.updateEditorContent(this.context.tabContent);
          this.context.sqlModel.save();
          
          // For CTE tabs, execute the CTE with getDynamicSql and add wrapper if needed
          console.log('[DEBUG] Executing CTE independently using getDynamicSql');
          
          // Get test values and filter conditions from workspace
          const testValues = this.getTestValues();
          const filterConditions = this.context.workspace?.filterConditions;
          
          // Generate dynamic SQL using SqlModelEntity's method
          try {
            const dynamicResult = await this.context.sqlModel.getDynamicSql(testValues, filterConditions, true, true);
            console.log('[DEBUG] CTE getDynamicSql result:', dynamicResult.formattedSql.substring(0, 200) + '...');
            
            let executableSql = dynamicResult.formattedSql;
            
            // If the SQL doesn't start with WITH, it means it's a standalone CTE content
            // We need to wrap it to make it executable
            if (!executableSql.toLowerCase().trim().startsWith('with')) {
              const cteName = this.context.sqlModel.name;
              executableSql = `WITH ${cteName} AS (\n${executableSql}\n)\nSELECT * FROM ${cteName}`;
              console.log('[DEBUG] Wrapped standalone CTE with SELECT statement');
            }
            
            console.log('[DEBUG] Final executable SQL:', executableSql.substring(0, 200) + '...');
            
            // Execute the SQL with parameters
            const result = await this.executeSqlWithPGlite(executableSql, dynamicResult.params);
            const executionTime = Math.round(performance.now() - startTime);
            
            return {
              success: true,
              data: result.rows,
              executionTime,
              rowCount: result.rows?.length || 0,
              executedSql: executableSql
            };
          } catch (cteError) {
            const executionTime = Math.round(performance.now() - startTime);
            const errorMessage = cteError instanceof Error ? cteError.message : 'CTE execution failed';
            
            console.log('[DEBUG] CTE getDynamicSql execution failed:', errorMessage);
            
            return {
              success: false,
              error: `CTE execution failed: ${errorMessage}`,
              executionTime,
              executedSql: this.context.tabContent
            };
          }
          
        } else {
          console.log('[DEBUG] Non-CTE tab execution - updating sqlWithoutCte');
          // Update model's SQL with current tab content  
          this.context.sqlModel.updateEditorContent(this.context.tabContent);
          if (this.context.tabType === 'main') {
            this.context.sqlModel.save();
          }
        }
        
        // Only generate dynamic SQL if not already set (e.g., from CTE execution)
        if (!dynamicResult) {
          // Get test values and filter conditions from workspace
          const testValues = this.getTestValues();
          const filterConditions = this.context.workspace?.filterConditions;
          
          console.log('[DEBUG] Test values:', !!testValues, 'Filter conditions:', !!filterConditions);
          if (filterConditions) {
            const conditions = filterConditions.getFilterConditions();
            console.log('[DEBUG] Filter conditions content:', conditions);
            console.log('[DEBUG] Filter conditions keys:', Object.keys(conditions || {}));
          }
          
          // Generate dynamic SQL with parameterization for execution
          dynamicResult = await this.context.sqlModel.getDynamicSql(testValues, filterConditions, true);
          console.log('[DEBUG] Generated dynamic SQL length:', dynamicResult.formattedSql.length);
        }
        
      } else if (this.context.tabType === 'main' && this.context.workspace) {
        console.log('[DEBUG] Using fallback main model path for execution');
        // Fallback: find main model in workspace
        const mainModel = this.context.workspace.sqlModels.find(m => m.type === 'main');
        if (mainModel) {
          console.log('[DEBUG] Found main model:', mainModel.name);
          mainModel.sqlWithoutCte = this.context.tabContent;
          const testValues = this.context.workspace.testValues;
          const filterConditions = this.context.workspace.filterConditions;
          
          console.log('[DEBUG] Fallback - Test values:', !!testValues, 'Filter conditions:', !!filterConditions);
          if (filterConditions) {
            const conditions = filterConditions.getFilterConditions();
            console.log('[DEBUG] Fallback filter conditions content:', conditions);
            console.log('[DEBUG] Fallback filter conditions keys:', Object.keys(conditions || {}));
          }
          
          // Generate dynamic SQL with parameterization for execution
          dynamicResult = await mainModel.getDynamicSql(testValues, filterConditions, true);
          console.log('[DEBUG] Fallback generated dynamic SQL length:', dynamicResult.formattedSql.length);
        } else {
          console.log('[DEBUG] No main model found in workspace');
        }
      } else {
        console.log('[DEBUG] No SQL model or workspace available, using plain SQL');
      }
      
      // If we don't have dynamic result, throw error
      if (!dynamicResult) {
        throw new Error('Unable to generate SQL with proper CTE composition. Please ensure all dependencies are available.');
      }
      
      // Log final SQL before execution
      console.log('[DEBUG] Final SQL to execute:', dynamicResult.formattedSql.substring(0, 200) + '...');
      console.log('[DEBUG] SQL includes WITH clause?', dynamicResult.formattedSql.toLowerCase().includes('with'));
      
      // Execute SQL using PGlite with parameters
      const result = await this.executeSqlWithPGlite(dynamicResult.formattedSql, dynamicResult.params);
      const executionTime = Math.round(performance.now() - startTime);
      
      const executionResult: QueryExecutionResult = {
        success: true,
        data: result.rows,
        executionTime,
        rowCount: result.rows?.length || 0,
        executedSql: dynamicResult.formattedSql
      };
      
      // Save result to model if available - using type-safe approach
      if (this.context.sqlModel && hasQueryResultCapability(this.context.sqlModel)) {
        // Convert legacy result format to new type-safe format
        const typeSafeResult = new QueryResultBuilder(dynamicResult.formattedSql)
          .setStatus('completed')
          .setRows(result.rows || [])
          .setStats({
            rowsAffected: 0,
            rowsReturned: result.rows?.length || 0,
            executionTimeMs: executionTime
          })
          .build();
        
        this.context.sqlModel.setQueryResult(typeSafeResult);
      }
      
      return executionResult;
      
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : 'SQL execution failed';
      const executedSql = dynamicResult?.formattedSql || this.context.tabContent;
      
      return {
        success: false,
        error: `${errorMessage}${executedSql ? `

Executed SQL:
${executedSql}` : ''}`,
        executionTime,
        executedSql: executedSql || this.context.tabContent
      };
    }
  }
  
  private getTestValues(): TestValuesModel | string | undefined {
    if (this.context.workspace?.testValues) {
      console.log('[DEBUG] getTestValues - Found test values:', this.context.workspace.testValues.withClause);
      return this.context.workspace.testValues;
    }
    console.log('[DEBUG] getTestValues - No test values found');
    return undefined;
  }
  
  private async executeSqlWithPGlite(sql: string, params: unknown[] = []): Promise<{ rows: Record<string, unknown>[] }> {
    // Dynamically import PGlite
    const { PGlite } = await import('@electric-sql/pglite');
    
    // Initialize PGlite in memory-only mode
    const db = new PGlite();
    
    // Execute the SQL with parameters
    if (params.length > 0) {
      console.log('[DEBUG] Executing SQL with parameters:', { sql, params });
      return await db.query(sql, params);
    } else {
      console.log('[DEBUG] Executing SQL without parameters:', sql);
      return await db.query(sql);
    }
  }
}
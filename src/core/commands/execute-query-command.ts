/**
 * Execute Query Command
 * Core Layer - SQL Query Execution Business Logic
 */

import { BaseCommand, CommandResult } from './base';
import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlModelEntity, DynamicSqlResult } from '@core/entities/sql-model';
import { TestValuesModel } from '@core/entities/test-values-model';
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
        hasWorkspace: !!this.context.workspace
      });

      // If we have a model, use dynamic SQL generation
      if (this.context.sqlModel) {
        console.log('[DEBUG] Using sqlModel path for execution');
        // Update model's SQL with current tab content
        this.context.sqlModel.sqlWithoutCte = this.context.tabContent;
        
        // Get test values and filter conditions from workspace
        const testValues = this.getTestValues();
        const filterConditions = this.context.workspace?.filterConditions;
        
        console.log('[DEBUG] Test values:', !!testValues, 'Filter conditions:', !!filterConditions);
        
        // Generate dynamic SQL with parameterization for execution
        dynamicResult = await this.context.sqlModel.getDynamicSql(testValues, filterConditions, true);
        console.log('[DEBUG] Generated dynamic SQL length:', dynamicResult.formattedSql.length);
        
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
      
      // Save result to model if available
      if (this.context.sqlModel && 'setQueryResult' in this.context.sqlModel) {
        (this.context.sqlModel as any).setQueryResult(executionResult);
      }
      
      return executionResult;
      
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : 'SQL execution failed';
      const executedSql = dynamicResult?.formattedSql || this.context.tabContent;
      
      return {
        success: false,
        error: `${errorMessage}\n\nExecuted SQL:\n${executedSql}`,
        executionTime,
        executedSql
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
  
  private async executeSqlWithPGlite(sql: string, params: any[] = []): Promise<any> {
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
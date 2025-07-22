/**
 * Execute Query Command
 * Core Layer - SQL Query Execution Business Logic
 */

import { BaseCommand, CommandResult } from './base';
import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlModelEntity } from '@core/entities/sql-model';
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
    
    try {
      // Get the SQL to execute
      let sqlToExecute = this.context.tabContent;
      
      // If we have a model, use it for CTE composition
      if (this.context.sqlModel) {
        // Update model's SQL with current tab content
        this.context.sqlModel.sqlWithoutCte = this.context.tabContent;
        
        // Get test values from workspace
        const testValues = this.getTestValues();
        
        // Use getFullSql() for CTE composition
        sqlToExecute = this.context.sqlModel.getFullSql(testValues);
      } else if (this.context.tabType === 'main' && this.context.workspace) {
        // Fallback: find main model in workspace
        const mainModel = this.context.workspace.sqlModels.find(m => m.type === 'main');
        if (mainModel) {
          mainModel.sqlWithoutCte = this.context.tabContent;
          const testValues = this.context.workspace.testValues;
          sqlToExecute = mainModel.getFullSql(testValues);
        }
      }
      
      // Execute SQL using PGlite
      const result = await this.executeSqlWithPGlite(sqlToExecute);
      const executionTime = Math.round(performance.now() - startTime);
      
      const executionResult: QueryExecutionResult = {
        success: true,
        data: result.rows,
        executionTime,
        rowCount: result.rows?.length || 0,
        executedSql: sqlToExecute
      };
      
      // Save result to model if available
      if (this.context.sqlModel && 'setQueryResult' in this.context.sqlModel) {
        (this.context.sqlModel as any).setQueryResult(executionResult);
      }
      
      return executionResult;
      
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : 'SQL execution failed';
      
      return {
        success: false,
        error: `${errorMessage}\n\nExecuted SQL:\n${sqlToExecute}`,
        executionTime,
        executedSql: sqlToExecute
      };
    }
  }
  
  private getTestValues(): TestValuesModel | string | undefined {
    if (this.context.workspace?.testValues) {
      return this.context.workspace.testValues;
    }
    return undefined;
  }
  
  private async executeSqlWithPGlite(sql: string): Promise<any> {
    // Dynamically import PGlite
    const { PGlite } = await import('@electric-sql/pglite');
    
    // Initialize PGlite in memory-only mode
    const db = new PGlite();
    
    // Execute the SQL
    return await db.query(sql);
  }
}
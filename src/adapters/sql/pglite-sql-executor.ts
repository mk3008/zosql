/**
 * PGlite SQL Executor
 * Infrastructure Layer - PGlite implementation of SqlExecutorPort
 * Concrete adapter implementing SQL execution using WASM PostgreSQL
 */

import { 
  SqlExecutorPort, 
  SqlExecutionContext,
  DatabaseConnection 
} from '@core/ports/sql-executor-port';
import { 
  QueryExecutionResult, 
  QueryExecutionOptions,
  ColumnMetadata,
  createSuccessResult,
  createErrorResult 
} from '@core/types/query-types';

/**
 * Execution session for tracking running queries
 */
interface ExecutionSession {
  readonly id: string;
  readonly startTime: number;
  readonly sql: string;
  readonly context: SqlExecutionContext;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
}

/**
 * PGlite implementation of SqlExecutorPort
 * Provides secure SQL execution using WASM PostgreSQL engine
 */
export class PGliteSqlExecutor implements SqlExecutorPort {
  private readonly sessions = new Map<string, ExecutionSession>();
  private connectionPool = new Map<string, any>(); // PGlite instances

  async executeQuery(
    sql: string,
    params: readonly unknown[],
    context: SqlExecutionContext,
    options?: QueryExecutionOptions
  ): Promise<QueryExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = performance.now();

    // Create execution session
    const session: ExecutionSession = {
      id: executionId,
      startTime,
      sql,
      context,
      status: 'running',
      progress: 0
    };
    this.sessions.set(executionId, session);

    try {
      console.log(`[SQL-EXECUTOR] Starting query execution: ${executionId}`);
      
      // Get or create database connection
      const db = await this.getConnection(context.connection);
      
      // Set execution timeout
      const timeout = options?.timeout || context.config.timeout || 30000;
      const maxRows = options?.maxRows || context.config.maxRows || 10000;

      session.progress = 25;

      // Execute query with timeout and row limit
      const result = await this.executeWithTimeout(db, sql, params, timeout, maxRows);
      
      session.progress = 75;
      
      // Process result
      const executionTime = Math.round(performance.now() - startTime);
      const rowCount = result.rows?.length || 0;
      
      // Apply row limit if exceeded
      let limitedRows = result.rows || [];
      if (rowCount > maxRows) {
        limitedRows = limitedRows.slice(0, maxRows);
        console.warn(`[SQL-EXECUTOR] Result truncated to ${maxRows} rows (original: ${rowCount})`);
      }

      session.status = 'completed';
      session.progress = 100;

      const executionResult = createSuccessResult(
        sql,
        limitedRows,
        [], // columns - would need to extract from result
        {
          rowsReturned: limitedRows.length,
          executionTimeMs: executionTime
        }
      );

      console.log(`[SQL-EXECUTOR] Query completed: ${executionId} (${executionTime}ms, ${limitedRows.length} rows)`);
      
      return executionResult;

    } catch (error) {
      session.status = 'failed';
      const executionTime = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : 'Query execution failed';
      
      console.error(`[SQL-EXECUTOR] Query failed: ${executionId}`, error);
      
      return createErrorResult(
        sql,
        {
          code: 'EXECUTION_ERROR',
          message: errorMessage,
          severity: 'error' as const
        },
        {
          executionId,
          startTime: new Date(startTime),
          endTime: new Date(),
          duration: executionTime
        }
      );
    } finally {
      // Clean up session after delay
      setTimeout(() => {
        this.sessions.delete(executionId);
      }, 60000); // Keep session for 1 minute for status queries
    }
  }

  async explainQuery(
    sql: string,
    params: readonly unknown[],
    context: SqlExecutionContext
  ): Promise<QueryExecutionResult> {
    // Wrap query with EXPLAIN
    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
    
    return await this.executeQuery(explainSql, params, context, {
      timeout: 10000, // Shorter timeout for explain
      maxRows: 100    // Explain output is usually small
    });
  }

  async validateSql(
    sql: string,
    context: SqlExecutionContext
  ): Promise<{
    isValid: boolean;
    errors: readonly string[];
    warnings: readonly string[];
  }> {
    try {
      // Syntax validation with PGlite
      const db = await this.getConnection(context.connection);
      
      // Use EXPLAIN to validate syntax without execution
      await db.query(`EXPLAIN ${sql}`);
      
      return {
        isValid: true,
        errors: [],
        warnings: []
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Syntax validation failed';
      
      return {
        isValid: false,
        errors: [errorMessage],
        warnings: []
      };
    }
  }

  async getTableSchema(
    tableName: string,
    context: SqlExecutionContext
  ): Promise<{
    columns: readonly ColumnMetadata[];
    indexes: readonly string[];
    constraints: readonly string[];
  }> {
    try {
      const db = await this.getConnection(context.connection);
      
      // Get column information
      const columnQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `;
      
      const columnResult = await db.query(columnQuery, [tableName]);
      const columns: ColumnMetadata[] = columnResult.rows.map((row: any) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default,
        maxLength: row.character_maximum_length,
        precision: row.numeric_precision,
        scale: row.numeric_scale
      }));

      // Get indexes (simplified for PGlite)
      const indexQuery = `
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = $1
      `;
      
      const indexResult = await db.query(indexQuery, [tableName]);
      const indexes = indexResult.rows.map((row: any) => row.indexname);

      return {
        columns,
        indexes,
        constraints: [] // PGlite might not support full constraint information
      };

    } catch (error) {
      console.error(`[SQL-EXECUTOR] Schema lookup failed for table: ${tableName}`, error);
      
      return {
        columns: [],
        indexes: [],
        constraints: []
      };
    }
  }

  async testConnection(connection: DatabaseConnection): Promise<boolean> {
    try {
      const db = await this.getConnection(connection);
      
      // Simple test query
      await db.query('SELECT 1 as test');
      
      console.log(`[SQL-EXECUTOR] Connection test successful: ${connection.name}`);
      return true;

    } catch (error) {
      console.error(`[SQL-EXECUTOR] Connection test failed: ${connection.name}`, error);
      return false;
    }
  }

  async cancelQuery(executionId: string): Promise<boolean> {
    const session = this.sessions.get(executionId);
    if (!session) {
      return false;
    }

    if (session.status === 'running') {
      session.status = 'cancelled';
      console.log(`[SQL-EXECUTOR] Query cancelled: ${executionId}`);
      return true;
    }

    return false;
  }

  async getExecutionStatus(executionId: string): Promise<{
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    estimatedTimeRemaining?: number;
  }> {
    const session = this.sessions.get(executionId);
    if (!session) {
      return { status: 'failed' };
    }

    const result = {
      status: session.status,
      progress: session.progress
    };

    // Estimate remaining time based on progress
    if (session.status === 'running' && session.progress && session.progress > 0) {
      const elapsed = performance.now() - session.startTime;
      const estimatedTotal = (elapsed / session.progress) * 100;
      const estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
      
      return {
        ...result,
        estimatedTimeRemaining: Math.round(estimatedTimeRemaining)
      };
    }

    return result;
  }

  /**
   * Get or create PGlite database connection
   */
  private async getConnection(connection: DatabaseConnection): Promise<any> {
    // Check if connection already exists in pool
    let db = this.connectionPool.get(connection.id);
    
    if (!db) {
      // Dynamically import PGlite
      const { PGlite } = await import('@electric-sql/pglite');
      
      // Create new in-memory PGlite instance
      db = new PGlite();
      
      // Store in connection pool
      this.connectionPool.set(connection.id, db);
      
      console.log(`[SQL-EXECUTOR] Created new PGlite connection: ${connection.name}`);
    }
    
    return db;
  }

  /**
   * Execute query with timeout and row limit protection
   */
  private async executeWithTimeout(
    db: any,
    sql: string,
    params: readonly unknown[],
    timeout: number,
    _maxRows: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Query execution timeout after ${timeout}ms`));
      }, timeout);

      // Execute query
      const executeQuery = async () => {
        try {
          let result;
          
          if (params.length > 0) {
            result = await db.query(sql, Array.from(params));
          } else {
            result = await db.query(sql);
          }
          
          clearTimeout(timeoutId);
          resolve(result);
          
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      };

      executeQuery();
    });
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }


  /**
   * Clean up connections and resources
   */
  async cleanup(): Promise<void> {
    this.connectionPool.clear();
    this.sessions.clear();
    console.log('[SQL-EXECUTOR] Cleaned up connections and sessions');
  }
}
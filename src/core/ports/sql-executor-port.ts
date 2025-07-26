/**
 * SQL Executor Port
 * Hexagonal Architecture - Domain Layer Port Definition
 * Defines interface for SQL execution without implementation details
 */

import { QueryExecutionResult, QueryExecutionOptions, ColumnMetadata } from '@core/types/query-types';

/**
 * SQL execution configuration
 */
export interface SqlExecutionConfig {
  readonly timeout: number;
  readonly maxRows: number;
  readonly maxMemoryMB: number;
  readonly enableExplain: boolean;
  readonly enableStats: boolean;
}

/**
 * Database connection information
 */
export interface DatabaseConnection {
  readonly id: string;
  readonly name: string;
  readonly type: 'postgres' | 'mysql' | 'sqlite' | 'mssql' | 'oracle';
  readonly isConnected: boolean;
  readonly version?: string;
}

/**
 * SQL execution context
 */
export interface SqlExecutionContext {
  readonly sessionId: string;
  readonly userId?: string;
  readonly workspaceId?: string;
  readonly connection: DatabaseConnection;
  readonly config: SqlExecutionConfig;
}

/**
 * SQL Executor Port
 * Domain Layer interface - no implementation details
 */
export interface SqlExecutorPort {
  /**
   * Execute SQL query
   */
  executeQuery(
    sql: string,
    params: readonly unknown[],
    context: SqlExecutionContext,
    options?: QueryExecutionOptions
  ): Promise<QueryExecutionResult>;

  /**
   * Execute SQL query with explanation
   */
  explainQuery(
    sql: string,
    params: readonly unknown[],
    context: SqlExecutionContext
  ): Promise<QueryExecutionResult>;

  /**
   * Validate SQL syntax without execution
   */
  validateSql(
    sql: string,
    context: SqlExecutionContext
  ): Promise<{
    isValid: boolean;
    errors: readonly string[];
    warnings: readonly string[];
  }>;

  /**
   * Get table schema information
   */
  getTableSchema(
    tableName: string,
    context: SqlExecutionContext
  ): Promise<{
    columns: readonly ColumnMetadata[];
    indexes: readonly string[];
    constraints: readonly string[];
  }>;

  /**
   * Test database connection
   */
  testConnection(connection: DatabaseConnection): Promise<boolean>;

  /**
   * Cancel running query
   */
  cancelQuery(executionId: string): Promise<boolean>;

  /**
   * Get query execution status
   */
  getExecutionStatus(executionId: string): Promise<{
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    estimatedTimeRemaining?: number;
  }>;
}

/**
 * SQL Connection Manager Port
 * Domain Layer interface for connection management
 */
export interface SqlConnectionManagerPort {
  /**
   * Create new database connection
   */
  createConnection(config: {
    name: string;
    type: DatabaseConnection['type'];
    connectionString: string;
  }): Promise<DatabaseConnection>;

  /**
   * Get available connections
   */
  getConnections(): Promise<readonly DatabaseConnection[]>;

  /**
   * Get connection by ID
   */
  getConnection(id: string): Promise<DatabaseConnection | null>;

  /**
   * Close connection
   */
  closeConnection(id: string): Promise<boolean>;

  /**
   * Close all connections
   */
  closeAllConnections(): Promise<void>;
}

/**
 * Query History Port
 * Domain Layer interface for query history management
 */
export interface QueryHistoryPort {
  /**
   * Save executed query to history
   */
  saveQueryToHistory(
    sql: string,
    result: QueryExecutionResult,
    context: SqlExecutionContext
  ): Promise<void>;

  /**
   * Get query history for user/workspace
   */
  getQueryHistory(
    filters: {
      userId?: string;
      workspaceId?: string;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    }
  ): Promise<readonly {
    id: string;
    sql: string;
    executedAt: Date;
    executionTime: number;
    success: boolean;
    rowCount: number;
  }[]>;

  /**
   * Clear query history
   */
  clearHistory(userId?: string, workspaceId?: string): Promise<void>;
}
/**
 * Query Execution Type Definitions
 * Core Layer - Type-safe definitions for SQL query execution and results
 */

/**
 * SQL query execution status
 */
export type QueryExecutionStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

/**
 * Query execution context information
 */
export interface QueryExecutionContext {
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly duration?: number;
  readonly executionId: string;
  readonly userId?: string;
  readonly sessionId?: string;
}

/**
 * Database column metadata
 */
export interface ColumnMetadata {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly maxLength?: number;
  readonly precision?: number;
  readonly scale?: number;
}

/**
 * Query execution statistics
 */
export interface QueryExecutionStats {
  readonly rowsAffected: number;
  readonly rowsReturned: number;
  readonly executionTimeMs: number;
  readonly planningTimeMs?: number;
  readonly memoryUsageBytes?: number;
  readonly diskReadsCount?: number;
  readonly cacheHitRatio?: number;
}

/**
 * Query error information
 */
export interface QueryError {
  readonly code: string;
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'notice';
  readonly position?: number;
  readonly line?: number;
  readonly column?: number;
  readonly hint?: string;
  readonly detail?: string;
}

/**
 * Query execution result - type-safe replacement for any type
 */
export interface QueryExecutionResult {
  readonly status: QueryExecutionStatus;
  readonly context: QueryExecutionContext;
  readonly columns?: readonly ColumnMetadata[];
  readonly rows?: readonly Record<string, unknown>[];
  readonly stats: QueryExecutionStats;
  readonly errors: readonly QueryError[];
  readonly warnings: readonly QueryError[];
  readonly sql: string;
  readonly formattedSql?: string;
}

/**
 * Query execution options
 */
export interface QueryExecutionOptions {
  readonly timeout?: number;
  readonly maxRows?: number;
  readonly explain?: boolean;
  readonly includeStats?: boolean;
  readonly dryRun?: boolean;
  readonly transactionMode?: 'auto' | 'manual' | 'none';
}

/**
 * Interface for entities capable of storing query results
 */
export interface QueryResultCapable {
  setQueryResult(result: QueryExecutionResult): void;
  getQueryResult(): QueryExecutionResult | null;
  hasQueryResult(): boolean;
  clearQueryResult(): void;
}

/**
 * Type guard to check if an entity can store query results
 */
export function hasQueryResultCapability(entity: unknown): entity is QueryResultCapable {
  if (!entity || typeof entity !== 'object') {
    return false;
  }

  const obj = entity as Record<string, unknown>;
  
  return (
    typeof obj.setQueryResult === 'function' &&
    typeof obj.getQueryResult === 'function' &&
    typeof obj.hasQueryResult === 'function' &&
    typeof obj.clearQueryResult === 'function'
  );
}

/**
 * Safe type assertion for query result capable entities
 * Replaces dangerous 'as any' casts
 */
export function assertQueryResultCapable(entity: unknown): QueryResultCapable {
  if (!hasQueryResultCapability(entity)) {
    throw new TypeError('Entity does not implement QueryResultCapable interface');
  }
  return entity;
}

/**
 * Query validation result
 */
export interface QueryValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly QueryError[];
  readonly warnings: readonly QueryError[];
  readonly estimatedCost?: number;
  readonly securityRisk?: 'low' | 'medium' | 'high';
}

/**
 * Interface for query execution context
 */
export interface QueryExecutionContext {
  readonly workspace?: {
    readonly id: string;
    readonly name: string;
  };
  readonly sqlModel?: {
    readonly name: string;
    readonly type: 'main' | 'cte';
  };
  readonly testValues?: {
    readonly withClause: string;
  };
  readonly formatter?: {
    readonly config: string; // JSON string
  };
}

/**
 * Create successful query result
 */
export function createSuccessResult(
  sql: string,
  rows: readonly Record<string, unknown>[],
  columns: readonly ColumnMetadata[],
  stats: Partial<QueryExecutionStats> = {}
): QueryExecutionResult {
  const now = new Date();
  
  return {
    status: 'completed',
    context: {
      startTime: now,
      endTime: now,
      duration: stats.executionTimeMs || 0,
      executionId: generateExecutionId()
    },
    columns,
    rows,
    stats: {
      rowsAffected: 0,
      rowsReturned: rows.length,
      executionTimeMs: 0,
      ...stats
    },
    errors: [],
    warnings: [],
    sql,
    formattedSql: sql
  };
}

/**
 * Create error query result
 */
export function createErrorResult(
  sql: string,
  error: QueryError,
  context: Partial<QueryExecutionContext> = {}
): QueryExecutionResult {
  const now = new Date();
  
  return {
    status: 'failed',
    context: {
      startTime: now,
      endTime: now,
      duration: 0,
      executionId: generateExecutionId(),
      ...context
    },
    stats: {
      rowsAffected: 0,
      rowsReturned: 0,
      executionTimeMs: 0
    },
    errors: [error],
    warnings: [],
    sql
  };
}

/**
 * Create pending query result
 */
export function createPendingResult(sql: string): QueryExecutionResult {
  return {
    status: 'pending',
    context: {
      startTime: new Date(),
      executionId: generateExecutionId()
    },
    stats: {
      rowsAffected: 0,
      rowsReturned: 0,
      executionTimeMs: 0
    },
    errors: [],
    warnings: [],
    sql
  };
}

/**
 * Validate query execution result
 */
export function validateQueryResult(result: unknown): result is QueryExecutionResult {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const obj = result as Record<string, unknown>;
  
  return (
    typeof obj.status === 'string' &&
    ['pending', 'executing', 'completed', 'failed', 'cancelled'].includes(obj.status) &&
    typeof obj.context === 'object' &&
    obj.context !== null &&
    typeof obj.stats === 'object' &&
    obj.stats !== null &&
    Array.isArray(obj.errors) &&
    Array.isArray(obj.warnings) &&
    typeof obj.sql === 'string'
  );
}

/**
 * Convert legacy result format to type-safe format
 */
export function migrateLegacyResult(legacyResult: any): QueryExecutionResult {
  if (validateQueryResult(legacyResult)) {
    return legacyResult;
  }

  // Handle common legacy formats
  const sql = legacyResult?.query || legacyResult?.sql || '';
  const rows = Array.isArray(legacyResult?.data) ? legacyResult.data : [];
  const error = legacyResult?.error;

  if (error) {
    return createErrorResult(sql, {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      severity: 'error'
    });
  }

  return createSuccessResult(sql, rows, []);
}

/**
 * Generate unique execution ID
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Type-safe query result builder
 */
export class QueryResultBuilder {
  private result: any = {};

  constructor(sql: string) {
    this.result.sql = sql;
    this.result.context = {
      startTime: new Date(),
      executionId: generateExecutionId()
    };
    this.result.errors = [];
    this.result.warnings = [];
  }

  setStatus(status: QueryExecutionStatus): this {
    this.result.status = status;
    return this;
  }

  setRows(rows: readonly Record<string, unknown>[]): this {
    this.result.rows = rows;
    return this;
  }

  setColumns(columns: readonly ColumnMetadata[]): this {
    this.result.columns = columns;
    return this;
  }

  setStats(stats: Partial<QueryExecutionStats>): this {
    this.result.stats = {
      rowsAffected: 0,
      rowsReturned: this.result.rows?.length || 0,
      executionTimeMs: 0,
      ...stats
    };
    return this;
  }

  addError(error: QueryError): this {
    this.result.errors = [...(this.result.errors || []), error];
    return this;
  }

  addWarning(warning: QueryError): this {
    this.result.warnings = [...(this.result.warnings || []), warning];
    return this;
  }

  setEndTime(endTime: Date = new Date()): this {
    if (this.result.context) {
      this.result.context = {
        ...this.result.context,
        endTime,
        duration: endTime.getTime() - this.result.context.startTime.getTime()
      };
    }
    return this;
  }

  build(): QueryExecutionResult {
    // Ensure all required fields are present
    const requiredStatus = this.result.status || 'completed';
    const requiredStats = this.result.stats || {
      rowsAffected: 0,
      rowsReturned: this.result.rows?.length || 0,
      executionTimeMs: this.result.context?.duration || 0
    };

    return {
      status: requiredStatus,
      context: this.result.context!,
      columns: this.result.columns,
      rows: this.result.rows,
      stats: requiredStats,
      errors: this.result.errors || [],
      warnings: this.result.warnings || [],
      sql: this.result.sql!,
      formattedSql: this.result.formattedSql
    };
  }
}
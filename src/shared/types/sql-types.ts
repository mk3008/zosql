/**
 * SQL-related type definitions
 * Minimal type definitions to avoid using 'any'
 */

/**
 * Minimal WithClause interface based on rawsql-ts structure
 */
export interface MinimalWithClause {
  tables?: Array<{
    aliasExpression?: {
      table?: { name?: string };
      columns?: Array<{ name: string }>;
    };
    query?: unknown;
  }>;
}

/**
 * Table reference in SQL AST
 */
export interface TableReference {
  name: string;
  schema?: string;
}

/**
 * Column reference in SQL AST
 */
export interface ColumnReference {
  name: string;
  table?: string;
}
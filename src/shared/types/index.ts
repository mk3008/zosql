// No longer need rawsql-ts imports for basic types

// Entity exports
export { FilterConditionsEntity } from '@core/entities/filter-conditions';
export { SqlFormatterEntity } from '@core/entities/sql-formatter';
export { WorkspaceEntity } from '@core/entities/workspace';
export type { ModelFilterConditions } from '@core/entities/workspace';

// Domain Types
export interface CTE {
  name: string;
  query: string;
  description?: string;
  dependencies: string[];
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  originalQuery: string;
  originalFilePath?: string;
  decomposedQuery: string;
  privateCtes: Record<string, CTE>;
  created: string;
  lastModified: string;
}

export interface QueryExecutionResult {
  success: boolean;
  data?: any[];
  error?: string;
  executionTime?: number;
  rowCount?: number;
  executedSql?: string; // The actual SQL that was executed (with WITH clauses)
}

// Forward declaration for circular reference
export interface SqlModelEntity {
  type: 'main' | 'cte';
  name: string;
  sqlWithoutCte: string;
  dependents: SqlModelEntity[];
  columns?: string[];
  originalSql?: string;
  getFullSql(testValues?: TestValuesModel | string, filterConditions?: FilterConditionsEntity, forExecution?: boolean): Promise<string>;
  getDependentNames(): string[];
  getDynamicSql(testValues?: TestValuesModel | string, filterConditions?: FilterConditionsEntity, forExecution?: boolean): Promise<any>;
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

// UI State Types
export interface UIState {
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  activeTabId: string | null;
  resultsVisible: boolean;
}

export interface Tab {
  id: string;
  title: string;
  type: 'main' | 'cte' | 'values' | 'formatter' | 'condition';
  content: string;
  isDirty: boolean;
  cteName?: string;
}

// Test Values Types
export interface TestValuesModel {
  withClause: string;
  getWithClause(): import('./sql-types').MinimalWithClause | null;
  getString(formatter: import('rawsql-ts').SqlFormatter): string;
  toString(): string;
  hasCte(cteName: string): boolean;
  getCteNames(): string[];
  clone(): TestValuesModel;
  displayString: string; // getter for GUI binding
}

// Filter Conditions Types
export interface FilterConditionsModel {
  conditions: string;
  getFilterConditions(): import('rawsql-ts').FilterConditions;
  setFilterConditions(conditions: import('rawsql-ts').FilterConditions): void;
  isValid(): boolean;
  clone(): FilterConditionsModel;
  displayString: string; // getter for GUI binding
}

// SQL Formatter Types
export interface SqlFormatterModel {
  config: string;
  getSqlFormatter(): import('rawsql-ts').SqlFormatter;
  setFormatterConfig(options: any): void;
  isValid(): boolean;
  clone(): SqlFormatterModel;
  displayString: string; // getter for GUI binding
}

// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Storage Types
export interface StorageAdapter {
  load(): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<void>;
  clear(): Promise<void>;
}
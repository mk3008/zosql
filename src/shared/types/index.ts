// No longer need rawsql-ts imports for basic types

// Entity exports
export { FilterConditionsEntity } from '@core/entities/filter-conditions';
export { SqlFormatterEntity } from '@core/entities/sql-formatter';
export { WorkspaceEntity } from '@core/entities/workspace';
export type { ModelFilterConditions } from '@core/entities/workspace';
import { QueryExecutionResult as CoreQueryExecutionResult } from '@core/types/query-types';

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

// Use core QueryExecutionResult type for consistency
export type { QueryExecutionResult } from '@core/types/query-types';

// Forward declaration for circular reference - use actual class from core/entities
export type { SqlModelEntity } from '@core/entities/sql-model';

// SqlModel interface removed - use SqlModelEntity class directly to avoid circular dependencies

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
  queryResult?: CoreQueryExecutionResult; // Add query result directly to tab
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
  setFormatterConfig(options: unknown): void;
  isValid(): boolean;
  clone(): SqlFormatterModel;
  displayString: string; // getter for GUI binding
}

// API Types
export interface ApiResponse<T = unknown> {
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
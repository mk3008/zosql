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
  type: 'main' | 'cte';
  content: string;
  isDirty: boolean;
  cteName?: string;
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
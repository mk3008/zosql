import { Workspace, CTE, QueryExecutionResult } from '@shared/types';

// Domain Ports (Interfaces)
export interface WorkspaceRepository {
  findById(id: string): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<void>;
  clear(): Promise<void>;
}

export interface SqlParser {
  parseQuery(sql: string): Promise<ParsedQuery>;
  extractCTEs(sql: string): Promise<CTE[]>;
  formatQuery(sql: string, options?: FormatOptions): Promise<string>;
}

export interface ParsedQuery {
  type: 'simple' | 'binary' | 'values';
  withClause?: {
    tables: Record<string, unknown>[];
  };
  ctes: CTE[];
}

export interface FormatOptions {
  identifierEscape?: { start: string; end: string };
  keywordCase?: 'lower' | 'upper';
  indentSize?: number;
  withClauseStyle?: 'standard' | 'cte-oneline' | 'full-oneline';
  uppercase?: boolean;
  linesBetweenQueries?: number;
}

export interface CTEDependencyResolver {
  resolveDependencies(targetCTE: string, allCTEs: Record<string, CTE>): string;
  validateNoCycles(ctes: Record<string, CTE>): boolean;
  getExecutionOrder(ctes: Record<string, CTE>): string[];
}

export interface QueryExecutor {
  execute(sql: string): Promise<QueryExecutionResult>;
}
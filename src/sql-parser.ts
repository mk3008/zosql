export interface ParseResult {
  type: 'simple' | 'with_cte';
  ctes: any[];
}

export function parseSQL(sql: string): ParseResult {
  return {
    type: 'simple',
    ctes: []
  };
}
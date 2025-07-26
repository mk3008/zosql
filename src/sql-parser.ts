import { SelectQueryParser } from 'rawsql-ts';

export interface CTEInfo {
  name: string;
  query: any;
}

export interface ParseResult {
  type: string;
  ctes: CTEInfo[];
  query: any;
}

export function parseSQL(sql: string): ParseResult {
  const query = SelectQueryParser.parse(sql).toSimpleQuery();
  
  // CTEの抽出
  const ctes: CTEInfo[] = [];
  if (query.withClause && query.withClause.tables) {
    for (const cte of query.withClause.tables) {
      ctes.push({
        name: cte.aliasExpression.table.name,
        query: cte
      });
    }
  }
  
  return {
    type: query.constructor.name,
    ctes,
    query
  };
}
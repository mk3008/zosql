import { SelectQueryParser } from 'rawsql-ts';

export interface ParseResult {
  type: string;
  ctes: any[];
  query: any;
}

export function parseSQL(sql: string): ParseResult {
  const query = SelectQueryParser.parse(sql);
  
  return {
    type: query.constructor.name,
    ctes: [],
    query
  };
}
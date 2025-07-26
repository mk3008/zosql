/**
 * Format Query Command
 * Core Layer - SQL Query Formatting Business Logic
 */

import { BaseCommand } from './base';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { SelectQueryParser } from 'rawsql-ts';

export interface FormatQueryContext {
  sql: string;
  formatter: SqlFormatterEntity;
}

/**
 * Command to format SQL query using rawsql-ts
 */
export class FormatQueryCommand extends BaseCommand<string> {
  constructor(
    private readonly context: FormatQueryContext
  ) {
    super('Format SQL Query');
  }
  
  canExecute(): boolean {
    return this.context.sql.trim().length > 0;
  }
  
  async execute(): Promise<string> {
    try {
      // Parse SQL using rawsql-ts
      const query = SelectQueryParser.parse(this.context.sql);
      
      // Get formatter instance
      const formatter = this.context.formatter.getSqlFormatter();
      
      // Format the query
      const formatted = formatter.format(query);
      
      // Return formatted SQL
      return typeof formatted === 'string' ? formatted : formatted.formattedSql;
      
    } catch (error) {
      // If rawsql-ts fails to parse, return original SQL
      console.warn('Failed to format SQL:', error);
      return this.context.sql;
    }
  }
}
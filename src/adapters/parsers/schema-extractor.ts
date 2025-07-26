/**
 * Schema Extractor Adapter
 * Infrastructure Layer - rawsql-ts integration for schema analysis
 */

import { SelectQueryParser, SchemaCollector } from 'rawsql-ts';
import { SqlParserPort } from '@core/usecases/prompt-generator';

export class SchemaExtractor implements SqlParserPort {
  /**
   * Extract schema information from SQL query
   * @param sql - SQL query string
   * @returns Array of table names with column information
   */
  async extractSchema(sql: string): Promise<string[]> {
    try {
      // Parse SQL using rawsql-ts
      const query = SelectQueryParser.parse(sql).toSimpleQuery();
      const collector = new SchemaCollector();
      const schemas = collector.collect(query);

      // Convert to simple table information format
      const tableInfo = schemas.map(schema => {
        const tableName = schema.name;
        const columns = schema.columns || [];
        
        if (columns.length > 0) {
          return `${tableName}(${columns.join(', ')})`;
        } else {
          return tableName;
        }
      });

      return tableInfo;
    } catch (error) {
      console.error('Schema extraction failed:', error);
      throw new Error(`Failed to extract schema from SQL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
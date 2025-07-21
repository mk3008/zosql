/**
 * SQL Decomposer Parser Adapter
 * Infrastructure Layer - Implements SqlParserPort for SQL decomposition
 */

import { SelectQueryParser, SimpleSelectQuery } from 'rawsql-ts';
import { SqlParserPort } from '@core/usecases/sql-decomposer-usecase';
import { CTEEntity } from '@core/entities/cte';

export class SqlDecomposerParser implements SqlParserPort {
  /**
   * Parse SQL and extract CTEs as entities
   */
  async extractCTEs(sql: string): Promise<CTEEntity[]> {
    try {
      const query = SelectQueryParser.parse(sql);
      const simpleQuery = query.toSimpleQuery();
      const ctes: CTEEntity[] = [];

      if (simpleQuery.withClause?.tables) {
        for (const cte of simpleQuery.withClause.tables) {
          const cteName = cte.aliasExpression?.table?.name;
          if (!cteName) continue;

          // Extract CTE query
          const cteQuery = this.extractCTEQueryString(cte);
          
          // Extract dependencies from the CTE query
          const dependencies = await this.extractDependencies(cteQuery);
          
          // Extract column names if available
          const columns = cte.aliasExpression?.columns?.map(col => col.name) || [];

          const cteEntity = new CTEEntity(
            cteName,
            cteQuery,
            dependencies,
            columns.map(name => ({ name, type: 'unknown' }))
          );

          ctes.push(cteEntity);
        }
      }

      return ctes;
    } catch (error) {
      throw new Error(`CTE extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract main query without WITH clause as string
   */
  async extractMainQuery(sql: string): Promise<string> {
    try {
      const query = SelectQueryParser.parse(sql);
      const simpleQuery = query.toSimpleQuery();

      // Remove WITH clause and reconstruct query
      const queryWithoutWith = {
        ...simpleQuery,
        withClause: undefined
      };

      // Convert back to SQL string by reconstructing from original
      return this.reconstructMainQuery(sql, simpleQuery);
    } catch (error) {
      // Fallback: manual extraction
      return this.extractMainQueryManually(sql);
    }
  }

  /**
   * Extract dependencies (table/CTE references) from SQL query
   */
  async extractDependencies(sql: string): Promise<string[]> {
    const dependencies = new Set<string>();

    try {
      // Parse the SQL to get structured query
      const query = SelectQueryParser.parse(sql);
      const simpleQuery = query.toSimpleQuery();

      // Extract from FROM clause
      this.extractFromSource(simpleQuery.fromClause?.source, dependencies);

      // Extract from JOINs
      if (simpleQuery.fromClause?.joins) {
        for (const join of simpleQuery.fromClause.joins) {
          this.extractFromSource(join.source, dependencies);
        }
      }

      // Extract from subqueries in SELECT, WHERE, etc.
      // This is simplified - a complete implementation would traverse the entire AST
      
    } catch (error) {
      // Fallback to regex-based extraction
      const matches = sql.match(/\b(?:FROM|JOIN)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi) || [];
      matches.forEach(match => {
        const tableName = match.replace(/^(?:FROM|JOIN)\s+/i, '').trim();
        if (tableName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
          dependencies.add(tableName);
        }
      });
    }

    return Array.from(dependencies);
  }

  /**
   * Extract CTE query as string from rawsql-ts CTE object
   */
  private extractCTEQueryString(cte: any): string {
    try {
      // If the CTE has a toSqlString method
      if (cte.query && typeof cte.query.toSqlString === 'function') {
        return cte.query.toSqlString();
      }

      // Try to reconstruct from the query object
      if (cte.query) {
        // This is a simplified version - actual implementation would need
        // to properly reconstruct the SQL from the AST
        return this.reconstructQueryFromAST(cte.query);
      }

      return '';
    } catch (error) {
      console.warn('Failed to extract CTE query string:', error);
      return '';
    }
  }

  /**
   * Reconstruct main query by removing WITH clause
   */
  private reconstructMainQuery(originalSql: string, simpleQuery: SimpleSelectQuery): string {
    // If no WITH clause, return as-is
    if (!simpleQuery.withClause) {
      return originalSql;
    }

    // Find the end of WITH clause in original SQL
    // This is a simplified approach - a robust implementation would use proper parsing
    const withMatch = originalSql.match(/^WITH\s+(?:RECURSIVE\s+)?/i);
    if (!withMatch) {
      return originalSql;
    }

    // Find the main SELECT/INSERT/UPDATE/DELETE after WITH clause
    const mainQueryMatch = originalSql.match(/\)\s*(SELECT|INSERT|UPDATE|DELETE)/is);
    if (mainQueryMatch && mainQueryMatch.index !== undefined) {
      const mainQueryStart = mainQueryMatch.index + mainQueryMatch[0].indexOf(mainQueryMatch[1]);
      return originalSql.substring(mainQueryStart).trim();
    }

    return originalSql;
  }

  /**
   * Manual extraction of main query (fallback method)
   */
  private extractMainQueryManually(sql: string): string {
    // Remove leading/trailing whitespace
    sql = sql.trim();

    // Check if SQL starts with WITH
    if (!sql.match(/^WITH\s+/i)) {
      return sql;
    }

    // Find the last closing parenthesis of WITH clause
    let parenCount = 0;
    let inString = false;
    let stringChar = '';
    let lastCloseParen = -1;
    let foundWith = false;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const prevChar = i > 0 ? sql[i - 1] : '';

      // Handle string literals
      if ((char === "'" || char === '"') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }

      if (inString) continue;

      // Track parentheses
      if (char === '(') {
        parenCount++;
        foundWith = true;
      } else if (char === ')') {
        parenCount--;
        if (parenCount === 0 && foundWith) {
          lastCloseParen = i;
        }
      }
    }

    if (lastCloseParen !== -1) {
      // Find the main query after WITH clause
      const afterWith = sql.substring(lastCloseParen + 1).trim();
      // Remove any leading comma or whitespace
      return afterWith.replace(/^,?\s*/, '');
    }

    return sql;
  }

  /**
   * Extract table/CTE names from a source expression
   */
  private extractFromSource(source: any, dependencies: Set<string>): void {
    if (!source) return;

    // Handle direct table reference
    if (source.datasource?.table?.name) {
      dependencies.add(source.datasource.table.name);
    }

    // Handle subquery
    if (source.datasource?.query) {
      // Recursively process subquery
      // This is simplified - would need full traversal
    }
  }

  /**
   * Reconstruct SQL query from AST (simplified version)
   */
  private reconstructQueryFromAST(queryAST: any): string {
    // This is a placeholder - actual implementation would need
    // to traverse the AST and reconstruct the SQL
    try {
      if (typeof queryAST.toSqlString === 'function') {
        return queryAST.toSqlString();
      }
    } catch (error) {
      console.warn('Failed to reconstruct query from AST:', error);
    }
    
    return 'SELECT * FROM table_placeholder';
  }
}
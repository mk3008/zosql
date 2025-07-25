/**
 * SQL Decomposer Parser Adapter
 * Infrastructure Layer - Implements SqlParserPort for SQL decomposition
 */

import { SelectQueryParser, SimpleSelectQuery, SqlFormatter, CTEDependencyAnalyzer } from 'rawsql-ts';
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
        // Use new CTEDependencyAnalyzer from rawsql-ts
        const analyzer = new CTEDependencyAnalyzer();
        analyzer.analyzeDependencies(simpleQuery);

        for (const cte of simpleQuery.withClause.tables) {
          const cteName = cte.aliasExpression?.table?.name;
          if (!cteName) continue;

          // Extract CTE query
          const cteQuery = this.extractCTEQueryString(cte);
          
          // Use rawsql-ts analyzer for dependencies instead of our custom implementation
          const dependencies = analyzer.getDependencies(cteName) || [];
          
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

      // Convert back to SQL string by reconstructing from original
      return this.reconstructMainQuery(sql, simpleQuery);
    } catch (error) {
      // Fallback: manual extraction
      return this.extractMainQueryManually(sql);
    }
  }

  /**
   * Extract dependencies (table/CTE references) from SQL query
   * First tries rawsql-ts CTEDependencyAnalyzer, falls back to custom implementation for UNION queries
   */
  async extractDependencies(sql: string): Promise<string[]> {
    const dependencies = new Set<string>();


    try {
      // Parse the SQL to get structured query
      const query = SelectQueryParser.parse(sql);
      const simpleQuery = query.toSimpleQuery();
      
      
      // Try rawsql-ts CTEDependencyAnalyzer first
      try {
        const analyzer = new CTEDependencyAnalyzer();
        analyzer.analyzeDependencies(simpleQuery);
        const mainQueryDeps = analyzer.getMainQueryDependencies();
        
        // If rawsql-ts found dependencies, use them
        if (mainQueryDeps && mainQueryDeps.length > 0) {
          return mainQueryDeps;
        }
      } catch (analyzerError) {
        // Fall back to custom implementation if rawsql-ts fails
      }
      
      // Fallback to our custom implementation for UNION queries
      // Check if query has binary structure (left/right properties instead of constructor.name)
      const binaryQuery = query as any;
      if (binaryQuery.left !== undefined && binaryQuery.right !== undefined && binaryQuery.operator !== undefined) {
        // UNION/INTERSECT/EXCEPT query - process all parts using ORIGINAL query
        this.extractDependenciesFromBinaryQuery(query, dependencies);
      } else {
        // Simple query
        this.extractDependenciesFromSimpleQuery(simpleQuery, dependencies);
      }
      
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
   * Extract dependencies from BinarySelectQuery (UNION/INTERSECT/EXCEPT)
   */
  private extractDependenciesFromBinaryQuery(query: any, dependencies: Set<string>): void {
    // Process left side of the binary operation
    if (query.left) {
      // Check if left side is also a binary query (by structure, not constructor.name)
      if (query.left.left !== undefined && query.left.right !== undefined && query.left.operator !== undefined) {
        // Recursively handle nested binary queries
        this.extractDependenciesFromBinaryQuery(query.left, dependencies);
      } else {
        // Simple query on the left
        const leftSimple = query.left.toSimpleQuery();
        this.extractDependenciesFromSimpleQuery(leftSimple, dependencies);
      }
    }

    // Process right side of the binary operation
    if (query.right) {
      // Check if right side is also a binary query (by structure, not constructor.name)
      if (query.right.left !== undefined && query.right.right !== undefined && query.right.operator !== undefined) {
        // Recursively handle nested binary queries
        this.extractDependenciesFromBinaryQuery(query.right, dependencies);
      } else {
        // Simple query on the right
        const rightSimple = query.right.toSimpleQuery();
        this.extractDependenciesFromSimpleQuery(rightSimple, dependencies);
      }
    }
  }

  /**
   * Extract dependencies from SimpleSelectQuery
   */
  private extractDependenciesFromSimpleQuery(simpleQuery: any, dependencies: Set<string>): void {
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
  }

  /**
   * Extract CTE query as string from rawsql-ts CTE object
   */
  private extractCTEQueryString(cte: any): string {
    if (!cte.query) {
      throw new Error('CTE object does not have a query property');
    }
    
    try {
      // Create a formatter instance
      const formatter = new SqlFormatter();
      
      // The cte.query is a query object from rawsql-ts, format it
      const formatted = formatter.format(cte.query);
      return formatted.formattedSql;
    } catch (error) {
      console.error('Failed to format CTE query:', error);
      throw error;
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

}
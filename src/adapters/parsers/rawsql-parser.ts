import { SelectQueryParser, SqlFormatter } from 'rawsql-ts';
import { CommonTable } from 'rawsql-ts/dist/src/models/Clause';
import { SqlParser, ParsedQuery, FormatOptions } from '@core/ports/workspace';
import { CTE } from '@shared/types';
import { CTEEntity } from '@core/entities/cte';

export class RawSqlParser implements SqlParser {
  async parseQuery(sql: string): Promise<ParsedQuery> {
    try {
      const query = SelectQueryParser.parse(sql);
      const simpleQuery = query.toSimpleQuery();
      
      return {
        type: 'simple',
        withClause: simpleQuery.withClause ? { tables: [] } : undefined,
        ctes: []
      };
    } catch (error) {
      throw new Error(`SQL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractCTEs(sql: string): Promise<CTE[]> {
    try {
      const query = SelectQueryParser.parse(sql);
      const simpleQuery = query.toSimpleQuery();
      const ctes: CTE[] = [];

      if (simpleQuery.withClause && simpleQuery.withClause.tables) {
        for (const cte of simpleQuery.withClause.tables) {
          const cteName = cte.aliasExpression?.table?.name || 'unknown';
          
          // Extract CTE query
          const cteQuery = await this.extractCTEQuery(cte);
          
          // Extract dependencies
          const dependencies = await this.extractCTEDependencies(cte);

          const cteEntity = new CTEEntity(
            cteName,
            cteQuery,
            dependencies,
            [], // columns will be populated later
            `Extracted CTE: ${cteName}`
          );

          ctes.push(cteEntity);
        }
      }

      return ctes;
    } catch (error) {
      throw new Error(`CTE extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async formatQuery(sql: string, options: FormatOptions = {}): Promise<string> {
    try {
      // Parse SQL with SelectQueryParser
      const query = SelectQueryParser.parse(sql);
      
      // Convert FormatOptions to SqlFormatterOptions
      const formatterOptions = {
        indent: options.indentSize ? ' '.repeat(options.indentSize) : '  ',
        keywordCase: options.uppercase ? 'upper' as const : 'lower' as const,
        linesBetweenQueries: options.linesBetweenQueries || 1
      };
      
      // Format with SqlFormatter
      const formatter = new SqlFormatter(formatterOptions);
      const result = formatter.format(query);
      
      // Return only the formatted SQL string
      return result.formattedSql;
    } catch (error) {
      throw new Error(`SQL formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractCTEQuery(cte: CommonTable): Promise<string> {
    if (!cte || !cte.query) {
      return '';
    }

    try {
      // Try to convert CTE query to SQL string
      if (typeof cte.query.toSqlString === 'function') {
        return (cte.query as unknown as { toSqlString: () => string }).toSqlString();
      }
      
      // Fallback: return empty string if extraction fails
      return '';
    } catch (error) {
      console.warn(`Failed to extract CTE query: ${error}`);
      return `-- CTE extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async extractCTEDependencies(cte: CommonTable): Promise<string[]> {
    const dependencies: string[] = [];
    
    if (!cte || !cte.query) {
      return dependencies;
    }

    try {
      // Convert to SQL string and extract table references
      const sql = await this.extractCTEQuery(cte);
      
      if (sql) {
        // Simple regex to find table references in FROM and JOIN clauses
        const matches = sql.match(/\b(?:FROM|JOIN)\s+([a-zA-Z][a-zA-Z0-9_]*)/gi);
        if (matches) {
          matches.forEach(match => {
            const tableName = match.replace(/^(?:FROM|JOIN)\s+/i, '').trim();
            if (tableName && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(tableName)) {
              dependencies.push(tableName);
            }
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to extract CTE dependencies: ${error}`);
    }

    // Remove duplicates
    return [...new Set(dependencies)];
  }
}
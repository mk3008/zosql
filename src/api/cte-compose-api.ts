import { Request, Response } from 'express';
import { SelectQueryParser, WithClauseParser } from 'rawsql-ts';
import { Logger } from '../utils/logging.js';
import { CteComposer } from '../utils/cte-composer.js';

export class CteComposeApi {
  private logger: Logger;
  private cteComposer: CteComposer;

  constructor() {
    this.logger = Logger.getInstance();
    this.cteComposer = new CteComposer();
  }

  /**
   * Compose CTE with main query
   */
  public async handleComposeCte(req: Request, res: Response): Promise<void> {
    try {
      const { mainQuery, cteDefinitions } = req.body;

      if (!mainQuery || typeof mainQuery !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Main query is required'
        });
        return;
      }

      this.logger.query(`CTE Compose: Main query: ${mainQuery.substring(0, 100)}...`);
      this.logger.query(`CTE Compose: CTE definitions: ${cteDefinitions?.substring(0, 100) || 'none'}...`);

      // Validate main query with rawsql-ts parser
      try {
        SelectQueryParser.parse(mainQuery);
      } catch (parseError) {
        this.logger.error(`CTE Compose: Failed to parse main query - ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        res.status(400).json({
          success: false,
          error: `Invalid SQL query: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
        });
        return;
      }

      // Parse and validate CTE definitions if provided
      let processedCteDefinitions = cteDefinitions || '';
      let parsedWithClause: any = null;
      let parseMethod = 'none';
      
      if (cteDefinitions && cteDefinitions.trim() !== '') {
        try {
          const result = this.getWithClauseFromInput(cteDefinitions);
          parsedWithClause = result.withClause;
          parseMethod = result.method;
          processedCteDefinitions = cteDefinitions;
          this.logger.query(`CTE Compose: CTE definitions parsed successfully with ${parseMethod}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`CTE Compose: Failed to parse CTE definitions - ${errorMessage}`);
          res.status(400).json({
            success: false,
            error: `Invalid CTE definitions: ${errorMessage}`
          });
          return;
        }
      }

      // Use CteComposer for composition logic
      let composedQuery = this.cteComposer.compose(mainQuery, processedCteDefinitions);
      const cteCount = this.cteComposer.countCtes(processedCteDefinitions);

      // Format the composed query
      try {
        const { SqlFormatter } = await import('rawsql-ts');
        const formatter = new SqlFormatter({
          withClauseStyle: 'full-oneline'
        });
        const parsedComposedQuery = SelectQueryParser.parse(composedQuery);
        const formatResult = formatter.format(parsedComposedQuery);
        composedQuery = typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
      } catch (e) {
        this.logger.error(`CTE Compose: Failed to format composed query - ${e instanceof Error ? e.message : String(e)}`);
        // Use unformatted version if formatting fails
      }

      this.logger.query(`CTE Compose: Composed query with ${cteCount} CTEs`);
      this.logger.query(`CTE Compose: Result: ${composedQuery.substring(0, 200)}...`);

      res.json({
        success: true,
        composedQuery: composedQuery,
        cteCount: cteCount,
        processedCteDefinitions: processedCteDefinitions,
        parsedWithClause: parsedWithClause,
        parseMethod: parseMethod
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`CTE Compose API: Unexpected error - ${errorMessage}`);
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Get WITH clause from input using multiple fallback strategies
   * @param input - Can be pure WITH clause or complete SELECT query with WITH
   * @returns WithClause object and parsing method used
   * @throws Error if parsing fails with all strategies
   */
  private getWithClauseFromInput(input: string): { withClause: any; method: string } {
    // Strategy 1: Try WithClauseParser (for pure WITH clauses)
    try {
      const withClause = WithClauseParser.parse(input);
      this.logger.query('WithClause extraction: Success with WithClauseParser');
      return { withClause, method: 'WithClauseParser' };
    } catch (withClauseError) {
      this.logger.query(`WithClause extraction: WithClauseParser failed - ${withClauseError instanceof Error ? withClauseError.message : String(withClauseError)}`);
    }

    // Strategy 2: Try SelectQueryParser (for full SELECT queries with WITH)
    try {
      const fullQuery = SelectQueryParser.parse(input).toSimpleQuery();
      if (fullQuery.withClause) {
        this.logger.query('WithClause extraction: Success with SelectQueryParser');
        return { withClause: fullQuery.withClause, method: 'SelectQueryParser' };
      } else {
        throw new Error('No WITH clause found in SELECT query');
      }
    } catch (selectQueryError) {
      this.logger.query(`WithClause extraction: SelectQueryParser failed - ${selectQueryError instanceof Error ? selectQueryError.message : String(selectQueryError)}`);
    }

    // Both strategies failed
    throw new Error('Unable to parse CTE definitions. Input must be either a WITH clause or a SELECT query with WITH clause.');
  }
}
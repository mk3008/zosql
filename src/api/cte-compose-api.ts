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

      // Validate CTE definitions if provided
      if (cteDefinitions && cteDefinitions.trim() !== '') {
        try {
          WithClauseParser.parse(cteDefinitions);
        } catch (parseError) {
          this.logger.error(`CTE Compose: Failed to parse CTE definitions - ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          res.status(400).json({
            success: false,
            error: `Invalid CTE definitions: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
          });
          return;
        }
      }

      // Use CteComposer for composition logic
      let composedQuery = this.cteComposer.compose(mainQuery, cteDefinitions || '');
      const cteCount = this.cteComposer.countCtes(cteDefinitions || '');

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
        cteCount: cteCount
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
}
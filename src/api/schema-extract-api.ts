import { Request, Response } from 'express';
import { SelectQueryParser, SchemaCollector } from 'rawsql-ts';
import { Logger } from '../utils/logging.js';

export class SchemaExtractApi {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Extract schema information from SQL query
   */
  public async handleExtractSchema(req: Request, res: Response): Promise<void> {
    try {
      const { sql } = req.body;

      if (!sql || typeof sql !== 'string') {
        res.status(400).json({
          success: false,
          error: 'SQL query is required'
        });
        return;
      }

      this.logger.query(`Schema Extract: Analyzing SQL (${sql.length} chars)`);

      // Parse SQL and extract schema
      const query = SelectQueryParser.parse(sql).toSimpleQuery();
      const collector = new SchemaCollector();
      const schemas = collector.collect(query);

      // Convert to simple object format
      const tables = schemas.map(schema => ({
        name: schema.name,
        columns: schema.columns || []
      }));

      this.logger.query(`Schema Extract: Found ${tables.length} tables: ${tables.map(t => t.name).join(', ')}`);

      res.json({
        success: true,
        tables: tables,
        tableCount: tables.length
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Schema Extract API: Failed to extract schema - ${errorMessage}`);
      res.status(500).json({
        success: false,
        error: errorMessage
      });
    }
  }
}
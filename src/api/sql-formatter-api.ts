import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Logger } from '../utils/logging.js';
import { SelectQueryParser, SqlFormatter } from 'rawsql-ts';

// Use any for now to avoid type compatibility issues
type FormatterConfig = any;

export class SqlFormatterApi {
  private logger: Logger;
  private formatterConfigPath: string;

  constructor() {
    this.logger = Logger.getInstance();
    this.formatterConfigPath = path.join(process.cwd(), 'zosql.formatter.json');
  }

  private loadFormatterConfig(): FormatterConfig {
    try {
      if (fs.existsSync(this.formatterConfigPath)) {
        const configContent = fs.readFileSync(this.formatterConfigPath, 'utf8');
        const config = JSON.parse(configContent);
        this.logger.log('[SQL-FORMATTER] Custom formatter config loaded');
        return config;
      } else {
        this.logger.log('[SQL-FORMATTER] Using default formatter config');
        return this.getDefaultConfig();
      }
    } catch (error) {
      this.logger.log(`[SQL-FORMATTER] Error loading config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): FormatterConfig {
    return {
      identifierEscape: {
        start: "",
        end: ""
      },
      parameterSymbol: ":",
      parameterStyle: "named",
      indentSize: 4,
      indentChar: " ",
      newline: "\n",
      keywordCase: "lower",
      commaBreak: "before",
      andBreak: "before",
      withClauseStyle: "full-oneline",
      preserveComments: true
    };
  }

  public async handleFormatSql(req: Request, res: Response): Promise<void> {
    try {
      const { sql } = req.body;
      
      if (!sql) {
        res.status(400).json({ success: false, error: 'SQL is required' });
        return;
      }
      
      this.logger.log(`[SQL-FORMATTER] Formatting SQL (length: ${sql.length})`);
      
      try {
        // Parse the SQL
        const query = SelectQueryParser.parse(sql);
        
        // Load formatter configuration
        const config = this.loadFormatterConfig();
        
        // Create formatter with config
        const formatter = new SqlFormatter(config);
        
        // Format the query
        const formattedSql = formatter.format(query);
        
        this.logger.log('[SQL-FORMATTER] SQL formatted successfully');
        
        res.json({
          success: true,
          formattedSql,
          originalSql: sql
        });
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'SQL parsing failed';
        this.logger.log(`[SQL-FORMATTER] SQL parsing failed: ${errorMessage}`);
        
        res.json({
          success: false,
          error: errorMessage,
          originalSql: sql
        });
      }
    } catch (error) {
      this.logger.log(`[SQL-FORMATTER] API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleGetFormatterConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = this.loadFormatterConfig();
      res.json({
        success: true,
        config
      });
    } catch (error) {
      this.logger.log(`[SQL-FORMATTER] Error getting config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleUpdateFormatterConfig(req: Request, res: Response): Promise<void> {
    try {
      const { config } = req.body;
      
      if (!config) {
        res.status(400).json({ success: false, error: 'Config is required' });
        return;
      }
      
      // Merge with default config to ensure all required fields
      const defaultConfig = this.getDefaultConfig();
      const mergedConfig = { ...defaultConfig, ...config };
      
      // Save to file
      fs.writeFileSync(this.formatterConfigPath, JSON.stringify(mergedConfig, null, 2), 'utf8');
      
      this.logger.log('[SQL-FORMATTER] Formatter config updated successfully');
      
      res.json({
        success: true,
        message: 'Formatter config updated successfully',
        config: mergedConfig
      });
    } catch (error) {
      this.logger.log(`[SQL-FORMATTER] Error updating config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
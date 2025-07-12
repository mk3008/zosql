import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Logger } from '../utils/logging.js';

export class SchemaApi {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  public async handleGetSchema(_req: Request, res: Response): Promise<void> {
    try {
      const schemaPath = path.join(process.cwd(), 'zosql.schema.js');
      
      if (fs.existsSync(schemaPath)) {
        // Use dynamic import for ES modules
        const schemaModule = await import(schemaPath);
        this.logger.log(`[SCHEMA] Raw import result: ${JSON.stringify(Object.keys(schemaModule))}`);
        this.logger.log(`[SCHEMA] Module content: ${JSON.stringify(schemaModule, null, 2)}`);
        
        const schema = schemaModule.default || schemaModule;
        this.logger.log(`[SCHEMA] Final schema structure: ${JSON.stringify(Object.keys(schema))}`);
        this.logger.log(`[SCHEMA] Schema loaded successfully: ${schema.tables?.length || 0} tables`);
        res.json({ success: true, schema });
      } else {
        this.logger.log(`[SCHEMA] Schema file not found at: ${schemaPath}`);
        res.json({ success: false, error: 'Schema file not found' });
      }
    } catch (error) {
      this.logger.log(`[SCHEMA] Error loading schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleGetSchemaCompletion(_req: Request, res: Response): Promise<void> {
    try {
      const schemaPath = path.join(process.cwd(), 'zosql.schema.js');
      
      if (fs.existsSync(schemaPath)) {
        // Use dynamic import for ES modules
        const schemaModule = await import(schemaPath);
        const schema = schemaModule.default || schemaModule;
        
        // Format for IntelliSense completion
        const tables = schema.tables.map((t: any) => t.name);
        const columns: Record<string, string[]> = {};
        
        schema.tables.forEach((table: any) => {
          columns[table.name] = table.columns.map((col: any) => col.name);
        });
        
        this.logger.log(`[SCHEMA-COMPLETION] Provided ${tables.length} tables for IntelliSense`);
        // SQL keywords for IntelliSense
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL',
          'ON', 'AS', 'GROUP', 'BY', 'ORDER', 'HAVING', 'UNION', 'WITH',
          'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE',
          'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'EXISTS', 'BETWEEN',
          'LIKE', 'LIMIT', 'OFFSET', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
        ];

        res.json({
          success: true,
          tables,
          columns,
          functions: schema.functions || [],
          keywords
        });
      } else {
        this.logger.log(`[SCHEMA-COMPLETION] Schema file not found`);
        res.json({ success: false, error: 'Schema file not found' });
      }
    } catch (error) {
      this.logger.log(`[SCHEMA-COMPLETION] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
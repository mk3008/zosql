import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { Logger } from '../utils/logging.js';

interface ColumnInfo {
  name: string;
  [key: string]: unknown;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  [key: string]: unknown;
}

interface SchemaInfo {
  tables: TableInfo[];
  [key: string]: unknown;
}

interface CteInfo {
  name: string;
  description: string;
  columns?: string[];
}

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
        
        const schema = (schemaModule.default || schemaModule) as SchemaInfo;
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
        const schema = (schemaModule.default || schemaModule) as SchemaInfo;
        
        // Validate schema structure
        if (!schema.tables || !Array.isArray(schema.tables)) {
          throw new Error('Invalid schema structure: tables must be an array');
        }
        
        // Format for IntelliSense completion
        const tables = schema.tables.map((t: TableInfo) => t.name);
        const columns: Record<string, string[]> = {};
        
        schema.tables.forEach((table: TableInfo) => {
          if (Array.isArray(table.columns)) {
            columns[table.name] = table.columns.map((col: ColumnInfo) => col.name);
          }
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

        // Include Private CTEs from workspace if available
        let privateCtes: CteInfo[] = [];
        const privateCteColumns: Record<string, string[]> = {};
        
        try {
          const workspaceBasePath = path.join(process.cwd(), 'zosql', 'workspace');
          const privateCteDir = path.join(workspaceBasePath, 'private-cte');
          
          if (fs.existsSync(privateCteDir)) {
            const files = await fsPromises.readdir(privateCteDir);
            const cteNames = files
              .filter(file => file.endsWith('.sql'))
              .map(file => path.basename(file, '.sql'));
            
            privateCtes = cteNames.map(name => ({
              name,
              description: `Private CTE: ${name}`,
              columns: []
            }));
            
            this.logger.log(`[SCHEMA-COMPLETION] Found ${privateCtes.length} private CTEs for IntelliSense`);
            
            // For now, we can't easily determine columns without parsing the SQL
            // This could be enhanced later by using rawsql-ts to parse each CTE
            privateCtes.forEach(cte => {
              privateCteColumns[cte.name] = cte.columns || []; // Empty for now
            });
          }
        } catch (error) {
          this.logger.log(`[SCHEMA-COMPLETION] Error loading private CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        res.json({
          success: true,
          tables: [...tables, ...privateCtes], // Include Private CTEs as tables
          columns: { ...columns, ...privateCteColumns },
          functions: schema.functions || [],
          keywords,
          privateCtes // Also provide as separate property
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
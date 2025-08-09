import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { Logger } from '../utils/logging.js';
import * as Result from '../lib/functional/result.js';
import { pipe } from '../lib/functional/index.js';

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

// ===== NEW FUNCTIONAL VERSIONS - BACKWARD COMPATIBLE =====

/**
 * Functional version: Load schema from file
 * Returns Result type for explicit error handling
 */
export const loadSchemaFunc = async (schemaPath: string): Promise<Result.Result<SchemaInfo, Error>> => {
  return Result.asyncTryCatch(async () => {
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found');
    }
    
    const schemaModule = await import(schemaPath);
    const schema = (schemaModule.default || schemaModule) as SchemaInfo;
    
    if (!schema.tables || !Array.isArray(schema.tables)) {
      throw new Error('Invalid schema structure: tables must be an array');
    }
    
    return schema;
  });
};

/**
 * Functional version: Transform tables to completion format
 * Pure function for data transformation
 */
export const transformTablesToCompletionFunc = (tables: TableInfo[]): string[] => {
  return pipe(
    tables,
    (tables: TableInfo[]) => tables.map((t: TableInfo) => t.name),
    (names: string[]) => names.filter(name => Boolean(name))
  );
};

/**
 * Functional version: Transform tables to columns mapping
 * Pure function for extracting column information
 */
export const transformTablesToColumnsFunc = (tables: TableInfo[]): Record<string, string[]> => {
  return tables.reduce((acc: Record<string, string[]>, table: TableInfo) => {
    if (Array.isArray(table.columns)) {
      acc[table.name] = table.columns
        .map((col: ColumnInfo) => col.name)
        .filter(name => Boolean(name));
    }
    return acc;
  }, {});
};

/**
 * Functional version: Load private CTEs from directory
 * Returns Result with CTE information or error
 */
export const loadPrivateCTEsFunc = async (privateCteDir: string): Promise<Result.Result<CteInfo[], Error>> => {
  return Result.asyncTryCatch(async () => {
    if (!fs.existsSync(privateCteDir)) {
      return [];
    }
    
    const files = await fsPromises.readdir(privateCteDir);
    
    return pipe(
      files,
      (files: string[]) => files.filter(file => file.endsWith('.sql')),
      (sqlFiles: string[]) => sqlFiles.map(file => path.basename(file, '.sql')),
      (cteNames: string[]) => cteNames.map(name => ({
        name,
        description: `Private CTE: ${name}`,
        columns: [] as string[]
      }))
    );
  });
};

/**
 * Functional version: Transform CTEs to columns mapping
 * Pure function for CTE column transformation
 */
export const transformCTEsToColumnsFunc = (ctes: CteInfo[]): Record<string, string[]> => {
  return ctes.reduce((acc: Record<string, string[]>, cte: CteInfo) => {
    acc[cte.name] = cte.columns || [];
    return acc;
  }, {});
};

/**
 * Functional version: Get SQL keywords
 * Pure function returning standard SQL keywords
 */
export const getSQLKeywordsFunc = (): string[] => {
  return [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL',
    'ON', 'AS', 'GROUP', 'BY', 'ORDER', 'HAVING', 'UNION', 'WITH',
    'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE',
    'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'EXISTS', 'BETWEEN',
    'LIKE', 'LIMIT', 'OFFSET', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
  ];
};

/**
 * Functional version: Merge schema and CTE data
 * Pure function for combining different data sources
 */
export const mergeSchemaAndCTEsFunc = (
  schema: SchemaInfo,
  privateCtes: CteInfo[]
): {
  tables: string[];
  columns: Record<string, string[]>;
  functions: unknown[];
  keywords: string[];
  privateCtes: CteInfo[];
} => {
  const schemaTables = transformTablesToCompletionFunc(schema.tables);
  const schemaColumns = transformTablesToColumnsFunc(schema.tables);
  const cteColumns = transformCTEsToColumnsFunc(privateCtes);
  const keywords = getSQLKeywordsFunc();
  
  return {
    tables: [...schemaTables, ...privateCtes.map(cte => cte.name)],
    columns: { ...schemaColumns, ...cteColumns },
    functions: (schema.functions as unknown[]) || [],
    keywords,
    privateCtes
  };
};

/**
 * Functional version: Get schema completion data
 * Functional pipeline for data transformation
 */
export const getSchemaCompletionFunc = async (
  schemaPath: string,
  workspaceBasePath: string
): Promise<Result.Result<{
  tables: string[];
  columns: Record<string, string[]>;
  functions: unknown[];
  keywords: string[];
  privateCtes: CteInfo[];
}, Error>> => {
  // Load schema
  const schemaResult = await loadSchemaFunc(schemaPath);
  if (Result.isErr(schemaResult)) {
    return schemaResult;
  }
  
  const schema = schemaResult.value;
  
  // Load private CTEs
  const privateCteDir = path.join(workspaceBasePath, 'private-cte');
  const ctesResult = await loadPrivateCTEsFunc(privateCteDir);
  const privateCtes = Result.isOk(ctesResult) ? ctesResult.value : [];
  
  // Merge data using functional transformation
  const completionData = mergeSchemaAndCTEsFunc(schema, privateCtes);
  
  return Result.ok(completionData);
};

/**
 * Functional version: Filter and transform tables
 * Higher-order function for table filtering and transformation
 */
export const filterAndTransformTablesFunc = <T>(
  predicate: (table: TableInfo) => boolean,
  transformer: (table: TableInfo) => T
) => (tables: TableInfo[]): T[] => {
  return pipe(
    tables,
    (tables: TableInfo[]) => tables.filter(predicate),
    (filtered: TableInfo[]) => filtered.map(transformer)
  );
};

/**
 * Functional version: Group columns by data type
 * Pure function for column analysis
 */
export const groupColumnsByTypeFunc = (tables: TableInfo[]): Record<string, ColumnInfo[]> => {
  return tables.reduce((acc: Record<string, ColumnInfo[]>, table) => {
    if (Array.isArray(table.columns)) {
      table.columns.forEach((col: ColumnInfo) => {
        const type = (col.type as string) || 'unknown';
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push({ ...col, table: table.name });
      });
    }
    return acc;
  }, {});
};

/**
 * Functional version: Calculate schema statistics
 * Pure function for schema analysis
 */
export const calculateSchemaStatsFunc = (schema: SchemaInfo): {
  tableCount: number;
  totalColumns: number;
  averageColumnsPerTable: number;
  columnsByType: Record<string, number>;
} => {
  const tables = schema.tables || [];
  const tableCount = tables.length;
  
  const totalColumns = tables.reduce((sum, table) => {
    return sum + (Array.isArray(table.columns) ? table.columns.length : 0);
  }, 0);
  
  const averageColumnsPerTable = tableCount > 0 ? totalColumns / tableCount : 0;
  
  const columnsByType = tables.reduce((acc: Record<string, number>, table) => {
    if (Array.isArray(table.columns)) {
      table.columns.forEach((col: ColumnInfo) => {
        const type = (col.type as string) || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
      });
    }
    return acc;
  }, {});
  
  return {
    tableCount,
    totalColumns,
    averageColumnsPerTable,
    columnsByType
  };
};

/**
 * Functional version: Validate schema structure
 * Returns validation result with specific error messages
 */
export const validateSchemaStructureFunc = (schema: unknown): Result.Result<SchemaInfo, string[]> => {
  const errors: string[] = [];
  
  if (!schema || typeof schema !== 'object') {
    errors.push('Schema must be an object');
    return Result.err(errors);
  }
  
  const schemaObj = schema as Record<string, unknown>;
  
  if (!schemaObj.tables || !Array.isArray(schemaObj.tables)) {
    errors.push('Schema must have a tables array');
  } else {
    const tables = schemaObj.tables as unknown[];
    tables.forEach((table, index) => {
      if (!table || typeof table !== 'object') {
        errors.push(`Table ${index} must be an object`);
      } else {
        const tableObj = table as Record<string, unknown>;
        if (!tableObj.name || typeof tableObj.name !== 'string') {
          errors.push(`Table ${index} must have a string name property`);
        }
        if (tableObj.columns && !Array.isArray(tableObj.columns)) {
          errors.push(`Table ${index} columns must be an array if provided`);
        }
      }
    });
  }
  
  return errors.length === 0 
    ? Result.ok(schema as SchemaInfo)
    : Result.err(errors);
};
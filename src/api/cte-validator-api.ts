import { Request, Response } from 'express';
import { Logger } from '../utils/logging.js';
import { SqlSchemaValidator, TableSchema } from 'rawsql-ts';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface CteValidationResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message?: string;
  dependencies: string[];
  missingTables?: string[];
  missingColumns?: string[];
}

export interface CteValidationResponse {
  rootQuery?: CteValidationResult;
  privateCtes: CteValidationResult[];
  sharedCtes: CteValidationResult[];
}

export class CteValidatorApi {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Validate all Private and Shared CTEs against the current schema
   */
  public async handleValidateCtes(_req: Request, res: Response): Promise<void> {
    try {
      // Load schema
      const schemaPath = path.join(process.cwd(), 'zosql.schema.js');
      const { default: schema } = await import(schemaPath);
      
      // Create table schemas for validation
      const tableSchemas: TableSchema[] = [];
      
      // Register tables from schema
      for (const table of schema.tables) {
        const columns = table.columns.map((col: any) => col.name);
        tableSchemas.push(new TableSchema(table.name, columns));
      }
      
      // Register all CTEs as tables for validation
      await this.addCtesToTableSchemas(tableSchemas);
      
      // Validate Root Query if exists
      const rootQueryResult = await this.validateRootQuery(tableSchemas);
      
      // Validate Private CTEs
      const privateCteResults = await this.validatePrivateCtes(tableSchemas);
      
      // Validate Shared CTEs
      const sharedCteResults = await this.validateSharedCtes(tableSchemas);
      
      const response: CteValidationResponse = {
        rootQuery: rootQueryResult,
        privateCtes: privateCteResults,
        sharedCtes: sharedCteResults
      };
      
      res.json({
        success: true,
        validations: response
      });
      
    } catch (error) {
      this.logger.error(`CTE validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'CTE validation failed'
      });
    }
  }
  
  private async validatePrivateCtes(tableSchemas: TableSchema[]): Promise<CteValidationResult[]> {
    const results: CteValidationResult[] = [];
    
    try {
      const workspaceBasePath = path.join(process.cwd(), 'zosql', 'workspace');
      const privateCteDir = path.join(workspaceBasePath, 'private-cte');
      
      // Check if private CTE directory exists
      try {
        await fs.access(privateCteDir);
      } catch {
        return [];
      }
      
      const files = await fs.readdir(privateCteDir);
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const cteName = file.replace('.sql', '');
          const filePath = path.join(privateCteDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          const dependencies = this.extractDependencies(content);
          const validation = this.validateSqlWithRawsqlTs(content, tableSchemas);
          
          results.push({
            name: cteName,
            status: validation.isValid ? 'success' : 'error',
            message: validation.isValid ? undefined : validation.errors.join('; '),
            dependencies,
            missingTables: validation.missingTables.length > 0 ? validation.missingTables : undefined,
            missingColumns: validation.missingColumns.length > 0 ? validation.missingColumns : undefined
          });
        }
      }
      
    } catch (error) {
      this.logger.error(`Error validating private CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return results;
  }
  
  private async validateSharedCtes(tableSchemas: TableSchema[]): Promise<CteValidationResult[]> {
    const results: CteValidationResult[] = [];
    
    try {
      const cacheDir = path.join(process.cwd(), 'zosql', 'resources', 'cache');
      const cacheFile = path.join(cacheDir, 'shared-cte.json');
      
      // Check if cache file exists
      try {
        await fs.access(cacheFile);
      } catch {
        return [];
      }
      
      const cacheContent = await fs.readFile(cacheFile, 'utf8');
      const sharedCtes = JSON.parse(cacheContent);
      
      for (const [cteName, cteData] of Object.entries(sharedCtes)) {
        try {
          const query = (cteData as any).query;
          const validation = this.validateSqlWithRawsqlTs(query, tableSchemas);
          
          results.push({
            name: cteName,
            status: validation.isValid ? 'success' : 'error',
            message: validation.isValid ? undefined : validation.errors.join('; '),
            dependencies: []
          });
        } catch (error) {
          results.push({
            name: cteName,
            status: 'error',
            message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            dependencies: []
          });
        }
      }
      
    } catch (error) {
      this.logger.error(`Error validating shared CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return results;
  }
  
  private extractDependencies(content: string): string[] {
    const depMatch = content.match(/\/\*\s*dependencies:\s*(\[.*?\])\s*\*\//);
    if (depMatch) {
      try {
        return JSON.parse(depMatch[1]);
      } catch {
        return [];
      }
    }
    return [];
  }
  
  private async validateRootQuery(tableSchemas: TableSchema[]): Promise<CteValidationResult | undefined> {
    try {
      const workspaceBasePath = path.join(process.cwd(), 'zosql', 'workspace');
      const rootQueryPath = path.join(workspaceBasePath, 'root-query.sql');
      
      // Check if root query exists
      try {
        await fs.access(rootQueryPath);
      } catch {
        return undefined;
      }
      
      const rootQuery = await fs.readFile(rootQueryPath, 'utf8');
      const validation = this.validateSqlWithRawsqlTs(rootQuery, tableSchemas);
      
      return {
        name: 'root-query',
        status: validation.isValid ? 'success' : 'error',
        message: validation.isValid ? undefined : validation.errors.join('; '),
        dependencies: this.extractReferencedCtes(rootQuery),
        missingTables: validation.missingTables.length > 0 ? validation.missingTables : undefined,
        missingColumns: validation.missingColumns.length > 0 ? validation.missingColumns : undefined
      };
    } catch (error) {
      this.logger.error(`Error validating root query: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
  }
  
  private extractReferencedCtes(query: string): string[] {
    // Simple regex to find table references in FROM and JOIN clauses
    const tablePattern = /(?:from|join)\s+(\w+)/gi;
    const matches = [...query.matchAll(tablePattern)];
    return [...new Set(matches.map(m => m[1]))];
  }
  
  private async addCtesToTableSchemas(tableSchemas: TableSchema[]): Promise<void> {
    // Register Private CTEs
    try {
      const workspaceBasePath = path.join(process.cwd(), 'zosql', 'workspace');
      const privateCteDir = path.join(workspaceBasePath, 'private-cte');
      
      if (await fs.access(privateCteDir).then(() => true).catch(() => false)) {
        const files = await fs.readdir(privateCteDir);
        
        for (const file of files) {
          if (file.endsWith('.sql')) {
            const cteName = file.replace('.sql', '');
            // Register as a table with basic structure for validation
            tableSchemas.push(new TableSchema(cteName, ['dummy_column']));
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error registering private CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Register Shared CTEs
    try {
      const cacheDir = path.join(process.cwd(), 'zosql', 'resources', 'cache');
      const cacheFile = path.join(cacheDir, 'shared-cte.json');
      
      if (await fs.access(cacheFile).then(() => true).catch(() => false)) {
        const cacheContent = await fs.readFile(cacheFile, 'utf8');
        const sharedCtes = JSON.parse(cacheContent);
        
        for (const cteName of Object.keys(sharedCtes)) {
          tableSchemas.push(new TableSchema(cteName, ['dummy_column']));
        }
      }
    } catch (error) {
      this.logger.error(`Error registering shared CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private validateSqlWithRawsqlTs(content: string, tableSchemas: TableSchema[]): {
    isValid: boolean;
    errors: string[];
    missingTables: string[];
    missingColumns: string[];
  } {
    const errors: string[] = [];
    const missingTables: string[] = [];
    const missingColumns: string[] = [];
    
    try {
      // Use SqlSchemaValidator to validate
      SqlSchemaValidator.validate(content, tableSchemas);
      
      // If no exception is thrown, validation passed
      return {
        isValid: true,
        errors: [],
        missingTables: [],
        missingColumns: []
      };
      
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : 'Unknown validation error';
      
      // Parse error message to categorize errors
      const errorLines = errorMessage.split('\n');
      for (const line of errorLines) {
        errors.push(line);
        
        if (line.includes('is not defined')) {
          const tableMatch = line.match(/Table '([^']+)' is not defined/);
          if (tableMatch) missingTables.push(tableMatch[1]);
        } else if (line.includes('undefined columns')) {
          const columnMatch = line.match(/Table '([^']+)' contains undefined columns: (.+)\./);
          if (columnMatch) {
            const table = columnMatch[1];
            const columns = columnMatch[2].split(', ');
            columns.forEach(col => missingColumns.push(`${table}.${col}`));
          }
        }
      }
      
      return {
        isValid: false,
        errors,
        missingTables,
        missingColumns
      };
    }
  }
}
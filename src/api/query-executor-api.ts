import { Request, Response } from 'express';
import { Logger } from '../utils/logging.js';
import { FileBasedSharedCteApi } from './file-based-shared-cte-api.js';
import { SelectQueryParser, QueryFlowDiagramGenerator } from 'rawsql-ts';

export interface QueryResult {
  rows: any[];
  fields: Array<{ name: string; dataTypeID: number }>;
  error?: string;
  executionTime?: number;
}

export class QueryExecutorApi {
  private logger: Logger;
  private db: any; // PGlite instance
  private sharedCteApi: FileBasedSharedCteApi;

  constructor() {
    this.logger = Logger.getInstance();
    this.sharedCteApi = new FileBasedSharedCteApi();
  }

  public async initializeDatabase(): Promise<void> {
    try {
      // Dynamic import of PGlite
      const { PGlite } = await import('@electric-sql/pglite');
      
      // Initialize PGlite with in-memory database
      this.db = new PGlite();
      this.logger.query('PGlite database initialized (engine only - no schema creation)');
    } catch (error) {
      this.logger.error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }



  /**
   * Parse SQL and detect CTE usage, then compose WITH clause with Private CTEs + Shared CTEs
   */
  private async composeSqlWithSharedCtes(originalSql: string): Promise<string> {
    try {
      this.logger.query(`Composing SQL with Private CTEs + Shared CTEs`);
      this.logger.query(`Original SQL: ${originalSql}`);

      // Parse the SQL to detect table references
      const query = SelectQueryParser.parse(originalSql).toSimpleQuery();
      const usedPrivateCtes: string[] = [];
      const usedSharedCtes: string[] = [];
      
      // Get Private CTEs from workspace (priority 1)
      const privateCtes = await this.getPrivateCtes();
      const privateCteNames = Object.keys(privateCtes);
      
      // Get all shared CTEs (priority 2)
      const allSharedCtes = this.sharedCteApi.getAllSharedCtes();
      const sharedCteNames = Object.keys(allSharedCtes);
      
      this.logger.query(`Available Private CTEs: ${privateCteNames.join(', ')}`);
      this.logger.query(`Available Shared CTEs: ${sharedCteNames.join(', ')}`);

      // Extract all referenced table names from query
      const referencedTables = this.extractReferencedTableNames(query);
      this.logger.query(`Referenced tables in query: ${referencedTables.join(', ')}`);

      // Check each referenced table: Private CTEs first, then Shared CTEs
      for (const tableName of referencedTables) {
        if (privateCteNames.includes(tableName)) {
          usedPrivateCtes.push(tableName);
          this.logger.query(`Found Private CTE: ${tableName}`);
        } else if (sharedCteNames.includes(tableName)) {
          usedSharedCtes.push(tableName);
          this.logger.query(`Found Shared CTE: ${tableName}`);
        }
      }

      // Resolve dependencies for Private CTEs
      const resolvedPrivateCtes = this.resolveCTEDependencies(usedPrivateCtes, privateCtes);
      const uniquePrivateCtes = [...new Set(resolvedPrivateCtes)];
      const uniqueSharedCtes = [...new Set(usedSharedCtes)];
      
      if (uniquePrivateCtes.length === 0 && uniqueSharedCtes.length === 0) {
        this.logger.query(`No Private or Shared CTEs detected, returning original SQL`);
        return originalSql;
      }

      this.logger.query(`Used Private CTEs: ${uniquePrivateCtes.join(', ')}`);
      this.logger.query(`Used Shared CTEs: ${uniqueSharedCtes.join(', ')}`);

      // Build WITH clause: Private CTEs first, then Shared CTEs
      const withClauses: string[] = [];
      
      // Add Private CTEs
      for (const cteName of uniquePrivateCtes) {
        const privateCte = privateCtes[cteName];
        if (privateCte) {
          withClauses.push(`${cteName} AS (\n${privateCte.query}\n)`);
          this.logger.query(`Added Private CTE: ${cteName}`);
        }
      }
      
      // Add Shared CTEs
      for (const cteName of uniqueSharedCtes) {
        const sharedCte = allSharedCtes[cteName];
        if (sharedCte) {
          withClauses.push(`${cteName} AS (\n${sharedCte.query}\n)`);
          this.logger.query(`Added Shared CTE: ${cteName}`);
        }
      }
      
      if (withClauses.length === 0) {
        this.logger.error(`Failed to generate any WITH clauses`);
        return originalSql;
      }

      // Create complete WITH clause
      const withClause = `WITH ${withClauses.join(',\n')}`;

      // Check if original SQL already has WITH clause
      let composedSql: string;
      if (query.withClause && query.withClause.tables && query.withClause.tables.length > 0) {
        // Merge WITH clauses - this is complex, for now just prepend
        this.logger.query(`Original SQL already has WITH clause, prepending CTEs`);
        composedSql = `${withClause},\n${originalSql.replace(/^\s*WITH\s+/i, '')}`;
      } else {
        // Simple case: prepend WITH clause
        composedSql = `${withClause}\n${originalSql}`;
      }

      this.logger.query(`Composed SQL: ${composedSql}`);
      return composedSql;

    } catch (error) {
      this.logger.error(`Error composing SQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.logger.query(`Returning original SQL due to composition error`);
      return originalSql;
    }
  }

  /**
   * Get Private CTEs from workspace
   */
  private async getPrivateCtes(): Promise<Record<string, any>> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const workspaceBasePath = path.join(process.cwd(), 'zosql', 'workspace');
      const privateCteDir = path.join(workspaceBasePath, 'private-cte');
      
      // Check if private CTE directory exists
      try {
        await fs.access(privateCteDir);
      } catch {
        this.logger.query('No private CTE directory found');
        return {};
      }
      
      const privateCtes: Record<string, any> = {};
      const files = await fs.readdir(privateCteDir);
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const cteName = file.replace('.sql', '');
          const filePath = path.join(privateCteDir, file);
          const query = await fs.readFile(filePath, 'utf8');
          
          privateCtes[cteName] = {
            name: cteName,
            query: query.trim(),
            description: `Private CTE: ${cteName}`
          };
        }
      }
      
      this.logger.query(`Loaded ${Object.keys(privateCtes).length} private CTEs`);
      return privateCtes;
      
    } catch (error) {
      this.logger.query(`Error getting private CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {};
    }
  }

  /**
   * Extract all referenced table names from a query
   */
  private extractReferencedTableNames(query: any): string[] {
    const tableNames: string[] = [];
    
    try {
      // Check FROM clause
      if (query.fromClause) {
        // Check main table
        const mainTable = query.fromClause.source?.datasource;
        if (mainTable && 'qualifiedName' in mainTable) {
          const tableName = this.extractTableName(mainTable);
          if (tableName) {
            tableNames.push(tableName);
          }
        }

        // Check JOINs
        if (query.fromClause.joins) {
          for (const join of query.fromClause.joins) {
            const joinTable = join.source?.datasource;
            if (joinTable && 'qualifiedName' in joinTable) {
              const tableName = this.extractTableName(joinTable);
              if (tableName) {
                tableNames.push(tableName);
              }
            }
          }
        }
      }
      
    } catch (error) {
      this.logger.query(`Error extracting table names: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return [...new Set(tableNames)]; // Remove duplicates
  }

  /**
   * Extract table name from table datasource object
   */
  private extractTableName(tableObj: any): string | null {
    try {
      const qualifiedName = tableObj.qualifiedName?.name;
      const tableName = qualifiedName && typeof qualifiedName === 'object' && 'name' in qualifiedName 
        ? qualifiedName.name 
        : qualifiedName;
      return typeof tableName === 'string' ? tableName : String(tableName);
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve CTE dependencies recursively
   */
  private resolveCTEDependencies(cteNames: string[], privateCtes: Record<string, any>): string[] {
    const resolved: string[] = [];
    const visited = new Set<string>();
    
    const resolveDependencies = (cteName: string) => {
      if (visited.has(cteName)) {
        return; // Avoid circular dependencies
      }
      visited.add(cteName);
      
      const cte = privateCtes[cteName];
      if (!cte) {
        this.logger.query(`Warning: CTE ${cteName} not found in private CTEs`);
        return;
      }
      
      // Parse dependencies from comments
      const dependencies = this.parseCTEDependencies(cte.query);
      this.logger.query(`CTE ${cteName} dependencies: ${dependencies.join(', ')}`);
      
      // Recursively resolve dependencies first
      for (const dep of dependencies) {
        if (privateCtes[dep]) {
          resolveDependencies(dep);
        }
      }
      
      // Add this CTE if not already included
      if (!resolved.includes(cteName)) {
        resolved.push(cteName);
      }
    };
    
    // Resolve all requested CTEs
    for (const cteName of cteNames) {
      resolveDependencies(cteName);
    }
    
    this.logger.query(`Resolved Private CTEs with dependencies: ${resolved.join(', ')}`);
    return resolved;
  }

  /**
   * Parse CTE dependencies from comment
   */
  private parseCTEDependencies(query: string): string[] {
    try {
      const dependencyMatch = query.match(/\/\*\s*dependencies:\s*(\[.*?\])\s*\*\//);
      if (dependencyMatch) {
        const dependenciesStr = dependencyMatch[1];
        const dependencies = JSON.parse(dependenciesStr);
        return Array.isArray(dependencies) ? dependencies : [];
      }
    } catch (error) {
      this.logger.query(`Error parsing dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return [];
  }

  public async handleExecuteQuery(req: Request, res: Response): Promise<void> {
    try {
      const { sql } = req.body;
      
      if (!sql) {
        res.status(400).json({ success: false, error: 'SQL is required' });
        return;
      }
      
      this.logger.query(`Executing SQL (length: ${sql.length}): "${sql.substring(0, 100)}..."`);
      
      // Compose SQL with shared CTEs
      const composedSql = await this.composeSqlWithSharedCtes(sql);
      
      const startTime = Date.now();
      
      try {
        // Execute the composed query
        const result = await this.db.query(composedSql);
        const executionTime = Date.now() - startTime;
        
        this.logger.query(`Query executed successfully in ${executionTime}ms, returned ${result.rows?.length || 0} rows`);
        this.logger.query(`Result structure: ${JSON.stringify({
          hasRows: !!result.rows,
          rowsLength: result.rows?.length,
          hasFields: !!result.fields,
          fieldsLength: result.fields?.length,
          sampleRow: result.rows?.[0]
        })}`);
        
        res.json({
          success: true,
          results: {
            rows: result.rows || [],
            fields: result.fields || [],
            executionTime
          },
          result: {
            rows: result.rows || [],
            fields: result.fields || [],
            executionTime
          },
          originalSql: sql,
          composedSql: composedSql !== sql ? composedSql : undefined
        });
      } catch (queryError) {
        const errorMessage = queryError instanceof Error ? queryError.message : 'Query execution failed';
        this.logger.error(`Query execution failed: ${errorMessage}`);
        
        res.json({
          success: false,
          error: errorMessage
        });
      }
    } catch (error) {
      this.logger.error(`API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleResetDatabase(_req: Request, res: Response): Promise<void> {
    try {
      this.logger.query('Resetting database...');
      
      // Drop all tables
      await this.db.exec('DROP TABLE IF EXISTS orders CASCADE');
      await this.db.exec('DROP TABLE IF EXISTS products CASCADE');
      await this.db.exec('DROP TABLE IF EXISTS users CASCADE');
      
      // Recreate schema
      await this.createDefaultSchema();
      
      res.json({ success: true, message: 'Database reset successfully' });
    } catch (error) {
      this.logger.error(`Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleGenerateDiagram(req: Request, res: Response): Promise<void> {
    try {
      const { sql, includeCteSupplement = false } = req.body;
      
      if (!sql) {
        res.status(400).json({ success: false, error: 'SQL is required' });
        return;
      }
      
      this.logger.query(`Generating diagram for SQL (length: ${sql.length}): "${sql.substring(0, 100)}..."`);
      
      let diagramSql = sql;
      let composedSql = sql;
      
      // Apply CTE supplementation if requested
      if (includeCteSupplement) {
        try {
          composedSql = await this.composeSqlWithSharedCtes(sql);
          diagramSql = composedSql;
          this.logger.query(`Using CTE-supplemented SQL for diagram generation`);
        } catch (error) {
          this.logger.query(`CTE supplementation failed, using original SQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue with original SQL if supplementation fails
        }
      }
      
      // Generate flow diagram using QueryFlowDiagramGenerator
      try {
        const diagramGenerator = new QueryFlowDiagramGenerator();
        const flowDiagram = diagramGenerator.generateMermaidFlow(diagramSql, {
          direction: 'TD',
          title: 'Query Flow Diagram'
        });
        
        this.logger.query(`Flow diagram generated successfully (${flowDiagram.length} chars)`);
        
        res.json({
          success: true,
          flowDiagram,
          composedSql: composedSql !== sql ? composedSql : undefined,
          message: 'Diagram generated successfully'
        });
        
      } catch (diagramError) {
        this.logger.error(`Failed to generate flow diagram: ${diagramError instanceof Error ? diagramError.message : 'Unknown error'}`);
        res.status(500).json({ 
          success: false, 
          error: `Failed to generate diagram: ${diagramError instanceof Error ? diagramError.message : 'Unknown error'}` 
        });
      }
      
    } catch (error) {
      this.logger.error(`API error in diagram generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
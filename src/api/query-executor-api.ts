import { Request, Response } from 'express';
import { Logger } from '../utils/logging.js';
import { FileBasedSharedCteApi } from './file-based-shared-cte-api.js';
import { SelectQueryParser, QueryFlowDiagramGenerator } from 'rawsql-ts';
import * as Result from '../lib/functional/result.js';

export interface QueryResult {
  rows: unknown[];
  fields: Array<{ name: string; dataTypeID: number }>;
  error?: string;
  executionTime?: number;
}

interface CteInfo {
  name: string;
  query: string;
  description: string;
}

interface DatabaseInstance {
  query: (sql: string) => Promise<QueryResult>;
  exec: (sql: string) => Promise<unknown>;
}

export class QueryExecutorApi {
  private logger: Logger;
  private db: DatabaseInstance | null = null;
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
      this.db = new PGlite() as DatabaseInstance;
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
  private async getPrivateCtes(): Promise<Record<string, CteInfo>> {
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
      
      const privateCtes: Record<string, CteInfo> = {};
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
  private extractReferencedTableNames(query: unknown): string[] {
    const tableNames: string[] = [];
    
    try {
      if (!query || typeof query !== 'object') {
        return tableNames;
      }
      
      const queryObj = query as Record<string, unknown>;
      
      // Check FROM clause
      if (queryObj.fromClause && typeof queryObj.fromClause === 'object' && queryObj.fromClause !== null) {
        const fromClause = queryObj.fromClause as Record<string, unknown>;
        
        // Check main table
        if (fromClause.source && typeof fromClause.source === 'object' && fromClause.source !== null) {
          const source = fromClause.source as Record<string, unknown>;
          const mainTable = source.datasource;
          if (mainTable && typeof mainTable === 'object' && 'qualifiedName' in mainTable) {
            const tableName = this.extractTableName(mainTable);
            if (tableName) {
              tableNames.push(tableName);
            }
          }
        }

        // Check JOINs
        if (Array.isArray(fromClause.joins)) {
          for (const join of fromClause.joins) {
            if (join && typeof join === 'object' && 'source' in join) {
              const joinSource = (join as Record<string, unknown>).source;
              if (joinSource && typeof joinSource === 'object' && joinSource !== null) {
                const joinTable = (joinSource as Record<string, unknown>).datasource;
                if (joinTable && typeof joinTable === 'object' && 'qualifiedName' in joinTable) {
                  const tableName = this.extractTableName(joinTable);
                  if (tableName) {
                    tableNames.push(tableName);
                  }
                }
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
  private extractTableName(tableObj: unknown): string | null {
    try {
      if (!tableObj || typeof tableObj !== 'object') {
        return null;
      }
      
      const obj = tableObj as Record<string, unknown>;
      const qualifiedName = obj.qualifiedName;
      
      if (!qualifiedName) {
        return null;
      }
      
      // qualifiedName might be a string or an object with a name property
      if (typeof qualifiedName === 'string') {
        return qualifiedName;
      }
      
      if (typeof qualifiedName === 'object' && qualifiedName !== null && 'name' in qualifiedName) {
        const nameValue = (qualifiedName as Record<string, unknown>).name;
        if (typeof nameValue === 'string') {
          return nameValue;
        }
        if (nameValue !== null && nameValue !== undefined) {
          return String(nameValue);
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve CTE dependencies recursively
   */
  private resolveCTEDependencies(cteNames: string[], privateCtes: Record<string, CteInfo>): string[] {
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
      
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
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
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      await this.db.exec('DROP TABLE IF EXISTS orders CASCADE');
      await this.db.exec('DROP TABLE IF EXISTS products CASCADE');
      await this.db.exec('DROP TABLE IF EXISTS users CASCADE');
      
      // Note: Schema creation is not performed as per WASM Postgres usage policy
      
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

// ===== NEW FUNCTIONAL VERSIONS - BACKWARD COMPATIBLE =====

/**
 * Functional version: Parse CTE dependencies
 * Returns Result type instead of empty array on error
 */
export const parseCTEDependenciesFunc = (query: string): Result.Result<string[], Error> => {
  return Result.tryCatch(() => {
    const dependencyMatch = query.match(/\/\*\s*dependencies:\s*(\[.*?\])\s*\*\//);
    if (dependencyMatch) {
      const dependenciesStr = dependencyMatch[1];
      const dependencies = JSON.parse(dependenciesStr);
      return Array.isArray(dependencies) ? dependencies : [];
    }
    return [];
  });
};

/**
 * Functional version: Resolve CTE dependencies
 * Returns Result with resolved dependencies or error
 */
export const resolveCTEDependenciesFunc = (
  privateCtes: Record<string, CteInfo>
) => (cteNames: string[]): Result.Result<string[], Error> => {
  return Result.tryCatch(() => {
    const resolved: string[] = [];
    const visited = new Set<string>();
    
    const resolveDependencies = (cteName: string): void => {
      if (visited.has(cteName)) {
        return;
      }
      visited.add(cteName);
      
      const cte = privateCtes[cteName];
      if (!cte) {
        throw new Error(`CTE ${cteName} not found in private CTEs`);
      }
      
      const dependenciesResult = parseCTEDependenciesFunc(cte.query);
      const dependencies = Result.isOk(dependenciesResult) ? dependenciesResult.value : [];
      
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
    
    return resolved;
  });
};

/**
 * Functional version: Extract referenced table names
 * Returns Result with table names or parsing error
 */
export const extractReferencedTableNamesFunc = (): Result.Result<string[], Error> => {
  return Result.tryCatch(() => {
    // This is a simplified implementation - in real usage, you'd analyze the parsed query
    // For now, return empty array as safe fallback
    return [];
  });
};

/**
 * Functional version: Execute database query
 * Returns Result with query result or error
 */
export const executeQueryFunc = (db: DatabaseInstance) => 
  async (sql: string): Promise<Result.Result<QueryResult, Error>> => {
    return Result.asyncTryCatch(async () => {
      const startTime = Date.now();
      const result = await db.query(sql);
      const executionTime = Date.now() - startTime;
      
      return {
        rows: result.rows || [],
        fields: result.fields || [],
        executionTime
      };
    });
  };

/**
 * Functional version: Compose SQL with shared CTEs
 * Returns Result with composed SQL or error
 */
export const composeSqlWithSharedCtesFunc = (
  sharedCteApi: FileBasedSharedCteApi,
  getPrivateCtes: () => Promise<Record<string, CteInfo>>
) => async (originalSql: string): Promise<Result.Result<string, Error>> => {
  return Result.asyncTryCatch(async () => {
    // Parse the SQL to detect table references
    SelectQueryParser.parse(originalSql).toSimpleQuery();
    
    // Get Private and Shared CTEs
    const privateCtes = await getPrivateCtes();
    const allSharedCtes = sharedCteApi.getAllSharedCtes();
    
    const privateCteNames = Object.keys(privateCtes);
    const sharedCteNames = Object.keys(allSharedCtes);
    
    // Extract referenced table names (simplified implementation)
    const referencedTablesResult = extractReferencedTableNamesFunc();
    const referencedTables = Result.isOk(referencedTablesResult) ? referencedTablesResult.value : [];
    
    const usedPrivateCtes: string[] = [];
    const usedSharedCtes: string[] = [];
    
    // Check each referenced table: Private CTEs first, then Shared CTEs
    for (const tableName of referencedTables) {
      if (privateCteNames.includes(tableName)) {
        usedPrivateCtes.push(tableName);
      } else if (sharedCteNames.includes(tableName)) {
        usedSharedCtes.push(tableName);
      }
    }
    
    // Resolve dependencies for Private CTEs
    const resolvedResult = resolveCTEDependenciesFunc(privateCtes)(usedPrivateCtes);
    if (Result.isErr(resolvedResult)) {
      throw resolvedResult.error;
    }
    
    const resolvedPrivateCtes = resolvedResult.value;
    const uniquePrivateCtes = [...new Set(resolvedPrivateCtes)];
    const uniqueSharedCtes = [...new Set(usedSharedCtes)];
    
    if (uniquePrivateCtes.length === 0 && uniqueSharedCtes.length === 0) {
      return originalSql;
    }
    
    // Build CTE definitions
    const cteDefinitions: string[] = [];
    
    // Add Private CTEs first (higher priority)
    for (const cteName of uniquePrivateCtes) {
      const cte = privateCtes[cteName];
      if (cte) {
        cteDefinitions.push(`${cteName} AS (\n${cte.query}\n)`);
      }
    }
    
    // Add Shared CTEs
    for (const cteName of uniqueSharedCtes) {
      const cte = allSharedCtes[cteName];
      if (cte) {
        cteDefinitions.push(`${cteName} AS (\n${cte.query}\n)`);
      }
    }
    
    if (cteDefinitions.length === 0) {
      return originalSql;
    }
    
    // Create composed SQL with WITH clause
    const withClause = `WITH ${cteDefinitions.join(',\n')}`;
    return `${withClause}\n${originalSql}`;
  });
};

/**
 * Functional version: Parallel query execution with validation
 * Validates SQL and executes with shared CTEs
 */
export const executeQueryWithValidationFunc = (
  db: DatabaseInstance,
  sharedCteApi: FileBasedSharedCteApi,
  getPrivateCtes: () => Promise<Record<string, CteInfo>>
) => async (sql: string): Promise<Result.Result<{
  result: QueryResult;
  composedSql?: string;
  validationInfo?: unknown;
}, Error>> => {
  // Compose SQL with CTEs
  const composedSqlResult = await composeSqlWithSharedCtesFunc(
    sharedCteApi,
    getPrivateCtes
  )(sql);
  
  if (Result.isErr(composedSqlResult)) {
    return composedSqlResult;
  }
  
  const composedSql = composedSqlResult.value;
  
  // Execute the query
  const executeQuery = executeQueryFunc(db);
  const queryResult = await executeQuery(composedSql);
  
  if (Result.isErr(queryResult)) {
    return queryResult;
  }
  
  return Result.ok({
    result: queryResult.value,
    composedSql: composedSql !== sql ? composedSql : undefined
  });
};

/**
 * Functional version: Batch query execution
 * Executes multiple queries in parallel with error aggregation
 */
export const executeBatchQueriesFunc = (
  db: DatabaseInstance,
  sharedCteApi: FileBasedSharedCteApi,
  getPrivateCtes: () => Promise<Record<string, CteInfo>>
) => async (queries: string[]): Promise<{
  results: Array<Result.Result<QueryResult, Error>>;
  aggregatedErrors: string[];
}> => {
  const executeQueryWithValidation = executeQueryWithValidationFunc(
    db,
    sharedCteApi,
    getPrivateCtes
  );
  
  // Execute all queries in parallel
  const results = await Promise.all(
    queries.map(async (sql, index) => {
      const result = await executeQueryWithValidation(sql);
      return Result.isOk(result) 
        ? Result.ok(result.value.result)
        : Result.err(new Error(`Query ${index + 1}: ${result.error.message}`));
    })
  );
  
  // Aggregate errors
  const aggregatedErrors = results
    .filter(Result.isErr)
    .map(result => result.error.message);
  
  return {
    results,
    aggregatedErrors
  };
};

/**
 * Functional version: Query execution with retry and timeout
 * Adds resilience for transient failures
 */
export const executeQueryWithRetryFunc = (
  db: DatabaseInstance,
  maxRetries: number = 3,
  timeoutMs: number = 30000
) => async (sql: string): Promise<Result.Result<QueryResult, Error>> => {
  const executeQuery = executeQueryFunc(db);
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout to query execution
      const timeoutPromise = new Promise<Result.Result<QueryResult, Error>>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs);
      });
      
      const queryPromise = executeQuery(sql);
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      if (Result.isOk(result)) {
        return result;
      }
      
      lastError = result.error;
      
      // Don't retry on syntax errors or logical errors
      if (result.error.message.includes('syntax') || 
          result.error.message.includes('does not exist')) {
        break;
      }
      
      // Exponential backoff for retries
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
  
  return Result.err(lastError || new Error('Query execution failed'));
};
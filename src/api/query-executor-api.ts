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
      this.logger.query('PGlite database initialized');
      
      // Create default schema based on zosql.schema.js
      await this.createDefaultSchema();
    } catch (error) {
      this.logger.error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async createDefaultSchema(): Promise<void> {
    try {
      // Create users table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create orders table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY,
          user_id INTEGER,
          amount DECIMAL(10,2),
          order_date DATE,
          status VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      
      // Create products table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY,
          name VARCHAR(255),
          price DECIMAL(10,2),
          category VARCHAR(100),
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create user_sessions table for Private CTEs
      try {
        await this.db.exec(`
          CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            session_id VARCHAR(100),
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            page_views INTEGER,
            actions_taken INTEGER,
            device_type VARCHAR(50),
            browser VARCHAR(50),
            source_channel VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);
        this.logger.query('user_sessions table created successfully');
      } catch (error) {
        this.logger.error(`Failed to create user_sessions table: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }

      // Create events table for Private CTEs
      try {
        await this.db.exec(`
          CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            session_id VARCHAR(100),
            event_type VARCHAR(100),
            event_time TIMESTAMP,
            event_value DECIMAL(10,2),
            page_url VARCHAR(500),
            action_type VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);
        this.logger.query('events table created successfully');
      } catch (error) {
        this.logger.error(`Failed to create events table: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
      
      // Insert sample data
      await this.insertSampleData();
      
      this.logger.query('Default schema created successfully');
    } catch (error) {
      this.logger.error(`Failed to create default schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async insertSampleData(): Promise<void> {
    try {
      // Insert sample users one by one for better error handling
      await this.db.exec(`INSERT INTO users (id, name, email) VALUES (1, 'Alice Johnson', 'alice@example.com')`);
      await this.db.exec(`INSERT INTO users (id, name, email) VALUES (2, 'Bob Smith', 'bob@example.com')`);
      await this.db.exec(`INSERT INTO users (id, name, email) VALUES (3, 'Charlie Brown', 'charlie@example.com')`);
      
      this.logger.query('Users inserted successfully');
      
      // Insert sample orders
      await this.db.exec(`INSERT INTO orders (id, user_id, amount, order_date, status) VALUES (1, 1, 99.99, '2024-01-15', 'completed')`);
      await this.db.exec(`INSERT INTO orders (id, user_id, amount, order_date, status) VALUES (2, 1, 149.50, '2024-01-20', 'pending')`);
      await this.db.exec(`INSERT INTO orders (id, user_id, amount, order_date, status) VALUES (3, 2, 75.00, '2024-01-18', 'completed')`);
      await this.db.exec(`INSERT INTO orders (id, user_id, amount, order_date, status) VALUES (4, 3, 200.00, '2024-01-22', 'processing')`);
      
      this.logger.query('Orders inserted successfully');
      
      // Insert sample products
      await this.db.exec(`INSERT INTO products (id, name, price, category, description) VALUES (1, 'Laptop', 999.99, 'Electronics', 'High-performance laptop')`);
      await this.db.exec(`INSERT INTO products (id, name, price, category, description) VALUES (2, 'Mouse', 29.99, 'Electronics', 'Wireless mouse')`);
      await this.db.exec(`INSERT INTO products (id, name, price, category, description) VALUES (3, 'Desk', 199.99, 'Furniture', 'Ergonomic standing desk')`);
      await this.db.exec(`INSERT INTO products (id, name, price, category, description) VALUES (4, 'Chair', 149.99, 'Furniture', 'Comfortable office chair')`);
      
      this.logger.query('Products inserted successfully');
      
      // Insert sample user_sessions data (table should already exist)
      try {
        await this.db.exec(`INSERT INTO user_sessions (id, user_id, session_id, start_time, end_time, page_views, actions_taken, device_type, browser, source_channel) VALUES (1, 1, 'sess_001', '2024-01-15 10:00:00', '2024-01-15 10:30:00', 5, 12, 'desktop', 'chrome', 'organic')`);
        await this.db.exec(`INSERT INTO user_sessions (id, user_id, session_id, start_time, end_time, page_views, actions_taken, device_type, browser, source_channel) VALUES (2, 1, 'sess_002', '2024-01-16 14:00:00', '2024-01-16 14:45:00', 8, 20, 'mobile', 'safari', 'social')`);
        await this.db.exec(`INSERT INTO user_sessions (id, user_id, session_id, start_time, end_time, page_views, actions_taken, device_type, browser, source_channel) VALUES (3, 2, 'sess_003', '2024-01-17 09:00:00', '2024-01-17 09:15:00', 3, 5, 'tablet', 'firefox', 'direct')`);
        await this.db.exec(`INSERT INTO user_sessions (id, user_id, session_id, start_time, end_time, page_views, actions_taken, device_type, browser, source_channel) VALUES (4, 3, 'sess_004', '2024-01-18 16:00:00', '2024-01-18 16:20:00', 4, 8, 'desktop', 'chrome', 'paid')`);
        
        this.logger.query('User sessions inserted successfully');
      } catch (error) {
        this.logger.query(`Failed to insert user_sessions data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Insert sample events data (table should already exist)
      try {
        await this.db.exec(`INSERT INTO events (id, user_id, session_id, event_type, event_time, event_value) VALUES (1, 1, 'sess_001', 'signup', '2024-01-15 10:05:00', 0)`);
        await this.db.exec(`INSERT INTO events (id, user_id, session_id, event_type, event_time, event_value) VALUES (2, 1, 'sess_001', 'add_to_cart', '2024-01-15 10:15:00', 99.99)`);
        await this.db.exec(`INSERT INTO events (id, user_id, session_id, event_type, event_time, event_value) VALUES (3, 1, 'sess_001', 'purchase_complete', '2024-01-15 10:25:00', 99.99)`);
        await this.db.exec(`INSERT INTO events (id, user_id, session_id, event_type, event_time, event_value) VALUES (4, 2, 'sess_003', 'signup', '2024-01-17 09:10:00', 0)`);
        await this.db.exec(`INSERT INTO events (id, user_id, session_id, event_type, event_time, event_value) VALUES (5, 3, 'sess_004', 'add_to_cart', '2024-01-18 16:10:00', 200.00)`);
        await this.db.exec(`INSERT INTO events (id, user_id, session_id, event_type, event_time, event_value) VALUES (6, 3, 'sess_004', 'checkout_start', '2024-01-18 16:15:00', 200.00)`);
        
        this.logger.query('Events inserted successfully');
      } catch (error) {
        this.logger.query(`Failed to insert events data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      this.logger.query('All sample data inserted successfully');
    } catch (error) {
      this.logger.error(`Failed to insert sample data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Non-critical error - continue without sample data
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
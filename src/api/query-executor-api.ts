import { Request, Response } from 'express';
import { Logger } from '../utils/logging.js';
import { FileBasedSharedCteApi } from './file-based-shared-cte-api.js';
import { SelectQueryParser } from 'rawsql-ts';

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
      this.logger.query('All sample data inserted successfully');
    } catch (error) {
      this.logger.error(`Failed to insert sample data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Non-critical error - continue without sample data
    }
  }

  /**
   * Parse SQL and detect shared CTE usage, then compose WITH clause
   */
  private async composeSqlWithSharedCtes(originalSql: string): Promise<string> {
    try {
      this.logger.query(`Composing SQL with shared CTEs`);
      this.logger.query(`Original SQL: ${originalSql}`);

      // Parse the SQL to detect table references
      const query = SelectQueryParser.parse(originalSql).toSimpleQuery();
      const usedSharedCtes: string[] = [];
      
      // Get all shared CTEs
      const allSharedCtes = this.sharedCteApi.getAllSharedCtes();
      const sharedCteNames = Object.keys(allSharedCtes);
      
      this.logger.query(`Available shared CTEs: ${sharedCteNames.join(', ')}`);

      // Check FROM clause for shared CTE usage
      if (query.fromClause) {
        // Check main table
        const mainTable = query.fromClause.source?.datasource;
        if (mainTable && 'qualifiedName' in mainTable) {
          const qualifiedName = mainTable.qualifiedName?.name;
          const mainTableName = qualifiedName && typeof qualifiedName === 'object' && 'name' in qualifiedName 
            ? qualifiedName.name 
            : qualifiedName;
          const tableNameStr = typeof mainTableName === 'string' ? mainTableName : String(mainTableName);
          if (tableNameStr && sharedCteNames.includes(tableNameStr)) {
            usedSharedCtes.push(tableNameStr);
            this.logger.query(`Found shared CTE in FROM: ${tableNameStr}`);
          }
        }

        // Check JOINs
        if (query.fromClause.joins) {
          for (const join of query.fromClause.joins) {
            const joinTable = join.source?.datasource;
            if (joinTable && 'qualifiedName' in joinTable) {
              const qualifiedName = joinTable.qualifiedName?.name;
              const joinTableName = qualifiedName && typeof qualifiedName === 'object' && 'name' in qualifiedName 
                ? qualifiedName.name 
                : qualifiedName;
              const tableNameStr = typeof joinTableName === 'string' ? joinTableName : String(joinTableName);
              if (tableNameStr && sharedCteNames.includes(tableNameStr)) {
                usedSharedCtes.push(tableNameStr);
                this.logger.query(`Found shared CTE in JOIN: ${tableNameStr}`);
              }
            }
          }
        }
      }

      // Remove duplicates
      const uniqueSharedCtes = [...new Set(usedSharedCtes)];
      
      if (uniqueSharedCtes.length === 0) {
        this.logger.query(`No shared CTEs detected, returning original SQL`);
        return originalSql;
      }

      this.logger.query(`Used shared CTEs: ${uniqueSharedCtes.join(', ')}`);

      // Generate WITH clause using SharedCteApi
      const withClause = this.sharedCteApi.generateWithClause(uniqueSharedCtes);
      
      if (!withClause) {
        this.logger.error(`Failed to generate WITH clause`);
        return originalSql;
      }

      // Check if original SQL already has WITH clause
      let composedSql: string;
      if (query.withClause && query.withClause.tables && query.withClause.tables.length > 0) {
        // Merge WITH clauses - this is complex, for now just prepend
        this.logger.query(`Original SQL already has WITH clause, prepending shared CTEs`);
        composedSql = `${withClause}, \n${originalSql.replace(/^\s*WITH\s+/i, '')}`;
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
}
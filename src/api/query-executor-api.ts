import { Request, Response } from 'express';
import { Logger } from '../utils/logging.js';

export interface QueryResult {
  rows: any[];
  fields: Array<{ name: string; dataTypeID: number }>;
  error?: string;
  executionTime?: number;
}

export class QueryExecutorApi {
  private logger: Logger;
  private db: any; // PGlite instance

  constructor() {
    this.logger = Logger.getInstance();
  }

  public async initializeDatabase(): Promise<void> {
    try {
      // Dynamic import of PGlite
      const { PGlite } = await import('@electric-sql/pglite');
      
      // Initialize PGlite with in-memory database
      this.db = new PGlite();
      this.logger.log('[QUERY-EXECUTOR] PGlite database initialized');
      
      // Create default schema based on zosql.schema.js
      await this.createDefaultSchema();
    } catch (error) {
      this.logger.log(`[QUERY-EXECUTOR] Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      
      this.logger.log('[QUERY-EXECUTOR] Default schema created successfully');
    } catch (error) {
      this.logger.log(`[QUERY-EXECUTOR] Failed to create default schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async insertSampleData(): Promise<void> {
    try {
      // Insert sample users one by one for better error handling
      await this.db.exec(`INSERT INTO users (id, name, email) VALUES (1, 'Alice Johnson', 'alice@example.com')`);
      await this.db.exec(`INSERT INTO users (id, name, email) VALUES (2, 'Bob Smith', 'bob@example.com')`);
      await this.db.exec(`INSERT INTO users (id, name, email) VALUES (3, 'Charlie Brown', 'charlie@example.com')`);
      
      this.logger.log('[QUERY-EXECUTOR] Users inserted successfully');
      
      // Insert sample orders
      await this.db.exec(`INSERT INTO orders (id, user_id, amount, order_date, status) VALUES (1, 1, 99.99, '2024-01-15', 'completed')`);
      await this.db.exec(`INSERT INTO orders (id, user_id, amount, order_date, status) VALUES (2, 1, 149.50, '2024-01-20', 'pending')`);
      await this.db.exec(`INSERT INTO orders (id, user_id, amount, order_date, status) VALUES (3, 2, 75.00, '2024-01-18', 'completed')`);
      await this.db.exec(`INSERT INTO orders (id, user_id, amount, order_date, status) VALUES (4, 3, 200.00, '2024-01-22', 'processing')`);
      
      this.logger.log('[QUERY-EXECUTOR] Orders inserted successfully');
      
      // Insert sample products
      await this.db.exec(`INSERT INTO products (id, name, price, category, description) VALUES (1, 'Laptop', 999.99, 'Electronics', 'High-performance laptop')`);
      await this.db.exec(`INSERT INTO products (id, name, price, category, description) VALUES (2, 'Mouse', 29.99, 'Electronics', 'Wireless mouse')`);
      await this.db.exec(`INSERT INTO products (id, name, price, category, description) VALUES (3, 'Desk', 199.99, 'Furniture', 'Ergonomic standing desk')`);
      await this.db.exec(`INSERT INTO products (id, name, price, category, description) VALUES (4, 'Chair', 149.99, 'Furniture', 'Comfortable office chair')`);
      
      this.logger.log('[QUERY-EXECUTOR] Products inserted successfully');
      this.logger.log('[QUERY-EXECUTOR] All sample data inserted successfully');
    } catch (error) {
      this.logger.log(`[QUERY-EXECUTOR] Failed to insert sample data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Non-critical error - continue without sample data
    }
  }

  public async handleExecuteQuery(req: Request, res: Response): Promise<void> {
    try {
      const { sql } = req.body;
      
      if (!sql) {
        res.status(400).json({ success: false, error: 'SQL is required' });
        return;
      }
      
      this.logger.log(`[QUERY-EXECUTOR] Executing SQL (length: ${sql.length}): "${sql.substring(0, 100)}..."`);
      
      const startTime = Date.now();
      
      try {
        // Execute the query
        const result = await this.db.query(sql);
        const executionTime = Date.now() - startTime;
        
        this.logger.log(`[QUERY-EXECUTOR] Query executed successfully in ${executionTime}ms, returned ${result.rows?.length || 0} rows`);
        this.logger.log(`[QUERY-EXECUTOR] Result structure: ${JSON.stringify({
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
          }
        });
      } catch (queryError) {
        const errorMessage = queryError instanceof Error ? queryError.message : 'Query execution failed';
        this.logger.log(`[QUERY-EXECUTOR] Query execution failed: ${errorMessage}`);
        
        res.json({
          success: false,
          error: errorMessage
        });
      }
    } catch (error) {
      this.logger.log(`[QUERY-EXECUTOR] API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleResetDatabase(_req: Request, res: Response): Promise<void> {
    try {
      this.logger.log('[QUERY-EXECUTOR] Resetting database...');
      
      // Drop all tables
      await this.db.exec('DROP TABLE IF EXISTS orders CASCADE');
      await this.db.exec('DROP TABLE IF EXISTS products CASCADE');
      await this.db.exec('DROP TABLE IF EXISTS users CASCADE');
      
      // Recreate schema
      await this.createDefaultSchema();
      
      res.json({ success: true, message: 'Database reset successfully' });
    } catch (error) {
      this.logger.log(`[QUERY-EXECUTOR] Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
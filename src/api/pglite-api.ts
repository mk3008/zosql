import { Request, Response } from 'express';
import { PGlite } from '@electric-sql/pglite';
import { Logger } from '../utils/logging.js';

class PGliteManager {
  private static instance: PGliteManager;
  private db: PGlite | null = null;
  private isInitialized = false;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  static getInstance(): PGliteManager {
    if (!PGliteManager.instance) {
      PGliteManager.instance = new PGliteManager();
    }
    return PGliteManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    try {
      this.logger.info('PGlite: Initializing in-memory database');
      this.db = new PGlite();
      this.isInitialized = true;
      this.logger.info('PGlite: Database initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`PGlite: Failed to initialize database - ${errorMessage}`);
      throw error;
    }
  }

  async executeQuery(sql: string): Promise<any> {
    if (!this.db) {
      await this.initialize();
    }

    const startTime = Date.now();
    try {
      this.logger.query(`PGlite: Executing full query: ${sql}`);
      const result = await this.db!.query(sql);
      const executionTime = Date.now() - startTime;
      
      // Detailed logging for debugging
      this.logger.query(`PGlite: Query executed successfully in ${executionTime}ms (rows: ${result.rows?.length || 0}, fields: ${result.fields?.length || 0})`);
      this.logger.query(`PGlite: Fields: ${JSON.stringify(result.fields)}`);
      this.logger.query(`PGlite: Rows (raw): ${JSON.stringify(result.rows)}`);
      this.logger.query(`PGlite: First row keys: ${result.rows?.[0] ? Object.keys(result.rows[0]).join(', ') : 'none'}`);
      this.logger.query(`PGlite: First row values: ${result.rows?.[0] ? Object.values(result.rows[0]).join(', ') : 'none'}`);

      // Process rows to handle duplicate column names
      const processedRows = result.rows?.map(row => {
        // If row is already an array, return as-is
        if (Array.isArray(row)) {
          return row;
        }
        
        // Convert object to array based on field order
        const values: any[] = [];
        const seenFields: { [key: string]: boolean } = {};
        const rowObj = row as { [key: string]: any };
        
        for (const field of result.fields || []) {
          const fieldName = field.name;
          if (rowObj.hasOwnProperty(fieldName)) {
            if (seenFields[fieldName]) {
              // For duplicate field names, we can't reliably get the value
              // This is a limitation of object-based response
              values.push(null);
            } else {
              values.push(rowObj[fieldName]);
              seenFields[fieldName] = true;
            }
          } else {
            values.push(null);
          }
        }
        
        return values;
      }) || [];

      // Log processed data
      this.logger.query(`PGlite: Processed rows: ${JSON.stringify(processedRows)}`);

      return {
        rows: processedRows,
        fields: result.fields || [],
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`PGlite: Query execution failed - ${errorMessage} (${executionTime}ms) SQL: ${sql.substring(0, 200)}`);
      throw error;
    }
  }

  async reset(): Promise<void> {
    try {
      this.logger.info('PGlite: Resetting database');
      if (this.db) {
        await this.db.close();
      }
      this.db = null;
      this.isInitialized = false;
      await this.initialize();
      this.logger.info('PGlite: Database reset completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`PGlite: Failed to reset database - ${errorMessage}`);
      throw error;
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }
}

// API Handlers
export async function handleExecuteQuery(req: Request, res: Response): Promise<void> {
  try {
    const { sql } = req.body;

    if (!sql || typeof sql !== 'string') {
      res.status(400).json({
        success: false,
        error: 'SQL query is required'
      });
      return;
    }

    const pglite = PGliteManager.getInstance();
    const result = await pglite.executeQuery(sql);

    res.json({
      success: true,
      result: result,
      originalSql: sql
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.getInstance().error(`PGlite API: Execute query failed - ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: errorMessage,
      sql: req.body.sql // デバッグ用にSQLを含める
    });
  }
}

export async function handleResetDatabase(_req: Request, res: Response): Promise<void> {
  try {
    const pglite = PGliteManager.getInstance();
    await pglite.reset();

    res.json({
      success: true,
      message: 'Database reset successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.getInstance().error(`PGlite API: Reset database failed - ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}

export async function handleHealthCheck(_req: Request, res: Response): Promise<void> {
  try {
    const pglite = PGliteManager.getInstance();
    
    if (!pglite.isReady()) {
      await pglite.initialize();
    }

    // Test with a simple query
    await pglite.executeQuery('SELECT 1 as test');

    res.json({
      status: 'ok',
      database: 'pglite',
      ready: true
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.getInstance().error(`PGlite API: Health check failed - ${errorMessage}`);
    res.status(500).json({
      status: 'error',
      database: 'pglite',
      ready: false,
      error: errorMessage
    });
  }
}

// Initialize on startup
export async function initializePGlite(): Promise<void> {
  try {
    const pglite = PGliteManager.getInstance();
    await pglite.initialize();
    Logger.getInstance().info('PGlite: Startup initialization completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.getInstance().error(`PGlite: Startup initialization failed - ${errorMessage}`);
    // Don't throw - allow server to start even if PGlite fails
  }
}
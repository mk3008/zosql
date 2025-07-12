import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './utils/logging.js';
import { SqlParserApi } from './api/sql-parser-api.js';
import { SchemaApi } from './api/schema-api.js';
import { DebugApi } from './api/debug-api.js';
import { QueryExecutorApi } from './api/query-executor-api.js';
import { getHtmlTemplate } from './web-ui-template.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface WebServerOptions {
  port: number;
  host?: string;
}

export class WebServer {
  private app: express.Application;
  private server?: any;
  private port: number;
  private host: string;
  private logger: Logger;
  private sqlParserApi: SqlParserApi;
  private schemaApi: SchemaApi;
  private debugApi: DebugApi;
  private queryExecutorApi: QueryExecutorApi;

  constructor(options: WebServerOptions) {
    this.app = express();
    this.port = options.port;
    this.host = options.host || 'localhost';
    
    // Initialize services
    this.logger = Logger.getInstance();
    this.sqlParserApi = new SqlParserApi();
    this.schemaApi = new SchemaApi();
    this.debugApi = new DebugApi();
    this.queryExecutorApi = new QueryExecutorApi();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.logger.clearLog();
    
    // Initialize database asynchronously
    this.initializeDatabase();
  }

  private setupMiddleware(): void {
    // Static files
    this.app.use(express.static(path.join(__dirname, '../public')));
    
    // JSON parsing
    this.app.use(express.json());
    
    // CORS for development
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // File system API placeholder
    this.app.get('/api/files', (_req, res) => {
      res.json({ files: [] });
    });

    // Schema API
    this.app.get('/api/schema', this.schemaApi.handleGetSchema.bind(this.schemaApi));
    
    // Schema completion API for IntelliSense
    this.app.get('/api/schema/completion', this.schemaApi.handleGetSchemaCompletion.bind(this.schemaApi));
    
    // SQL parsing API for syntax checking with detailed alias logging
    this.app.post('/api/parse-sql', this.sqlParserApi.handleParseSql.bind(this.sqlParserApi));
    
    // Debug IntelliSense API
    this.app.post('/api/debug-intellisense', this.debugApi.handleDebugIntelliSense.bind(this.debugApi));
    
    // Query execution API
    this.app.post('/api/execute-query', this.queryExecutorApi.handleExecuteQuery.bind(this.queryExecutorApi));
    
    // Database reset API
    this.app.post('/api/reset-database', this.queryExecutorApi.handleResetDatabase.bind(this.queryExecutorApi));
    
    // Main application route
    this.app.get('/', (_req, res) => {
      res.send(getHtmlTemplate(this.host, this.port));
    });
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await this.queryExecutorApi.initializeDatabase();
      this.logger.log('Database initialized successfully');
    } catch (error) {
      this.logger.log(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue running - database features will be unavailable
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, this.host, () => {
        console.log(`zosql browser server running at http://${this.host}:${this.port}`);
        this.logger.log('zosql browser server started successfully');
        resolve();
      });

      this.server.on('error', (err: any) => {
        reject(err);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('zosql browser server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getUrl(): string {
    return `http://${this.host}:${this.port}`;
  }
}
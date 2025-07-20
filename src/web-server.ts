import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from './utils/logging.js';
import { SqlParserApi } from './api/sql-parser-api.js';
import { SchemaApi } from './api/schema-api.js';
import { DebugApi } from './api/debug-api.js';
import { QueryExecutorApi } from './api/query-executor-api.js';
import { FileBasedSharedCteApi } from './api/file-based-shared-cte-api.js';
import { IntelliSenseDebugApi } from './api/intellisense-debug-api.js';
import { SqlFormatterApi } from './api/sql-formatter-api.js';
import { WorkspaceApi } from './api/workspace-api.js';
import { CteValidatorApi } from './api/cte-validator-api.js';
import { handleExecuteQuery, handleResetDatabase, handleHealthCheck, initializePGlite } from './api/pglite-api.js';
import { CteComposeApi } from './api/cte-compose-api.js';

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
  private sharedCteApi: FileBasedSharedCteApi;
  private intelliSenseDebugApi: IntelliSenseDebugApi;
  private sqlFormatterApi: SqlFormatterApi;
  private workspaceApi: WorkspaceApi;
  private cteValidatorApi: CteValidatorApi;
  private cteComposeApi: CteComposeApi;

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
    this.sharedCteApi = new FileBasedSharedCteApi();
    this.intelliSenseDebugApi = new IntelliSenseDebugApi();
    this.sqlFormatterApi = new SqlFormatterApi();
    this.workspaceApi = new WorkspaceApi();
    this.cteValidatorApi = new CteValidatorApi();
    this.cteComposeApi = new CteComposeApi();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.logger.clearLog();
    
    // Initialize database asynchronously
    this.initializeDatabase();
  }

  private setupMiddleware(): void {
    // Static files - serve from src/web-ui/static directory
    // In development, serve from src; in production, these would be copied to dist
    const staticPath = path.join(__dirname, '../src/web-ui/static');
    this.app.use('/static', express.static(staticPath));
    
    // Legacy public folder support
    this.app.use(express.static(path.join(__dirname, '../public')));
    
    // Serve zosql.formatter.json from project root
    const projectRoot = path.join(__dirname, '..');
    this.app.use(express.static(projectRoot, {
      dotfiles: 'ignore',
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('zosql.formatter.json')) {
          res.set('Content-Type', 'application/json');
        }
      }
    }));
    
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
    this.app.get('/api/health', handleHealthCheck);

    // File system API placeholder
    this.app.get('/api/files', (_req, res) => {
      res.json({ files: [] });
    });

    // Schema API
    this.app.get('/api/schema', this.schemaApi.handleGetSchema.bind(this.schemaApi));
    
    // Schema completion API for IntelliSense
    this.app.get('/api/schema/completion', this.schemaApi.handleGetSchemaCompletion.bind(this.schemaApi));
    
    // Shared CTE API - specific routes before parameter routes
    this.app.get('/api/shared-cte/completion', this.sharedCteApi.handleGetSharedCteCompletion.bind(this.sharedCteApi));
    this.app.post('/api/shared-cte/refresh-cache', this.sharedCteApi.handleRefreshCache.bind(this.sharedCteApi));
    this.app.get('/api/shared-cte', this.sharedCteApi.handleGetSharedCtes.bind(this.sharedCteApi));
    this.app.get('/api/shared-cte/:cteName', this.sharedCteApi.handleGetSingleSharedCte.bind(this.sharedCteApi));
    this.app.put('/api/shared-cte/:cteName', this.sharedCteApi.handleUpdateSharedCte.bind(this.sharedCteApi));
    
    // SQL parsing API for syntax checking with detailed alias logging
    this.app.post('/api/parse-sql', this.sqlParserApi.handleParseSql.bind(this.sqlParserApi));
    
    // Debug IntelliSense API
    this.app.post('/api/debug-intellisense', this.debugApi.handleDebugIntelliSense.bind(this.debugApi));
    
    // Query execution API - using PGlite
    this.app.post('/api/execute-query', handleExecuteQuery);
    
    // Database reset API - using PGlite
    this.app.post('/api/reset-database', handleResetDatabase);
    
    // IntelliSense Debug API
    this.app.post('/api/intellisense-debug', this.intelliSenseDebugApi.handleDebugLog.bind(this.intelliSenseDebugApi));
    this.app.get('/api/intellisense-debug/logs', this.intelliSenseDebugApi.handleGetDebugLogs.bind(this.intelliSenseDebugApi));
    this.app.get('/api/intellisense-debug/analyze', this.intelliSenseDebugApi.handleAnalyzeLogs.bind(this.intelliSenseDebugApi));
    
    // SQL Formatter API
    this.app.post('/api/format-sql', this.sqlFormatterApi.handleFormatSql.bind(this.sqlFormatterApi));
    this.app.get('/api/formatter-config', this.sqlFormatterApi.handleGetFormatterConfig.bind(this.sqlFormatterApi));
    this.app.put('/api/formatter-config', this.sqlFormatterApi.handleUpdateFormatterConfig.bind(this.sqlFormatterApi));
    
    // Decompose API (direct endpoint for convenience)
    this.app.post('/api/decompose', this.workspaceApi.handleDecomposeQuery.bind(this.workspaceApi));
    
    // Workspace API
    this.app.post('/api/workspace/decompose', this.workspaceApi.handleDecomposeQuery.bind(this.workspaceApi));
    this.app.post('/api/workspace/compose', this.workspaceApi.handleComposeQuery.bind(this.workspaceApi));
    this.app.post('/api/workspace/read-sql-file', this.workspaceApi.handleReadSqlFile.bind(this.workspaceApi));
    this.app.get('/api/workspace', this.workspaceApi.handleGetWorkspace.bind(this.workspaceApi));
    this.app.get('/api/workspace/private-cte', this.workspaceApi.handleGetPrivateCtes.bind(this.workspaceApi));
    this.app.get('/api/workspace/private-cte/:cteName', this.workspaceApi.handleGetSinglePrivateCte.bind(this.workspaceApi));
    this.app.put('/api/workspace/private-cte/:cteName', this.workspaceApi.handleUpdatePrivateCte.bind(this.workspaceApi));
    this.app.delete('/api/workspace', this.workspaceApi.handleClearWorkspace.bind(this.workspaceApi));
    
    // File access API for workspace
    this.app.get('/api/workspace/:type/:fileName', this.workspaceApi.handleGetWorkspaceFile.bind(this.workspaceApi));
    
    // Diagram Generation API
    this.app.post('/api/generate-diagram', this.queryExecutorApi.handleGenerateDiagram.bind(this.queryExecutorApi));
    
    // CTE Validation API
    this.app.get('/api/validate-ctes', this.cteValidatorApi.handleValidateCtes.bind(this.cteValidatorApi));
    
    // CTE Compose API
    this.app.post('/api/compose-cte', this.cteComposeApi.handleComposeCte.bind(this.cteComposeApi));
    
    // File reading API
    this.app.get('/api/file', async (req, res) => {
      try {
        const filePath = req.query.path as string;
        this.logger.info(`File API called with path: ${filePath}`);
        
        if (!filePath) {
          res.status(400).json({ error: 'File path is required' });
          return;
        }
        
        // Security: Only allow .sql files and prevent directory traversal
        if (!filePath.endsWith('.sql') || filePath.includes('..')) {
          this.logger.error(`Invalid file path: ${filePath}`);
          res.status(403).json({ error: 'Invalid file path' });
          return;
        }
        
        const fs = await import('fs/promises');
        const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        this.logger.info(`Resolved absolute path: ${absolutePath}`);
        
        try {
          const content = await fs.readFile(absolutePath, 'utf8');
          this.logger.info(`File read successfully: ${filePath} (${content.length} chars)`);
          res.type('text/plain').send(content);
        } catch (error) {
          this.logger.error(`File read error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          if ((error as any).code === 'ENOENT') {
            res.status(404).json({ error: 'File not found' });
          } else {
            res.status(500).json({ error: 'Failed to read file' });
          }
        }
      } catch (error) {
        this.logger.error(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    // Main application route - serve static HTML file
    this.app.get('/', (_req, res) => {
      const htmlPath = path.join(__dirname, '../src/web-ui/static/index.html');
      res.sendFile(htmlPath);
    });
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await initializePGlite();
      this.logger.log('PGlite database initialized successfully');
    } catch (error) {
      this.logger.log(`Failed to initialize PGlite database: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue running - database features will be unavailable
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Apply console replacement based on current configuration
      Logger.replaceConsole();
      
      this.server = this.app.listen(this.port, this.host, () => {
        this.logger.info(`zosql browser server running at http://${this.host}:${this.port}`);
        this.logger.log('zosql browser server started successfully');
        const logPaths = this.logger.getLogFilePaths();
        this.logger.info(`Log files created at:`);
        Object.entries(logPaths).forEach(([type, path]) => {
          this.logger.info(`  ${type}: ${path}`);
        });
        resolve();
      });

      this.server.on('error', (err: any) => {
        this.logger.error(`Server error: ${err.message}`);
        reject(err);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('zosql browser server stopped');
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
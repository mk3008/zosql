import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

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

  constructor(options: WebServerOptions) {
    this.app = express();
    this.port = options.port;
    this.host = options.host || 'localhost';
    this.setupMiddleware();
    this.setupRoutes();
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

    // Main application route
    this.app.get('/', (_req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>zosql Browser</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
              margin-bottom: 20px;
            }
            .status {
              padding: 10px;
              background-color: #e8f5e8;
              border: 1px solid #4caf50;
              border-radius: 4px;
              margin-bottom: 20px;
            }
            .feature-list {
              list-style: none;
              padding: 0;
            }
            .feature-list li {
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .feature-list li:last-child {
              border-bottom: none;
            }
            .status-badge {
              display: inline-block;
              padding: 2px 6px;
              font-size: 12px;
              background: #007acc;
              color: white;
              border-radius: 3px;
              margin-left: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 zosql Browser</h1>
            <div class="status">
              <strong>Status:</strong> Web server running successfully!
            </div>
            
            <h2>Planned Features</h2>
            <ul class="feature-list">
              <li>SQL Editor with Monaco Editor <span class="status-badge">Phase 1</span></li>
              <li>File System Management <span class="status-badge">Phase 1</span></li>
              <li>Schema Management <span class="status-badge">Phase 1</span></li>
              <li>SQL IntelliSense <span class="status-badge">Phase 1</span></li>
              <li>Syntax Error Detection <span class="status-badge">Phase 1</span></li>
              <li>WASM Postgres Integration <span class="status-badge">Phase 1</span></li>
              <li>AI Comment System <span class="status-badge">Phase 2</span></li>
              <li>Test Data Generation <span class="status-badge">Phase 2</span></li>
              <li>CTE Dependency Visualization <span class="status-badge">Phase 3</span></li>
            </ul>

            <h2>Development Info</h2>
            <p><strong>Server:</strong> ${this.host}:${this.port}</p>
            <p><strong>Started:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>API Health:</strong> <a href="/api/health">/api/health</a></p>
          </div>
        </body>
        </html>
      `);
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, this.host, () => {
        console.log(`zosql browser server running at http://${this.host}:${this.port}`);
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
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
              padding: 0;
              background-color: #1e1e1e;
              color: #cccccc;
            }
            .header {
              background: #2d2d30;
              padding: 10px 20px;
              border-bottom: 1px solid #3e3e42;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .logo {
              font-size: 18px;
              font-weight: bold;
              color: #007acc;
            }
            .status {
              font-size: 12px;
              color: #4caf50;
            }
            .main-container {
              display: flex;
              height: calc(100vh - 60px);
            }
            .sidebar {
              width: 250px;
              background: #252526;
              border-right: 1px solid #3e3e42;
              padding: 20px;
            }
            .editor-container {
              flex: 1;
              display: flex;
              flex-direction: column;
            }
            .editor-header {
              background: #2d2d30;
              padding: 10px 20px;
              border-bottom: 1px solid #3e3e42;
              font-size: 14px;
            }
            .editor {
              flex: 1;
              border: none;
              background: #1e1e1e;
              color: #cccccc;
              font-family: 'Consolas', 'Monaco', monospace;
              font-size: 14px;
              padding: 20px;
              resize: none;
              outline: none;
            }
            .file-tree {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .file-tree li {
              padding: 4px 0;
              cursor: pointer;
              font-size: 13px;
            }
            .file-tree li:hover {
              background: #2a2d2e;
            }
            .folder {
              color: #cccccc;
              font-weight: bold;
            }
            .file {
              color: #cccccc;
              padding-left: 16px;
            }
            .file.sql {
              color: #569cd6;
            }
            h3 {
              color: #cccccc;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .action-button {
              background: #007acc;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 3px;
              cursor: pointer;
              font-size: 12px;
              margin-top: 10px;
            }
            .action-button:hover {
              background: #005a9e;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🚀 zosql Browser</div>
            <div class="status">● Server Running</div>
          </div>
          
          <div class="main-container">
            <div class="sidebar">
              <h3>Project Explorer</h3>
              <ul class="file-tree">
                <li class="folder">📁 zosql/</li>
                <li class="folder">📁 develop/</li>
                <li class="file">📄 main.sql</li>
                <li class="folder">📁 resources/</li>
                <li class="file sql">📄 schema.js</li>
              </ul>
              
              <h3>Actions</h3>
              <button class="action-button" onclick="createNewFile()">New SQL File</button>
              <button class="action-button" onclick="runQuery()">Run Query</button>
              
              <h3>Development Info</h3>
              <div style="font-size: 12px; margin-top: 10px;">
                <div>Server: ${this.host}:${this.port}</div>
                <div>Started: ${new Date().toLocaleString()}</div>
              </div>
            </div>
            
            <div class="editor-container">
              <div class="editor-header">
                📄 main.sql
              </div>
              <div id="editor-container" style="flex: 1; position: relative;">
                <textarea class="editor" id="sql-editor" placeholder="-- Write your SQL query here
SELECT 
  id,
  name,
  email 
FROM users 
WHERE created_at > '2023-01-01'
ORDER BY created_at DESC;">-- Welcome to zosql Browser!
-- This is a Monaco Editor integration demo.
-- Phase 1 features in development:
-- ✓ Express.js Web Server
-- ✓ Basic UI Layout
-- ⚠️ Monaco Editor Integration (in progress)
-- ⚠️ File System Management
-- ⚠️ Schema Management
-- ⚠️ SQL IntelliSense
-- ⚠️ Syntax Error Detection
-- ⚠️ WASM Postgres Integration

SELECT 
  user_id,
  COUNT(*) as order_count,
  SUM(amount) as total_amount
FROM orders
WHERE order_date >= '2023-01-01'
GROUP BY user_id
ORDER BY total_amount DESC;</textarea>
              </div>
            </div>
          </div>
          
          <script>
            function createNewFile() {
              alert('New File creation will be implemented in Phase 1');
            }
            
            function runQuery() {
              const query = document.getElementById('sql-editor').value;
              alert('Query execution will be implemented in Phase 1\\n\\nQuery:\\n' + query);
            }
            
            // Monaco Editor integration
            async function initMonacoEditor() {
              try {
                // Load Monaco Editor from CDN
                await loadScript('https://unpkg.com/monaco-editor@0.52.2/min/vs/loader.js');
                
                // Configure Monaco
                require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.52.2/min/vs' } });
                
                require(['vs/editor/editor.main'], function () {
                  // Initialize Monaco Editor
                  const editor = monaco.editor.create(document.getElementById('editor-container'), {
                    value: \`-- Welcome to zosql Browser!
-- This is a Monaco Editor integration demo.
-- Phase 1 features in development:
-- ✓ Express.js Web Server
-- ✓ Basic UI Layout
-- ✓ Monaco Editor Integration
-- ⚠️ File System Management
-- ⚠️ Schema Management
-- ⚠️ SQL IntelliSense
-- ⚠️ Syntax Error Detection
-- ⚠️ WASM Postgres Integration

SELECT 
  user_id,
  COUNT(*) as order_count,
  SUM(amount) as total_amount
FROM orders
WHERE order_date >= '2023-01-01'
GROUP BY user_id
ORDER BY total_amount DESC;\`,
                    language: 'sql',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false
                  });
                  
                  // Update runQuery function to use Monaco Editor
                  window.runQuery = function() {
                    const query = editor.getValue();
                    alert('Query execution will be implemented in Phase 1\\n\\nQuery:\\n' + query);
                  };
                  
                  // Hide the textarea
                  document.getElementById('sql-editor').style.display = 'none';
                  
                  console.log('Monaco Editor initialized successfully');
                });
              } catch (error) {
                console.error('Failed to load Monaco Editor:', error);
                console.log('Falling back to textarea');
              }
            }
            
            function loadScript(src) {
              return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }
            
            // Initialize Monaco Editor when page loads
            document.addEventListener('DOMContentLoaded', initMonacoEditor);
          </script>
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
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

    // Schema API
    this.app.get('/api/schema', (_req, res) => {
      try {
        // Read schema from zosql.schema.js
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(process.cwd(), 'zosql.schema.js');
        
        if (fs.existsSync(schemaPath)) {
          // Clear require cache to get fresh schema
          delete require.cache[require.resolve(schemaPath)];
          const schema = require(schemaPath);
          res.json({ success: true, schema });
        } else {
          res.json({ success: false, error: 'Schema file not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Schema completion API for IntelliSense
    this.app.get('/api/schema/completion', (_req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(process.cwd(), 'zosql.schema.js');
        
        if (fs.existsSync(schemaPath)) {
          delete require.cache[require.resolve(schemaPath)];
          const schema = require(schemaPath);
          
          // Format for IntelliSense completion
          const tables = schema.tables.map((t: any) => t.name);
          const columns: any = {};
          schema.tables.forEach((table: any) => {
            columns[table.name] = table.columns.map((col: any) => col.name);
          });
          
          res.json({
            success: true,
            tables,
            columns,
            functions: schema.functions
          });
        } else {
          res.json({ success: false, error: 'Schema file not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // SQL parsing API for syntax checking
    this.app.post('/api/parse-sql', (_req, res) => {
      try {
        const { sql } = _req.body;
        if (!sql) {
          res.status(400).json({ success: false, error: 'SQL is required' });
          return;
        }

        // Use rawsql-ts to parse SQL
        const { SelectQueryParser } = require('rawsql-ts');
        
        try {
          const query = SelectQueryParser.parse(sql);
          res.json({ success: true, query: query });
        } catch (parseError) {
          res.json({ success: false, error: parseError instanceof Error ? parseError.message : 'Parse error' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
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
            #editor {
              height: 100%;
              width: 100%;
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
              display: block;
              width: 100%;
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
              <h3>Actions</h3>
              <button class="action-button" onclick="runQuery()">Run Query</button>
              
              <h3>Schema Info</h3>
              <div id="schema-info" style="font-size: 12px; margin-top: 10px;">
                <div>Loading schema...</div>
              </div>
              
              <h3>Development Info</h3>
              <div style="font-size: 12px; margin-top: 10px;">
                <div>Server: ${this.host}:${this.port}</div>
                <div>Started: ${new Date().toLocaleString()}</div>
                <div>Monaco Editor: Loading...</div>
              </div>
            </div>
            
            <div class="editor-container">
              <div class="editor-header">
                📄 main.sql
              </div>
              <div id="editor"></div>
            </div>
          </div>
          
          <script>
            let editor = null;
            let schemaData = null;
            
            function runQuery() {
              const query = editor ? editor.getValue() : 'No editor available';
              alert('Query execution (Phase 1):\\n\\n' + query);
            }
            
            // Load and display schema information
            async function loadSchemaInfo() {
              try {
                const response = await fetch('/api/schema');
                const data = await response.json();
                
                if (data.success) {
                  const schemaInfo = document.getElementById('schema-info');
                  let html = '';
                  
                  data.schema.tables.forEach(table => {
                    html += \`<div style="margin-bottom: 10px;">
                      <strong>\${table.name}</strong><br>
                      \${table.columns.map(col => \`• \${col.name}\`).join('<br>')}
                    </div>\`;
                  });
                  
                  schemaInfo.innerHTML = html;
                  console.log('Schema loaded successfully');
                } else {
                  document.getElementById('schema-info').innerHTML = 
                    '<div style="color: red;">Failed to load schema</div>';
                }
              } catch (error) {
                console.error('Error loading schema:', error);
                document.getElementById('schema-info').innerHTML = 
                  '<div style="color: red;">Error loading schema</div>';
              }
            }
            
            // Monaco Editor integration with IntelliSense
            async function initMonacoEditor() {
              try {
                // Load Monaco Editor from CDN
                await loadScript('https://unpkg.com/monaco-editor@0.52.2/min/vs/loader.js');
                
                // Configure Monaco
                require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.52.2/min/vs' } });
                
                require(['vs/editor/editor.main'], function () {
                  // Initialize Monaco Editor
                  editor = monaco.editor.create(document.getElementById('editor'), {
                    value: \`-- Welcome to zosql Browser with IntelliSense!
-- Try typing table names: users, orders, products
-- Try typing column names after FROM/SELECT

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
                    automaticLayout: false,
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on'
                  });
                  
                  // Add keyboard shortcuts
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F5, function() {
                    runQuery();
                  });
                  
                  // Setup SQL IntelliSense
                  setupSQLIntelliSense();
                  
                  // Update status
                  const statusDiv = document.querySelector('.sidebar div div:nth-child(3)');
                  statusDiv.textContent = 'Monaco Editor: Ready';
                  
                  console.log('Monaco Editor initialized successfully');
                });
              } catch (error) {
                console.error('Failed to load Monaco Editor:', error);
                document.getElementById('editor').innerHTML = 
                  '<div style="color: red; padding: 20px;">Failed to load Monaco Editor</div>';
              }
            }
            
            function setupSQLIntelliSense() {
              // Register SQL completion provider
              monaco.languages.registerCompletionItemProvider('sql', {
                provideCompletionItems: function (model, position) {
                  return new Promise(async (resolve) => {
                    try {
                      const response = await fetch('/api/schema/completion');
                      const data = await response.json();
                      
                      if (!data.success) {
                        resolve({ suggestions: [] });
                        return;
                      }
                      
                      const suggestions = [];
                      const word = model.getWordUntilPosition(position);
                      const range = {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endColumn: word.endColumn
                      };
                      
                      // Add table names
                      data.tables.forEach(table => {
                        suggestions.push({
                          label: table,
                          kind: monaco.languages.CompletionItemKind.Class,
                          documentation: \`Table: \${table}\`,
                          insertText: table,
                          range: range
                        });
                      });
                      
                      // Add column names for each table
                      Object.keys(data.columns).forEach(tableName => {
                        data.columns[tableName].forEach(column => {
                          suggestions.push({
                            label: \`\${tableName}.\${column}\`,
                            kind: monaco.languages.CompletionItemKind.Field,
                            documentation: \`Column: \${column} in table \${tableName}\`,
                            insertText: \`\${tableName}.\${column}\`,
                            range: range
                          });
                          
                          // Also add column without table prefix
                          suggestions.push({
                            label: column,
                            kind: monaco.languages.CompletionItemKind.Field,
                            documentation: \`Column: \${column}\`,
                            insertText: column,
                            range: range
                          });
                        });
                      });
                      
                      // Add function names
                      data.functions.forEach(func => {
                        suggestions.push({
                          label: func,
                          kind: monaco.languages.CompletionItemKind.Function,
                          documentation: \`Function: \${func}\`,
                          insertText: \`\${func}()\`,
                          range: range
                        });
                      });
                      
                      // Add common SQL keywords
                      const sqlKeywords = [
                        'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING',
                        'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
                        'WITH', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS'
                      ];
                      
                      sqlKeywords.forEach(keyword => {
                        suggestions.push({
                          label: keyword,
                          kind: monaco.languages.CompletionItemKind.Keyword,
                          documentation: \`SQL keyword: \${keyword}\`,
                          insertText: keyword,
                          range: range
                        });
                      });
                      
                      resolve({ suggestions });
                    } catch (error) {
                      console.error('Error loading completion items:', error);
                      resolve({ suggestions: [] });
                    }
                  });
                }
              });
              
              // Register SQL syntax validation
              const validateSQL = (model) => {
                const sql = model.getValue();
                
                // Skip validation for empty content
                if (!sql.trim()) {
                  monaco.editor.setModelMarkers(model, 'sql', []);
                  return;
                }
                
                // Parse SQL with rawsql-ts
                fetch('/api/parse-sql', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ sql: sql })
                })
                .then(response => response.json())
                .then(parseResult => {
                  const markers = [];
                  
                  if (!parseResult.success) {
                    // Create error marker
                    const errorMessage = parseResult.error || 'SQL syntax error';
                    console.log('SQL syntax error:', errorMessage);
                    
                    // Try to extract line/column information from error message
                    const lineMatch = errorMessage.match(/line\\s+(\\d+)/i);
                    const columnMatch = errorMessage.match(/column\\s+(\\d+)/i);
                    
                    const lineNumber = lineMatch ? parseInt(lineMatch[1]) : 1;
                    const columnNumber = columnMatch ? parseInt(columnMatch[1]) : 1;
                    
                    markers.push({
                      severity: monaco.MarkerSeverity.Error,
                      startLineNumber: lineNumber,
                      startColumn: columnNumber,
                      endLineNumber: lineNumber,
                      endColumn: columnNumber + 10, // Highlight a few characters
                      message: errorMessage
                    });
                  }
                  
                  // Set markers on the model
                  monaco.editor.setModelMarkers(model, 'sql', markers);
                })
                .catch(error => {
                  console.error('Error validating SQL:', error);
                  monaco.editor.setModelMarkers(model, 'sql', []);
                });
              };
              
              // Validate SQL on content changes
              editor.onDidChangeModelContent(() => {
                validateSQL(editor.getModel());
              });
              
              // Initial validation
              validateSQL(editor.getModel());
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
            
            // Initialize everything when page loads
            document.addEventListener('DOMContentLoaded', function() {
              loadSchemaInfo();
              initMonacoEditor();
            });
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
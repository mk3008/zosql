import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const logDir = path.join(process.cwd(), '.tmp');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    const logFile = path.join(process.cwd(), '.tmp', 'debug.log');
    
    try {
      fs.appendFileSync(logFile, logMessage);
      console.log(`[LOG] ${message}`);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
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
          
          // Extract table information with aliases for IntelliSense
          const tables: any[] = [];
          if (query.fromClause && query.fromClause.tables) {
            query.fromClause.tables.forEach((table: any) => {
              tables.push({
                name: table.name || (table.table && table.table.name),
                alias: table.alias || (table.aliasExpression && table.aliasExpression.table && table.aliasExpression.table.name)
              });
            });
          }
          
          res.json({ success: true, query: query, tables: tables });
        } catch (parseError) {
          res.json({ success: false, error: parseError instanceof Error ? parseError.message : 'Parse error' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Debug IntelliSense API for file logging
    this.app.post('/api/debug-intellisense', (_req, res) => {
      try {
        const debugData = _req.body;
        this.log('IntelliSense Debug: ' + JSON.stringify(debugData, null, 2));
        res.json({ success: true });
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
              
              <h3>IntelliSense Debug</h3>
              <div id="intellisense-debug" style="font-size: 11px; margin-top: 10px; max-height: 200px; overflow-y: auto;">
                <div>Waiting for SQL input...</div>
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
            let lastValidQuery = null;
            let currentSchemaData = null;
            
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
  o.user_id,
  COUNT(*) as order_count,
  SUM(o.amount) as total_amount
FROM orders AS o
WHERE o.order_date >= '2023-01-01'
GROUP BY o.user_id
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
            
            // Helper function to find table name by alias
            function findTableByAlias(parseResult, alias) {
              try {
                console.log('Finding table by alias:', alias);
                console.log('parseResult:', parseResult);
                if (!parseResult || !parseResult.tables) {
                  console.log('No parseResult or tables');
                  return null;
                }
                
                console.log('Available tables:', parseResult.tables);
                
                // Find table by alias
                for (const table of parseResult.tables) {
                  console.log('Checking table:', table, 'alias:', table.alias);
                  if (table.alias && table.alias.toLowerCase() === alias.toLowerCase()) {
                    console.log('Found matching table:', table.name);
                    return table.name;
                  }
                }
                
                console.log('No matching table found for alias:', alias);
                return null;
              } catch (error) {
                console.error('Error finding table by alias:', error);
                return null;
              }
            }
            
            // Update debug panel
            function updateDebugPanel(info) {
              const debugPanel = document.getElementById('intellisense-debug');
              if (debugPanel) {
                const timestamp = new Date().toLocaleTimeString();
                debugPanel.innerHTML = 
                  '<div style="border-bottom: 1px solid #444; padding: 2px 0; margin-bottom: 5px;">' +
                    '<strong>[' + timestamp + ']</strong>' +
                  '</div>' +
                  '<div><strong>Last Input:</strong> ' + (info.textBeforeCursor || 'none') + '</div>' +
                  '<div><strong>Period Match:</strong> ' + (info.periodMatch || 'none') + '</div>' +
                  '<div><strong>Detected Alias:</strong> ' + (info.alias || 'none') + '</div>' +
                  '<div><strong>Found Table:</strong> ' + (info.tableName || 'none') + '</div>' +
                  '<div><strong>Schema Tables:</strong> ' + (info.schemaTables || 'none') + '</div>' +
                  '<div><strong>Available Columns:</strong> ' + (info.availableColumns || 'none') + '</div>' +
                  '<div><strong>Parse Success:</strong> ' + (info.parseSuccess ? 'Yes' : 'No') + '</div>' +
                  '<div><strong>Error:</strong> ' + (info.error || 'none') + '</div>';
              }
            }

            function setupSQLIntelliSense() {
              // Register SQL completion provider with trigger characters
              monaco.languages.registerCompletionItemProvider('sql', {
                triggerCharacters: ['.'],
                provideCompletionItems: function (model, position) {
                  return new Promise(async (resolve) => {
                    try {
                      const response = await fetch('/api/schema/completion');
                      const data = await response.json();
                      
                      currentSchemaData = data; // Store for debug
                      
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
                      
                      // Check if user is typing after a period (e.g., "o.")
                      const textBeforeCursor = model.getValueInRange({
                        startLineNumber: position.lineNumber,
                        startColumn: 1,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column
                      });
                      
                      console.log('Position details:');
                      console.log('- lineNumber:', position.lineNumber);
                      console.log('- column:', position.column);
                      console.log('- textBeforeCursor:', JSON.stringify(textBeforeCursor));
                      
                      // Send debug info to server for logging
                      fetch('/api/debug-intellisense', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          textBeforeCursor: textBeforeCursor,
                          position: { lineNumber: position.lineNumber, column: position.column },
                          timestamp: new Date().toISOString()
                        })
                      }).catch(err => console.error('Debug request failed:', err));
                      
                      // Check if we're being triggered by a dot
                      const charBeforeCursor = position.column > 1 ? 
                        model.getValueInRange({
                          startLineNumber: position.lineNumber,
                          startColumn: position.column - 1,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column
                        }) : '';
                      
                      console.log('Character before cursor:', JSON.stringify(charBeforeCursor));
                      
                      // If triggered by dot, look for alias before the dot
                      let periodMatch = null;
                      if (charBeforeCursor === '.') {
                        // Look for word pattern before the dot
                        const textUpToDot = model.getValueInRange({
                          startLineNumber: position.lineNumber,
                          startColumn: 1,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column - 1
                        });
                        console.log('Text up to dot:', JSON.stringify(textUpToDot));
                        
                        // Match word at the end (alias)
                        const aliasMatch = textUpToDot.match(/(\\w+)$/);
                        if (aliasMatch) {
                          periodMatch = [aliasMatch[0] + '.', aliasMatch[1], ''];
                          console.log('Found alias before dot:', aliasMatch[1]);
                        }
                      } else {
                        // Try original pattern
                        periodMatch = textBeforeCursor.match(/(\\w+)\\.(\\w*)$/);
                      }
                      console.log('Schema data:', currentSchemaData);
                      
                      // Update debug info
                      const debugInfo = {
                        textBeforeCursor: textBeforeCursor,
                        periodMatch: periodMatch ? periodMatch[0] : null,
                        alias: periodMatch ? periodMatch[1] : null,
                        schemaTables: currentSchemaData ? currentSchemaData.tables.join(', ') : 'not loaded',
                        parseSuccess: false,
                        error: null
                      };
                      
                      if (periodMatch) {
                        const alias = periodMatch[1];
                        debugInfo.alias = alias;
                        console.log('Found alias:', alias);
                        
                        // Parse SQL using rawsql-ts
                        const fullText = model.getValue();
                        let tableName = null;
                        
                        try {
                          // Parse the SQL
                          const response = await fetch('/api/parse-sql', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ sql: fullText })
                          });
                          
                          const parseResult = await response.json();
                          console.log('Parse result:', parseResult);
                          console.log('Parse result tables:', parseResult.tables);
                          console.log('Parse result structure keys:', Object.keys(parseResult));
                          
                          if (parseResult.success) {
                            lastValidQuery = parseResult;
                            console.log('Calling findTableByAlias with:', {
                              parseResult: parseResult,
                              tables: parseResult.tables,
                              alias: alias
                            });
                            tableName = findTableByAlias(parseResult, alias);
                            debugInfo.parseSuccess = true;
                          } else if (lastValidQuery) {
                            // Use last valid query if current parse fails
                            tableName = findTableByAlias(lastValidQuery, alias);
                            debugInfo.error = 'Using last valid parse';
                          }
                          
                          debugInfo.tableName = tableName;
                          console.log('Table name from parser:', tableName);
                          console.log('Available columns for table:', tableName ? data.columns[tableName] : 'none');
                        } catch (error) {
                          console.error('Error parsing SQL:', error);
                          debugInfo.error = error.message;
                          if (lastValidQuery) {
                            tableName = findTableByAlias(lastValidQuery, alias);
                            debugInfo.tableName = tableName;
                          }
                        }
                        
                        // If we found the table, show only its columns
                        if (tableName && data.columns[tableName]) {
                          debugInfo.availableColumns = data.columns[tableName].join(', ');
                          console.log('Columns for table:', data.columns[tableName]);
                          data.columns[tableName].forEach(column => {
                            suggestions.push({
                              label: column,
                              kind: monaco.languages.CompletionItemKind.Field,
                              documentation: \`Column: \${column} in table \${tableName} (alias: \${alias})\`,
                              insertText: column,
                              range: range
                            });
                          });
                          
                          updateDebugPanel(debugInfo);
                          resolve({ suggestions });
                          return;
                        } else {
                          debugInfo.availableColumns = 'none found';
                          console.log('No columns found for table:', tableName);
                        }
                        
                        updateDebugPanel(debugInfo);
                      } else {
                        updateDebugPanel(debugInfo);
                      }
                      
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
                      
                      // Add common SQL keywords (only when not after a period)
                      if (!periodMatch) {
                        const sqlKeywords = [
                          'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING',
                          'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
                          'WITH', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS',
                          'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT'
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
                      }
                      
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
        this.log('zosql browser server started successfully');
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
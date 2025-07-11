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
    
    // Clear log file on server start to reduce noise
    const logFile = path.join(process.cwd(), '.tmp', 'debug.log');
    try {
      fs.writeFileSync(logFile, '');
      console.log('[LOG] Debug log file cleared');
    } catch (error) {
      console.error('Failed to clear log file:', error);
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
    this.app.get('/api/schema', async (_req, res) => {
      try {
        const schemaPath = path.join(process.cwd(), 'zosql.schema.js');
        
        if (fs.existsSync(schemaPath)) {
          // Use dynamic import for ES modules
          const schemaModule = await import(schemaPath);
          this.log(`[SCHEMA] Raw import result: ${JSON.stringify(Object.keys(schemaModule))}`);
          this.log(`[SCHEMA] Module content: ${JSON.stringify(schemaModule, null, 2)}`);
          
          const schema = schemaModule.default || schemaModule;
          this.log(`[SCHEMA] Final schema structure: ${JSON.stringify(Object.keys(schema))}`);
          this.log(`[SCHEMA] Schema loaded successfully: ${schema.tables?.length || 0} tables`);
          res.json({ success: true, schema });
        } else {
          this.log(`[SCHEMA] Schema file not found at: ${schemaPath}`);
          res.json({ success: false, error: 'Schema file not found' });
        }
      } catch (error) {
        this.log(`[SCHEMA] Error loading schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Schema completion API for IntelliSense
    this.app.get('/api/schema/completion', async (_req, res) => {
      try {
        const schemaPath = path.join(process.cwd(), 'zosql.schema.js');
        
        if (fs.existsSync(schemaPath)) {
          // Use dynamic import for ES modules
          const schemaModule = await import(schemaPath);
          const schema = schemaModule.default || schemaModule;
          
          // Format for IntelliSense completion
          const tables = schema.tables.map((t: any) => t.name);
          const columns: any = {};
          schema.tables.forEach((table: any) => {
            columns[table.name] = table.columns.map((col: any) => col.name);
          });
          
          this.log(`[SCHEMA-COMPLETION] Provided ${tables.length} tables for IntelliSense`);
          
          res.json({
            success: true,
            tables,
            columns,
            functions: schema.functions
          });
        } else {
          this.log(`[SCHEMA-COMPLETION] Schema file not found`);
          res.json({ success: false, error: 'Schema file not found' });
        }
      } catch (error) {
        this.log(`[SCHEMA-COMPLETION] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // SQL parsing API for syntax checking with detailed alias logging
    this.app.post('/api/parse-sql', async (_req, res) => {
      try {
        const { sql } = _req.body;
        if (!sql) {
          res.status(400).json({ success: false, error: 'SQL is required' });
          return;
        }

        this.log(`[PARSE-SQL] Parsing SQL (length: ${sql.length}): "${sql}"`);
        this.log(`[PARSE-SQL] SQL lines: ${sql.split('\n').map((line: string, i: number) => `${i+1}: "${line}"`).join(' | ')}`);

        // Use rawsql-ts to parse SQL (dynamic import for ES modules)
        const { SelectQueryParser, SelectableColumnCollector } = await import('rawsql-ts');
        
        try {
          const query = SelectQueryParser.parse(sql);
          this.log(`[PARSE-SQL] Parse successful`);
          this.log(`[PARSE-SQL] Query type: ${query.constructor.name}`);
          
          // Extract table information with aliases for IntelliSense
          const tables: any[] = [];
          
          // Convert to SimpleSelectQuery if needed (for WITH clause support)
          let queryAny = query as any;
          if (query.constructor.name !== 'SimpleSelectQuery') {
            this.log(`[PARSE-SQL] Converting to SimpleSelectQuery`);
            queryAny = query.toSimpleQuery();
            this.log(`[PARSE-SQL] Converted query type: ${queryAny.constructor.name}`);
          }
          this.log(`[PARSE-SQL] Full query object keys: ${Object.keys(queryAny)}`);
          this.log(`[PARSE-SQL] Query structure: ${JSON.stringify({
            hasFromClause: !!queryAny.fromClause,
            fromClauseType: queryAny.fromClause?.constructor?.name,
            fromClauseTables: queryAny.fromClause?.tables?.length || 0,
            fromClauseStructure: queryAny.fromClause ? Object.keys(queryAny.fromClause) : null,
            hasWithClause: !!queryAny.withClause,
            withClauseStructure: queryAny.withClause ? Object.keys(queryAny.withClause) : null
          })}`);
          
          // Detailed fromClause investigation
          if (queryAny.fromClause) {
            this.log(`[PARSE-SQL] fromClause full structure: ${JSON.stringify(queryAny.fromClause, null, 2)}`);
          }
          
          // Debug withClause explicitly - SIMPLE VERSION
          this.log(`[PARSE-SQL] withClause check: ${queryAny.withClause ? 'EXISTS' : 'NULL'}`);
          
          if (queryAny.withClause) {
            this.log(`[PARSE-SQL] withClause processing started`);
            this.log(`[PARSE-SQL] withClause has tables: ${!!queryAny.withClause.tables}`);
            this.log(`[PARSE-SQL] withClause tables length: ${queryAny.withClause.tables?.length || 0}`);
          } else {
            this.log(`[PARSE-SQL] withClause is falsy, not processing CTE tables`);
          }
          
          // Extract CTE tables from withClause
          if (queryAny.withClause) {
            this.log(`[PARSE-SQL] withClause structure: ${JSON.stringify(queryAny.withClause, null, 2)}`);
            
            // Check for CTE tables in withClause.tables
            if (queryAny.withClause.tables && Array.isArray(queryAny.withClause.tables)) {
              queryAny.withClause.tables.forEach((cte: any, index: number) => {
                let cteName = null;
                let cteColumns: string[] = [];
                
                // Extract CTE name from aliasExpression
                if (cte.aliasExpression && cte.aliasExpression.table) {
                  cteName = cte.aliasExpression.table.name;
                }
                
                // Extract columns from CTE definition if available
                if (cte.aliasExpression && cte.aliasExpression.columns) {
                  cteColumns = cte.aliasExpression.columns.map((col: any) => col.name || col);
                }
                
                // Use SelectableColumnCollector to extract columns from CTE query
                if (cte.query) {
                  try {
                    const collector = new SelectableColumnCollector();
                    collector.collect(cte.query);
                    const collectedColumns = collector.getValues();
                    
                    this.log(`[PARSE-SQL] CTE ${index} SelectableColumnCollector result: ${JSON.stringify(collectedColumns, null, 2)}`);
                    
                    // Extract column names from collected columns
                    if (collectedColumns && Array.isArray(collectedColumns) && collectedColumns.length > 0) {
                      collectedColumns.forEach((col: any) => {
                        if (col.alias) {
                          cteColumns.push(col.alias);
                        } else if (col.name) {
                          cteColumns.push(col.name);
                        } else if (col.columnName) {
                          cteColumns.push(col.columnName);
                        } else if (typeof col === 'string') {
                          cteColumns.push(col);
                        }
                      });
                    } else {
                      // If SelectableColumnCollector returned empty, use fallback
                      this.log(`[PARSE-SQL] SelectableColumnCollector returned empty for CTE ${index}, using fallback`);
                      throw new Error('Empty collector result, using fallback');
                    }
                  } catch (collectorError) {
                    this.log(`[PARSE-SQL] SelectableColumnCollector failed for CTE ${index}: ${collectorError instanceof Error ? collectorError.message : 'Unknown error'}`);
                    
                    // Fallback to manual extraction
                    if (cte.query.selectClause && cte.query.selectClause.items) {
                      const selectItems = cte.query.selectClause.items;
                      this.log(`[PARSE-SQL] CTE ${index} fallback selectClause.items: ${JSON.stringify(selectItems, null, 2)}`);
                      
                      selectItems.forEach((item: any) => {
                        let columnName = null;
                        
                        // Check identifier first (for "SELECT 1 as value")
                        if (item.identifier && item.identifier.name) {
                          columnName = item.identifier.name;
                        }
                        // Check value.qualifiedName for column references
                        else if (item.value && item.value.qualifiedName && item.value.qualifiedName.name) {
                          columnName = item.value.qualifiedName.name.name;
                        }
                        // Check alias expressions
                        else if (item.aliasExpression && item.aliasExpression.column) {
                          columnName = item.aliasExpression.column.name;
                        }
                        
                        if (columnName) {
                          cteColumns.push(columnName);
                        }
                      });
                    }
                  }
                }
                
                this.log(`[PARSE-SQL] Found CTE ${index}: name="${cteName}", columns=[${cteColumns.join(', ')}]`);
                
                if (cteName) {
                  tables.push({
                    name: cteName,
                    alias: cteName, // CTE name serves as both table name and alias
                    type: 'cte',
                    columns: cteColumns
                  });
                }
              });
            }
          }
          
          // Extract tables from fromClause.source (not fromClause.tables)
          if (queryAny.fromClause && queryAny.fromClause.source) {
            const source = queryAny.fromClause.source;
            if (source.datasource && source.datasource.qualifiedName) {
              const tableName = source.datasource.qualifiedName.name?.name;
              const tableAlias = source.aliasExpression?.table?.name;
              
              this.log(`[PARSE-SQL] Found table: name="${tableName}", alias="${tableAlias}"`);
              
              if (tableName) {
                // Check if this is a CTE table and extract columns
                let isCTE = false;
                let cteColumns: string[] = [];
                
                if (queryAny.withClause && queryAny.withClause.tables) {
                  queryAny.withClause.tables.forEach((cte: any) => {
                    if (cte.aliasExpression && cte.aliasExpression.table && cte.aliasExpression.table.name === tableName) {
                      isCTE = true;
                      
                      // Extract columns from CTE definition
                      if (cte.query && cte.query.selectClause && cte.query.selectClause.items) {
                        cte.query.selectClause.items.forEach((item: any) => {
                          if (item.identifier && item.identifier.name) {
                            cteColumns.push(item.identifier.name);
                          }
                        });
                      }
                    }
                  });
                }
                
                tables.push({
                  name: tableName,
                  alias: tableAlias,
                  type: isCTE ? 'cte' : 'regular',
                  columns: isCTE ? cteColumns : undefined
                });
              }
            }
          }
          
          // Also check for JOIN tables if they exist (corrected to use join.source)
          if (queryAny.fromClause && queryAny.fromClause.joins) {
            queryAny.fromClause.joins.forEach((join: any, index: number) => {
              if (join.source && join.source.datasource && join.source.datasource.qualifiedName) {
                const tableName = join.source.datasource.qualifiedName.name?.name;
                const tableAlias = join.source.aliasExpression?.table?.name;
                
                this.log(`[PARSE-SQL] Found JOIN table ${index}: name="${tableName}", alias="${tableAlias}"`);
                
                if (tableName) {
                  // Check if this is a CTE table and extract columns
                  let isCTE = false;
                  let cteColumns: string[] = [];
                  
                  if (queryAny.withClause && queryAny.withClause.tables) {
                    queryAny.withClause.tables.forEach((cte: any) => {
                      if (cte.aliasExpression && cte.aliasExpression.table && cte.aliasExpression.table.name === tableName) {
                        isCTE = true;
                        
                        // Extract columns from CTE definition
                        if (cte.query && cte.query.selectClause && cte.query.selectClause.items) {
                          cte.query.selectClause.items.forEach((item: any) => {
                            if (item.identifier && item.identifier.name) {
                              cteColumns.push(item.identifier.name);
                            }
                          });
                        }
                      }
                    });
                  }
                  
                  // Only add if not already added (to avoid duplicates)
                  const alreadyExists = tables.some(t => t.name === tableName && t.alias === tableAlias);
                  if (!alreadyExists) {
                    tables.push({
                      name: tableName,
                      alias: tableAlias,
                      type: isCTE ? 'cte' : 'regular',
                      columns: isCTE ? cteColumns : undefined
                    });
                  }
                }
              }
            });
          }
          
          this.log(`[PARSE-SQL] Extracted ${tables.length} tables with aliases: ${JSON.stringify(tables)}`);
          
          res.json({ success: true, query: query, tables: tables });
        } catch (parseError) {
          this.log(`[PARSE-SQL] Parse failed: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
          res.json({ success: false, error: parseError instanceof Error ? parseError.message : 'Parse error' });
        }
      } catch (error) {
        this.log(`[PARSE-SQL] API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Debug IntelliSense API for file logging
    this.app.post('/api/debug-intellisense', (_req, res) => {
      try {
        const debugData = _req.body;
        const timestamp = new Date().toISOString();
        this.log(`[${timestamp}] IntelliSense Event: ${JSON.stringify(debugData, null, 2)}`);
        console.log('[DEBUG] IntelliSense log received:', debugData);
        res.json({ success: true, received: true });
      } catch (error) {
        this.log(`[${new Date().toISOString()}] IntelliSense Debug Error: ${error}`);
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
              
              <h3>Debug Tests</h3>
              <button class="action-button" onclick="testParseCurrentSQL()">Test Parse SQL</button>
              <button class="action-button" onclick="testAliasSearch()">Test Alias Search</button>
              
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
            let lastSuccessfulParseResult = null; // キャッシュ用
            
            function runQuery() {
              const query = editor ? editor.getValue() : 'No editor available';
              alert('Query execution (Phase 1):\\n\\n' + query);
            }
            
            // テスト用：明示的なパース実行
            async function testParseCurrentSQL() {
              if (!editor) {
                alert('Editor not available');
                return;
              }
              
              const sql = editor.getValue();
              console.log('Testing parse for SQL:', sql);
              
              try {
                const response = await fetch('/api/parse-sql', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ sql: sql })
                });
                
                const result = await response.json();
                console.log('Parse test result:', result);
                
                let message = \`Parse Result:\\n\`;
                message += \`Success: \${result.success}\\n\`;
                if (result.success) {
                  message += \`Tables found: \${result.tables.length}\\n\`;
                  result.tables.forEach((table, i) => {
                    message += \`  \${i+1}. \${table.name} AS \${table.alias || 'no alias'}\\n\`;
                  });
                } else {
                  message += \`Error: \${result.error}\\n\`;
                }
                
                alert(message);
              } catch (error) {
                console.error('Parse test failed:', error);
                alert('Parse test failed: ' + error.message);
              }
            }
            
            // テスト用：エイリアス検索
            async function testAliasSearch() {
              const alias = prompt('Enter alias to search for (e.g., "o"):');
              if (!alias) return;
              
              if (!lastSuccessfulParseResult) {
                alert('No successful parse result available. Please test parse first.');
                return;
              }
              
              const tableName = findTableByAlias(lastSuccessfulParseResult, alias);
              const message = \`Alias search result:\\n\` +
                \`Alias: \${alias}\\n\` +
                \`Found table: \${tableName || 'not found'}\\n\` +
                \`Available aliases: \${lastSuccessfulParseResult.tables.map(t => t.alias).filter(a => a).join(', ') || 'none'}\`;
              
              alert(message);
            }
            
            // Load and display schema information
            async function loadSchemaInfo() {
              try {
                logToServer('Schema loading attempt');
                const response = await fetch('/api/schema');
                const data = await response.json();
                
                logToServer('Schema response received', {
                  success: data.success,
                  error: data.error,
                  hasSchema: !!data.schema,
                  tablesCount: data.schema?.tables?.length || 0
                });
                
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
                  logToServer('Schema UI updated successfully');
                } else {
                  document.getElementById('schema-info').innerHTML = 
                    '<div style="color: red;">Failed to load schema</div>';
                  logToServer('Schema load failed', { error: data.error });
                }
              } catch (error) {
                console.error('Error loading schema:', error);
                document.getElementById('schema-info').innerHTML = 
                  '<div style="color: red;">Error loading schema</div>';
                logToServer('Schema load error', { error: error.message });
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
                    value: \`SELECT o.user_id FROM orders AS o\`,
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
                  
                  // Add manual IntelliSense trigger (Ctrl+Space)
                  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, function() {
                    editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
                  });
                  
                  // Setup comprehensive logging
                  setupLogging();
                  
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
            
            // Helper function to find table name by alias (with CTE support)
            function findTableByAlias(parseResult, alias) {
              try {
                console.log('Finding table by alias:', alias);
                console.log('parseResult:', parseResult);
                if (!parseResult || !parseResult.tables) {
                  console.log('No parseResult or tables');
                  return null;
                }
                
                console.log('Available tables:', parseResult.tables);
                
                // Find table by alias (includes CTE tables)
                for (const table of parseResult.tables) {
                  console.log('Checking table:', table, 'alias:', table.alias, 'type:', table.type);
                  if (table.alias && table.alias.toLowerCase() === alias.toLowerCase()) {
                    console.log('Found matching table:', table.name, 'type:', table.type || 'regular');
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
            
            // Helper function to find table object by alias (returns full table object)
            function findTableObjectByAlias(parseResult, alias) {
              try {
                if (!parseResult || !parseResult.tables) {
                  return null;
                }
                
                for (const table of parseResult.tables) {
                  if (table.alias && table.alias.toLowerCase() === alias.toLowerCase()) {
                    return table;
                  }
                }
                
                return null;
              } catch (error) {
                console.error('Error finding table object by alias:', error);
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
            
            // 包括的なログ機能
            function logToServer(message, data = {}) {
              const logData = {
                message: message,
                timestamp: new Date().toISOString(),
                data: data
              };
              
              fetch('/api/debug-intellisense', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
              }).then(response => {
                console.log('Log sent:', message);
                return response.json();
              }).then(result => {
                console.log('Log response:', result);
              }).catch(err => {
                console.error('Log failed:', err);
              });
            }
            
            function setupLogging() {
              // エディタの基本イベントをログ
              editor.onDidChangeModelContent(() => {
                const content = editor.getValue();
                logToServer('Editor content changed', { 
                  length: content.length,
                  lines: content.split('\\n').length
                });
              });
              
              // カーソル位置変更をログ
              editor.onDidChangeCursorPosition((e) => {
                logToServer('Cursor position changed', {
                  line: e.position.lineNumber,
                  column: e.position.column,
                  reason: e.reason
                });
              });
              
              // キー入力をログ
              editor.onKeyDown((e) => {
                logToServer('Key pressed', {
                  key: e.keyCode,
                  code: e.code,
                  ctrlKey: e.ctrlKey,
                  altKey: e.altKey
                });
              });
              
              logToServer('Logging setup completed');
            }

            function setupSQLIntelliSense() {
              // Register SQL completion provider with trigger characters
              monaco.languages.registerCompletionItemProvider('sql', {
                triggerCharacters: ['.', ' '],
                provideCompletionItems: function (model, position) {
                  console.log('=== IntelliSense TRIGGERED ===');
                  console.log('Position:', position);
                  
                  // 即座にログを送信
                  logToServer('IntelliSense provider triggered', {
                    position: {
                      line: position.lineNumber,
                      column: position.column
                    },
                    modelUri: model.uri.toString()
                  });
                  
                  // 即座にデバッグパネルを更新
                  updateDebugPanel({
                    textBeforeCursor: 'TRIGGERED at ' + new Date().toLocaleTimeString(),
                    periodMatch: null,
                    alias: 'TEST',
                    schemaTables: 'IntelliSense called',
                    parseSuccess: true,
                    error: null,
                    availableColumns: 'Checking...'
                  });
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
                      
                      // 詳細ログを送信
                      logToServer('IntelliSense detailed analysis', {
                        position: { line: position.lineNumber, column: position.column },
                        textBeforeCursor: textBeforeCursor,
                        fullLine: model.getLineContent(position.lineNumber)
                      });
                      
                      // Send debug info to server for logging (同期的に送信)
                      try {
                        fetch('/api/debug-intellisense', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            textBeforeCursor: textBeforeCursor,
                            position: { lineNumber: position.lineNumber, column: position.column },
                            timestamp: new Date().toISOString(),
                            trigger: 'intellisense-call'
                          })
                        });
                        console.log('Debug info sent to server');
                      } catch (err) {
                        console.error('Debug request failed:', err);
                      }
                      
                      // Check if we're being triggered by a dot
                      const charBeforeCursor = position.column > 1 ? 
                        model.getValueInRange({
                          startLineNumber: position.lineNumber,
                          startColumn: position.column - 1,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column
                        }) : '';
                      
                      console.log('Character before cursor:', JSON.stringify(charBeforeCursor));
                      
                      // エイリアス検出の改善版
                      let periodMatch = null;
                      
                      // 1. ドット入力直後のケース
                      if (charBeforeCursor === '.') {
                        const textUpToDot = model.getValueInRange({
                          startLineNumber: position.lineNumber,
                          startColumn: 1,
                          endLineNumber: position.lineNumber,
                          endColumn: position.column - 1
                        });
                        console.log('Text up to dot:', JSON.stringify(textUpToDot));
                        
                        const aliasMatch = textUpToDot.match(/([a-zA-Z0-9_]+)$/);
                        if (aliasMatch) {
                          periodMatch = [aliasMatch[0] + '.', aliasMatch[1], ''];
                          console.log('Found alias before dot:', aliasMatch[1]);
                        }
                      } 
                      // 2. 既にドットが含まれているケース
                      else {
                        periodMatch = textBeforeCursor.match(/([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]*)$/);
                        if (periodMatch) {
                          console.log('Found existing dot pattern:', periodMatch);
                        }
                      }
                      
                      // 3. フォールバック: より広範囲での検索
                      if (!periodMatch) {
                        // 現在行全体を確認
                        const fullLine = model.getLineContent(position.lineNumber);
                        const beforeCursor = fullLine.substring(0, position.column - 1);
                        periodMatch = beforeCursor.match(/([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]*)$/);
                        if (periodMatch) {
                          console.log('Found fallback pattern:', periodMatch);
                        }
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
                        
                        // Parse SQL using rawsql-ts - with improved caching logic
                        const fullText = model.getValue();
                        let tableName = null;
                        
                        // 詳細ログ: 現在のSQL全文とパース実行タイミング
                        logToServer('SQL parsing attempt', {
                          trigger: 'IntelliSense-alias-detection',
                          fullSQL: fullText.substring(0, 200) + (fullText.length > 200 ? '...' : ''),
                          fullSQLLength: fullText.length,
                          alias: alias,
                          hasLastSuccessfulParse: !!lastSuccessfulParseResult,
                          lineCount: fullText.split('\\n').length
                        });
                        
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
                          
                          // 詳細ログ: パース結果
                          logToServer('Parse result received', {
                            success: parseResult.success,
                            tablesCount: parseResult.tables ? parseResult.tables.length : 0,
                            tables: parseResult.tables,
                            error: parseResult.error,
                            alias: alias,
                            position: { line: position.lineNumber, column: position.column }
                          });
                          
                          if (parseResult.success) {
                            // 成功した場合はキャッシュを完全に洗い替え
                            lastSuccessfulParseResult = parseResult;
                            lastValidQuery = parseResult;
                            
                            console.log('Parse successful - cache refreshed completely');
                            console.log('Calling findTableByAlias with fresh parse result:', {
                              parseResult: parseResult,
                              tables: parseResult.tables,
                              alias: alias
                            });
                            // 新しいパース結果のみを使用（キャッシュは使わない）
                            tableName = findTableByAlias(parseResult, alias);
                            debugInfo.parseSuccess = true;
                            
                            logToServer('Using fresh parse result (cache refreshed)', {
                              alias: alias,
                              foundTableName: tableName,
                              availableTables: parseResult.tables,
                              cacheCleared: true
                            });
                          } else {
                            // パース失敗時は最後に成功したキャッシュを使用
                            if (lastSuccessfulParseResult) {
                              console.log('Parse failed, using cached result');
                              tableName = findTableByAlias(lastSuccessfulParseResult, alias);
                              debugInfo.error = 'Using cached parse result';
                              
                              logToServer('Using cached parse result', {
                                alias: alias,
                                foundTableName: tableName,
                                cachedTables: lastSuccessfulParseResult.tables,
                                parseError: parseResult.error
                              });
                            } else {
                              debugInfo.error = 'No cached parse result available';
                              logToServer('No parse result available', {
                                parseError: parseResult.error
                              });
                            }
                          }
                          
                          debugInfo.tableName = tableName;
                          console.log('Table name from parser:', tableName);
                          console.log('Available columns for table:', tableName ? data.columns[tableName] : 'none');
                        } catch (error) {
                          console.error('Error parsing SQL:', error);
                          debugInfo.error = error.message;
                          
                          // ネットワークエラー等でも、キャッシュがあれば使用
                          if (lastSuccessfulParseResult) {
                            tableName = findTableByAlias(lastSuccessfulParseResult, alias);
                            debugInfo.tableName = tableName;
                            
                            logToServer('Network error, using cached result', {
                              error: error.message,
                              alias: alias,
                              foundTableName: tableName
                            });
                          } else {
                            logToServer('Network error, no cache available', {
                              error: error.message
                            });
                          }
                        }
                        
                        // If we found the table, show only its columns
                        if (tableName) {
                          let columns = [];
                          
                          // Check if it's a CTE table with columns in parse result
                          const parseResult = lastSuccessfulParseResult || (parseResult && parseResult.success ? parseResult : null);
                          if (parseResult) {
                            const tableObject = findTableObjectByAlias(parseResult, alias);
                            if (tableObject && tableObject.type === 'cte' && tableObject.columns && tableObject.columns.length > 0) {
                              columns = tableObject.columns;
                              console.log('Using CTE columns:', columns);
                            } else if (data.columns[tableName]) {
                              columns = data.columns[tableName];
                              console.log('Using schema columns:', columns);
                            }
                          } else if (data.columns[tableName]) {
                            columns = data.columns[tableName];
                            console.log('Using schema columns (fallback):', columns);
                          }
                          
                          if (columns.length > 0) {
                            debugInfo.availableColumns = columns.join(', ');
                            console.log('Columns for table:', columns);
                            columns.forEach(column => {
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
                        } else {
                          debugInfo.availableColumns = 'no table found';
                          console.log('No table found for alias:', alias);
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
                  
                  // Update cache if parse was successful
                  if (parseResult.success) {
                    lastSuccessfulParseResult = parseResult;
                    console.log('Cache updated from validation:', parseResult.tables?.length || 0, 'tables');
                  }
                  
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
              
              // Initial validation and parse cache setup
              validateSQL(editor.getModel());
              
              // 初期状態で基本的なSQLをパースしてキャッシュを生成
              try {
                const initialSQL = editor.getValue();
                fetch('/api/parse-sql', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ sql: initialSQL })
                })
                .then(response => response.json())
                .then(parseResult => {
                  if (parseResult.success) {
                    lastSuccessfulParseResult = parseResult;
                    console.log('Initial parse cache established:', parseResult.tables);
                    logToServer('Initial parse cache established', {
                      tablesFound: parseResult.tables.length,
                      tables: parseResult.tables
                    });
                  }
                })
                .catch(err => {
                  console.error('Initial parse failed:', err);
                });
              } catch (error) {
                console.error('Initial parse setup failed:', error);
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
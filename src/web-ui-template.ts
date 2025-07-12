export function getHtmlTemplate(host: string, port: number): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>zosql Browser</title>
      <style>
        ${getCssStyles()}
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
          <button class="action-button" onclick="runQuery()">Run Query (Ctrl+Enter)</button>
          <button class="action-button secondary" onclick="resetDatabase()">Reset Database</button>
          
          <h3>Debug Tests</h3>
          <button class="action-button" onclick="testParseCurrentSQL()">Test Parse SQL</button>
          <button class="action-button" onclick="testAliasSearch()">Test Alias Search</button>
          
          <h3>IntelliSense Tests</h3>
          <button class="action-button" onclick="testFromClauseContext()">Test FROM Context</button>
          <button class="action-button" onclick="testAliasCompletion()">Test Alias Completion</button>
          <button class="action-button" onclick="testPrivateResourceCompletion()">Test Private Resources</button>
          <button class="action-button" onclick="analyzeIntelliSenseIssues()">Analyze Issues</button>
          
          <h3>Public Resources</h3>
          <div id="public-schema-info" class="schema-section" style="font-size: 12px; margin-top: 10px;">
            <div>Loading public schema...</div>
          </div>
          
          <h3>Private Resources</h3>
          <div id="private-schema-info" class="schema-section" style="font-size: 12px; margin-top: 10px;">
            <div>Loading private schema...</div>
          </div>
          
          <h3>IntelliSense Debug</h3>
          <div id="intellisense-debug" style="font-size: 11px; margin-top: 10px; max-height: 200px; overflow-y: auto;">
            <div>Waiting for SQL input...</div>
          </div>
          
          <h3>Development Info</h3>
          <div style="font-size: 12px; margin-top: 10px;">
            <div>Server: ${host}:${port}</div>
            <div>Started: ${new Date().toLocaleString()}</div>
            <div>Monaco Editor: Loading...</div>
            <div>PGlite: <span id="pglite-status">Initializing...</span></div>
          </div>
        </div>
        
        <div class="content-area">
          <div class="editor-container">
            <div class="editor-header">
              📄 main.sql
            </div>
            <div id="editor"></div>
          </div>
          
          <div class="results-container">
            <div class="results-header">
              <div>📊 Query Results</div>
              <div class="execution-info" id="execution-info"></div>
            </div>
            <div class="results-content" id="results-content">
              <div style="color: #666; text-align: center; padding: 40px;">
                Run a query to see results here
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        ${getJavaScriptCode()}
      </script>
    </body>
    </html>
  `;
}

function getCssStyles(): string {
  return `
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
      overflow-y: auto;
    }
    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 50%;
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
    .action-button:disabled {
      background: #555;
      cursor: not-allowed;
    }
    .action-button.secondary {
      background: #3e3e42;
    }
    .action-button.secondary:hover {
      background: #4e4e52;
    }
    .results-container {
      height: 300px;
      display: flex;
      flex-direction: column;
      border-top: 2px solid #3e3e42;
    }
    .results-header {
      background: #2d2d30;
      padding: 10px 20px;
      border-bottom: 1px solid #3e3e42;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .results-content {
      flex: 1;
      overflow: auto;
      padding: 10px;
      background: #1e1e1e;
    }
    .results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .results-table th {
      background: #383838;
      color: #cccccc;
      padding: 8px;
      text-align: left;
      border: 1px solid #555;
      font-weight: normal;
    }
    .results-table td {
      padding: 6px 8px;
      border: 1px solid #3e3e42;
    }
    .results-table tr:nth-child(even) {
      background: #252526;
    }
    .execution-info {
      font-size: 11px;
      color: #888;
    }
    .error-message {
      color: #f48771;
      font-family: monospace;
      font-size: 13px;
      padding: 10px;
      background: #2d1b1b;
      border: 1px solid #5a3232;
      border-radius: 3px;
    }
    .schema-section {
      max-height: 200px;
      overflow-y: auto;
    }
    .public-resource {
      background: rgba(0,122,204,0.1);
      border-left: 3px solid #007acc;
    }
    .private-resource {
      background: rgba(255,165,0,0.1);
      border-left: 3px solid #ffa500;
    }
  `;
}

function getJavaScriptCode(): string {
  return `
    let editor = null;
    let schemaData = null;
    let privateSchemaData = null;
    let lastValidQuery = null;
    let currentSchemaData = null;
    let lastSuccessfulParseResult = null; // キャッシュ用
    
    ${helperFunctions()}
    ${monacoEditorIntegration()}
    ${schemaManagement()}
    ${intelliSenseSetup()}
    
    // Check database status
    async function checkDatabaseStatus() {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        if (data.status === 'ok') {
          document.getElementById('pglite-status').textContent = 'Ready';
          document.getElementById('pglite-status').style.color = '#4caf50';
        }
      } catch (error) {
        document.getElementById('pglite-status').textContent = 'Error';
        document.getElementById('pglite-status').style.color = '#f48771';
      }
    }
    
    // Load private schema information
    async function loadPrivateSchemaInfo() {
      try {
        logToServer('Private schema loading attempt');
        const response = await fetch('/api/private-schema');
        const data = await response.json();
        
        logToServer('Private schema response received', {
          success: data.success,
          error: data.error,
          hasPrivateSchema: !!data.privateSchema,
          resourcesCount: data.privateSchema ? Object.keys(data.privateSchema).length : 0
        });
        
        if (data.success && data.privateSchema) {
          privateSchemaData = data.privateSchema;
          console.log('Private schema loaded successfully:', privateSchemaData);
          logToServer('Private schema loaded successfully', {
            resourcesCount: Object.keys(privateSchemaData).length
          });
        } else {
          logToServer('Private schema load failed', { error: data.error });
        }
      } catch (error) {
        console.error('Error loading private schema:', error);
        logToServer('Private schema load error', { error: error.message });
      }
    }
    
    // Initialize everything when page loads
    document.addEventListener('DOMContentLoaded', function() {
      loadSchemaInfo();
      loadPrivateSchemaInfo();
      initMonacoEditor();
      checkDatabaseStatus();
    });
  `;
}

function helperFunctions(): string {
  return `
    let isQueryRunning = false;
    
    async function runQuery() {
      if (isQueryRunning || !editor) return;
      
      const query = editor.getValue();
      if (!query.trim()) {
        showError('Please enter a SQL query');
        return;
      }
      
      isQueryRunning = true;
      const button = document.querySelector('button[onclick="runQuery()"]');
      button.disabled = true;
      button.textContent = 'Running...';
      
      const resultsContent = document.getElementById('results-content');
      const executionInfo = document.getElementById('execution-info');
      
      resultsContent.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">Executing query...</div>';
      executionInfo.textContent = '';
      
      try {
        const response = await fetch('/api/execute-query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql: query })
        });
        
        const data = await response.json();
        
        if (data.success) {
          displayResults(data.result);
          executionInfo.textContent = \`Executed in \${data.result.executionTime}ms | \${data.result.rows.length} rows\`;
        } else {
          showError(data.error);
        }
      } catch (error) {
        showError('Failed to execute query: ' + error.message);
      } finally {
        isQueryRunning = false;
        button.disabled = false;
        button.textContent = 'Run Query (Ctrl+Enter)';
      }
    }
    
    function displayResults(result) {
      const resultsContent = document.getElementById('results-content');
      
      if (!result.rows || result.rows.length === 0) {
        resultsContent.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">Query executed successfully but returned no rows</div>';
        return;
      }
      
      // Get column names
      const columns = Object.keys(result.rows[0]);
      
      // Build table HTML
      let html = '<table class="results-table">';
      
      // Header
      html += '<thead><tr>';
      columns.forEach(col => {
        html += \`<th>\${escapeHtml(col)}</th>\`;
      });
      html += '</tr></thead>';
      
      // Body
      html += '<tbody>';
      result.rows.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
          const value = row[col];
          const displayValue = value === null ? '<span style="color: #666;">NULL</span>' : 
                             value === '' ? '<span style="color: #666;">[empty]</span>' : 
                             escapeHtml(String(value));
          html += \`<td>\${displayValue}</td>\`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      
      resultsContent.innerHTML = html;
    }
    
    function showError(message) {
      const resultsContent = document.getElementById('results-content');
      resultsContent.innerHTML = \`<div class="error-message">\${escapeHtml(message)}</div>\`;
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    async function resetDatabase() {
      if (!confirm('This will reset the database to its initial state. All data will be lost. Continue?')) {
        return;
      }
      
      try {
        const response = await fetch('/api/reset-database', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          alert('Database reset successfully');
          const resultsContent = document.getElementById('results-content');
          resultsContent.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">Database has been reset</div>';
        } else {
          alert('Failed to reset database: ' + data.error);
        }
      } catch (error) {
        alert('Failed to reset database: ' + error.message);
      }
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
    
    // IntelliSense Test Functions
    async function testFromClauseContext() {
      if (!editor) {
        alert('Editor not available');
        return;
      }
      
      const testCases = [
        'SELECT * FROM ',
        'SELECT * FROM user',
        'SELECT * FROM users u INNER JOIN ',
        'SELECT * FROM users u LEFT JOIN ord',
        'SELECT * FROM users WHERE id = 1'
      ];
      
      let results = 'FROM Clause Context Test Results:\\n\\n';
      
      for (const [index, testSql] of testCases.entries()) {
        const position = { lineNumber: 1, column: testSql.length + 1 };
        const isFromContext = checkFromClauseContext(testSql, position);
        results += \`\${index + 1}. "\${testSql}"\\n\`;
        results += \`   Context: \${isFromContext ? 'FROM clause' : 'Normal'}\\n\\n\`;
      }
      
      alert(results);
    }
    
    async function testAliasCompletion() {
      if (!editor) {
        alert('Editor not available');
        return;
      }
      
      // Test the current SQL in editor for alias completion
      const sql = editor.getValue();
      const position = editor.getPosition();
      
      if (!position) {
        alert('Cannot get cursor position');
        return;
      }
      
      try {
        // Get text before cursor
        const textBeforeCursor = editor.getModel().getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        
        const charBeforeCursor = position.column > 1 ? 
          editor.getModel().getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column - 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          }) : '';
        
        // Test alias extraction
        const aliasMatch = extractAliasFromText(textBeforeCursor, charBeforeCursor);
        
        let message = \`Alias Completion Test:\\n\\n\`;
        message += \`Current SQL: \${sql}\\n\`;
        message += \`Cursor position: Line \${position.lineNumber}, Column \${position.column}\\n\`;
        message += \`Text before cursor: "\${textBeforeCursor}"\\n\`;
        message += \`Char before cursor: "\${charBeforeCursor}"\\n\`;
        message += \`Alias match: \${aliasMatch ? JSON.stringify(aliasMatch) : 'null'}\\n\`;
        
        if (aliasMatch) {
          const alias = aliasMatch[1];
          
          // Test table resolution
          if (lastSuccessfulParseResult) {
            const tableName = findTableByAlias(lastSuccessfulParseResult, alias);
            message += \`Resolved table: \${tableName || 'not found'}\\n\`;
            
            // Test column retrieval
            if (tableName && currentSchemaData) {
              const columns = getColumnsForTable(tableName, alias, lastSuccessfulParseResult, currentSchemaData);
              message += \`Available columns: \${columns.join(', ') || 'none'}\\n\`;
            }
          } else {
            message += \`No parse result available for table resolution\\n\`;
          }
        }
        
        alert(message);
      } catch (error) {
        alert('Alias completion test failed: ' + error.message);
      }
    }
    
    async function testPrivateResourceCompletion() {
      try {
        // Load private resources
        const response = await fetch('/api/private-schema/completion');
        const data = await response.json();
        
        let message = \`Private Resource Completion Test:\\n\\n\`;
        
        if (data.success) {
          message += \`Private tables: \${data.privateTables?.join(', ') || 'none'}\\n\`;
          message += \`Private columns:\\n\`;
          
          Object.entries(data.privateColumns || {}).forEach(([table, columns]) => {
            message += \`  \${table}: \${columns.join(', ')}\\n\`;
          });
          
          message += \`\\nPrivate resources:\\n\`;
          Object.entries(data.privateResources || {}).forEach(([name, resource]) => {
            message += \`  \${name}: \${resource.description || 'No description'}\\n\`;
          });
          
          // Test FROM clause context with private resources
          const testSql = 'SELECT * FROM user_st';
          const position = { lineNumber: 1, column: testSql.length + 1 };
          const isFromContext = checkFromClauseContext(testSql, position);
          
          message += \`\\nFROM context test with "SELECT * FROM user_st": \${isFromContext}\\n\`;
          
        } else {
          message += \`Failed to load private resources: \${data.error}\\n\`;
        }
        
        alert(message);
      } catch (error) {
        alert('Private resource test failed: ' + error.message);
      }
    }
    
    // Helper function to get columns for table (matches intellisense-utils.ts)
    function getColumnsForTable(tableName, alias, parseResult, schemaData) {
      let columns = [];
      
      // Check if it's a CTE or subquery table with columns in parse result
      if (parseResult) {
        const tableObject = findTableObjectByAlias(parseResult, alias);
        if (tableObject && (tableObject.type === 'cte' || tableObject.type === 'subquery') && tableObject.columns && tableObject.columns.length > 0) {
          columns = tableObject.columns;
        } else if (schemaData.columns && schemaData.columns[tableName]) {
          columns = schemaData.columns[tableName];
        } else {
          // Check if it's a private resource
          const privateResource = schemaData.privateResources && schemaData.privateResources[tableName];
          if (privateResource && privateResource.columns) {
            columns = privateResource.columns.map(col => col.name);
          }
        }
      } else {
        // Check private resources first when no parse result
        const privateResource = schemaData.privateResources && schemaData.privateResources[tableName];
        if (privateResource && privateResource.columns) {
          columns = privateResource.columns.map(col => col.name);
        } else if (schemaData.columns && schemaData.columns[tableName]) {
          columns = schemaData.columns[tableName];
        }
      }
      
      return columns;
    }
    
    async function analyzeIntelliSenseIssues() {
      try {
        const response = await fetch('/api/intellisense-debug/analyze');
        const data = await response.json();
        
        if (data.success) {
          let message = 'IntelliSense Issues Analysis:\\n\\n';
          
          const analysis = data.analysis;
          message += \`Total recent logs: \${analysis.totalLogs}\\n\`;
          message += \`Successful alias detections: \${analysis.successfulAliasDetections}\\n\`;
          message += \`Failed alias detections: \${analysis.failedAliasDetections}\\n\`;
          message += \`SQL parse successes: \${analysis.sqlParseSuccesses}\\n\`;
          message += \`SQL parse failures: \${analysis.sqlParseFailures}\\n\`;
          message += \`Column resolution successes: \${analysis.columnResolutionSuccesses}\\n\`;
          message += \`Column resolution failures: \${analysis.columnResolutionFailures}\\n\\n\`;
          
          if (analysis.commonIssues.length > 0) {
            message += 'Common Issues:\\n';
            analysis.commonIssues.forEach((issue, i) => {
              message += \`\${i + 1}. \${issue}\\n\`;
            });
            message += '\\n';
          }
          
          if (analysis.suggestions.length > 0) {
            message += 'Suggestions:\\n';
            analysis.suggestions.forEach((suggestion, i) => {
              message += \`\${i + 1}. \${suggestion}\\n\`;
            });
          }
          
          alert(message);
        } else {
          alert('Failed to analyze IntelliSense issues: ' + data.error);
        }
      } catch (error) {
        alert('Error analyzing IntelliSense issues: ' + error.message);
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
    
    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    // Import utility functions for IntelliSense
    // Note: In production, these would be imported from the utils module
    function checkFromClauseContext(fullText, position) {
      try {
        // Get text up to current position
        const lines = fullText.split('\\n');
        let textUpToPosition = '';
        
        for (let i = 0; i < position.lineNumber; i++) {
          if (i < position.lineNumber - 1) {
            textUpToPosition += lines[i] + '\\n';
          } else {
            textUpToPosition += lines[i].substring(0, position.column - 1);
          }
        }
        
        // Remove comments and strings to avoid false positives
        const cleanedText = textUpToPosition
          .replace(/--.*$/gm, '') // Remove line comments
          .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '') // Remove block comments
          .replace(/'[^']*'/g, "''") // Remove string literals
          .replace(/"[^"]*"/g, '""'); // Remove quoted identifiers
        
        console.log('FROM context check - cleanedText:', JSON.stringify(cleanedText));
        
        // Check if we're in a FROM clause context - more flexible patterns
        const fromPattern = /\\bFROM\\s*$/i;
        const joinPattern = /\\b(?:INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+JOIN|JOIN)\\s*$/i;
        
        // Also check for incomplete table names after FROM
        const fromTablePattern = /\\bFROM\\s+\\w*$/i;
        const joinTablePattern = /\\b(?:INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+JOIN|JOIN)\\s+\\w*$/i;
        
        const isFromContext = fromPattern.test(cleanedText) || 
                            joinPattern.test(cleanedText) ||
                            fromTablePattern.test(cleanedText) ||
                            joinTablePattern.test(cleanedText);
        
        console.log('FROM patterns test:', {
          fromPattern: fromPattern.test(cleanedText),
          joinPattern: joinPattern.test(cleanedText),
          fromTablePattern: fromTablePattern.test(cleanedText),
          joinTablePattern: joinTablePattern.test(cleanedText),
          result: isFromContext
        });
        
        return isFromContext;
      } catch (error) {
        console.error('Error checking FROM clause context:', error);
        return false;
      }
    }
    
    // IntelliSense debug logging function
    function sendIntelliSenseDebugLog(phase, data, error = null) {
      try {
        fetch('/api/intellisense-debug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phase: phase,
            data: data,
            error: error
          })
        }).catch(err => {
          console.error('Failed to send IntelliSense debug log:', err);
        });
      } catch (err) {
        console.error('Error in sendIntelliSenseDebugLog:', err);
      }
    }
    
    // Utility function for extracting alias from text (matches intellisense-utils.ts)
    function extractAliasFromText(textBeforeCursor, charBeforeCursor) {
      let periodMatch = null;

      // 1. ドット入力直後のケース
      if (charBeforeCursor === '.') {
        const aliasMatch = textBeforeCursor.match(/([a-zA-Z0-9_]+)$/);
        if (aliasMatch) {
          periodMatch = [aliasMatch[0] + '.', aliasMatch[1], ''];
        }
      } 
      // 2. 既にドットが含まれているケース
      else {
        const match = textBeforeCursor.match(/([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]*)$/);
        if (match) {
          periodMatch = [match[0], match[1], match[2]];
        }
      }
      
      return periodMatch;
    }
  `;
}

function schemaManagement(): string {
  return `
    // Load and display schema information (both public and private)
    async function loadSchemaInfo() {
      try {
        logToServer('Schema loading attempt');
        
        // Load both public and private schema concurrently
        const [publicResponse, privateResponse] = await Promise.all([
          fetch('/api/schema'),
          fetch('/api/private-schema')
        ]);
        
        const publicData = await publicResponse.json();
        const privateData = await privateResponse.json();
        
        logToServer('Schema responses received', {
          publicSuccess: publicData.success,
          privateSuccess: privateData.success,
          publicTablesCount: publicData.schema?.tables?.length || 0,
          privateResourcesCount: Object.keys(privateData.privateSchema || {}).length
        });
        
        // Display public schema
        if (publicData.success) {
          const publicSchemaInfo = document.getElementById('public-schema-info');
          let publicHtml = '';
          
          publicData.schema.tables.forEach(table => {
            publicHtml += \`<div style="margin-bottom: 10px; padding: 5px; background: rgba(0,122,204,0.1); border-radius: 3px;">
              <strong style="color: #007acc;">\${table.name}</strong><br>
              \${table.columns.map(col => \`<span style="color: #9cdcfe;">• \${col.name}</span>\`).join('<br>')}
            </div>\`;
          });
          
          publicSchemaInfo.innerHTML = publicHtml;
          console.log('Public schema loaded successfully');
        } else {
          document.getElementById('public-schema-info').innerHTML = 
            '<div style="color: red;">Failed to load public schema</div>';
        }
        
        // Display private schema
        if (privateData.success && privateData.privateSchema) {
          const privateSchemaInfo = document.getElementById('private-schema-info');
          let privateHtml = '';
          
          Object.values(privateData.privateSchema).forEach(resource => {
            privateHtml += \`<div style="margin-bottom: 10px; padding: 5px; background: rgba(255,165,0,0.1); border-radius: 3px;">
              <strong style="color: #ffa500;">\${resource.name}</strong><br>
              <small style="color: #808080;">\${resource.description || 'No description'}</small><br>
              \${resource.columns.map(col => \`<span style="color: #dcdcaa;">• \${col.name} (\${col.type})</span>\`).join('<br>')}
            </div>\`;
          });
          
          privateSchemaInfo.innerHTML = privateHtml;
          console.log('Private schema loaded successfully');
        } else {
          document.getElementById('private-schema-info').innerHTML = 
            '<div style="color: #808080;">No private resources found</div>';
        }
        
        logToServer('Schema UI updated successfully');
      } catch (error) {
        console.error('Error loading schema:', error);
        document.getElementById('public-schema-info').innerHTML = 
          '<div style="color: red;">Error loading public schema</div>';
        document.getElementById('private-schema-info').innerHTML = 
          '<div style="color: red;">Error loading private schema</div>';
        logToServer('Schema load error', { error: error.message });
      }
    }
  `;
}

function monacoEditorIntegration(): string {
  return `
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
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function() {
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
  `;
}

function intelliSenseSetup(): string {
  return `
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
              // Enhanced logging for IntelliSense trigger
              console.log('=== INTELLISENSE DETAILED LOG START ===');
              console.log('Trigger timestamp:', new Date().toISOString());
              const startData = {
                lineNumber: position.lineNumber,
                column: position.column,
                modelUri: model.uri.toString(),
                timestamp: new Date().toISOString()
              };
              console.log('Position details:', startData);
              
              // Send to debug API
              sendIntelliSenseDebugLog('INTELLISENSE_START', startData);
              
              // Load both public and private schema data
              const [publicResponse, privateResponse] = await Promise.all([
                fetch('/api/schema/completion'),
                fetch('/api/private-schema/completion')
              ]);
              
              const publicData = await publicResponse.json();
              const privateData = await privateResponse.json();
              
              console.log('Schema data loaded:', {
                publicSuccess: publicData.success,
                privateSuccess: privateData.success,
                publicTables: publicData.tables?.length || 0,
                privateTables: privateData.privateTables?.length || 0,
                publicColumns: Object.keys(publicData.columns || {}).length,
                privateColumns: Object.keys(privateData.privateColumns || {}).length
              });
              
              // Combine public and private schema data
              const combinedData = {
                success: publicData.success,
                tables: [...(publicData.tables || []), ...(privateData.privateTables || [])],
                columns: {...(publicData.columns || {}), ...(privateData.privateColumns || {})},
                functions: publicData.functions || [],
                privateResources: privateData.privateResources || {}
              };
              
              console.log('Combined schema data:', {
                totalTables: combinedData.tables.length,
                tablesArray: combinedData.tables,
                totalColumns: Object.keys(combinedData.columns).length,
                columnsKeys: Object.keys(combinedData.columns),
                privateResourcesCount: Object.keys(combinedData.privateResources).length
              });
              
              currentSchemaData = combinedData; // Store for debug
              
              if (!publicData.success) {
                resolve({ suggestions: [] });
                return;
              }
              
              const data = combinedData;
              
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
              
              // Check if we're in a FROM clause context
              const fullText = model.getValue();
              const isInFromClause = checkFromClauseContext(fullText, position);
              
              // Enhanced text analysis logging
              console.log('=== TEXT ANALYSIS ===');
              console.log('Full SQL text:', JSON.stringify(fullText));
              console.log('Text before cursor:', JSON.stringify(textBeforeCursor));
              console.log('Text length:', textBeforeCursor.length);
              console.log('Position details:', {
                lineNumber: position.lineNumber,
                column: position.column,
                totalLines: fullText.split('\\n').length
              });
              console.log('FROM clause context check:', {
                isInFromClause: isInFromClause,
                fullTextSnippet: fullText.substring(0, 100) + (fullText.length > 100 ? '...' : '')
              });
              
              // OFFLINE DEBUG: Manual analysis for o. case
              if (textBeforeCursor.endsWith('o.') || textBeforeCursor.includes('o.')) {
                console.log('=== DETECTED o. PATTERN ===');
                console.log('This should trigger alias completion for "o"');
                console.log('Expected: Find table "orders" for alias "o"');
                console.log('Expected columns: id, user_id, amount, order_date, status, created_at');
              }
              
              // 詳細ログを送信
              logToServer('IntelliSense detailed analysis', {
                position: { line: position.lineNumber, column: position.column },
                textBeforeCursor: textBeforeCursor,
                fullLine: model.getLineContent(position.lineNumber),
                isInFromClause: isInFromClause
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
              
              console.log('=== ALIAS DETECTION ===');
              console.log('Character before cursor:', JSON.stringify(charBeforeCursor));
              console.log('Character code:', charBeforeCursor.charCodeAt(0) || 'none');
              console.log('Is dot?:', charBeforeCursor === '.');
              
              // Use extracted utility function for alias detection
              let periodMatch = extractAliasFromText(textBeforeCursor, charBeforeCursor);
              const aliasData = {
                textBeforeCursor: textBeforeCursor,
                charBeforeCursor: charBeforeCursor,
                charCode: charBeforeCursor.charCodeAt(0) || null,
                isDot: charBeforeCursor === '.',
                result: periodMatch
              };
              console.log('First alias extraction attempt:', aliasData);
              sendIntelliSenseDebugLog('ALIAS_DETECTION', aliasData);
              
              // Fallback: try with full line if not found
              if (!periodMatch) {
                const fullLine = model.getLineContent(position.lineNumber);
                const beforeCursor = fullLine.substring(0, position.column - 1);
                console.log('Fallback alias extraction:', {
                  fullLine: JSON.stringify(fullLine),
                  beforeCursor: JSON.stringify(beforeCursor),
                  position: position.column - 1
                });
                periodMatch = extractAliasFromText(beforeCursor, '');
                console.log('Fallback result:', periodMatch);
              }
              
              console.log('Final alias match result:', periodMatch);
              
              // Additional debugging for common patterns
              if (textBeforeCursor.includes('.')) {
                console.log('Text contains dot - analyzing patterns:');
                console.log('- Last dot index:', textBeforeCursor.lastIndexOf('.'));
                console.log('- Text after last dot:', textBeforeCursor.substring(textBeforeCursor.lastIndexOf('.') + 1));
                console.log('- Text before last dot:', textBeforeCursor.substring(0, textBeforeCursor.lastIndexOf('.')));
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
                
                console.log('=== SQL PARSING AND TABLE RESOLUTION ===');
                console.log('Found alias:', alias);
                console.log('Period match details:', {
                  fullMatch: periodMatch[0],
                  alias: periodMatch[1], 
                  partialColumn: periodMatch[2] || ''
                });
                
                // Parse SQL using rawsql-ts - with improved caching logic
                const fullText = model.getValue();
                let tableName = null;
                
                console.log('About to parse SQL for table resolution:', {
                  sqlLength: fullText.length,
                  sqlPreview: fullText.substring(0, 200) + (fullText.length > 200 ? '...' : ''),
                  targetAlias: alias
                });
                
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
                    
                    console.log('=== PARSE SUCCESSFUL ===');
                    console.log('Parse result tables:', parseResult.tables);
                    console.log('Looking for alias:', alias);
                    console.log('Available aliases:', parseResult.tables?.map(t => \`\${t.name} AS \${t.alias}\`) || []);
                    
                    // 新しいパース結果のみを使用（キャッシュは使わない）
                    tableName = findTableByAlias(parseResult, alias);
                    debugInfo.parseSuccess = true;
                    
                    console.log('Table resolution result:', {
                      alias: alias,
                      resolvedTableName: tableName,
                      allTables: parseResult.tables
                    });
                    
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
                  
                  console.log('=== COLUMN RESOLUTION ===');
                  console.log('Resolved table name:', tableName);
                  console.log('Available schema data:', {
                    schemaColumns: Object.keys(data.columns || {}),
                    privateResources: Object.keys(data.privateResources || {}),
                    hasParseResult: !!lastSuccessfulParseResult
                  });
                  
                  // Check if it's a CTE or subquery table with columns in parse result
                  const parseResult = lastSuccessfulParseResult || (parseResult && parseResult.success ? parseResult : null);
                  if (parseResult) {
                    console.log('Using parse result for column resolution');
                    const tableObject = findTableObjectByAlias(parseResult, alias);
                    console.log('Table object found:', tableObject);
                    
                    if (tableObject && (tableObject.type === 'cte' || tableObject.type === 'subquery') && tableObject.columns && tableObject.columns.length > 0) {
                      columns = tableObject.columns;
                      console.log('Using CTE/subquery columns:', columns, 'type:', tableObject.type);
                    } else if (data.columns[tableName]) {
                      columns = data.columns[tableName];
                      console.log('Using public schema columns:', columns);
                    } else {
                      // Check if it's a private resource
                      const privateResource = data.privateResources && data.privateResources[tableName];
                      console.log('Checking private resource for table:', tableName, 'found:', !!privateResource);
                      if (privateResource && privateResource.columns) {
                        columns = privateResource.columns.map(col => col.name);
                        console.log('Using private resource columns:', columns);
                      } else {
                        console.log('No columns found - private resource details:', privateResource);
                      }
                    }
                  } else {
                    console.log('No parse result available, using fallback');
                    if (data.columns[tableName]) {
                      columns = data.columns[tableName];
                      console.log('Using schema columns (fallback):', columns);
                    } else {
                      console.log('Table not found in schema columns:', tableName);
                      console.log('Available schema tables:', Object.keys(data.columns || {}));
                    }
                  }
                  
                  console.log('Final columns result:', columns);
                  
                  if (columns.length > 0) {
                    debugInfo.availableColumns = columns.join(', ');
                    console.log('=== SUGGESTIONS GENERATION ===');
                    console.log('Generating', columns.length, 'column suggestions for table:', tableName);
                    
                    columns.forEach((column, index) => {
                      const suggestion = {
                        label: column,
                        kind: monaco.languages.CompletionItemKind.Field,
                        documentation: \`Column: \${column} in table \${tableName} (alias: \${alias})\`,
                        insertText: column,
                        range: range
                      };
                      suggestions.push(suggestion);
                      console.log(\`Suggestion \${index + 1}:\`, suggestion);
                    });
                    
                    console.log('Total suggestions generated:', suggestions.length);
                    updateDebugPanel(debugInfo);
                    console.log('=== RESOLVING WITH SUGGESTIONS ===');
                    resolve({ suggestions });
                    return;
                  } else {
                    debugInfo.availableColumns = 'none found';
                    console.log('=== NO COLUMNS FOUND ===');
                    console.log('No columns found for table:', tableName);
                    console.log('Debug info:', debugInfo);
                  }
                } else {
                  debugInfo.availableColumns = 'no table found';
                  console.log('=== NO TABLE FOUND ===');
                  console.log('No table found for alias:', alias);
                  console.log('Parse result available:', !!lastSuccessfulParseResult);
                  console.log('Debug info:', debugInfo);
                }
                
                updateDebugPanel(debugInfo);
              } else {
                updateDebugPanel(debugInfo);
              }
              
              // If we're in a FROM clause context, only show table names
              if (isInFromClause) {
                // Add table names only (both public and private)
                data.tables.forEach(table => {
                  const isPrivate = data.privateResources && data.privateResources[table];
                  const icon = isPrivate ? '🔒' : '📋';
                  const description = isPrivate ? data.privateResources[table].description : \`Public table: \${table}\`;
                  
                  suggestions.push({
                    label: \`\${icon} \${table}\`,
                    kind: monaco.languages.CompletionItemKind.Class,
                    documentation: description,
                    insertText: table,
                    range: range
                  });
                });
                
                console.log('FROM clause context - showing table names (public + private)');
              } else {
                // Normal IntelliSense - show all items
                
                // Add table names (both public and private)
                data.tables.forEach(table => {
                  const isPrivate = data.privateResources && data.privateResources[table];
                  const icon = isPrivate ? '🔒' : '📋';
                  const description = isPrivate ? data.privateResources[table].description : \`Public table: \${table}\`;
                  
                  suggestions.push({
                    label: \`\${icon} \${table}\`,
                    kind: monaco.languages.CompletionItemKind.Class,
                    documentation: description,
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
              }
              
              console.log('=== FINAL SUGGESTIONS SUMMARY ===');
              console.log('Total suggestions returned:', suggestions.length);
              console.log('Suggestions preview:', suggestions.slice(0, 5).map(s => s.label));
              console.log('=== INTELLISENSE DETAILED LOG END ===');
              
              resolve({ suggestions });
            } catch (error) {
              console.error('=== INTELLISENSE ERROR ===');
              console.error('Error loading completion items:', error);
              console.error('Error stack:', error.stack);
              
              // OFFLINE DEBUG: Error analysis
              console.log('=== ERROR ANALYSIS ===');
              const currentSql = model ? model.getValue() : 'unknown';
              const currentPos = position || { lineNumber: 0, column: 0 };
              
              console.log('SQL at error:', JSON.stringify(currentSql));
              console.log('Position at error:', currentPos);
              console.log('Error type:', error.constructor.name);
              console.log('Error message:', error.message);
              
              if (error.message.includes('Failed to fetch')) {
                console.log('DIAGNOSIS: Server connection failed');
                console.log('SOLUTION: Restart server with "npm run dev web"');
                console.log('OR: Test locally using Test buttons in sidebar');
              } else if (error.message.includes('undefined')) {
                console.log('DIAGNOSIS: Undefined variable or null reference');
                console.log('SOLUTION: Check schema data loading');
              } else {
                console.log('DIAGNOSIS: Unknown error type');
                console.log('SOLUTION: Check browser console for more details');
              }
              
              console.log('=== INTELLISENSE DETAILED LOG END (ERROR) ===');
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
  `;
}
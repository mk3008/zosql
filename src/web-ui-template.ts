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
  `;
}

function getJavaScriptCode(): string {
  return `
    let editor = null;
    let schemaData = null;
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
    
    // Initialize everything when page loads
    document.addEventListener('DOMContentLoaded', function() {
      loadSchemaInfo();
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
    
    // Helper function to check FROM clause context
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
        
        // Check if we're in a FROM clause context
        // Look for FROM keyword followed by optional whitespace and check if cursor is right after
        const fromPattern = /\\bFROM\\s+$/i;
        const joinPattern = /\\b(?:INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+JOIN|JOIN)\\s+$/i;
        
        return fromPattern.test(cleanedText) || joinPattern.test(cleanedText);
      } catch (error) {
        console.error('Error checking FROM clause context:', error);
        return false;
      }
    }
  `;
}

function schemaManagement(): string {
  return `
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
              
              // Check if we're in a FROM clause context
              const fullText = model.getValue();
              const isInFromClause = checkFromClauseContext(fullText, position);
              
              console.log('Position details:');
              console.log('- lineNumber:', position.lineNumber);
              console.log('- column:', position.column);
              console.log('- textBeforeCursor:', JSON.stringify(textBeforeCursor));
              console.log('- isInFromClause:', isInFromClause);
              
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
                  
                  // Check if it's a CTE or subquery table with columns in parse result
                  const parseResult = lastSuccessfulParseResult || (parseResult && parseResult.success ? parseResult : null);
                  if (parseResult) {
                    const tableObject = findTableObjectByAlias(parseResult, alias);
                    if (tableObject && (tableObject.type === 'cte' || tableObject.type === 'subquery') && tableObject.columns && tableObject.columns.length > 0) {
                      columns = tableObject.columns;
                      console.log('Using CTE/subquery columns:', columns, 'type:', tableObject.type);
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
              
              // If we're in a FROM clause context, only show table names
              if (isInFromClause) {
                // Add table names only
                data.tables.forEach(table => {
                  suggestions.push({
                    label: table,
                    kind: monaco.languages.CompletionItemKind.Class,
                    documentation: \`Table: \${table}\`,
                    insertText: table,
                    range: range
                  });
                });
                
                console.log('FROM clause context - showing only table names');
              } else {
                // Normal IntelliSense - show all items
                
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
  `;
}
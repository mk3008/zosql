import { getIntelliSenseSetup, getIntelliSenseTestFunctions } from './intellisense-client.js';
import { getHelperFunctions, getSchemaManagement } from './helper-functions.js';
import { getUtilityFunctions } from './utility-functions.js';

export function getJavaScriptCode(): string {
  return `
    ${getGlobalVariables()}
    ${getInitializationCode()}
    ${getQueryExecutionCode()}
    ${getMonacoEditorCode()}
    ${getIntelliSenseSetup()}
    ${getIntelliSenseTestFunctions()}
    ${getSchemaManagement()}
    ${getHelperFunctions()}
    ${getUtilityFunctions()}
  `;
}

function getGlobalVariables(): string {
  return `
    let editor = null;
    let schemaData = null;
    let privateSchemaData = null;
    let lastValidQuery = null;
    let currentSchemaData = null;
    let lastSuccessfulParseResult = null; // キャッシュ用
    let isIntelliSenseEnabled = true;
    
    // Server logging helper
    function logToServer(message, data = null) {
      const logData = {
        message: message,
        timestamp: new Date().toISOString(),
        data: data
      };
      
      try {
        fetch('/api/debug-intellisense', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(logData)
        }).catch(err => {
          console.error('Failed to log to server:', err);
        });
      } catch (err) {
        console.error('Error in logToServer:', err);
      }
    }
  `;
}

function getInitializationCode(): string {
  return `
    // Load schema information
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
        
        if (data.success && data.schema) {
          schemaData = data.schema;
          console.log('Schema loaded successfully:', schemaData);
          logToServer('Schema loaded successfully', {
            tablesCount: schemaData.tables.length
          });
        } else {
          logToServer('Schema load failed', { error: data.error });
        }
      } catch (error) {
        console.error('Error loading schema:', error);
        logToServer('Schema load error', { error: error.message });
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
        document.getElementById('pglite-status').style.color = '#f44336';
      }
    }
  `;
}

function getQueryExecutionCode(): string {
  return `
    // Query execution
    async function runQuery() {
      if (!editor) {
        alert('Editor not ready');
        return;
      }
      
      const sql = editor.getValue().trim();
      if (!sql) {
        alert('Please enter a SQL query');
        return;
      }
      
      const resultsContent = document.getElementById('results-content');
      const executionInfo = document.getElementById('execution-info');
      
      // Show loading state
      resultsContent.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">Executing query...</div>';
      executionInfo.textContent = 'Executing...';
      
      try {
        const response = await fetch('/api/execute-query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql })
        });
        
        const data = await response.json();
        
        if (data.success) {
          displayQueryResults(data.result, data.originalSql, data.composedSql);
          executionInfo.textContent = \`Executed in \${data.result.executionTime}ms (\${data.result.rows.length} rows)\`;
        } else {
          resultsContent.innerHTML = \`
            <div style="color: #f44336; padding: 20px;">
              <strong>Query Error:</strong><br>
              \${escapeHtml(data.error)}
            </div>
          \`;
          executionInfo.textContent = 'Error';
        }
      } catch (error) {
        resultsContent.innerHTML = \`
          <div style="color: #f44336; padding: 20px;">
            <strong>Network Error:</strong><br>
            \${escapeHtml(error.message)}
          </div>
        \`;
        executionInfo.textContent = 'Network Error';
      }
    }
    
    function displayQueryResults(result, originalSql, composedSql) {
      const resultsContent = document.getElementById('results-content');
      
      if (!result.rows || result.rows.length === 0) {
        resultsContent.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">No results returned</div>';
        return;
      }
      
      // Generate table HTML
      const fields = result.fields || [];
      const rows = result.rows || [];
      
      let html = '<table>';
      
      // Header
      if (fields.length > 0) {
        html += '<thead><tr>';
        fields.forEach(field => {
          html += \`<th>\${escapeHtml(field.name)}</th>\`;
        });
        html += '</tr></thead>';
      }
      
      // Body
      html += '<tbody>';
      rows.forEach(row => {
        html += '<tr>';
        fields.forEach(field => {
          const value = row[field.name];
          html += \`<td>\${escapeHtml(String(value ?? ''))}</td>\`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      
      // Add composed SQL info if available
      if (composedSql && composedSql !== originalSql) {
        html += \`
          <div style="margin-top: 20px; padding: 15px; background: rgba(255,165,0,0.1); border-left: 3px solid #ffa500;">
            <strong>Private Resources Detected:</strong><br>
            <small style="font-family: monospace; color: #dcdcaa;">WITH clause automatically generated</small>
          </div>
        \`;
      }
      
      resultsContent.innerHTML = html;
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Reset database
    async function resetDatabase() {
      if (!confirm('Are you sure you want to reset the database? This will clear all data.')) {
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
          // Re-run current query if there is one
          if (editor && editor.getValue().trim()) {
            runQuery();
          }
        } else {
          alert('Failed to reset database: ' + data.error);
        }
      } catch (error) {
        alert('Error resetting database: ' + error.message);
      }
    }
  `;
}

function getMonacoEditorCode(): string {
  return `
    // Monaco Editor initialization
    async function initMonacoEditor() {
      try {
        // Load Monaco Editor
        await loadMonacoEditor();
        
        // Create editor instance
        editor = monaco.editor.create(document.getElementById('editor'), {
          value: 'SELECT * FROM users;',
          language: 'sql',
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: {
            enabled: false
          },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'on',
          folding: false,
          renderLineHighlight: 'line',
          selectOnLineNumbers: true,
          // Disable word-based suggestions to prevent meaningless string suggestions
          wordBasedSuggestions: false,
          // Configure suggest options to disable snippet and word suggestions
          suggest: {
            showWords: false,
            showSnippets: false,
            showIcons: true,
            showColors: false,
            showFiles: false,
            showReferences: false,
            showFolders: false,
            showTypeParameters: false,
            showVariables: false,
            showClasses: true,
            showStructs: false,
            showInterfaces: false,
            showModules: true,
            showProperties: false,
            showEvents: false,
            showOperators: false,
            showUnits: false,
            showValues: false,
            showConstants: false,
            showEnums: false,
            showEnumMembers: false,
            showKeywords: true,
            showText: false,
            showInsertRules: false,
            insertMode: 'insert',
            filterGraceful: true,
            snippetsPreventQuickSuggestions: true
          },
          // Disable quick suggestions for strings
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false
          }
        });
        
        // Setup keyboard shortcuts
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function() {
          runQuery();
        });
        
        // Setup IntelliSense
        setupIntelliSense();
        
        console.log('Monaco Editor initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Monaco Editor:', error);
        document.getElementById('editor').innerHTML = 
          '<div style="color: red; padding: 20px;">Failed to load Monaco Editor</div>';
      }
    }
    
    async function loadMonacoEditor() {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/monaco-editor@0.45.0/min/vs/loader.js';
        script.onload = () => {
          window.require.config({ 
            paths: { 
              'vs': 'https://unpkg.com/monaco-editor@0.45.0/min/vs' 
            }
          });
          
          window.require(['vs/editor/editor.main'], () => {
            resolve();
          }, (error) => {
            reject(error);
          });
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  `;
}
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
    let sharedCteData = null;
    let lastValidQuery = null;
    let currentSchemaData = null;
    let lastSuccessfulParseResult = null; // キャッシュ用
    let isIntelliSenseEnabled = true;
    
    // Tab management
    let openTabs = new Map(); // Map<tabId, { name, type, content, isModified }>
    let activeTabId = 'main';
    let tabCounter = 0;
    
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
    
    // Load shared CTE information
    async function loadSharedCteInfo() {
      try {
        logToServer('Shared CTE loading attempt');
        const response = await fetch('/api/shared-cte');
        const data = await response.json();
        
        logToServer('Shared CTE response received', {
          success: data.success,
          error: data.error,
          hasSharedCtes: !!data.sharedCtes,
          ctesCount: data.sharedCtes ? Object.keys(data.sharedCtes).length : 0
        });
        
        if (data.success && data.sharedCtes) {
          sharedCteData = data.sharedCtes;
          console.log('Shared CTEs loaded successfully:', sharedCteData);
          logToServer('Shared CTEs loaded successfully', {
            ctesCount: Object.keys(sharedCteData).length
          });
        } else {
          logToServer('Shared CTE load failed', { error: data.error });
        }
      } catch (error) {
        console.error('Error loading shared CTEs:', error);
        logToServer('Shared CTE load error', { error: error.message });
      }
    }
    
    // Initialize everything when page loads
    document.addEventListener('DOMContentLoaded', function() {
      loadSchemaInfo();
      loadSharedCteInfo();
      initMonacoEditor();
      checkDatabaseStatus();
      // Initialize tabs (will be called again in initMonacoEditor but that's ok)
      initializeTabs();
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

    // SQL Formatting function
    async function formatCurrentSQL() {
      if (!editor) {
        showToast('Editor not available', 'error');
        return;
      }
      
      const sql = editor.getValue();
      if (!sql || sql.trim().length === 0) {
        showToast('No SQL to format', 'warning');
        return;
      }
      
      try {
        const response = await fetch('/api/format-sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql })
        });
        
        const data = await response.json();
        
        if (data.success && data.formattedSql) {
          // Get current cursor position
          const position = editor.getPosition();
          
          // Replace editor content with formatted SQL
          editor.setValue(data.formattedSql);
          
          // Try to restore cursor position (approximately)
          if (position) {
            editor.setPosition(position);
          }
          
          // Mark current tab as modified
          if (openTabs.has(activeTabId)) {
            const currentTab = openTabs.get(activeTabId);
            currentTab.content = data.formattedSql;
            currentTab.isModified = data.formattedSql !== getOriginalContent(activeTabId);
            openTabs.set(activeTabId, currentTab);
            renderTabs();
          }
          
          showToast('SQL formatted successfully', 'success');
        } else {
          showToast('SQL formatting failed: ' + (data.error || 'Unknown error'), 'error');
        }
      } catch (error) {
        showToast('Network error during formatting: ' + error.message, 'error');
        console.error('SQL formatting error:', error);
      }
    }

    // Toast notification system
    function showToast(message, type = 'info') {
      // Remove existing toast
      const existingToast = document.querySelector('.toast');
      if (existingToast) {
        existingToast.remove();
      }
      
      const toast = document.createElement('div');
      toast.className = \`toast toast-\${type}\`;
      toast.textContent = message;
      
      // Style the toast
      Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '4px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '10000',
        opacity: '0',
        transform: 'translateY(-10px)',
        transition: 'all 0.3s ease',
        maxWidth: '400px',
        wordWrap: 'break-word'
      });
      
      // Set background color based on type
      const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
      };
      toast.style.backgroundColor = colors[type] || colors.info;
      
      document.body.appendChild(toast);
      
      // Animate in
      setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      }, 10);
      
      // Auto remove after 3 seconds
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 3000);
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
    
    // ====================================================================
    // Tab Management Functions
    // ====================================================================
    
    function initializeTabs() {
      // Clear existing tabs
      openTabs.clear();
      
      // Initialize main tab
      openTabs.set('main', {
        name: 'main.sql',
        type: 'main',
        content: editor ? editor.getValue() : 'SELECT * FROM users;',
        isModified: false,
        originalContent: 'SELECT * FROM users;'
      });
      
      activeTabId = 'main';
      
      // Always render tabs to ensure visibility
      renderTabs();
      
      console.log('Tabs initialized with main tab');
    }
    
    function renderTabs() {
      const tabBar = document.getElementById('tab-bar');
      if (!tabBar) {
        console.warn('Tab bar element not found');
        return;
      }
      
      // Force clear and rebuild all tabs
      tabBar.innerHTML = '';
      
      for (const [tabId, tab] of openTabs) {
        const tabElement = document.createElement('div');
        tabElement.className = \`tab \${tabId === activeTabId ? 'active' : ''}\`;
        tabElement.dataset.tab = tabId;
        tabElement.onclick = () => switchTab(tabId);
        
        const icon = tab.type === 'main' ? '📄' : (tab.type === 'shared-cte' ? '🔶' : '📝');
        const modifiedIndicator = tab.isModified ? '●' : '';
        const tabName = tab.name || 'Untitled';
        
        tabElement.innerHTML = \`
          \${icon} \${tabName}\${modifiedIndicator}
          \${tab.type !== 'main' ? '<span class="close-btn" onclick="closeTab(event, \\''+tabId+'\\')">×</span>' : ''}
        \`;
        
        tabBar.appendChild(tabElement);
      }
      
      // Force visibility
      tabBar.style.display = 'flex';
      tabBar.style.visibility = 'visible';
      tabBar.style.opacity = '1';
      tabBar.style.height = '40px';
      
      console.log('Tabs rendered:', openTabs.size, 'tabs');
      console.log('Tab bar innerHTML:', tabBar.innerHTML);
    }
    
    function switchTab(tabId) {
      if (!openTabs.has(tabId)) return;
      
      // Save current tab content
      if (editor && openTabs.has(activeTabId)) {
        const currentTab = openTabs.get(activeTabId);
        const currentContent = editor.getValue();
        currentTab.content = currentContent;
        currentTab.isModified = currentContent !== getOriginalContent(activeTabId);
        openTabs.set(activeTabId, currentTab);
      }
      
      // Switch to new tab
      activeTabId = tabId;
      const newTab = openTabs.get(tabId);
      
      if (editor) {
        editor.setValue(newTab.content);
      }
      
      renderTabs();
      updateEditorHeader(newTab);
    }
    
    function closeTab(event, tabId) {
      event.stopPropagation();
      
      if (tabId === 'main') return; // Cannot close main tab
      
      const tab = openTabs.get(tabId);
      if (tab && tab.isModified) {
        if (!confirm(\`Close \${tab.name}? Unsaved changes will be lost.\`)) {
          return;
        }
      }
      
      openTabs.delete(tabId);
      
      if (activeTabId === tabId) {
        // Switch to main tab or another open tab
        activeTabId = openTabs.has('main') ? 'main' : openTabs.keys().next().value;
        if (activeTabId) {
          switchTab(activeTabId);
        }
      }
      
      renderTabs();
    }
    
    async function openSharedCteTab(cteName) {
      const tabId = \`cte-\${cteName}\`;
      
      if (openTabs.has(tabId)) {
        switchTab(tabId);
        return;
      }
      
      try {
        // Load CTE content from server
        const response = await fetch(\`/api/shared-cte/\${cteName}\`);
        const data = await response.json();
        
        if (data.success && data.sharedCte) {
          const content = data.sharedCte.editableQuery || data.sharedCte.query || '';
          
          openTabs.set(tabId, {
            name: \`\${cteName}.cte.sql\`,
            type: 'shared-cte',
            content: content,
            isModified: false,
            cteName: cteName,
            originalContent: content
          });
          
          switchTab(tabId);
          console.log('Shared CTE tab opened successfully:', cteName);
        } else {
          alert(\`Failed to load Shared CTE: \${data.error || 'Unknown error'}\`);
        }
      } catch (error) {
        console.error('Error loading Shared CTE:', error);
        alert(\`Error loading Shared CTE: \${error.message}\`);
      }
    }
    
    function updateEditorHeader(tab) {
      const header = document.getElementById('editor-header');
      if (header) {
        const icon = tab.type === 'main' ? '📄' : (tab.type === 'shared-cte' ? '🔶' : '📝');
        header.textContent = \`\${icon} \${tab.name}\`;
      }
    }
    
    function getOriginalContent(tabId) {
      const tab = openTabs.get(tabId);
      if (!tab) return '';
      
      if (tab.type === 'main') {
        return 'SELECT * FROM users;';
      }
      
      // For shared CTEs, use stored original content
      return tab.originalContent || '';
    }
    
    async function saveCurrentTab() {
      if (!editor || !openTabs.has(activeTabId)) return;
      
      const tab = openTabs.get(activeTabId);
      const content = editor.getValue();
      
      if (tab.type === 'shared-cte') {
        try {
          const response = await fetch(\`/api/shared-cte/\${tab.cteName}\`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: content
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            tab.isModified = false;
            tab.originalContent = content;
            openTabs.set(activeTabId, tab);
            renderTabs();
            showToast('Shared CTE saved successfully', 'success');
            
            // Reload schema to reflect changes
            await loadSchemaInfo();
          } else {
            showToast(\`Failed to save Shared CTE: \${data.error || 'Unknown error'}\`, 'error');
          }
        } catch (error) {
          showToast(\`Error saving Shared CTE: \${error.message}\`, 'error');
        }
      } else if (tab.type === 'sql' || tab.type === 'main') {
        // For general SQL tabs, just mark as saved (in-memory only for now)
        tab.content = content;
        tab.isModified = false;
        tab.originalContent = content;
        openTabs.set(activeTabId, tab);
        renderTabs();
        showToast('Tab content saved', 'success');
      }
    }
    
    // Create new SQL tab
    function createNewTab() {
      tabCounter++;
      const tabId = \`tab-\${tabCounter}\`;
      const tabName = \`untitled-\${tabCounter}.sql\`;
      
      openTabs.set(tabId, {
        name: tabName,
        type: 'sql',
        content: '',
        isModified: false,
        originalContent: ''
      });
      
      switchTab(tabId);
      console.log('New tab created:', tabId);
    }
    
    // Make functions globally accessible
    window.openSharedCteTab = openSharedCteTab;
    window.switchTab = switchTab;
    window.closeTab = closeTab;
    window.saveCurrentTab = saveCurrentTab;
    window.createNewTab = createNewTab;
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
        
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function() {
          saveCurrentTab();
        });
        
        // Add SQL formatting keybinding (Ctrl+K, Ctrl+D)
        editor.addCommand(monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD), function() {
          formatCurrentSQL();
        });
        
        // Setup IntelliSense
        setupIntelliSense();
        
        // Initialize tabs after editor is ready
        setTimeout(() => {
          initializeTabs();
          console.log('Tabs initialized after Monaco Editor');
          
          // Debug: Check if tab bar is visible
          const tabBar = document.getElementById('tab-bar');
          if (tabBar) {
            console.log('Tab bar found:', tabBar.innerHTML);
            console.log('Tab bar styles:', window.getComputedStyle(tabBar));
          } else {
            console.error('Tab bar not found!');
          }
        }, 500);
        
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
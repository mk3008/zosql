import { getIntelliSenseSetup, getIntelliSenseTestFunctions } from './intellisense-client.js';
import { getHelperFunctions, getSchemaManagement } from './helper-functions.js';
import { getUtilityFunctions } from './utility-functions.js';
import { getCteValidationCode } from './cte-validation-client.js';

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
    ${getCteValidationCode()}
  `;
}

function getGlobalVariables(): string {
  return `
    let leftEditor = null;
    let rightEditor = null;
    let schemaData = null;
    let sharedCteData = null;
    let lastValidQuery = null;
    let currentSchemaData = null;
    let lastSuccessfulParseResult = null; // キャッシュ用
    let isIntelliSenseEnabled = true;
    let isSplitView = false;
    
    // Tab management
    let leftTabs = new Map(); // Map<tabId, { name, type, content, isModified, queryResult }>
    let rightTabs = new Map(); // Map<tabId, { name, type, content, isModified, queryResult }>
    let activeLeftTabId = null;
    let activeRightTabId = null;
    let activePanel = 'left'; // 'left' or 'right'
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
      loadWorkspaceInfo();
      initMonacoEditor();
      checkDatabaseStatus();
      // Initialize tabs (will be called again in initMonacoEditor but that's ok)
      initializeTabs();
      // Initialize resize handles
      initializeResizeHandles();
      // Initialize tab scroll handling
      initializeTabScrollHandling();
      
      // Initialize diagram area
      const diagramContent = document.getElementById('diagram-content');
      if (diagramContent) {
        diagramContent.innerHTML = '<div class="diagram-placeholder">Enter SQL in the editor to see flow diagram</div>';
      }
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
      // Determine which editor to use based on active panel
      const currentEditor = activePanel === 'left' ? leftEditor : rightEditor;
      
      if (!currentEditor) {
        alert('Editor not ready');
        return;
      }
      
      const sql = currentEditor.getValue().trim();
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
          // Generate HTML for results
          const resultHtml = generateQueryResultsHtml(data.result, data.originalSql, data.composedSql);
          
          // Store results for the active tab
          storeQueryResult(resultHtml);
          
          // Update the display
          updateQueryResults();
          
          executionInfo.textContent = \`Executed in \${data.result.executionTime}ms (\${data.result.rows.length} rows)\`;
        } else {
          const errorHtml = \`
            <div style="color: #f44336; padding: 20px;">
              <strong>Query Error:</strong><br>
              \${escapeHtml(data.error)}
            </div>
          \`;
          
          // Store error for the active tab
          storeQueryResult(errorHtml);
          
          // Update the display
          updateQueryResults();
          
          executionInfo.textContent = 'Error';
        }
      } catch (error) {
        const errorHtml = \`
          <div style="color: #f44336; padding: 20px;">
            <strong>Network Error:</strong><br>
            \${escapeHtml(error.message)}
          </div>
        \`;
        
        // Store error for the active tab
        storeQueryResult(errorHtml);
        
        // Update the display
        updateQueryResults();
        
        executionInfo.textContent = 'Network Error';
      }
    }
    
    function generateQueryResultsHtml(result, originalSql, composedSql) {
      if (!result.rows || result.rows.length === 0) {
        return '<div style="color: #666; text-align: center; padding: 40px;">No results returned</div>';
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
      
      return html;
    }
    
    // Legacy function for backward compatibility (if needed)
    function displayQueryResults(result, originalSql, composedSql) {
      const resultsContent = document.getElementById('results-content');
      const html = generateQueryResultsHtml(result, originalSql, composedSql);
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
          
          // Mark current tab as modified if content actually changed
          if (openTabs.has(activeTabId)) {
            const currentTab = openTabs.get(activeTabId);
            const oldContent = currentTab.content;
            currentTab.content = data.formattedSql;
            // Only mark as modified if the original content was different from formatted
            // This prevents marking as modified when just formatting without changing logic
            if (oldContent !== data.formattedSql) {
              currentTab.isModified = data.formattedSql !== currentTab.originalContent;
            }
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
      leftTabs.clear();
      rightTabs.clear();
      
      // No default tabs - start with empty tab bars
      activeLeftTabId = null;
      activeRightTabId = null;
      activePanel = 'left';
      
      // Always render tabs to ensure visibility
      renderTabs();
      
      // Show welcome message in left editor
      if (leftEditor) {
        leftEditor.setValue('-- Welcome to zosql Browser\\n-- Create a new tab with + or open a file from the workspace');
      }
      
      console.log('Tabs initialized without default tabs');
    }
    
    function renderTabs() {
      renderTabsForPanel('left');
      if (isSplitView) {
        renderTabsForPanel('right');
      }
    }
    
    function renderTabsForPanel(panel) {
      const tabBarId = panel === 'left' ? 'left-tab-bar' : 'right-tab-bar';
      const tabBar = document.getElementById(tabBarId);
      if (!tabBar) {
        console.warn(\`Tab bar element not found: \${tabBarId}\`);
        return;
      }
      
      const tabs = panel === 'left' ? leftTabs : rightTabs;
      const activeTabId = panel === 'left' ? activeLeftTabId : activeRightTabId;
      
      // Clear existing tabs content but preserve controls
      const tabControls = tabBar.querySelector('.tab-controls');
      tabBar.innerHTML = '';
      
      // Re-add tabs
      for (const [tabId, tab] of tabs) {
        const tabElement = document.createElement('div');
        tabElement.className = \`tab \${tabId === activeTabId ? 'active' : ''}\`;
        tabElement.dataset.tab = tabId;
        tabElement.onclick = () => switchTab(tabId, panel);
        
        const icon = tab.type === 'main' ? '📄' : 
                     (tab.type === 'shared-cte' ? '🔶' : 
                      (tab.type === 'private-cte' ? '🔧' : 
                       (tab.type === 'main-file' ? '📄' : '📝')));
        const modifiedIndicator = tab.isModified ? '●' : '';
        const tabName = tab.name || 'Untitled';
        
        tabElement.innerHTML = \`
          \${icon} \${tabName}\${modifiedIndicator}
          <span class="close-btn" onclick="closeTab(event, '\${tabId}', '\${panel}')">×</span>
        \`;
        
        tabBar.appendChild(tabElement);
      }
      
      // Re-add controls
      if (tabControls) {
        tabBar.appendChild(tabControls);
      }
      
      // Force visibility
      tabBar.style.display = 'flex';
      tabBar.style.visibility = 'visible';
      tabBar.style.opacity = '1';
      tabBar.style.height = '40px';
      
      console.log(\`Tabs rendered for \${panel}:\`, tabs.size, 'tabs');
    }
    
    function switchTab(tabId, panel) {
      panel = panel || activePanel; // Default to current active panel
      
      const tabs = panel === 'left' ? leftTabs : rightTabs;
      const editor = panel === 'left' ? leftEditor : rightEditor;
      const currentActiveTabId = panel === 'left' ? activeLeftTabId : activeRightTabId;
      
      if (!tabs.has(tabId)) return;
      
      // Save current tab content
      if (editor && tabs.has(currentActiveTabId)) {
        const currentTab = tabs.get(currentActiveTabId);
        const currentContent = editor.getValue();
        currentTab.content = currentContent;
        currentTab.isModified = currentContent !== getOriginalContent(currentActiveTabId, panel);
        tabs.set(currentActiveTabId, currentTab);
      }
      
      // Switch to new tab
      if (panel === 'left') {
        activeLeftTabId = tabId;
      } else {
        activeRightTabId = tabId;
      }
      
      const newTab = tabs.get(tabId);
      
      if (editor) {
        editor.setValue(newTab.content);
      }
      
      renderTabs();
      updateEditorHeader(newTab);
      
      // Update query results for the new tab
      updateQueryResults();
    }
    
    function closeTab(event, tabId, panel) {
      event.stopPropagation();
      
      panel = panel || activePanel; // Default to current active panel
      
      const tabs = panel === 'left' ? leftTabs : rightTabs;
      const editor = panel === 'left' ? leftEditor : rightEditor;
      const currentActiveTabId = panel === 'left' ? activeLeftTabId : activeRightTabId;
      
      const tab = tabs.get(tabId);
      if (tab && tab.isModified) {
        if (!confirm(\`Close \${tab.name}? Unsaved changes will be lost.\`)) {
          return;
        }
      }
      
      tabs.delete(tabId);
      
      if (currentActiveTabId === tabId) {
        // Switch to another open tab or clear editor
        const remainingTabs = Array.from(tabs.keys());
        if (remainingTabs.length > 0) {
          if (panel === 'left') {
            activeLeftTabId = remainingTabs[0];
          } else {
            activeRightTabId = remainingTabs[0];
          }
          switchTab(remainingTabs[0], panel);
        } else {
          // No tabs left - clear editor and show welcome message
          if (panel === 'left') {
            activeLeftTabId = null;
          } else {
            activeRightTabId = null;
          }
          
          if (editor) {
            const welcomeMessage = panel === 'left' ? 
              '-- Welcome to zosql Browser\\n-- Create a new tab with + or open a file from the workspace' :
              '-- Right editor panel';
            editor.setValue(welcomeMessage);
          }
          
          const headerId = panel === 'left' ? 'left-editor-header' : 'right-editor-header';
          const header = document.getElementById(headerId);
          if (header) {
            header.textContent = panel === 'left' ? 
              '📝 Start by opening a file or creating a new tab' :
              '📝 Right editor panel';
          }
        }
      }
      
      renderTabs();
      updateQueryResults(); // Update results when tab is closed
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
            name: cteName,  // Just the CTE name without .cte.sql extension
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
    
    // Function to open main file tab from workspace
    async function openMainFileTab(fileName) {
      const tabId = 'main-file-' + fileName;
      
      if (openTabs.has(tabId)) {
        switchTab(tabId);
        return;
      }
      
      try {
        // Load workspace info to get the original query
        const response = await fetch('/api/workspace');
        const data = await response.json();
        
        if (data.success && data.hasWorkspace && data.workspace.originalQuery) {
          openTabs.set(tabId, {
            name: fileName,
            type: 'main-file',
            content: data.workspace.originalQuery,
            isModified: false,
            originalContent: data.workspace.originalQuery
          });
          
          switchTab(tabId);
          console.log('Main file tab opened successfully:', fileName);
        } else {
          showToast('Failed to load main file: No workspace active', 'error');
        }
      } catch (error) {
        console.error('Error loading main file:', error);
        showToast('Error loading main file: ' + error.message, 'error');
      }
    }
    
    // Make functions globally accessible
    window.openMainFileTab = openMainFileTab;
    
    // Sidebar toggle functions
    function toggleLeftSidebar() {
      const sidebar = document.getElementById('left-sidebar');
      const toggleBtn = document.getElementById('toggle-left-sidebar');
      
      if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        // Clear any inline width style that might interfere with CSS
        sidebar.style.width = '';
        toggleBtn.textContent = '◀';
        toggleBtn.title = 'Hide Left Sidebar';
      } else {
        sidebar.classList.add('hidden');
        // Clear inline width to allow CSS to take precedence
        sidebar.style.width = '';
        toggleBtn.textContent = '▶';
        toggleBtn.title = 'Show Left Sidebar';
      }
    }
    
    function toggleRightSidebar() {
      const sidebar = document.getElementById('diagram-sidebar');
      const toggleBtn = document.getElementById('toggle-right-sidebar');
      
      if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        // Clear any inline width style that might interfere with CSS
        sidebar.style.width = '';
        toggleBtn.textContent = '▶';
        toggleBtn.title = 'Hide Right Sidebar';
      } else {
        sidebar.classList.add('hidden');
        // Clear inline width to allow CSS to take precedence
        sidebar.style.width = '';
        toggleBtn.textContent = '◀';
        toggleBtn.title = 'Show Right Sidebar';
      }
    }
    
    // Resize functionality
    function initializeResizeHandles() {
      const leftHandle = document.getElementById('left-resize-handle');
      const rightHandle = document.getElementById('right-resize-handle');
      const leftSidebar = document.getElementById('left-sidebar');
      const rightSidebar = document.getElementById('diagram-sidebar');
      
      let isResizing = false;
      let currentHandle = null;
      
      function startResize(e, handle, sidebar) {
        isResizing = true;
        currentHandle = handle;
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        e.preventDefault();
      }
      
      function resize(e) {
        if (!isResizing || !currentHandle) return;
        
        if (currentHandle === leftHandle) {
          const newWidth = e.clientX;
          if (newWidth >= 200 && newWidth <= 500) {
            leftSidebar.style.width = newWidth + 'px';
          }
        } else if (currentHandle === rightHandle) {
          const newWidth = window.innerWidth - e.clientX;
          if (newWidth >= 200 && newWidth <= 600) {
            rightSidebar.style.width = newWidth + 'px';
          }
        }
      }
      
      function stopResize() {
        isResizing = false;
        currentHandle = null;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
      }
      
      leftHandle.addEventListener('mousedown', (e) => startResize(e, leftHandle, leftSidebar));
      rightHandle.addEventListener('mousedown', (e) => startResize(e, rightHandle, rightSidebar));
    }
    
    // Tab scroll handling (VS Code style)
    function initializeTabScrollHandling() {
      const tabBar = document.getElementById('tab-bar');
      if (!tabBar) return;
      
      tabBar.addEventListener('wheel', function(e) {
        e.preventDefault();
        const scrollAmount = e.deltaY > 0 ? 100 : -100;
        tabBar.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      });
    }
    
    // Split view management
    function toggleSplitView() {
      const rightPanel = document.getElementById('right-editor-panel');
      const splitHandle = document.getElementById('split-resize-handle');
      
      if (isSplitView) {
        // Close split view
        rightPanel.style.display = 'none';
        splitHandle.style.display = 'none';
        isSplitView = false;
        activePanel = 'left';
        
        // Update results to show left panel results
        updateQueryResults();
      } else {
        // Open split view
        rightPanel.style.display = 'flex';
        splitHandle.style.display = 'block';
        isSplitView = true;
        
        // Initialize right editor if not already done
        initRightEditor();
        
        // Update results to show active panel results
        updateQueryResults();
      }
    }
    
    function closeSplitView() {
      if (!isSplitView) return;
      
      const rightPanel = document.getElementById('right-editor-panel');
      const splitHandle = document.getElementById('split-resize-handle');
      
      rightPanel.style.display = 'none';
      splitHandle.style.display = 'none';
      isSplitView = false;
      activePanel = 'left';
      
      // Update results to show left panel results
      updateQueryResults();
    }
    
    function initRightEditor() {
      if (rightEditor) return; // Already initialized
      
      rightEditor = monaco.editor.create(document.getElementById('right-editor'), {
        value: '-- Right editor panel',
        language: 'sql',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: 'on',
        lineNumbers: 'on',
        folding: true,
        selectOnLineNumbers: true,
        roundedSelection: false,
        readOnly: false,
        cursorStyle: 'line',
        automaticLayout: true,
        scrollBeyondLastLine: false
      });
      
      // Add keyboard shortcuts to right editor
      rightEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runQuery);
      rightEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveCurrentTab);
      rightEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, formatCurrentSQL);
      
      // Auto-update diagram when content changes
      rightEditor.onDidChangeModelContent(function() {
        clearTimeout(window.diagramUpdateTimeout);
        window.diagramUpdateTimeout = setTimeout(function() {
          updateDiagramAuto();
        }, 1000);
      });
      
      // Track active panel
      rightEditor.onDidFocusEditorWidget(function() {
        activePanel = 'right';
        updateQueryResults(); // Update results when switching panels
      });
      
      console.log('Right Monaco Editor initialized successfully');
    }
    
    // Make functions globally accessible
    window.toggleLeftSidebar = toggleLeftSidebar;
    window.toggleRightSidebar = toggleRightSidebar;
    window.toggleSplitView = toggleSplitView;
    window.closeSplitView = closeSplitView;
    
    // Update query results based on active panel and tab
    function updateQueryResults() {
      const resultsContent = document.getElementById('results-content');
      if (!resultsContent) return;
      
      let activeTabId, activeTabs;
      
      if (activePanel === 'left') {
        activeTabId = activeLeftTabId;
        activeTabs = leftTabs;
      } else {
        activeTabId = activeRightTabId;
        activeTabs = rightTabs;
      }
      
      if (activeTabId && activeTabs.has(activeTabId)) {
        const tab = activeTabs.get(activeTabId);
        if (tab.queryResult) {
          resultsContent.innerHTML = tab.queryResult;
        } else {
          resultsContent.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">Run a query to see results here</div>';
        }
      } else {
        resultsContent.innerHTML = '<div style="color: #666; text-align: center; padding: 40px;">Run a query to see results here</div>';
      }
    }
    
    // Store query results for active tab
    function storeQueryResult(html) {
      let activeTabId, activeTabs;
      
      if (activePanel === 'left') {
        activeTabId = activeLeftTabId;
        activeTabs = leftTabs;
      } else {
        activeTabId = activeRightTabId;
        activeTabs = rightTabs;
      }
      
      if (activeTabId && activeTabs.has(activeTabId)) {
        const tab = activeTabs.get(activeTabId);
        tab.queryResult = html;
        activeTabs.set(activeTabId, tab);
      }
    }
    
    function updateEditorHeader(tab) {
      const header = document.getElementById('editor-header');
      if (header) {
        const icon = tab.type === 'main' ? '📄' : 
                     (tab.type === 'shared-cte' ? '🔶' : 
                      (tab.type === 'private-cte' ? '🔧' : 
                       (tab.type === 'main-file' ? '📄' : '📝')));
        header.textContent = \`\${icon} \${tab.name}\`;
      }
    }
    
    function getOriginalContent(tabId) {
      const tab = openTabs.get(tabId);
      if (!tab) return '';
      
      // Always use stored original content for all tab types
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
      } else if (tab.type === 'private-cte') {
        try {
          const response = await fetch(\`/api/workspace/private-cte/\${tab.cteName}\`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: content,
              description: \`Updated private CTE: \${tab.cteName}\`
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            tab.isModified = false;
            tab.originalContent = content;
            openTabs.set(activeTabId, tab);
            renderTabs();
            showToast('Private CTE saved successfully', 'success');
            
            // Reload workspace info to reflect changes
            await loadWorkspaceInfo();
          } else {
            showToast(\`Failed to save Private CTE: \${data.error || 'Unknown error'}\`, 'error');
          }
        } catch (error) {
          showToast(\`Error saving Private CTE: \${error.message}\`, 'error');
        }
      } else if (tab.type === 'sql' || tab.type === 'main') {
        // Check if this is a decomposed query that needs to be composed
        if (tab.name && tab.name.includes('_decomposed')) {
          try {
            // Compose the query with CTEs and save to original file
            const response = await fetch('/api/workspace/compose', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                decomposedQuery: content
              })
            });
            
            const data = await response.json();
            
            if (data.success) {
              showToast(\`Query composed and saved to: \${data.originalFilePath}\`, 'success');
              tab.content = content;
              tab.isModified = false;
              tab.originalContent = content;
              openTabs.set(activeTabId, tab);
              renderTabs();
            } else {
              showToast(\`Failed to compose query: \${data.error || 'Unknown error'}\`, 'error');
            }
          } catch (error) {
            showToast(\`Error composing query: \${error.message}\`, 'error');
          }
        } else {
          // For general SQL tabs, just mark as saved (in-memory only)
          tab.content = content;
          tab.isModified = false;
          tab.originalContent = content;
          openTabs.set(activeTabId, tab);
          renderTabs();
          showToast('Tab content saved', 'success');
        }
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
    
    // ====================================================================
    // Workspace Management Functions
    // ====================================================================
    
    async function decomposeCurrentQuery() {
      // 固定ターゲットファイル - 複雑なテスト用
      const targetFilePath = 'sql/analytics/user_behavior_analysis.sql';
      
      try {
        // ターゲットファイルの内容を読み込み
        const response = await fetch('/api/workspace/read-sql-file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ filePath: targetFilePath })
        });
        
        const fileData = await response.json();
        
        if (!fileData.success) {
          showToast(\`Failed to read target file: \${fileData.error}\`, 'error');
          return;
        }
        
        const sql = fileData.content;
        const queryName = 'user_behavior_analysis';
        
        showToast('Starting decompose process...', 'info');
        
        // Decomposeを実行
        const decomposeResponse = await fetch('/api/workspace/decompose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            sql, 
            queryName,
            originalFilePath: targetFilePath
          })
        });
        
        const decomposeData = await decomposeResponse.json();
        
        if (decomposeData.success) {
          showToast(\`Query decomposed: \${decomposeData.privateCteCount} CTEs extracted\`, 'success');
          
          // Update flow diagram if available
          if (decomposeData.flowDiagram) {
            updateFlowDiagram(decomposeData.flowDiagram);
          }
          
          // Update workspace info to show the new Private CTE tree
          await loadWorkspaceInfo();
        } else {
          showToast(\`Decompose failed: \${decomposeData.error}\`, 'error');
        }
      } catch (error) {
        showToast(\`Error decomposing query: \${error.message}\`, 'error');
      }
    }
    
    async function clearWorkspace() {
      if (!confirm('Clear workspace? All private CTEs will be lost.')) {
        return;
      }
      
      try {
        const response = await fetch('/api/workspace', {
          method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
          showToast('Workspace cleared', 'success');
          await loadWorkspaceInfo();
        } else {
          showToast(\`Clear failed: \${data.error}\`, 'error');
        }
      } catch (error) {
        showToast(\`Error clearing workspace: \${error.message}\`, 'error');
      }
    }
    
    async function loadWorkspaceInfo() {
      try {
        const [workspaceResponse, privateCteResponse] = await Promise.all([
          fetch('/api/workspace'),
          fetch('/api/workspace/private-cte')
        ]);
        
        const workspaceData = await workspaceResponse.json();
        const privateCteData = await privateCteResponse.json();
        
        const workspaceInfo = document.getElementById('workspace-info');
        let workspaceHtml = '';
        
        if (workspaceData.success && workspaceData.hasWorkspace) {
          if (privateCteData.success && privateCteData.count > 0) {
            workspaceHtml += '<div style="margin-bottom: 10px;"><strong>Private CTE Tree:</strong></div>';
            // Extract original file name from workspace data
            var originalFileName = workspaceData.workspace && workspaceData.workspace.originalFilePath 
              ? workspaceData.workspace.originalFilePath.replace(/^.*[\\\/]/, '') // Extract filename from path
              : 'main.sql';
            workspaceHtml += buildCTETree(privateCteData.privateCtes, workspaceData.workspace.originalQuery, originalFileName);
          }
        } else {
          workspaceHtml = '<div style="color: #666;">No workspace active</div>';
        }
        
        workspaceInfo.innerHTML = workspaceHtml;
        
      } catch (error) {
        console.error('Error loading workspace info:', error);
        document.getElementById('workspace-info').innerHTML = 
          '<div style="color: red;">Error loading workspace</div>';
      }
    }
    
    function buildCTETree(privateCtes, mainQuery, originalFileName) {
      
      // Build dependency graph
      const cteMap = new Map();
      const rootCtes = [];
      
      // Create map of all CTEs
      Object.values(privateCtes).forEach(function(cte) {
        cteMap.set(cte.name, {
          name: cte.name,
          query: cte.query,
          description: cte.description,
          dependencies: cte.dependencies || [],
          children: [],
          isRoot: !cte.dependencies || cte.dependencies.length === 0
        });
      });
      
      // Build parent-child relationships based on dependencies
      cteMap.forEach(function(cte) {
        cte.dependencies.forEach(function(depName) {
          var depCte = cteMap.get(depName);
          if (depCte) {
            cte.children.push(depCte);
          }
        });
      });
      
      // Find CTEs referenced by main.sql or all CTEs if mainQuery is not available
      var mainCteRefs = [];
      if (mainQuery) {
        // Extract CTE references from main query
        // Look for patterns like "from {cte_name}" or "join {cte_name}"
        console.log('Available CTE names:', Array.from(cteMap.keys()));
        console.log('Main query preview (first 500 chars):', mainQuery.substring(0, 500));
        
        cteMap.forEach(function(cte) {
          var regex = new RegExp('\\b' + cte.name + '\\b', 'i');
          if (regex.test(mainQuery)) {
            mainCteRefs.push(cte);
            console.log('Found CTE reference:', cte.name);
          } else {
            console.log('CTE not found in main query:', cte.name);
          }
        });
        console.log('Main query references CTEs:', mainCteRefs.map(function(c) { return c.name; }));
        
        // If no CTEs found in main query, fallback to root CTEs
        if (mainCteRefs.length === 0) {
          console.log('No CTEs found in main query, falling back to root CTEs');
          cteMap.forEach(function(cte) {
            var isUsedAsDependency = false;
            cteMap.forEach(function(otherCte) {
              if (otherCte.dependencies.includes(cte.name)) {
                isUsedAsDependency = true;
              }
            });
            if (!isUsedAsDependency) {
              mainCteRefs.push(cte);
            }
          });
          console.log('Using root CTEs as fallback:', mainCteRefs.map(function(c) { return c.name; }));
        }
      } else {
        // If mainQuery is not available, find root CTEs (CTEs that are not dependencies of others)
        cteMap.forEach(function(cte) {
          var isUsedAsDependency = false;
          cteMap.forEach(function(otherCte) {
            if (otherCte.dependencies.includes(cte.name)) {
              isUsedAsDependency = true;
            }
          });
          if (!isUsedAsDependency) {
            mainCteRefs.push(cte);
          }
        });
        console.log('No mainQuery available, using root CTEs:', mainCteRefs.map(function(c) { return c.name; }));
      }
      
      // Render tree HTML
      var html = '<div style="font-family: monospace; font-size: 13px;">';
      
      // Show original file name at top (fallback to main.sql if not available)
      var mainFileName = originalFileName || 'main.sql';
      html += renderCTENode(mainFileName, 0, true, false);
      
      // Render each CTE referenced by main.sql and their dependency trees
      console.log('About to render mainCteRefs, count:', mainCteRefs.length);
      mainCteRefs.forEach(function(cte) {
        console.log('Rendering CTE:', cte.name, 'with children:', cte.children.length);
        html += renderCTETreeRecursive(cte, 1, new Set());
      });
      
      html += '</div>';
      console.log('Generated tree HTML length:', html.length);
      console.log('Generated HTML:', html);
      return html;
    }
    
    function renderCTENode(name, level, isMainQuery = false, hasChildren = false) {
      const indent = '  '.repeat(level);
      const icon = isMainQuery ? '📄' : (hasChildren ? '📂' : '🔹');
      const color = isMainQuery ? '#4CAF50' : '#FFC107';
      const clickHandler = isMainQuery 
        ? 'onclick="openMainFileTab(&quot;' + name + '&quot;)" style="cursor: pointer;"' 
        : 'onclick="openPrivateCteTab(&quot;' + name.replace('.sql', '') + '&quot;)" style="cursor: pointer;"';
      
      return '<div style="margin: 2px 0; color: ' + color + '; cursor: pointer;" ' + clickHandler + '>' +
        indent + icon + ' ' + name +
      '</div>';
    }
    
    function renderCTETreeRecursive(cte, level, visited) {
      if (!cte || visited.has(cte.name)) {
        return '';
      }
      
      var newVisited = new Set(visited);
      newVisited.add(cte.name);
      
      var html = '';
      var indent = '';
      for (var i = 0; i < level; i++) {
        indent += '  ';
      }
      var hasChildren = cte.children.length > 0;
      var icon = hasChildren ? '📂' : '🔹';
      
      // Main CTE node with proper indentation
      html += '<div style="margin: 2px 0; color: #FFC107; cursor: pointer; margin-left: ' + (level * 16) + 'px;" onclick="openPrivateCteTab(&quot;' + cte.name + '&quot;)">' +
        icon + ' ' + cte.name +
      '</div>';
      
      // Render dependencies recursively
      cte.children.forEach(function(child) {
        html += renderCTETreeRecursive(child, level + 1, newVisited);
      });
      
      return html;
    }
    
    async function openPrivateCteTab(cteName) {
      const tabId = 'private-cte-' + cteName;
      
      if (openTabs.has(tabId)) {
        switchTab(tabId);
        return;
      }
      
      try {
        // Load private CTE content from workspace
        const response = await fetch('/api/workspace/private-cte');
        const data = await response.json();
        
        if (data.success && data.privateCtes[cteName]) {
          const cte = data.privateCtes[cteName];
          
          openTabs.set(tabId, {
            name: cteName,  // Just the CTE name without .cte.sql extension
            type: 'private-cte',
            content: cte.query,
            isModified: false,
            cteName: cteName,
            originalContent: cte.query
          });
          
          switchTab(tabId);
          console.log('Private CTE tab opened successfully:', cteName);
        } else {
          showToast('Failed to load Private CTE: ' + cteName, 'error');
        }
      } catch (error) {
        console.error('Error loading Private CTE:', error);
        showToast('Error loading Private CTE: ' + error.message, 'error');
      }
    }
    
    async function openMainFileTab(fileName) {
      const tabId = 'main-file-' + fileName;
      
      if (openTabs.has(tabId)) {
        switchTab(tabId);
        return;
      }
      
      try {
        // Load workspace info to get the original query
        const response = await fetch('/api/workspace');
        const data = await response.json();
        
        if (data.success && data.workspace && data.workspace.originalQuery) {
          openTabs.set(tabId, {
            name: fileName,
            type: 'main-file',
            content: data.workspace.originalQuery,
            isModified: false,
            originalContent: data.workspace.originalQuery
          });
          
          switchTab(tabId);
          console.log('Main file tab opened successfully:', fileName);
        } else {
          showToast('Failed to load main file: ' + fileName, 'error');
        }
      } catch (error) {
        console.error('Error loading main file:', error);
        showToast('Error loading main file: ' + error.message, 'error');
      }
    }
    
    // ====================================================================
    // Diagram Management Functions
    // ====================================================================
    
    let currentFlowDiagram = null;
    let isDiagramVisible = true;
    
    function updateFlowDiagram(mermaidCode) {
      currentFlowDiagram = mermaidCode;
      renderFlowDiagram();
    }
    
    async function renderFlowDiagram() {
      const diagramContent = document.getElementById('diagram-content');
      if (!diagramContent || !currentFlowDiagram) {
        logToServer('Diagram: No diagram content element or flow diagram data');
        return;
      }
      
      try {
        logToServer('Diagram: Rendering flow diagram', { length: currentFlowDiagram.length });
        
        // Show loading state
        diagramContent.innerHTML = '<div class="diagram-placeholder">Rendering diagram...</div>';
        
        // Try to use Mermaid if available, otherwise show textual diagram
        if (window.mermaid && typeof window.mermaid.render === 'function') {
          logToServer('Diagram: Using Mermaid rendering');
          const diagramId = 'flow-diagram-' + Date.now();
          const { svg } = await window.mermaid.render(diagramId, currentFlowDiagram);
          diagramContent.innerHTML = svg;
          logToServer('Diagram: Mermaid diagram rendered successfully');
        } else {
          // Fallback: render as formatted text
          logToServer('Diagram: Using fallback text rendering');
          const formattedDiagram = currentFlowDiagram
            .split('\\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => \`<div style="font-family: monospace; margin: 2px 0; color: #cccccc;">\${line}</div>\`)
            .join('');
          
          diagramContent.innerHTML = \`
            <div style="background: #2d2d30; padding: 15px; border-radius: 4px; border: 1px solid #454545;">
              <div style="color: #ffa500; font-weight: bold; margin-bottom: 10px;">📊 Query Flow (Text Mode)</div>
              <div style="max-height: 400px; overflow-y: auto;">
                \${formattedDiagram}
              </div>
              <div style="margin-top: 10px; font-size: 12px; color: #888888;">
                <em>Mermaid.js not available - showing textual representation</em>
              </div>
            </div>
          \`;
          logToServer('Diagram: Fallback text diagram rendered');
        }
        
      } catch (error) {
        logToServer('Diagram: Error rendering flow diagram', { error: error.message });
        diagramContent.innerHTML = \`
          <div class="diagram-placeholder" style="color: #f44336;">
            Error rendering diagram: \${error.message}<br>
            <small>Check debug logs for details</small><br>
            <button onclick="refreshDiagram()" style="margin-top: 10px; padding: 5px 10px;">Retry</button>
          </div>
        \`;
      }
    }
    
    async function loadMermaidJs() {
      return new Promise((resolve, reject) => {
        // Try to use existing mermaid if available
        if (window.mermaid && typeof window.mermaid.render === 'function') {
          logToServer('Diagram: Mermaid already available');
          resolve();
          return;
        }
        
        // Remove any existing mermaid scripts to avoid conflicts
        const existingScripts = document.querySelectorAll('script[src*="mermaid"]');
        existingScripts.forEach(script => script.remove());
        
        logToServer('Diagram: Loading fresh Mermaid script');
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js';
        
        // Set up a timeout as fallback
        const timeout = setTimeout(() => {
          logToServer('Diagram: Mermaid load timeout');
          reject(new Error('Mermaid load timeout'));
        }, 10000);
        
        script.onload = () => {
          clearTimeout(timeout);
          logToServer('Diagram: Mermaid script loaded, checking availability');
          
          // Simple polling with shorter intervals
          let retries = 0;
          const maxRetries = 100;
          
          const checkMermaid = () => {
            retries++;
            logToServer('Diagram: Checking mermaid availability', { 
              retries, 
              hasMermaid: !!window.mermaid,
              hasRender: !!(window.mermaid && window.mermaid.render)
            });
            
            if (window.mermaid && typeof window.mermaid.render === 'function') {
              logToServer('Diagram: Mermaid render() function confirmed available', { retries });
              resolve();
            } else if (retries < maxRetries) {
              setTimeout(checkMermaid, 25); // Very frequent checks
            } else {
              logToServer('Diagram: Mermaid not available after maximum retries', { retries });
              reject(new Error('Mermaid not available after script load'));
            }
          };
          
          // Start checking with a minimal delay
          setTimeout(checkMermaid, 10);
        };
        
        script.onerror = (error) => {
          clearTimeout(timeout);
          logToServer('Diagram: Mermaid script load error', { error: error.toString() });
          reject(error);
        };
        
        document.head.appendChild(script);
      });
    }
    
    async function refreshDiagram() {
      try {
        if (!editor) {
          showToast('Editor not available', 'warning');
          return;
        }
        
        const currentSql = editor.getValue().trim();
        if (!currentSql) {
          showToast('No SQL query to generate diagram', 'warning');
          return;
        }
        
        showToast('Generating diagram...', 'info');
        
        // Generate diagram for current active tab's query
        const response = await fetch('/api/generate-diagram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            sql: currentSql,
            includeCteSupplement: true 
          })
        });
        
        const data = await response.json();
        
        if (data.success && data.flowDiagram) {
          updateFlowDiagram(data.flowDiagram);
          showToast('Diagram generated successfully', 'success');
          
          // Log composed SQL info if available
          if (data.composedSql && data.composedSql !== currentSql) {
            console.log('Diagram generated with CTE supplementation:', data.composedSql);
          }
        } else {
          showToast(\`Failed to generate diagram: \${data.error || 'Unknown error'}\`, 'error');
        }
        
      } catch (error) {
        showToast(\`Error generating diagram: \${error.message}\`, 'error');
        console.error('Diagram generation error:', error);
      }
    }
    
    function toggleDiagramSidebar() {
      const diagramSidebar = document.getElementById('diagram-sidebar');
      const toggleButton = document.getElementById('diagram-toggle-btn');
      
      if (diagramSidebar && toggleButton) {
        isDiagramVisible = !isDiagramVisible;
        
        if (isDiagramVisible) {
          // Show sidebar, hide floating button
          diagramSidebar.style.display = 'flex';
          toggleButton.style.display = 'none';
        } else {
          // Hide sidebar, show floating button
          diagramSidebar.style.display = 'none';
          toggleButton.style.display = 'block';
        }
        
        showToast(\`Diagram panel \${isDiagramVisible ? 'shown' : 'hidden'}\`, 'info');
      }
    }
    
    // ====================================================================
    // Auto Diagram Generation
    // ====================================================================
    
    let diagramUpdateTimeout = null;
    
    function setupAutoDiagramGeneration() {
      if (!editor) return;
      
      // Listen to content changes in editor
      editor.onDidChangeModelContent(() => {
        // Debounce diagram updates (wait 2 seconds after last change)
        if (diagramUpdateTimeout) {
          clearTimeout(diagramUpdateTimeout);
        }
        
        diagramUpdateTimeout = setTimeout(() => {
          updateDiagramForCurrentTab();
        }, 2000);
      });
    }
    
    async function updateDiagramForCurrentTab() {
      try {
        logToServer('Diagram: Auto update triggered', { isDiagramVisible });
        
        if (!editor || !isDiagramVisible) {
          logToServer('Diagram: Auto update skipped - editor or visibility issue');
          return;
        }
        
        const currentSql = editor.getValue().trim();
        logToServer('Diagram: Auto update SQL', { length: currentSql.length });
        
        if (!currentSql || currentSql.length < 10) {
          // Clear diagram for very short queries
          logToServer('Diagram: SQL too short, clearing diagram');
          const diagramContent = document.getElementById('diagram-content');
          if (diagramContent) {
            diagramContent.innerHTML = '<div class="diagram-placeholder">Enter a SQL query to see the flow diagram</div>';
          }
          return;
        }
        
        logToServer('Diagram: Generating auto diagram', { sqlPreview: currentSql.substring(0, 50) });
        
        // Generate diagram for current query with CTE supplementation
        const response = await fetch('/api/generate-diagram', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            sql: currentSql,
            includeCteSupplement: true 
          })
        });
        
        const data = await response.json();
        logToServer('Diagram: Auto diagram API response', { success: data.success, error: data.error });
        
        if (data.success && data.flowDiagram) {
          logToServer('Diagram: Auto updating flow diagram');
          updateFlowDiagram(data.flowDiagram);
        } else {
          logToServer('Diagram: Auto diagram generation failed', { error: data.error });
        }
        
      } catch (error) {
        logToServer('Diagram: Auto diagram update error', { error: error.message });
        // Show error in diagram area for auto-updates too
        const diagramContent = document.getElementById('diagram-content');
        if (diagramContent) {
          diagramContent.innerHTML = \`
            <div class="diagram-placeholder" style="color: #f44336;">
              Auto diagram failed: \${error.message}<br>
              <button onclick="refreshDiagram()" style="margin-top: 5px; padding: 3px 8px; font-size: 12px;">Manual Refresh</button>
            </div>
          \`;
        }
      }
    }
    
    // Make functions globally accessible
    window.openSharedCteTab = openSharedCteTab;
    window.switchTab = switchTab;
    window.closeTab = closeTab;
    window.saveCurrentTab = saveCurrentTab;
    window.createNewTab = createNewTab;
    window.decomposeCurrentQuery = decomposeCurrentQuery;
    window.clearWorkspace = clearWorkspace;
    window.openPrivateCteTab = openPrivateCteTab;
    window.openMainFileTab = openMainFileTab;
    window.updateFlowDiagram = updateFlowDiagram;
    window.refreshDiagram = refreshDiagram;
    window.toggleDiagramSidebar = toggleDiagramSidebar;
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
          wordWrap: 'off',
          lineNumbers: 'on',
          folding: false,
          renderLineHighlight: 'line',
          selectOnLineNumbers: true,
          // Enable horizontal scroll bar for long lines
          scrollbar: {
            horizontal: 'visible',
            vertical: 'visible'
          },
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
        
        // Assign to leftEditor for tab system compatibility
        leftEditor = editor;
        
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
        
        // Setup auto-diagram generation
        setupAutoDiagramGeneration();
        
        // Track active panel when left editor gains focus
        leftEditor.onDidFocusEditorWidget(function() {
          activePanel = 'left';
          updateQueryResults(); // Update results when switching panels
        });
        
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
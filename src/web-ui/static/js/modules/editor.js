// editor.js - Monaco Editor initialization and management

let leftEditor = null;
let rightEditor = null;

export async function initializeEditors() {
  try {
    window.logger.info('Initializing Monaco Editor...');
    
    // Initialize Monaco Editor
    await setupMonacoEditor();
    
    // Setup editor instances
    await createEditorInstances();
    
    window.logger.info('Monaco Editor initialized successfully');
    
  } catch (error) {
    window.logger.error('Failed to initialize Monaco Editor:', error);
    throw error;
  }
}

async function setupMonacoEditor() {
  return new Promise((resolve, reject) => {
    require.config({
      paths: {
        vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.36.1/min/vs'
      }
    });
    
    require(['vs/editor/editor.main'], () => {
      // Configure SQL language
      monaco.languages.register({ id: 'sql' });
      
      // Set SQL language configuration
      monaco.languages.setMonarchTokensProvider('sql', {
        tokenizer: {
          root: [
            [/\b(SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|OUTER|ON|GROUP|ORDER|BY|HAVING|LIMIT|OFFSET|UNION|INTERSECT|EXCEPT|WITH|AS|DISTINCT|ALL|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|VIEW|DATABASE|SCHEMA|GRANT|REVOKE|COMMIT|ROLLBACK|TRANSACTION|BEGIN|END)\b/i, 'keyword'],
            [/\b(AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|TRUE|FALSE)\b/i, 'operator'],
            [/\b(INTEGER|VARCHAR|TEXT|BOOLEAN|DECIMAL|TIMESTAMP|DATE|TIME|SERIAL|BIGINT|SMALLINT|CHAR|NUMERIC|REAL|DOUBLE|PRECISION)\b/i, 'type'],
            [/\b\d+\b/, 'number'],
            [/'[^']*'/, 'string'],
            [/"[^"]*"/, 'string'],
            [/--.*$/, 'comment'],
            [/\/\*[\s\S]*?\*\//, 'comment']
          ]
        }
      });
      
      resolve();
    });
  });
}

async function createEditorInstances() {
  // Create left editor
  const leftEditorElement = document.getElementById('left-editor');
  if (leftEditorElement) {
    leftEditor = monaco.editor.create(leftEditorElement, {
      value: '-- Welcome to zosql Browser\n-- Enter your SQL query here\n\nSELECT * FROM users;',
      language: 'sql',
      theme: 'vs-dark',
      wordWrap: 'off',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      tabSize: 2,
      insertSpaces: true,
      automaticLayout: true
    });
    
    // Store reference
    window.appState.leftEditor = leftEditor;
    
    // Setup editor events
    setupEditorEvents(leftEditor, 'left');
  }
  
  // Create right editor (initially not visible)
  const rightEditorElement = document.getElementById('right-editor');
  if (rightEditorElement) {
    rightEditor = monaco.editor.create(rightEditorElement, {
      value: '-- Right panel editor\n-- This editor is used when split view is enabled\n\nSELECT * FROM orders;',
      language: 'sql',
      theme: 'vs-dark',
      wordWrap: 'off',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      tabSize: 2,
      insertSpaces: true,
      automaticLayout: true
    });
    
    // Store reference
    window.appState.rightEditor = rightEditor;
    
    // Setup editor events
    setupEditorEvents(rightEditor, 'right');
  }
}

function setupEditorEvents(editor, panel) {
  // Content change event
  editor.onDidChangeModelContent(() => {
    // Mark current tab as modified
    const currentTabId = panel === 'left' ? window.appState.activeLeftTabId : window.appState.activeRightTabId;
    if (currentTabId) {
      const tabs = panel === 'left' ? window.appState.leftTabs : window.appState.rightTabs;
      const tab = tabs.get(currentTabId);
      if (tab) {
        tab.isModified = true;
        tab.content = editor.getValue();
        // Update tab UI to show modified indicator
        updateTabUI(currentTabId, panel);
      }
    }
  });
  
  // Focus event
  editor.onDidFocusEditorWidget(() => {
    window.appState.activePanel = panel;
    updateActivePanel(panel);
  });
  
  // Key bindings
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    runQuery();
  });
  
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
    formatCurrentSQL();
  });
  
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    saveCurrentTab();
  });
}

function updateTabUI(tabId, panel) {
  const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (tabElement) {
    const tabs = panel === 'left' ? window.appState.leftTabs : window.appState.rightTabs;
    const tab = tabs.get(tabId);
    if (tab) {
      const modifiedIndicator = tab.isModified ? ' •' : '';
      const icon = getTabIcon(tab.type);
      tabElement.innerHTML = `
        ${icon} ${tab.name}${modifiedIndicator}
        <span class="close-btn" onclick="closeTab(event, '${tabId}', '${panel}')">×</span>
      `;
    }
  }
}

function getTabIcon(type) {
  switch (type) {
    case 'table': return '📋';
    case 'shared-cte': return '🔶';
    case 'private-cte': return '🔧';
    case 'main-file': return '📄';
    default: return '📝';
  }
}

function updateActivePanel(panel) {
  // Update panel visual indicators
  const leftPanel = document.getElementById('left-editor-panel');
  const rightPanel = document.getElementById('right-editor-panel');
  
  if (leftPanel) {
    leftPanel.classList.toggle('active', panel === 'left');
  }
  if (rightPanel) {
    rightPanel.classList.toggle('active', panel === 'right');
  }
  
  // Update context panel
  if (window.updateContextPanel) {
    window.updateContextPanel();
  }
}

export function getCurrentEditor() {
  return window.appState.activePanel === 'left' ? leftEditor : rightEditor;
}

export function getEditor(panel) {
  return panel === 'left' ? leftEditor : rightEditor;
}

export function setEditorContent(panel, content) {
  const editor = getEditor(panel);
  if (editor) {
    editor.setValue(content);
  }
}

export function getEditorContent(panel) {
  const editor = getEditor(panel);
  return editor ? editor.getValue() : '';
}

export function formatCurrentSQL() {
  const editor = getCurrentEditor();
  if (!editor) return;
  
  const sql = editor.getValue();
  if (!sql.trim()) return;
  
  // Call the format API
  fetch('/api/format', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      editor.setValue(data.formatted);
      window.logger.info('SQL formatted successfully');
    } else {
      window.logger.error('Format failed:', data.error);
    }
  })
  .catch(error => {
    window.logger.error('Format request failed:', error);
  });
}

export function saveCurrentTab() {
  const currentTabId = window.appState.activePanel === 'left' 
    ? window.appState.activeLeftTabId 
    : window.appState.activeRightTabId;
  
  if (!currentTabId) return;
  
  const tabs = window.appState.activePanel === 'left' 
    ? window.appState.leftTabs 
    : window.appState.rightTabs;
  
  const tab = tabs.get(currentTabId);
  if (tab) {
    tab.isModified = false;
    tab.content = getCurrentEditor().getValue();
    updateTabUI(currentTabId, window.appState.activePanel);
    window.logger.info(`Tab "${tab.name}" saved successfully`);
  }
}

// Global functions for HTML compatibility
window.formatCurrentSQL = formatCurrentSQL;
window.saveCurrentTab = saveCurrentTab;
window.runQuery = runQuery;

export async function runQuery() {
  const editor = getCurrentEditor();
  if (!editor) return;
  
  const sql = editor.getValue();
  if (!sql.trim()) return;
  
  try {
    // Import database module dynamically
    const { executeQuery } = await import('./database.js');
    
    window.logger.info('Executing query...');
    const result = await executeQuery(sql);
    
    // Update results in the current panel
    updateQueryResults(result, window.appState.activePanel);
    
  } catch (error) {
    window.logger.error('Query execution failed:', error);
    
    // Show error in results panel
    updateQueryResults({
      success: false,
      error: error.message,
      executionTime: 0
    }, window.appState.activePanel);
  }
}

function updateQueryResults(result, panel) {
  const resultsContainer = document.getElementById(`${panel}-results-content`);
  const executionInfo = document.getElementById(`${panel}-execution-info`);
  
  if (!resultsContainer || !executionInfo) return;
  
  if (result.success) {
    // Update execution info
    executionInfo.textContent = `${result.rows.length} rows (${result.executionTime.toFixed(2)}ms)`;
    
    // Create table HTML
    if (result.rows.length > 0) {
      let tableHtml = '<table><thead><tr>';
      
      // Add headers
      result.fields.forEach(field => {
        tableHtml += `<th>${field.name}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';
      
      // Add rows
      result.rows.forEach(row => {
        tableHtml += '<tr>';
        result.fields.forEach(field => {
          const value = row[field.name];
          tableHtml += `<td>${value !== null ? value : '<em>null</em>'}</td>`;
        });
        tableHtml += '</tr>';
      });
      
      tableHtml += '</tbody></table>';
      resultsContainer.innerHTML = tableHtml;
    } else {
      resultsContainer.innerHTML = '<div class="results-placeholder">Query executed successfully (0 rows returned)</div>';
    }
    
    // Store result in current tab
    const currentTabId = panel === 'left' ? window.appState.activeLeftTabId : window.appState.activeRightTabId;
    if (currentTabId) {
      const tabs = panel === 'left' ? window.appState.leftTabs : window.appState.rightTabs;
      const tab = tabs.get(currentTabId);
      if (tab) {
        tab.queryResult = result;
      }
    }
    
  } else {
    // Show error
    executionInfo.textContent = 'Query failed';
    resultsContainer.innerHTML = `
      <div style="color: #f44336; padding: 20px; font-family: monospace;">
        <strong>Error:</strong> ${result.error}
      </div>
    `;
  }
}
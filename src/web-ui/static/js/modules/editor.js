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

async function loadFormatterConfig() {
  try {
    const response = await fetch('/api/formatter-config');
    if (response.ok) {
      const config = await response.json();
      return config;
    } else {
      // Return default config if API fails
      return {
        indentSize: 4,
        indentChar: ' ',
        tabSize: 4
      };
    }
  } catch (error) {
    // Return default config if request fails
    return {
      indentSize: 4,
      indentChar: ' ',
      tabSize: 4
    };
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
      
      // Set SQL language configuration with enhanced highlighting
      monaco.languages.setMonarchTokensProvider('sql', {
        ignoreCase: true,
        tokenizer: {
          root: [
            // CTE highlighting - WITH keyword gets special treatment
            [/\bWITH\b/i, 'keyword.cte'],
            
            // Keywords - explicit regex patterns
            [/\b(SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|OUTER|FULL|CROSS|ON|GROUP|ORDER|BY|HAVING|LIMIT|OFFSET|UNION|INTERSECT|EXCEPT|ALL|AS|DISTINCT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|TABLE|INDEX|VIEW|DATABASE|SCHEMA|SEQUENCE|FUNCTION|PROCEDURE|TRIGGER|GRANT|REVOKE|COMMIT|ROLLBACK|TRANSACTION|BEGIN|END|CASE|WHEN|THEN|ELSE|IF|WHILE|FOR|LOOP|RETURN|DECLARE|SET|VALUES|INTO|RECURSIVE)\b/i, 'keyword'],
            
            // Operators
            [/\b(AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ILIKE|IS|NULL|TRUE|FALSE|SIMILAR|REGEXP|RLIKE|GLOB|MATCH|ANY|SOME|ALL)\b/i, 'operator'],
            
            // Built-in functions
            [/\b(COUNT|SUM|AVG|MIN|MAX|FIRST|LAST|COALESCE|NULLIF|GREATEST|LEAST|CAST|CONVERT|SUBSTRING|SUBSTR|LENGTH|CHAR_LENGTH|TRIM|LTRIM|RTRIM|UPPER|LOWER|CONCAT|REPLACE|SPLIT_PART|POSITION|STRPOS|LEFT|RIGHT|NOW|CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|EXTRACT|DATE_PART|AGE|ROUND|FLOOR|CEIL|ABS|RANDOM|GENERATE_SERIES|UNNEST|ARRAY_AGG|STRING_AGG|JSON_AGG|JSONB_AGG|ROW_NUMBER|RANK|DENSE_RANK|PERCENT_RANK|CUME_DIST|NTILE|LAG|LEAD|FIRST_VALUE|LAST_VALUE|NTH_VALUE)(?=\s*\()/i, 'predefined.function'],
            
            // Data types
            [/\b(INTEGER|INT|BIGINT|SMALLINT|TINYINT|DECIMAL|NUMERIC|REAL|FLOAT|DOUBLE|PRECISION|MONEY|VARCHAR|CHAR|TEXT|STRING|CLOB|BLOB|BOOLEAN|BOOL|BIT|DATE|TIME|TIMESTAMP|TIMESTAMPTZ|INTERVAL|UUID|JSON|JSONB|XML|ARRAY|HSTORE|INET|CIDR|MACADDR|SERIAL|BIGSERIAL|SMALLSERIAL|IDENTITY|GENERATED|ALWAYS)\b/i, 'type'],
            
            // Numbers
            [/\b\d+(\.\d+)?\b/, 'number'],
            [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
            
            // Strings
            [/'([^'\\]|\\.)*'/, 'string'],
            [/"([^"\\]|\\.)*"/, 'string'],
            [/`([^`\\]|\\.)*`/, 'string.backtick'],
            
            // Parameters and variables
            [/[@$][a-zA-Z_][a-zA-Z0-9_]*/, 'variable'],
            [/:[a-zA-Z_][a-zA-Z0-9_]*/, 'variable.parameter'],
            
            // Identifiers (table names, column names, etc.)
            [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
            
            // Comments
            [/--.*$/, 'comment'],
            [/\/\*/, 'comment', '@comment'],
            
            // Operators and punctuation
            [/[=<>!]+/, 'operator'],
            [/[()[\]{},;]/, 'delimiter'],
            [/[+\-*/%]/, 'operator'],
            
            // Whitespace
            [/\s+/, 'white']
          ],
          
          comment: [
            [/[^/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[/*]/, 'comment']
          ]
        }
      });
      
      // Define custom SQL theme with enhanced colors
      monaco.editor.defineTheme('sql-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
          { token: 'keyword.cte', foreground: 'C586C0', fontStyle: 'bold' },
          { token: 'operator', foreground: 'D4D4D4' },
          { token: 'predefined.function', foreground: 'DCDCAA' },
          { token: 'type', foreground: '4EC9B0' },
          { token: 'string', foreground: 'CE9178' },
          { token: 'string.backtick', foreground: 'CE9178' },
          { token: 'number', foreground: 'B5CEA8' },
          { token: 'number.hex', foreground: 'B5CEA8' },
          { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
          { token: 'variable', foreground: '9CDCFE' },
          { token: 'variable.parameter', foreground: '9CDCFE', fontStyle: 'italic' },
          { token: 'identifier', foreground: 'D4D4D4' },
          { token: 'delimiter', foreground: 'D4D4D4' }
        ],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
          'editor.selectionBackground': '#264f78',
          'editor.lineHighlightBackground': '#2a2d2e'
        }
      });
      
      // Configure SQL language features
      monaco.languages.setLanguageConfiguration('sql', {
        comments: {
          lineComment: '--',
          blockComment: ['/*', '*/']
        },
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')']
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"', notIn: ['string'] },
          { open: "'", close: "'", notIn: ['string', 'comment'] }
        ],
        surroundingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ],
        folding: {
          markers: {
            start: new RegExp('^\\s*\\/\\*'),
            end: new RegExp('^\\s*\\*\\/')
          }
        }
      });
      
      resolve();
    });
  });
}

async function createEditorInstances() {
  // Load formatter config to match editor settings
  const formatterConfig = await loadFormatterConfig();
  const tabSize = formatterConfig.indentSize || 4;
  
  // Create left editor
  const leftEditorElement = document.getElementById('left-editor');
  if (leftEditorElement) {
    leftEditor = monaco.editor.create(leftEditorElement, {
      value: '-- Welcome to zosql Browser\n-- Enter your SQL query here\n\nSELECT * FROM users;',
      language: 'sql',
      theme: 'sql-dark',
      wordWrap: 'off',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      tabSize: tabSize,
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
      theme: 'sql-dark',
      wordWrap: 'off',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      tabSize: tabSize,
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
    case 'table': return '[TBL]';
    case 'shared-cte': return '[SHARED]';
    case 'private-cte': return '[PRIVATE]';
    case 'main-file': return '[FILE]';
    default: return '[QUERY]';
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
  fetch('/api/format-sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  })
  .then(async response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      const formattedSql = data.formatted || data.formattedSql;
      if (formattedSql) {
        editor.setValue(formattedSql);
        window.logger.info('SQL formatted successfully');
        window.showSuccessToast('SQL formatted successfully', 'Format Complete');
      } else {
        window.logger.error('Format failed: No formatted SQL returned');
        window.showErrorToast('No formatted SQL returned', 'Format Failed');
      }
    } else {
      window.logger.error('Format failed:', data.error);
      window.showErrorToast(data.error || 'Unknown error', 'Format Failed');
    }
  })
  .catch(error => {
    window.logger.error('Format request failed:', error);
    window.showErrorToast('Failed to connect to format service', 'Format Error');
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
    
    // Show success toast
    if (result.success) {
      const rowCount = result.rows ? result.rows.length : 0;
      const executionTime = result.executionTime ? result.executionTime.toFixed(2) : 0;
      window.showSuccessToast(`Query executed successfully (${rowCount} rows, ${executionTime}ms)`, 'Query Complete');
    } else {
      window.showErrorToast(result.error || 'Query failed', 'Query Error');
    }
    
  } catch (error) {
    window.logger.error('Query execution failed:', error);
    
    // Show error in results panel
    updateQueryResults({
      success: false,
      error: error.message,
      executionTime: 0
    }, window.appState.activePanel);
    
    // Show error toast
    window.showErrorToast(error.message || 'Query execution failed', 'Query Error');
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
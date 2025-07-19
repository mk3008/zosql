// app.js - Shadow DOM Only Application Entry Point

import { Logger } from './modules/logger.js';
import { SidebarManager } from './modules/sidebar-manager.js';
import { HeaderControls } from './modules/header-controls.js';
import { initializeUI } from './modules/ui.js';
import './modules/toast.js';

// Global state management - Shadow DOM Architecture
window.appState = {
  schemaData: null,
  sharedCteData: null,
  lastValidQuery: null,
  currentSchemaData: null,
  lastSuccessfulParseResult: null,
  isIntelliSenseEnabled: true,
  
  // Shadow DOM Component References
  components: {
    headerShadow: null,
    workspacePanelShadow: null,
    centerPanelShadow: null,
    rightPanelShadow: null
  }
};

// Initialize logging
const logger = new Logger();

// Initialize the application
async function initializeApp() {
  try {
    console.log('Starting zosql Browser (Shadow DOM Mode)');
    
    // SidebarManager は sidebar-manager.js で自動初期化される
    
    // Initialize header controls
    const headerControls = new HeaderControls();
    window.headerControls = headerControls;
    
    // Wait for Shadow DOM components to be ready
    await waitForShadowComponents();
    
    // Initialize components
    initializeShadowComponents();
    
    // Initialize UI components (including resize handles)
    initializeUI();
    
    // Initialize database connection
    await initializeDatabase();
    
    // Initialize schema data
    await initializeSchema();
    
    console.log('Application initialized successfully');
    
  } catch (error) {
    console.error('Application initialization failed:', error);
    showErrorToast('Failed to initialize application: ' + error.message);
  }
}

// Wait for Shadow DOM components to be ready
async function waitForShadowComponents() {
  const components = [
    'header-shadow',
    'workspace-panel-shadow', 
    'center-panel-shadow',
    'right-panel-shadow'
  ];
  
  const promises = components.map(tagName => {
    return new Promise((resolve) => {
      if (customElements.get(tagName)) {
        resolve();
      } else {
        customElements.whenDefined(tagName).then(resolve);
      }
    });
  });
  
  await Promise.all(promises);
  console.log('Shadow DOM components ready');
}

// Initialize Shadow DOM components
function initializeShadowComponents() {
  // Get component references
  const headerShadow = document.getElementById('header-shadow');
  const workspacePanelShadow = document.getElementById('workspace-panel-shadow');
  const centerPanelShadow = document.getElementById('center-panel-shadow');
  const rightPanelShadow = document.getElementById('right-panel-shadow');
  
  // Store references
  window.appState.components = {
    headerShadow,
    workspacePanelShadow,
    centerPanelShadow,
    rightPanelShadow
  };
  
  // Setup Shadow DOM component event listeners
  setupShadowComponentEventListeners();
  
  console.log('Shadow DOM components initialized');
}

// Setup Shadow DOM component event listeners
function setupShadowComponentEventListeners() {
  const headerShadow = document.getElementById('header-shadow');
  const centerPanelShadow = document.getElementById('center-panel-shadow');
  
  if (headerShadow) {
    // Listen for open-file event from header-shadow
    headerShadow.addEventListener('open-file', async (event) => {
      console.log('[App] Received open-file event from header-shadow:', event.detail);
      
      // Delegate to HeaderControls methods directly
      if (window.headerControls) {
        const { fileName, content } = event.detail;
        
        try {
          // Format the SQL content
          const formattedContent = await window.headerControls.formatSQL(content);
          
          // Open in new tab
          await window.headerControls.openInNewTab(fileName, formattedContent);
          
          // Analyze CTE dependencies  
          await window.headerControls.analyzeCTEDependencies(formattedContent, fileName);
          
          // Show success message
          window.headerControls.showToast(`ファイル "${fileName}" を開きました`, 'success');
          
          console.log(`[App] Successfully processed file: ${fileName}`);
          
        } catch (error) {
          console.error('[App] Failed to process file:', error);
          window.headerControls.showToast(`ファイル処理エラー: ${error.message}`, 'error');
        }
      } else {
        console.error('[App] HeaderControls not available to handle file open');
      }
    });
    
    // Note: サイドバートグルはsidebar-manager.jsで直接リッスンしているため、ここでは処理しない
  }
  
  // Center Panel event listeners
  if (centerPanelShadow) {
    // SQL実行
    centerPanelShadow.addEventListener('run-query', async (event) => {
      console.log('[App] Run query event received:', event.detail);
      await handleRunQuery(event.detail);
    });
    
    // SQL整形
    centerPanelShadow.addEventListener('format-sql', async (event) => {
      console.log('[App] Format SQL event received:', event.detail);
      await handleFormatSQL(event.detail);
    });
    
    // タブ保存
    centerPanelShadow.addEventListener('save-tab', async (event) => {
      console.log('[App] Save tab event received:', event.detail);
      await handleSaveTab(event.detail);
    });
  }
  
  console.log('[App] Shadow DOM event listeners setup complete');
}

// Initialize database connection
async function initializeDatabase() {
  try {
    // This will be implemented when database functionality is needed
    console.log('Database initialization placeholder');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

// Initialize schema data
async function initializeSchema() {
  try {
    // This will be implemented when schema functionality is needed
    console.log('Schema initialization placeholder');
  } catch (error) {
    console.error('Schema initialization failed:', error);
  }
}

// Handle SQL query execution
async function handleRunQuery(data) {
  const { tabId, tab } = data;
  const centerPanelShadow = window.appState.components.centerPanelShadow;
  
  if (!centerPanelShadow) {
    console.error('[App] Center panel shadow not available');
    return;
  }
  
  try {
    // Get SQL content from Monaco Editor
    const editor = centerPanelShadow.getMonacoEditor(tabId);
    if (!editor) {
      showErrorToast('Editor not ready');
      return;
    }
    
    const sql = editor.getValue().trim();
    if (!sql) {
      showErrorToast('Please enter a SQL query');
      return;
    }
    
    // Show loading state
    const resultsContainer = centerPanelShadow.shadowRoot.getElementById(`results-${tabId}`);
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="results-loading">Executing query...</div>';
    }
    
    // Execute query via PGlite API
    const response = await fetch('/api/execute-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Display results in grid
      displayQueryResults(tabId, result);
      showSuccessToast(`Query executed successfully (${result.result.rows.length} rows)`);
    } else {
      // Display error
      displayQueryError(tabId, result.error);
      showErrorToast('Query execution failed: ' + result.error);
    }
    
  } catch (error) {
    console.error('[App] Query execution error:', error);
    displayQueryError(tabId, error.message);
    showErrorToast('Network error during query execution: ' + error.message);
  }
}

// Handle SQL formatting
async function handleFormatSQL(data) {
  const { tabId, tab } = data;
  const centerPanelShadow = window.appState.components.centerPanelShadow;
  
  if (!centerPanelShadow) {
    console.error('[App] Center panel shadow not available');
    return;
  }
  
  try {
    const editor = centerPanelShadow.getMonacoEditor(tabId);
    if (!editor) {
      showErrorToast('Editor not ready');
      return;
    }
    
    const sql = editor.getValue();
    if (!sql || sql.trim().length === 0) {
      showErrorToast('No SQL to format');
      return;
    }
    
    const response = await fetch('/api/format-sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });
    
    const result = await response.json();
    
    if (result.success && result.formattedSql) {
      editor.setValue(result.formattedSql);
      showSuccessToast('SQL formatted successfully');
    } else {
      showErrorToast('SQL formatting failed: ' + (result.error || 'Unknown error'));
    }
    
  } catch (error) {
    console.error('[App] SQL formatting error:', error);
    showErrorToast('Network error during formatting: ' + error.message);
  }
}

// Handle tab saving
async function handleSaveTab(data) {
  const { tabId, tab } = data;
  // Placeholder for tab saving functionality
  console.log('[App] Save tab:', tabId, tab);
  showSuccessToast('Tab saved (placeholder)');
}

// Display query results in grid format
function displayQueryResults(tabId, queryResult) {
  const centerPanelShadow = window.appState.components.centerPanelShadow;
  const resultsContainer = centerPanelShadow.shadowRoot.getElementById(`results-${tabId}`);
  
  if (!resultsContainer) return;
  
  const { result } = queryResult;
  
  if (!result.rows || result.rows.length === 0) {
    resultsContainer.innerHTML = '<div class="results-empty">No results returned</div>';
    return;
  }
  
  // Generate results table
  let html = '<div class="results-table-container">';
  html += '<table class="results-table">';
  
  // Header
  if (result.fields && result.fields.length > 0) {
    html += '<thead><tr>';
    result.fields.forEach(field => {
      html += `<th>${escapeHtml(field.name)}</th>`;
    });
    html += '</tr></thead>';
  }
  
  // Body
  html += '<tbody>';
  result.rows.forEach(row => {
    html += '<tr>';
    result.fields.forEach(field => {
      const value = row[field.name];
      html += `<td>${escapeHtml(String(value ?? ''))}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  html += '</div>';
  
  // Execution info
  html += `<div class="results-info">Executed in ${result.executionTime}ms (${result.rows.length} rows)</div>`;
  
  resultsContainer.innerHTML = html;
}

// Display query error
function displayQueryError(tabId, errorMessage) {
  const centerPanelShadow = window.appState.components.centerPanelShadow;
  const resultsContainer = centerPanelShadow.shadowRoot.getElementById(`results-${tabId}`);
  
  if (!resultsContainer) return;
  
  resultsContainer.innerHTML = `
    <div class="results-error">
      <strong>Query Error:</strong><br>
      ${escapeHtml(errorMessage)}
    </div>
  `;
}

// HTML escape utility
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show error toast
function showErrorToast(message) {
  if (window.showToast) {
    window.showToast(message, 'error');
  } else {
    alert(message);
  }
}

// Show success toast
function showSuccessToast(message) {
  if (window.showToast) {
    window.showToast(message, 'success');
  } else {
    console.log(message);
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('App.js loaded - Shadow DOM Mode');
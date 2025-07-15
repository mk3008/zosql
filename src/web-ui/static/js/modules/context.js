// context.js - Context panel management and SQL analysis

export function initializeContext() {
  window.logger.info('Initializing context panel...');
  updateContextPanel();
  window.logger.info('Context panel initialized successfully');
}

export function updateContextPanel() {
  const contextContent = document.getElementById('context-content');
  const contextTitle = document.getElementById('context-title');
  
  if (!contextContent || !contextTitle) return;
  
  // Get current active tab info
  const currentPanel = window.appState.activePanel;
  const currentTabId = currentPanel === 'left' ? window.appState.activeLeftTabId : window.appState.activeRightTabId;
  const currentTabs = currentPanel === 'left' ? window.appState.leftTabs : window.appState.rightTabs;
  
  if (!currentTabId || !currentTabs.has(currentTabId)) {
    contextTitle.textContent = '📄 Context Panel';
    contextContent.innerHTML = '<div class="context-placeholder">Open a tab to see context information</div>';
    return;
  }
  
  const currentTab = currentTabs.get(currentTabId);
  const tabType = currentTab.type;
  const tabName = currentTab.name;
  
  // Update title based on tab type
  let titleIcon = '📄';
  switch (tabType) {
    case 'shared-cte':
      titleIcon = '🔶';
      break;
    case 'private-cte':
      titleIcon = '🔧';
      break;
    case 'table':
      titleIcon = '📋';
      break;
    case 'main-file':
      titleIcon = '📄';
      break;
    default:
      titleIcon = '📝';
  }
  
  contextTitle.textContent = `${titleIcon} ${tabName} Context`;
  
  // Generate context content based on tab type and content
  generateContextContent(currentTab, contextContent);
}

function generateContextContent(tab, contextContainer) {
  const content = tab.content || '';
  
  let contextHtml = '';
  
  // Basic tab information
  contextHtml += `
    <div class="context-section">
      <h4>📋 Tab Information</h4>
      <div class="context-item">
        <strong>Name:</strong> ${tab.name}
      </div>
      <div class="context-item">
        <strong>Type:</strong> ${getTypeDescription(tab.type)}
      </div>
      <div class="context-item">
        <strong>Status:</strong> ${tab.isModified ? 'Modified' : 'Saved'}
      </div>
      <div class="context-item">
        <strong>Lines:</strong> ${content.split('\n').length}
      </div>
    </div>
  `;
  
  // SQL Analysis
  if (content.trim()) {
    const analysis = analyzeSqlContent(content);
    
    if (analysis.tables.length > 0 || analysis.ctes.length > 0 || analysis.columns.length > 0) {
      contextHtml += `
        <div class="context-section">
          <h4>🔍 SQL Analysis</h4>
      `;
      
      // Tables referenced
      if (analysis.tables.length > 0) {
        contextHtml += '<h5>Tables Referenced:</h5>';
        analysis.tables.forEach(table => {
          contextHtml += `<div class="context-item table">${table}</div>`;
        });
      }
      
      // CTEs found
      if (analysis.ctes.length > 0) {
        contextHtml += '<h5>CTEs Defined:</h5>';
        analysis.ctes.forEach(cte => {
          contextHtml += `<div class="context-item cte">${cte}</div>`;
        });
      }
      
      // Columns mentioned
      if (analysis.columns.length > 0 && analysis.columns.length <= 20) {
        contextHtml += '<h5>Columns Mentioned:</h5>';
        analysis.columns.slice(0, 10).forEach(column => {
          contextHtml += `<div class="context-item column">${column}</div>`;
        });
        if (analysis.columns.length > 10) {
          contextHtml += `<div class="context-item">... and ${analysis.columns.length - 10} more</div>`;
        }
      }
      
      contextHtml += '</div>';
    }
  }
  
  // Query Results
  if (tab.queryResult) {
    const result = tab.queryResult;
    contextHtml += `
      <div class="context-section">
        <h4>📊 Query Results</h4>
        <div class="context-item">
          <strong>Status:</strong> ${result.success ? 'Success' : 'Failed'}
        </div>
        <div class="context-item">
          <strong>Execution Time:</strong> ${result.executionTime?.toFixed(2) || 0}ms
        </div>
    `;
    
    if (result.success) {
      contextHtml += `
        <div class="context-item">
          <strong>Rows:</strong> ${result.rows?.length || 0}
        </div>
        <div class="context-item">
          <strong>Columns:</strong> ${result.fields?.length || 0}
        </div>
      `;
      
      if (result.fields && result.fields.length > 0) {
        contextHtml += '<h5>Column Schema:</h5>';
        result.fields.forEach(field => {
          contextHtml += `<div class="context-item column">${field.name} (${field.dataTypeID || 'unknown'})</div>`;
        });
      }
    } else if (result.error) {
      contextHtml += `
        <div class="context-item" style="color: #f44336;">
          <strong>Error:</strong> ${result.error}
        </div>
      `;
    }
    
    contextHtml += '</div>';
  }
  
  // Schema Context (for table tabs)
  if (tab.type === 'table' && window.appState.schemaData) {
    const tableName = tab.name;
    const table = window.appState.schemaData.tables?.find(t => t.name === tableName);
    
    if (table) {
      contextHtml += `
        <div class="context-section">
          <h4>🏗️ Table Schema</h4>
          <div class="context-item">
            <strong>Table:</strong> ${table.name}
          </div>
          <div class="context-item">
            <strong>Columns:</strong> ${table.columns.length}
          </div>
          <h5>Column Details:</h5>
      `;
      
      table.columns.forEach(column => {
        contextHtml += `
          <div class="context-item column">
            <strong>${column.name}</strong>: ${column.type}
          </div>
        `;
      });
      
      contextHtml += '</div>';
    }
  }
  
  // Tips and Shortcuts
  contextHtml += `
    <div class="context-section">
      <h4>💡 Tips & Shortcuts</h4>
      <div class="context-item">
        <strong>Ctrl+Enter:</strong> Run query
      </div>
      <div class="context-item">
        <strong>Ctrl+Shift+F:</strong> Format SQL
      </div>
      <div class="context-item">
        <strong>Ctrl+S:</strong> Save tab
      </div>
      <div class="context-item">
        <strong>Ctrl+W:</strong> Close tab
      </div>
      <div class="context-item">
        <strong>Ctrl+Shift+T:</strong> New tab
      </div>
    </div>
  `;
  
  contextContainer.innerHTML = contextHtml;
}

function getTypeDescription(type) {
  switch (type) {
    case 'table': return 'Database Table';
    case 'shared-cte': return 'Shared CTE';
    case 'private-cte': return 'Private CTE';
    case 'main-file': return 'Main SQL File';
    default: return 'SQL Query';
  }
}

function analyzeSqlContent(sql) {
  const analysis = {
    tables: [],
    ctes: [],
    columns: []
  };
  
  if (!sql || !sql.trim()) {
    return analysis;
  }
  
  const lines = sql.toLowerCase().split('\n');
  
  // Find table references (basic pattern matching)
  const tablePattern = /\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let match;
  while ((match = tablePattern.exec(sql)) !== null) {
    const table = match[1];
    if (!analysis.tables.includes(table)) {
      analysis.tables.push(table);
    }
  }
  
  // Find CTE definitions
  const ctePattern = /\bwith\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+as/gi;
  while ((match = ctePattern.exec(sql)) !== null) {
    const cte = match[1];
    if (!analysis.ctes.includes(cte)) {
      analysis.ctes.push(cte);
    }
  }
  
  // Find column references (basic pattern - this could be improved)
  const columnPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\.[a-zA-Z_][a-zA-Z0-9_]*/gi;
  while ((match = columnPattern.exec(sql)) !== null) {
    const column = match[0];
    if (!analysis.columns.includes(column) && analysis.columns.length < 50) {
      analysis.columns.push(column);
    }
  }
  
  // Find simple column names in SELECT
  const selectColumnPattern = /select\s+([^from]+?)(?:\s+from|\s*$)/gi;
  while ((match = selectColumnPattern.exec(sql)) !== null) {
    const selectClause = match[1];
    const columns = selectClause.split(',').map(col => col.trim());
    
    columns.forEach(col => {
      // Extract simple column names (avoiding functions and complex expressions)
      const simpleColumn = col.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/);
      if (simpleColumn && !['as', 'from', 'where', 'select', 'distinct', 'all'].includes(simpleColumn[1].toLowerCase())) {
        const columnName = simpleColumn[1];
        if (!analysis.columns.includes(columnName) && analysis.columns.length < 50) {
          analysis.columns.push(columnName);
        }
      }
    });
  }
  
  return analysis;
}

// Make updateContextPanel globally available
window.updateContextPanel = updateContextPanel;
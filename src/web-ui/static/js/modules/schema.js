// schema.js - Schema management and information loading

export async function initializeSchema() {
  try {
    await loadSchemaInfo();
    await loadSharedCteInfo();
    await loadWorkspaceInfo();
    
    // Update UI with schema information
    updateSchemaUI();
    
  } catch (error) {
    window.logger.error('Failed to initialize schema:', error);
  }
}

async function loadSchemaInfo() {
  try {
    window.logger.info('Loading schema information...');
    
    const response = await fetch('/api/schema');
    const data = await response.json();
    
    window.logger.info('Schema response received', {
      success: data.success,
      error: data.error,
      hasSchema: !!data.schema,
      tablesCount: data.schema?.tables?.length || 0
    });
    
    if (data.success && data.schema) {
      window.appState.schemaData = data.schema;
      window.logger.info('Schema loaded successfully', {
        tablesCount: data.schema.tables.length
      });
    } else {
      window.logger.error('Schema load failed', { error: data.error });
    }
    
  } catch (error) {
    window.logger.error('Error loading schema:', error);
  }
}

async function loadSharedCteInfo() {
  try {
    window.logger.info('Loading shared CTE information...');
    
    const response = await fetch('/api/shared-cte');
    const data = await response.json();
    
    window.logger.info('Shared CTE response received', {
      success: data.success,
      error: data.error,
      hasSharedCtes: !!data.sharedCtes,
      ctesCount: data.sharedCtes ? Object.keys(data.sharedCtes).length : 0
    });
    
    if (data.success && data.sharedCtes) {
      window.appState.sharedCteData = data.sharedCtes;
      window.logger.info('Shared CTEs loaded successfully', {
        ctesCount: Object.keys(data.sharedCtes).length
      });
    } else {
      window.logger.warn('Shared CTE load failed', { error: data.error });
    }
    
  } catch (error) {
    window.logger.error('Error loading shared CTEs:', error);
  }
}

async function loadWorkspaceInfo() {
  try {
    window.logger.info('Loading workspace information...');
    
    // Update workspace info in sidebar
    const workspaceInfo = document.getElementById('workspace-info');
    if (workspaceInfo) {
      workspaceInfo.innerHTML = '<div>No workspace active</div>';
    }
    
  } catch (error) {
    window.logger.error('Error loading workspace info:', error);
  }
}

function updateSchemaUI() {
  updateTablesInfo();
  updateSharedCteInfo();
}

function updateTablesInfo() {
  const tablesInfo = document.getElementById('tables-info');
  if (!tablesInfo) return;
  
  if (!window.appState.schemaData || !window.appState.schemaData.tables) {
    tablesInfo.innerHTML = '<div>No tables available</div>';
    return;
  }
  
  let tablesHtml = '';
  window.appState.schemaData.tables.forEach(table => {
    tablesHtml += `
      <div class="table-resource" style="margin-bottom: 8px; padding: 8px; border-radius: 3px; cursor: pointer;" 
           onclick="openTableTab('${table.name}')">
        <strong style="color: #007acc;">${table.name}</strong>
        <div style="font-size: 11px; color: #808080; margin-top: 2px;">
          ${table.columns.length} columns
        </div>
      </div>
    `;
  });
  
  tablesInfo.innerHTML = tablesHtml;
}

function updateSharedCteInfo() {
  const sharedCteInfo = document.getElementById('shared-cte-info');
  if (!sharedCteInfo) return;
  
  if (!window.appState.sharedCteData || Object.keys(window.appState.sharedCteData).length === 0) {
    sharedCteInfo.innerHTML = '<div>No shared CTEs available</div>';
    return;
  }
  
  let sharedCteHtml = '';
  Object.entries(window.appState.sharedCteData).forEach(([name, cte]) => {
    sharedCteHtml += `
      <div class="shared-cte-resource" style="margin-bottom: 8px; padding: 8px; border-radius: 3px; cursor: pointer;" 
           onclick="openSharedCteTab('${name}')">
        <strong style="color: #ffa500;">${name}</strong>
        <div style="font-size: 11px; color: #808080; margin-top: 2px;">
          ${cte.description || 'No description'}
        </div>
      </div>
    `;
  });
  
  sharedCteInfo.innerHTML = sharedCteHtml;
}

// Global functions that need to be accessible from HTML
window.openTableTab = function(tableName) {
  const table = window.appState.schemaData?.tables?.find(t => t.name === tableName);
  if (!table) return;
  
  const content = `-- Table: ${tableName}\n-- Columns: ${table.columns.map(c => `${c.name} (${c.type})`).join(', ')}\n\nSELECT * FROM ${tableName} LIMIT 10;`;
  
  // Use the tabs module to create a new tab
  if (window.createNewTab) {
    window.createNewTab(window.appState.activePanel, `table-${tableName}`, tableName, 'table', content);
  }
};

window.openSharedCteTab = function(cteName) {
  const cte = window.appState.sharedCteData?.[cteName];
  if (!cte) return;
  
  const content = `-- Shared CTE: ${cteName}\n-- Description: ${cte.description || 'No description'}\n\n${cte.sql || 'No SQL content'}`;
  
  // Use the tabs module to create a new tab
  if (window.createNewTab) {
    window.createNewTab(window.appState.activePanel, `shared-cte-${cteName}`, cteName, 'shared-cte', content);
  }
};

export function getSchemaData() {
  return window.appState.schemaData;
}

export function getSharedCteData() {
  return window.appState.sharedCteData;
}

export function refreshSchema() {
  return initializeSchema();
}
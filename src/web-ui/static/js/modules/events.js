// events.js - Event handling and DOM interactions

export function initializeEventHandlers() {
  window.logger.info('Initializing event handlers...');
  
  setupSidebarEvents();
  setupActionButtonEvents();
  setupDebugLogEvents();
  setupContextPanelEvents();
  
  window.logger.info('Event handlers initialized successfully');
}

function setupSidebarEvents() {
  // Sidebar toggle buttons are handled in ui.js
  
  // Collapsible sections
  document.querySelectorAll('h3.collapsible').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      if (targetId) {
        toggleSection(targetId);
      }
    });
  });
}

function setupActionButtonEvents() {
  // Decompose query button
  const decomposeBtn = document.getElementById('decompose-query-btn');
  if (decomposeBtn) {
    decomposeBtn.addEventListener('click', () => {
      decomposeCurrentQuery();
    });
  }
  
  // Clear workspace button
  const clearBtn = document.getElementById('clear-workspace-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearWorkspace();
    });
  }
  
  // Reset database button
  const resetBtn = document.getElementById('reset-database-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetDatabase();
    });
  }
  
  // CTE validation button
  const cteValidationBtn = document.getElementById('cte-validation-btn');
  if (cteValidationBtn) {
    cteValidationBtn.addEventListener('click', () => {
      toggleCteValidationPanel();
    });
  }
}

function setupDebugLogEvents() {
  const debugLogLink = document.getElementById('view-debug-logs');
  if (debugLogLink) {
    debugLogLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('.tmp/debug.log', '_blank');
    });
  }
}

function setupContextPanelEvents() {
  const refreshBtn = document.getElementById('refresh-context-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshContextPanel();
    });
  }
}

function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  const icon = document.getElementById(sectionId.replace('-section', '-icon'));
  
  if (section && icon) {
    const isVisible = section.style.display !== 'none';
    section.style.display = isVisible ? 'none' : 'block';
    icon.textContent = isVisible ? '▶' : '▼';
  }
}

async function decomposeCurrentQuery() {
  try {
    const { getCurrentEditor } = await import('./editor.js');
    const editor = getCurrentEditor();
    
    if (!editor) {
      window.logger.warn('No active editor found');
      return;
    }
    
    const sql = editor.getValue();
    if (!sql.trim()) {
      window.logger.warn('No SQL query to decompose');
      return;
    }
    
    window.logger.info('Decomposing current query...');
    
    const response = await fetch('/api/decompose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });
    
    const result = await response.json();
    
    if (result.success) {
      window.logger.info('Query decomposed successfully', result);
      
      // Create tabs for decomposed parts
      if (result.decomposedQuery) {
        const { createNewTab } = await import('./tabs.js');
        createNewTab(window.appState.activePanel, null, 'main.sql', 'main-file', result.decomposedQuery);
      }
      
      if (result.workspace && result.workspace.privateCtes) {
        const { createNewTab } = await import('./tabs.js');
        Object.entries(result.workspace.privateCtes).forEach(([name, cteData]) => {
          createNewTab(window.appState.activePanel, null, `${name}.cte`, 'private-cte', cteData.query);
        });
      }
      
      // Update left sidebar with workspace information
      window.logger.info('Updating workspace display...');
      await updateWorkspaceDisplay(result);
      
    } else {
      window.logger.error('Decomposition failed:', result.error);
      alert(`Decomposition failed: ${result.error}`);
    }
    
  } catch (error) {
    window.logger.error('Error during decomposition:', error);
    console.error('Decomposition error details:', error);
    alert(`Error during decomposition: ${error.message}`);
  }
}

async function clearWorkspace() {
  if (!confirm('Are you sure you want to clear the workspace? This will close all tabs.')) {
    return;
  }
  
  try {
    window.logger.info('Clearing workspace...');
    
    // Clear all tabs
    window.appState.leftTabs.clear();
    window.appState.rightTabs.clear();
    
    // Clear tab UI
    const leftTabBar = document.getElementById('left-tab-bar');
    const rightTabBar = document.getElementById('right-tab-bar');
    
    if (leftTabBar) {
      leftTabBar.querySelectorAll('.tab').forEach(tab => tab.remove());
    }
    if (rightTabBar) {
      rightTabBar.querySelectorAll('.tab').forEach(tab => tab.remove());
    }
    
    // Create new welcome tab
    const { createNewTab } = await import('./tabs.js');
    createNewTab('left', 'welcome-left', 'Welcome', 'main-file', 
      '-- Welcome to zosql Browser\n-- Enter your SQL query here\n\nSELECT * FROM users;');
    
    window.logger.info('Workspace cleared successfully');
    
  } catch (error) {
    window.logger.error('Error clearing workspace:', error);
    alert(`Error clearing workspace: ${error.message}`);
  }
}

async function resetDatabase() {
  if (!confirm('Are you sure you want to reset the database? This will recreate all tables with sample data.')) {
    return;
  }
  
  try {
    window.logger.info('Resetting database...');
    
    const { resetDatabase } = await import('./database.js');
    await resetDatabase();
    
    // Refresh schema
    const { refreshSchema } = await import('./schema.js');
    await refreshSchema();
    
    window.logger.info('Database reset successfully');
    alert('Database reset successfully');
    
  } catch (error) {
    window.logger.error('Error resetting database:', error);
    alert(`Error resetting database: ${error.message}`);
  }
}

function toggleCteValidationPanel() {
  // TODO: Implement CTE validation panel
  window.logger.info('CTE validation panel toggled');
  alert('CTE validation panel is not implemented yet');
}

function refreshContextPanel() {
  if (window.updateContextPanel) {
    window.updateContextPanel();
    window.logger.info('Context panel refreshed');
  }
}

async function updateWorkspaceDisplay(result) {
  try {
    // Update left sidebar workspace section
    const workspaceInfoDiv = document.getElementById('workspace-info');
    if (!workspaceInfoDiv) {
      window.logger.warn('workspace-info element not found');
      return;
    }
    
    const workspaceInfo = result.workspace;
    if (!workspaceInfo) {
      window.logger.warn('No workspace info in result');
      return;
    }
    
    // Create workspace display HTML for sidebar
    const privateCteCount = Object.keys(workspaceInfo.privateCtes || {}).length;
    const workspaceHtml = `
      <div class="workspace-summary">
        <div class="workspace-name">${workspaceInfo.name}</div>
        <div class="workspace-stats">
          <span class="stat-item">📁 Private CTEs: ${privateCteCount}</span>
          <span class="stat-item">🕒 ${new Date(workspaceInfo.created).toLocaleTimeString()}</span>
        </div>
      </div>
      
      ${privateCteCount > 0 ? `
        <div class="private-cte-tree">
          <div class="tree-header">Private CTEs:</div>
          ${Object.entries(workspaceInfo.privateCtes || {}).map(([name, cteData]) => `
            <div class="private-cte-item-sidebar">
              <span class="cte-icon">🔧</span>
              <span class="cte-name">${name}.cte</span>
              ${cteData.dependencies && cteData.dependencies.length > 0 ? `
                <div class="cte-dependencies">
                  <span class="dep-label">依存:</span>
                  ${cteData.dependencies.map(dep => `<span class="dep-item">${dep}</span>`).join(', ')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      ` : '<div class="no-ctes">No Private CTEs</div>'}
      
      ${result.flowDiagram ? `
        <details class="flow-diagram-details">
          <summary>フロー図</summary>
          <pre class="flow-diagram-mini">${result.flowDiagram}</pre>
        </details>
      ` : ''}
    `;
    
    workspaceInfoDiv.innerHTML = workspaceHtml;
    
    // Show the workspace section if it's hidden
    const workspaceSection = document.getElementById('workspace-section');
    const workspaceIcon = document.getElementById('workspace-icon');
    if (workspaceSection && workspaceSection.style.display === 'none') {
      workspaceSection.style.display = 'block';
      if (workspaceIcon) {
        workspaceIcon.textContent = '▼';
      }
    }
    
    // Update context panel if needed
    if (window.updateContextPanel) {
      window.updateContextPanel();
    }
    
  } catch (error) {
    window.logger.error('Error updating workspace display:', error);
  }
}

// Global functions for HTML compatibility
window.decomposeCurrentQuery = decomposeCurrentQuery;
window.clearWorkspace = clearWorkspace;
window.resetDatabase = resetDatabase;
window.toggleCteValidationPanel = toggleCteValidationPanel;
window.refreshContextPanel = refreshContextPanel;
window.toggleSection = toggleSection;
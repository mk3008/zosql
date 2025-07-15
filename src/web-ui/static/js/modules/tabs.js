// tabs.js - Tab management system

export function initializeTabs() {
  window.logger.info('Initializing tab system...');
  
  // Setup initial tabs
  setupInitialTabs();
  
  // Setup tab event handlers
  setupTabEventHandlers();
  
  // Setup toolbar button handlers
  setupToolbarHandlers();
  
  window.logger.info('Tab system initialized successfully');
}

function setupInitialTabs() {
  // Create initial tab for left panel
  createNewTab('left', 'welcome-left', 'Welcome', 'main-file', 
    '-- Welcome to zosql Browser\n-- Enter your SQL query here\n\nSELECT * FROM users;');
}

function setupTabEventHandlers() {
  // New tab buttons
  document.querySelectorAll('.new-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const panel = e.target.getAttribute('data-panel');
      if (panel) {
        createNewTab(panel);
      }
    });
  });
}

function setupToolbarHandlers() {
  // Run query buttons
  document.querySelectorAll('.run-query-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.runQuery();
    });
  });
  
  // Format SQL buttons
  document.querySelectorAll('.format-sql-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.formatCurrentSQL();
    });
  });
  
  // Save tab buttons
  document.querySelectorAll('.save-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.saveCurrentTab();
    });
  });
}

export function createNewTab(panel, tabId = null, name = null, type = 'main-file', content = '') {
  const tabs = panel === 'left' ? window.appState.leftTabs : window.appState.rightTabs;
  
  // Generate tab ID if not provided
  if (!tabId) {
    tabId = `tab-${++window.appState.tabCounter}`;
  }
  
  // Generate tab name if not provided
  if (!name) {
    name = `Query ${window.appState.tabCounter}`;
  }
  
  // Create tab data
  const tab = {
    id: tabId,
    name: name,
    type: type,
    content: content,
    isModified: false,
    queryResult: null
  };
  
  // Add to tabs collection
  tabs.set(tabId, tab);
  
  // Create tab element
  createTabElement(tabId, panel, tab);
  
  // Set as active tab
  switchToTab(tabId, panel);
  
  // Update editor content
  updateEditorContent(panel, content);
  
  window.logger.info(`Created new tab: ${name} (${panel})`);
  
  return tabId;
}

function createTabElement(tabId, panel, tab) {
  const tabBar = document.getElementById(`${panel}-tab-bar`);
  const tabControls = tabBar.querySelector('.tab-controls');
  
  const tabElement = document.createElement('div');
  tabElement.className = 'tab';
  tabElement.setAttribute('data-tab-id', tabId);
  tabElement.setAttribute('data-panel', panel);
  
  const icon = getTabIcon(tab.type);
  const modifiedIndicator = tab.isModified ? ' •' : '';
  
  tabElement.innerHTML = `
    ${icon} ${tab.name}${modifiedIndicator}
    <span class="close-btn" onclick="closeTab(event, '${tabId}', '${panel}')">×</span>
  `;
  
  tabElement.addEventListener('click', () => {
    switchToTab(tabId, panel);
  });
  
  // Insert before tab controls
  tabBar.insertBefore(tabElement, tabControls);
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

export function switchToTab(tabId, panel) {
  const tabs = panel === 'left' ? window.appState.leftTabs : window.appState.rightTabs;
  const tab = tabs.get(tabId);
  
  if (!tab) return;
  
  // Update active tab ID
  if (panel === 'left') {
    window.appState.activeLeftTabId = tabId;
  } else {
    window.appState.activeRightTabId = tabId;
  }
  
  // Update active panel
  window.appState.activePanel = panel;
  
  // Update tab UI
  updateTabActiveState(tabId, panel);
  
  // Update editor content
  updateEditorContent(panel, tab.content);
  
  // Update results if available
  if (tab.queryResult) {
    updateQueryResults(tab.queryResult, panel);
  } else {
    clearQueryResults(panel);
  }
  
  // Update context panel
  if (window.updateContextPanel) {
    window.updateContextPanel();
  }
  
  window.logger.debug(`Switched to tab: ${tab.name} (${panel})`);
}

function updateTabActiveState(activeTabId, panel) {
  const tabBar = document.getElementById(`${panel}-tab-bar`);
  const tabs = tabBar.querySelectorAll('.tab');
  
  tabs.forEach(tab => {
    const tabId = tab.getAttribute('data-tab-id');
    tab.classList.toggle('active', tabId === activeTabId);
  });
}

function updateEditorContent(panel, content) {
  // Import editor module dynamically
  import('./editor.js').then(({ setEditorContent }) => {
    setEditorContent(panel, content);
  });
}

function updateQueryResults(result, panel) {
  const resultsContainer = document.getElementById(`${panel}-results-content`);
  const executionInfo = document.getElementById(`${panel}-execution-info`);
  
  if (!resultsContainer || !executionInfo) return;
  
  if (result.success) {
    executionInfo.textContent = `${result.rows.length} rows (${result.executionTime.toFixed(2)}ms)`;
    
    if (result.rows.length > 0) {
      let tableHtml = '<table><thead><tr>';
      
      result.fields.forEach(field => {
        tableHtml += `<th>${field.name}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';
      
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
  } else {
    executionInfo.textContent = 'Query failed';
    resultsContainer.innerHTML = `
      <div style="color: #f44336; padding: 20px; font-family: monospace;">
        <strong>Error:</strong> ${result.error}
      </div>
    `;
  }
}

function clearQueryResults(panel) {
  const resultsContainer = document.getElementById(`${panel}-results-content`);
  const executionInfo = document.getElementById(`${panel}-execution-info`);
  
  if (resultsContainer) {
    resultsContainer.innerHTML = '<div class="results-placeholder">Run a query to see results here</div>';
  }
  
  if (executionInfo) {
    executionInfo.textContent = '';
  }
}

export function closeTab(event, tabId, panel) {
  event.stopPropagation();
  
  const tabs = panel === 'left' ? window.appState.leftTabs : window.appState.rightTabs;
  const tab = tabs.get(tabId);
  
  if (!tab) return;
  
  // Check if tab is modified
  if (tab.isModified) {
    if (!confirm(`Tab "${tab.name}" has unsaved changes. Are you sure you want to close it?`)) {
      return;
    }
  }
  
  // Remove tab element
  const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
  if (tabElement) {
    tabElement.remove();
  }
  
  // Remove from tabs collection
  tabs.delete(tabId);
  
  // If this was the active tab, switch to another tab
  const activeTabId = panel === 'left' ? window.appState.activeLeftTabId : window.appState.activeRightTabId;
  if (activeTabId === tabId) {
    const remainingTabs = Array.from(tabs.keys());
    if (remainingTabs.length > 0) {
      switchToTab(remainingTabs[0], panel);
    } else {
      // No tabs left, create a new one
      createNewTab(panel);
    }
  }
  
  window.logger.info(`Closed tab: ${tab.name} (${panel})`);
}

// Make functions globally available for HTML onclick handlers
window.createNewTab = createNewTab;
window.switchToTab = switchToTab;
window.closeTab = closeTab;

// Export for use in other modules
export { closeTab as closeTabById };
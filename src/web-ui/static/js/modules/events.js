// events.js - Event handling and DOM interactions

export function initializeEventHandlers() {
  window.logger.info('Initializing event handlers...');
  
  // Ensure DOM is ready before setting up events
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupSidebarEvents();
      setupActionButtonEvents();
      setupDebugLogEvents();
      setupContextPanelEvents();
    });
  } else {
    setupSidebarEvents();
    setupActionButtonEvents();
    setupDebugLogEvents();
    setupContextPanelEvents();
  }
  
  window.logger.info('Event handlers initialized successfully');
}

function setupSidebarEvents() {
  // Sidebar toggle buttons are handled in ui.js
  
  // Collapsible sections
  const collapsibleHeaders = document.querySelectorAll('h3.collapsible');
  window.logger.info(`Found ${collapsibleHeaders.length} collapsible headers`);
  
  collapsibleHeaders.forEach(header => {
    const targetId = header.getAttribute('data-target');
    window.logger.info(`Setting up collapsible header for ${targetId}`);
    
    header.addEventListener('click', () => {
      window.logger.info(`Clicked on collapsible header for ${targetId}`);
      if (targetId) {
        toggleSection(targetId);
      }
    });
  });
}

function setupActionButtonEvents() {
  // Open file button
  const openFileBtn = document.getElementById('open-file-btn');
  if (openFileBtn) {
    window.logger.info('Open File button found, setting up event listener');
    openFileBtn.addEventListener('click', () => {
      window.logger.info('Open File button clicked!');
      openAndDecomposeFile();
    });
  } else {
    window.logger.warn('Open File button not found in DOM');
  }

  // Open path button (disabled)
  // const openPathBtn = document.getElementById('open-path-btn');
  // if (openPathBtn) {
  //   openPathBtn.addEventListener('click', () => {
  //     openFileByPath();
  //   });
  // }
  
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
  window.logger.info(`toggleSection called for ${sectionId}`);
  
  const section = document.getElementById(sectionId);
  const icon = document.getElementById(sectionId.replace('-section', '-icon'));
  
  window.logger.info(`Section element found: ${!!section}, Icon element found: ${!!icon}`);
  
  if (section && icon) {
    const currentDisplay = section.style.display;
    const isVisible = currentDisplay !== 'none';
    
    window.logger.info(`Current display: '${currentDisplay}', isVisible: ${isVisible}`);
    
    section.style.display = isVisible ? 'none' : 'block';
    icon.textContent = isVisible ? '▶' : '▼';
    
    window.logger.info(`Set display to: '${section.style.display}', icon to: '${icon.textContent}'`);
  } else {
    window.logger.error(`Missing elements - section: ${!!section}, icon: ${!!icon}`);
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

async function clearAllTabs() {
  try {
    window.logger.info('Clearing all tabs...');
    
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
    
    // Clear editor content
    const { setEditorContent } = await import('./editor.js');
    setEditorContent('left', '');
    if (window.appState.rightEditor) {
      setEditorContent('right', '');
    }
    
    // Clear query results
    clearQueryResults('left');
    clearQueryResults('right');
    
    window.logger.info('All tabs cleared successfully');
    
  } catch (error) {
    window.logger.error('Error clearing tabs:', error);
  }
}

async function clearWorkspace() {
  if (!confirm('Are you sure you want to clear the workspace? This will close all tabs.')) {
    return;
  }
  
  try {
    window.logger.info('Clearing workspace...');
    
    // Clear all tabs
    await clearAllTabs();
    
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

async function updateWorkspaceDisplay(result) {
  try {
    // Update Workspace Panel component instead of legacy workspace-info
    const workspacePanel = window.appState.components?.workspacePanel;
    if (!workspacePanel) {
      window.logger.warn('Workspace Panel component not found, using legacy fallback', {
        workspacePanel: workspacePanel,
        componentState: window.appState.components,
        workspacePanelElement: !!document.getElementById('workspace-panel')
      });
      // Legacy fallback - try to find workspace-info element or create in workspace-panel
      let workspaceInfoDiv = document.getElementById('workspace-info');
      if (!workspaceInfoDiv) {
        // Try to find the workspace-panel element and create workspace-info inside it
        const workspacePanelElement = document.getElementById('workspace-panel');
        if (workspacePanelElement) {
          workspaceInfoDiv = document.createElement('div');
          workspaceInfoDiv.id = 'workspace-info';
          workspaceInfoDiv.style.padding = '1rem';
          workspaceInfoDiv.style.color = 'var(--text-primary)';
          workspacePanelElement.appendChild(workspaceInfoDiv);
          window.logger.info('Created workspace-info element inside workspace-panel');
        }
      }
      
      if (!workspaceInfoDiv) {
        window.logger.warn('workspace-info element not found and cannot be created, skipping workspace update');
        return;
      }
      // Continue with legacy update
    }
    
    const workspaceInfo = result.workspace;
    if (!workspaceInfo) {
      window.logger.warn('No workspace info in result');
      return;
    }
    
    // Use Workspace Panel component if available
    if (workspacePanel && workspacePanel.updateCteTree) {
      window.logger.info('Updating Workspace Panel with CTE data', {
        workspacePanel: !!workspacePanel,
        updateCteTreeMethod: typeof workspacePanel.updateCteTree,
        cteCount: Object.keys(workspaceInfo.privateCtes || {}).length,
        cteNames: Object.keys(workspaceInfo.privateCtes || {})
      });
      
      try {
        workspacePanel.updateCteTree(workspaceInfo.privateCtes || {});
        window.logger.info('Workspace Panel updateCteTree called successfully');
      } catch (error) {
        window.logger.error('Failed to update CTE tree', {
          error: error.message,
          stack: error.stack
        });
      }
      return;
    }
    
    // Create workspace display HTML for sidebar
    const privateCteCount = Object.keys(workspaceInfo.privateCtes || {}).length;
    
    // Debug: Log all private CTEs
    window.logger.info('Private CTEs in workspace: ' + JSON.stringify(Object.keys(workspaceInfo.privateCtes || {})));
    window.logger.info('Full privateCtes object: ' + JSON.stringify(workspaceInfo.privateCtes, null, 2));
    
    // Build hierarchical CTE tree
    const cteTree = buildCteHierarchy(workspaceInfo.privateCtes || {});
    window.logger.info('Built CTE tree: ' + JSON.stringify(cteTree, null, 2));
    
    const workspaceHtml = `
      ${privateCteCount > 0 ? `
        <div class="private-cte-tree">
          <div class="cte-tree-item clickable" onclick="/* open main query */">
            <span class="cte-tree-icon">📄</span>
            <span class="cte-tree-name">${workspaceInfo.name}</span>
          </div>
          ${renderCteTree(cteTree, workspaceInfo.privateCtes, 1)}
        </div>
      ` : `
        <div class="private-cte-tree">
          <div class="cte-tree-item clickable" onclick="/* open main query */">
            <span class="cte-tree-icon">📄</span>
            <span class="cte-tree-name">${workspaceInfo.name}</span>
          </div>
        </div>
      `}
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

async function openAndDecomposeFile() {
  try {
    window.logger.info('openAndDecomposeFile function called');
    
    // Create a hidden file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.sql';
    fileInput.style.display = 'none';
    
    window.logger.info('File input element created, setting up handlers');
    
    // Add to DOM temporarily (required for some browsers)
    document.body.appendChild(fileInput);
    window.logger.info('File input added to DOM');
    
    fileInput.onchange = async (event) => {
      window.logger.info('File selection changed');
      const file = event.target.files[0];
      if (!file) {
        window.logger.warn('No file selected');
        // Remove file input from DOM
        document.body.removeChild(fileInput);
        return;
      }
      window.logger.info('File selected:', file.name);
      
      window.logger.info('Opening file:', file.name);
      
      // Read the file content
      const reader = new FileReader();
      reader.onload = async (e) => {
        const sql = e.target.result;
        
        window.logger.info('File content loaded, decompressing...');
        
        // Call decompose API with the file content
        const response = await fetch('/api/decompose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            sql: sql,
            queryName: file.name.replace('.sql', ''),
            originalFilePath: file.name
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          window.logger.info('File decomposed successfully', result);
          
          // Create or activate tab for the main query
          // TODO: Replace with TabManagerComponent integration
          if (result.decomposedQuery) {
            window.logger.info('Tab creation temporarily disabled - using modern components');
            // const { createOrActivateTab } = await import('./tabs.js');
            // const fileName = file.name.replace('.sql', '');
            // createOrActivateTab(window.appState.activePanel, null, fileName, 'main-file', result.decomposedQuery);
          }
          
          // Update left sidebar with workspace information (Private CTEs will be shown there)
          window.logger.info('Updating workspace display...');
          await updateWorkspaceDisplay(result);
          
          // Show success toast
          const privateCteCount = Object.keys(result.workspace?.privateCtes || {}).length;
          window.showSuccessToast(
            `File opened successfully (${privateCteCount} Private CTEs found)`, 
            'File Opened'
          );
          
        } else {
          window.logger.error('Decomposition failed:', result.error);
          window.showErrorToast(result.error || 'Failed to decompose file', 'File Open Error');
        }
      };
      
      reader.onerror = (error) => {
        window.logger.error('Error reading file:', error);
        window.showErrorToast('Failed to read file', 'File Read Error');
        // Remove file input from DOM
        document.body.removeChild(fileInput);
      };
      
      reader.readAsText(file);
      
      // Clean up file input after processing
      setTimeout(() => {
        if (document.body.contains(fileInput)) {
          document.body.removeChild(fileInput);
        }
      }, 1000);
    };
    
    // Trigger file dialog
    window.logger.info('Triggering file dialog');
    fileInput.click();
    window.logger.info('File dialog triggered');
    
  } catch (error) {
    window.logger.error('Error in openAndDecomposeFile:', error);
    console.error('Open file error details:', error);
    window.showErrorToast(error.message || 'Unknown error', 'File Open Error');
    
    // Clean up file input if error occurs
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    });
  }
}

function buildCteHierarchy(privateCtes) {
  const tree = {};
  
  window.logger.info('buildCteHierarchy called with CTEs: ' + JSON.stringify(Object.keys(privateCtes)));
  
  // 最も多くのCTEから参照されているCTEをルートとして扱う
  // または、他のCTEを参照している最上位CTEをルートとする
  Object.entries(privateCtes).forEach(([name, cteData]) => {
    window.logger.info(`CTE ${name} dependencies: ` + JSON.stringify(cteData.dependencies));
    
    // 他のCTEから参照されていないCTE（最終成果物に近い）をルートにする
    const isReferencedByOthers = Object.values(privateCtes).some(otherCte => 
      otherCte.dependencies && otherCte.dependencies.includes(name)
    );
    
    if (!isReferencedByOthers) {
      window.logger.info(`${name} is a leaf CTE (not referenced by others) - treating as root`);
      tree[name] = { children: {} };
    }
  });
  
  // 依存関係を子として追加（recursively）
  function addDependencies(cteName, parentNode) {
    const cteData = privateCtes[cteName];
    if (cteData && cteData.dependencies) {
      cteData.dependencies.forEach(depName => {
        parentNode.children[depName] = { children: {} };
        addDependencies(depName, parentNode.children[depName]);
      });
    }
  }
  
  // 各ルートCTEの依存関係を構築
  Object.keys(tree).forEach(rootName => {
    addDependencies(rootName, tree[rootName]);
  });
  
  window.logger.info(`Final tree structure: ${JSON.stringify(Object.keys(tree))}`);
  
  return tree;
}

function renderCteTree(tree, privateCtes, level = 0) {
  let html = '';
  const indent = '  '.repeat(level);
  
  Object.entries(tree).forEach(([name, node]) => {
    const cteData = privateCtes[name];
    const hasChildren = Object.keys(node.children).length > 0;
    
    // Debug: Log missing CTE data
    if (!cteData) {
      window.logger.error(`CTE data missing for ${name} in privateCtes`);
      window.logger.info(`Available CTEs: ${Object.keys(privateCtes).join(', ')}`);
      return; // Skip this CTE if data is missing
    }
    
    html += `
      <div class="cte-tree-item clickable" style="margin-left: ${level * 20}px;" onclick="openPrivateCteFile('${name}')">
        <span class="cte-tree-icon">🔧</span>
        <span class="cte-tree-name">${name}</span>
      </div>
    `;
    
    if (hasChildren) {
      html += renderCteTree(node.children, privateCtes, level + 1);
    }
  });
  
  return html;
}

function convertWSLPathToLinux(filePath) {
  window.logger.info('Converting WSL path:', filePath);
  
  let normalizedPath = filePath;
  
  // Handle WSL path format: \\wsl.localhost\Ubuntu\...
  if (filePath.startsWith('\\\\wsl.localhost\\Ubuntu\\')) {
    // First replace all backslashes with forward slashes
    normalizedPath = filePath.replace(/\\\\/g, '/');
    window.logger.info('After backslash replacement:', normalizedPath);
    
    // Remove the WSL prefix
    normalizedPath = normalizedPath.replace('//wsl.localhost/Ubuntu', '');
    window.logger.info('After WSL prefix removal:', normalizedPath);
    
    // Replace any remaining backslashes with forward slashes
    normalizedPath = normalizedPath.replace(/\\/g, '/');
    window.logger.info('After final backslash cleanup:', normalizedPath);
  }
  
  window.logger.info('Final normalized path:', normalizedPath);
  return normalizedPath;
}

async function openFileByPath() {
  try {
    // Show input prompt for file path
    const filePath = prompt(
      'Enter file path:\n\n' +
      'Examples:\n' +
      '• /root/github/worktree/repositories/zosql/first_commit/sql/analytics.sql\n' +
      '• ./sql/sample.sql\n' +
      '• sql/query.sql\n\n' +
      'WSL Path (Windows):\n' +
      '• \\\\wsl.localhost\\Ubuntu\\root\\github\\...\n' +
      '  → /root/github/...',
      '/root/github/worktree/repositories/zosql/first_commit/sql/'
    );
    
    if (!filePath) return;
    
    // Convert WSL path to Linux path if needed
    const normalizedPath = convertWSLPathToLinux(filePath);
    
    // Fetch the file content from the server
    const response = await fetch(`/api/file?path=${encodeURIComponent(normalizedPath)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
    }
    
    const fileContent = await response.text();
    const fileName = normalizedPath.split('/').pop() || 'unknown.sql';
    
    window.logger.info('File loaded from server, decompressing...');
    
    // Call decompose API
    const decomposeResponse = await fetch('/api/decompose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        sql: fileContent,
        queryName: fileName.replace('.sql', ''),
        originalFilePath: normalizedPath
      })
    });
    
    const result = await decomposeResponse.json();
    
    if (result.success) {
      window.logger.info('File decomposed successfully from path');
      
      // Create or activate tab for the main query
      if (result.decomposedQuery) {
        window.logger.info('Tab creation temporarily disabled - using modern components');
        // const { createOrActivateTab } = await import('./tabs.js');
        // const fileName = normalizedPath.split('/').pop().replace('.sql', '');
        // createOrActivateTab(window.appState.activePanel, null, fileName, 'main-file', result.decomposedQuery);
      }
      
      // Update left sidebar with workspace information
      await updateWorkspaceDisplay(result);
      
      // Show success toast
      const privateCteCount = Object.keys(result.workspace?.privateCtes || {}).length;
      window.showSuccessToast(
        `File opened successfully from ${normalizedPath} (${privateCteCount} Private CTEs found)`, 
        'File Opened'
      );
      
    } else {
      window.logger.error('Decomposition failed:', result.error);
      window.showErrorToast(result.error || 'Failed to decompose file', 'File Open Error');
    }
    
  } catch (error) {
    window.logger.error('Error opening file by path:', error);
    window.showErrorToast(error.message || 'Failed to open file', 'File Open Error');
  }
}

async function openPrivateCteFile(cteName) {
  try {
    window.logger.info('Opening Private CTE file:', cteName);
    
    // Get the CTE file content from the server
    const response = await fetch(`/api/workspace/private-cte/${cteName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load CTE file: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.cte) {
      // Create or activate tab for the CTE
      window.logger.info('CTE tab creation temporarily disabled - using modern components');
      // const { createOrActivateTab } = await import('./tabs.js');
      // createOrActivateTab(
      //   window.appState.activePanel, 
      //   null, 
      //   `${cteName}.cte`, 
      //   'private-cte', 
      //   result.cte.query
      // );
      
      // Show success toast
      window.showSuccessToast(
        `Private CTE "${cteName}" opened successfully`, 
        'File Opened'
      );
      
      // If this CTE has dependencies, show them in a toast
      if (result.cte.dependencies && result.cte.dependencies.length > 0) {
        window.showInfoToast(
          `Dependencies: ${result.cte.dependencies.join(', ')}`,
          'CTE Dependencies'
        );
      }
      
    } else {
      throw new Error(result.error || 'Failed to load CTE');
    }
    
  } catch (error) {
    window.logger.error('Error opening Private CTE file:', error);
    window.showErrorToast(
      error.message || 'Failed to open Private CTE file', 
      'File Open Error'
    );
  }
}

// Global functions for HTML compatibility
window.openAndDecomposeFile = openAndDecomposeFile;
window.openFileByPath = openFileByPath;
window.openPrivateCteFile = openPrivateCteFile;
window.decomposeCurrentQuery = decomposeCurrentQuery;
window.clearWorkspace = clearWorkspace;
window.resetDatabase = resetDatabase;
window.toggleCteValidationPanel = toggleCteValidationPanel;
window.refreshContextPanel = refreshContextPanel;
window.toggleSection = toggleSection;
window.updateWorkspaceDisplay = updateWorkspaceDisplay;
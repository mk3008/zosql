export function getTabManagementCode(): string {
  return `
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
        
        const icon = tab.type === 'main' ? '[FILE]' : 
                     (tab.type === 'shared-cte' ? '[SHARED]' : 
                      (tab.type === 'private-cte' ? '[PRIVATE]' : 
                       (tab.type === 'main-file' ? '[FILE]' : '[QUERY]')));
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
      updateQueryResults(panel);
      
      // Update context panel when switching tabs
      updateContextPanel();
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
              'Start by opening a file or creating a new tab' :
              'Right editor panel';
          }
        }
      }
      
      renderTabs();
      updateQueryResults(panel); // Update results when tab is closed
    }
    
    async function openSharedCteTab(cteName, panel) {
      // Default to current active panel if no panel specified
      panel = panel || activePanel;
      
      const tabId = \`cte-\${cteName}\`;
      const tabs = panel === 'left' ? leftTabs : rightTabs;
      
      if (tabs.has(tabId)) {
        switchTab(tabId, panel);
        return;
      }
      
      try {
        // Load CTE content from server
        const response = await fetch(\`/api/shared-cte/\${cteName}\`);
        const data = await response.json();
        
        if (data.success && data.sharedCte) {
          const content = data.sharedCte.editableQuery || data.sharedCte.query || '';
          
          tabs.set(tabId, {
            name: cteName,  // Just the CTE name without .cte.sql extension
            type: 'shared-cte',
            content: content,
            isModified: false,
            cteName: cteName,
            originalContent: content,
            queryResult: null
          });
          
          switchTab(tabId, panel);
          console.log('Shared CTE tab opened successfully:', cteName, 'in panel:', panel);
        } else {
          alert(\`Failed to load Shared CTE: \${data.error || 'Unknown error'}\`);
        }
      } catch (error) {
        console.error('Error loading Shared CTE:', error);
        alert(\`Error loading Shared CTE: \${error.message}\`);
      }
    }
    
    // Function to open main file tab from workspace
    async function openMainFileTab(fileName, panel) {
      // Default to current active panel if no panel specified
      panel = panel || activePanel;
      
      const tabId = 'main-file-' + fileName;
      const tabs = panel === 'left' ? leftTabs : rightTabs;
      
      if (tabs.has(tabId)) {
        switchTab(tabId, panel);
        return;
      }
      
      try {
        // Load workspace info to get the original query
        const response = await fetch('/api/workspace');
        const data = await response.json();
        
        if (data.success && data.hasWorkspace && data.workspace.originalQuery) {
          tabs.set(tabId, {
            name: fileName,
            type: 'main-file',
            content: data.workspace.originalQuery,
            isModified: false,
            originalContent: data.workspace.originalQuery,
            queryResult: null
          });
          
          switchTab(tabId, panel);
          console.log('Main file tab opened successfully:', fileName, 'in panel:', panel);
        } else {
          showToast('Failed to load main file: No workspace active', 'error');
        }
      } catch (error) {
        console.error('Error loading main file:', error);
        showToast('Error loading main file: ' + error.message, 'error');
      }
    }
    
    // Update query results for specific panel
    function updateQueryResults(panel) {
      panel = panel || activePanel;
      
      const resultsContentId = panel === 'left' ? 'left-results-content' : 'right-results-content';
      const resultsContent = document.getElementById(resultsContentId);
      if (!resultsContent) return;
      
      const activeTabId = panel === 'left' ? activeLeftTabId : activeRightTabId;
      const activeTabs = panel === 'left' ? leftTabs : rightTabs;
      
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
    
    // Update query results for all panels
    function updateAllQueryResults() {
      updateQueryResults('left');
      if (isSplitView) {
        updateQueryResults('right');
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
        const icon = tab.type === 'main' ? '[FILE]' : 
                     (tab.type === 'shared-cte' ? '[SHARED]' : 
                      (tab.type === 'private-cte' ? '[PRIVATE]' : 
                       (tab.type === 'main-file' ? '[FILE]' : '[QUERY]')));
        header.textContent = \`\${icon} \${tab.name}\`;
      }
    }
    
    function getOriginalContent(tabId, panel) {
      const tabs = panel === 'left' ? leftTabs : rightTabs;
      const tab = tabs.get(tabId);
      if (!tab) return '';
      
      // Always use stored original content for all tab types
      return tab.originalContent || '';
    }
    
    async function saveCurrentTab() {
      // Determine which editor and tab system to use based on active panel
      const currentEditor = activePanel === 'left' ? leftEditor : rightEditor;
      const tabs = activePanel === 'left' ? leftTabs : rightTabs;
      const activeTabId = activePanel === 'left' ? activeLeftTabId : activeRightTabId;
      
      if (!currentEditor || !activeTabId || !tabs.has(activeTabId)) return;
      
      const tab = tabs.get(activeTabId);
      const content = currentEditor.getValue();
      
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
            tabs.set(activeTabId, tab);
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
            tabs.set(activeTabId, tab);
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
              tabs.set(activeTabId, tab);
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
          tabs.set(activeTabId, tab);
          renderTabs();
          showToast('Tab content saved', 'success');
        }
      }
    }
    
    // Create new SQL tab
    function createNewTab(panel) {
      // Default to current active panel if no panel specified
      panel = panel || activePanel;
      
      tabCounter++;
      const tabId = \`tab-\${tabCounter}\`;
      const tabName = \`untitled-\${tabCounter}.sql\`;
      
      const tabs = panel === 'left' ? leftTabs : rightTabs;
      
      tabs.set(tabId, {
        name: tabName,
        type: 'sql',
        content: '',
        isModified: false,
        originalContent: '',
        queryResult: null
      });
      
      switchTab(tabId, panel);
      console.log('New tab created:', tabId, 'in panel:', panel);
    }
    
    // Make functions globally accessible
    window.openMainFileTab = openMainFileTab;
  `;
}
export function getLayoutManagementCode(): string {
  return `
    // ====================================================================
    // Layout Management Functions  
    // ====================================================================
    
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
      const sidebar = document.getElementById('context-sidebar');
      const toggleBtn = document.getElementById('toggle-right-sidebar');
      
      if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        // Clear any inline width style that might interfere with CSS
        sidebar.style.width = '';
        toggleBtn.textContent = '▶';
        toggleBtn.title = 'Hide Right Sidebar';
        // Update context content when sidebar is shown
        updateContextPanel();
      } else {
        sidebar.classList.add('hidden');
        // Clear inline width to allow CSS to take precedence
        sidebar.style.width = '';
        toggleBtn.textContent = '◀';
        toggleBtn.title = 'Show Right Sidebar';
      }
    }
    
    // Context Panel Management
    function updateContextPanel() {
      const contextContent = document.getElementById('context-content');
      const contextTitle = document.getElementById('context-title');
      
      if (!contextContent || !contextTitle) return;
      
      // Get current active tab info
      const currentPanel = activePanel;
      const currentTabId = currentPanel === 'left' ? activeLeftTabId : activeRightTabId;
      const currentTabs = currentPanel === 'left' ? leftTabs : rightTabs;
      
      if (!currentTabId || !currentTabs.has(currentTabId)) {
        contextTitle.textContent = 'Context Panel';
        contextContent.innerHTML = '<div class="context-placeholder">Open a tab to see context information</div>';
        return;
      }
      
      const currentTab = currentTabs.get(currentTabId);
      const tabType = currentTab.type;
      const tabName = currentTab.name;
      
      // Update title based on tab type
      let titleIcon = '[FILE]';
      switch (tabType) {
        case 'shared-cte':
          titleIcon = '[SHARED]';
          break;
        case 'private-cte':
          titleIcon = '[PRIVATE]';
          break;
        case 'main-file':
          titleIcon = '[FILE]';
          break;
        default:
          titleIcon = '[QUERY]';
      }
      
      contextTitle.textContent = \`\${titleIcon} \${tabName} Context\`;
      
      // Generate context content based on tab type and content
      generateContextContent(currentTab, contextContent);
    }
    
    function generateContextContent(tab, contentElement) {
      let html = '';
      
      switch (tab.type) {
        case 'shared-cte':
          html = generateSharedCteContext(tab);
          break;
        case 'private-cte':
          html = generatePrivateCteContext(tab);
          break;
        case 'main-file':
        case 'sql':
        default:
          html = generateSqlContext(tab);
          break;
      }
      
      contentElement.innerHTML = html;
    }
    
    function generateSharedCteContext(tab) {
      return \`
        <div class="context-section">
          <h4>🔶 Shared CTE Information</h4>
          <div class="context-item cte">
            <strong>CTE Name:</strong> \${tab.name.replace('.cte.sql', '')}
          </div>
          <div class="context-item cte">
            <strong>Type:</strong> Shared Common Table Expression
          </div>
          <div class="context-item cte">
            <strong>Usage:</strong> Can be referenced in multiple queries
          </div>
        </div>
        <div class="context-section">
          <h4>Query Analysis</h4>
          <div class="context-item">
            <strong>Lines:</strong> \${tab.content.split('\\n').length}
          </div>
          <div class="context-item">
            <strong>Characters:</strong> \${tab.content.length}
          </div>
        </div>
      \`;
    }
    
    function generatePrivateCteContext(tab) {
      return \`
        <div class="context-section">
          <h4>🔧 Private CTE Information</h4>
          <div class="context-item cte">
            <strong>CTE Name:</strong> \${tab.name.replace('.cte.sql', '')}
          </div>
          <div class="context-item cte">
            <strong>Type:</strong> Private Common Table Expression
          </div>
          <div class="context-item cte">
            <strong>Usage:</strong> Used in specific query decomposition
          </div>
        </div>
        <div class="context-section">
          <h4>Query Analysis</h4>
          <div class="context-item">
            <strong>Lines:</strong> \${tab.content.split('\\n').length}
          </div>
          <div class="context-item">
            <strong>Characters:</strong> \${tab.content.length}
          </div>
        </div>
      \`;
    }
    
    function generateSqlContext(tab) {
      const content = tab.content || '';
      const lines = content.split('\\n');
      
      // Simple SQL analysis
      const hasSelect = /\\bselect\\b/i.test(content);
      const hasFrom = /\\bfrom\\b/i.test(content);
      const hasWhere = /\\bwhere\\b/i.test(content);
      const hasJoin = /\\bjoin\\b/i.test(content);
      const hasGroupBy = /\\bgroup\\s+by\\b/i.test(content);
      const hasOrderBy = /\\border\\s+by\\b/i.test(content);
      const hasUnion = /\\bunion\\b/i.test(content);
      const hasWith = /\\bwith\\b/i.test(content);
      
      // Extract table references
      const tableMatches = content.match(/from\\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi) || [];
      const tables = [...new Set(tableMatches.map(match => match.replace(/from\\s+/i, '')))];
      
      // Extract CTE references
      const cteMatches = content.match(/with\\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi) || [];
      const ctes = [...new Set(cteMatches.map(match => match.replace(/with\\s+/i, '')))];
      
      let html = \`
        <div class="context-section">
          <h4>SQL File Information</h4>
          <div class="context-item">
            <strong>File:</strong> \${tab.name}
          </div>
          <div class="context-item">
            <strong>Lines:</strong> \${lines.length}
          </div>
          <div class="context-item">
            <strong>Characters:</strong> \${content.length}
          </div>
        </div>
        
        <div class="context-section">
          <h4>Query Structure</h4>
          <div class="context-item \${hasSelect ? 'table' : ''}">
            SELECT: \${hasSelect ? '✓' : '✗'}
          </div>
          <div class="context-item \${hasFrom ? 'table' : ''}">
            FROM: \${hasFrom ? '✓' : '✗'}
          </div>
          <div class="context-item \${hasWhere ? 'column' : ''}">
            WHERE: \${hasWhere ? '✓' : '✗'}
          </div>
          <div class="context-item \${hasJoin ? 'column' : ''}">
            JOIN: \${hasJoin ? '✓' : '✗'}
          </div>
          <div class="context-item \${hasGroupBy ? 'column' : ''}">
            GROUP BY: \${hasGroupBy ? '✓' : '✗'}
          </div>
          <div class="context-item \${hasOrderBy ? 'column' : ''}">
            ORDER BY: \${hasOrderBy ? '✓' : '✗'}
          </div>
          <div class="context-item \${hasUnion ? 'cte' : ''}">
            UNION: \${hasUnion ? '✓' : '✗'}
          </div>
          <div class="context-item \${hasWith ? 'cte' : ''}">
            WITH (CTE): \${hasWith ? '✓' : '✗'}
          </div>
        </div>
      \`;
      
      if (tables.length > 0) {
        html += \`
          <div class="context-section">
            <h4>Referenced Tables</h4>
            \${tables.map(table => \`<div class="context-item table">\${table}</div>\`).join('')}
          </div>
        \`;
      }
      
      if (ctes.length > 0) {
        html += \`
          <div class="context-section">
            <h4>🔶 Common Table Expressions</h4>
            \${ctes.map(cte => \`<div class="context-item cte">\${cte}</div>\`).join('')}
          </div>
        \`;
      }
      
      return html;
    }
    
    function refreshContextPanel() {
      updateContextPanel();
    }
    
    // Resize functionality (left panel resize moved to ui.js)
    function initializeResizeHandles() {
      console.log('[LayoutManagement] Resize initialization - left panel handled by ui.js');
      
      // Initialize split resize handle
      const splitHandle = document.getElementById('split-resize-handle');
      if (splitHandle) {
        splitHandle.addEventListener('mousedown', (e) => startSplitResize(e));
      }
      
      // Initialize panel results resize handles
      initializePanelResultsResize();
    }
    
    // Split view resize functionality
    function startSplitResize(e) {
      e.preventDefault();
      
      let isResizing = true;
      const leftPanel = document.getElementById('left-editor-panel');
      const rightPanel = document.getElementById('right-editor-panel');
      
      function resize(e) {
        if (!isResizing) return;
        
        const container = document.getElementById('editor-split-container');
        const containerRect = container.getBoundingClientRect();
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        
        // Limit the width between 20% and 80%
        if (newLeftWidth >= 20 && newLeftWidth <= 80) {
          leftPanel.style.flex = newLeftWidth + '%';
          rightPanel.style.flex = (100 - newLeftWidth) + '%';
        }
      }
      
      function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
      }
      
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
    }
    
    // Panel results resize functionality
    function initializePanelResultsResize() {
      const leftResultsHandle = document.getElementById('left-results-resize-handle');
      const rightResultsHandle = document.getElementById('right-results-resize-handle');
      
      if (leftResultsHandle) {
        leftResultsHandle.addEventListener('mousedown', (e) => startPanelResultsResize(e, 'left'));
      }
      
      if (rightResultsHandle) {
        rightResultsHandle.addEventListener('mousedown', (e) => startPanelResultsResize(e, 'right'));
      }
    }
    
    function startPanelResultsResize(e, panel) {
      e.preventDefault();
      
      let isResizing = true;
      const resultsContainer = document.getElementById(panel + '-results-container');
      const editorContainer = document.getElementById(panel + '-editor');
      
      function resize(e) {
        if (!isResizing) return;
        
        const editorPanel = document.getElementById(panel + '-editor-panel');
        const editorPanelRect = editorPanel.getBoundingClientRect();
        const mouseY = e.clientY - editorPanelRect.top;
        
        // Calculate new height for results (from bottom up)
        const newResultsHeight = editorPanelRect.height - mouseY;
        
        // Limit the height between 100px and 80% of panel height
        const minHeight = 100;
        const maxHeight = editorPanelRect.height * 0.8;
        
        if (newResultsHeight >= minHeight && newResultsHeight <= maxHeight) {
          resultsContainer.style.height = newResultsHeight + 'px';
          
          // Update editor height accordingly
          const newEditorHeight = editorPanelRect.height - newResultsHeight;
          editorContainer.style.height = newEditorHeight + 'px';
          
          // Trigger Monaco editor layout update
          const editor = panel === 'left' ? leftEditor : rightEditor;
          if (editor) {
            editor.layout();
          }
        }
      }
      
      function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
      }
      
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResize);
    }
    
    // Tab scroll handling (VS Code style)
    function initializeTabScrollHandling() {
      const leftTabBar = document.getElementById('left-tab-bar');
      const rightTabBar = document.getElementById('right-tab-bar');
      
      if (leftTabBar) {
        leftTabBar.addEventListener('wheel', function(e) {
          e.preventDefault();
          const scrollAmount = e.deltaY > 0 ? 100 : -100;
          leftTabBar.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
      }
      
      if (rightTabBar) {
        rightTabBar.addEventListener('wheel', function(e) {
          e.preventDefault();
          const scrollAmount = e.deltaY > 0 ? 100 : -100;
          rightTabBar.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
      }
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
        wordWrap: 'off',
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
        updateContextPanel(); // Update context panel when switching panels
      });
      
      console.log('Right Monaco Editor initialized successfully');
    }
    
    // Make functions globally accessible
    window.toggleLeftSidebar = toggleLeftSidebar;
    window.toggleRightSidebar = toggleRightSidebar;
    window.toggleSplitView = toggleSplitView;
    window.closeSplitView = closeSplitView;
  `;
}
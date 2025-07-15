export function getHtmlStructure(_host: string, _port: number): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>zosql Browser</title>
      <style>
        ${getCssStyles()}
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🚀 zosql Browser</div>
        <div class="header-controls">
          <button id="toggle-left-sidebar" class="sidebar-toggle-btn" onclick="toggleLeftSidebar()" title="Toggle Left Sidebar">◀</button>
          <button id="toggle-right-sidebar" class="sidebar-toggle-btn" onclick="toggleRightSidebar()" title="Toggle Right Sidebar">▶</button>
        </div>
      </div>
      
      <div class="main-container">
        <div class="sidebar" id="left-sidebar">
          <div class="resize-handle" id="left-resize-handle"></div>
          <h3>Navigation</h3>
          <button class="action-button" onclick="decomposeCurrentQuery()">🔧 Decompose Query</button>
          <button class="action-button secondary" onclick="clearWorkspace()">🗑️ Clear Workspace</button>
          <button class="action-button secondary" onclick="resetDatabase()">🗑️ Reset Database</button>
          
          <h3>Validation</h3>
          <button class="action-button" onclick="toggleCteValidationPanel()">🔍 CTE Validation</button>
          
          <h3 class="collapsible" onclick="toggleSection('tables-section')">
            <span class="collapse-icon" id="tables-icon">▼</span> Tables
          </h3>
          <div id="tables-section" class="collapsible-section" style="display: none;">
            <div id="tables-info" class="schema-section" style="font-size: 12px; margin-top: 10px;">
              <div>Loading tables...</div>
            </div>
          </div>
          
          <h3 class="collapsible" onclick="toggleSection('workspace-section')">
            <span class="collapse-icon" id="workspace-icon">▶</span> Workspace
          </h3>
          <div id="workspace-section" class="collapsible-section">
            <div id="workspace-info" class="schema-section" style="font-size: 12px; margin-top: 10px;">
              <div>No workspace active</div>
            </div>
          </div>
          
          <h3 class="collapsible" onclick="toggleSection('shared-cte-section')">
            <span class="collapse-icon" id="shared-cte-icon">▶</span> Shared CTEs
          </h3>
          <div id="shared-cte-section" class="collapsible-section" style="display: none;">
            <div id="shared-cte-info" class="schema-section" style="font-size: 12px; margin-top: 10px;">
              <div>Loading shared CTEs...</div>
            </div>
          </div>
          
          <h3>System Status</h3>
          <div style="font-size: 12px; margin-top: 10px;">
            <div>Database: <span id="pglite-status">Initializing...</span></div>
            <div>Logs: <a href="#" onclick="window.open('.tmp/debug.log', '_blank'); return false;" style="color: #007acc;">View Debug Logs</a></div>
          </div>
        </div>
        
        <div class="content-area">
          <div class="editor-split-container" id="editor-split-container">
            <!-- Left Editor Panel -->
            <div class="editor-panel" id="left-editor-panel">
              <div class="editor-container">
                <div class="tab-bar" id="left-tab-bar">
                  <div class="tab-controls">
                    <button class="new-tab-btn" onclick="createNewTab('left')" title="新しいタブを作成">+</button>
                    <button class="split-btn" onclick="toggleSplitView()" title="分割表示の切り替え">⚏</button>
                  </div>
                </div>
                <div class="editor-header" id="left-editor-header">
                  📝 Start by opening a file or creating a new tab
                </div>
                
                <!-- Left Panel Toolbar -->
                <div class="editor-toolbar" id="left-editor-toolbar">
                  <button class="toolbar-btn primary" onclick="runQuery()" title="Run Query (Ctrl+Enter)">
                    <span class="btn-icon">▶️</span>
                    <span class="btn-text">Run</span>
                  </button>
                  <button class="toolbar-btn" onclick="formatCurrentSQL()" title="Format SQL (Ctrl+Shift+F)">
                    <span class="btn-icon">🎨</span>
                    <span class="btn-text">Format</span>
                  </button>
                  <button class="toolbar-btn" onclick="saveCurrentTab()" title="Save (Ctrl+S)">
                    <span class="btn-icon">💾</span>
                    <span class="btn-text">Save</span>
                  </button>
                  <div class="toolbar-spacer"></div>
                  <div class="toolbar-info" id="left-toolbar-info">
                    Ready
                  </div>
                </div>
                
                <div id="left-editor"></div>
                
                <!-- Left Panel Results -->
                <div class="panel-results-container" id="left-results-container">
                  <div class="panel-results-resize-handle" id="left-results-resize-handle"></div>
                  <div class="panel-results-header">
                    <div>📊 Query Results</div>
                    <div class="panel-execution-info" id="left-execution-info"></div>
                  </div>
                  <div class="panel-results-content" id="left-results-content">
                    <div style="color: #666; text-align: center; padding: 40px;">
                      Run a query to see results here
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Split Resize Handle -->
            <div class="split-resize-handle" id="split-resize-handle" style="display: none;"></div>
            
            <!-- Right Editor Panel (hidden by default) -->
            <div class="editor-panel" id="right-editor-panel" style="display: none;">
              <div class="editor-container">
                <div class="tab-bar" id="right-tab-bar">
                  <div class="tab-controls">
                    <button class="new-tab-btn" onclick="createNewTab('right')" title="新しいタブを作成">+</button>
                    <button class="close-split-btn" onclick="closeSplitView()" title="分割表示を閉じる">×</button>
                  </div>
                </div>
                <div class="editor-header" id="right-editor-header">
                  📝 Right editor panel
                </div>
                
                <!-- Right Panel Toolbar -->
                <div class="editor-toolbar" id="right-editor-toolbar">
                  <button class="toolbar-btn primary" onclick="runQuery()" title="Run Query (Ctrl+Enter)">
                    <span class="btn-icon">▶️</span>
                    <span class="btn-text">Run</span>
                  </button>
                  <button class="toolbar-btn" onclick="formatCurrentSQL()" title="Format SQL (Ctrl+Shift+F)">
                    <span class="btn-icon">🎨</span>
                    <span class="btn-text">Format</span>
                  </button>
                  <button class="toolbar-btn" onclick="saveCurrentTab()" title="Save (Ctrl+S)">
                    <span class="btn-icon">💾</span>
                    <span class="btn-text">Save</span>
                  </button>
                  <div class="toolbar-spacer"></div>
                  <div class="toolbar-info" id="right-toolbar-info">
                    Ready
                  </div>
                </div>
                
                <div id="right-editor"></div>
                
                <!-- Right Panel Results -->
                <div class="panel-results-container" id="right-results-container">
                  <div class="panel-results-resize-handle" id="right-results-resize-handle"></div>
                  <div class="panel-results-header">
                    <div>📊 Query Results</div>
                    <div class="panel-execution-info" id="right-execution-info"></div>
                  </div>
                  <div class="panel-results-content" id="right-results-content">
                    <div style="color: #666; text-align: center; padding: 40px;">
                      Run a query to see results here
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="context-sidebar" id="context-sidebar">
          <div class="context-resize-handle" id="right-resize-handle"></div>
          <div class="context-header">
            <div class="context-title" id="context-title">📄 Context Panel</div>
            <div class="context-controls">
              <button class="context-btn" onclick="refreshContextPanel()" title="Refresh Context">🔄</button>
            </div>
          </div>
          <div class="context-content" id="context-content">
            <div class="context-placeholder">
              Open a tab to see context information
            </div>
          </div>
        </div>
        
      </div>
      
      <script>
        <!-- JavaScript will be injected here -->
      </script>
    </body>
    </html>
  `;
}

function getCssStyles(): string {
  return `
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #1e1e1e;
      color: #cccccc;
    }
    .header {
      background: #2d2d30;
      padding: 10px 20px;
      border-bottom: 1px solid #454545;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sidebar-toggle-btn {
      background: #3c3c3c;
      color: #cccccc;
      border: none;
      border-radius: 3px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
      transition: background-color 0.2s;
    }
    .sidebar-toggle-btn:hover {
      background: #484848;
      color: #ffffff;
    }
    .logo {
      font-size: 18px;
      font-weight: bold;
      color: #ffffff;
    }
    .main-container {
      display: flex;
      height: calc(100vh - 60px);
      position: relative;
    }
    .sidebar {
      width: 300px;
      min-width: 200px;
      max-width: 500px;
      background: #252526;
      border-right: 1px solid #454545;
      padding: 20px;
      overflow-y: auto;
      position: relative;
    }
    .sidebar.hidden {
      width: 0;
      min-width: 0;
      padding: 0;
      overflow: hidden;
    }
    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .resize-handle {
      position: absolute;
      top: 0;
      right: 0;
      width: 5px;
      height: 100%;
      background: transparent;
      cursor: col-resize;
      z-index: 10;
    }
    .resize-handle:hover {
      background: #454545;
    }
    .editor-split-container {
      flex: 1;
      display: flex;
      flex-direction: row;
      min-height: 0;
    }
    .editor-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .panel-results-container {
      height: 300px;
      min-height: 100px;
      max-height: 80%;
      border-top: 1px solid #454545;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .panel-results-resize-handle {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 5px;
      background: transparent;
      cursor: row-resize;
      z-index: 10;
    }
    .panel-results-resize-handle:hover {
      background: #454545;
    }
    .panel-results-header {
      background: #2d2d30;
      padding: 10px 15px;
      border-bottom: 1px solid #454545;
      font-size: 14px;
      color: #cccccc;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .panel-execution-info {
      font-size: 12px;
      color: #888888;
    }
    .panel-results-content {
      flex: 1;
      overflow: auto;
      background: #1e1e1e;
    }
    .split-resize-handle {
      width: 5px;
      background: transparent;
      cursor: col-resize;
      flex-shrink: 0;
      border-left: 1px solid #454545;
      border-right: 1px solid #454545;
    }
    .split-resize-handle:hover {
      background: #454545;
    }
    .tab-bar {
      background: #252526;
      border-bottom: 1px solid #454545;
      display: flex;
      overflow-x: auto;
      min-height: 40px;
      height: 40px;
      flex-shrink: 0;
      position: relative;
      z-index: 10;
      opacity: 1;
      max-width: 100%;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE and Edge */
    }
    .tab-bar::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }
    .tab {
      padding: 8px 12px;
      font-size: 11px;
      color: #cccccc;
      cursor: pointer;
      border-right: 1px solid #454545;
      background: #2d2d30;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tab:hover {
      background: #383838;
    }
    .tab.active {
      background: #1e1e1e;
      color: #ffffff;
      border-bottom: 2px solid #007acc;
    }
    .tab .close-btn {
      margin-left: 8px;
      color: #888;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
    }
    .tab .close-btn:hover {
      color: #fff;
    }
    .tab-controls {
      display: flex;
      align-items: center;
      margin-left: auto;
      padding: 0 8px;
    }
    .new-tab-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: #3c3c3c;
      color: #cccccc;
      border-radius: 3px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }
    .new-tab-btn:hover {
      background: #484848;
      color: #ffffff;
    }
    .split-btn, .close-split-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: #3c3c3c;
      color: #cccccc;
      border-radius: 3px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
      margin-left: 4px;
    }
    .split-btn:hover, .close-split-btn:hover {
      background: #484848;
      color: #ffffff;
    }
    .editor-header {
      background: #2d2d30;
      padding: 10px 15px;
      border-bottom: 1px solid #454545;
      font-size: 14px;
      color: #cccccc;
      display: none;
    }
    .editor-toolbar {
      background: #2d2d30;
      border-bottom: 1px solid #454545;
      padding: 8px 15px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .toolbar-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #3c3c3c;
      color: #cccccc;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .toolbar-btn:hover {
      background: #484848;
      color: #ffffff;
    }
    .toolbar-btn.primary {
      background: #0e639c;
      color: #ffffff;
    }
    .toolbar-btn.primary:hover {
      background: #1177bb;
    }
    .toolbar-btn .btn-icon {
      font-size: 14px;
    }
    .toolbar-btn .btn-text {
      font-size: 12px;
      font-weight: 500;
    }
    .toolbar-spacer {
      flex: 1;
    }
    .toolbar-info {
      font-size: 12px;
      color: #888888;
      font-style: italic;
    }
    #left-editor, #right-editor {
      flex: 1;
      min-height: 300px;
    }
    .action-button {
      width: 100%;
      padding: 8px 12px;
      margin-bottom: 8px;
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 13px;
    }
    .action-button:hover {
      background: #1177bb;
    }
    .action-button.secondary {
      background: #5a5a5a;
    }
    .action-button.secondary:hover {
      background: #6e6e6e;
    }
    h3 {
      color: #ffffff;
      font-size: 14px;
      margin: 20px 0 10px 0;
      border-bottom: 1px solid #454545;
      padding-bottom: 5px;
    }
    h3:first-child {
      margin-top: 0;
    }
    h3.collapsible {
      cursor: pointer;
      user-select: none;
    }
    h3.collapsible:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .collapse-icon {
      display: inline-block;
      width: 12px;
      transition: transform 0.2s;
      font-size: 10px;
    }
    .collapsible-section {
      transition: all 0.3s ease;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      font-size: 13px;
    }
    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #454545;
    }
    th {
      background: #2d2d30;
      font-weight: bold;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    tr:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .log-entry {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 2px 5px;
      margin-bottom: 2px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 2px;
      word-break: break-all;
    }
    .log-entry.error {
      background: rgba(244, 67, 54, 0.2);
      border: 1px solid #5a3232;
      border-radius: 3px;
    }
    .schema-section {
      /* Remove individual scrollbars - use sidebar's main scrollbar */
    }
    .table-resource {
      background: rgba(0,122,204,0.1);
      border-left: 3px solid #007acc;
    }
    .shared-cte-resource {
      background: rgba(255,165,0,0.1);
      border-left: 3px solid #ffa500;
    }
    .context-sidebar {
      width: 400px;
      min-width: 200px;
      max-width: 600px;
      background: #252526;
      border-left: 1px solid #454545;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .context-sidebar.hidden {
      width: 0;
      min-width: 0;
      overflow: hidden;
    }
    .context-resize-handle {
      position: absolute;
      top: 0;
      left: 0;
      width: 5px;
      height: 100%;
      background: transparent;
      cursor: col-resize;
      z-index: 10;
    }
    .context-resize-handle:hover {
      background: #454545;
    }
    .context-header {
      background: #2d2d30;
      border-bottom: 1px solid #454545;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .context-title {
      color: #cccccc;
      font-size: 14px;
      font-weight: bold;
    }
    .context-controls {
      display: flex;
      gap: 5px;
    }
    .context-btn {
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
    }
    .context-btn:hover {
      background: #1177bb;
    }
    .context-content {
      flex: 1;
      padding: 15px;
      overflow: auto;
      background: #1e1e1e;
    }
    .context-placeholder {
      color: #888888;
      text-align: center;
      padding: 40px 20px;
      font-style: italic;
    }
    .context-section {
      margin-bottom: 20px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 4px;
      border-left: 3px solid #007acc;
    }
    .context-section h4 {
      margin: 0 0 10px 0;
      color: #ffffff;
      font-size: 13px;
    }
    .context-section .context-item {
      margin-bottom: 8px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
      font-size: 12px;
    }
    .context-section .context-item.cte {
      border-left: 3px solid #ffa500;
    }
    .context-section .context-item.table {
      border-left: 3px solid #4caf50;
    }
    .context-section .context-item.column {
      border-left: 3px solid #2196f3;
    }
    .mermaid-container {
      background: white;
      border-radius: 4px;
      padding: 15px;
      overflow: hidden;
      width: 100%;
    }
    .mermaid {
      max-width: 100%;
      height: auto;
    }
    /* Direct SVG rendering support */
    .context-content svg {
      max-width: 100%;
      height: auto;
      background: white;
      border-radius: 4px;
    }
  `;
}
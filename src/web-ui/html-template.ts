export function getHtmlStructure(host: string, port: number): string {
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
          <h3>Actions</h3>
          <button class="action-button" onclick="runQuery()">▶️ Run Query (Ctrl+Enter)</button>
          <button class="action-button" onclick="formatCurrentSQL()">🎨 Format SQL (Ctrl+K, Ctrl+D)</button>
          <button class="action-button secondary" onclick="resetDatabase()">🗑️ Reset Database</button>
          
          <h3>File Operations</h3>
          <button class="action-button" onclick="saveCurrentTab()">💾 Save (Ctrl+S)</button>
          <button class="action-button" onclick="decomposeCurrentQuery()">🔧 Decompose Query</button>
          <button class="action-button secondary" onclick="clearWorkspace()">🗑️ Clear Workspace</button>
          
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
          <div class="editor-container">
            <div class="tab-bar" id="tab-bar">
              <div class="tab active" data-tab="main" onclick="switchTab('main')">
                📄 main.sql
              </div>
              <div class="tab-controls">
                <button class="new-tab-btn" onclick="createNewTab()" title="新しいタブを作成">+</button>
              </div>
            </div>
            <div class="editor-header" id="editor-header">
              📄 main.sql
            </div>
            <div id="editor"></div>
          </div>
          
          <div class="results-container">
            <div class="results-header">
              <div>📊 Query Results</div>
              <div class="execution-info" id="execution-info"></div>
            </div>
            <div class="results-content" id="results-content">
              <div style="color: #666; text-align: center; padding: 40px;">
                Run a query to see results here
              </div>
            </div>
          </div>
        </div>
        
        <div class="diagram-sidebar" id="diagram-sidebar">
          <div class="diagram-resize-handle" id="right-resize-handle"></div>
          <div class="diagram-header">
            <div class="diagram-title">📊 Query Flow Diagram</div>
            <div class="diagram-controls">
              <button class="diagram-btn" onclick="refreshDiagram()" title="Refresh Diagram">🔄</button>
              <button class="diagram-btn" onclick="toggleDiagramSidebar()" title="Toggle Diagram Panel">✕</button>
            </div>
          </div>
          <div class="diagram-content" id="diagram-content">
            <div class="diagram-placeholder">
              Decompose a query to see the flow diagram
            </div>
          </div>
        </div>
        
        <!-- Floating toggle button for when diagram sidebar is hidden -->
        <button class="diagram-toggle-btn" id="diagram-toggle-btn" onclick="toggleDiagramSidebar()" title="Show Diagram Panel" style="display: none;">
          📊
        </button>
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
    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
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
    }
    .tab {
      padding: 10px 15px;
      font-size: 13px;
      color: #cccccc;
      cursor: pointer;
      border-right: 1px solid #454545;
      background: #2d2d30;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 5px;
      flex-shrink: 0;
      max-width: 200px;
      overflow: hidden;
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
    .editor-header {
      background: #2d2d30;
      padding: 10px 15px;
      border-bottom: 1px solid #454545;
      font-size: 14px;
      color: #cccccc;
      display: none;
    }
    #editor {
      flex: 1;
      min-height: 300px;
    }
    .results-container {
      height: 300px;
      border-top: 1px solid #454545;
      display: flex;
      flex-direction: column;
    }
    .results-header {
      background: #2d2d30;
      padding: 10px 15px;
      border-bottom: 1px solid #454545;
      font-size: 14px;
      color: #cccccc;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .execution-info {
      font-size: 12px;
      color: #888888;
    }
    .results-content {
      flex: 1;
      overflow: auto;
      background: #1e1e1e;
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
    .diagram-sidebar {
      width: 400px;
      min-width: 200px;
      max-width: 600px;
      background: #252526;
      border-left: 1px solid #454545;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .diagram-sidebar.hidden {
      width: 0;
      min-width: 0;
      overflow: hidden;
    }
    .diagram-resize-handle {
      position: absolute;
      top: 0;
      left: 0;
      width: 5px;
      height: 100%;
      background: transparent;
      cursor: col-resize;
      z-index: 10;
    }
    .diagram-resize-handle:hover {
      background: #454545;
    }
    .diagram-header {
      background: #2d2d30;
      border-bottom: 1px solid #454545;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .diagram-title {
      color: #cccccc;
      font-size: 14px;
      font-weight: bold;
    }
    .diagram-controls {
      display: flex;
      gap: 5px;
    }
    .diagram-btn {
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 3px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
    }
    .diagram-btn:hover {
      background: #1177bb;
    }
    .diagram-content {
      flex: 1;
      padding: 15px;
      overflow: auto;
      background: #1e1e1e;
    }
    .diagram-placeholder {
      color: #888888;
      text-align: center;
      padding: 40px 20px;
      font-style: italic;
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
    .diagram-content svg {
      max-width: 100%;
      height: auto;
      background: white;
      border-radius: 4px;
    }
    .diagram-toggle-btn {
      position: fixed;
      top: 50%;
      right: 10px;
      transform: translateY(-50%);
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      cursor: pointer;
      font-size: 18px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      transition: all 0.3s ease;
    }
    .diagram-toggle-btn:hover {
      background: #1177bb;
      transform: translateY(-50%) scale(1.1);
    }
  `;
}
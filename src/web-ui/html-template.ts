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
        <div class="status">● Server Running</div>
      </div>
      
      <div class="main-container">
        <div class="sidebar">
          <h3>Actions</h3>
          <button class="action-button" onclick="runQuery()">▶️ Run Query (Ctrl+Enter)</button>
          <button class="action-button" onclick="formatCurrentSQL()">🎨 Format SQL (Ctrl+K, Ctrl+D)</button>
          <button class="action-button secondary" onclick="resetDatabase()">🗑️ Reset Database</button>
          
          <h3>File Operations</h3>
          <button class="action-button" onclick="saveCurrentTab()">💾 Save (Ctrl+S)</button>
          
          <h3>Tables</h3>
          <div id="tables-info" class="schema-section" style="font-size: 12px; margin-top: 10px;">
            <div>Loading tables...</div>
          </div>
          
          <h3>Shared CTEs</h3>
          <div id="shared-cte-info" class="schema-section" style="font-size: 12px; margin-top: 10px;">
            <div>Loading shared CTEs...</div>
          </div>
          
          <h3>IntelliSense Debug</h3>
          <div id="intellisense-debug" style="font-size: 11px; margin-top: 10px; max-height: 200px; overflow-y: auto;">
            <div>Waiting for SQL input...</div>
          </div>
          
          <h3>Development Info</h3>
          <div style="font-size: 12px; margin-top: 10px;">
            <div>Server: ${host}:${port}</div>
            <div>Started: ${new Date().toLocaleString()}</div>
            <div>Monaco Editor: Loading...</div>
            <div>PGlite: <span id="pglite-status">Initializing...</span></div>
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
    .logo {
      font-size: 18px;
      font-weight: bold;
      color: #ffffff;
    }
    .status {
      color: #4caf50;
      font-size: 14px;
    }
    .main-container {
      display: flex;
      height: calc(100vh - 60px);
    }
    .sidebar {
      width: 300px;
      background: #252526;
      border-right: 1px solid #454545;
      padding: 20px;
      overflow-y: auto;
    }
    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
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
      max-height: 200px;
      overflow-y: auto;
    }
    .table-resource {
      background: rgba(0,122,204,0.1);
      border-left: 3px solid #007acc;
    }
    .shared-cte-resource {
      background: rgba(255,165,0,0.1);
      border-left: 3px solid #ffa500;
    }
  `;
}
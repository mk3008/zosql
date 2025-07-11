import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { FileSystemManager } from './file-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface WebServerOptions {
  port: number;
  host?: string;
}

export class WebServer {
  private app: express.Application;
  private server?: any;
  private port: number;
  private host: string;
  private fileSystem: FileSystemManager;

  constructor(options: WebServerOptions) {
    this.app = express();
    this.port = options.port;
    this.host = options.host || 'localhost';
    this.fileSystem = new FileSystemManager();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Static files
    this.app.use(express.static(path.join(__dirname, '../public')));
    
    // JSON parsing
    this.app.use(express.json());
    
    // CORS for development
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.get('/api/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // File system API
    this.app.get('/api/files', (_req, res) => {
      const result = this.fileSystem.getFileTree();
      if (result.success) {
        res.json({ success: true, files: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    });

    // Read file content
    this.app.get('/api/files/content', (req, res) => {
      const filePath = req.query.path as string;
      if (!filePath) {
        res.status(400).json({ success: false, error: 'File path is required' });
        return;
      }

      const result = this.fileSystem.readFile(filePath);
      if (result.success) {
        res.json({ success: true, ...result.data });
      } else {
        res.status(404).json({ success: false, error: result.error });
      }
    });

    // Write file content
    this.app.post('/api/files/content', (req, res) => {
      const { path: filePath, content } = req.body;
      if (!filePath || content === undefined) {
        res.status(400).json({ success: false, error: 'File path and content are required' });
        return;
      }

      const result = this.fileSystem.writeFile(filePath, content);
      if (result.success) {
        res.json({ success: true, ...result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    });

    // Create new file
    this.app.post('/api/files', (req, res) => {
      const { path: filePath, content = '' } = req.body;
      if (!filePath) {
        res.status(400).json({ success: false, error: 'File path is required' });
        return;
      }

      const result = this.fileSystem.createFile(filePath, content);
      if (result.success) {
        res.json({ success: true, ...result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    });

    // Create new folder
    this.app.post('/api/folders', (req, res) => {
      const { path: folderPath } = req.body;
      if (!folderPath) {
        res.status(400).json({ success: false, error: 'Folder path is required' });
        return;
      }

      const result = this.fileSystem.createFolder(folderPath);
      if (result.success) {
        res.json({ success: true, ...result.data });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    });

    // Main application route
    this.app.get('/', (_req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>zosql Browser</title>
          <style>
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
              border-bottom: 1px solid #3e3e42;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .logo {
              font-size: 18px;
              font-weight: bold;
              color: #007acc;
            }
            .status {
              font-size: 12px;
              color: #4caf50;
            }
            .main-container {
              display: flex;
              height: calc(100vh - 60px);
            }
            .sidebar {
              width: 250px;
              background: #252526;
              border-right: 1px solid #3e3e42;
              padding: 20px;
            }
            .editor-container {
              flex: 1;
              display: flex;
              flex-direction: column;
            }
            .editor-header {
              background: #2d2d30;
              padding: 10px 20px;
              border-bottom: 1px solid #3e3e42;
              font-size: 14px;
            }
            .editor {
              flex: 1;
              border: none;
              background: #1e1e1e;
              color: #cccccc;
              font-family: 'Consolas', 'Monaco', monospace;
              font-size: 14px;
              padding: 20px;
              resize: none;
              outline: none;
            }
            .file-tree {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .file-tree li {
              padding: 4px 0;
              cursor: pointer;
              font-size: 13px;
            }
            .file-tree li:hover {
              background: #2a2d2e;
            }
            .folder {
              color: #cccccc;
              font-weight: bold;
            }
            .file {
              color: #cccccc;
              padding-left: 16px;
            }
            .file.sql {
              color: #569cd6;
            }
            h3 {
              color: #cccccc;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .action-button {
              background: #007acc;
              color: white;
              border: none;
              padding: 6px 12px;
              border-radius: 3px;
              cursor: pointer;
              font-size: 12px;
              margin-top: 10px;
            }
            .action-button:hover {
              background: #005a9e;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🚀 zosql Browser</div>
            <div class="status">● Server Running</div>
          </div>
          
          <div class="main-container">
            <div class="sidebar">
              <h3>Project Explorer</h3>
              <ul class="file-tree" id="file-tree">
                <li class="folder">📁 Loading...</li>
              </ul>
              
              <h3>Actions</h3>
              <button class="action-button" onclick="createNewFile()">New SQL File</button>
              <button class="action-button" onclick="saveCurrentFile()">Save (Ctrl+S)</button>
              <button class="action-button" onclick="runQuery()">Run Query</button>
              
              <h3>Development Info</h3>
              <div style="font-size: 12px; margin-top: 10px;">
                <div>Server: ${this.host}:${this.port}</div>
                <div>Started: ${new Date().toLocaleString()}</div>
              </div>
            </div>
            
            <div class="editor-container">
              <div class="editor-header">
                📄 main.sql
              </div>
              <div id="editor-container" style="flex: 1; position: relative;">
                <textarea class="editor" id="sql-editor" placeholder="-- Write your SQL query here
SELECT 
  id,
  name,
  email 
FROM users 
WHERE created_at > '2023-01-01'
ORDER BY created_at DESC;">-- Welcome to zosql Browser!
-- This is a Monaco Editor integration demo.
-- Phase 1 features in development:
-- ✓ Express.js Web Server
-- ✓ Basic UI Layout
-- ⚠️ Monaco Editor Integration (in progress)
-- ⚠️ File System Management
-- ⚠️ Schema Management
-- ⚠️ SQL IntelliSense
-- ⚠️ Syntax Error Detection
-- ⚠️ WASM Postgres Integration

SELECT 
  user_id,
  COUNT(*) as order_count,
  SUM(amount) as total_amount
FROM orders
WHERE order_date >= '2023-01-01'
GROUP BY user_id
ORDER BY total_amount DESC;</textarea>
              </div>
            </div>
          </div>
          
          <script>
            let currentEditor = null;
            let currentFilePath = null;
            
            async function loadFileTree() {
              try {
                const response = await fetch('/api/files');
                const data = await response.json();
                
                if (data.success) {
                  const fileTree = document.getElementById('file-tree');
                  fileTree.innerHTML = '';
                  
                  if (data.files && data.files.length > 0) {
                    data.files.forEach(item => {
                      renderFileTreeItem(item, fileTree);
                    });
                  } else {
                    fileTree.innerHTML = '<li class="folder">📁 No files found</li>';
                  }
                } else {
                  console.error('Failed to load file tree:', data.error);
                }
              } catch (error) {
                console.error('Error loading file tree:', error);
              }
            }
            
            function renderFileTreeItem(item, container, level = 0) {
              const li = document.createElement('li');
              const indent = '  '.repeat(level);
              
              if (item.type === 'folder') {
                li.className = 'folder';
                li.innerHTML = \`\${indent}📁 \${item.name}\`;
                li.style.cursor = 'pointer';
                li.style.userSelect = 'none';
                
                // Create nested ul for children
                if (item.children && item.children.length > 0) {
                  const nestedUl = document.createElement('ul');
                  nestedUl.style.marginLeft = '16px';
                  nestedUl.style.paddingLeft = '0';
                  nestedUl.style.listStyle = 'none';
                  nestedUl.style.display = 'block'; // Always show for now
                  
                  item.children.forEach(child => {
                    renderFileTreeItem(child, nestedUl, 0); // Reset level for nested items
                  });
                  
                  li.appendChild(nestedUl);
                }
              } else {
                li.className = 'file';
                if (item.extension === '.sql') {
                  li.className += ' sql';
                }
                li.innerHTML = \`\${indent}📄 \${item.name}\`;
                li.style.cursor = 'pointer';
                li.onclick = () => openFile(item.path, item.name);
              }
              
              container.appendChild(li);
            }
            
            async function openFile(filePath, fileName) {
              try {
                const response = await fetch(\`/api/files/content?path=\${encodeURIComponent(filePath)}\`);
                const data = await response.json();
                
                if (data.success) {
                  currentFilePath = filePath;
                  
                  // Update header
                  const header = document.querySelector('.editor-header');
                  header.textContent = \`📄 \${fileName}\`;
                  
                  // Update Monaco Editor if available
                  if (currentEditor) {
                    currentEditor.setValue(data.content || '');
                  } else {
                    // Fallback to textarea
                    const textarea = document.getElementById('sql-editor');
                    textarea.value = data.content || '';
                  }
                } else {
                  alert('Failed to load file: ' + data.error);
                }
              } catch (error) {
                alert('Error loading file: ' + error.message);
              }
            }
            
            async function saveCurrentFile() {
              if (!currentFilePath) {
                alert('No file is currently open');
                return;
              }
              
              try {
                const content = currentEditor ? currentEditor.getValue() : document.getElementById('sql-editor').value;
                
                const response = await fetch('/api/files/content', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    path: currentFilePath,
                    content: content
                  })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  alert('File saved successfully');
                } else {
                  alert('Failed to save file: ' + data.error);
                }
              } catch (error) {
                alert('Error saving file: ' + error.message);
              }
            }
            
            function createNewFile() {
              const fileName = prompt('Enter file name (e.g., new_query.sql):');
              if (!fileName) return;
              
              const folderPath = prompt('Enter folder path (e.g., develop/reports):');
              const fullPath = folderPath ? \`\${folderPath}/\${fileName}\` : fileName;
              
              createFile(fullPath);
            }
            
            async function createFile(filePath) {
              try {
                const response = await fetch('/api/files', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    path: filePath,
                    content: '-- New SQL file\\nSELECT 1;'
                  })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  alert('File created successfully');
                  loadFileTree(); // Refresh file tree
                } else {
                  alert('Failed to create file: ' + data.error);
                }
              } catch (error) {
                alert('Error creating file: ' + error.message);
              }
            }
            
            function runQuery() {
              const query = currentEditor ? currentEditor.getValue() : document.getElementById('sql-editor').value;
              alert('Query execution will be implemented in Phase 1\\n\\nQuery:\\n' + query);
            }
            
            // Monaco Editor integration
            async function initMonacoEditor() {
              try {
                // Load Monaco Editor from CDN
                await loadScript('https://unpkg.com/monaco-editor@0.52.2/min/vs/loader.js');
                
                // Configure Monaco
                require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.52.2/min/vs' } });
                
                require(['vs/editor/editor.main'], function () {
                  // Initialize Monaco Editor
                  currentEditor = monaco.editor.create(document.getElementById('editor-container'), {
                    value: \`-- Welcome to zosql Browser!
-- This is a Monaco Editor integration demo.
-- Phase 1 features in development:
-- ✓ Express.js Web Server
-- ✓ Basic UI Layout
-- ✓ Monaco Editor Integration
-- ✓ File System Management
-- ⚠️ Schema Management
-- ⚠️ SQL IntelliSense
-- ⚠️ Syntax Error Detection
-- ⚠️ WASM Postgres Integration

SELECT 
  user_id,
  COUNT(*) as order_count,
  SUM(amount) as total_amount
FROM orders
WHERE order_date >= '2023-01-01'
GROUP BY user_id
ORDER BY total_amount DESC;\`,
                    language: 'sql',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false
                  });
                  
                  // Add keyboard shortcuts
                  currentEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function() {
                    saveCurrentFile();
                  });
                  
                  // Hide the textarea
                  document.getElementById('sql-editor').style.display = 'none';
                  
                  console.log('Monaco Editor initialized successfully');
                  
                  // Load file tree after Monaco is ready
                  loadFileTree();
                });
              } catch (error) {
                console.error('Failed to load Monaco Editor:', error);
                console.log('Falling back to textarea');
              }
            }
            
            function loadScript(src) {
              return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }
            
            // Initialize Monaco Editor when page loads
            document.addEventListener('DOMContentLoaded', initMonacoEditor);
          </script>
        </body>
        </html>
      `);
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, this.host, () => {
        console.log(`zosql browser server running at http://${this.host}:${this.port}`);
        resolve();
      });
      
      this.server.on('error', (err: any) => {
        reject(err);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('zosql browser server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getUrl(): string {
    return `http://${this.host}:${this.port}`;
  }
}
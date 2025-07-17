// app.js - Modern Component-Based Application Entry Point

import { initializeEditors } from './modules/editor.js';
import { initializeTabs } from './modules/tabs.js';
import { initializeUI } from './modules/ui.js';
import { initializeSchema } from './modules/schema.js';
import { initializeDatabase } from './modules/database.js';
import { initializeEventHandlers } from './modules/events.js';
import { initializeKeyboardShortcuts } from './modules/shortcuts.js';
import { initializeContext } from './modules/context.js';
import './modules/toast.js';
import { Logger } from './modules/logger.js';

// Modern Component System Imports
import { CTETreeComponent } from './components/cte-tree.js';
import { TabManagerComponent } from './components/tab-manager.js';
import { MonacoEditorComponent } from './components/monaco-editor.js';
import { WorkspacePanelComponent } from './components/workspace-panel.js';

// Global state management - Modern Component Architecture
window.appState = {
  leftEditor: null,
  rightEditor: null,
  schemaData: null,
  sharedCteData: null,
  lastValidQuery: null,
  currentSchemaData: null,
  lastSuccessfulParseResult: null,
  isIntelliSenseEnabled: true,
  isSplitView: false,
  
  // Tab management
  leftTabs: new Map(),
  rightTabs: new Map(),
  activeLeftTabId: null,
  activeRightTabId: null,
  activePanel: 'left',
  tabCounter: 0,
  
  // Modern Component References
  components: {
    workspacePanel: null,
    leftTabManager: null,
    rightTabManager: null,
    leftMonacoEditor: null,
    rightMonacoEditor: null
  }
};

// Initialize logging
const logger = new Logger();
window.logger = logger;

// Application initialization - Modern Component Architecture
async function initializeApp() {
  try {
    logger.info('Initializing zosql browser with modern component architecture...');
    
    // Initialize UI components
    initializeUI();
    
    // Initialize modern components first
    await initializeModernComponents();
    
    // Initialize database
    await initializeDatabase();
    
    // Initialize schema
    await initializeSchema();
    
    // Legacy modules are disabled in component-based architecture
    // Use modern components instead of legacy modules
    // await initializeEditors();  // Replaced by MonacoEditorComponent
    // initializeTabs();           // Replaced by TabManagerComponent
    
    // Initialize event handlers
    initializeEventHandlers();
    
    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
    
    // Initialize context panel
    initializeContext();
    
    // Check for file parameter in URL
    await checkAndOpenFileFromUrl();
    
    logger.info('zosql browser initialized successfully with component architecture');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    alert('Failed to initialize zosql browser. Please check the console for details.');
  }
}

// Initialize Modern Component System
async function initializeModernComponents() {
  try {
    logger.info('Initializing modern component system...');
    
    // Initialize Workspace Panel Component
    const workspacePanelElement = document.getElementById('workspace-panel');
    if (workspacePanelElement) {
      // Use Web Component if available, otherwise use class directly
      if (workspacePanelElement.tagName.toLowerCase() === 'workspace-panel') {
        window.appState.components.workspacePanel = workspacePanelElement.component;
      } else {
        window.appState.components.workspacePanel = new WorkspacePanelComponent(workspacePanelElement, {
          onTableClick: handleTableClick,
          onCteClick: handleCteClick,
          onMainQueryClick: handleMainQueryClick
        });
      }
      logger.info('Workspace Panel component initialized');
    }
    
    // Initialize Tab Manager Components (temporarily disabled for debugging)
    // const leftTabManagerElement = document.getElementById('left-tab-manager');
    // if (leftTabManagerElement) {
    //   if (leftTabManagerElement.tagName.toLowerCase() === 'tab-manager') {
    //     window.appState.components.leftTabManager = leftTabManagerElement.component;
    //   } else {
    //     window.appState.components.leftTabManager = new TabManagerComponent(leftTabManagerElement, {
    //       onTabChange: handleTabChange,
    //       onTabClose: handleTabClose,
    //       onNewTab: handleNewTab
    //     });
    //   }
    //   logger.info('Left Tab Manager component initialized');
    // }
    
    // const rightTabManagerElement = document.getElementById('right-tab-manager');
    // if (rightTabManagerElement) {
    //   if (rightTabManagerElement.tagName.toLowerCase() === 'tab-manager') {
    //     window.appState.components.rightTabManager = rightTabManagerElement.component;
    //   } else {
    //     window.appState.components.rightTabManager = new TabManagerComponent(rightTabManagerElement, {
    //       onTabChange: handleTabChange,
    //       onTabClose: handleTabClose,
    //       onNewTab: handleNewTab
    //     });
    //   }
    //   logger.info('Right Tab Manager component initialized');
    // }
    
    // Initialize Monaco Editor Components (temporarily disabled for debugging)
    // const leftMonacoElement = document.getElementById('left-monaco-editor');
    // if (leftMonacoElement) {
    //   if (leftMonacoElement.tagName.toLowerCase() === 'monaco-editor') {
    //     window.appState.components.leftMonacoEditor = leftMonacoElement.component;
    //   } else {
    //     window.appState.components.leftMonacoEditor = new MonacoEditorComponent(leftMonacoElement, {
    //       onContentChange: handleEditorContentChange,
    //       onSave: handleEditorSave,
    //       onFormat: handleEditorFormat,
    //       onRun: handleEditorRun
    //     });
    //   }
    //   logger.info('Left Monaco Editor component initialized');
    // }
    
    // const rightMonacoElement = document.getElementById('right-monaco-editor');
    // if (rightMonacoElement) {
    //   if (rightMonacoElement.tagName.toLowerCase() === 'monaco-editor') {
    //     window.appState.components.rightMonacoEditor = rightMonacoElement.component;
    //   } else {
    //     window.appState.components.rightMonacoEditor = new MonacoEditorComponent(rightMonacoElement, {
    //       onContentChange: handleEditorContentChange,
    //       onSave: handleEditorSave,
    //       onFormat: handleEditorFormat,
    //       onRun: handleEditorRun
    //     });
    //   }
    //   logger.info('Right Monaco Editor component initialized');
    // }
    
    logger.info('Modern component system initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize modern components:', error);
    throw error;
  }
}

// Component Event Handlers
function handleTableClick(tableName) {
  logger.info('Table clicked:', tableName);
  // Implement table click logic
}

function handleCteClick(cteName) {
  logger.info('CTE clicked:', cteName);
  // Implement CTE click logic
}

function handleMainQueryClick() {
  logger.info('Main query clicked');
  // Implement main query click logic
}

function handleTabChange(tabId, tab) {
  logger.info('Tab changed:', tabId, tab);
  // Implement tab change logic
}

function handleTabClose(tabId, tab) {
  logger.info('Tab closed:', tabId, tab);
  // Implement tab close logic
}

function handleNewTab() {
  logger.info('New tab requested');
  // Implement new tab logic
}

function handleEditorContentChange(content, event) {
  logger.info('Editor content changed, length:', content.length);
  // Implement content change logic
}

function handleEditorSave(content) {
  logger.info('Editor save requested, length:', content.length);
  // Implement save logic
}

function handleEditorFormat(content) {
  logger.info('Editor format requested, length:', content.length);
  // Implement format logic
}

function handleEditorRun(content) {
  logger.info('Editor run requested, length:', content.length);
  // Implement run logic
}

async function checkAndOpenFileFromUrl() {
  try {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const filePath = urlParams.get('file');
    
    if (filePath) {
      logger.info('File path provided in URL:', filePath);
      
      // Normalize the path - replace backslashes with forward slashes
      let normalizedPath = filePath.replace(/\\/g, '/');
      logger.info('Normalized path:', normalizedPath);
      
      // If path doesn't start with /, treat it as relative to project root
      if (!normalizedPath.startsWith('/')) {
        normalizedPath = `/root/github/worktree/repositories/zosql/first_commit/${normalizedPath}`;
        logger.info('Resolved relative path:', normalizedPath);
      }
      
      // Fetch the file content from the server
      const response = await fetch(`/api/file?path=${encodeURIComponent(normalizedPath)}`);
      
      if (response.ok) {
        const fileContent = await response.text();
        const fileName = normalizedPath.split('/').pop() || 'unknown.sql';
        
        logger.info('File loaded from server, decompressing...');
        
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
          logger.info('File decomposed successfully from URL parameter');
          
          // Create or activate tab for the main query (Private CTEs will be shown in sidebar)
          if (result.decomposedQuery) {
            const { createOrActivateTab } = await import('./modules/tabs.js');
            const tabName = fileName.replace('.sql', '');
            createOrActivateTab(window.appState.activePanel, null, tabName, 'main-file', result.decomposedQuery);
          }
          
          // Update workspace display
          const eventsModule = await import('./modules/events.js');
          logger.info('window.updateWorkspaceDisplay exists: ' + (typeof window.updateWorkspaceDisplay));
          if (window.updateWorkspaceDisplay) {
            logger.info('Calling updateWorkspaceDisplay...');
            await window.updateWorkspaceDisplay(result);
          } else {
            logger.error('window.updateWorkspaceDisplay is not defined!');
          }
          
          // Show success message
          if (window.showSuccessToast) {
            const privateCteCount = Object.keys(result.workspace?.privateCtes || {}).length;
            window.showSuccessToast(
              `File opened from URL: ${fileName} (${privateCteCount} Private CTEs found)`, 
              'File Opened'
            );
          }
        } else {
          logger.error('Failed to decompose file from URL:', result.error);
          if (window.showErrorToast) {
            window.showErrorToast(result.error || 'Failed to decompose file', 'URL File Open Error');
          }
        }
      } else {
        logger.error('Failed to load file from server:', response.statusText);
        if (window.showErrorToast) {
          window.showErrorToast(`File not found: ${normalizedPath}`, 'URL File Open Error');
        }
      }
    }
  } catch (error) {
    logger.error('Error opening file from URL:', error);
    if (window.showErrorToast) {
      window.showErrorToast('Failed to open file from URL', 'URL File Open Error');
    }
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
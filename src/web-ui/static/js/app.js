// app.js - Main application entry point

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

// Global state management
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
  tabCounter: 0
};

// Initialize logging
const logger = new Logger();
window.logger = logger;

// Application initialization
async function initializeApp() {
  try {
    logger.info('Initializing zosql browser...');
    
    // Initialize UI components
    initializeUI();
    
    // Initialize database
    await initializeDatabase();
    
    // Initialize schema
    await initializeSchema();
    
    // Initialize Monaco editors
    await initializeEditors();
    
    // Initialize tab system
    initializeTabs();
    
    // Initialize event handlers
    initializeEventHandlers();
    
    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
    
    // Initialize context panel
    initializeContext();
    
    // Check for file parameter in URL
    await checkAndOpenFileFromUrl();
    
    logger.info('zosql browser initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    alert('Failed to initialize zosql browser. Please check the console for details.');
  }
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
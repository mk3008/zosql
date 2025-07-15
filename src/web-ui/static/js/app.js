// app.js - Main application entry point

import { initializeEditors } from './modules/editor.js';
import { initializeTabs } from './modules/tabs.js';
import { initializeUI } from './modules/ui.js';
import { initializeSchema } from './modules/schema.js';
import { initializeDatabase } from './modules/database.js';
import { initializeEventHandlers } from './modules/events.js';
import { initializeKeyboardShortcuts } from './modules/shortcuts.js';
import { initializeContext } from './modules/context.js';
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
    
    logger.info('zosql browser initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    alert('Failed to initialize zosql browser. Please check the console for details.');
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
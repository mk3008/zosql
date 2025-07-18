// app.js - Shadow DOM Only Application Entry Point

import { Logger } from './modules/logger.js';
import { SidebarManager } from './modules/sidebar-manager.js';
import { HeaderControls } from './modules/header-controls.js';
import './modules/toast.js';

// Global state management - Shadow DOM Architecture
window.appState = {
  schemaData: null,
  sharedCteData: null,
  lastValidQuery: null,
  currentSchemaData: null,
  lastSuccessfulParseResult: null,
  isIntelliSenseEnabled: true,
  
  // Shadow DOM Component References
  components: {
    headerShadow: null,
    workspacePanelShadow: null,
    centerPanelShadow: null,
    rightPanelShadow: null
  }
};

// Initialize logging
const logger = new Logger();

// Initialize the application
async function initializeApp() {
  try {
    console.log('Starting zosql Browser (Shadow DOM Mode)');
    
    // Initialize sidebar management
    const sidebarManager = new SidebarManager();
    window.sidebarManager = sidebarManager;
    
    // Initialize header controls
    const headerControls = new HeaderControls();
    window.headerControls = headerControls;
    
    // Wait for Shadow DOM components to be ready
    await waitForShadowComponents();
    
    // Initialize components
    initializeShadowComponents();
    
    // Initialize database connection
    await initializeDatabase();
    
    // Initialize schema data
    await initializeSchema();
    
    console.log('Application initialized successfully');
    
  } catch (error) {
    console.error('Application initialization failed:', error);
    showErrorToast('Failed to initialize application: ' + error.message);
  }
}

// Wait for Shadow DOM components to be ready
async function waitForShadowComponents() {
  const components = [
    'header-shadow',
    'workspace-panel-shadow', 
    'center-panel-shadow',
    'right-panel-shadow'
  ];
  
  const promises = components.map(tagName => {
    return new Promise((resolve) => {
      if (customElements.get(tagName)) {
        resolve();
      } else {
        customElements.whenDefined(tagName).then(resolve);
      }
    });
  });
  
  await Promise.all(promises);
  console.log('Shadow DOM components ready');
}

// Initialize Shadow DOM components
function initializeShadowComponents() {
  // Get component references
  const headerShadow = document.getElementById('header-shadow');
  const workspacePanelShadow = document.getElementById('workspace-panel-shadow');
  const centerPanelShadow = document.getElementById('center-panel-shadow');
  const rightPanelShadow = document.getElementById('right-panel-shadow');
  
  // Store references
  window.appState.components = {
    headerShadow,
    workspacePanelShadow,
    centerPanelShadow,
    rightPanelShadow
  };
  
  console.log('Shadow DOM components initialized');
}

// Initialize database connection
async function initializeDatabase() {
  try {
    // This will be implemented when database functionality is needed
    console.log('Database initialization placeholder');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
}

// Initialize schema data
async function initializeSchema() {
  try {
    // This will be implemented when schema functionality is needed
    console.log('Schema initialization placeholder');
  } catch (error) {
    console.error('Schema initialization failed:', error);
  }
}

// Show error toast
function showErrorToast(message) {
  if (window.showToast) {
    window.showToast(message, 'error');
  } else {
    alert(message);
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', initializeApp);

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('App.js loaded - Shadow DOM Mode');
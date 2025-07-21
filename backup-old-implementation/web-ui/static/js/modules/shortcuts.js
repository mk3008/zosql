// shortcuts.js - Keyboard shortcuts and hotkeys

export function initializeKeyboardShortcuts() {
  window.logger.info('Initializing keyboard shortcuts...');
  
  setupGlobalShortcuts();
  setupEditorShortcuts();
  
  window.logger.info('Keyboard shortcuts initialized successfully');
}

function setupGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+P - Command palette (future implementation)
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      showCommandPalette();
      return;
    }
    
    // Ctrl+Shift+D - Toggle left sidebar
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      toggleLeftSidebar();
      return;
    }
    
    // Ctrl+Shift+E - Toggle right sidebar
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      toggleRightSidebar();
      return;
    }
    
    // Ctrl+Shift+T - New tab
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      createNewTab();
      return;
    }
    
    // Ctrl+W - Close tab
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      closeCurrentTab();
      return;
    }
    
    // Ctrl+Tab - Next tab
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      switchToNextTab();
      return;
    }
    
    // Ctrl+Shift+Tab - Previous tab
    if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      switchToPreviousTab();
      return;
    }
    
    // Ctrl+1-9 - Switch to tab by number
    if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      switchToTabByNumber(parseInt(e.key) - 1);
      return;
    }
    
    // F5 - Refresh schema
    if (e.key === 'F5') {
      e.preventDefault();
      refreshSchema();
      return;
    }
    
    // Ctrl+R - Reset database
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      resetDatabase();
      return;
    }
  });
}

function setupEditorShortcuts() {
  // Editor shortcuts are handled in editor.js through Monaco's key binding system
  // This function is reserved for any additional editor-related shortcuts
}

async function showCommandPalette() {
  // TODO: Implement command palette
  window.logger.info('Command palette triggered (not implemented yet)');
  alert('Command palette is not implemented yet');
}

async function toggleLeftSidebar() {
  const { toggleLeftSidebar } = await import('./ui.js');
  toggleLeftSidebar();
  window.logger.info('Left sidebar toggled via keyboard shortcut');
}

async function toggleRightSidebar() {
  const { toggleRightSidebar } = await import('./ui.js');
  toggleRightSidebar();
  window.logger.info('Right sidebar toggled via keyboard shortcut');
}

async function createNewTab() {
  const { createNewTab } = await import('./tabs.js');
  createNewTab(window.appState.activePanel);
  window.logger.info('New tab created via keyboard shortcut');
}

async function closeCurrentTab() {
  const currentTabId = window.appState.activePanel === 'left' 
    ? window.appState.activeLeftTabId 
    : window.appState.activeRightTabId;
  
  if (currentTabId) {
    const { closeTabById } = await import('./tabs.js');
    closeTabById(null, currentTabId, window.appState.activePanel);
    window.logger.info('Current tab closed via keyboard shortcut');
  }
}

async function switchToNextTab() {
  const tabs = window.appState.activePanel === 'left' 
    ? window.appState.leftTabs 
    : window.appState.rightTabs;
  
  const currentTabId = window.appState.activePanel === 'left' 
    ? window.appState.activeLeftTabId 
    : window.appState.activeRightTabId;
  
  const tabIds = Array.from(tabs.keys());
  const currentIndex = tabIds.indexOf(currentTabId);
  
  if (currentIndex >= 0 && tabIds.length > 1) {
    const nextIndex = (currentIndex + 1) % tabIds.length;
    const { switchToTab } = await import('./tabs.js');
    switchToTab(tabIds[nextIndex], window.appState.activePanel);
    window.logger.info('Switched to next tab via keyboard shortcut');
  }
}

async function switchToPreviousTab() {
  const tabs = window.appState.activePanel === 'left' 
    ? window.appState.leftTabs 
    : window.appState.rightTabs;
  
  const currentTabId = window.appState.activePanel === 'left' 
    ? window.appState.activeLeftTabId 
    : window.appState.activeRightTabId;
  
  const tabIds = Array.from(tabs.keys());
  const currentIndex = tabIds.indexOf(currentTabId);
  
  if (currentIndex >= 0 && tabIds.length > 1) {
    const prevIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
    const { switchToTab } = await import('./tabs.js');
    switchToTab(tabIds[prevIndex], window.appState.activePanel);
    window.logger.info('Switched to previous tab via keyboard shortcut');
  }
}

async function switchToTabByNumber(index) {
  const tabs = window.appState.activePanel === 'left' 
    ? window.appState.leftTabs 
    : window.appState.rightTabs;
  
  const tabIds = Array.from(tabs.keys());
  
  if (index >= 0 && index < tabIds.length) {
    const { switchToTab } = await import('./tabs.js');
    switchToTab(tabIds[index], window.appState.activePanel);
    window.logger.info(`Switched to tab ${index + 1} via keyboard shortcut`);
  }
}

async function refreshSchema() {
  try {
    const { refreshSchema } = await import('./schema.js');
    await refreshSchema();
    window.logger.info('Schema refreshed via keyboard shortcut');
  } catch (error) {
    window.logger.error('Error refreshing schema:', error);
  }
}

async function resetDatabase() {
  if (!confirm('Are you sure you want to reset the database?')) {
    return;
  }
  
  try {
    const { resetDatabase } = await import('./database.js');
    await resetDatabase();
    
    const { refreshSchema } = await import('./schema.js');
    await refreshSchema();
    
    window.logger.info('Database reset via keyboard shortcut');
    alert('Database reset successfully');
    
  } catch (error) {
    window.logger.error('Error resetting database:', error);
    alert(`Error resetting database: ${error.message}`);
  }
}

// Export functions for external use
export {
  showCommandPalette,
  toggleLeftSidebar,
  toggleRightSidebar,
  createNewTab,
  closeCurrentTab,
  switchToNextTab,
  switchToPreviousTab,
  switchToTabByNumber,
  refreshSchema,
  resetDatabase
};
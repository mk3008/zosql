export function getCteValidationCode(): string {
  return `
    // CTE Validation functionality
    let cteValidationPanel = null;
    let validationResults = null;
    
    async function loadCteValidation() {
      try {
        const response = await fetch('/api/validate-ctes');
        const data = await response.json();
        
        if (data.success) {
          validationResults = data.validations;
          updateCteValidationPanel();
        } else {
          console.error('Failed to load CTE validation:', data.error);
        }
      } catch (error) {
        console.error('Error loading CTE validation:', error);
      }
    }
    
    function createCteValidationPanel() {
      if (cteValidationPanel) {
        return;
      }
      
      cteValidationPanel = document.createElement('div');
      cteValidationPanel.id = 'cte-validation-panel';
      cteValidationPanel.style.cssText = \`
        position: fixed;
        top: 100px;
        right: 20px;
        width: 350px;
        max-height: 600px;
        background: #1e1e1e;
        border: 1px solid #444;
        border-radius: 5px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        z-index: 1000;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 13px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      \`;
      
      const header = document.createElement('div');
      header.style.cssText = \`
        background: #2d2d30;
        padding: 8px 12px;
        border-bottom: 1px solid #444;
        color: #cccccc;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      \`;
      header.innerHTML = \`
        <span>CTE Validation</span>
        <button onclick="toggleCteValidationPanel()" style="
          background: none;
          border: none;
          color: #cccccc;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          width: 20px;
          height: 20px;
        ">×</button>
      \`;
      
      const content = document.createElement('div');
      content.id = 'cte-validation-content';
      content.style.cssText = \`
        flex: 1;
        overflow-y: auto;
        padding: 0;
      \`;
      
      cteValidationPanel.appendChild(header);
      cteValidationPanel.appendChild(content);
      document.body.appendChild(cteValidationPanel);
      
      // Load validation results
      loadCteValidation();
    }
    
    function updateCteValidationPanel() {
      if (!cteValidationPanel || !validationResults) {
        return;
      }
      
      const content = document.getElementById('cte-validation-content');
      content.innerHTML = '';
      
      // Root Query Section
      if (validationResults.rootQuery) {
        const rootSection = createValidationSection('Root Query', [validationResults.rootQuery]);
        content.appendChild(rootSection);
      }
      
      // Private CTEs Section
      if (validationResults.privateCtes && validationResults.privateCtes.length > 0) {
        const privateSection = createValidationSection('Private CTEs', validationResults.privateCtes);
        content.appendChild(privateSection);
      }
      
      // Shared CTEs Section
      if (validationResults.sharedCtes && validationResults.sharedCtes.length > 0) {
        const sharedSection = createValidationSection('Shared CTEs', validationResults.sharedCtes);
        content.appendChild(sharedSection);
      }
      
      if (!validationResults.rootQuery && 
          (!validationResults.privateCtes || validationResults.privateCtes.length === 0) &&
          (!validationResults.sharedCtes || validationResults.sharedCtes.length === 0)) {
        content.innerHTML = '<div style="padding: 20px; color: #888; text-align: center;">No CTEs found</div>';
      }
    }
    
    function createValidationSection(title, items) {
      const section = document.createElement('div');
      section.style.cssText = \`
        border-bottom: 1px solid #333;
      \`;
      
      const header = document.createElement('div');
      header.style.cssText = \`
        background: #252526;
        padding: 6px 12px;
        color: #cccccc;
        font-weight: bold;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      \`;
      header.textContent = title;
      
      const itemsList = document.createElement('div');
      
      items.forEach(item => {
        const itemElement = createValidationItem(item);
        itemsList.appendChild(itemElement);
      });
      
      section.appendChild(header);
      section.appendChild(itemsList);
      
      return section;
    }
    
    function createValidationItem(item) {
      const itemDiv = document.createElement('div');
      itemDiv.style.cssText = \`
        padding: 8px 12px;
        border-bottom: 1px solid #2d2d2d;
        cursor: pointer;
        transition: background-color 0.2s;
      \`;
      
      itemDiv.addEventListener('mouseenter', () => {
        itemDiv.style.backgroundColor = '#2a2d2e';
      });
      
      itemDiv.addEventListener('mouseleave', () => {
        itemDiv.style.backgroundColor = 'transparent';
      });
      
      const statusIcon = getStatusIcon(item.status);
      const statusColor = getStatusColor(item.status);
      
      const nameSpan = document.createElement('div');
      nameSpan.style.cssText = \`
        display: flex;
        align-items: center;
        margin-bottom: 4px;
      \`;
      nameSpan.innerHTML = \`
        <span style="margin-right: 8px; font-size: 14px;">\${statusIcon}</span>
        <span style="color: \${statusColor}; font-weight: bold;">\${item.name}</span>
      \`;
      
      itemDiv.appendChild(nameSpan);
      
      if (item.dependencies && item.dependencies.length > 0) {
        const depsSpan = document.createElement('div');
        depsSpan.style.cssText = \`
          color: #888;
          font-size: 11px;
          margin-left: 22px;
          margin-bottom: 2px;
        \`;
        depsSpan.textContent = \`Dependencies: \${item.dependencies.join(', ')}\`;
        itemDiv.appendChild(depsSpan);
      }
      
      if (item.message) {
        const messageSpan = document.createElement('div');
        messageSpan.style.cssText = \`
          color: #ff6b6b;
          font-size: 11px;
          margin-left: 22px;
          word-wrap: break-word;
        \`;
        messageSpan.textContent = item.message;
        itemDiv.appendChild(messageSpan);
      }
      
      return itemDiv;
    }
    
    function getStatusIcon(status) {
      switch (status) {
        case 'success': return '✅';
        case 'error': return '❌';
        case 'warning': return '⚠️';
        default: return '❓';
      }
    }
    
    function getStatusColor(status) {
      switch (status) {
        case 'success': return '#4CAF50';
        case 'error': return '#f44336';
        case 'warning': return '#ff9800';
        default: return '#cccccc';
      }
    }
    
    function toggleCteValidationPanel() {
      if (!cteValidationPanel) {
        createCteValidationPanel();
      } else {
        if (cteValidationPanel.style.display === 'none') {
          cteValidationPanel.style.display = 'flex';
          loadCteValidation(); // Refresh data when showing
        } else {
          cteValidationPanel.style.display = 'none';
        }
      }
    }
    
    function refreshCteValidation() {
      if (cteValidationPanel && cteValidationPanel.style.display !== 'none') {
        loadCteValidation();
      }
    }
    
    // Auto-refresh validation when workspace changes
    function setupCteValidationAutoRefresh() {
      // Refresh after decompose/compose operations
      const originalDecomposeAndClose = window.decomposeAndClose;
      if (originalDecomposeAndClose) {
        window.decomposeAndClose = function() {
          originalDecomposeAndClose();
          setTimeout(refreshCteValidation, 1000);
        };
      }
      
      // Refresh after compose operations
      const originalCompose = window.compose;
      if (originalCompose) {
        window.compose = function() {
          originalCompose();
          setTimeout(refreshCteValidation, 1000);
        };
      }
    }
    
    // Initialize auto-refresh after DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      setupCteValidationAutoRefresh();
    });
  `;
}
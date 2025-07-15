// ui.js - UI initialization and sidebar management

export function initializeUI() {
  setupSidebarToggle();
  setupCollapsibleSections();
  setupResizeHandles();
  setupSplitView();
}

function setupSidebarToggle() {
  const leftToggle = document.getElementById('toggle-left-sidebar');
  const rightToggle = document.getElementById('toggle-right-sidebar');
  
  if (leftToggle) {
    leftToggle.addEventListener('click', () => toggleLeftSidebar());
  }
  
  if (rightToggle) {
    rightToggle.addEventListener('click', () => toggleRightSidebar());
  }
}

function setupCollapsibleSections() {
  const collapsibleHeaders = document.querySelectorAll('h3.collapsible');
  
  collapsibleHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      if (targetId) {
        toggleSection(targetId);
      }
    });
  });
}

function setupResizeHandles() {
  // Left sidebar resize
  const leftHandle = document.getElementById('left-resize-handle');
  if (leftHandle) {
    leftHandle.addEventListener('mousedown', (e) => {
      startResize(e, 'left');
    });
  }

  // Context sidebar resize
  const contextHandle = document.getElementById('right-resize-handle');
  if (contextHandle) {
    contextHandle.addEventListener('mousedown', (e) => {
      startResize(e, 'context');
    });
  }

  // Panel results resize
  const leftResultsHandle = document.getElementById('left-results-resize-handle');
  if (leftResultsHandle) {
    leftResultsHandle.addEventListener('mousedown', (e) => {
      startVerticalResize(e, 'left');
    });
  }

  const rightResultsHandle = document.getElementById('right-results-resize-handle');
  if (rightResultsHandle) {
    rightResultsHandle.addEventListener('mousedown', (e) => {
      startVerticalResize(e, 'right');
    });
  }

  // Split view resize
  const splitHandle = document.getElementById('split-resize-handle');
  if (splitHandle) {
    splitHandle.addEventListener('mousedown', (e) => {
      startSplitResize(e);
    });
  }
}

function setupSplitView() {
  const splitBtn = document.getElementById('toggle-split-btn');
  const closeSplitBtn = document.getElementById('close-split-btn');
  
  if (splitBtn) {
    splitBtn.addEventListener('click', () => toggleSplitView());
  }
  
  if (closeSplitBtn) {
    closeSplitBtn.addEventListener('click', () => closeSplitView());
  }
}

export function toggleLeftSidebar() {
  const sidebar = document.getElementById('left-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('hidden');
  }
}

export function toggleRightSidebar() {
  const sidebar = document.getElementById('context-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('hidden');
  }
}

export function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  const icon = document.getElementById(sectionId.replace('-section', '-icon'));
  
  if (section && icon) {
    const isVisible = section.style.display !== 'none';
    section.style.display = isVisible ? 'none' : 'block';
    icon.textContent = isVisible ? '▶' : '▼';
  }
}

export function toggleSplitView() {
  const rightPanel = document.getElementById('right-editor-panel');
  const splitHandle = document.getElementById('split-resize-handle');
  
  if (rightPanel && splitHandle) {
    const isVisible = rightPanel.style.display !== 'none';
    
    if (isVisible) {
      rightPanel.style.display = 'none';
      splitHandle.style.display = 'none';
      window.appState.isSplitView = false;
    } else {
      rightPanel.style.display = 'flex';
      splitHandle.style.display = 'block';
      window.appState.isSplitView = true;
    }
  }
}

export function closeSplitView() {
  const rightPanel = document.getElementById('right-editor-panel');
  const splitHandle = document.getElementById('split-resize-handle');
  
  if (rightPanel && splitHandle) {
    rightPanel.style.display = 'none';
    splitHandle.style.display = 'none';
    window.appState.isSplitView = false;
  }
}

// Resize handlers
function startResize(e, type) {
  e.preventDefault();
  
  const startX = e.clientX;
  let element;
  
  if (type === 'left') {
    element = document.getElementById('left-sidebar');
  } else if (type === 'context') {
    element = document.getElementById('context-sidebar');
  }
  
  if (!element) return;
  
  const startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
  
  function doResize(e) {
    const currentX = e.clientX;
    let newWidth;
    
    if (type === 'left') {
      newWidth = startWidth + (currentX - startX);
    } else if (type === 'context') {
      newWidth = startWidth - (currentX - startX);
    }
    
    if (newWidth >= 200 && newWidth <= 600) {
      element.style.width = newWidth + 'px';
    }
  }
  
  function stopResize() {
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
  }
  
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
}

function startVerticalResize(e, panel) {
  e.preventDefault();
  
  const startY = e.clientY;
  const container = document.getElementById(`${panel}-results-container`);
  
  if (!container) return;
  
  const startHeight = parseInt(document.defaultView.getComputedStyle(container).height, 10);
  
  function doResize(e) {
    const currentY = e.clientY;
    const newHeight = startHeight - (currentY - startY);
    
    if (newHeight >= 100 && newHeight <= 800) {
      container.style.height = newHeight + 'px';
    }
  }
  
  function stopResize() {
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
  }
  
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
}

function startSplitResize(e) {
  e.preventDefault();
  
  const startX = e.clientX;
  const leftPanel = document.getElementById('left-editor-panel');
  const rightPanel = document.getElementById('right-editor-panel');
  
  if (!leftPanel || !rightPanel) return;
  
  const containerWidth = document.getElementById('editor-split-container').offsetWidth;
  const startLeftWidth = leftPanel.offsetWidth;
  
  function doResize(e) {
    const currentX = e.clientX;
    const deltaX = currentX - startX;
    const newLeftWidth = startLeftWidth + deltaX;
    const newRightWidth = containerWidth - newLeftWidth - 5; // 5px for handle
    
    if (newLeftWidth >= 200 && newRightWidth >= 200) {
      leftPanel.style.flex = `0 0 ${newLeftWidth}px`;
      rightPanel.style.flex = `0 0 ${newRightWidth}px`;
    }
  }
  
  function stopResize() {
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
  }
  
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
}
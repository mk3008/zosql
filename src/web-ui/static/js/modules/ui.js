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
  console.log('DEBUG: leftResultsHandle found:', !!leftResultsHandle);
  if (leftResultsHandle) {
    leftResultsHandle.addEventListener('mousedown', (e) => {
      console.log('DEBUG: leftResultsHandle mousedown triggered');
      startVerticalResize(e, 'left');
    });
  }

  const rightResultsHandle = document.getElementById('right-results-resize-handle');
  console.log('DEBUG: rightResultsHandle found:', !!rightResultsHandle);
  if (rightResultsHandle) {
    rightResultsHandle.addEventListener('mousedown', (e) => {
      console.log('DEBUG: rightResultsHandle mousedown triggered');
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
    
    // Monaco Editorのレイアウトを更新
    setTimeout(() => {
      updateMonacoEditorLayout();
    }, 100); // CSS transitionの完了を待つ
  }
}

export function toggleRightSidebar() {
  const sidebar = document.getElementById('context-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('hidden');
    
    // Monaco Editorのレイアウトを更新
    setTimeout(() => {
      updateMonacoEditorLayout();
    }, 100); // CSS transitionの完了を待つ
  }
}

/**
 * Monaco Editorのレイアウトを更新
 */
function updateMonacoEditorLayout() {
  // 左Monaco Editor
  const leftMonacoEditor = document.getElementById('left-monaco-editor');
  if (leftMonacoEditor && leftMonacoEditor.component) {
    leftMonacoEditor.component.layout();
  }
  
  // 右Monaco Editor
  const rightMonacoEditor = document.getElementById('right-monaco-editor');
  if (rightMonacoEditor && rightMonacoEditor.component) {
    rightMonacoEditor.component.layout();
  }
  
  // app.jsのglobalのMonaco Editorも更新
  if (window.appState && window.appState.components) {
    const { leftMonacoEditor: leftEditor, rightMonacoEditor: rightEditor } = window.appState.components;
    
    if (leftEditor && typeof leftEditor.layout === 'function') {
      leftEditor.layout();
    }
    
    if (rightEditor && typeof rightEditor.layout === 'function') {
      rightEditor.layout();
    }
  }
}

/**
 * 特定のパネルのMonaco Editorを強制的にリサイズ
 */
function forceMonacoEditorResize(panel) {
  console.log('DEBUG: forceMonacoEditorResize called for panel:', panel);
  
  // 対象のMonaco Editor要素を取得
  const monacoEditor = document.getElementById(`${panel}-monaco-editor`);
  if (monacoEditor && monacoEditor.component) {
    console.log('DEBUG: Found monaco editor component, calling layout()');
    
    // レイアウトを強制更新
    setTimeout(() => {
      monacoEditor.component.layout();
      console.log('DEBUG: Monaco editor layout() called');
    }, 0);
  } else {
    console.log('DEBUG: Monaco editor component not found:', `${panel}-monaco-editor`);
  }
  
  // 一般的なレイアウト更新も呼び出し
  updateMonacoEditorLayout();
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
  
  console.log('DEBUG: startVerticalResize called for panel:', panel);
  
  const startY = e.clientY;
  const container = document.getElementById(`${panel}-results-container`);
  
  if (!container) {
    console.log('DEBUG: container not found:', `${panel}-results-container`);
    return;
  }
  
  console.log('DEBUG: container found:', container);
  
  const startHeight = parseInt(document.defaultView.getComputedStyle(container).height, 10);
  console.log('DEBUG: startHeight:', startHeight);
  
  function doResize(e) {
    const currentY = e.clientY;
    const newHeight = startHeight - (currentY - startY);
    
    if (newHeight >= 100 && newHeight <= 800) {
      container.style.height = newHeight + 'px';
      
      console.log('DEBUG: Setting container height to:', newHeight + 'px');
      
      // Monaco Editorのレイアウトを強制的に更新
      forceMonacoEditorResize(panel);
    }
  }
  
  function stopResize() {
    document.removeEventListener('mousemove', doResize);
    document.removeEventListener('mouseup', stopResize);
    
    console.log('DEBUG: stopResize called, forcing final layout update');
    
    // リサイズ完了後にMonaco Editorを強制的に更新
    forceMonacoEditorResize(panel);
    
    // 追加の遅延更新も実行
    setTimeout(() => {
      forceMonacoEditorResize(panel);
    }, 100);
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
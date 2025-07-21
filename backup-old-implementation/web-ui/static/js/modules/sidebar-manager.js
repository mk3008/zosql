/**
 * Sidebar Manager
 * 左右サイドバーの開閉・状態管理
 */

class SidebarManager {
  constructor() {
    this.STORAGE_KEY_PREFIX = 'zosql-sidebar-';
    this.state = {
      leftSidebar: true,  // デフォルトは表示
      rightSidebar: true
    };
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.loadState();
    console.log('[SidebarManager] Initial state after load:', this.state);
    
    this.setupEventListeners();
    
    // 初期状態を即座に適用
    this.applyInitialState();
    console.log('[SidebarManager] Initialized with immediate state application');
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // 従来版ヘッダーのボタン
    const leftToggleBtn = document.getElementById('toggle-left-sidebar');
    const rightToggleBtn = document.getElementById('toggle-right-sidebar');
    
    if (leftToggleBtn) {
      leftToggleBtn.addEventListener('click', () => this.toggleLeftSidebar());
    }
    
    if (rightToggleBtn) {
      rightToggleBtn.addEventListener('click', () => this.toggleRightSidebar());
    }

    // Shadow DOM版ヘッダーのボタン（イベントデリゲーション）
    document.addEventListener('header-left-sidebar-toggle', () => {
      this.toggleLeftSidebar();
    });
    
    document.addEventListener('header-right-sidebar-toggle', () => {
      this.toggleRightSidebar();
    });

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + B で左サイドバー
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.toggleLeftSidebar();
      }
      
      // Ctrl/Cmd + Shift + B で右サイドバー
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        this.toggleRightSidebar();
      }
    });
  }

  /**
   * 左サイドバーの切り替え
   */
  toggleLeftSidebar() {
    console.log(`[SidebarManager] toggleLeftSidebar called - current state: ${this.state.leftSidebar}`);
    this.state.leftSidebar = !this.state.leftSidebar;
    console.log(`[SidebarManager] toggleLeftSidebar - new state: ${this.state.leftSidebar}`);
    
    this.applyLeftSidebarState();
    this.saveState();
    this.updateButtonStates();
    
    console.log(`[SidebarManager] Left sidebar: ${this.state.leftSidebar ? 'shown' : 'hidden'}`);
  }

  /**
   * 右サイドバーの切り替え
   */
  toggleRightSidebar() {
    this.state.rightSidebar = !this.state.rightSidebar;
    this.applyRightSidebarState();
    this.saveState();
    this.updateButtonStates();
    
    console.log(`[SidebarManager] Right sidebar: ${this.state.rightSidebar ? 'shown' : 'hidden'}`);
  }

  /**
   * 左サイドバーの状態を適用
   */
  applyLeftSidebarState() {
    // Shadow DOM専用モードなので常にtrue
    const shadowDOMEnabled = true;
    
    console.log('[SidebarManager] applyLeftSidebarState:', {
      shadowDOMEnabled,
      leftSidebarState: this.state.leftSidebar,
      timestamp: new Date().toISOString()
    });
    
    if (shadowDOMEnabled) {
      // Shadow DOM版の場合
      const shadowWorkspacePanel = document.getElementById('workspace-panel-shadow');
      const traditionalLeftSidebar = document.getElementById('left-sidebar');
      const traditionalWorkspacePanel = document.getElementById('workspace-panel');
      const legacyControls = document.querySelector('.legacy-controls');
      
      console.log('[SidebarManager] Shadow DOM mode - elements found:', {
        shadowWorkspacePanel: !!shadowWorkspacePanel,
        traditionalLeftSidebar: !!traditionalLeftSidebar,
        traditionalWorkspacePanel: !!traditionalWorkspacePanel,
        legacyControls: !!legacyControls,
        shadowPanelCurrentDisplay: shadowWorkspacePanel?.style.display,
        traditionalPanelCurrentDisplay: traditionalLeftSidebar?.style.display
      });
      
      if (this.state.leftSidebar) {
        // 左サイドバーを表示する場合
        if (traditionalLeftSidebar) {
          traditionalLeftSidebar.style.display = 'block';
          traditionalLeftSidebar.style.flexShrink = '0';
          traditionalLeftSidebar.style.visibility = 'visible';
          traditionalLeftSidebar.style.opacity = '1';
          console.log('[SidebarManager] DEBUG: Set traditional left sidebar to BLOCK');
        }
        
        // Traditional版の中身を非表示
        if (traditionalWorkspacePanel) {
          traditionalWorkspacePanel.style.display = 'none';
        }
        if (legacyControls) {
          legacyControls.style.display = 'none';
        }
        
        // Shadow DOM版を表示
        if (shadowWorkspacePanel) {
          shadowWorkspacePanel.style.display = 'block';
          shadowWorkspacePanel.style.width = '100%';
          shadowWorkspacePanel.style.height = '100%';
          shadowWorkspacePanel.style.visibility = 'visible';
          shadowWorkspacePanel.style.opacity = '1';
          console.log('[SidebarManager] DEBUG: Set shadow workspace panel to BLOCK');
          console.log('[SidebarManager] Shadow workspace panel: SHOWN (within left-sidebar)');
        }
        
        console.log('[SidebarManager] Left sidebar container: SHOWN with Shadow content');
      } else {
        // 左サイドバーを非表示する場合
        if (traditionalLeftSidebar) {
          traditionalLeftSidebar.style.display = 'none';
          console.log('[SidebarManager] DEBUG: Set traditional left sidebar to NONE');
        }
        if (shadowWorkspacePanel) {
          shadowWorkspacePanel.style.display = 'none';
          console.log('[SidebarManager] DEBUG: Set shadow workspace panel to NONE');
        }
        console.log('[SidebarManager] Left sidebar: HIDDEN');
      }
      
      if (!shadowWorkspacePanel) {
        console.warn('[SidebarManager] Shadow workspace panel not found! DOM not ready?');
        // 要素が見つからない場合は再試行
        setTimeout(() => {
          console.log('[SidebarManager] Retrying left sidebar state application...');
          this.applyLeftSidebarState();
        }, 100);
      }
    } else {
      // Traditional版の場合
      const traditionalLeftSidebar = document.getElementById('left-sidebar');
      const shadowWorkspacePanel = document.getElementById('workspace-panel-shadow');
      
      console.log('[SidebarManager] Traditional mode - elements found:', {
        traditionalLeftSidebar: !!traditionalLeftSidebar,
        shadowWorkspacePanel: !!shadowWorkspacePanel
      });
      
      // Shadow DOM版を必ず非表示
      if (shadowWorkspacePanel) {
        shadowWorkspacePanel.style.display = 'none';
      }
      
      // Traditional版の制御
      if (traditionalLeftSidebar) {
        if (this.state.leftSidebar) {
          traditionalLeftSidebar.style.display = 'block';
          traditionalLeftSidebar.style.width = '280px';
          console.log('[SidebarManager] Traditional left sidebar: SHOWN');
        } else {
          traditionalLeftSidebar.style.display = 'none';
          console.log('[SidebarManager] Traditional left sidebar: HIDDEN');
        }
        
        // トランジション効果
        traditionalLeftSidebar.style.transition = 'width 0.3s ease, opacity 0.3s ease';
      } else {
        console.warn('[SidebarManager] Traditional left sidebar not found!');
      }
    }
  }

  /**
   * 右サイドバーの状態を適用
   */
  applyRightSidebarState() {
    // Shadow DOM専用モードなので常にtrue
    const shadowDOMEnabled = true;
    
    if (shadowDOMEnabled) {
      // Shadow DOM版の場合
      const shadowRightPanel = document.getElementById('right-panel-shadow');
      const traditionalRightSidebar = document.getElementById('context-sidebar');
      
      // Traditional版を必ず非表示
      if (traditionalRightSidebar) {
        traditionalRightSidebar.style.display = 'none';
      }
      
      // Shadow DOM版の制御
      if (shadowRightPanel) {
        if (this.state.rightSidebar) {
          shadowRightPanel.style.display = 'flex';
        } else {
          shadowRightPanel.style.display = 'none';
        }
      }
    } else {
      // Traditional版の場合
      const traditionalRightSidebar = document.getElementById('context-sidebar');
      const shadowRightPanel = document.getElementById('right-panel-shadow');
      
      // Shadow DOM版を必ず非表示
      if (shadowRightPanel) {
        shadowRightPanel.style.display = 'none';
      }
      
      // Traditional版の制御
      if (traditionalRightSidebar) {
        if (this.state.rightSidebar) {
          traditionalRightSidebar.style.display = 'block';
        } else {
          traditionalRightSidebar.style.display = 'none';
        }
        
        // トランジション効果
        traditionalRightSidebar.style.transition = 'width 0.3s ease, opacity 0.3s ease';
      }
    }
  }

  /**
   * 初期状態の適用
   */
  applyInitialState() {
    this.applyLeftSidebarState();
    this.applyRightSidebarState();
    this.applyCenterPanelState();
    this.updateButtonStates();
  }

  /**
   * ボタン状態の更新
   */
  updateButtonStates() {
    // 従来版ボタンの更新
    this.updateTraditionalButtons();
    
    // Shadow DOM版ボタンの更新
    this.updateShadowDOMButtons();
  }

  /**
   * 従来版ボタンの更新
   */
  updateTraditionalButtons() {
    // ボタンのHTMLは初期化時に設定済みのため、更新処理は不要
  }

  /**
   * Shadow DOM版ボタンの更新
   */
  updateShadowDOMButtons() {
    // ボタンのHTMLは初期化時に設定済みのため、更新処理は不要
  }

  /**
   * 状態の保存
   */
  saveState() {
    localStorage.setItem(this.STORAGE_KEY_PREFIX + 'left', this.state.leftSidebar.toString());
    localStorage.setItem(this.STORAGE_KEY_PREFIX + 'right', this.state.rightSidebar.toString());
  }

  /**
   * 状態の読み込み
   */
  loadState() {
    const leftState = localStorage.getItem(this.STORAGE_KEY_PREFIX + 'left');
    const rightState = localStorage.getItem(this.STORAGE_KEY_PREFIX + 'right');
    
    console.log('[SidebarManager] loadState - localStorage values:', {
      leftState,
      rightState,
      leftStateParsed: leftState === 'true',
      rightStateParsed: rightState === 'true'
    });
    
    // デバッグ用：強制的に両方のサイドバーを表示
    this.state.leftSidebar = true;
    this.state.rightSidebar = true;
    console.log('[SidebarManager] DEBUG: Force setting both sidebars to true');
    
    console.log('[SidebarManager] loadState - final state:', this.state);
  }

  /**
   * 特定のサイドバーを表示
   */
  showLeftSidebar() {
    if (!this.state.leftSidebar) {
      this.toggleLeftSidebar();
    }
  }

  showRightSidebar() {
    if (!this.state.rightSidebar) {
      this.toggleRightSidebar();
    }
  }

  /**
   * 特定のサイドバーを非表示
   */
  hideLeftSidebar() {
    if (this.state.leftSidebar) {
      this.toggleLeftSidebar();
    }
  }

  hideRightSidebar() {
    if (this.state.rightSidebar) {
      this.toggleRightSidebar();
    }
  }

  /**
   * 両方のサイドバーを切り替え
   */
  toggleBothSidebars() {
    const bothVisible = this.state.leftSidebar && this.state.rightSidebar;
    
    if (bothVisible) {
      // 両方表示中 → 両方非表示
      this.hideLeftSidebar();
      this.hideRightSidebar();
    } else {
      // いずれかが非表示 → 両方表示
      this.showLeftSidebar();
      this.showRightSidebar();
    }
  }

  /**
   * Shadow DOM切り替え時の連動処理
   */
  onShadowDOMToggle() {
    console.log('[SidebarManager] Shadow DOM toggle detected, re-applying states...');
    // 全パネルの状態を再適用（Shadow DOM版と従来版の切り替え）
    setTimeout(() => {
      this.applyLeftSidebarState();
      this.applyRightSidebarState();
      this.applyCenterPanelState();
      this.updateButtonStates();
      console.log('[SidebarManager] States re-applied after Shadow DOM toggle');
    }, 100);
  }

  /**
   * 中央パネルの状態を適用
   */
  applyCenterPanelState() {
    const shadowDOMEnabled = true; // Shadow DOM専用モード
    
    const traditionalCenter = document.getElementById('editor-split-container');
    const traditionalContentArea = document.querySelector('.content-area');
    const shadowCenter = document.getElementById('center-panel-shadow');
    
    if (shadowDOMEnabled) {
      // Shadow DOM版の場合
      // Traditional版を非表示
      if (traditionalContentArea) {
        traditionalContentArea.style.display = 'none';
      }
      if (traditionalCenter) {
        traditionalCenter.style.display = 'none';
      }
      
      // Shadow DOM版を表示
      if (shadowCenter) {
        shadowCenter.style.display = 'flex';
        shadowCenter.style.flex = '1';
        shadowCenter.style.minWidth = '0';
        shadowCenter.style.width = '100%';
      }
    } else {
      // Traditional版の場合
      // Shadow DOM版を非表示
      if (shadowCenter) {
        shadowCenter.style.display = 'none';
      }
      
      // Traditional版を表示
      if (traditionalContentArea) {
        traditionalContentArea.style.display = 'flex';
        traditionalContentArea.style.flex = '1';
        traditionalContentArea.style.minWidth = '0';
        traditionalContentArea.style.width = '100%';
      }
      if (traditionalCenter) {
        traditionalCenter.style.display = 'flex';
        traditionalCenter.style.flex = '1';
        traditionalCenter.style.minWidth = '0';
        traditionalCenter.style.width = '100%';
      }
    }
  }

  /**
   * 現在の状態を取得
   */
  getState() {
    return {
      leftSidebar: this.state.leftSidebar,
      rightSidebar: this.state.rightSidebar,
      keyboardShortcuts: {
        leftSidebar: 'Ctrl/Cmd + B',
        rightSidebar: 'Ctrl/Cmd + Shift + B'
      }
    };
  }

  /**
   * レスポンシブ対応
   */
  handleResize() {
    const width = window.innerWidth;
    
    // タブレット以下のサイズで自動的にサイドバーを非表示
    if (width < 768) {
      if (this.state.leftSidebar || this.state.rightSidebar) {
        this.hideLeftSidebar();
        this.hideRightSidebar();
      }
    }
  }

  /**
   * 破棄
   */
  destroy() {
    // イベントリスナーのクリーンアップは自動的に行われる
    console.log('[SidebarManager] Destroyed');
  }
}

// Export the class
export { SidebarManager };

// グローバルに公開
window.SidebarManager = SidebarManager;

// 自動初期化（singleton）
if (!window.sidebarManager) {
  const sidebarManager = new SidebarManager();
  window.sidebarManager = sidebarManager;
}

// Shadow DOM専用モード - 切り替え機能は不要

// レスポンシブ対応
window.addEventListener('resize', () => {
  sidebarManager.handleResize();
});

// グローバル公開
window.sidebarManager = sidebarManager;

// デバッグ用関数
window.toggleLeftSidebar = () => sidebarManager.toggleLeftSidebar();
window.toggleRightSidebar = () => sidebarManager.toggleRightSidebar();
window.getSidebarState = () => sidebarManager.getState();
window.resetSidebarState = () => {
  console.log('[DEBUG] Resetting sidebar state...');
  localStorage.removeItem('zosql-sidebar-left');
  localStorage.removeItem('zosql-sidebar-right');
  sidebarManager.state.leftSidebar = true;
  sidebarManager.state.rightSidebar = true;
  sidebarManager.applyInitialState();
  console.log('[DEBUG] Sidebar state reset complete - both sidebars should now be visible');
};

// 左サイドバーを強制的に表示する簡単な関数
window.showLeftSidebar = () => {
  console.log('[DEBUG] Forcing left sidebar to show...');
  sidebarManager.state.leftSidebar = true;
  sidebarManager.applyLeftSidebarState();
  sidebarManager.updateButtonStates();
  sidebarManager.saveState();
  console.log('[DEBUG] Left sidebar forced to show and state saved');
};
window.forceSidebarDebug = () => {
  console.log('[DEBUG] Current sidebar state:', sidebarManager.getState());
  console.log('[DEBUG] ShadowDOM enabled:', window.shadowDOMToggle?.isEnabled);
  console.log('[DEBUG] Elements check:');
  console.log('  - left-sidebar:', !!document.getElementById('left-sidebar'));
  console.log('  - workspace-panel-shadow:', !!document.getElementById('workspace-panel-shadow'));
  console.log('  - context-sidebar:', !!document.getElementById('context-sidebar'));
  console.log('  - right-panel-shadow:', !!document.getElementById('right-panel-shadow'));
};
window.forceShowLeftSidebar = () => {
  console.log('[DEBUG] Forcing left sidebar to show...');
  sidebarManager.state.leftSidebar = true;
  sidebarManager.applyLeftSidebarState();
  sidebarManager.updateButtonStates();
  console.log('[DEBUG] Force show complete');
};
window.debugLeftPanelState = () => {
  const shadowDOMEnabled = true; // Shadow DOM専用モード
  const traditionalPanel = document.getElementById('left-sidebar');
  const shadowPanel = document.getElementById('workspace-panel-shadow');
  const mainContainer = document.querySelector('.main-layout, .app-layout, .layout-container');
  
  console.group('[DEBUG] Left Panel State Analysis');
  console.log('Current state:', sidebarManager.state.leftSidebar);
  console.log('Shadow DOM enabled:', true);
  console.log('Traditional panel element:', traditionalPanel);
  console.log('Shadow panel element:', shadowPanel);
  console.log('Main container element:', mainContainer);
  
  if (traditionalPanel) {
    console.log('Traditional panel computed style display:', getComputedStyle(traditionalPanel).display);
    console.log('Traditional panel inline style display:', traditionalPanel.style.display);
    console.log('Traditional panel width:', getComputedStyle(traditionalPanel).width);
    console.log('Traditional panel getBoundingClientRect:', traditionalPanel.getBoundingClientRect());
  }
  
  if (shadowPanel) {
    console.log('Shadow panel computed style display:', getComputedStyle(shadowPanel).display);
    console.log('Shadow panel inline style display:', shadowPanel.style.display);
    console.log('Shadow panel width:', getComputedStyle(shadowPanel).width);
    console.log('Shadow panel flex-shrink:', getComputedStyle(shadowPanel).flexShrink);
    console.log('Shadow panel getBoundingClientRect:', shadowPanel.getBoundingClientRect());
    console.log('Shadow panel offsetWidth:', shadowPanel.offsetWidth);
    console.log('Shadow panel offsetHeight:', shadowPanel.offsetHeight);
    console.log('Shadow panel position:', getComputedStyle(shadowPanel).position);
    console.log('Shadow panel visibility:', getComputedStyle(shadowPanel).visibility);
    console.log('Shadow panel opacity:', getComputedStyle(shadowPanel).opacity);
  }
  
  if (mainContainer) {
    console.log('Main container display:', getComputedStyle(mainContainer).display);
    console.log('Main container flex-direction:', getComputedStyle(mainContainer).flexDirection);
  }
  
  console.log('Local storage left state:', localStorage.getItem('zosql-sidebar-left'));
  console.log('Shadow DOM toggle storage:', localStorage.getItem('zosql-shadow-dom-enabled'));
  
  console.groupEnd();
};

// ページロード時のイベントトラッキング
window.addEventListener('DOMContentLoaded', () => {
  console.log('[DEBUG] DOMContentLoaded fired');
});

window.addEventListener('load', () => {
  console.log('[DEBUG] Window load fired');
  setTimeout(() => {
    console.log('[DEBUG] Final state check after page load:');
    window.debugLeftPanelState();
  }, 500);
});
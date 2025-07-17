/**
 * Sidebar Manager
 * 左右サイドバーの開閉・状態管理
 */

export class SidebarManager {
  constructor() {
    this.STORAGE_KEY_PREFIX = 'zosql-sidebar-';
    this.state = {
      leftSidebar: true,
      rightSidebar: true
    };
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.loadState();
    this.setupEventListeners();
    this.applyInitialState();
    
    console.log('[SidebarManager] Initialized');
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
    this.state.leftSidebar = !this.state.leftSidebar;
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
    const leftSidebar = document.getElementById('left-sidebar');
    
    if (leftSidebar) {
      if (this.state.leftSidebar) {
        leftSidebar.style.display = 'block';
        leftSidebar.style.width = '280px'; // デフォルト幅
      } else {
        leftSidebar.style.display = 'none';
      }
      
      // トランジション効果
      leftSidebar.style.transition = 'width 0.3s ease, opacity 0.3s ease';
    }
  }

  /**
   * 右サイドバーの状態を適用
   */
  applyRightSidebarState() {
    // 現在のShadow DOM切り替え状態に応じて適切なサイドバーを制御
    const shadowDOMEnabled = window.shadowDOMToggle?.isEnabled || false;
    
    let rightSidebar;
    if (shadowDOMEnabled) {
      rightSidebar = document.getElementById('right-panel-shadow');
    } else {
      rightSidebar = document.getElementById('context-sidebar');
    }
    
    if (rightSidebar) {
      if (this.state.rightSidebar) {
        rightSidebar.style.display = 'block';
        rightSidebar.style.width = '300px'; // デフォルト幅
      } else {
        rightSidebar.style.display = 'none';
      }
      
      // トランジション効果
      rightSidebar.style.transition = 'width 0.3s ease, opacity 0.3s ease';
    }
  }

  /**
   * 初期状態の適用
   */
  applyInitialState() {
    this.applyLeftSidebarState();
    this.applyRightSidebarState();
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
    const leftToggleBtn = document.getElementById('toggle-left-sidebar');
    const rightToggleBtn = document.getElementById('toggle-right-sidebar');
    
    if (leftToggleBtn) {
      leftToggleBtn.innerHTML = this.state.leftSidebar ? '◀' : '▶';
      leftToggleBtn.title = this.state.leftSidebar ? 'Hide Left Sidebar' : 'Show Left Sidebar';
      leftToggleBtn.style.opacity = this.state.leftSidebar ? '1' : '0.6';
    }
    
    if (rightToggleBtn) {
      rightToggleBtn.innerHTML = this.state.rightSidebar ? '▶' : '◀';
      rightToggleBtn.title = this.state.rightSidebar ? 'Hide Right Sidebar' : 'Show Right Sidebar';
      rightToggleBtn.style.opacity = this.state.rightSidebar ? '1' : '0.6';
    }
  }

  /**
   * Shadow DOM版ボタンの更新
   */
  updateShadowDOMButtons() {
    const headerShadow = document.getElementById('header-shadow');
    if (headerShadow && headerShadow.component) {
      // Shadow DOM内のボタンを更新
      const leftBtn = headerShadow.shadowRoot?.getElementById('toggle-left-sidebar');
      const rightBtn = headerShadow.shadowRoot?.getElementById('toggle-right-sidebar');
      
      if (leftBtn) {
        leftBtn.innerHTML = this.state.leftSidebar ? '◀' : '▶';
        leftBtn.title = this.state.leftSidebar ? 'Hide Left Sidebar' : 'Show Left Sidebar';
        leftBtn.style.opacity = this.state.leftSidebar ? '1' : '0.6';
      }
      
      if (rightBtn) {
        rightBtn.innerHTML = this.state.rightSidebar ? '▶' : '◀';
        rightBtn.title = this.state.rightSidebar ? 'Hide Right Sidebar' : 'Show Right Sidebar';
        rightBtn.style.opacity = this.state.rightSidebar ? '1' : '0.6';
      }
    }
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
    
    if (leftState !== null) {
      this.state.leftSidebar = leftState === 'true';
    }
    
    if (rightState !== null) {
      this.state.rightSidebar = rightState === 'true';
    }
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
    // 右サイドバーの状態を再適用（Shadow DOM版と従来版の切り替え）
    setTimeout(() => {
      this.applyRightSidebarState();
      this.updateButtonStates();
    }, 100);
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

// 自動初期化
const sidebarManager = new SidebarManager();

// Shadow DOM切り替え時の連動
if (window.shadowDOMToggle) {
  const originalSetEnabled = window.shadowDOMToggle.setEnabled;
  window.shadowDOMToggle.setEnabled = function(enabled) {
    originalSetEnabled.call(this, enabled);
    sidebarManager.onShadowDOMToggle();
  };
}

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
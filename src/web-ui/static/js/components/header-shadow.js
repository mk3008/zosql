/**
 * Header Component with Shadow DOM
 * アプリケーションヘッダーのShadow DOM実装
 */

export class HeaderShadowComponent {
  constructor(shadowRoot, options = {}) {
    this.shadowRoot = shadowRoot;
    this.callbacks = new Map();
    
    // 設定
    this.config = {
      title: 'zosql',
      showLogo: true,
      showOpenButton: true,
      showSidebarToggles: true,
      showShadowDOMToggle: false,
      ...options
    };

    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.render();
    this.setupEventListeners();
    console.log('[HeaderShadow] Initialized');
  }

  /**
   * Shadow DOM内のCSS定義
   */
  getStyles() {
    return `
      <style>
        :host {
          display: block;
          background: var(--bg-tertiary, #374151);
          padding: 10px 20px;
          border-bottom: 1px solid var(--border-primary, #e5e7eb);
          height: var(--header-height, 60px);
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
        
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 100%;
          max-width: none;
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        .logo {
          font-size: 18px;
          font-weight: bold;
          color: var(--text-white, #ffffff);
          display: flex;
          align-items: center;
          gap: 8px;
          user-select: none;
        }
        
        .logo-icon {
          font-size: 20px;
        }
        
        .header-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .header-btn {
          background: var(--bg-accent, #3b82f6);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .header-btn:hover {
          background: var(--bg-accent-hover, #2563eb);
          transform: translateY(-1px);
        }
        
        .header-btn:active {
          transform: translateY(0);
        }
        
        .sidebar-toggle-btn {
          background: var(--bg-secondary, #6b7280);
          color: white;
          border: none;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          min-width: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .sidebar-toggle-btn:hover {
          background: var(--bg-secondary-hover, #4b5563);
          transform: translateY(-1px);
        }
        
        .sidebar-toggle-btn:active {
          transform: translateY(0);
        }
        
        .shadow-dom-toggle {
          background: var(--shadow-toggle-bg, #10b981);
          color: white;
          border: none;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 80px;
          justify-content: center;
        }
        
        .shadow-dom-toggle:hover {
          background: var(--shadow-toggle-hover, #059669);
          transform: translateY(-1px);
        }
        
        .shadow-dom-toggle.traditional {
          background: var(--traditional-bg, #f59e0b);
        }
        
        .shadow-dom-toggle.traditional:hover {
          background: var(--traditional-hover, #d97706);
        }
        
        .divider {
          width: 1px;
          height: 24px;
          background: var(--border-light, #9ca3af);
          margin: 0 4px;
        }
        
        /* レスポンシブ対応 */
        @media (max-width: 768px) {
          .header-controls {
            gap: 4px;
          }
          
          .header-btn {
            padding: 6px 8px;
            font-size: 12px;
          }
          
          .sidebar-toggle-btn {
            padding: 6px 8px;
            min-width: 32px;
          }
          
          .shadow-dom-toggle {
            padding: 4px 6px;
            font-size: 10px;
            min-width: 60px;
          }
          
          .divider {
            display: none;
          }
        }
        
        /* アニメーション */
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        
        .loading {
          animation: pulse 1s infinite;
        }
        
        /* ツールチップ風スタイル */
        .header-btn[title]:hover::after,
        .sidebar-toggle-btn[title]:hover::after,
        .shadow-dom-toggle[title]:hover::after {
          content: attr(title);
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          background: #374151;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          z-index: 1000;
          pointer-events: none;
        }
      </style>
    `;
  }

  /**
   * レンダリング
   */
  render() {
    const html = `
      ${this.getStyles()}
      <div class="header-container">
        <div class="header-left">
          ${this.config.showLogo ? this.renderLogo() : ''}
        </div>
        
        <div class="header-controls">
          ${this.config.showOpenButton ? this.renderOpenButton() : ''}
          ${this.config.showShadowDOMToggle ? '<div class="divider"></div>' : ''}
          ${this.config.showShadowDOMToggle ? this.renderShadowDOMToggle() : ''}
          ${this.config.showSidebarToggles ? '<div class="divider"></div>' : ''}
          ${this.config.showSidebarToggles ? this.renderSidebarToggles() : ''}
        </div>
      </div>
    `;
    
    this.shadowRoot.innerHTML = html;
  }

  /**
   * ロゴのレンダリング
   */
  renderLogo() {
    return `
      <div class="logo">
        <!--<span class="logo-icon">[ZOSQL]</span>-->
        <span>${this.config.title}</span>
      </div>
    `;
  }

  /**
   * Openボタンのレンダリング
   */
  renderOpenButton() {
    return `
      <button class="header-btn" id="open-file-btn" title="Open SQL File">
        <span>Open</span>
      </button>
    `;
  }

  /**
   * Shadow DOMトグルボタンのレンダリング
   */
  renderShadowDOMToggle() {
    // 現在の状態を取得（グローバルのshadowDOMToggleから）
    const isEnabled = window.shadowDOMToggle?.isEnabled || false;
    const buttonClass = isEnabled ? 'shadow-dom-toggle' : 'shadow-dom-toggle traditional';
    const icon = isEnabled ? '🔒' : '🔓';
    const text = isEnabled ? 'Shadow DOM' : 'Traditional';
    const title = `現在: ${text} - クリックで切り替え`;
    
    return `
      <button class="${buttonClass}" id="shadow-dom-toggle" title="${title}">
        <span>${icon}</span>
        <span>${text}</span>
      </button>
    `;
  }

  /**
   * サイドバートグルボタンのレンダリング
   */
  renderSidebarToggles() {
    return `
      <button class="sidebar-toggle-btn" id="toggle-left-sidebar" title="Toggle Left Sidebar">
        ◀
      </button>
      <button class="sidebar-toggle-btn" id="toggle-right-sidebar" title="Toggle Right Sidebar">
        ▶
      </button>
    `;
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // Openボタン
    const openBtn = this.shadowRoot.getElementById('open-file-btn');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.handleOpenFile());
    }

    // Shadow DOMトグルボタン
    const shadowToggleBtn = this.shadowRoot.getElementById('shadow-dom-toggle');
    if (shadowToggleBtn) {
      shadowToggleBtn.addEventListener('click', () => this.handleShadowDOMToggle());
    }

    // 左サイドバートグル
    const leftToggleBtn = this.shadowRoot.getElementById('toggle-left-sidebar');
    if (leftToggleBtn) {
      leftToggleBtn.addEventListener('click', () => this.handleLeftSidebarToggle());
    }

    // 右サイドバートグル
    const rightToggleBtn = this.shadowRoot.getElementById('toggle-right-sidebar');
    if (rightToggleBtn) {
      rightToggleBtn.addEventListener('click', () => this.handleRightSidebarToggle());
    }
  }

  /**
   * ファイルオープン処理
   */
  handleOpenFile() {
    console.log('[HeaderShadow] Open file triggered');
    
    // headerControlsがあれば使用、なければ独自実装
    if (window.headerControls && window.headerControls.handleOpenFile) {
      window.headerControls.handleOpenFile();
    } else {
      this.triggerCallback('open-file');
    }
  }

  /**
   * Shadow DOMトグル処理
   */
  handleShadowDOMToggle() {
    console.log('[HeaderShadow] Shadow DOM toggle triggered');
    
    if (window.shadowDOMToggle && window.shadowDOMToggle.toggle) {
      window.shadowDOMToggle.toggle();
      // ボタンの表示を更新
      setTimeout(() => this.updateShadowDOMToggleButton(), 100);
    } else {
      this.triggerCallback('shadow-dom-toggle');
    }
  }

  /**
   * 左サイドバートグル処理
   */
  handleLeftSidebarToggle() {
    console.log('[HeaderShadow] Left sidebar toggle triggered');
    
    // SidebarManagerがあれば使用
    if (window.sidebarManager && window.sidebarManager.toggleLeftSidebar) {
      window.sidebarManager.toggleLeftSidebar();
    } else {
      this.triggerCallback('left-sidebar-toggle');
    }
  }

  /**
   * 右サイドバートグル処理
   */
  handleRightSidebarToggle() {
    console.log('[HeaderShadow] Right sidebar toggle triggered');
    
    // SidebarManagerがあれば使用
    if (window.sidebarManager && window.sidebarManager.toggleRightSidebar) {
      window.sidebarManager.toggleRightSidebar();
    } else {
      this.triggerCallback('right-sidebar-toggle');
    }
  }

  /**
   * Shadow DOMトグルボタンの表示更新
   */
  updateShadowDOMToggleButton() {
    const isEnabled = window.shadowDOMToggle?.isEnabled || false;
    const button = this.shadowRoot.getElementById('shadow-dom-toggle');
    
    if (button) {
      const icon = isEnabled ? '🔒' : '🔓';
      const text = isEnabled ? 'Shadow DOM' : 'Traditional';
      const buttonClass = isEnabled ? 'shadow-dom-toggle' : 'shadow-dom-toggle traditional';
      const title = `現在: ${text} - クリックで切り替え`;
      
      button.className = buttonClass;
      button.title = title;
      button.innerHTML = `<span>${icon}</span><span>${text}</span>`;
    }
  }

  /**
   * コールバックの登録
   */
  onCallback(event, callback) {
    this.callbacks.set(event, callback);
  }

  /**
   * コールバックの実行
   */
  triggerCallback(event, data = null) {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback(data);
    }
    
    // CustomEventとしても発行
    this.shadowRoot.host.dispatchEvent(new CustomEvent(`header-${event}`, {
      detail: data,
      bubbles: true
    }));
  }

  /**
   * タイトルの更新
   */
  setTitle(title) {
    this.config.title = title;
    const logoElement = this.shadowRoot.querySelector('.logo span:last-child');
    if (logoElement) {
      logoElement.textContent = title;
    }
  }

  /**
   * ローディング状態の設定
   */
  setLoading(isLoading) {
    const headerContainer = this.shadowRoot.querySelector('.header-container');
    if (headerContainer) {
      if (isLoading) {
        headerContainer.classList.add('loading');
      } else {
        headerContainer.classList.remove('loading');
      }
    }
  }

  /**
   * 破棄
   */
  destroy() {
    this.callbacks.clear();
    console.log('[HeaderShadow] Destroyed');
  }
}

/**
 * Shadow DOM対応のWeb Component
 */
export class HeaderShadowElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.component = null;
  }

  connectedCallback() {
    this.component = new HeaderShadowComponent(this.shadowRoot, {
      title: this.getAttribute('title') || 'zosql Browser',
      showLogo: this.hasAttribute('show-logo') || !this.hasAttribute('hide-logo'),
      showOpenButton: this.hasAttribute('show-open') || !this.hasAttribute('hide-open'),
      showSidebarToggles: this.hasAttribute('show-sidebar-toggles') || !this.hasAttribute('hide-sidebar-toggles'),
      showShadowDOMToggle: this.hasAttribute('show-shadow-toggle')
    });

    // コールバック設定
    this.component.onCallback('open-file', () => {
      this.dispatchEvent(new CustomEvent('open-file', { bubbles: true }));
    });

    this.component.onCallback('shadow-dom-toggle', () => {
      this.dispatchEvent(new CustomEvent('shadow-dom-toggle', { bubbles: true }));
    });

    this.component.onCallback('left-sidebar-toggle', () => {
      this.dispatchEvent(new CustomEvent('left-sidebar-toggle', { bubbles: true }));
    });

    this.component.onCallback('right-sidebar-toggle', () => {
      this.dispatchEvent(new CustomEvent('right-sidebar-toggle', { bubbles: true }));
    });
  }

  disconnectedCallback() {
    if (this.component) {
      this.component.destroy();
      this.component = null;
    }
  }

  // 公開API
  setTitle(title) {
    return this.component?.setTitle(title);
  }

  setLoading(isLoading) {
    return this.component?.setLoading(isLoading);
  }

  updateShadowDOMToggleButton() {
    return this.component?.updateShadowDOMToggleButton();
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('header-shadow', HeaderShadowElement);
}

// グローバル公開
window.HeaderShadowComponent = HeaderShadowComponent;
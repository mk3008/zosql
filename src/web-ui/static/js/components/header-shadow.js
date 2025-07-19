/**
 * Header Component with Shadow DOM
 * アプリケーションヘッダーのShadow DOM実装
 */

import { ShadowComponentBase, ShadowElementBase } from './base/shadow-component-base.js';

export class HeaderShadowComponent extends ShadowComponentBase {
  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      title: 'zosql',
      showLogo: true,
      showOpenButton: true,
      showSidebarToggles: true,
      showShadowDOMToggle: false
    };
  }

  /**
   * Get event prefix for CustomEvents
   */
  getEventPrefix() {
    return 'header';
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
        }
        
        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        
        .header-logo {
          font-size: 24px;
          font-weight: bold;
          color: var(--text-white, #ffffff);
          text-decoration: none;
          cursor: pointer;
        }
        
        .header-logo:hover {
          opacity: 0.8;
        }
        
        .header-controls {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .header-btn {
          background: var(--bg-primary, #4b5563);
          color: var(--text-white, #ffffff);
          border: 1px solid var(--border-secondary, #6b7280);
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          font-family: inherit;
        }
        
        .header-btn:hover {
          background: var(--bg-secondary, #6b7280);
          border-color: var(--border-accent, #3b82f6);
        }
        
        .header-btn.accent {
          background: var(--bg-accent, #3b82f6);
          color: white;
          border-color: var(--bg-accent-hover, #2563eb);
        }
        
        .header-btn.accent:hover {
          background: var(--bg-accent-hover, #2563eb);
        }
        
        .header-btn.toggle {
          min-width: 36px;
          padding: 8px;
          justify-content: center;
        }
        
        .sidebar-toggles {
          display: flex;
          gap: 10px;
          padding: 0 15px;
          border-left: 1px solid var(--border-secondary, #6b7280);
          margin-left: 10px;
        }
        
        .loading-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid transparent;
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* レスポンシブデザイン */
        @media (max-width: 768px) {
          :host {
            padding: 10px;
          }
          
          .header-btn span {
            display: none;
          }
          
          .sidebar-toggles {
            padding: 0 10px;
          }
        }
      </style>
    `;
  }

  /**
   * コンテンツのレンダリング
   */
  renderContent() {
    return `
      <div class="header-container">
        <div class="header-left">
          ${this.config.showLogo ? this.renderLogo() : ''}
        </div>
        <div class="header-controls">
          ${this.config.showOpenButton ? this.renderOpenButton() : ''}
          ${this.config.showShadowDOMToggle ? this.renderShadowDOMToggle() : ''}
          ${this.config.showSidebarToggles ? this.renderSidebarToggles() : ''}
        </div>
      </div>
    `;
  }

  /**
   * ロゴのレンダリング
   */
  renderLogo() {
    return `
      <div class="header-logo" id="app-logo">
        ${this.config.title}
      </div>
    `;
  }

  /**
   * 開くボタンのレンダリング
   */
  renderOpenButton() {
    return `
      <button class="header-btn accent" id="open-file-btn" title="Open SQL file (Ctrl+O)">
        <span>📁</span>
        <span>Open</span>
      </button>
    `;
  }

  /**
   * Shadow DOM切り替えボタンのレンダリング
   */
  renderShadowDOMToggle() {
    return `
      <button class="header-btn" id="shadow-dom-toggle" title="Toggle Shadow DOM">
        <span>🔲</span>
        <span>Shadow DOM</span>
      </button>
    `;
  }

  /**
   * サイドバートグルボタンのレンダリング
   */
  renderSidebarToggles() {
    return `
      <div class="sidebar-toggles">
        <button class="header-btn toggle" id="toggle-left-sidebar" title="Toggle Left Sidebar">
          ◀
        </button>
        <button class="header-btn toggle" id="toggle-right-sidebar" title="Toggle Right Sidebar">
          ▶
        </button>
      </div>
    `;
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // Use base class helper methods
    this.addClickHandler('#open-file-btn', () => this.handleOpenFile());
    this.addClickHandler('#shadow-dom-toggle', () => this.handleShadowDOMToggle());
    this.addClickHandler('#toggle-left-sidebar', () => this.handleLeftSidebarToggle());
    this.addClickHandler('#toggle-right-sidebar', () => this.handleRightSidebarToggle());
    this.addClickHandler('#app-logo', () => this.handleLogoClick());
  }

  /**
   * ファイルを開くハンドラー
   */
  handleOpenFile() {
    console.log('[HeaderShadow] Open file clicked');
    this.setLoading(true);
    
    // ファイル入力要素を作成
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          this.triggerCallback('open-file', { fileName: file.name, content });
          this.setLoading(false);
        };
        reader.onerror = () => {
          console.error('Failed to read file');
          this.setLoading(false);
        };
        reader.readAsText(file);
      } else {
        this.setLoading(false);
      }
    };

    // Handle cancel case - if user cancels the dialog, onchange won't fire
    // Use focus event to detect when dialog is closed without selection
    const handleCancel = () => {
      // Set a timeout to check if a file was selected
      setTimeout(() => {
        if (!input.files || input.files.length === 0) {
          // No file was selected (dialog was canceled)
          this.setLoading(false);
          console.log('[HeaderShadow] File dialog was canceled');
        }
      }, 100); // Small delay to ensure onchange has time to fire if file was selected
      
      // Clean up the event listener
      window.removeEventListener('focus', handleCancel);
    };

    // Listen for window focus to detect dialog close
    window.addEventListener('focus', handleCancel);
    
    input.click();
  }

  /**
   * Shadow DOM切り替えハンドラー
   */
  handleShadowDOMToggle() {
    console.log('[HeaderShadow] Shadow DOM toggle clicked');
    this.triggerCallback('shadow-dom-toggle');
    this.updateShadowDOMToggleButton();
  }

  /**
   * 左サイドバー切り替えハンドラー
   */
  handleLeftSidebarToggle() {
    console.log('[HeaderShadow] Left sidebar toggle clicked');
    this.triggerCallback('left-sidebar-toggle');
    
    // ボタンのアイコンを更新
    const btn = this.$('#toggle-left-sidebar');
    if (btn) {
      const isCollapsed = btn.textContent === '▶';
      btn.textContent = isCollapsed ? '◀' : '▶';
      btn.title = isCollapsed ? 'Hide Left Sidebar' : 'Show Left Sidebar';
    }
  }

  /**
   * 右サイドバー切り替えハンドラー
   */
  handleRightSidebarToggle() {
    console.log('[HeaderShadow] Right sidebar toggle clicked');
    this.triggerCallback('right-sidebar-toggle');
    
    // ボタンのアイコンを更新
    const btn = this.$('#toggle-right-sidebar');
    if (btn) {
      const isCollapsed = btn.textContent === '◀';
      btn.textContent = isCollapsed ? '▶' : '◀';
      btn.title = isCollapsed ? 'Hide Right Sidebar' : 'Show Right Sidebar';
    }
  }

  /**
   * ロゴクリックハンドラー
   */
  handleLogoClick() {
    console.log('[HeaderShadow] Logo clicked');
    this.triggerCallback('logo-click');
  }

  /**
   * タイトルの設定
   */
  setTitle(title) {
    this.config.title = title;
    const logo = this.$('#app-logo');
    if (logo) {
      logo.textContent = title;
    }
  }

  /**
   * ローディング状態の設定
   */
  setLoading(isLoading) {
    const openBtn = this.$('#open-file-btn');
    if (openBtn) {
      if (isLoading) {
        openBtn.innerHTML = '<div class="loading-spinner"></div><span>Loading...</span>';
        openBtn.disabled = true;
      } else {
        openBtn.innerHTML = '<span>📁</span><span>Open</span>';
        openBtn.disabled = false;
      }
    }
  }

  /**
   * Shadow DOMトグルボタンの更新
   */
  updateShadowDOMToggleButton() {
    const btn = this.$('#shadow-dom-toggle');
    if (btn) {
      // 実装は外部から制御される
      console.log('[HeaderShadow] Shadow DOM toggle button updated');
    }
  }
}

/**
 * Shadow DOM対応のWeb Component
 */
export class HeaderShadowElement extends ShadowElementBase {
  static get componentClass() {
    return HeaderShadowComponent;
  }

  /**
   * 属性からオプションを収集
   */
  gatherOptions() {
    return {
      title: this.getAttributeOrDefault('title', 'zosql Browser'),
      showLogo: this.getBooleanAttribute('show-logo'),
      showOpenButton: this.getBooleanAttribute('show-open'),
      showSidebarToggles: this.getBooleanAttribute('show-sidebar-toggles'), 
      showShadowDOMToggle: this.getBooleanAttribute('show-shadow-dom-toggle')
    };
  }

  /**
   * コンポーネントのコールバックを設定
   */
  setupComponentCallbacks() {
    // イベントを外部に伝播
    ['open-file', 'shadow-dom-toggle', 'left-sidebar-toggle', 'right-sidebar-toggle', 'logo-click'].forEach(event => {
      this.component.onCallback(event, (data) => {
        this.dispatchEvent(new CustomEvent(event, { 
          detail: data,
          bubbles: true 
        }));
      });
    });
  }

  /**
   * コンポーネントAPIの公開
   */
  exposeComponentAPI() {
    this.exposeMethods(['setTitle', 'setLoading', 'updateShadowDOMToggleButton']);
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('header-shadow', HeaderShadowElement);
}

// グローバル公開
window.HeaderShadowComponent = HeaderShadowComponent;
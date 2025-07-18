/**
 * Right Panel Component with Shadow DOM
 * 将来の機能拡張に備えた右パネルコンポーネント
 */

export class RightPanelShadowComponent {
  constructor(shadowRoot, options = {}) {
    this.shadowRoot = shadowRoot;
    this.sections = new Map();
    this.isCollapsed = false;
    
    // 設定
    this.config = {
      title: 'Context Panel',
      collapsible: true,
      resizable: true,
      defaultWidth: '300px',
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
    console.log('[RightPanelShadow] Initialized');
  }

  /**
   * Shadow DOM内のCSS定義
   */
  getStyles() {
    return `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary, #ffffff);
          border-left: 1px solid var(--border-primary, #e5e7eb);
          height: 100%;
          width: var(--right-panel-width, 300px);
          min-width: 200px;
          max-width: 500px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          position: relative;
          flex-shrink: 0;
        }
        
        .resize-handle {
          position: absolute;
          left: 0;
          top: 0;
          width: 4px;
          height: 100%;
          background: transparent;
          cursor: col-resize;
          z-index: 10;
        }
        
        .resize-handle:hover {
          background: var(--border-accent, #3b82f6);
        }
        
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-primary, #e5e7eb);
          background: var(--bg-tertiary, #f9fafb);
          min-height: 48px;
        }
        
        .panel-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #374151);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .panel-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .panel-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary, #6b7280);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          font-size: 16px;
          line-height: 1;
          transition: all 0.2s;
        }
        
        .panel-btn:hover {
          background: var(--bg-hover, #f3f4f6);
          color: var(--text-primary, #374151);
        }
        
        .panel-content {
          padding: 16px;
          overflow-y: auto;
          height: calc(100% - 48px);
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--text-muted, #9ca3af);
          text-align: center;
        }
        
        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }
        
        .empty-title {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 6px;
          color: var(--text-secondary, #6b7280);
        }
        
        .empty-message {
          font-size: 14px;
          line-height: 1.5;
        }
        
        .section {
          margin-bottom: 20px;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-light, #f3f4f6);
          margin-bottom: 12px;
          cursor: pointer;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #374151);
        }
        
        .section-toggle {
          font-size: 12px;
          color: var(--text-muted, #9ca3af);
          transition: transform 0.2s;
        }
        
        .section.collapsed .section-toggle {
          transform: rotate(-90deg);
        }
        
        .section-content {
          overflow: hidden;
          transition: max-height 0.3s ease-out;
        }
        
        .section.collapsed .section-content {
          max-height: 0;
        }
        
        /* レスポンシブ対応 */
        @media (max-width: 768px) {
          :host {
            width: 100%;
            max-width: none;
          }
        }
        
        /* 将来の機能用スタイル */
        .feature-placeholder {
          padding: 12px;
          background: var(--bg-tertiary, #f9fafb);
          border: 2px dashed var(--border-light, #e5e7eb);
          border-radius: 8px;
          text-align: center;
          color: var(--text-muted, #9ca3af);
          font-size: 13px;
          margin: 8px 0;
        }
        
        .coming-soon {
          font-style: italic;
          opacity: 0.7;
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
      <div class="resize-handle" title="Resize panel"></div>
      
      <div class="panel-header">
        <div class="panel-title">
          📄 ${this.config.title}
        </div>
        <div class="panel-controls">
          <button class="panel-btn" id="refresh-btn" title="Refresh">🔄</button>
          <button class="panel-btn" id="settings-btn" title="Settings">⚙️</button>
          ${this.config.collapsible ? '<button class="panel-btn" id="collapse-btn" title="Collapse">📌</button>' : ''}
        </div>
      </div>
      
      <div class="panel-content">
        ${this.renderContent()}
      </div>
    `;
    
    this.shadowRoot.innerHTML = html;
  }

  /**
   * コンテンツのレンダリング
   */
  renderContent() {
    if (this.sections.size === 0) {
      return this.renderEmptyState();
    }
    
    let html = '';
    for (const [key, section] of this.sections) {
      html += this.renderSection(key, section);
    }
    return html;
  }

  /**
   * 空の状態をレンダリング
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">右パネル準備完了</div>
        <div class="empty-message">
          将来の機能拡張に備えて<br>
          きれいな構造で準備されています
        </div>
      </div>
      
      <div class="feature-placeholder">
        <div class="coming-soon">🚀 今後実装予定の機能エリア</div>
      </div>
      
      <div class="feature-placeholder">
        <div class="coming-soon">📊 分析結果表示エリア</div>
      </div>
      
      <div class="feature-placeholder">
        <div class="coming-soon">🔍 検索・フィルターエリア</div>
      </div>
    `;
  }

  /**
   * セクションのレンダリング
   */
  renderSection(key, section) {
    const collapsed = section.collapsed ? 'collapsed' : '';
    return `
      <div class="section ${collapsed}" data-section="${key}">
        <div class="section-header">
          <div class="section-title">${section.title}</div>
          <div class="section-toggle">▼</div>
        </div>
        <div class="section-content">
          ${section.content}
        </div>
      </div>
    `;
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // リフレッシュボタン
    const refreshBtn = this.shadowRoot.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.handleRefresh());
    }

    // 設定ボタン
    const settingsBtn = this.shadowRoot.getElementById('settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.handleSettings());
    }

    // 折りたたみボタン
    const collapseBtn = this.shadowRoot.getElementById('collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => this.handleCollapse());
    }

    // セクションの開閉
    this.shadowRoot.addEventListener('click', (e) => {
      const sectionHeader = e.target.closest('.section-header');
      if (sectionHeader) {
        const section = sectionHeader.closest('.section');
        const sectionKey = section.dataset.section;
        this.toggleSection(sectionKey);
      }
    });

    // リサイズハンドル
    this.setupResizeHandler();
  }

  /**
   * リサイズハンドラーの設定
   */
  setupResizeHandler() {
    const resizeHandle = this.shadowRoot.querySelector('.resize-handle');
    if (!resizeHandle) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = this.shadowRoot.host.offsetWidth;
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const deltaX = startX - e.clientX;
      const newWidth = Math.max(200, Math.min(500, startWidth + deltaX));
      this.shadowRoot.host.style.width = `${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.cursor = '';
      }
    });
  }

  /**
   * リフレッシュ処理
   */
  handleRefresh() {
    console.log('[RightPanelShadow] Refresh triggered');
    // 将来の実装用
  }

  /**
   * 設定処理
   */
  handleSettings() {
    console.log('[RightPanelShadow] Settings triggered');
    // 将来の実装用
  }

  /**
   * 折りたたみ処理
   */
  handleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    // 将来の実装用
    console.log('[RightPanelShadow] Collapse toggled:', this.isCollapsed);
  }

  /**
   * セクションの開閉
   */
  toggleSection(sectionKey) {
    const section = this.sections.get(sectionKey);
    if (section) {
      section.collapsed = !section.collapsed;
      this.render();
    }
  }

  /**
   * セクションの追加
   */
  addSection(key, section) {
    this.sections.set(key, {
      title: section.title,
      content: section.content || '',
      collapsed: section.collapsed || false,
      ...section
    });
    this.render();
  }

  /**
   * セクションの削除
   */
  removeSection(key) {
    this.sections.delete(key);
    this.render();
  }

  /**
   * パネルタイトルの更新
   */
  setTitle(title) {
    this.config.title = title;
    const titleElement = this.shadowRoot.querySelector('.panel-title');
    if (titleElement) {
      titleElement.innerHTML = `📄 ${title}`;
    }
  }

  /**
   * 破棄
   */
  destroy() {
    // Shadow DOM自体が削除される際に自動クリーンアップ
    console.log('[RightPanelShadow] Destroyed');
  }
}

/**
 * Shadow DOM対応のWeb Component
 */
export class RightPanelShadowElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.component = null;
  }

  connectedCallback() {
    this.component = new RightPanelShadowComponent(this.shadowRoot, {
      title: this.getAttribute('title') || 'Context Panel',
      collapsible: this.hasAttribute('collapsible'),
      resizable: this.hasAttribute('resizable')
    });
  }

  disconnectedCallback() {
    if (this.component) {
      this.component.destroy();
      this.component = null;
    }
  }

  // 公開API
  addSection(key, section) {
    return this.component?.addSection(key, section);
  }

  removeSection(key) {
    return this.component?.removeSection(key);
  }

  setTitle(title) {
    return this.component?.setTitle(title);
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('right-panel-shadow', RightPanelShadowElement);
}

// グローバル公開
window.RightPanelShadowComponent = RightPanelShadowComponent;
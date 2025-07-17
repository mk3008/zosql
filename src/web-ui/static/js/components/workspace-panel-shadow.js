/**
 * Workspace Panel Component with Shadow DOM
 * Shadow DOMを使用してスタイル分離を実現
 */

// Shadow DOMに対応したWorkspace Panel Component
export class WorkspacePanelShadowComponent {
  constructor(shadowRoot, options = {}) {
    this.shadowRoot = shadowRoot;
    this.sections = new Map();
    this.cteTreeComponent = null;
    
    // コールバック
    this.onTableClick = options.onTableClick || (() => {});
    this.onCteClick = options.onCteClick || (() => {});
    this.onMainQueryClick = options.onMainQueryClick || (() => {});
    
    // 設定
    this.config = {
      defaultSections: ['workspace', 'tables'],
      collapsible: true,
      persistState: true,
      ...options
    };

    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.loadState();
    this.render();
    this.setupEventListeners();
  }

  /**
   * Shadow DOM内のCSS定義
   */
  getStyles() {
    return `
      <style>
        :host {
          display: block;
          background: var(--bg-secondary, #f9fafb);
          border-right: 1px solid var(--border-primary, #e5e7eb);
          height: 100%;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
        
        .workspace-section {
          border-bottom: 1px solid var(--border-primary, #e5e7eb);
          padding: 12px;
        }
        
        .workspace-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
          font-weight: 500;
          color: var(--text-primary, #111827);
          font-size: 14px;
          margin-bottom: 8px;
          transition: color 0.2s;
        }
        
        .workspace-header:hover {
          color: var(--text-accent, #3b82f6);
        }
        
        .workspace-content {
          font-size: 14px;
          color: var(--text-secondary, #6b7280);
        }
        
        .collapse-icon {
          transition: transform 0.2s;
          font-size: 12px;
        }
        
        .workspace-section.collapsed .collapse-icon {
          transform: rotate(0deg);
        }
        
        .workspace-section:not(.collapsed) .collapse-icon {
          transform: rotate(90deg);
        }
        
        .workspace-section.collapsed .workspace-content {
          display: none;
        }
        
        .table-item {
          display: flex;
          align-items: center;
          padding: 6px 8px;
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.2s;
          border-radius: 4px;
          margin: 2px 0;
        }
        
        .table-item:hover:not(.active) {
          background-color: var(--bg-hover, #f3f4f6);
        }
        
        .table-item.active {
          background-color: var(--bg-accent, #3b82f6);
          color: white;
        }
        
        .table-icon {
          margin-right: 8px;
          font-size: 16px;
        }
        
        .table-name {
          font-weight: 500;
          color: var(--text-primary, #111827);
          font-size: 14px;
          flex: 1;
        }
        
        .table-item.active .table-name {
          color: white;
        }
        
        .table-columns {
          color: var(--text-muted, #6b7280);
          font-size: 12px;
          margin-left: auto;
        }
        
        .table-item.active .table-columns {
          color: var(--text-accent-light, #e5e7eb);
        }
        
        .workspace-title {
          font-weight: 500;
          color: var(--text-primary, #111827);
          font-size: 14px;
        }
        
        .cte-container {
          margin-top: 8px;
        }
        
        .cte-item {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s;
          border-radius: 4px;
          margin: 1px 0;
          margin-left: 12px;
        }
        
        .cte-item:hover {
          background-color: var(--bg-hover, #f3f4f6);
        }
        
        .cte-icon {
          margin-right: 6px;
          font-size: 14px;
        }
        
        .cte-name {
          font-weight: 400;
          color: var(--text-secondary, #6b7280);
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
      <div class="workspace-panel-content">
        ${this.renderSections()}
      </div>
    `;
    
    this.shadowRoot.innerHTML = html;
  }

  /**
   * セクションのレンダリング
   */
  renderSections() {
    let html = '';
    
    // デフォルトセクション: Workspace
    html += this.renderWorkspaceSection();
    
    // デフォルトセクション: Tables
    html += this.renderTablesSection();
    
    // カスタムセクション
    for (const [key, section] of this.sections) {
      if (!this.config.defaultSections.includes(key)) {
        html += this.renderCustomSection(key, section);
      }
    }
    
    return html;
  }

  /**
   * Workspaceセクションのレンダリング
   */
  renderWorkspaceSection() {
    const collapsed = this.getSectionState('workspace');
    return `
      <div class="workspace-section ${collapsed ? 'collapsed' : ''}" data-section="workspace">
        <div class="workspace-header">
          <span>📁 Workspace</span>
          <span class="collapse-icon">▶</span>
        </div>
        <div class="workspace-content">
          <div class="workspace-title">Active workspace</div>
        </div>
      </div>
    `;
  }

  /**
   * Tablesセクションのレンダリング
   */
  renderTablesSection() {
    const collapsed = this.getSectionState('tables');
    return `
      <div class="workspace-section ${collapsed ? 'collapsed' : ''}" data-section="tables">
        <div class="workspace-header">
          <span>🗃️ Tables</span>
          <span class="collapse-icon">▶</span>
        </div>
        <div class="workspace-content">
          <div id="tables-list">
            <!-- テーブル一覧はdynamicに更新される -->
            <div class="table-item" data-table="users">
              <span class="table-icon">📊</span>
              <span class="table-name">users</span>
              <span class="table-columns">5 cols</span>
            </div>
            <div class="table-item" data-table="orders">
              <span class="table-icon">📊</span>
              <span class="table-name">orders</span>
              <span class="table-columns">8 cols</span>
            </div>
          </div>
          
          <div class="cte-container" id="cte-list">
            <!-- CTE一覧 -->
          </div>
        </div>
      </div>
    `;
  }

  /**
   * カスタムセクションのレンダリング
   */
  renderCustomSection(key, section) {
    const collapsed = section.collapsed;
    return `
      <div class="workspace-section ${collapsed ? 'collapsed' : ''}" data-section="${key}">
        <div class="workspace-header">
          <span>${section.title}</span>
          ${section.collapsible ? '<span class="collapse-icon">▶</span>' : ''}
        </div>
        <div class="workspace-content">
          ${section.content}
        </div>
      </div>
    `;
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // ヘッダークリックでセクション開閉
    this.shadowRoot.addEventListener('click', (e) => {
      const header = e.target.closest('.workspace-header');
      if (header) {
        const section = header.closest('.workspace-section');
        const sectionKey = section.dataset.section;
        
        // セクション開閉
        section.classList.toggle('collapsed');
        this.saveSectionState(sectionKey, section.classList.contains('collapsed'));
      }
      
      // テーブルクリック
      const tableItem = e.target.closest('.table-item');
      if (tableItem) {
        const tableName = tableItem.dataset.table;
        if (tableName) {
          this.handleTableClick(tableName);
        }
      }
      
      // CTEクリック
      const cteItem = e.target.closest('.cte-item');
      if (cteItem) {
        const cteName = cteItem.dataset.cte;
        if (cteName) {
          this.handleCteClick(cteName);
        }
      }
    });
  }

  /**
   * テーブルクリック処理
   */
  handleTableClick(tableName) {
    // アクティブ状態の更新
    this.shadowRoot.querySelectorAll('.table-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const tableItem = this.shadowRoot.querySelector(`[data-table="${tableName}"]`);
    if (tableItem) {
      tableItem.classList.add('active');
    }
    
    this.onTableClick(tableName);
  }

  /**
   * CTEクリック処理
   */
  handleCteClick(cteName) {
    this.onCteClick(cteName);
  }

  /**
   * テーブル一覧の更新
   */
  updateTables(tables) {
    const tablesList = this.shadowRoot.querySelector('#tables-list');
    if (!tablesList) return;
    
    const html = tables.map(table => `
      <div class="table-item" data-table="${table.name}">
        <span class="table-icon">📊</span>
        <span class="table-name">${table.name}</span>
        <span class="table-columns">${table.columnCount || 0} cols</span>
      </div>
    `).join('');
    
    tablesList.innerHTML = html;
  }

  /**
   * CTE一覧の更新
   */
  updateCtes(ctes) {
    const ctesList = this.shadowRoot.querySelector('#cte-list');
    if (!ctesList) return;
    
    const html = ctes.map(cte => `
      <div class="cte-item" data-cte="${cte.name}">
        <span class="cte-icon">🔗</span>
        <span class="cte-name">${cte.name}</span>
      </div>
    `).join('');
    
    ctesList.innerHTML = html;
  }

  /**
   * セクション状態の取得
   */
  getSectionState(sectionKey) {
    const state = localStorage.getItem(`workspace-panel-section-${sectionKey}`);
    return state === 'true';
  }

  /**
   * セクション状態の保存
   */
  saveSectionState(sectionKey, collapsed) {
    localStorage.setItem(`workspace-panel-section-${sectionKey}`, collapsed.toString());
  }

  /**
   * 状態の読み込み
   */
  loadState() {
    // セクション状態は個別に読み込み
  }

  /**
   * 破棄
   */
  destroy() {
    // Shadow DOM自体が削除される際に自動クリーンアップ
  }
}

/**
 * Shadow DOM対応のWeb Component
 */
export class WorkspacePanelShadowElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.component = null;
  }

  connectedCallback() {
    this.component = new WorkspacePanelShadowComponent(this.shadowRoot, {
      onTableClick: (tableName) => {
        this.dispatchEvent(new CustomEvent('table-click', {
          detail: { tableName },
          bubbles: true
        }));
      },
      onCteClick: (cteName) => {
        this.dispatchEvent(new CustomEvent('cte-click', {
          detail: { cteName },
          bubbles: true
        }));
      },
      onMainQueryClick: () => {
        this.dispatchEvent(new CustomEvent('main-query-click', {
          bubbles: true
        }));
      }
    });
  }

  disconnectedCallback() {
    if (this.component) {
      this.component.destroy();
      this.component = null;
    }
  }

  // 公開API
  updateTables(tables) {
    return this.component?.updateTables(tables);
  }

  updateCtes(ctes) {
    return this.component?.updateCtes(ctes);
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('workspace-panel-shadow', WorkspacePanelShadowElement);
}

// グローバル公開
window.WorkspacePanelShadowComponent = WorkspacePanelShadowComponent;
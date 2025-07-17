/**
 * Workspace Panel Component
 * AI開発効率最適化 - 左サイドバー管理の単一責任
 */

export class WorkspacePanelComponent {
  constructor(container, options = {}) {
    this.container = container;
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
    this.container.classList.add('workspace-panel');
    this.loadState();
    this.render();
  }

  /**
   * セクション登録
   * @param {string} key - セクションキー
   * @param {Object} section - { title, content, collapsible, collapsed }
   */
  registerSection(key, section) {
    this.sections.set(key, {
      title: section.title,
      content: section.content || '',
      collapsible: section.collapsible !== false,
      collapsed: section.collapsed || false,
      ...section
    });
    this.render();
  }

  /**
   * 標準セクションを初期化
   */
  initializeDefaultSections() {
    // Workspace セクション
    this.registerSection('workspace', {
      title: 'Workspace',
      content: this.renderWorkspaceContent(),
      collapsible: true,
      collapsed: false
    });

    // Tables セクション
    this.registerSection('tables', {
      title: 'Tables',
      content: this.renderTablesContent(),
      collapsible: true,
      collapsed: false
    });
  }

  /**
   * CTE Tree データ更新
   */
  updateCteTree(data) {
    // データ構造を正規化 - privateCtes オブジェクトを受け取る場合と既に構造化されたデータを受け取る場合の両方をサポート
    const normalizedData = data.privateCtes ? data : { privateCtes: data };
    
    if (window.logger) {
      window.logger.info('Workspace Panel updateCteTree called', {
        hasData: !!data,
        dataType: typeof data,
        dataKeys: Object.keys(data || {}),
        normalizedData: normalizedData,
        hasComponent: !!this.cteTreeComponent
      });
    }
    
    if (this.cteTreeComponent) {
      this.cteTreeComponent.update(normalizedData);
    } else {
      // CTE Tree コンポーネントを作成
      this.createCteTreeComponent(normalizedData);
    }
    
    // Workspace セクションを更新
    this.updateSection('workspace', {
      content: this.renderWorkspaceContent()
    });
  }

  /**
   * CTE Tree コンポーネント作成
   */
  createCteTreeComponent(data) {
    if (window.logger) {
      window.logger.info('Creating CTE Tree Component', {
        hasData: !!data,
        dataKeys: Object.keys(data || {}),
        privateCteCount: Object.keys(data.privateCtes || {}).length
      });
    }
    
    // まず import して CTE Tree Component をロード
    import('./cte-tree.js').then(module => {
      const { CTETreeComponent } = module;
      
      if (window.logger) {
        window.logger.info('CTE Tree Component module loaded successfully');
      }
      
      // CTE Tree 用のコンテナを作成
      const cteContainer = document.createElement('div');
      cteContainer.className = 'cte-tree-container';
      
      this.cteTreeComponent = new CTETreeComponent(cteContainer, {
        onCteClick: this.onCteClick,
        onMainQueryClick: this.onMainQueryClick
      });
      
      this.cteTreeComponent.update(data);
      
      if (window.logger) {
        window.logger.info('CTE Tree Component created and updated successfully');
      }
      
      // Workspace セクションを更新してコンポーネントを表示
      this.updateSection('workspace', {
        content: this.renderWorkspaceContent()
      });
      
    }).catch(error => {
      if (window.logger) {
        window.logger.error('CTE Tree Component loading failed', {
          error: error.message,
          stack: error.stack
        });
      } else {
        console.error('CTE Tree Component loading failed:', error);
      }
    });
  }

  /**
   * テーブル情報更新
   */
  updateTables(tables) {
    this.tables = tables || [];
    this.updateSection('tables', {
      content: this.renderTablesContent()
    });
  }

  /**
   * セクション更新
   */
  updateSection(key, updates) {
    const section = this.sections.get(key);
    if (section) {
      Object.assign(section, updates);
      this.render();
    }
  }

  /**
   * セクション折りたたみ切り替え
   */
  toggleSection(key) {
    const section = this.sections.get(key);
    if (section && section.collapsible) {
      section.collapsed = !section.collapsed;
      this.saveState();
      this.updateSectionDisplay(key);
    }
  }

  /**
   * メインレンダリング
   */
  render() {
    if (this.sections.size === 0) {
      this.initializeDefaultSections();
    }

    let html = '';
    
    // セクションを順序通りにレンダリング
    this.config.defaultSections.forEach(key => {
      const section = this.sections.get(key);
      if (section) {
        html += this.renderSection(key, section);
      }
    });

    this.container.innerHTML = html;
    this.attachEventListeners();
    this.restoreCteTreeComponent();
  }

  /**
   * 個別セクションHTML生成
   */
  renderSection(key, section) {
    const collapsedClass = section.collapsed ? ' collapsed' : '';
    const collapseIcon = section.collapsible ? 
      `<span class="collapse-icon">${section.collapsed ? '▶' : '▼'}</span>` : '';

    return `
      <div class="workspace-section${collapsedClass}" data-section="${key}">
        <div class="workspace-header" ${section.collapsible ? `data-toggle="${key}"` : ''}>
          <span class="workspace-title">${section.title}</span>
          ${collapseIcon}
        </div>
        <div class="workspace-content">
          ${section.content}
        </div>
      </div>
    `;
  }

  /**
   * Workspace セクションコンテンツ
   */
  renderWorkspaceContent() {
    return `
      <div class="cte-tree-wrapper">
        ${this.cteTreeComponent ? this.cteTreeComponent.container.outerHTML : ''}
      </div>
    `;
  }

  /**
   * Tables セクションコンテンツ
   */
  renderTablesContent() {
    if (!this.tables || this.tables.length === 0) {
      return '<div class="text-muted">No tables available</div>';
    }

    return this.tables.map(table => `
      <div class="table-item clickable" data-table="${table.name}" title="${table.name}">
        <span class="table-icon">🗂️</span>
        <span class="table-name">${table.name}</span>
        <span class="table-columns">(${table.columns ? table.columns.length : 0})</span>
      </div>
    `).join('');
  }

  /**
   * CTE Tree コンポーネントを復元
   */
  restoreCteTreeComponent() {
    if (this.cteTreeComponent) {
      const wrapper = this.container.querySelector('.cte-tree-wrapper');
      if (wrapper) {
        wrapper.innerHTML = '';
        wrapper.appendChild(this.cteTreeComponent.container);
      }
    }
  }

  /**
   * セクション表示更新（軽量）
   */
  updateSectionDisplay(key) {
    const sectionElement = this.container.querySelector(`[data-section="${key}"]`);
    if (!sectionElement) return;

    const section = this.sections.get(key);
    const content = sectionElement.querySelector('.workspace-content');
    const icon = sectionElement.querySelector('.collapse-icon');

    if (section.collapsed) {
      sectionElement.classList.add('collapsed');
      if (icon) icon.textContent = '▶';
      if (content) content.style.display = 'none';
    } else {
      sectionElement.classList.remove('collapsed');
      if (icon) icon.textContent = '▼';
      if (content) content.style.display = 'block';
    }
  }

  /**
   * イベントリスナー設定
   */
  attachEventListeners() {
    // セクション折りたたみ
    this.container.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-toggle]');
      if (toggle) {
        e.preventDefault();
        e.stopPropagation();
        const sectionKey = toggle.dataset.toggle;
        this.toggleSection(sectionKey);
      }
    });

    // テーブルクリック
    this.container.addEventListener('click', (e) => {
      const tableItem = e.target.closest('.table-item');
      if (tableItem) {
        e.preventDefault();
        e.stopPropagation();
        const tableName = tableItem.dataset.table;
        this.onTableClick(tableName);
      }
    });
  }

  /**
   * 状態保存
   */
  saveState() {
    if (!this.config.persistState) return;

    const state = {};
    this.sections.forEach((section, key) => {
      state[key] = {
        collapsed: section.collapsed
      };
    });

    try {
      localStorage.setItem('zosql-workspace-state', JSON.stringify(state));
    } catch (error) {
      console.warn('Could not save workspace state:', error);
    }
  }

  /**
   * 状態復元
   */
  loadState() {
    if (!this.config.persistState) return;

    try {
      const state = JSON.parse(localStorage.getItem('zosql-workspace-state') || '{}');
      
      this.sections.forEach((section, key) => {
        if (state[key]) {
          section.collapsed = state[key].collapsed;
        }
      });
    } catch (error) {
      console.warn('Could not load workspace state:', error);
    }
  }

  /**
   * アクティブ要素設定
   */
  setActive(type, name) {
    // 以前のアクティブ状態をクリア
    const previousActive = this.container.querySelector('.active');
    if (previousActive) {
      previousActive.classList.remove('active');
    }

    // 新しいアクティブ状態を設定
    if (type === 'table') {
      const tableItem = this.container.querySelector(`[data-table="${name}"]`);
      if (tableItem) {
        tableItem.classList.add('active');
      }
    } else if (type === 'cte') {
      if (this.cteTreeComponent) {
        this.cteTreeComponent.setActiveCte(name);
      }
    }
  }

  /**
   * セクション取得
   */
  getSection(key) {
    return this.sections.get(key);
  }

  /**
   * 全セクション取得
   */
  getAllSections() {
    return Array.from(this.sections.entries()).map(([key, section]) => ({
      key,
      ...section
    }));
  }

  /**
   * デバッグ情報
   */
  getDebugInfo() {
    return {
      sectionsCount: this.sections.size,
      sections: this.getAllSections().map(s => ({
        key: s.key,
        title: s.title,
        collapsed: s.collapsed
      })),
      hasCteTree: !!this.cteTreeComponent,
      tablesCount: this.tables ? this.tables.length : 0
    };
  }

  /**
   * コンポーネント破棄
   */
  destroy() {
    if (this.cteTreeComponent) {
      this.cteTreeComponent.destroy();
      this.cteTreeComponent = null;
    }
    
    this.sections.clear();
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

/**
 * Web Component版
 */
export class WorkspacePanelElement extends HTMLElement {
  constructor() {
    super();
    this.component = null;
  }

  connectedCallback() {
    this.classList.add('workspace-panel');
    
    this.component = new WorkspacePanelComponent(this, {
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
    }
  }

  // 外部API
  updateCteTree(data) {
    return this.component?.updateCteTree(data);
  }

  updateTables(tables) {
    return this.component?.updateTables(tables);
  }

  setActive(type, name) {
    return this.component?.setActive(type, name);
  }

  toggleSection(key) {
    return this.component?.toggleSection(key);
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('workspace-panel', WorkspacePanelElement);
}

// グローバル公開
window.WorkspacePanelComponent = WorkspacePanelComponent;
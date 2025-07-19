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
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary, #f9fafb);
          height: 100%;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          flex-shrink: 0;
          width: var(--sidebar-width, 280px);
          min-width: 200px;
          max-width: 500px;
        }
        
        .workspace-section {
          border-bottom: 1px solid var(--border-primary, #e5e7eb);
          padding: 8px;
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
        
        /* CTE Tree Styles - 依存関係ツリー表示 */
        .cte-tree-wrapper {
          margin-top: 8px;
        }
        
        .cte-tree-item {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s;
          border-radius: 4px;
          margin: 1px 0;
        }
        
        .cte-tree-item:hover:not(.active) {
          background-color: var(--bg-hover, #f3f4f6);
        }
        
        .cte-tree-item.active {
          background-color: var(--bg-accent, #3b82f6);
          color: white;
        }
        
        /* 依存関係レベルごとの字下げ */
        .cte-tree-item[data-level="0"] {
          font-weight: 600;
          color: var(--text-primary, #111827);
        }
        
        .cte-tree-item[data-level="1"] {
          margin-left: 16px;
        }
        
        .cte-tree-item[data-level="2"] {
          margin-left: 32px;
        }
        
        .cte-tree-item[data-level="3"] {
          margin-left: 48px;
        }
        
        .cte-tree-item[data-level="4"] {
          margin-left: 64px;
        }
        
        .cte-tree-icon {
          margin-right: 6px;
          font-size: 14px;
          font-family: monospace;
          font-weight: bold;
        }
        
        .cte-tree-name {
          font-weight: 500;
          color: var(--text-primary, #111827);
          flex: 1;
        }
        
        .cte-tree-item.active .cte-tree-name {
          color: white;
        }
        
        .cte-tree-item:hover:not(.active) .cte-tree-name {
          color: var(--text-accent, #3b82f6);
        }
        
        .empty-workspace {
          padding: 16px 8px;
          text-align: center;
          color: var(--text-muted, #6b7280);
          font-style: italic;
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
          <span>Workspace</span>
          <span class="collapse-icon">▶</span>
        </div>
        <div class="workspace-content">
          ${this.renderCTEDependencyTree()}
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
          <span>Tables</span>
          <span class="collapse-icon">▶</span>
        </div>
        <div class="workspace-content">
          <div id="tables-list">
            <!-- テーブル一覧はdynamicに更新される -->
            <div class="table-item" data-table="users">
              <span class="table-name">users</span>
              <span class="table-columns">5 cols</span>
            </div>
            <div class="table-item" data-table="orders">
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

      // CTE Tree アイテムクリック（新しいファイルモデル対応）
      const cteTreeItem = e.target.closest('.cte-tree-item');
      if (cteTreeItem) {
        e.preventDefault();
        e.stopPropagation();
        
        const cteName = cteTreeItem.dataset.cte;
        if (cteName === 'main') {
          this.handleMainQueryClick();
        } else if (cteName) {
          this.handleCteTreeItemClick(cteName);
        }
        return; // 重要：他のイベントハンドラーを防ぐ
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
   * メインクエリクリック処理（ファイルモデル対応）
   */
  handleMainQueryClick() {
    console.log('[WorkspacePanelShadow] Main query clicked');
    
    if (!this.cteDependencyData || !this.cteDependencyData.mainQueryName) {
      console.warn('[WorkspacePanelShadow] No main query data available');
      return;
    }

    // メインクエリのコンテンツを明示的に渡す
    const mainQueryContent = this.cteDependencyData.mainQuery || '';
    console.log(`[WorkspacePanelShadow] Main query content length: ${mainQueryContent.length}`);
    
    // ワークスペースからメインクエリファイルを取得
    this.openWorkspaceFile(this.cteDependencyData.mainQueryName, 'main', mainQueryContent);
  }

  /**
   * CTEツリーアイテムクリック処理（ファイルモデル対応）
   */
  handleCteTreeItemClick(cteName) {
    console.log(`[WorkspacePanelShadow] CTE tree item clicked: ${cteName}`);
    
    if (!this.cteDependencyData || !this.cteDependencyData.privateCtes) {
      console.warn('[WorkspacePanelShadow] No CTE data available');
      return;
    }

    const cteData = this.cteDependencyData.privateCtes[cteName];
    if (!cteData) {
      console.warn(`[WorkspacePanelShadow] CTE data not found for: ${cteName}`);
      return;
    }

    // CTEファイルとして開く
    this.openWorkspaceFile(`${cteName}.cte`, 'cte', cteData.query);
  }

  /**
   * ワークスペースファイルを開く（ファイルモデル使用）
   */
  async openWorkspaceFile(fileName, type, content = null) {
    try {
      // コンテンツの取得
      let fileContent = content;
      
      if (!fileContent) {
        // まず、ファイルモデルマネージャーから取得を試行
        if (window.fileModelManager) {
          const existingModel = window.fileModelManager.getModelByName(fileName);
          if (existingModel) {
            fileContent = existingModel.getContent();
            console.log(`[WorkspacePanelShadow] Retrieved content from FileModelManager: ${fileName} (${fileContent.length} chars)`);
          }
        }
        
        // CTEデータから直接取得を試行
        if (!fileContent && type === 'cte' && this.cteDependencyData && this.cteDependencyData.privateCtes) {
          const cteName = fileName.replace('.cte', '');
          const cteData = this.cteDependencyData.privateCtes[cteName];
          if (cteData && cteData.query) {
            fileContent = cteData.query;
            console.log(`[WorkspacePanelShadow] Retrieved CTE content from dependency data: ${cteName}`);
          }
        }
        
        // メインクエリの場合、ワークスペースデータから取得
        if (!fileContent && type === 'main' && this.cteDependencyData && this.cteDependencyData.mainQuery) {
          fileContent = this.cteDependencyData.mainQuery;
          console.log('[WorkspacePanelShadow] Retrieved main query content from dependency data');
        }
        
        // まだコンテンツがない場合、サーバーからの取得を試行
        if (!fileContent) {
          try {
            const response = await fetch(`/api/workspace/${type}/${encodeURIComponent(fileName)}`);
            if (response.ok) {
              const result = await response.json();
              fileContent = result.content || result.query || '';
              console.log(`[WorkspacePanelShadow] Retrieved content from server: ${fileName}`);
            } else {
              console.warn(`[WorkspacePanelShadow] Server fetch failed for ${fileName}: ${response.status}`);
            }
          } catch (fetchError) {
            console.warn(`[WorkspacePanelShadow] Server fetch error for ${fileName}:`, fetchError);
          }
        }
        
        // 最終的にコンテンツがない場合のフォールバック
        if (!fileContent) {
          // ファイル名から拡張子を除去してSQLファイル名を取得
          const baseName = fileName.replace(/\.(sql|cte)$/i, '');
          fileContent = `-- ${baseName}\n-- Content not available`;
          console.warn(`[WorkspacePanelShadow] Using fallback content for: ${fileName} (type: ${type})`);
        }
      }

      // 中央パネルのファイルモデル対応タブ作成
      const centerPanel = document.getElementById('center-panel-shadow');
      if (centerPanel && centerPanel.createOrReuseTabForFile) {
        const tabId = centerPanel.createOrReuseTabForFile(fileName, fileContent, {
          type: 'sql'
        });
        
        console.log(`[WorkspacePanelShadow] Opened workspace file: ${fileName} (${tabId})`);
      } else {
        console.warn('[WorkspacePanelShadow] Center panel not available or method not found');
      }
      
    } catch (error) {
      console.error('[WorkspacePanelShadow] Error opening workspace file:', error);
    }
  }

  /**
   * テーブル一覧の更新
   */
  updateTables(tables) {
    const tablesList = this.shadowRoot.querySelector('#tables-list');
    if (!tablesList) return;
    
    const html = tables.map(table => `
      <div class="table-item" data-table="${table.name}">
        <span class="table-name">${table.name}</span>
        <span class="table-columns">${table.columnCount || 0} cols</span>
      </div>
    `).join('');
    
    tablesList.innerHTML = html;
  }

  /**
   * CTE依存関係ツリーのレンダリング
   */
  renderCTEDependencyTree() {
    if (!this.cteDependencyData || !this.cteDependencyData.privateCtes) {
      return `
        <div class="empty-workspace">
          No CTE dependencies to display.<br>
          Open a SQL file with CTEs to see the dependency tree.
        </div>
      `;
    }

    const tree = this.buildCTEDependencyTree(this.cteDependencyData.privateCtes);
    const mainQueryName = this.cteDependencyData.mainQueryName || 'Main Query';

    let html = `
      <div class="cte-tree-wrapper">
        <div class="cte-tree-item" data-level="0" data-cte="main">
          <span class="cte-tree-icon">[MAIN]</span>
          <span class="cte-tree-name">${mainQueryName}</span>
        </div>
    `;

    html += this.renderCTETreeNodes(tree, 1);
    html += '</div>';

    return html;
  }

  /**
   * CTE依存関係ツリーを構築
   */
  buildCTEDependencyTree(privateCtes) {
    if (!privateCtes || Object.keys(privateCtes).length === 0) {
      return {};
    }

    // ルートCTE（他のCTEから参照されていないCTE）を見つける
    const allCteNames = Object.keys(privateCtes);
    const referencedCtes = new Set();
    
    // 全CTEの依存関係を調べて、参照されているCTEを収集
    Object.values(privateCtes).forEach(cte => {
      if (cte.dependencies) {
        cte.dependencies.forEach(dep => referencedCtes.add(dep));
      }
    });
    
    // 参照されていないCTEがルート
    const rootCtes = allCteNames.filter(name => !referencedCtes.has(name));
    
    // 再帰的にツリーを構築
    const buildTree = (cteName, level = 0) => {
      const cte = privateCtes[cteName];
      if (!cte) return null;
      
      const children = {};
      if (cte.dependencies && cte.dependencies.length > 0) {
        cte.dependencies.forEach(depName => {
          const childTree = buildTree(depName, level + 1);
          if (childTree) {
            children[depName] = childTree;
          }
        });
      }
      
      return {
        name: cteName,
        level: level,
        dependencies: cte.dependencies || [],
        children: children,
        query: cte.query,
        description: cte.description
      };
    };
    
    // ルートCTEからツリーを構築
    const tree = {};
    rootCtes.forEach(rootName => {
      const rootTree = buildTree(rootName);
      if (rootTree) {
        tree[rootName] = rootTree;
      }
    });
    
    return tree;
  }

  /**
   * CTE Tree ノードを再帰的にレンダリング
   */
  renderCTETreeNodes(tree, level = 1) {
    let html = '';
    
    Object.entries(tree).forEach(([name, node]) => {
      html += `
        <div class="cte-tree-item" data-level="${level}" data-cte="${name}">
          <span class="cte-tree-icon">[CTE]</span>
          <span class="cte-tree-name">${name}</span>
        </div>
      `;

      // 子の依存関係を再帰的にレンダリング
      if (node.children && Object.keys(node.children).length > 0) {
        html += this.renderCTETreeNodes(node.children, level + 1);
      }
    });

    return html;
  }

  /**
   * CTE依存関係データを更新
   */
  updateCTEDependencies(data) {
    console.log('[WorkspacePanelShadow] Updating CTE dependencies:', data);
    this.cteDependencyData = data;
    
    // Workspaceセクションのみを再レンダリング
    const workspaceSection = this.shadowRoot.querySelector('[data-section="workspace"] .workspace-content');
    if (workspaceSection) {
      workspaceSection.innerHTML = this.renderCTEDependencyTree();
      this.setupEventListeners(); // イベントリスナーを再設定
    }
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
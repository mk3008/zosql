/**
 * Workspace Panel Component with Shadow DOM
 * Shadow DOMを使用してスタイル分離を実現
 */

import { ShadowComponentBase, ShadowElementBase } from './base/shadow-component-base.js';

export class WorkspacePanelShadowComponent extends ShadowComponentBase {
  /**
   * Pre-initialization setup
   */
  beforeInit() {
    this.sections = new Map();
    this.cteTreeComponent = null;
    this.cteDependencyData = null;
    this.validationResults = null;
    this.isValidating = false;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      defaultSections: ['workspace'],
      collapsible: true,
      persistState: true
    };
  }

  /**
   * Get event prefix for CustomEvents
   */
  getEventPrefix() {
    return 'workspace-panel';
  }

  /**
   * Get localStorage key for state persistence
   */
  getStateKey() {
    return 'workspace-panel-state';
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
          width: 100%;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          flex-shrink: 0;
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
        
        /* SQL Validation Styles */
        .validation-status {
          margin-left: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .validation-status.valid {
          color: #10b981;
        }
        
        .validation-status.invalid {
          color: #ef4444;
        }
        
        .validation-status.pending {
          color: #f59e0b;
        }
        
        .validation-error {
          font-size: 13px;
          color: #e5e7eb;
          margin-left: 20px;
          margin-top: 2px;
          background: #1f2937;
          padding: 6px 8px;
          border-radius: 0;
          border-left: 3px solid #ef4444;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          line-height: 1.4;
        }
        
        .validation-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .validate-button {
          background: var(--bg-accent, #3b82f6);
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .validate-button:hover {
          background: #2563eb;
        }
        
        .validate-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        
        .validation-summary {
          font-size: 11px;
          color: var(--text-muted, #6b7280);
        }
      </style>
    `;
  }

  /**
   * コンテンツのレンダリング
   */
  renderContent() {
    return `
      <div class="workspace-panel-content">
        ${this.renderSections()}
      </div>
    `;
  }

  /**
   * セクションのレンダリング
   */
  renderSections() {
    let html = '';
    
    // デフォルトセクション: Workspace
    html += this.renderWorkspaceSection();
    
    // Tables section removed
    
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
          ${this.renderValidationControls()}
          ${this.renderCTEDependencyTreeWithValidation()}
        </div>
      </div>
    `;
  }

  /**
   * Tablesセクションのレンダリング (廃止)
   */

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
    this.addClickHandler('.workspace-header', (e, header) => {
      const section = header.closest('.workspace-section');
      const sectionKey = section.dataset.section;
      
      // セクション開閉
      section.classList.toggle('collapsed');
      this.saveSectionState(sectionKey, section.classList.contains('collapsed'));
    });

    // テーブルクリック
    this.addClickHandler('.table-item', (e, tableItem) => {
      const tableName = tableItem.dataset.table;
      if (tableName) {
        this.handleTableClick(tableName);
      }
    });

    // CTEクリック
    this.addClickHandler('.cte-item', (e, cteItem) => {
      const cteName = cteItem.dataset.cte;
      if (cteName) {
        this.handleCteClick(cteName);
      }
    });

    // CTE Tree アイテムクリック（新しいファイルモデル対応）
    this.addClickHandler('.cte-tree-item', (e, cteTreeItem) => {
      e.preventDefault();
      e.stopPropagation();
      
      const type = cteTreeItem.dataset.type;
      const name = cteTreeItem.dataset.name;
      const cteName = cteTreeItem.dataset.cte; // 旧形式との互換性
      
      if (type === 'main' || cteName === 'main') {
        this.handleMainQueryClick();
      } else if (type === 'cte' && name) {
        this.handleCteTreeItemClick(name);
      } else if (cteName) {
        // 旧形式への対応
        this.handleCteTreeItemClick(cteName);
      }
    });
  }

  /**
   * テーブルクリック処理
   */
  handleTableClick(tableName) {
    // アクティブ状態の更新
    this.$$('.table-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const tableItem = this.$(`[data-table="${tableName}"]`);
    if (tableItem) {
      tableItem.classList.add('active');
    }
    
    this.triggerCallback('table-click', tableName);
  }

  /**
   * CTEクリック処理
   */
  handleCteClick(cteName) {
    this.triggerCallback('cte-click', cteName);
  }

  /**
   * メインクエリクリック処理
   */
  handleMainQueryClick() {
    if (!this.cteDependencyData) {
      console.error('[WorkspacePanelShadow] No CTE dependency data available');
      return;
    }

    const queryName = this.cteDependencyData.name || 
                     this.cteDependencyData.mainQueryName ||
                     (this.cteDependencyData.originalFilePath && 
                      this.cteDependencyData.originalFilePath.replace(/\.sql$/i, '')) ||
                     'main_query';
    const mainQueryFileName = queryName + '.sql';
    
    const mainQueryContent = this.cteDependencyData.decomposedQuery || 
                            this.cteDependencyData.mainQuery || '';
    
    if (!mainQueryContent) {
      console.warn('[WorkspacePanelShadow] No content available for main query');
      return;
    }
    
    const centerPanel = document.getElementById('center-panel-shadow');
    if (centerPanel && centerPanel.createOrReuseTabForFile) {
      centerPanel.createOrReuseTabForFile(mainQueryFileName, mainQueryContent, {
        type: 'sql'
      });
    } else {
      console.error('[WorkspacePanelShadow] Center panel not available or method missing');
    }
  }

  /**
   * CTEツリーアイテムクリック処理
   */
  handleCteTreeItemClick(cteName) {
    if (!this.cteDependencyData || !this.cteDependencyData.privateCtes) {
      console.warn('[WorkspacePanelShadow] No CTE data available');
      return;
    }

    const cteData = this.cteDependencyData.privateCtes[cteName];
    if (!cteData) {
      console.warn(`[WorkspacePanelShadow] CTE data not found for: ${cteName}`);
      return;
    }

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
          }
        }
        
        // CTEデータから直接取得を試行
        if (!fileContent && type === 'cte' && this.cteDependencyData && this.cteDependencyData.privateCtes) {
          const cteName = fileName.replace('.cte', '');
          const cteData = this.cteDependencyData.privateCtes[cteName];
          if (cteData && cteData.query) {
            // CTEデータからはそのまま取得（既にextractCTEQuery処理済み）
            fileContent = cteData.query;
          }
        }
        
        // メインクエリの場合、ワークスペースデータから取得
        if (!fileContent && type === 'main' && this.cteDependencyData && this.cteDependencyData.mainQuery) {
          fileContent = this.cteDependencyData.mainQuery;
        }
        
        // まだコンテンツがない場合、サーバーからの取得を試行
        if (!fileContent) {
          try {
            // メインクエリの場合、実際のワークスペースファイル名を使用
            let requestFileName = fileName;
            if (type === 'main' && this.cteDependencyData && this.cteDependencyData.name) {
              requestFileName = `${this.cteDependencyData.name}.sql`;
            }
            
            const response = await fetch(`/api/workspace/${type}/${encodeURIComponent(requestFileName)}`);
            if (response.ok) {
              const result = await response.json();
              fileContent = result.content || result.query || '';
            }
          } catch (fetchError) {
            // サーバーエラーは無視して続行
          }
        }
        
        // 最終的にコンテンツがない場合のフォールバック
        if (!fileContent) {
          const baseName = fileName.replace(/\.(sql|cte)$/i, '');
          fileContent = `-- ${baseName}\n-- Content not available`;
        }
      }

      // 中央パネルのファイルモデル対応タブ作成
      const centerPanel = document.getElementById('center-panel-shadow');
      if (centerPanel && centerPanel.createOrReuseTabForFile) {
        centerPanel.createOrReuseTabForFile(fileName, fileContent, {
          type: type === 'cte' ? 'private-cte' : 'sql'
        });
      }
      
    } catch (error) {
      console.error('[WorkspacePanelShadow] Error opening workspace file:', error);
    }
  }

  /**
   * テーブル一覧の更新 (廃止)
   */

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
          <span class="cte-tree-icon">📝</span>
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
          <span class="cte-tree-icon">📦</span>
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
    this.cteDependencyData = data;
    // ワークスペースが更新されたら検査結果をクリア
    this.validationResults = null;
    
    // Workspaceセクションのみを再レンダリング
    const workspaceSection = this.$('[data-section="workspace"] .workspace-content');
    if (workspaceSection) {
      workspaceSection.innerHTML = this.renderValidationControls() + this.renderCTEDependencyTreeWithValidation();
    }
  }

  /**
   * 検査コントロールのレンダリング
   */
  renderValidationControls() {
    if (!this.cteDependencyData) {
      return '';
    }

    const summary = this.getValidationSummary();
    
    return `
      <div class="validation-controls">
        <button class="validate-button" ${this.isValidating ? 'disabled' : ''} onclick="this.getRootNode().host.validateWorkspace()">
          ${this.isValidating ? 'Validating...' : 'Validate SQL'}
        </button>
        ${summary ? `<span class="validation-summary">${summary}</span>` : ''}
      </div>
    `;
  }

  /**
   * 検査結果サマリーの取得
   */
  getValidationSummary() {
    if (!this.validationResults) {
      return '';
    }

    const validCount = this.validationResults.filter(r => r.isValid).length;
    const totalCount = this.validationResults.length;
    const invalidCount = totalCount - validCount;

    if (invalidCount === 0) {
      return `✅ All ${totalCount} files valid`;
    } else {
      return `❌ ${invalidCount}/${totalCount} files have errors`;
    }
  }

  /**
   * ワークスペースSQL検査の実行
   */
  async validateWorkspace() {
    if (this.isValidating || !this.cteDependencyData) {
      return;
    }

    this.isValidating = true;
    this.render();

    try {
      const response = await fetch('/api/validate-workspace');
      if (!response.ok) {
        throw new Error(`Validation failed: ${response.status}`);
      }

      const data = await response.json();
      this.validationResults = data.results || [];
      
      console.log('[WorkspacePanelShadow] Validation completed:', this.validationResults);
      
    } catch (error) {
      console.error('[WorkspacePanelShadow] Validation error:', error);
      this.validationResults = null;
    } finally {
      this.isValidating = false;
      this.render();
    }
  }

  /**
   * ファイルの検査結果を取得
   */
  getValidationResult(fileName, type) {
    if (!this.validationResults) {
      return null;
    }

    // MAINクエリの場合
    if (type === 'main') {
      return this.validationResults.find(r => r.type === 'main');
    }

    // CTEの場合
    const cteName = fileName.replace('.cte', '').replace('.sql', '');
    return this.validationResults.find(r => r.type === 'cte' && r.name === cteName);
  }

  /**
   * 検査結果付きCTE依存関係ツリーのレンダリング
   */
  renderCTEDependencyTreeWithValidation() {
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
        <div class="cte-tree-item" data-level="0" data-type="main" data-name="${mainQueryName}">
          <span class="cte-tree-icon">📝</span>
          <span class="cte-tree-name">${mainQueryName}</span>
          ${this.renderValidationStatus('main', mainQueryName)}
        </div>
        ${this.renderValidationError('main', mainQueryName)}
    `;

    // 既存のrenderCTETreeNodesメソッドを使用（検査ステータス付き）
    html += this.renderCTETreeNodesWithValidation(tree, 1);
    html += `</div>`;

    return html;
  }

  /**
   * 検査結果付きCTEツリーノードのレンダリング
   */
  renderCTETreeNodesWithValidation(tree, level = 1) {
    if (!tree || typeof tree !== 'object') {
      return '';
    }

    return Object.values(tree).map(node => {
      const cteName = node.name;
      
      let html = `
        <div class="cte-tree-item" data-level="${level}" data-type="cte" data-name="${cteName}">
          <span class="cte-tree-icon">📦</span>
          <span class="cte-tree-name">${cteName}</span>
          ${this.renderValidationStatus('cte', cteName)}
        </div>
        ${this.renderValidationError('cte', cteName)}
      `;

      if (node.children && typeof node.children === 'object' && Object.keys(node.children).length > 0) {
        html += this.renderCTETreeNodesWithValidation(node.children, level + 1);
      }

      return html;
    }).join('');
  }

  /**
   * 検査ステータスアイコンのレンダリング
   */
  renderValidationStatus(type, name) {
    const result = this.getValidationResult(name, type);
    
    if (!result) {
      return this.validationResults ? '<span class="validation-status pending">⏳</span>' : '';
    }

    if (result.isValid) {
      return '<span class="validation-status valid">✅</span>';
    } else {
      return '<span class="validation-status invalid">❌</span>';
    }
  }

  /**
   * 検査エラー詳細のレンダリング
   */
  renderValidationError(type, name) {
    const result = this.getValidationResult(name, type);
    
    if (!result || result.isValid || !result.error) {
      return '';
    }

    return `<div class="validation-error">${this.escapeHtml(result.error.trim())}</div>`;
  }

  /**
   * HTMLエスケープユーティリティ
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }


  /**
   * CTE一覧の更新
   */
  updateCtes(ctes) {
    const ctesList = this.$('#cte-list');
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
   * Get state to persist
   */
  getStateToPersist() {
    return {
      // セクション状態は localStorage で個別管理されているため、
      // 特に追加の状態保持は不要
    };
  }
}

/**
 * Shadow DOM対応のWeb Component
 */
export class WorkspacePanelShadowElement extends ShadowElementBase {
  static get componentClass() {
    return WorkspacePanelShadowComponent;
  }

  /**
   * 属性からオプションを収集
   */
  gatherOptions() {
    return {
      defaultSections: ['workspace'],
      collapsible: this.getBooleanAttribute('collapsible'),
      persistState: this.getBooleanAttribute('persist-state')
    };
  }

  /**
   * コンポーネントのコールバックを設定
   */
  setupComponentCallbacks() {
    // イベントを外部に伝播
    ['table-click', 'cte-click', 'main-query-click'].forEach(event => {
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
    this.exposeMethods([
      'updateCtes', 
      'updateCTEDependencies',
      'validateWorkspace'
    ]);
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('workspace-panel-shadow', WorkspacePanelShadowElement);
}

// グローバル公開
window.WorkspacePanelShadowComponent = WorkspacePanelShadowComponent;
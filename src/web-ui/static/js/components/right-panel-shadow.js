/**
 * Right Panel Component with Shadow DOM
 * 将来の機能拡張に備えた右パネルコンポーネント
 */

import { ShadowComponentBase, ShadowElementBase } from './base/shadow-component-base.js';

export class RightPanelShadowComponent extends ShadowComponentBase {
  /**
   * 初期化前の設定
   */
  beforeInit() {
    this.sections = new Map();
    this.isCollapsed = false;
    this.activeTab = 'values'; // Default active tab
    this.tabs = [
      { id: 'values', label: 'Values', icon: '📊' },
      { id: 'condition', label: 'Condition', icon: '🔍' }
    ];
    this.valuesContent = '-- Define test data CTEs here\n-- Write WITH clauses, SELECT clauses can be omitted (they will be ignored if written)\n-- Example:\nwith _users(user_id, name) as (\n  values\n    (1, \'alice\'),\n    (2, \'bob\')\n),\nusers as (\n  select\n    user_id::bigint,\n    name::text\n  from _users\n)';
    this.conditionContent = '-- Conditions will be implemented in future';
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      title: 'Context Panel',
      collapsible: true,
      resizable: true,
      defaultWidth: '300px'
    };
  }

  /**
   * Get event prefix for CustomEvents
   */
  getEventPrefix() {
    return 'right-panel';
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
          padding: 4px 8px;
          border-bottom: 1px solid var(--border-primary, #454545);
          background: #1E293B;
          height: 28px;
        }
        
        .panel-title {
          font-size: 12px;
          font-weight: 500;
          color: #cccccc;
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
        
        /* Tab styles */
        .tabs-container {
          display: flex;
          background: var(--bg-primary, #1e1e1e);
          border-bottom: 1px solid var(--border-primary, #e5e7eb);
          height: 40px;
          overflow-x: hidden;
          scrollbar-width: none;
        }
        
        .tabs-container::-webkit-scrollbar {
          display: none;
        }
        
        .tab {
          display: flex;
          align-items: center;
          padding: 0 16px;
          height: 100%;
          background: transparent;
          border: none;
          color: var(--text-secondary, #999);
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
          gap: 4px;
        }
        
        .tab:hover {
          color: var(--text-primary, #ccc);
          background: var(--bg-hover, rgba(255,255,255,0.05));
        }
        
        .tab.active {
          color: var(--text-primary, #fff);
          border-bottom-color: var(--accent, #007acc);
          background: var(--bg-hover, rgba(255,255,255,0.05));
        }
        
        .tab-icon {
          font-size: 14px;
        }
        
        .panel-content {
          padding: 0;
          overflow-y: auto;
          overflow-x: hidden;
          height: calc(100% - 88px); /* 48px header + 40px tabs */
        }
        
        .tab-content {
          display: none;
          height: 100%;
        }
        
        .tab-content.active {
          display: block;
        }
        
        .editor-wrapper {
          height: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .values-description {
          padding: 12px;
          background: var(--bg-secondary, #2d2d30);
          border-bottom: 1px solid var(--border-primary, #3e3e42);
          color: var(--text-secondary, #999);
          font-size: 12px;
          line-height: 1.4;
        }

        .prompt-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }

        .copy-prompt-btn {
          background: var(--accent, #007acc);
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .copy-prompt-btn:hover {
          background: var(--accent-hover, #005a9e);
        }

        .copy-prompt-btn:active {
          background: var(--accent-active, #004578);
        }

        .schema-collector-option {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary, #999);
        }

        .schema-collector-checkbox {
          margin: 0;
        }

        .error-message {
          margin-top: 8px;
          padding: 8px;
          background: var(--error-bg, #d73a49);
          color: white;
          border-radius: 4px;
          font-size: 12px;
          line-height: 1.4;
          position: relative;
          display: none;
          border-left: 3px solid #cb2431;
        }

        .error-message.show {
          display: block;
        }

        .error-close-btn {
          position: absolute;
          top: 4px;
          right: 6px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 14px;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        
        textarea.code-editor {
          width: 100%;
          flex: 1;
          background: var(--bg-primary, #1e1e1e);
          color: var(--text-primary, #ccc);
          border: none;
          padding: 12px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.5;
          resize: none;
          outline: none;
          white-space: nowrap;
          overflow-x: auto;
        }
        
        textarea.code-editor::placeholder {
          color: var(--text-muted, #666);
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
   * コンテンツのレンダリング
   */
  renderContent() {
    return `
      <div class="resize-handle" title="Resize panel"></div>
      
      <div class="panel-header">
        <div class="panel-title">
          ${this.config.title}
        </div>
        <div class="panel-controls">
          <button class="panel-btn" id="refresh-btn" title="Refresh">🔄</button>
          <button class="panel-btn" id="settings-btn" title="Settings">⚙️</button>
          ${this.config.collapsible ? '<button class="panel-btn" id="collapse-btn" title="Collapse">📌</button>' : ''}
        </div>
      </div>
      
      <div class="tabs-container">
        ${this.renderTabs()}
      </div>
      
      <div class="panel-content">
        ${this.renderTabContents()}
      </div>
    `;
  }

  /**
   * タブのレンダリング
   */
  renderTabs() {
    return this.tabs.map(tab => `
      <button class="tab ${tab.id === this.activeTab ? 'active' : ''}" data-tab-id="${tab.id}">
        <span class="tab-icon">${tab.icon}</span>
        <span class="tab-label">${tab.label}</span>
      </button>
    `).join('');
  }

  /**
   * タブコンテンツのレンダリング
   */
  renderTabContents() {
    return `
      <div class="tab-content ${this.activeTab === 'values' ? 'active' : ''}" id="tab-values">
        <div class="editor-wrapper">
          <div class="values-description">
            Define test data using WITH clauses.<br>
            For AI-assisted definition, use "Copy Prompt".
            <div class="prompt-controls">
              <button class="copy-prompt-btn" id="copy-prompt-btn">Copy Prompt</button>
              <label class="schema-collector-option">
                <input type="checkbox" class="schema-collector-checkbox" id="use-schema-collector" checked>
                use SchemaCollector
              </label>
            </div>
            <div class="error-message" id="schema-error-message">
              <button class="error-close-btn" id="error-close-btn">×</button>
              <span class="error-text"></span>
            </div>
          </div>
          <textarea class="code-editor" id="values-editor" placeholder="Write WITH clauses, SELECT clauses can be omitted (they will be ignored if written)">${this.valuesContent}</textarea>
        </div>
      </div>
      <div class="tab-content ${this.activeTab === 'condition' ? 'active' : ''}" id="tab-condition">
        <div class="editor-wrapper">
          <textarea class="code-editor" id="condition-editor" readonly placeholder="Conditions will be implemented in future...">${this.conditionContent}</textarea>
        </div>
      </div>
    `;
  }

  /**
   * パネルコンテンツのレンダリング
   */
  renderPanelContent() {
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
        <div class="empty-title">Right Panel</div>
        <div class="empty-message">
          Ready for future features
        </div>
      </div>
      
      <div class="feature-placeholder">
        <div class="coming-soon">分析結果表示エリア</div>
      </div>
      
      <div class="feature-placeholder">
        <div class="coming-soon">検索・フィルターエリア</div>
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
    // Use base class helper methods
    this.addClickHandler('#refresh-btn', () => this.handleRefresh());
    this.addClickHandler('#settings-btn', () => this.handleSettings());
    this.addClickHandler('#collapse-btn', () => this.handleCollapse());

    // タブ切り替え
    this.shadowRoot.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab) {
        const tabId = tab.dataset.tabId;
        this.switchTab(tabId);
      }
    });

    // Values エディタの変更を追跡
    const valuesEditor = this.$('#values-editor');
    if (valuesEditor) {
      valuesEditor.addEventListener('input', (e) => {
        this.valuesContent = e.target.value;
        this.triggerCallback('values-changed', { content: this.valuesContent });
      });
    }

    // Copy Promptボタンのイベントハンドラー
    this.addClickHandler('#copy-prompt-btn', () => this.handleCopyPrompt());

    // エラーメッセージを閉じるボタンのイベントハンドラー
    this.addClickHandler('#error-close-btn', () => this.hideErrorMessage());

    // セクションの開閉
    this.addClickHandler('.section-header', (e, target) => {
      const section = target.closest('.section');
      const sectionKey = section.dataset.section;
      this.toggleSection(sectionKey);
    });

    // リサイズハンドル
    this.setupResizeHandler();
  }

  /**
   * リサイズハンドラーの設定
   */
  setupResizeHandler() {
    const resizeHandle = this.$('.resize-handle');
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
    this.triggerCallback('refresh');
  }

  /**
   * 設定処理
   */
  handleSettings() {
    console.log('[RightPanelShadow] Settings triggered');
    this.triggerCallback('settings');
  }

  /**
   * 折りたたみ処理
   */
  handleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    console.log('[RightPanelShadow] Collapse toggled:', this.isCollapsed);
    this.triggerCallback('collapse', { isCollapsed: this.isCollapsed });
  }

  /**
   * タブ切り替え
   */
  switchTab(tabId) {
    if (this.activeTab === tabId) return;
    
    this.activeTab = tabId;
    
    // Update tab buttons
    this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tabId === tabId);
    });
    
    // Update tab contents
    this.shadowRoot.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
    
    this.triggerCallback('tab-switched', { tabId });
  }

  /**
   * Values コンテンツの取得
   */
  getValuesContent() {
    return this.valuesContent;
  }

  /**
   * Copy Promptボタンの処理
   */
  async handleCopyPrompt() {
    try {
      // エラーメッセージをクリア
      this.hideErrorMessage();

      // 中央パネルからSQLを取得
      const centerPanel = window.appState?.components?.centerPanelShadow;
      if (!centerPanel || !centerPanel.getActiveTabContent) {
        throw new Error('Center panel not available');
      }

      const currentSql = centerPanel.getActiveTabContent();
      if (!currentSql || !currentSql.trim()) {
        throw new Error('No SQL query found in center panel');
      }

      // SchemaCollectorチェックボックスの状態を確認
      const useSchemaCollector = this.$('#use-schema-collector')?.checked ?? true;

      // プロンプトを生成
      const prompt = await this.generatePrompt(currentSql, useSchemaCollector);
      
      // クリップボードにコピー
      await navigator.clipboard.writeText(prompt);
      
      // 成功トーストを表示
      this.showToast('Prompt copied to clipboard!', 'success');
      
    } catch (error) {
      console.error('[RightPanel] Copy prompt failed:', error);
      
      // SchemaCollectorエラーの場合は持続的なエラーメッセージを表示
      if (error.message.includes('Schema analysis failed')) {
        this.showErrorMessage(error.message);
      } else {
        // その他のエラーはトーストで表示
        this.showToast(`Failed to copy prompt: ${error.message}`, 'error');
      }
    }
  }

  /**
   * プロンプト生成
   */
  async generatePrompt(sql, useSchemaCollector = true) {
    if (!useSchemaCollector) {
      // SchemaCollectorを使わない場合 - AIにスキーマ解析を委ねる
      return `このSQLをDB環境依存なしで動かしたいので、
元のSQLは変更せずに、必要なテーブルを VALUES 文で定義したモックテーブルとして
WITH句のみ を作成してください。
SELECT文などは不要で、WITH句だけ回答してください。

\`\`\`sql
${sql}
\`\`\``;
    }

    // SchemaCollectorを使用する場合
    try {
      // rawsql-ts SchemaCollectorでテーブル名と列名を抽出
      const schemaInfo = await this.extractSchemaInfo(sql);
      
      if (schemaInfo.tables.length === 0) {
        // テーブルが検出されない場合
        throw new Error('No tables detected in the SQL query');
      }

      // テーブル情報を文字列形式に整形
      const tableDescriptions = schemaInfo.tables.map(table => 
        `${table.name}(${table.columns.join(', ')})`
      ).join(', ');

      return `このSQLをDB環境依存なしで動かしたいので、
元のSQLは変更せずに、必要なテーブル ${tableDescriptions} を VALUES 文で定義したモックテーブルとして
WITH句のみ を作成してください。
SELECT文などは不要で、WITH句だけ回答してください。

\`\`\`sql
${sql}
\`\`\``;

    } catch (error) {
      console.error('[RightPanel] Schema extraction failed:', error);
      
      // SchemaCollectorのエラーの場合は、クエリ修正を促す
      throw new Error(`Schema analysis failed: ${error.message}. Please fix the SQL query to resolve ambiguous column references (e.g., use table.column instead of column).`);
    }
  }

  /**
   * スキーマ情報の抽出
   */
  async extractSchemaInfo(sql) {
    const response = await fetch('/api/extract-schema', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      throw new Error(`Schema extraction failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Schema extraction failed');
    }

    return {
      tables: result.tables || []
    };
  }

  /**
   * エラーメッセージの表示
   */
  showErrorMessage(message) {
    const errorMessage = this.$('#schema-error-message');
    const errorText = this.$('#schema-error-message .error-text');
    
    if (errorMessage && errorText) {
      errorText.textContent = message;
      errorMessage.classList.add('show');
    }
  }

  /**
   * エラーメッセージの非表示
   */
  hideErrorMessage() {
    const errorMessage = this.$('#schema-error-message');
    if (errorMessage) {
      errorMessage.classList.remove('show');
    }
  }

  /**
   * トースト表示
   */
  showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      // フォールバック
      console.log(`[Toast] ${type}: ${message}`);
    }
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
    const titleElement = this.$('.panel-title');
    if (titleElement) {
      titleElement.innerHTML = `${title}`;
    }
  }
}

/**
 * Shadow DOM対応のWeb Component
 */
export class RightPanelShadowElement extends ShadowElementBase {
  static get componentClass() {
    return RightPanelShadowComponent;
  }

  /**
   * 属性からオプションを収集
   */
  gatherOptions() {
    return {
      title: this.getAttributeOrDefault('title', 'Context Panel'),
      collapsible: this.getBooleanAttribute('collapsible'),
      resizable: this.getBooleanAttribute('resizable')
    };
  }

  /**
   * コンポーネントのコールバックを設定
   */
  setupComponentCallbacks() {
    // イベントを外部に伝播
    ['refresh', 'settings', 'collapse'].forEach(event => {
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
    this.exposeMethods(['addSection', 'removeSection', 'setTitle', 'getValuesContent']);
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('right-panel-shadow', RightPanelShadowElement);
}

// グローバル公開
window.RightPanelShadowComponent = RightPanelShadowComponent;
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
   * Shadow DOM内のCSS定義 - Workspace panelから完全コピー
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
          width: var(--right-panel-width, 300px);
          min-width: 200px;
          max-width: 500px;
          border-left: 1px solid var(--border-primary, #e5e7eb);
          padding: 12px;
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
        
        .workspace-panel-content {
          display: flex;
          flex-direction: column;
          padding: 0;
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
        
        
        
        .editor-wrapper {
          height: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .values-description {
          padding: 12px;
          background: var(--bg-secondary, #2d2d30);
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
          box-sizing: border-box;
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
        
        .workspace-title {
          font-weight: 500;
          color: var(--text-primary, #111827);
          font-size: 14px;
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
      <div class="workspace-panel-content">
        ${this.renderSections()}
      </div>
    `;
  }

  /**
   * タブのレンダリング
   */
  renderSections() {
    return `
      <div class="workspace-section ${this.getSectionState('values') ? 'collapsed' : ''}" data-section="values">
        <div class="workspace-header">
          <span>📊 Values</span>
          <span class="collapse-icon">▶</span>
        </div>
        <div class="workspace-content">
          ${this.renderValuesContent()}
        </div>
      </div>
      <div class="workspace-section ${this.getSectionState('condition') ? 'collapsed' : ''}" data-section="condition">
        <div class="workspace-header">
          <span>🔍 Condition</span>
          <span class="collapse-icon">▶</span>
        </div>
        <div class="workspace-content">
          ${this.renderConditionContent()}
        </div>
      </div>
    `;
  }

  /**
   * Valuesセクションコンテンツのレンダリング
   */
  renderValuesContent() {
    return `
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
    `;
  }

  /**
   * Conditionセクションコンテンツのレンダリング
   */
  renderConditionContent() {
    return `
      <div class="editor-wrapper">
        <textarea class="code-editor" id="condition-editor" readonly placeholder="Conditions will be implemented in future...">${this.conditionContent}</textarea>
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
      <div class="workspace-section ${collapsed}" data-section="${key}">
        <div class="workspace-header">
          <div class="workspace-title">${section.title}</div>
          <div class="collapse-icon">▼</div>
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
    // Use base class helper methods
    this.addClickHandler('#refresh-btn', () => this.handleRefresh());
    this.addClickHandler('#settings-btn', () => this.handleSettings());
    this.addClickHandler('#collapse-btn', () => this.handleCollapse());

    // セクションヘッダークリックで折りたたみ切り替え（独立形式）
    this.addClickHandler('.workspace-header', (e, header) => {
      e.preventDefault();
      e.stopPropagation();
      
      const section = header.closest('.workspace-section');
      if (section) {
        const sectionKey = section.dataset.section;
        
        // 現在のセクションをトグル（アコーディオンなし）
        section.classList.toggle('collapsed');
        
        // 状態を保存
        this.saveSectionState(sectionKey, section.classList.contains('collapsed'));
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

    // 上記のヘッダークリックハンドラーで処理済み

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
    const sectionElement = this.shadowRoot.querySelector(`[data-section="${sectionKey}"]`);
    if (sectionElement) {
      sectionElement.classList.toggle('collapsed');
      this.saveSectionState(sectionKey, sectionElement.classList.contains('collapsed'));
    }
  }

  /**
   * セクション状態の保存
   */
  saveSectionState(sectionKey, collapsed) {
    try {
      localStorage.setItem(`right-panel-section-${sectionKey}`, collapsed.toString());
    } catch (error) {
      console.warn('Could not save section state:', error);
    }
  }

  /**
   * セクション状態の取得
   */
  getSectionState(sectionKey) {
    try {
      const state = localStorage.getItem(`right-panel-section-${sectionKey}`);
      return state === 'true';
    } catch (error) {
      return false;
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
/**
 * Center Panel Shadow DOM Component
 * 中央パネル - タブマネージャー + SQL エディタ + 結果表示
 * 
 * 重要: Monaco EditorはShadow DOMとの互換性問題により、
 * 意図的にShadow DOMの外（通常DOM）に配置しています。
 * 詳細はsetupMonacoEditorメソッドのコメントを参照してください。
 */

export class CenterPanelShadowComponent {
  constructor(shadowRoot, options = {}) {
    this.shadowRoot = shadowRoot;
    this.callbacks = new Map();
    this.tabs = new Map();
    this.activeTabId = null;
    this.tabCounter = 0;
    
    // 設定
    this.config = {
      maxTabs: 15,
      enableScrolling: true,
      enableSplitter: true,
      defaultSplitRatio: 0.6, // 60% エディタ, 40% 結果
      ...options
    };
    
    // 状態管理
    this.state = {
      splitterPosition: this.config.defaultSplitRatio,
      isDragging: false,
      scrollPosition: 0
    };

    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.render();
    this.setupEventListeners();
    this.createDefaultTab();
    
    console.log('[CenterPanelShadow] Initialized');
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
          height: 100%;
          flex: 1;
          min-width: 0;
          width: 100%;
          background: var(--bg-primary, #1e1e1e);
          color: var(--text-primary, #cccccc);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          overflow: hidden;
        }
        
        /* タブバー */
        .tab-bar {
          display: flex;
          align-items: center;
          background: var(--bg-secondary, #252526);
          border-bottom: 1px solid var(--border-primary, #454545);
          height: 40px;
          min-height: 40px;
          position: relative;
          overflow: hidden;
        }
        
        .tab-scroll-container {
          flex: 1;
          overflow: hidden;
          position: relative;
        }
        
        .tab-list {
          display: flex;
          align-items: center;
          height: 100%;
          transition: transform 0.2s ease;
          white-space: nowrap;
        }
        
        .tab {
          display: flex;
          align-items: center;
          background: var(--bg-tertiary, #2d2d30);
          border-right: 1px solid var(--border-primary, #454545);
          color: var(--text-secondary, #888888);
          cursor: pointer;
          height: 40px;
          padding: 0 16px;
          min-width: 120px;
          max-width: 200px;
          position: relative;
          transition: all 0.2s ease;
          user-select: none;
          flex-shrink: 0;
        }
        
        .tab:hover {
          background: var(--bg-hover, #383838);
          color: var(--text-primary, #cccccc);
        }
        
        .tab.active {
          background: var(--bg-primary, #1e1e1e);
          color: var(--text-white, #ffffff);
          border-bottom: 2px solid var(--accent, #007acc);
        }
        
        .tab-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
          font-weight: 400;
        }
        
        .tab.active .tab-name {
          font-weight: 500;
        }
        
        .tab-close {
          margin-left: 8px;
          width: 16px;
          height: 16px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          opacity: 0;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .tab:hover .tab-close {
          opacity: 0.7;
        }
        
        .tab-close:hover {
          background: var(--bg-hover, #383838);
          opacity: 1;
        }
        
        .tab.active .tab-close {
          opacity: 0.8;
        }
        
        /* タブスクロールボタン */
        .tab-scroll-btn {
          background: var(--bg-secondary, #252526);
          border: none;
          color: var(--text-secondary, #888888);
          cursor: pointer;
          height: 100%;
          padding: 0 8px;
          transition: all 0.2s ease;
          display: none;
        }
        
        .tab-scroll-btn:hover {
          background: var(--bg-hover, #383838);
          color: var(--text-primary, #cccccc);
        }
        
        .tab-scroll-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        .tab-scroll-btn.visible {
          display: block;
        }
        
        /* タブコントロール */
        .tab-controls {
          display: flex;
          align-items: center;
          background: var(--bg-secondary, #252526);
          padding: 0 8px;
          gap: 4px;
        }
        
        .new-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary, #888888);
          cursor: pointer;
          font-size: 16px;
          height: 32px;
          width: 32px;
          border-radius: 3px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .new-tab-btn:hover {
          background: var(--bg-hover, #383838);
          color: var(--text-primary, #cccccc);
        }
        
        /* コンテンツエリア */
        .tab-content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        
        .tab-content {
          flex: 1;
          display: none;
          flex-direction: column;
          overflow: hidden;
        }
        
        .tab-content.active {
          display: flex;
        }
        
        /* スプリッター付きレイアウト */
        .split-layout {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .editor-section {
          background: var(--bg-primary, #1e1e1e);
          border-bottom: 1px solid var(--border-primary, #454545);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: height 0.2s ease;
          width: 100%;
          min-width: 0;
        }
        
        .editor-toolbar {
          background: var(--bg-secondary, #252526);
          border-bottom: 1px solid var(--border-primary, #454545);
          color: var(--text-primary, #cccccc);
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          height: 40px;
          box-sizing: border-box;
          border: none;
          outline: none;
        }
        
        .editor-container {
          flex: 1;
          background: var(--bg-primary, #1e1e1e);
          overflow: hidden;
          position: relative;
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
        }

        /* Monaco Editor - 標準設定で干渉なし */
        
        /* スプリッター */
        .splitter {
          height: 4px;
          background: var(--bg-secondary, #252526);
          border-top: 1px solid var(--border-primary, #454545);
          border-bottom: 1px solid var(--border-primary, #454545);
          cursor: ns-resize;
          transition: background-color 0.2s ease;
          position: relative;
          z-index: 10;
          width: 100%;
          min-width: 0;
        }
        
        .splitter:hover {
          background: var(--accent, #007acc);
        }
        
        .splitter.dragging {
          background: var(--accent, #007acc);
        }
        
        .splitter::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 1px;
          background: var(--text-muted, #666666);
          border-radius: 1px;
        }
        
        /* 結果セクション */
        .results-section {
          background: var(--bg-primary, #1e1e1e);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: height 0.2s ease;
        }
        
        .results-header {
          background: var(--bg-secondary, #252526);
          border-bottom: 1px solid var(--border-primary, #454545);
          color: var(--text-primary, #cccccc);
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          height: 40px;
        }
        
        .results-content {
          flex: 1;
          background: var(--bg-primary, #1e1e1e);
          color: var(--text-primary, #cccccc);
          overflow: auto;
          padding: 12px;
        }
        
        .results-placeholder {
          text-align: center;
          color: var(--text-muted, #666666);
          font-style: italic;
          padding: 40px 20px;
        }
        
        /* ツールバーボタン */
        .toolbar-btn {
          background: var(--bg-button, #3c3c3c);
          border: 1px solid var(--border-primary, #454545);
          color: var(--text-primary, #cccccc);
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          height: 28px;
          padding: 0 8px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .toolbar-btn:hover {
          background: var(--bg-button-hover, #484848);
          border-color: var(--accent, #007acc);
        }
        
        .toolbar-btn.primary {
          background: var(--bg-button-primary, #0e639c);
          border-color: var(--bg-button-primary, #0e639c);
        }
        
        .toolbar-btn.primary:hover {
          background: var(--bg-button-primary-hover, #1177bb);
        }
        
        /* 空のタブ状態 */
        .empty-tabs {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, #666666);
          text-align: center;
          padding: 40px;
        }
        
        .empty-tabs-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        
        .empty-tabs-title {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        
        .empty-tabs-subtitle {
          font-size: 14px;
          opacity: 0.7;
        }
        
        /* スクロール時のマウスホイール対応 */
        .tab-scroll-container::-webkit-scrollbar {
          display: none;
        }
        
        /* レスポンシブ対応 */
        @media (max-width: 768px) {
          .tab {
            min-width: 100px;
            max-width: 150px;
            padding: 0 12px;
          }
          
          .editor-toolbar,
          .results-header {
            padding: 6px 8px;
            height: 36px;
          }
          
          .toolbar-btn {
            height: 24px;
            padding: 0 6px;
            font-size: 11px;
          }
        }
        
        /* アニメーション */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .tab-content.active {
          animation: fadeIn 0.2s ease-out;
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
      <div class="tab-bar">
        <button class="tab-scroll-btn" id="scroll-left" title="Scroll Left">◀</button>
        <div class="tab-scroll-container" id="tab-scroll-container">
          <div class="tab-list" id="tab-list">
            ${this.renderTabs()}
          </div>
        </div>
        <button class="tab-scroll-btn" id="scroll-right" title="Scroll Right">▶</button>
        <div class="tab-controls">
          <button class="new-tab-btn" id="new-tab-btn" title="New Tab (Ctrl+T)">+</button>
        </div>
      </div>
      <div class="tab-content-area" id="tab-content-area">
        ${this.renderTabContents()}
      </div>
    `;
    
    this.shadowRoot.innerHTML = html;
  }

  /**
   * タブのレンダリング
   */
  renderTabs() {
    if (this.tabs.size === 0) {
      return '';
    }

    return Array.from(this.tabs.values()).map(tab => {
      const isActive = tab.id === this.activeTabId;
      const activeClass = isActive ? ' active' : '';
      
      return `
        <div class="tab${activeClass}" data-tab-id="${tab.id}">
          <span class="tab-name" title="${tab.name}">${tab.name}</span>
          ${tab.closable ? `<span class="tab-close" data-tab-id="${tab.id}">×</span>` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * タブコンテンツのレンダリング
   */
  renderTabContents() {
    if (this.tabs.size === 0) {
      return this.renderEmptyState();
    }

    return Array.from(this.tabs.values()).map(tab => {
      const isActive = tab.id === this.activeTabId;
      const activeClass = isActive ? ' active' : '';
      
      return `
        <div class="tab-content${activeClass}" data-tab-id="${tab.id}">
          ${this.renderTabContent(tab)}
        </div>
      `;
    }).join('');
  }

  /**
   * 個別タブコンテンツのレンダリング
   */
  renderTabContent(tab) {
    if (tab.type === 'sql' || !tab.type) {
      return this.renderSQLTabContent(tab);
    }
    
    // 将来的に他のタイプ（グラフなど）をサポート
    return `<div class="tab-content-placeholder">Content type: ${tab.type}</div>`;
  }

  /**
   * SQLタブコンテンツのレンダリング
   */
  renderSQLTabContent(tab) {
    const editorHeight = this.state.splitterPosition * 100;
    const resultsHeight = (1 - this.state.splitterPosition) * 100;
    
    return `
      <div class="split-layout">
        <div class="editor-section" style="height: ${editorHeight}%">
          <div class="editor-toolbar">
            <button class="toolbar-btn primary" data-action="run" title="Run Query (Ctrl+Enter)">
              ▶ Run
            </button>
            <button class="toolbar-btn" data-action="format" title="Format SQL (Ctrl+Shift+F)">
              🎨 Format
            </button>
            <button class="toolbar-btn" data-action="save" title="Save (Ctrl+S)">
              💾 Save
            </button>
            <div style="flex: 1;"></div>
            <span class="tab-info">${tab.name}</span>
          </div>
          <div class="editor-container" id="editor-${tab.id}">
            <!-- Monaco Editor will be mounted here -->
          </div>
        </div>
        
        <div class="splitter" data-tab-id="${tab.id}"></div>
        
        <div class="results-section" style="height: ${resultsHeight}%">
          <div class="results-header">
            <span>Query Results</span>
            <div class="results-controls">
              <!--<button class="toolbar-btn" data-action="export" title="Export Results">
                📤 Export
              </button>
              <button class="toolbar-btn" data-action="clear" title="Clear Results">
                🗑️ Clear
              </button> -->
            </div>
          </div>
          <div class="results-content" id="results-${tab.id}">
            <div class="results-placeholder">
              Run a query to see results here
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 空の状態のレンダリング
   */
  renderEmptyState() {
    return `
      <div class="empty-tabs">
        <div class="empty-tabs-icon">📝</div>
        <div class="empty-tabs-title">No tabs open</div>
        <div class="empty-tabs-subtitle">Click the + button to create a new tab</div>
      </div>
    `;
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // タブクリック
    this.shadowRoot.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab && !e.target.classList.contains('tab-close')) {
        this.setActiveTab(tab.dataset.tabId);
      }
    });

    // タブクローズ
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        e.stopPropagation();
        this.closeTab(e.target.dataset.tabId);
      }
    });

    // 新規タブ
    const newTabBtn = this.shadowRoot.getElementById('new-tab-btn');
    if (newTabBtn) {
      newTabBtn.addEventListener('click', () => this.createNewTab());
    }

    // タブスクロール
    this.setupTabScrolling();

    // スプリッター
    this.setupSplitter();

    // ツールバーアクション
    this.setupToolbarActions();

    // キーボードショートカット
    this.setupKeyboardShortcuts();

    // マウスホイールでタブスクロール
    this.setupTabWheelScroll();
  }

  /**
   * タブスクロール機能の設定
   */
  setupTabScrolling() {
    const scrollLeft = this.shadowRoot.getElementById('scroll-left');
    const scrollRight = this.shadowRoot.getElementById('scroll-right');
    const tabList = this.shadowRoot.getElementById('tab-list');
    
    if (scrollLeft && scrollRight && tabList) {
      scrollLeft.addEventListener('click', () => this.scrollTabs(-120));
      scrollRight.addEventListener('click', () => this.scrollTabs(120));
      
      // スクロール状態の更新
      this.updateScrollButtons();
    }
  }

  /**
   * マウスホイールでのタブスクロール
   */
  setupTabWheelScroll() {
    const container = this.shadowRoot.getElementById('tab-scroll-container');
    if (container) {
      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.scrollTabs(e.deltaY > 0 ? 60 : -60);
      });
    }
  }

  /**
   * タブのスクロール実行
   */
  scrollTabs(delta) {
    this.state.scrollPosition += delta;
    this.state.scrollPosition = Math.max(0, this.state.scrollPosition);
    
    const tabList = this.shadowRoot.getElementById('tab-list');
    if (tabList) {
      tabList.style.transform = `translateX(-${this.state.scrollPosition}px)`;
      this.updateScrollButtons();
    }
  }

  /**
   * スクロールボタンの表示更新
   */
  updateScrollButtons() {
    const container = this.shadowRoot.getElementById('tab-scroll-container');
    const tabList = this.shadowRoot.getElementById('tab-list');
    const scrollLeft = this.shadowRoot.getElementById('scroll-left');
    const scrollRight = this.shadowRoot.getElementById('scroll-right');
    
    if (!container || !tabList || !scrollLeft || !scrollRight) return;
    
    const containerWidth = container.offsetWidth;
    const listWidth = tabList.scrollWidth;
    const needsScroll = listWidth > containerWidth;
    
    // スクロールボタンの表示/非表示
    scrollLeft.classList.toggle('visible', needsScroll);
    scrollRight.classList.toggle('visible', needsScroll);
    
    // ボタンの有効/無効
    scrollLeft.disabled = this.state.scrollPosition <= 0;
    scrollRight.disabled = this.state.scrollPosition >= (listWidth - containerWidth);
  }

  /**
   * スプリッター機能の設定
   */
  setupSplitter() {
    this.shadowRoot.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('splitter')) {
        this.startSplitterDrag(e);
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.state.isDragging) {
        this.handleSplitterDrag(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.state.isDragging) {
        this.endSplitterDrag();
      }
    });
  }

  /**
   * スプリッターのドラッグ開始
   */
  startSplitterDrag(e) {
    this.state.isDragging = true;
    this.state.dragStartY = e.clientY;
    this.state.dragStartRatio = this.state.splitterPosition;
    
    const splitter = e.target;
    splitter.classList.add('dragging');
    
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }

  /**
   * スプリッターのドラッグ処理
   */
  handleSplitterDrag(e) {
    if (!this.state.isDragging) return;
    
    const container = this.shadowRoot.querySelector('.tab-content.active .split-layout');
    if (!container) return;
    
    const containerHeight = container.offsetHeight;
    const deltaY = e.clientY - this.state.dragStartY;
    const deltaRatio = deltaY / containerHeight;
    
    let newRatio = this.state.dragStartRatio + deltaRatio;
    newRatio = Math.max(0.2, Math.min(0.8, newRatio)); // 20%-80%の範囲
    
    this.state.splitterPosition = newRatio;
    this.updateSplitterLayout();
  }

  /**
   * スプリッターのドラッグ終了
   */
  endSplitterDrag() {
    this.state.isDragging = false;
    
    const splitter = this.shadowRoot.querySelector('.splitter.dragging');
    if (splitter) {
      splitter.classList.remove('dragging');
    }
    
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // 状態を保存
    this.saveState();
  }

  /**
   * スプリッターレイアウトの更新
   */
  updateSplitterLayout() {
    const activeContent = this.shadowRoot.querySelector('.tab-content.active');
    if (!activeContent) return;
    
    const editorSection = activeContent.querySelector('.editor-section');
    const resultsSection = activeContent.querySelector('.results-section');
    
    if (editorSection && resultsSection) {
      const editorHeight = this.state.splitterPosition * 100;
      const resultsHeight = (1 - this.state.splitterPosition) * 100;
      
      editorSection.style.height = `${editorHeight}%`;
      resultsSection.style.height = `${resultsHeight}%`;
    }
  }

  /**
   * ツールバーアクション設定
   */
  setupToolbarActions() {
    this.shadowRoot.addEventListener('click', (e) => {
      const button = e.target.closest('[data-action]');
      if (button) {
        const action = button.dataset.action;
        this.handleToolbarAction(action);
      }
    });
  }

  /**
   * ツールバーアクション処理
   */
  handleToolbarAction(action) {
    const activeTab = this.getActiveTab();
    if (!activeTab) return;
    
    switch (action) {
      case 'run':
        this.triggerCallback('run-query', { tabId: activeTab.id, tab: activeTab });
        break;
      case 'format':
        this.triggerCallback('format-sql', { tabId: activeTab.id, tab: activeTab });
        break;
      case 'save':
        this.triggerCallback('save-tab', { tabId: activeTab.id, tab: activeTab });
        break;
      case 'export':
        this.triggerCallback('export-results', { tabId: activeTab.id, tab: activeTab });
        break;
      case 'clear':
        this.clearResults(activeTab.id);
        break;
    }
  }

  /**
   * キーボードショートカット設定
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 't':
            e.preventDefault();
            this.createNewTab();
            break;
          case 'w':
            if (this.activeTabId) {
              e.preventDefault();
              this.closeTab(this.activeTabId);
            }
            break;
          case 'Enter':
            e.preventDefault();
            this.handleToolbarAction('run');
            break;
        }
        
        if (e.shiftKey && e.key === 'F') {
          e.preventDefault();
          this.handleToolbarAction('format');
        }
      }
    });
  }

  /**
   * 新しいタブを作成
   */
  createNewTab(tabData = {}) {
    const tab = {
      id: `tab-${++this.tabCounter}`,
      name: tabData.name || `Query ${this.tabCounter}`,
      type: tabData.type || 'sql',
      content: tabData.content || '',
      closable: tabData.closable !== false,
      created: new Date(),
      ...tabData
    };

    this.tabs.set(tab.id, tab);
    this.setActiveTab(tab.id);
    this.rerender();
    
    this.triggerCallback('tab-created', { tabId: tab.id, tab });
    return tab.id;
  }

  /**
   * デフォルトタブ作成
   */
  createDefaultTab() {
    if (this.tabs.size === 0) {
      const tabId = this.createNewTab({
        name: 'New Query',
        type: 'sql'
      });
      
      // タブ作成コールバックのみ実行（Monaco Editorはコールバックで初期化）
      setTimeout(() => {
        this.triggerCallback('tab-created', { tabId, tab: this.tabs.get(tabId) });
      }, 100);
    }
  }

  /**
   * タブを閉じる
   */
  closeTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.closable) return false;

    this.tabs.delete(tabId);

    // アクティブタブが削除された場合
    if (this.activeTabId === tabId) {
      const remainingTabs = Array.from(this.tabs.keys());
      this.activeTabId = remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : null;
    }

    this.rerender();
    this.triggerCallback('tab-closed', { tabId, tab });
    
    // タブがなくなった場合は新しいタブを作成
    if (this.tabs.size === 0) {
      this.createDefaultTab();
    }

    return true;
  }

  /**
   * アクティブタブ設定
   */
  setActiveTab(tabId) {
    if (!this.tabs.has(tabId)) return false;

    const previousTabId = this.activeTabId;
    this.activeTabId = tabId;
    
    this.updateActiveTabDisplay();
    
    if (previousTabId !== tabId) {
      this.triggerCallback('tab-changed', { 
        tabId, 
        tab: this.tabs.get(tabId),
        previousTabId 
      });
    }

    return true;
  }

  /**
   * アクティブタブ表示の更新
   */
  updateActiveTabDisplay() {
    // タブの表示更新
    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      const tabId = tab.dataset.tabId;
      tab.classList.toggle('active', tabId === this.activeTabId);
    });

    // コンテンツの表示更新
    const contents = this.shadowRoot.querySelectorAll('.tab-content');
    contents.forEach(content => {
      const tabId = content.dataset.tabId;
      content.classList.toggle('active', tabId === this.activeTabId);
    });
    
    // 外部Monaco Editorコンテナの表示制御
    const externalContainers = document.querySelectorAll('[id^="monaco-external-"]');
    externalContainers.forEach(container => {
      const containerId = container.id;
      const tabId = containerId.replace('monaco-external-', '');
      container.style.display = (tabId === this.activeTabId) ? 'block' : 'none';
    });

    // スプリッターレイアウトの更新
    this.updateSplitterLayout();
  }

  /**
   * 完全再レンダリング
   */
  rerender() {
    // 現在の状態を保持
    const currentState = {
      scrollPosition: this.state.scrollPosition,
      splitterPosition: this.state.splitterPosition
    };
    
    this.render();
    this.setupEventListeners();
    
    // 状態を復元
    this.state.scrollPosition = currentState.scrollPosition;
    this.state.splitterPosition = currentState.splitterPosition;
    
    // 表示を更新
    this.updateActiveTabDisplay();
    this.updateScrollButtons();
  }

  /**
   * 結果をクリア
   */
  clearResults(tabId) {
    const resultsContent = this.shadowRoot.getElementById(`results-${tabId}`);
    if (resultsContent) {
      resultsContent.innerHTML = `
        <div class="results-placeholder">
          Run a query to see results here
        </div>
      `;
    }
  }

  /**
   * 状態の保存
   */
  saveState() {
    const state = {
      splitterPosition: this.state.splitterPosition,
      activeTabId: this.activeTabId,
      tabs: Array.from(this.tabs.values())
    };
    
    localStorage.setItem('center-panel-state', JSON.stringify(state));
  }

  /**
   * 状態の読み込み
   */
  loadState() {
    try {
      const saved = localStorage.getItem('center-panel-state');
      if (saved) {
        const state = JSON.parse(saved);
        this.state.splitterPosition = state.splitterPosition || this.config.defaultSplitRatio;
        // タブの復元は必要に応じて実装
      }
    } catch (error) {
      console.warn('Failed to load center panel state:', error);
    }
  }

  /**
   * コールバック登録
   */
  onCallback(event, callback) {
    this.callbacks.set(event, callback);
  }

  /**
   * コールバック実行
   */
  triggerCallback(event, data = null) {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback(data);
    }
    
    // CustomEventとしても発行
    this.shadowRoot.host.dispatchEvent(new CustomEvent(`center-${event}`, {
      detail: data,
      bubbles: true
    }));
  }

  /**
   * アクティブタブ取得
   */
  getActiveTab() {
    return this.activeTabId ? this.tabs.get(this.activeTabId) : null;
  }

  /**
   * 全タブ取得
   */
  getAllTabs() {
    return Array.from(this.tabs.values());
  }

  /**
   * 破棄
   */
  destroy() {
    this.callbacks.clear();
    this.tabs.clear();
    console.log('[CenterPanelShadow] Destroyed');
  }
}

/**
 * Shadow DOM対応のWeb Component
 */
export class CenterPanelShadowElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.component = null;
  }

  connectedCallback() {
    this.component = new CenterPanelShadowComponent(this.shadowRoot);

    // コールバック設定
    this.component.onCallback('tab-created', (data) => {
      console.log('[CenterPanelShadow] Tab created:', data);
      this.setupMonacoEditor(data.tabId);
      this.dispatchEvent(new CustomEvent('tab-created', { 
        detail: data, 
        bubbles: true 
      }));
    });

    this.component.onCallback('tab-closed', (data) => {
      this.dispatchEvent(new CustomEvent('tab-closed', { 
        detail: data, 
        bubbles: true 
      }));
    });

    this.component.onCallback('tab-changed', (data) => {
      console.log('[CenterPanelShadow] Tab changed:', data);
      this.setupMonacoEditor(data.tabId);
      this.dispatchEvent(new CustomEvent('tab-changed', { 
        detail: data, 
        bubbles: true 
      }));
    });

    this.component.onCallback('run-query', (data) => {
      this.dispatchEvent(new CustomEvent('run-query', { 
        detail: data, 
        bubbles: true 
      }));
    });

    this.component.onCallback('format-sql', (data) => {
      this.dispatchEvent(new CustomEvent('format-sql', { 
        detail: data, 
        bubbles: true 
      }));
    });

    this.component.onCallback('save-tab', (data) => {
      this.dispatchEvent(new CustomEvent('save-tab', { 
        detail: data, 
        bubbles: true 
      }));
    });
    
    // コンポーネント初期化後にMonaco Editorをセットアップ（フォールバック）
    setTimeout(() => {
      const activeTab = this.component.getActiveTab();
      if (activeTab) {
        const editorContainer = this.shadowRoot.getElementById(`editor-${activeTab.id}`);
        if (editorContainer && !editorContainer.dataset.monacoInitialized) {
          console.log('[CenterPanelShadow] Fallback Monaco setup for tab:', activeTab.id);
          this.setupMonacoEditor(activeTab.id);
        }
      }
    }, 800);
  }

  disconnectedCallback() {
    // 外部Monaco Editorコンテナのクリーンアップ
    const externalContainers = document.querySelectorAll('[id^="monaco-external-"]');
    externalContainers.forEach(container => {
      // インターバルのクリア
      const editorContainer = this.shadowRoot.querySelector(`[data-external-id="${container.id}"]`);
      if (editorContainer && editorContainer.syncInterval) {
        clearInterval(editorContainer.syncInterval);
      }
      
      // コンテナの削除
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
    
    if (this.component) {
      this.component.destroy();
      this.component = null;
    }
  }

  // Monaco Editor セットアップ
  setupMonacoEditor(tabId) {
    const editorContainer = this.shadowRoot.getElementById(`editor-${tabId}`);
    if (!editorContainer || editorContainer.dataset.monacoInitialized) {
      return;
    }

    console.log('[CenterPanelShadow] Setting up Monaco Editor for tab:', tabId);

    // Monaco Editorのロードを待つ
    this.waitForMonaco().then(() => {
      try {
        /**
         * 重要な設計判断: Monaco EditorをShadow DOMの外で作成
         * 
         * 理由:
         * 1. IME（日本語入力）の問題
         *    - Shadow DOM内でMonaco Editorを作成すると、IMEの入力エリアが正しく配置されない
         *    - 高さ0の不可視テキストボックスが作成され、入力が正常に機能しない
         * 
         * 2. DOM操作の制約
         *    - Monaco Editorは内部でdocument.activeElementやグローバルイベントを使用
         *    - Shadow DOM境界を越えられないため、フォーカス管理が正常に動作しない
         * 
         * 3. イベント伝播の問題
         *    - キーボードイベント、マウスイベントがShadow DOM内で正しく伝播しない
         *    - 選択範囲の計算やカーソル位置の処理に問題が発生
         * 
         * 解決策:
         * - Monaco Editorを通常のDOM（document.body）に作成
         * - Shadow DOM内のコンテナ位置を監視し、外部エディターの位置を同期
         * - スプリッター、サイドバー開閉、タブ切り替えに対応した位置同期システム
         * 
         * 注意: この実装を変更する場合は、必ず日本語入力のテストを実施すること
         */
        
        // Monaco EditorをShadow DOMの外で作成
        const externalContainer = document.createElement('div');
        externalContainer.id = `monaco-external-${tabId}`;
        externalContainer.style.width = '100%';
        externalContainer.style.height = '100%';
        externalContainer.style.position = 'absolute';
        externalContainer.style.top = '0';
        externalContainer.style.left = '0';
        externalContainer.style.zIndex = '1';
        
        // Shadow DOM内のエディターコンテナに外部コンテナのプレースホルダーを作成
        editorContainer.innerHTML = `
          <div style="width: 100%; height: 100%; position: relative; background: #1e1e1e;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #888;">
              Monaco Editor (External DOM)
            </div>
          </div>
        `;
        editorContainer.style.position = 'relative';
        editorContainer.dataset.externalId = externalContainer.id;
        
        // 外部コンテナをShadow DOM内のコンテナに位置合わせ
        document.body.appendChild(externalContainer);
        
        const editor = window.monaco.editor.create(externalContainer, {
          value: '-- Start writing your SQL query here\nSELECT * FROM users\nLIMIT 10;',
          language: 'sql',
          automaticLayout: true,
          theme: 'vs-dark'
        });
        
        // 位置とサイズを同期する関数
        const syncPosition = () => {
          const rect = editorContainer.getBoundingClientRect();
          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          
          externalContainer.style.position = 'fixed';
          externalContainer.style.left = rect.left + 'px';
          externalContainer.style.top = rect.top + 'px';
          externalContainer.style.width = rect.width + 'px';
          externalContainer.style.height = rect.height + 'px';
          
          // エディターが表示されているかチェック
          if (rect.width > 0 && rect.height > 0) {
            externalContainer.style.display = 'block';
          } else {
            externalContainer.style.display = 'none';
          }
          
          // Monaco Editorのレイアウトを更新
          if (editor) {
            editor.layout();
          }
        };
        
        // 初期位置設定
        setTimeout(syncPosition, 100);
        
        // リサイズイベントで位置同期
        window.addEventListener('resize', syncPosition);
        
        // サイドバー開閉イベントで位置同期
        document.addEventListener('sidebar-toggled', syncPosition);
        
        // Shadow DOM要素の変更を監視
        const observer = new MutationObserver(syncPosition);
        observer.observe(editorContainer, { attributes: true, childList: true, subtree: true });
        
        // スプリッターのドラッグイベントを監視
        const splitter = this.shadowRoot.querySelector('.splitter');
        if (splitter) {
          splitter.addEventListener('mousedown', () => {
            const mouseMoveHandler = () => syncPosition();
            const mouseUpHandler = () => {
              document.removeEventListener('mousemove', mouseMoveHandler);
              document.removeEventListener('mouseup', mouseUpHandler);
            };
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
          });
        }
        
        // より頻繁に位置を同期（アニメーション中も追従）
        const syncInterval = setInterval(syncPosition, 100);
        editorContainer.syncInterval = syncInterval;
        
        // クリーンアップ情報を保存
        editorContainer.externalContainer = externalContainer;
        editorContainer.positionSync = syncPosition;
        editorContainer.resizeObserver = observer;
        
        console.log('[DEBUG] Monaco Editor created outside Shadow DOM with position sync');

        // エディターインスタンスを保存
        editorContainer.monacoEditor = editor;
        editorContainer.dataset.monacoInitialized = 'true';

        console.log('[CenterPanelShadow] Monaco Editor initialized successfully for tab:', tabId);

        // レイアウト調整
        setTimeout(() => {
          editor.layout();
        }, 100);
      } catch (error) {
        console.error('[CenterPanelShadow] Monaco Editor creation failed:', error);
        editorContainer.innerHTML = `<div style="padding: 20px; color: #f44336;">Monaco Editor initialization failed: ${error.message}</div>`;
      }
    }).catch(error => {
      console.error('[CenterPanelShadow] Monaco Editor load timeout:', error);
      editorContainer.innerHTML = `
        <div style="padding: 20px; color: #f44336; text-align: center;">
          <h3>Monaco Editor Load Failed</h3>
          <p>${error.message}</p>
          <p style="font-size: 12px; color: #888;">
            Please check your internet connection and reload the page.
          </p>
          <button onclick="location.reload()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Reload Page
          </button>
        </div>
      `;
    });
  }

  // Monaco Editorのロードを待つヘルパーメソッド
  waitForMonaco(timeout = 15000) {
    return new Promise((resolve, reject) => {
      // 既にロード済みの場合
      if (typeof window.monaco !== 'undefined' && window.monaco.editor) {
        console.log('[CenterPanelShadow] Monaco Editor already available');
        resolve();
        return;
      }
      
      // monacoLoadedフラグをチェック
      if (window.monacoLoaded) {
        console.log('[CenterPanelShadow] Monaco Editor loaded flag detected');
        resolve();
        return;
      }
      
      // イベントリスナーで待機
      const onMonacoLoaded = () => {
        console.log('[CenterPanelShadow] Monaco Editor loaded via event');
        window.removeEventListener('monaco-loaded', onMonacoLoaded);
        clearTimeout(timeoutId);
        resolve();
      };
      
      window.addEventListener('monaco-loaded', onMonacoLoaded);
      
      // タイムアウト設定
      const timeoutId = setTimeout(() => {
        window.removeEventListener('monaco-loaded', onMonacoLoaded);
        reject(new Error('Monaco Editor load timeout after ' + timeout + 'ms'));
      }, timeout);
    });
  }

  // 公開API
  createNewTab(tabData) {
    return this.component?.createNewTab(tabData);
  }

  closeTab(tabId) {
    return this.component?.closeTab(tabId);
  }

  setActiveTab(tabId) {
    return this.component?.setActiveTab(tabId);
  }

  getActiveTab() {
    return this.component?.getActiveTab();
  }

  getAllTabs() {
    return this.component?.getAllTabs();
  }

  // デバッグ用メソッド
  debugMonacoEditor() {
    console.log('[CenterPanelShadow] Debug Monaco Editor:');
    console.log('  - Component:', !!this.component);
    console.log('  - Active tab:', this.component?.getActiveTab());
    console.log('  - All tabs:', this.component?.getAllTabs());
    console.log('  - Monaco available:', typeof monaco !== 'undefined');
    
    const activeTab = this.component?.getActiveTab();
    if (activeTab) {
      const editorContainer = this.shadowRoot.getElementById(`editor-${activeTab.id}`);
      console.log('  - Editor container:', !!editorContainer);
      console.log('  - Monaco initialized:', editorContainer?.dataset.monacoInitialized);
      console.log('  - Monaco instance:', !!editorContainer?.monacoEditor);
    }
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('center-panel-shadow', CenterPanelShadowElement);
}

// グローバル公開
window.CenterPanelShadowComponent = CenterPanelShadowComponent;

// デバッグ用グローバル関数
window.debugCenterPanel = () => {
  const centerPanel = document.getElementById('center-panel-shadow');
  if (centerPanel && centerPanel.debugMonacoEditor) {
    centerPanel.debugMonacoEditor();
  } else {
    console.log('[Debug] Center panel not found or not initialized');
  }
};

window.forceMonacoSetup = () => {
  const centerPanel = document.getElementById('center-panel-shadow');
  if (centerPanel && centerPanel.component) {
    const activeTab = centerPanel.component.getActiveTab();
    if (activeTab) {
      centerPanel.setupMonacoEditor(activeTab.id);
      console.log('[Debug] Forced Monaco setup for tab:', activeTab.id);
    } else {
      console.log('[Debug] No active tab found');
    }
  } else {
    console.log('[Debug] Center panel component not found');
  }
};
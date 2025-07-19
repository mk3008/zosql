/**
 * Center Panel Shadow DOM Component
 * 中央パネル - タブマネージャー + SQL エディタ + 結果表示
 * 
 * 重要: Monaco EditorはShadow DOMとの互換性問題により、
 * 意図的にShadow DOMの外（通常DOM）に配置しています。
 * 詳細はsetupMonacoEditorメソッドのコメントを参照してください。
 */

import { fileModelManager } from '../models/file-model-manager.js';
import { CenterPanelStyles } from './center-panel-styles.js';
import { CenterPanelTabManager } from './center-panel-tab-manager.js';

export class CenterPanelShadowComponent {
  constructor(shadowRoot, options = {}) {
    this.shadowRoot = shadowRoot;
    this.callbacks = new Map();
    
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
      isDragging: false
    };

    // タブマネージャーの初期化
    this.tabManager = new CenterPanelTabManager(shadowRoot, this.callbacks, {
      maxTabs: this.config.maxTabs,
      enableScrolling: this.config.enableScrolling
    });

    this.init();
  }

  /**
   * 初期化
   */
  init() {
    console.log('[CenterPanelShadow] Initializing...');
    
    // デフォルトタブを作成（レンダリング前）
    const tabId = this.createDefaultTab();
    console.log('[CenterPanelShadow] Default tab created:', tabId);
    
    this.render();
    console.log('[CenterPanelShadow] Rendered');
    
    this.setupEventListeners();
    console.log('[CenterPanelShadow] Event listeners setup');
    
    console.log('[CenterPanelShadow] Initialized with', this.tabManager.getTabCount(), 'tabs');
  }

  /**
   * Shadow DOM内のCSS定義
   */
  getStyles() {
    return CenterPanelStyles.getStyles();
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
   * タブのレンダリング（タブマネージャーに委譲）
   */
  renderTabs() {
    return this.tabManager.renderTabs();
  }

  /**
   * タブコンテンツのレンダリング
   */
  renderTabContents() {
    if (this.tabManager.getTabCount() === 0) {
      return this.renderEmptyState();
    }

    return this.tabManager.getAllTabs().map(tab => {
      const isActive = tab.id === this.tabManager.activeTabId;
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
                Clear
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
        <div class="empty-tabs-icon">[EDITOR]</div>
        <div class="empty-tabs-title">No tabs open</div>
        <div class="empty-tabs-subtitle">Click the + button to create a new tab</div>
      </div>
    `;
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // タブクリック - タブマネージャーに委譲
    this.shadowRoot.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab && !e.target.classList.contains('tab-close')) {
        this.tabManager.setActiveTab(tab.dataset.tabId);
        this.updateActiveTabDisplay();
      }
    });

    // タブクローズ - タブマネージャーに委譲
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        e.stopPropagation();
        const tabId = e.target.dataset.tabId;
        console.log('[CenterPanelShadow] Tab close clicked:', tabId);
        const result = this.tabManager.closeTab(tabId);
        console.log('[CenterPanelShadow] Tab close result:', result);
      }
    });

    // 新規タブ - タブマネージャーに委譲
    const newTabBtn = this.shadowRoot.getElementById('new-tab-btn');
    if (newTabBtn) {
      newTabBtn.addEventListener('click', () => this.tabManager.createNewTab());
    }

    // タブ関連のコールバック設定
    this.setupTabManagerCallbacks();

    // スプリッター
    this.setupSplitter();

    // ツールバーアクション
    this.setupToolbarActions();
    
    // キーボードショートカット（ツールバー用）
    this.setupToolbarKeyboardShortcuts();
  }

  /**
   * タブマネージャーのコールバック設定
   */
  setupTabManagerCallbacks() {
    // タブマネージャーからのイベントハンドリング
    this.tabManager.callbacks.set('tab-rerender-needed', () => {
      this.updateTabsOnly();
    });

    this.tabManager.callbacks.set('tab-created', (data) => {
      this.updateTabsOnly();
      this.triggerCallback('tab-created', data);
    });

    this.tabManager.callbacks.set('tab-changed', (data) => {
      this.updateActiveTabDisplay();
      this.triggerCallback('tab-changed', data);
    });

    this.tabManager.callbacks.set('tab-closed', (data) => {
      console.log('[CenterPanelShadow] tab-closed callback received:', data);
      if (data.needsRerender) {
        // タブのDOM要素を削除
        const tabElement = this.shadowRoot.querySelector(`[data-tab-id="${data.tabId}"]`);
        console.log('[CenterPanelShadow] Tab element found for removal:', !!tabElement);
        if (tabElement) {
          tabElement.remove();
        }
        
        // タブコンテンツのDOM要素を削除
        const tabContent = this.shadowRoot.querySelector(`.tab-content[data-tab-id="${data.tabId}"]`);
        console.log('[CenterPanelShadow] Tab content found for removal:', !!tabContent);
        if (tabContent) {
          tabContent.remove();
        }
        
        // 最後のタブが削除された場合、空の状態を表示
        if (this.tabManager.getTabCount() === 0) {
          const tabContentArea = this.shadowRoot.getElementById('tab-content-area');
          if (tabContentArea) {
            tabContentArea.innerHTML = this.renderEmptyState();
          }
        }
        
        // アクティブタブの表示を更新
        this.updateActiveTabDisplay();
        this.tabManager.updateScrollButtons();
        console.log('[CenterPanelShadow] Tab removal completed');
      }
      
      this.triggerCallback('tab-closed', data);
    });

    // タブスクロール機能の初期化
    this.tabManager.setupTabScrolling();
    this.tabManager.setupTabWheelScroll();
    this.tabManager.setupKeyboardShortcuts();
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
   * ツールバー用キーボードショートカット設定
   */
  setupToolbarKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleToolbarAction('run');
        } else if (e.shiftKey && e.key === 'F') {
          e.preventDefault();
          this.handleToolbarAction('format');
        }
      }
    });
  }

  /**
   * 新しいタブを作成（タブマネージャーに委譲）
   */
  createNewTab(tabData = {}) {
    return this.tabManager.createNewTab(tabData);
  }

  /**
   * デフォルトタブ作成（タブマネージャーに委譲）
   */
  createDefaultTab() {
    return this.tabManager.createDefaultTab();
  }

  /**
   * ファイル名からタブを探すまたは作成（タブマネージャーに委譲）
   */
  findTabByName(name) {
    return this.tabManager.findTabByName(name);
  }

  /**
   * ファイルモデルからタブを作成または再利用（タブマネージャーに委譲）
   */
  createOrReuseTabForFile(fileName, content, options = {}) {
    return this.tabManager.createOrReuseTabForFile(fileName, content, options);
  }

  /**
   * タブからファイルモデルを取得（タブマネージャーに委譲）
   */
  getFileModelForTab(tabId) {
    return this.tabManager.getFileModelForTab(tabId);
  }

  /**
   * ファイルモデルからタブIDを取得（タブマネージャーに委譲）
   */
  getTabForFileModel(modelId) {
    return this.tabManager.getTabForFileModel(modelId);
  }

  /**
   * タブのコンテンツを更新（ファイルモデル経由）
   */
  updateTabContent(tabId, content, source = 'user') {
    const changed = this.tabManager.updateTabContent(tabId, content, source);
    if (changed) {
      // Monaco Editorがある場合は更新
      const editor = this.tabManager.getMonacoEditor(tabId);
      if (editor && source !== 'monaco') {
        editor.setValue(content);
      }
    }
    return changed;
  }

  /**
   * タブの修正状態表示を更新（タブマネージャーに委譲）
   */
  updateTabModificationState(tabId) {
    return this.tabManager.updateTabModificationState(tabId);
  }

  /**
   * タブを閉じる（タブマネージャーに委譲）
   */
  closeTab(tabId) {
    return this.tabManager.closeTab(tabId);
  }

  /**
   * アクティブタブ設定（タブマネージャーに委譲）
   */
  setActiveTab(tabId) {
    return this.tabManager.setActiveTab(tabId);
  }

  /**
   * タブのみの部分更新
   */
  updateTabsOnly() {
    // タブリストを更新
    const tabList = this.shadowRoot.getElementById('tab-list');
    if (tabList) {
      tabList.innerHTML = this.renderTabs();
    }
    
    // タブコンテンツエリアを更新
    const tabContentArea = this.shadowRoot.getElementById('tab-content-area');
    if (tabContentArea) {
      tabContentArea.innerHTML = this.renderTabContents();
    }
    
    // 表示を更新
    this.updateActiveTabDisplay();
  }

  updateActiveTabDisplay() {
    // タブの表示更新
    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      const tabId = tab.dataset.tabId;
      tab.classList.toggle('active', tabId === this.tabManager.activeTabId);
    });

    // コンテンツの表示更新
    const contents = this.shadowRoot.querySelectorAll('.tab-content');
    contents.forEach(content => {
      const tabId = content.dataset.tabId;
      const isActive = (tabId === this.tabManager.activeTabId);
      content.classList.toggle('active', isActive);
    });
    
    // 外部Monaco Editorコンテナの最小限制御
    // タブが存在しない場合のみ全てのコンテナを非表示
    if (this.tabManager.getTabCount() === 0) {
      const externalContainers = document.querySelectorAll('[id^="monaco-external-"]');
      externalContainers.forEach(container => {
        container.style.display = 'none';
      });
    } else {
      // タブが存在する場合は、アクティブコンテナのみ表示（位置同期に委ねる）
      const externalContainers = document.querySelectorAll('[id^="monaco-external-"]');
      externalContainers.forEach(container => {
        const tabId = container.id.replace('monaco-external-', '');
        if (tabId === this.tabManager.activeTabId) {
          container.style.display = 'block';
          // 位置同期は既存のsyncPositionメカニズムに委ねる
        } else if (this.tabManager.hasTab(tabId)) {
          // 存在するタブの非アクティブコンテナは非表示
          container.style.display = 'none';
        }
        // 削除されたタブのコンテナはcloseTabで削除済み
      });
    }

    // スプリッターレイアウトの更新
    this.updateSplitterLayout();
  }

  /**
   * 完全再レンダリング
   */
  rerender() {
    // 現在の状態を保持
    const currentState = {
      scrollPosition: this.tabManager.state.scrollPosition,
      splitterPosition: this.state.splitterPosition
    };
    
    this.render();
    this.setupEventListeners();
    
    // 状態を復元
    this.tabManager.state.scrollPosition = currentState.scrollPosition;
    this.state.splitterPosition = currentState.splitterPosition;
    
    // 表示を更新
    this.updateActiveTabDisplay();
    this.tabManager.updateScrollButtons();
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
      activeTabId: this.tabManager.activeTabId,
      tabs: this.tabManager.getAllTabs()
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
   * アクティブタブ取得（タブマネージャーに委譲）
   */
  getActiveTab() {
    return this.tabManager.getActiveTab();
  }

  /**
   * 全タブ取得（タブマネージャーに委譲）
   */
  getAllTabs() {
    return this.tabManager.getAllTabs();
  }

  /**
   * アクティブタブのMonaco Editorの同期を強制実行
   */
  syncActiveMonacoEditor() {
    return this.tabManager.syncActiveMonacoEditor();
  }

  /**
   * Monaco Editorインスタンスの管理（タブマネージャーに委譲）
   */
  setMonacoEditor(tabId, editor) {
    this.tabManager.setMonacoEditor(tabId, editor);
  }

  getMonacoEditor(tabId) {
    return this.tabManager.getMonacoEditor(tabId);
  }

  /**
   * 破棄
   */
  destroy() {
    this.callbacks.clear();
    if (this.tabManager) {
      this.tabManager.destroy();
    }
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
    console.log(`[CenterPanelShadow] setupMonacoEditor called for tab: ${tabId}`);
    
    const editorContainer = this.shadowRoot.getElementById(`editor-${tabId}`);
    if (!editorContainer) {
      console.warn(`[CenterPanelShadow] Editor container not found for tab: ${tabId}`);
      return;
    }
    
    if (editorContainer.dataset.monacoInitialized) {
      console.log(`[CenterPanelShadow] Monaco Editor already initialized for tab: ${tabId}`);
      return;
    }
    
    // コンテナのサイズを確認
    const rect = editorContainer.getBoundingClientRect();
    console.log(`[CenterPanelShadow] Editor container size for ${tabId}: ${rect.width}x${rect.height}`);

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
        
        // 初期表示状態を設定（Monaco Editorの正常な初期化のため、常にblockで作成）
        const isActiveTab = (tabId === this.component.tabManager.activeTabId);
        externalContainer.style.display = 'block';
        
        // 非アクティブタブは画面外に配置（display:noneではなく位置で制御）
        if (!isActiveTab) {
          externalContainer.style.left = '-9999px';
          externalContainer.style.top = '-9999px';
        }
        console.log(`[CenterPanelShadow] Setting initial state for ${externalContainer.id}: ${isActiveTab ? 'active' : 'off-screen'}`);
        
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
        
        // ファイルモデルからコンテンツを取得
        const tab = this.component.tabManager.tabs.get(tabId);
        const fileModel = this.component.getFileModelForTab(tabId);
        const initialContent = fileModel ? fileModel.getContent() : '-- Start writing your SQL query here\nSELECT * FROM users\nLIMIT 10;';
        
        const editor = window.monaco.editor.create(externalContainer, {
          value: initialContent,
          language: 'sql',
          automaticLayout: true,
          theme: 'vs-dark',
          scrollBeyondLastLine: false,
          scrollBeyondLastColumn: 0,
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            horizontal: 'auto',
            vertical: 'auto'
          },
          wordWrap: 'off',
          minimap: {
            enabled: false
          }
        });
        
        // 位置とサイズを同期する関数
        const syncPosition = () => {
          console.log(`[CenterPanelShadow] syncPosition called for tab ${tabId}`);
          
          const rect = editorContainer.getBoundingClientRect();
          const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          
          console.log(`[CenterPanelShadow] Shadow DOM container rect for ${tabId}: ${rect.left}, ${rect.top}, ${rect.width}x${rect.height}`);
          
          // エディターコンテナの状態を詳しく確認
          console.log(`[CenterPanelShadow] Editor container display: ${window.getComputedStyle(editorContainer).display}`);
          console.log(`[CenterPanelShadow] Editor container parent:`, editorContainer.parentElement?.className);
          
          externalContainer.style.position = 'fixed';
          externalContainer.style.left = rect.left + 'px';
          externalContainer.style.top = rect.top + 'px';
          externalContainer.style.width = rect.width + 'px';
          externalContainer.style.height = rect.height + 'px';
          
          // エディターの表示制御は updateActiveTabDisplay に委ね、ここでは位置のみ同期
          // サイズが正常な場合のみ位置を更新
          if (rect.width > 0 && rect.height > 0) {
            // 位置情報のみ更新（表示状態は変更しない）
          }
          
          // Monaco Editorのレイアウトを更新
          if (editor && rect.width > 0 && rect.height > 0) {
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
        
        // 位置同期インターバル（頻度を下げ、アクティブタブのみ同期）
        const syncInterval = setInterval(() => {
          // アクティブタブの場合のみ同期実行
          if (tabId === this.component.tabManager.activeTabId) {
            const rect = editorContainer.getBoundingClientRect();
            // サイズが0の場合は同期をスキップ（無限ループ防止）
            if (rect.width > 0 && rect.height > 0) {
              syncPosition();
            }
          }
        }, 200);
        editorContainer.syncInterval = syncInterval;
        
        // クリーンアップ情報を保存
        editorContainer.externalContainer = externalContainer;
        editorContainer.positionSync = syncPosition;
        editorContainer.resizeObserver = observer;
        
        console.log('[DEBUG] Monaco Editor created outside Shadow DOM with position sync');

        // エディターインスタンスを保存
        editorContainer.monacoEditor = editor;
        editorContainer.dataset.monacoInitialized = 'true';
        this.component.setMonacoEditor(tabId, editor);

        // ファイルモデルとの同期設定
        if (fileModel) {
          // エディターの変更をファイルモデルに反映
          editor.onDidChangeModelContent(() => {
            const content = editor.getValue();
            this.component.updateTabContent(tabId, content, 'monaco');
          });
          
          console.log('[CenterPanelShadow] File model synchronization enabled for tab:', tabId);
        }

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

  createOrReuseTabForFile(fileName, content, options = {}) {
    return this.component?.createOrReuseTabForFile(fileName, content, options);
  }

  updateTabContent(tabId, content, source = 'user') {
    return this.component?.updateTabContent(tabId, content, source);
  }

  getFileModelForTab(tabId) {
    return this.component?.getFileModelForTab(tabId);
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
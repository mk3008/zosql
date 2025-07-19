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
import { CenterPanelMonacoManager } from './center-panel-monaco-manager.js';
import { CenterPanelSplitterManager } from './center-panel-splitter-manager.js';

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
    
    // タブマネージャーの初期化
    this.tabManager = new CenterPanelTabManager(shadowRoot, this.callbacks, {
      maxTabs: this.config.maxTabs,
      enableScrolling: this.config.enableScrolling
    });

    // Monaco Editorマネージャーの初期化
    this.monacoManager = new CenterPanelMonacoManager(shadowRoot, this.callbacks);

    // スプリッターマネージャーの初期化
    this.splitterManager = new CenterPanelSplitterManager(shadowRoot, this.callbacks, {
      defaultSplitRatio: this.config.defaultSplitRatio,
      enableSplitter: this.config.enableSplitter
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
    const splitterPosition = this.splitterManager.getSplitterPosition();
    const editorHeight = splitterPosition * 100;
    const resultsHeight = (1 - splitterPosition) * 100;
    
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

    // スプリッター関連のコールバック設定
    this.setupSplitterManagerCallbacks();

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
      
      // Monaco Editorのクリーンアップ
      this.monacoManager.cleanupMonacoEditor(data.tabId);
      
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
   * スプリッターマネージャーのコールバック設定
   */
  setupSplitterManagerCallbacks() {
    // スプリッター機能の初期化
    this.splitterManager.setupSplitter();
    this.splitterManager.loadState();
    
    // スプリッターマネージャーからのイベントハンドリング
    this.splitterManager.callbacks.set('splitter-layout-updated', (data) => {
      // Monaco Editorのレイアウトを更新
      this.monacoManager.syncActiveMonacoEditor(this.tabManager.activeTabId);
    });
    
    this.splitterManager.callbacks.set('splitter-drag-end', (data) => {
      // ドラッグ終了後のMonaco Editorレイアウト更新
      setTimeout(() => {
        this.monacoManager.syncActiveMonacoEditor(this.tabManager.activeTabId);
      }, 50);
    });
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
      // Monaco Editorがある場合は更新（Monaco Managerから取得）
      const editor = this.monacoManager.getMonacoEditor(tabId);
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
    
    // 外部Monaco Editorコンテナの表示制御（Monaco Managerに委譲）
    this.monacoManager.updateExternalContainerVisibility(
      this.tabManager.activeTabId,
      this.tabManager.getAllTabs().map(tab => tab.id)
    );

    // スプリッターレイアウトの更新（Splitter Managerに委譲）
    this.splitterManager.updateSplitterLayout();
  }

  /**
   * 完全再レンダリング
   */
  rerender() {
    // 現在の状態を保持
    const currentState = {
      scrollPosition: this.tabManager.state.scrollPosition,
      splitterPosition: this.splitterManager.getSplitterPosition()
    };
    
    this.render();
    this.setupEventListeners();
    
    // 状態を復元
    this.tabManager.state.scrollPosition = currentState.scrollPosition;
    this.splitterManager.setSplitterPosition(currentState.splitterPosition);
    
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
   * 状態の保存（Splitter Managerに委譲）
   */
  saveState() {
    this.splitterManager.saveState();
  }

  /**
   * 状態の読み込み（Splitter Managerに委譲）
   */
  loadState() {
    this.splitterManager.loadState();
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
   * アクティブタブのMonaco Editorの同期を強制実行（Monaco Managerに委譲）
   */
  syncActiveMonacoEditor() {
    return this.monacoManager.syncActiveMonacoEditor(this.tabManager.activeTabId);
  }

  /**
   * Monaco Editorインスタンスの管理（Monaco Managerに委譲）
   */
  setMonacoEditor(tabId, editor) {
    this.monacoManager.setMonacoEditor(tabId, editor);
  }

  getMonacoEditor(tabId) {
    return this.monacoManager.getMonacoEditor(tabId);
  }

  /**
   * スプリッター管理（Splitter Managerに委譲）
   */
  setSplitterPosition(ratio) {
    return this.splitterManager.setSplitterPosition(ratio);
  }

  getSplitterPosition() {
    return this.splitterManager.getSplitterPosition();
  }

  resetSplitterPosition() {
    return this.splitterManager.resetSplitterPosition();
  }

  /**
   * 破棄
   */
  destroy() {
    this.callbacks.clear();
    if (this.tabManager) {
      this.tabManager.destroy();
    }
    if (this.monacoManager) {
      this.monacoManager.destroy();
    }
    if (this.splitterManager) {
      this.splitterManager.destroy();
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
      this.component.monacoManager.setupMonacoEditor(data.tabId, this.component);
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
      this.component.monacoManager.setupMonacoEditor(data.tabId, this.component);
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
          this.component.monacoManager.setupMonacoEditor(activeTab.id, this.component);
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

  // Monaco Editor セットアップ（Monaco Managerに委譲）
  setupMonacoEditor(tabId) {
    return this.component.monacoManager.setupMonacoEditor(tabId, this.component);
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
  
  getMonacoEditor(tabId) {
    return this.component?.getMonacoEditor(tabId);
  }

  // デバッグ用メソッド（Monaco Managerに委譲）
  debugMonacoEditor() {
    const activeTab = this.component?.getActiveTab();
    this.component?.monacoManager.debugMonacoEditor(activeTab?.id);
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
      centerPanel.component.monacoManager.setupMonacoEditor(activeTab.id, centerPanel.component);
      console.log('[Debug] Forced Monaco setup for tab:', activeTab.id);
    } else {
      console.log('[Debug] No active tab found');
    }
  } else {
    console.log('[Debug] Center panel component not found');
  }
};
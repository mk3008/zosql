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

export class CenterPanelShadowComponent {
  constructor(shadowRoot, options = {}) {
    this.shadowRoot = shadowRoot;
    this.callbacks = new Map();
    this.tabs = new Map();
    this.activeTabId = null;
    this.tabCounter = 0;
    
    // File model management
    this.tabToModelMap = new Map(); // tabId -> modelId
    this.modelToTabMap = new Map(); // modelId -> tabId
    this.monacoEditors = new Map(); // tabId -> Monaco Editor instance
    
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
    
    console.log('[CenterPanelShadow] Initialized');
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
    const container = this.shadowRoot.getElementById('tab-scroll-container');
    const tabList = this.shadowRoot.getElementById('tab-list');
    
    if (!container || !tabList) return;
    
    const containerWidth = container.offsetWidth;
    const listWidth = tabList.scrollWidth;
    const maxScroll = Math.max(0, listWidth - containerWidth);
    
    this.state.scrollPosition += delta;
    this.state.scrollPosition = Math.max(0, Math.min(maxScroll, this.state.scrollPosition));
    
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
   * 新しいタブを作成（ファイルモデル対応）
   */
  createNewTab(tabData = {}) {
    // FileModelを取得または作成
    let fileModel;
    if (tabData.fileName && tabData.content) {
      // 既存のファイルモデルを検索、なければ作成
      fileModel = fileModelManager.getModelByName(tabData.fileName) || 
                  fileModelManager.createOrGetModel(tabData.fileName, tabData.content, {
                    type: tabData.type || 'sql'
                  });
    } else {
      // 新規クエリの場合は一時的なファイルモデルを作成
      const queryName = tabData.name || `Query ${this.tabCounter + 1}`;
      fileModel = fileModelManager.createOrGetModel(queryName, tabData.content || '', {
        type: tabData.type || 'sql'
      });
    }

    const tab = {
      id: `tab-${++this.tabCounter}`,
      name: tabData.name || fileModel.getTabName(),
      type: tabData.type || 'sql',
      modelId: fileModel.id,
      closable: tabData.closable !== false,
      created: new Date(),
      ...tabData
    };

    // タブとファイルモデルのマッピングを作成
    this.tabs.set(tab.id, tab);
    this.tabToModelMap.set(tab.id, fileModel.id);
    this.modelToTabMap.set(fileModel.id, tab.id);
    
    // ファイルモデルをアクティブに設定
    fileModelManager.setActiveModel(fileModel.id);
    
    this.setActiveTab(tab.id);
    this.rerender();
    
    this.triggerCallback('tab-created', { tabId: tab.id, tab, fileModel });
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
   * ファイル名からタブを探すまたは作成
   */
  findTabByName(name) {
    for (const [id, tab] of this.tabs) {
      if (tab.name === name) {
        return { id, tab };
      }
    }
    return null;
  }

  /**
   * ファイルモデルからタブを作成または再利用
   */
  createOrReuseTabForFile(fileName, content, options = {}) {
    // 拡張子を除去したタブ名
    const tabName = fileName.replace(/\.(sql|SQL)$/, '');
    
    // 既存のタブを検索
    const existing = this.findTabByName(tabName);
    if (existing) {
      console.log(`[CenterPanelShadow] Reusing existing tab: ${tabName}`);
      this.setActiveTab(existing.id);
      return existing.id;
    }

    // 新しいタブを作成
    console.log(`[CenterPanelShadow] Creating new tab for file: ${fileName}`);
    return this.createNewTab({
      name: tabName,
      fileName: fileName,
      content: content,
      type: options.type || 'sql',
      ...options
    });
  }

  /**
   * タブからファイルモデルを取得
   */
  getFileModelForTab(tabId) {
    const modelId = this.tabToModelMap.get(tabId);
    return modelId ? fileModelManager.getModel(modelId) : null;
  }

  /**
   * ファイルモデルからタブIDを取得
   */
  getTabForFileModel(modelId) {
    return this.modelToTabMap.get(modelId);
  }

  /**
   * タブのコンテンツを更新（ファイルモデル経由）
   */
  updateTabContent(tabId, content, source = 'user') {
    const fileModel = this.getFileModelForTab(tabId);
    if (!fileModel) {
      console.warn(`[CenterPanelShadow] No file model found for tab: ${tabId}`);
      return false;
    }

    const changed = fileModel.updateContent(content, source);
    if (changed) {
      // Monaco Editorがある場合は更新
      const editor = this.monacoEditors.get(tabId);
      if (editor && source !== 'monaco') {
        editor.setValue(content);
      }
      
      // タブ名の修飾子を更新（修正状態を表示）
      this.updateTabModificationState(tabId);
    }
    
    return changed;
  }

  /**
   * タブの修正状態表示を更新
   */
  updateTabModificationState(tabId) {
    const tab = this.tabs.get(tabId);
    const fileModel = this.getFileModelForTab(tabId);
    if (!tab || !fileModel) return;

    const tabElement = this.shadowRoot.querySelector(`[data-tab-id="${tabId}"]`);
    const tabNameElement = tabElement?.querySelector('.tab-name');
    if (tabNameElement) {
      const baseName = fileModel.getTabName();
      tabNameElement.textContent = fileModel.hasChanges() ? `${baseName} •` : baseName;
      tabNameElement.title = fileModel.hasChanges() ? `${baseName} (modified)` : baseName;
    }
  }

  /**
   * タブを閉じる（ファイルモデル対応）
   */
  closeTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab || !tab.closable) return false;

    // ファイルモデルのクリーンアップ
    const modelId = this.tabToModelMap.get(tabId);
    if (modelId) {
      const fileModel = fileModelManager.getModel(modelId);
      
      // 変更がある場合は警告（将来的にはダイアログを実装）
      if (fileModel && fileModel.hasChanges()) {
        console.warn(`[CenterPanelShadow] Closing tab with unsaved changes: ${tab.name}`);
        // TODO: 保存確認ダイアログを実装
      }
      
      // マッピングをクリア
      this.tabToModelMap.delete(tabId);
      this.modelToTabMap.delete(modelId);
      
      // 他にこのモデルを使用しているタブがなければモデルを削除
      // ただし、ワークスペース関連ファイル（.cte、mainQuery）は保持
      const otherTabsUsingModel = Array.from(this.tabToModelMap.values()).includes(modelId);
      if (!otherTabsUsingModel) {
        const model = fileModelManager.getModel(modelId);
        const isWorkspaceFile = model && (
          model.name.endsWith('.cte') || 
          model.name.includes('user_behavior_analysis') ||
          model.name.includes('query') ||
          model.type === 'workspace'
        );
        
        if (isWorkspaceFile) {
          console.log(`[CenterPanelShadow] Preserving workspace file model: ${model.name}`);
        } else {
          fileModelManager.removeModel(modelId);
        }
      }
    }

    // Monaco Editorのクリーンアップ
    const editor = this.monacoEditors.get(tabId);
    console.log(`[CenterPanelShadow] Closing tab ${tabId}, editor exists: ${!!editor}`);
    if (editor) {
      editor.dispose();
      this.monacoEditors.delete(tabId);
      console.log(`[CenterPanelShadow] Disposed Monaco Editor for tab ${tabId}`);
    }

    // 外部コンテナのクリーンアップ
    const externalContainer = document.getElementById(`monaco-external-${tabId}`);
    if (externalContainer) {
      console.log(`[CenterPanelShadow] Removing external container for tab ${tabId}`);
      externalContainer.remove();
    }

    // アクティブタブが削除される場合、先に新しいアクティブタブを決定
    let newActiveTabId = this.activeTabId;
    if (this.activeTabId === tabId) {
      // 削除前に残りのタブを取得（削除するタブを除く）
      const remainingTabs = Array.from(this.tabs.keys()).filter(id => id !== tabId);
      const previousActiveTab = this.activeTabId;
      newActiveTabId = remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : null;
      console.log(`[CenterPanelShadow] Active tab will change from ${previousActiveTab} to ${newActiveTabId}`);
      
      this.activeTabId = newActiveTabId;
      
      // 新しいアクティブタブのファイルモデルを設定
      if (this.activeTabId) {
        const newActiveModelId = this.tabToModelMap.get(this.activeTabId);
        if (newActiveModelId) {
          fileModelManager.setActiveModel(newActiveModelId);
        }
      }
    }

    // タブを削除
    this.tabs.delete(tabId);
    
    // アクティブタブが変更された場合の処理は updateActiveTabDisplay に委ねる

    console.log(`[CenterPanelShadow] Before rerender: remaining tabs ${Array.from(this.tabs.keys())}, active: ${this.activeTabId}`);
    
    // rerenderの代わりに必要な部分だけ更新
    // タブのDOM要素を削除
    const tabElement = this.shadowRoot.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
      tabElement.remove();
    }
    
    // タブコンテンツのDOM要素を削除
    const tabContent = this.shadowRoot.querySelector(`.tab-content[data-tab-id="${tabId}"]`);
    if (tabContent) {
      tabContent.remove();
    }
    
    // 最後のタブが削除された場合、空の状態を表示
    if (this.tabs.size === 0) {
      const tabContentArea = this.shadowRoot.getElementById('tab-content-area');
      if (tabContentArea) {
        tabContentArea.innerHTML = this.renderEmptyState();
      }
    }
    
    // アクティブタブの表示を更新
    this.updateActiveTabDisplay();
    this.updateScrollButtons();
    
    this.triggerCallback('tab-closed', { tabId, tab });

    return true;
  }

  /**
   * アクティブタブ設定（ファイルモデル対応）
   */
  setActiveTab(tabId) {
    if (!this.tabs.has(tabId)) return false;

    const previousTabId = this.activeTabId;
    this.activeTabId = tabId;
    console.log(`[CenterPanelShadow] setActiveTab: ${previousTabId} → ${tabId}`);
    
    // アクティブファイルモデルの設定
    const modelId = this.tabToModelMap.get(tabId);
    if (modelId) {
      fileModelManager.setActiveModel(modelId);
    }
    
    this.updateActiveTabDisplay();
    
    if (previousTabId !== tabId) {
      this.triggerCallback('tab-changed', { 
        tabId, 
        tab: this.tabs.get(tabId),
        fileModel: this.getFileModelForTab(tabId),
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
      const isActive = (tabId === this.activeTabId);
      content.classList.toggle('active', isActive);
    });
    
    // 外部Monaco Editorコンテナの最小限制御
    // タブが存在しない場合のみ全てのコンテナを非表示
    if (this.tabs.size === 0) {
      const externalContainers = document.querySelectorAll('[id^="monaco-external-"]');
      externalContainers.forEach(container => {
        container.style.display = 'none';
      });
    } else {
      // タブが存在する場合は、アクティブコンテナのみ表示（位置同期に委ねる）
      const externalContainers = document.querySelectorAll('[id^="monaco-external-"]');
      externalContainers.forEach(container => {
        const tabId = container.id.replace('monaco-external-', '');
        if (tabId === this.activeTabId) {
          container.style.display = 'block';
          // 位置同期は既存のsyncPositionメカニズムに委ねる
        } else if (this.tabs.has(tabId)) {
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
   * アクティブタブのMonaco Editorの同期を強制実行
   */
  syncActiveMonacoEditor() {
    if (!this.activeTabId) return;

    console.log(`[CenterPanelShadow] Syncing Monaco Editor for active tab: ${this.activeTabId}`);
    
    // 外部コンテナの確認
    const externalContainer = document.getElementById(`monaco-external-${this.activeTabId}`);
    if (!externalContainer) {
      console.warn(`[CenterPanelShadow] External container not found for active tab: ${this.activeTabId}`);
      return;
    }

    // Monaco Editorインスタンスの確認
    const editor = this.monacoEditors.get(this.activeTabId);
    if (!editor) {
      console.warn(`[CenterPanelShadow] Monaco Editor instance not found for active tab: ${this.activeTabId}`);
      return;
    }

    // 外部コンテナが非表示になっている場合は表示
    if (externalContainer.style.display === 'none') {
      console.log(`[CenterPanelShadow] Making external container visible for tab: ${this.activeTabId}`);
      externalContainer.style.display = 'block';
    }

    // Shadow DOM内のエディターコンテナを探す
    const editorContainer = this.shadowRoot.getElementById(`editor-${this.activeTabId}`);
    if (editorContainer && editorContainer.positionSync) {
      console.log(`[CenterPanelShadow] Executing position sync for tab: ${this.activeTabId}`);
      editorContainer.positionSync();
    }

    // Monaco Editorのレイアウトを更新
    setTimeout(() => {
      if (editor) {
        editor.layout();
        console.log(`[CenterPanelShadow] Monaco Editor layout updated for tab: ${this.activeTabId}`);
      }
    }, 50);
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
        const isActiveTab = (tabId === this.component.activeTabId);
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
        const tab = this.component.tabs.get(tabId);
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
          if (tabId === this.component.activeTabId) {
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
        this.component.monacoEditors.set(tabId, editor);

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
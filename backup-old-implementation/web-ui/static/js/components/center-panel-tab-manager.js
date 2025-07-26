/**
 * Center Panel Tab Management Module
 * 中央パネルのタブ管理機能を分離
 * 
 * 責務:
 * - タブの作成・削除・切り替え
 * - タブスクロール機能
 * - ファイルモデルとの連携
 * - キーボードショートカット
 */

import { fileModelManager } from '../models/file-model-manager.js';

export class CenterPanelTabManager {
  constructor(shadowRoot, callbacks, config = {}) {
    this.shadowRoot = shadowRoot;
    this.callbacks = new Map(); // 独自のコールバックMap
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
      ...config
    };
    
    // 状態管理
    this.state = {
      scrollPosition: 0
    };
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
          <span class="tab-name" title="${tab.name}">${this.getTabEmoji(tab)} ${this.getDisplayName(tab)}</span>
          ${tab.closable ? `<span class="tab-close" data-tab-id="${tab.id}">×</span>` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * タブの絵文字を取得
   */
  getTabEmoji(tab) {
    // デバッグ情報
    console.log('[TabManager] Tab classification:', {
      name: tab.name,
      type: tab.type
    });

    // typeプロパティで判定
    if (tab.type === 'shared-cte' || tab.type === 'private-cte') {
      return '📦';
    } else if (tab.type === 'main-file' || tab.type === 'main') {
      return '📝';
    } else {
      return '📝'; // デフォルトは MAIN
    }
  }

  /**
   * タブの表示名を取得（.cteを除去）
   */
  getDisplayName(tab) {
    if (tab.name && tab.name.endsWith('.cte')) {
      return tab.name.replace('.cte', '');
    }
    return tab.name;
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
    
    // コールバックが設定されている場合のみ実行
    if (this.callbacks.has('tab-rerender-needed')) {
      this.triggerCallback('tab-rerender-needed');
    }
    
    if (this.callbacks.has('tab-created')) {
      this.triggerCallback('tab-created', { tabId: tab.id, tab, fileModel });
    }
    
    return tab.id;
  }

  /**
   * デフォルトタブ作成
   */
  createDefaultTab() {
    if (this.tabs.size === 0) {
      return this.createNewTab({
        name: 'Demo',
        type: 'sql',
        content: `-- Welcome to zosql Browser!
--
-- No table setup needed.
-- Define structure and data in the Values panel on the right.
--
-- Try pressing Ctrl+Enter to execute this query!
--
-- Shortcuts:
--   Ctrl+Enter: Execute SQL
--   Ctrl+Shift+F: Format SQL

select * from users`
      });
    }
    return null;
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
      console.log(`[TabManager] Reusing existing tab: ${tabName}`);
      this.setActiveTab(existing.id);
      return existing.id;
    }

    // 新しいタブを作成
    console.log(`[TabManager] Creating new tab for file: ${fileName}`);
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
      console.warn(`[TabManager] No file model found for tab: ${tabId}`);
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
    console.log('[TabManager] closeTab called:', tabId);
    const tab = this.tabs.get(tabId);
    console.log('[TabManager] tab found:', !!tab, 'closable:', tab?.closable);
    if (!tab || !tab.closable) {
      console.log('[TabManager] closeTab early return - tab not found or not closable');
      return false;
    }

    // ファイルモデルのクリーンアップ
    const modelId = this.tabToModelMap.get(tabId);
    if (modelId) {
      const fileModel = fileModelManager.getModel(modelId);
      
      // 変更がある場合は警告（将来的にはダイアログを実装）
      if (fileModel && fileModel.hasChanges()) {
        console.warn(`[TabManager] Closing tab with unsaved changes: ${tab.name}`);
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
          console.log(`[TabManager] Preserving workspace file model: ${model.name}`);
        } else {
          fileModelManager.removeModel(modelId);
        }
      }
    }

    // Monaco Editorのクリーンアップ
    const editor = this.monacoEditors.get(tabId);
    console.log(`[TabManager] Closing tab ${tabId}, editor exists: ${!!editor}`);
    if (editor) {
      editor.dispose();
      this.monacoEditors.delete(tabId);
      console.log(`[TabManager] Disposed Monaco Editor for tab ${tabId}`);
    }

    // 外部コンテナのクリーンアップ
    const externalContainer = document.getElementById(`monaco-external-${tabId}`);
    if (externalContainer) {
      console.log(`[TabManager] Removing external container for tab ${tabId}`);
      externalContainer.remove();
    }

    // アクティブタブが削除される場合、先に新しいアクティブタブを決定
    let newActiveTabId = this.activeTabId;
    if (this.activeTabId === tabId) {
      // 削除前の全タブのリストを取得（作成順序）
      const allTabIds = Array.from(this.tabs.keys());
      const closingTabIndex = allTabIds.indexOf(tabId);
      
      // 右隣のタブを優先、なければ左隣を選択
      if (closingTabIndex < allTabIds.length - 1) {
        // 右隣のタブがある場合
        newActiveTabId = allTabIds[closingTabIndex + 1];
      } else if (closingTabIndex > 0) {
        // 右隣がない場合は左隣
        newActiveTabId = allTabIds[closingTabIndex - 1];
      } else {
        // 最後のタブの場合
        newActiveTabId = null;
      }
      
      const previousActiveTab = this.activeTabId;
      console.log(`[TabManager] Active tab will change from ${previousActiveTab} to ${newActiveTabId} (closed tab was at index ${closingTabIndex})`);
      
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
    
    // UI更新を通知
    console.log('[TabManager] Triggering tab-closed callback:', { tabId, tab: tab.name, needsRerender: true });
    this.triggerCallback('tab-closed', { tabId, tab, needsRerender: true });

    console.log('[TabManager] Tab closed successfully:', tabId);
    return true;
  }

  /**
   * アクティブタブ設定（ファイルモデル対応）
   */
  setActiveTab(tabId) {
    if (!this.tabs.has(tabId)) return false;

    const previousTabId = this.activeTabId;
    this.activeTabId = tabId;
    console.log(`[TabManager] setActiveTab: ${previousTabId} → ${tabId}`);
    
    // アクティブファイルモデルの設定
    const modelId = this.tabToModelMap.get(tabId);
    if (modelId) {
      fileModelManager.setActiveModel(modelId);
    }
    
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
   * タブ数取得
   */
  getTabCount() {
    return this.tabs.size;
  }

  /**
   * 指定タブの存在確認
   */
  hasTab(tabId) {
    return this.tabs.has(tabId);
  }

  /**
   * Monaco Editorインスタンスの管理
   */
  setMonacoEditor(tabId, editor) {
    this.monacoEditors.set(tabId, editor);
  }

  getMonacoEditor(tabId) {
    return this.monacoEditors.get(tabId);
  }

  /**
   * アクティブタブのMonaco Editorの同期を強制実行
   */
  syncActiveMonacoEditor() {
    if (!this.activeTabId) return;

    console.log(`[TabManager] Syncing Monaco Editor for active tab: ${this.activeTabId}`);
    
    // 外部コンテナの確認
    const externalContainer = document.getElementById(`monaco-external-${this.activeTabId}`);
    if (!externalContainer) {
      console.warn(`[TabManager] External container not found for active tab: ${this.activeTabId}`);
      return;
    }

    // Monaco Editorインスタンスの確認
    const editor = this.monacoEditors.get(this.activeTabId);
    if (!editor) {
      console.warn(`[TabManager] Monaco Editor instance not found for active tab: ${this.activeTabId}`);
      return;
    }

    // 外部コンテナが非表示になっている場合は表示
    if (externalContainer.style.display === 'none') {
      console.log(`[TabManager] Making external container visible for tab: ${this.activeTabId}`);
      externalContainer.style.display = 'block';
    }

    // Shadow DOM内のエディターコンテナを探す
    const editorContainer = this.shadowRoot.getElementById(`editor-${this.activeTabId}`);
    if (editorContainer && editorContainer.positionSync) {
      console.log(`[TabManager] Executing position sync for tab: ${this.activeTabId}`);
      editorContainer.positionSync();
    }

    // Monaco Editorのレイアウトを更新
    setTimeout(() => {
      if (editor) {
        editor.layout();
        console.log(`[TabManager] Monaco Editor layout updated for tab: ${this.activeTabId}`);
      }
    }, 50);
  }

  /**
   * コールバック実行
   */
  triggerCallback(event, data = null) {
    console.log('[TabManager] triggerCallback called:', event, 'callbacks has:', this.callbacks.has(event));
    const callback = this.callbacks.get(event);
    if (callback) {
      console.log('[TabManager] Executing callback for:', event);
      callback(data);
    } else {
      console.log('[TabManager] No callback found for:', event);
    }
  }

  /**
   * 破棄
   */
  destroy() {
    this.tabs.clear();
    this.tabToModelMap.clear();
    this.modelToTabMap.clear();
    
    // Monaco Editorインスタンスの破棄
    this.monacoEditors.forEach(editor => {
      if (editor && editor.dispose) {
        editor.dispose();
      }
    });
    this.monacoEditors.clear();
    
    console.log('[TabManager] Destroyed');
  }
}
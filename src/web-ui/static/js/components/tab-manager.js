/**
 * Tab Manager Component
 * AI開発効率最適化 - タブ管理の単一責任
 */

export class TabManagerComponent {
  constructor(container, options = {}) {
    this.container = container;
    this.tabs = new Map();
    this.activeTabId = null;
    this.tabCounter = 0;
    
    // コールバック
    this.onTabChange = options.onTabChange || (() => {});
    this.onTabClose = options.onTabClose || (() => {});
    this.onNewTab = options.onNewTab || (() => {});
    
    // 設定
    this.config = {
      maxTabs: 10,
      closableByDefault: true,
      showNewTabButton: true,
      ...options
    };

    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.container.classList.add('tab-container');
    this.render();
  }

  /**
   * 新しいタブを作成
   * @param {Object} tabData - { name, content, type, closable }
   * @returns {string} tabId
   */
  createTab(tabData) {
    if (this.tabs.size >= this.config.maxTabs) {
      throw new Error(`Maximum ${this.config.maxTabs} tabs allowed`);
    }

    const tabId = `tab-${++this.tabCounter}`;
    const tab = {
      id: tabId,
      name: tabData.name || `Tab ${this.tabCounter}`,
      content: tabData.content || '',
      type: tabData.type || 'default',
      closable: tabData.closable !== false,
      created: new Date(),
      ...tabData
    };

    this.tabs.set(tabId, tab);
    this.render();
    this.setActiveTab(tabId);
    
    return tabId;
  }

  /**
   * 既存タブがあればアクティブ化、なければ作成
   * @param {Object} tabData 
   * @returns {string} tabId
   */
  createOrActivateTab(tabData) {
    // 名前で既存タブを検索
    const existingTab = this.findTabByName(tabData.name);
    if (existingTab) {
      this.setActiveTab(existingTab.id);
      return existingTab.id;
    }
    
    return this.createTab(tabData);
  }

  /**
   * 名前でタブを検索
   */
  findTabByName(name) {
    for (const tab of this.tabs.values()) {
      if (tab.name === name) {
        return tab;
      }
    }
    return null;
  }

  /**
   * タブを削除
   */
  closeTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return false;

    // クローズ可能かチェック
    if (!tab.closable) return false;

    this.tabs.delete(tabId);

    // アクティブタブが削除された場合
    if (this.activeTabId === tabId) {
      const remainingTabs = Array.from(this.tabs.keys());
      this.activeTabId = remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : null;
    }

    this.render();
    this.onTabClose(tabId, tab);

    // アクティブタブが変更された場合
    if (this.activeTabId) {
      this.onTabChange(this.activeTabId, this.tabs.get(this.activeTabId));
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
    
    this.updateTabDisplay();
    
    if (previousTabId !== tabId) {
      this.onTabChange(tabId, this.tabs.get(tabId));
    }

    return true;
  }

  /**
   * タブ内容更新
   */
  updateTab(tabId, updates) {
    const tab = this.tabs.get(tabId);
    if (!tab) return false;

    Object.assign(tab, updates);
    this.render();
    return true;
  }

  /**
   * 全タブクリア
   */
  clearAllTabs() {
    this.tabs.clear();
    this.activeTabId = null;
    this.render();
  }

  /**
   * メインレンダリング
   */
  render() {
    let html = `
      <div class="tab-bar">
        <div class="tab-list">
          ${this.renderTabs()}
        </div>
        <div class="tab-controls">
          ${this.renderControls()}
        </div>
      </div>
      <div class="tab-content">
        ${this.renderContent()}
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * タブリストHTML生成
   */
  renderTabs() {
    const tabsArray = Array.from(this.tabs.values());
    
    return tabsArray.map(tab => {
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
   * コントロールHTML生成
   */
  renderControls() {
    let html = '';
    
    if (this.config.showNewTabButton) {
      html += `<button class="new-tab-btn" title="New Tab">+</button>`;
    }

    return html;
  }

  /**
   * コンテンツHTML生成
   */
  renderContent() {
    if (!this.activeTabId) {
      return '<div class="tab-content-empty">No tab selected</div>';
    }

    const activeTab = this.tabs.get(this.activeTabId);
    if (!activeTab) {
      return '<div class="tab-content-error">Tab not found</div>';
    }

    return `
      <div class="tab-content-active" data-tab-id="${activeTab.id}">
        ${activeTab.content || ''}
      </div>
    `;
  }

  /**
   * 表示更新（軽量）
   */
  updateTabDisplay() {
    // アクティブクラスの更新
    const tabs = this.container.querySelectorAll('.tab');
    tabs.forEach(tab => {
      const tabId = tab.dataset.tabId;
      if (tabId === this.activeTabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // コンテンツの更新
    const contentArea = this.container.querySelector('.tab-content');
    if (contentArea) {
      contentArea.innerHTML = this.renderContent();
    }
  }

  /**
   * イベントリスナー設定
   */
  attachEventListeners() {
    // タブクリック
    this.container.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab && !e.target.classList.contains('tab-close')) {
        this.setActiveTab(tab.dataset.tabId);
      }
    });

    // タブクローズ
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        e.stopPropagation();
        this.closeTab(e.target.dataset.tabId);
      }
    });

    // 新規タブ
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('new-tab-btn')) {
        this.onNewTab();
      }
    });

    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'w':
            if (this.activeTabId) {
              e.preventDefault();
              this.closeTab(this.activeTabId);
            }
            break;
          case 't':
            e.preventDefault();
            this.onNewTab();
            break;
        }
      }
    });
  }

  /**
   * タブデータ取得
   */
  getTab(tabId) {
    return this.tabs.get(tabId);
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
   * デバッグ情報
   */
  getDebugInfo() {
    return {
      tabCount: this.tabs.size,
      activeTabId: this.activeTabId,
      tabs: this.getAllTabs().map(tab => ({
        id: tab.id,
        name: tab.name,
        type: tab.type
      }))
    };
  }

  /**
   * コンポーネント破棄
   */
  destroy() {
    this.clearAllTabs();
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

/**
 * Web Component版
 */
export class TabManagerElement extends HTMLElement {
  constructor() {
    super();
    this.component = null;
  }

  connectedCallback() {
    this.component = new TabManagerComponent(this, {
      onTabChange: (tabId, tab) => {
        this.dispatchEvent(new CustomEvent('tab-change', {
          detail: { tabId, tab },
          bubbles: true
        }));
      },
      onTabClose: (tabId, tab) => {
        this.dispatchEvent(new CustomEvent('tab-close', {
          detail: { tabId, tab },
          bubbles: true
        }));
      },
      onNewTab: () => {
        this.dispatchEvent(new CustomEvent('new-tab', {
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
  createTab(tabData) {
    return this.component?.createTab(tabData);
  }

  createOrActivateTab(tabData) {
    return this.component?.createOrActivateTab(tabData);
  }

  closeTab(tabId) {
    return this.component?.closeTab(tabId);
  }

  setActiveTab(tabId) {
    return this.component?.setActiveTab(tabId);
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('tab-manager', TabManagerElement);
}

// グローバル公開
window.TabManagerComponent = TabManagerComponent;
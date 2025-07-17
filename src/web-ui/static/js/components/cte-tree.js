/**
 * CTE Tree Component
 * AI開発効率最適化 - 単一責任、自己完結
 */

export class CTETreeComponent {
  constructor(container, options = {}) {
    this.container = container;
    this.privateCtes = {};
    this.onCteClick = options.onCteClick || (() => {});
    this.onMainQueryClick = options.onMainQueryClick || (() => {});
    this.activeCte = null;
    
    // 設定
    this.config = {
      showMainQuery: true,
      mainQueryIcon: '📄',
      cteIcon: '🔧',
      ...options
    };
  }

  /**
   * データ更新とレンダリング
   * @param {Object} data - { privateCtes, mainQueryName }
   */
  update(data) {
    this.privateCtes = data.privateCtes || {};
    this.mainQueryName = data.mainQueryName || 'query';
    this.render();
  }

  /**
   * 依存関係ツリー構築
   * ルートクエリから上流依存関係を表示
   */
  buildDependencyTree() {
    const tree = {};
    
    // 他のCTEから参照されていないCTE（最終成果物）をルートにする
    Object.entries(this.privateCtes).forEach(([name, cteData]) => {
      const isReferencedByOthers = Object.values(this.privateCtes).some(otherCte => 
        otherCte.dependencies && otherCte.dependencies.includes(name)
      );
      
      if (!isReferencedByOthers) {
        tree[name] = { children: {}, level: 0 };
      }
    });

    // 依存関係を子として追加（再帰的）
    const addDependencies = (cteName, parentNode, level = 0) => {
      const cteData = this.privateCtes[cteName];
      if (cteData && cteData.dependencies) {
        cteData.dependencies.forEach(depName => {
          parentNode.children[depName] = { children: {}, level: level + 1 };
          addDependencies(depName, parentNode.children[depName], level + 1);
        });
      }
    };

    // 各ルートCTEの依存関係を構築
    Object.keys(tree).forEach(rootName => {
      addDependencies(rootName, tree[rootName]);
    });

    return tree;
  }

  /**
   * メインレンダリング
   */
  render() {
    const tree = this.buildDependencyTree();
    let html = '';

    if (this.config.showMainQuery) {
      html += this.renderMainQuery();
    }

    html += this.renderTree(tree, 1); // メインクエリの下なのでlevel 1から開始

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * メインクエリHTML生成
   */
  renderMainQuery() {
    const isActive = this.activeCte === 'main';
    const activeClass = isActive ? ' active' : '';
    
    return `
      <div class="cte-tree-item${activeClass}" data-level="0" data-cte="main">
        <span class="cte-tree-icon">${this.config.mainQueryIcon}</span>
        <span class="cte-tree-name">${this.mainQueryName}</span>
      </div>
    `;
  }

  /**
   * CTEツリーHTML生成（再帰）
   */
  renderTree(tree, level = 0) {
    let html = '';
    
    Object.entries(tree).forEach(([name, node]) => {
      const cteData = this.privateCtes[name];
      if (!cteData) return;

      const isActive = this.activeCte === name;
      const activeClass = isActive ? ' active' : '';
      
      html += `
        <div class="cte-tree-item${activeClass}" data-level="${level}" data-cte="${name}">
          <span class="cte-tree-icon">${this.config.cteIcon}</span>
          <span class="cte-tree-name">${name}</span>
        </div>
      `;

      // 子の依存関係を再帰的にレンダリング
      if (Object.keys(node.children).length > 0) {
        html += this.renderTree(node.children, level + 1);
      }
    });

    return html;
  }

  /**
   * イベントリスナー設定
   */
  attachEventListeners() {
    const items = this.container.querySelectorAll('.cte-tree-item');
    
    items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const cteName = item.dataset.cte;
        
        // アクティブ状態更新
        this.setActiveCte(cteName);
        
        // コールバック実行
        if (cteName === 'main') {
          this.onMainQueryClick();
        } else {
          this.onCteClick(cteName);
        }
      });
    });
  }

  /**
   * アクティブCTE設定
   */
  setActiveCte(cteName) {
    // 前のアクティブ状態をクリア
    const previousActive = this.container.querySelector('.cte-tree-item.active');
    if (previousActive) {
      previousActive.classList.remove('active');
    }

    // 新しいアクティブ状態を設定
    this.activeCte = cteName;
    const newActive = this.container.querySelector(`[data-cte="${cteName}"]`);
    if (newActive) {
      newActive.classList.add('active');
    }
  }

  /**
   * 特定CTEを展開表示
   */
  expandToCte(cteName) {
    // 実装：特定CTEまでのパスを展開
    // 現在はフラット表示なので必要に応じて実装
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo() {
    return {
      privateCtes: Object.keys(this.privateCtes),
      activeCte: this.activeCte,
      tree: this.buildDependencyTree()
    };
  }

  /**
   * コンポーネント破棄
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.privateCtes = {};
    this.activeCte = null;
  }
}

/**
 * Web Component版（HTML Custom Element）
 */
export class CTETreeElement extends HTMLElement {
  constructor() {
    super();
    this.component = null;
  }

  connectedCallback() {
    this.classList.add('cte-tree');
    
    this.component = new CTETreeComponent(this, {
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
    }
  }

  /**
   * データ更新（外部から呼び出し）
   */
  updateData(data) {
    if (this.component) {
      this.component.update(data);
    }
  }

  /**
   * アクティブCTE設定（外部から呼び出し）
   */
  setActive(cteName) {
    if (this.component) {
      this.component.setActiveCte(cteName);
    }
  }
}

// Web Componentとして登録
if (typeof customElements !== 'undefined') {
  customElements.define('cte-tree', CTETreeElement);
}

// グローバル関数として公開（既存コードとの互換性）
window.CTETreeComponent = CTETreeComponent;
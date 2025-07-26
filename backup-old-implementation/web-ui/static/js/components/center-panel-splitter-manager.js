/**
 * Center Panel Splitter Management Module
 * 中央パネルのスプリッター機能を分離
 * 
 * 責務:
 * - スプリッターのドラッグ機能
 * - エディターと結果パネルのリサイズ
 * - 状態管理と永続化
 * - レイアウト更新
 */

export class CenterPanelSplitterManager {
  constructor(shadowRoot, callbacks = new Map(), config = {}) {
    this.shadowRoot = shadowRoot;
    this.callbacks = callbacks;
    
    // 設定
    this.config = {
      defaultSplitRatio: 0.6, // 60% エディタ, 40% 結果
      minRatio: 0.2,          // 最小20%
      maxRatio: 0.8,          // 最大80%
      ...config
    };
    
    // 状態管理
    this.state = {
      splitterPosition: this.config.defaultSplitRatio,
      isDragging: false,
      dragStartY: 0,
      dragStartRatio: 0
    };
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
    
    // ドラッグ開始コールバック
    this.triggerCallback('splitter-drag-start', {
      startY: this.state.dragStartY,
      startRatio: this.state.dragStartRatio
    });
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
    newRatio = Math.max(this.config.minRatio, Math.min(this.config.maxRatio, newRatio));
    
    this.state.splitterPosition = newRatio;
    this.updateSplitterLayout();
    
    // ドラッグ中コールバック
    this.triggerCallback('splitter-dragging', {
      currentRatio: newRatio,
      deltaY: deltaY
    });
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
    
    // ドラッグ終了コールバック
    this.triggerCallback('splitter-drag-end', {
      finalRatio: this.state.splitterPosition
    });
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
      
      // レイアウト更新コールバック
      this.triggerCallback('splitter-layout-updated', {
        editorHeight: editorHeight,
        resultsHeight: resultsHeight
      });
    }
  }

  /**
   * スプリッター位置を設定
   */
  setSplitterPosition(ratio) {
    if (ratio < this.config.minRatio || ratio > this.config.maxRatio) {
      console.warn(`[SplitterManager] Invalid ratio ${ratio}, must be between ${this.config.minRatio} and ${this.config.maxRatio}`);
      return false;
    }
    
    this.state.splitterPosition = ratio;
    this.updateSplitterLayout();
    this.saveState();
    
    return true;
  }

  /**
   * 現在のスプリッター位置を取得
   */
  getSplitterPosition() {
    return this.state.splitterPosition;
  }

  /**
   * スプリッター位置をリセット
   */
  resetSplitterPosition() {
    this.state.splitterPosition = this.config.defaultSplitRatio;
    this.updateSplitterLayout();
    this.saveState();
    
    this.triggerCallback('splitter-reset', {
      ratio: this.state.splitterPosition
    });
  }

  /**
   * 状態の保存
   */
  saveState() {
    const state = {
      splitterPosition: this.state.splitterPosition
    };
    
    try {
      const existingState = JSON.parse(localStorage.getItem('center-panel-state') || '{}');
      const newState = { ...existingState, ...state };
      localStorage.setItem('center-panel-state', JSON.stringify(newState));
    } catch (error) {
      console.warn('[SplitterManager] Failed to save state:', error);
    }
  }

  /**
   * 状態の読み込み
   */
  loadState() {
    try {
      const saved = localStorage.getItem('center-panel-state');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.splitterPosition !== undefined) {
          this.state.splitterPosition = Math.max(
            this.config.minRatio,
            Math.min(this.config.maxRatio, state.splitterPosition)
          );
        }
      }
    } catch (error) {
      console.warn('[SplitterManager] Failed to load state:', error);
      this.state.splitterPosition = this.config.defaultSplitRatio;
    }
  }

  /**
   * スプリッター機能の有効/無効切り替え
   */
  setEnabled(enabled) {
    const splitters = this.shadowRoot.querySelectorAll('.splitter');
    splitters.forEach(splitter => {
      if (enabled) {
        splitter.style.cursor = 'ns-resize';
        splitter.style.pointerEvents = 'auto';
        splitter.removeAttribute('disabled');
      } else {
        splitter.style.cursor = 'default';
        splitter.style.pointerEvents = 'none';
        splitter.setAttribute('disabled', 'true');
      }
    });
  }

  /**
   * デバッグ情報の出力
   */
  debugSplitter() {
    console.log('[SplitterManager] Debug Splitter:');
    console.log('  - Current position:', this.state.splitterPosition);
    console.log('  - Is dragging:', this.state.isDragging);
    console.log('  - Config:', this.config);
    console.log('  - Active layout:', !!this.shadowRoot.querySelector('.tab-content.active .split-layout'));
    
    const splitters = this.shadowRoot.querySelectorAll('.splitter');
    console.log('  - Splitter elements:', splitters.length);
  }

  /**
   * コールバック実行
   */
  triggerCallback(event, data = null) {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback(data);
    }
  }

  /**
   * 破棄
   */
  destroy() {
    // ドラッグ状態のクリーンアップ
    if (this.state.isDragging) {
      this.endSplitterDrag();
    }
    
    // スタイルのリセット
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    console.log('[SplitterManager] Destroyed');
  }
}
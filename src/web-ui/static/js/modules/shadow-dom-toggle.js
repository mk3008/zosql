/**
 * Shadow DOM Component Toggle System
 * Shadow DOMコンポーネントと従来版の切り替え管理
 */

export class ShadowDOMToggle {
  constructor() {
    this.STORAGE_KEY = 'zosql-shadow-dom-enabled';
    this.componentPairs = new Map();
    this.legacyControls = new Set(); // 非表示にするレガシー要素
    this.isEnabled = this.getSavedState();
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    // コンポーネントペアの登録
    this.registerComponentPair(
      'workspace-panel',
      'workspace-panel-shadow'
    );
    
    this.registerComponentPair(
      'context-sidebar',
      'right-panel-shadow'
    );
    
    this.registerComponentPair(
      'header-traditional',
      'header-shadow'
    );
    
    this.registerComponentPair(
      'editor-split-container',
      'center-panel-shadow'
    );
    
    // legacy-controlsの表示/非表示制御
    this.registerLegacyControl('.legacy-controls');
    
    // 開発者コンソールでの切り替えコマンド登録
    window.toggleShadowDOM = this.toggle.bind(this);
    window.enableShadowDOM = () => this.setEnabled(true);
    window.disableShadowDOM = () => this.setEnabled(false);
    
    // デバッグ情報表示
    console.log(`[ShadowDOMToggle] Initialized - Shadow DOM: ${this.isEnabled ? 'Enabled' : 'Disabled'}`);
    console.log('[ShadowDOMToggle] Commands: toggleShadowDOM(), enableShadowDOM(), disableShadowDOM()');
    
    // DOM読み込み完了後に適用
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.applyCurrentState());
    } else {
      this.applyCurrentState();
    }
  }

  /**
   * コンポーネントペアの登録
   */
  registerComponentPair(traditionalSelector, shadowSelector) {
    this.componentPairs.set(traditionalSelector, shadowSelector);
  }

  /**
   * レガシーコントロールの登録（Shadow DOM有効時に非表示にする要素）
   */
  registerLegacyControl(selector) {
    this.legacyControls.add(selector);
  }

  /**
   * 現在の状態を適用
   */
  applyCurrentState() {
    console.log('[ShadowDOMToggle] Applying current state:', {
      isEnabled: this.isEnabled,
      timestamp: new Date().toISOString()
    });
    
    for (const [traditional, shadow] of this.componentPairs) {
      this.switchComponent(traditional, shadow, this.isEnabled);
    }
    
    // レガシーコントロールの表示/非表示
    this.toggleLegacyControls(this.isEnabled);
    
    this.addToggleUI();
    
    // SidebarManagerの状態適用を確実に実行
    setTimeout(() => {
      if (window.sidebarManager) {
        console.log('[ShadowDOMToggle] Triggering sidebar manager state reapplication...');
        window.sidebarManager.applyLeftSidebarState();
        window.sidebarManager.applyRightSidebarState();
        window.sidebarManager.applyCenterPanelState();
      } else {
        console.warn('[ShadowDOMToggle] SidebarManager not available yet, retrying...');
        setTimeout(() => {
          if (window.sidebarManager) {
            window.sidebarManager.applyLeftSidebarState();
            window.sidebarManager.applyRightSidebarState();
            window.sidebarManager.applyCenterPanelState();
          }
        }, 200);
      }
    }, 100);
  }

  /**
   * コンポーネントの切り替え
   */
  switchComponent(traditionalSelector, shadowSelector, useShadow) {
    const traditionalEl = document.getElementById(traditionalSelector) || 
                         document.querySelector(traditionalSelector);
    const shadowEl = document.getElementById(shadowSelector) || 
                    document.querySelector(shadowSelector);

    if (traditionalEl && shadowEl) {
      if (useShadow) {
        traditionalEl.style.display = 'none';
        shadowEl.style.display = 'block';
        console.log(`[ShadowDOMToggle] Switched to Shadow DOM: ${shadowSelector}`);
      } else {
        traditionalEl.style.display = 'block';
        shadowEl.style.display = 'none';
        console.log(`[ShadowDOMToggle] Switched to Traditional: ${traditionalSelector}`);
      }
    } else if (traditionalEl) {
      // Shadow版が存在しない場合は従来版のみ表示
      traditionalEl.style.display = 'block';
      
      if (useShadow) {
        console.warn(`[ShadowDOMToggle] Shadow DOM component not found: ${shadowSelector}`);
      }
    }
  }

  /**
   * レガシーコントロールの表示/非表示切り替え
   */
  toggleLegacyControls(hideLegacy) {
    for (const selector of this.legacyControls) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (hideLegacy) {
          element.style.display = 'none';
          console.log(`[ShadowDOMToggle] Hidden legacy control: ${selector}`);
        } else {
          element.style.display = '';
          console.log(`[ShadowDOMToggle] Restored legacy control: ${selector}`);
        }
      });
    }
  }

  /**
   * 切り替えUIの追加
   */
  addToggleUI() {
    // ヘッダーShadow DOM内のトグルボタンを更新
    this.updateHeaderToggleButton();
    
    // Traditional版でも切り替え可能にするため、フォールバックボタンを追加
    this.addFallbackToggleButton();
  }

  /**
   * フォールバック用のトグルボタンを追加（Traditional版用）
   */
  addFallbackToggleButton() {
    // 既存のフォールバックボタンを削除
    const existingFallback = document.getElementById('shadow-dom-toggle-fallback');
    if (existingFallback) {
      existingFallback.remove();
    }

    // 従来ヘッダー内のボタン制御
    const traditionalToggleBtn = document.getElementById('enable-shadow-dom-btn');
    if (traditionalToggleBtn) {
      if (!this.isEnabled) {
        traditionalToggleBtn.style.display = 'block';
        traditionalToggleBtn.onclick = () => this.toggle();
      } else {
        traditionalToggleBtn.style.display = 'none';
      }
    }

    // Traditional版が表示されている場合のみフォールバックボタンを表示
    if (!this.isEnabled) {
      const fallbackButton = document.createElement('button');
      fallbackButton.id = 'shadow-dom-toggle-fallback';
      fallbackButton.innerHTML = '🔓 → Shadow DOM';
      fallbackButton.title = 'Shadow DOMモードに切り替え（右下フォールバック）';
      fallbackButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        padding: 10px 16px;
        background: #10b981;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 6px;
      `;
      
      fallbackButton.addEventListener('click', () => this.toggle());
      
      // ホバー効果
      fallbackButton.addEventListener('mouseenter', () => {
        fallbackButton.style.transform = 'scale(1.05) translateY(-2px)';
        fallbackButton.style.background = '#059669';
      });
      
      fallbackButton.addEventListener('mouseleave', () => {
        fallbackButton.style.transform = 'scale(1) translateY(0)';
        fallbackButton.style.background = '#10b981';
      });

      document.body.appendChild(fallbackButton);
    }
  }

  /**
   * ヘッダー内のトグルボタンを更新
   */
  updateHeaderToggleButton() {
    // Shadow DOM版ヘッダーのトグルボタンを更新
    const headerShadow = document.getElementById('header-shadow');
    if (headerShadow && headerShadow.updateShadowDOMToggleButton) {
      headerShadow.updateShadowDOMToggleButton();
    }
  }

  /**
   * 切り替え実行
   */
  toggle() {
    this.setEnabled(!this.isEnabled);
  }

  /**
   * 有効/無効の設定
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.saveState();
    this.applyCurrentState();
    
    // ヘッダーボタンの更新
    this.updateHeaderToggleButton();
    
    // SidebarManagerと連動
    if (window.sidebarManager && window.sidebarManager.onShadowDOMToggle) {
      window.sidebarManager.onShadowDOMToggle();
    }
    
    // フォールバックボタンの更新
    this.addFallbackToggleButton();
    
    // トーストメッセージ表示
    this.showToast(
      `${enabled ? 'Shadow DOM' : 'Traditional'} コンポーネントに切り替えました`,
      enabled ? 'success' : 'info'
    );
    
    console.log(`[ShadowDOMToggle] ${enabled ? 'Enabled' : 'Disabled'} Shadow DOM components`);
  }

  /**
   * 状態の保存
   */
  saveState() {
    localStorage.setItem(this.STORAGE_KEY, this.isEnabled.toString());
  }

  /**
   * 保存済み状態の取得
   */
  getSavedState() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return saved === 'true';
  }

  /**
   * トーストメッセージ表示
   */
  showToast(message, type = 'info') {
    // 既存のトーストを削除
    const existingToast = document.querySelector('.shadow-dom-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'shadow-dom-toast';
    toast.textContent = message;
    
    const colors = {
      success: { bg: '#10b981', border: '#059669' },
      info: { bg: '#3b82f6', border: '#2563eb' },
      warning: { bg: '#f59e0b', border: '#d97706' }
    };
    
    const color = colors[type] || colors.info;
    
    toast.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      z-index: 10000;
      padding: 12px 16px;
      background: ${color.bg};
      color: white;
      border: 2px solid ${color.border};
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease-out;
    `;

    // アニメーション定義
    if (!document.querySelector('#shadow-dom-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'shadow-dom-toast-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // 3秒後に自動削除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }

  /**
   * 現在の状態を取得
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      componentPairs: Array.from(this.componentPairs.entries()),
      availableCommands: [
        'toggleShadowDOM()',
        'enableShadowDOM()',
        'disableShadowDOM()'
      ]
    };
  }
}

// 自動初期化
const shadowDOMToggle = new ShadowDOMToggle();

// グローバル公開
window.shadowDOMToggle = shadowDOMToggle;

// ステータス確認用
window.getShadowDOMStatus = () => shadowDOMToggle.getStatus();
/**
 * Header Controls Manager
 * ヘッダーのアクションボタン管理
 */

export class HeaderControls {
  constructor() {
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.setupEventListeners();
    console.log('[HeaderControls] Initialized');
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // ヘッダーのOpenボタン
    const headerOpenBtn = document.getElementById('open-file-btn-header');
    if (headerOpenBtn) {
      headerOpenBtn.addEventListener('click', () => this.handleOpenFile());
    }

    // レガシーのOpenボタン（互換性のため）
    const legacyOpenBtn = document.getElementById('open-file-btn');
    if (legacyOpenBtn) {
      legacyOpenBtn.addEventListener('click', () => this.handleOpenFile());
    }
  }

  /**
   * ファイルオープン処理
   */
  handleOpenFile() {
    // ファイル選択ダイアログを表示
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.sql';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        this.loadFile(file);
      }
      // 一時的な入力要素を削除
      document.body.removeChild(fileInput);
    });
    
    // DOM に追加してクリック
    document.body.appendChild(fileInput);
    fileInput.click();
  }

  /**
   * ファイル読み込み処理
   */
  async loadFile(file) {
    try {
      const content = await this.readFileContent(file);
      
      // 新しいタブでファイルを開く
      await this.openInNewTab(file.name, content);
      
      // 成功メッセージ表示
      this.showToast(`ファイル "${file.name}" を開きました`, 'success');
      
      console.log(`[HeaderControls] Loaded file: ${file.name}`);
      
    } catch (error) {
      console.error('[HeaderControls] Failed to load file:', error);
      this.showToast(`ファイル読み込みエラー: ${error.message}`, 'error');
    }
  }

  /**
   * ファイル内容の読み込み
   */
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = (event) => {
        reject(new Error('ファイル読み込みに失敗しました'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * 新しいタブでファイルを開く
   */
  async openInNewTab(fileName, content) {
    // 左パネルのタブマネージャーを取得
    const leftTabManager = document.getElementById('left-tab-manager');
    
    if (leftTabManager && leftTabManager.addTab) {
      // Tab Managerが利用可能な場合
      const tabId = leftTabManager.addTab({
        name: fileName,
        content: content,
        type: 'sql'
      });
      
      leftTabManager.setActiveTab(tabId);
      
    } else {
      // フォールバック: Monaco Editorに直接設定
      const monacoEditor = document.getElementById('left-monaco-editor');
      if (monacoEditor && monacoEditor.setValue) {
        monacoEditor.setValue(content);
      } else {
        console.warn('[HeaderControls] No editor available to load file');
      }
    }
  }

  /**
   * トーストメッセージ表示
   */
  showToast(message, type = 'info') {
    // 既存のトーストを削除
    const existingToast = document.querySelector('.header-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'header-toast';
    toast.textContent = message;
    
    const colors = {
      success: { bg: '#10b981', border: '#059669' },
      info: { bg: '#3b82f6', border: '#2563eb' },
      error: { bg: '#ef4444', border: '#dc2626' }
    };
    
    const color = colors[type] || colors.info;
    
    toast.style.cssText = `
      position: fixed;
      top: 70px;
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
      max-width: 300px;
    `;

    document.body.appendChild(toast);

    // 3秒後に自動削除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }
}

// 自動初期化
const headerControls = new HeaderControls();

// グローバル公開
window.headerControls = headerControls;
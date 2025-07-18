/**
 * Monaco Editor Shadow DOM Component - 最小限の実装
 * カーソル位置問題解決のため、CSS上書きを最小限に抑制
 */

export class MonacoEditorShadowComponent {
  constructor(shadowRoot, options = {}) {
    this.shadowRoot = shadowRoot;
    this.editor = null;
    this.isInitialized = false;
    this.callbacks = new Map();
    
    // 最小限の設定
    this.config = {
      language: 'sql',
      theme: 'vs-dark',
      fontSize: 14,
      tabSize: 4,
      wordWrap: 'off',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      cursorStyle: 'line',
      cursorBlinking: 'blink',
      ...options.editorConfig
    };

    this.init();
  }

  /**
   * 初期化
   */
  async init() {
    try {
      this.render();
      await this.initializeMonaco();
      this.setupEventListeners();
      this.isInitialized = true;
      console.log('[MonacoEditorShadow] Initialized');
    } catch (error) {
      console.error('Monaco Editor Shadow initialization failed:', error);
      this.renderError(error.message);
    }
  }

  /**
   * Shadow DOM内の最小限CSS定義
   */
  getStyles() {
    return `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        
        .monaco-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          width: 100%;
          min-width: 0;
        }
        
        .monaco-editor-wrapper {
          flex: 1;
          overflow: hidden;
          position: relative;
          width: 100%;
          min-width: 0;
        }
        
        .monaco-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #888;
          font-size: 14px;
        }
        
        .monaco-error {
          padding: 20px;
          color: #f44336;
          background: #2d2d30;
          border: 1px solid #f44336;
          border-radius: 4px;
          margin: 20px;
        }
        
        .monaco-error h3 {
          margin: 0 0 10px 0;
          color: #f44336;
        }
        
        .monaco-error p {
          margin: 0;
          color: #cccccc;
        }
      </style>
    `;
  }

  /**
   * レンダリング
   */
  render() {
    this.shadowRoot.innerHTML = `
      ${this.getStyles()}
      <div class="monaco-container">
        <div class="monaco-editor-wrapper" id="monaco-editor-wrapper">
          <div class="monaco-loading">Loading Monaco Editor...</div>
        </div>
      </div>
    `;
  }

  /**
   * Monaco Editor初期化
   */
  async initializeMonaco() {
    return new Promise((resolve, reject) => {
      if (typeof monaco === 'undefined') {
        reject(new Error('Monaco Editor is not loaded'));
        return;
      }

      const wrapper = this.shadowRoot.getElementById('monaco-editor-wrapper');
      if (!wrapper) {
        reject(new Error('Monaco wrapper not found'));
        return;
      }

      // クリアしてからエディターを作成
      wrapper.innerHTML = '';

      try {
        // 最小限の設定でMonaco Editorを作成
        this.editor = monaco.editor.create(wrapper, this.config);
        
        // 初期コンテンツを設定
        this.editor.setValue(`-- Start writing your SQL query here
SELECT * FROM users
LIMIT 10;`);

        console.log('[MonacoEditorShadow] Monaco Editor created successfully');
        resolve(this.editor);
      } catch (error) {
        console.error('[MonacoEditorShadow] Monaco Editor creation failed:', error);
        reject(error);
      }
    });
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    if (!this.editor) return;

    // 内容変更イベント
    this.editor.onDidChangeModelContent(() => {
      const value = this.editor.getValue();
      this.triggerCallback('content-changed', { value });
    });

    // カーソル位置変更イベント
    this.editor.onDidChangeCursorPosition((e) => {
      this.triggerCallback('cursor-changed', { position: e.position });
    });
  }

  /**
   * エラー表示
   */
  renderError(message) {
    this.shadowRoot.innerHTML = `
      ${this.getStyles()}
      <div class="monaco-container">
        <div class="monaco-error">
          <h3>Monaco Editor Error</h3>
          <p>${message}</p>
        </div>
      </div>
    `;
  }

  /**
   * コールバック登録
   */
  onCallback(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  /**
   * コールバック実行
   */
  triggerCallback(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => callback(data));
    }
  }

  /**
   * 値取得
   */
  getValue() {
    return this.editor ? this.editor.getValue() : '';
  }

  /**
   * 値設定
   */
  setValue(value) {
    if (this.editor) {
      this.editor.setValue(value);
    }
  }

  /**
   * フォーカス
   */
  focus() {
    if (this.editor) {
      this.editor.focus();
    }
  }

  /**
   * リサイズ
   */
  resize() {
    if (this.editor) {
      this.editor.layout();
    }
  }

  /**
   * 破棄
   */
  dispose() {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    this.isInitialized = false;
  }
}

// Web Component定義
class MonacoEditorShadowElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.component = null;
  }

  connectedCallback() {
    if (!this.component) {
      const options = {
        editorConfig: {
          language: this.getAttribute('language') || 'sql',
          theme: this.getAttribute('theme') || 'vs-dark',
          fontSize: parseInt(this.getAttribute('font-size')) || 14,
          readOnly: this.hasAttribute('readonly')
        }
      };
      
      this.component = new MonacoEditorShadowComponent(this.shadowRoot, options);
    }
  }

  disconnectedCallback() {
    if (this.component) {
      this.component.dispose();
      this.component = null;
    }
  }

  // API methods
  getValue() {
    return this.component?.getValue();
  }

  setValue(value) {
    this.component?.setValue(value);
  }

  focus() {
    this.component?.focus();
  }

  resize() {
    this.component?.resize();
  }

  onCallback(event, callback) {
    this.component?.onCallback(event, callback);
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('monaco-editor-shadow', MonacoEditorShadowElement);
}

// グローバル公開
window.MonacoEditorShadowComponent = MonacoEditorShadowComponent;
/**
 * Monaco Editor Shadow DOM Component - 最小限の実装
 * カーソル位置問題解決のため、CSS上書きを最小限に抑制
 */

import { ShadowComponentBase, ShadowElementBase } from './base/shadow-component-base.js';

export class MonacoEditorShadowComponent extends ShadowComponentBase {
  /**
   * Pre-initialization setup
   */
  beforeInit() {
    this.editor = null;
    this.isInitialized = false;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
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
      cursorBlinking: 'blink'
    };
  }

  /**
   * Get event prefix for CustomEvents
   */
  getEventPrefix() {
    return 'monaco-editor';
  }

  /**
   * Shadow DOM内のCSS定義 - 最小限のスタイル
   */
  getStyles() {
    return `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          position: relative;
          background: #1e1e1e;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        
        .editor-container {
          width: 100%;
          height: 100%;
          position: relative;
          background: #1e1e1e;
        }
        
        .editor-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #1e1e1e;
          color: #cccccc;
          font-size: 14px;
        }
        
        .loading-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top-color: #007acc;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 10px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Monaco Editor エラーメッセージ */
        .editor-error {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #1e1e1e;
          color: #f44747;
          font-size: 14px;
          text-align: center;
          padding: 20px;
          box-sizing: border-box;
        }
        
        .error-message {
          max-width: 400px;
        }
      </style>
    `;
  }

  /**
   * コンテンツのレンダリング
   */
  renderContent() {
    return `
      <div class="editor-container" id="editor-container">
        <div class="editor-loading" id="editor-loading">
          <div class="loading-spinner"></div>
          Initializing Monaco Editor...
        </div>
      </div>
    `;
  }

  /**
   * 初期化後の処理
   */
  afterInit() {
    // Monaco Editor の初期化を遅延実行
    this.initializeMonacoEditor();
  }

  /**
   * Monaco Editor の初期化
   */
  initializeMonacoEditor() {
    // Monaco が読み込まれているかチェック
    if (typeof monaco === 'undefined') {
      // Monaco がまだ読み込まれていない場合は待機
      if (typeof window.monacoLoaded !== 'undefined' && window.monacoLoaded) {
        this.createEditor();
      } else {
        window.addEventListener('monaco-loaded', () => {
          this.createEditor();
        });
      }
    } else {
      this.createEditor();
    }
  }

  /**
   * エディターを作成
   */
  createEditor() {
    try {
      const container = this.$('#editor-container');
      const loading = this.$('#editor-loading');
      
      if (!container) {
        console.error('[MonacoEditorShadow] Editor container not found');
        return;
      }

      // ローディング表示を削除
      if (loading) {
        loading.remove();
      }

      // Monaco Editor を作成
      this.editor = monaco.editor.create(container, {
        value: this.config.initialValue || '-- SQL Editor',
        language: this.config.language,
        theme: this.config.theme,
        fontSize: this.config.fontSize,
        tabSize: this.config.tabSize,
        wordWrap: this.config.wordWrap,
        minimap: this.config.minimap,
        scrollBeyondLastLine: this.config.scrollBeyondLastLine,
        automaticLayout: this.config.automaticLayout,
        selectOnLineNumbers: this.config.selectOnLineNumbers,
        roundedSelection: this.config.roundedSelection,
        readOnly: this.config.readOnly,
        cursorStyle: this.config.cursorStyle,
        cursorBlinking: this.config.cursorBlinking
      });

      this.isInitialized = true;

      // イベントリスナーを設定
      this.setupEditorEventListeners();

      console.log('[MonacoEditorShadow] Editor initialized successfully');
      this.triggerCallback('initialized', { editor: this.editor });

    } catch (error) {
      console.error('[MonacoEditorShadow] Failed to create editor:', error);
      this.showError('Failed to initialize Monaco Editor: ' + error.message);
    }
  }

  /**
   * エディターのイベントリスナーを設定
   */
  setupEditorEventListeners() {
    if (!this.editor) return;

    // コンテンツ変更イベント
    this.editor.onDidChangeModelContent((e) => {
      this.triggerCallback('content-changed', {
        value: this.editor.getValue(),
        changes: e.changes
      });
    });

    // カーソル位置変更イベント
    this.editor.onDidChangeCursorPosition((e) => {
      this.triggerCallback('cursor-changed', {
        position: e.position,
        selection: this.editor.getSelection()
      });
    });

    // フォーカスイベント
    this.editor.onDidFocusEditorWidget(() => {
      this.triggerCallback('focus');
    });

    this.editor.onDidBlurEditorWidget(() => {
      this.triggerCallback('blur');
    });
  }

  /**
   * エラー表示
   */
  showError(message) {
    const container = this.$('#editor-container');
    if (container) {
      container.innerHTML = `
        <div class="editor-error">
          <div class="error-message">${message}</div>
        </div>
      `;
    }
  }

  /**
   * エディターの値を取得
   */
  getValue() {
    return this.editor ? this.editor.getValue() : '';
  }

  /**
   * エディターの値を設定
   */
  setValue(value) {
    if (this.editor) {
      this.editor.setValue(value);
    }
  }

  /**
   * エディターのレイアウトを更新
   */
  layout() {
    if (this.editor) {
      this.editor.layout();
    }
  }

  /**
   * エディターにフォーカス
   */
  focus() {
    if (this.editor) {
      this.editor.focus();
    }
  }

  /**
   * 選択範囲を取得
   */
  getSelection() {
    return this.editor ? this.editor.getSelection() : null;
  }

  /**
   * 選択範囲を設定
   */
  setSelection(selection) {
    if (this.editor && selection) {
      this.editor.setSelection(selection);
    }
  }

  /**
   * カーソル位置を取得
   */
  getPosition() {
    return this.editor ? this.editor.getPosition() : null;
  }

  /**
   * カーソル位置を設定
   */
  setPosition(position) {
    if (this.editor && position) {
      this.editor.setPosition(position);
    }
  }

  /**
   * 言語を設定
   */
  setLanguage(language) {
    if (this.editor) {
      const model = this.editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }

  /**
   * テーマを設定
   */
  setTheme(theme) {
    if (this.editor) {
      monaco.editor.setTheme(theme);
    }
  }

  /**
   * コンポーネントの破棄
   */
  beforeDestroy() {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    this.isInitialized = false;
  }
}

/**
 * Shadow DOM対応のWeb Component
 */
export class MonacoEditorShadowElement extends ShadowElementBase {
  static get componentClass() {
    return MonacoEditorShadowComponent;
  }

  /**
   * 属性からオプションを収集
   */
  gatherOptions() {
    return {
      language: this.getAttributeOrDefault('language', 'sql'),
      theme: this.getAttributeOrDefault('theme', 'vs-dark'),
      fontSize: this.getNumberAttribute('font-size', 14),
      tabSize: this.getNumberAttribute('tab-size', 4),
      wordWrap: this.getAttributeOrDefault('word-wrap', 'off'),
      readOnly: this.getBooleanAttribute('read-only'),
      initialValue: this.getAttributeOrDefault('initial-value', '')
    };
  }

  /**
   * コンポーネントのコールバックを設定
   */
  setupComponentCallbacks() {
    // イベントを外部に伝播
    ['initialized', 'content-changed', 'cursor-changed', 'focus', 'blur'].forEach(event => {
      this.component.onCallback(event, (data) => {
        this.dispatchEvent(new CustomEvent(event, { 
          detail: data,
          bubbles: true 
        }));
      });
    });
  }

  /**
   * コンポーネントAPIの公開
   */
  exposeComponentAPI() {
    this.exposeMethods([
      'getValue', 'setValue', 'layout', 'focus',
      'getSelection', 'setSelection', 'getPosition', 'setPosition',
      'setLanguage', 'setTheme'
    ]);

    // エディターインスタンスへの直接アクセス
    Object.defineProperty(this, 'editor', {
      get: () => this.component?.editor
    });
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('monaco-editor-shadow', MonacoEditorShadowElement);
}

// グローバル公開
window.MonacoEditorShadowComponent = MonacoEditorShadowComponent;
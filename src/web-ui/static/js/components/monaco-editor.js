/**
 * Monaco Editor Component
 * AI開発効率最適化 - エディタ機能の単一責任
 */

export class MonacoEditorComponent {
  constructor(container, options = {}) {
    this.container = container;
    this.editor = null;
    this.isInitialized = false;
    
    // コールバック
    this.onContentChange = options.onContentChange || (() => {});
    this.onSave = options.onSave || (() => {});
    this.onFormat = options.onFormat || (() => {});
    this.onRun = options.onRun || (() => {});
    
    // 設定
    this.config = {
      language: 'sql',
      theme: 'vs',
      fontSize: 14,
      tabSize: 4,
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      ...options.editorConfig
    };

    this.init();
  }

  /**
   * 初期化
   */
  async init() {
    try {
      this.container.classList.add('monaco-container');
      this.renderStructure();
      await this.initializeMonaco();
      this.attachEventListeners();
      this.isInitialized = true;
    } catch (error) {
      console.error('Monaco Editor initialization failed:', error);
      this.renderError(error.message);
    }
  }

  /**
   * HTML構造生成
   */
  renderStructure() {
    this.container.innerHTML = `
      <div class="monaco-toolbar">
        <div class="monaco-toolbar-left">
          <button class="btn btn-primary btn-sm run-btn" title="Run Query (Ctrl+Enter)">
            <span>▶️</span> Run
          </button>
          <button class="btn btn-secondary btn-sm format-btn" title="Format SQL (Ctrl+Shift+F)">
            <span>🎨</span> Format
          </button>
          <button class="btn btn-secondary btn-sm save-btn" title="Save (Ctrl+S)">
            <span>💾</span> Save
          </button>
        </div>
        <div class="monaco-toolbar-right">
          <span class="monaco-status">Ready</span>
        </div>
      </div>
      <div class="monaco-editor-wrapper" id="monaco-editor-${Date.now()}">
        <div class="monaco-loading">Loading editor...</div>
      </div>
    `;
  }

  /**
   * Monaco Editor初期化
   */
  async initializeMonaco() {
    // Monaco EditorのCDNから読み込み（既存の実装を活用）
    if (typeof monaco === 'undefined') {
      await this.loadMonacoFromCDN();
    }

    const editorWrapper = this.container.querySelector('.monaco-editor-wrapper');
    
    // SQLトークナイザー設定（既存の実装を移行）
    await this.setupSQLLanguage();
    
    // フォーマッター設定を読み込み
    const formatterConfig = await this.loadFormatterConfig();
    if (formatterConfig) {
      this.config.tabSize = formatterConfig.indentSize || 4;
    }

    // エディタ作成
    this.editor = monaco.editor.create(editorWrapper, {
      value: '',
      language: this.config.language,
      theme: this.config.theme,
      fontSize: this.config.fontSize,
      tabSize: this.config.tabSize,
      insertSpaces: true,
      wordWrap: this.config.wordWrap,
      minimap: this.config.minimap,
      scrollBeyondLastLine: this.config.scrollBeyondLastLine,
      automaticLayout: this.config.automaticLayout,
      lineNumbers: 'on',
      renderWhitespace: 'boundary',
      folding: true,
      foldingStrategy: 'indentation'
    });

    // 変更リスナー
    this.editor.onDidChangeModelContent((e) => {
      this.onContentChange(this.getValue(), e);
    });

    this.updateStatus('Ready');
  }

  /**
   * Monaco EditorのCDN読み込み
   */
  async loadMonacoFromCDN() {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="monaco-editor"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/monaco-editor@0.52.2/min/vs/loader.js';
      script.onload = () => {
        require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.52.2/min/vs' } });
        require(['vs/editor/editor.main'], resolve);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * SQLシンタックスハイライト設定
   */
  async setupSQLLanguage() {
    // 既存の実装からトークナイザー設定を移行
    const sqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'FULL', 'CROSS', 'ON',
      'GROUP', 'ORDER', 'BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'INTERSECT', 'EXCEPT', 'ALL',
      'AS', 'DISTINCT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE',
      'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA', 'SEQUENCE', 'FUNCTION', 'PROCEDURE',
      'TRIGGER', 'GRANT', 'REVOKE', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'BEGIN', 'END',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'IF', 'WHILE', 'FOR', 'LOOP', 'RETURN', 'DECLARE',
      'SET', 'VALUES', 'INTO', 'RECURSIVE', 'WITH'
    ];

    monaco.languages.setTokensProvider('sql', {
      tokenizer: {
        root: [
          [new RegExp(`\\b(${sqlKeywords.join('|')})\\b`, 'i'), 'keyword'],
          [/'([^'\\]|\\.)*'/, 'string'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/--.*$/, 'comment'],
          [/\/\*[\s\S]*?\*\//, 'comment'],
          [/\b\d+\.?\d*\b/, 'number'],
          [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
          [/[{}()\[\]]/, '@brackets'],
          [/[<>]=?|[!=]=|<>/, 'operator'],
          [/[+\-*\/=]/, 'operator']
        ]
      }
    });
  }

  /**
   * フォーマッター設定読み込み
   */
  async loadFormatterConfig() {
    try {
      const response = await fetch('/api/formatter-config');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Could not load formatter config:', error);
    }
    return { indentSize: 4, indentChar: ' ', tabSize: 4 };
  }

  /**
   * イベントリスナー設定
   */
  attachEventListeners() {
    // ツールバーボタン
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.run-btn')) {
        this.runQuery();
      } else if (e.target.closest('.format-btn')) {
        this.formatContent();
      } else if (e.target.closest('.save-btn')) {
        this.save();
      }
    });

    // キーボードショートカット
    if (this.editor) {
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        this.runQuery();
      });

      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
        this.formatContent();
      });

      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.save();
      });
    }
  }

  /**
   * 内容設定
   */
  setValue(content) {
    if (this.editor) {
      this.editor.setValue(content || '');
    }
  }

  /**
   * 内容取得
   */
  getValue() {
    return this.editor ? this.editor.getValue() : '';
  }

  /**
   * 選択テキスト取得
   */
  getSelectedText() {
    if (!this.editor) return '';
    const selection = this.editor.getSelection();
    return this.editor.getModel().getValueInRange(selection);
  }

  /**
   * フォーカス設定
   */
  focus() {
    if (this.editor) {
      this.editor.focus();
    }
  }

  /**
   * クエリ実行
   */
  async runQuery() {
    if (!this.isInitialized) return;

    const content = this.getValue();
    if (!content.trim()) {
      this.updateStatus('No query to run');
      return;
    }

    this.updateStatus('Running query...');
    
    try {
      await this.onRun(content);
      this.updateStatus('Query executed');
    } catch (error) {
      this.updateStatus('Query failed');
      console.error('Query execution error:', error);
    }
  }

  /**
   * コンテンツフォーマット
   */
  async formatContent() {
    if (!this.isInitialized) return;

    const content = this.getValue();
    if (!content.trim()) return;

    this.updateStatus('Formatting...');

    try {
      await this.onFormat(content);
      this.updateStatus('Formatted');
    } catch (error) {
      this.updateStatus('Format failed');
      console.error('Format error:', error);
    }
  }

  /**
   * 保存
   */
  async save() {
    if (!this.isInitialized) return;

    const content = this.getValue();
    this.updateStatus('Saving...');

    try {
      await this.onSave(content);
      this.updateStatus('Saved');
    } catch (error) {
      this.updateStatus('Save failed');
      console.error('Save error:', error);
    }
  }

  /**
   * ステータス更新
   */
  updateStatus(message) {
    const status = this.container.querySelector('.monaco-status');
    if (status) {
      status.textContent = message;
      
      // 一定時間後にクリア
      setTimeout(() => {
        if (status.textContent === message) {
          status.textContent = 'Ready';
        }
      }, 3000);
    }
  }

  /**
   * エラー表示
   */
  renderError(message) {
    this.container.innerHTML = `
      <div class="monaco-error">
        <h3>Monaco Editor Error</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">Reload Page</button>
      </div>
    `;
  }

  /**
   * テーマ変更
   */
  setTheme(theme) {
    if (this.editor) {
      monaco.editor.setTheme(theme);
      this.config.theme = theme;
    }
  }

  /**
   * フォントサイズ変更
   */
  setFontSize(size) {
    if (this.editor) {
      this.editor.updateOptions({ fontSize: size });
      this.config.fontSize = size;
    }
  }

  /**
   * 読み取り専用設定
   */
  setReadOnly(readOnly) {
    if (this.editor) {
      this.editor.updateOptions({ readOnly });
    }
  }

  /**
   * レイアウト更新
   */
  layout() {
    if (this.editor) {
      this.editor.layout();
    }
  }

  /**
   * デバッグ情報
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      hasEditor: !!this.editor,
      contentLength: this.getValue().length,
      config: this.config
    };
  }

  /**
   * コンポーネント破棄
   */
  destroy() {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    this.isInitialized = false;
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

/**
 * Web Component版
 */
export class MonacoEditorElement extends HTMLElement {
  constructor() {
    super();
    this.component = null;
  }

  connectedCallback() {
    const options = {
      onContentChange: (content, event) => {
        this.dispatchEvent(new CustomEvent('content-change', {
          detail: { content, event },
          bubbles: true
        }));
      },
      onSave: async (content) => {
        this.dispatchEvent(new CustomEvent('save', {
          detail: { content },
          bubbles: true
        }));
      },
      onFormat: async (content) => {
        this.dispatchEvent(new CustomEvent('format', {
          detail: { content },
          bubbles: true
        }));
      },
      onRun: async (content) => {
        this.dispatchEvent(new CustomEvent('run', {
          detail: { content },
          bubbles: true
        }));
      }
    };

    this.component = new MonacoEditorComponent(this, options);
  }

  disconnectedCallback() {
    if (this.component) {
      this.component.destroy();
    }
  }

  // 外部API
  setValue(content) {
    return this.component?.setValue(content);
  }

  getValue() {
    return this.component?.getValue() || '';
  }

  focus() {
    return this.component?.focus();
  }

  layout() {
    return this.component?.layout();
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('monaco-editor', MonacoEditorElement);
}

// グローバル公開
window.MonacoEditorComponent = MonacoEditorComponent;
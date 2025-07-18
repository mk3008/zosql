/**
 * Monaco Editor Shadow DOM Component
 * 視認性問題の解決とShadow DOM対応
 */

export class MonacoEditorShadowComponent {
  constructor(shadowRoot, options = {}) {
    this.shadowRoot = shadowRoot;
    this.editor = null;
    this.isInitialized = false;
    this.callbacks = new Map();
    this.isAttachedToDOM = false;
    
    // 設定
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
   * Shadow DOM内のCSS定義
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
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
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
          background: #1e1e1e;
          border: 1px solid #454545;
          width: 100%;
          min-width: 0;
        }
        
        /* Monaco Editor の視認性改善 */
        .monaco-editor {
          background: #1e1e1e !important;
        }
        
        /* 選択テキストの視認性を大幅改善 */
        .monaco-editor .selected-text,
        .monaco-editor .view-lines .view-line span.mtk1,
        .monaco-editor .view-lines .view-line span.mtk2,
        .monaco-editor .view-lines .view-line span.mtk3,
        .monaco-editor .view-lines .view-line span.mtk4,
        .monaco-editor .view-lines .view-line span.mtk5,
        .monaco-editor .view-lines .view-line span.mtk6,
        .monaco-editor .view-lines .view-line span.mtk7,
        .monaco-editor .view-lines .view-line span.mtk8,
        .monaco-editor .view-lines .view-line span.mtk9 {
          color: #d4d4d4 !important;
        }
        
        /* テキスト選択時の背景色を明確に */
        .monaco-editor .selected-text,
        .monaco-editor .view-lines .view-line .char.selected {
          background-color: #264f78 !important;
          color: #ffffff !important;
        }
        
        /* カーソルの視認性向上 */
        .monaco-editor .cursor {
          background-color: #aeafad !important;
          border-color: #aeafad !important;
          color: #1e1e1e !important;
        }
        
        /* 行番号の色 */
        .monaco-editor .line-numbers {
          color: #858585 !important;
        }
        
        /* 現在行のハイライト */
        .monaco-editor .current-line {
          background-color: #2a2d2e !important;
        }
        
        /* スクロールバーの改善 */
        .monaco-editor .scrollbar {
          background-color: #2e2e2e !important;
        }
        
        .monaco-editor .scrollbar .slider {
          background-color: #464647 !important;
        }
        
        .monaco-editor .scrollbar .slider:hover {
          background-color: #646465 !important;
        }
        
        /* SQL構文ハイライトの改善 */
        .monaco-editor .mtk1 { color: #d4d4d4 !important; } /* デフォルトテキスト */
        .monaco-editor .mtk2 { color: #569cd6 !important; } /* キーワード */
        .monaco-editor .mtk3 { color: #4ec9b0 !important; } /* 文字列 */
        .monaco-editor .mtk4 { color: #b5cea8 !important; } /* 数値 */
        .monaco-editor .mtk5 { color: #6a9955 !important; } /* コメント */
        .monaco-editor .mtk6 { color: #9cdcfe !important; } /* 識別子 */
        .monaco-editor .mtk7 { color: #ce9178 !important; } /* 文字列リテラル */
        .monaco-editor .mtk8 { color: #d7ba7d !important; } /* 演算子 */
        .monaco-editor .mtk9 { color: #c586c0 !important; } /* 制御キーワード */
        
        /* 括弧のマッチング */
        .monaco-editor .bracket-match {
          background-color: #0064001a !important;
          border: 1px solid #0080ff !important;
        }
        
        /* IntelliSense の改善 */
        .monaco-editor .suggest-widget {
          background-color: #252526 !important;
          border: 1px solid #454545 !important;
          color: #cccccc !important;
        }
        
        .monaco-editor .suggest-widget .monaco-list .monaco-list-row {
          background-color: transparent !important;
          color: #cccccc !important;
        }
        
        .monaco-editor .suggest-widget .monaco-list .monaco-list-row.focused {
          background-color: #094771 !important;
          color: #ffffff !important;
        }
        
        .monaco-editor .suggest-widget .monaco-list .monaco-list-row:hover {
          background-color: #2a2d2e !important;
        }
        
        /* エラー表示の改善 */
        .monaco-editor .squiggly-error {
          border-bottom: 4px double #f48771 !important;
        }
        
        .monaco-editor .squiggly-warning {
          border-bottom: 4px double #ffcc02 !important;
        }
        
        .monaco-editor .squiggly-info {
          border-bottom: 4px double #75beff !important;
        }
        
        /* ツールチップ */
        .monaco-editor .monaco-hover {
          background-color: #252526 !important;
          border: 1px solid #454545 !important;
          color: #cccccc !important;
        }
        
        /* エラー状態 */
        .monaco-error {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1e1e1e;
          color: #f48771;
          padding: 20px;
          text-align: center;
        }
        
        .monaco-loading {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1e1e1e;
          color: #cccccc;
          padding: 20px;
          text-align: center;
        }
        
        /* レスポンシブ対応 */
        @media (max-width: 768px) {
          :host {
            font-size: 12px;
          }
          
          .monaco-editor {
            font-size: 12px !important;
          }
        }
      </style>
    `;
  }

  /**
   * レンダリング
   */
  render() {
    const html = `
      ${this.getStyles()}
      <div class="monaco-container">
        <div class="monaco-editor-wrapper" id="monaco-wrapper">
          <div class="monaco-loading">
            Loading Monaco Editor...
          </div>
        </div>
      </div>
    `;
    
    this.shadowRoot.innerHTML = html;
  }

  /**
   * エラー表示
   */
  renderError(message) {
    const wrapper = this.shadowRoot.getElementById('monaco-wrapper');
    if (wrapper) {
      wrapper.innerHTML = `
        <div class="monaco-error">
          <div>
            <div>❌ Monaco Editor Error</div>
            <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">${message}</div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Monaco Editor初期化
   */
  async initializeMonaco() {
    // Monaco EditorのCDNから読み込み
    if (typeof monaco === 'undefined') {
      await this.loadMonacoFromCDN();
    }

    await this.setupSQLLanguage();
    
    const wrapper = this.shadowRoot.getElementById('monaco-wrapper');
    if (!wrapper) {
      throw new Error('Monaco wrapper not found');
    }

    // 以前のエディタがあれば破棄
    if (this.editor) {
      this.editor.dispose();
    }

    // エディタ作成
    this.editor = monaco.editor.create(wrapper, {
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
      selectOnLineNumbers: this.config.selectOnLineNumbers,
      roundedSelection: this.config.roundedSelection,
      readOnly: this.config.readOnly,
      cursorStyle: this.config.cursorStyle,
      cursorBlinking: this.config.cursorBlinking,
      
      // 視認性改善のための設定
      selectionHighlight: true,
      occurrencesHighlight: true,
      codeLens: false,
      folding: true,
      foldingHighlight: true,
      showFoldingControls: 'always',
      matchBrackets: 'always',
      renderWhitespace: 'selection',
      renderControlCharacters: false,
      
      // パフォーマンス設定
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false
      },
      quickSuggestionsDelay: 100,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: true,
      
      // アクセシビリティ
      accessibilitySupport: 'auto',
      ariaLabel: 'SQL Editor'
    });

    // エディタが作成された後に視認性の設定を適用
    this.applyVisibilityEnhancements();
    
    console.log('[MonacoEditorShadow] Editor created successfully');
  }

  /**
   * 視認性の改善を適用
   */
  applyVisibilityEnhancements() {
    if (!this.editor) return;

    // テーマのカスタマイズ
    monaco.editor.defineTheme('zosql-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'd4d4d4' },
        { token: 'keyword.sql', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'string.sql', foreground: 'ce9178' },
        { token: 'number.sql', foreground: 'b5cea8' },
        { token: 'comment.sql', foreground: '6a9955' },
        { token: 'identifier.sql', foreground: '9cdcfe' },
        { token: 'operator.sql', foreground: 'd7ba7d' }
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.selectionBackground': '#264f78',
        'editor.selectionForeground': '#ffffff',
        'editor.selectionHighlightBackground': '#add6ff26',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editorCursor.foreground': '#aeafad',
        'editorWhitespace.foreground': '#404040',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6'
      }
    });

    // カスタムテーマを適用
    monaco.editor.setTheme('zosql-dark');
  }

  /**
   * Monaco EditorのCDN読み込み
   */
  async loadMonacoFromCDN() {
    if (typeof monaco !== 'undefined') return;

    return new Promise((resolve, reject) => {
      // 既存のローダーを使用
      if (typeof require !== 'undefined') {
        require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.36.1/min/vs' } });
        require(['vs/editor/editor.main'], resolve);
      } else {
        // フォールバック: スクリプトタグで読み込み
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.36.1/min/vs/loader.js';
        script.onload = () => {
          require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.36.1/min/vs' } });
          require(['vs/editor/editor.main'], resolve);
        };
        script.onerror = reject;
        document.head.appendChild(script);
      }
    });
  }

  /**
   * SQL言語設定
   */
  async setupSQLLanguage() {
    if (typeof monaco === 'undefined') return;

    // SQL言語の設定を改善
    monaco.languages.setLanguageConfiguration('sql', {
      comments: {
        lineComment: '--',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]
    });

    // より詳細なSQL構文ハイライト
    monaco.languages.setMonarchTokensProvider('sql', {
      defaultToken: '',
      tokenPostfix: '.sql',
      ignoreCase: true,

      keywords: [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
        'ON', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
        'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX',
        'DROP', 'ALTER', 'ADD', 'COLUMN', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
        'WITH', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ORDER', 'BY', 'GROUP', 'HAVING',
        'DISTINCT', 'ALL', 'UNION', 'INTERSECT', 'EXCEPT', 'LIMIT', 'OFFSET',
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER'
      ],

      operators: [
        '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
        '<>', '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%', '<<',
        '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
        '%=', '<<=', '>>=', '>>>='
      ],

      symbols: /[=><!~?:&|+\-*\/\^%]+/,

      tokenizer: {
        root: [
          [/[a-z_$][\w$]*/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          [/[A-Z][\w\$]*/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'type.identifier'
            }
          }],
          { include: '@whitespace' },
          [/[{}()\[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }],
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],
          [/[;,.]/, 'delimiter'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, { token: 'string.quote', bracket: '@open', next: '@string' }],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, { token: 'string.quote', bracket: '@open', next: '@dblstring' }]
        ],

        comment: [
          [/[^\/*]+/, 'comment'],
          [/\/\*/, 'comment', '@push'],
          ['\\*/', 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],

        string: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape.invalid'],
          [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],

        dblstring: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape.invalid'],
          [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],

        whitespace: [
          [/[ \t\r\n]+/, 'white'],
          [/\/\*/, 'comment', '@comment'],
          [/--.*$/, 'comment']
        ]
      }
    });

    console.log('[MonacoEditorShadow] SQL language configured');
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    if (!this.editor) return;

    // 内容変更イベント
    this.editor.onDidChangeModelContent(() => {
      this.triggerCallback('content-change', {
        value: this.editor.getValue(),
        model: this.editor.getModel()
      });
    });

    // カーソル位置変更
    this.editor.onDidChangeCursorPosition((e) => {
      this.triggerCallback('cursor-change', {
        position: e.position,
        reason: e.reason
      });
    });

    // フォーカスイベント
    this.editor.onDidFocusEditorText(() => {
      this.triggerCallback('focus', {});
    });

    this.editor.onDidBlurEditorText(() => {
      this.triggerCallback('blur', {});
    });

    // キーボードショートカット
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      this.triggerCallback('run-query', { value: this.editor.getValue() });
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      this.triggerCallback('format-sql', { value: this.editor.getValue() });
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      this.triggerCallback('save', { value: this.editor.getValue() });
    });
  }

  /**
   * 値を設定
   */
  setValue(value) {
    if (this.editor) {
      this.editor.setValue(value || '');
    }
  }

  /**
   * 値を取得
   */
  getValue() {
    return this.editor ? this.editor.getValue() : '';
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
   * レイアウト更新
   */
  layout() {
    if (this.editor) {
      this.editor.layout();
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
   * 言語設定
   */
  setLanguage(language) {
    if (this.editor) {
      monaco.editor.setModelLanguage(this.editor.getModel(), language);
    }
  }

  /**
   * テーマ設定
   */
  setTheme(theme) {
    if (typeof monaco !== 'undefined') {
      monaco.editor.setTheme(theme);
    }
  }

  /**
   * SQL整形
   */
  async formatSQL() {
    if (!this.editor) return;

    const value = this.editor.getValue();
    if (!value.trim()) return;

    try {
      // SQL整形の実装（外部ライブラリまたは API呼び出し）
      this.triggerCallback('format-request', { value });
    } catch (error) {
      console.error('SQL formatting failed:', error);
    }
  }

  /**
   * 整形結果を設定
   */
  setFormattedSQL(formattedSQL) {
    if (this.editor && formattedSQL) {
      const selection = this.editor.getSelection();
      this.editor.setValue(formattedSQL);
      if (selection) {
        this.editor.setSelection(selection);
      }
    }
  }

  /**
   * IntelliSenseプロバイダー設定
   */
  setIntelliSenseProvider(provider) {
    if (typeof monaco !== 'undefined' && provider) {
      monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (model, position) => {
          return provider(model, position);
        }
      });
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
    this.shadowRoot.host.dispatchEvent(new CustomEvent(`monaco-${event}`, {
      detail: data,
      bubbles: true
    }));
  }

  /**
   * 破棄
   */
  destroy() {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    this.callbacks.clear();
    console.log('[MonacoEditorShadow] Destroyed');
  }
}

/**
 * Shadow DOM対応のWeb Component
 */
export class MonacoEditorShadowElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.component = null;
  }

  connectedCallback() {
    const options = {
      editorConfig: {
        language: this.getAttribute('language') || 'sql',
        theme: this.getAttribute('theme') || 'vs-dark',
        fontSize: parseInt(this.getAttribute('font-size')) || 14,
        readOnly: this.hasAttribute('readonly')
      }
    };

    this.component = new MonacoEditorShadowComponent(this.shadowRoot, options);

    // コールバック設定
    this.component.onCallback('content-change', (data) => {
      this.dispatchEvent(new CustomEvent('content-change', { 
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

    this.component.onCallback('save', (data) => {
      this.dispatchEvent(new CustomEvent('save', { 
        detail: data, 
        bubbles: true 
      }));
    });
  }

  disconnectedCallback() {
    if (this.component) {
      this.component.destroy();
      this.component = null;
    }
  }

  // 公開API
  setValue(value) {
    return this.component?.setValue(value);
  }

  getValue() {
    return this.component?.getValue();
  }

  focus() {
    return this.component?.focus();
  }

  layout() {
    return this.component?.layout();
  }

  setReadOnly(readOnly) {
    return this.component?.setReadOnly(readOnly);
  }

  setLanguage(language) {
    return this.component?.setLanguage(language);
  }

  setTheme(theme) {
    return this.component?.setTheme(theme);
  }

  formatSQL() {
    return this.component?.formatSQL();
  }

  setFormattedSQL(formattedSQL) {
    return this.component?.setFormattedSQL(formattedSQL);
  }
}

// Web Component登録
if (typeof customElements !== 'undefined') {
  customElements.define('monaco-editor-shadow', MonacoEditorShadowElement);
}

// グローバル公開
window.MonacoEditorShadowComponent = MonacoEditorShadowComponent;
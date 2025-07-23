import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useEditor } from '../context/EditorContext';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void;
  isMainEditor?: boolean;
  options?: editor.IStandaloneEditorConstructionOptions;
  onKeyDown?: (event: KeyboardEvent) => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  language = 'sql',
  readOnly = false,
  height = '100%',
  onMount,
  isMainEditor = false,
  options = {},
  onKeyDown
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { setEditorRef } = useEditor();

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Register main editor for global access
    if (isMainEditor) {
      setEditorRef(editor);
    }
    
    console.log('[DEBUG] Monaco Editor mounted with language:', language);
    console.log('[DEBUG] Monaco Editor readOnly prop:', readOnly);
    console.log('[DEBUG] Monaco Editor options:', options);
    
    // Define custom dark theme to match our VS Code Dark style
    monaco.editor.defineTheme('zosql-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569cd6' },
        { token: 'keyword.uppercase', foreground: '569cd6' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'comment', foreground: '6a9955' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'operator', foreground: 'd4d4d4' },
        { token: 'delimiter', foreground: 'd4d4d4' }
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#cccccc',
        'editor.lineHighlightBackground': '#2d2d30',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorCursor.foreground': '#ffffff',
        'editorWhitespace.foreground': '#404040',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6'
      }
    });
    
    // Set the custom theme
    monaco.editor.setTheme('zosql-dark');
    
    // Force language configuration for SQL (even if already set)
    if (language === 'sql') {
      console.log('[DEBUG] Setting SQL language configuration and tokens');
      
      // Configure SQL language features
    monaco.languages.setLanguageConfiguration('sql', {
      comments: {
        lineComment: '--',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['(', ')'],
        ['[', ']']
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: "'", close: "'" },
        { open: '"', close: '"' }
      ],
      surroundingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: "'", close: "'" },
        { open: '"', close: '"' }
      ]
    });

    // Set SQL keywords for syntax highlighting
    // NOTE: キーワードごとに異なる色を設定することが可能
    // 実装方法:
    // 1. tokenizer.rootで正規表現によりキーワード分類
    //    例: [/\b(SELECT|FROM|WHERE)\b/i, 'keyword.dml'] // DML系
    //        [/\b(ROW_NUMBER|CURRENT_DATE)\b/i, 'keyword.function'] // 関数系
    // 2. defineThemeのrulesで各トークンタイプに色を割り当て
    //    例: { token: 'keyword.dml', foreground: 'ff6b6b' } // 赤
    //        { token: 'keyword.function', foreground: '51cf66' } // 緑
    // 分類例: DML(赤), 関数(緑), 論理演算(黄), DDL(紫)
    monaco.languages.setMonarchTokensProvider('sql', {
      keywords: [
        // Uppercase keywords
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
        'ON', 'AS', 'WITH', 'CTE', 'UNION', 'INTERSECT', 'EXCEPT', 'ORDER', 'BY',
        'GROUP', 'HAVING', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
        'TABLE', 'VIEW', 'INDEX', 'DATABASE', 'SCHEMA', 'AND', 'OR', 'NOT', 'IN',
        'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'DISTINCT', 'COUNT', 'SUM',
        'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'ROW_NUMBER', 'PARTITION', 'CURRENT_DATE', 'CURRENT_TIMESTAMP', 'INTERVAL', 'OVER',
        // Lowercase keywords (for case-insensitive matching)
        'select', 'from', 'where', 'join', 'inner', 'left', 'right', 'full', 'outer',
        'on', 'as', 'with', 'cte', 'union', 'intersect', 'except', 'order', 'by',
        'group', 'having', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
        'table', 'view', 'index', 'database', 'schema', 'and', 'or', 'not', 'in',
        'exists', 'between', 'like', 'is', 'null', 'distinct', 'count', 'sum',
        'avg', 'min', 'max', 'case', 'when', 'then', 'else', 'end',
        'row_number', 'partition', 'current_date', 'current_timestamp', 'interval', 'over'
      ],
      operators: [
        '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
        '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
        '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
        '%=', '<<=', '>>=', '>>>='
      ],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      tokenizer: {
        root: [
          // Match identifiers and keywords (case-insensitive)
          [/[a-zA-Z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
          { include: '@whitespace' },
          [/[{}()\[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
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
          [/\*\//, 'comment', '@pop'],
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
    
    console.log('[DEBUG] SQL Monarch tokenizer configured with keywords including:', 
      ['select', 'from', 'where'].every(kw => 
        monaco.languages.getLanguages().find(lang => lang.id === 'sql')
      ) ? 'SQL language found' : 'SQL language not found'
    );
    
    // Set the language explicitly for the current model
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, 'sql');
      const actualLanguage = model.getLanguageId();
      console.log('[DEBUG] Set model language to SQL, actual language:', actualLanguage);
      
      // Force tokenization update
      setTimeout(() => {
        monaco.editor.setModelLanguage(model, 'plaintext');
        setTimeout(() => {
          monaco.editor.setModelLanguage(model, 'sql');
          console.log('[DEBUG] Forced re-tokenization complete');
        }, 10);
      }, 10);
    }
  }

    // Add keyboard event listener for shortcuts
    if (onKeyDown) {
      // Add a custom keybinding command for Ctrl+Enter
      editor.addAction({
        id: 'execute-query',
        label: 'Execute Query',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
        ],
        run: () => {
          // Find and click the Run button for consistent execution
          const runButton = document.querySelector('button[title="Run Query (Ctrl+Enter)"]') as HTMLButtonElement;
          if (runButton && !runButton.disabled) {
            runButton.click();
          } else {
            // Fallback to the original event dispatch
            const event = new KeyboardEvent('keydown', {
              ctrlKey: true,
              key: 'Enter'
            });
            onKeyDown(event);
          }
        }
      });
      
      // Also handle other key events
      editor.onKeyDown((e) => {
        // Skip Ctrl+Enter since it's handled by the action above
        if (e.ctrlKey && e.code === 'Enter') {
          return;
        }
        
        const event = new KeyboardEvent('keydown', {
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
          key: e.code === 'Enter' ? 'Enter' : e.browserEvent.key
        });
        onKeyDown(event);
      });
    }

    // Call custom onMount handler if provided
    if (onMount) {
      onMount(editor, monaco);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  // Watch for language changes and re-apply SQL configuration
  useEffect(() => {
    if (language === 'sql' && editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const currentLanguage = model.getLanguageId();
        console.log('[DEBUG] Language prop changed to:', language, 'Current model language:', currentLanguage);
        
        if (currentLanguage !== 'sql') {
          monacoRef.current.editor.setModelLanguage(model, 'sql');
          console.log('[DEBUG] Forced language change to SQL');
        }
      }
    }
  }, [language]);

  return (
    <div className="h-full w-full">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          theme: 'zosql-dark',
          fontSize: 14,
          fontFamily: 'Consolas, Monaco, Courier New, monospace',
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly,
          minimap: { enabled: false },
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          glyphMargin: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: 'off',
          contextmenu: true,
          mouseWheelZoom: true,
          smoothScrolling: true,
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'line',
          selectionHighlight: true,
          occurrencesHighlight: 'singleFile',
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false
          },
          parameterHints: {
            enabled: true
          },
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: 'on',
          accessibilitySupport: 'auto',
          // Merge custom options, allowing override of defaults
          ...options
        }}
      />
    </div>
  );
};
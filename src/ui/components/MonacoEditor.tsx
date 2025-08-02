import React, { useRef, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import { useEditor } from '../context/EditorContext';
import { WorkspaceEntity } from '@shared/types';
import { DebugLogger } from '../../utils/debug-logger';

// Global flag to ensure theme is only defined once across all editor instances
let globalThemeInitialized = false;

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
  workspace?: WorkspaceEntity | null;
  refreshTrigger?: number;
  // jumpToPosition?: number; // Position jump temporarily disabled
  searchTerm?: string; // Term to search for in the editor
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
  onKeyDown,
  workspace,
  refreshTrigger = 0,
  // jumpToPosition, // Position jump temporarily disabled
  searchTerm
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { setEditorRef } = useEditor();
  
  // Suppress unused variable warning for refreshTrigger (may be used in future for forced refreshes)
  void refreshTrigger;
  
  // Debug: Log when component mounts/unmounts
  useEffect(() => {
    console.log('[DEBUG] MonacoEditor component mounted/updated with language:', language, 'isMainEditor:', isMainEditor);
    return () => {
      console.log('[DEBUG] MonacoEditor component unmounting, language:', language, 'isMainEditor:', isMainEditor);
    };
  }, [language, isMainEditor]);

  // Get indent size from workspace formatter configuration
  const getIndentSize = (): number => {
    if (!workspace) return 2; // default
    
    try {
      // console.log('[DEBUG] Getting indent size from workspace formatter');
      // ✅ CORRECT: Parse the JSON config directly
      const formatterConfig = JSON.parse(workspace.formatter.config);
      // console.log('[DEBUG] Formatter config:', formatterConfig);
      
      // The correct property name is 'indentSize'
      const indentSize = formatterConfig?.indentSize || 2; // default
      
      // console.log('[DEBUG] Resolved indent size:', indentSize);
      return typeof indentSize === 'number' ? indentSize : 2;
    } catch (error) {
      console.warn('[DEBUG] Failed to get indent size from formatter:', error);
      console.log('[DEBUG] Formatter config string:', workspace.formatter.config);
      return 2; // default
    }
  };

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
    
    // Define custom dark theme only once globally to prevent flicker
    if (!globalThemeInitialized) {
      console.log('[DEBUG] Initializing zosql-dark theme globally');
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
      globalThemeInitialized = true;
      console.log('[DEBUG] zosql-dark theme defined globally');
    }
    
    // Set the custom theme (this is lightweight and doesn't cause flicker)
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
      symbols: /[=><!~?:&|+\-*/^%]+/,
      tokenizer: {
        root: [
          // Match identifiers and keywords (case-insensitive)
          [/[a-zA-Z_$][\w$]*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
          { include: '@whitespace' },
          [/[{}()[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
          [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],
          [/[;,.]/, 'delimiter'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, { token: 'string.quote', bracket: '@open', next: '@string' }],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, { token: 'string.quote', bracket: '@open', next: '@dblstring' }]
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\/\*/, 'comment', '@push'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment']
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
    
    console.log('[DEBUG] SQL Monarch tokenizer configured, SQL language availability:', 
      monaco.languages.getLanguages().find(lang => lang.id === 'sql') ? 'SQL language found' : 'SQL language not found'
    );
    
    // Set the language explicitly for the current model
    const model = editor.getModel();
    if (model) {
      const currentLanguage = model.getLanguageId();
      if (currentLanguage !== 'sql') {
        monaco.editor.setModelLanguage(model, 'sql');
        console.log('[DEBUG] Set model language to SQL, was:', currentLanguage);
      } else {
        console.log('[DEBUG] Model language already set to SQL, skipping re-tokenization');
      }
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

      // Add a custom keybinding command for Ctrl+Shift+F (Format)
      editor.addAction({
        id: 'format-sql',
        label: 'Format SQL',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF
        ],
        run: () => {
          // Find and click the Format button
          const buttons = Array.from(document.querySelectorAll('button'));
          const formatButton = buttons.find(btn => btn.textContent?.trim() === 'Format') as HTMLButtonElement;
          if (formatButton && !formatButton.disabled) {
            console.log('[DEBUG] Executing format via Ctrl+Shift+F Monaco action');
            formatButton.click();
          } else {
            // Fallback to the original event dispatch
            const event = new KeyboardEvent('keydown', {
              ctrlKey: true,
              shiftKey: true,
              key: 'F'
            });
            onKeyDown(event);
          }
        }
      });
      
      // Also handle other key events
      editor.onKeyDown((e) => {
        // Skip Ctrl+Enter and Ctrl+Shift+F since they're handled by actions above
        if (e.ctrlKey && e.code === 'Enter') {
          return;
        }
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') {
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

  // Watch for workspace formatter changes and update indent settings
  // Use stable values to prevent infinite re-renders
  const workspaceIndentSize = workspace ? getIndentSize() : 4;
  const workspaceId = workspace?.id; // Stable identifier to track workspace changes
  
  useEffect(() => {
    if (editorRef.current && language === 'sql' && workspace) {
      DebugLogger.debug('MonacoEditor', 'Updating Monaco editor indent settings, indentSize:', workspaceIndentSize);
      
      // Update editor options for indent
      editorRef.current.updateOptions({
        tabSize: workspaceIndentSize,
        insertSpaces: true
        // rulers: 無効化（過剰表示で見づらいため）
      });
      
      DebugLogger.debug('MonacoEditor', 'Updated Monaco editor with tabSize:', workspaceIndentSize);
    }
  }, [workspaceId, language, workspaceIndentSize]); // Use stable workspaceId instead of the entire workspace object

  // Watch for value prop changes and sync with editor content
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== value) {
        console.log('[DEBUG] Syncing editor value, current:', currentValue.length, 'new:', value.length);
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  // Position jump functionality temporarily disabled
  // useEffect(() => {
  //   if (jumpToPosition !== undefined && editorRef.current && monacoRef.current) {
  //     const editor = editorRef.current;
  //     const model = editor.getModel();
  //     
  //     if (model) {
  //       try {
  //         // Convert character position to line/column position
  //         const position = model.getPositionAt(jumpToPosition);
  //         
  //         // Set cursor position
  //         editor.setPosition(position);
  //         
  //         // Scroll to reveal the position
  //         editor.revealPositionInCenter(position);
  //         
  //         // Focus the editor
  //         editor.focus();
  //         
  //         console.log('[DEBUG] Jumped to position:', jumpToPosition, 'line:', position.lineNumber, 'column:', position.column);
  //       } catch (error) {
  //         console.error('[DEBUG] Failed to jump to position:', jumpToPosition, error);
  //       }
  //     }
  //   }
  // }, [jumpToPosition]);

  // Handle search functionality
  useEffect(() => {
    if (searchTerm && editorRef.current) {
      const editor = editorRef.current;
      
      console.log('[DEBUG] Opening search widget with term:', searchTerm);
      
      try {
        // Access the find controller directly
        const findController = editor.getContribution('editor.contrib.findController') as {
          closeFindWidget(): void;
          getState(): { 
            searchString: string;
            change?: (options: { searchString: string; isRegex: boolean; matchCase: boolean; wholeWord: boolean }, moveToNextAfterFind: boolean) => void;
          };
          moveToNextMatch?(): void;
        } | null;
        
        if (findController) {
          // First, close the find widget if it's already open to reset state
          findController.closeFindWidget();
          
          // Then open it with a slight delay
          setTimeout(() => {
            // Open the find widget
            editor.getAction('actions.find')?.run();
            
            // Set the search term after another small delay
            setTimeout(() => {
              try {
                const findState = findController.getState();
                if (findState) {
                  // Clear previous search and set new one
                  findState.change?.({ 
                    searchString: searchTerm,
                    isRegex: false,
                    matchCase: false,
                    wholeWord: false
                  }, false);
                  console.log('[DEBUG] Set search term:', searchTerm);
                  
                  // Trigger the search
                  findController.moveToNextMatch?.();
                }
              } catch (error) {
                console.error('[DEBUG] Failed to set search term:', error);
              }
            }, 50);
          }, 50);
        }
      } catch (error) {
        console.error('[DEBUG] Failed to access find controller:', error);
      }
    }
  }, [searchTerm]);


  // Get dynamic options based on formatter configuration
  const indentSize = getIndentSize();
  const dynamicOptions = {
    theme: 'zosql-dark',
    fontSize: 14,
    fontFamily: 'Consolas, Monaco, Courier New, monospace',
    lineNumbers: 'on' as editor.LineNumbersType,
    roundedSelection: false,
    scrollBeyondLastLine: false,
    readOnly,
    minimap: { enabled: false },
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    glyphMargin: false,
    automaticLayout: true,
    tabSize: indentSize,
    insertSpaces: true,
    // rulers: インデント縦線は無効化（過剰表示で見づらいため）
    // rulers: language === 'sql' ? [indentSize * 4, indentSize * 8, indentSize * 12] : undefined,
    wordWrap: 'off' as const,
    contextmenu: true,
    mouseWheelZoom: true,
    smoothScrolling: true,
    cursorSmoothCaretAnimation: 'on' as const,
    renderLineHighlight: 'line' as const,
    selectionHighlight: true,
    occurrencesHighlight: 'singleFile' as const,
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
    acceptSuggestionOnEnter: 'on' as const,
    accessibilitySupport: 'auto' as const,
    // Merge custom options, allowing override of defaults
    ...options
  };

  return (
    <div className="h-full w-full">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={dynamicOptions}
      />
    </div>
  );
};
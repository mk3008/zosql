import React, { createContext, useContext, useState, useReducer, useEffect } from 'react';
import type { editor } from 'monaco-editor';
import * as Result from '../../lib/functional/result.js';
import * as Option from '../../lib/functional/option.js';
import {
  EditorFunctionalState,
  EditorAction,
  EditorOperation,
  createInitialEditorState,
  editorReducerFunc,
  EditorActions,
  EditorSelectors
} from '../../lib/functional/editor-state.js';

interface EditorContextType {
  insertAtCursor: (text: string) => void;
  replaceContent: (text: string) => void;
  getCurrentContent: () => string;
  setEditorRef: (ref: editor.IStandaloneCodeEditor | null) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);


interface EditorProviderProps {
  children: React.ReactNode;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({ children }) => {
  const [editorRef, setEditorRef] = useState<editor.IStandaloneCodeEditor | null>(null);

  const insertAtCursor = (text: string) => {
    if (!editorRef) return;
    
    const selection = editorRef.getSelection();
    const range = selection || {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1
    };

    editorRef.executeEdits('insert-values', [{
      range: range,
      text: text,
      forceMoveMarkers: true
    }]);

    // Move cursor to end of inserted text
    const lines = text.split('\n');
    const newLine = range.startLineNumber + lines.length - 1;
    const newColumn = lines.length === 1 
      ? range.startColumn + lines[0].length 
      : lines[lines.length - 1].length + 1;
    
    editorRef.setPosition({
      lineNumber: newLine,
      column: newColumn
    });
    
    editorRef.focus();
  };

  const replaceContent = (text: string) => {
    if (!editorRef) return;
    
    editorRef.setValue(text);
    editorRef.focus();
  };

  const getCurrentContent = (): string => {
    if (!editorRef) return '';
    return editorRef.getValue();
  };

  const value: EditorContextType = {
    insertAtCursor,
    replaceContent,
    getCurrentContent,
    setEditorRef
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

// ===== NEW FUNCTIONAL STATE MANAGEMENT - BACKWARD COMPATIBLE =====

/**
 * Functional editor context type with enhanced features
 */
interface EditorContextFunctionalType extends EditorContextType {
  // Functional state access
  functionalState: EditorFunctionalState;
  dispatch: React.Dispatch<EditorAction>;
  
  // Enhanced selectors
  getEditorRefOption: () => Option.Option<editor.IStandaloneCodeEditor>;
  getContentOption: () => Option.Option<string>;
  getCursorPositionOption: () => Option.Option<{ lineNumber: number; column: number }>;
  getLastOperation: () => Option.Option<EditorOperation>;
  getOperationHistory: () => Array<EditorOperation>;
  getEditorStatistics: () => ReturnType<typeof EditorSelectors.getEditorStatistics>;
  
  // Enhanced operations
  insertAtCursorSafe: (text: string) => Result.Result<void, string>;
  replaceContentSafe: (text: string) => Result.Result<void, string>;
  isReady: () => boolean;
  clearHistory: () => void;
}

/**
 * Enhanced editor provider with functional state management
 */
export const EditorProviderFunc: React.FC<EditorProviderProps> = ({ children }) => {
  // Original state for backward compatibility
  const [, setEditorRefState] = useState<editor.IStandaloneCodeEditor | null>(null);

  // Functional state management
  const [functionalState, dispatch] = useReducer(
    editorReducerFunc,
    createInitialEditorState()
  );

  // Sync original state with functional state
  useEffect(() => {
    const editorRefOption = EditorSelectors.getEditorRef(functionalState);
    setEditorRefState(Option.isSome(editorRefOption) ? editorRefOption.value : null);
  }, [functionalState]);

  const setEditorRef = (ref: editor.IStandaloneCodeEditor | null) => {
    dispatch(EditorActions.setEditorRef(ref));
    
    if (ref) {
      // Set up content change listener
      ref.onDidChangeModelContent(() => {
        const content = ref.getValue();
        dispatch(EditorActions.contentChanged(content));
      });

      // Set up cursor position listener
      ref.onDidChangeCursorPosition((e) => {
        dispatch(EditorActions.cursorChanged({
          lineNumber: e.position.lineNumber,
          column: e.position.column
        }));
      });

      dispatch(EditorActions.setReady(true));
    } else {
      dispatch(EditorActions.setReady(false));
    }
  };

  const createOperation = (
    type: EditorOperation['type'],
    content?: string,
    position?: { lineNumber: number; column: number }
  ): EditorOperation => ({
    type,
    timestamp: new Date(),
    content,
    position,
    success: true
  });

  const insertAtCursor = (text: string) => {
    const editorRefOption = EditorSelectors.getEditorRef(functionalState);
    
    if (Option.isNone(editorRefOption)) {
      return;
    }

    const editor = editorRefOption.value;
    
    try {
      const selection = editor.getSelection();
      const range = selection || {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1
      };

      editor.executeEdits('insert-values', [{
        range: range,
        text: text,
        forceMoveMarkers: true
      }]);

      // Move cursor to end of inserted text
      const lines = text.split('\n');
      const newLine = range.startLineNumber + lines.length - 1;
      const newColumn = lines.length === 1 
        ? range.startColumn + lines[0].length 
        : lines[lines.length - 1].length + 1;
      
      const newPosition = {
        lineNumber: newLine,
        column: newColumn
      };

      editor.setPosition(newPosition);
      editor.focus();

      // Record successful operation
      const operation = createOperation('insert', text, newPosition);
      dispatch(EditorActions.operationSuccess(operation));

    } catch (error) {
      const operation = createOperation('insert', text);
      const errorMessage = error instanceof Error ? error.message : 'Failed to insert text';
      dispatch(EditorActions.operationError(operation, errorMessage));
    }
  };

  const replaceContent = (text: string) => {
    const editorRefOption = EditorSelectors.getEditorRef(functionalState);
    
    if (Option.isNone(editorRefOption)) {
      return;
    }

    const editor = editorRefOption.value;
    
    try {
      editor.setValue(text);
      editor.focus();

      // Record successful operation
      const operation = createOperation('replace', text);
      dispatch(EditorActions.operationSuccess(operation));

    } catch (error) {
      const operation = createOperation('replace', text);
      const errorMessage = error instanceof Error ? error.message : 'Failed to replace content';
      dispatch(EditorActions.operationError(operation, errorMessage));
    }
  };

  const getCurrentContent = (): string => {
    const editorRefOption = EditorSelectors.getEditorRef(functionalState);
    
    if (Option.isNone(editorRefOption)) {
      return '';
    }

    return editorRefOption.value.getValue();
  };

  // Enhanced functional methods
  const insertAtCursorSafe = (text: string): Result.Result<void, string> => {
    if (!text || text.length === 0) {
      return Result.err('Text to insert cannot be empty');
    }

    const editorRefOption = EditorSelectors.getEditorRef(functionalState);
    
    if (Option.isNone(editorRefOption)) {
      return Result.err('Editor is not available');
    }

    try {
      insertAtCursor(text);
      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to insert text';
      return Result.err(errorMessage);
    }
  };

  const replaceContentSafe = (text: string): Result.Result<void, string> => {
    const editorRefOption = EditorSelectors.getEditorRef(functionalState);
    
    if (Option.isNone(editorRefOption)) {
      return Result.err('Editor is not available');
    }

    try {
      replaceContent(text);
      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to replace content';
      return Result.err(errorMessage);
    }
  };

  // Enhanced selectors
  const getEditorRefOption = () => EditorSelectors.getEditorRef(functionalState);
  const getContentOption = () => EditorSelectors.getContent(functionalState);
  const getCursorPositionOption = () => EditorSelectors.getCursorPosition(functionalState);
  const getLastOperation = () => EditorSelectors.getLastOperation(functionalState);
  const getOperationHistory = () => EditorSelectors.getOperationHistory(functionalState);
  const getEditorStatistics = () => EditorSelectors.getEditorStatistics(functionalState);
  
  const isReady = () => EditorSelectors.isReady(functionalState);
  const clearHistory = () => dispatch(EditorActions.clearHistory());

  const value: EditorContextFunctionalType = {
    // Original interface
    insertAtCursor,
    replaceContent,
    getCurrentContent,
    setEditorRef,
    
    // Functional enhancements
    functionalState,
    dispatch,
    getEditorRefOption,
    getContentOption,
    getCursorPositionOption,
    getLastOperation,
    getOperationHistory,
    getEditorStatistics,
    insertAtCursorSafe,
    replaceContentSafe,
    isReady,
    clearHistory
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};

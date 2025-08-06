/**
 * EditorContext V2 - Functional Programming Approach
 * Pure functional Monaco Editor state management
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { editor } from 'monaco-editor';

// State type - immutable data structure
interface EditorState {
  readonly editorRef: editor.IStandaloneCodeEditor | null;
  readonly content: string;
  readonly cursorPosition: { line: number; column: number };
  readonly selection: any | null; // Monaco Selection type
}

// Action types - discriminated union
type EditorAction =
  | { type: 'SET_EDITOR_REF'; payload: editor.IStandaloneCodeEditor | null }
  | { type: 'UPDATE_CONTENT'; payload: string }
  | { type: 'UPDATE_CURSOR'; payload: { line: number; column: number } }
  | { type: 'UPDATE_SELECTION'; payload: any | null }
  | { type: 'CLEAR_EDITOR' };

// Initial state
const initialState: EditorState = {
  editorRef: null,
  content: '',
  cursorPosition: { line: 1, column: 1 },
  selection: null,
};

// Pure reducer function
const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'SET_EDITOR_REF':
      return { 
        ...state, 
        editorRef: action.payload,
        content: action.payload ? action.payload.getValue() : '',
      };
    
    case 'UPDATE_CONTENT':
      return { ...state, content: action.payload };
    
    case 'UPDATE_CURSOR':
      return { ...state, cursorPosition: action.payload };
    
    case 'UPDATE_SELECTION':
      return { ...state, selection: action.payload };
    
    case 'CLEAR_EDITOR':
      return initialState;
    
    default:
      return state;
  }
};

// Pure helper functions
const calculateInsertPosition = (
  text: string,
  startLine: number,
  startColumn: number
): { line: number; column: number } => {
  const lines = text.split('\n');
  const newLine = startLine + lines.length - 1;
  const newColumn = lines.length === 1 
    ? startColumn + lines[0].length 
    : lines[lines.length - 1].length + 1;
  
  return { line: newLine, column: newColumn };
};

// Context types
interface EditorContextType {
  readonly state: EditorState;
  readonly actions: {
    insertAtCursor: (text: string) => void;
    replaceContent: (text: string) => void;
    getCurrentContent: () => string;
    setEditorRef: (ref: editor.IStandaloneCodeEditor | null) => void;
    clearEditor: () => void;
    getSelectedText: () => string;
    getCursorPosition: () => { line: number; column: number };
  };
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

// Custom hook for consuming context
export const useEditorV2 = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorV2 must be used within an EditorProviderV2');
  }
  return context;
};

interface EditorProviderProps {
  children: React.ReactNode;
}

export const EditorProviderV2: React.FC<EditorProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  // Action: Insert text at cursor position
  const insertAtCursor = useCallback((text: string) => {
    const { editorRef } = state;
    if (!editorRef) return;
    
    const selection = editorRef.getSelection();
    const range = selection || {
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1
    };

    // Execute edit operation
    editorRef.executeEdits('insert-values', [{
      range: range,
      text: text,
      forceMoveMarkers: true
    }]);

    // Calculate and set new cursor position
    const newPosition = calculateInsertPosition(
      text,
      range.startLineNumber,
      range.startColumn
    );
    
    editorRef.setPosition({
      lineNumber: newPosition.line,
      column: newPosition.column
    });
    
    // Update state
    dispatch({ type: 'UPDATE_CONTENT', payload: editorRef.getValue() });
    dispatch({ type: 'UPDATE_CURSOR', payload: newPosition });
    
    editorRef.focus();
  }, [state]);

  // Action: Replace entire content
  const replaceContent = useCallback((text: string) => {
    const { editorRef } = state;
    if (!editorRef) return;
    
    editorRef.setValue(text);
    dispatch({ type: 'UPDATE_CONTENT', payload: text });
    dispatch({ type: 'UPDATE_CURSOR', payload: { line: 1, column: 1 } });
    
    editorRef.focus();
  }, [state]);

  // Action: Get current content
  const getCurrentContent = useCallback((): string => {
    const { editorRef } = state;
    if (!editorRef) return state.content;
    
    const currentValue = editorRef.getValue();
    if (currentValue !== state.content) {
      dispatch({ type: 'UPDATE_CONTENT', payload: currentValue });
    }
    
    return currentValue;
  }, [state]);

  // Action: Set editor reference
  const setEditorRef = useCallback((ref: editor.IStandaloneCodeEditor | null) => {
    dispatch({ type: 'SET_EDITOR_REF', payload: ref });
    
    // Set up event listeners for state synchronization
    if (ref) {
      const contentChangeDisposable = ref.onDidChangeModelContent(() => {
        dispatch({ type: 'UPDATE_CONTENT', payload: ref.getValue() });
      });
      
      const cursorChangeDisposable = ref.onDidChangeCursorPosition((e) => {
        dispatch({ 
          type: 'UPDATE_CURSOR', 
          payload: { line: e.position.lineNumber, column: e.position.column } 
        });
      });
      
      const selectionChangeDisposable = ref.onDidChangeCursorSelection((e) => {
        dispatch({ type: 'UPDATE_SELECTION', payload: e.selection });
      });
      
      // Clean up listeners when editor changes
      return () => {
        contentChangeDisposable.dispose();
        cursorChangeDisposable.dispose();
        selectionChangeDisposable.dispose();
      };
    }
  }, []);

  // Action: Clear editor
  const clearEditor = useCallback(() => {
    dispatch({ type: 'CLEAR_EDITOR' });
  }, []);

  // Action: Get selected text
  const getSelectedText = useCallback((): string => {
    const { editorRef, selection } = state;
    if (!editorRef || !selection) return '';
    
    const model = editorRef.getModel();
    if (!model) return '';
    
    return model.getValueInRange(selection);
  }, [state]);

  // Action: Get cursor position
  const getCursorPosition = useCallback((): { line: number; column: number } => {
    return state.cursorPosition;
  }, [state.cursorPosition]);

  // Memoize context value
  const contextValue = useMemo<EditorContextType>(() => ({
    state,
    actions: {
      insertAtCursor,
      replaceContent,
      getCurrentContent,
      setEditorRef,
      clearEditor,
      getSelectedText,
      getCursorPosition,
    },
  }), [
    state,
    insertAtCursor,
    replaceContent,
    getCurrentContent,
    setEditorRef,
    clearEditor,
    getSelectedText,
    getCursorPosition,
  ]);

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
};

// Selector hooks for granular subscriptions
export const useEditorContent = () => {
  const { state } = useEditorV2();
  return state.content;
};

export const useEditorCursor = () => {
  const { state } = useEditorV2();
  return state.cursorPosition;
};

export const useEditorSelection = () => {
  const { state } = useEditorV2();
  return state.selection;
};

export const useEditorActions = () => {
  const { actions } = useEditorV2();
  return actions;
};

// Utility hook for common editor operations
export const useEditorOperations = () => {
  const { actions } = useEditorV2();
  
  const appendText = useCallback((text: string) => {
    const currentContent = actions.getCurrentContent();
    actions.replaceContent(currentContent + text);
  }, [actions]);
  
  const prependText = useCallback((text: string) => {
    const currentContent = actions.getCurrentContent();
    actions.replaceContent(text + currentContent);
  }, [actions]);
  
  const wrapSelection = useCallback((before: string, after: string) => {
    const selectedText = actions.getSelectedText();
    if (selectedText) {
      actions.insertAtCursor(before + selectedText + after);
    }
  }, [actions]);
  
  return {
    appendText,
    prependText,
    wrapSelection,
  };
};
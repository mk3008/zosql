import React, { createContext, useContext, useState } from 'react';

interface EditorContextType {
  insertAtCursor: (text: string) => void;
  replaceContent: (text: string) => void;
  getCurrentContent: () => string;
  setEditorRef: (ref: any) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const useEditor = (): EditorContextType => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};

interface EditorProviderProps {
  children: React.ReactNode;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({ children }) => {
  const [editorRef, setEditorRef] = useState<any>(null);

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
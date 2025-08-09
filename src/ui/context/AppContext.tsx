/**
 * AppContext - Unified Global State Management
 * Functional programming approach with combined reducers
 */

import React, { createContext, useReducer, useMemo } from 'react';
import type { Workspace } from '@shared/types';
import type { editor } from 'monaco-editor';

// ============================================================================
// State Types
// ============================================================================

interface WorkspaceState {
  readonly workspace: Workspace | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

interface EditorState {
  readonly editorRef: editor.IStandaloneCodeEditor | null;
  readonly content: string;
  readonly cursorPosition: { line: number; column: number };
}

interface UIState {
  readonly sidebarOpen: boolean;
  readonly theme: 'light' | 'dark';
  readonly panelSizes: {
    readonly sidebar: number;
    readonly editor: number;
    readonly output: number;
  };
}

// Combined app state
export interface AppState {
  readonly workspace: WorkspaceState;
  readonly editor: EditorState;
  readonly ui: UIState;
}

// ============================================================================
// Action Types
// ============================================================================

type WorkspaceAction =
  | { type: 'WORKSPACE_LOADING' }
  | { type: 'WORKSPACE_LOADED'; payload: Workspace }
  | { type: 'WORKSPACE_ERROR'; payload: string }
  | { type: 'WORKSPACE_CLEAR' };

type EditorAction =
  | { type: 'EDITOR_SET_REF'; payload: editor.IStandaloneCodeEditor | null }
  | { type: 'EDITOR_UPDATE_CONTENT'; payload: string }
  | { type: 'EDITOR_UPDATE_CURSOR'; payload: { line: number; column: number } };

type UIAction =
  | { type: 'UI_TOGGLE_SIDEBAR' }
  | { type: 'UI_SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'UI_UPDATE_PANEL_SIZE'; payload: { panel: keyof UIState['panelSizes']; size: number } };

export type AppAction = WorkspaceAction | EditorAction | UIAction;

// ============================================================================
// Initial State
// ============================================================================

const initialAppState: AppState = {
  workspace: {
    workspace: null,
    isLoading: false,
    error: null,
  },
  editor: {
    editorRef: null,
    content: '',
    cursorPosition: { line: 1, column: 1 },
  },
  ui: {
    sidebarOpen: true,
    theme: 'light',
    panelSizes: {
      sidebar: 250,
      editor: 600,
      output: 350,
    },
  },
};

// ============================================================================
// Reducers (Pure Functions)
// ============================================================================

// Workspace reducer
const workspaceReducer = (state: WorkspaceState, action: AppAction): WorkspaceState => {
  switch (action.type) {
    case 'WORKSPACE_LOADING':
      return { ...state, isLoading: true, error: null };
    
    case 'WORKSPACE_LOADED':
      return { workspace: action.payload, isLoading: false, error: null };
    
    case 'WORKSPACE_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    
    case 'WORKSPACE_CLEAR':
      return { workspace: null, isLoading: false, error: null };
    
    default:
      return state;
  }
};

// Editor reducer
const editorReducer = (state: EditorState, action: AppAction): EditorState => {
  switch (action.type) {
    case 'EDITOR_SET_REF':
      return {
        ...state,
        editorRef: action.payload,
        content: action.payload ? action.payload.getValue() : '',
      };
    
    case 'EDITOR_UPDATE_CONTENT':
      return { ...state, content: action.payload };
    
    case 'EDITOR_UPDATE_CURSOR':
      return { ...state, cursorPosition: action.payload };
    
    default:
      return state;
  }
};

// UI reducer
const uiReducer = (state: UIState, action: AppAction): UIState => {
  switch (action.type) {
    case 'UI_TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    
    case 'UI_SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'UI_UPDATE_PANEL_SIZE':
      return {
        ...state,
        panelSizes: {
          ...state.panelSizes,
          [action.payload.panel]: action.payload.size,
        },
      };
    
    default:
      return state;
  }
};

// Combined reducer using functional composition
const appReducer = (state: AppState, action: AppAction): AppState => ({
  workspace: workspaceReducer(state.workspace, action),
  editor: editorReducer(state.editor, action),
  ui: uiReducer(state.ui, action),
});

// ============================================================================
// Context
// ============================================================================

interface AppContextType {
  readonly state: AppState;
  readonly dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AppProviderProps {
  children: React.ReactNode;
  initialState?: Partial<AppState>;
}

export const AppProvider: React.FC<AppProviderProps> = ({ 
  children, 
  initialState: customInitialState 
}) => {
  // Merge custom initial state with defaults
  const mergedInitialState = useMemo(() => ({
    ...initialAppState,
    ...customInitialState,
    workspace: { ...initialAppState.workspace, ...customInitialState?.workspace },
    editor: { ...initialAppState.editor, ...customInitialState?.editor },
    ui: { ...initialAppState.ui, ...customInitialState?.ui },
  }), [customInitialState]);

  const [state, dispatch] = useReducer(appReducer, mergedInitialState);

  // Memoize context value
  const contextValue = useMemo(() => ({
    state,
    dispatch,
  }), [state]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// NOTE: All hooks removed to avoid fast-refresh warnings
// This file exports only the Provider component and types
/**
 * AppContext - Unified Global State Management
 * Functional programming approach with combined reducers
 */

import React, { createContext, useContext, useReducer, useMemo } from 'react';
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

// ============================================================================
// Custom Hooks
// ============================================================================

// Base hook
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Workspace hooks
export const useWorkspaceState = () => {
  const { state } = useApp();
  return state.workspace;
};

export const useWorkspaceDispatch = () => {
  const { dispatch } = useApp();
  
  return useMemo(() => ({
    loadWorkspace: (workspace: Workspace) => 
      dispatch({ type: 'WORKSPACE_LOADED', payload: workspace }),
    
    setLoading: () => 
      dispatch({ type: 'WORKSPACE_LOADING' }),
    
    setError: (error: string) => 
      dispatch({ type: 'WORKSPACE_ERROR', payload: error }),
    
    clearWorkspace: () => 
      dispatch({ type: 'WORKSPACE_CLEAR' }),
  }), [dispatch]);
};

// Editor hooks
export const useEditorState = () => {
  const { state } = useApp();
  return state.editor;
};

export const useEditorDispatch = () => {
  const { dispatch } = useApp();
  
  return useMemo(() => ({
    setEditorRef: (ref: editor.IStandaloneCodeEditor | null) =>
      dispatch({ type: 'EDITOR_SET_REF', payload: ref }),
    
    updateContent: (content: string) =>
      dispatch({ type: 'EDITOR_UPDATE_CONTENT', payload: content }),
    
    updateCursor: (position: { line: number; column: number }) =>
      dispatch({ type: 'EDITOR_UPDATE_CURSOR', payload: position }),
  }), [dispatch]);
};

// UI hooks
export const useUIState = () => {
  const { state } = useApp();
  return state.ui;
};

export const useUIDispatch = () => {
  const { dispatch } = useApp();
  
  return useMemo(() => ({
    toggleSidebar: () =>
      dispatch({ type: 'UI_TOGGLE_SIDEBAR' }),
    
    setTheme: (theme: 'light' | 'dark') =>
      dispatch({ type: 'UI_SET_THEME', payload: theme }),
    
    updatePanelSize: (panel: keyof UIState['panelSizes'], size: number) =>
      dispatch({ type: 'UI_UPDATE_PANEL_SIZE', payload: { panel, size } }),
  }), [dispatch]);
};

// Combined selector hooks for specific use cases
export const useAppLoading = () => {
  const { workspace } = useApp().state;
  return workspace.isLoading;
};

export const useAppError = () => {
  const { workspace } = useApp().state;
  return workspace.error;
};

export const useCurrentTheme = () => {
  const { ui } = useApp().state;
  return ui.theme;
};

// Utility hook for persisting state to localStorage
export const usePersistAppState = () => {
  const { state } = useApp();
  
  React.useEffect(() => {
    const stateToSave = {
      theme: state.ui.theme,
      sidebarOpen: state.ui.sidebarOpen,
      panelSizes: state.ui.panelSizes,
    };
    
    localStorage.setItem('appState', JSON.stringify(stateToSave));
  }, [state.ui]);
};
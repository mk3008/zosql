/**
 * Functional Editor State Management
 * Separate file to maintain React refresh compatibility
 */

import type { editor } from 'monaco-editor';
import * as Option from './option.js';
import { 
  StateReducer, 
  AsyncState, 
  AsyncStateHelpers, 
  createAsyncState 
} from './state.js';

/**
 * Editor operation type for tracking editor actions
 */
export interface EditorOperation {
  type: 'insert' | 'replace' | 'clear' | 'focus' | 'position_change';
  timestamp: Date;
  content?: string;
  position?: { lineNumber: number; column: number };
  success: boolean;
  error?: string;
}

/**
 * Functional Editor State Type
 * Represents the complete editor state using functional patterns
 */
export interface EditorFunctionalState {
  editorRef: AsyncState<editor.IStandaloneCodeEditor, string>;
  content: Option.Option<string>;
  lastOperation: Option.Option<EditorOperation>;
  operationHistory: Array<EditorOperation>;
  cursorPosition: Option.Option<{ lineNumber: number; column: number }>;
  isReady: boolean;
}

/**
 * Editor Actions for functional state management
 */
export type EditorAction =
  | { type: 'EDITOR_SET_REF'; payload: { editorRef: editor.IStandaloneCodeEditor | null } }
  | { type: 'EDITOR_CONTENT_CHANGED'; payload: { content: string } }
  | { type: 'EDITOR_CURSOR_CHANGED'; payload: { position: { lineNumber: number; column: number } } }
  | { type: 'EDITOR_OPERATION_START'; payload: { operation: Omit<EditorOperation, 'timestamp' | 'success' | 'error'> } }
  | { type: 'EDITOR_OPERATION_SUCCESS'; payload: { operation: EditorOperation } }
  | { type: 'EDITOR_OPERATION_ERROR'; payload: { operation: EditorOperation; error: string } }
  | { type: 'EDITOR_CLEAR_HISTORY' }
  | { type: 'EDITOR_READY'; payload: { isReady: boolean } };

/**
 * Create initial functional editor state
 */
export const createInitialEditorState = (): EditorFunctionalState => ({
  editorRef: createAsyncState<editor.IStandaloneCodeEditor, string>(),
  content: Option.none,
  lastOperation: Option.none,
  operationHistory: [],
  cursorPosition: Option.none,
  isReady: false
});

/**
 * Editor state reducer using functional patterns
 */
export const editorReducerFunc: StateReducer<EditorFunctionalState, EditorAction> = (
  state,
  action
): EditorFunctionalState => {
  const addToHistory = (operation: EditorOperation) => ({
    ...state,
    operationHistory: [
      ...state.operationHistory,
      operation
    ].slice(-100), // Keep last 100 operations
    lastOperation: Option.some(operation)
  });

  switch (action.type) {
    case 'EDITOR_SET_REF':
      return {
        ...state,
        editorRef: action.payload.editorRef 
          ? AsyncStateHelpers.toSuccess(action.payload.editorRef)
          : createAsyncState<editor.IStandaloneCodeEditor, string>(),
        isReady: !!action.payload.editorRef
      };

    case 'EDITOR_CONTENT_CHANGED':
      return {
        ...state,
        content: Option.some(action.payload.content)
      };

    case 'EDITOR_CURSOR_CHANGED':
      return {
        ...state,
        cursorPosition: Option.some(action.payload.position)
      };

    case 'EDITOR_OPERATION_START':
      return state; // Just track the start, actual operation tracking happens on success/error

    case 'EDITOR_OPERATION_SUCCESS':
      return addToHistory(action.payload.operation);

    case 'EDITOR_OPERATION_ERROR':
      return addToHistory({
        ...action.payload.operation,
        success: false,
        error: action.payload.error
      });

    case 'EDITOR_CLEAR_HISTORY':
      return {
        ...state,
        operationHistory: [],
        lastOperation: Option.none
      };

    case 'EDITOR_READY':
      return {
        ...state,
        isReady: action.payload.isReady
      };

    default:
      return state;
  }
};

/**
 * Action creators for editor operations
 */
export const EditorActions = {
  setEditorRef: (editorRef: editor.IStandaloneCodeEditor | null): EditorAction => ({
    type: 'EDITOR_SET_REF',
    payload: { editorRef }
  }),

  contentChanged: (content: string): EditorAction => ({
    type: 'EDITOR_CONTENT_CHANGED',
    payload: { content }
  }),

  cursorChanged: (position: { lineNumber: number; column: number }): EditorAction => ({
    type: 'EDITOR_CURSOR_CHANGED',
    payload: { position }
  }),

  operationStart: (operation: Omit<EditorOperation, 'timestamp' | 'success' | 'error'>): EditorAction => ({
    type: 'EDITOR_OPERATION_START',
    payload: { operation }
  }),

  operationSuccess: (operation: EditorOperation): EditorAction => ({
    type: 'EDITOR_OPERATION_SUCCESS',
    payload: { operation }
  }),

  operationError: (operation: EditorOperation, error: string): EditorAction => ({
    type: 'EDITOR_OPERATION_ERROR',
    payload: { operation, error }
  }),

  clearHistory: (): EditorAction => ({
    type: 'EDITOR_CLEAR_HISTORY'
  }),

  setReady: (isReady: boolean): EditorAction => ({
    type: 'EDITOR_READY',
    payload: { isReady }
  })
};

/**
 * Functional editor selectors
 */
export const EditorSelectors = {
  getEditorRef: (state: EditorFunctionalState): Option.Option<editor.IStandaloneCodeEditor> =>
    AsyncStateHelpers.getDataOption(state.editorRef),

  getContent: (state: EditorFunctionalState): Option.Option<string> =>
    state.content,

  getCursorPosition: (state: EditorFunctionalState): Option.Option<{ lineNumber: number; column: number }> =>
    state.cursorPosition,

  getLastOperation: (state: EditorFunctionalState): Option.Option<EditorOperation> =>
    state.lastOperation,

  getOperationHistory: (state: EditorFunctionalState) =>
    state.operationHistory,

  getRecentOperations: (state: EditorFunctionalState, count: number = 10) =>
    state.operationHistory.slice(-count),

  getSuccessfulOperations: (state: EditorFunctionalState) =>
    state.operationHistory.filter(op => op.success),

  getFailedOperations: (state: EditorFunctionalState) =>
    state.operationHistory.filter(op => !op.success),

  isReady: (state: EditorFunctionalState): boolean =>
    state.isReady && AsyncStateHelpers.isSuccess(state.editorRef),

  getEditorStatistics: (state: EditorFunctionalState) => {
    const totalOps = state.operationHistory.length;
    const successfulOps = state.operationHistory.filter(op => op.success).length;
    const failedOps = totalOps - successfulOps;
    const successRate = totalOps > 0 ? (successfulOps / totalOps) * 100 : 0;

    const operationTypes = state.operationHistory.reduce((acc, op) => {
      acc[op.type] = (acc[op.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOperations: totalOps,
      successfulOperations: successfulOps,
      failedOperations: failedOps,
      successRate,
      operationTypes,
      hasEditor: AsyncStateHelpers.isSuccess(state.editorRef),
      isReady: state.isReady,
      hasContent: Option.isSome(state.content)
    };
  }
};
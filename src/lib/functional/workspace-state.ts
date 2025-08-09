/**
 * Functional Workspace State Management
 * Separate file to maintain React refresh compatibility
 */

import { Workspace } from '@shared/types';
import * as Option from './option.js';
import { 
  AsyncState, 
  AsyncStateHelpers, 
  createAsyncState,
  StateReducer
} from './state.js';

/**
 * Functional Workspace State Type
 * Represents the complete workspace state using functional patterns
 */
export interface WorkspaceFunctionalState {
  workspace: AsyncState<Workspace, string>;
  lastOperation: Option.Option<string>;
  operationHistory: Array<{ operation: string; timestamp: Date; success: boolean }>;
  validationCache: Option.Option<{ isValid: boolean; errors: string[]; timestamp: Date }>;
}

/**
 * Workspace Actions for functional state management
 */
export type WorkspaceAction =
  | { type: 'WORKSPACE_LOAD_START' }
  | { type: 'WORKSPACE_LOAD_SUCCESS'; payload: { workspace: Workspace } }
  | { type: 'WORKSPACE_LOAD_ERROR'; payload: { error: string } }
  | { type: 'WORKSPACE_CREATE_START' }
  | { type: 'WORKSPACE_CREATE_SUCCESS'; payload: { workspace: Workspace } }
  | { type: 'WORKSPACE_CREATE_ERROR'; payload: { error: string } }
  | { type: 'WORKSPACE_UPDATE_CTE_START' }
  | { type: 'WORKSPACE_UPDATE_CTE_SUCCESS'; payload: { workspace: Workspace } }
  | { type: 'WORKSPACE_UPDATE_CTE_ERROR'; payload: { error: string } }
  | { type: 'WORKSPACE_CLEAR_SUCCESS' }
  | { type: 'WORKSPACE_CLEAR_ERROR'; payload: { error: string } }
  | { type: 'WORKSPACE_SET_VALIDATION'; payload: { isValid: boolean; errors: string[] } }
  | { type: 'WORKSPACE_RESET_ERROR' }
  | { type: 'WORKSPACE_CLEAR_VALIDATION_CACHE' };

/**
 * Create initial functional workspace state
 */
export const createInitialWorkspaceState = (): WorkspaceFunctionalState => ({
  workspace: createAsyncState<Workspace, string>(),
  lastOperation: Option.none,
  operationHistory: [],
  validationCache: Option.none
});

/**
 * Workspace state reducer using functional patterns
 */
export const workspaceReducerFunc: StateReducer<WorkspaceFunctionalState, WorkspaceAction> = (
  state,
  action
): WorkspaceFunctionalState => {
  const addToHistory = (operation: string, success: boolean) => ({
    ...state,
    operationHistory: [
      ...state.operationHistory,
      { operation, timestamp: new Date(), success }
    ].slice(-50), // Keep last 50 operations
    lastOperation: Option.some(operation)
  });

  switch (action.type) {
    case 'WORKSPACE_LOAD_START':
      return {
        ...state,
        workspace: AsyncStateHelpers.toLoading()
      };

    case 'WORKSPACE_LOAD_SUCCESS':
      return {
        ...addToHistory('load', true),
        workspace: AsyncStateHelpers.toSuccess(action.payload.workspace)
      };

    case 'WORKSPACE_LOAD_ERROR':
      return {
        ...addToHistory('load', false),
        workspace: AsyncStateHelpers.toError(action.payload.error)
      };

    case 'WORKSPACE_CREATE_START':
      return {
        ...state,
        workspace: AsyncStateHelpers.toLoading(),
        validationCache: Option.none // Clear validation cache
      };

    case 'WORKSPACE_CREATE_SUCCESS':
      return {
        ...addToHistory('create', true),
        workspace: AsyncStateHelpers.toSuccess(action.payload.workspace),
        validationCache: Option.none
      };

    case 'WORKSPACE_CREATE_ERROR':
      return {
        ...addToHistory('create', false),
        workspace: AsyncStateHelpers.toError(action.payload.error)
      };

    case 'WORKSPACE_UPDATE_CTE_START':
      return {
        ...state,
        validationCache: Option.none // Invalidate cache on CTE updates
      };

    case 'WORKSPACE_UPDATE_CTE_SUCCESS':
      return {
        ...addToHistory('updateCTE', true),
        workspace: AsyncStateHelpers.toSuccess(action.payload.workspace)
      };

    case 'WORKSPACE_UPDATE_CTE_ERROR':
      return {
        ...addToHistory('updateCTE', false),
        workspace: AsyncStateHelpers.toError(action.payload.error)
      };

    case 'WORKSPACE_CLEAR_SUCCESS':
      return {
        ...addToHistory('clear', true),
        workspace: createAsyncState<Workspace, string>(),
        validationCache: Option.none
      };

    case 'WORKSPACE_CLEAR_ERROR':
      return {
        ...addToHistory('clear', false),
        workspace: AsyncStateHelpers.toError(action.payload.error)
      };

    case 'WORKSPACE_SET_VALIDATION':
      return {
        ...state,
        validationCache: Option.some({
          isValid: action.payload.isValid,
          errors: action.payload.errors,
          timestamp: new Date()
        })
      };

    case 'WORKSPACE_RESET_ERROR':
      return {
        ...state,
        workspace: AsyncStateHelpers.isError(state.workspace) 
          ? createAsyncState<Workspace, string>()
          : state.workspace
      };

    case 'WORKSPACE_CLEAR_VALIDATION_CACHE':
      return {
        ...state,
        validationCache: Option.none
      };

    default:
      return state;
  }
};

/**
 * Action creators for workspace operations
 */
export const WorkspaceActions = {
  loadStart: (): WorkspaceAction => ({ type: 'WORKSPACE_LOAD_START' }),
  loadSuccess: (workspace: Workspace): WorkspaceAction => ({ 
    type: 'WORKSPACE_LOAD_SUCCESS', 
    payload: { workspace } 
  }),
  loadError: (error: string): WorkspaceAction => ({ 
    type: 'WORKSPACE_LOAD_ERROR', 
    payload: { error } 
  }),

  createStart: (): WorkspaceAction => ({ type: 'WORKSPACE_CREATE_START' }),
  createSuccess: (workspace: Workspace): WorkspaceAction => ({ 
    type: 'WORKSPACE_CREATE_SUCCESS', 
    payload: { workspace } 
  }),
  createError: (error: string): WorkspaceAction => ({ 
    type: 'WORKSPACE_CREATE_ERROR', 
    payload: { error } 
  }),

  updateCTEStart: (): WorkspaceAction => ({ type: 'WORKSPACE_UPDATE_CTE_START' }),
  updateCTESuccess: (workspace: Workspace): WorkspaceAction => ({ 
    type: 'WORKSPACE_UPDATE_CTE_SUCCESS', 
    payload: { workspace } 
  }),
  updateCTEError: (error: string): WorkspaceAction => ({ 
    type: 'WORKSPACE_UPDATE_CTE_ERROR', 
    payload: { error } 
  }),

  clearSuccess: (): WorkspaceAction => ({ type: 'WORKSPACE_CLEAR_SUCCESS' }),
  clearError: (error: string): WorkspaceAction => ({ 
    type: 'WORKSPACE_CLEAR_ERROR', 
    payload: { error } 
  }),

  setValidation: (isValid: boolean, errors: string[]): WorkspaceAction => ({ 
    type: 'WORKSPACE_SET_VALIDATION', 
    payload: { isValid, errors } 
  }),

  clearValidationCache: (): WorkspaceAction => ({ type: 'WORKSPACE_CLEAR_VALIDATION_CACHE' }),
  clearErrorAction: (): WorkspaceAction => ({ type: 'WORKSPACE_RESET_ERROR' })
};

/**
 * Functional workspace selectors
 */
export const WorkspaceSelectors = {
  getWorkspace: (state: WorkspaceFunctionalState): Option.Option<Workspace> =>
    AsyncStateHelpers.getDataOption(state.workspace),

  getWorkspaceError: (state: WorkspaceFunctionalState): Option.Option<string> =>
    AsyncStateHelpers.getErrorOption(state.workspace),

  isLoading: (state: WorkspaceFunctionalState): boolean =>
    AsyncStateHelpers.isLoading(state.workspace),

  getLastOperation: (state: WorkspaceFunctionalState): Option.Option<string> =>
    state.lastOperation,

  getOperationHistory: (state: WorkspaceFunctionalState) => 
    state.operationHistory,

  getRecentOperations: (state: WorkspaceFunctionalState, count: number = 10) =>
    state.operationHistory.slice(-count),

  getSuccessfulOperations: (state: WorkspaceFunctionalState) =>
    state.operationHistory.filter(op => op.success),

  getFailedOperations: (state: WorkspaceFunctionalState) =>
    state.operationHistory.filter(op => !op.success),

  getValidationCache: (state: WorkspaceFunctionalState): Option.Option<{ isValid: boolean; errors: string[]; timestamp: Date }> =>
    state.validationCache,

  isValidationCacheValid: (state: WorkspaceFunctionalState, maxAgeMs: number = 60000): boolean => {
    if (Option.isNone(state.validationCache)) {
      return false;
    }
    const cache = state.validationCache.value;
    const age = Date.now() - cache.timestamp.getTime();
    return age < maxAgeMs;
  },

  getWorkspaceStatistics: (state: WorkspaceFunctionalState) => {
    const totalOps = state.operationHistory.length;
    const successfulOps = state.operationHistory.filter(op => op.success).length;
    const failedOps = totalOps - successfulOps;
    const successRate = totalOps > 0 ? (successfulOps / totalOps) * 100 : 0;

    return {
      totalOperations: totalOps,
      successfulOperations: successfulOps,
      failedOperations: failedOps,
      successRate,
      hasWorkspace: AsyncStateHelpers.isSuccess(state.workspace),
      isLoading: AsyncStateHelpers.isLoading(state.workspace)
    };
  }
};
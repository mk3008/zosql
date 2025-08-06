/**
 * useNewWorkspace Hook - Functional Programming Approach
 * Pure functional React Hook for new workspace creation
 * Avoids classes, embraces functional composition and immutability
 */

import { useCallback, useMemo, useReducer } from 'react';
import { WorkspaceEntity } from '@core/entities/workspace';

// Pure functions for workspace creation logic
const validateWorkspaceInput = (name: string, sql: string): boolean =>
  name.trim().length > 0 && sql.trim().length > 0;

const formatValidationError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error occurred';

const createWorkspaceRequest = async (name: string, sql: string): Promise<WorkspaceEntity> => {
  // Instead of using Command class, use pure function approach
  const { createWorkspace } = await import('@core/services/workspace-service');
  return createWorkspace({ name: name.trim(), sql: sql.trim() });
};

// State management using reducer for better functional approach
type WorkspaceFormState = {
  readonly name: string;
  readonly sql: string;
  readonly isLoading: boolean;
  readonly error: string | null;
};

type WorkspaceFormAction =
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_SQL'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_FORM' };

const initialState: WorkspaceFormState = {
  name: '',
  sql: '',
  isLoading: false,
  error: null,
};

const workspaceFormReducer = (
  state: WorkspaceFormState,
  action: WorkspaceFormAction
): WorkspaceFormState => {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, name: action.payload };
    case 'SET_SQL':
      return { ...state, sql: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
};

/**
 * Hook return type
 */
export interface UseNewWorkspaceReturn {
  readonly name: string;
  readonly sql: string;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly canExecute: boolean;
  readonly setName: (name: string) => void;
  readonly setSql: (sql: string) => void;
  readonly createWorkspace: () => Promise<WorkspaceEntity | null>;
  readonly clearError: () => void;
  readonly resetForm: () => void;
}

/**
 * Functional Hook for managing new workspace creation
 * Uses reducer pattern and pure functions for better maintainability
 * @param onWorkspaceCreated - Callback when workspace is successfully created
 */
export const useNewWorkspace = (
  onWorkspaceCreated?: (workspace: WorkspaceEntity) => void
): UseNewWorkspaceReturn => {
  const [state, dispatch] = useReducer(workspaceFormReducer, initialState);

  // Computed property using pure function
  const canExecute = useMemo(() => 
    !state.isLoading && validateWorkspaceInput(state.name, state.sql),
    [state.isLoading, state.name, state.sql]
  );

  // Action creators as pure functions
  const setName = useCallback((name: string) => {
    dispatch({ type: 'SET_NAME', payload: name });
  }, []);

  const setSql = useCallback((sql: string) => {
    dispatch({ type: 'SET_SQL', payload: sql });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
  }, []);

  // Main business logic as async function
  const createWorkspace = useCallback(async (): Promise<WorkspaceEntity | null> => {
    if (!canExecute) {
      return null;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const workspace = await createWorkspaceRequest(state.name, state.sql);
      
      // Success side effects
      onWorkspaceCreated?.(workspace);
      dispatch({ type: 'RESET_FORM' });
      
      return workspace;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: formatValidationError(error) });
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [canExecute, state.name, state.sql, onWorkspaceCreated]);

  return {
    name: state.name,
    sql: state.sql,
    isLoading: state.isLoading,
    error: state.error,
    canExecute,
    setName,
    setSql,
    createWorkspace,
    clearError,
    resetForm,
  };
};
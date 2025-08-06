/**
 * WorkspaceContext V2 - Functional Programming Approach
 * Pure functional state management using useReducer pattern
 */

import React, { createContext, useContext, useEffect, useReducer, useCallback, useMemo } from 'react';
import { Workspace, ApiResponse } from '@shared/types';
import { WorkspaceUseCase } from '@core/usecases/workspace-usecase';
import { LocalStorageWorkspaceRepository } from '@adapters/repositories/localStorage-workspace-repository';
import { RawSqlParser } from '@adapters/parsers/rawsql-parser';
import { CTEDependencyResolverImpl } from '@core/usecases/cte-dependency-resolver';

// State type - immutable data structure
interface WorkspaceState {
  readonly workspace: Workspace | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

// Action types - discriminated union for type safety
type WorkspaceAction =
  | { type: 'LOADING_START' }
  | { type: 'LOADING_END' }
  | { type: 'SET_WORKSPACE'; payload: Workspace }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_WORKSPACE' };

// Initial state - pure data
const initialState: WorkspaceState = {
  workspace: null,
  isLoading: false,
  error: null,
};

// Pure reducer function
const workspaceReducer = (state: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
  switch (action.type) {
    case 'LOADING_START':
      return { ...state, isLoading: true, error: null };
    
    case 'LOADING_END':
      return { ...state, isLoading: false };
    
    case 'SET_WORKSPACE':
      return { ...state, workspace: action.payload, error: null };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'CLEAR_WORKSPACE':
      return { ...state, workspace: null };
    
    default:
      return state;
  }
};

// Context types
interface WorkspaceContextType {
  // State (readonly)
  readonly state: WorkspaceState;
  
  // Actions (pure functions)
  readonly actions: {
    createWorkspace: (params: { name: string; sql: string; originalFilePath?: string }) => Promise<void>;
    loadWorkspace: () => Promise<void>;
    updateCTE: (cteName: string, query: string, description?: string) => Promise<void>;
    generateExecutableCTE: (cteName: string) => Promise<string>;
    clearWorkspace: () => Promise<void>;
    validateWorkspace: () => Promise<{ isValid: boolean; errors: string[] }>;
  };
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Custom hook for consuming context
export const useWorkspaceV2 = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceV2 must be used within a WorkspaceProviderV2');
  }
  return context;
};

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

// Helper function to handle API results (pure)
const handleApiResult = <T,>(result: ApiResponse<T>): T => {
  if (!result.success) {
    throw new Error(result.error || 'Unknown error');
  }
  return result.data as T;
};

export const WorkspaceProviderV2: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  // Memoize use case instance
  const workspaceUseCase = useMemo(() => 
    new WorkspaceUseCase(
      new LocalStorageWorkspaceRepository(),
      new RawSqlParser(),
      new CTEDependencyResolverImpl()
    ), []
  );

  // Action creators using useCallback for stable references
  const createWorkspace = useCallback(async (params: { 
    name: string; 
    sql: string; 
    originalFilePath?: string 
  }): Promise<void> => {
    dispatch({ type: 'LOADING_START' });
    
    try {
      const result = await workspaceUseCase.createWorkspace(params);
      const newWorkspace = handleApiResult(result);
      dispatch({ type: 'SET_WORKSPACE', payload: newWorkspace });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workspace';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw err;
    } finally {
      dispatch({ type: 'LOADING_END' });
    }
  }, [workspaceUseCase]);

  const loadWorkspace = useCallback(async (): Promise<void> => {
    dispatch({ type: 'LOADING_START' });
    
    try {
      const result = await workspaceUseCase.loadWorkspace();
      const loadedWorkspace = handleApiResult(result);
      if (loadedWorkspace) {
        dispatch({ type: 'SET_WORKSPACE', payload: loadedWorkspace });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workspace';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'LOADING_END' });
    }
  }, [workspaceUseCase]);

  const updateCTE = useCallback(async (
    cteName: string, 
    query: string, 
    description?: string
  ): Promise<void> => {
    dispatch({ type: 'CLEAR_ERROR' });
    
    try {
      const result = await workspaceUseCase.updateCTE({ cteName, query, description });
      handleApiResult(result);
      
      // Reload workspace to get updated data
      await loadWorkspace();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update CTE';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw err;
    }
  }, [workspaceUseCase, loadWorkspace]);

  const generateExecutableCTE = useCallback(async (cteName: string): Promise<string> => {
    try {
      const result = await workspaceUseCase.generateExecutableCTE(cteName);
      return handleApiResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate executable CTE';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw err;
    }
  }, [workspaceUseCase]);

  const clearWorkspace = useCallback(async (): Promise<void> => {
    dispatch({ type: 'CLEAR_WORKSPACE' });
    dispatch({ type: 'CLEAR_ERROR' });
    
    try {
      const result = await workspaceUseCase.clearWorkspace();
      handleApiResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear workspace';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw err;
    }
  }, [workspaceUseCase]);

  const validateWorkspace = useCallback(async (): Promise<{ isValid: boolean; errors: string[] }> => {
    if (!state.workspace) {
      return { isValid: false, errors: ['No workspace loaded'] };
    }

    try {
      const result = await workspaceUseCase.validateWorkspace();
      return handleApiResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate workspace';
      return { isValid: false, errors: [errorMessage] };
    }
  }, [workspaceUseCase, state.workspace]);

  // Auto-load workspace on mount
  useEffect(() => {
    loadWorkspace();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<WorkspaceContextType>(() => ({
    state,
    actions: {
      createWorkspace,
      loadWorkspace,
      updateCTE,
      generateExecutableCTE,
      clearWorkspace,
      validateWorkspace,
    },
  }), [
    state,
    createWorkspace,
    loadWorkspace,
    updateCTE,
    generateExecutableCTE,
    clearWorkspace,
    validateWorkspace,
  ]);

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
};

// Selector hooks for granular subscriptions (prevents unnecessary re-renders)
export const useWorkspaceData = () => {
  const { state } = useWorkspaceV2();
  return state.workspace;
};

export const useWorkspaceLoading = () => {
  const { state } = useWorkspaceV2();
  return state.isLoading;
};

export const useWorkspaceError = () => {
  const { state } = useWorkspaceV2();
  return state.error;
};

export const useWorkspaceActions = () => {
  const { actions } = useWorkspaceV2();
  return actions;
};
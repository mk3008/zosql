import React, { createContext, useContext, useEffect, useState, useReducer, useMemo, useCallback } from 'react';
import { Workspace, ApiResponse } from '@shared/types';
import { WorkspaceUseCase } from '@core/usecases/workspace-usecase';
import { LocalStorageWorkspaceRepository } from '@adapters/repositories/localStorage-workspace-repository';
import { RawSqlParser } from '@adapters/parsers/rawsql-parser';
import { CTEDependencyResolverImpl } from '@core/usecases/cte-dependency-resolver';
import * as Option from '../../lib/functional/option.js';
import {
  WorkspaceFunctionalState,
  WorkspaceAction,
  createInitialWorkspaceState,
  workspaceReducerFunc,
  WorkspaceActions,
  WorkspaceSelectors
} from '../../lib/functional/workspace-state.js';

interface WorkspaceContextType {
  workspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createWorkspace: (params: { name: string; sql: string; originalFilePath?: string }) => Promise<void>;
  loadWorkspace: () => Promise<void>;
  updateCTE: (cteName: string, query: string, description?: string) => Promise<void>;
  generateExecutableCTE: (cteName: string) => Promise<string>;
  clearWorkspace: () => Promise<void>;
  validateWorkspace: () => Promise<{ isValid: boolean; errors: string[] }>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);


interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize use case with dependencies (memoized to prevent re-creation)
  const workspaceUseCase = useMemo(() => new WorkspaceUseCase(
    new LocalStorageWorkspaceRepository(),
    new RawSqlParser(),
    new CTEDependencyResolverImpl()
  ), []);

  const handleResult = useCallback(<T,>(result: ApiResponse<T>): T => {
    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }
    return result.data as T;
  }, []);

  const createWorkspace = async (params: { name: string; sql: string; originalFilePath?: string }): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await workspaceUseCase.createWorkspace(params);
      const newWorkspace = handleResult(result);
      setWorkspace(newWorkspace);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkspace = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await workspaceUseCase.loadWorkspace();
      const loadedWorkspace = handleResult(result);
      setWorkspace(loadedWorkspace);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workspace';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceUseCase, handleResult]);

  const updateCTE = async (cteName: string, query: string, description?: string): Promise<void> => {
    setError(null);
    
    try {
      const result = await workspaceUseCase.updateCTE({ cteName, query, description });
      handleResult(result);
      
      // Reload workspace to get updated data
      await loadWorkspace();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update CTE';
      setError(errorMessage);
      throw err;
    }
  };

  const generateExecutableCTE = async (cteName: string): Promise<string> => {
    setError(null);
    
    try {
      const result = await workspaceUseCase.generateExecutableCTE(cteName);
      return handleResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate executable CTE';
      setError(errorMessage);
      throw err;
    }
  };

  const clearWorkspace = async (): Promise<void> => {
    setError(null);
    
    try {
      const result = await workspaceUseCase.clearWorkspace();
      handleResult(result);
      setWorkspace(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear workspace';
      setError(errorMessage);
      throw err;
    }
  };

  const validateWorkspace = async (): Promise<{ isValid: boolean; errors: string[] }> => {
    setError(null);
    
    try {
      const result = await workspaceUseCase.validateWorkspace();
      return handleResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate workspace';
      setError(errorMessage);
      throw err;
    }
  };

  // Load workspace on mount
  useEffect(() => {
    const initializeWorkspace = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await workspaceUseCase.loadWorkspace();
        const loadedWorkspace = handleResult(result);
        setWorkspace(loadedWorkspace);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load workspace';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeWorkspace();
  }, [workspaceUseCase, handleResult]);

  const value: WorkspaceContextType = {
    workspace,
    isLoading,
    error,
    createWorkspace,
    loadWorkspace,
    updateCTE,
    generateExecutableCTE,
    clearWorkspace,
    validateWorkspace
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

// ===== NEW FUNCTIONAL STATE MANAGEMENT - BACKWARD COMPATIBLE =====

/**
 * Functional workspace context type with enhanced features
 */
interface WorkspaceContextFunctionalType extends WorkspaceContextType {
  // Functional state access
  functionalState: WorkspaceFunctionalState;
  dispatch: React.Dispatch<WorkspaceAction>;
  
  // Enhanced selectors
  getWorkspaceOption: () => Option.Option<Workspace>;
  getErrorOption: () => Option.Option<string>;
  getLastOperation: () => Option.Option<string>;
  getOperationHistory: () => Array<{ operation: string; timestamp: Date; success: boolean }>;
  getWorkspaceStatistics: () => ReturnType<typeof WorkspaceSelectors.getWorkspaceStatistics>;
  
  // Cache operations
  isValidationCacheValid: (maxAgeMs?: number) => boolean;
  clearValidationCache: () => void;
  clearError: () => void;
}

/**
 * Enhanced workspace provider with functional state management
 */
export const WorkspaceProviderFunc: React.FC<WorkspaceProviderProps> = ({ children }) => {
  // Original state for backward compatibility
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Functional state management
  const [functionalState, dispatch] = useReducer(
    workspaceReducerFunc,
    createInitialWorkspaceState()
  );

  // Initialize use case with dependencies (memoized to prevent re-creation)
  const workspaceUseCase = useMemo(() => new WorkspaceUseCase(
    new LocalStorageWorkspaceRepository(),
    new RawSqlParser(),
    new CTEDependencyResolverImpl()
  ), []);

  const handleResult = <T,>(result: ApiResponse<T>): T => {
    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }
    return result.data as T;
  };

  // Sync original state with functional state
  useEffect(() => {
    const workspaceOption = WorkspaceSelectors.getWorkspace(functionalState);
    const errorOption = WorkspaceSelectors.getWorkspaceError(functionalState);
    const loadingState = WorkspaceSelectors.isLoading(functionalState);

    setWorkspace(Option.isSome(workspaceOption) ? workspaceOption.value : null);
    setError(Option.isSome(errorOption) ? errorOption.value : null);
    setIsLoading(loadingState);
  }, [functionalState]);

  const createWorkspace = async (params: { name: string; sql: string; originalFilePath?: string }): Promise<void> => {
    dispatch(WorkspaceActions.createStart());
    
    try {
      const result = await workspaceUseCase.createWorkspace(params);
      const newWorkspace = handleResult(result);
      if (newWorkspace) {
        dispatch(WorkspaceActions.createSuccess(newWorkspace));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workspace';
      dispatch(WorkspaceActions.createError(errorMessage));
      throw err;
    }
  };

  const loadWorkspace = useCallback(async (): Promise<void> => {
    dispatch(WorkspaceActions.loadStart());
    
    try {
      const result = await workspaceUseCase.loadWorkspace();
      const loadedWorkspace = handleResult(result);
      if (loadedWorkspace) {
        dispatch(WorkspaceActions.loadSuccess(loadedWorkspace));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workspace';
      dispatch(WorkspaceActions.loadError(errorMessage));
    }
  }, [workspaceUseCase]);

  const updateCTE = async (cteName: string, query: string, description?: string): Promise<void> => {
    dispatch(WorkspaceActions.updateCTEStart());
    
    try {
      const result = await workspaceUseCase.updateCTE({ cteName, query, description });
      handleResult(result);
      
      // Reload workspace to get updated data
      await loadWorkspace();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update CTE';
      dispatch(WorkspaceActions.updateCTEError(errorMessage));
      throw err;
    }
  };

  const generateExecutableCTE = async (cteName: string): Promise<string> => {
    try {
      const result = await workspaceUseCase.generateExecutableCTE(cteName);
      return handleResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate executable CTE';
      setError(errorMessage);
      throw err;
    }
  };

  const clearWorkspace = async (): Promise<void> => {
    try {
      const result = await workspaceUseCase.clearWorkspace();
      handleResult(result);
      dispatch(WorkspaceActions.clearSuccess());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear workspace';
      dispatch(WorkspaceActions.clearError(errorMessage));
      throw err;
    }
  };

  const validateWorkspace = async (): Promise<{ isValid: boolean; errors: string[] }> => {
    // Check cache first
    if (WorkspaceSelectors.isValidationCacheValid(functionalState)) {
      const cache = WorkspaceSelectors.getValidationCache(functionalState);
      if (Option.isSome(cache)) {
        return { isValid: cache.value.isValid, errors: cache.value.errors };
      }
    }

    try {
      const result = await workspaceUseCase.validateWorkspace();
      const validation = handleResult(result);
      
      // Cache the validation result
      dispatch(WorkspaceActions.setValidation(validation.isValid, validation.errors));
      
      return validation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate workspace';
      setError(errorMessage);
      throw err;
    }
  };

  // Enhanced functional methods
  const getWorkspaceOption = () => WorkspaceSelectors.getWorkspace(functionalState);
  const getErrorOption = () => WorkspaceSelectors.getWorkspaceError(functionalState);
  const getLastOperation = () => WorkspaceSelectors.getLastOperation(functionalState);
  const getOperationHistory = () => WorkspaceSelectors.getOperationHistory(functionalState);
  const getWorkspaceStatistics = () => WorkspaceSelectors.getWorkspaceStatistics(functionalState);
  
  const isValidationCacheValid = (maxAgeMs?: number) => 
    WorkspaceSelectors.isValidationCacheValid(functionalState, maxAgeMs);
  
  const clearValidationCache = () => dispatch(WorkspaceActions.clearValidationCache());
  const clearError = () => dispatch(WorkspaceActions.clearErrorAction());

  // Load workspace on mount
  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const value: WorkspaceContextFunctionalType = {
    // Original interface
    workspace,
    isLoading,
    error,
    createWorkspace,
    loadWorkspace,
    updateCTE,
    generateExecutableCTE,
    clearWorkspace,
    validateWorkspace,
    
    // Functional enhancements
    functionalState,
    dispatch,
    getWorkspaceOption,
    getErrorOption,
    getLastOperation,
    getOperationHistory,
    getWorkspaceStatistics,
    isValidationCacheValid,
    clearValidationCache,
    clearError
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};


import React, { createContext, useContext, useEffect, useState } from 'react';
import { Workspace, ApiResponse } from '@shared/types';
import { WorkspaceUseCase } from '@core/usecases/workspace-usecase';
import { LocalStorageWorkspaceRepository } from '@adapters/repositories/localStorage-workspace-repository';
import { RawSqlParser } from '@adapters/parsers/rawsql-parser';
import { CTEDependencyResolverImpl } from '@core/usecases/cte-dependency-resolver';

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

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize use case with dependencies
  const workspaceUseCase = new WorkspaceUseCase(
    new LocalStorageWorkspaceRepository(),
    new RawSqlParser(),
    new CTEDependencyResolverImpl()
  );

  const handleResult = <T,>(result: ApiResponse<T>): T => {
    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }
    return result.data as T;
  };

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

  const loadWorkspace = async (): Promise<void> => {
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
    loadWorkspace();
  }, []);

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
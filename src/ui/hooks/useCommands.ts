/**
 * Commands Hook
 * UI Layer - React hook for command execution
 */

import { useState, useRef, useCallback } from 'react';
// CommandExecutor removed
// ExecuteQueryCommand removed
import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlModelEntity } from '@core/entities/sql-model';

export interface UseCommandsProps {
  workspace: WorkspaceEntity | null;
  tabModelMap: Map<string, SqlModelEntity>;
  activeTab: {
    id: string;
    content: string;
    type: 'main' | 'cte' | 'values' | 'formatter' | 'condition';
  } | null;
}

export interface UseCommandsResult {
  executeQuery: () => Promise<void>;
  isExecuting: boolean;
  lastError: string | null;
}

/**
 * Hook to manage command execution in UI
 */
export function useCommands({
  workspace,
  tabModelMap,
  activeTab
}: UseCommandsProps): UseCommandsResult {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Use ref to avoid stale closures
  const commandContextRef = useRef<UseCommandsProps>({ workspace, tabModelMap, activeTab });
  commandContextRef.current = { workspace, tabModelMap, activeTab };
  
  const executeQuery = useCallback(async () => {
    const { workspace: _workspace, tabModelMap: _tabModelMap, activeTab } = commandContextRef.current;
    
    if (!activeTab || !activeTab.content.trim()) {
      setLastError('No query to execute');
      return;
    }
    
    setIsExecuting(true);
    setLastError(null);
    
    try {
      // Command pattern removed - implementing functional approach
      console.warn('[HOOKS] ExecuteQueryCommand removed - needs functional implementation');
      
      // TODO: Implement query execution using functional services
      // For now, return placeholder result
      const result = {
        success: false,
        error: 'Query execution functionality needs to be reimplemented without Command pattern'
      };
      
      if (!result.success) {
        setLastError(result.error || 'Query execution failed');
      }
      
      // The result should be handled by the parent component
      // For example: onQueryResult(result);
      
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsExecuting(false);
    }
  }, []);
  
  return {
    executeQuery,
    isExecuting,
    lastError
  };
}
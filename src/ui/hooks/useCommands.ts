/**
 * Commands Hook
 * UI Layer - React hook for command execution
 */

import { useState, useRef, useCallback } from 'react';
import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlModelEntity } from '@core/entities/sql-model';
import { executeSqlSafely } from '@core/services/sql-execution-service';

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
    const { workspace, tabModelMap, activeTab } = commandContextRef.current;
    
    if (!activeTab || !activeTab.content.trim()) {
      setLastError('No query to execute');
      return;
    }
    
    if (!workspace) {
      setLastError('No workspace available');
      return;
    }
    
    setIsExecuting(true);
    setLastError(null);
    
    try {
      // Get the SQL model for the active tab
      const sqlModel = tabModelMap.get(activeTab.id);
      
      // Create execution parameters
      const executionParams = {
        sql: activeTab.content,
        workspace,
        sqlModel: sqlModel || null,
        tabType: activeTab.type
      };
      
      // Execute using functional service
      const result = await executeSqlSafely(executionParams);
      
      if (result.status !== 'completed' || result.errors.length > 0) {
        const errorMessage = result.errors[0]?.message || 'Query execution failed';
        setLastError(errorMessage);
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
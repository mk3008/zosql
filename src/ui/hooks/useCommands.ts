/**
 * Commands Hook
 * UI Layer - React hook for command execution
 */

import { useState, useCallback, useRef } from 'react';
import { commandExecutor } from '@core/services/command-executor';
import { ExecuteQueryCommand, ExecuteQueryContext } from '@core/commands/execute-query-command';
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
    const { workspace, tabModelMap, activeTab } = commandContextRef.current;
    
    if (!activeTab || !activeTab.content.trim()) {
      setLastError('No query to execute');
      return;
    }
    
    setIsExecuting(true);
    setLastError(null);
    
    try {
      // Create command context
      const context: ExecuteQueryContext = {
        workspace,
        sqlModel: tabModelMap.get(activeTab.id) || null,
        tabContent: activeTab.content,
        tabType: activeTab.type
      };
      
      // Create and execute command
      const command = new ExecuteQueryCommand(context);
      const result = await commandExecutor.execute(command);
      
      // Handle result (this would be passed to a callback or state setter)
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
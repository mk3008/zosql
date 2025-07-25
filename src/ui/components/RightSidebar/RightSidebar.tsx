/**
 * Right Sidebar Component
 * Manages the tabbed interface for SQL, conditions, and formatter
 */

import React, { useState, useEffect } from 'react';
import { WorkspaceEntity } from '@shared/types';
import { useToast } from '@ui/hooks/useToast';
import { Toast } from '../Toast';
import { SqlTab } from './SqlTab';
import { ConditionTab } from './ConditionTab';
import { FormatterTab } from './FormatterTab';

type RightSidebarTab = 'sql' | 'condition' | 'formatter';

interface RightSidebarProps {
  workspace?: WorkspaceEntity | null;
  lastExecutedSql?: string;
}

const RightSidebarComponent: React.FC<RightSidebarProps> = ({ workspace, lastExecutedSql }) => {
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('sql');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filterConditionsJson, setFilterConditionsJson] = useState('{}');
  const [sqlFormatterJson, setSqlFormatterJson] = useState('{}');
  const { toast, hideToast } = useToast();

  // Update local state when workspace or refreshTrigger changes
  useEffect(() => {
    console.log('[DEBUG] RightSidebar useEffect triggered, workspace changed:', !!workspace, 'refreshTrigger:', refreshTrigger);
    console.log('[DEBUG] Workspace object reference:', workspace);
    if (workspace) {
      console.log('[DEBUG] Workspace ID:', workspace.id, 'Name:', workspace.name);
      const newFilterConditions = workspace.filterConditions.displayString || '{}';
      const newFormatterConfig = workspace.formatter.displayString || '{}';
      
      // Use functional updates to avoid dependencies on current state values
      setFilterConditionsJson(prev => {
        if (newFilterConditions !== prev) {
          console.log('[DEBUG] Updating filterConditionsJson:', newFilterConditions);
          return newFilterConditions;
        }
        return prev;
      });
      
      setSqlFormatterJson(prev => {
        if (newFormatterConfig !== prev) {
          console.log('[DEBUG] Updating sqlFormatterJson:', newFormatterConfig);
          return newFormatterConfig;
        }
        return prev;
      });
    }
  }, [workspace, refreshTrigger]);

  const handleFilterConditionsChange = (value: string) => {
    if (workspace) {
      workspace.filterConditions.displayString = value;
      setFilterConditionsJson(value);
    }
  };

  const handleFormatterChange = (value: string) => {
    if (workspace) {
      workspace.formatter.displayString = value;
      setSqlFormatterJson(value);
    }
  };

  const handleRefreshTrigger = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Remove renderTabContent function to prevent component remounting

  return (
    <>
      <div className="w-80 bg-dark-secondary border-l border-dark-border-primary flex flex-col h-full">
        {/* Tab Header */}
        <div className="flex border-b border-dark-border-primary">
          <button
            onClick={() => setActiveTab('sql')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'sql'
                ? 'text-primary-400 border-b-2 border-primary-400 bg-dark-hover'
                : 'text-dark-text-secondary hover:text-dark-text-primary'
            }`}
          >
            SQL
          </button>
          <button
            onClick={() => setActiveTab('condition')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'condition'
                ? 'text-primary-400 border-b-2 border-primary-400 bg-dark-hover'
                : 'text-dark-text-secondary hover:text-dark-text-primary'
            }`}
          >
            Condition
          </button>
          <button
            onClick={() => setActiveTab('formatter')}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'formatter'
                ? 'text-primary-400 border-b-2 border-primary-400 bg-dark-hover'
                : 'text-dark-text-secondary hover:text-dark-text-primary'
            }`}
          >
            Formatter
          </button>
        </div>

        {/* Tab Content - Always render all tabs, use CSS to show/hide */}
        <div className="flex-1 overflow-hidden relative">
          {/* SQL Tab */}
          <div 
            className={`absolute inset-0 ${activeTab === 'sql' ? 'block' : 'hidden'}`}
          >
            <SqlTab
              workspace={workspace}
              lastExecutedSql={lastExecutedSql}
            />
          </div>
          
          {/* Condition Tab */}
          <div 
            className={`absolute inset-0 ${activeTab === 'condition' ? 'block' : 'hidden'}`}
          >
            <ConditionTab
              workspace={workspace}
              filterConditionsJson={filterConditionsJson}
              refreshTrigger={refreshTrigger}
              onConditionsChange={handleFilterConditionsChange}
              onRefreshTrigger={handleRefreshTrigger}
            />
          </div>
          
          {/* Formatter Tab */}
          <div 
            className={`absolute inset-0 ${activeTab === 'formatter' ? 'block' : 'hidden'}`}
          >
            <FormatterTab
              workspace={workspace}
              sqlFormatterJson={sqlFormatterJson}
              refreshTrigger={refreshTrigger}
              onFormatterChange={handleFormatterChange}
              onRefreshTrigger={handleRefreshTrigger}
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </>
  );
};

// Memoize the component to prevent unnecessary re-renders when workspace reference changes
export const RightSidebar = React.memo(RightSidebarComponent, (prevProps, nextProps) => {
  // Custom comparison: only re-render if workspace ID or lastExecutedSql actually changes
  const prevWorkspaceId = prevProps.workspace?.id;
  const nextWorkspaceId = nextProps.workspace?.id;
  const prevWorkspaceModified = (prevProps.workspace?.formatter?.displayString || '') + (prevProps.workspace?.filterConditions?.displayString || '');
  const nextWorkspaceModified = (nextProps.workspace?.formatter?.displayString || '') + (nextProps.workspace?.filterConditions?.displayString || '');
  
  const shouldSkipRerender = (
    prevWorkspaceId === nextWorkspaceId &&
    prevWorkspaceModified === nextWorkspaceModified &&
    prevProps.lastExecutedSql === nextProps.lastExecutedSql
  );
  
  console.log('[DEBUG] RightSidebar React.memo comparison:', {
    prevWorkspaceId,
    nextWorkspaceId,
    workspaceIdSame: prevWorkspaceId === nextWorkspaceId,
    prevWorkspaceModified: prevWorkspaceModified.substring(0, 50) + '...',
    nextWorkspaceModified: nextWorkspaceModified.substring(0, 50) + '...',
    workspaceModifiedSame: prevWorkspaceModified === nextWorkspaceModified,
    prevLastExecutedSql: prevProps.lastExecutedSql?.substring(0, 30) + '...',
    nextLastExecutedSql: nextProps.lastExecutedSql?.substring(0, 30) + '...',
    lastExecutedSqlSame: prevProps.lastExecutedSql === nextProps.lastExecutedSql,
    shouldSkipRerender
  });
  
  return shouldSkipRerender;
});
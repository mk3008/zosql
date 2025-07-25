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

export const RightSidebar: React.FC<RightSidebarProps> = ({ workspace, lastExecutedSql }) => {
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('sql');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filterConditionsJson, setFilterConditionsJson] = useState('{}');
  const [sqlFormatterJson, setSqlFormatterJson] = useState('{}');
  const { toast, hideToast } = useToast();

  // Update local state when workspace or refreshTrigger changes
  useEffect(() => {
    console.log('[DEBUG] RightSidebar useEffect triggered, refreshTrigger:', refreshTrigger);
    if (workspace) {
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sql':
        return (
          <SqlTab
            workspace={workspace}
            lastExecutedSql={lastExecutedSql}
          />
        );
        
      case 'condition':
        return (
          <ConditionTab
            workspace={workspace}
            filterConditionsJson={filterConditionsJson}
            refreshTrigger={refreshTrigger}
            onConditionsChange={handleFilterConditionsChange}
            onRefreshTrigger={handleRefreshTrigger}
          />
        );
        
      case 'formatter':
        return (
          <FormatterTab
            workspace={workspace}
            sqlFormatterJson={sqlFormatterJson}
            refreshTrigger={refreshTrigger}
            onFormatterChange={handleFormatterChange}
            onRefreshTrigger={handleRefreshTrigger}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <>
      <div className="w-80 bg-dark-sidebar border-l border-dark-border flex flex-col h-full">
        {/* Tab Header */}
        <div className="flex border-b border-dark-border">
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

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {renderTabContent()}
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
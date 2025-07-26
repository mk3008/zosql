/**
 * Condition Tab Component
 * Manages filter conditions editing
 */

import React from 'react';
import { WorkspaceEntity } from '@shared/types';
import { MonacoEditor } from '../MonacoEditor';
import { useToast } from '@ui/hooks/useToast';

interface ConditionTabProps {
  workspace?: WorkspaceEntity | null;
  filterConditionsJson: string;
  refreshTrigger: number;
  onConditionsChange: (value: string) => void;
  onRefreshTrigger: () => void;
}

export const ConditionTab: React.FC<ConditionTabProps> = ({
  workspace,
  filterConditionsJson,
  refreshTrigger,
  onConditionsChange,
  onRefreshTrigger
}) => {
  const { showSuccess, showError } = useToast();
  
  // Suppress unused variable warning - refreshTrigger still used for state management
  void refreshTrigger;
  
  // Debug: Log when ConditionTab renders
  console.log('[DEBUG] ConditionTab rendering with refreshTrigger:', refreshTrigger);

  const handleReGenerate = () => {
    console.log('[DEBUG] ReGenerate button clicked!');
    if (!workspace) {
      console.log('[DEBUG] No workspace available');
      showError('No workspace available');
      return;
    }
    
    try {
      console.log('[DEBUG] ReGenerate clicked, sqlModels:', workspace.sqlModels.length);
      const originalConditions = workspace.filterConditions.displayString;
      console.log('[DEBUG] Original conditions:', originalConditions);
      
      workspace.filterConditions.initializeFromModels(workspace.sqlModels);
      const newConditions = workspace.filterConditions.displayString;
      console.log('[DEBUG] New conditions:', newConditions);
      
      // Force React re-render to refresh binding
      onRefreshTrigger();
      
      if (originalConditions !== newConditions) {
        showSuccess('Filter conditions regenerated successfully');
      } else {
        showSuccess('Filter conditions regenerated (no changes)');
      }
    } catch (error) {
      console.error('[DEBUG] ReGenerate failed:', error);
      showError(`ReGenerate failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFormatJson = () => {
    if (workspace) {
      console.log('[DEBUG] Format JSON clicked, original:', workspace.filterConditions.displayString);
      try {
        const parsed = JSON.parse(workspace.filterConditions.displayString);
        const formatted = JSON.stringify(parsed, null, 2);
        workspace.filterConditions.displayString = formatted;
        console.log('[DEBUG] JSON formatted successfully');
        // Force React re-render to refresh binding
        onRefreshTrigger();
      } catch (error) {
        console.warn('[DEBUG] JSON format failed:', error);
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      // Find and click the Run button in MainContent
      const runButton = document.querySelector('button[title="Run Query (Ctrl+Enter)"]') as HTMLButtonElement;
      if (runButton && !runButton.disabled) {
        console.log('[DEBUG] Executing query from Condition tab via Ctrl+Enter');
        runButton.click();
      }
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-dark-text-white">Filter Conditions</h4>
        <div className="flex gap-2">
          <button
            onClick={handleReGenerate}
            className="px-3 py-1 text-xs bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors"
            title="ReGenerate filter conditions from current SQL query"
          >
            ReGenerate
          </button>
        </div>
      </div>
      
      <div className="text-xs text-dark-text-primary opacity-75 mb-2">
        rawsql-ts FilterConditions - Edit values only, structure is auto-generated from SQL
      </div>
      
      <div className="flex-1 min-h-0">
        <MonacoEditor
          key="condition-editor" // Stable key to prevent re-mounting
          value={filterConditionsJson}
          onChange={onConditionsChange}
          language="json"
          height="100%"
          readOnly={false}
          workspace={workspace}
          onKeyDown={handleKeyDown}
          options={{
            fontSize: 12,
            wordWrap: 'off',
            formatOnType: true,
            formatOnPaste: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            readOnly: false
          }}
        />
      </div>
      
      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleFormatJson}
            className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-xs"
            title="Format JSON"
          >
            Format JSON
          </button>
        </div>
        
        <div className="text-xs text-dark-text-secondary">
          JSON validation: {workspace?.filterConditions.isValid() ? 
            <span className="text-green-400">✓ Valid</span> : 
            <span className="text-red-400">✗ Invalid</span>
          }
        </div>
        <div className="text-xs text-dark-text-primary opacity-75">
          💡 Generated from SQL columns. Edit values (undefined → actual values).
        </div>
      </div>
    </div>
  );
};
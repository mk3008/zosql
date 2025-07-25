/**
 * Formatter Tab Component
 * Manages SQL formatter configuration
 */

import React from 'react';
import { WorkspaceEntity } from '@shared/types';
import { MonacoEditor } from '../MonacoEditor';
import { useToast } from '@ui/hooks/useToast';

interface FormatterTabProps {
  workspace?: WorkspaceEntity | null;
  sqlFormatterJson: string;
  refreshTrigger: number;
  onFormatterChange: (value: string) => void;
  onRefreshTrigger: () => void;
}

export const FormatterTab: React.FC<FormatterTabProps> = ({
  workspace,
  sqlFormatterJson,
  refreshTrigger,
  onFormatterChange,
  onRefreshTrigger
}) => {
  const { showSuccess, showError } = useToast();

  const handleReset = () => {
    console.log('[DEBUG] Reset Formatter button clicked!');
    if (!workspace) {
      console.log('[DEBUG] No workspace available');
      showError('No workspace available');
      return;
    }
    
    try {
      console.log('[DEBUG] Original formatter:', workspace.formatter.displayString);
      workspace.formatter.reset();
      console.log('[DEBUG] After reset:', workspace.formatter.displayString);
      // Force React re-render to refresh binding
      onRefreshTrigger();
      showSuccess('Formatter configuration reset to default');
    } catch (error) {
      console.error('[DEBUG] Reset failed:', error);
      showError(`Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFormatJson = () => {
    if (workspace) {
      console.log('[DEBUG] Format JSON clicked, original:', workspace.formatter.displayString);
      try {
        const parsed = JSON.parse(workspace.formatter.displayString);
        const formatted = JSON.stringify(parsed, null, 2);
        workspace.formatter.displayString = formatted;
        console.log('[DEBUG] JSON formatted successfully');
        // Force React re-render to refresh binding
        onRefreshTrigger();
      } catch (error) {
        console.warn('[DEBUG] JSON format failed:', error);
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'F') {
      event.preventDefault();
      // Find and click the Format button in MainContent
      const buttons = Array.from(document.querySelectorAll('button'));
      const formatButton = buttons.find(btn => btn.textContent?.trim() === 'Format') as HTMLButtonElement;
      if (formatButton && !formatButton.disabled) {
        console.log('[DEBUG] Executing format from Formatter tab via Ctrl+Shift+F');
        formatButton.click();
      }
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-dark-text-white">SQL Formatter Config</h4>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="text-xs text-primary-400 hover:text-primary-300"
            title="Reset formatter configuration to default values"
          >
            Reset
          </button>
        </div>
      </div>
      
      <div className="text-xs text-dark-text-primary opacity-75 mb-2">
        rawsql-ts SqlFormatter configuration - Adjust formatting preferences
      </div>
      
      <div className="flex-1 min-h-0">
        <MonacoEditor
          key="formatter-editor" // Stable key to prevent re-mounting
          value={sqlFormatterJson}
          onChange={onFormatterChange}
          language="json"
          height="100%"
          readOnly={false}
          workspace={workspace}
          refreshTrigger={refreshTrigger}
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
          JSON validation: {(() => {
            try {
              JSON.parse(sqlFormatterJson);
              return <span className="text-green-400">✓ Valid</span>;
            } catch {
              return <span className="text-red-400">✗ Invalid</span>;
            }
          })()}
        </div>
        <div className="text-xs text-dark-text-primary opacity-75">
          💡 Modify formatting options like keywordCase, indentSize, withClauseStyle, etc.
        </div>
      </div>
    </div>
  );
};
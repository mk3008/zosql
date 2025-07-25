/**
 * SQL Tab Component
 * Displays the last executed SQL query
 */

import React from 'react';
import { WorkspaceEntity } from '@shared/types';
import { MonacoEditor } from '../MonacoEditor';

interface SqlTabProps {
  workspace?: WorkspaceEntity | null;
  lastExecutedSql?: string;
}

export const SqlTab: React.FC<SqlTabProps> = ({ workspace, lastExecutedSql }) => {
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-dark-text-white">Last Executed SQL</h4>
      </div>
      
      <div className="text-xs text-dark-text-primary opacity-75 mb-2">
        This shows the most recent SQL query that was executed
      </div>
      
      <div className="flex-1 min-h-0">
        <MonacoEditor
          key="executed-sql-viewer"
          value={lastExecutedSql || '-- No SQL has been executed yet'}
          onChange={() => {}} // Read-only
          language="sql"
          height="100%"
          readOnly={true}
          workspace={workspace}
          options={{
            fontSize: 12,
            wordWrap: 'on',
            formatOnType: false,
            formatOnPaste: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            readOnly: true,
            selectOnLineNumbers: false,
            lineNumbers: 'on'
          }}
        />
      </div>
      
      <div className="mt-3 space-y-2">
        <div className="text-xs text-dark-text-secondary">
          Status: {lastExecutedSql ? 
            <span className="text-green-400">✓ SQL Available</span> : 
            <span className="text-gray-400">No execution yet</span>
          }
        </div>
        <div className="text-xs text-dark-text-primary opacity-75">
          💡 This SQL reflects what was actually executed, including composed CTEs and filters.
        </div>
      </div>
    </div>
  );
};
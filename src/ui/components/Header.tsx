import React, { useState, useEffect } from 'react';
import { NewWorkspaceDialogV2 as NewWorkspaceDialog } from './NewWorkspaceDialogV2';
import { FileOpenDialog } from './FileOpenDialog';
import { FinalSqlDialog } from './FinalSqlDialog';
import { WorkspaceEntity } from '@core/entities/workspace';

interface HeaderProps {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  onFileOpen?: (file: File) => Promise<void>;  
  onWorkspaceCreated?: (workspace: WorkspaceEntity) => void;
  onWorkspaceSave?: () => void;
  onViewFinalSql?: () => Promise<{ sql: string; error?: string }>;
  currentWorkspace?: WorkspaceEntity | null;
  isDemo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleLeftSidebar,
  onToggleRightSidebar,
  leftSidebarVisible,
  rightSidebarVisible,
  onFileOpen,
  onWorkspaceCreated,
  onWorkspaceSave,
  onViewFinalSql,
  currentWorkspace,
  isDemo
}) => {
  const [showNewWorkspaceDialog, setShowNewWorkspaceDialog] = useState(false);
  const [showFileOpenDialog, setShowFileOpenDialog] = useState(false);
  const [showFinalSqlDialog, setShowFinalSqlDialog] = useState(false);
  const [finalSqlData, setFinalSqlData] = useState({ sql: '', error: '', isLoading: false });

  // Handle View Final SQL
  const handleViewFinalSql = async () => {
    if (!currentWorkspace || !onViewFinalSql) return;

    setFinalSqlData({ sql: '', error: '', isLoading: true });
    setShowFinalSqlDialog(true);

    try {
      const result = await onViewFinalSql();
      setFinalSqlData({ 
        sql: result.sql, 
        error: result.error || '', 
        isLoading: false 
      });
    } catch (error) {
      setFinalSqlData({ 
        sql: '', 
        error: error instanceof Error ? error.message : 'Unknown error occurred', 
        isLoading: false 
      });
    }
  };

  // Keyboard shortcut for Save Workspace (Ctrl+Shift+W)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        if (currentWorkspace && onWorkspaceSave) {
          onWorkspaceSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentWorkspace, onWorkspaceSave]);

  return (
    <header className="bg-dark-tertiary border-b border-dark-border-primary px-4 py-3 flex items-center justify-between h-header">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleLeftSidebar}
          className="px-2 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm"
          title="Toggle Left Sidebar"
        >
          {leftSidebarVisible ? '⟨' : '⟩'}
        </button>
        
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-dark-text-white">
            {isDemo ? 'zosql[demo]' : 'zosql'}
          </h1>
          <span className="text-xs text-dark-text-secondary">v1.1</span>
        </div>
      </div>

      {/* Center Section - Empty */}
      <div className="flex items-center gap-4">
        {/* Workspace name display removed */}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-dark-hover rounded">
          <button
            onClick={() => setShowNewWorkspaceDialog(true)}
            className="px-3 py-1 bg-primary-600 text-white rounded-l hover:bg-primary-700 transition-colors text-sm font-medium"
            title="New Workspace"
          >
            New
          </button>
          <button
            onClick={() => setShowFileOpenDialog(true)}
            className="px-3 py-1 bg-primary-600 text-white rounded-r hover:bg-primary-700 transition-colors text-sm font-medium border-l border-primary-700"
            title="Open SQL File"
          >
            Open
          </button>
        </div>
        
        <button
          onClick={onWorkspaceSave}
          disabled={!currentWorkspace}
          className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save Workspace as JSON (Ctrl+Shift+W)"
        >
          Save Workspace
        </button>
        
        <button
          onClick={handleViewFinalSql}
          disabled={!currentWorkspace}
          className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          title="View Final SQL (Production Ready)"
        >
          View Final SQL
        </button>
        
        <div className="w-px h-6 bg-dark-border-primary mx-2"></div>
        
        <button
          onClick={onToggleRightSidebar}
          className="px-2 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm"
          title="Toggle Right Sidebar"
        >
          {rightSidebarVisible ? '⟩' : '⟨'}
        </button>
      </div>

      {/* Dialogs */}
      <NewWorkspaceDialog
        isOpen={showNewWorkspaceDialog}
        onClose={() => setShowNewWorkspaceDialog(false)}
        onWorkspaceCreated={onWorkspaceCreated}
      />
      
      <FileOpenDialog
        isOpen={showFileOpenDialog}
        onClose={() => setShowFileOpenDialog(false)}
        onFileOpen={onFileOpen}
        onWorkspaceOpen={async (workspaceData) => {
          if (onWorkspaceCreated) {
            // Convert unknown JSON data to WorkspaceEntity
            try {
              const workspace = WorkspaceEntity.fromJSON(workspaceData as Record<string, unknown>);
              onWorkspaceCreated(workspace);
            } catch (error) {
              console.error('Failed to convert workspace data:', error);
            }
          }
        }}
      />
      
      <FinalSqlDialog
        isOpen={showFinalSqlDialog}
        onClose={() => setShowFinalSqlDialog(false)}
        finalSql={finalSqlData.sql}
        isLoading={finalSqlData.isLoading}
        error={finalSqlData.error}
      />
    </header>
  );
};
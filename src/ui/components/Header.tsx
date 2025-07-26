import React, { useState, useEffect } from 'react';
import { NewWorkspaceDialog } from './NewWorkspaceDialog';
import { FileOpenDialog } from './FileOpenDialog';
import { WorkspaceEntity } from '@core/entities/workspace';

interface HeaderProps {
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  onFileOpen?: (file: File) => Promise<void>;  
  onWorkspaceCreated?: (workspace: WorkspaceEntity) => void;
  onWorkspaceSave?: () => void;
  currentWorkspace?: WorkspaceEntity | null;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleLeftSidebar,
  onToggleRightSidebar,
  leftSidebarVisible,
  rightSidebarVisible,
  onFileOpen,
  onWorkspaceCreated,
  onWorkspaceSave,
  currentWorkspace
}) => {
  const [showNewWorkspaceDialog, setShowNewWorkspaceDialog] = useState(false);
  const [showFileOpenDialog, setShowFileOpenDialog] = useState(false);

  // Keyboard shortcut for Export (Ctrl+Shift+E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
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
          <h1 className="text-lg font-bold text-dark-text-white">zosql</h1>
          <span className="text-xs text-dark-text-secondary">v2.0</span>
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
          title="Export Workspace as JSON (Ctrl+Shift+E)"
        >
          Export
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
        onWorkspaceOpen={onWorkspaceCreated}
      />
    </header>
  );
};
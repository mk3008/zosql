import React, { useRef, useEffect } from 'react';
import { NewWorkspaceViewModel } from '@ui/viewmodels/new-workspace-viewmodel';
import { WorkspaceEntity } from '@core/entities/workspace';
import { useMvvmBinding } from '@ui/hooks/useMvvm';

interface NewWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceCreated?: (workspace: WorkspaceEntity) => void;
}

export const NewWorkspaceDialog: React.FC<NewWorkspaceDialogProps> = ({ 
  isOpen, 
  onClose, 
  onWorkspaceCreated 
}) => {
  // MVVM: ViewModelをシングルトンパターンで管理
  const viewModelRef = useRef<NewWorkspaceViewModel | null>(null);
  if (!viewModelRef.current) {
    viewModelRef.current = new NewWorkspaceViewModel();
  }
  const vm = useMvvmBinding(viewModelRef.current);

  // ViewModelイベントのバインディング
  useEffect(() => {
    if (vm) {
      vm.onWorkspaceCreated = (workspace: WorkspaceEntity) => {
        onWorkspaceCreated?.(workspace);
        onClose(); // ダイアログを閉じる
      };
    }
  }, [vm, onWorkspaceCreated, onClose]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (viewModelRef.current) {
        viewModelRef.current.dispose();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await vm.executeCreateWorkspace();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-secondary border border-dark-border-primary rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border-primary">
          <h2 className="text-lg font-semibold text-dark-text-white">Create New Workspace</h2>
          <button
            onClick={onClose}
            className="text-dark-text-secondary hover:text-dark-text-primary"
            disabled={vm.isLoading}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Error Display */}
            {vm.error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded p-3 text-red-400 text-sm">
                {vm.error}
                <button
                  onClick={() => vm.clearError()}
                  className="ml-2 text-red-300 hover:text-red-200"
                >
                  ✕
                </button>
              </div>
            )}
            
            {/* Workspace Name */}
            <div>
              <label htmlFor="workspace-name" className="block text-sm font-medium text-dark-text-white mb-2">
                Workspace Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={vm.name}
                onChange={(e) => vm.name = e.target.value}
                placeholder="Enter workspace name..."
                className="w-full px-3 py-2 bg-dark-primary border border-dark-border-primary rounded text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:border-primary-600 transition-colors duration-200 autofill-dark"
                disabled={vm.isLoading}
                required
              />
            </div>

            {/* SQL Query */}
            <div className="flex-1 flex flex-col">
              <label htmlFor="sql-query" className="block text-sm font-medium text-dark-text-white mb-2">
                SQL Query
              </label>
              <textarea
                id="sql-query"
                value={vm.sql}
                onChange={(e) => vm.sql = e.target.value}
                placeholder="Paste your SQL query with CTEs here..."
                className="w-full h-64 px-3 py-2 bg-dark-primary border border-dark-border-primary rounded text-dark-text-primary placeholder-dark-text-muted font-mono text-sm resize-none focus:outline-none focus:border-primary-600 transition-colors duration-200"
                disabled={vm.isLoading}
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-dark-border-primary">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-dark-text-primary hover:bg-dark-hover rounded transition-colors"
              disabled={vm.isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!vm.canExecute}
            >
              {vm.isLoading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
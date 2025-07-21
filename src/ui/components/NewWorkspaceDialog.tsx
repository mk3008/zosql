import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

interface NewWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewWorkspaceDialog: React.FC<NewWorkspaceDialogProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [sql, setSql] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createWorkspace } = useWorkspace();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !sql.trim()) {
      return;
    }

    setIsLoading(true);
    
    try {
      await createWorkspace({
        name: name.trim(),
        sql: sql.trim()
      });
      
      // Reset form and close dialog
      setName('');
      setSql('');
      onClose();
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsLoading(false);
    }
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
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4">
            {/* Workspace Name */}
            <div>
              <label htmlFor="workspace-name" className="block text-sm font-medium text-dark-text-white mb-2">
                Workspace Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workspace name..."
                className="w-full px-3 py-2 bg-dark-primary border border-dark-border-primary rounded text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:border-primary-600"
                disabled={isLoading}
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
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder="Paste your SQL query with CTEs here..."
                className="w-full h-64 px-3 py-2 bg-dark-primary border border-dark-border-primary rounded text-dark-text-primary placeholder-dark-text-muted font-mono text-sm resize-none focus:outline-none focus:border-primary-600"
                disabled={isLoading}
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
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !name.trim() || !sql.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
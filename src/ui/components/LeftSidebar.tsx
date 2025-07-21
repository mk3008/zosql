import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ValuesSection } from './ValuesSection';

export const LeftSidebar: React.FC = () => {
  const { workspace, isLoading, validateWorkspace } = useWorkspace();
  const [isValidating, setIsValidating] = useState(false);

  const handleValidateWorkspace = async () => {
    if (!workspace) return;
    
    setIsValidating(true);
    try {
      const result = await validateWorkspace();
      console.log('Validation result:', result);
      // TODO: Show validation results in UI
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <aside className="w-sidebar bg-dark-secondary border-r border-dark-border-primary p-3 overflow-y-auto flex-shrink-0">
      {/* Workspace Overview */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-dark-text-white mb-3 border-b border-dark-border-primary pb-2">
          Workspace
        </h3>
        
        {isLoading && (
          <div className="text-sm text-dark-text-secondary">Loading workspace...</div>
        )}
        
        {!isLoading && !workspace && (
          <div className="text-sm text-dark-text-muted">No workspace loaded</div>
        )}
        
        {workspace && (
          <div className="space-y-2 text-sm">
            <div className="text-dark-text-primary">
              <span className="text-dark-text-secondary">Name:</span> {workspace.name}
            </div>
            <div className="text-dark-text-primary">
              <span className="text-dark-text-secondary">CTEs:</span> {Object.keys(workspace.privateCtes).length}
            </div>
            <div className="text-dark-text-primary">
              <span className="text-dark-text-secondary">Modified:</span>{' '}
              {new Date(workspace.lastModified).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {/* CTE List */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-dark-text-white mb-3 border-b border-dark-border-primary pb-2">
          CTEs
        </h3>
        
        {workspace && Object.keys(workspace.privateCtes).length > 0 ? (
          <div className="space-y-1">
            {Object.entries(workspace.privateCtes).map(([name, cte]) => (
              <div
                key={name}
                className="p-2 rounded cursor-pointer hover:bg-dark-hover transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-text-primary font-medium">{name}</span>
                  <span className="text-xs text-dark-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    {cte.dependencies.length} deps
                  </span>
                </div>
                {cte.description && (
                  <div className="text-xs text-dark-text-muted mt-1 truncate">
                    {cte.description}
                  </div>
                )}
                {cte.dependencies.length > 0 && (
                  <div className="text-xs text-dark-text-secondary mt-1">
                    Depends on: {cte.dependencies.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-dark-text-muted">No CTEs found</div>
        )}
      </div>

      {/* Actions */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-dark-text-white mb-3 border-b border-dark-border-primary pb-2">
          Actions
        </h3>
        
        <div className="space-y-2">
          <button 
            className="w-full px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!workspace}
            title={workspace ? "Decompose current query into CTEs" : "No workspace loaded"}
          >
            <span>📄</span>
            Decompose Query
          </button>
          
          <button 
            onClick={handleValidateWorkspace}
            className="w-full px-3 py-2 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!workspace || isValidating}
            title={workspace ? "Validate all CTEs for syntax and dependencies" : "No workspace loaded"}
          >
            <span>🔧</span>
            {isValidating ? 'Validating...' : 'Validate CTEs'}
          </button>
          
          <button 
            className="w-full px-3 py-2 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!workspace}
            title={workspace ? "View CTE dependency graph" : "No workspace loaded"}
          >
            <span>📊</span>
            View Dependencies
          </button>
        </div>
      </div>

      {/* Values Section */}
      <ValuesSection />

      {/* System Status */}
      <div>
        <h3 className="text-sm font-medium text-dark-text-white mb-3 border-b border-dark-border-primary pb-2">
          System
        </h3>
        
        <div className="space-y-1 text-xs text-dark-text-secondary">
          <div>✅ LocalStorage Available</div>
          <div>✅ rawsql-ts Parser Ready</div>
          <div>✅ Monaco Editor Loaded</div>
        </div>
      </div>
    </aside>
  );
};
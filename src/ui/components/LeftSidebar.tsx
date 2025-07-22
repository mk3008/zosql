import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ValuesSection } from './ValuesSection';
import { SqlModelsList } from './SqlModelsList';
import { SqlModelEntity, WorkspaceEntity } from '@shared/types';

interface LeftSidebarProps {
  onOpenValuesTab?: () => void;
  onOpenFormatterTab?: () => void;
  sqlModels?: SqlModelEntity[];
  onModelClick?: (model: SqlModelEntity) => void;
  selectedModelName?: string;
  onDecomposeQuery?: () => void;
  isDecomposing?: boolean;
  workspace?: WorkspaceEntity | null;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  onOpenValuesTab, 
  onOpenFormatterTab,
  sqlModels = [],
  onModelClick,
  selectedModelName,
  onDecomposeQuery,
  isDecomposing = false,
  workspace
}) => {
  const { isLoading, validateWorkspace } = useWorkspace();
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
        
        {!isLoading && !workspace && sqlModels.length === 0 && (
          <div className="text-sm text-dark-text-muted">No workspace loaded</div>
        )}
        
        {workspace && (
          <div className="space-y-2 text-sm">
            <div className="text-dark-text-primary">
              <span className="text-dark-text-secondary">Name:</span> {workspace.name}
            </div>
            <div className="text-dark-text-primary">
              <span className="text-dark-text-secondary">CTEs:</span> {sqlModels.filter(m => m.type === 'cte').length}
            </div>
            <div className="text-dark-text-primary">
              <span className="text-dark-text-secondary">Models:</span> {sqlModels.length}
            </div>
            <div className="text-dark-text-primary">
              <span className="text-dark-text-secondary">Modified:</span>{' '}
              {new Date(workspace.lastModified).toLocaleDateString()}
            </div>
          </div>
        )}
        
        {!workspace && sqlModels.length > 0 && (
          <div className="space-y-2 text-sm">
            <div className="text-dark-text-primary">
              <span className="text-dark-text-secondary">CTEs:</span> {sqlModels.filter(m => m.type === 'cte').length}
            </div>
            <div className="text-dark-text-primary">
              <span className="text-dark-text-secondary">Models:</span> {sqlModels.length}
            </div>
            <div className="text-dark-text-muted">
              File opened (no workspace saved)
            </div>
          </div>
        )}
      </div>

      {/* SQL Models List - Shows decomposed CTEs and main query */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-dark-text-white mb-3 border-b border-dark-border-primary pb-2">
          SQL Models
        </h3>
        
        <SqlModelsList 
          models={sqlModels}
          onModelClick={onModelClick}
          selectedModelName={selectedModelName}
        />
      </div>


      {/* Actions */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-dark-text-white mb-3 border-b border-dark-border-primary pb-2">
          Actions
        </h3>
        
        <div className="space-y-2">
          <button 
            onClick={onDecomposeQuery}
            className="w-full px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!onDecomposeQuery || isDecomposing}
            title={onDecomposeQuery ? "Decompose current query into CTEs" : "No query to decompose"}
          >
            <span>📄</span>
            {isDecomposing ? 'Decomposing...' : 'Decompose Query'}
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
          
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
            title="Clear all cached data and reload page"
          >
            <span>🗑️</span>
            Clear Cache
          </button>
        </div>
      </div>

      {/* Values Section */}
      <ValuesSection onOpenTab={onOpenValuesTab} />

      {/* SQL Formatter Section */}
      <div className="mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer mb-3 border-b border-dark-border-primary pb-2"
          onClick={onOpenFormatterTab}
        >
          <h3 className="text-sm font-medium text-dark-text-white hover:text-primary-400 transition-colors">
            SQL Formatter Config
          </h3>
          <span className="text-dark-text-secondary text-xs">
            →
          </span>
        </div>
      </div>

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
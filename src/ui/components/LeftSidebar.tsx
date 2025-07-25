import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { SqlModelsList } from './SqlModelsList';
import { SqlModelEntity, WorkspaceEntity } from '@shared/types';

interface LeftSidebarProps {
  onOpenValuesTab?: () => void;
  sqlModels?: SqlModelEntity[];
  onModelClick?: (model: SqlModelEntity) => void;
  selectedModelName?: string;
  onDecomposeQuery?: () => void;
  isDecomposing?: boolean;
  workspace?: WorkspaceEntity | null;
  activeTabId?: string | null;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  onOpenValuesTab, 
  sqlModels = [],
  onModelClick,
  selectedModelName,
  onDecomposeQuery,
  isDecomposing,
  workspace,
  activeTabId
}) => {
  // Suppress unused variable warning
  void isDecomposing;
  const { isLoading, validateWorkspace } = useWorkspace();
  const [_isValidating, _setIsValidating] = useState(false);
  
  // Fallback state management when workspace is not available
  const [fallbackCollapsed, setFallbackCollapsed] = useState({
    workspace: false,
    sqlModels: false,
    actions: true,
    system: true
  });
  
  // Force re-render when workspace state changes
  const [, forceUpdate] = useState({});
  
  // Collapsible section states - get from workspace or use fallback
  const getCollapsedState = (section: string, defaultValue: boolean) => {
    if (workspace?.layoutState?.leftSidebarCollapsed) {
      const collapsed = workspace.layoutState.leftSidebarCollapsed[section as keyof typeof workspace.layoutState.leftSidebarCollapsed] ?? defaultValue;
      console.log('[DEBUG] getCollapsedState from workspace:', section, 'collapsed:', collapsed);
      return collapsed;
    } else {
      const collapsed = fallbackCollapsed[section as keyof typeof fallbackCollapsed] ?? defaultValue;
      console.log('[DEBUG] getCollapsedState from fallback:', section, 'collapsed:', collapsed);
      return collapsed;
    }
  };

  const isWorkspaceExpanded = !getCollapsedState('workspace', false);
  const isSqlModelsExpanded = !getCollapsedState('sqlModels', false);
  const isActionsExpanded = !getCollapsedState('actions', true);
  const isSystemExpanded = !getCollapsedState('system', true);

  console.log('[DEBUG] LeftSidebar render states:', {
    isWorkspaceExpanded,
    isSqlModelsExpanded,
    isActionsExpanded,
    isSystemExpanded,
    hasWorkspace: !!workspace,
    workspaceLayoutState: workspace?.layoutState
  });

  const handleValidateWorkspace = async () => {
    if (!workspace) return;
    
    _setIsValidating(true);
    try {
      const result = await validateWorkspace();
      console.log('Validation result:', result);
      // TODO: Show validation results in UI
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      _setIsValidating(false);
    }
  };

  const toggleSectionCollapsed = (section: 'workspace' | 'sqlModels' | 'actions' | 'system') => {
    console.log('[DEBUG] toggleSectionCollapsed called:', section, 'hasWorkspace:', !!workspace);
    const currentCollapsed = getCollapsedState(section, section === 'workspace' || section === 'sqlModels' ? false : true);
    console.log('[DEBUG] toggleSectionCollapsed:', section, 'currentCollapsed:', currentCollapsed, 'will set to:', !currentCollapsed);
    
    if (workspace?.layoutState?.leftSidebarCollapsed) {
      // Update workspace state
      workspace.setSidebarSectionCollapsed(section, !currentCollapsed);
      console.log('[DEBUG] Updated workspace layoutState:', workspace.layoutState);
      // Force re-render
      forceUpdate({});
    } else {
      // Update fallback state
      setFallbackCollapsed(prev => ({
        ...prev,
        [section]: !currentCollapsed
      }));
      console.log('[DEBUG] Updated fallback state');
    }
  };

  // Collapsible section header component
  const CollapsibleHeader: React.FC<{
    title: string;
    isExpanded: boolean;
    onToggle: () => void;
  }> = ({ title, isExpanded, onToggle }) => (
    <h3 
      className="text-sm font-medium text-dark-text-white mb-3 border-b border-dark-border-primary pb-2 cursor-pointer flex items-center justify-between hover:text-primary-400 transition-colors"
      onClick={onToggle}
    >
      <span>{title}</span>
      <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
        ▶
      </span>
    </h3>
  );

  return (
    <aside className="w-sidebar bg-dark-secondary border-r border-dark-border-primary p-3 overflow-y-auto flex-shrink-0">
      {/* Workspace Overview */}
      <div className="mb-6">
        <CollapsibleHeader 
          title="Workspace" 
          isExpanded={isWorkspaceExpanded} 
          onToggle={() => toggleSectionCollapsed('workspace')} 
        />
        
        {isWorkspaceExpanded && (
          <>
            {isLoading && (
              <div className="text-sm text-dark-text-secondary">Loading workspace...</div>
            )}
            
            {!isLoading && !workspace && sqlModels.length === 0 && (
              <div className="text-sm text-dark-text-primary opacity-75">No workspace loaded</div>
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
                <div className="text-dark-text-primary opacity-75">
                  File opened (no workspace saved)
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* SQL Models List - Shows decomposed CTEs and main query */}
      <div className="mb-6">
        <CollapsibleHeader 
          title="SQL Models" 
          isExpanded={isSqlModelsExpanded} 
          onToggle={() => toggleSectionCollapsed('sqlModels')} 
        />
        
        {isSqlModelsExpanded && (
          <SqlModelsList 
            models={sqlModels as any}
            onModelClick={onModelClick}
            selectedModelName={selectedModelName}
            onOpenValuesTab={onOpenValuesTab}
            isValuesTabActive={activeTabId === 'values'}
          />
        )}
      </div>


      {/* Actions */}
      <div className="mb-6">
        <CollapsibleHeader 
          title="Actions" 
          isExpanded={isActionsExpanded} 
          onToggle={() => toggleSectionCollapsed('actions')} 
        />
        
        {isActionsExpanded && (
          <div className="space-y-2">
            <button 
              onClick={onDecomposeQuery}
              className="w-full px-3 py-2 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={true}
              title="Decompose current query into CTEs (temporarily disabled)"
            >
              <span>📄</span>
              Decompose
            </button>
            
            <button 
              onClick={handleValidateWorkspace}
              className="w-full px-3 py-2 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={true}
              title="Validate schema and dependencies (temporarily disabled)"
            >
              <span>🔧</span>
              Validate Schema
            </button>
          </div>
        )}
      </div>


      {/* System Status */}
      <div>
        <CollapsibleHeader 
          title="System" 
          isExpanded={isSystemExpanded} 
          onToggle={() => toggleSectionCollapsed('system')} 
        />
        
        {isSystemExpanded && (
          <div className="space-y-1 text-xs text-dark-text-secondary">
            <div>✅ LocalStorage Available</div>
            <div>✅ rawsql-ts Parser Ready</div>
            <div>✅ Monaco Editor Loaded</div>
          </div>
        )}
      </div>
    </aside>
  );
};
/**
 * Main Content Component - MVVM Implementation
 * UI Layer - Pure View component with ViewModel binding
 */

import React, { forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import '../styles/tab-scrollbar.css';
import { WorkspaceEntity, SqlModelEntity } from '@shared/types';
import { MonacoEditor } from './MonacoEditor';
import { QueryResults } from './QueryResults';
import { MainContentViewModel } from '@ui/viewmodels/main-content-viewmodel';
import { useMvvmBinding } from '@ui/hooks/useMvvm';

export interface MainContentRef {
  openValuesTab: () => void;
  openFormatterTab: () => void;
  openConditionTab: () => void;
  getCurrentSql: () => string;
  openSqlModel: (name: string, sql: string, type: 'main' | 'cte', modelEntity?: SqlModelEntity) => void;
  setCurrentModelEntity: (model: SqlModelEntity) => void;
  clearAllTabs: () => void;
}

export interface MainContentProps {
  workspace: WorkspaceEntity | null;
  onWorkspaceChange?: (workspace: WorkspaceEntity) => void;
}

// Global ViewModel instance to prevent duplication in React StrictMode
let globalViewModel: MainContentViewModel | null = null;

export const MainContentMvvm = forwardRef<MainContentRef, MainContentProps>(({ workspace, onWorkspaceChange }, ref) => {
  // MVVM: Create and bind ViewModel (singleton pattern)
  const viewModelRef = useRef<MainContentViewModel | null>(null);
  if (!viewModelRef.current) {
    if (!globalViewModel) {
      console.log('[DEBUG] Creating new MainContentViewModel instance');
      globalViewModel = new MainContentViewModel();
    }
    viewModelRef.current = globalViewModel;
  }
  const vm = useMvvmBinding(viewModelRef.current);

  // Sync WorkspaceEntity state to ViewModel
  const syncWorkspaceToViewModel = () => {
    console.log('[DEBUG] syncWorkspaceToViewModel called, workspace:', !!workspace);
    if (!workspace) return;
    
    console.log('[DEBUG] Workspace openedObjects:', workspace.openedObjects.length, workspace.openedObjects);
    
    // Convert WorkspaceEntity.openedObjects to ViewModel.tabs
    const tabs = workspace.openedObjects.map(obj => ({
      id: obj.id,
      title: obj.title,
      type: obj.type,
      content: obj.content,
      isDirty: obj.isDirty
    }));
    
    console.log('[DEBUG] Converting to tabs:', tabs.length, tabs);
    
    vm.tabs = tabs;
    vm.activeTabId = workspace.activeObjectId;
    
    console.log('[DEBUG] Set VM tabs:', vm.tabs.length, 'activeTabId:', vm.activeTabId);
    
    // Sync model mappings
    workspace.openedObjects.forEach(obj => {
      if (obj.modelEntity) {
        vm.setTabModel(obj.id, obj.modelEntity);
      }
    });
  };

  // Sync props to ViewModel and workspace state
  useEffect(() => {
    vm.workspace = workspace;
    // Sync workspace opened objects to ViewModel tabs
    if (workspace) {
      syncWorkspaceToViewModel();
    }
  }, [workspace, vm]);

  // Initialize default tabs only once and only if no workspace is provided
  useEffect(() => {
    console.log('[DEBUG] MainContentMvvm useEffect: tabs.length=', vm.tabs.length, 'workspace=', !!workspace);
    if (vm.tabs.length === 0 && !workspace) {
      console.log('[DEBUG] Adding default main tab');
      vm.addTab({
        id: 'main.sql',
        title: 'main.sql',
        type: 'main',
        content: 'SELECT user_id, name FROM users;',
        isDirty: false
      });
    }
  }, [workspace]); // Depend on workspace to prevent default when workspace exists

  // Cleanup ViewModel on unmount
  useEffect(() => {
    return () => {
      if (viewModelRef.current) {
        viewModelRef.current.dispose();
      }
    };
  }, []);

  // Imperative interface for parent components
  useImperativeHandle(ref, () => ({
    openValuesTab: () => {
      if (workspace) {
        workspace.openValuesTab();
        // Sync workspace state to ViewModel
        syncWorkspaceToViewModel();
      }
    },
    openFormatterTab: () => {
      if (workspace) {
        workspace.openFormatterTab();
        // Sync workspace state to ViewModel
        syncWorkspaceToViewModel();
      }
    },
    openConditionTab: () => {
      if (workspace) {
        workspace.openConditionTab();
        // Sync workspace state to ViewModel
        syncWorkspaceToViewModel();
      }
    },
    getCurrentSql: () => vm.activeTab?.content || '',
    openSqlModel: (name: string, sql: string, type: 'main' | 'cte', modelEntity?: SqlModelEntity) => {
      if (workspace && modelEntity) {
        workspace.openSqlModelTab(modelEntity);
        // Sync workspace state to ViewModel
        syncWorkspaceToViewModel();
      } else {
        // Fallback for direct calls without modelEntity
        vm.addTab({
          id: name,
          title: name,
          type,
          content: sql,
          isDirty: false
        });
        if (modelEntity) {
          vm.setTabModel(name, modelEntity);
        }
      }
    },
    setCurrentModelEntity: (model: SqlModelEntity) => {
      if (vm.activeTab) {
        vm.setTabModel(vm.activeTab.id, model);
      }
    },
    clearAllTabs: () => {
      if (workspace) {
        workspace.clearAllObjects();
        // Sync workspace state to ViewModel
        syncWorkspaceToViewModel();
      }
    }
  }), [vm, workspace]);

  // Event Handlers (delegating to ViewModel commands)
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      vm.executeQuery();
    }
  };

  // Pure View - No business logic, only bindings
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Tab Bar - Fixed at top */}
      <div className="bg-dark-secondary border-b border-dark-border-primary flex items-center overflow-x-auto relative tab-container flex-shrink-0">
        <div className="flex">
          {vm.tabs.map(tab => (
            <div
              key={tab.id}
              className={`
                flex items-center gap-2 px-4 py-2 cursor-pointer relative
                ${vm.activeTabId === tab.id 
                  ? 'bg-dark-primary text-dark-text-white border-r border-dark-border-primary z-10' 
                  : 'bg-dark-secondary text-dark-text-primary hover:bg-dark-hover border-r border-dark-border-primary'
                }
              `}
              onClick={() => vm.activeTabId = tab.id}
            >
              <span className="text-sm">{tab.title}</span>
              {tab.isDirty && <span className="text-xs text-primary-400">●</span>}
              {vm.tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    vm.closeTab(tab.id);
                  }}
                  className="text-dark-text-secondary hover:text-dark-text-primary ml-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-dark-secondary border-b border-dark-border-primary px-4 py-2">
          <div className="flex items-center justify-between">
            <div /> {/* Spacer */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => vm.executeQuery()}
                disabled={!vm.canExecute}
                className="px-3 py-1 bg-success text-white rounded hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Run Query (Ctrl+Enter)"
              >
                {vm.isExecuting ? 'Running...' : 'Run'}
              </button>
              
              <button 
                onClick={() => vm.formatQuery()}
                disabled={!vm.canFormat}
                className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Format
              </button>
              
              <button
                onClick={() => vm.toggleResultsVisibility()}
                className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm"
              >
                {vm.resultsVisible ? 'Hide Results' : 'Show Results'}
              </button>
            </div>
          </div>
        </div>

        {/* Editor and Results Container */}
        <div className="flex-1 overflow-hidden">
          {vm.resultsVisible && vm.queryResult ? (
            /* Split view: Editor + Results */
            <div className="h-full flex flex-col">
              {/* Monaco Editor - takes remaining space */}
              <div className="flex-1 bg-dark-primary overflow-hidden" style={{ minHeight: '200px' }}>
                {vm.activeTab && (
                  <MonacoEditor
                    key={vm.activeTab.id}
                    value={vm.activeTab.content}
                    onChange={(value) => {
                      console.log('[DEBUG] Monaco onChange for tab:', vm.activeTab!.id, 'type:', vm.activeTab!.type);
                      vm.updateTabContent(vm.activeTab!.id, value);
                    }}
                    language={(vm.activeTab.type === 'formatter' || vm.activeTab.type === 'condition') ? 'json' : 'sql'}
                    height="100%"
                    isMainEditor={true}
                    onKeyDown={handleKeyDown}
                    options={vm.activeTab.type === 'values' ? {
                      wordWrap: 'off',
                      wrappingStrategy: 'simple',
                      scrollBeyondLastLine: false,
                      minimap: { enabled: false }
                    } : (vm.activeTab.type === 'formatter' || vm.activeTab.type === 'condition') ? {
                      wordWrap: 'off',
                      formatOnType: true,
                      formatOnPaste: true,
                      minimap: { enabled: false },
                      readOnly: false  // 明示的に編集可能に設定
                    } : {
                      wordWrap: 'off',
                      minimap: { enabled: false },
                      folding: true,
                    }}
                  />
                )}
              </div>
              
              {/* Query Results - fixed portion */}
              <div className="flex-shrink-0">
                <QueryResults
                  result={vm.queryResult}
                  isVisible={vm.resultsVisible}
                  onClose={() => vm.closeResults()}
                />
              </div>
            </div>
          ) : (
            /* Full editor view */
            <div className="h-full bg-dark-primary overflow-hidden">
              {vm.activeTab && (
                <MonacoEditor
                  key={vm.activeTab.id}
                  value={vm.activeTab.content}
                  onChange={(value) => vm.updateTabContent(vm.activeTab!.id, value)}
                  language={(vm.activeTab.type === 'formatter' || vm.activeTab.type === 'condition') ? 'json' : 'sql'}
                  height="100%"
                  isMainEditor={true}
                  onKeyDown={handleKeyDown}
                  options={vm.activeTab.type === 'values' ? {
                    wordWrap: 'off',
                    wrappingStrategy: 'simple',
                    scrollBeyondLastLine: false,
                    minimap: { enabled: false }
                  } : (vm.activeTab.type === 'formatter' || vm.activeTab.type === 'condition') ? {
                    wordWrap: 'off',
                    formatOnType: true,
                    formatOnPaste: true,
                    minimap: { enabled: false }
                  } : {
                    wordWrap: 'off',
                    minimap: { enabled: false },
                    folding: true,
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
});
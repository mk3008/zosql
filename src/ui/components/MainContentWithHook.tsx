/**
 * MainContentWithHook - Phase 1 Migration
 * Minimal change: Use hook for tab state display only
 * CRITICAL: MonacoEditor implementation unchanged
 */

import React, { forwardRef, useImperativeHandle, useEffect, useRef, memo, useState } from 'react';
import '../styles/tab-scrollbar.css';
import { WorkspaceEntity } from '@shared/types';
import { SqlModelEntity } from '@core/entities/sql-model';
import { DebugLogger } from '../../utils/debug-logger';

import { MonacoEditor } from './MonacoEditor';
import { QueryResults } from './QueryResults';
import { ResizableSplitter } from './ResizableSplitter';
import { DataTabResults } from './DataTabResults';
import { MainContentViewModel } from '@ui/viewmodels/main-content-viewmodel';
import { useMvvmBinding } from '@ui/hooks/useMvvm';
import { useTabState } from '@ui/hooks/useTabState';
import { useQueryExecution } from '@ui/hooks/useQueryExecution';

export interface MainContentRef {
  openValuesTab: () => void;
  openFormatterTab: () => void;
  openConditionTab: () => void;
  getCurrentSql: () => string;
  openSqlModel: (name: string, sql: string, type: 'main' | 'cte', modelEntity?: SqlModelEntity) => void;
  setCurrentModelEntity: (model: SqlModelEntity) => void;
  clearAllTabs: () => void;
  runStaticAnalysis: () => void;
  getWorkspace: () => WorkspaceEntity | null;
}

export interface MainContentProps {
  workspace: WorkspaceEntity | null;
  onWorkspaceChange?: (workspace: WorkspaceEntity) => void;
  onActiveTabChange?: (tabId: string | null) => void;
  onSqlExecuted?: (sql: string) => void;
  showSuccess?: (message: string) => void;
  showError?: (message: string) => void;
  showErrorWithDetails?: (message: string, details?: string, stack?: string) => void;
  onAnalysisUpdated?: () => void; // Notify parent when static analysis completes
}

// Global ViewModel instance to prevent duplication in React StrictMode
let globalViewModel: MainContentViewModel | null = null;

const MainContentWithHookComponent = forwardRef<MainContentRef, MainContentProps>(({ workspace, onWorkspaceChange, onActiveTabChange, onSqlExecuted, showSuccess, showError, showErrorWithDetails, onAnalysisUpdated }, ref) => {
  // Suppress unused variable warning
  void onWorkspaceChange;
  // MVVM: Create and bind ViewModel (singleton pattern)
  const viewModelRef = useRef<MainContentViewModel | null>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);
  // const [jumpToPosition, setJumpToPosition] = useState<number | undefined>(undefined); // Position jump temporarily disabled
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined); // Search term for Monaco editor
  const [resultTrigger, setResultTrigger] = useState(0); // Force re-render when results change
  
  if (!viewModelRef.current) {
    if (!globalViewModel) {
      DebugLogger.info('MainContentMvvm', 'Creating new MainContentViewModel instance');
      globalViewModel = new MainContentViewModel();
    }
    viewModelRef.current = globalViewModel;
  }
  const vm = useMvvmBinding(viewModelRef.current);
  
  // Phase 1: Use hook for tab display only
  const tabState = useTabState();
  
  // Phase 2: Use hook for execution state
  const executionState = useQueryExecution();

  // Update workspace reference only - use stable ID to prevent infinite updates
  const workspaceId = workspace?.id;
  useEffect(() => {
    if (workspace) {
      vm.workspace = workspace;
      
      // Workspace is set - Layout.tsx should handle all tab restoration
      // MainContentMvvm should NOT interfere with tab management during workspace loading
      DebugLogger.debug('MainContentMvvm', 'Workspace set, Layout.tsx will handle tab restoration');
    }
  }, [workspaceId, vm]); // workspaceId is stable, prevents infinite updates

  // Set SQL execution callback
  useEffect(() => {
    if (onSqlExecuted) {
      vm.setOnSqlExecuted(onSqlExecuted);
    }
  }, [onSqlExecuted, vm]);

  // Global keyboard event handler for shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        event.stopPropagation();
        if (vm.canSave) {
          vm.saveTab(vm.activeTabId);
        }
      } else if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        // Use data tab execution for values tab, regular execution for others
        if (vm.activeTab?.type === 'values') {
          vm.executeDataTabQueries();
        } else {
          vm.executeQuery();
        }
      } else if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        console.log('[DEBUG] Ctrl+Shift+A pressed');
        event.preventDefault();
        event.stopPropagation();
        vm.runStaticAnalysis();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [vm]);

  // MainContentMvvm should NOT create demo tabs - Layout.tsx handles all initialization
  // Remove fallback demo tab creation to force proper workspace initialization
  
  // Phase 1 & 2: Sync ViewModel with hooks (temporary for migration)
  useEffect(() => {
    // This is a controlled sync from ViewModel to hooks
    // We still use ViewModel for all operations
    const syncInterval = setInterval(() => {
      // Sync tabs
      if (vm.tabs.length !== tabState.tabs.length || vm.activeTabId !== tabState.activeTabId) {
        tabState.syncFromViewModel(vm.tabs, vm.activeTabId);
      }
      
      // Sync execution state (Phase 2)
      if (vm.queryResult !== executionState.queryResult) {
        executionState.setQueryResult(vm.queryResult);
      }
      if (vm.dataTabResults !== executionState.dataTabResults) {
        executionState.setDataTabResults(vm.dataTabResults);
      }
    }, 100);
    
    return () => clearInterval(syncInterval);
  }, [vm.tabs, vm.activeTabId, vm.queryResult, vm.dataTabResults, tabState, executionState]);

  // Notify parent of active tab changes and scroll to active tab
  useEffect(() => {
    onActiveTabChange?.(vm.activeTabId);
    
    // Auto-scroll to active tab
    if (vm.activeTabId && tabContainerRef.current) {
      const tabContainer = tabContainerRef.current;
      const activeTab = tabContainer.querySelector(`[data-tab-id="${vm.activeTabId}"]`) as HTMLElement;
      
      if (activeTab) {
        const containerRect = tabContainer.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        
        // Check if tab is outside visible area
        if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
          // Scroll to center the active tab
          const scrollLeft = activeTab.offsetLeft - (tabContainer.clientWidth / 2) + (activeTab.clientWidth / 2);
          tabContainer.scrollTo({
            left: Math.max(0, scrollLeft),
            behavior: 'smooth'
          });
        }
      }
    }
  }, [vm.activeTabId, onActiveTabChange]);

  // Handle Copy Prompt notifications
  useEffect(() => {
    const handlePropertyChange = (propertyName: string, value: unknown) => {
      DebugLogger.debug('MainContentMvvm', 'Property change received:', propertyName, value);
      if (propertyName === 'copyPromptSuccess') {
        console.log('[DEBUG] Showing success toast:', value);
        if (typeof value === 'string') {
          showSuccess?.(value);
        }
      } else if (propertyName === 'copyPromptError') {
        console.log('[DEBUG] Showing error toast:', value);
        if (typeof value === 'string') {
          showError?.(value);
        }
      } else if (propertyName === 'errorWithDetails') {
        console.log('[DEBUG] Showing error with details:', value);
        if (showErrorWithDetails && value && typeof value === 'object' && value !== null) {
          const errorObj = value as Record<string, unknown>;
          const message = typeof errorObj.message === 'string' ? errorObj.message : 'Unknown error';
          const details = typeof errorObj.details === 'string' ? errorObj.details : undefined;
          const stack = typeof errorObj.stack === 'string' ? errorObj.stack : undefined;
          showErrorWithDetails(message, details, stack);
        }
      } else if (propertyName === 'success') {
        console.log('[DEBUG] Showing success toast:', value);
        if (typeof value === 'string') {
          showSuccess?.(value);
        }
      } else if (propertyName === 'error') {
        console.log('[DEBUG] Showing error toast:', value);
        if (typeof value === 'string') {
          showError?.(value);
        }
      } else if (propertyName === 'analysisUpdated') {
        console.log('[DEBUG] Analysis updated, forcing re-render');
        // Force re-render to update error displays
        // Notify parent component (Layout) to update LeftSidebar
        onAnalysisUpdated?.();
      } else if (propertyName === 'queryResult') {
        console.log('[DEBUG] Query result changed, forcing re-render');
        // Force re-render when query result changes
        setResultTrigger(prev => prev + 1);
      }
    };

    if (viewModelRef.current) {
      console.log('[DEBUG] Subscribing to ViewModel property changes');
      const unsubscribe = viewModelRef.current.subscribe(handlePropertyChange);
      return unsubscribe;
    }
  }, [showSuccess, showError, showErrorWithDetails, onAnalysisUpdated]);

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
        // CRITICAL: Ensure workspace is available in ViewModel before adding tabs
        if (!vm.workspace) {
          console.log('[DEBUG] openValuesTab: Setting workspace in ViewModel before adding tab');
          vm.workspace = workspace;
        }
        
        // Check if tab already exists
        const existingTab = vm.tabs.find(tab => tab.type === 'values');
        if (existingTab) {
          vm.activeTabId = existingTab.id;
          return;
        }
        
        // Add values tab directly to ViewModel
        vm.addTab({
          id: 'values',
          title: 'values',
          type: 'values',
          content: workspace.testValues.withClause,
          isDirty: false
        });
      }
    },
    openFormatterTab: () => {
      if (workspace) {
        // CRITICAL: Ensure workspace is available in ViewModel before adding tabs
        if (!vm.workspace) {
          console.log('[DEBUG] openFormatterTab: Setting workspace in ViewModel before adding tab');
          vm.workspace = workspace;
        }
        
        // Check if tab already exists
        const existingTab = vm.tabs.find(tab => tab.type === 'formatter');
        if (existingTab) {
          vm.activeTabId = existingTab.id;
          return;
        }
        
        // Add formatter tab directly to ViewModel
        vm.addTab({
          id: 'formatter',
          title: 'formatter',
          type: 'formatter',
          content: JSON.stringify(workspace.formatter.toJSON(), null, 2),
          isDirty: false
        });
      }
    },
    openConditionTab: () => {
      if (workspace) {
        // CRITICAL: Ensure workspace is available in ViewModel before adding tabs
        if (!vm.workspace) {
          console.log('[DEBUG] openConditionTab: Setting workspace in ViewModel before adding tab');
          vm.workspace = workspace;
        }
        
        // Check if tab already exists
        const existingTab = vm.tabs.find(tab => tab.type === 'condition');
        if (existingTab) {
          vm.activeTabId = existingTab.id;
          return;
        }
        
        // Add condition tab directly to ViewModel
        vm.addTab({
          id: 'condition',
          title: 'condition',
          type: 'condition',
          content: JSON.stringify(workspace.filterConditions.toJSON(), null, 2),
          isDirty: false
        });
      }
    },
    getCurrentSql: () => vm.activeTab?.content || '',
    openSqlModel: (name: string, sql: string, type: 'main' | 'cte', modelEntity?: SqlModelEntity) => {
      // CRITICAL: Ensure workspace is available in ViewModel before adding tabs
      if (workspace && !vm.workspace) {
        console.log('[DEBUG] openSqlModel: Setting workspace in ViewModel before adding tab');
        vm.workspace = workspace;
      }
      
      // Check if tab already exists
      const existingTab = vm.tabs.find(tab => tab.id === name);
      if (existingTab) {
        // Just activate the existing tab
        vm.activeTabId = existingTab.id;
        return;
      }

      // Add new tab and sync to workspace
      console.log('[DEBUG] openSqlModel: Adding tab for', name, 'type:', type);
      vm.addTab({
        id: name,
        title: name,
        type,
        content: sql,
        isDirty: false
      });
      
      if (modelEntity) {
        vm.setTabModel(name, modelEntity);
        
        // Ensure editorContent is synced with tab content
        console.log('[DEBUG] setTabModel completed for', name);
        modelEntity.updateEditorContent(sql);
      }
      
      console.log('[DEBUG] openSqlModel completed, current tabs count:', vm.tabs.length);
    },
    setCurrentModelEntity: (model: SqlModelEntity) => {
      if (vm.activeTab) {
        vm.setTabModel(vm.activeTab.id, model);
      }
    },
    clearAllTabs: () => {
      // Complete workspace state reset
      vm.resetWorkspaceState();
    },
    runStaticAnalysis: () => {
      vm.runStaticAnalysis();
    },
    getWorkspace: () => {
      return vm.workspace;
    }
  }), [vm, workspace]);

  // Event Handlers (delegating to ViewModel commands)
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      // Use data tab execution for values tab, regular execution for others
      if (vm.activeTab?.type === 'values') {
        vm.executeDataTabQueries();
      } else {
        vm.executeQuery();
      }
    } else if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      if (vm.canSave) {
        vm.saveTab(vm.activeTabId);
      }
    }
  };

  // Handle horizontal wheel scroll for tabs
  const handleTabWheel = (event: React.WheelEvent) => {
    const container = event.currentTarget;
    if (event.deltaY !== 0) {
      event.preventDefault();
      container.scrollLeft += event.deltaY;
    }
  };

  // Get emoji icon for tab type
  const getTabIcon = (tabType: string): string => {
    switch (tabType) {
      case 'main':
        return '📄'; // Main SQL file
      case 'cte':
        return '🔗'; // CTE (linked/chained)
      case 'values':
        return '📊'; // Test values/data
      case 'formatter':
        return '🔧'; // Formatter settings
      case 'condition':
        return '⚙️'; // Filter conditions
      default:
        return '📝'; // Default document
    }
  };

  // Get display title for tab
  const getTabTitle = (tab: { title: string; type: string }): string => {
    switch (tab.type) {
      case 'main':
        return '*root';
      case 'values':
        return '*data';
      default:
        return tab.title;
    }
  };

  // Handle error message click to open search for columns
  const handleColumnHighlight = (errorMessage: string) => {
    console.log('[DEBUG] handleColumnHighlight called with:', errorMessage);
    const unresolvedMatch = errorMessage.match(/Unresolved columns: (.+)/);
    if (unresolvedMatch) {
      console.log('[DEBUG] Regex matched:', unresolvedMatch[1]);
      const columns = unresolvedMatch[1]
        .split(',')
        .map(col => col.trim())
        .filter(col => col.length > 0);
      
      console.log('[DEBUG] Parsed columns:', columns);
      
      if (columns.length > 0) {
        // Reset search term first to ensure change detection
        setSearchTerm(undefined);
        
        // Then set the new search term with a small delay
        setTimeout(() => {
          // Use the first column for search
          const firstColumn = columns[0];
          console.log('[DEBUG] Opening search for column:', firstColumn);
          setSearchTerm(firstColumn);
          
          // Clear search term after a longer delay to allow re-triggering
          setTimeout(() => {
            console.log('[DEBUG] Clearing search term');
            setSearchTerm(undefined);
          }, 2000);
        }, 50);
      }
    } else {
      console.log('[DEBUG] No regex match found for errorMessage:', errorMessage);
    }
  };

  // Pure View - No business logic, only bindings
  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Tab Bar - Fixed at top */}
      <div 
        ref={tabContainerRef}
        className="border-b border-dark-border-primary flex items-center overflow-x-auto relative tab-container flex-shrink-0"
        style={{ backgroundColor: '#1a1a1a' }}
        onWheel={handleTabWheel}
      >
        <div className="flex min-w-max">
          {vm.tabs.map(tab => (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              className={`
                flex items-center gap-2 px-4 py-2 cursor-pointer relative flex-shrink-0 border-r border-dark-border-primary
                ${vm.activeTabId === tab.id 
                  ? 'text-dark-text-white z-10' 
                  : 'text-dark-text-primary hover:bg-dark-hover'
                }
              `}
              style={{
                backgroundColor: vm.activeTabId === tab.id ? '#252526' : '#1a1a1a'
              }}
              onClick={() => vm.activeTabId = tab.id}
            >
              {/* Active tab bottom accent */}
              {vm.activeTabId === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs">{getTabIcon(tab.type)}</span>
                <span className="text-sm">{getTabTitle(tab)}</span>
              </div>
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
        {/* Dynamic Toolbar based on tab type */}
        {vm.activeTab && vm.activeTab.type === 'values' ? (
          /* Data Tab Toolbar */
          <div className="bg-dark-secondary border-b border-dark-border-primary px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Copy Prompt Settings */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-dark-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vm.useSchemaCollector}
                      onChange={(e) => vm.useSchemaCollector = e.target.checked}
                      className="w-4 h-4 text-primary-600 bg-dark-primary border-dark-border-primary rounded focus:ring-primary-500 focus:ring-2"
                    />
                    use schema collector
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => vm.copyPrompt()}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm"
                  title="Copy AI prompt to clipboard for generating test data"
                >
                  Copy Prompt
                </button>
                
                <button 
                  onClick={() => vm.executeDataTabQueries()}
                  disabled={vm.isExecuting}
                  className="px-3 py-1 bg-success text-white rounded hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Execute all queries (Root + CTEs)"
                >
                  {vm.isExecuting ? 'Running...' : 'Run'}
                </button>
                
                <button 
                  onClick={() => {
                    if (vm.activeTab) {
                      vm.saveTab(vm.activeTab.id);
                    }
                  }}
                  disabled={!vm.activeTab?.isDirty}
                  className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save changes to workspace"
                >
                  Save
                </button>
                
                <button 
                  onClick={() => vm.formatQuery()}
                  disabled={!vm.canFormat}
                  className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Format
                </button>
              </div>
            </div>
            
            {/* Description */}
            <div className="mt-2 text-xs text-dark-text-secondary">
              Generate AI prompts to create WITH clauses with mock data for your SQL queries. 
              Enable "use schema collector" for table structure analysis.
            </div>
          </div>
        ) : (
          /* Default Toolbar for root/CTE tabs */
          <div className="bg-dark-secondary border-b border-dark-border-primary px-4 py-2">
            <div className="flex items-center justify-between">
              {/* Left side - validation errors with fixed height */}
              <div className="flex items-center gap-2 text-sm min-h-[24px] flex-1 min-w-0">
                {(() => {
                  // Get validation error for current tab
                  if (!vm.workspace || !vm.activeTab || (vm.activeTab.type !== 'main' && vm.activeTab.type !== 'cte')) {
                    return null;
                  }
                  
                  const model = vm.tabModelMap.get(vm.activeTab.id);
                  if (!model) return null;
                  
                  const validationResult = vm.workspace.getValidationResult(model.name);
                  if (!validationResult || validationResult.success) return null;
                  
                  // Parse and display different types of validation errors
                  const errorMessage = validationResult.error || '';
                  
                  // Handle Parse Errors (highest priority) - position click temporarily disabled
                  if (errorMessage.includes('Parse error') || errorMessage.includes('SQL Parse Error:')) {
                    return (
                      <span className="text-red-400 truncate" title={errorMessage}>
                        Parse error
                      </span>
                    );
                  }
                  
                  if (errorMessage.includes('Analysis error')) {
                    return (
                      <span className="text-red-400 truncate" title={errorMessage}>
                        Analysis error
                      </span>
                    );
                  }
                  
                  // Handle Unresolved Columns (clickable to highlight)
                  if (errorMessage.includes('Unresolved columns:')) {
                    console.log('[DEBUG] Found unresolved columns error:', errorMessage);
                    const unresolvedMatch = errorMessage.match(/Unresolved columns: (.+)/);
                    if (unresolvedMatch) {
                      const columns = unresolvedMatch[1].trim();
                      console.log('[DEBUG] Matched columns:', columns);
                      return (
                        <span 
                          className="text-red-400 truncate cursor-pointer hover:text-red-300 hover:underline" 
                          title={`Unresolved columns: ${columns} - Click to search in editor`}
                          onClick={(e) => {
                            console.log('[DEBUG] Unresolved columns clicked!', e);
                            handleColumnHighlight(errorMessage);
                          }}
                          style={{ cursor: 'pointer' }} // Force cursor style
                        >
                          Unresolved columns: {columns}
                        </span>
                      );
                    }
                  }
                  
                  // Handle legacy format (Column reference(s) without table name) - now clickable
                  const legacyMatch = errorMessage.match(/Column reference\(s\) without table name found in query: (.+)/);
                  if (legacyMatch) {
                    const columns = legacyMatch[1].trim();
                    console.log('[DEBUG] Found legacy format unresolved columns:', columns);
                    return (
                      <span 
                        className="text-red-400 truncate cursor-pointer hover:text-red-300 hover:underline" 
                        title={`Unresolved columns: ${columns} - Click to search in editor`}
                        onClick={(e) => {
                          console.log('[DEBUG] Legacy format columns clicked!', e);
                          // Create a fake "Unresolved columns:" message for the handler
                          handleColumnHighlight(`Unresolved columns: ${columns}`);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        Unresolved columns: {columns}
                      </span>
                    );
                  }
                  
                  // Handle Schema Analysis Errors
                  if (errorMessage.includes('Schema Analysis Error:')) {
                    return (
                      <span className="text-red-400 truncate" title={errorMessage}>
                        Schema analysis error
                      </span>
                    );
                  }
                  
                  // Show other errors with truncation
                  return (
                    <span className="text-red-400 truncate" title={errorMessage}>
                      {errorMessage}
                    </span>
                  );
                })()}
              </div>
              
              {/* Right side - buttons */}
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
                  onClick={() => vm.saveTab(vm.activeTabId)}
                  disabled={!vm.canSave}
                  className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save changes to model (Ctrl+S)"
                >
                  Save
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
        )}

        {/* Content Area with Resizable Splitter */}
        <div className="flex-1 overflow-hidden">
          {vm.activeTab && (
            <>
              {vm.activeTab.type !== 'values' && vm.resultsVisible && vm.queryResult ? (
                // Split view with resizable splitter
                <ResizableSplitter
                  direction="vertical"
                  initialSizes={[100 - vm.resultsPanelHeight, vm.resultsPanelHeight]}
                  minSizes={[200, 150]} // Minimum 200px for editor, 150px for results
                  onResize={(sizes) => vm.handleSplitterResize(sizes)}
                  className="h-full"
                >
                  {/* Monaco Editor - top pane */}
                  <div className="h-full bg-dark-primary overflow-hidden">
                    <MonacoEditor
                      key="main-editor-unified" // Single stable key prevents remounting
                      value={vm.activeTab.content}
                      onChange={(value) => {
                        console.log('[DEBUG] Monaco onChange for tab:', vm.activeTab!.id, 'type:', vm.activeTab!.type);
                        vm.updateTabContent(vm.activeTab!.id, value);
                        
                        // Update model's editor content for real-time validation
                        const model = vm.tabModelMap.get(vm.activeTab!.id);
                        if (model && (vm.activeTab!.type === 'main' || vm.activeTab!.type === 'cte')) {
                          console.log('[DEBUG] Updating model editor content for', vm.activeTab!.id, 'length:', value.length);
                          console.log('[DEBUG] Before update - model.editorContent:', model.editorContent.substring(0, 100) + '...');
                          model.updateEditorContent(value);
                          console.log('[DEBUG] After update - model.editorContent:', model.editorContent.substring(0, 100) + '...');
                          console.log('[DEBUG] Has unsaved changes:', model.hasUnsavedChanges);
                        } else {
                          console.log('[DEBUG] Model not found or wrong type for tab:', vm.activeTab!.id, 'model exists:', !!model);
                        }
                      }}
                      language={(vm.activeTab.type === 'formatter' || vm.activeTab.type === 'condition') ? 'json' : 'sql'}
                      height="100%"
                      isMainEditor={true}
                      onKeyDown={handleKeyDown}
                      workspace={workspace}
                      // jumpToPosition={jumpToPosition} // Position jump temporarily disabled
                      searchTerm={searchTerm}
                      options={{
                        wordWrap: 'off',
                        minimap: { enabled: false },
                        folding: true,
                      }}
                    />
                  </div>
                  
                  {/* Query Results - bottom pane */}
                  <div className="h-full overflow-hidden">
                    {(() => {
                      // Get query result directly from the ViewModel
                      const result = vm.queryResult;
                      
                      console.log('[DEBUG] QueryResults render check:', {
                        activeTabId: vm.activeTabId,
                        resultsVisible: vm.resultsVisible,
                        hasResult: !!result,
                        resultStatus: result?.status,
                        resultRowsCount: result?.rows?.length,
                        resultErrorsCount: result?.errors?.length
                      });
                      
                      return result ? (
                        <QueryResults
                          key={`results-${vm.activeTabId}-${resultTrigger}`} // Force remount on tab change and result update
                          result={result}
                          isVisible={vm.resultsVisible}
                          onClose={() => vm.closeResults()}
                        />
                      ) : (
                        <div className="h-full border-t border-dark-border-primary bg-dark-secondary p-4">
                          <div className="text-dark-text-muted">No query result available</div>
                        </div>
                      );
                    })()}
                  </div>
                </ResizableSplitter>
              ) : tabState.activeTab && tabState.activeTab.type === 'values' && executionState.dataTabResults.size > 0 ? (
                // Split view for values tab with results
                <ResizableSplitter
                  direction="vertical"
                  initialSizes={[20, 80]} // Start with 20% editor, 80% results for maximum grid space
                  minSizes={[40, 150]} // Minimum 40px for collapsed editor header, 150px for results
                  onResize={(_sizes) => {
                    // Optional: save splitter state if needed
                  }}
                  className="h-full"
                >
                  {/* Monaco Editor - top pane (can be made very small) */}
                  <div className="h-full bg-dark-primary overflow-hidden flex flex-col">
                    {/* Editor Header - Always visible */}
                    <div className="bg-dark-tertiary border-b border-dark-border-primary px-4 py-2 flex items-center justify-between flex-shrink-0">
                      <span className="text-sm font-medium text-dark-text-white">SQL Editor</span>
                    </div>
                    
                    {/* Editor Content */}
                    <div className="flex-1 overflow-hidden">
                      <MonacoEditor
                        key="values-editor-split"
                        value={vm.activeTab.content}
                        onChange={(value) => {
                          console.log('[DEBUG] Monaco onChange for values tab:', vm.activeTab!.id);
                          vm.updateTabContent(vm.activeTab!.id, value);
                        }}
                        language="sql"
                        height="100%"
                        isMainEditor={true}
                        onKeyDown={handleKeyDown}
                        workspace={workspace}
                        searchTerm={searchTerm}
                        options={{
                          wordWrap: 'off',
                          wrappingStrategy: 'simple',
                          scrollBeyondLastLine: false,
                          minimap: { enabled: false },
                          folding: true,
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Data Tab Results - bottom pane with single vertical scroll */}
                  <div className="h-full overflow-y-auto overflow-x-hidden bg-dark-secondary p-4">
                    <DataTabResults results={executionState.dataTabResults} />
                  </div>
                </ResizableSplitter>
              ) : (
                // Single editor view (no results or non-values tab)
                <div className="h-full bg-dark-primary overflow-hidden">
                  <MonacoEditor
                    key="main-editor-unified" // Single stable key prevents remounting
                    value={vm.activeTab.content}
                    onChange={(value) => {
                      console.log('[DEBUG] Monaco onChange for tab:', vm.activeTab!.id, 'type:', vm.activeTab!.type);
                      vm.updateTabContent(vm.activeTab!.id, value);
                      
                      // Update model's editor content for real-time validation
                      const model = vm.tabModelMap.get(vm.activeTab!.id);
                      if (model && (vm.activeTab!.type === 'main' || vm.activeTab!.type === 'cte')) {
                        console.log('[DEBUG] Updating model editor content for', vm.activeTab!.id, 'length:', value.length);
                        console.log('[DEBUG] Before update - model.editorContent:', model.editorContent.substring(0, 100) + '...');
                        model.updateEditorContent(value);
                        console.log('[DEBUG] After update - model.editorContent:', model.editorContent.substring(0, 100) + '...');
                        console.log('[DEBUG] Has unsaved changes:', model.hasUnsavedChanges);
                      } else {
                        console.log('[DEBUG] Model not found or wrong type for tab:', vm.activeTab!.id, 'model exists:', !!model);
                      }
                    }}
                    language={vm.activeTab.type === 'values' ? 'sql' : (vm.activeTab.type === 'formatter' || vm.activeTab.type === 'condition') ? 'json' : 'sql'}
                    height="100%"
                    isMainEditor={true}
                    onKeyDown={handleKeyDown}
                    workspace={workspace}
                    // jumpToPosition={jumpToPosition} // Position jump temporarily disabled
                    searchTerm={searchTerm}
                    options={vm.activeTab.type === 'values' ? {
                      wordWrap: 'off',
                      wrappingStrategy: 'simple',
                      scrollBeyondLastLine: false,
                      minimap: { enabled: false },
                      folding: true,
                    } : (vm.activeTab.type === 'formatter' || vm.activeTab.type === 'condition') ? {
                      wordWrap: 'off',
                      formatOnType: true,
                      formatOnPaste: true,
                      minimap: { enabled: false },
                      readOnly: false
                    } : {
                      wordWrap: 'off',
                      minimap: { enabled: false },
                      folding: true,
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
});

// Memoize to prevent unnecessary re-renders when workspace object reference changes
// but actual content hasn't changed
export const MainContentWithHook = memo(MainContentWithHookComponent, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if workspace content actually changed
  if (prevProps.workspace === nextProps.workspace) {
    return true; // Props are equal, skip render
  }
  
  // If one is null and the other isn't, they're different
  if (!prevProps.workspace || !nextProps.workspace) {
    return false; // Props are different, re-render
  }
  
  // Deep comparison for workspace changes that actually matter
  // (You can add more specific checks here if needed)
  return (
    prevProps.workspace.name === nextProps.workspace.name &&
    prevProps.workspace.activeObjectId === nextProps.workspace.activeObjectId &&
    prevProps.workspace.openedObjects.length === nextProps.workspace.openedObjects.length
  );
});
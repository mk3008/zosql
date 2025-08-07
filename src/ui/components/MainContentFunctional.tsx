/**
 * MainContentFunctional - Full functional implementation
 * Phase 3: Complete migration from MVVM to functional React
 * CRITICAL: MonacoEditor key remains fixed for stability
 */

import React, { forwardRef, useImperativeHandle, useEffect, useRef, memo, useState, useCallback } from 'react';
import '../styles/tab-scrollbar.css';
import { WorkspaceEntity } from '@shared/types';
import { SqlModelEntity } from '@core/entities/sql-model';
import { DebugLogger } from '../../utils/debug-logger';

import { MonacoEditor } from './MonacoEditor';
import { QueryResults } from './QueryResults';
import { DataTabResults } from './DataTabResults';

// Import hooks
import { useMainContentState } from '@ui/hooks/useMainContentState';
import { useMainContentExecution } from '@ui/hooks/useMainContentExecution';

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
  onAnalysisUpdated?: () => void;
}

const MainContentFunctionalComponent = forwardRef<MainContentRef, MainContentProps>(({ 
  workspace,
  onWorkspaceChange,
  onActiveTabChange,
  onSqlExecuted,
  showSuccess,
  showError,
  showErrorWithDetails,
  onAnalysisUpdated
}, ref) => {
  // Suppress unused variable warnings
  void onWorkspaceChange;
  void showErrorWithDetails;
  
  // Use hooks for all state and logic
  const state = useMainContentState();
  const execution = useMainContentExecution();
  
  // Local UI state
  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [searchTerm] = useState<string | undefined>(undefined);
  const [editorHeight, setEditorHeight] = useState<number>(70); // Percentage for editor height
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Load workspace tabs when workspace changes
  const workspaceId = workspace?.id;
  useEffect(() => {
    if (workspace) {
      state.loadWorkspaceTabs(workspace);
      DebugLogger.debug('MainContentFunctional', 'Workspace loaded');
    }
  }, [workspaceId]); // Only depend on workspaceId to avoid re-runs
  
  // Notify parent of active tab changes
  useEffect(() => {
    onActiveTabChange?.(state.activeTabId);
    
    // Auto-scroll to active tab
    if (state.activeTabId && tabContainerRef.current) {
      const tabContainer = tabContainerRef.current;
      const activeTabElement = tabContainer.querySelector(`[data-tab-id="${state.activeTabId}"]`) as HTMLElement;
      
      if (activeTabElement) {
        const containerRect = tabContainer.getBoundingClientRect();
        const tabRect = activeTabElement.getBoundingClientRect();
        
        if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
          const scrollLeft = activeTabElement.offsetLeft - (tabContainer.clientWidth / 2) + (activeTabElement.clientWidth / 2);
          tabContainer.scrollTo({
            left: Math.max(0, scrollLeft),
            behavior: 'smooth'
          });
        }
      }
    }
  }, [state.activeTabId, onActiveTabChange]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        if (state.activeTab?.isDirty && state.activeTabId) {
          state.saveTab(state.activeTabId);
          showSuccess?.('Tab saved');
        }
      } else if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        if (state.activeTab && !state.isExecuting) {
          if (state.activeTab.type === 'values' && workspace) {
            state.setIsExecuting(true);
            execution.executeDataTabQueries(
              workspace,
              (results) => {
                state.setDataTabResults(results);
                state.setIsExecuting(false);
                showSuccess?.('Data queries executed');
              },
              (error) => {
                state.setIsExecuting(false);
                showError?.(error);
              }
            );
          } else {
            state.setIsExecuting(true);
            execution.executeQuery(
              state.activeTab,
              workspace,
              state.tabModelMap,
              (result) => {
                state.setTabQueryResult(state.activeTab!.id, result);
                state.setResultsVisible(true);
                state.setIsExecuting(false);
              },
              (error) => {
                state.setIsExecuting(false);
                showError?.(error);
              },
              onSqlExecuted
            );
          }
        }
      } else if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        if (workspace) {
          execution.runStaticAnalysis(
            workspace,
            state.tabs,
            state.saveTab,
            () => {
              showSuccess?.('Static analysis complete');
              onAnalysisUpdated?.();
            }
          );
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [state, execution, workspace, onSqlExecuted, showSuccess, showError, onAnalysisUpdated]);
  
  // Imperative interface
  useImperativeHandle(ref, () => ({
    openValuesTab: () => {
      if (workspace) {
        state.openTestValues(workspace);
      }
    },
    openFormatterTab: () => {
      if (workspace) {
        state.addTab({
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
        state.addTab({
          id: 'condition',
          title: 'condition',
          type: 'condition',
          content: JSON.stringify(workspace.filterConditions.toJSON(), null, 2),
          isDirty: false
        });
      }
    },
    getCurrentSql: () => state.activeTab?.content || '',
    openSqlModel: (name: string, sql: string, type: 'main' | 'cte', modelEntity?: SqlModelEntity) => {
      if (modelEntity) {
        state.openSqlModel(modelEntity);
      } else {
        state.addTab({
          id: name,
          title: name,
          type,
          content: sql,
          isDirty: false
        });
      }
    },
    setCurrentModelEntity: (model: SqlModelEntity) => {
      if (state.activeTab) {
        state.setTabModel(state.activeTab.id, model);
      }
    },
    clearAllTabs: () => {
      state.resetState();
    },
    runStaticAnalysis: () => {
      if (workspace) {
        execution.runStaticAnalysis(
          workspace,
          state.tabs,
          state.saveTab,
          () => {
            showSuccess?.('Static analysis complete');
            onAnalysisUpdated?.();
          }
        );
      }
    },
    getWorkspace: () => workspace
  }), [state, execution, workspace, showSuccess, onAnalysisUpdated]);
  
  // Event handlers
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      
      // Execute query directly from Monaco editor
      if (state.activeTab && !state.isExecuting) {
        if (state.activeTab.type === 'values' && workspace) {
          state.setIsExecuting(true);
          execution.executeDataTabQueries(
            workspace,
            (results) => {
              state.setDataTabResults(results);
              state.setIsExecuting(false);
              showSuccess?.('Data queries executed');
            },
            (error) => {
              state.setIsExecuting(false);
              showError?.(error);
            }
          );
        } else if (workspace) {
          state.setIsExecuting(true);
          execution.executeQuery(
            state.activeTab,
            workspace,
            state.tabModelMap,
            (result) => {
              state.setTabQueryResult(state.activeTab!.id, result);
              state.setResultsVisible(true);
              state.setIsExecuting(false);
            },
            (error) => {
              state.setIsExecuting(false);
              showError?.(error);
            },
            onSqlExecuted
          );
        }
      }
    } else if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      event.stopPropagation();
      
      // Save directly from Monaco editor
      if (state.activeTab?.isDirty && state.activeTabId) {
        state.saveTab(state.activeTabId);
        showSuccess?.('Tab saved');
      }
    }
  };
  
  const handleTabWheel = (event: React.WheelEvent) => {
    const container = event.currentTarget;
    if (event.deltaY !== 0) {
      event.preventDefault();
      container.scrollLeft += event.deltaY;
    }
  };
  
  // Splitter resize handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const mouseY = event.clientY - containerRect.top;
    const containerHeight = containerRect.height;
    const newEditorHeight = (mouseY / containerHeight) * 100;
    
    // Apply constraints: editor 30-80%, results 20-70%
    const minEditorHeight = 30;
    const maxEditorHeight = 80;
    
    const constrainedHeight = Math.max(minEditorHeight, Math.min(maxEditorHeight, newEditorHeight));
    setEditorHeight(constrainedHeight);
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add global mouse event listeners when resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
  // Helper functions
  const getTabIcon = (tabType: string): string => {
    switch (tabType) {
      case 'main': return '📄';
      case 'cte': return '🔗';
      case 'values': return '📊';
      case 'formatter': return '🔧';
      case 'condition': return '⚙️';
      default: return '📝';
    }
  };
  
  const getTabTitle = (tab: { title: string; type: string }): string => {
    switch (tab.type) {
      case 'main': return '*root';
      case 'values': return '*data';
      default: return tab.title;
    }
  };
  
  // Check display conditions - unified logic for all tab types
  const showDataTabResults = state.activeTab?.type === 'values' && state.dataTabResults.size > 0;
  const showQueryResults = state.resultsVisible && state.activeTab?.queryResult && state.activeTab?.type !== 'values';
  
  // Dynamic sizing based on whether results are shown
  const shouldShowResults = showDataTabResults || showQueryResults;
  
  return (
    <main className="h-screen flex flex-col bg-dark-primary text-text-primary overflow-hidden w-full max-w-full">
      {/* Tabs */}
      <div className="flex-shrink-0 border-b border-dark-border-primary" style={{ backgroundColor: '#1a1a1a' }}>
        <div 
          className="flex overflow-x-auto scrollbar-hide min-w-max" 
          onWheel={handleTabWheel}
          ref={tabContainerRef}
        >
          {state.tabs.map((tab) => (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              className={`flex-shrink-0 px-4 py-2 border-r border-dark-border-primary cursor-pointer select-none flex items-center gap-2 hover:bg-dark-hover transition-colors duration-150 relative ${
                tab.id === state.activeTabId 
                  ? 'text-dark-text-white z-10' 
                  : 'text-dark-text-primary hover:text-text-primary'
              }`}
              style={{
                backgroundColor: tab.id === state.activeTabId ? '#252526' : '#1a1a1a'
              }}
              onClick={() => state.setActiveTab(tab.id)}
            >
              {/* Active tab bottom accent */}
              {tab.id === state.activeTabId && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs">{getTabIcon(tab.type)}</span>
                <span className="text-sm whitespace-nowrap">{getTabTitle(tab)}</span>
              </div>
              {tab.isDirty && <span className="text-xs text-primary-400">●</span>}
              {state.tabs.length > 1 && (
                <button
                  className="ml-1 text-xs text-dark-text-secondary hover:text-dark-text-primary focus:outline-none"
                  onClick={(e) => {
                    e.stopPropagation();
                    state.closeTab(tab.id);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full max-w-full">
        {!state.activeTab ? (
          <div className="h-full flex items-center justify-center text-text-muted bg-dark-primary">
            <div className="text-center">
              <div className="text-4xl mb-4">📄</div>
              <div className="text-lg">No tabs open</div>
              <div className="text-sm opacity-75">Open a SQL model to start editing</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden w-full max-w-full">
            {/* Dynamic Toolbar based on tab type */}
            {state.activeTab.type === 'values' ? (
              /* Data Tab Toolbar */
              <div className="bg-dark-secondary border-b border-dark-border-primary px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Copy Prompt Settings */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-accent-primary bg-dark-primary border-border-secondary rounded focus:ring-accent-primary focus:ring-2"
                        />
                        use schema collector
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        // TODO: Implement copyPrompt functionality
                        showSuccess?.('Copy Prompt clicked');
                      }}
                      className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm"
                      title="Copy AI prompt to clipboard for generating test data"
                    >
                      Copy Prompt
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (workspace) {
                          state.setIsExecuting(true);
                          execution.executeDataTabQueries(
                            workspace,
                            (results) => {
                              state.setDataTabResults(results);
                              state.setIsExecuting(false);
                              showSuccess?.('Data queries executed');
                            },
                            (error) => {
                              state.setIsExecuting(false);
                              showError?.(error);
                            }
                          );
                        }
                      }}
                      disabled={state.isExecuting}
                      className="px-3 py-1 bg-success text-white rounded hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Execute all queries (Root + CTEs)"
                    >
                      {state.isExecuting ? 'Running...' : 'Run'}
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (state.activeTab && state.activeTab.isDirty) {
                          state.saveTab(state.activeTab.id);
                        }
                      }}
                      disabled={!state.activeTab?.isDirty}
                      className="px-3 py-1 bg-dark-hover text-text-primary rounded hover:bg-dark-active transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save changes to workspace"
                    >
                      Save
                    </button>
                  </div>
                </div>
                
                {/* Description */}
                <div className="mt-2 text-xs text-text-secondary">
                  Generate AI prompts to create WITH clauses with mock data for your SQL queries. 
                  Enable "use schema collector" for table structure analysis.
                </div>
              </div>
            ) : (
              /* Default Toolbar for root/CTE tabs */
              <div className="bg-dark-secondary border-b border-dark-border-primary px-4 py-2">
                <div className="flex items-center justify-between">
                  {/* Left side - validation errors */}
                  <div className="flex items-center gap-2 text-sm min-h-[24px] flex-1 min-w-0">
                    {(() => {
                      // Get validation error for current tab
                      if (!workspace || !state.activeTab || (state.activeTab.type !== 'main' && state.activeTab.type !== 'cte')) {
                        return null;
                      }
                      
                      const model = state.tabModelMap.get(state.activeTab.id);
                      if (!model) return null;
                      
                      const validationResult = workspace.getValidationResult(model.name);
                      if (!validationResult || validationResult.success) return null;
                      
                      const errorMessage = validationResult.error || '';
                      
                      if (errorMessage.includes('Parse error') || errorMessage.includes('SQL Parse Error:')) {
                        return (
                          <span className="text-error truncate" title={errorMessage}>
                            Parse error
                          </span>
                        );
                      }
                      
                      if (errorMessage.includes('Analysis error')) {
                        return (
                          <span className="text-error truncate" title={errorMessage}>
                            Analysis error
                          </span>
                        );
                      }
                      
                      if (errorMessage.includes('Unresolved columns:')) {
                        const unresolvedMatch = errorMessage.match(/Unresolved columns: (.+)/);
                        if (unresolvedMatch) {
                          const columns = unresolvedMatch[1].trim();
                          return (
                            <span 
                              className="text-error truncate cursor-pointer hover:text-red-300 hover:underline" 
                              title={`Unresolved columns: ${columns} - Click to search in editor`}
                            >
                              Unresolved columns: {columns}
                            </span>
                          );
                        }
                      }
                      
                      return (
                        <span className="text-error truncate" title={errorMessage}>
                          {errorMessage}
                        </span>
                      );
                    })()}
                  </div>
                  
                  {/* Right side - buttons */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (state.activeTab && workspace && !state.isExecuting) {
                          state.setIsExecuting(true);
                          execution.executeQuery(
                            state.activeTab,
                            workspace,
                            state.tabModelMap,
                            (result) => {
                              state.setTabQueryResult(state.activeTab!.id, result);
                              state.setResultsVisible(true);
                              state.setIsExecuting(false);
                            },
                            (error) => {
                              state.setIsExecuting(false);
                              showError?.(error);
                            },
                            onSqlExecuted
                          );
                        }
                      }}
                      disabled={state.isExecuting}
                      className="px-3 py-1 bg-success text-white rounded hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Run Query (Ctrl+Enter)"
                    >
                      {state.isExecuting ? 'Running...' : 'Run'}
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (state.activeTab && state.activeTab.isDirty) {
                          state.saveTab(state.activeTab.id);
                          showSuccess?.('Tab saved');
                        }
                      }}
                      disabled={!state.activeTab?.isDirty}
                      className="px-3 py-1 bg-dark-hover text-text-primary rounded hover:bg-dark-active transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save changes to model (Ctrl+S)"
                    >
                      Save
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (state.activeTab && workspace) {
                          execution.formatQuery(
                            state.activeTab,
                            workspace,
                            (formattedSql) => {
                              state.updateTabContent(state.activeTab!.id, formattedSql);
                              showSuccess?.('Query formatted');
                            },
                            (error) => showError?.(error)
                          );
                        }
                      }}
                      className="px-3 py-1 bg-dark-hover text-text-primary rounded hover:bg-dark-active transition-colors text-sm"
                      title="Format Query"
                    >
                      Format
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* SQL Editor and Results Layout */}
            <div className="flex-1 flex flex-col min-h-0" ref={containerRef}>
              {/* SQL Editor Area - Dynamic height based on splitter */}
              <div 
                className="flex flex-col bg-dark-primary"
                style={{
                  height: shouldShowResults ? `${editorHeight}%` : '100%',
                  minHeight: shouldShowResults ? '200px' : '300px'
                }}
              >
                <MonacoEditor
                  key="main-editor-unified"
                  value={state.activeTab.content}
                  onChange={(value) => {
                    DebugLogger.debug('MainContentFunctional', `Monaco onChange for tab: ${state.activeTab!.id}, length: ${value.length}`);
                    state.updateTabContent(state.activeTab!.id, value);
                  }}
                  language="sql"
                  height="100%"
                  isMainEditor={true}
                  onKeyDown={handleKeyDown}
                  workspace={workspace}
                  searchTerm={searchTerm}
                  options={{
                    wordWrap: 'off',
                    minimap: { enabled: false },
                    folding: true,
                  }}
                />
              </div>
              
              {/* Interactive Resizer - Only visible when results are shown */}
              {shouldShowResults && (
                <div 
                  className="h-1 bg-dark-border-primary hover:bg-primary-600 cursor-row-resize transition-colors duration-150 flex-shrink-0"
                  onMouseDown={handleMouseDown}
                  style={{
                    backgroundColor: isResizing ? '#007acc' : undefined
                  }}
                />
              )}
              
              {/* SQL Results Area - Dynamic height based on splitter */}
              {shouldShowResults && (
                <div 
                  className="overflow-auto bg-dark-secondary border-t border-dark-border-primary"
                  style={{
                    height: `${100 - editorHeight}%`,
                    minHeight: '250px'
                  }}
                >
                  {state.isExecuting ? (
                    // Loading state
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mb-4"></div>
                        <div className="text-text-secondary">
                          {state.activeTab.type === 'values' ? 'Executing queries...' : 'Executing query...'}
                        </div>
                      </div>
                    </div>
                  ) : state.activeTab.type === 'values' && showDataTabResults ? (
                    // Data tab results - scrollable content area
                    <div className="h-full flex flex-col">
                      <DataTabResults results={state.dataTabResults} />
                    </div>
                  ) : state.activeTab.type !== 'values' && showQueryResults ? (
                    // SQL/CTE tab results - QueryResults handles header/data separation
                    <div className="h-full flex flex-col">
                      <QueryResults
                        result={state.activeTab.queryResult || null}
                        isVisible={true}
                        onClose={() => state.closeResults()}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
});

// Memoize for performance - only re-render when workspace actually changes
export const MainContentFunctional = memo(MainContentFunctionalComponent, (prevProps, nextProps) => {
  // Same workspace instance - no re-render needed
  if (prevProps.workspace === nextProps.workspace) {
    return true;
  }
  
  // One is null, other is not - re-render needed
  if (!prevProps.workspace || !nextProps.workspace) {
    return false;
  }
  
  // Different workspace instances - only re-render if content actually changed
  return (
    prevProps.workspace.id === nextProps.workspace.id &&
    prevProps.workspace.name === nextProps.workspace.name &&
    prevProps.workspace.openedObjects.length === nextProps.workspace.openedObjects.length
  );
});
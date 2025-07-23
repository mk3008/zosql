import React, { useState, useEffect } from 'react';
import { WorkspaceEntity } from '@shared/types';
import { MonacoEditor } from './MonacoEditor';
import { useToast } from '@ui/hooks/useToast';
import { Toast } from './Toast';

type RightSidebarTab = 'context' | 'condition' | 'formatter' | 'help';

interface RightSidebarProps {
  workspace?: WorkspaceEntity | null;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ workspace }) => {
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('context');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filterConditionsJson, setFilterConditionsJson] = useState('{}');
  const [sqlFormatterJson, setSqlFormatterJson] = useState('{}');
  const { toast, showSuccess, showError, hideToast } = useToast();

  // Update local state when workspace or refreshTrigger changes
  useEffect(() => {
    console.log('[DEBUG] RightSidebar useEffect triggered, refreshTrigger:', refreshTrigger);
    if (workspace) {
      const newFilterConditions = workspace.filterConditions.displayString || '{}';
      const newFormatterConfig = workspace.formatter.displayString || '{}';
      
      // Use functional updates to avoid dependencies on current state values
      setFilterConditionsJson(prev => {
        if (newFilterConditions !== prev) {
          console.log('[DEBUG] Updating filterConditionsJson:', newFilterConditions);
          return newFilterConditions;
        }
        return prev;
      });
      
      setSqlFormatterJson(prev => {
        if (newFormatterConfig !== prev) {
          console.log('[DEBUG] Updating sqlFormatterJson:', newFormatterConfig);
          return newFormatterConfig;
        }
        return prev;
      });
    }
  }, [workspace, refreshTrigger]);

  const handleFilterConditionsChange = (value: string) => {
    if (workspace) {
      workspace.filterConditions.displayString = value;
      setFilterConditionsJson(value);
    }
  };

  const handleFormatterChange = (value: string) => {
    if (workspace) {
      workspace.formatter.displayString = value;
      setSqlFormatterJson(value);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'context':
        return (
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">Current Context</h4>
              <div className="text-sm text-dark-text-secondary space-y-1">
                <div>Cursor position: Line 1, Col 1</div>
                <div>Word under cursor: SELECT</div>
                <div>Available CTEs: 0</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">IntelliSense</h4>
              <div className="text-sm text-dark-text-primary opacity-75">
                Start typing to see suggestions...
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">Errors</h4>
              <div className="text-sm text-dark-text-primary opacity-75">
                No syntax errors detected
              </div>
            </div>
          </div>
        );
        
      case 'condition':
        return (
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-dark-text-white">Filter Conditions</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('[DEBUG] ReGenerate button clicked!');
                    if (!workspace) {
                      console.log('[DEBUG] No workspace available');
                      showError('No workspace available');
                      return;
                    }
                    
                    try {
                      console.log('[DEBUG] ReGenerate clicked, sqlModels:', workspace.sqlModels.length);
                      const originalConditions = workspace.filterConditions.displayString;
                      console.log('[DEBUG] Original conditions:', originalConditions);
                      
                      workspace.filterConditions.initializeFromModels(workspace.sqlModels);
                      const newConditions = workspace.filterConditions.displayString;
                      console.log('[DEBUG] New conditions:', newConditions);
                      
                      // Force React re-render to refresh binding
                      setRefreshTrigger(prev => prev + 1);
                      
                      if (originalConditions !== newConditions) {
                        showSuccess('Filter conditions regenerated successfully');
                      } else {
                        showSuccess('Filter conditions regenerated (no changes)');
                      }
                    } catch (error) {
                      console.error('[DEBUG] ReGenerate failed:', error);
                      showError(`ReGenerate failed: ${error.message}`);
                    }
                  }}
                  className="text-xs text-primary-400 hover:text-primary-300"
                  title="ReGenerate filter conditions from current SQL query"
                >
                  ReGenerate
                </button>
              </div>
            </div>
            
            <div className="text-xs text-dark-text-primary opacity-75 mb-2">
              rawsql-ts FilterConditions - Edit values only, structure is auto-generated from SQL
            </div>
            
            <div className="flex-1 min-h-0">
              <MonacoEditor
                key="condition-editor" // Stable key to prevent re-mounting
                value={filterConditionsJson}
                onChange={handleFilterConditionsChange}
                language="json"
                height="100%"
                readOnly={false}
                workspace={workspace}
                refreshTrigger={refreshTrigger}
                onKeyDown={(event) => {
                  if (event.ctrlKey && event.key === 'Enter') {
                    event.preventDefault();
                    // Find and click the Run button in MainContent
                    const runButton = document.querySelector('button[title="Run Query (Ctrl+Enter)"]') as HTMLButtonElement;
                    if (runButton && !runButton.disabled) {
                      console.log('[DEBUG] Executing query from Condition tab via Ctrl+Enter');
                      runButton.click();
                    }
                  }
                }}
                options={{
                  fontSize: 12,
                  wordWrap: 'off',
                  formatOnType: true,
                  formatOnPaste: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: false
                }}
              />
            </div>
            
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (workspace) {
                      console.log('[DEBUG] Format JSON clicked, original:', workspace.filterConditions.displayString);
                      try {
                        const parsed = JSON.parse(workspace.filterConditions.displayString);
                        const formatted = JSON.stringify(parsed, null, 2);
                        workspace.filterConditions.displayString = formatted;
                        console.log('[DEBUG] JSON formatted successfully');
                        // Force React re-render to refresh binding
                        setRefreshTrigger(prev => prev + 1);
                      } catch (error) {
                        console.warn('[DEBUG] JSON format failed:', error);
                      }
                    }
                  }}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-xs"
                  title="Format JSON"
                >
                  Format JSON
                </button>
              </div>
              
              <div className="text-xs text-dark-text-secondary">
                JSON validation: {workspace?.filterConditions.isValid() ? 
                  <span className="text-green-400">✓ Valid</span> : 
                  <span className="text-red-400">✗ Invalid</span>
                }
              </div>
              <div className="text-xs text-dark-text-primary opacity-75">
                💡 Generated from SQL columns. Edit values (undefined → actual values).
              </div>
            </div>
          </div>
        );
        
      case 'formatter':
        return (
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-dark-text-white">SQL Formatter Config</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('[DEBUG] Reset Formatter button clicked!');
                    if (!workspace) {
                      console.log('[DEBUG] No workspace available');
                      showError('No workspace available');
                      return;
                    }
                    
                    try {
                      console.log('[DEBUG] Original formatter:', workspace.formatter.displayString);
                      workspace.formatter.reset();
                      console.log('[DEBUG] After reset:', workspace.formatter.displayString);
                      // Force React re-render to refresh binding
                      setRefreshTrigger(prev => prev + 1);
                      showSuccess('Formatter configuration reset to default');
                    } catch (error) {
                      console.error('[DEBUG] Reset failed:', error);
                      showError(`Reset failed: ${error.message}`);
                    }
                  }}
                  className="text-xs text-primary-400 hover:text-primary-300"
                  title="Reset formatter configuration to default values"
                >
                  Reset
                </button>
              </div>
            </div>
            
            <div className="text-xs text-dark-text-primary opacity-75 mb-2">
              rawsql-ts SqlFormatter configuration - Adjust formatting preferences
            </div>
            
            <div className="flex-1 min-h-0">
              <MonacoEditor
                key="formatter-editor" // Stable key to prevent re-mounting
                value={sqlFormatterJson}
                onChange={handleFormatterChange}
                language="json"
                height="100%"
                readOnly={false}
                workspace={workspace}
                refreshTrigger={refreshTrigger}
                onKeyDown={(event) => {
                  if (event.ctrlKey && event.shiftKey && event.key === 'F') {
                    event.preventDefault();
                    // Find and click the Format button in MainContent
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const formatButton = buttons.find(btn => btn.textContent?.trim() === 'Format') as HTMLButtonElement;
                    if (formatButton && !formatButton.disabled) {
                      console.log('[DEBUG] Executing format from Formatter tab via Ctrl+Shift+F');
                      formatButton.click();
                    }
                  }
                }}
                options={{
                  fontSize: 12,
                  wordWrap: 'off',
                  formatOnType: true,
                  formatOnPaste: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: false
                }}
              />
            </div>
            
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('[DEBUG] Format JSON button clicked (Formatter tab)!');
                    if (!workspace) {
                      console.log('[DEBUG] No workspace available');
                      showError('No workspace available');
                      return;
                    }
                    
                    try {
                      console.log('[DEBUG] Format JSON clicked, original:', workspace.formatter.displayString);
                      const parsed = JSON.parse(workspace.formatter.displayString);
                      const formatted = JSON.stringify(parsed, null, 2);
                      workspace.formatter.displayString = formatted;
                      console.log('[DEBUG] JSON formatted successfully');
                      // Force React re-render to refresh binding
                      setRefreshTrigger(prev => prev + 1);
                      showSuccess('Formatter JSON formatted successfully');
                    } catch (error) {
                      console.error('[DEBUG] Format JSON failed:', error);
                      showError(`Format JSON failed: ${error.message}`);
                    }
                  }}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-xs"
                  title="Format JSON"
                >
                  Format JSON
                </button>
              </div>
              
              <div className="text-xs text-dark-text-secondary">
                JSON validation: {workspace?.formatter.isValid() ? 
                  <span className="text-green-400">✓ Valid</span> : 
                  <span className="text-red-400">✗ Invalid</span>
                }
              </div>
              <div className="text-xs text-dark-text-primary opacity-75">
                💡 Controls SQL formatting style (indentation, keywords, line breaks).
              </div>
            </div>
          </div>
        );
        
      case 'help':
        return (
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">Keyboard Shortcuts</h4>
              <div className="space-y-1 text-xs text-dark-text-secondary">
                <div><kbd className="bg-dark-hover px-1 rounded">Ctrl+Enter</kbd> Run Query</div>
                <div><kbd className="bg-dark-hover px-1 rounded">Ctrl+S</kbd> Save</div>
                <div><kbd className="bg-dark-hover px-1 rounded">Ctrl+/</kbd> Toggle Comment</div>
                <div><kbd className="bg-dark-hover px-1 rounded">F1</kbd> Command Palette</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">zosql Features</h4>
              <div className="space-y-1 text-xs text-dark-text-secondary">
                <div>• CTE decomposition and analysis</div>
                <div>• Dependency resolution</div>
                <div>• SQL formatting and validation</div>
                <div>• IntelliSense for SQL</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">Getting Started</h4>
              <div className="text-xs text-dark-text-secondary">
                1. Paste your SQL with CTEs into the editor<br/>
                2. Click "Decompose Query" to analyze<br/>
                3. Edit individual CTEs in separate tabs<br/>
                4. Validate and run your queries
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <aside className="w-context-sidebar bg-dark-secondary border-l border-dark-border-primary flex flex-col flex-shrink-0">
      {/* Tab Headers */}
      <div className="bg-dark-tertiary border-b border-dark-border-primary flex">
        {[
          { id: 'context' as const, label: 'Context', icon: '🎯' },
          { id: 'condition' as const, label: 'Condition', icon: '⚙️' },
          { id: 'formatter' as const, label: 'Formatter', icon: '✨' },
          { id: 'help' as const, label: 'Help', icon: '❓' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 px-3 py-2 text-xs font-medium flex items-center justify-center gap-1
              ${activeTab === tab.id
                ? 'bg-dark-primary text-dark-text-white border-b-2 border-primary-600'
                : 'text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-hover'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content - Pre-render all tabs to prevent Monaco re-mounting */}
      <div className="flex-1 overflow-y-auto">
        {/* Context Tab */}
        <div className={`h-full ${activeTab === 'context' ? 'block' : 'hidden'}`}>
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">Current Context</h4>
              <div className="text-sm text-dark-text-secondary space-y-1">
                <div>Cursor position: Line 1, Col 1</div>
                <div>Word under cursor: SELECT</div>
                <div>Available CTEs: 0</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">IntelliSense</h4>
              <div className="text-sm text-dark-text-primary opacity-75">
                Start typing to see suggestions...
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">Errors</h4>
              <div className="text-sm text-dark-text-primary opacity-75">
                No syntax errors detected
              </div>
            </div>
          </div>
        </div>

        {/* Condition Tab */}
        <div className={`h-full flex flex-col ${activeTab === 'condition' ? 'block' : 'hidden'}`}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-dark-text-white">Filter Conditions</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('[DEBUG] ReGenerate button clicked!');
                    if (!workspace) {
                      console.log('[DEBUG] No workspace available');
                      showError('No workspace available');
                      return;
                    }
                    
                    try {
                      console.log('[DEBUG] ReGenerate clicked, sqlModels:', workspace.sqlModels.length);
                      const originalConditions = workspace.filterConditions.displayString;
                      console.log('[DEBUG] Original conditions:', originalConditions);
                      
                      workspace.filterConditions.initializeFromModels(workspace.sqlModels);
                      const newConditions = workspace.filterConditions.displayString;
                      console.log('[DEBUG] New conditions:', newConditions);
                      
                      // Force React re-render to refresh binding
                      setRefreshTrigger(prev => prev + 1);
                      
                      if (originalConditions !== newConditions) {
                        showSuccess('Filter conditions regenerated successfully');
                      } else {
                        showSuccess('Filter conditions regenerated (no changes)');
                      }
                    } catch (error) {
                      console.error('[DEBUG] ReGenerate failed:', error);
                      showError(`ReGenerate failed: ${error.message}`);
                    }
                  }}
                  className="text-xs text-primary-400 hover:text-primary-300"
                  title="ReGenerate filter conditions from current SQL query"
                >
                  ReGenerate
                </button>
              </div>
            </div>
            
            <div className="text-xs text-dark-text-primary opacity-75 mb-2">
              rawsql-ts FilterConditions - Edit values only, structure is auto-generated from SQL
            </div>
            
            <div className="flex-1 min-h-0">
              <MonacoEditor
                key="condition-editor"
                value={filterConditionsJson}
                onChange={handleFilterConditionsChange}
                language="json"
                height="100%"
                readOnly={false}
                workspace={workspace}
                refreshTrigger={refreshTrigger}
                onKeyDown={(event) => {
                  if (event.ctrlKey && event.key === 'Enter') {
                    event.preventDefault();
                    const runButton = document.querySelector('button[title="Run Query (Ctrl+Enter)"]') as HTMLButtonElement;
                    if (runButton && !runButton.disabled) {
                      console.log('[DEBUG] Executing query from Condition tab via Ctrl+Enter');
                      runButton.click();
                    }
                  }
                }}
                options={{
                  fontSize: 12,
                  wordWrap: 'off',
                  formatOnType: true,
                  formatOnPaste: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: false
                }}
              />
            </div>
            
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (workspace) {
                      console.log('[DEBUG] Format JSON clicked, original:', workspace.filterConditions.displayString);
                      try {
                        const parsed = JSON.parse(workspace.filterConditions.displayString);
                        const formatted = JSON.stringify(parsed, null, 2);
                        workspace.filterConditions.displayString = formatted;
                        console.log('[DEBUG] JSON formatted successfully');
                        setRefreshTrigger(prev => prev + 1);
                        showSuccess('Filter conditions JSON formatted successfully');
                      } catch (error) {
                        console.warn('[DEBUG] JSON format failed:', error);
                        showError(`Format JSON failed: ${error.message}`);
                      }
                    }
                  }}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-xs"
                  title="Format JSON"
                >
                  Format JSON
                </button>
              </div>
              
              <div className="text-xs text-dark-text-secondary">
                JSON validation: {workspace?.filterConditions.isValid() ? 
                  <span className="text-green-400">✓ Valid</span> : 
                  <span className="text-red-400">✗ Invalid</span>
                }
              </div>
              <div className="text-xs text-dark-text-primary opacity-75">
                💡 Generated from SQL columns. Edit values (undefined → actual values).
              </div>
            </div>
          </div>
        </div>

        {/* Formatter Tab */}
        <div className={`h-full flex flex-col ${activeTab === 'formatter' ? 'block' : 'hidden'}`}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-dark-text-white">SQL Formatter Config</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('[DEBUG] Reset Formatter button clicked!');
                    if (!workspace) {
                      console.log('[DEBUG] No workspace available');
                      showError('No workspace available');
                      return;
                    }
                    
                    try {
                      console.log('[DEBUG] Original formatter:', workspace.formatter.displayString);
                      workspace.formatter.reset();
                      console.log('[DEBUG] After reset:', workspace.formatter.displayString);
                      setRefreshTrigger(prev => prev + 1);
                      showSuccess('Formatter configuration reset to default');
                    } catch (error) {
                      console.error('[DEBUG] Reset failed:', error);
                      showError(`Reset failed: ${error.message}`);
                    }
                  }}
                  className="text-xs text-primary-400 hover:text-primary-300"
                  title="Reset formatter configuration to default values"
                >
                  Reset
                </button>
              </div>
            </div>
            
            <div className="text-xs text-dark-text-primary opacity-75 mb-2">
              rawsql-ts SqlFormatter configuration - Adjust formatting preferences
            </div>
            
            <div className="flex-1 min-h-0">
              <MonacoEditor
                key="formatter-editor"
                value={sqlFormatterJson}
                onChange={handleFormatterChange}
                language="json"
                height="100%"
                readOnly={false}
                workspace={workspace}
                refreshTrigger={refreshTrigger}
                onKeyDown={(event) => {
                  if (event.ctrlKey && event.shiftKey && event.key === 'F') {
                    event.preventDefault();
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const formatButton = buttons.find(btn => btn.textContent?.trim() === 'Format') as HTMLButtonElement;
                    if (formatButton && !formatButton.disabled) {
                      console.log('[DEBUG] Executing format from Formatter tab via Ctrl+Shift+F');
                      formatButton.click();
                    }
                  }
                }}
                options={{
                  fontSize: 12,
                  wordWrap: 'off',
                  formatOnType: true,
                  formatOnPaste: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  readOnly: false
                }}
              />
            </div>
            
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('[DEBUG] Format JSON button clicked (Formatter tab)!');
                    if (!workspace) {
                      console.log('[DEBUG] No workspace available');
                      showError('No workspace available');
                      return;
                    }
                    
                    try {
                      console.log('[DEBUG] Format JSON clicked, original:', workspace.formatter.displayString);
                      const parsed = JSON.parse(workspace.formatter.displayString);
                      const formatted = JSON.stringify(parsed, null, 2);
                      workspace.formatter.displayString = formatted;
                      console.log('[DEBUG] JSON formatted successfully');
                      setRefreshTrigger(prev => prev + 1);
                      showSuccess('Formatter JSON formatted successfully');
                    } catch (error) {
                      console.error('[DEBUG] Format JSON failed:', error);
                      showError(`Format JSON failed: ${error.message}`);
                    }
                  }}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-xs"
                  title="Format JSON"
                >
                  Format JSON
                </button>
              </div>
              
              <div className="text-xs text-dark-text-secondary">
                JSON validation: {workspace?.formatter.isValid() ? 
                  <span className="text-green-400">✓ Valid</span> : 
                  <span className="text-red-400">✗ Invalid</span>
                }
              </div>
              <div className="text-xs text-dark-text-primary opacity-75">
                💡 Controls SQL formatting style (indentation, keywords, line breaks).
              </div>
            </div>
          </div>
        </div>

        {/* Help Tab */}
        <div className={`h-full ${activeTab === 'help' ? 'block' : 'hidden'}`}>
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">Keyboard Shortcuts</h4>
              <div className="space-y-1 text-xs text-dark-text-secondary">
                <div><kbd className="bg-dark-hover px-1 rounded">Ctrl+Enter</kbd> Run Query</div>
                <div><kbd className="bg-dark-hover px-1 rounded">Ctrl+S</kbd> Save</div>
                <div><kbd className="bg-dark-hover px-1 rounded">Ctrl+/</kbd> Toggle Comment</div>
                <div><kbd className="bg-dark-hover px-1 rounded">F1</kbd> Command Palette</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">zosql Features</h4>
              <div className="space-y-1 text-xs text-dark-text-secondary">
                <div>• CTE decomposition and analysis</div>
                <div>• Dependency resolution</div>
                <div>• SQL formatting and validation</div>
                <div>• IntelliSense for SQL</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">Getting Started</h4>
              <div className="text-xs text-dark-text-secondary">
                1. Paste your SQL with CTEs into the editor<br/>
                2. Click "Decompose Query" to analyze<br/>
                3. Edit individual CTEs in separate tabs<br/>
                4. Validate and run your queries
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </aside>
  );
};
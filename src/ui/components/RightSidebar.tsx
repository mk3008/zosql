import React, { useState } from 'react';
import { WorkspaceEntity } from '@shared/types';
import { MonacoEditor } from './MonacoEditor';

type RightSidebarTab = 'context' | 'condition' | 'formatter' | 'help';

interface RightSidebarProps {
  workspace?: WorkspaceEntity | null;
  onOpenFormatterTab?: () => void;
  onOpenConditionTab?: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ workspace, onOpenFormatterTab, onOpenConditionTab }) => {
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('context');

  // Get FilterConditions and SqlFormatter from workspace
  const filterConditionsJson = workspace?.filterConditions.displayString || '{}';
  const sqlFormatterJson = workspace?.formatter.displayString || '{}';

  const handleFilterConditionsChange = (value: string) => {
    if (workspace) {
      workspace.filterConditions.displayString = value;
    }
  };

  const handleFormatterChange = (value: string) => {
    if (workspace) {
      workspace.formatter.displayString = value;
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
                  onClick={onOpenConditionTab}
                  className="text-xs text-primary-400 hover:text-primary-300"
                  title="Open in tab for editing"
                >
                  Open in Tab
                </button>
                <button
                  onClick={() => workspace?.filterConditions.reset()}
                  className="text-xs text-dark-text-secondary hover:text-dark-text-primary"
                  title="Reset to template"
                >
                  Reset
                </button>
                <button
                  onClick={() => workspace?.filterConditions.initializeFromModels(workspace.sqlModels)}
                  className="text-xs text-dark-text-secondary hover:text-dark-text-primary"
                  title="Generate from SQL models"
                >
                  Generate
                </button>
              </div>
            </div>
            
            <div className="text-xs text-dark-text-primary opacity-75 mb-2">
              rawsql-ts FilterConditions - Edit values only, structure is auto-generated from SQL
            </div>
            
            <div className="flex-1 min-h-0">
              <MonacoEditor
                value={filterConditionsJson}
                onChange={handleFilterConditionsChange}
                language="json"
                height="100%"
                readOnly={false}
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
                      const formatted = workspace.filterConditions.getFormattedString();
                      workspace.filterConditions.displayString = formatted;
                    }
                  }}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-xs"
                  title="Format JSON"
                >
                  Format
                </button>
                
                <button
                  onClick={() => {
                    if (workspace) {
                      const conditions = workspace.filterConditions.getFilterConditions();
                      console.log('Parsed FilterConditions:', conditions);
                    }
                  }}
                  className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-xs"
                  title="Test parsing to FilterConditions"
                >
                  Test Parse
                </button>
                
                <button
                  onClick={() => {
                    if (workspace) {
                      navigator.clipboard.writeText(filterConditionsJson).then(() => {
                        console.log('FilterConditions JSON copied to clipboard');
                      }).catch(err => {
                        console.error('Failed to copy:', err);
                      });
                    }
                  }}
                  className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-xs"
                  title="Copy JSON"
                >
                  Copy
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
                  onClick={onOpenFormatterTab}
                  className="text-xs text-primary-400 hover:text-primary-300"
                  title="Open in tab for editing"
                >
                  Open in Tab
                </button>
                <button
                  onClick={() => workspace?.formatter.reset()}
                  className="text-xs text-dark-text-secondary hover:text-dark-text-primary"
                  title="Reset to default"
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
                value={sqlFormatterJson}
                onChange={handleFormatterChange}
                language="json"
                height="100%"
                readOnly={false}
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
                    if (workspace) {
                      const formatted = workspace.formatter.getFormattedString();
                      workspace.formatter.displayString = formatted;
                    }
                  }}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-xs"
                  title="Format JSON"
                >
                  Format
                </button>
                
                <button
                  onClick={() => {
                    if (workspace) {
                      const formatter = workspace.formatter.getSqlFormatter();
                      console.log('SqlFormatter instance:', formatter);
                    }
                  }}
                  className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-xs"
                  title="Test creating SqlFormatter"
                >
                  Test Create
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
      
      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </aside>
  );
};
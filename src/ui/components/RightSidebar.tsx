import React, { useState } from 'react';

type RightSidebarTab = 'context' | 'condition' | 'help';

export const RightSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RightSidebarTab>('context');
  const [conditionJson, setConditionJson] = useState(`{
  "filters": [
    {
      "field": "user_id",
      "operator": "=",
      "value": 1
    },
    {
      "field": "created_at",
      "operator": ">=",
      "value": "2024-01-01"
    }
  ],
  "sort": [
    {
      "field": "created_at",
      "direction": "DESC"
    }
  ],
  "limit": 100
}`);

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
              <div className="text-sm text-dark-text-muted">
                Start typing to see suggestions...
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-dark-text-white mb-2">Errors</h4>
              <div className="text-sm text-dark-text-muted">
                No syntax errors detected
              </div>
            </div>
          </div>
        );
        
      case 'condition':
        return (
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-dark-text-white">Query Conditions</h4>
              <button
                onClick={() => setConditionJson('{\n  \n}')}
                className="text-xs text-dark-text-secondary hover:text-dark-text-primary"
                title="Clear JSON"
              >
                Clear
              </button>
            </div>
            
            <div className="text-xs text-dark-text-muted mb-2">
              Define query conditions, filters, and parameters in JSON format
            </div>
            
            <div className="flex-1 min-h-0">
              <textarea
                value={conditionJson}
                onChange={(e) => setConditionJson(e.target.value)}
                className="w-full h-full p-3 bg-dark-primary border border-dark-border-primary rounded text-dark-text-primary font-mono text-xs resize-none focus:outline-none focus:border-primary-600"
                placeholder="Enter JSON conditions..."
                style={{ 
                  fontFamily: 'Consolas, Monaco, Courier New, monospace',
                  lineHeight: '1.4'
                }}
              />
            </div>
            
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(conditionJson);
                      setConditionJson(JSON.stringify(parsed, null, 2));
                    } catch (error) {
                      console.error('Invalid JSON:', error);
                    }
                  }}
                  className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-xs"
                  title="Format JSON"
                >
                  Format
                </button>
                
                <button
                  onClick={() => {
                    try {
                      JSON.parse(conditionJson);
                      console.log('JSON is valid');
                    } catch (error) {
                      console.error('JSON validation failed:', error);
                    }
                  }}
                  className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-xs"
                  title="Validate JSON"
                >
                  Validate
                </button>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(conditionJson).then(() => {
                      console.log('JSON copied to clipboard');
                    }).catch(err => {
                      console.error('Failed to copy:', err);
                    });
                  }}
                  className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-xs"
                  title="Copy JSON"
                >
                  Copy
                </button>
              </div>
              
              <div className="text-xs text-dark-text-muted">
                💡 Use this JSON to define dynamic query conditions, filters, and sorting options.
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
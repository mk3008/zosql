import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { Tab, QueryExecutionResult } from '@shared/types';
import { MonacoEditor } from './MonacoEditor';
import { QueryResults } from './QueryResults';
import { Toast } from './Toast';

export interface MainContentRef {
  openValuesTab: () => void;
  openFormatterTab: () => void;
}

export const MainContent = forwardRef<MainContentRef>((props, ref) => {
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'main',
      title: 'main.sql',
      type: 'main',
      content: '-- Welcome to zosql\n-- Start by pasting your SQL query here\n\nSELECT * FROM users;',
      isDirty: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('main');
  const [resultsVisible, setResultsVisible] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [useSchemaCollector, setUseSchemaCollector] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const addNewTab = (type: 'main' | 'cte' | 'values' | 'formatter' = 'main', title?: string, content?: string) => {
    const defaultContent = {
      values: `-- Define test data CTEs here
-- Write WITH clauses, SELECT clauses can be omitted (they will be ignored if written)
-- Example:
with users(user_id, name) as (
  values
    (1::bigint, 'alice'::text),
    (2::bigint, 'bob'::text)
)`,
      formatter: `{
  "identifierEscape": {
    "start": "",
    "end": ""
  },
  "parameterSymbol": ":",
  "parameterStyle": "named",
  "indentSize": 4,
  "indentChar": " ",
  "newline": "\\n",
  "keywordCase": "lower",
  "commaBreak": "before",
  "andBreak": "before",
  "withClauseStyle": "full-oneline",
  "preserveComments": true
}`
    };

    const defaultTitle = {
      values: 'Values & Test Data',
      formatter: 'SQL Formatter Config',
      main: 'Untitled.sql',
      cte: 'Untitled.cte'
    };

    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      title: title || defaultTitle[type] || 'Untitled',
      type,
      content: content || defaultContent[type] || '',
      isDirty: false
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const openValuesTab = () => {
    // Check if values tab already exists
    const existingValuesTab = tabs.find(tab => tab.type === 'values');
    if (existingValuesTab) {
      setActiveTabId(existingValuesTab.id);
    } else {
      addNewTab('values');
    }
  };

  const openFormatterTab = () => {
    // Check if formatter tab already exists
    const existingFormatterTab = tabs.find(tab => tab.type === 'formatter');
    if (existingFormatterTab) {
      setActiveTabId(existingFormatterTab.id);
    } else {
      addNewTab('formatter');
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    openValuesTab,
    openFormatterTab
  }));

  const closeTab = (tabId: string) => {
    const updatedTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(updatedTabs);
    
    if (activeTabId === tabId && updatedTabs.length > 0) {
      setActiveTabId(updatedTabs[0].id);
    }
  };

  const updateTabContent = (tabId: string, content: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, content, isDirty: true }
        : tab
    ));
  };

  const executeQuery = async () => {
    if (!activeTab?.content.trim()) return;

    setIsExecuting(true);
    setResultsVisible(true);

    try {
      // Simulate query execution for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock result - replace with actual SQL execution later
      const mockResult: QueryExecutionResult = {
        success: true,
        data: [
          { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-15' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-16' },
          { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-17' }
        ],
        executionTime: 127,
        rowCount: 3
      };

      setQueryResult(mockResult);
    } catch (error) {
      const errorResult: QueryExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      setQueryResult(errorResult);
    } finally {
      setIsExecuting(false);
    }
  };

  const formatQuery = async () => {
    if (!activeTab?.content.trim()) return;
    
    // TODO: Implement SQL formatting using rawsql-ts
    console.log('Format query:', activeTab.content);
  };

  const copyPrompt = async () => {
    try {
      // Get main SQL from the first main tab
      const mainTab = tabs.find(tab => tab.type === 'main');
      const currentSql = mainTab?.content || '';
      
      if (!currentSql || !currentSql.trim()) {
        throw new Error('No SQL query found in main editor');
      }

      const prompt = generatePrompt(currentSql, useSchemaCollector);
      
      await navigator.clipboard.writeText(prompt);
      setToast({ message: 'Prompt copied to clipboard!', type: 'success' });
      
    } catch (error) {
      console.error('Copy prompt failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy prompt';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const generatePrompt = (sql: string, useSchemaCollector: boolean): string => {
    if (!useSchemaCollector) {
      // AI-assisted mode
      return `このSQLをDB環境依存なしで動かしたいので、
元のSQLは変更せずに、必要なテーブルを VALUES 文で定義したモックテーブルとして
WITH句のみ を作成してください。
SELECT文などは不要で、WITH句だけ回答してください。

\`\`\`sql
${sql}
\`\`\``;
    }

    // Schema-aware mode (simplified for now)
    // TODO: Implement schema extraction using rawsql-ts
    const mockTables = ['users(id, name, email)', 'orders(id, user_id, amount)'];
    const tableDescriptions = mockTables.join(', ');

    return `このSQLをDB環境依存なしで動かしたいので、
元のSQLは変更せずに、必要なテーブル ${tableDescriptions} を VALUES 文で定義したモックテーブルとして
WITH句のみ を作成してください。
SELECT文などは不要で、WITH句だけ回答してください。

\`\`\`sql
${sql}
\`\`\``;
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Tab Bar */}
      <div className="bg-dark-secondary border-b border-dark-border-primary flex items-center overflow-x-auto relative">
        <div className="flex">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`
                flex items-center gap-2 px-4 py-2 cursor-pointer relative
                ${activeTabId === tab.id 
                  ? 'bg-dark-primary text-dark-text-white border-r border-dark-border-primary z-10' 
                  : 'bg-dark-secondary text-dark-text-primary hover:bg-dark-hover border-r border-dark-border-primary'
                }
              `}
              onClick={() => setActiveTabId(tab.id)}
            >
              {/* Hide tab bar border under active tab */}
              {activeTabId === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-px bg-dark-primary" />
              )}
              
              {/* Accent Border - Bottom line */}
              {activeTabId === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
              )}
              
              <span className="text-sm font-medium">
                {tab.title}
                {tab.isDirty && <span className="text-warning ml-1">●</span>}
              </span>
              
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="text-dark-text-secondary hover:text-dark-text-primary text-xs ml-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        
        <button
          onClick={addNewTab}
          className="px-3 py-2 text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-hover"
          title="New Tab"
        >
          <span className="text-sm">+</span>
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-dark-tertiary border-b border-dark-border-primary px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {activeTab?.type !== 'values' && activeTab?.type !== 'formatter' && (
              <span className="text-sm text-dark-text-primary">
                {activeTab?.title || 'No file selected'}
              </span>
            )}
            
            {activeTab?.type === 'cte' && (
              <span className="text-xs text-dark-text-secondary bg-dark-hover px-2 py-1 rounded">
                CTE: {activeTab.cteName}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 flex-1 justify-between">
            {activeTab?.type === 'values' ? (
              <>
                <span className="text-xs text-dark-text-secondary italic ml-4">
                  Define test data CTEs with VALUES. SELECT clauses will be ignored.
                </span>
                
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-dark-text-primary">
                    <input
                      type="checkbox"
                      checked={useSchemaCollector}
                      onChange={(e) => setUseSchemaCollector(e.target.checked)}
                      className="w-3 h-3 rounded border border-dark-border-primary bg-dark-background checked:bg-primary-600"
                    />
                    Use Schema Collector
                  </label>
                  
                  <button
                    onClick={copyPrompt}
                    className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm flex items-center gap-2"
                    title="Copy prompt for generating VALUES CTEs to clipboard"
                  >
                    📋 Copy Prompt
                  </button>
                </div>
              </>
            ) : activeTab?.type === 'formatter' ? (
              <>
                <span className="text-xs text-dark-text-secondary italic ml-4">
                  Configure SQL formatter options. Changes are applied when formatting SQL queries.
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // TODO: Apply formatter config
                      setToast({ message: 'Formatter config saved', type: 'success' });
                    }}
                    className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm"
                  >
                    Apply Config
                  </button>
                </div>
              </>
            ) : (
              <>
                <div /> {/* Spacer */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={executeQuery}
                    disabled={isExecuting || !activeTab?.content.trim()}
                    className="px-3 py-1 bg-success text-white rounded hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExecuting ? 'Running...' : 'Run'}
                  </button>
                  
                  <button 
                    onClick={formatQuery}
                    disabled={!activeTab?.content.trim()}
                    className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Format
                  </button>
                  
                  <button
                    onClick={() => setResultsVisible(!resultsVisible)}
                    className="px-3 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm"
                  >
                    {resultsVisible ? 'Hide Results' : 'Show Results'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Editor Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Monaco Editor */}
          <div className="flex-1 bg-dark-primary overflow-hidden">
            <MonacoEditor
              value={activeTab?.content || ''}
              onChange={(value) => activeTab && updateTabContent(activeTab.id, value)}
              language={activeTab?.type === 'formatter' ? 'json' : 'sql'}
              height="100%"
              isMainEditor={true}
              options={activeTab?.type === 'values' ? {
                wordWrap: 'off',
                wrappingStrategy: 'simple',
                scrollBeyondLastLine: false,
                minimap: { enabled: false }
              } : activeTab?.type === 'formatter' ? {
                wordWrap: 'off',
                formatOnType: true,
                formatOnPaste: true,
                minimap: { enabled: false }
              } : undefined}
            />
          </div>

          {/* Results Panel */}
          <QueryResults
            result={queryResult}
            isVisible={resultsVisible}
            onClose={() => setResultsVisible(false)}
          />
        </div>
      </div>
      
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
});
import React, { useState } from 'react';
import { Tab, QueryExecutionResult } from '@shared/types';
import { MonacoEditor } from './MonacoEditor';
import { QueryResults } from './QueryResults';

export const MainContent: React.FC = () => {
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

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const addNewTab = () => {
    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      title: 'Untitled.sql',
      type: 'main',
      content: '',
      isDirty: false
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

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

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Tab Bar */}
      <div className="bg-dark-secondary border-b border-dark-border-primary flex items-center overflow-x-auto">
        <div className="flex">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`
                flex items-center gap-2 px-4 py-2 border-r border-dark-border-primary cursor-pointer
                ${activeTabId === tab.id 
                  ? 'bg-dark-primary text-dark-text-white' 
                  : 'bg-dark-secondary text-dark-text-primary hover:bg-dark-hover'
                }
              `}
              onClick={() => setActiveTabId(tab.id)}
            >
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
            <span className="text-sm text-dark-text-primary">
              {activeTab?.title || 'No file selected'}
            </span>
            
            {activeTab?.type === 'cte' && (
              <span className="text-xs text-dark-text-secondary bg-dark-hover px-2 py-1 rounded">
                CTE: {activeTab.cteName}
              </span>
            )}
          </div>
          
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
        </div>

        {/* Editor Container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Monaco Editor */}
          <div className="flex-1 bg-dark-primary overflow-hidden">
            <MonacoEditor
              value={activeTab?.content || ''}
              onChange={(value) => activeTab && updateTabContent(activeTab.id, value)}
              language="sql"
              height="100%"
              isMainEditor={true}
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
    </main>
  );
};
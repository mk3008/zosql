import { useState, useImperativeHandle, forwardRef, useMemo, useEffect } from 'react';
import '../styles/tab-scrollbar.css';
import { QueryExecutionResult } from '@shared/types';
import { MonacoEditor } from './MonacoEditor';
import { QueryResults } from './QueryResults';
import { Toast } from './Toast';
import { useTabManager } from '@ui/hooks/useTabManager';
import { useToast } from '@ui/hooks/useToast';
import { usePromptGenerator } from '@ui/hooks/usePromptGenerator';
import { useFormatterManager } from '@ui/hooks/useFormatterManager';
import { PromptGenerator } from '@core/usecases/prompt-generator';
import { FormatterManager } from '@core/usecases/formatter-manager';
import { RawsqlSqlParser } from '@adapters/parsers/rawsql-sql-parser';
import { FormatterConfigStorage } from '@adapters/storage/formatter-config-storage';

import { SqlModelEntity, TestValuesModel } from '@shared/types';
import { useTestValuesManager } from '@ui/hooks/useTestValuesManager';

export interface MainContentRef {
  openValuesTab: () => void;
  openFormatterTab: () => void;
  getCurrentSql: () => string;
  openSqlModel: (name: string, sql: string, type: 'main' | 'cte', modelEntity?: SqlModelEntity) => void;
  setCurrentModelEntity: (model: SqlModelEntity) => void;
}

export const MainContent = forwardRef<MainContentRef>((_props, ref) => {
  // Core Dependencies (Hexagonal Architecture)
  const sqlParser = useMemo(() => new RawsqlSqlParser(), []);
  const promptGenerator = useMemo(() => new PromptGenerator(sqlParser), [sqlParser]);
  const formatterStorage = useMemo(() => new FormatterConfigStorage(), []);
  const formatterManager = useMemo(() => new FormatterManager(formatterStorage), [formatterStorage]);

  // UI State Management through Custom Hooks
  const { toast, showSuccess, showError, hideToast } = useToast();
  const {
    tabs,
    activeTabId,
    activeTab,
    openValuesTab,
    openFormatterTab,
    closeTab,
    updateTabContent,
    setActiveTabId,
    addNewTab
  } = useTabManager();

  // Business Logic Hooks
  const { generateAndCopyPrompt, isGenerating } = usePromptGenerator(
    promptGenerator,
    showSuccess,
    showError
  );
  const { applyConfig, isApplying } = useFormatterManager(
    formatterManager,
    showSuccess,
    showError
  );

  // Local UI State
  const [resultsVisible, setResultsVisible] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [useSchemaCollector, setUseSchemaCollector] = useState(true);
  const [tabModelMap, setTabModelMap] = useState<Map<string, SqlModelEntity>>(new Map());
  
  // Test Values Manager
  const { 
    testValuesModel, 
    updateFromString: updateTestValuesFromString
  } = useTestValuesManager();


  // Get current SQL from active main tab
  const getCurrentSql = () => {
    const mainTab = tabs.find(tab => tab.type === 'main');
    return mainTab?.content || '';
  };
  
  // Open SQL model in new tab
  const openSqlModel = (name: string, sql: string, type: 'main' | 'cte', modelEntity?: SqlModelEntity) => {
    console.log('[DEBUG] Opening SQL model:', { name, type, sqlLength: sql.length });
    
    // Check if tab already exists
    const existingTab = tabs.find(tab => tab.title === name);
    if (existingTab) {
      console.log('[DEBUG] Using existing tab:', existingTab.id, 'type:', existingTab.type);
      setActiveTabId(existingTab.id);
      if (modelEntity) {
        setTabModelMap(prev => new Map(prev.set(existingTab.id, modelEntity)));
      }
    } else {
      const newTab = addNewTab(type, name, sql);
      console.log('[DEBUG] Created new tab:', newTab.id, 'type:', newTab.type);
      if (modelEntity) {
        setTabModelMap(prev => new Map(prev.set(newTab.id, modelEntity)));
      }
    }
  };
  
  // Set current model entity for active tab
  const handleSetCurrentModelEntity = (model: SqlModelEntity) => {
    if (activeTab) {
      setTabModelMap(prev => new Map(prev.set(activeTab.id, model)));
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    openValuesTab,
    openFormatterTab,
    getCurrentSql,
    openSqlModel,
    setCurrentModelEntity: handleSetCurrentModelEntity
  }));

  // Update query result when active tab changes
  useEffect(() => {
    if (activeTab) {
      const associatedModel = tabModelMap.get(activeTab.id);
      if (associatedModel && associatedModel.hasQueryResult()) {
        // Load cached query result for this model
        setQueryResult(associatedModel.queryResult!);
        setResultsVisible(true);
        console.log('[DEBUG] Loaded cached query result for:', associatedModel.name);
      } else {
        // No cached result for this tab
        setQueryResult(null);
        console.log('[DEBUG] No cached query result for tab:', activeTab.title);
      }
    }
  }, [activeTabId, tabModelMap]);


  const executeQuery = async () => {
    if (!activeTab?.content.trim()) return;

    setIsExecuting(true);
    setResultsVisible(true);

    try {
      // Get the SQL to execute
      let sqlToExecute = activeTab.content;
      
      // If this tab has an associated model entity, use getFullSql() for execution
      const associatedModel = tabModelMap.get(activeTab.id);
      if (associatedModel) {
        // Get test values - prefer TestValuesModel if available, otherwise use tab content
        const valuesTab = tabs.find(tab => tab.type === 'values');
        let testValues: TestValuesModel | string | undefined;
        
        if (testValuesModel) {
          // Use structured TestValuesModel for better formatting
          testValues = testValuesModel;
        } else if (valuesTab?.content?.trim()) {
          // Fallback to string-based test values and try to create model
          updateTestValuesFromString(valuesTab.content);
          testValues = valuesTab.content;
        }
        
        // Use getFullSql() with test values for database-independent execution
        sqlToExecute = associatedModel.getFullSql(testValues);
        
        console.log('Executing SQL with test values:', sqlToExecute);
      }
      
      // Simulate query execution for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock result - replace with actual SQL execution later
      // TODO: Replace with actual PGlite or database execution
      const mockResult: QueryExecutionResult = {
        success: true,
        data: [
          { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '2024-01-15' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '2024-01-16' },
          { id: 3, name: 'Bob Johnson', email: 'bob@example.com', created_at: '2024-01-17' }
        ],
        executionTime: 127,
        rowCount: 3,
        executedSql: sqlToExecute // Include the executed SQL for debugging
      };

      setQueryResult(mockResult);
      
      // Save result to associated model entity
      if (associatedModel) {
        associatedModel.setQueryResult(mockResult);
        console.log('[DEBUG] Saved query result to model:', associatedModel.name);
      }
    } catch (error) {
      const errorResult: QueryExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
      setQueryResult(errorResult);
      
      // Save error result to associated model entity
      if (associatedModel) {
        associatedModel.setQueryResult(errorResult);
        console.log('[DEBUG] Saved error result to model:', associatedModel.name);
      }
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
    const mainTab = tabs.find(tab => tab.type === 'main');
    const currentSql = mainTab?.content || '';
    
    if (!currentSql || !currentSql.trim()) {
      showError('No SQL query found in main editor');
      return;
    }

    await generateAndCopyPrompt(currentSql, { useSchemaCollector });
  };

  const applyFormatterConfig = async () => {
    if (activeTab?.type !== 'formatter') return;
    
    const configJson = activeTab.content.trim();
    if (!configJson) {
      showError('No formatter configuration found');
      return;
    }

    await applyConfig(configJson);
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Tab Bar */}
      <div 
        className="bg-dark-secondary border-b border-dark-border-primary flex items-center overflow-x-auto relative tab-container"
        onWheel={(e) => {
          const container = e.currentTarget;
          container.scrollLeft += e.deltaY;
          e.preventDefault();
        }}
      >
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
          onClick={() => addNewTab()}
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
                    disabled={isGenerating}
                    className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy prompt for generating VALUES CTEs to clipboard"
                  >
                    📋 {isGenerating ? 'Copying...' : 'Copy Prompt'}
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
                    onClick={applyFormatterConfig}
                    disabled={isApplying || !activeTab?.content.trim()}
                    className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isApplying ? 'Applying...' : 'Apply Config'}
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
              key={activeTab?.id} // Force re-mount when tab changes
              value={activeTab?.content || ''}
              onChange={(value) => activeTab && updateTabContent(activeTab.id, value)}
              language={(() => {
                const lang = activeTab?.type === 'formatter' ? 'json' : 'sql';
                console.log('[DEBUG] Monaco language for tab:', activeTab?.title, 'type:', activeTab?.type, 'language:', lang);
                console.log('[DEBUG] Tab content preview:', activeTab?.content?.substring(0, 50));
                return lang;
              })()}
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
              } : {
                // SQL-specific options for main and CTE tabs
                wordWrap: 'off',
                minimap: { enabled: false },
                folding: true,
                autoIndent: 'full'
              }}
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
          onClose={hideToast}
        />
      )}
    </main>
  );
});
import { useState, useImperativeHandle, forwardRef, useMemo, useEffect, useCallback } from 'react';
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

import { SqlModelEntity } from '@shared/types';
import { TestValuesModel } from '@core/entities/test-values-model';
import { useTestValuesManager } from '@ui/hooks/useTestValuesManager';
import { commandExecutor } from '@core/services/command-executor';
import { ExecuteQueryCommand } from '@core/commands/execute-query-command';

export interface MainContentRef {
  openValuesTab: () => void;
  openFormatterTab: () => void;
  openConditionTab: () => void;
  getCurrentSql: () => string;
  openSqlModel: (name: string, sql: string, type: 'main' | 'cte', modelEntity?: SqlModelEntity) => void;
  setCurrentModelEntity: (model: SqlModelEntity) => void;
  clearAllTabs: () => void;
}

interface MainContentProps {
  workspace?: import('@core/entities/workspace').WorkspaceEntity | null;
}

export const MainContent = forwardRef<MainContentRef, MainContentProps>(({ workspace }, ref) => {
  // Debug workspace
  console.log('[DEBUG] MainContent received workspace:', !!workspace, workspace?.name);
  
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
    openValuesTab: openValuesTabInternal,
    openFormatterTab: openFormatterTabInternal,
    openConditionTab: openConditionTabInternal,
    closeTab,
    updateTabContent: updateTabContentInternal,
    setActiveTabId,
    addNewTab,
    clearAllTabs: clearTabsFromManager
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
  
  // Clear all tabs and associated data
  const clearAllTabs = () => {
    // Clear all tab model mappings
    setTabModelMap(new Map());
    // Clear query results
    setQueryResult(null);
    setResultsVisible(false);
    // Clear tabs from tab manager
    clearTabsFromManager();
  };
  
  // Open values tab with workspace content
  const openValuesTab = () => {
    const content = workspace?.testValues.toString() || '';
    console.log('[DEBUG] Opening Values tab with workspace content:', content.substring(0, 100));
    console.log('[DEBUG] Workspace testValues exists:', !!workspace?.testValues);
    console.log('[DEBUG] Workspace testValues raw withClause:', workspace?.testValues.withClause);
    openValuesTabInternal(content);
  };

  // Open formatter tab with workspace content
  const openFormatterTab = () => {
    const content = workspace?.formatter.displayString || '';
    console.log('[DEBUG] Opening Formatter tab with workspace content:', content.substring(0, 100));
    console.log('[DEBUG] Workspace formatter exists:', !!workspace?.formatter);
    openFormatterTabInternal(content);
  };

  // Open condition tab with workspace content
  const openConditionTab = () => {
    const content = workspace?.filterConditions.displayString || '{}';
    console.log('[DEBUG] Opening Condition tab with workspace content:', content.substring(0, 100));
    console.log('[DEBUG] Workspace filterConditions exists:', !!workspace?.filterConditions);
    openConditionTabInternal(content);
  };
  
  // Update tab content with workspace synchronization
  const updateTabContent = (tabId: string, content: string) => {
    const tab = tabs.find(t => t.id === tabId);
    
    // If this is a values tab, update the workspace testValues
    if (tab?.type === 'values' && workspace) {
      console.log('[DEBUG] Updating workspace testValues with:', content.substring(0, 100));
      workspace.updateTestValues(new TestValuesModel(content));
      console.log('[DEBUG] Workspace testValues updated successfully');
    }
    
    // If this is a formatter tab, update the workspace formatter
    if (tab?.type === 'formatter' && workspace) {
      console.log('[DEBUG] Updating workspace formatter with:', content.substring(0, 100));
      try {
        const config = JSON.parse(content);
        workspace.formatter.setFormatterConfig(config);
        console.log('[DEBUG] Workspace formatter updated successfully');
      } catch (error) {
        console.warn('[DEBUG] Failed to parse formatter config, saving as-is:', error);
        workspace.formatter.config = content; // Save raw content if JSON parsing fails
      }
    }
    
    // If this is a condition tab, update the workspace filterConditions
    if (tab?.type === 'condition' && workspace) {
      console.log('[DEBUG] Updating workspace filterConditions with:', content.substring(0, 100));
      workspace.filterConditions.displayString = content;
      console.log('[DEBUG] Workspace filterConditions updated successfully');
    }
    
    updateTabContentInternal(tabId, content);
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    openValuesTab,
    openFormatterTab,
    openConditionTab,
    getCurrentSql,
    openSqlModel,
    setCurrentModelEntity: handleSetCurrentModelEntity,
    clearAllTabs
  }));

  // Update query result when active tab changes
  useEffect(() => {
    if (activeTab) {
      const associatedModel = tabModelMap.get(activeTab.id);
      if (associatedModel && 'hasQueryResult' in associatedModel && (associatedModel as any).hasQueryResult()) {
        // Load cached query result for this model
        setQueryResult((associatedModel as any).queryResult!);
        setResultsVisible(true);
        console.log('[DEBUG] Loaded cached query result for:', associatedModel.name);
      } else {
        // No cached result for this tab
        setQueryResult(null);
        console.log('[DEBUG] No cached query result for tab:', activeTab.title);
      }
    }
  }, [activeTabId, tabModelMap]);

  const executeQuery = useCallback(async () => {
    if (!activeTab?.content.trim()) return;

    setIsExecuting(true);
    setResultsVisible(true);

    try {
      // Create command context
      const context = {
        workspace,
        sqlModel: tabModelMap.get(activeTab.id) || null,
        tabContent: activeTab.content,
        tabType: activeTab.type
      };
      
      // Create and execute command
      const command = new ExecuteQueryCommand(context);
      const result = await commandExecutor.execute(command);
      
      // Update UI with result
      setQueryResult(result);
      
      // Save result to model if available
      const model = tabModelMap.get(activeTab.id);
      if (model && 'setQueryResult' in model && typeof (model as any).setQueryResult === 'function') {
        (model as any).setQueryResult(result);
      }
    } catch (error) {
      // Handle execution errors
      const errorResult: QueryExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime: 0
      };
      setQueryResult(errorResult);
    } finally {
      setIsExecuting(false);
    }
  }, [activeTab, tabModelMap, workspace]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ctrl+Enter for query execution
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      executeQuery();
    }
  }, [executeQuery]);

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
                    title="Run Query (Ctrl+Enter)"
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
                const lang = (activeTab?.type === 'formatter' || activeTab?.type === 'condition') ? 'json' : 'sql';
                console.log('[DEBUG] Monaco language for tab:', activeTab?.title, 'type:', activeTab?.type, 'language:', lang);
                console.log('[DEBUG] Tab content preview:', activeTab?.content?.substring(0, 50));
                return lang;
              })()}
              height="100%"
              isMainEditor={true}
              onKeyDown={handleKeyDown}
              options={activeTab?.type === 'values' ? {
                wordWrap: 'off',
                wrappingStrategy: 'simple',
                scrollBeyondLastLine: false,
                minimap: { enabled: false }
              } : (activeTab?.type === 'formatter' || activeTab?.type === 'condition') ? {
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
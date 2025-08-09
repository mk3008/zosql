/**
 * useMainContentState - Complete state management for MainContent
 * Phase 3: Full state management without ViewModel dependency
 * CRITICAL: Preserves MonacoEditor stability with fixed key
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { Tab, WorkspaceEntity, QueryExecutionResult } from '@shared/types';
import { SqlModelEntity } from '@core/entities/sql-model';
import { TestValuesModel } from '@core/entities/test-values-model';
import { DebugLogger } from '../../utils/debug-logger';

export interface UseMainContentStateReturn {
  // Tab state
  tabs: Tab[];
  activeTabId: string;
  activeTab: Tab | null;
  tabModelMap: Map<string, SqlModelEntity>;
  
  // Execution state
  isExecuting: boolean;
  dataTabResults: Map<string, QueryExecutionResult>;
  
  // UI state
  resultsVisible: boolean;
  searchTerm: string | undefined;
  
  // Tab operations
  addTab: (tab: Tab) => void;
  updateTabContent: (tabId: string, content: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  saveTab: (tabId: string) => void;
  
  // Model operations
  setTabModel: (tabId: string, model: SqlModelEntity) => void;
  openSqlModel: (model: SqlModelEntity) => void;
  openTestValues: (workspace: WorkspaceEntity) => void;
  
  // Execution operations  
  setIsExecuting: (executing: boolean) => void;
  setTabQueryResult: (tabId: string, result: QueryExecutionResult | null) => void;
  setDataTabResults: (results: Map<string, QueryExecutionResult>) => void;
  
  // UI operations
  setResultsVisible: (visible: boolean) => void;
  closeResults: () => void;
  
  // Workspace operations
  resetState: () => void;
  loadWorkspaceTabs: (workspace: WorkspaceEntity) => void;
}

/**
 * Complete MainContent state management hook
 * Replaces MainContentViewModel functionality
 */
export function useMainContentState(): UseMainContentStateReturn {
  // Tab state
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState('');
  const tabModelMapRef = useRef<Map<string, SqlModelEntity>>(new Map());
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [dataTabResults, setDataTabResults] = useState<Map<string, QueryExecutionResult>>(new Map());
  
  // UI state
  const [resultsVisible, setResultsVisible] = useState(false);
  const [searchTerm] = useState<string | undefined>(undefined);
  
  // Computed active tab
  const activeTab = useMemo(() => 
    tabs.find(tab => tab.id === activeTabId) || null,
    [tabs, activeTabId]
  );
  
  // Tab operations
  const addTab = useCallback((tab: Tab) => {
    DebugLogger.debug('useMainContentState', `Adding tab: ${tab.id}`);
    
    setTabs(prevTabs => {
      const existing = prevTabs.find(t => t.id === tab.id);
      if (existing) {
        return prevTabs.map(t => t.id === tab.id ? tab : t);
      }
      return [...prevTabs, tab];
    });
    setActiveTabId(tab.id);
  }, []);
  
  const updateTabContent = useCallback((tabId: string, content: string) => {
    let contentChanged = false;
    
    setTabs(prevTabs => 
      prevTabs.map(tab => {
        if (tab.id === tabId) {
          // Only mark as dirty if content actually changed
          if (tab.content !== content) {
            contentChanged = true;
            DebugLogger.debug('useMainContentState', `Content changed for tab ${tabId}, marking as dirty`);
            return { ...tab, content, isDirty: true };
          }
          // Content is the same, don't change isDirty state
          return tab;
        }
        return tab;
      })
    );
    
    // Update model's editor content only if content changed
    if (contentChanged) {
      const model = tabModelMapRef.current.get(tabId);
      if (model) {
        model.updateEditorContent(content);
      }
    }
  }, []);
  
  const closeTab = useCallback((tabId: string) => {
    DebugLogger.debug('useMainContentState', `Closing tab: ${tabId}`);
    
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      
      if (activeTabId === tabId && newTabs.length > 0) {
        setActiveTabId(newTabs[0].id);
      } else if (newTabs.length === 0) {
        setActiveTabId('');
      }
      
      return newTabs;
    });
    
    tabModelMapRef.current.delete(tabId);
  }, [activeTabId]);
  
  const setActiveTab = useCallback((tabId: string) => {
    if (tabs.some(tab => tab.id === tabId)) {
      setActiveTabId(tabId);
    }
  }, [tabs]);
  
  const saveTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !tab.isDirty) return;
    
    setTabs(prevTabs =>
      prevTabs.map(t =>
        t.id === tabId ? { ...t, isDirty: false } : t
      )
    );
    
    const model = tabModelMapRef.current.get(tabId);
    if (model && tab) {
      model.editorContent = tab.content;
    }
  }, [tabs]);
  
  const setTabModel = useCallback((tabId: string, model: SqlModelEntity) => {
    tabModelMapRef.current.set(tabId, model);
  }, []);
  
  const openSqlModel = useCallback((model: SqlModelEntity) => {
    const tabId = `${model.type}-${model.name}`;
    const tabTitle = model.type === 'main' ? 'root' : model.name;
    
    const newTab: Tab = {
      id: tabId,
      title: tabTitle,
      content: model.editorContent || model.sqlWithoutCte,
      type: model.type as 'main' | 'cte',
      isDirty: false
    };
    
    tabModelMapRef.current.set(tabId, model);
    addTab(newTab);
  }, [addTab]);
  
  const openTestValues = useCallback((workspace: WorkspaceEntity) => {
    if (!workspace.testValues) {
      workspace.testValues = new TestValuesModel('');
    }
    
    const newTab: Tab = {
      id: 'values',
      title: 'values',
      type: 'values',
      content: workspace.testValues.withClause,
      isDirty: false
    };
    
    addTab(newTab);
  }, [addTab]);
  
  const setTabQueryResult = useCallback((tabId: string, result: QueryExecutionResult | null) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, queryResult: result || undefined }
          : tab
      )
    );
  }, []);

  const closeResults = useCallback(() => {
    setResultsVisible(false);
  }, []);
  
  const resetState = useCallback(() => {
    DebugLogger.debug('useMainContentState', 'Resetting all state');
    setTabs([]);
    setActiveTabId('');
    tabModelMapRef.current.clear();
    setDataTabResults(new Map());
    setResultsVisible(false);
  }, []);
  
  const loadWorkspaceTabs = useCallback((workspace: WorkspaceEntity) => {
    DebugLogger.debug('useMainContentState', 'Loading workspace tabs');
    
    // Clear existing state
    resetState();
    
    if (!workspace.openedObjects || workspace.openedObjects.length === 0) {
      return;
    }
    
    // Load tabs from opened objects
    workspace.openedObjects.forEach(obj => {
      if (obj.type === 'values') {
        openTestValues(workspace);
      } else {
        const model = workspace.sqlModels.find(m =>
          (obj.type === 'main' && m.type === 'main') ||
          (obj.type === 'cte' && m.name === obj.title)
        );
        
        if (model) {
          openSqlModel(model);
        }
      }
    });
    
    // Set active tab from workspace active object
    if (workspace.activeObjectId && workspace.openedObjects.length > 0) {
      setActiveTabId(workspace.activeObjectId);
    } else if (workspace.openedObjects.length > 0) {
      setActiveTabId(workspace.openedObjects[0].id);
    }
  }, [resetState, openTestValues, openSqlModel]);
  
  return {
    // State
    tabs,
    activeTabId,
    activeTab,
    tabModelMap: tabModelMapRef.current,
    isExecuting,
    dataTabResults,
    resultsVisible,
    searchTerm,
    
    // Operations
    addTab,
    updateTabContent,
    closeTab,
    setActiveTab,
    saveTab,
    setTabModel,
    openSqlModel,
    openTestValues,
    setIsExecuting,
    setTabQueryResult,
    setDataTabResults,
    setResultsVisible,
    closeResults,
    resetState,
    loadWorkspaceTabs
  };
}
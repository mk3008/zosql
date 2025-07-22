/**
 * タブ管理機能のカスタムフック
 * UI Layer - React Hooks
 */

import { useState, useCallback } from 'react';
import { Tab } from '@shared/types';

interface UseTabManagerResult {
  tabs: Tab[];
  activeTabId: string;
  activeTab: Tab | undefined;
  addNewTab: (type?: Tab['type'], title?: string, content?: string) => Tab;
  openValuesTab: (content?: string) => void;
  openFormatterTab: (content?: string) => void;
  openConditionTab: (content?: string) => void;
  closeTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  setActiveTabId: (tabId: string) => void;
  clearAllTabs: () => void;
}

const DEFAULT_CONTENT = {
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
}`,
  condition: '{}',
  main: '',
  cte: ''
};

const DEFAULT_TITLE = {
  values: 'Values & Test Data',
  formatter: 'SQL Formatter Config',
  condition: 'Filter Conditions',
  main: 'Untitled.sql',
  cte: 'Untitled.cte'
};

export const useTabManager = (): UseTabManagerResult => {
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'main',
      title: 'main.sql',
      type: 'main',
      content: 'SELECT user_id, name FROM users;',
      isDirty: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('main');

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const addNewTab = useCallback((
    type: Tab['type'] = 'main', 
    title?: string, 
    content?: string
  ): Tab => {
    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      title: title || DEFAULT_TITLE[type] || 'Untitled',
      type,
      content: content || DEFAULT_CONTENT[type] || '',
      isDirty: false
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    return newTab;
  }, []);

  const openValuesTab = useCallback((content?: string) => {
    const existingTab = tabs.find(tab => tab.type === 'values');
    if (existingTab) {
      setActiveTabId(existingTab.id);
      // Update content if provided
      if (content !== undefined && existingTab.content !== content) {
        setTabs(prev => prev.map(tab => 
          tab.id === existingTab.id 
            ? { ...tab, content, isDirty: false }
            : tab
        ));
      }
    } else {
      addNewTab('values', undefined, content);
    }
  }, [tabs, addNewTab]);

  const openFormatterTab = useCallback((content?: string) => {
    const existingTab = tabs.find(tab => tab.type === 'formatter');
    if (existingTab) {
      setActiveTabId(existingTab.id);
      // Update content if provided
      if (content !== undefined && existingTab.content !== content) {
        setTabs(prev => prev.map(tab => 
          tab.id === existingTab.id 
            ? { ...tab, content, isDirty: false }
            : tab
        ));
      }
    } else {
      addNewTab('formatter', undefined, content);
    }
  }, [tabs, addNewTab]);

  const openConditionTab = useCallback((content?: string) => {
    const existingTab = tabs.find(tab => tab.type === 'condition');
    if (existingTab) {
      setActiveTabId(existingTab.id);
      // Update content if provided
      if (content !== undefined && existingTab.content !== content) {
        setTabs(prev => prev.map(tab => 
          tab.id === existingTab.id 
            ? { ...tab, content, isDirty: false }
            : tab
        ));
      }
    } else {
      addNewTab('condition', undefined, content);
    }
  }, [tabs, addNewTab]);

  const closeTab = useCallback((tabId: string) => {
    const updatedTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(updatedTabs);
    
    if (activeTabId === tabId && updatedTabs.length > 0) {
      setActiveTabId(updatedTabs[0].id);
    }
  }, [tabs, activeTabId]);

  const updateTabContent = useCallback((tabId: string, content: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, content, isDirty: true }
        : tab
    ));
  }, []);

  const clearAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId('');
  }, []);

  return {
    tabs,
    activeTabId,
    activeTab,
    addNewTab,
    openValuesTab,
    openFormatterTab,
    openConditionTab,
    closeTab,
    updateTabContent,
    setActiveTabId,
    clearAllTabs
  };
};
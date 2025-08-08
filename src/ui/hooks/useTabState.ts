/**
 * useTabState - Minimal tab state management hook
 * Phase 1: Extract only tab state, keep everything else in ViewModel
 * CRITICAL: No changes to MonacoEditor behavior
 */

import { useState, useCallback, useMemo } from 'react';
import { Tab } from '@shared/types';
import { pipe } from '../../lib/functional/index.js';
import * as Result from '../../lib/functional/result.js';
import * as Option from '../../lib/functional/option.js';

export interface UseTabStateReturn {
  // State
  tabs: Tab[];
  activeTabId: string;
  activeTab: Tab | null;
  
  // Simple operations that don't affect MonacoEditor
  setActiveTabId: (id: string) => void;
  
  // Sync from ViewModel (Phase 1 only)
  syncFromViewModel: (vmTabs: Tab[], vmActiveTabId: string) => void;
  
  // Read-only helpers
  hasTab: (id: string) => boolean;
  getTab: (id: string) => Tab | undefined;
}

/**
 * Minimal tab state hook - Phase 1 of migration
 * Only manages tab array and active tab selection
 * All complex operations remain in ViewModel
 */
export function useTabState(initialTabs: Tab[] = []): UseTabStateReturn {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabIdState] = useState<string>('');
  
  // Computed active tab
  const activeTab = useMemo(() => 
    tabs.find(tab => tab.id === activeTabId) || null,
    [tabs, activeTabId]
  );
  
  // Simple active tab setter
  const setActiveTabId = useCallback((id: string) => {
    if (tabs.some(tab => tab.id === id)) {
      setActiveTabIdState(id);
    }
  }, [tabs]);
  
  // Helper to check if tab exists
  const hasTab = useCallback((id: string) => {
    return tabs.some(tab => tab.id === id);
  }, [tabs]);
  
  // Helper to get specific tab
  const getTab = useCallback((id: string) => {
    return tabs.find(tab => tab.id === id);
  }, [tabs]);
  
  // Sync method for Phase 1 ViewModel integration
  const syncFromViewModel = useCallback((vmTabs: Tab[], vmActiveTabId: string) => {
    setTabs(vmTabs);
    setActiveTabIdState(vmActiveTabId);
  }, []);
  
  return {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    syncFromViewModel,
    hasTab,
    getTab
  };
}

// ===== NEW FUNCTIONAL VERSIONS - BACKWARD COMPATIBLE =====

/**
 * Functional version: Find tab by ID
 * Pure function returning Option with found tab
 */
export const findTabByIdFunc = (tabs: Tab[], id: string): Option.Option<Tab> => {
  const found = tabs.find(tab => tab.id === id);
  return Option.fromNullable(found);
};

/**
 * Functional version: Validate tab structure
 * Returns Result with validated tab or error
 */
export const validateTabFunc = (tab: unknown): Result.Result<Tab, string> => {
  if (!tab || typeof tab !== 'object') {
    return Result.err('Tab must be an object');
  }
  
  const tabObj = tab as Record<string, unknown>;
  
  if (!tabObj.id || typeof tabObj.id !== 'string') {
    return Result.err('Tab must have a string ID');
  }
  
  if (!tabObj.title || typeof tabObj.title !== 'string') {
    return Result.err('Tab must have a string title');
  }
  
  return Result.ok(tab as Tab);
};

/**
 * Functional version: Filter tabs by criteria
 * Pure function for filtering tab arrays
 */
export const filterTabsFunc = (
  tabs: Tab[],
  criteria: {
    titleContains?: string;
    type?: string;
    isModified?: boolean;
    hasContent?: boolean;
  }
): Tab[] => {
  return pipe(
    tabs,
    (tabs: Tab[]) => criteria.titleContains
      ? tabs.filter(tab => tab.title.toLowerCase().includes(criteria.titleContains!.toLowerCase()))
      : tabs,
    (tabs: Tab[]) => criteria.type
      ? tabs.filter(tab => (tab as { type?: string }).type === criteria.type)
      : tabs,
    (tabs: Tab[]) => criteria.isModified !== undefined
      ? tabs.filter(tab => Boolean((tab as { isModified?: boolean }).isModified) === criteria.isModified)
      : tabs,
    (tabs: Tab[]) => criteria.hasContent !== undefined
      ? tabs.filter(tab => {
          const content = (tab as { content?: string }).content;
          const hasContent = content && content.trim().length > 0;
          return hasContent === criteria.hasContent;
        })
      : tabs
  );
};

/**
 * Functional version: Sort tabs by criteria
 * Pure function for sorting tab arrays
 */
export const sortTabsFunc = (
  tabs: Tab[],
  criteria: 'title' | 'created' | 'modified' | 'index' = 'index',
  order: 'asc' | 'desc' = 'asc'
): Tab[] => {
  return [...tabs].sort((a, b) => {
    let comparison = 0;
    
    switch (criteria) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'created':
        comparison = ((a as { createdAt?: number }).createdAt || 0) - ((b as { createdAt?: number }).createdAt || 0);
        break;
      case 'modified':
        comparison = ((a as { modifiedAt?: number }).modifiedAt || 0) - ((b as { modifiedAt?: number }).modifiedAt || 0);
        break;
      case 'index':
      default:
        comparison = 0; // Maintain original order
        break;
    }
    
    return order === 'desc' ? -comparison : comparison;
  });
};

/**
 * Functional version: Get tab statistics
 * Pure function for calculating tab statistics
 */
export const getTabStatisticsFunc = (tabs: Tab[]): {
  total: number;
  modified: number;
  empty: number;
  byType: Record<string, number>;
} => {
  if (tabs.length === 0) {
    return {
      total: 0,
      modified: 0,
      empty: 0,
      byType: {}
    };
  }
  
  let modified = 0;
  let empty = 0;
  const byType: Record<string, number> = {};
  
  tabs.forEach(tab => {
    const extendedTab = tab as { isModified?: boolean; content?: string; type?: string };
    
    if (extendedTab.isModified) {
      modified++;
    }
    
    if (!extendedTab.content || extendedTab.content.trim().length === 0) {
      empty++;
    }
    
    const type = extendedTab.type || 'unknown';
    byType[type] = (byType[type] || 0) + 1;
  });
  
  return {
    total: tabs.length,
    modified,
    empty,
    byType
  };
};

/**
 * Functional version: Update tab by ID
 * Pure function returning new array with updated tab
 */
export const updateTabByIdFunc = (
  tabs: Tab[],
  id: string,
  updates: Partial<Tab>
): Option.Option<Tab[]> => {
  const tabIndex = tabs.findIndex(tab => tab.id === id);
  
  if (tabIndex === -1) {
    return Option.none;
  }
  
  const updatedTab = { ...tabs[tabIndex], ...updates };
  const newTabs = [...tabs];
  newTabs[tabIndex] = updatedTab;
  
  return Option.some(newTabs);
};

/**
 * Functional version: Add tab to array
 * Pure function returning new array with added tab
 */
export const addTabToArrayFunc = (tabs: Tab[], newTab: Tab, position?: number): Tab[] => {
  if (position === undefined) {
    return [...tabs, newTab];
  }
  
  const safePosition = Math.max(0, Math.min(position, tabs.length));
  const newTabs = [...tabs];
  newTabs.splice(safePosition, 0, newTab);
  
  return newTabs;
};

/**
 * Functional version: Remove tab by ID
 * Pure function returning new array without specified tab
 */
export const removeTabByIdFunc = (tabs: Tab[], id: string): {
  tabs: Tab[];
  removedTab: Option.Option<Tab>;
} => {
  const tabIndex = tabs.findIndex(tab => tab.id === id);
  
  if (tabIndex === -1) {
    return {
      tabs,
      removedTab: Option.none
    };
  }
  
  const removedTab = tabs[tabIndex];
  const newTabs = tabs.filter(tab => tab.id !== id);
  
  return {
    tabs: newTabs,
    removedTab: Option.some(removedTab)
  };
};

/**
 * Functional version: Tab state reducer
 * Pure function for state transitions
 */
export type TabStateAction = 
  | { type: 'SET_TABS'; payload: { tabs: Tab[] } }
  | { type: 'ADD_TAB'; payload: { tab: Tab; position?: number } }
  | { type: 'REMOVE_TAB'; payload: { id: string } }
  | { type: 'UPDATE_TAB'; payload: { id: string; updates: Partial<Tab> } }
  | { type: 'SET_ACTIVE_TAB'; payload: { id: string } }
  | { type: 'MOVE_TAB'; payload: { id: string; newPosition: number } };

export const tabStateReducerFunc = (
  state: { tabs: Tab[]; activeTabId: string },
  action: TabStateAction
): { tabs: Tab[]; activeTabId: string } => {
  switch (action.type) {
    case 'SET_TABS':
      return {
        ...state,
        tabs: action.payload.tabs
      };
      
    case 'ADD_TAB': {
      const { tab, position } = action.payload;
      const newTabs = addTabToArrayFunc(state.tabs, tab, position);
      return {
        ...state,
        tabs: newTabs
      };
    }
    
    case 'REMOVE_TAB': {
      const { tabs: newTabs } = removeTabByIdFunc(state.tabs, action.payload.id);
      const activeTabExists = newTabs.some(tab => tab.id === state.activeTabId);
      
      return {
        tabs: newTabs,
        activeTabId: activeTabExists ? state.activeTabId : (newTabs[0]?.id || '')
      };
    }
    
    case 'UPDATE_TAB': {
      const { id, updates } = action.payload;
      const updatedTabsOption = updateTabByIdFunc(state.tabs, id, updates);
      
      if (Option.isSome(updatedTabsOption)) {
        return {
          ...state,
          tabs: updatedTabsOption.value
        };
      }
      
      return state;
    }
    
    case 'SET_ACTIVE_TAB': {
      const { id } = action.payload;
      const tabExists = state.tabs.some(tab => tab.id === id);
      
      return {
        ...state,
        activeTabId: tabExists ? id : state.activeTabId
      };
    }
    
    case 'MOVE_TAB': {
      const { id, newPosition } = action.payload;
      const tabIndex = state.tabs.findIndex(tab => tab.id === id);
      
      if (tabIndex === -1) {
        return state;
      }
      
      const tab = state.tabs[tabIndex];
      const tabsWithoutTab = state.tabs.filter(t => t.id !== id);
      const newTabs = addTabToArrayFunc(tabsWithoutTab, tab, newPosition);
      
      return {
        ...state,
        tabs: newTabs
      };
    }
    
    default:
      return state;
  }
};

/**
 * Functional version: Create tab state actions
 * Action creator functions for tab operations
 */
export const createTabStateActionsFunc = () => ({
  setTabs: (tabs: Tab[]): TabStateAction => ({
    type: 'SET_TABS',
    payload: { tabs }
  }),
  
  addTab: (tab: Tab, position?: number): TabStateAction => ({
    type: 'ADD_TAB',
    payload: { tab, position }
  }),
  
  removeTab: (id: string): TabStateAction => ({
    type: 'REMOVE_TAB',
    payload: { id }
  }),
  
  updateTab: (id: string, updates: Partial<Tab>): TabStateAction => ({
    type: 'UPDATE_TAB',
    payload: { id, updates }
  }),
  
  setActiveTab: (id: string): TabStateAction => ({
    type: 'SET_ACTIVE_TAB',
    payload: { id }
  }),
  
  moveTab: (id: string, newPosition: number): TabStateAction => ({
    type: 'MOVE_TAB',
    payload: { id, newPosition }
  })
});

/**
 * Functional version: Use tab state with functional patterns
 * Enhanced hook using functional state management
 */
export const useTabStateFunc = (initialTabs: Tab[] = []): UseTabStateReturn & {
  // Enhanced functionality
  findTab: (id: string) => Option.Option<Tab>;
  filterTabs: (criteria: Parameters<typeof filterTabsFunc>[1]) => Tab[];
  sortTabs: (criteria?: Parameters<typeof sortTabsFunc>[1], order?: Parameters<typeof sortTabsFunc>[2]) => Tab[];
  getStatistics: () => ReturnType<typeof getTabStatisticsFunc>;
  updateTab: (id: string, updates: Partial<Tab>) => boolean;
  activeTabOption: Option.Option<Tab>;
} => {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabIdState] = useState<string>('');
  
  // Convert active tab to Option type
  const activeTab = useMemo(() => 
    tabs.find(tab => tab.id === activeTabId) || null,
    [tabs, activeTabId]
  );
  
  const activeTabOption = Option.fromNullable(activeTab);
  
  // Enhanced functionality
  const findTab = useCallback((id: string): Option.Option<Tab> => {
    return findTabByIdFunc(tabs, id);
  }, [tabs]);
  
  const filterTabs = useCallback((criteria: Parameters<typeof filterTabsFunc>[1]) => {
    return filterTabsFunc(tabs, criteria);
  }, [tabs]);
  
  const sortTabs = useCallback((
    criteria: Parameters<typeof sortTabsFunc>[1] = 'index',
    order: Parameters<typeof sortTabsFunc>[2] = 'asc'
  ) => {
    return sortTabsFunc(tabs, criteria, order);
  }, [tabs]);
  
  const getStatistics = useCallback(() => {
    return getTabStatisticsFunc(tabs);
  }, [tabs]);
  
  const updateTab = useCallback((id: string, updates: Partial<Tab>): boolean => {
    const updatedTabsOption = updateTabByIdFunc(tabs, id, updates);
    
    if (Option.isSome(updatedTabsOption)) {
      setTabs(updatedTabsOption.value);
      return true;
    }
    
    return false;
  }, [tabs]);
  
  // Original functionality (backward compatible)
  const setActiveTabId = useCallback((id: string) => {
    if (tabs.some(tab => tab.id === id)) {
      setActiveTabIdState(id);
    }
  }, [tabs]);
  
  const hasTab = useCallback((id: string) => {
    return tabs.some(tab => tab.id === id);
  }, [tabs]);
  
  const getTab = useCallback((id: string) => {
    return tabs.find(tab => tab.id === id);
  }, [tabs]);
  
  const syncFromViewModel = useCallback((vmTabs: Tab[], vmActiveTabId: string) => {
    setTabs(vmTabs);
    setActiveTabIdState(vmActiveTabId);
  }, []);

  return {
    // Original interface
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    syncFromViewModel,
    hasTab,
    getTab,
    
    // Enhanced functionality
    findTab,
    filterTabs,
    sortTabs,
    getStatistics,
    updateTab,
    activeTabOption
  };
};
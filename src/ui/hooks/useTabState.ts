/**
 * useTabState - Minimal tab state management hook
 * Phase 1: Extract only tab state, keep everything else in ViewModel
 * CRITICAL: No changes to MonacoEditor behavior
 */

import { useState, useCallback, useMemo } from 'react';
import { Tab } from '@shared/types';

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
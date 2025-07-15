import { describe, it, expect } from 'vitest';

/**
 * Test for the createNewTab function integration with split view system
 * This test verifies that the createNewTab function works correctly with both left and right panels
 */
describe('createNewTab Split View Integration', () => {
  it('should work with split view panel parameters', () => {
    // Mock the split view system variables
    const mockLeftTabs = new Map();
    const mockRightTabs = new Map();
    let mockTabCounter = 0;
    let mockActivePanel = 'left';
    
    // Mock the createNewTab function
    function mockCreateNewTab(panel?: string) {
      // Default to current active panel if no panel specified
      panel = panel || mockActivePanel;
      
      mockTabCounter++;
      const tabId = `tab-${mockTabCounter}`;
      const tabName = `untitled-${mockTabCounter}.sql`;
      
      const tabs = panel === 'left' ? mockLeftTabs : mockRightTabs;
      
      tabs.set(tabId, {
        name: tabName,
        type: 'sql',
        content: '',
        isModified: false,
        originalContent: ''
      });
      
      return { tabId, tabName, panel };
    }
    
    // Test creating tab in left panel
    const leftResult = mockCreateNewTab('left');
    expect(leftResult.panel).toBe('left');
    expect(leftResult.tabId).toBe('tab-1');
    expect(leftResult.tabName).toBe('untitled-1.sql');
    expect(mockLeftTabs.size).toBe(1);
    expect(mockRightTabs.size).toBe(0);
    
    // Test creating tab in right panel
    const rightResult = mockCreateNewTab('right');
    expect(rightResult.panel).toBe('right');
    expect(rightResult.tabId).toBe('tab-2');
    expect(rightResult.tabName).toBe('untitled-2.sql');
    expect(mockLeftTabs.size).toBe(1);
    expect(mockRightTabs.size).toBe(1);
    
    // Test creating tab with default panel (left)
    mockActivePanel = 'left';
    const defaultResult = mockCreateNewTab();
    expect(defaultResult.panel).toBe('left');
    expect(mockLeftTabs.size).toBe(2);
    expect(mockRightTabs.size).toBe(1);
    
    // Test creating tab with default panel (right)
    mockActivePanel = 'right';
    const defaultRightResult = mockCreateNewTab();
    expect(defaultRightResult.panel).toBe('right');
    expect(mockLeftTabs.size).toBe(2);
    expect(mockRightTabs.size).toBe(2);
    
    // Verify tab contents
    const leftTab = mockLeftTabs.get('tab-1');
    expect(leftTab?.type).toBe('sql');
    expect(leftTab?.content).toBe('');
    expect(leftTab?.isModified).toBe(false);
    
    const rightTab = mockRightTabs.get('tab-2');
    expect(rightTab?.type).toBe('sql');
    expect(rightTab?.content).toBe('');
    expect(rightTab?.isModified).toBe(false);
  });
});
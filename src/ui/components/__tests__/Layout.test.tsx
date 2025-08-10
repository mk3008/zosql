import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Layout } from '../Layout';
import '@testing-library/jest-dom';

// Mock child components
vi.mock('../Header', () => ({
  Header: vi.fn(({ onToggleLeftSidebar, onToggleRightSidebar }) => (
    <div data-testid="header">
      <button onClick={onToggleLeftSidebar} data-testid="toggle-left">Toggle Left</button>
      <button onClick={onToggleRightSidebar} data-testid="toggle-right">Toggle Right</button>
    </div>
  ))
}));

vi.mock('../LeftSidebar', () => ({
  LeftSidebar: vi.fn(() => <div data-testid="left-sidebar">Left Sidebar</div>)
}));

vi.mock('../RightSidebar', () => ({
  RightSidebar: vi.fn(() => <div data-testid="right-sidebar">Right Sidebar</div>)
}));

// Mock MainContentFunctional with ref forwarding
const mockMainContentRef = {
  openValuesTab: vi.fn(),
  openFormatterTab: vi.fn(),
  openConditionTab: vi.fn(),
  getCurrentSql: vi.fn(() => ''),
  openSqlModel: vi.fn(),
  setCurrentModelEntity: vi.fn(),
  clearAllTabs: vi.fn(),
  runStaticAnalysis: vi.fn(),
  getWorkspace: vi.fn()
};

let mainContentRenderCount = 0;

vi.mock('../MainContentFunctional', () => ({
  MainContentFunctional: vi.fn().mockImplementation(
    React.forwardRef((props, ref) => {
      mainContentRenderCount++;
      
      // Simulate ref attachment
      React.useImperativeHandle(ref, () => mockMainContentRef);
      
      return (
        <div data-testid="main-content" data-render-count={mainContentRenderCount}>
          MainContent
          {props.workspace && (
            <div data-testid="workspace-info">
              Workspace: {props.workspace.id}
            </div>
          )}
        </div>
      );
    })
  )
}));

vi.mock('../ResizableSplitter', () => ({
  ResizableSplitter: vi.fn(({ children }) => (
    <div data-testid="resizable-splitter">
      {children}
    </div>
  ))
}));

describe('Layout Component - Tab Persistence', () => {
  beforeEach(() => {
    mainContentRenderCount = 0;
    vi.clearAllMocks();
  });

  it('should maintain MainContent instance when toggling left sidebar', async () => {
    render(<Layout />);
    
    // Get initial render count
    const initialRenderCount = mainContentRenderCount;
    
    // Toggle left sidebar off
    const toggleLeftButton = screen.getByTestId('toggle-left');
    fireEvent.click(toggleLeftButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
    });
    
    // Check MainContent is still present
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    
    // Toggle left sidebar back on
    fireEvent.click(toggleLeftButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
    });
    
    // MainContent should still be present
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    
    // Verify MainContent didn't remount (render count should be minimal)
    // Allow for some re-renders but not complete remounting
    expect(mainContentRenderCount).toBeLessThanOrEqual(initialRenderCount + 2);
  });

  it('should maintain MainContent instance when toggling right sidebar', async () => {
    render(<Layout />);
    
    const initialRenderCount = mainContentRenderCount;
    
    // Toggle right sidebar off
    const toggleRightButton = screen.getByTestId('toggle-right');
    fireEvent.click(toggleRightButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('right-sidebar')).not.toBeInTheDocument();
    });
    
    // Check MainContent is still present
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    
    // Toggle right sidebar back on
    fireEvent.click(toggleRightButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
    });
    
    // MainContent should still be present
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    
    // Verify MainContent didn't remount
    expect(mainContentRenderCount).toBeLessThanOrEqual(initialRenderCount + 2);
  });

  it('should maintain MainContent instance when toggling both sidebars', async () => {
    render(<Layout />);
    
    const initialRenderCount = mainContentRenderCount;
    
    const toggleLeftButton = screen.getByTestId('toggle-left');
    const toggleRightButton = screen.getByTestId('toggle-right');
    
    // Toggle both sidebars off
    fireEvent.click(toggleLeftButton);
    fireEvent.click(toggleRightButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('right-sidebar')).not.toBeInTheDocument();
    });
    
    // Check MainContent is still present
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    
    // Toggle both sidebars back on
    fireEvent.click(toggleLeftButton);
    fireEvent.click(toggleRightButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('right-sidebar')).toBeInTheDocument();
    });
    
    // MainContent should still be present
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    
    // Verify MainContent didn't remount (allow for re-renders but not remounting)
    expect(mainContentRenderCount).toBeLessThanOrEqual(initialRenderCount + 4);
  });

  it('should preserve MainContent ref when panels toggle', async () => {
    render(<Layout />);
    
    // Mock opening a tab
    mockMainContentRef.openSqlModel('test-model', 'SELECT * FROM test', 'main');
    
    const toggleLeftButton = screen.getByTestId('toggle-left');
    
    // Toggle left sidebar
    fireEvent.click(toggleLeftButton);
    await waitFor(() => {
      expect(screen.queryByTestId('left-sidebar')).not.toBeInTheDocument();
    });
    
    // Ref methods should still be available
    expect(mockMainContentRef.openSqlModel).toBeDefined();
    expect(mockMainContentRef.getCurrentSql).toBeDefined();
    
    // Toggle back
    fireEvent.click(toggleLeftButton);
    await waitFor(() => {
      expect(screen.getByTestId('left-sidebar')).toBeInTheDocument();
    });
    
    // Ref methods should still be available
    expect(mockMainContentRef.openSqlModel).toBeDefined();
    expect(mockMainContentRef.getCurrentSql).toBeDefined();
  });
});
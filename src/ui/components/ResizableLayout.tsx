import React from 'react';

interface ResizableLayoutProps {
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  leftPanel: React.ReactNode;
  mainPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

/**
 * ResizableLayout - Maintains stable component tree structure
 * 
 * This component ensures that ALL panels always stay in the React component tree,
 * preventing remounting when sidebars are toggled.
 * 
 * Uses CSS display property to show/hide panels while keeping them mounted.
 */
export const ResizableLayout: React.FC<ResizableLayoutProps> = ({
  leftSidebarVisible,
  rightSidebarVisible,
  leftPanel,
  mainPanel,
  rightPanel
}) => {
  // Always render the same structure, use CSS to control visibility
  return (
    <div className="h-full w-full flex">
      {/* Left Sidebar - always in DOM, visibility controlled by CSS */}
      <div 
        className="h-full overflow-hidden"
        style={{ 
          display: leftSidebarVisible ? 'block' : 'none',
          width: leftSidebarVisible ? '250px' : '0',
          minWidth: leftSidebarVisible ? '250px' : '0',
          flexShrink: 0
        }}
      >
        {leftPanel}
      </div>
      
      {/* Left Resizer */}
      {leftSidebarVisible && (
        <div className="w-1 bg-dark-border-primary hover:bg-primary-600 cursor-col-resize transition-colors" />
      )}
      
      {/* Main Panel - always visible */}
      <div className="flex-1 h-full overflow-hidden">
        {mainPanel}
      </div>
      
      {/* Right Resizer */}
      {rightSidebarVisible && (
        <div className="w-1 bg-dark-border-primary hover:bg-primary-600 cursor-col-resize transition-colors" />
      )}
      
      {/* Right Sidebar - always in DOM, visibility controlled by CSS */}
      <div 
        className="h-full overflow-hidden"
        style={{ 
          display: rightSidebarVisible ? 'block' : 'none',
          width: rightSidebarVisible ? '250px' : '0',
          minWidth: rightSidebarVisible ? '250px' : '0',
          flexShrink: 0
        }}
      >
        {rightPanel}
      </div>
    </div>
  );
};
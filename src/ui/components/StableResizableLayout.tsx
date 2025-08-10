import React, { useRef, useState, useCallback, useEffect } from 'react';

interface StableResizableLayoutProps {
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  leftPanel: React.ReactNode;
  mainPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

/**
 * StableResizableLayout - Custom resizable layout that maintains component instances
 * 
 * This component implements manual resize functionality while ensuring
 * that all panels remain mounted in the DOM, preventing React from
 * unmounting components when panels are toggled.
 */
export const StableResizableLayout: React.FC<StableResizableLayoutProps> = ({
  leftSidebarVisible,
  rightSidebarVisible,
  leftPanel,
  mainPanel,
  rightPanel
}) => {
  // Panel widths in pixels
  const [leftWidth, setLeftWidth] = useState(250);
  const [rightWidth, setRightWidth] = useState(250);
  
  // Resize states
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  
  // Refs for DOM manipulation
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handle left panel resize
  const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);
  
  // Handle right panel resize
  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);
  
  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      
      if (isResizingLeft) {
        const newWidth = e.clientX - containerRect.left;
        // Constrain between min and max
        setLeftWidth(Math.min(Math.max(200, newWidth), 400));
      }
      
      if (isResizingRight) {
        const newWidth = containerRect.right - e.clientX;
        // Constrain between min and max
        setRightWidth(Math.min(Math.max(200, newWidth), 400));
      }
    };
    
    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };
    
    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Set cursor style
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizingLeft, isResizingRight]);
  
  return (
    <div ref={containerRef} className="h-full w-full flex">
      {/* Left Sidebar - always in DOM */}
      <div 
        className="h-full overflow-hidden transition-all duration-150"
        style={{ 
          width: leftSidebarVisible ? `${leftWidth}px` : '0',
          minWidth: leftSidebarVisible ? '200px' : '0',
          maxWidth: leftSidebarVisible ? '400px' : '0',
          opacity: leftSidebarVisible ? 1 : 0,
          pointerEvents: leftSidebarVisible ? 'auto' : 'none'
        }}
      >
        {leftPanel}
      </div>
      
      {/* Left Resizer */}
      <div 
        className={`bg-dark-border-primary hover:bg-primary-600 cursor-col-resize transition-colors ${
          leftSidebarVisible ? 'w-1' : 'w-0'
        }`}
        onMouseDown={handleLeftMouseDown}
        style={{
          backgroundColor: isResizingLeft ? '#007acc' : undefined,
          display: leftSidebarVisible ? 'block' : 'none'
        }}
      />
      
      {/* Main Panel - always visible */}
      <div className="flex-1 h-full overflow-hidden">
        {mainPanel}
      </div>
      
      {/* Right Resizer */}
      <div 
        className={`bg-dark-border-primary hover:bg-primary-600 cursor-col-resize transition-colors ${
          rightSidebarVisible ? 'w-1' : 'w-0'
        }`}
        onMouseDown={handleRightMouseDown}
        style={{
          backgroundColor: isResizingRight ? '#007acc' : undefined,
          display: rightSidebarVisible ? 'block' : 'none'
        }}
      />
      
      {/* Right Sidebar - always in DOM */}
      <div 
        className="h-full overflow-hidden transition-all duration-150"
        style={{ 
          width: rightSidebarVisible ? `${rightWidth}px` : '0',
          minWidth: rightSidebarVisible ? '200px' : '0',
          maxWidth: rightSidebarVisible ? '400px' : '0',
          opacity: rightSidebarVisible ? 1 : 0,
          pointerEvents: rightSidebarVisible ? 'auto' : 'none'
        }}
      >
        {rightPanel}
      </div>
    </div>
  );
};
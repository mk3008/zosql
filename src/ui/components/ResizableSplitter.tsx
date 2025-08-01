import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ResizableSplitterProps {
  children: [React.ReactNode, React.ReactNode];
  direction?: 'horizontal' | 'vertical';
  initialSizes?: [number, number]; // Percentages or pixels
  minSizes?: [number, number]; // Minimum sizes in pixels
  className?: string;
  resizerClassName?: string;
  onResize?: (sizes: [number, number]) => void;
}

export const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  children,
  direction = 'vertical',
  initialSizes = [60, 40], // Default: 60% top/left, 40% bottom/right
  minSizes = [200, 200], // Default minimum sizes
  className = '',
  resizerClassName = '',
  onResize
}) => {
  const [firstPaneSize, setFirstPaneSize] = useState(initialSizes[0]);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  const isHorizontal = direction === 'horizontal';
  
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    let newSize: number;
    
    if (isHorizontal) {
      // Horizontal splitting (left/right panes)
      const mouseX = event.clientX - containerRect.left;
      const containerWidth = containerRect.width;
      newSize = (mouseX / containerWidth) * 100;
      
      // Apply minimum size constraints
      const minFirstPanePercent = (minSizes[0] / containerWidth) * 100;
      const minSecondPanePercent = (minSizes[1] / containerWidth) * 100;
      const maxFirstPanePercent = 100 - minSecondPanePercent;
      
      newSize = Math.max(minFirstPanePercent, Math.min(maxFirstPanePercent, newSize));
    } else {
      // Vertical splitting (top/bottom panes)
      const mouseY = event.clientY - containerRect.top;
      const containerHeight = containerRect.height;
      newSize = (mouseY / containerHeight) * 100;
      
      // Apply minimum size constraints
      const minFirstPanePercent = (minSizes[0] / containerHeight) * 100;
      const minSecondPanePercent = (minSizes[1] / containerHeight) * 100;
      const maxFirstPanePercent = 100 - minSecondPanePercent;
      
      newSize = Math.max(minFirstPanePercent, Math.min(maxFirstPanePercent, newSize));
    }
    
    setFirstPaneSize(newSize);
    onResize?.([newSize, 100 - newSize]);
  }, [isResizing, isHorizontal, minSizes, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add global mouse event listeners when resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp, isHorizontal]);

  const secondPaneSize = 100 - firstPaneSize;

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} h-full w-full ${className}`}
    >
      {/* First Pane */}
      <div
        className="overflow-hidden"
        style={{
          [isHorizontal ? 'width' : 'height']: `${firstPaneSize}%`,
          [isHorizontal ? 'minWidth' : 'minHeight']: `${minSizes[0]}px`
        }}
      >
        {children[0]}
      </div>

      {/* Resizer */}
      <div
        ref={resizerRef}
        className={`
          flex-shrink-0 
          ${isHorizontal 
            ? 'w-1 cursor-col-resize hover:bg-primary-600' 
            : 'h-1 cursor-row-resize hover:bg-primary-600'
          } 
          bg-dark-border-primary transition-colors duration-150
          ${resizerClassName}
        `}
        onMouseDown={handleMouseDown}
        style={{
          backgroundColor: isResizing ? '#007acc' : undefined
        }}
      >
        {/* Visual indicator */}
        <div className={`
          ${isHorizontal 
            ? 'w-full h-6 self-center' 
            : 'h-full w-6 self-center'
          }
          flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity
        `}>
          <div className={`
            ${isHorizontal 
              ? 'w-0.5 h-4' 
              : 'h-0.5 w-4'
            }
            bg-dark-text-secondary rounded
          `} />
        </div>
      </div>

      {/* Second Pane */}
      <div
        className="overflow-hidden"
        style={{
          [isHorizontal ? 'width' : 'height']: `${secondPaneSize}%`,
          [isHorizontal ? 'minWidth' : 'minHeight']: `${minSizes[1]}px`
        }}
      >
        {children[1]}
      </div>
    </div>
  );
};
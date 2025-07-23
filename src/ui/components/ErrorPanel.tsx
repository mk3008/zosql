import React, { useState, useEffect } from 'react';

export interface ErrorInfo {
  id: string;
  timestamp: Date;
  message: string;
  details?: string;
  stack?: string;
  type: 'error' | 'warning';
}

interface ErrorPanelProps {
  errors: ErrorInfo[];
  onClearError: (id: string) => void;
  onClearAll: () => void;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({ errors, onClearError, onClearAll }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Auto-expand when new error arrives
  useEffect(() => {
    if (errors.length > 0 && !isExpanded) {
      setIsExpanded(true);
      setSelectedError(errors[errors.length - 1].id);
    }
  }, [errors.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.panel-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (errors.length === 0) return null;

  const selectedErrorInfo = errors.find(e => e.id === selectedError);

  return (
    <>
      {/* Minimized state - floating error icon */}
      {!isExpanded && (
        <div
          className="fixed z-50 bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center cursor-pointer shadow-lg hover:bg-red-700 transition-colors"
          style={{ right: '20px', bottom: '20px' }}
          onClick={() => setIsExpanded(true)}
          title={`${errors.length} error(s)`}
        >
          <span className="text-sm font-bold">{errors.length}</span>
        </div>
      )}

      {/* Expanded state - error panel */}
      {isExpanded && (
        <div
          className="fixed z-50 bg-dark-secondary border border-dark-border-primary rounded-lg shadow-2xl"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '400px',
            maxHeight: '500px',
            display: 'flex',
            flexDirection: 'column'
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Panel header */}
          <div className="panel-header bg-dark-primary border-b border-dark-border-primary px-4 py-2 rounded-t-lg cursor-move">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-dark-text-primary">
                Errors ({errors.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClearAll}
                  className="text-xs text-dark-text-secondary hover:text-dark-text-primary"
                  title="Clear all errors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-dark-text-secondary hover:text-dark-text-primary"
                  title="Minimize"
                >
                  _
                </button>
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onClearAll();
                  }}
                  className="text-dark-text-secondary hover:text-dark-text-primary"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Error list */}
          <div className="flex-1 flex overflow-hidden">
            {/* Error tabs */}
            <div className="w-1/3 border-r border-dark-border-primary overflow-y-auto">
              {errors.map((error) => (
                <div
                  key={error.id}
                  className={`px-3 py-2 cursor-pointer border-b border-dark-border-primary ${
                    selectedError === error.id ? 'bg-dark-hover' : 'hover:bg-dark-hover'
                  }`}
                  onClick={() => setSelectedError(error.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-dark-text-secondary">
                        {error.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="text-sm text-red-400 truncate">
                        {error.message}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearError(error.id);
                      }}
                      className="text-dark-text-secondary hover:text-dark-text-primary ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Error details */}
            <div className="flex-1 p-4 overflow-y-auto">
              {selectedErrorInfo ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-dark-text-secondary mb-1">Error Message</h4>
                    <div className="text-sm text-red-400 break-words">
                      {selectedErrorInfo.message}
                    </div>
                  </div>

                  {selectedErrorInfo.details && (
                    <div>
                      <h4 className="text-xs font-semibold text-dark-text-secondary mb-1">Details</h4>
                      <div className="text-xs text-dark-text-primary bg-dark-primary p-2 rounded break-words">
                        {selectedErrorInfo.details}
                      </div>
                    </div>
                  )}

                  {selectedErrorInfo.stack && (
                    <details className="cursor-pointer">
                      <summary className="text-xs font-semibold text-dark-text-secondary hover:text-dark-text-primary">
                        Stack Trace
                      </summary>
                      <pre className="text-xs text-dark-text-primary bg-dark-primary p-2 rounded mt-1 overflow-x-auto">
                        {selectedErrorInfo.stack}
                      </pre>
                    </details>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `Error: ${selectedErrorInfo.message}\n\nDetails: ${selectedErrorInfo.details || 'N/A'}\n\nStack: ${selectedErrorInfo.stack || 'N/A'}`
                        );
                      }}
                      className="text-xs px-2 py-1 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active"
                    >
                      Copy Error
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-dark-text-secondary">
                  Select an error to view details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
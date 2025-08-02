import React, { useRef, useEffect } from 'react';
import { QueryExecutionResult } from '@core/types/query-types';

// Type guard to check if a value is a record (object with string keys)
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Type guard to check if data is an array of records
function isRecordArray(data: readonly unknown[]): data is readonly Record<string, unknown>[] {
  return data.length === 0 || data.every(isRecord);
}

interface QueryResultsProps {
  result: QueryExecutionResult | null;
  isVisible: boolean;
  onClose: () => void;
}

export const QueryResults: React.FC<QueryResultsProps> = ({ result, isVisible, onClose }) => {
  // Refs for synchronized scrolling
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  
  // Handle both old and new result formats at component level
  const rows = result?.rows || (result as unknown as { data?: readonly unknown[] })?.data || [];
  const status = result?.status || ((result as unknown as { success?: boolean })?.success ? 'completed' : 'failed');
  
  console.log('[DEBUG] QueryResults component:', {
    isVisible,
    result,
    resultStatus: result?.status,
    resultRowsLength: result?.rows?.length,
    resultRowsType: typeof result?.rows,
    firstRowSample: result?.rows?.[0],
    computedRows: rows,
    computedStatus: status
  });
  
  // Synchronized horizontal scrolling between header and body
  useEffect(() => {
    const headerElement = headerScrollRef.current;
    const bodyElement = bodyScrollRef.current;
    
    if (!headerElement || !bodyElement) return;
    
    const syncHeaderScroll = () => {
      if (bodyElement) {
        bodyElement.scrollLeft = headerElement.scrollLeft;
      }
    };
    
    const syncBodyScroll = () => {
      if (headerElement) {
        headerElement.scrollLeft = bodyElement.scrollLeft;
      }
    };
    
    headerElement.addEventListener('scroll', syncHeaderScroll);
    bodyElement.addEventListener('scroll', syncBodyScroll);
    
    return () => {
      headerElement.removeEventListener('scroll', syncHeaderScroll);
      bodyElement.removeEventListener('scroll', syncBodyScroll);
    };
  }, []);
  
  if (!isVisible) return null;

  const renderTable = () => {
    const isError = status === 'failed' || (result as unknown as { error?: string })?.error;
    
    console.log('[DEBUG] renderTable check:', {
      hasResult: !!result,
      status,
      isError,
      rowsCount: rows.length,
      rowsType: typeof rows,
      firstRow: rows[0]
    });
    
    if (!result || isError || !rows || rows.length === 0) {
      return (
        <div className="text-center text-dark-text-muted py-8">
          {status === 'completed' ? 'No data returned from query' : 'Query execution failed'}
        </div>
      );
    }

    // Type-safe data access with guard
    if (!isRecordArray(rows)) {
      return (
        <div className="text-center text-dark-text-muted py-8">
          Invalid data format returned from query
        </div>
      );
    }
    
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    
    // Calculate dynamic column widths based on content
    const getColumnWidth = (column: string, index: number) => {
      // Row number column is fixed
      if (index === -1) return '60px';
      
      // Calculate width based on column name and sample data
      const headerLength = column.length;
      const maxDataLength = Math.max(
        ...rows.slice(0, 5).map(row => String(row[column] || '').length)
      );
      
      // Minimum 120px, maximum 300px, with padding
      const calculatedWidth = Math.min(300, Math.max(120, Math.max(headerLength, maxDataLength) * 8 + 24));
      return `${calculatedWidth}px`;
    };
    
    return (
      <div className="flex flex-col h-full">
        {/* Table Header - Fixed */}
        <div className="flex-shrink-0 overflow-hidden border-b border-dark-border-primary">
          <div 
            ref={headerScrollRef}
            className="overflow-x-auto scrollbar-thin"
          >
            <table className="text-sm table-fixed w-full min-w-max">
              <thead className="bg-dark-tertiary">
                <tr>
                  <th 
                    className="px-2 py-2 text-left border-r border-dark-border-primary text-dark-text-secondary whitespace-nowrap sticky left-0 bg-dark-tertiary z-10"
                    style={{ width: getColumnWidth('', -1), minWidth: getColumnWidth('', -1) }}
                  >
                    #
                  </th>
                  {columns.map((column, index) => (
                    <th 
                      key={column}
                      className={`px-3 py-2 text-left text-dark-text-white font-medium whitespace-nowrap ${
                        index < columns.length - 1 ? 'border-r border-dark-border-primary' : ''
                      }`}
                      style={{ width: getColumnWidth(column, index), minWidth: '120px' }}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
        </div>

        {/* Table Body - Scrollable */}
        <div 
          ref={bodyScrollRef}
          className="flex-1 overflow-auto scrollbar-thin"
        >
          <table className="text-sm table-fixed w-full min-w-max">
            <colgroup>
              <col style={{ width: getColumnWidth('', -1), minWidth: getColumnWidth('', -1) }} />
              {columns.map((column, index) => (
                <col key={column} style={{ width: getColumnWidth(column, index), minWidth: '120px' }} />
              ))}
            </colgroup>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  className={`border-b border-dark-border-primary hover:bg-dark-hover ${
                    rowIndex % 2 === 0 ? 'bg-dark-primary' : 'bg-dark-secondary'
                  }`}
                >
                  <td 
                    className="px-2 py-2 text-dark-text-secondary border-r border-dark-border-primary whitespace-nowrap sticky left-0 z-10"
                    style={{ 
                      backgroundColor: rowIndex % 2 === 0 ? '#1a1a1a' : '#2a2a2a'
                    }}
                  >
                    {rowIndex + 1}
                  </td>
                  {columns.map((column, colIndex) => (
                    <td 
                      key={column}
                      className={`px-3 py-2 text-dark-text-primary ${
                        colIndex < columns.length - 1 ? 'border-r border-dark-border-primary' : ''
                      }`}
                    >
                      <div className="truncate" title={String(row[column])}>
                        {row[column] === null ? (
                          <span className="text-dark-text-muted italic">NULL</span>
                        ) : row[column] === '' ? (
                          <span className="text-dark-text-muted italic">(empty)</span>
                        ) : (
                          String(row[column])
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderError = () => {
    if (!result?.errors || result.errors.length === 0) return null;
    const errorMessage = result.errors[0].message;
    
    const handleCopyError = () => {
      navigator.clipboard.writeText(errorMessage || '').then(() => {
        // Could add a toast notification here
        console.log('Error message copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy error:', err);
      });
    };
    
    return (
      <div className="p-4 bg-error bg-opacity-10 border border-error border-opacity-30 rounded m-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-error font-medium">Query Error</h4>
          <button
            onClick={handleCopyError}
            className="text-xs px-2 py-1 bg-dark-tertiary hover:bg-dark-hover text-dark-text-primary rounded border border-dark-border-primary transition-colors"
            title="Copy error message"
          >
            Copy Error
          </button>
        </div>
        <textarea
          readOnly
          value={errorMessage}
          className="w-full text-sm text-dark-text-primary font-mono bg-dark-primary border border-dark-border-primary rounded p-3 resize-none"
          style={{ minHeight: '200px', height: 'auto' }}
          rows={errorMessage.split('\n').length + 1}
          onClick={(e) => {
            // Select all text when clicked
            e.currentTarget.select();
          }}
        />
      </div>
    );
  };

  return (
    <div className="border-t border-dark-border-primary bg-dark-secondary flex flex-col" style={{ minHeight: '300px', height: '40vh' }}>
      {/* Results Header */}
      <div className="bg-dark-tertiary border-b border-dark-border-primary px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-dark-text-white">Query Results</span>
          
          {((result as unknown as { success?: boolean })?.success || result?.status === 'completed') && (
            <span className="flex items-center gap-1 text-xs text-success">
              <span>✓</span>
              <span>Success</span>
            </span>
          )}
          
          {((result as unknown as { error?: string })?.error || result?.status === 'failed') && (
            <span className="flex items-center gap-1 text-xs text-error">
              <span>✗</span>
              <span>Error</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-dark-text-secondary">
            {((result as unknown as { success?: boolean })?.success || result?.status === 'completed') && (
              <>
                <span>Rows: {result?.stats?.rowsReturned ?? (result as unknown as { rowCount?: number })?.rowCount ?? rows.length ?? 0}</span>
                <span>Time: {result?.stats?.executionTimeMs ?? (result as unknown as { executionTime?: number })?.executionTime ?? 0}ms</span>
              </>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="text-dark-text-secondary hover:text-dark-text-primary"
            title="Hide Results"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-hidden">
        {result?.errors && result.errors.length > 0 ? renderError() : renderTable()}
      </div>
    </div>
  );
};
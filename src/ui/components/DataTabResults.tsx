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

interface DataTabResultsProps {
  results: Map<string, QueryExecutionResult>;
}

interface ResultGridProps {
  title: string;
  result: QueryExecutionResult;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ResultGrid: React.FC<ResultGridProps> = ({ title, result, isCollapsed, onToggleCollapse }) => {
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  
  // Handle both old and new result formats at component level
  const rows = result?.rows || (result as any)?.data || [];
  const status = result?.status || ((result as any)?.success ? 'completed' : 'failed');
  
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

  const renderTable = () => {
    const isError = status === 'failed' || (result as any)?.error;
    
    if (!result || isError || !rows || rows.length === 0) {
      return (
        <div className="text-center text-dark-text-muted py-4">
          {status === 'completed' ? 'No data returned from query' : 
           status === 'failed' ? `Error: ${result?.errors?.[0]?.message || (result as any)?.error || 'Query execution failed'}` :
           'No result available'}
        </div>
      );
    }

    // Type-safe data access with guard
    if (!isRecordArray(rows)) {
      return (
        <div className="text-center text-dark-text-muted py-4">
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

        {/* Table Body - Horizontally Scrollable */}
        <div 
          ref={bodyScrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin"
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

  return (
    <div className="border border-dark-border-primary bg-dark-secondary rounded mb-4">
      {/* Result Header - Clickable */}
      <div 
        className="bg-dark-tertiary border-b border-dark-border-primary px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-dark-hover"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-4">
          <span className="text-dark-text-secondary text-xs">
            {isCollapsed ? '▶' : '▼'}
          </span>
          <span className="text-sm font-medium text-dark-text-white hover:text-primary-400 transition-colors">
            {title}
          </span>
          
          {status === 'completed' && (
            <span className="flex items-center gap-1 text-xs text-success">
              <span>✓</span>
              <span>Success</span>
            </span>
          )}
          
          {status === 'failed' && (
            <span className="flex items-center gap-1 text-xs text-error">
              <span>✗</span>
              <span>Error</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs text-dark-text-secondary">
          {status === 'completed' && (
            <>
              <span>Rows: {result?.stats?.rowsReturned ?? (result as any)?.rowCount ?? rows.length ?? 0}</span>
              <span>Time: {result?.stats?.executionTimeMs ?? (result as any)?.executionTime ?? 0}ms</span>
            </>
          )}
        </div>
      </div>

      {/* Result Content */}
      {!isCollapsed && (
        <div>
          {renderTable()}
        </div>
      )}
    </div>
  );
};

export const DataTabResults: React.FC<DataTabResultsProps> = ({ results }) => {
  const [collapsedState, setCollapsedState] = React.useState<Record<string, boolean>>({});

  const toggleCollapse = (key: string) => {
    setCollapsedState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Sort results to show 'root' first, then CTEs alphabetically
  const sortedEntries = Array.from(results.entries()).sort(([a], [b]) => {
    if (a === 'root') return -1;
    if (b === 'root') return 1;
    return a.localeCompare(b);
  });

  if (results.size === 0) {
    return (
      <div className="text-center text-dark-text-muted py-8">
        Click "Run" to execute queries and see results
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedEntries.map(([key, result]) => (
        <ResultGrid
          key={key}
          title={key}
          result={result}
          isCollapsed={collapsedState[key] || false}
          onToggleCollapse={() => toggleCollapse(key)}
        />
      ))}
    </div>
  );
};
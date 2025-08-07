import React from 'react';
import { QueryExecutionResult } from '@shared/types';
import { WorkspaceEntity } from '@shared/types';

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
  workspace: WorkspaceEntity | null;
}

interface ResultGridProps {
  title: string;
  result: QueryExecutionResult;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const ResultGrid: React.FC<ResultGridProps> = ({ title, result, isCollapsed, onToggleCollapse }) => {
  // Handle both old and new result formats at component level
  const rows = result?.rows || (result as unknown as { data?: readonly unknown[] })?.data || [];
  const status = result?.status || ((result as unknown as { success?: boolean })?.success ? 'completed' : 'failed');
  
  // State for selected row and cell (same as QueryResults)
  const [selectedRowIndex, setSelectedRowIndex] = React.useState<number | null>(null);
  const [selectedCellColumn, setSelectedCellColumn] = React.useState<string | null>(null);

  const renderTable = () => {
    const isError = status === 'failed' || !!(result as unknown as { error?: string })?.error;
    
    if (!result || isError || !rows || rows.length === 0) {
      if (status === 'failed' || isError) {
        // Display error with proper formatting
        const errorMessage = result?.errors?.[0]?.message || (result as unknown as { error?: string })?.error || 'Query execution failed';
        return (
          <div className="p-4 bg-error bg-opacity-10 border border-error border-opacity-30 rounded m-4">
            <h4 className="text-error font-medium mb-2">Query Error</h4>
            <div className="text-sm text-dark-text-primary font-mono bg-dark-primary border border-dark-border-primary rounded p-3">
              {errorMessage}
            </div>
          </div>
        );
      }
      
      return (
        <div className="text-center text-dark-text-muted py-4">
          {status === 'completed' ? 'No data returned from query' : 'No result available'}
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
    
    return (
      <div className="overflow-x-auto overflow-y-visible scrollbar-thin">
        <table className="text-sm table-auto w-full">
          <thead className="bg-dark-tertiary sticky top-0 z-10">
            <tr>
              <th 
                className="px-2 py-1 text-left border-r border-dark-border-primary text-dark-text-secondary whitespace-nowrap sticky left-0 bg-dark-tertiary z-20"
              >
                #
              </th>
              {columns.map((column) => (
                <th 
                  key={column}
                  className={`px-3 py-1 text-left text-dark-text-white font-medium whitespace-nowrap border-r border-dark-border-primary ${
                    selectedCellColumn === column ? 'bg-blue-600 bg-opacity-30' : ''
                  }`}
                >
                  {column}
                </th>
              ))}
              {/* Layout control column - fills remaining width */}
              <th className="w-full"></th>
            </tr>
          </thead>
          <tbody>
              {rows.map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  className={`border-b border-dark-border-primary hover:bg-dark-hover cursor-pointer ${
                    selectedRowIndex === rowIndex 
                      ? 'bg-blue-600 bg-opacity-30' 
                      : rowIndex % 2 === 0 ? 'bg-dark-primary' : 'bg-dark-secondary'
                  }`}
                  onClick={(e) => {
                    // If clicking on a data cell, don't trigger row selection
                    if ((e.target as HTMLElement).tagName === 'TD' && (e.target as HTMLElement).closest('td')?.getAttribute('data-column')) {
                      return;
                    }
                    setSelectedRowIndex(rowIndex === selectedRowIndex ? null : rowIndex);
                    setSelectedCellColumn(null);
                  }}
                >
                  <td 
                    className="px-2 py-1 text-dark-text-secondary border-r border-dark-border-primary whitespace-nowrap sticky left-0 z-10"
                    style={{ 
                      backgroundColor: selectedRowIndex === rowIndex 
                        ? 'rgba(37, 99, 235, 0.3)' 
                        : rowIndex % 2 === 0 ? '#1a1a1a' : '#2a2a2a'
                    }}
                  >
                    {rowIndex + 1}
                  </td>
                  {columns.map((column) => (
                    <td 
                      key={column}
                      data-column={column}
                      className={`px-3 py-1 text-dark-text-primary border-r border-dark-border-primary cursor-pointer ${
                        selectedRowIndex === rowIndex && selectedCellColumn === column 
                          ? 'bg-blue-600 bg-opacity-50' 
                          : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRowIndex(rowIndex);
                        setSelectedCellColumn(column === selectedCellColumn && rowIndex === selectedRowIndex ? null : column);
                      }}
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
                  {/* Layout control column - fills remaining width */}
                  <td className="w-full"></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="border border-dark-border-primary bg-dark-secondary rounded mb-4 w-full max-w-full overflow-hidden">
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
              <span>Rows: {result?.stats?.rowsReturned ?? (result as unknown as { rowCount?: number })?.rowCount ?? rows.length ?? 0}</span>
              <span>Time: {result?.stats?.executionTimeMs ?? (result as unknown as { executionTime?: number })?.executionTime ?? 0}ms</span>
            </>
          )}
        </div>
      </div>

      {/* Result Content - Show errors even when collapsed */}
      {(!isCollapsed || (status === 'failed' || !!(result as unknown as { error?: string })?.error)) && (
        <div>
          {renderTable()}
        </div>
      )}
    </div>
  );
};

export const DataTabResults: React.FC<DataTabResultsProps> = ({ results, workspace }) => {
  // All sections expanded by default - simple and predictable
  const [collapsedState, setCollapsedState] = React.useState<Record<string, boolean>>({});

  const toggleCollapse = (key: string) => {
    setCollapsedState(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Sort results by dependency depth (hierarchy order)
  const sortedEntries = Array.from(results.entries()).sort(([a], [b]) => {
    // If no workspace, fall back to simple sorting
    if (!workspace) {
      if (a === 'root') return 1; // root at bottom
      if (b === 'root') return -1;
      return a.localeCompare(b);
    }

    const depths = workspace.getModelDependencyDepths();
    const depthA = depths.get(a) ?? 0;
    const depthB = depths.get(b) ?? 0;

    // CTEs with fewer nesting levels come first
    // root (highest dependency depth) comes last
    if (depthA !== depthB) {
      return depthA - depthB;
    }

    // Same nesting level: sort alphabetically, but root always last
    if (a === 'root') return 1;
    if (b === 'root') return -1;
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
    <div 
      className="absolute inset-0 overflow-y-auto"
      style={{
        backgroundColor: '#2a2a2a', // Match parent background
        paddingBottom: '20px' // Extra padding to ensure last item is fully visible
      }}
    >
      <div className="p-4 space-y-4">
      {sortedEntries.map(([key, result]) => (
        <ResultGrid
          key={key}
          title={key}
          result={result}
          isCollapsed={collapsedState[key] || false}
          onToggleCollapse={() => toggleCollapse(key)}
        />
      ))}
      {/* Additional bottom margin to ensure last item is fully scrollable */}
      <div style={{ height: '24px' }}></div>
      </div>
    </div>
  );
};
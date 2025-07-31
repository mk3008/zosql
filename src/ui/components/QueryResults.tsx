import React from 'react';
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
  // Handle both old and new result formats at component level
  const rows = result?.rows || (result as any)?.data || [];
  const status = result?.status || ((result as any)?.success ? 'completed' : 'failed');
  
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
  
  if (!isVisible) return null;

  const renderTable = () => {
    const isError = status === 'failed' || (result as any)?.error;
    
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
    
    return (
      <div className="overflow-auto">
        <table className="text-sm table-auto">
          <thead className="bg-dark-tertiary sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left border-r border-dark-border-primary text-dark-text-secondary whitespace-nowrap">
                #
              </th>
              {columns.map((column, index) => (
                <th 
                  key={column}
                  className={`px-3 py-2 text-left text-dark-text-white font-medium whitespace-nowrap ${
                    index < columns.length - 1 ? 'border-r border-dark-border-primary' : ''
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                className={`border-b border-dark-border-primary hover:bg-dark-hover ${
                  rowIndex % 2 === 0 ? 'bg-dark-primary' : 'bg-dark-secondary'
                }`}
              >
                <td className="px-2 py-2 text-dark-text-secondary border-r border-dark-border-primary whitespace-nowrap">
                  {rowIndex + 1}
                </td>
                {columns.map((column, colIndex) => (
                  <td 
                    key={column}
                    className={`px-3 py-2 text-dark-text-primary ${
                      colIndex < columns.length - 1 ? 'border-r border-dark-border-primary' : ''
                    }`}
                  >
                    <div className="min-w-0" title={String(row[column])}>
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
          
          {((result as any)?.success || result?.status === 'completed') && (
            <span className="flex items-center gap-1 text-xs text-success">
              <span>✓</span>
              <span>Success</span>
            </span>
          )}
          
          {((result as any)?.error || result?.status === 'failed') && (
            <span className="flex items-center gap-1 text-xs text-error">
              <span>✗</span>
              <span>Error</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-dark-text-secondary">
            {((result as any)?.success || result?.status === 'completed') && (
              <>
                <span>Rows: {result.stats?.rowsReturned ?? (result as any)?.rowCount ?? rows.length ?? 0}</span>
                <span>Time: {result.stats?.executionTimeMs ?? (result as any)?.executionTime ?? 0}ms</span>
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
import React from 'react';
import { QueryExecutionResult } from '@shared/types';

interface QueryResultsProps {
  result: QueryExecutionResult | null;
  isVisible: boolean;
  onClose: () => void;
}

export const QueryResults: React.FC<QueryResultsProps> = ({ result, isVisible, onClose }) => {
  if (!isVisible) return null;

  const renderTable = () => {
    if (!result?.success || !result.data || result.data.length === 0) {
      return (
        <div className="text-center text-dark-text-muted py-8">
          {result?.success ? 'No data returned from query' : 'Query execution failed'}
        </div>
      );
    }

    const columns = Object.keys(result.data[0]);
    
    return (
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-dark-tertiary sticky top-0">
            <tr>
              <th className="w-12 px-2 py-2 text-left border-r border-dark-border-primary text-dark-text-secondary">
                #
              </th>
              {columns.map((column, index) => (
                <th 
                  key={column}
                  className={`px-3 py-2 text-left text-dark-text-white font-medium ${
                    index < columns.length - 1 ? 'border-r border-dark-border-primary' : ''
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.data.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                className={`border-b border-dark-border-primary hover:bg-dark-hover ${
                  rowIndex % 2 === 0 ? 'bg-dark-primary' : 'bg-dark-secondary'
                }`}
              >
                <td className="w-12 px-2 py-2 text-dark-text-secondary border-r border-dark-border-primary">
                  {rowIndex + 1}
                </td>
                {columns.map((column, colIndex) => (
                  <td 
                    key={column}
                    className={`px-3 py-2 text-dark-text-primary ${
                      colIndex < columns.length - 1 ? 'border-r border-dark-border-primary' : ''
                    }`}
                  >
                    <div className="max-w-xs truncate" title={String(row[column])}>
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
    if (!result?.error) return null;
    
    const handleCopyError = () => {
      navigator.clipboard.writeText(result.error || '').then(() => {
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
          value={result.error}
          className="w-full text-sm text-dark-text-primary font-mono bg-dark-primary border border-dark-border-primary rounded p-3 resize-none"
          style={{ minHeight: '200px', height: 'auto' }}
          rows={result.error.split('\n').length + 1}
          onClick={(e) => {
            // Select all text when clicked
            e.currentTarget.select();
          }}
        />
      </div>
    );
  };

  return (
    <div className="h-80 border-t border-dark-border-primary bg-dark-secondary flex flex-col">
      {/* Results Header */}
      <div className="bg-dark-tertiary border-b border-dark-border-primary px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-dark-text-white">Query Results</span>
          
          {result?.success && (
            <span className="flex items-center gap-1 text-xs text-success">
              <span>✓</span>
              <span>Success</span>
            </span>
          )}
          
          {result?.success === false && (
            <span className="flex items-center gap-1 text-xs text-error">
              <span>✗</span>
              <span>Error</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-xs text-dark-text-secondary">
            {result?.success && (
              <>
                <span>Rows: {result.rowCount ?? result.data?.length ?? 0}</span>
                <span>Time: {result.executionTime ?? 0}ms</span>
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
        {result?.error ? renderError() : renderTable()}
      </div>
    </div>
  );
};
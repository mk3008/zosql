import React, { useState, useEffect } from 'react';
import { MonacoEditor } from './MonacoEditor';

interface FinalSqlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  finalSql: string;
  isLoading?: boolean;
  error?: string;
}

export const FinalSqlDialog: React.FC<FinalSqlDialogProps> = ({
  isOpen,
  onClose,
  finalSql,
  isLoading = false,
  error
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  // Reset copy success state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCopySuccess(false);
    }
  }, [isOpen]);

  // Handle ESC key to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalSql);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([finalSql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'final-query.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-secondary border border-dark-border-primary rounded-lg shadow-xl w-4/5 h-4/5 max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border-primary">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-dark-text-white">Final SQL</h2>
            <span className="text-xs text-dark-text-secondary bg-dark-tertiary px-2 py-1 rounded">
              Production Ready
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={isLoading || !!error}
              className="px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copySuccess ? '✓ Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading || !!error}
              className="px-3 py-1.5 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-dark-hover text-dark-text-primary rounded hover:bg-dark-active transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="h-full border border-dark-border-primary rounded bg-dark-primary">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-dark-text-secondary">Generating Final SQL...</div>
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-red-400 text-center">
                  <div className="mb-2">Failed to generate Final SQL</div>
                  <div className="text-sm text-dark-text-secondary">{error}</div>
                </div>
              </div>
            ) : (
              <MonacoEditor
                value={finalSql}
                onChange={() => {}} // Read-only
                language="sql"
                readOnly={true}
                options={{
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  folding: true,
                  readOnly: true,
                  contextmenu: true,
                  selectOnLineNumbers: true
                }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border-primary">
          <div className="text-xs text-dark-text-secondary">
            <div className="mb-1">
              <strong>Final SQL contains:</strong>
            </div>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>WITH clause composition (dependencies included)</li>
              <li>Formatted according to workspace formatter settings</li>
              <li>VALUES clause excluded (test data removed)</li>
              <li>Filter conditions excluded (development-time only)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
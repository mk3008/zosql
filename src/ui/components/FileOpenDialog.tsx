import React, { useState, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';

interface FileOpenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFileOpen?: (file: File) => Promise<void>;
}

export const FileOpenDialog: React.FC<FileOpenDialogProps> = ({ isOpen, onClose, onFileOpen }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createWorkspace } = useWorkspace();

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.sql')) {
      alert('Please select a .sql file');
      return;
    }

    setSelectedFile(file);
    setWorkspaceName(file.name.replace('.sql', ''));

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !fileContent.trim() || !workspaceName.trim()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // If custom file handler is provided, use it
      if (onFileOpen) {
        await onFileOpen(selectedFile);
      } else {
        // Default behavior: create workspace
        await createWorkspace({
          name: workspaceName.trim(),
          sql: fileContent.trim(),
          originalFilePath: selectedFile.name
        });
      }
      
      // Reset form and close dialog
      setSelectedFile(null);
      setFileContent('');
      setWorkspaceName('');
      onClose();
    } catch (error) {
      console.error('Failed to process file:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFileContent('');
    setWorkspaceName('');
    setDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-secondary border border-dark-border-primary rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border-primary">
          <h2 className="text-lg font-semibold text-dark-text-white">Open SQL File</h2>
          <button
            onClick={handleClose}
            className="text-dark-text-secondary hover:text-dark-text-primary"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4">
            {/* File Selection Area */}
            <div>
              <label className="block text-sm font-medium text-dark-text-white mb-2">
                Select SQL File
              </label>
              
              {!selectedFile ? (
                <div
                  className={`
                    w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors
                    ${dragOver 
                      ? 'border-primary-600 bg-primary-600 bg-opacity-10' 
                      : 'border-dark-border-primary hover:border-dark-border-accent'
                    }
                  `}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📁</div>
                    <div className="text-sm text-dark-text-primary">
                      Drop SQL file here or click to browse
                    </div>
                    <div className="text-xs text-dark-text-secondary mt-1">
                      Supports .sql files
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full p-3 border border-dark-border-primary rounded-lg bg-dark-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📄</span>
                      <div>
                        <div className="text-sm font-medium text-dark-text-white">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-dark-text-secondary">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-dark-text-secondary hover:text-dark-text-primary text-sm"
                      disabled={isLoading}
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".sql"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={isLoading}
              />
            </div>

            {/* Workspace Name */}
            {selectedFile && (
              <div>
                <label htmlFor="workspace-name" className="block text-sm font-medium text-dark-text-white mb-2">
                  Workspace Name
                </label>
                <input
                  id="workspace-name"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name..."
                  className="w-full px-3 py-2 bg-dark-primary border border-dark-border-primary rounded text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:border-primary-600"
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            {/* File Preview */}
            {fileContent && (
              <div>
                <label className="block text-sm font-medium text-dark-text-white mb-2">
                  File Preview
                </label>
                <div className="w-full h-48 bg-dark-primary border border-dark-border-primary rounded overflow-hidden">
                  <pre className="w-full h-full p-3 text-xs text-dark-text-primary font-mono overflow-auto">
                    {fileContent.substring(0, 2000)}
                    {fileContent.length > 2000 && '\n... (truncated)'}
                  </pre>
                </div>
                <div className="text-xs text-dark-text-secondary mt-1">
                  {fileContent.split('\n').length} lines, {fileContent.length} characters
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-dark-border-primary">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-dark-text-primary hover:bg-dark-hover rounded transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !selectedFile || !workspaceName.trim()}
            >
              {isLoading ? 'Opening...' : 'Open File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
/**
 * File Open Hook
 * UI Layer - Hook for handling file opening and SQL decomposition
 */

import { useState, useCallback } from 'react';
import { useSqlDecomposer } from './useSqlDecomposer';
import { SqlModelEntity } from '@shared/types';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';

interface FileOpenResult {
  fileName: string;
  content: string;
  models: SqlModelEntity[];
}

interface UseFileOpenResult {
  openFile: (file: File, formatterEntity?: SqlFormatterEntity) => Promise<FileOpenResult>;
  isOpening: boolean;
  error: string | null;
  lastOpenedFile: FileOpenResult | null;
}

export const useFileOpen = (): UseFileOpenResult => {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOpenedFile, setLastOpenedFile] = useState<FileOpenResult | null>(null);
  
  const { decomposeSql } = useSqlDecomposer();

  const openFile = useCallback(async (file: File, formatterEntity?: SqlFormatterEntity): Promise<FileOpenResult> => {
    setIsOpening(true);
    setError(null);

    try {
      // Read file content
      const content = await readFileContent(file);
      
      // Extract file name without extension
      const fileName = file.name.replace(/\.sql$/i, '');
      
      // Decompose SQL into models with formatter entity
      const models = await decomposeSql(content, fileName, formatterEntity);
      
      const result: FileOpenResult = {
        fileName: file.name,
        content,
        models
      };
      
      setLastOpenedFile(result);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open file';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsOpening(false);
    }
  }, [decomposeSql]);

  return {
    openFile,
    isOpening,
    error,
    lastOpenedFile
  };
};

/**
 * Read file content as text
 */
function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}
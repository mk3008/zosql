/**
 * SQL Formatter管理機能のカスタムフック
 * UI Layer - React Hooks
 */

import { useState, useCallback } from 'react';
import { FormatterManager, FormatterConfig } from '@core/usecases/formatter-manager';

interface UseFormatterManagerResult {
  applyConfig: (configJson: string) => Promise<void>;
  getCurrentConfigJson: () => Promise<string>;
  isApplying: boolean;
  lastError: string | null;
}

export const useFormatterManager = (
  formatterManager: FormatterManager,
  onSuccess?: (message: string) => void,
  onError?: (error: string) => void
): UseFormatterManagerResult => {
  const [isApplying, setIsApplying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const applyConfig = useCallback(async (configJson: string): Promise<void> => {
    try {
      setIsApplying(true);
      setLastError(null);

      await formatterManager.applyConfig(configJson);
      onSuccess?.('Formatter config saved successfully!');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to apply config';
      setLastError(errorMessage);
      onError?.(errorMessage);
      
    } finally {
      setIsApplying(false);
    }
  }, [formatterManager, onSuccess, onError]);

  const getCurrentConfigJson = useCallback(async (): Promise<string> => {
    try {
      const config = await formatterManager.getCurrentConfig();
      return JSON.stringify(config, null, 2);
    } catch (error) {
      const defaultConfig = formatterManager.getDefaultConfig();
      return JSON.stringify(defaultConfig, null, 2);
    }
  }, [formatterManager]);

  return {
    applyConfig,
    getCurrentConfigJson,
    isApplying,
    lastError
  };
};
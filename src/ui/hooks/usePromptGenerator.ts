/**
 * Copy Prompt生成機能のカスタムフック
 * UI Layer - React Hooks
 */

import { useState, useCallback } from 'react';
import { PromptGenerator, PromptGeneratorConfig } from '@core/usecases/prompt-generator';

interface UsePromptGeneratorResult {
  generateAndCopyPrompt: (sql: string, config: PromptGeneratorConfig) => Promise<void>;
  isGenerating: boolean;
  lastError: string | null;
}

export const usePromptGenerator = (
  promptGenerator: PromptGenerator,
  onSuccess?: (message: string) => void,
  onError?: (error: string) => void
): UsePromptGeneratorResult => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const generateAndCopyPrompt = useCallback(async (
    sql: string, 
    config: PromptGeneratorConfig
  ): Promise<void> => {
    try {
      setIsGenerating(true);
      setLastError(null);

      const prompt = await promptGenerator.generatePrompt(sql, config);
      await navigator.clipboard.writeText(prompt);
      
      onSuccess?.('Prompt copied to clipboard!');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate prompt';
      setLastError(errorMessage);
      onError?.(errorMessage);
      
    } finally {
      setIsGenerating(false);
    }
  }, [promptGenerator, onSuccess, onError]);

  return {
    generateAndCopyPrompt,
    isGenerating,
    lastError
  };
};
/**
 * Test Values Manager Hook
 * UI Layer - Manages TestValuesModel instances for GUI binding
 */

import { useState, useCallback } from 'react';
import { TestValuesModel } from '@core/entities/test-values-model';

export interface UseTestValuesManagerResult {
  testValuesModel: TestValuesModel | null;
  displayString: string;
  createFromString: (withClauseString: string) => void;
  updateFromString: (withClauseString: string) => void;
  clear: () => void;
  hasModel: boolean;
}

export const useTestValuesManager = (): UseTestValuesManagerResult => {
  const [testValuesModel, setTestValuesModel] = useState<TestValuesModel | null>(null);

  const createFromString = useCallback((withClauseString: string) => {
    try {
      // Simply create TestValuesModel with string - parsing happens inside getWithClause()
      const model = new TestValuesModel(withClauseString);
      setTestValuesModel(model);
    } catch (error) {
      console.warn('Failed to create TestValuesModel from string:', error);
      setTestValuesModel(null);
    }
  }, []);

  const updateFromString = useCallback((withClauseString: string) => {
    createFromString(withClauseString);
  }, [createFromString]);

  const clear = useCallback(() => {
    setTestValuesModel(null);
  }, []);

  const displayString = testValuesModel?.displayString || '';
  const hasModel = testValuesModel !== null;

  return {
    testValuesModel,
    displayString,
    createFromString,
    updateFromString,
    clear,
    hasModel
  };
};
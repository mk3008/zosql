/**
 * useSqlFormatter Hook - Functional Programming Approach
 * Pure functional hook for SQL formatting operations
 */

import { useCallback, useState } from 'react';
import { formatSqlSafely } from '@core/services/workspace-service';

// Types for SQL formatting
export interface SqlFormatOptions {
  readonly indent: number;
  readonly uppercase: boolean;
  readonly keywordCase: 'upper' | 'lower' | 'capitalize';
  readonly commaStyle: 'leading' | 'trailing';
  readonly lineLength: number;
}

export interface FormatResult {
  readonly success: boolean;
  readonly formattedSql?: string;
  readonly error?: string;
  readonly executionTime: number;
}

// Pure functions for SQL formatting logic
const defaultFormatOptions: SqlFormatOptions = {
  indent: 2,
  uppercase: true,
  keywordCase: 'upper',
  commaStyle: 'trailing',
  lineLength: 120,
};

const validateSqlForFormatting = (sql: string): boolean =>
  sql.trim().length > 0;

const formatExecutionTime = (startTime: number): number =>
  Date.now() - startTime;

// SQL formatting service function (pure)
const formatSqlQuery = async (sql: string): Promise<FormatResult> => {
  const startTime = Date.now();
  
  if (!validateSqlForFormatting(sql)) {
    return {
      success: false,
      error: 'SQL query is empty or invalid',
      executionTime: formatExecutionTime(startTime),
    };
  }

  try {
    // Use functional service for formatting
    const { SqlFormatterEntity } = await import('@core/entities/sql-formatter');
    
    // Create formatter with default options
    const formatter = new SqlFormatterEntity();
    
    // Use service function
    const result = formatSqlSafely({ sql, formatter });
    
    if (result.success) {
      return {
        success: true,
        formattedSql: result.formattedSql,
        executionTime: formatExecutionTime(startTime),
      };
    } else {
      return {
        success: false,
        error: result.error,
        executionTime: formatExecutionTime(startTime),
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Formatting failed',
      executionTime: formatExecutionTime(startTime),
    };
  }
};

/**
 * Hook return type
 */
export interface UseSqlFormatterReturn {
  // State
  readonly isFormatting: boolean;
  readonly lastFormatResult: FormatResult | null;
  readonly formatOptions: SqlFormatOptions;
  
  // Actions
  readonly formatSql: (sql: string, _options?: Partial<SqlFormatOptions>) => Promise<FormatResult>;
  readonly setFormatOptions: (options: Partial<SqlFormatOptions>) => void;
  readonly resetOptions: () => void;
  readonly clearResult: () => void;
}

/**
 * Functional hook for SQL formatting operations
 */
export const useSqlFormatter = (
  initialOptions?: Partial<SqlFormatOptions>
): UseSqlFormatterReturn => {
  // Local state for formatting operations
  const [isFormatting, setIsFormatting] = useState(false);
  const [lastFormatResult, setLastFormatResult] = useState<FormatResult | null>(null);
  const [formatOptions, setFormatOptionsState] = useState<SqlFormatOptions>(() => ({
    ...defaultFormatOptions,
    ...initialOptions,
  }));

  // Format SQL with current options
  const formatSql = useCallback(async (
    sql: string
  ): Promise<FormatResult> => {
    
    
    setIsFormatting(true);
    
    try {
      const result = await formatSqlQuery(sql);
      setLastFormatResult(result);
      return result;
    } finally {
      setIsFormatting(false);
    }
  }, []);

  // Update format options
  const setFormatOptions = useCallback((options: Partial<SqlFormatOptions>) => {
    setFormatOptionsState(current => ({ ...current, ...options }));
  }, []);

  // Reset to default options
  const resetOptions = useCallback(() => {
    setFormatOptionsState({ ...defaultFormatOptions, ...initialOptions });
  }, [initialOptions]);

  // Clear last result
  const clearResult = useCallback(() => {
    setLastFormatResult(null);
  }, []);

  return {
    // State
    isFormatting,
    lastFormatResult,
    formatOptions,
    
    // Actions
    formatSql,
    setFormatOptions,
    resetOptions,
    clearResult,
  };
};

// Utility functions for SQL formatting
export const getFormattingPresets = () => ({
  compact: {
    indent: 0,
    uppercase: false,
    keywordCase: 'lower' as const,
    commaStyle: 'trailing' as const,
    lineLength: 200,
  },
  standard: {
    indent: 2,
    uppercase: true,
    keywordCase: 'upper' as const,
    commaStyle: 'trailing' as const,
    lineLength: 120,
  },
  verbose: {
    indent: 4,
    uppercase: true,
    keywordCase: 'upper' as const,
    commaStyle: 'leading' as const,
    lineLength: 80,
  },
});

export const applyFormattingPreset = (
  preset: keyof ReturnType<typeof getFormattingPresets>
): SqlFormatOptions => {
  const presets = getFormattingPresets();
  return { ...defaultFormatOptions, ...presets[preset] };
};
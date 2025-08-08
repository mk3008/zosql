/**
 * useSqlFormatter Hook - Functional Programming Approach
 * Pure functional hook for SQL formatting operations
 */

import { useCallback, useState } from 'react';

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
    // Dynamic import to avoid dependencies
    // FormatQueryCommand removed - functionality moved to functional services
    await import('@core/entities/sql-formatter');
    
    // Create formatter with options (currently unused in functional implementation)
    // const formatterOptions = {
    //   indentSize: options.indent,
    //   keywordCase: options.uppercase ? 'upper' as const : 'lower' as const,
    //   indentChar: " " as const,
    //   newline: "\n" as const,
    //   commaBreak: "after" as const,
    //   andBreak: "before" as const,
    // };
    // const formatter = new SqlFormatterEntity(JSON.stringify(formatterOptions)); // TODO: Use when implementing functional formatting
    
    // FormatQueryCommand removed - implementing functional approach
    console.warn('[SQL-FORMATTER] FormatQueryCommand removed - needs functional implementation');
    
    // TODO: Implement formatting using functional services
    return {
      success: false,
      formattedSql: sql, // Return original SQL as fallback
      executionTime: formatExecutionTime(startTime),
      error: 'SQL formatting functionality needs to be reimplemented without Command pattern'
    };
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
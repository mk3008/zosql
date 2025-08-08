import { useState, useCallback } from 'react';
import { ErrorInfo } from '../components/ErrorPanel';
import { pipe } from '../../lib/functional/index.js';
import * as Result from '../../lib/functional/result.js';
import * as Option from '../../lib/functional/option.js';

export const useErrorPanel = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);

  const addError = useCallback((message: string, details?: string, stack?: string) => {
    const newError: ErrorInfo = {
      id: `error-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      message,
      details,
      stack,
      type: 'error'
    };

    setErrors(prev => [...prev, newError]);
  }, []);

  const clearError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    errors,
    addError,
    clearError,
    clearAllErrors
  };
};

// ===== NEW FUNCTIONAL VERSIONS - BACKWARD COMPATIBLE =====

/**
 * Functional version: Generate unique error ID
 * Pure function for creating unique identifiers
 */
export const generateErrorIdFunc = (): string => {
  return `error-${Date.now()}-${Math.random()}`;
};

/**
 * Functional version: Create error info object
 * Pure function for creating ErrorInfo objects
 */
export const createErrorInfoFunc = (
  message: string,
  details?: string,
  stack?: string,
  type: ErrorInfo['type'] = 'error'
): ErrorInfo => ({
  id: generateErrorIdFunc(),
  timestamp: new Date(),
  message,
  details,
  stack,
  type
});

/**
 * Functional version: Validate error input
 * Returns Result with validated error or validation error
 */
export const validateErrorInputFunc = (
  message: string,
  details?: string,
  stack?: string
): Result.Result<{ message: string; details?: string; stack?: string }, string> => {
  if (!message || message.trim().length === 0) {
    return Result.err('Error message cannot be empty');
  }
  
  const trimmedMessage = message.trim();
  const trimmedDetails = details?.trim();
  const trimmedStack = stack?.trim();
  
  return Result.ok({
    message: trimmedMessage,
    details: trimmedDetails || undefined,
    stack: trimmedStack || undefined
  });
};

/**
 * Functional version: Filter errors by criteria
 * Pure function for filtering error arrays
 */
export const filterErrorsFunc = (
  errors: ErrorInfo[],
  criteria: {
    type?: ErrorInfo['type'];
    messageContains?: string;
    sinceTimestamp?: Date;
    beforeTimestamp?: Date;
  }
): ErrorInfo[] => {
  return pipe(
    errors,
    (errors: ErrorInfo[]) => criteria.type 
      ? errors.filter(error => error.type === criteria.type)
      : errors,
    (errors: ErrorInfo[]) => criteria.messageContains
      ? errors.filter(error => error.message.toLowerCase().includes(criteria.messageContains!.toLowerCase()))
      : errors,
    (errors: ErrorInfo[]) => criteria.sinceTimestamp
      ? errors.filter(error => error.timestamp >= criteria.sinceTimestamp!)
      : errors,
    (errors: ErrorInfo[]) => criteria.beforeTimestamp
      ? errors.filter(error => error.timestamp <= criteria.beforeTimestamp!)
      : errors
  );
};

/**
 * Functional version: Sort errors by timestamp
 * Pure function for sorting error arrays
 */
export const sortErrorsFunc = (
  errors: ErrorInfo[],
  order: 'asc' | 'desc' = 'desc'
): ErrorInfo[] => {
  return [...errors].sort((a, b) => {
    const aTime = a.timestamp.getTime();
    const bTime = b.timestamp.getTime();
    return order === 'desc' ? bTime - aTime : aTime - bTime;
  });
};

/**
 * Functional version: Group errors by type
 * Pure function for grouping errors
 */
export const groupErrorsByTypeFunc = (errors: ErrorInfo[]): Record<ErrorInfo['type'], ErrorInfo[]> => {
  return errors.reduce((groups, error) => {
    const type = error.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(error);
    return groups;
  }, {} as Record<ErrorInfo['type'], ErrorInfo[]>);
};

/**
 * Functional version: Find error by ID
 * Returns Option with found error
 */
export const findErrorByIdFunc = (errors: ErrorInfo[], id: string): Option.Option<ErrorInfo> => {
  const found = errors.find(error => error.id === id);
  return Option.fromNullable(found);
};

/**
 * Functional version: Remove error by ID
 * Pure function returning new array without specified error
 */
export const removeErrorByIdFunc = (errors: ErrorInfo[], id: string): ErrorInfo[] => {
  return errors.filter(error => error.id !== id);
};

/**
 * Functional version: Add error to array
 * Pure function returning new array with added error
 */
export const addErrorToArrayFunc = (errors: ErrorInfo[], newError: ErrorInfo): ErrorInfo[] => {
  return [...errors, newError];
};

/**
 * Functional version: Error panel state reducer
 * Pure function for state transitions
 */
export type ErrorPanelAction = 
  | { type: 'ADD_ERROR'; payload: { message: string; details?: string; stack?: string } }
  | { type: 'CLEAR_ERROR'; payload: { id: string } }
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'SET_ERRORS'; payload: { errors: ErrorInfo[] } };

export const errorPanelReducerFunc = (
  state: ErrorInfo[],
  action: ErrorPanelAction
): ErrorInfo[] => {
  switch (action.type) {
    case 'ADD_ERROR': {
      const { message, details, stack } = action.payload;
      const newError = createErrorInfoFunc(message, details, stack);
      return addErrorToArrayFunc(state, newError);
    }
    case 'CLEAR_ERROR':
      return removeErrorByIdFunc(state, action.payload.id);
    case 'CLEAR_ALL_ERRORS':
      return [];
    case 'SET_ERRORS':
      return action.payload.errors;
    default:
      return state;
  }
};

/**
 * Functional version: Create error panel actions
 * Action creator functions for error panel operations
 */
export const createErrorPanelActionsFunc = () => ({
  addError: (message: string, details?: string, stack?: string): ErrorPanelAction => ({
    type: 'ADD_ERROR',
    payload: { message, details, stack }
  }),
  
  clearError: (id: string): ErrorPanelAction => ({
    type: 'CLEAR_ERROR',
    payload: { id }
  }),
  
  clearAllErrors: (): ErrorPanelAction => ({
    type: 'CLEAR_ALL_ERRORS'
  }),
  
  setErrors: (errors: ErrorInfo[]): ErrorPanelAction => ({
    type: 'SET_ERRORS',
    payload: { errors }
  })
});

/**
 * Functional version: Get error statistics
 * Pure function for calculating error statistics
 */
export const getErrorStatisticsFunc = (errors: ErrorInfo[]): {
  total: number;
  byType: Record<ErrorInfo['type'], number>;
  recentCount: number; // Last 5 minutes
  oldestTimestamp?: Date;
  newestTimestamp?: Date;
} => {
  if (errors.length === 0) {
    return {
      total: 0,
      byType: { error: 0, warning: 0 },
      recentCount: 0
    };
  }
  
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  
  const byType = groupErrorsByTypeFunc(errors);
  const byTypeCount: Record<ErrorInfo['type'], number> = { error: 0, warning: 0 };
  
  Object.keys(byType).forEach(type => {
    const errorType = type as ErrorInfo['type'];
    byTypeCount[errorType] = byType[errorType].length;
  });
  
  const timestamps = errors.map(error => error.timestamp);
  const oldestTimestamp = new Date(Math.min(...timestamps.map(t => t.getTime())));
  const newestTimestamp = new Date(Math.max(...timestamps.map(t => t.getTime())));
  
  const recentCount = errors.filter(error => error.timestamp >= fiveMinutesAgo).length;
  
  return {
    total: errors.length,
    byType: byTypeCount,
    recentCount,
    oldestTimestamp,
    newestTimestamp
  };
};

/**
 * Functional version: Use error panel with functional state management
 * Enhanced hook using functional patterns
 */
export const useErrorPanelFunc = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  
  const addErrorSafe = useCallback((message: string, details?: string, stack?: string): Result.Result<void, string> => {
    const validation = validateErrorInputFunc(message, details, stack);
    
    if (Result.isErr(validation)) {
      return validation;
    }
    
    const { message: validMessage, details: validDetails, stack: validStack } = validation.value;
    const newError = createErrorInfoFunc(validMessage, validDetails, validStack);
    
    setErrors(prevErrors => addErrorToArrayFunc(prevErrors, newError));
    return Result.ok(undefined);
  }, []);
  
  const findError = useCallback((id: string): Option.Option<ErrorInfo> => {
    return findErrorByIdFunc(errors, id);
  }, [errors]);
  
  const getFilteredErrors = useCallback((criteria: Parameters<typeof filterErrorsFunc>[1]) => {
    return filterErrorsFunc(errors, criteria);
  }, [errors]);
  
  const getSortedErrors = useCallback((order: 'asc' | 'desc' = 'desc') => {
    return sortErrorsFunc(errors, order);
  }, [errors]);
  
  const getGroupedErrors = useCallback(() => {
    return groupErrorsByTypeFunc(errors);
  }, [errors]);
  
  const getStatistics = useCallback(() => {
    return getErrorStatisticsFunc(errors);
  }, [errors]);
  
  // Original methods for backward compatibility
  const addError = useCallback((message: string, details?: string, stack?: string) => {
    const newError = createErrorInfoFunc(message, details, stack);
    setErrors(prevErrors => addErrorToArrayFunc(prevErrors, newError));
  }, []);

  const clearError = useCallback((id: string) => {
    setErrors(prevErrors => removeErrorByIdFunc(prevErrors, id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    // Original interface
    errors,
    addError,
    clearError,
    clearAllErrors,
    
    // Functional enhancements
    addErrorSafe,
    findError,
    getFilteredErrors,
    getSortedErrors,
    getGroupedErrors,
    getStatistics
  };
};
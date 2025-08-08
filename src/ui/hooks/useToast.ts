/**
 * トースト通知管理のカスタムフック
 * UI Layer - React Hooks
 */

import { useState, useCallback } from 'react';
import { pipe } from '../../lib/functional/index.js';
import * as Result from '../../lib/functional/result.js';
import * as Option from '../../lib/functional/option.js';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UseToastResult {
  toast: ToastMessage | null;
  showToast: (message: string, type?: ToastMessage['type']) => void;
  hideToast: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

export const useToast = (): UseToastResult => {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((
    message: string, 
    type: ToastMessage['type'] = 'info'
  ) => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showInfo
  };
};

// ===== NEW FUNCTIONAL VERSIONS - BACKWARD COMPATIBLE =====

/**
 * Functional version: Create toast message
 * Pure function for creating ToastMessage objects
 */
export const createToastMessageFunc = (
  message: string, 
  type: ToastMessage['type'] = 'info'
): ToastMessage => ({
  message,
  type
});

/**
 * Functional version: Validate toast message
 * Returns Result with validated message or error
 */
export const validateToastMessageFunc = (
  message: string, 
  type: ToastMessage['type'] = 'info'
): Result.Result<ToastMessage, string> => {
  if (!message || message.trim().length === 0) {
    return Result.err('Toast message cannot be empty');
  }
  
  if (!['success', 'error', 'info'].includes(type)) {
    return Result.err(`Invalid toast type: ${type}`);
  }
  
  return Result.ok(createToastMessageFunc(message.trim(), type));
};

/**
 * Functional version: Format toast message for display
 * Pure function for message formatting
 */
export const formatToastMessageFunc = (toast: ToastMessage): string => {
  const typePrefix = pipe(
    toast.type,
    (type: string) => {
      switch (type) {
        case 'success': return '✅ ';
        case 'error': return '❌ ';
        case 'info': return 'ℹ️ ';
        default: return '';
      }
    }
  );
  
  return `${typePrefix}${toast.message}`;
};

/**
 * Functional version: Get toast display properties
 * Pure function for computing display properties
 */
export const getToastDisplayPropsFunc = (toast: ToastMessage): {
  className: string;
  duration: number;
  isAutoHide: boolean;
} => {
  const baseClassName = 'toast';
  const typeClassName = `toast--${toast.type}`;
  
  const duration = pipe(
    toast.type,
    (type: string) => {
      switch (type) {
        case 'success': return 3000;
        case 'error': return 5000;
        case 'info': return 4000;
        default: return 4000;
      }
    }
  );
  
  return {
    className: `${baseClassName} ${typeClassName}`,
    duration,
    isAutoHide: toast.type !== 'error' // Errors require manual dismissal
  };
};

/**
 * Functional version: Toast state reducer
 * Pure function for state transitions
 */
export type ToastAction = 
  | { type: 'SHOW_TOAST'; payload: ToastMessage }
  | { type: 'HIDE_TOAST' }
  | { type: 'CLEAR_ALL' };

export const toastReducerFunc = (
  state: ToastMessage | null, 
  action: ToastAction
): ToastMessage | null => {
  switch (action.type) {
    case 'SHOW_TOAST':
      return action.payload;
    case 'HIDE_TOAST':
      return null;
    case 'CLEAR_ALL':
      return null;
    default:
      return state;
  }
};

/**
 * Functional version: Create toast actions
 * Action creator functions for toast operations
 */
export const createToastActionsFunc = () => ({
  showToast: (message: string, type: ToastMessage['type'] = 'info'): ToastAction => ({
    type: 'SHOW_TOAST',
    payload: createToastMessageFunc(message, type)
  }),
  
  hideToast: (): ToastAction => ({
    type: 'HIDE_TOAST'
  }),
  
  clearAll: (): ToastAction => ({
    type: 'CLEAR_ALL'
  })
});

/**
 * Functional version: Use toast with functional state management
 * Alternative hook using functional patterns
 */
export const useToastFunc = (): UseToastResult & {
  toastOption: Option.Option<ToastMessage>;
  validateAndShow: (message: string, type?: ToastMessage['type']) => Result.Result<void, string>;
} => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  
  // Convert state to Option type
  const toastOption = Option.fromNullable(toast);
  
  const validateAndShow = useCallback((
    message: string, 
    type: ToastMessage['type'] = 'info'
  ): Result.Result<void, string> => {
    const validation = validateToastMessageFunc(message, type);
    
    if (Result.isOk(validation)) {
      setToast(validation.value);
      return Result.ok(undefined);
    } else {
      return Result.err(validation.error);
    }
  }, []);
  
  const showToast = useCallback((
    message: string, 
    type: ToastMessage['type'] = 'info'
  ) => {
    const toastMessage = createToastMessageFunc(message, type);
    setToast(toastMessage);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  return {
    toast,
    toastOption,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showInfo,
    validateAndShow
  };
};

/**
 * Functional version: Compose toast messages
 * Higher-order function for combining multiple toast messages
 */
export const composeToastMessagesFunc = (
  messages: Array<{ message: string; type: ToastMessage['type'] }>
): Result.Result<ToastMessage, string[]> => {
  const validations = messages.map(({ message, type }) => 
    validateToastMessageFunc(message, type)
  );
  
  const errors = validations
    .filter(Result.isErr)
    .map(result => result.error);
    
  if (errors.length > 0) {
    return Result.err(errors);
  }
  
  const validMessages = validations
    .filter(Result.isOk)
    .map(result => result.value);
  
  // Combine messages with highest priority type
  const priorityOrder: ToastMessage['type'][] = ['error', 'info', 'success'];
  const highestPriorityType = priorityOrder.find(type => 
    validMessages.some(msg => msg.type === type)
  ) || 'info';
  
  const combinedMessage = validMessages
    .map(msg => msg.message)
    .join(' • ');
  
  return Result.ok(createToastMessageFunc(combinedMessage, highestPriorityType));
};
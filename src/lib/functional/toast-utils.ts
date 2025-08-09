/**
 * Toast utility functions and configuration
 * Extracted for React Fast Refresh compatibility
 */

import * as Option from './option.js';
import * as Result from './result.js';
import { PropsValidation, ClassName } from './ui-patterns.js';

/**
 * Toast type with functional validation
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Validated toast props using functional patterns
 */
interface ToastPropsValidated {
  message: string;
  type: ToastType;
  duration: number;
  onClose: () => void;
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Functional toast configuration
 */
export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
  position?: ToastPropsValidated['position'];
  autoClose?: boolean;
  closable?: boolean;
}

/**
 * Validate toast props functionally
 */
export const validateToastProps = (props: Partial<ToastConfig>): Result.Result<ToastPropsValidated, string[]> => {
  const errors: string[] = [];

  // Validate message
  const messageResult = PropsValidation.validateRequiredString(props.message, 'message');
  if (Result.isErr(messageResult)) {
    errors.push(messageResult.error);
  }

  // Validate type
  const typeResult = props.type ? 
    PropsValidation.validateEnum(props.type, 'type', ['success', 'error', 'info', 'warning'] as const) :
    Result.ok('info' as ToastType);
  if (Result.isErr(typeResult)) {
    errors.push(typeResult.error);
  }

  // Validate duration
  const durationResult = props.duration ? 
    PropsValidation.validateNumberInRange(props.duration, 'duration', 100, 30000) :
    Result.ok(3000);
  if (Result.isErr(durationResult)) {
    errors.push(durationResult.error);
  }

  if (errors.length > 0) {
    return Result.err(errors);
  }

  // Since we've already checked for errors above, we can safely get the values
  const message = Result.isOk(messageResult) ? messageResult.value : '';
  const type = Result.isOk(typeResult) ? typeResult.value : 'info' as ToastType;
  const duration = Result.isOk(durationResult) ? durationResult.value : 3000;

  return Result.ok({
    message,
    type,
    duration,
    onClose: (() => {}), // onClose will be provided externally
    isVisible: props.autoClose !== false,
    position: props.position || 'bottom-right'
  });
};

/**
 * Generate toast styling with functional patterns
 */
export const toastStylesFunc = (type: ToastType, position: ToastPropsValidated['position'] = 'bottom-right'): string => {
  const baseStyles = 'fixed z-[9999] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white transition-all duration-300';
  
  const typeStyles = ClassName.variants(
    '',
    {
      success: 'bg-green-600 hover:bg-green-700',
      error: 'bg-red-600 hover:bg-red-700',
      info: 'bg-blue-600 hover:bg-blue-700',
      warning: 'bg-yellow-600 hover:bg-yellow-700'
    }
  )(type);

  const positionStyles = ClassName.variants(
    '',
    {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4'
    }
  )(position);

  return ClassName.combine(baseStyles, typeStyles, positionStyles);
};

/**
 * Get toast icon with functional patterns
 */
export const getToastIconFunc = (type: ToastType): string => {
  const iconMap: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };
  return iconMap[type];
};

/**
 * Toast utilities with functional patterns
 */
export const ToastUtils = {
  /**
   * Create success toast configuration
   */
  success: (message: string, options?: Partial<ToastConfig>): ToastConfig => ({
    message,
    type: 'success',
    duration: 3000,
    ...options
  }),

  /**
   * Create error toast configuration
   */
  error: (message: string, options?: Partial<ToastConfig>): ToastConfig => ({
    message,
    type: 'error',
    duration: 5000,
    ...options
  }),

  /**
   * Create info toast configuration
   */
  info: (message: string, options?: Partial<ToastConfig>): ToastConfig => ({
    message,
    type: 'info',
    duration: 3000,
    ...options
  }),

  /**
   * Create warning toast configuration
   */
  warning: (message: string, options?: Partial<ToastConfig>): ToastConfig => ({
    message,
    type: 'warning',
    duration: 4000,
    ...options
  }),

  /**
   * Create toast from Result
   */
  fromResult: function<T>(result: Result.Result<T, string>, successMessage?: string): Option.Option<ToastConfig> {
    if (Result.isOk(result)) {
      return successMessage ? Option.some(ToastUtils.success(successMessage)) : Option.none;
    }
    return Option.some(ToastUtils.error(result.error));
  },

  /**
   * Batch multiple toasts
   */
  batch: (toasts: ToastConfig[]): ToastConfig[] => 
    toasts.map((toast, index) => ({
      ...toast,
      duration: (toast.duration || 3000) + (index * 500) // Stagger timing
    }))
};
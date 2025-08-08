/**
 * Functional UI Patterns and Utilities
 * Utilities for functional React component development
 */

import React from 'react';
import * as Option from './option.js';
import * as Result from './result.js';

/**
 * UI State types
 */
export type ViewState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

/**
 * UI Event result type
 */
export type UIEventResult<T> = Result.Result<T, string>;

/**
 * Create initial view state
 */
export const createViewState = <T>(): ViewState<T> => ({ status: 'idle' });

/**
 * View state helpers
 */
export const ViewStateHelpers = {
  isIdle: <T>(state: ViewState<T>): state is { status: 'idle' } =>
    state.status === 'idle',
    
  isLoading: <T>(state: ViewState<T>): state is { status: 'loading' } =>
    state.status === 'loading',
    
  isSuccess: <T>(state: ViewState<T>): state is { status: 'success'; data: T } =>
    state.status === 'success',
    
  isError: <T>(state: ViewState<T>): state is { status: 'error'; error: string } =>
    state.status === 'error',
    
  getDataOption: <T>(state: ViewState<T>): Option.Option<T> =>
    ViewStateHelpers.isSuccess(state) ? Option.some(state.data) : Option.none,
    
  getErrorOption: <T>(state: ViewState<T>): Option.Option<string> =>
    ViewStateHelpers.isError(state) ? Option.some(state.error) : Option.none,
    
  toLoading: <T>(): ViewState<T> => ({ status: 'loading' }),
  toSuccess: <T>(data: T): ViewState<T> => ({ status: 'success', data }),
  toError: <T>(error: string): ViewState<T> => ({ status: 'error', error }),
  
  fold: <T, R>(
    state: ViewState<T>,
    handlers: {
      idle: () => R;
      loading: () => R;
      success: (data: T) => R;
      error: (error: string) => R;
    }
  ): R => {
    switch (state.status) {
      case 'idle':
        return handlers.idle();
      case 'loading':
        return handlers.loading();
      case 'success':
        return handlers.success(state.data);
      case 'error':
        return handlers.error(state.error);
    }
  }
};

/**
 * Component props validation utilities
 */
export const PropsValidation = {
  /**
   * Validate required string prop
   */
  validateRequiredString: (value: unknown, propName: string): Result.Result<string, string> => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return Result.err(`${propName} must be a non-empty string`);
    }
    return Result.ok(value.trim());
  },

  /**
   * Validate optional string prop
   */
  validateOptionalString: (value: unknown, propName: string): Result.Result<Option.Option<string>, string> => {
    if (value === undefined || value === null) {
      return Result.ok(Option.none);
    }
    if (typeof value !== 'string') {
      return Result.err(`${propName} must be a string when provided`);
    }
    return Result.ok(value.trim().length > 0 ? Option.some(value.trim()) : Option.none);
  },

  /**
   * Validate number in range
   */
  validateNumberInRange: (
    value: unknown, 
    propName: string, 
    min: number = Number.MIN_SAFE_INTEGER, 
    max: number = Number.MAX_SAFE_INTEGER
  ): Result.Result<number, string> => {
    if (typeof value !== 'number' || isNaN(value)) {
      return Result.err(`${propName} must be a valid number`);
    }
    if (value < min || value > max) {
      return Result.err(`${propName} must be between ${min} and ${max}`);
    }
    return Result.ok(value);
  },

  /**
   * Validate enum value
   */
  validateEnum: <T extends string>(
    value: unknown, 
    propName: string, 
    validValues: readonly T[]
  ): Result.Result<T, string> => {
    if (typeof value !== 'string') {
      return Result.err(`${propName} must be a string`);
    }
    if (!validValues.includes(value as T)) {
      return Result.err(`${propName} must be one of: ${validValues.join(', ')}`);
    }
    return Result.ok(value as T);
  }
};

/**
 * CSS class name utilities
 */
export const ClassName = {
  /**
   * Conditionally apply class names
   */
  when: (condition: boolean, className: string): string => 
    condition ? className : '',

  /**
   * Apply class name based on Option value
   */
  whenSome: <T>(option: Option.Option<T>, className: string): string =>
    Option.isSome(option) ? className : '',

  /**
   * Apply class name based on Option value with mapper
   */
  mapOption: <T>(option: Option.Option<T>, mapper: (value: T) => string): string =>
    Option.fold(() => '', mapper)(option),

  /**
   * Combine multiple conditional class names
   */
  combine: (...classNames: string[]): string =>
    classNames.filter(Boolean).join(' '),

  /**
   * Create variants object for conditional styling
   */
  variants: <T extends string>(
    baseClass: string,
    variants: Record<T, string>
  ) => (variant: T): string =>
    `${baseClass} ${variants[variant] || ''}`
};

/**
 * Event handler utilities
 */
export const EventHandlers = {
  /**
   * Create safe event handler that catches errors
   */
  safe: <T extends unknown[]>(
    handler: (...args: T) => void | Promise<void>,
    onError?: (error: Error) => void
  ) => {
    return async (...args: T): Promise<void> => {
      try {
        await handler(...args);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        if (onError) {
          onError(err);
        } else {
          console.error('Event handler error:', err);
        }
      }
    };
  },

  /**
   * Create debounced event handler
   */
  debounced: <T extends unknown[]>(
    handler: (...args: T) => void | Promise<void>,
    delay: number = 300
  ) => {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: T): void => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => handler(...args), delay);
    };
  },

  /**
   * Create throttled event handler
   */
  throttled: <T extends unknown[]>(
    handler: (...args: T) => void | Promise<void>,
    delay: number = 100
  ) => {
    let lastCall = 0;
    
    return (...args: T): void => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        handler(...args);
      }
    };
  },

  /**
   * Prevent default and stop propagation
   */
  preventDefault: <E extends { preventDefault: () => void; stopPropagation: () => void }>(
    handler?: (event: E) => void | Promise<void>
  ) => {
    return async (event: E): Promise<void> => {
      event.preventDefault();
      event.stopPropagation();
      if (handler) {
        await handler(event);
      }
    };
  }
};

/**
 * Component render utilities
 */
export const Render = {
  /**
   * Conditionally render content
   */
  when: <T>(condition: boolean, content: T): T | null =>
    condition ? content : null,

  /**
   * Render content based on Option value
   */
  option: <T, R>(option: Option.Option<T>, renderer: (value: T) => R): R | null =>
    Option.fold(() => null, renderer)(option),

  /**
   * Render content based on Result value
   */
  result: <T, E, R>(
    result: Result.Result<T, E>,
    handlers: {
      ok: (value: T) => R;
      err: (error: E) => R;
    }
  ): R =>
    Result.fold(handlers.ok, handlers.err)(result),

  /**
   * Render list with optional empty state
   */
  list: <T, R>(
    items: T[],
    renderer: (item: T, index: number) => R,
    emptyState?: () => R
  ): R[] | R | null => {
    if (items.length === 0) {
      return emptyState ? emptyState() : null;
    }
    return items.map(renderer);
  },

  /**
   * Render with fallback for null/undefined
   */
  fallback: <T, R>(value: T | null | undefined, renderer: (value: T) => R, fallback: R): R =>
    value != null ? renderer(value) : fallback
};

/**
 * Animation and transition utilities
 */
export const Animation = {
  /**
   * CSS transition class names
   */
  transition: (
    property: string = 'all',
    duration: string = '200ms',
    easing: string = 'ease-in-out'
  ): string =>
    `transition-${property} duration-${duration} ${easing}`,

  /**
   * Enter/exit animation states
   */
  enterExit: (isVisible: boolean, enterClass: string, exitClass: string): string =>
    isVisible ? enterClass : exitClass,

  /**
   * Fade in/out utility
   */
  fade: (isVisible: boolean): string =>
    Animation.enterExit(
      isVisible,
      'opacity-100 transition-opacity duration-200',
      'opacity-0 transition-opacity duration-200'
    ),

  /**
   * Scale in/out utility
   */
  scale: (isVisible: boolean): string =>
    Animation.enterExit(
      isVisible,
      'scale-100 transition-transform duration-200',
      'scale-95 transition-transform duration-200'
    ),

  /**
   * Slide up/down utility
   */
  slide: (isVisible: boolean): string =>
    Animation.enterExit(
      isVisible,
      'translate-y-0 transition-transform duration-200',
      'translate-y-2 transition-transform duration-200'
    )
};

/**
 * Accessibility utilities
 */
export const A11y = {
  /**
   * ARIA attributes for expanded/collapsed state
   */
  expandable: (isExpanded: boolean) => ({
    'aria-expanded': isExpanded,
    'role': 'button',
    'tabIndex': 0
  }),

  /**
   * ARIA attributes for loading state
   */
  loading: (isLoading: boolean, label: string = 'Loading') => ({
    'aria-busy': isLoading,
    'aria-label': isLoading ? label : undefined
  }),

  /**
   * ARIA attributes for error state
   */
  error: (hasError: boolean, errorMessage?: string) => ({
    'aria-invalid': hasError,
    'aria-describedby': hasError && errorMessage ? 'error-message' : undefined
  }),

  /**
   * Screen reader only text utility
   */
  srOnly: (text: string): React.ReactElement =>
    React.createElement('span', { className: 'sr-only' }, text),

  /**
   * Focus trap utility class
   */
  focusTrap: 'focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500'
};
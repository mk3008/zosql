/**
 * Function Composition Utilities
 * Simple, practical functional programming utilities
 */

// ============================================================================
// Basic Function Composition
// ============================================================================

/**
 * Pipe function - left-to-right composition
 * @example pipe(add1, multiply2)(5) // (5 + 1) * 2 = 12
 */
export const pipe = <T>(...fns: Array<(arg: T) => T>) => 
  (value: T): T => fns.reduce((acc, fn) => fn(acc), value);

/**
 * Compose function - right-to-left composition
 * @example compose(multiply2, add1)(5) // (5 + 1) * 2 = 12
 */
export const compose = <T>(...fns: Array<(arg: T) => T>) => 
  (value: T): T => fns.reduceRight((acc, fn) => fn(acc), value);

// ============================================================================
// Array Processing
// ============================================================================

/**
 * Map with index utility
 */
export const mapWithIndex = <T, U>(fn: (value: T, index: number) => U) =>
  (array: T[]): U[] => array.map(fn);

/**
 * Filter and map in one operation
 */
export const filterMap = <T, U>(
  filterFn: (value: T) => boolean,
  mapFn: (value: T) => U
) => (array: T[]): U[] => array.filter(filterFn).map(mapFn);

/**
 * Partition array based on predicate
 */
export const partition = <T>(predicate: (value: T) => boolean) =>
  (array: T[]): [T[], T[]] => 
    array.reduce<[T[], T[]]>(
      ([passed, failed], item) => 
        predicate(item) 
          ? [passed.concat(item), failed] 
          : [passed, failed.concat(item)],
      [[], []]
    );

// ============================================================================
// Object Processing
// ============================================================================

/**
 * Map over object values
 */
export const mapValues = <T, U>(fn: (value: T) => U) =>
  (obj: Record<string, T>): Record<string, U> =>
    Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, fn(value)])
    );

/**
 * Pick specified keys from object
 */
export const pick = <T extends Record<string, unknown>, K extends keyof T>(keys: K[]) =>
  (obj: T): Pick<T, K> =>
    keys.reduce((acc, key) => {
      if (key in obj) {
        acc[key] = obj[key];
      }
      return acc;
    }, {} as Pick<T, K>);

/**
 * Omit specified keys from object
 */
export const omit = <T extends Record<string, unknown>, K extends keyof T>(keys: K[]) =>
  (obj: T): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  };

// ============================================================================
// Conditional Processing
// ============================================================================

/**
 * Apply function conditionally
 */
export const when = <T>(predicate: (value: T) => boolean) =>
  (fn: (value: T) => T) =>
    (value: T): T =>
      predicate(value) ? fn(value) : value;

/**
 * Unless - opposite of when
 */
export const unless = <T>(predicate: (value: T) => boolean) =>
  (fn: (value: T) => T) =>
    (value: T): T =>
      predicate(value) ? value : fn(value);

// ============================================================================
// Async Utilities
// ============================================================================

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Timeout wrapper
 */
export const withTimeout = <T>(ms: number) =>
  (promise: Promise<T>): Promise<T> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    });
    
    return Promise.race([promise, timeoutPromise]);
  };

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Chain validations
 */
export const validateAll = <T>(...validators: Array<(value: T) => string[]>) =>
  (value: T): string[] =>
    validators.flatMap(validator => validator(value));

/**
 * Validate with early return
 */
export const validateFirst = <T>(...validators: Array<(value: T) => string[]>) =>
  (value: T): string[] => {
    for (const validator of validators) {
      const errors = validator(value);
      if (errors.length > 0) {
        return errors;
      }
    }
    return [];
  };

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is not null or undefined
 */
export const isNotNullish = <T>(value: T | null | undefined): value is T =>
  value != null;

/**
 * Check if value is string
 */
export const isString = (value: unknown): value is string =>
  typeof value === 'string';

/**
 * Check if value is number
 */
export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !isNaN(value);

/**
 * Check if value is array
 */
export const isArray = <T>(value: unknown): value is T[] =>
  Array.isArray(value);

// ============================================================================
// Memoization
// ============================================================================

/**
 * Simple memoization
 */
export const memoize = <T, U>(fn: (arg: T) => U): (arg: T) => U => {
  const cache = new Map<T, U>();
  
  return (arg: T): U => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }
    
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
};

// ============================================================================
// Currying
// ============================================================================

/**
 * Curry a binary function
 */
export const curry2 = <T, U, V>(fn: (a: T, b: U) => V) => 
  (a: T) => (b: U) => fn(a, b);

/**
 * Curry a ternary function
 */
export const curry3 = <T, U, V, W>(fn: (a: T, b: U, c: V) => W) =>
  (a: T) => (b: U) => (c: V) => fn(a, b, c);

// ============================================================================
// Common Patterns
// ============================================================================

/**
 * Identity function
 */
export const identity = <T>(x: T): T => x;

/**
 * Constant function
 */
export const constant = <T>(value: T) => (): T => value;

/**
 * Negate predicate
 */
export const not = <T>(predicate: (value: T) => boolean) =>
  (value: T): boolean => !predicate(value);

/**
 * Debounce function
 */
export const debounce = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
): (...args: T) => void => {
  let timeoutId: NodeJS.Timeout | undefined;
  
  return (...args: T): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
): (...args: T) => void => {
  let lastCall = 0;
  
  return (...args: T): void => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};
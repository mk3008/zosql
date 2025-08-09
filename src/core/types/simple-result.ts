/**
 * Simple Result Type for Functional Error Handling
 * Lightweight implementation without complex type operations
 */

// ============================================================================
// Result Type Definition
// ============================================================================

export type Result<T, E = Error> = {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: E;
};

// ============================================================================
// Result Constructors
// ============================================================================

export const Ok = <T>(data: T): Result<T, never> => ({
  success: true,
  data,
});

export const Err = <E>(error: E): Result<never, E> => ({
  success: false,
  error,
});

// ============================================================================
// Result Type Guards
// ============================================================================

export const isOk = <T, E>(result: Result<T, E>): result is Result<T, never> & { data: T } =>
  result.success === true && result.data !== undefined;

export const isErr = <T, E>(result: Result<T, E>): result is Result<never, E> & { error: E } =>
  result.success === false && result.error !== undefined;

// ============================================================================
// Result Utilities
// ============================================================================

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isOk(result)) {
    return result.data;
  }
  throw new Error(`Called unwrap on error result: ${result.error}`);
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  isOk(result) ? result.data : defaultValue;

export const unwrapOrElse = <T, E>(result: Result<T, E>, fn: (error: E) => T): T =>
  isOk(result) ? result.data : fn(result.error!);

// ============================================================================
// Result Transformations
// ============================================================================

export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> =>
  isOk(result) ? Ok(fn(result.data)) : result as Result<never, E>;

export const mapError = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> =>
  isErr(result) ? Err(fn(result.error)) : result as Result<T, never>;

export const chainResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> =>
  isOk(result) ? fn(result.data) : result as Result<never, E>;

// ============================================================================
// Result Combinations
// ============================================================================

export const combineResults = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  const values: T[] = [];
  
  for (const result of results) {
    if (isOk(result)) {
      values.push(result.data);
    } else {
      return result as Result<never, E>;
    }
  }
  
  return Ok(values);
};

export const collectErrors = <T, E>(results: Result<T, E>[]): E[] =>
  results.filter(isErr).map(result => result.error);

// ============================================================================
// Async Result Utilities
// ============================================================================

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export const asyncOk = async <T>(data: T): AsyncResult<T, never> =>
  Promise.resolve(Ok(data));

export const asyncErr = async <E>(error: E): AsyncResult<never, E> =>
  Promise.resolve(Err(error));

export const wrapAsync = <T>(promise: Promise<T>): AsyncResult<T, Error> =>
  promise
    .then(data => Ok(data))
    .catch(error => Err(error instanceof Error ? error : new Error(String(error))));

export const chainAsync = async <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => AsyncResult<U, E>
): AsyncResult<U, E> =>
  isOk(result) ? await fn(result.data) : result as Result<never, E>;

// ============================================================================
// Validation with Results
// ============================================================================

export type Validator<T, E = string> = (value: T) => Result<T, E>;

export const validate = <T, E>(...validators: Validator<T, E>[]) =>
  (value: T): Result<T, E[]> => {
    const errors: E[] = [];
    
    for (const validator of validators) {
      const result = validator(value);
      if (isErr(result)) {
        errors.push(result.error);
      }
    }
    
    return errors.length > 0 ? Err(errors) : Ok(value);
  };

export const validateFirst = <T, E>(...validators: Validator<T, E>[]) =>
  (value: T): Result<T, E> => {
    for (const validator of validators) {
      const result = validator(value);
      if (isErr(result)) {
        return result;
      }
    }
    return Ok(value);
  };

// ============================================================================
// Common Result Patterns
// ============================================================================

export const fromNullable = <T>(value: T | null | undefined, error: string = 'Value is null or undefined'): Result<T, string> =>
  value != null ? Ok(value) : Err(error);

export const fromPredicate = <T>(
  predicate: (value: T) => boolean,
  error: string
) => (value: T): Result<T, string> =>
  predicate(value) ? Ok(value) : Err(error);

export const fromThrowable = <T, Args extends unknown[]>(
  fn: (...args: Args) => T
) => (...args: Args): Result<T, Error> => {
  try {
    return Ok(fn(...args));
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const fromAsyncThrowable = <T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>
) => async (...args: Args): AsyncResult<T, Error> => {
  try {
    const result = await fn(...args);
    return Ok(result);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
};
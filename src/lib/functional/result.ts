/**
 * Result type for functional error handling
 */

export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly _tag: 'Ok';
  readonly value: T;
}

export interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
}

// Constructors
export const ok = <T>(value: T): Ok<T> => ({ _tag: 'Ok', value });
export const err = <E>(error: E): Err<E> => ({ _tag: 'Err', error });

// Type guards
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> =>
  result._tag === 'Ok';

export const isErr = <T, E>(result: Result<T, E>): result is Err<E> =>
  result._tag === 'Err';

// Core operations
export const map = <T, U, E>(
  fn: (value: T) => U
) => (result: Result<T, E>): Result<U, E> =>
  isOk(result) ? ok(fn(result.value)) : result;

export const flatMap = <T, U, E>(
  fn: (value: T) => Result<U, E>
) => (result: Result<T, E>): Result<U, E> =>
  isOk(result) ? fn(result.value) : result;

export const mapError = <T, E, F>(
  fn: (error: E) => F
) => (result: Result<T, E>): Result<T, F> =>
  isErr(result) ? err(fn(result.error)) : result;

export const getOrElse = <T>(defaultValue: T) => <E>(result: Result<T, E>): T =>
  isOk(result) ? result.value : defaultValue;

export const fold = <T, E, U>(
  onOk: (value: T) => U,
  onErr: (error: E) => U
) => (result: Result<T, E>): U =>
  isOk(result) ? onOk(result.value) : onErr(result.error);

// Safe operations
export const tryCatch = <T>(fn: () => T): Result<T, Error> => {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};

export const asyncTryCatch = async <T>(fn: () => Promise<T>): Promise<Result<T, Error>> => {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
};
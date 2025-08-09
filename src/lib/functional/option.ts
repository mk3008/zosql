/**
 * Option type for handling nullable values
 */

export type Option<T> = Some<T> | None;

export interface Some<T> {
  readonly _tag: 'Some';
  readonly value: T;
}

export interface None {
  readonly _tag: 'None';
}

// Constructors
export const some = <T>(value: T): Option<T> => ({ _tag: 'Some', value });
export const none: Option<never> = { _tag: 'None' };

// Type guards
export const isSome = <T>(option: Option<T>): option is Some<T> =>
  option._tag === 'Some';

export const isNone = <T>(option: Option<T>): option is None =>
  option._tag === 'None';

// Conversions
export const fromNullable = <T>(value: T | null | undefined): Option<T> =>
  value != null ? some(value) : none;

export const toNullable = <T>(option: Option<T>): T | null =>
  isSome(option) ? option.value : null;

// Core operations
export const map = <T, U>(
  fn: (value: T) => U
) => (option: Option<T>): Option<U> =>
  isSome(option) ? some(fn(option.value)) : none;

export const flatMap = <T, U>(
  fn: (value: T) => Option<U>
) => (option: Option<T>): Option<U> =>
  isSome(option) ? fn(option.value) : none;

export const filter = <T>(
  predicate: (value: T) => boolean
) => (option: Option<T>): Option<T> =>
  isSome(option) && predicate(option.value) ? option : none;

export const getOrElse = <T>(defaultValue: T) => (option: Option<T>): T =>
  isSome(option) ? option.value : defaultValue;

export const fold = <T, U>(
  onNone: () => U,
  onSome: (value: T) => U
) => (option: Option<T>): U =>
  isSome(option) ? onSome(option.value) : onNone();
/**
 * Functional array utilities
 */

export const map = <T, U>(fn: (item: T) => U) => (array: readonly T[]): U[] =>
  array.map(fn);

export const filter = <T>(predicate: (item: T) => boolean) => (array: readonly T[]): T[] =>
  array.filter(predicate);

export const find = <T>(predicate: (item: T) => boolean) => (array: readonly T[]): T | undefined =>
  array.find(predicate);

export const reduce = <T, U>(fn: (acc: U, item: T) => U, initial: U) => (array: readonly T[]): U =>
  array.reduce(fn, initial);

export const some = <T>(predicate: (item: T) => boolean) => (array: readonly T[]): boolean =>
  array.some(predicate);

export const every = <T>(predicate: (item: T) => boolean) => (array: readonly T[]): boolean =>
  array.every(predicate);

export const flatMap = <T, U>(fn: (item: T) => U[]) => (array: readonly T[]): U[] =>
  array.flatMap(fn);

export const unique = <T>(array: readonly T[]): T[] =>
  [...new Set(array)];

export const partition = <T>(predicate: (item: T) => boolean) => (array: readonly T[]): [T[], T[]] =>
  array.reduce<[T[], T[]]>(
    (acc, item) => {
      const [truthy, falsy] = acc;
      return predicate(item) ? [[...truthy, item], falsy] : [truthy, [...falsy, item]];
    },
    [[], []]
  );

export const head = <T>(array: readonly T[]): T | undefined => array[0];
export const tail = <T>(array: readonly T[]): T[] => array.slice(1);
export const isEmpty = <T>(array: readonly T[]): boolean => array.length === 0;
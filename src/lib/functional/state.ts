/**
 * Functional State Management Utilities
 * Pure functions and types for managing application state functionally
 */

import * as Result from './result.js';
import * as Option from './option.js';

/**
 * State management action interface
 * All actions must have a type field
 */
export interface Action {
  type: string;
  payload?: unknown;
}

/**
 * State reducer function type
 * Pure function that takes current state and action, returns new state
 */
export type StateReducer<TState, TAction extends Action> = (
  state: TState,
  action: TAction
) => TState;

/**
 * State selector function type
 * Pure function that extracts a specific value from state
 */
export type StateSelector<TState, TValue> = (state: TState) => TValue;

/**
 * State effect function type
 * Side effect function that can be triggered by state changes
 */
export type StateEffect<TState> = (state: TState) => void | Promise<void>;

/**
 * State middleware function type
 * Intercepts actions before they reach the reducer
 */
export type StateMiddleware<TState, TAction extends Action> = (
  state: TState,
  action: TAction,
  next: (action: TAction) => TState
) => TState;

/**
 * Async state type for handling loading states
 */
export type AsyncState<T, E = string> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

/**
 * Create initial async state
 */
export const createAsyncState = <T, E = string>(): AsyncState<T, E> => ({
  status: 'idle'
});

/**
 * Async state helper functions
 */
export const AsyncStateHelpers = {
  isIdle: <T, E>(state: AsyncState<T, E>): state is { status: 'idle' } =>
    state.status === 'idle',
    
  isLoading: <T, E>(state: AsyncState<T, E>): state is { status: 'loading' } =>
    state.status === 'loading',
    
  isSuccess: <T, E>(state: AsyncState<T, E>): state is { status: 'success'; data: T } =>
    state.status === 'success',
    
  isError: <T, E>(state: AsyncState<T, E>): state is { status: 'error'; error: E } =>
    state.status === 'error',
    
  getDataOption: <T, E>(state: AsyncState<T, E>): Option.Option<T> =>
    AsyncStateHelpers.isSuccess(state) ? Option.some(state.data) : Option.none,
    
  getErrorOption: <T, E>(state: AsyncState<T, E>): Option.Option<E> =>
    AsyncStateHelpers.isError(state) ? Option.some(state.error) : Option.none,
    
  toLoading: <T, E>(): AsyncState<T, E> => ({ status: 'loading' }),
  
  toSuccess: <T, E>(data: T): AsyncState<T, E> => ({ status: 'success', data }),
  
  toError: <T, E>(error: E): AsyncState<T, E> => ({ status: 'error', error }),
  
  map: <T, U, E>(
    state: AsyncState<T, E>, 
    mapper: (data: T) => U
  ): AsyncState<U, E> => {
    if (AsyncStateHelpers.isSuccess(state)) {
      return AsyncStateHelpers.toSuccess(mapper(state.data));
    }
    return state as AsyncState<U, E>;
  },
  
  flatMap: <T, U, E>(
    state: AsyncState<T, E>,
    mapper: (data: T) => AsyncState<U, E>
  ): AsyncState<U, E> => {
    if (AsyncStateHelpers.isSuccess(state)) {
      return mapper(state.data);
    }
    return state as AsyncState<U, E>;
  }
};

/**
 * Create a state reducer with error handling
 */
export const createSafeReducer = <TState, TAction extends Action>(
  reducer: StateReducer<TState, TAction>
): StateReducer<TState, TAction> => {
  return (state: TState, action: TAction): TState => {
    try {
      return reducer(state, action);
    } catch (error) {
      console.error('State reducer error:', error);
      return state; // Return unchanged state on error
    }
  };
};

/**
 * Combine multiple reducers into one
 */
export const combineReducers = <TState extends Record<string, unknown>, TAction extends Action>(
  reducers: {
    [K in keyof TState]: StateReducer<TState[K], TAction>
  }
): StateReducer<TState, TAction> => {
  return (state: TState, action: TAction): TState => {
    const nextState = {} as TState;
    let hasChanged = false;
    
    for (const key in reducers) {
      const reducer = reducers[key];
      const previousStateForKey = state[key];
      const nextStateForKey = reducer(previousStateForKey, action);
      
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    
    return hasChanged ? nextState : state;
  };
};

/**
 * Apply middleware to a reducer
 */
export const applyMiddleware = <TState, TAction extends Action>(
  reducer: StateReducer<TState, TAction>,
  ...middlewares: StateMiddleware<TState, TAction>[]
): StateReducer<TState, TAction> => {
  return (state: TState, action: TAction): TState => {
    let index = 0;
    
    const dispatch = (action: TAction): TState => {
      if (index >= middlewares.length) {
        return reducer(state, action);
      }
      
      const middleware = middlewares[index++];
      return middleware(state, action, dispatch);
    };
    
    return dispatch(action);
  };
};

/**
 * Create memoized selector
 */
export const createSelector = <TState, TValue>(
  selector: StateSelector<TState, TValue>
): StateSelector<TState, TValue> => {
  let lastState: TState | undefined;
  let lastResult: TValue;
  
  return (state: TState): TValue => {
    if (state !== lastState) {
      lastState = state;
      lastResult = selector(state);
    }
    return lastResult;
  };
};

/**
 * Create derived selector from multiple selectors
 */
export const createDerivedSelector = <TState, T1, T2, TResult>(
  selector1: StateSelector<TState, T1>,
  selector2: StateSelector<TState, T2>,
  combiner: (value1: T1, value2: T2) => TResult
): StateSelector<TState, TResult> => {
  return createSelector((state: TState) => 
    combiner(selector1(state), selector2(state))
  );
};

/**
 * State validation utilities
 */
export const StateValidation = {
  /**
   * Validate state structure
   */
  validateState: <T>(
    state: unknown,
    validator: (state: unknown) => Result.Result<T, string>
  ): Result.Result<T, string> => {
    return validator(state);
  },
  
  /**
   * Ensure state has required properties
   */
  requireProperties: <T extends Record<string, unknown>>(
    state: unknown,
    properties: (keyof T)[]
  ): Result.Result<T, string> => {
    if (!state || typeof state !== 'object') {
      return Result.err('State must be an object');
    }
    
    const stateObj = state as Record<string, unknown>;
    const missing = properties.filter(prop => !(String(prop) in stateObj));
    
    if (missing.length > 0) {
      return Result.err(`Missing required properties: ${missing.join(', ')}`);
    }
    
    return Result.ok(state as T);
  }
};

/**
 * State transformation utilities
 */
export const StateTransform = {
  /**
   * Transform state using pipe
   */
  transform: <TState>(
    state: TState,
    ...transformers: Array<(state: TState) => TState>
  ): TState => {
    return transformers.reduce((acc, transformer) => transformer(acc), state);
  },
  
  /**
   * Deep clone state (simple implementation)
   */
  clone: <T>(state: T): T => {
    if (state === null || typeof state !== 'object') {
      return state;
    }
    
    if (state instanceof Date) {
      return new Date(state.getTime()) as T;
    }
    
    if (Array.isArray(state)) {
      return state.map(item => StateTransform.clone(item)) as T;
    }
    
    const cloned = {} as T;
    for (const key in state) {
      if (Object.prototype.hasOwnProperty.call(state, key)) {
        cloned[key] = StateTransform.clone(state[key]);
      }
    }
    
    return cloned;
  },
  
  /**
   * Merge states (shallow)
   */
  merge: <T extends Record<string, unknown>>(
    state1: T,
    state2: Partial<T>
  ): T => ({
    ...state1,
    ...state2
  }),
  
  /**
   * Update nested property
   */
  updateNested: <T, K extends keyof T>(
    state: T,
    key: K,
    updater: (value: T[K]) => T[K]
  ): T => ({
    ...state,
    [key]: updater(state[key])
  })
};

/**
 * Undo/Redo state management
 */
export interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export const UndoRedo = {
  /**
   * Create initial undo/redo state
   */
  createInitial: <T>(initialState: T): UndoRedoState<T> => ({
    past: [],
    present: initialState,
    future: []
  }),
  
  /**
   * Add new state to history
   */
  addState: <T>(undoRedoState: UndoRedoState<T>, newState: T): UndoRedoState<T> => ({
    past: [...undoRedoState.past, undoRedoState.present],
    present: newState,
    future: []
  }),
  
  /**
   * Undo to previous state
   */
  undo: <T>(undoRedoState: UndoRedoState<T>): Option.Option<UndoRedoState<T>> => {
    if (undoRedoState.past.length === 0) {
      return Option.none;
    }
    
    const previous = undoRedoState.past[undoRedoState.past.length - 1];
    const newPast = undoRedoState.past.slice(0, undoRedoState.past.length - 1);
    
    return Option.some({
      past: newPast,
      present: previous,
      future: [undoRedoState.present, ...undoRedoState.future]
    });
  },
  
  /**
   * Redo to next state
   */
  redo: <T>(undoRedoState: UndoRedoState<T>): Option.Option<UndoRedoState<T>> => {
    if (undoRedoState.future.length === 0) {
      return Option.none;
    }
    
    const next = undoRedoState.future[0];
    const newFuture = undoRedoState.future.slice(1);
    
    return Option.some({
      past: [...undoRedoState.past, undoRedoState.present],
      present: next,
      future: newFuture
    });
  },
  
  /**
   * Check if undo is possible
   */
  canUndo: <T>(undoRedoState: UndoRedoState<T>): boolean =>
    undoRedoState.past.length > 0,
  
  /**
   * Check if redo is possible
   */
  canRedo: <T>(undoRedoState: UndoRedoState<T>): boolean =>
    undoRedoState.future.length > 0
};
/**
 * Enhanced Command Pattern Type Definitions
 * Core layer type definitions for migration
 */

/**
 * Command execution context
 */
export interface CommandContext {
  userId?: string;
  timestamp: Date;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Async command interface
 */
export interface IAsyncCommand<TResult = void, TParams = void> {
  execute(params: TParams, context?: CommandContext): Promise<TResult>;
  canExecute(params: TParams): boolean;
  validate?(params: TParams): ValidationResult;
}

/**
 * Sync command interface
 */
export interface ISyncCommand<TResult = void, TParams = void> {
  execute(params: TParams, context?: CommandContext): TResult;
  canExecute(params: TParams): boolean;
  validate?(params: TParams): ValidationResult;
}

/**
 * Command with undo capability
 */
export interface IUndoableCommand<TResult = void, TParams = void> 
  extends IAsyncCommand<TResult, TParams> {
  undo(context?: CommandContext): Promise<void>;
  canUndo(): boolean;
}

/**
 * Batch command interface
 */
export interface IBatchCommand<TResult = void> {
  commands: IAsyncCommand<unknown, unknown>[];
  execute(context?: CommandContext): Promise<TResult[]>;
  executeParallel(context?: CommandContext): Promise<TResult[]>;
  executeSequential(context?: CommandContext): Promise<TResult[]>;
}

/**
 * Command validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field?: string;
  message: string;
  code?: string;
}

/**
 * Command execution result
 */
export interface CommandExecutionResult<T = void> {
  success: boolean;
  data?: T;
  error?: Error;
  validationErrors?: ValidationError[];
  executionTime: number;
  context?: CommandContext;
}

/**
 * Command handler interface for CQRS pattern
 */
export interface ICommandHandler<TCommand, TResult = void> {
  handle(command: TCommand, context?: CommandContext): Promise<TResult>;
}

/**
 * Query handler interface for CQRS pattern
 */
export interface IQueryHandler<TQuery, TResult> {
  handle(query: TQuery, context?: CommandContext): Promise<TResult>;
}

/**
 * Command bus interface
 */
export interface ICommandBus {
  send<TResult = void>(command: IAsyncCommand<TResult, unknown>): Promise<TResult>;
  sendBatch<TResult = void>(commands: IAsyncCommand<TResult, unknown>[]): Promise<TResult[]>;
}

/**
 * Command factory interface
 */
export interface ICommandFactory<TParams = unknown> {
  create(params: TParams): IAsyncCommand<unknown, TParams>;
}
/**
 * Command Pattern Base Classes
 * Core Layer - Business Logic Commands
 */

/**
 * Base command interface following Command Pattern
 * @template T - The return type of the command execution
 */
export interface Command<T = void> {
  /**
   * Execute the command's business logic
   * @returns Promise resolving to the command result
   */
  execute(): Promise<T>;
  
  /**
   * Check if the command can be executed in current state
   * @returns true if command can be executed
   */
  canExecute(): boolean;
  
  /**
   * Optional description for logging/debugging
   */
  readonly description?: string;
}

/**
 * Base abstract class providing common command functionality
 */
export abstract class BaseCommand<T = void> implements Command<T> {
  constructor(
    public readonly description?: string
  ) {}
  
  abstract execute(): Promise<T>;
  
  canExecute(): boolean {
    return true;
  }
}

/**
 * Command execution result wrapper
 */
export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
}
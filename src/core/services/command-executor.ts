/**
 * Command Executor Service
 * Core Layer - Command Execution Management
 */

import { Command, CommandResult } from '@core/commands/base';

export class CommandExecutor {
  /**
   * Execute a command with error handling and logging
   * @param command - The command to execute
   * @returns The command result
   */
  async execute<T>(command: Command<T>): Promise<T> {
    if (!command.canExecute()) {
      throw new Error(`Command cannot be executed: ${command.description || 'Unknown command'}`);
    }
    
    const startTime = performance.now();
    
    try {
      console.log(`[CommandExecutor] Executing: ${command.description || 'Unknown command'}`);
      const result = await command.execute();
      const executionTime = Math.round(performance.now() - startTime);
      console.log(`[CommandExecutor] Completed in ${executionTime}ms`);
      return result;
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      console.error(`[CommandExecutor] Failed after ${executionTime}ms:`, error);
      throw error;
    }
  }
  
  /**
   * Execute a command and return a wrapped result
   * @param command - The command to execute
   * @returns CommandResult with success/error information
   */
  async executeWithResult<T>(command: Command<T>): Promise<CommandResult<T>> {
    const startTime = performance.now();
    
    try {
      if (!command.canExecute()) {
        return {
          success: false,
          error: `Command cannot be executed: ${command.description || 'Unknown command'}`,
          executionTime: 0
        };
      }
      
      const data = await command.execute();
      const executionTime = Math.round(performance.now() - startTime);
      
      return {
        success: true,
        data,
        executionTime
      };
    } catch (error) {
      const executionTime = Math.round(performance.now() - startTime);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command execution failed',
        executionTime
      };
    }
  }
}

// Singleton instance
export const commandExecutor = new CommandExecutor();
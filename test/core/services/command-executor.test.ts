/**
 * Command Executor Service Tests
 * Testing command execution management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommandExecutor } from '@core/services/command-executor';
import { BaseCommand } from '@core/commands/base';

// Mock command for testing
class TestCommand extends BaseCommand<string> {
  constructor(
    private readonly shouldSucceed: boolean = true,
    private readonly delay: number = 0
  ) {
    super('Test Command');
  }
  
  async execute(): Promise<string> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    if (!this.shouldSucceed) {
      throw new Error('Command failed');
    }
    
    return 'Success';
  }
  
  canExecute(): boolean {
    return true;
  }
}

// Command that cannot execute
class UnexecutableCommand extends BaseCommand<void> {
  constructor() {
    super('Unexecutable Command');
  }
  
  async execute(): Promise<void> {
    // Should never be called
  }
  
  canExecute(): boolean {
    return false;
  }
}

describe('CommandExecutor', () => {
  let executor: CommandExecutor;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    executor = new CommandExecutor();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as any;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as any;
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
  
  describe('execute', () => {
    it('should execute command successfully', async () => {
      const command = new TestCommand(true);
      const result = await executor.execute(command);
      
      expect(result).toBe('Success');
      expect(consoleLogSpy).toHaveBeenCalledWith('[CommandExecutor] Executing: Test Command');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[CommandExecutor] Completed in'));
    });
    
    it('should throw error when command cannot execute', async () => {
      const command = new UnexecutableCommand();
      
      await expect(executor.execute(command)).rejects.toThrow('Command cannot be executed: Unexecutable Command');
    });
    
    it('should propagate command execution errors', async () => {
      const command = new TestCommand(false);
      
      await expect(executor.execute(command)).rejects.toThrow('Command failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CommandExecutor] Failed after'),
        expect.any(Error)
      );
    });
    
    it('should measure execution time', async () => {
      const command = new TestCommand(true, 100);
      const startTime = performance.now();
      
      await executor.execute(command);
      
      const endTime = performance.now();
      const actualTime = endTime - startTime;
      
      expect(actualTime).toBeGreaterThanOrEqual(100);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[CommandExecutor\] Completed in \d+ms/)
      );
    });
  });
  
  describe('executeWithResult', () => {
    it('should return success result when command executes successfully', async () => {
      const command = new TestCommand(true);
      const result = await executor.executeWithResult(command);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('Success');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });
    
    it('should return error result when command cannot execute', async () => {
      const command = new UnexecutableCommand();
      const result = await executor.executeWithResult(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Command cannot be executed: Unexecutable Command');
      expect(result.executionTime).toBe(0);
      expect(result.data).toBeUndefined();
    });
    
    it('should return error result when command execution fails', async () => {
      const command = new TestCommand(false);
      const result = await executor.executeWithResult(command);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Command failed');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.data).toBeUndefined();
    });
  });
});
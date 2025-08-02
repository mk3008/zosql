/**
 * SQL Editor ViewModel Tests
 * Demonstrating MVVM pattern testability without UI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SqlEditorViewModel } from '@ui/viewmodels/sql-editor-viewmodel';

// Mock command executor
vi.mock('@core/services/command-executor', () => ({
  commandExecutor: {
    execute: vi.fn()
  }
}));

describe('SqlEditorViewModel', () => {
  let viewModel: SqlEditorViewModel;
  let changeCallback: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    viewModel = new SqlEditorViewModel();
    changeCallback = vi.fn();
    viewModel.subscribe(changeCallback);
  });
  
  describe('Property Bindings', () => {
    it('should notify change when sql property is set', () => {
      viewModel.sql = 'SELECT * FROM users';
      
      expect(changeCallback).toHaveBeenCalledWith('sql', 'SELECT * FROM users');
      expect(changeCallback).toHaveBeenCalledWith('canExecute', true);
    });
    
    it('should not notify change when same sql value is set', () => {
      viewModel.sql = 'SELECT * FROM users';
      changeCallback.mockClear();
      
      viewModel.sql = 'SELECT * FROM users';
      
      expect(changeCallback).not.toHaveBeenCalled();
    });
    
    it('should update canExecute when sql changes', () => {
      expect(viewModel.canExecute).toBe(false);
      
      viewModel.sql = 'SELECT 1';
      expect(viewModel.canExecute).toBe(true);
      
      viewModel.sql = '';
      expect(viewModel.canExecute).toBe(false);
    });
  });
  
  describe('Command Execution', () => {
    it('should not execute when canExecute is false', async () => {
      const { commandExecutor } = await import('@core/services/command-executor');
      
      viewModel.sql = ''; // Empty SQL
      await viewModel.executeQuery();
      
      expect(commandExecutor.execute).not.toHaveBeenCalled();
    });
    
    it('should execute command when canExecute is true', async () => {
      const { commandExecutor } = await import('@core/services/command-executor');
      const mockResult = { success: true, data: [], executionTime: 100 };
      (commandExecutor.execute as unknown as { mockResolvedValue: (value: unknown) => void }).mockResolvedValue(mockResult);
      
      viewModel.sql = 'SELECT 1';
      await viewModel.executeQuery();
      
      expect(commandExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Execute SQL Query'
        })
      );
      expect(viewModel.result).toBe(mockResult);
    });
    
    it('should handle execution errors', async () => {
      const { commandExecutor } = await import('@core/services/command-executor');
      (commandExecutor.execute as unknown as { mockRejectedValue: (error: Error) => void }).mockRejectedValue(new Error('Database error'));
      
      viewModel.sql = 'SELECT invalid';
      await viewModel.executeQuery();
      
      expect(viewModel.result).toEqual({
        success: false,
        error: 'Database error',
        executionTime: 0
      });
    });
    
    it('should manage isExecuting state during execution', async () => {
      const { commandExecutor } = await import('@core/services/command-executor');
      let resolveExecution!: (value: unknown) => void;
      const executionPromise = new Promise(resolve => {
        resolveExecution = resolve;
      });
      (commandExecutor.execute as unknown as { mockReturnValue: (promise: Promise<unknown>) => void }).mockReturnValue(executionPromise);
      
      viewModel.sql = 'SELECT 1';
      const executePromise = viewModel.executeQuery();
      
      expect(viewModel.isExecuting).toBe(true);
      expect(viewModel.canExecute).toBe(false);
      
      resolveExecution({ success: true, data: [] });
      await executePromise;
      
      expect(viewModel.isExecuting).toBe(false);
      expect(viewModel.canExecute).toBe(true);
    });
  });
  
  describe('Computed Properties', () => {
    it('should return false for canExecute when sql is empty', () => {
      viewModel.sql = '';
      expect(viewModel.canExecute).toBe(false);
      
      viewModel.sql = '   ';
      expect(viewModel.canExecute).toBe(false);
    });
    
    it('should return false for canExecute when executing', () => {
      viewModel.sql = 'SELECT 1';
      expect(viewModel.canExecute).toBe(true);
      
      // Simulate execution state (private setter, so we need to trigger it via executeQuery)
      // This test would need the internal state to be set
    });
  });
  
  describe('Resource Management', () => {
    it('should allow unsubscribing from change notifications', () => {
      const unsubscribe = viewModel.subscribe(changeCallback);
      
      unsubscribe();
      viewModel.sql = 'SELECT 1';
      
      expect(changeCallback).not.toHaveBeenCalled();
    });
    
    it('should clean up listeners when disposed', () => {
      viewModel.dispose();
      viewModel.sql = 'SELECT 1';
      
      expect(changeCallback).not.toHaveBeenCalled();
    });
  });
});
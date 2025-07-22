/**
 * MainContentMvvm Component Tests
 * Minimal integration tests for MVVM binding
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainContentMvvm } from '@ui/components/MainContentMvvm';
import { WorkspaceEntity } from '@core/entities/workspace';
import { TestValuesModel } from '@core/entities/test-values-model';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';

// Mock Monaco Editor
vi.mock('@ui/components/MonacoEditor', () => ({
  MonacoEditor: ({ value, onChange }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}));

// Mock QueryResults
vi.mock('@ui/components/QueryResults', () => ({
  QueryResults: ({ result, onClose }: any) => (
    <div data-testid="query-results">
      <button onClick={onClose}>Close Results</button>
      <div>{result.success ? 'Success' : 'Error'}</div>
    </div>
  )
}));

// Mock command executor
vi.mock('@core/services/command-executor', () => ({
  commandExecutor: {
    execute: vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 1, name: 'test' }],
      executionTime: 100
    })
  }
}));

describe('MainContentMvvm Component', () => {
  let workspace: WorkspaceEntity;

  beforeEach(() => {
    workspace = new WorkspaceEntity(
      'workspace-1',
      'Test Workspace',
      'main.sql',
      [],
      new TestValuesModel('with users as (select 1 as id)'),
      new SqlFormatterEntity(),
      new FilterConditionsEntity(),
      {}
    );
  });

  it('should render with default main tab', () => {
    render(<MainContentMvvm workspace={workspace} />);

    expect(screen.getByText('main.sql')).toBeInTheDocument();
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
  });

  it('should bind ViewModel properties to UI', () => {
    render(<MainContentMvvm workspace={workspace} />);

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveValue('SELECT user_id, name FROM users;');

    const runButton = screen.getByRole('button', { name: /run/i });
    expect(runButton).not.toBeDisabled();
  });

  it('should execute query command when Run button is clicked', async () => {
    const { commandExecutor } = await import('@core/services/command-executor');
    
    render(<MainContentMvvm workspace={workspace} />);

    const runButton = screen.getByRole('button', { name: /run/i });
    fireEvent.click(runButton);

    expect(commandExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Execute SQL Query'
      })
    );
  });

  it('should update tab content when editor changes', () => {
    render(<MainContentMvvm workspace={workspace} />);

    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'SELECT * FROM products' } });

    expect(editor).toHaveValue('SELECT * FROM products');
  });

  it('should toggle results visibility', async () => {
    render(<MainContentMvvm workspace={workspace} />);

    // Execute query to get results
    const runButton = screen.getByRole('button', { name: /run/i });
    fireEvent.click(runButton);

    // Wait for results to appear
    await screen.findByTestId('query-results');

    // Toggle visibility
    const hideButton = screen.getByRole('button', { name: /hide results/i });
    fireEvent.click(hideButton);

    expect(screen.queryByTestId('query-results')).not.toBeInTheDocument();
  });

  it('should handle tab operations', () => {
    const ref = { current: null } as any;
    render(<MainContentMvvm ref={ref} workspace={workspace} />);

    // Test imperative interface
    expect(ref.current).toBeDefined();
    expect(typeof ref.current.openValuesTab).toBe('function');
    expect(typeof ref.current.getCurrentSql).toBe('function');

    // Test getCurrentSql
    const sql = ref.current.getCurrentSql();
    expect(sql).toBe('SELECT user_id, name FROM users;');
  });

  it('should disable Run button when no content', () => {
    render(<MainContentMvvm workspace={workspace} />);

    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: '' } });

    const runButton = screen.getByRole('button', { name: /run/i });
    expect(runButton).toBeDisabled();
  });

  it('should show executing state', async () => {
    const { commandExecutor } = await import('@core/services/command-executor');
    
    // Mock slow execution
    let resolveExecution: (value: any) => void;
    const executionPromise = new Promise(resolve => {
      resolveExecution = resolve;
    });
    (commandExecutor.execute as any).mockReturnValueOnce(executionPromise);

    render(<MainContentMvvm workspace={workspace} />);

    const runButton = screen.getByRole('button', { name: /run/i });
    fireEvent.click(runButton);

    // Should show executing state
    expect(screen.getByRole('button', { name: /running/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /running/i })).toBeDisabled();

    // Resolve execution
    resolveExecution!({ success: true, data: [] });
  });
});
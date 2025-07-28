/**
 * Main Content ViewModel Tests
 * Testing business logic without UI dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MainContentViewModel } from '@ui/viewmodels/main-content-viewmodel';
import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlModelEntity } from '@core/entities/sql-model';
import { TestValuesModel } from '@core/entities/test-values-model';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';

// Mock command executor
vi.mock('@core/services/command-executor', () => ({
  commandExecutor: {
    execute: vi.fn()
  }
}));

describe('MainContentViewModel', () => {
  let viewModel: MainContentViewModel;
  let workspace: WorkspaceEntity;
  let changeCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    viewModel = new MainContentViewModel();
    changeCallback = vi.fn();
    viewModel.subscribe(changeCallback);

    // Create test workspace
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

  describe('Property Bindings', () => {
    it('should notify change when activeTabId is set', () => {
      viewModel.activeTabId = 'tab-1';

      expect(changeCallback).toHaveBeenCalledWith('activeTabId', 'tab-1');
      expect(changeCallback).toHaveBeenCalledWith('activeTab', null); // No tabs yet
      expect(changeCallback).toHaveBeenCalledWith('canExecute', false);
    });

    it('should notify change when tabs are updated', () => {
      const tabs = [
        { id: 'tab-1', title: 'Main', type: 'main' as const, content: 'SELECT 1', isDirty: false }
      ];

      viewModel.tabs = tabs;

      expect(changeCallback).toHaveBeenCalledWith('tabs', tabs);
    });

    it('should notify change when workspace is set', () => {
      viewModel.workspace = workspace;

      expect(changeCallback).toHaveBeenCalledWith('workspace', workspace);
    });
  });

  describe('Computed Properties', () => {
    beforeEach(() => {
      // Set up tabs
      viewModel.tabs = [
        { id: 'tab-1', title: 'Main', type: 'main', content: 'SELECT * FROM users', isDirty: false },
        { id: 'tab-2', title: 'Empty', type: 'main', content: '', isDirty: false }
      ];
    });

    it('should return correct canExecute state', () => {
      // No active tab
      expect(viewModel.canExecute).toBe(false);

      // Active tab with content
      viewModel.activeTabId = 'tab-1';
      expect(viewModel.canExecute).toBe(true);

      // Active tab with empty content
      viewModel.activeTabId = 'tab-2';
      expect(viewModel.canExecute).toBe(false);

      // During execution
      viewModel.activeTabId = 'tab-1';
      // Note: isExecuting is private, so we test via executeQuery
    });

    it('should return correct activeTab', () => {
      expect(viewModel.activeTab).toBeNull();

      viewModel.activeTabId = 'tab-1';
      expect(viewModel.activeTab).toEqual({
        id: 'tab-1',
        title: 'Main',
        type: 'main',
        content: 'SELECT * FROM users',
        isDirty: false
      });
    });

    it('should return correct canFormat state', () => {
      expect(viewModel.canFormat).toBe(false);

      viewModel.activeTabId = 'tab-1';
      expect(viewModel.canFormat).toBe(true);

      viewModel.activeTabId = 'tab-2'; // Empty content
      expect(viewModel.canFormat).toBe(false);
    });
  });

  describe('Commands', () => {
    beforeEach(() => {
      viewModel.tabs = [
        { id: 'tab-1', title: 'Main', type: 'main', content: 'SELECT * FROM users', isDirty: false }
      ];
      viewModel.activeTabId = 'tab-1';
      viewModel.workspace = workspace;
    });

    it('should execute query command', async () => {
      const { commandExecutor } = await import('@core/services/command-executor');
      const mockResult = { success: true, data: [{ id: 1 }], executionTime: 100 };
      (commandExecutor.execute as any).mockResolvedValue(mockResult);

      await viewModel.executeQuery();

      expect(commandExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Execute SQL Query'
        })
      );
      expect(viewModel.queryResult).toBe(mockResult);
      expect(viewModel.resultsVisible).toBe(true);
    });

    it('should handle query execution errors', async () => {
      const { commandExecutor } = await import('@core/services/command-executor');
      (commandExecutor.execute as any).mockRejectedValue(new Error('SQL error'));

      await viewModel.executeQuery();

      expect(viewModel.queryResult).toEqual({
        success: false,
        error: 'SQL error',
        executionTime: 0
      });
    });

    it('should not execute when canExecute is false', async () => {
      const { commandExecutor } = await import('@core/services/command-executor');

      viewModel.activeTabId = ''; // No active tab
      await viewModel.executeQuery();

      expect(commandExecutor.execute).not.toHaveBeenCalled();
    });

    it('should format query', async () => {
      const { commandExecutor } = await import('@core/services/command-executor');
      (commandExecutor.execute as any).mockResolvedValue('SELECT\n  *\nFROM\n  users');

      await viewModel.formatQuery();

      expect(commandExecutor.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Format SQL Query'
        })
      );
      expect(viewModel.activeTab?.content).toBe('SELECT\n  *\nFROM\n  users');
    });
  });

  describe('Tab Management', () => {
    it('should update tab content and mark as dirty', () => {
      viewModel.tabs = [
        { id: 'tab-1', title: 'Main', type: 'main', content: 'SELECT 1', isDirty: false }
      ];

      viewModel.updateTabContent('tab-1', 'SELECT 2');

      expect(viewModel.tabs[0].content).toBe('SELECT 2');
      expect(viewModel.tabs[0].isDirty).toBe(true);
    });

    it('should close tab and update active tab', () => {
      viewModel.tabs = [
        { id: 'tab-1', title: 'Main', type: 'main', content: 'SELECT 1', isDirty: false },
        { id: 'tab-2', title: 'CTE', type: 'cte', content: 'SELECT 2', isDirty: false }
      ];
      viewModel.activeTabId = 'tab-1';

      viewModel.closeTab('tab-1');

      expect(viewModel.tabs).toHaveLength(1);
      expect(viewModel.tabs[0].id).toBe('tab-2');
      expect(viewModel.activeTabId).toBe('tab-2');
    });

    it('should add new tab and make it active', () => {
      const newTab = { id: 'tab-1', title: 'New', type: 'main' as const, content: '', isDirty: false };

      viewModel.addTab(newTab);

      expect(viewModel.tabs).toContain(newTab);
      expect(viewModel.activeTabId).toBe('tab-1');
    });
  });

  describe('Model Management', () => {
    it('should set tab model mapping', () => {
      const model = new SqlModelEntity('main', 'main.sql', 'SELECT 1', []);

      viewModel.setTabModel('tab-1', model);

      expect(viewModel.tabModelMap.get('tab-1')).toBe(model);
    });
  });

  describe('Results Management', () => {
    it('should toggle results visibility', () => {
      expect(viewModel.resultsVisible).toBe(false);

      viewModel.toggleResultsVisibility();
      expect(viewModel.resultsVisible).toBe(true);

      viewModel.toggleResultsVisibility();
      expect(viewModel.resultsVisible).toBe(false);
    });

    it('should close results', () => {
      viewModel.resultsVisible = true;
      viewModel.closeResults();
      expect(viewModel.resultsVisible).toBe(false);
    });
  });
});
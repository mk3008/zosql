/**
 * Main Content ViewModel
 * UI Layer - Business logic for main content area
 */

import { BaseViewModel } from './base-viewmodel';
import { Tab, QueryExecutionResult, WorkspaceEntity, SqlModelEntity } from '@shared/types';
import { TestValuesModel } from '@core/entities/test-values-model';
import { ExecuteQueryCommand } from '@core/commands/execute-query-command';
import { FormatQueryCommand } from '@core/commands/format-query-command';
import { commandExecutor } from '@core/services/command-executor';

export class MainContentViewModel extends BaseViewModel {
  // Private state
  private _tabs: Tab[] = [];
  private _activeTabId: string = '';
  private _isExecuting: boolean = false;
  private _queryResult: QueryExecutionResult | null = null;
  private _resultsVisible: boolean = false;
  private _workspace: WorkspaceEntity | null = null;
  private _tabModelMap: Map<string, SqlModelEntity> = new Map();

  // Bindable Properties

  get tabs(): Tab[] {
    return this._tabs;
  }

  set tabs(value: Tab[]) {
    this._tabs = value;
    this.notifyChange('tabs', value);
  }

  get activeTabId(): string {
    return this._activeTabId;
  }

  set activeTabId(value: string) {
    if (this._activeTabId !== value) {
      this._activeTabId = value;
      this.notifyChange('activeTabId', value);
      this.notifyChange('activeTab', this.activeTab);
      this.notifyChange('canExecute', this.canExecute);
    }
  }

  get activeTab(): Tab | null {
    return this._tabs.find(tab => tab.id === this._activeTabId) || null;
  }

  get isExecuting(): boolean {
    return this._isExecuting;
  }

  private set isExecuting(value: boolean) {
    if (this._isExecuting !== value) {
      this._isExecuting = value;
      this.notifyChange('isExecuting', value);
      this.notifyChange('canExecute', this.canExecute);
    }
  }

  get queryResult(): QueryExecutionResult | null {
    return this._queryResult;
  }

  private set queryResult(value: QueryExecutionResult | null) {
    this._queryResult = value;
    this.notifyChange('queryResult', value);
  }

  get resultsVisible(): boolean {
    return this._resultsVisible;
  }

  set resultsVisible(value: boolean) {
    if (this._resultsVisible !== value) {
      this._resultsVisible = value;
      this.notifyChange('resultsVisible', value);
    }
  }

  get workspace(): WorkspaceEntity | null {
    return this._workspace;
  }

  set workspace(value: WorkspaceEntity | null) {
    this._workspace = value;
    this.notifyChange('workspace', value);
  }

  get tabModelMap(): Map<string, SqlModelEntity> {
    return this._tabModelMap;
  }

  set tabModelMap(value: Map<string, SqlModelEntity>) {
    this._tabModelMap = value;
    this.notifyChange('tabModelMap', value);
  }

  // Computed Properties

  get canExecute(): boolean {
    return !this.isExecuting && 
           this.activeTab !== null && 
           this.activeTab.content.trim().length > 0;
  }

  get canFormat(): boolean {
    return this.activeTab !== null && 
           this.activeTab.content.trim().length > 0;
  }


  // Commands

  async executeQuery(): Promise<void> {
    if (!this.canExecute || !this.activeTab) {
      return;
    }

    this.isExecuting = true;
    this.resultsVisible = true;

    try {
      // Create command context
      const context = {
        workspace: this.workspace,
        sqlModel: this.tabModelMap.get(this.activeTab.id) || null,
        tabContent: this.activeTab.content,
        tabType: this.activeTab.type
      };

      // Execute command
      const command = new ExecuteQueryCommand(context);
      const result = await commandExecutor.execute(command);

      this.queryResult = result;

      // Save result to model if available
      const model = this.tabModelMap.get(this.activeTab.id);
      if (model && 'setQueryResult' in model && typeof (model as any).setQueryResult === 'function') {
        (model as any).setQueryResult(result);
      }

    } catch (error) {
      this.queryResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime: 0
      };
    } finally {
      this.isExecuting = false;
    }
  }

  async formatQuery(): Promise<void> {
    if (!this.canFormat || !this.activeTab || !this.workspace) {
      return;
    }

    try {
      const command = new FormatQueryCommand({
        sql: this.activeTab.content,
        formatter: this.workspace.formatter
      });

      const formattedSql = await commandExecutor.execute(command);
      
      // Update tab content
      this.updateTabContent(this.activeTab.id, formattedSql);

    } catch (error) {
      console.error('Failed to format SQL:', error);
    }
  }


  toggleResultsVisibility(): void {
    this.resultsVisible = !this.resultsVisible;
  }

  closeResults(): void {
    this.resultsVisible = false;
  }

  // Tab Management

  updateTabContent(tabId: string, content: string): void {
    const tabIndex = this._tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex !== -1) {
      const updatedTabs = [...this._tabs];
      updatedTabs[tabIndex] = {
        ...updatedTabs[tabIndex],
        content,
        isDirty: true
      };
      this.tabs = updatedTabs;

      // Update workspace if this is a special tab
      const tab = updatedTabs[tabIndex];
      this.syncTabContentToWorkspace(tab, content);
    }
  }

  closeTab(tabId: string): void {
    const newTabs = this._tabs.filter(tab => tab.id !== tabId);
    this.tabs = newTabs;

    // Remove from model map
    this._tabModelMap.delete(tabId);
    this.notifyChange('tabModelMap', this._tabModelMap);

    // Update active tab if needed
    if (this.activeTabId === tabId && newTabs.length > 0) {
      this.activeTabId = newTabs[0].id;
    }
  }

  addTab(tab: Tab): void {
    console.log('[DEBUG] MainContentViewModel.addTab called with:', tab.id, tab.title);
    // Check if tab already exists
    const existingTab = this._tabs.find(t => t.id === tab.id);
    if (existingTab) {
      console.log('[DEBUG] Tab already exists, making it active:', existingTab.id);
      // If tab exists, just make it active
      this.activeTabId = tab.id;
      return;
    }
    
    console.log('[DEBUG] Adding new tab:', tab.id, 'current tabs count:', this._tabs.length);
    // Add new tab
    this.tabs = [...this._tabs, tab];
    this.activeTabId = tab.id;
    console.log('[DEBUG] New tabs count:', this._tabs.length);
  }

  // Model Management

  setTabModel(tabId: string, model: SqlModelEntity): void {
    this._tabModelMap.set(tabId, model);
    this.notifyChange('tabModelMap', this._tabModelMap);
  }

  // Private Methods

  private syncTabContentToWorkspace(tab: Tab, content: string): void {
    if (!this.workspace) return;

    switch (tab.type) {
      case 'values':
        try {
          const testValues = new TestValuesModel(content);
          this.workspace.testValues = testValues;
        } catch (error) {
          console.warn('Failed to update workspace test values:', error);
        }
        break;

      case 'formatter':
        try {
          const config = JSON.parse(content);
          this.workspace.formatter.setFormatterConfig(config);
        } catch (error) {
          console.warn('Failed to update workspace formatter config:', error);
          this.workspace.formatter.config = content;
        }
        break;

      case 'condition':
        this.workspace.filterConditions.displayString = content;
        break;
    }
  }
}
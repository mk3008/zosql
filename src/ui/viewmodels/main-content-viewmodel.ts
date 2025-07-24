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
import { PromptGenerator } from '@core/usecases/prompt-generator';
import { SchemaExtractor } from '@adapters/parsers/schema-extractor';

export class MainContentViewModel extends BaseViewModel {
  // Private state
  private _tabs: Tab[] = [];
  private _activeTabId: string = '';
  private _isExecuting: boolean = false;
  private _queryResult: QueryExecutionResult | null = null;
  private _resultsVisible: boolean = false;
  private _workspace: WorkspaceEntity | null = null;
  private _tabModelMap: Map<string, SqlModelEntity> = new Map();
  private _useSchemaCollector: boolean = true;
  
  // Callbacks
  private _onSqlExecuted?: (sql: string) => void;

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

  get canSave(): boolean {
    return this.activeTab !== null && this.activeTab.isDirty;
  }

  get useSchemaCollector(): boolean {
    return this._useSchemaCollector;
  }

  set useSchemaCollector(value: boolean) {
    if (this._useSchemaCollector !== value) {
      this._useSchemaCollector = value;
      this.notifyChange('useSchemaCollector', value);
    }
  }

  // Callback setters
  setOnSqlExecuted(callback: (sql: string) => void): void {
    this._onSqlExecuted = callback;
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

      console.log('[DEBUG] Execute query context:', {
        hasWorkspace: !!context.workspace,
        hasSqlModel: !!context.sqlModel,
        sqlModelName: context.sqlModel?.name,
        sqlModelType: context.sqlModel?.type,
        tabType: context.tabType,
        tabId: this.activeTab.id,
        tabContent: context.tabContent.substring(0, 100) + '...',
        workspaceTestValues: context.workspace?.testValues?.withClause?.substring(0, 100) + '...',
        workspaceSqlModelsCount: context.workspace?.sqlModels?.length,
        sqlModelDependentsCount: context.sqlModel?.dependents?.length,
        sqlModelDependentNames: context.sqlModel?.dependents?.map(d => d.name)
      });

      // Execute command
      const command = new ExecuteQueryCommand(context);
      const result = await commandExecutor.execute(command);

      this.queryResult = result;

      // Notify parent component about executed SQL
      if (result.executedSql && this._onSqlExecuted) {
        this._onSqlExecuted(result.executedSql);
      }

      // Save result to model if available
      const model = this.tabModelMap.get(this.activeTab.id);
      if (model && 'setQueryResult' in model && typeof (model as any).setQueryResult === 'function') {
        (model as any).setQueryResult(result);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.queryResult = {
        success: false,
        error: errorMessage,
        executionTime: 0
      };
      
      // Send error to error panel
      this.notifyChange('errorWithDetails', {
        message: 'Run failed',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
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
      
      // Send error to error panel
      this.notifyChange('errorWithDetails', {
        message: 'Format failed',
        details: error instanceof Error ? error.message : 'Unknown formatting error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }


  toggleResultsVisibility(): void {
    this.resultsVisible = !this.resultsVisible;
  }

  closeResults(): void {
    this.resultsVisible = false;
  }

  async copyPrompt(): Promise<void> {
    if (!this.activeTab || this.activeTab.type !== 'values' || !this.workspace) {
      return;
    }

    try {
      // Get the main SQL query from workspace for prompt generation
      const mainModel = this.workspace.sqlModels.find(m => m.type === 'main');
      console.log('[DEBUG] Copy Prompt - Looking for main model:', {
        hasWorkspace: !!this.workspace,
        sqlModelsCount: this.workspace?.sqlModels.length,
        mainModel: mainModel ? { name: mainModel.name, type: mainModel.type } : null
      });
      
      if (!mainModel) {
        console.error('No main SQL model found for prompt generation');
        // Send simple toast for error
        this.notifyChange('copyPromptError', 'Copy Prompt failed');
        
        // Send detailed error to error panel
        this.notifyChange('errorWithDetails', {
          message: 'Copy Prompt failed',
          details: 'No main SQL model found. Please ensure a workspace is loaded with a main query.',
          stack: undefined
        });
        return;
      }

      console.log('[DEBUG] Creating PromptGenerator and generating prompt');
      
      // Get full SQL from root model using getFullSql with specified parameters
      console.log('[DEBUG] Copy Prompt - Before getFullSql, mainModel.sqlWithoutCte:', mainModel.sqlWithoutCte.substring(0, 100) + '...');
      const fullSql = await mainModel.getFullSql(
        null,        // testValues: NULL
        null,        // filterConditions: NULL
        false        // forExecution: false
      );
      console.log('[DEBUG] Copy Prompt - Got full SQL from root model:', {
        fullSqlLength: fullSql.length,
        fullSqlPreview: fullSql.substring(0, 100) + '...'
      });
      
      const schemaExtractor = new SchemaExtractor();
      const promptGenerator = new PromptGenerator(schemaExtractor);
      const prompt = await promptGenerator.generatePrompt(fullSql, {
        useSchemaCollector: this._useSchemaCollector
      });
      console.log('[DEBUG] Generated prompt length:', prompt.length);

      // Copy the generated prompt to clipboard
      await navigator.clipboard.writeText(prompt);
      console.log('[DEBUG] AI prompt copied to clipboard');
      
      // Notify success via property change for UI to handle
      console.log('[DEBUG] Notifying copyPromptSuccess');
      this.notifyChange('copyPromptSuccess', 'Copy Prompt succeeded');
    } catch (error) {
      console.error('Failed to copy prompt - full error:', error);
      
      // Extract detailed error message
      let errorMessage = 'Failed to copy prompt';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Log stack trace for debugging
        console.error('Error stack:', error.stack);
        
        // If there's a cause, include it
        if ('cause' in error && error.cause) {
          errorMessage += ` (Caused by: ${error.cause})`;
        }
      } else {
        errorMessage = `Failed to copy prompt: ${String(error)}`;
      }
      
      // Send simple toast for error
      this.notifyChange('copyPromptError', 'Copy Prompt failed');
      
      // Send detailed error to error panel
      console.log('[DEBUG] Sending error to error panel:', errorMessage);
      this.notifyChange('errorWithDetails', {
        message: 'Copy Prompt failed',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
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
    }
  }

  saveTab(tabId: string): void {
    const tab = this._tabs.find(t => t.id === tabId);
    if (!tab || !tab.isDirty) return;

    // Save content to model
    this.syncTabContentToWorkspace(tab, tab.content);

    // Mark as clean
    const tabIndex = this._tabs.findIndex(t => t.id === tabId);
    if (tabIndex !== -1) {
      const updatedTabs = [...this._tabs];
      updatedTabs[tabIndex] = {
        ...updatedTabs[tabIndex],
        isDirty: false
      };
      this.tabs = updatedTabs;
    }

    console.log('[DEBUG] Tab saved:', tabId);
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
    if (!this.workspace) {
      console.log('[DEBUG] No workspace available for sync');
      return;
    }

    console.log('[DEBUG] syncTabContentToWorkspace called:', {
      tabType: tab.type,
      tabId: tab.id,
      contentLength: content.length
    });

    switch (tab.type) {
      case 'main':
        // Update main SQL model with edited content
        const mainModel = this.workspace.sqlModels.find(m => m.type === 'main');
        console.log('[DEBUG] Found main model:', {
          hasMainModel: !!mainModel,
          mainModelName: mainModel?.name,
          tabId: tab.id,
          nameMatches: mainModel?.name === tab.id
        });
        
        if (mainModel) {
          console.log('[DEBUG] Syncing main tab content to model:', tab.id, 'content length:', content.length);
          console.log('[DEBUG] Before update - mainModel.sqlWithoutCte:', mainModel.sqlWithoutCte.substring(0, 100) + '...');
          mainModel.sqlWithoutCte = content;
          console.log('[DEBUG] After update - mainModel.sqlWithoutCte:', mainModel.sqlWithoutCte.substring(0, 100) + '...');
        } else {
          console.log('[DEBUG] No main model found');
        }
        break;

      case 'cte':
        // Update CTE SQL model with edited content
        const cteModel = this.workspace.sqlModels.find(m => m.type === 'cte' && m.name === tab.id);
        if (cteModel) {
          console.log('[DEBUG] Syncing CTE tab content to model:', tab.id);
          cteModel.sqlWithoutCte = content;
        }
        break;

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
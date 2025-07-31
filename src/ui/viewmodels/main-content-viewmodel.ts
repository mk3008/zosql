/**
 * Main Content ViewModel
 * UI Layer - Business logic for main content area
 */

import { BaseViewModel } from './base-viewmodel';
import { Tab, WorkspaceEntity } from '@shared/types';
import { QueryExecutionResult, migrateLegacyResult } from '@core/types/query-types';
import { SqlModelEntity } from '@core/entities/sql-model';
import { OpenedObject } from '@core/entities/workspace';
import { TestValuesModel } from '@core/entities/test-values-model';
import { ExecuteQueryCommand } from '@core/commands/execute-query-command';
import { FormatQueryCommand } from '@core/commands/format-query-command';
import { commandExecutor } from '@core/services/command-executor';
import { PromptGenerator } from '@core/usecases/prompt-generator';
import { SchemaExtractor } from '@adapters/parsers/schema-extractor';
import { DebugLogger } from '../../utils/debug-logger';

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
      this.notifyChange('queryResult', this.queryResult); // Notify query result change
      
      // Sync active tab change to workspace
      this.syncTabsToWorkspace();
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
    // Get result from active tab's model, fallback to global result
    if (this.activeTab) {
      const model = this.tabModelMap.get(this.activeTab.id);
      DebugLogger.debug('MainContentViewModel', `Getting query result for tab: ${this.activeTab.id}, model: ${!!model}`);
      
      if (model && 'getQueryResult' in model && typeof (model as { getQueryResult?: () => unknown }).getQueryResult === 'function') {
        const result = (model as { getQueryResult: () => QueryExecutionResult | null }).getQueryResult();
        DebugLogger.debug('MainContentViewModel', `Model has result: ${!!result} for tab: ${this.activeTab.id}`);
        if (result) {
          return result;
        }
      }
    }
    // Fallback to global result for backward compatibility
    DebugLogger.debug('MainContentViewModel', `Using fallback global result for tab: ${this.activeTab?.id}`);
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

      this.queryResult = migrateLegacyResult(result as unknown as Record<string, unknown>);

      // Notify parent component about executed SQL
      // Show the ACTUAL executed SQL (with CTEs, filter conditions, etc.)
      const executedSql = (result as unknown as Record<string, unknown>)?.executedSql;
      if (this._onSqlExecuted && typeof executedSql === 'string') {
        try {
          // Use the actual executed SQL from the result
          this._onSqlExecuted(executedSql);
          console.log('[DEBUG] Sent ACTUAL executed SQL to LastExecutedSQL:', executedSql.substring(0, 100) + '...');
        } catch (error) {
          console.error('[DEBUG] Failed to send executed SQL to LastExecutedSQL:', error);
          // Fallback to tab content
          if (this.activeTab) {
            this._onSqlExecuted(this.activeTab.content);
          }
        }
      }

      // Save result to model if available
      const model = this.tabModelMap.get(this.activeTab.id);
      if (model && 'setQueryResult' in model && typeof (model as unknown as { setQueryResult?: (result: unknown) => void }).setQueryResult === 'function') {
        (model as unknown as { setQueryResult: (result: unknown) => void }).setQueryResult(result as unknown);
        // Notify that query result has changed for this tab
        this.notifyChange('queryResult', this.queryResult);
        console.log('[DEBUG] Saved query result to model:', this.activeTab.id);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResult = {
        success: false,
        error: errorMessage,
        executionTime: 0
      };
      
      this.queryResult = migrateLegacyResult(errorResult);
      
      // Save error result to model if available
      const model = this.tabModelMap.get(this.activeTab.id);
      if (model && 'setQueryResult' in model && typeof (model as unknown as { setQueryResult?: (result: unknown) => void }).setQueryResult === 'function') {
        (model as unknown as { setQueryResult: (result: unknown) => void }).setQueryResult(this.queryResult as unknown);
        // Notify that query result has changed for this tab
        this.notifyChange('queryResult', this.queryResult);
        console.log('[DEBUG] Saved error result to model:', this.activeTab.id);
      }
      
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

  // Complete workspace reset - clears all state when switching workspaces
  resetWorkspaceState(): void {
    DebugLogger.debug('MainContentViewModel', 'Resetting all workspace state');
    
    // Clear all tabs and related state
    this._tabs = [];
    this._activeTabId = '';
    this._tabModelMap = new Map();
    
    // Clear query results and execution state
    this._queryResult = null;
    this._resultsVisible = false;
    this._isExecuting = false;
    
    // Clear workspace reference
    this._workspace = null;
    
    // Reset other state
    this._useSchemaCollector = false;
    
    // Notify all property changes
    this.notifyChange('tabs', this._tabs);
    this.notifyChange('activeTabId', this._activeTabId);
    this.notifyChange('queryResult', this._queryResult);
    this.notifyChange('resultsVisible', this._resultsVisible);
    this.notifyChange('isExecuting', this._isExecuting);
    this.notifyChange('workspace', this._workspace);
    this.notifyChange('useSchemaCollector', this._useSchemaCollector);
    this.notifyChange('tabModelMap', this._tabModelMap);
    
    DebugLogger.debug('MainContentViewModel', 'Workspace state reset completed');
  }

  async runStaticAnalysis(): Promise<void> {
    DebugLogger.info('MainContentViewModel', 'runStaticAnalysis called');
    if (!this.workspace) {
      DebugLogger.warn('MainContentViewModel', 'No workspace available for static analysis');
      this.notifyChange('error', 'No workspace loaded');
      return;
    }

    try {
      DebugLogger.info('MainContentViewModel', 'Running static analysis for all models');
      
      // Log current state of models and their editor content
      const models = this.workspace.sqlModels.filter(m => m.type === 'main' || m.type === 'cte');
      DebugLogger.debug('MainContentViewModel', `Models to validate: ${models.length}`);
      for (const model of models) {
        DebugLogger.debug('MainContentViewModel', `- ${model.name}: editorContent(${model.editorContent.length}), sqlWithoutCte(${model.sqlWithoutCte.length}), hasUnsavedChanges: ${model.hasUnsavedChanges}`);
      }
      
      const startTime = performance.now();
      
      // Run validation on all schemas using editor content (real-time analysis)
      await this.workspace.validateAllSchemas(true);
      
      const endTime = performance.now();
      const totalTime = Math.round(endTime - startTime);
      
      // Show toast based on results
      const passedCount = models.filter(m => {
        const result = this.workspace!.getValidationResult(m.name);
        return result && result.success;
      }).length;
      
      if (passedCount === models.length) {
        // All models passed - show success
        this.notifyChange('success', `Static analysis completed: ${passedCount}/${models.length} models passed`);
      } else {
        // Some models failed - show error
        this.notifyChange('error', `Static analysis completed: ${passedCount}/${models.length} models passed`);
      }
      
      // Force re-render to update error displays in tabs and left sidebar
      this.notifyChange('analysisUpdated', Date.now());
      
      // Also notify workspace change to ensure all UI components update
      this.notifyChange('workspace', this.workspace);
      
      DebugLogger.info('MainContentViewModel', `Static analysis completed in ${totalTime}ms`);
    } catch (error) {
      DebugLogger.error('MainContentViewModel', `Static analysis failed: ${error}`);
      this.notifyChange('errorWithDetails', {
        message: 'Static analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
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
        undefined,   // testValues: undefined
        undefined,   // filterConditions: undefined
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
      const currentTab = this._tabs[tabIndex];
      // Only mark as dirty if content actually changed
      if (currentTab.content !== content) {
        const updatedTabs = [...this._tabs];
        updatedTabs[tabIndex] = {
          ...updatedTabs[tabIndex],
          content,
          isDirty: true
        };
        this.tabs = updatedTabs;
      }
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
    console.log('[DEBUG] Closing tab:', tabId);
    const newTabs = this._tabs.filter(tab => tab.id !== tabId);
    this.tabs = newTabs;

    // Clear query result from model before removing
    const model = this._tabModelMap.get(tabId);
    if (model && 'clearQueryResult' in model && typeof (model as { clearQueryResult?: () => void }).clearQueryResult === 'function') {
      (model as { clearQueryResult: () => void }).clearQueryResult();
      console.log('[DEBUG] Cleared query result for closing tab:', tabId);
    }

    // Remove from model map
    this._tabModelMap.delete(tabId);
    this.notifyChange('tabModelMap', this._tabModelMap);

    // Update active tab if needed
    if (this.activeTabId === tabId && newTabs.length > 0) {
      this.activeTabId = newTabs[0].id;
    }

    // Sync tabs to workspace
    this.syncTabsToWorkspace();
  }

  addTab(tab: Tab): void {
    console.log('[DEBUG] MainContentViewModel.addTab called with:', tab.id, tab.title);
    // Check if tab already exists
    const existingTab = this._tabs.find(t => t.id === tab.id);
    if (existingTab) {
      console.log('[DEBUG] Tab already exists, making it active:', existingTab.id);
      // If tab exists, just make it active
      this.activeTabId = tab.id;
      this.syncTabsToWorkspace();
      return;
    }
    
    console.log('[DEBUG] Adding new tab:', tab.id, 'current tabs count:', this._tabs.length);
    // Add new tab
    this.tabs = [...this._tabs, tab];
    this.activeTabId = tab.id;
    console.log('[DEBUG] New tabs count after adding:', this._tabs.length);
    
    // CRITICAL: Sync tabs to workspace immediately after adding
    console.log('[DEBUG] About to call syncTabsToWorkspace after addTab');
    this.syncTabsToWorkspace();
    console.log('[DEBUG] syncTabsToWorkspace completed after addTab');
  }

  // Model Management

  setTabModel(tabId: string, model: SqlModelEntity): void {
    console.log('[DEBUG] Setting tab model for tab:', tabId, 'model:', model.name);
    this._tabModelMap.set(tabId, model);
    this.notifyChange('tabModelMap', this._tabModelMap);
    console.log('[DEBUG] Tab model map size:', this._tabModelMap.size);
  }

  // Sync tabs to workspace opened objects
  private syncTabsToWorkspace(): void {
    if (!this.workspace) {
      console.log('[DEBUG] syncTabsToWorkspace: No workspace available');
      return;
    }

    console.log('[DEBUG] syncTabsToWorkspace: Starting sync with', this._tabs.length, 'tabs');
    
    // Convert tabs to opened objects
    const openedObjects: OpenedObject[] = this._tabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      type: tab.type,
      content: tab.content,
      isDirty: tab.isDirty,
      modelEntity: this._tabModelMap.get(tab.id) as SqlModelEntity | undefined
    }));

    console.log('[DEBUG] syncTabsToWorkspace: Created openedObjects:', openedObjects.map(obj => `${obj.id} (${obj.type})`));

    // Update workspace opened objects
    this.workspace.setOpenedObjects(openedObjects);
    this.workspace.setActiveObjectId(this._activeTabId);

    console.log('[DEBUG] syncTabsToWorkspace: Updated workspace - openedObjects count:', this.workspace.openedObjects.length);
    console.log('[DEBUG] syncTabsToWorkspace: Synced', openedObjects.length, 'tabs to workspace, active:', this._activeTabId);

    // Save to localStorage
    try {
      const workspaceJson = this.workspace.toJSON();
      localStorage.setItem('zosql_workspace_v3', JSON.stringify(workspaceJson));
      console.log('[DEBUG] Saved workspace state to localStorage');
      console.log('[DEBUG] Saved openedObjects count:', workspaceJson.openedObjects?.length || 0);
      console.log('[DEBUG] Saved activeObjectId:', workspaceJson.activeObjectId);
      if (workspaceJson.openedObjects?.length > 0) {
        console.log('[DEBUG] Saved objects:', workspaceJson.openedObjects.map(obj => `${obj.id} (${obj.type})`).join(', '));
      }
    } catch (error) {
      console.warn('Failed to save workspace to localStorage:', error);
    }
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
      case 'main': {
        // Update main SQL model with edited content
        const mainModel = this.workspace.sqlModels.find(m => m.type === 'main');
        console.log('[DEBUG] Found main model:', {
          hasMainModel: !!mainModel,
          mainModelName: mainModel?.name,
          tabId: tab.id,
          nameMatches: mainModel?.name === tab.id
        });
        
        if (mainModel) {
          console.log('[DEBUG] Saving main tab content to model:', tab.id, 'content length:', content.length);
          console.log('[DEBUG] Before save - mainModel.sqlWithoutCte:', mainModel.sqlWithoutCte.substring(0, 100) + '...');
          mainModel.editorContent = content; // Update editor content first
          mainModel.save(); // Save editor content to persistent storage
          console.log('[DEBUG] After save - mainModel.sqlWithoutCte:', mainModel.sqlWithoutCte.substring(0, 100) + '...');
        } else {
          console.log('[DEBUG] No main model found');
        }
        break;
      }

      case 'cte': {
        // Update CTE SQL model with edited content
        const cteModel = this.workspace.sqlModels.find(m => m.type === 'cte' && m.name === tab.id);
        if (cteModel) {
          console.log('[DEBUG] Saving CTE tab content to model:', tab.id);
          cteModel.editorContent = content; // Update editor content first
          cteModel.save(); // Save editor content to persistent storage
        }
        break;
      }

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
/**
 * NewWorkspaceViewModel - MVVM Pattern Implementation
 * NewWorkspaceDialogのUI状態管理とビジネスロジック連携
 */

import { CreateWorkspaceCommand } from '@ui/commands/create-workspace-command';
import { WorkspaceEntity } from '@core/entities/workspace';
import { BaseViewModel } from './base-viewmodel';

export class NewWorkspaceViewModel extends BaseViewModel {
  private _name = '';
  private _sql = '';
  private _isLoading = false;
  private _error: string | null = null;

  // Events
  public onWorkspaceCreated?: (workspace: WorkspaceEntity) => void;

  // Bindable Properties
  get name(): string {
    return this._name;
  }

  set name(value: string) {
    if (this._name !== value) {
      this._name = value;
      this.notifyChange('name', value);
    }
  }

  get sql(): string {
    return this._sql;
  }

  set sql(value: string) {
    if (this._sql !== value) {
      this._sql = value;
      this.notifyChange('sql', value);
    }
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  private set isLoading(value: boolean) {
    if (this._isLoading !== value) {
      this._isLoading = value;
      this.notifyChange('isLoading', value);
    }
  }

  get error(): string | null {
    return this._error;
  }

  private set error(value: string | null) {
    if (this._error !== value) {
      this._error = value;
      this.notifyChange('error', value);
    }
  }

  // Computed Properties
  get canExecute(): boolean {
    return !this._isLoading && 
           this._name.trim().length > 0 && 
           this._sql.trim().length > 0;
  }

  // Commands
  async executeCreateWorkspace(): Promise<void> {
    if (!this.canExecute) {
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const command = this.createCommand();
      const workspace = await command.execute();
      
      // Success - notify and reset form
      this.onWorkspaceCreated?.(workspace);
      this.resetForm();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unknown error occurred';
    } finally {
      this.isLoading = false;
    }
  }

  clearError(): void {
    this.error = null;
  }

  // Override dispose to call parent
  dispose(): void {
    super.dispose();
  }

  // Private Methods
  private createCommand(): CreateWorkspaceCommand {
    return new CreateWorkspaceCommand(this._name, this._sql);
  }

  private resetForm(): void {
    this.name = '';
    this.sql = '';
    this.error = null;
  }

}
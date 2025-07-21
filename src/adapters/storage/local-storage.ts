import { WorkspaceRepository } from '@core/ports/workspace';
import { Workspace } from '@shared/types';

export class LocalStorageWorkspaceRepository implements WorkspaceRepository {
  private readonly STORAGE_KEY = 'zosql_workspace_v2';
  private readonly VERSION = '2.0.0';

  async findById(id: string): Promise<Workspace | null> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      
      if (!stored) {
        return null;
      }

      const data = JSON.parse(stored);
      
      // Version check
      if (data.version !== this.VERSION) {
        console.warn('Version mismatch, clearing old workspace data');
        await this.clear();
        return null;
      }

      return data.workspace || null;
    } catch (error) {
      console.error('Failed to load workspace from localStorage:', error);
      return null;
    }
  }

  async save(workspace: Workspace): Promise<void> {
    try {
      const data = {
        version: this.VERSION,
        workspace,
        lastSaved: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      throw new Error(`Failed to save workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      throw new Error(`Failed to clear workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Debug utilities
  getStorageInfo(): { size: number; lastSaved?: string } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return { size: 0 };
      }

      const data = JSON.parse(stored);
      return {
        size: stored.length,
        lastSaved: data.lastSaved
      };
    } catch {
      return { size: 0 };
    }
  }

  // Check if storage is available
  static isAvailable(): boolean {
    try {
      const test = '__zosql_storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}
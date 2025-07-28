/**
 * LocalStorage-based Workspace Storage Implementation
 * ブラウザのlocalStorageを使用したストレージ実装
 */

import { WorkspaceStorageInterface, WorkspaceInfo, PrivateCte } from './workspace-storage-interface.js';
import { Logger } from '../utils/logging.js';

// Type guards for safe storage data handling
function isValidWorkspaceData(data: unknown): data is {
  version?: string;
  workspaceInfo?: WorkspaceInfo | null;
  privateCtes?: Record<string, PrivateCte>;
  mainQuery?: string;
  lastSaved?: string | null;
} {
  return (
    typeof data === 'object' &&
    data !== null &&
    (!('version' in data) || typeof (data as Record<string, unknown>).version === 'string') &&
    (!('workspaceInfo' in data) || (data as Record<string, unknown>).workspaceInfo === null || typeof (data as Record<string, unknown>).workspaceInfo === 'object') &&
    (!('privateCtes' in data) || typeof (data as Record<string, unknown>).privateCtes === 'object') &&
    (!('mainQuery' in data) || typeof (data as Record<string, unknown>).mainQuery === 'string') &&
    (!('lastSaved' in data) || (data as Record<string, unknown>).lastSaved === null || typeof (data as Record<string, unknown>).lastSaved === 'string')
  );
}

export class LocalStorageWorkspaceStorage implements WorkspaceStorageInterface {
  private logger: Logger;
  private readonly STORAGE_KEY = 'zosql_workspace';
  private readonly VERSION = '1.0.0';

  constructor() {
    this.logger = Logger.getInstance();
  }

  async hasWorkspace(): Promise<boolean> {
    try {
      const workspace = this.getWorkspaceFromStorage();
      return isValidWorkspaceData(workspace) && workspace.workspaceInfo !== null;
    } catch {
      return false;
    }
  }

  async getWorkspace(): Promise<WorkspaceInfo | null> {
    try {
      const workspace = this.getWorkspaceFromStorage();
      return workspace.workspaceInfo;
    } catch {
      return null;
    }
  }

  async saveWorkspace(workspaceInfo: WorkspaceInfo): Promise<void> {
    try {
      const workspace = {
        version: this.VERSION,
        workspaceInfo,
        privateCtes: workspaceInfo.privateCtes || {},
        mainQuery: workspaceInfo.decomposedQuery || '',
        lastSaved: new Date().toISOString()
      };

      // ブラウザのlocalStorageは同期的だが、APIの一貫性のためPromiseでラップ
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workspace));
      this.logger.log('[LOCALSTORAGE-STORAGE] Workspace saved to localStorage');
    } catch (error) {
      this.logger.log(`[LOCALSTORAGE-STORAGE] Error saving workspace: ${error}`);
      throw error;
    }
  }

  async clearWorkspace(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.logger.log('[LOCALSTORAGE-STORAGE] Workspace cleared from localStorage');
    } catch (error) {
      this.logger.log(`[LOCALSTORAGE-STORAGE] Error clearing workspace: ${error}`);
      throw error;
    }
  }

  async getPrivateCtes(): Promise<Record<string, PrivateCte>> {
    try {
      const workspace = this.getWorkspaceFromStorage();
      return workspace.privateCtes || {};
    } catch {
      return {};
    }
  }

  async getPrivateCte(cteName: string): Promise<PrivateCte | null> {
    try {
      const privateCtes = await this.getPrivateCtes();
      return privateCtes[cteName] || null;
    } catch {
      return null;
    }
  }

  async updatePrivateCte(cteName: string, cte: PrivateCte): Promise<void> {
    try {
      const workspace = this.getWorkspaceFromStorage();
      
      if (!workspace.privateCtes) {
        workspace.privateCtes = {};
      }

      workspace.privateCtes[cteName] = cte;
      
      // Update workspace info if it exists
      if (workspace.workspaceInfo) {
        workspace.workspaceInfo.privateCtes[cteName] = cte;
        workspace.workspaceInfo.lastModified = new Date().toISOString();
      }

      workspace.lastSaved = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workspace));
      
      this.logger.log(`[LOCALSTORAGE-STORAGE] Updated CTE: ${cteName}`);
    } catch (error) {
      this.logger.log(`[LOCALSTORAGE-STORAGE] Error updating CTE: ${error}`);
      throw error;
    }
  }

  async deletePrivateCte(cteName: string): Promise<void> {
    try {
      const workspace = this.getWorkspaceFromStorage();
      
      if (workspace.privateCtes && workspace.privateCtes[cteName]) {
        delete workspace.privateCtes[cteName];
      }

      if (workspace.workspaceInfo && workspace.workspaceInfo.privateCtes && workspace.workspaceInfo.privateCtes[cteName]) {
        delete workspace.workspaceInfo.privateCtes[cteName];
        workspace.workspaceInfo.lastModified = new Date().toISOString();
      }

      workspace.lastSaved = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workspace));
      
      this.logger.log(`[LOCALSTORAGE-STORAGE] Deleted CTE: ${cteName}`);
    } catch (error) {
      this.logger.log(`[LOCALSTORAGE-STORAGE] Error deleting CTE: ${error}`);
      throw error;
    }
  }

  async getWorkspaceFile(type: 'main' | 'cte', fileName: string): Promise<{ content: string; fileName: string; type: string } | null> {
    try {
      const workspace = this.getWorkspaceFromStorage();
      let content = '';

      if (type === 'main') {
        content = workspace.mainQuery || workspace.workspaceInfo?.decomposedQuery || '';
      } else if (type === 'cte') {
        const cteName = fileName.replace('.cte', '').replace('.sql', '');
        const cte = workspace.privateCtes?.[cteName];
        content = cte?.query || '';
      }

      if (content) {
        return { content, fileName, type };
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * localStorage からワークスペースデータを取得
   */
  private getWorkspaceFromStorage(): unknown {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return {
          version: this.VERSION,
          workspaceInfo: null,
          privateCtes: {},
          mainQuery: '',
          lastSaved: null
        };
      }

      const workspace = JSON.parse(stored);
      
      // Version check and migration
      if (workspace.version !== this.VERSION) {
        this.logger.log('[LOCALSTORAGE-STORAGE] Version mismatch, clearing workspace');
        this.clearWorkspace();
        return {
          version: this.VERSION,
          workspaceInfo: null,
          privateCtes: {},
          mainQuery: '',
          lastSaved: null
        };
      }

      return workspace;
    } catch (error) {
      this.logger.log(`[LOCALSTORAGE-STORAGE] Error reading workspace: ${error}`);
      return {
        version: this.VERSION,
        workspaceInfo: null,
        privateCtes: {},
        mainQuery: '',
        lastSaved: null
      };
    }
  }

  /**
   * Validation of workspace data integrity
   */
  async validateWorkspace(): Promise<{ isValid: boolean; issues: string[] }> {
    try {
      const workspace = this.getWorkspaceFromStorage();
      const issues: string[] = [];

      // Check structure
      if (!workspace.version) {
        issues.push('Missing version information');
      }

      if (workspace.workspaceInfo) {
        if (!workspace.workspaceInfo.name) {
          issues.push('Missing workspace name');
        }
        if (!workspace.workspaceInfo.decomposedQuery) {
          issues.push('Missing decomposed query');
        }
      }

      // Check CTEs
      const privateCtes = workspace.privateCtes || {};
      for (const [cteName, cte] of Object.entries(privateCtes)) {
        if (!cte || typeof cte !== 'object') {
          issues.push(`Invalid CTE structure: ${cteName}`);
          continue;
        }

        const privateCte = cte as PrivateCte;
        if (!privateCte.query || privateCte.query.trim() === '') {
          issues.push(`Empty query for CTE: ${cteName}`);
        }

        if (!privateCte.name || privateCte.name !== cteName) {
          issues.push(`Name mismatch for CTE: ${cteName}`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues: issues
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Export workspace for backup/sharing
   */
  async exportWorkspace(): Promise<unknown> {
    const workspace = this.getWorkspaceFromStorage();
    return {
      exportDate: new Date().toISOString(),
      data: workspace
    };
  }

  /**
   * Import workspace from backup/sharing
   */
  async importWorkspace(exportedData: unknown): Promise<void> {
    try {
      if (!exportedData || !exportedData.data) {
        throw new Error('Invalid exported data format');
      }

      const workspace = exportedData.data;
      workspace.version = this.VERSION; // Update to current version
      workspace.lastSaved = new Date().toISOString();
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workspace));
      this.logger.log('[LOCALSTORAGE-STORAGE] Workspace imported successfully');
    } catch (error) {
      this.logger.log(`[LOCALSTORAGE-STORAGE] Error importing workspace: ${error}`);
      throw error;
    }
  }
}
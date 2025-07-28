/**
 * LocalStorage Workspace Repository
 * Infrastructure Layer - LocalStorage implementation of WorkspaceRepositoryPort
 * Concrete adapter implementing workspace persistence using browser localStorage
 */

import { 
  WorkspaceRepositoryPort, 
  RepositoryResult, 
  WorkspaceSearchCriteria 
} from '@core/ports/workspace-repository-port';
import { WorkspaceEntity } from '@core/entities/workspace';

/**
 * LocalStorage keys for workspace data
 */
const STORAGE_KEYS = {
  WORKSPACES: 'zosql_workspaces',
  WORKSPACE_INDEX: 'zosql_workspace_index',
  WORKSPACE_METADATA: 'zosql_workspace_metadata'
} as const;

/**
 * Workspace index for fast lookups
 */
interface WorkspaceIndex {
  readonly [id: string]: {
    readonly name: string;
    readonly createdAt: string;
    readonly lastModified: string;
    readonly tags: readonly string[];
  };
}

interface MutableWorkspaceIndex {
  [id: string]: {
    name: string;
    createdAt: string;
    lastModified: string;
    tags: string[];
  };
}

/**
 * LocalStorage implementation of WorkspaceRepositoryPort
 * Provides persistent storage using browser localStorage with index optimization
 */
export class LocalStorageWorkspaceRepository implements WorkspaceRepositoryPort {
  
  async save(workspace: WorkspaceEntity): Promise<RepositoryResult<WorkspaceEntity>> {
    try {
      // Serialize workspace to JSON
      const workspaceData = workspace.toJSON();
      const storageKey = `${STORAGE_KEYS.WORKSPACES}_${workspace.id}`;
      
      // Save workspace data
      localStorage.setItem(storageKey, JSON.stringify(workspaceData));
      
      // Update index for fast lookups
      await this.updateIndex(workspace);
      
      console.log(`[REPOSITORY] Saved workspace: ${workspace.name} (${workspace.id})`);
      
      return {
        success: true,
        data: workspace
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save workspace';
      console.error(`[REPOSITORY] Save failed:`, error);
      
      return {
        success: false,
        error: `LocalStorage save failed: ${errorMessage}`
      };
    }
  }

  async findById(id: string): Promise<RepositoryResult<WorkspaceEntity>> {
    if (!id.trim()) {
      return {
        success: false,
        error: 'Workspace ID is required'
      };
    }

    try {
      const storageKey = `${STORAGE_KEYS.WORKSPACES}_${id}`;
      const workspaceData = localStorage.getItem(storageKey);
      
      if (!workspaceData) {
        return {
          success: false,
          error: `Workspace with ID '${id}' not found`
        };
      }
      
      // Deserialize and reconstruct workspace
      const parsedData = JSON.parse(workspaceData);
      const workspace = WorkspaceEntity.fromJSON(parsedData);
      
      console.log(`[REPOSITORY] Found workspace: ${workspace.name} (${id})`);
      
      return {
        success: true,
        data: workspace
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load workspace';
      console.error(`[REPOSITORY] FindById failed:`, error);
      
      return {
        success: false,
        error: `LocalStorage load failed: ${errorMessage}`
      };
    }
  }

  async findByName(name: string): Promise<RepositoryResult<WorkspaceEntity>> {
    if (!name.trim()) {
      return {
        success: false,
        error: 'Workspace name is required'
      };
    }

    try {
      const index = this.getIndex();
      
      // Find workspace ID by name in index
      const workspaceId = Object.keys(index).find(id => 
        index[id].name.toLowerCase() === name.toLowerCase()
      );
      
      if (!workspaceId) {
        return {
          success: false,
          error: `Workspace with name '${name}' not found`
        };
      }
      
      // Load the actual workspace data
      return await this.findById(workspaceId);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to find workspace by name';
      console.error(`[REPOSITORY] FindByName failed:`, error);
      
      return {
        success: false,
        error: `Name lookup failed: ${errorMessage}`
      };
    }
  }

  async findByCriteria(criteria: WorkspaceSearchCriteria): Promise<RepositoryResult<WorkspaceEntity[]>> {
    try {
      const index = this.getIndex();
      const matchingIds: string[] = [];
      
      // Filter workspaces based on criteria
      for (const [id, metadata] of Object.entries(index)) {
        if (this.matchesCriteria(metadata, criteria)) {
          matchingIds.push(id);
        }
      }
      
      // Apply limit and offset
      const start = criteria.offset || 0;
      const end = criteria.limit ? start + criteria.limit : matchingIds.length;
      const paginatedIds = matchingIds.slice(start, end);
      
      // Load actual workspace entities
      const workspaces: WorkspaceEntity[] = [];
      for (const id of paginatedIds) {
        const result = await this.findById(id);
        if (result.success && result.data) {
          workspaces.push(result.data);
        }
      }
      
      console.log(`[REPOSITORY] Found ${workspaces.length} workspaces matching criteria`);
      
      return {
        success: true,
        data: workspaces
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search workspaces';
      console.error(`[REPOSITORY] FindByCriteria failed:`, error);
      
      return {
        success: false,
        error: `Search failed: ${errorMessage}`
      };
    }
  }

  async findAll(limit?: number): Promise<RepositoryResult<WorkspaceEntity[]>> {
    return await this.findByCriteria({ limit });
  }

  async update(workspace: WorkspaceEntity): Promise<RepositoryResult<WorkspaceEntity>> {
    // Check if workspace exists
    const exists = await this.exists(workspace.id);
    if (!exists) {
      return {
        success: false,
        error: `Workspace with ID '${workspace.id}' not found for update`
      };
    }
    
    // Update is the same as save for localStorage
    return await this.save(workspace);
  }

  async delete(id: string): Promise<RepositoryResult<void>> {
    if (!id.trim()) {
      return {
        success: false,
        error: 'Workspace ID is required for deletion'
      };
    }

    try {
      const storageKey = `${STORAGE_KEYS.WORKSPACES}_${id}`;
      
      // Check if workspace exists
      const exists = localStorage.getItem(storageKey) !== null;
      if (!exists) {
        return {
          success: false,
          error: `Workspace with ID '${id}' not found for deletion`
        };
      }
      
      // Remove workspace data
      localStorage.removeItem(storageKey);
      
      // Remove from index
      await this.removeFromIndex(id);
      
      console.log(`[REPOSITORY] Deleted workspace: ${id}`);
      
      return {
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete workspace';
      console.error(`[REPOSITORY] Delete failed:`, error);
      
      return {
        success: false,
        error: `Delete failed: ${errorMessage}`
      };
    }
  }

  async exists(id: string): Promise<boolean> {
    if (!id.trim()) {
      return false;
    }
    
    const storageKey = `${STORAGE_KEYS.WORKSPACES}_${id}`;
    return localStorage.getItem(storageKey) !== null;
  }

  async count(criteria?: Partial<WorkspaceSearchCriteria>): Promise<number> {
    if (!criteria) {
      // Count all workspaces
      const index = this.getIndex();
      return Object.keys(index).length;
    }
    
    // Count matching workspaces
    const result = await this.findByCriteria(criteria as WorkspaceSearchCriteria);
    return result.success ? result.data?.length || 0 : 0;
  }

  async clear(): Promise<RepositoryResult<void>> {
    try {
      // Get all workspace IDs from index
      const index = this.getIndex();
      const workspaceIds = Object.keys(index);
      
      // Remove all workspace data
      for (const id of workspaceIds) {
        const storageKey = `${STORAGE_KEYS.WORKSPACES}_${id}`;
        localStorage.removeItem(storageKey);
      }
      
      // Clear the index
      localStorage.removeItem(STORAGE_KEYS.WORKSPACE_INDEX);
      localStorage.removeItem(STORAGE_KEYS.WORKSPACE_METADATA);
      
      console.log(`[REPOSITORY] Cleared ${workspaceIds.length} workspaces`);
      
      return {
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear workspaces';
      console.error(`[REPOSITORY] Clear failed:`, error);
      
      return {
        success: false,
        error: `Clear failed: ${errorMessage}`
      };
    }
  }

  /**
   * Get workspace index for fast lookups
   */
  private getIndex(): WorkspaceIndex {
    try {
      const indexData = localStorage.getItem(STORAGE_KEYS.WORKSPACE_INDEX);
      return indexData ? JSON.parse(indexData) : {};
    } catch (error) {
      console.warn('[REPOSITORY] Failed to load workspace index, using empty index');
      return {};
    }
  }

  /**
   * Update workspace index with new/modified workspace
   */
  private async updateIndex(workspace: WorkspaceEntity): Promise<void> {
    try {
      const index = this.getIndex();
      const mutableIndex = index as MutableWorkspaceIndex;
      
      mutableIndex[workspace.id] = {
        name: workspace.name,
        createdAt: workspace.created,
        lastModified: new Date().toISOString(),
        tags: [] // TODO: Add tags support to WorkspaceEntity
      };
      
      localStorage.setItem(STORAGE_KEYS.WORKSPACE_INDEX, JSON.stringify(index));
      
    } catch (error) {
      console.warn('[REPOSITORY] Failed to update workspace index:', error);
    }
  }

  /**
   * Remove workspace from index
   */
  private async removeFromIndex(workspaceId: string): Promise<void> {
    try {
      const index = this.getIndex();
      const mutableIndex = index as MutableWorkspaceIndex;
      delete mutableIndex[workspaceId];
      localStorage.setItem(STORAGE_KEYS.WORKSPACE_INDEX, JSON.stringify(index));
      
    } catch (error) {
      console.warn('[REPOSITORY] Failed to remove from workspace index:', error);
    }
  }

  /**
   * Check if workspace metadata matches search criteria
   */
  private matchesCriteria(
    metadata: WorkspaceIndex[string], 
    criteria: WorkspaceSearchCriteria
  ): boolean {
    // Name filter
    if (criteria.name) {
      if (!metadata.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }
    }
    
    // Date filters
    const createdAt = new Date(metadata.createdAt);
    const lastModified = new Date(metadata.lastModified);
    
    if (criteria.createdAfter && createdAt < criteria.createdAfter) {
      return false;
    }
    
    if (criteria.createdBefore && createdAt > criteria.createdBefore) {
      return false;
    }
    
    if (criteria.lastModifiedAfter && lastModified < criteria.lastModifiedAfter) {
      return false;
    }
    
    // Tags filter
    if (criteria.tags && criteria.tags.length > 0) {
      const hasMatchingTag = criteria.tags.some(tag => 
        metadata.tags.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }
    
    return true;
  }
}
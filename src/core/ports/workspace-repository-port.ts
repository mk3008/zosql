/**
 * Workspace Repository Port
 * Hexagonal Architecture - Domain Layer Port Definition
 * Defines interface for workspace persistence without implementation details
 */

import { WorkspaceEntity } from '@core/entities/workspace';

/**
 * Repository operations result
 */
export interface RepositoryResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

/**
 * Workspace search criteria
 */
export interface WorkspaceSearchCriteria {
  readonly name?: string;
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly lastModifiedAfter?: Date;
  readonly tags?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Workspace Repository Port
 * Domain Layer interface - no implementation details
 */
export interface WorkspaceRepositoryPort {
  /**
   * Save workspace to persistent storage
   */
  save(workspace: WorkspaceEntity): Promise<RepositoryResult<WorkspaceEntity>>;

  /**
   * Find workspace by ID
   */
  findById(id: string): Promise<RepositoryResult<WorkspaceEntity>>;

  /**
   * Find workspace by name
   */
  findByName(name: string): Promise<RepositoryResult<WorkspaceEntity>>;

  /**
   * Find all workspaces matching criteria
   */
  findByCriteria(criteria: WorkspaceSearchCriteria): Promise<RepositoryResult<WorkspaceEntity[]>>;

  /**
   * Find all workspaces for a user
   */
  findAll(limit?: number): Promise<RepositoryResult<WorkspaceEntity[]>>;

  /**
   * Update existing workspace
   */
  update(workspace: WorkspaceEntity): Promise<RepositoryResult<WorkspaceEntity>>;

  /**
   * Delete workspace by ID
   */
  delete(id: string): Promise<RepositoryResult<void>>;

  /**
   * Check if workspace exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Get workspace count
   */
  count(criteria?: Partial<WorkspaceSearchCriteria>): Promise<number>;
}


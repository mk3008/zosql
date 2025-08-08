/**
 * Workspace Context utility functions  
 * Extracted for React Fast Refresh compatibility
 */

import * as Option from './option.js';
import * as Result from './result.js';
import type { WorkspaceEntity } from '@shared/types';

/**
 * Workspace loading states
 */
export type WorkspaceLoadingState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; workspace: WorkspaceEntity }
  | { status: 'error'; error: string };

/**
 * Workspace operations
 */
export interface WorkspaceOperation {
  type: 'create' | 'update' | 'delete' | 'load';
  workspaceId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Workspace context utilities
 */
export const WorkspaceContextUtils = {
  /**
   * Create initial loading state
   */
  createInitialState: (): WorkspaceLoadingState => ({ status: 'idle' }),

  /**
   * Create loading state
   */
  createLoadingState: (): WorkspaceLoadingState => ({ status: 'loading' }),

  /**
   * Create loaded state
   */
  createLoadedState: (workspace: WorkspaceEntity): WorkspaceLoadingState => ({
    status: 'loaded',
    workspace
  }),

  /**
   * Create error state
   */
  createErrorState: (error: string): WorkspaceLoadingState => ({
    status: 'error',
    error
  }),

  /**
   * Check if workspace is loaded
   */
  isLoaded: (state: WorkspaceLoadingState): state is { status: 'loaded'; workspace: WorkspaceEntity } =>
    state.status === 'loaded',

  /**
   * Check if workspace is loading
   */
  isLoading: (state: WorkspaceLoadingState): state is { status: 'loading' } =>
    state.status === 'loading',

  /**
   * Check if workspace has error
   */
  hasError: (state: WorkspaceLoadingState): state is { status: 'error'; error: string } =>
    state.status === 'error',

  /**
   * Get workspace from state
   */
  getWorkspace: (state: WorkspaceLoadingState): Option.Option<WorkspaceEntity> =>
    WorkspaceContextUtils.isLoaded(state) ? Option.some(state.workspace) : Option.none,

  /**
   * Get error from state
   */
  getError: (state: WorkspaceLoadingState): Option.Option<string> =>
    WorkspaceContextUtils.hasError(state) ? Option.some(state.error) : Option.none,

  /**
   * Create workspace operation
   */
  createOperation: (
    type: WorkspaceOperation['type'],
    workspaceId?: string,
    metadata?: Record<string, unknown>
  ): WorkspaceOperation => ({
    type,
    workspaceId,
    timestamp: new Date(),
    metadata
  }),

  /**
   * Validate workspace model
   */
  validateWorkspace: (workspace: unknown): Result.Result<WorkspaceEntity, string> => {
    if (!workspace || typeof workspace !== 'object') {
      return Result.err('Workspace must be an object');
    }

    const ws = workspace as Partial<WorkspaceEntity>;
    if (!ws.id || typeof ws.id !== 'string') {
      return Result.err('Workspace must have a valid id');
    }

    if (!ws.name || typeof ws.name !== 'string') {
      return Result.err('Workspace must have a valid name');
    }

    return Result.ok(workspace as WorkspaceEntity);
  },

  /**
   * Safe workspace loader
   */
  safeLoadWorkspace: async (
    loader: () => Promise<WorkspaceEntity>
  ): Promise<Result.Result<WorkspaceEntity, string>> => {
    try {
      const workspace = await loader();
      return WorkspaceContextUtils.validateWorkspace(workspace);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading workspace';
      return Result.err(errorMessage);
    }
  }
};

/**
 * Workspace error types
 */
export const WorkspaceErrors = {
  loadFailed: (reason: string) => new Error(`Failed to load workspace: ${reason}`),
  saveFailed: (reason: string) => new Error(`Failed to save workspace: ${reason}`),
  deleteFailed: (reason: string) => new Error(`Failed to delete workspace: ${reason}`),
  notFound: (id: string) => new Error(`Workspace not found: ${id}`),
  invalidFormat: (details: string) => new Error(`Invalid workspace format: ${details}`)
};
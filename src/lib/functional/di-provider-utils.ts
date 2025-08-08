/**
 * DI Provider utility functions
 * Extracted for React Fast Refresh compatibility
 */

import type { Container } from '../../core/di/Container.js';
import type { SqlExecutor } from '../../core/interfaces/SqlExecutor.js';
import type { WorkspaceRepository } from '../../core/interfaces/WorkspaceRepository.js';
import type { TabModelMap } from '../../types/TabModel.js';

/**
 * Type definitions for DI Provider utilities
 */
export interface DIBootstrapConfig {
  container: Container;
  options: Record<string, unknown>;
}

export interface DIProviderHelpers {
  sqlExecutor: SqlExecutor | null;
  workspaceRepository: WorkspaceRepository | null;
  tabModelMap: TabModelMap | null;
}

/**
 * Create default DI provider helpers
 */
export const createDIProviderHelpers = (): DIProviderHelpers => ({
  sqlExecutor: null,
  workspaceRepository: null,
  tabModelMap: null
});

/**
 * Bootstrap DI container with error handling
 */
export const bootstrapContainer = async (
  container: Container,
  options: Record<string, unknown>
): Promise<void> => {
  try {
    // Perform container bootstrap operations
    await container.bootstrap?.(options);
  } catch (error) {
    console.error('DI container bootstrap failed:', error);
    throw error;
  }
};

/**
 * Safely resolve service from container
 */
export const safeResolve = <T>(
  container: Container | null,
  serviceKey: string
): T | null => {
  try {
    if (!container) return null;
    return container.resolve<T>(serviceKey);
  } catch (error) {
    console.error(`Failed to resolve service '${serviceKey}':`, error);
    return null;
  }
};

/**
 * Check if container is ready for use
 */
export const isContainerReady = (container: Container | null): boolean => {
  return container !== null && typeof container.resolve === 'function';
};

/**
 * DI Provider error handling utilities
 */
export const DIProviderErrors = {
  containerNotFound: (serviceKey: string) => 
    new Error(`Container not available when resolving ${serviceKey}`),
    
  serviceNotFound: (serviceKey: string) =>
    new Error(`Service '${serviceKey}' not found in container`),
    
  bootstrapFailed: (error: unknown) =>
    new Error(`DI container bootstrap failed: ${error}`)
};
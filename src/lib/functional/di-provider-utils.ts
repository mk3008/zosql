/**
 * DI Provider utility functions
 * Extracted for React Fast Refresh compatibility
 */

import React from 'react';
import type { DIContainer } from '../../core/di/container.js';
import type { SqlExecutorPort } from '../../core/ports/sql-executor-port.js';
import type { WorkspaceRepositoryPort } from '../../core/ports/workspace-repository-port.js';

/**
 * Type definitions for DI Provider utilities
 */
export interface DIBootstrapConfig {
  container: DIContainer;
  options: Record<string, unknown>;
}

export interface DIProviderHelpers {
  sqlExecutor: SqlExecutorPort | null;
  workspaceRepository: WorkspaceRepositoryPort | null;
  tabModelMap: Record<string, unknown> | null;
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
 * DI Provider hook utilities
 */
export const DIHooks = {
  /**
   * Create DI container hook
   */
  createUseDI: <T>(context: React.Context<T | null>) => {
    return (): T => {
      const container = React.useContext(context);
      
      if (!container) {
        throw new Error(
          'useDI must be used within a DIProvider. ' +
          'Make sure your component is wrapped with <DIProvider>'
        );
      }
      
      return container;
    };
  }
};

/**
 * Extract services from DI container
 */
export const extractServicesFromContainer = (container: DIContainer | null): DIProviderHelpers => {
  if (!container) {
    return createDIProviderHelpers();
  }

  return {
    sqlExecutor: container.sqlExecutor || null,
    workspaceRepository: container.workspaceRepository || null,
    tabModelMap: null
  };
};

/**
 * Check if container has required services
 */
export const isDIContainerReady = (container: DIContainer | null): boolean => {
  return container !== null && !!container.sqlExecutor && !!container.workspaceRepository;
};

/**
 * DI Provider error handling utilities
 */
export const DIProviderErrors = {
  containerNotFound: (serviceKey: string) => 
    new Error(`DIContainer not available when resolving ${serviceKey}`),
    
  serviceNotFound: (serviceKey: string) =>
    new Error(`Service '${serviceKey}' not found in container`),
    
  bootstrapFailed: (error: unknown) =>
    new Error(`DI container bootstrap failed: ${error}`)
};

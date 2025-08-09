/**
 * Dependency Injection Container
 * Application Layer - Dependency injection configuration
 * Wires together domain and infrastructure layers following Hexagonal Architecture
 */

import { 
  WorkspaceRepositoryPort,
  SqlExecutorPort,
  FileStoragePort,
  SecureFileAccessPort
} from '@core/ports';
import { WorkspaceSerializationPort } from '@core/ports/workspace-serialization-port';
import { WorkspaceManagementUseCase } from '@core/usecases/workspace-management-usecase';

// Infrastructure adapters
import { LocalStorageWorkspaceRepository } from '@adapters/repositories/localStorage-workspace-repository';
import { PGliteSqlExecutor } from '@adapters/sql/pglite-sql-executor';
import { NodeFileStorageAdapter } from '@adapters/storage/node-file-storage-adapter';
import { SecureFileManagerAdapter } from '@adapters/storage/secure-file-manager-adapter';
import { JsonWorkspaceSerializationAdapter } from '@adapters/serialization/json-workspace-serialization-adapter';

/**
 * DI Container interface
 */
export interface DIContainer {
  // Ports (abstractions)
  readonly workspaceRepository: WorkspaceRepositoryPort;
  readonly sqlExecutor: SqlExecutorPort;
  readonly fileStorage: FileStoragePort;
  readonly secureFileAccess: SecureFileAccessPort;
  readonly workspaceSerialization: WorkspaceSerializationPort;
  
  // Use cases
  readonly workspaceManagement: WorkspaceManagementUseCase;
}

/**
 * Container configuration options
 */
export interface ContainerConfig {
  readonly environment: 'production' | 'development' | 'test';
  readonly baseDirectory?: string;
  readonly sessionContext?: {
    readonly sessionId: string;
    readonly userId?: string;
    readonly ipAddress?: string;
    readonly userAgent?: string;
  };
  readonly features?: {
    readonly enableFileOperations?: boolean;
    readonly enableBackups?: boolean;
    readonly enableSecurity?: boolean;
  };
}

/**
 * Container factory
 */
export class ContainerFactory {
  /**
   * Create production container with real implementations
   */
  static createProductionContainer(config: ContainerConfig): DIContainer {
    console.log(`[DI] Creating production container for ${config.environment} environment`);
    
    // Create infrastructure adapters
    const workspaceRepository = new LocalStorageWorkspaceRepository();
    const sqlExecutor = new PGliteSqlExecutor();
    const fileStorage = new NodeFileStorageAdapter(config.baseDirectory);
    const secureFileAccess = new SecureFileManagerAdapter(
      config.baseDirectory || process.cwd(),
      config.sessionContext
    );
    const workspaceSerialization = new JsonWorkspaceSerializationAdapter();
    
    // Create use cases with injected dependencies
    const workspaceManagement = new WorkspaceManagementUseCase(
      workspaceRepository,
      workspaceSerialization,
      secureFileAccess,
      null, // BackupRestorePort - TODO: implement BackupManagerAdapter
      null // SqlDecomposerUseCase - TODO: implement
    );
    
    const container: DIContainer = {
      // Ports
      workspaceRepository,
      sqlExecutor,
      fileStorage,
      secureFileAccess,
      workspaceSerialization,
      
      // Use cases
      workspaceManagement
    };
    
    console.log(`[DI] Container created with production adapters`);
    
    return Object.freeze(container);
  }
  
  /**
   * Create test container with mock implementations
   */
  static createTestContainer(_config: ContainerConfig): DIContainer {
    void _config; // Suppress ESLint warning
    console.log(`[DI] Creating test container`);
    
    // TODO: Create mock implementations for testing
    throw new Error('Test container not implemented yet');
  }
  
  /**
   * Create development container with debug features
   */
  static createDevelopmentContainer(config: ContainerConfig): DIContainer {
    console.log(`[DI] Creating development container with debug features`);
    
    // Start with production container
    const container = this.createProductionContainer(config);
    
    // Add development-specific decorators or logging
    // TODO: Add debug wrappers around adapters
    
    return container;
  }
}

/**
 * Global container instance (singleton)
 */
let globalContainer: DIContainer | null = null;

/**
 * Initialize global container
 */
export function initializeContainer(config: ContainerConfig): DIContainer {
  if (globalContainer) {
    console.warn('[DI] Container already initialized, replacing...');
  }
  
  switch (config.environment) {
    case 'production':
      globalContainer = ContainerFactory.createProductionContainer(config);
      break;
      
    case 'development':
      globalContainer = ContainerFactory.createDevelopmentContainer(config);
      break;
      
    case 'test':
      globalContainer = ContainerFactory.createTestContainer(config);
      break;
      
    default:
      throw new Error(`Unknown environment: ${config.environment}`);
  }
  
  return globalContainer;
}

/**
 * Get global container instance
 */
export function getContainer(): DIContainer {
  if (!globalContainer) {
    throw new Error('DI Container not initialized. Call initializeContainer() first.');
  }
  
  return globalContainer;
}

/**
 * Reset global container (mainly for testing)
 */
export function resetContainer(): void {
  globalContainer = null;
  console.log('[DI] Container reset');
}

/**
 * Service locator pattern helper (use sparingly)
 */
export class ServiceLocator {
  private static container: DIContainer | null = null;
  
  static initialize(container: DIContainer): void {
    this.container = container;
  }
  
  static get<K extends keyof DIContainer>(service: K): DIContainer[K] {
    if (!this.container) {
      throw new Error('ServiceLocator not initialized');
    }
    
    return this.container[service];
  }
  
  static reset(): void {
    this.container = null;
  }
}

/**
 * Decorator for dependency injection (experimental)
 */
export function inject<K extends keyof DIContainer>(service: K) {
  return function (target: unknown, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get() {
        return ServiceLocator.get(service);
      },
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * Hook for React components to access DI container
 */
export function useService<K extends keyof DIContainer>(service: K): DIContainer[K] {
  const container = getContainer();
  return container[service];
}

/**
 * Export all port interfaces for convenience
 */
export * from '@core/ports/workspace-repository-port';
export * from '@core/ports/sql-executor-port';
export * from '@core/ports/file-storage-port';
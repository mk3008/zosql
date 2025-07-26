/**
 * Application Bootstrap
 * Initializes Dependency Injection container and configures the application
 */

import { initializeContainer, ContainerConfig, DIContainer } from './container';
import { v4 as uuidv4 } from 'uuid';

/**
 * Application bootstrap options
 */
export interface BootstrapOptions {
  readonly environment?: 'production' | 'development' | 'test';
  readonly baseDirectory?: string;
  readonly enableDebugLogging?: boolean;
  readonly userId?: string;
}

/**
 * Bootstrap the application with dependency injection
 */
export async function bootstrapApplication(
  options: BootstrapOptions = {}
): Promise<DIContainer> {
  console.log('[BOOTSTRAP] Starting application bootstrap...');
  
  // Determine environment
  const environment = options.environment || 
    (process.env.NODE_ENV as 'production' | 'development' | 'test') || 
    'development';
  
  // Generate session context
  const sessionContext = {
    sessionId: uuidv4(),
    userId: options.userId,
    ipAddress: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js'
  };
  
  // Configure features based on environment
  const features = {
    enableFileOperations: environment !== 'test',
    enableBackups: environment === 'production',
    enableSecurity: true // Always enable security
  };
  
  // Create container configuration
  const config: ContainerConfig = {
    environment,
    baseDirectory: options.baseDirectory || process.cwd(),
    sessionContext,
    features
  };
  
  // Initialize DI container
  const container = initializeContainer(config);
  
  // Perform startup checks
  await performStartupChecks(container);
  
  // Configure debug logging if requested
  if (options.enableDebugLogging || environment === 'development') {
    enableDebugLogging(container);
  }
  
  console.log(`[BOOTSTRAP] Application bootstrap complete (${environment} mode)`);
  
  return container;
}

/**
 * Perform startup checks
 */
async function performStartupChecks(container: DIContainer): Promise<void> {
  console.log('[BOOTSTRAP] Running startup checks...');
  
  try {
    // Test database connection
    const testConnection = await container.sqlExecutor.testConnection({
      id: 'startup-test',
      name: 'Startup Test Connection',
      type: 'postgres',
      isConnected: false
    });
    
    if (!testConnection) {
      console.warn('[BOOTSTRAP] SQL executor connection test failed');
    } else {
      console.log('[BOOTSTRAP] SQL executor ready');
    }
    
    // Test workspace repository
    const workspaceCount = await container.workspaceRepository.count();
    console.log(`[BOOTSTRAP] Workspace repository ready (${workspaceCount} workspaces)`);
    
    // Test file storage (if enabled)
    const fileStorageReady = await testFileStorage(container);
    if (fileStorageReady) {
      console.log('[BOOTSTRAP] File storage ready');
    }
    
  } catch (error) {
    console.error('[BOOTSTRAP] Startup check failed:', error);
    // Don't throw - allow application to start with degraded functionality
  }
}

/**
 * Test file storage availability
 */
async function testFileStorage(container: DIContainer): Promise<boolean> {
  try {
    const testPath = await container.fileStorage.getTempFilePath('.test');
    const writeResult = await container.fileStorage.writeFile(testPath, 'test');
    
    if (writeResult.success) {
      await container.fileStorage.deleteFile(testPath);
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Enable debug logging for development
 */
function enableDebugLogging(_container: DIContainer): void {
  console.log('[BOOTSTRAP] Enabling debug logging...');
  
  // TODO: Wrap adapters with logging decorators
  // This would involve creating proxy objects that log method calls
  
  // For now, just log that debug mode is enabled
  console.log('[BOOTSTRAP] Debug logging enabled');
}

/**
 * Shutdown the application gracefully
 */
export async function shutdownApplication(container: DIContainer): Promise<void> {
  console.log('[BOOTSTRAP] Shutting down application...');
  
  try {
    // Clean up SQL executor connections
    if ('cleanup' in container.sqlExecutor) {
      await (container.sqlExecutor as any).cleanup();
    }
    
    // Clean up temporary files
    await container.fileStorage.cleanupTempFiles();
    
    console.log('[BOOTSTRAP] Application shutdown complete');
    
  } catch (error) {
    console.error('[BOOTSTRAP] Error during shutdown:', error);
  }
}

/**
 * React hook to bootstrap application on mount
 */
export function useBootstrap(options?: BootstrapOptions): {
  container: DIContainer | null;
  loading: boolean;
  error: Error | null;
} {
  const [container, setContainer] = React.useState(null as DIContainer | null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null as Error | null);
  
  React.useEffect(() => {
    let mounted = true;
    
    bootstrapApplication(options)
      .then(container => {
        if (mounted) {
          setContainer(container);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });
    
    return () => {
      mounted = false;
      if (container) {
        shutdownApplication(container).catch(console.error);
      }
    };
  }, []);
  
  return { container, loading, error };
}

// Import React only if available (for browser environment)
declare const React: any;
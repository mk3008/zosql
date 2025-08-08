/**
 * Dependency Injection Provider for React
 * Provides DI container access to React components via Context API
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DIContainer } from '@core/di/container';
import { bootstrapApplication, shutdownApplication, BootstrapOptions } from '@core/di/bootstrap';

/**
 * DI Context
 */
const DIContext = createContext<DIContainer | null>(null);

/**
 * DI Provider Props
 */
export interface DIProviderProps {
  readonly children: React.ReactNode;
  readonly options?: BootstrapOptions;
  readonly fallback?: React.ReactNode;
}

/**
 * DI Provider Component
 * Bootstraps the application and provides DI container to children
 */
export const DIProvider: React.FC<DIProviderProps> = ({ 
  children, 
  options,
  fallback = <div>Loading application...</div>
}) => {
  const [container, setContainer] = useState<DIContainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    // Bootstrap application
    bootstrapApplication(options)
      .then(container => {
        if (mounted) {
          setContainer(container);
          setLoading(false);
          console.log('[DIProvider] Application bootstrapped successfully');
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err);
          setLoading(false);
          console.error('[DIProvider] Bootstrap failed:', err);
        }
      });

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (container) {
        shutdownApplication(container).catch(console.error);
      }
    };
  }, []); // Empty deps - only run once

  // Show loading state
  if (loading) {
    return <>{fallback}</>;
  }

  // Show error state
  if (error) {
    return (
      <div className="error-container">
        <h2>Application Failed to Start</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>
          Reload Application
        </button>
      </div>
    );
  }

  // Provide container to children
  return (
    <DIContext.Provider value={container}>
      {children}
    </DIContext.Provider>
  );
};

/**
 * Hook to access DI container
 */
export function useDI(): DIContainer {
  const container = useContext(DIContext);
  
  if (!container) {
    throw new Error(
      'useDI must be used within a DIProvider. ' +
      'Make sure your component is wrapped with <DIProvider>'
    );
  }
  
  return container;
}

/**
 * Hook to access specific service from DI container
 */
export function useService<K extends keyof DIContainer>(
  service: K
): DIContainer[K] {
  const container = useDI();
  return container[service];
}

/**
 * Higher-order component to inject services
 */
export function withServices<
  P extends Record<string, unknown>,
  S extends Partial<Record<keyof DIContainer, boolean>>
>(
  Component: React.ComponentType<P & Pick<DIContainer, Extract<keyof S, keyof DIContainer>>>,
  services: S
): React.ComponentType<P> {
  return (props: P) => {
    const container = useDI();
    
    // Extract requested services with proper typing
    const injectedServices = {} as Pick<DIContainer, Extract<keyof S, keyof DIContainer>>;
    for (const [key, needed] of Object.entries(services)) {
      if (needed && key in container) {
        const serviceKey = key as Extract<keyof S, keyof DIContainer>;
        (injectedServices as unknown as Record<string, unknown>)[serviceKey] = container[serviceKey];
      }
    }
    
    // Merge props with proper type assertion
    const combinedProps = { ...props, ...injectedServices } as P & Pick<DIContainer, Extract<keyof S, keyof DIContainer>>;
    return <Component {...combinedProps} />;
  };
}

/**
 * Example usage in a component
 */
export const ExampleComponent: React.FC = () => {
  // Access entire container
  const _container = useDI();
  
  // Or access specific services
  const _workspaceRepo = useService('workspaceRepository');
  const _sqlExecutor = useService('sqlExecutor');
  
  // Suppress unused variable warnings
  void _container;
  void _workspaceRepo;
  void _sqlExecutor;
  
  // Use services...
  
  return <div>Example Component</div>;
};

/**
 * Example with HOC
 */
interface MyComponentProps extends Record<string, unknown> {
  title: string;
}

const MyComponent: React.FC<MyComponentProps & {
  workspaceRepository: DIContainer['workspaceRepository'];
  sqlExecutor: DIContainer['sqlExecutor'];
}> = ({ title }) => {
  // Component has access to injected services
  return <div>{title}</div>;
};

// Wrap component to inject services
export const MyComponentWithServices = withServices<
  MyComponentProps,
  { workspaceRepository: true; sqlExecutor: true }
>(MyComponent, {
  workspaceRepository: true,
  sqlExecutor: true
});
/**
 * Dependency Injection Provider for React
 * Provides DI container access to React components via Context API
 */

import React, { createContext, useEffect, useState } from 'react';
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
  }, [container, options]); // Include container and options as dependencies

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


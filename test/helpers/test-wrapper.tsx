/**
 * Test Helper - React Component Test Wrapper
 * 
 * This wrapper ensures all necessary Context Providers are available for component tests.
 * This prevents "must be used within a Provider" errors.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { WorkspaceProvider } from '../../src/ui/context/WorkspaceContext';
import { EditorProvider } from '../../src/ui/context/EditorContext';

interface TestWrapperProps {
  children: React.ReactNode;
}

/**
 * Standard test wrapper for React components that use Context providers
 * 
 * Usage:
 * ```typescript
 * import { renderWithProviders } from '../helpers/test-wrapper';
 * 
 * it('should render component', () => {
 *   renderWithProviders(<MyComponent />);
 * });
 * ```
 */
export const TestWrapper: React.FC<TestWrapperProps> = ({ children }) => {
  return (
    <WorkspaceProvider>
      <EditorProvider>
        {children}
      </EditorProvider>
    </WorkspaceProvider>
  );
};

/**
 * Convenience function for rendering components with all necessary providers
 */
// eslint-disable-next-line react-refresh/only-export-components
export const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  return render(ui, {
    wrapper: TestWrapper,
    ...options,
  });
};

/**
 * Test wrapper for components that need forceDemo prop (like Layout)
 */
export const TestWrapperWithDemo: React.FC<TestWrapperProps & { forceDemo?: boolean }> = ({ 
  children, 
  forceDemo = false 
}) => {
  return (
    <WorkspaceProvider>
      <EditorProvider>
        {React.cloneElement(children as React.ReactElement, { forceDemo })}
      </EditorProvider>
    </WorkspaceProvider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const renderWithProvidersAndDemo = (ui: React.ReactElement, forceDemo = false, options = {}) => {
  return render(
    <TestWrapperWithDemo forceDemo={forceDemo}>
      {ui}
    </TestWrapperWithDemo>,
    options
  );
};
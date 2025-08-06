/**
 * NewWorkspaceDialogContainer - Feature Flag Container
 * Switches between ViewModel (old) and Hooks (new) implementations
 * Provides gradual migration path with feature flags
 */

import React from 'react';
import { WorkspaceEntity } from '@core/entities/workspace';
import { isFeatureEnabled, FeatureFlag } from '@ui/utils/feature-flags';
import { NewWorkspaceDialog } from './NewWorkspaceDialog';
import { NewWorkspaceDialogV2 } from './NewWorkspaceDialogV2';

interface NewWorkspaceDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceCreated?: (workspace: WorkspaceEntity) => void;
}

/**
 * Container component that switches between old and new implementations
 * Based on feature flag configuration
 */
export const NewWorkspaceDialogContainer: React.FC<NewWorkspaceDialogContainerProps> = (props) => {
  // Check feature flag to determine which implementation to use
  const useHooksImplementation = isFeatureEnabled(FeatureFlag.USE_NEW_WORKSPACE_HOOK);
  
  if (useHooksImplementation) {
    // New functional implementation with hooks
    return <NewWorkspaceDialogV2 {...props} />;
  } else {
    // Legacy MVVM implementation
    return <NewWorkspaceDialog {...props} />;
  }
};

// Re-export for backward compatibility
export { NewWorkspaceDialogContainer as NewWorkspaceDialogSmart };
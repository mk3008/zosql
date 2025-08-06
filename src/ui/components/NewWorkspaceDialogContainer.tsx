/**
 * NewWorkspaceDialogContainer - Feature Flag Container
 * Switches between ViewModel (old) and Hooks (new) implementations
 * Provides gradual migration path with feature flags
 */

import React from 'react';
import { WorkspaceEntity } from '@core/entities/workspace';
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
  // Use the functional implementation directly
  return <NewWorkspaceDialogV2 {...props} />;
};

// Re-export for backward compatibility
export { NewWorkspaceDialogContainer as NewWorkspaceDialogSmart };
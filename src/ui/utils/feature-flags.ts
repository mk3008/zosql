/**
 * Feature Flags for gradual migration
 * Allows switching between old and new implementations
 */

/**
 * Feature flag names
 */
export enum FeatureFlag {
  USE_HOOKS_PATTERN = 'USE_HOOKS_PATTERN',
  USE_NEW_WORKSPACE_HOOK = 'USE_NEW_WORKSPACE_HOOK',
  USE_SQL_EDITOR_HOOK = 'USE_SQL_EDITOR_HOOK',
  USE_COMMAND_HOOKS = 'USE_COMMAND_HOOKS',
  USE_CONTEXT_STATE = 'USE_CONTEXT_STATE'
}

/**
 * Feature flag configuration
 * Can be configured via environment variables or runtime settings
 */
const featureFlags: Record<string, boolean> = {
  // Phase 1 flags - Start with new workspace hook enabled for testing
  [FeatureFlag.USE_HOOKS_PATTERN]: true,
  [FeatureFlag.USE_NEW_WORKSPACE_HOOK]: true,
  
  // Phase 2 flags - Not yet enabled
  [FeatureFlag.USE_SQL_EDITOR_HOOK]: false,
  [FeatureFlag.USE_COMMAND_HOOKS]: false,
  
  // Phase 3 flags - Not yet enabled
  [FeatureFlag.USE_CONTEXT_STATE]: false
};

/**
 * Check if a feature flag is enabled
 * @param flag - The feature flag to check
 * @returns true if the feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // Check environment variable first
  const envKey = `REACT_APP_FF_${flag}`;
  const envValue = process.env[envKey];
  
  if (envValue !== undefined) {
    return envValue === 'true';
  }
  
  // Fall back to configuration
  return featureFlags[flag] ?? false;
}

/**
 * Enable a feature flag (for testing purposes)
 * @param flag - The feature flag to enable
 */
export function enableFeature(flag: FeatureFlag): void {
  featureFlags[flag] = true;
}

/**
 * Disable a feature flag (for testing purposes)
 * @param flag - The feature flag to disable
 */
export function disableFeature(flag: FeatureFlag): void {
  featureFlags[flag] = false;
}

/**
 * Get all feature flag states
 * @returns Object with all feature flag states
 */
export function getAllFeatureFlags(): Record<string, boolean> {
  return { ...featureFlags };
}

/**
 * Reset all feature flags to default
 */
export function resetFeatureFlags(): void {
  featureFlags[FeatureFlag.USE_HOOKS_PATTERN] = false;
  featureFlags[FeatureFlag.USE_NEW_WORKSPACE_HOOK] = false;
  featureFlags[FeatureFlag.USE_SQL_EDITOR_HOOK] = false;
  featureFlags[FeatureFlag.USE_COMMAND_HOOKS] = false;
  featureFlags[FeatureFlag.USE_CONTEXT_STATE] = false;
}
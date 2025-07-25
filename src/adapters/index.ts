/**
 * Adapters Barrel Export
 * Infrastructure Layer - Concrete Implementations
 * Central export point for all adapter implementations
 */

// Repository adapters
export * from './repositories/localStorage-workspace-repository';

// SQL execution adapters
export * from './sql/pglite-sql-executor';

// Storage adapters
export * from './storage/node-file-storage-adapter';
export * from './storage/secure-file-manager-adapter';

// Serialization adapters
export * from './serialization/json-workspace-serialization-adapter';
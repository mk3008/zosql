/**
 * Ports Barrel Export
 * Hexagonal Architecture - Domain Layer Port Definitions
 * Central export point for all port interfaces
 */

// Repository ports
export * from './workspace-repository-port';

// SQL execution ports
export * from './sql-executor-port';

// File operation ports
export * from './file-storage-port';

// Serialization ports
export * from './workspace-serialization-port';

// Legacy ports (to be migrated)
export * from './workspace';
/**
 * Workspace Serialization Port
 * Hexagonal Architecture - Domain Layer Port Definition
 * Defines interface for workspace import/export operations without implementation details
 */

import { WorkspaceEntity } from '@core/entities/workspace';

/**
 * Workspace export format options
 */
export type ExportFormat = 'json' | 'yaml' | 'compressed';

/**
 * Workspace export options
 */
export interface WorkspaceExportOptions {
  readonly format: ExportFormat;
  readonly includeHistory?: boolean;
  readonly includeTestData?: boolean;
  readonly prettyPrint?: boolean;
  readonly compress?: boolean;
  readonly password?: string;
}

/**
 * Workspace import options
 */
export interface WorkspaceImportOptions {
  readonly overwriteExisting?: boolean;
  readonly validateStructure?: boolean;
  readonly password?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  readonly success: boolean;
  readonly data?: string | Buffer;
  readonly format: ExportFormat;
  readonly size: number;
  readonly error?: string;
  readonly metadata?: {
    readonly exportedAt: Date;
    readonly version: string;
    readonly checksum: string;
  };
}

/**
 * Import result
 */
export interface ImportResult {
  readonly success: boolean;
  readonly workspace?: WorkspaceEntity;
  readonly error?: string;
  readonly warnings?: readonly string[];
  readonly metadata?: {
    readonly importedAt: Date;
    readonly originalVersion?: string;
    readonly migrated?: boolean;
  };
}

/**
 * Validation result for import
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly metadata?: {
    readonly format: ExportFormat;
    readonly version?: string;
    readonly workspaceName?: string;
    readonly exportDate?: Date;
  };
}

/**
 * Workspace Serialization Port
 * Domain Layer interface - no implementation details for serialization format
 */
export interface WorkspaceSerializationPort {
  /**
   * Export workspace to specified format
   */
  exportWorkspace(
    workspace: WorkspaceEntity,
    options: WorkspaceExportOptions
  ): Promise<ExportResult>;

  /**
   * Import workspace from serialized data
   */
  importWorkspace(
    data: string | Buffer,
    options: WorkspaceImportOptions
  ): Promise<ImportResult>;

  /**
   * Validate serialized workspace data before import
   */
  validateImportData(
    data: string | Buffer
  ): Promise<ValidationResult>;

  /**
   * Export multiple workspaces as batch
   */
  exportBatch(
    workspaces: readonly WorkspaceEntity[],
    options: WorkspaceExportOptions
  ): Promise<ExportResult>;

  /**
   * Import multiple workspaces from batch data
   */
  importBatch(
    data: string | Buffer,
    options: WorkspaceImportOptions
  ): Promise<{
    readonly success: boolean;
    readonly workspaces: readonly WorkspaceEntity[];
    readonly failures: readonly { 
      readonly index: number; 
      readonly error: string; 
    }[];
  }>;

  /**
   * Get supported export formats
   */
  getSupportedFormats(): readonly ExportFormat[];

  /**
   * Get current serialization schema version
   */
  getSchemaVersion(): string;

  /**
   * Migrate old format data to current schema
   */
  migrateData(
    data: unknown,
    fromVersion: string
  ): Promise<{
    readonly success: boolean;
    readonly migratedData?: unknown;
    readonly error?: string;
  }>;
}
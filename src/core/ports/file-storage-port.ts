/**
 * File Storage Port
 * Hexagonal Architecture - Domain Layer Port Definition
 * Defines interface for file operations without implementation details
 */

/**
 * File metadata information
 */
export interface FileMetadata {
  readonly name: string;
  readonly path: string;
  readonly size: number;
  readonly createdAt: Date;
  readonly modifiedAt: Date;
  readonly type: string;
  readonly isDirectory: boolean;
}

/**
 * File operation result
 */
export interface FileOperationResult<T = void> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

/**
 * File listing options
 */
export interface FileListingOptions {
  readonly recursive?: boolean;
  readonly includeHidden?: boolean;
  readonly extensions?: readonly string[];
  readonly maxDepth?: number;
  readonly sortBy?: 'name' | 'date' | 'size';
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * File Storage Port
 * Domain Layer interface - no file system implementation details
 */
export interface FileStoragePort {
  /**
   * Read file content as string
   */
  readFile(filePath: string): Promise<FileOperationResult<string>>;

  /**
   * Write content to file
   */
  writeFile(filePath: string, content: string): Promise<FileOperationResult<void>>;

  /**
   * Check if file exists
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  getFileMetadata(filePath: string): Promise<FileOperationResult<FileMetadata>>;

  /**
   * List files in directory
   */
  listFiles(
    directoryPath: string, 
    options?: FileListingOptions
  ): Promise<FileOperationResult<readonly FileMetadata[]>>;

  /**
   * Create directory
   */
  createDirectory(directoryPath: string): Promise<FileOperationResult<void>>;

  /**
   * Delete file
   */
  deleteFile(filePath: string): Promise<FileOperationResult<void>>;

  /**
   * Delete directory
   */
  deleteDirectory(directoryPath: string, recursive?: boolean): Promise<FileOperationResult<void>>;

  /**
   * Move/rename file
   */
  moveFile(fromPath: string, toPath: string): Promise<FileOperationResult<void>>;

  /**
   * Copy file
   */
  copyFile(fromPath: string, toPath: string): Promise<FileOperationResult<void>>;

  /**
   * Get temporary file path
   */
  getTempFilePath(extension?: string): Promise<string>;

  /**
   * Clean up temporary files
   */
  cleanupTempFiles(): Promise<void>;
}

/**
 * Secure File Access Port
 * Domain Layer interface for security-validated file operations
 */
export interface SecureFileAccessPort extends FileStoragePort {
  /**
   * Validate file path for security
   */
  validateFilePath(filePath: string): Promise<{
    isValid: boolean;
    errors: readonly string[];
    normalizedPath?: string;
  }>;

  /**
   * Get allowed file extensions
   */
  getAllowedExtensions(): readonly string[];

  /**
   * Get allowed base directories
   */
  getAllowedDirectories(): readonly string[];

  /**
   * Create secure file path within allowed directory
   */
  createSecurePath(fileName: string, baseDirectory: string): Promise<FileOperationResult<string>>;
}

/**
 * File access permission configuration
 */
export interface FileAccessPermission {
  readonly role: 'viewer' | 'editor' | 'admin';
  readonly allowRead: boolean;
  readonly allowWrite: boolean;
  readonly allowDelete: boolean;
  readonly fileTypes?: readonly string[];
  readonly confirmed?: boolean;
}

/**
 * File access result with security context
 */
export interface FileAccessResult<T = void> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly deniedReason?: string;
  readonly metadata?: {
    readonly readAt?: Date;
    readonly writtenAt?: Date;
    readonly deletedAt?: Date;
    readonly size?: number;
    readonly executionTime?: number;
  };
}

/**
 * File access audit log entry
 */
export interface FileAccessAuditLog {
  readonly filePath: string;
  readonly operation: 'read' | 'write' | 'delete';
  readonly timestamp: Date;
  readonly success: boolean;
  readonly errorReason?: string;
}

/**
 * Secure File Access Port
 * Enhanced file operations with permission checking and audit logging
 */
export interface SecureFileAccessPort {
  /**
   * Read file with permission validation
   */
  readSecure(
    filePath: string, 
    permission: FileAccessPermission
  ): Promise<FileAccessResult<string>>;

  /**
   * Write file with permission validation
   */
  writeSecure(
    filePath: string, 
    content: string, 
    permission: FileAccessPermission
  ): Promise<FileAccessResult<void>>;

  /**
   * Delete file with permission validation
   */
  deleteSecure(
    filePath: string, 
    permission: FileAccessPermission
  ): Promise<FileAccessResult<void>>;

  /**
   * Validate access permissions
   */
  validateAccess(
    filePath: string, 
    permission: FileAccessPermission
  ): Promise<{
    allowed: boolean;
    reason?: string;
    restrictions?: string[];
  }>;

  /**
   * Get audit logs
   */
  getAuditLogs(
    filter?: {
      startDate?: Date;
      endDate?: Date;
      operation?: 'read' | 'write' | 'delete';
      success?: boolean;
    }
  ): Promise<FileAccessAuditLog[]>;
}

/**
 * Backup and Restore Port
 * Domain Layer interface for data backup operations
 */
export interface BackupRestorePort {
  /**
   * Create backup of workspace data
   */
  createBackup(
    workspaceId: string,
    data: unknown,
    options?: {
      compress?: boolean;
      encrypt?: boolean;
      includeHistory?: boolean;
    }
  ): Promise<FileOperationResult<string>>;

  /**
   * Restore workspace from backup
   */
  restoreFromBackup(
    backupPath: string,
    options?: {
      validateIntegrity?: boolean;
      createNew?: boolean;
    }
  ): Promise<FileOperationResult<unknown>>;

  /**
   * List available backups
   */
  listBackups(workspaceId?: string): Promise<FileOperationResult<readonly {
    id: string;
    workspaceId: string;
    createdAt: Date;
    size: number;
    path: string;
  }[]>>;

  /**
   * Delete backup
   */
  deleteBackup(backupId: string): Promise<FileOperationResult<void>>;

  /**
   * Verify backup integrity
   */
  verifyBackup(backupPath: string): Promise<FileOperationResult<boolean>>;
}
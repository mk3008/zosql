/**
 * Secure File Manager Adapter
 * Infrastructure Layer - Secure file access implementation
 * Concrete adapter implementing security-focused file operations with audit logging
 */

import { 
  SecureFileAccessPort, 
  FileAccessPermission,
  FileAccessResult,
  FileAccessAuditLog,
  FileOperationResult,
  FileMetadata,
  FileListingOptions
} from '@core/ports/file-storage-port';
import { SecureFileManager } from '@core/security/secure-file-manager';
import { NodeFileStorageAdapter } from './node-file-storage-adapter';

/**
 * Audit log entry structure
 */
interface AuditLogEntry extends FileAccessAuditLog {
  readonly sessionId: string;
  readonly userId?: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

/**
 * Permission cache entry
 */
interface PermissionCacheEntry {
  readonly permission: FileAccessPermission;
  readonly expiresAt: Date;
  readonly checksum?: string;
}

/**
 * Secure file access implementation with comprehensive security features
 * Provides path validation, permission management, and audit logging
 */
export class SecureFileManagerAdapter implements SecureFileAccessPort {
  private readonly secureFileManager = new SecureFileManager();
  private readonly fileStorage: NodeFileStorageAdapter;
  private readonly auditLogs: AuditLogEntry[] = [];
  private readonly permissionCache = new Map<string, PermissionCacheEntry>();
  
  /**
   * Maximum audit log entries to retain in memory
   */
  private readonly MAX_AUDIT_LOGS = 10000;
  
  /**
   * Permission cache TTL in milliseconds
   */
  private readonly PERMISSION_CACHE_TTL = 300000; // 5 minutes

  constructor(
    baseDirectory: string,
    private readonly sessionContext?: {
      sessionId: string;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ) {
    this.fileStorage = new NodeFileStorageAdapter(baseDirectory);
    console.log(`[SECURE-FILE] Initialized with enhanced security features`);
  }

  async readSecure(
    filePath: string, 
    permission: FileAccessPermission
  ): Promise<FileAccessResult<string>> {
    const startTime = performance.now();
    
    try {
      // Validate permission
      const permissionCheck = await this.validatePermission(filePath, permission, 'read');
      if (!permissionCheck.allowed) {
        await this.logAccess(filePath, 'read', false, permissionCheck.reason);
        return {
          success: false,
          error: `Permission denied: ${permissionCheck.reason}`,
          deniedReason: permissionCheck.reason
        };
      }

      // Path security validation
      const pathValidation = this.secureFileManager.validatePath(filePath);
      if (!pathValidation.isValid) {
        await this.logAccess(filePath, 'read', false, pathValidation.errors.map(e => e.message).join(', '));
        return {
          success: false,
          error: `Path validation failed: ${pathValidation.errors.map(e => e.message).join(', ')}`,
          deniedReason: 'invalid_path'
        };
      }

      // Perform read operation
      const result = await this.fileStorage.readFile(filePath);
      
      if (result.success) {
        await this.logAccess(filePath, 'read', true);
        
        return {
          success: true,
          data: result.data!,
          metadata: {
            readAt: new Date(),
            size: result.data!.length,
            executionTime: Math.round(performance.now() - startTime)
          }
        };
      } else {
        await this.logAccess(filePath, 'read', false, result.error);
        return {
          success: false,
          error: result.error || 'Read operation failed'
        };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
      await this.logAccess(filePath, 'read', false, errorMessage);
      
      return {
        success: false,
        error: `Secure read failed: ${errorMessage}`
      };
    }
  }

  async writeSecure(
    filePath: string, 
    content: string, 
    permission: FileAccessPermission
  ): Promise<FileAccessResult<void>> {
    const startTime = performance.now();
    
    try {
      // Validate permission
      const permissionCheck = await this.validatePermission(filePath, permission, 'write');
      if (!permissionCheck.allowed) {
        await this.logAccess(filePath, 'write', false, permissionCheck.reason);
        return {
          success: false,
          error: `Permission denied: ${permissionCheck.reason}`,
          deniedReason: permissionCheck.reason
        };
      }

      // Path security validation
      const pathValidation = this.secureFileManager.validatePath(filePath);
      if (!pathValidation.isValid) {
        await this.logAccess(filePath, 'write', false, pathValidation.errors.map(e => e.message).join(', '));
        return {
          success: false,
          error: `Path validation failed: ${pathValidation.errors.map(e => e.message).join(', ')}`,
          deniedReason: 'invalid_path'
        };
      }

      // Content security validation
      const writeValidation = this.secureFileManager.validateFileWrite(filePath, content);
      if (!writeValidation.isValid) {
        await this.logAccess(filePath, 'write', false, writeValidation.errors.map(e => e.message).join(', '));
        return {
          success: false,
          error: `Content validation failed: ${writeValidation.errors.map(e => e.message).join(', ')}`,
          deniedReason: 'invalid_content'
        };
      }

      // Perform write operation
      const result = await this.fileStorage.writeFile(filePath, content);
      
      if (result.success) {
        await this.logAccess(filePath, 'write', true);
        
        // Invalidate permission cache for this file
        this.invalidatePermissionCache(filePath);
        
        return {
          success: true,
          metadata: {
            writtenAt: new Date(),
            size: content.length,
            executionTime: Math.round(performance.now() - startTime)
          }
        };
      } else {
        await this.logAccess(filePath, 'write', false, result.error);
        return {
          success: false,
          error: result.error || 'Write operation failed'
        };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
      await this.logAccess(filePath, 'write', false, errorMessage);
      
      return {
        success: false,
        error: `Secure write failed: ${errorMessage}`
      };
    }
  }

  async deleteSecure(
    filePath: string, 
    permission: FileAccessPermission
  ): Promise<FileAccessResult<void>> {
    const startTime = performance.now();
    
    try {
      // Validate permission with stricter checks for delete
      const permissionCheck = await this.validatePermission(filePath, permission, 'delete');
      if (!permissionCheck.allowed) {
        await this.logAccess(filePath, 'delete', false, permissionCheck.reason);
        return {
          success: false,
          error: `Permission denied: ${permissionCheck.reason}`,
          deniedReason: permissionCheck.reason
        };
      }

      // Additional confirmation for admin operations
      if (permission.role === 'admin' && !permission.confirmed) {
        await this.logAccess(filePath, 'delete', false, 'confirmation_required');
        return {
          success: false,
          error: 'Delete operation requires confirmation',
          deniedReason: 'confirmation_required'
        };
      }

      // Path security validation
      const pathValidation = this.secureFileManager.validatePath(filePath);
      if (!pathValidation.isValid) {
        await this.logAccess(filePath, 'delete', false, pathValidation.errors.map(e => e.message).join(', '));
        return {
          success: false,
          error: `Path validation failed: ${pathValidation.errors.map(e => e.message).join(', ')}`,
          deniedReason: 'invalid_path'
        };
      }

      // Perform delete operation
      const result = await this.fileStorage.deleteFile(filePath);
      
      if (result.success) {
        await this.logAccess(filePath, 'delete', true);
        
        // Invalidate permission cache
        this.invalidatePermissionCache(filePath);
        
        return {
          success: true,
          metadata: {
            deletedAt: new Date(),
            executionTime: Math.round(performance.now() - startTime)
          }
        };
      } else {
        await this.logAccess(filePath, 'delete', false, result.error);
        return {
          success: false,
          error: result.error || 'Delete operation failed'
        };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error';
      await this.logAccess(filePath, 'delete', false, errorMessage);
      
      return {
        success: false,
        error: `Secure delete failed: ${errorMessage}`
      };
    }
  }

  async validateAccess(
    filePath: string, 
    permission: FileAccessPermission
  ): Promise<{
    allowed: boolean;
    reason?: string;
    restrictions?: string[];
  }> {
    try {
      // Check cache first
      const cachedPermission = this.getPermissionFromCache(filePath);
      if (cachedPermission && this.isPermissionSufficient(cachedPermission, permission)) {
        return { allowed: true };
      }

      // Path validation
      const pathValidation = this.secureFileManager.validatePath(filePath);
      if (!pathValidation.isValid) {
        return {
          allowed: false,
          reason: pathValidation.errors.map(e => e.message).join(', ') || 'Invalid path',
          restrictions: ['path_traversal_detected']
        };
      }

      // Role-based access control
      const roleCheck = this.checkRolePermissions(filePath, permission);
      if (!roleCheck.allowed) {
        return roleCheck;
      }

      // File type restrictions
      const typeCheck = this.checkFileTypeRestrictions(filePath, permission);
      if (!typeCheck.allowed) {
        return typeCheck;
      }

      // Cache the permission
      this.cachePermission(filePath, permission);

      return { allowed: true };

    } catch (error) {
      console.error(`[SECURE-FILE] Access validation error:`, error);
      return {
        allowed: false,
        reason: 'Validation error occurred'
      };
    }
  }

  async getAuditLogs(
    filter?: {
      startDate?: Date;
      endDate?: Date;
      operation?: 'read' | 'write' | 'delete';
      success?: boolean;
    }
  ): Promise<FileAccessAuditLog[]> {
    let logs = [...this.auditLogs];

    if (filter) {
      if (filter.startDate) {
        logs = logs.filter(log => log.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        logs = logs.filter(log => log.timestamp <= filter.endDate!);
      }
      if (filter.operation) {
        logs = logs.filter(log => log.operation === filter.operation);
      }
      if (filter.success !== undefined) {
        logs = logs.filter(log => log.success === filter.success);
      }
    }

    // Return without sensitive session data
    return logs.map(log => ({
      filePath: log.filePath,
      operation: log.operation,
      timestamp: log.timestamp,
      success: log.success,
      errorReason: log.errorReason
    }));
  }

  /**
   * Validate permission for specific operation
   */
  private async validatePermission(
    filePath: string,
    permission: FileAccessPermission,
    operation: 'read' | 'write' | 'delete'
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Basic validation
    const basicCheck = await this.validateAccess(filePath, permission);
    if (!basicCheck.allowed) {
      return basicCheck;
    }

    // Operation-specific checks
    switch (operation) {
      case 'read':
        return { allowed: permission.allowRead !== false };
        
      case 'write':
        if (permission.allowWrite === false) {
          return { allowed: false, reason: 'Write not allowed' };
        }
        if (permission.role === 'viewer') {
          return { allowed: false, reason: 'Viewers cannot write' };
        }
        return { allowed: true };
        
      case 'delete':
        if (permission.allowDelete === false) {
          return { allowed: false, reason: 'Delete not allowed' };
        }
        if (permission.role !== 'admin') {
          return { allowed: false, reason: 'Only admins can delete' };
        }
        return { allowed: true };
        
      default:
        return { allowed: false, reason: 'Unknown operation' };
    }
  }

  /**
   * Check role-based permissions
   */
  private checkRolePermissions(
    filePath: string,
    permission: FileAccessPermission
  ): { allowed: boolean; reason?: string; restrictions?: string[] } {
    const restrictions: string[] = [];

    // Check path patterns based on role
    switch (permission.role) {
      case 'viewer':
        if (filePath.includes('/admin/') || filePath.includes('/system/')) {
          return {
            allowed: false,
            reason: 'Viewers cannot access admin/system files',
            restrictions: ['admin_path', 'system_path']
          };
        }
        break;
        
      case 'editor':
        if (filePath.includes('/system/')) {
          return {
            allowed: false,
            reason: 'Editors cannot access system files',
            restrictions: ['system_path']
          };
        }
        break;
        
      case 'admin':
        // Admins have access to all paths
        break;
    }

    return { allowed: true, restrictions };
  }

  /**
   * Check file type restrictions
   */
  private checkFileTypeRestrictions(
    filePath: string,
    permission: FileAccessPermission
  ): { allowed: boolean; reason?: string; restrictions?: string[] } {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    // Block executable files for non-admins
    const executableExtensions = ['exe', 'bat', 'sh', 'cmd', 'com'];
    if (extension && executableExtensions.includes(extension) && permission.role !== 'admin') {
      return {
        allowed: false,
        reason: 'Executable files require admin permission',
        restrictions: ['executable_file']
      };
    }

    // Apply file type restrictions if specified
    if (permission.fileTypes && permission.fileTypes.length > 0) {
      if (!extension || !permission.fileTypes.includes(extension)) {
        return {
          allowed: false,
          reason: `File type '${extension}' not in allowed list`,
          restrictions: ['file_type_restriction']
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Log file access attempt
   */
  private async logAccess(
    filePath: string,
    operation: 'read' | 'write' | 'delete',
    success: boolean,
    errorReason?: string
  ): Promise<void> {
    const logEntry: AuditLogEntry = {
      filePath,
      operation,
      timestamp: new Date(),
      success,
      errorReason,
      sessionId: this.sessionContext?.sessionId || 'unknown',
      userId: this.sessionContext?.userId,
      ipAddress: this.sessionContext?.ipAddress,
      userAgent: this.sessionContext?.userAgent
    };

    this.auditLogs.push(logEntry);

    // Rotate logs if needed
    if (this.auditLogs.length > this.MAX_AUDIT_LOGS) {
      this.auditLogs.splice(0, this.auditLogs.length - this.MAX_AUDIT_LOGS);
    }

    // Log significant events
    if (!success) {
      console.warn(`[SECURE-FILE] Access denied: ${operation} ${filePath} - ${errorReason}`);
    } else if (operation === 'delete') {
      console.info(`[SECURE-FILE] File deleted: ${filePath}`);
    }
  }

  /**
   * Cache permission for performance
   */
  private cachePermission(filePath: string, permission: FileAccessPermission): void {
    const cacheEntry: PermissionCacheEntry = {
      permission,
      expiresAt: new Date(Date.now() + this.PERMISSION_CACHE_TTL)
    };
    
    this.permissionCache.set(filePath, cacheEntry);
  }

  /**
   * Get permission from cache if valid
   */
  private getPermissionFromCache(filePath: string): FileAccessPermission | null {
    const cached = this.permissionCache.get(filePath);
    
    if (!cached || cached.expiresAt < new Date()) {
      this.permissionCache.delete(filePath);
      return null;
    }
    
    return cached.permission;
  }

  /**
   * Check if cached permission is sufficient for requested permission
   */
  private isPermissionSufficient(
    cached: FileAccessPermission,
    requested: FileAccessPermission
  ): boolean {
    // Role hierarchy check
    const roleHierarchy = { viewer: 0, editor: 1, admin: 2 };
    if (roleHierarchy[cached.role] < roleHierarchy[requested.role]) {
      return false;
    }

    // Permission flags check
    if (requested.allowRead && cached.allowRead === false) return false;
    if (requested.allowWrite && cached.allowWrite === false) return false;
    if (requested.allowDelete && cached.allowDelete === false) return false;

    return true;
  }

  /**
   * Invalidate permission cache for a file
   */
  private invalidatePermissionCache(filePath: string): void {
    this.permissionCache.delete(filePath);
    
    // Also invalidate parent directory permissions
    const parentDir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (parentDir) {
      this.permissionCache.delete(parentDir);
    }
  }

  // Implementing FileStoragePort methods by delegating to fileStorage
  async readFile(filePath: string): Promise<FileOperationResult<string>> {
    return this.fileStorage.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<FileOperationResult<void>> {
    return this.fileStorage.writeFile(filePath, content);
  }

  async fileExists(filePath: string): Promise<boolean> {
    return this.fileStorage.fileExists(filePath);
  }

  async getFileMetadata(filePath: string): Promise<FileOperationResult<FileMetadata>> {
    return this.fileStorage.getFileMetadata(filePath);
  }

  async listFiles(directoryPath: string, options?: FileListingOptions): Promise<FileOperationResult<readonly FileMetadata[]>> {
    return this.fileStorage.listFiles(directoryPath, options);
  }

  async createDirectory(directoryPath: string): Promise<FileOperationResult<void>> {
    return this.fileStorage.createDirectory(directoryPath);
  }

  async deleteFile(filePath: string): Promise<FileOperationResult<void>> {
    return this.fileStorage.deleteFile(filePath);
  }

  async deleteDirectory(directoryPath: string, recursive?: boolean): Promise<FileOperationResult<void>> {
    return this.fileStorage.deleteDirectory(directoryPath, recursive);
  }

  async moveFile(fromPath: string, toPath: string): Promise<FileOperationResult<void>> {
    return this.fileStorage.moveFile(fromPath, toPath);
  }

  async copyFile(fromPath: string, toPath: string): Promise<FileOperationResult<void>> {
    return this.fileStorage.copyFile(fromPath, toPath);
  }

  async getTempFilePath(extension?: string): Promise<string> {
    return this.fileStorage.getTempFilePath(extension);
  }

  async cleanupTempFiles(): Promise<void> {
    return this.fileStorage.cleanupTempFiles();
  }

  // Additional SecureFileAccessPort methods
  async validateFilePath(filePath: string): Promise<{
    isValid: boolean;
    errors: readonly string[];
    normalizedPath?: string;
  }> {
    const validation = this.secureFileManager.validatePath(filePath);
    return {
      isValid: validation.isValid,
      errors: validation.errors.map(e => e.message),
      normalizedPath: validation.isValid ? filePath : undefined
    };
  }

  getAllowedExtensions(): readonly string[] {
    return ['.sql', '.json', '.txt', '.md', '.csv'];
  }

  getAllowedDirectories(): readonly string[] {
    return ['./workspaces', './tmp', './backups'];
  }

  async createSecurePath(fileName: string, baseDirectory: string): Promise<FileOperationResult<string>> {
    try {
      const validation = this.secureFileManager.validatePath(baseDirectory);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid base directory: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      const securePath = `${baseDirectory}/${fileName}`;
      const pathValidation = this.secureFileManager.validatePath(securePath);
      
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid secure path: ${pathValidation.errors.map(e => e.message).join(', ')}`
        };
      }

      return {
        success: true,
        data: securePath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create secure path'
      };
    }
  }
}
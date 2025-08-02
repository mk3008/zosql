/**
 * Secure File Manager
 * Domain Layer - Security Component for safe file operations
 * Prevents path traversal attacks and ensures file access within allowed boundaries
 */

import * as path from 'path';

/**
 * Security error for file operation violations
 */
export class FileSecurityError extends Error {
  constructor(
    message: string,
    public readonly code: 'PATH_TRAVERSAL' | 'UNAUTHORIZED_ACCESS' | 'INVALID_PATH' | 'FILE_NOT_ALLOWED',
    public readonly attemptedPath?: string
  ) {
    super(message);
    this.name = 'FileSecurityError';
  }
}

/**
 * Configuration for secure file operations
 */
export interface SecureFileConfig {
  readonly allowedBasePaths: readonly string[];
  readonly allowedExtensions: readonly string[];
  readonly maxFileSize: number;
  readonly maxPathLength: number;
  readonly allowSymlinks: boolean;
  readonly caseSensitive: boolean;
}

/**
 * Default secure file configuration for zosql
 */
export const DEFAULT_FILE_CONFIG: SecureFileConfig = {
  allowedBasePaths: [
    path.resolve(process.cwd(), 'zosql', 'resources'),
    path.resolve(process.cwd(), 'zosql', 'workspaces'),
    path.resolve(process.cwd(), 'zosql', 'temp')
  ],
  allowedExtensions: ['.sql', '.json', '.md', '.txt', '.csv'],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxPathLength: 4096,
  allowSymlinks: false,
  caseSensitive: process.platform !== 'win32'
};

/**
 * File validation result
 */
export interface FileValidationResult {
  readonly isValid: boolean;
  readonly resolvedPath: string;
  readonly errors: readonly FileSecurityError[];
  readonly warnings: readonly string[];
}

/**
 * Secure File Manager
 * Provides safe file operations with security validation
 */
export class SecureFileManager {
  private readonly config: SecureFileConfig;
  private readonly normalizedBasePaths: readonly string[];

  constructor(config: Partial<SecureFileConfig> = {}) {
    this.config = { ...DEFAULT_FILE_CONFIG, ...config };
    
    // Normalize and resolve all base paths
    this.normalizedBasePaths = this.config.allowedBasePaths.map(basePath => 
      this.normalizePath(path.resolve(basePath))
    );
  }

  /**
   * Validate and resolve a file path securely
   */
  validatePath(filePath: string): FileValidationResult {
    const errors: FileSecurityError[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!filePath || typeof filePath !== 'string') {
      errors.push(new FileSecurityError(
        'File path must be a non-empty string',
        'INVALID_PATH',
        filePath
      ));
      return { isValid: false, resolvedPath: '', errors, warnings };
    }

    // Length validation
    if (filePath.length > this.config.maxPathLength) {
      errors.push(new FileSecurityError(
        `File path exceeds maximum length of ${this.config.maxPathLength} characters`,
        'INVALID_PATH',
        filePath
      ));
    }

    // Normalize the path
    const normalizedPath = this.normalizePath(filePath);
    
    // Check for suspicious characters
    if (this.containsSuspiciousCharacters(normalizedPath)) {
      errors.push(new FileSecurityError(
        'File path contains suspicious characters',
        'INVALID_PATH',
        filePath
      ));
    }

    // Resolve the path
    let resolvedPath: string;
    try {
      resolvedPath = this.resolvePath(normalizedPath);
    } catch (error) {
      errors.push(new FileSecurityError(
        'Failed to resolve file path',
        'INVALID_PATH',
        filePath
      ));
      return { isValid: false, resolvedPath: '', errors, warnings };
    }

    // Check if path is within allowed base paths
    if (!this.isPathAllowed(resolvedPath)) {
      errors.push(new FileSecurityError(
        'File path is outside allowed directories',
        'PATH_TRAVERSAL',
        filePath
      ));
    }

    // Check file extension
    const extension = path.extname(resolvedPath).toLowerCase();
    if (!this.config.allowedExtensions.includes(extension)) {
      errors.push(new FileSecurityError(
        `File extension '${extension}' is not allowed`,
        'FILE_NOT_ALLOWED',
        filePath
      ));
    }

    // Check for symbolic links if not allowed
    if (!this.config.allowSymlinks && this.isSymbolicLinkPath(normalizedPath)) {
      warnings.push('Symbolic links are not allowed in file paths');
    }

    return {
      isValid: errors.length === 0,
      resolvedPath,
      errors,
      warnings
    };
  }

  /**
   * Get safe file path within a specific base directory
   */
  getSafeFilePath(fileName: string, baseDir: 'resources' | 'workspaces' | 'temp'): string {
    const baseDirMap = {
      resources: path.resolve(process.cwd(), 'zosql', 'resources'),
      workspaces: path.resolve(process.cwd(), 'zosql', 'workspaces'),
      temp: path.resolve(process.cwd(), 'zosql', 'temp')
    };

    const selectedBase = baseDirMap[baseDir];
    const safePath = path.join(selectedBase, this.sanitizeFileName(fileName));
    
    const validation = this.validatePath(safePath);
    if (!validation.isValid) {
      throw new FileSecurityError(
        `Cannot create safe path for file: ${validation.errors.map(e => e.message).join(', ')}`,
        'INVALID_PATH',
        fileName
      );
    }

    return validation.resolvedPath;
  }

  /**
   * Check if a path is within allowed directories
   */
  isPathAllowed(resolvedPath: string): boolean {
    const normalizedTarget = this.normalizePath(resolvedPath);
    
    return this.normalizedBasePaths.some(basePath => {
      // Ensure the resolved path starts with one of the allowed base paths
      const isWithinBase = normalizedTarget.startsWith(basePath + path.sep) || 
                          normalizedTarget === basePath;
      
      // Additional check to prevent bypass attempts
      const relativePath = path.relative(basePath, normalizedTarget);
      const isNotTraversing = !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
      
      return isWithinBase && isNotTraversing;
    });
  }

  /**
   * Sanitize filename by removing dangerous characters
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"|?*]/g, '_') // Replace dangerous characters
      .replace(/^\.+/, '_') // Replace leading dots
      .replace(/\s+/g, '_') // Replace spaces
      .replace(/_+/g, '_') // Normalize multiple underscores
      .substring(0, 255); // Limit length
  }

  /**
   * Normalize path for consistent comparison
   */
  private normalizePath(filePath: string): string {
    let normalized = path.normalize(filePath);
    
    // Convert to consistent case if not case-sensitive
    if (!this.config.caseSensitive) {
      normalized = normalized.toLowerCase();
    }
    
    return normalized;
  }

  /**
   * Safely resolve path
   */
  private resolvePath(filePath: string): string {
    // Find the best matching base path
    let bestMatch = '';
    let resolvedPath = '';

    for (const basePath of this.normalizedBasePaths) {
      try {
        const candidate = path.resolve(basePath, filePath);
        if (candidate.startsWith(basePath)) {
          bestMatch = basePath;
          resolvedPath = candidate;
          break;
        }
      } catch {
        // Continue to next base path
      }
    }

    if (!bestMatch) {
      // Try absolute resolution as last resort
      resolvedPath = path.resolve(filePath);
    }

    return resolvedPath;
  }

  /**
   * Check for suspicious characters that might indicate attack attempts
   */
  private containsSuspiciousCharacters(filePath: string): boolean {
    const suspiciousPatterns = [
      /\.\.[/\\]/,  // Path traversal
      /[<>"|]/,     // Dangerous characters
      // eslint-disable-next-line no-control-regex
      /\x00/,       // Null bytes
      // eslint-disable-next-line no-control-regex
      /[\x01-\x1f\x7f-\x9f]/, // Control characters
      /^[.~]/       // Hidden files (optional security measure)
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if path contains symbolic link indicators
   */
  private isSymbolicLinkPath(filePath: string): boolean {
    // Basic check for common symlink patterns
    // In a real implementation, you might want to check the actual filesystem
    return filePath.includes('->') || /\blink\b/i.test(filePath);
  }

  /**
   * Validate file write operation
   */
  validateFileWrite(filePath: string, content: string): FileValidationResult {
    // First validate the path
    const pathValidation = this.validatePath(filePath);
    if (!pathValidation.isValid) {
      return pathValidation;
    }

    const errors: FileSecurityError[] = [];
    const warnings: string[] = [];

    // Check content size
    if (content.length > this.config.maxFileSize) {
      errors.push(new FileSecurityError(
        `File content too large: ${content.length} bytes (max: ${this.config.maxFileSize})`,
        'FILE_NOT_ALLOWED',
        filePath
      ));
    }

    // Check for suspicious content patterns (basic)
    if (content.includes('\x00')) {
      errors.push(new FileSecurityError(
        'File content contains null bytes',
        'FILE_NOT_ALLOWED',
        filePath
      ));
    }

    return {
      isValid: errors.length === 0,
      resolvedPath: pathValidation.resolvedPath,
      errors,
      warnings: [...pathValidation.warnings, ...warnings]
    };
  }

  /**
   * Get allowed base paths for debugging/logging
   */
  getAllowedBasePaths(): readonly string[] {
    return this.normalizedBasePaths;
  }

  /**
   * Get configuration for debugging/logging
   */
  getConfig(): SecureFileConfig {
    return { ...this.config };
  }
}

/**
 * Factory function for creating secure file manager
 */
export function createSecureFileManager(config?: Partial<SecureFileConfig>): SecureFileManager {
  return new SecureFileManager(config);
}

/**
 * Quick validation function for file paths
 */
export function validateFilePath(filePath: string): FileValidationResult {
  const manager = createSecureFileManager();
  return manager.validatePath(filePath);
}

/**
 * Create a secure workspace directory path
 */
export function createSecureWorkspacePath(workspaceName: string): string {
  const manager = createSecureFileManager();
  return manager.getSafeFilePath(`${workspaceName}.json`, 'workspaces');
}

/**
 * Create a secure resource file path
 */
export function createSecureResourcePath(fileName: string): string {
  const manager = createSecureFileManager();
  return manager.getSafeFilePath(fileName, 'resources');
}
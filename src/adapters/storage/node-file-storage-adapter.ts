/**
 * Node.js File Storage Adapter
 * Infrastructure Layer - Node.js implementation of FileStoragePort
 * Concrete adapter implementing file operations using Node.js fs module
 */

import { promises as fs } from 'fs';
import path from 'path';
import { 
  FileStoragePort, 
  FileOperationResult, 
  FileMetadata,
  FileListingOptions
} from '@core/ports/file-storage-port';
import { SecureFileManager } from '@core/security/secure-file-manager';

/**
 * Node.js implementation of FileStoragePort
 * Provides secure file operations using Node.js file system with path validation
 */
export class NodeFileStorageAdapter implements FileStoragePort {
  private readonly secureFileManager = new SecureFileManager();
  
  /**
   * Base directory for file operations (security boundary)
   */
  constructor(
    private readonly baseDirectory: string = process.cwd()
  ) {
    console.log(`[FILE-STORAGE] Initialized with base directory: ${this.baseDirectory}`);
  }

  async readFile(filePath: string): Promise<FileOperationResult<string>> {
    try {
      // Security validation first
      const validation = this.secureFileManager.validatePath(filePath);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Security violation: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      // Resolve absolute path within base directory
      const absolutePath = this.resolveSecurePath(filePath);
      
      // Check file exists
      const exists = await this.exists(filePath);
      if (!exists.success || !exists.data) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      // Read file contents
      const content = await fs.readFile(absolutePath, 'utf-8');
      
      console.log(`[FILE-STORAGE] Read file: ${filePath} (${content.length} chars)`);
      
      return {
        success: true,
        data: content
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to read file';
      console.error(`[FILE-STORAGE] Read failed: ${filePath}`, error);
      
      return {
        success: false,
        error: `File read failed: ${errorMessage}`
      };
    }
  }

  async writeFile(
    filePath: string, 
    content: string
  ): Promise<FileOperationResult<void>> {
    try {
      // Security validation
      const validation = this.secureFileManager.validatePath(filePath);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Security violation: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      const absolutePath = this.resolveSecurePath(filePath);
      
      // Ensure directory exists
      const directory = path.dirname(absolutePath);
      await fs.mkdir(directory, { recursive: true });
      
      // Write file with secure permissions
      await fs.writeFile(absolutePath, content, {
        encoding: 'utf-8',
        mode: 0o644 // Read/write for owner, read-only for others
      });
      
      console.log(`[FILE-STORAGE] Wrote file: ${filePath} (${content.length} chars)`);
      
      return {
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to write file';
      console.error(`[FILE-STORAGE] Write failed: ${filePath}`, error);
      
      return {
        success: false,
        error: `File write failed: ${errorMessage}`
      };
    }
  }

  async deleteFile(filePath: string): Promise<FileOperationResult<void>> {
    try {
      // Security validation
      const validation = this.secureFileManager.validatePath(filePath);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Security violation: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      const absolutePath = this.resolveSecurePath(filePath);
      
      // Check file exists
      const exists = await this.exists(filePath);
      if (!exists.success || !exists.data) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      // Delete file
      await fs.unlink(absolutePath);
      
      console.log(`[FILE-STORAGE] Deleted file: ${filePath}`);
      
      return {
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
      console.error(`[FILE-STORAGE] Delete failed: ${filePath}`, error);
      
      return {
        success: false,
        error: `File delete failed: ${errorMessage}`
      };
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    const result = await this.exists(filePath);
    return result.success && result.data === true;
  }

  async exists(filePath: string): Promise<FileOperationResult<boolean>> {
    try {
      // Security validation
      const validation = this.secureFileManager.validatePath(filePath);
      if (!validation.isValid) {
        // For exists check, return false instead of error
        return {
          success: true,
          data: false
        };
      }

      const absolutePath = this.resolveSecurePath(filePath);
      
      try {
        await fs.access(absolutePath);
        return {
          success: true,
          data: true
        };
      } catch {
        return {
          success: true,
          data: false
        };
      }
      
    } catch (error) {
      console.error(`[FILE-STORAGE] Exists check failed: ${filePath}`, error);
      
      return {
        success: true,
        data: false
      };
    }
  }

  async getFileMetadata(filePath: string): Promise<FileOperationResult<FileMetadata>> {
    return this.getMetadata(filePath);
  }

  async getMetadata(filePath: string): Promise<FileOperationResult<FileMetadata>> {
    try {
      // Security validation
      const validation = this.secureFileManager.validatePath(filePath);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Security violation: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      const absolutePath = this.resolveSecurePath(filePath);
      
      // Get file stats
      const stats = await fs.stat(absolutePath);
      
      const metadata: FileMetadata = {
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        type: path.extname(filePath),
        isDirectory: stats.isDirectory()
      };
      
      console.log(`[FILE-STORAGE] Got metadata for: ${filePath}`);
      
      return {
        success: true,
        data: metadata
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get metadata';
      console.error(`[FILE-STORAGE] Metadata failed: ${filePath}`, error);
      
      return {
        success: false,
        error: `Metadata retrieval failed: ${errorMessage}`
      };
    }
  }

  async listFiles(
    directoryPath: string, 
    options?: FileListingOptions
  ): Promise<FileOperationResult<readonly FileMetadata[]>> {
    try {
      // Security validation
      const validation = this.secureFileManager.validatePath(directoryPath);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Security violation: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      const absolutePath = this.resolveSecurePath(directoryPath);
      
      // Check if directory exists
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: `Not a directory: ${directoryPath}`
        };
      }

      // List directory contents
      const entries = await fs.readdir(absolutePath);
      
      // Filter and resolve file metadata
      const files: FileMetadata[] = [];
      for (const entry of entries) {
        const entryPath = path.join(directoryPath, entry);
        const entryAbsPath = path.join(absolutePath, entry);
        
        try {
          const entryStats = await fs.stat(entryAbsPath);
          
          // Apply options filtering if provided
          if (options?.includeHidden === false && entry.startsWith('.')) {
            continue;
          }
          
          if (options?.extensions) {
            const ext = path.extname(entry);
            if (!options.extensions.includes(ext)) {
              continue;
            }
          }
          
          const metadata: FileMetadata = {
            name: entry,
            path: entryPath,
            size: entryStats.size,
            createdAt: entryStats.birthtime,
            modifiedAt: entryStats.mtime,
            type: path.extname(entry),
            isDirectory: entryStats.isDirectory()
          };
          
          files.push(metadata);
        } catch {
          // Skip entries we can't access
          continue;
        }
      }
      
      // Apply sorting if specified
      if (options?.sortBy) {
        files.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (options.sortBy) {
            case 'name':
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            case 'date':
              aValue = a.modifiedAt;
              bValue = b.modifiedAt;
              break;
            case 'size':
              aValue = a.size;
              bValue = b.size;
              break;
            default:
              return 0;
          }
          
          const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          return options.sortOrder === 'desc' ? -comparison : comparison;
        });
      }
      
      console.log(`[FILE-STORAGE] Listed ${files.length} files in: ${directoryPath}`);
      
      return {
        success: true,
        data: files
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list files';
      console.error(`[FILE-STORAGE] List failed: ${directoryPath}`, error);
      
      return {
        success: false,
        error: `Directory listing failed: ${errorMessage}`
      };
    }
  }

  async copyFile(
    sourcePath: string, 
    destinationPath: string
  ): Promise<FileOperationResult<void>> {
    try {
      // Security validation for both paths
      const sourceValidation = this.secureFileManager.validatePath(sourcePath);
      if (!sourceValidation.isValid) {
        return {
          success: false,
          error: `Source security violation: ${sourceValidation.errors.map(e => e.message).join(', ')}`
        };
      }

      const destValidation = this.secureFileManager.validatePath(destinationPath);
      if (!destValidation.isValid) {
        return {
          success: false,
          error: `Destination security violation: ${destValidation.errors.map(e => e.message).join(', ')}`
        };
      }

      const sourceAbsPath = this.resolveSecurePath(sourcePath);
      const destAbsPath = this.resolveSecurePath(destinationPath);
      
      // Ensure destination directory exists
      const destDir = path.dirname(destAbsPath);
      await fs.mkdir(destDir, { recursive: true });
      
      // Copy file
      await fs.copyFile(sourceAbsPath, destAbsPath);
      
      console.log(`[FILE-STORAGE] Copied: ${sourcePath} -> ${destinationPath}`);
      
      return {
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy file';
      console.error(`[FILE-STORAGE] Copy failed: ${sourcePath} -> ${destinationPath}`, error);
      
      return {
        success: false,
        error: `File copy failed: ${errorMessage}`
      };
    }
  }

  async moveFile(
    sourcePath: string, 
    destinationPath: string
  ): Promise<FileOperationResult<void>> {
    try {
      // Copy first
      const copyResult = await this.copyFile(sourcePath, destinationPath);
      if (!copyResult.success) {
        return copyResult;
      }

      // Then delete source
      const deleteResult = await this.deleteFile(sourcePath);
      if (!deleteResult.success) {
        // Try to clean up the copy
        await this.deleteFile(destinationPath);
        return deleteResult;
      }

      console.log(`[FILE-STORAGE] Moved: ${sourcePath} -> ${destinationPath}`);
      
      return {
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to move file';
      console.error(`[FILE-STORAGE] Move failed: ${sourcePath} -> ${destinationPath}`, error);
      
      return {
        success: false,
        error: `File move failed: ${errorMessage}`
      };
    }
  }

  async createDirectory(directoryPath: string): Promise<FileOperationResult<void>> {
    try {
      // Security validation
      const validation = this.secureFileManager.validatePath(directoryPath);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Security violation: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      const absolutePath = this.resolveSecurePath(directoryPath);
      
      // Create directory recursively
      await fs.mkdir(absolutePath, { 
        recursive: true,
        mode: 0o755 // Read/write/execute for owner, read/execute for others
      });
      
      console.log(`[FILE-STORAGE] Created directory: ${directoryPath}`);
      
      return {
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create directory';
      console.error(`[FILE-STORAGE] Create directory failed: ${directoryPath}`, error);
      
      return {
        success: false,
        error: `Directory creation failed: ${errorMessage}`
      };
    }
  }

  async deleteDirectory(directoryPath: string, recursive?: boolean): Promise<FileOperationResult<void>> {
    try {
      // Security validation
      const validation = this.secureFileManager.validatePath(directoryPath);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Security violation: ${validation.errors.map(e => e.message).join(', ')}`
        };
      }

      const absolutePath = this.resolveSecurePath(directoryPath);
      
      // Check if directory exists
      const exists = await this.exists(directoryPath);
      if (!exists.success || !exists.data) {
        return {
          success: false,
          error: `Directory not found: ${directoryPath}`
        };
      }

      // Delete directory
      await fs.rmdir(absolutePath, { recursive: recursive || false });
      
      console.log(`[FILE-STORAGE] Deleted directory: ${directoryPath}`);
      
      return {
        success: true
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete directory';
      console.error(`[FILE-STORAGE] Delete directory failed: ${directoryPath}`, error);
      
      return {
        success: false,
        error: `Directory delete failed: ${errorMessage}`
      };
    }
  }

  async getTempFilePath(extension?: string): Promise<string> {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    const ext = extension || '.tmp';
    
    return path.join(this.baseDirectory, 'temp', `temp_${timestamp}_${randomId}${ext}`);
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = path.join(this.baseDirectory, 'temp');
      
      // Check if temp directory exists
      try {
        await fs.access(tempDir);
      } catch {
        // Temp directory doesn't exist, nothing to clean
        return;
      }

      // List all files in temp directory
      const entries = await fs.readdir(tempDir);
      
      for (const entry of entries) {
        const entryPath = path.join(tempDir, entry);
        try {
          const stats = await fs.stat(entryPath);
          
          // Delete files older than 1 hour
          const oneHourAgo = Date.now() - (60 * 60 * 1000);
          if (stats.mtime.getTime() < oneHourAgo) {
            if (stats.isFile()) {
              await fs.unlink(entryPath);
            } else if (stats.isDirectory()) {
              await fs.rmdir(entryPath, { recursive: true });
            }
          }
        } catch (error) {
          console.warn(`[FILE-STORAGE] Failed to clean temp file: ${entryPath}`, error);
        }
      }
      
      console.log(`[FILE-STORAGE] Cleaned up temp files`);
      
    } catch (error) {
      console.error(`[FILE-STORAGE] Temp cleanup failed:`, error);
    }
  }

  /**
   * Resolve secure path within base directory
   */
  private resolveSecurePath(filePath: string): string {
    // Normalize and resolve path
    const normalizedPath = path.normalize(filePath);
    const absolutePath = path.isAbsolute(normalizedPath) 
      ? normalizedPath 
      : path.join(this.baseDirectory, normalizedPath);
    
    // Ensure path is within base directory
    const relative = path.relative(this.baseDirectory, absolutePath);
    if (relative.startsWith('..')) {
      throw new Error(`Path outside base directory: ${filePath}`);
    }
    
    return absolutePath;
  }
}
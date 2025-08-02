import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  extension?: string;
  size?: number;
  modified?: Date;
  children?: FileItem[];
}

export interface FileSystemResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class FileSystemManager {
  private basePath: string;
  private developPath: string;
  private resourcesPath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.developPath = join(basePath, 'zosql', 'develop');
    this.resourcesPath = join(basePath, 'zosql', 'resources');
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      join(this.basePath, 'zosql'),
      this.developPath,
      this.resourcesPath
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  public getFileTree(): FileSystemResult {
    try {
      const tree: FileItem[] = [];
      
      // Add zosql folder structure
      const zosqlTree = this.buildFileTree(join(this.basePath, 'zosql'), 'zosql');
      if (zosqlTree) {
        tree.push(zosqlTree);
      }

      return {
        success: true,
        data: tree
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private buildFileTree(dirPath: string, name: string): FileItem | null {
    try {
      if (!existsSync(dirPath)) {
        return null;
      }

      const stats = statSync(dirPath);
      const isDirectory = stats.isDirectory();

      const item: FileItem = {
        name,
        path: dirPath,
        type: isDirectory ? 'folder' : 'file',
        size: stats.size,
        modified: stats.mtime
      };

      if (!isDirectory) {
        item.extension = extname(name).toLowerCase();
        return item;
      }

      // For directories, get children
      const children: FileItem[] = [];
      const entries = readdirSync(dirPath);

      for (const entry of entries) {
        const childPath = join(dirPath, entry);
        const childItem = this.buildFileTree(childPath, entry);
        if (childItem) {
          children.push(childItem);
        }
      }

      // Sort children: folders first, then files
      children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      item.children = children;
      return item;
    } catch (error) {
      console.error(`Error building file tree for ${dirPath}:`, error);
      return null;
    }
  }

  public readFile(filePath: string): FileSystemResult {
    try {
      if (!existsSync(filePath)) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      const content = readFileSync(filePath, 'utf8');
      return {
        success: true,
        data: {
          content,
          path: filePath,
          name: basename(filePath)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public writeFile(filePath: string, content: string): FileSystemResult {
    try {
      // Ensure directory exists
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(filePath, content, 'utf8');
      return {
        success: true,
        data: {
          path: filePath,
          name: basename(filePath)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public createFile(relativePath: string, content: string = ''): FileSystemResult {
    try {
      const fullPath = this.getFullPath(relativePath);
      return this.writeFile(fullPath, content);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  public createFolder(relativePath: string): FileSystemResult {
    try {
      const fullPath = this.getFullPath(relativePath);
      
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }

      return {
        success: true,
        data: {
          path: fullPath,
          name: basename(fullPath)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getFullPath(relativePath: string): string {
    // Handle different path prefixes
    if (relativePath.startsWith('/zosql/develop/')) {
      return join(this.basePath, relativePath.substring(1));
    }
    if (relativePath.startsWith('/zosql/resources/')) {
      return join(this.basePath, relativePath.substring(1));
    }
    if (relativePath.startsWith('zosql/')) {
      return join(this.basePath, relativePath);
    }
    
    // Default to develop folder
    return join(this.developPath, relativePath);
  }

  public getDevelopPath(): string {
    return this.developPath;
  }

  public getResourcesPath(): string {
    return this.resourcesPath;
  }

  public getBasePath(): string {
    return this.basePath;
  }
}
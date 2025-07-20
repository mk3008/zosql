/**
 * Filesystem-based Workspace Storage Implementation
 * 既存のファイルシステムベースの実装
 */

import path from 'path';
import fs from 'fs/promises';
import { WorkspaceStorageInterface, WorkspaceInfo, PrivateCte } from './workspace-storage-interface.js';
import { Logger } from '../utils/logging.js';

export class FilesystemWorkspaceStorage implements WorkspaceStorageInterface {
  private logger: Logger;
  private workspaceBasePath: string;

  constructor() {
    this.logger = Logger.getInstance();
    this.workspaceBasePath = path.join(process.cwd(), 'zosql', 'workspace');
  }

  async hasWorkspace(): Promise<boolean> {
    try {
      const infoPath = path.join(this.workspaceBasePath, 'workspace.json');
      await fs.access(infoPath);
      return true;
    } catch {
      return false;
    }
  }

  async getWorkspace(): Promise<WorkspaceInfo | null> {
    try {
      const infoPath = path.join(this.workspaceBasePath, 'workspace.json');
      const content = await fs.readFile(infoPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async saveWorkspace(workspaceInfo: WorkspaceInfo): Promise<void> {
    await this.ensureWorkspaceStructure();
    const infoPath = path.join(this.workspaceBasePath, 'workspace.json');
    await fs.writeFile(infoPath, JSON.stringify(workspaceInfo, null, 2), 'utf8');
    
    // Save decomposed query file
    const decomposedQueryPath = path.join(this.workspaceBasePath, `${workspaceInfo.name}.sql`);
    await fs.writeFile(decomposedQueryPath, workspaceInfo.decomposedQuery, 'utf8');
    
    this.logger.log('[FILESYSTEM-STORAGE] Workspace saved');
  }

  async clearWorkspace(): Promise<void> {
    try {
      await fs.rm(this.workspaceBasePath, { recursive: true, force: true });
      this.logger.log('[FILESYSTEM-STORAGE] Workspace cleared');
    } catch (error) {
      this.logger.log('[FILESYSTEM-STORAGE] Workspace already clean or doesn\'t exist');
    }
  }

  async getPrivateCtes(): Promise<Record<string, PrivateCte>> {
    try {
      const privateCteDir = path.join(this.workspaceBasePath, 'private-cte');
      const files = await fs.readdir(privateCteDir);
      const privateCtes: Record<string, PrivateCte> = {};

      for (const file of files) {
        if (file.endsWith('.sql')) {
          const filePath = path.join(privateCteDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          // Parse metadata from comments
          const nameMatch = content.match(/\/\* name: (.*?) \*\//);
          const descMatch = content.match(/\/\* description: (.*?) \*\//);
          const depsMatch = content.match(/\/\* dependencies: (.*?) \*\//);
          
          // Extract complete SQL (without metadata comments)
          const fullQuery = content.replace(/\/\*[\s\S]*?\*\/\s*/g, '').trim();
          const cteName = nameMatch ? nameMatch[1] : path.basename(file, '.sql');
          
          privateCtes[cteName] = {
            name: cteName,
            query: fullQuery,
            description: descMatch ? descMatch[1] : '',
            dependencies: depsMatch ? JSON.parse(depsMatch[1]) : [],
            columns: []
          };
        }
      }

      return privateCtes;
    } catch {
      return {};
    }
  }

  async getPrivateCte(cteName: string): Promise<PrivateCte | null> {
    try {
      const privateCteDir = path.join(this.workspaceBasePath, 'private-cte');
      const filePath = path.join(privateCteDir, `${cteName}.sql`);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Parse metadata from comments
      const nameMatch = content.match(/\/\* name: (.*?) \*\//);
      const descMatch = content.match(/\/\* description: (.*?) \*\//);
      const depsMatch = content.match(/\/\* dependencies: (.*?) \*\//);
      
      // Extract complete SQL (without metadata comments)
      const fullQuery = content.replace(/\/\*[\s\S]*?\*\/\s*/g, '').trim();
      
      return {
        name: nameMatch ? nameMatch[1] : cteName,
        query: fullQuery,
        description: descMatch ? descMatch[1] : '',
        dependencies: depsMatch ? JSON.parse(depsMatch[1]) : [],
        columns: []
      };
    } catch {
      return null;
    }
  }

  async updatePrivateCte(cteName: string, cte: PrivateCte): Promise<void> {
    await this.ensureWorkspaceStructure();
    const privateCteDir = path.join(this.workspaceBasePath, 'private-cte');
    const filePath = path.join(privateCteDir, `${cteName}.sql`);

    // Create content with metadata
    const content = `/* name: ${cteName} */
/* description: ${cte.description || 'No description'} */
/* dependencies: ${JSON.stringify(cte.dependencies || [])} */

${cte.query}`;

    await fs.writeFile(filePath, content, 'utf8');
    
    // Update workspace info
    const workspace = await this.getWorkspace();
    if (workspace) {
      workspace.privateCtes[cteName] = cte;
      workspace.lastModified = new Date().toISOString();
      await this.saveWorkspace(workspace);
    }
  }

  async deletePrivateCte(cteName: string): Promise<void> {
    try {
      const privateCteDir = path.join(this.workspaceBasePath, 'private-cte');
      const filePath = path.join(privateCteDir, `${cteName}.sql`);
      await fs.unlink(filePath);
      
      // Update workspace info
      const workspace = await this.getWorkspace();
      if (workspace && workspace.privateCtes[cteName]) {
        delete workspace.privateCtes[cteName];
        workspace.lastModified = new Date().toISOString();
        await this.saveWorkspace(workspace);
      }
    } catch (error) {
      this.logger.log(`[FILESYSTEM-STORAGE] Error deleting CTE ${cteName}: ${error}`);
    }
  }

  async getWorkspaceFile(type: 'main' | 'cte', fileName: string): Promise<{ content: string; fileName: string; type: string } | null> {
    try {
      let content = '';
      
      if (type === 'main') {
        // Try to read the direct SQL file from workspace root
        const mainFileName = fileName.replace(/\.(sql)?$/, '') + '.sql';
        const mainFilePath = path.join(this.workspaceBasePath, mainFileName);
        
        try {
          content = await fs.readFile(mainFilePath, 'utf8');
        } catch {
          // Fallback to workspace info
          const workspace = await this.getWorkspace();
          content = workspace?.decomposedQuery || workspace?.originalQuery || '';
        }
      } else if (type === 'cte') {
        // CTE file - look in private-cte directory
        const cteName = fileName.replace('.cte', '');
        const filePath = path.join(this.workspaceBasePath, 'private-cte', `${cteName}.sql`);
        content = await fs.readFile(filePath, 'utf8');
      }

      if (content) {
        return { content, fileName, type };
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

  private async ensureWorkspaceStructure(): Promise<void> {
    const privateCteDir = path.join(this.workspaceBasePath, 'private-cte');
    await fs.mkdir(privateCteDir, { recursive: true });
  }
}
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Logger } from '../utils/logging.js';

export interface PrivateResource {
  name: string;
  query: string;
  columns: Array<{ name: string; type: string }>;
  dependencies: string[];
  description: string;
}

export class PrivateSchemaApi {
  private logger: Logger;
  private privateSchema: Record<string, PrivateResource> = {};

  constructor() {
    this.logger = Logger.getInstance();
    this.loadPrivateSchema();
  }

  private async loadPrivateSchema(): Promise<void> {
    try {
      const privatePath = path.join(process.cwd(), 'zosql.private.js');
      
      if (fs.existsSync(privatePath)) {
        // Use dynamic import for ES modules
        const privateModule = await import(privatePath);
        this.privateSchema = privateModule.default || privateModule;
        this.logger.log(`[PRIVATE-SCHEMA] Loaded ${Object.keys(this.privateSchema).length} private resources`);
      } else {
        this.logger.log(`[PRIVATE-SCHEMA] No private schema file found at: ${privatePath}`);
      }
    } catch (error) {
      this.logger.log(`[PRIVATE-SCHEMA] Error loading private schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async handleGetPrivateSchema(_req: Request, res: Response): Promise<void> {
    try {
      // Reload schema to get latest changes
      await this.loadPrivateSchema();
      
      res.json({
        success: true,
        privateSchema: this.privateSchema
      });
    } catch (error) {
      this.logger.log(`[PRIVATE-SCHEMA] Error getting private schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleGetPrivateCompletion(_req: Request, res: Response): Promise<void> {
    try {
      // Reload schema to get latest changes
      await this.loadPrivateSchema();
      
      // Format for IntelliSense completion
      const privateTables = Object.keys(this.privateSchema);
      const privateColumns: Record<string, string[]> = {};
      
      Object.values(this.privateSchema).forEach((resource: PrivateResource) => {
        privateColumns[resource.name] = resource.columns.map(col => col.name);
      });
      
      this.logger.log(`[PRIVATE-SCHEMA] Provided ${privateTables.length} private resources for IntelliSense`);
      
      res.json({
        success: true,
        privateTables,
        privateColumns,
        privateResources: this.privateSchema
      });
    } catch (error) {
      this.logger.log(`[PRIVATE-SCHEMA] Error getting private completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public getPrivateResource(name: string): PrivateResource | undefined {
    return this.privateSchema[name];
  }

  public getAllPrivateResources(): Record<string, PrivateResource> {
    return this.privateSchema;
  }

  // 依存関係を解決してWITH句を生成
  public generateWithClause(usedPrivateResources: string[]): string {
    const resolved = this.resolveDependencies(usedPrivateResources);
    const withClauses: string[] = [];
    
    resolved.forEach(resourceName => {
      const resource = this.privateSchema[resourceName];
      if (resource) {
        withClauses.push(`${resource.name} AS (${resource.query})`);
      }
    });
    
    return withClauses.length > 0 ? `WITH ${withClauses.join(', ')}` : '';
  }

  // 依存関係を再帰的に解決
  private resolveDependencies(resources: string[], resolved: Set<string> = new Set()): string[] {
    const result: string[] = [];
    
    for (const resourceName of resources) {
      if (resolved.has(resourceName)) continue;
      
      const resource = this.privateSchema[resourceName];
      if (!resource) continue;
      
      // 依存関係を先に解決
      if (resource.dependencies.length > 0) {
        const deps = this.resolveDependencies(resource.dependencies, resolved);
        result.push(...deps);
      }
      
      // 自分自身を追加
      if (!resolved.has(resourceName)) {
        result.push(resourceName);
        resolved.add(resourceName);
      }
    }
    
    return result;
  }
}
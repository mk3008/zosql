import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Logger } from '../utils/logging.js';

export interface SharedCte {
  name: string;
  query: string;
  columns: Array<{ name: string; type: string }>;
  dependencies: string[];
  description: string;
}

export class SharedCteApi {
  private logger: Logger;
  private sharedCtes: Record<string, SharedCte> = {};

  constructor() {
    this.logger = Logger.getInstance();
    this.loadSharedCtes();
  }

  private async loadSharedCtes(): Promise<void> {
    try {
      const sharedCtePath = path.join(process.cwd(), 'zosql.private.js');
      
      if (fs.existsSync(sharedCtePath)) {
        // Use dynamic import for ES modules
        const sharedCteModule = await import(sharedCtePath);
        this.sharedCtes = sharedCteModule.default || sharedCteModule;
        this.logger.log(`[SHARED-CTE] Loaded ${Object.keys(this.sharedCtes).length} shared CTEs`);
      } else {
        this.logger.log(`[SHARED-CTE] No shared CTE file found at: ${sharedCtePath}`);
      }
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error loading shared CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async handleGetSharedCtes(_req: Request, res: Response): Promise<void> {
    try {
      // Reload schema to get latest changes
      await this.loadSharedCtes();
      
      res.json({
        success: true,
        sharedCtes: this.sharedCtes
      });
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error getting shared CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleGetSharedCteCompletion(_req: Request, res: Response): Promise<void> {
    try {
      // Reload schema to get latest changes
      await this.loadSharedCtes();
      
      // Format for IntelliSense completion
      const sharedCteTables = Object.keys(this.sharedCtes);
      const sharedCteColumns: Record<string, string[]> = {};
      
      Object.values(this.sharedCtes).forEach((cte: SharedCte) => {
        sharedCteColumns[cte.name] = cte.columns.map(col => col.name);
      });
      
      this.logger.log(`[SHARED-CTE] Provided ${sharedCteTables.length} shared CTEs for IntelliSense`);
      
      res.json({
        success: true,
        sharedCteTables,
        sharedCteColumns,
        sharedCtes: this.sharedCtes
      });
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error getting shared CTE completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public getSharedCte(name: string): SharedCte | undefined {
    return this.sharedCtes[name];
  }

  public getAllSharedCtes(): Record<string, SharedCte> {
    return this.sharedCtes;
  }

  // 依存関係を解決してWITH句を生成
  public generateWithClause(usedSharedCtes: string[]): string {
    const resolved = this.resolveDependencies(usedSharedCtes);
    const withClauses: string[] = [];
    
    resolved.forEach(cteName => {
      const cte = this.sharedCtes[cteName];
      if (cte) {
        withClauses.push(`${cte.name} AS (${cte.query})`);
      }
    });
    
    return withClauses.length > 0 ? `WITH ${withClauses.join(', ')}` : '';
  }

  // 依存関係を再帰的に解決
  private resolveDependencies(ctes: string[], resolved: Set<string> = new Set()): string[] {
    const result: string[] = [];
    
    for (const cteName of ctes) {
      if (resolved.has(cteName)) continue;
      
      const cte = this.sharedCtes[cteName];
      if (!cte) continue;
      
      // 依存関係を先に解決
      if (cte.dependencies.length > 0) {
        const deps = this.resolveDependencies(cte.dependencies, resolved);
        result.push(...deps);
      }
      
      // 自分自身を追加
      if (!resolved.has(cteName)) {
        result.push(cteName);
        resolved.add(cteName);
      }
    }
    
    return result;
  }
}
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Logger } from '../utils/logging.js';
import { SelectQueryParser } from 'rawsql-ts';

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
      const sharedCtePath = path.join(process.cwd(), 'zosql.shared-cte.js');
      
      if (fs.existsSync(sharedCtePath)) {
        // Use dynamic import for ES modules with cache busting
        const absolutePath = path.resolve(sharedCtePath);
        const cacheBuster = `?t=${Date.now()}`;
        const fileUrl = `file://${absolutePath}${cacheBuster}`;
        
        const sharedCteModule = await import(fileUrl);
        this.sharedCtes = sharedCteModule.default || sharedCteModule;
        this.logger.log(`[SHARED-CTE] Loaded ${Object.keys(this.sharedCtes).length} shared CTEs from: ${sharedCtePath}`);
      } else {
        this.logger.log(`[SHARED-CTE] No shared CTE file found at: ${sharedCtePath}`);
        this.sharedCtes = {};
      }
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error loading shared CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.sharedCtes = {};
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

  public async handleGetSingleSharedCte(req: Request, res: Response): Promise<void> {
    try {
      const { cteName } = req.params;
      
      if (!cteName) {
        res.status(400).json({ success: false, error: 'CTE name is required' });
        return;
      }
      
      // Reload schema to get latest changes
      await this.loadSharedCtes();
      
      const sharedCte = this.sharedCtes[cteName];
      
      if (!sharedCte) {
        res.status(404).json({ success: false, error: `Shared CTE '${cteName}' not found` });
        return;
      }
      
      // Format query with metadata comments for editing
      const formattedQuery = this.formatQueryWithMetadata(sharedCte);
      
      this.logger.log(`[SHARED-CTE] Retrieved shared CTE: ${cteName}`);
      
      res.json({
        success: true,
        sharedCte: {
          ...sharedCte,
          editableQuery: formattedQuery
        }
      });
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error getting shared CTE: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  public async handleUpdateSharedCte(req: Request, res: Response): Promise<void> {
    try {
      const { cteName } = req.params;
      const { query } = req.body;
      
      if (!cteName) {
        res.status(400).json({ success: false, error: 'CTE name is required' });
        return;
      }
      
      if (!query) {
        res.status(400).json({ success: false, error: 'Query is required' });
        return;
      }
      
      // Reload current schema
      await this.loadSharedCtes();
      
      const existingCte = this.sharedCtes[cteName];
      if (!existingCte) {
        res.status(404).json({ success: false, error: `Shared CTE '${cteName}' not found` });
        return;
      }
      
      // Parse metadata from query comments
      const metadata = this.parseMetadataFromQuery(query);
      
      // Update the CTE
      this.logger.log(`[SHARED-CTE] Updating shared CTE: ${cteName}`);
      this.logger.log(`[SHARED-CTE] New query: ${query}`);
      this.logger.log(`[SHARED-CTE] Extracted metadata: ${JSON.stringify(metadata)}`);
      
      // Update the in-memory CTE data
      if (metadata.name && metadata.name !== cteName) {
        // Name changed - this is more complex, for now just update description and query
        this.logger.log(`[SHARED-CTE] Name change detected: ${cteName} -> ${metadata.name}`);
      }
      
      // Update the existing CTE with new data
      this.sharedCtes[cteName] = {
        ...existingCte,
        query: metadata.cleanQuery,
        description: metadata.description || existingCte.description
      };
      
      this.logger.log(`[SHARED-CTE] In-memory CTE updated successfully`);
      
      // Write to actual file
      try {
        await this.writeSharedCtesToFile();
        this.logger.log(`[SHARED-CTE] File updated successfully`);
      } catch (writeError) {
        this.logger.log(`[SHARED-CTE] File write failed: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
        // Continue - in-memory update succeeded even if file write failed
      }
      
      res.json({
        success: true,
        message: `Shared CTE '${cteName}' updated successfully`,
        metadata
      });
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error updating shared CTE: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Format query with metadata comments for editing
  private formatQueryWithMetadata(sharedCte: SharedCte): string {
    const nameComment = `/* name: ${sharedCte.name} */`;
    const descComment = `/* description: ${sharedCte.description || ''} */`;
    const query = sharedCte.query;
    
    return `${nameComment}\n${descComment}\n${query}`;
  }

  // Parse metadata from query comments using rawsql-ts
  private parseMetadataFromQuery(queryWithComments: string): { name?: string; description?: string; cleanQuery: string } {
    try {
      // Parse the SQL to get comments
      const parsed = SelectQueryParser.parse(queryWithComments);
      
      // Extract comments from the parsed query
      const comments = parsed.comments || [];
      
      let name: string | undefined;
      let description: string | undefined;
      
      // Parse comments for metadata
      for (const commentText of comments) {
        const text = commentText.trim();
        
        // Match /* name: xxx */ pattern
        const nameMatch = text.match(/^\s*name\s*:\s*(.+?)\s*$/);
        if (nameMatch) {
          name = nameMatch[1].trim();
          continue;
        }
        
        // Match /* description: xxx */ pattern
        const descMatch = text.match(/^\s*description\s*:\s*(.+?)\s*$/);
        if (descMatch) {
          description = descMatch[1].trim();
          continue;
        }
      }
      
      // Get clean query without metadata comments
      let cleanQuery = queryWithComments;
      
      // Remove metadata comment lines
      cleanQuery = cleanQuery.replace(/\/\*\s*name\s*:.*?\*\//gi, '').trim();
      cleanQuery = cleanQuery.replace(/\/\*\s*description\s*:.*?\*\//gi, '').trim();
      
      this.logger.log(`[SHARED-CTE] Parsed metadata - name: ${name}, description: ${description}`);
      
      return {
        name,
        description,
        cleanQuery
      };
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error parsing metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback: simple regex parsing
      let name: string | undefined;
      let description: string | undefined;
      let cleanQuery = queryWithComments;
      
      const nameMatch = queryWithComments.match(/\/\*\s*name\s*:\s*([^*]+)\s*\*\//i);
      if (nameMatch) {
        name = nameMatch[1].trim();
        cleanQuery = cleanQuery.replace(nameMatch[0], '').trim();
      }
      
      const descMatch = queryWithComments.match(/\/\*\s*description\s*:\s*([^*]+)\s*\*\//i);
      if (descMatch) {
        description = descMatch[1].trim();
        cleanQuery = cleanQuery.replace(descMatch[0], '').trim();
      }
      
      return {
        name,
        description,
        cleanQuery
      };
    }
  }

  // Write the current sharedCtes object back to the file
  private async writeSharedCtesToFile(): Promise<void> {
    const filePath = path.join(process.cwd(), 'zosql.shared-cte.js');
    
    // Generate the file content
    const fileContent = this.generateSharedCteFileContent();
    
    // Write to file
    fs.writeFileSync(filePath, fileContent, 'utf8');
    
    this.logger.log(`[SHARED-CTE] File written to: ${filePath}`);
  }

  // Generate the content for zosql.shared-cte.js
  private generateSharedCteFileContent(): string {
    const cteEntries = Object.values(this.sharedCtes).map(cte => {
      const columnsArray = cte.columns.map(col => 
        `      { name: "${col.name}", type: "${col.type}" }`
      ).join(',\n');
      
      const dependenciesArray = cte.dependencies.map(dep => `"${dep}"`).join(', ');
      
      return `  // ${cte.description || 'No description'}
  ${cte.name}: {
    name: "${cte.name}",
    query: "${cte.query.replace(/"/g, '\\"')}",
    columns: [
${columnsArray}
    ],
    dependencies: [${dependenciesArray}], // Dependencies on other shared CTEs
    description: "${cte.description || ''}"
  }`;
    }).join(',\n\n');

    const content = `// zosql Shared CTE Definition
// These CTEs can be referenced like tables within the IDE

const sharedCtes = {
${cteEntries}
};

export default sharedCtes;
`;

    return content;
  }
}
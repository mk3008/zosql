import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Logger } from '../utils/logging.js';
import { SelectQueryParser, SelectValueCollector, SimpleSelectQuery } from 'rawsql-ts';

interface SharedCteMetadata {
  name: string;
  description: string;
  dependencies: string[];
  filePath: string;
  lastModified: number;
  columns?: string[];
}

interface SharedCteCache {
  [name: string]: SharedCteMetadata;
}

export class FileBasedSharedCteApi {
  private logger: Logger;
  private sharedCteDir: string;
  private cacheFile: string;
  private cache: SharedCteCache = {};

  constructor() {
    this.logger = Logger.getInstance();
    this.sharedCteDir = path.join(process.cwd(), 'zosql', 'resources', 'shared-cte');
    this.cacheFile = path.join(process.cwd(), 'zosql', 'resources', 'cache', 'shared-cte.json');
    this.initializeDirectories();
    this.loadCache();
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      await this.scanAndUpdateCache();
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error initializing cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private initializeDirectories(): void {
    const dirs = [
      path.dirname(this.cacheFile),
      this.sharedCteDir
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`[SHARED-CTE] Created directory: ${dir}`);
      }
    });
  }

  private loadCache(): void {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const cacheContent = fs.readFileSync(this.cacheFile, 'utf8');
        this.cache = JSON.parse(cacheContent);
        this.logger.log(`[SHARED-CTE] Cache loaded: ${Object.keys(this.cache).length} entries`);
      } else {
        this.cache = {};
        this.logger.log('[SHARED-CTE] No cache found, starting fresh');
      }
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error loading cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2), 'utf8');
      this.logger.log(`[SHARED-CTE] Cache saved: ${Object.keys(this.cache).length} entries`);
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error saving cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanAndUpdateCache(): Promise<void> {
    try {
      if (!fs.existsSync(this.sharedCteDir)) {
        this.logger.log('[SHARED-CTE] Shared CTE directory not found');
        return;
      }

      const files = fs.readdirSync(this.sharedCteDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => path.join(this.sharedCteDir, file));

      let updated = false;

      for (const filePath of files) {
        const stat = fs.statSync(filePath);
        const fileName = path.basename(filePath, '.sql');
        
        // Check if file needs to be updated in cache
        if (!this.cache[fileName] || this.cache[fileName].lastModified < stat.mtimeMs) {
          const metadata = await this.parseSharedCteFile(filePath);
          if (metadata) {
            this.cache[fileName] = {
              ...metadata,
              filePath,
              lastModified: stat.mtimeMs
            };
            updated = true;
            this.logger.log(`[SHARED-CTE] Updated cache for: ${fileName}`);
          }
        }
      }

      // Remove deleted files from cache
      for (const cacheName of Object.keys(this.cache)) {
        if (!fs.existsSync(this.cache[cacheName].filePath)) {
          delete this.cache[cacheName];
          updated = true;
          this.logger.log(`[SHARED-CTE] Removed from cache: ${cacheName}`);
        }
      }

      if (updated) {
        this.saveCache();
      }
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error scanning directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseSharedCteFile(filePath: string): Promise<SharedCteMetadata | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Parse metadata from comments
      const nameMatch = content.match(/\/\*\s*name\s*:\s*(.+?)\s*\*\//i);
      const descMatch = content.match(/\/\*\s*description\s*:\s*(.+?)\s*\*\//i);
      const depsMatch = content.match(/\/\*\s*dependencies\s*:\s*\[([^\]]*)\]\s*\*\//i);
      
      if (!nameMatch) {
        this.logger.log(`[SHARED-CTE] No name found in file: ${filePath}`);
        return null;
      }

      const name = nameMatch[1].trim();
      const description = descMatch ? descMatch[1].trim() : '';
      
      let dependencies: string[] = [];
      if (depsMatch) {
        const depsStr = depsMatch[1].trim();
        if (depsStr) {
          dependencies = depsStr.split(',')
            .map(dep => dep.trim().replace(/['"]/g, ''))
            .filter(dep => dep.length > 0);
        }
      }

      // Extract and analyze column names using SelectValueCollector with wildcard expansion
      const cleanQuery = this.extractCleanQuery(content);
      let columns: string[] = [];
      
      try {
        const query = SelectQueryParser.parse(cleanQuery);
        if (query && query.constructor.name === 'SimpleSelectQuery') {
          const simpleQuery = query as SimpleSelectQuery;
          
          // Create table column resolver for wildcard expansion
          const tableColumnResolver = await this.createTableColumnResolver();
          
          // Use SelectValueCollector with table resolver for wildcard expansion
          const collector = new SelectValueCollector(tableColumnResolver);
          const selectables = collector.collect(simpleQuery);
          
          // Extract only column names (ignore types - they're complex to infer correctly)
          columns = selectables.map((selectable: any) => 
            selectable.alias || selectable.name || 'unknown'
          ).filter((name: string) => name !== 'unknown' && name !== '*');
          
          this.logger.log(`[SHARED-CTE] Analyzed ${columns.length} columns for ${name}: ${columns.join(', ')}`);
        }
      } catch (parseError) {
        this.logger.log(`[SHARED-CTE] Could not analyze columns for ${name}: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        // Continue without columns - better than failing completely
      }

      return {
        name,
        description,
        dependencies,
        filePath,
        lastModified: 0, // Will be set by caller
        columns
      };
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error parsing file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  // API Handlers
  public async handleGetSharedCtes(_req: Request, res: Response): Promise<void> {
    try {
      await this.scanAndUpdateCache();
      
      const sharedCtes: Record<string, any> = {};
      
      for (const [name, metadata] of Object.entries(this.cache)) {
        const content = fs.readFileSync(metadata.filePath, 'utf8');
        const cleanQuery = this.extractCleanQuery(content);
        
        sharedCtes[name] = {
          name: metadata.name,
          query: cleanQuery,
          description: metadata.description,
          dependencies: metadata.dependencies,
          columns: metadata.columns || []
        };
      }

      this.logger.log(`[SHARED-CTE] Provided ${Object.keys(sharedCtes).length} shared CTEs`);
      
      res.json({
        success: true,
        sharedCtes
      });
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error getting shared CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      this.scanAndUpdateCache();
      
      const metadata = this.cache[cteName];
      if (!metadata) {
        res.status(404).json({ success: false, error: `Shared CTE '${cteName}' not found` });
        return;
      }

      const content = fs.readFileSync(metadata.filePath, 'utf8');
      
      this.logger.log(`[SHARED-CTE] Retrieved shared CTE: ${cteName}`);
      
      res.json({
        success: true,
        sharedCte: {
          name: metadata.name,
          query: this.extractCleanQuery(content),
          description: metadata.description,
          dependencies: metadata.dependencies,
          columns: metadata.columns || [],
          editableQuery: content
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

      // Parse metadata from query
      const metadata = this.parseMetadataFromQuery(query);
      
      // Write to file
      const filePath = path.join(this.sharedCteDir, `${cteName}.sql`);
      fs.writeFileSync(filePath, query, 'utf8');
      
      // Update cache
      this.scanAndUpdateCache();
      
      this.logger.log(`[SHARED-CTE] Updated shared CTE: ${cteName}`);
      this.logger.log(`[SHARED-CTE] File written to: ${filePath}`);
      
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

  private extractCleanQuery(content: string): string {
    // Remove metadata comments and return clean SQL
    return content
      .replace(/\/\*\s*name\s*:.*?\*\//gi, '')
      .replace(/\/\*\s*description\s*:.*?\*\//gi, '')
      .replace(/\/\*\s*dependencies\s*:.*?\*\//gi, '')
      .trim();
  }

  // TableColumnResolver for wildcard expansion
  private async createTableColumnResolver(): Promise<((tableName: string) => string[]) | undefined> {
    try {
      // Get schema data from SchemaApi
      const schemaData = await this.getSchemaData();
      if (!schemaData || !schemaData.tables) {
        this.logger.log('[SHARED-CTE] No schema data available for wildcard expansion');
        return undefined;
      }

      // Create table-to-columns mapping
      const tableColumns: Record<string, string[]> = {};
      
      for (const table of schemaData.tables) {
        if (table.columns) {
          tableColumns[table.name] = table.columns.map((col: any) => col.name);
          this.logger.log(`[SHARED-CTE] Table resolver: ${table.name} -> [${tableColumns[table.name].join(', ')}]`);
        }
      }

      // Return resolver function
      return (tableName: string): string[] => {
        const columns = tableColumns[tableName] || [];
        this.logger.log(`[SHARED-CTE] Resolving table '${tableName}' -> [${columns.join(', ')}]`);
        return columns;
      };
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Failed to create table column resolver: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
  }

  private async getSchemaData(): Promise<any> {
    try {
      // Read schema file directly since loadSchema method doesn't exist
      const schemaPath = path.join(process.cwd(), 'zosql.schema.js');
      if (!fs.existsSync(schemaPath)) {
        this.logger.log('[SHARED-CTE] Schema file not found');
        return null;
      }

      // Clear require cache to get fresh data
      const cacheBustingUrl = `file://${schemaPath}?t=${Date.now()}`;
      const schemaModule = await import(cacheBustingUrl);
      
      return schemaModule.default || null;
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Failed to load schema data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }


  private parseMetadataFromQuery(queryWithComments: string): { name?: string; description?: string; dependencies?: string[]; cleanQuery: string } {
    const nameMatch = queryWithComments.match(/\/\*\s*name\s*:\s*(.+?)\s*\*\//i);
    const descMatch = queryWithComments.match(/\/\*\s*description\s*:\s*(.+?)\s*\*\//i);
    const depsMatch = queryWithComments.match(/\/\*\s*dependencies\s*:\s*\[([^\]]*)\]\s*\*\//i);
    
    let dependencies: string[] = [];
    if (depsMatch) {
      const depsStr = depsMatch[1].trim();
      if (depsStr) {
        dependencies = depsStr.split(',')
          .map(dep => dep.trim().replace(/['"]/g, ''))
          .filter(dep => dep.length > 0);
      }
    }

    return {
      name: nameMatch ? nameMatch[1].trim() : undefined,
      description: descMatch ? descMatch[1].trim() : undefined,
      dependencies,
      cleanQuery: this.extractCleanQuery(queryWithComments)
    };
  }

  // Manual cache update API
  public async handleRefreshCache(_req: Request, res: Response): Promise<void> {
    try {
      await this.scanAndUpdateCache();
      res.json({
        success: true,
        message: 'Cache refreshed successfully',
        count: Object.keys(this.cache).length
      });
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error refreshing cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Completion API for IntelliSense compatibility
  public async handleGetSharedCteCompletion(_req: Request, res: Response): Promise<void> {
    try {
      await this.scanAndUpdateCache();
      
      const sharedCteTables: string[] = [];
      const sharedCteColumns: Record<string, string[]> = {};
      const sharedCtes: Record<string, any> = {};

      for (const [name, metadata] of Object.entries(this.cache)) {
        sharedCteTables.push(name);
        sharedCteColumns[name] = metadata.columns || [];
        
        try {
          const content = fs.readFileSync(metadata.filePath, 'utf8');
          const cleanQuery = this.extractCleanQuery(content);
          
          sharedCtes[name] = {
            name: metadata.name,
            query: cleanQuery,
            description: metadata.description,
            dependencies: metadata.dependencies,
            columns: metadata.columns || []
          };
        } catch (error) {
          this.logger.log(`[SHARED-CTE] Error reading file for completion ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      this.logger.log(`[SHARED-CTE] Provided completion data for ${sharedCteTables.length} shared CTEs`);
      
      res.json({
        success: true,
        sharedCteTables,
        sharedCteColumns,
        sharedCtes
      });
    } catch (error) {
      this.logger.log(`[SHARED-CTE] Error getting shared CTE completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Methods needed for QueryExecutorApi compatibility
  public getAllSharedCtes(): Record<string, any> {
    this.scanAndUpdateCache();
    
    const sharedCtes: Record<string, any> = {};
    
    for (const [name, metadata] of Object.entries(this.cache)) {
      try {
        const content = fs.readFileSync(metadata.filePath, 'utf8');
        const cleanQuery = this.extractCleanQuery(content);
        
        sharedCtes[name] = {
          name: metadata.name,
          query: cleanQuery,
          description: metadata.description,
          dependencies: metadata.dependencies,
          columns: metadata.columns || []
        };
      } catch (error) {
        this.logger.log(`[SHARED-CTE] Error reading file for ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return sharedCtes;
  }

  public generateWithClause(usedSharedCtes: string[]): string {
    const resolved = this.resolveDependencies(usedSharedCtes);
    const withClauses: string[] = [];
    
    for (const cteName of resolved) {
      const metadata = this.cache[cteName];
      if (metadata) {
        try {
          const content = fs.readFileSync(metadata.filePath, 'utf8');
          const cleanQuery = this.extractCleanQuery(content);
          withClauses.push(`${metadata.name} AS (${cleanQuery})`);
        } catch (error) {
          this.logger.log(`[SHARED-CTE] Error reading file for WITH clause ${cteName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return withClauses.length > 0 ? `WITH ${withClauses.join(', ')}` : '';
  }

  private resolveDependencies(usedSharedCtes: string[]): string[] {
    const resolved: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (cteName: string): void => {
      if (visited.has(cteName)) return;
      if (visiting.has(cteName)) {
        throw new Error(`Circular dependency detected involving ${cteName}`);
      }

      visiting.add(cteName);
      
      const metadata = this.cache[cteName];
      if (metadata && metadata.dependencies) {
        for (const dep of metadata.dependencies) {
          visit(dep);
        }
      }
      
      visiting.delete(cteName);
      visited.add(cteName);
      resolved.push(cteName);
    };

    for (const cteName of usedSharedCtes) {
      if (!visited.has(cteName)) {
        visit(cteName);
      }
    }

    return resolved;
  }
}
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../utils/logging.js';
import { SelectQueryParser, SqlFormatter, QueryFlowDiagramGenerator, CTEComposer } from 'rawsql-ts';
import { FileManager } from '../utils/file-manager.js';
import { CTEDecomposer } from '../utils/cte-decomposer.js';
import { WorkspaceStorageInterface, WorkspaceInfo, PrivateCte } from '../storage/workspace-storage-interface.js';
import { FilesystemWorkspaceStorage } from '../storage/filesystem-workspace-storage.js';
import { LocalStorageWorkspaceStorage } from '../storage/localstorage-workspace-storage.js';

interface FormatterConfig {
  indentSize: number;
  keywordCase: string;
  [key: string]: unknown;
}

// Use interfaces from storage layer

export class WorkspaceApi {
  private logger: Logger;
  private storage: WorkspaceStorageInterface;
  private formatterConfigPath: string;
  private fileManager: FileManager;
  private cteDecomposer: CTEDecomposer;
  private workspaceBasePath: string;

  constructor(storageType: 'filesystem' | 'localstorage' = 'filesystem') {
    this.logger = Logger.getInstance();
    
    // ストレージ実装の選択
    switch (storageType) {
      case 'localstorage':
        this.storage = new LocalStorageWorkspaceStorage();
        this.logger.log('[WORKSPACE-API] Using LocalStorage backend');
        break;
      case 'filesystem':
      default:
        this.storage = new FilesystemWorkspaceStorage();
        this.logger.log('[WORKSPACE-API] Using Filesystem backend');
        break;
    }
    
    this.formatterConfigPath = path.join(process.cwd(), 'zosql.formatter.json');
    this.workspaceBasePath = path.join(process.cwd(), 'workspaces');
    this.fileManager = new FileManager();
    this.cteDecomposer = new CTEDecomposer();
  }

  // ensureWorkspaceStructure is now handled by storage implementations

  private async loadFormatterConfig(): Promise<FormatterConfig> {
    try {
      const fsSync = await import('fs');
      if (fsSync.default.existsSync(this.formatterConfigPath)) {
        const configContent = await fs.readFile(this.formatterConfigPath, 'utf8');
        const config = JSON.parse(configContent);
        this.logger.log('[WORKSPACE] Custom formatter config loaded');
        return config;
      } else {
        this.logger.log('[WORKSPACE] Using default formatter config');
        return this.getDefaultFormatterConfig();
      }
    } catch (error) {
      this.logger.log(`[WORKSPACE] Error loading formatter config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.getDefaultFormatterConfig();
    }
  }

  private getDefaultFormatterConfig(): FormatterConfig {
    return {
      identifierEscape: {
        start: "",
        end: ""
      },
      parameterSymbol: ":",
      parameterStyle: "named",
      indentSize: 4,
      indentChar: " ",
      newline: "\n",
      keywordCase: "lower",
      commaBreak: "before",
      andBreak: "before",
      withClauseStyle: "full-oneline",
      preserveComments: true
    };
  }


  private async extractCTEsAndDecomposeQuery(sql: string): Promise<{ privateCtes: Record<string, PrivateCte>, decomposedQuery: string, flowDiagram?: string }> {
    try {
      this.logger.log(`[WORKSPACE] Starting CTE decomposition using FileManager (${sql.length} chars)`);
      
      // Clear FileManager for this operation
      this.fileManager.clear();
      
      const privateCtes: Record<string, PrivateCte> = {};
      let decomposedQuery = sql;
      let flowDiagram: string | undefined;
      
      try {
        // Use CTEDecomposer to extract CTEs into FileManager
        const result = await this.cteDecomposer.decompose(sql, this.fileManager);
        this.logger.log(`[WORKSPACE] CTEDecomposer found ${result.privateCtesCreated} CTEs`);
        
        // Convert decomposer results to our PrivateCte format
        for (const cte of result.decomposedCTEs) {
          privateCtes[cte.name] = {
            name: cte.name,
            query: cte.query, // CTEDecomposer provides executable SQL
            description: `Extracted CTE: ${cte.name}`,
            dependencies: cte.dependencies || [],
            columns: []
          };
          
          this.logger.log(`[WORKSPACE] Successfully extracted CTE ${cte.name}: ${cte.query.substring(0, 100)}...`);
        }
        
        this.logger.log(`[WORKSPACE] CTE dependencies: ${JSON.stringify(Object.fromEntries(result.decomposedCTEs.map(cte => [cte.name, cte.dependencies])))}`);

        // Format the main query with full-oneline WITH clause (new spec: keep WITH clause)
        try {
          const query = SelectQueryParser.parse(sql);
          const simpleQuery = query.toSimpleQuery();
          
          // Format using full-oneline WITH clause style
          const formatterConfig = await this.loadFormatterConfig();
          const sqlFormatterOptions = {
            ...formatterConfig,
            keywordCase: formatterConfig.keywordCase as "upper" | "lower" | "none" | undefined
          };
          const formatter = new SqlFormatter(sqlFormatterOptions);
          
          const formatResult = formatter.format(simpleQuery);
          decomposedQuery = typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
          
          this.logger.log(`[WORKSPACE] Successfully formatted main query with full-oneline WITH clause`);
        } catch (formatError) {
          this.logger.log(`[WORKSPACE] Failed to format main query, using original SQL: ${formatError instanceof Error ? formatError.message : 'Unknown error'}`);
          decomposedQuery = sql;
        }

        // Generate flow diagram
        try {
          const diagramGenerator = new QueryFlowDiagramGenerator();
          flowDiagram = diagramGenerator.generateMermaidFlow(sql, {
            direction: 'TD',
            title: 'Query Flow Diagram'
          });
          this.logger.log(`[WORKSPACE] Flow diagram generated successfully (${flowDiagram.length} chars)`);
        } catch (diagramError) {
          this.logger.log(`[WORKSPACE] Failed to generate flow diagram: ${diagramError instanceof Error ? diagramError.message : 'Unknown error'}`);
        }
        
      } catch (parseError) {
        this.logger.log(`[WORKSPACE] CTE decomposition failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        return { privateCtes: {}, decomposedQuery: sql, flowDiagram: undefined };
      }

      this.logger.log(`[WORKSPACE] Final result - CTEs: ${Object.keys(privateCtes).length}, Decomposed query length: ${decomposedQuery.length}`);
      return { privateCtes, decomposedQuery, flowDiagram };
      
    } catch (error) {
      this.logger.log(`[WORKSPACE] Fatal error in CTE extraction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { privateCtes: {}, decomposedQuery: sql, flowDiagram: undefined };
    }
  }







  public async handleDecomposeQuery(req: Request, res: Response): Promise<void> {
    try {
      const { sql, queryName, originalFilePath } = req.body;

      if (!sql) {
        res.status(400).json({ success: false, error: 'SQL is required' });
        return;
      }

      this.logger.log(`[WORKSPACE] Decomposing query: ${queryName || 'unnamed'}`);

      // Clear existing workspace
      await this.storage.clearWorkspace();

      // Extract CTEs and create decomposed query
      const { privateCtes, decomposedQuery, flowDiagram } = await this.extractCTEsAndDecomposeQuery(sql);

      // Create workspace info
      const workspaceInfo: WorkspaceInfo = {
        name: queryName || 'decomposed_query',
        originalQuery: sql,
        originalFilePath: originalFilePath || '',
        decomposedQuery,
        privateCtes,
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      // Save workspace using storage abstraction
      await this.storage.saveWorkspace(workspaceInfo);

      // Note: decomposed query file is now handled by storage implementation

      res.json({
        success: true,
        workspace: workspaceInfo,
        privateCteCount: Object.keys(privateCtes).length,
        decomposedQuery,
        flowDiagram,
        message: 'Query decomposed successfully'
      });

    } catch (error) {
      this.logger.log(`[WORKSPACE] Error decomposing query: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  public async handleGetWorkspace(_req: Request, res: Response): Promise<void> {
    try {
      const workspaceInfo = await this.storage.getWorkspace();
      const hasWorkspace = await this.storage.hasWorkspace();
      
      res.json({
        success: true,
        workspace: workspaceInfo,
        hasWorkspace: hasWorkspace
      });
    } catch (error) {
      this.logger.log(`[WORKSPACE] Error getting workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  public async handleGetPrivateCtes(_req: Request, res: Response): Promise<void> {
    try {
      const privateCtes = await this.storage.getPrivateCtes();
      
      res.json({
        success: true,
        privateCtes,
        count: Object.keys(privateCtes).length
      });
    } catch (error) {
      this.logger.log(`[WORKSPACE] Error getting private CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  public async handleGetSinglePrivateCte(req: Request, res: Response): Promise<void> {
    try {
      const { cteName } = req.params;
      
      if (!cteName) {
        res.status(400).json({ success: false, error: 'CTE name is required' });
        return;
      }

      const privateCteDir = path.join(this.workspaceBasePath, 'private-cte');
      const filePath = path.join(privateCteDir, `${cteName}.sql`);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        
        // Parse metadata from comments
        const nameMatch = content.match(/\/\* name: (.*?) \*\//);
        const descMatch = content.match(/\/\* description: (.*?) \*\//);
        const depsMatch = content.match(/\/\* dependencies: (.*?) \*\//);
        
        // Extract complete SQL (without metadata comments)
        const fullQuery = content.replace(/\/\*[\s\S]*?\*\/\s*/g, '').trim();
        const actualCteName = nameMatch ? nameMatch[1] : cteName;
        
        const privateCte: PrivateCte = {
          name: actualCteName,
          query: fullQuery,
          description: descMatch ? descMatch[1] : '',
          dependencies: depsMatch ? JSON.parse(depsMatch[1]) : [],
          columns: []
        };

        this.logger.log(`[WORKSPACE] Retrieved single private CTE: ${cteName}`);

        res.json({
          success: true,
          cte: privateCte,
          message: `Private CTE ${cteName} retrieved successfully`
        });

      } catch (fileError) {
        this.logger.log(`[WORKSPACE] Private CTE file not found: ${cteName}`);
        res.status(404).json({
          success: false,
          error: `Private CTE not found: ${cteName}`
        });
      }
    } catch (error) {
      this.logger.log(`[WORKSPACE] Error getting single private CTE: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  public async handleUpdatePrivateCte(req: Request, res: Response): Promise<void> {
    try {
      const { cteName } = req.params;
      const { query, description } = req.body;

      if (!cteName || !query) {
        res.status(400).json({ success: false, error: 'CTE name and query are required' });
        return;
      }

      const privateCteDir = path.join(this.workspaceBasePath, 'private-cte');
      const filePath = path.join(privateCteDir, `${cteName}.sql`);

      // Format the query
      const formatterConfig = await this.loadFormatterConfig();
      const sqlFormatterOptions = {
        ...formatterConfig,
        keywordCase: formatterConfig.keywordCase as "upper" | "lower" | "none" | undefined
      };
      const formatter = new SqlFormatter(sqlFormatterOptions);
      let formattedQuery = query;
      try {
        const parsedQuery = SelectQueryParser.parse(query);
        const formatResult = formatter.format(parsedQuery);
        formattedQuery = typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
        this.logger.log(`[WORKSPACE] Formatted updated CTE ${cteName} successfully`);
      } catch (formatError) {
        this.logger.log(`[WORKSPACE] Failed to format updated CTE ${cteName}: ${formatError instanceof Error ? formatError.message : 'Unknown error'}`);
        // Use original query if formatting fails
      }

      // Create content with metadata
      const content = `/* name: ${cteName} */
/* description: ${description || 'No description'} */
/* dependencies: [] */

${formattedQuery}`;

      await fs.writeFile(filePath, content, 'utf8');

      // Update workspace info
      const infoPath = path.join(this.workspaceBasePath, 'workspace.json');
      try {
        const workspaceContent = await fs.readFile(infoPath, 'utf8');
        const workspaceInfo = JSON.parse(workspaceContent);
        workspaceInfo.lastModified = new Date().toISOString();
        await fs.writeFile(infoPath, JSON.stringify(workspaceInfo, null, 2), 'utf8');
      } catch {
        // Workspace info doesn't exist, that's ok
      }

      this.logger.log(`[WORKSPACE] Updated private CTE: ${cteName}`);

      res.json({
        success: true,
        message: `Private CTE ${cteName} updated successfully`
      });

    } catch (error) {
      this.logger.log(`[WORKSPACE] Error updating private CTE: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  public async handleReadSqlFile(req: Request, res: Response): Promise<void> {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        res.status(400).json({ success: false, error: 'File path is required' });
        return;
      }

      // セキュリティ: プロジェクトルート内のファイルのみ許可
      const fullPath = path.resolve(process.cwd(), filePath.replace(/^\//, ''));
      const projectRoot = path.resolve(process.cwd());
      
      if (!fullPath.startsWith(projectRoot)) {
        res.status(403).json({ success: false, error: 'Access denied: file outside project directory' });
        return;
      }

      try {
        const content = await fs.readFile(fullPath, 'utf8');
        this.logger.log(`[WORKSPACE] Read SQL file: ${filePath} (${content.length} chars)`);
        
        res.json({
          success: true,
          content,
          filePath,
          size: content.length
        });
      } catch (fileError) {
        this.logger.log(`[WORKSPACE] File read error: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        res.status(404).json({
          success: false,
          error: `File not found: ${filePath}`
        });
      }
    } catch (error) {
      this.logger.log(`[WORKSPACE] API error reading SQL file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  public async handleClearWorkspace(_req: Request, res: Response): Promise<void> {
    try {
      await this.storage.clearWorkspace();
      
      res.json({
        success: true,
        message: 'Workspace cleared successfully'
      });

    } catch (error) {
      this.logger.log(`[WORKSPACE] Error clearing workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  public async handleComposeQuery(req: Request, res: Response): Promise<void> {
    try {
      const { decomposedQuery } = req.body;

      // Load workspace info
      const infoPath = path.join(this.workspaceBasePath, 'workspace.json');
      
      try {
        const content = await fs.readFile(infoPath, 'utf8');
        const workspaceInfo: WorkspaceInfo = JSON.parse(content);
        
        // Load all private CTEs
        const privateCteData = await this.loadPrivateCtes();
        
        // Compose the final query with WITH clause
        const composedQuery = this.composeQueryWithCTEs(decomposedQuery, privateCteData.privateCtes);
        
        // Write back to original file if specified
        if (workspaceInfo.originalFilePath) {
          // Ensure we don't overwrite workspace files
          const originalPath = path.resolve(process.cwd(), workspaceInfo.originalFilePath);
          const workspacePath = path.resolve(this.workspaceBasePath);
          
          // Only write if the original file is outside the workspace directory
          if (!originalPath.startsWith(workspacePath)) {
            await fs.writeFile(originalPath, composedQuery, 'utf8');
            this.logger.log(`[WORKSPACE] Composed query written to: ${originalPath}`);
          } else {
            this.logger.log(`[WORKSPACE] Skipped writing to workspace file: ${originalPath}`);
          }
        }
        
        res.json({
          success: true,
          composedQuery,
          originalFilePath: workspaceInfo.originalFilePath,
          message: 'Query composed and saved successfully'
        });
        
      } catch (fileError) {
        res.status(404).json({
          success: false,
          error: 'No active workspace found'
        });
      }
    } catch (error) {
      this.logger.log(`[WORKSPACE] Error composing query: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async loadPrivateCtes(): Promise<{ privateCtes: Record<string, PrivateCte>, count: number }> {
    const privateCteDir = path.join(this.workspaceBasePath, 'private-cte');
    
    try {
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
          
          // For compose functionality, use the complete SQL as-is
          // Since compose needs to rebuild the WITH clause structure
          const query = fullQuery;
          const cteName = nameMatch ? nameMatch[1] : path.basename(file, '.sql');
          
          privateCtes[cteName] = {
            name: cteName,
            query,
            description: descMatch ? descMatch[1] : '',
            dependencies: depsMatch ? JSON.parse(depsMatch[1]) : [],
            columns: []
          };
        }
      }

      return {
        privateCtes,
        count: Object.keys(privateCtes).length
      };

    } catch (error) {
      return {
        privateCtes: {},
        count: 0
      };
    }
  }

  private composeQueryWithCTEs(decomposedQuery: string, privateCtes: Record<string, PrivateCte>): string {
    if (Object.keys(privateCtes).length === 0) {
      return decomposedQuery;
    }

    try {
      // Use CTEComposer with library specifications
      const composer = new CTEComposer({
        preset: 'postgres',
        withClauseStyle: 'full-oneline'
      });
      
      // Convert to library format - use queries as-is
      const editedCTEs = Object.values(privateCtes).map(cte => ({
        name: cte.name,
        query: cte.query
      }));
      
      const composedSQL = composer.compose(editedCTEs, decomposedQuery);
      this.logger.log(`[WORKSPACE] CTEComposer successfully composed query (${composedSQL.length} chars)`);
      
      return composedSQL;
      
    } catch (error) {
      this.logger.log(`[WORKSPACE] CTEComposer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Return decomposed query if composition fails
      return decomposedQuery;
    }
  }

  /**
   * Get workspace file by type and name
   */
  public async handleGetWorkspaceFile(req: Request, res: Response): Promise<void> {
    try {
      const { type, fileName } = req.params;
      
      this.logger.log(`[WORKSPACE] Getting ${type} file: ${fileName}`);
      
      const result = await this.storage.getWorkspaceFile(type as 'main' | 'cte', fileName);

      if (result) {
        res.json({
          success: true,
          content: result.content,
          fileName: result.fileName,
          type: result.type
        });
      } else {
        res.status(404).json({
          success: false,
          error: `File not found: ${fileName}`,
          fileName,
          type
        });
      }

    } catch (error) {
      this.logger.log(`[WORKSPACE] Error getting workspace file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

}
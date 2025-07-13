import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../utils/logging.js';
import { SelectQueryParser, SqlFormatter, CTECollector, CTEDependencyAnalyzer, CTEDisabler } from 'rawsql-ts';

// Use any for now to avoid type compatibility issues
type FormatterConfig = any;

interface PrivateCte {
  name: string;
  query: string;
  description?: string;
  dependencies: string[];
  columns?: string[];
}

interface WorkspaceInfo {
  name: string;
  originalQuery: string;
  originalFilePath: string;  // 元のSQLファイルパス
  decomposedQuery: string;   // CTEを除去したクエリ
  privateCtes: Record<string, PrivateCte>;
  created: string;
  lastModified: string;
}

export class WorkspaceApi {
  private logger: Logger;
  private workspaceBasePath: string;
  private formatterConfigPath: string;

  constructor() {
    this.logger = Logger.getInstance();
    this.workspaceBasePath = path.join(process.cwd(), 'zosql', 'workspace');
    this.formatterConfigPath = path.join(process.cwd(), 'zosql.formatter.json');
  }

  private async ensureWorkspaceStructure(): Promise<void> {
    const privateCteDir = path.join(this.workspaceBasePath, 'private-cte');
    await fs.mkdir(privateCteDir, { recursive: true });
  }

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

  private async clearWorkspace(): Promise<void> {
    try {
      await fs.rm(this.workspaceBasePath, { recursive: true, force: true });
      this.logger.log('[WORKSPACE] Workspace cleared');
    } catch (error) {
      // Workspace doesn't exist, that's fine
      this.logger.log('[WORKSPACE] Workspace already clean or doesn\'t exist');
    }
  }

  private async extractCTEsAndDecomposeQuery(sql: string): Promise<{ privateCtes: Record<string, PrivateCte>, decomposedQuery: string }> {
    try {
      this.logger.log(`[WORKSPACE] Starting CTE extraction for SQL (${sql.length} chars)`);
      
      let privateCtes: Record<string, PrivateCte> = {};
      let decomposedQuery = sql;
      
      try {
        const query = SelectQueryParser.parse(sql);
        const simpleQuery = query.toSimpleQuery();
        
        this.logger.log(`[WORKSPACE] rawsql-ts parse successful - hasWithClause: ${!!simpleQuery.withClause}`);

        // Use CTECollector to collect all CTEs
        const collector = new CTECollector();
        collector.visit(simpleQuery);
        const collectedCTEs = collector.getCommonTables();
        
        this.logger.log(`[WORKSPACE] CTECollector found ${collectedCTEs.length} CTEs`);

        // Extract CTEs using CTECollector results and add dependency analysis
        if (collectedCTEs.length > 0) {
          privateCtes = await this.extractCTEsFromCollector(collectedCTEs);
          
          // Use CTEDependencyAnalyzer to get proper dependencies
          const dependencyAnalyzer = new CTEDependencyAnalyzer();
          dependencyAnalyzer.analyzeDependencies(simpleQuery);
          
          // Update dependencies for each CTE
          Object.keys(privateCtes).forEach(cteName => {
            privateCtes[cteName].dependencies = dependencyAnalyzer.getDependencies(cteName);
          });
          
          this.logger.log(`[WORKSPACE] CTE dependencies analyzed. Execution order: ${dependencyAnalyzer.getExecutionOrder()}`);
          
          if (dependencyAnalyzer.hasCircularDependency()) {
            this.logger.log(`[WORKSPACE] WARNING: Circular dependency detected in CTEs`);
          }
        }

        // Extract main query using CTEDisabler
        if (collectedCTEs.length > 0) {
          decomposedQuery = await this.extractMainQueryWithCTEDisabler(simpleQuery);
        }
        
      } catch (parseError) {
        this.logger.log(`[WORKSPACE] rawsql-ts parse failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        this.logger.log(`[WORKSPACE] Cannot process without valid AST - skipping CTE extraction`);
        // Return original SQL without decomposition if parsing fails
        return { privateCtes: {}, decomposedQuery: sql };
      }

      this.logger.log(`[WORKSPACE] Final result - CTEs: ${Object.keys(privateCtes).length}, Decomposed query length: ${decomposedQuery.length}`);
      return { privateCtes, decomposedQuery };
      
    } catch (error) {
      this.logger.log(`[WORKSPACE] Fatal error in CTE extraction: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { privateCtes: {}, decomposedQuery: sql };
    }
  }

  private async extractCTEsFromCollector(collectedCTEs: any[]): Promise<Record<string, PrivateCte>> {
    const privateCtes: Record<string, PrivateCte> = {};
    const formatterConfig = await this.loadFormatterConfig();
    const formatter = new SqlFormatter(formatterConfig);
    
    collectedCTEs.forEach((cte: any, index: number) => {
      this.logger.log(`[WORKSPACE] Processing CTE ${index}`);
      
      const cteName = cte.aliasExpression?.table?.name;
      this.logger.log(`[WORKSPACE] CTE name: ${cteName}`);
      
      if (cteName && cte.query) {
        try {
          const cteQuery = this.extractQueryFromAST(cte.query, formatter);
          privateCtes[cteName] = {
            name: cteName,
            query: cteQuery,
            description: `Extracted CTE: ${cteName}`,
            dependencies: cte.dependencies || [],
            columns: []
          };
          this.logger.log(`[WORKSPACE] Successfully extracted CTE ${cteName}: ${cteQuery.substring(0, 100)}...`);
        } catch (formatError) {
          this.logger.log(`[WORKSPACE] Failed to extract CTE ${cteName}: ${formatError instanceof Error ? formatError.message : 'Unknown error'}`);
        }
      }
    });
    
    return privateCtes;
  }

  private async extractMainQueryWithCTEDisabler(simpleQuery: any): Promise<string> {
    try {
      // Use CTEDisabler to remove CTEs from the query  
      const disabler = new CTEDisabler();
      const queryWithoutCTEs = disabler.visit(simpleQuery);
      
      // Format the main query using the custom formatter config
      const formatterConfig = await this.loadFormatterConfig();
      const formatter = new SqlFormatter(formatterConfig);
      
      const formatResult = formatter.format(queryWithoutCTEs);
      const formattedMainQuery = typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
      
      this.logger.log(`[WORKSPACE] Successfully extracted and formatted main query using CTEDisabler`);
      return formattedMainQuery;
      
    } catch (error) {
      this.logger.log(`[WORKSPACE] Failed to extract main query with CTEDisabler: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }


  private extractQueryFromAST(queryAST: any, formatter: SqlFormatter): string {
    try {
      // Try to format the AST directly
      const formattedResult = formatter.format(queryAST);
      return typeof formattedResult === 'string' ? formattedResult : formattedResult.formattedSql;
    } catch (error) {
      this.logger.log(`[WORKSPACE] Direct AST formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Try to extract SQL string from AST if it has a toSqlString method
      if (typeof queryAST.toSqlString === 'function') {
        return queryAST.toSqlString();
      }
      
      // If AST has basic query structure, try to reconstruct
      if (queryAST.selectClause && queryAST.fromClause) {
        return this.reconstructQueryFromAST(queryAST);
      }
      
      throw new Error('Cannot extract SQL from AST');
    }
  }

  private reconstructQueryFromAST(queryAST: any): string {
    // Basic reconstruction - this is a simplified version
    let sql = 'SELECT ';
    
    // Add SELECT clause
    if (queryAST.selectClause && queryAST.selectClause.selectColumns) {
      const columns = queryAST.selectClause.selectColumns.map((col: any) => {
        if (col.expression && typeof col.expression.toSqlString === 'function') {
          return col.expression.toSqlString();
        }
        return '*';
      });
      sql += columns.join(', ');
    } else {
      sql += '*';
    }
    
    // Add FROM clause
    if (queryAST.fromClause && queryAST.fromClause.source) {
      sql += ' FROM ';
      if (typeof queryAST.fromClause.source.toSqlString === 'function') {
        sql += queryAST.fromClause.source.toSqlString();
      } else {
        sql += 'unknown_table';
      }
    }
    
    return sql;
  }





  private async savePrivateCteFiles(privateCtes: Record<string, PrivateCte>): Promise<void> {
    const privateCteDir = path.join(this.workspaceBasePath, 'private-cte');
    const formatterConfig = await this.loadFormatterConfig();
    const formatter = new SqlFormatter(formatterConfig);
    
    for (const [cteName, cte] of Object.entries(privateCtes)) {
      const fileName = `${cteName}.sql`;
      const filePath = path.join(privateCteDir, fileName);
      
      // Format the CTE query
      let formattedQuery = cte.query;
      try {
        const parsedQuery = SelectQueryParser.parse(cte.query);
        const formatResult = formatter.format(parsedQuery);
        formattedQuery = typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
        this.logger.log(`[WORKSPACE] Formatted CTE ${cteName} successfully`);
      } catch (formatError) {
        this.logger.log(`[WORKSPACE] Failed to format CTE ${cteName}: ${formatError instanceof Error ? formatError.message : 'Unknown error'}`);
        // Use original query if formatting fails
      }
      
      // Add metadata as comments
      const content = `/* name: ${cte.name} */
/* description: ${cte.description || 'No description'} */
/* dependencies: ${JSON.stringify(cte.dependencies)} */

${formattedQuery}`;

      await fs.writeFile(filePath, content, 'utf8');
      this.logger.log(`[WORKSPACE] Saved private CTE: ${fileName}`);
    }
  }

  private async saveWorkspaceInfo(workspaceInfo: WorkspaceInfo): Promise<void> {
    const infoPath = path.join(this.workspaceBasePath, 'workspace.json');
    await fs.writeFile(infoPath, JSON.stringify(workspaceInfo, null, 2), 'utf8');
    this.logger.log('[WORKSPACE] Saved workspace info');
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
      await this.clearWorkspace();
      await this.ensureWorkspaceStructure();

      // Extract CTEs and create decomposed query
      const { privateCtes, decomposedQuery } = await this.extractCTEsAndDecomposeQuery(sql);

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

      // Save private CTE files
      await this.savePrivateCteFiles(privateCtes);

      // Save workspace info
      await this.saveWorkspaceInfo(workspaceInfo);

      // Save decomposed query file (CTE除去済み)
      const decomposedQueryPath = path.join(this.workspaceBasePath, `${workspaceInfo.name}.sql`);
      await fs.writeFile(decomposedQueryPath, decomposedQuery, 'utf8');

      res.json({
        success: true,
        workspace: workspaceInfo,
        privateCteCount: Object.keys(privateCtes).length,
        decomposedQuery,
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
      const infoPath = path.join(this.workspaceBasePath, 'workspace.json');
      
      try {
        const content = await fs.readFile(infoPath, 'utf8');
        const workspaceInfo = JSON.parse(content);
        
        res.json({
          success: true,
          workspace: workspaceInfo,
          hasWorkspace: true
        });
      } catch {
        res.json({
          success: true,
          workspace: null,
          hasWorkspace: false
        });
      }
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
            
            const query = content.replace(/\/\*[\s\S]*?\*\/\s*/g, '').trim();
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

        res.json({
          success: true,
          privateCtes,
          count: Object.keys(privateCtes).length
        });

      } catch {
        res.json({
          success: true,
          privateCtes: {},
          count: 0
        });
      }
    } catch (error) {
      this.logger.log(`[WORKSPACE] Error getting private CTEs: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const formatter = new SqlFormatter(formatterConfig);
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
      await this.clearWorkspace();
      
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
          await fs.writeFile(workspaceInfo.originalFilePath, composedQuery, 'utf8');
          this.logger.log(`[WORKSPACE] Composed query written to: ${workspaceInfo.originalFilePath}`);
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
          
          const query = content.replace(/\/\*[\s\S]*?\*\/\s*/g, '').trim();
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

    // Build WITH clause
    const cteDefinitions = Object.values(privateCtes).map(cte => {
      return `${cte.name} AS (\n  ${cte.query.replace(/\n/g, '\n  ')}\n)`;
    });

    const withClause = `WITH ${cteDefinitions.join(',\n')}`;
    
    return `${withClause}\n${decomposedQuery}`;
  }
}
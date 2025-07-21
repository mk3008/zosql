/**
 * SQL Decomposer Use Case
 * Hexagonal Architecture - Core Layer
 * Decomposes SQL with CTEs into individual SQL models
 */

import { SqlModelEntity } from '@core/entities/sql-model';
import { CTEEntity } from '@core/entities/cte';

export interface SqlParserPort {
  /**
   * Parse SQL and extract CTEs
   */
  extractCTEs(sql: string): Promise<CTEEntity[]>;
  
  /**
   * Extract main query without WITH clause as string
   */
  extractMainQuery(sql: string): Promise<string>;
  
  /**
   * Extract dependencies from SQL query
   */
  extractDependencies(sql: string): Promise<string[]>;
}

export interface CteDependencyAnalyzerPort {
  /**
   * Find all CTEs that depend on a given CTE
   */
  findDependents(cteName: string, allCTEs: Record<string, CTEEntity>): string[];
  
  /**
   * Get dependency graph
   */
  getDependencyGraph(ctes: Record<string, CTEEntity>): Record<string, string[]>;
}

export class SqlDecomposerUseCase {
  constructor(
    private parser: SqlParserPort,
    private dependencyAnalyzer: CteDependencyAnalyzerPort
  ) {}

  /**
   * Decompose SQL with CTEs into individual SQL models
   * @param sql - Full SQL query potentially containing WITH clause
   * @param fileName - Name of the file (used for main model name)
   * @returns Array of SQL model entities with proper references
   */
  async decomposeSql(sql: string, fileName: string): Promise<SqlModelEntity[]> {
    // Extract CTEs from the SQL
    const ctes = await this.parser.extractCTEs(sql);
    
    if (ctes.length === 0) {
      // No CTEs found, return single main model
      const mainQuery = await this.parser.extractMainQuery(sql);
      const mainModel = new SqlModelEntity(
        'main',
        fileName,
        mainQuery,
        [],
        undefined,
        sql
      );
      return [mainModel];
    }

    // First pass: Create all SqlModelEntity instances without dependencies
    const modelMap = new Map<string, SqlModelEntity>();
    
    // Create CTE models
    for (const cte of ctes) {
      const cteModel = new SqlModelEntity(
        'cte',
        cte.name,
        cte.query,
        [], // Will be populated in second pass
        cte.getColumnNames()
      );
      modelMap.set(cte.name, cteModel);
    }

    // Extract main query without WITH clause
    const mainQuery = await this.parser.extractMainQuery(sql);
    const mainModel = new SqlModelEntity(
      'main',
      fileName,
      mainQuery,
      [], // Will be populated in second pass
      undefined,
      sql
    );
    modelMap.set(fileName, mainModel);

    // Second pass: Build dependency relationships
    const cteMap: Record<string, CTEEntity> = {};
    ctes.forEach(cte => {
      cteMap[cte.name] = cte;
    });

    // Set CTE dependencies based on their internal dependencies
    for (const cte of ctes) {
      const cteModel = modelMap.get(cte.name)!;
      
      // Add dependencies from CTE's internal dependencies
      for (const depName of cte.dependencies) {
        const depModel = modelMap.get(depName);
        if (depModel) {
          cteModel.addDependency(depModel);
        }
      }
    }

    // Find main query dependencies
    const mainDependencies = await this.parser.extractDependencies(mainQuery);
    const cteNames = new Set(ctes.map(cte => cte.name));
    
    for (const depName of mainDependencies) {
      if (cteNames.has(depName)) {
        const depModel = modelMap.get(depName);
        if (depModel) {
          mainModel.addDependency(depModel);
        }
      }
    }

    return Array.from(modelMap.values());
  }

  /**
   * Reconstruct full SQL from decomposed models
   * @param models - Array of SQL model entities
   * @param mainModelName - Name of the main model to reconstruct
   * @returns Reconstructed SQL with WITH clause
   */
  async reconstructSql(models: SqlModelEntity[], mainModelName: string): Promise<string> {
    const mainModel = models.find(m => m.type === 'main' && m.name === mainModelName);
    if (!mainModel) {
      throw new Error(`Main model "${mainModelName}" not found`);
    }

    // Use the model's getFullSql() method which handles dependency resolution
    return mainModel.getFullSql();
  }

  /**
   * Get execution order for CTEs based on dependencies
   * @param models - Array of SQL model entities
   * @returns Ordered array of CTE names
   */
  getExecutionOrder(models: SqlModelEntity[]): string[] {
    const cteModels = models.filter(m => m.type === 'cte');
    
    // Use topological sort based on the dependency relationships
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (model: SqlModelEntity) => {
      if (visited.has(model.name)) return;
      visited.add(model.name);
      
      // First visit all dependencies
      model.dependents.forEach(dep => {
        if (dep.type === 'cte') {
          visit(dep);
        }
      });
      
      // Then add this model
      result.push(model.name);
    };

    cteModels.forEach(model => visit(model));
    
    return result;
  }
}
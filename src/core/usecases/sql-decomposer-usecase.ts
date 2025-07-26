/**
 * SQL Decomposer Use Case
 * Hexagonal Architecture - Core Layer
 * Decomposes SQL with CTEs into individual SQL models
 */

import { SqlModelEntity } from '@core/entities/sql-model';
import { CTEEntity } from '@core/entities/cte';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { SelectQueryParser } from 'rawsql-ts';

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
    private readonly _dependencyAnalyzer: CteDependencyAnalyzerPort // TODO: Implement dependency analysis
  ) {
    // Suppress unused variable warning for future use
    void this._dependencyAnalyzer;
  }

  /**
   * Decompose SQL with CTEs into individual SQL models
   * @param sql - Full SQL query potentially containing WITH clause
   * @param fileName - Name of the file (used for main model name)
   * @param formatter - Optional SqlFormatter to use for the models
   * @returns Array of SQL model entities with proper references
   */
  async decomposeSql(sql: string, fileName: string, formatterEntity?: SqlFormatterEntity): Promise<SqlModelEntity[]> {
    // Extract CTEs from the SQL
    const ctes = await this.parser.extractCTEs(sql);
    
    if (ctes.length === 0) {
      // No CTEs found, return single main model
      const mainQuery = await this.parser.extractMainQuery(sql);
      
      // Format the main query using the provided formatter
      let formattedMainQuery = mainQuery;
      if (formatterEntity) {
        try {
          const formatter = formatterEntity.getSqlFormatter();
          console.log('[DEBUG] Attempting to parse and format:', mainQuery);
          // Parse the SQL string first, then format it
          const parsedQuery = SelectQueryParser.parse(mainQuery);
          console.log('[DEBUG] Parse successful, query type:', parsedQuery.constructor.name);
          const formatted = formatter.format(parsedQuery);
          formattedMainQuery = formatted.formattedSql;
          console.log('[DEBUG] Format successful:', formattedMainQuery);
        } catch (error: any) {
          console.error('[DEBUG] rawsql-ts error:', error);
          console.error('[DEBUG] Error details:', {
            type: error.constructor.name,
            message: error.message,
            sql: mainQuery
          });
          // Keep original query if formatting fails
        }
      }
      
      const mainModel = new SqlModelEntity(
        'main',
        fileName,
        formattedMainQuery,
        [],
        undefined,
        sql,
        formatterEntity?.getSqlFormatter()
      );
      return [mainModel];
    }

    // First pass: Create all SqlModelEntity instances without dependencies
    const modelMap = new Map<string, SqlModelEntity>();
    
    // Create CTE models
    for (const cte of ctes) {
      // Format the CTE query using the provided formatter
      let formattedCteQuery = cte.query;
      if (formatterEntity) {
        try {
          const formatter = formatterEntity.getSqlFormatter();
          console.log(`[DEBUG] Attempting to parse and format CTE ${cte.name}:`, cte.query);
          // Parse the SQL string first, then format it
          const parsedQuery = SelectQueryParser.parse(cte.query);
          console.log(`[DEBUG] CTE ${cte.name} parse successful, query type:`, parsedQuery.constructor.name);
          const formatted = formatter.format(parsedQuery);
          formattedCteQuery = formatted.formattedSql;
          console.log(`[DEBUG] CTE ${cte.name} format successful:`, formattedCteQuery);
        } catch (error: any) {
          console.error(`[DEBUG] rawsql-ts error for CTE ${cte.name}:`, error);
          console.error('[DEBUG] Error details:', {
            type: error.constructor.name,
            message: error.message,
            sql: cte.query
          });
          // Keep original query if formatting fails
        }
      }
      
      const cteModel = new SqlModelEntity(
        'cte',
        cte.name,
        formattedCteQuery,
        [], // Will be populated in second pass
        cte.getColumnNames(),
        undefined,
        formatterEntity?.getSqlFormatter()
      );
      modelMap.set(cte.name, cteModel);
    }

    // Extract main query without WITH clause
    const mainQuery = await this.parser.extractMainQuery(sql);
    
    // Format the main query using the provided formatter
    let formattedMainQuery = mainQuery;
    if (formatterEntity) {
      try {
        const formatter = formatterEntity.getSqlFormatter();
        console.log('[DEBUG] Attempting to parse and format main query:', mainQuery);
        // Parse the SQL string first, then format it
        const parsedQuery = SelectQueryParser.parse(mainQuery);
        console.log('[DEBUG] Main query parse successful, query type:', parsedQuery.constructor.name);
        const formatted = formatter.format(parsedQuery);
        formattedMainQuery = formatted.formattedSql;
        console.log('[DEBUG] Main query format successful:', formattedMainQuery);
      } catch (error: any) {
        console.error('[DEBUG] rawsql-ts error for main query:', error);
        console.error('[DEBUG] Error details:', {
          type: error.constructor.name,
          message: error.message,
          sql: mainQuery
        });
        // Keep original query if formatting fails
      }
    }
    
    const mainModel = new SqlModelEntity(
      'main',
      fileName,
      formattedMainQuery,
      [], // Will be populated in second pass
      undefined,
      sql,
      formatterEntity?.getSqlFormatter()
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
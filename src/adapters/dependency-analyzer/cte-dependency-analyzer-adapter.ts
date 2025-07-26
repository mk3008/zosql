/**
 * CTE Dependency Analyzer Adapter
 * Infrastructure Layer - Wraps CTEDependencyResolverImpl for SQL decomposer
 */

import { CteDependencyAnalyzerPort } from '@core/usecases/sql-decomposer-usecase';
import { CTEDependencyResolverImpl } from '@core/usecases/cte-dependency-resolver';
import { CTEEntity } from '@core/entities/cte';
import { CTE } from '@shared/types';

export class CteDependencyAnalyzerAdapter implements CteDependencyAnalyzerPort {
  private resolver: CTEDependencyResolverImpl;

  constructor() {
    this.resolver = new CTEDependencyResolverImpl();
  }

  /**
   * Find all CTEs that depend on a given CTE
   */
  findDependents(cteName: string, allCTEs: Record<string, CTEEntity>): string[] {
    // Convert CTEEntity to CTE interface for the resolver
    const cteMap: Record<string, CTE> = {};
    for (const [name, entity] of Object.entries(allCTEs)) {
      cteMap[name] = {
        name: entity.name,
        query: entity.query,
        dependencies: entity.dependencies,
        columns: entity.columns,
        description: entity.description
      };
    }

    return this.resolver.findDependents(cteName, cteMap);
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(ctes: Record<string, CTEEntity>): Record<string, string[]> {
    // Convert CTEEntity to CTE interface for the resolver
    const cteMap: Record<string, CTE> = {};
    for (const [name, entity] of Object.entries(ctes)) {
      cteMap[name] = {
        name: entity.name,
        query: entity.query,
        dependencies: entity.dependencies,
        columns: entity.columns,
        description: entity.description
      };
    }

    return this.resolver.getDependencyGraph(cteMap);
  }
}
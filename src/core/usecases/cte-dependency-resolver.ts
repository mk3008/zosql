import { CTEDependencyResolver } from '@core/ports/workspace';
import { CTE } from '@shared/types';

export class CTEDependencyResolverImpl implements CTEDependencyResolver {
  
  /**
   * Resolves CTE dependencies and generates executable SQL
   * @param targetCTE - The target CTE name to resolve
   * @param allCTEs - All available CTEs
   * @returns Executable SQL with dependencies resolved
   */
  resolveDependencies(targetCTE: string, allCTEs: Record<string, CTE>): string {
    const targetCTEData = allCTEs[targetCTE];
    if (!targetCTEData) {
      throw new Error(`CTE not found: ${targetCTE}`);
    }

    // Collect dependencies using topological sort
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const orderedCTEs: string[] = [];

    const visit = (cteName: string): void => {
      if (visited.has(cteName)) return;
      
      if (visiting.has(cteName)) {
        throw new Error('Circular dependency detected');
      }

      visiting.add(cteName);
      
      const cte = allCTEs[cteName];
      if (cte && cte.dependencies) {
        for (const dep of cte.dependencies) {
          if (allCTEs[dep]) {
            visit(dep);
          }
        }
      }
      
      visiting.delete(cteName);
      visited.add(cteName);
      orderedCTEs.push(cteName);
    };

    // Resolve target CTE dependencies
    visit(targetCTE);

    // If no dependencies, return simple query
    if (orderedCTEs.length === 1 && orderedCTEs[0] === targetCTE) {
      return targetCTEData.query;
    }

    // Build WITH clause with dependencies
    const cteDefinitions = orderedCTEs.map(cteName => {
      const cte = allCTEs[cteName];
      return `${cteName} AS (\n    ${cte.query.replace(/\n/g, '\n    ')}\n)`;
    });

    return `WITH ${cteDefinitions.join(',\n')}\nSELECT * FROM ${targetCTE}`;
  }

  /**
   * Validates that there are no circular dependencies in the CTE graph
   * @param ctes - All CTEs to validate
   * @returns true if no cycles exist, false otherwise
   */
  validateNoCycles(ctes: Record<string, CTE>): boolean {
    try {
      const visited = new Set<string>();
      const visiting = new Set<string>();

      const visit = (cteName: string): void => {
        if (visited.has(cteName)) return;
        
        if (visiting.has(cteName)) {
          throw new Error('Circular dependency detected');
        }

        visiting.add(cteName);
        
        const cte = ctes[cteName];
        if (cte && cte.dependencies) {
          for (const dep of cte.dependencies) {
            if (ctes[dep]) {
              visit(dep);
            }
          }
        }
        
        visiting.delete(cteName);
        visited.add(cteName);
      };

      // Check all CTEs
      for (const cteName of Object.keys(ctes)) {
        if (!visited.has(cteName)) {
          visit(cteName);
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets the execution order of CTEs based on dependencies
   * @param ctes - All CTEs to order
   * @returns Array of CTE names in execution order
   */
  getExecutionOrder(ctes: Record<string, CTE>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (cteName: string): void => {
      if (visited.has(cteName)) return;
      
      if (visiting.has(cteName)) {
        throw new Error('Circular dependency detected');
      }

      visiting.add(cteName);
      
      const cte = ctes[cteName];
      if (cte && cte.dependencies) {
        for (const dep of cte.dependencies) {
          if (ctes[dep]) {
            visit(dep);
          }
        }
      }
      
      visiting.delete(cteName);
      visited.add(cteName);
      result.push(cteName);
    };

    // Visit all CTEs
    for (const cteName of Object.keys(ctes)) {
      if (!visited.has(cteName)) {
        visit(cteName);
      }
    }

    return result;
  }

  /**
   * Finds all CTEs that depend on the given CTE
   * @param cteName - The CTE to find dependents for
   * @param allCTEs - All available CTEs
   * @returns Array of CTE names that depend on the given CTE
   */
  findDependents(cteName: string, allCTEs: Record<string, CTE>): string[] {
    const dependents: string[] = [];

    for (const [name, cte] of Object.entries(allCTEs)) {
      if (cte.dependencies.includes(cteName)) {
        dependents.push(name);
      }
    }

    return dependents;
  }

  /**
   * Gets the dependency graph as an adjacency list
   * @param ctes - All CTEs
   * @returns Adjacency list representation of the dependency graph
   */
  getDependencyGraph(ctes: Record<string, CTE>): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const [name, cte] of Object.entries(ctes)) {
      graph[name] = [...cte.dependencies];
    }

    return graph;
  }
}
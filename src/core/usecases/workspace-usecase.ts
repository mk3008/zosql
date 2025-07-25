import { WorkspaceRepository, SqlParser, CTEDependencyResolver } from '@core/ports/workspace';
import { WorkspaceEntity } from '@core/entities/workspace';
import { Workspace, ApiResponse } from '@shared/types';

export class WorkspaceUseCase {
  constructor(
    private workspaceRepository: WorkspaceRepository,
    private sqlParser: SqlParser,
    private cteResolver: CTEDependencyResolver
  ) {}

  async createWorkspace(params: {
    name: string;
    sql: string;
    originalFilePath?: string;
  }): Promise<ApiResponse<Workspace>> {
    try {
      // Parse SQL and extract CTEs
      await this.sqlParser.parseQuery(params.sql); // Parse query for validation
      const extractedCTEs = await this.sqlParser.extractCTEs(params.sql);
      
      // Format the decomposed query
      const decomposedQuery = await this.sqlParser.formatQuery(params.sql, {
        withClauseStyle: 'full-oneline',
        keywordCase: 'lower',
        indentSize: 4
      });

      // Create workspace entity
      const workspace = new WorkspaceEntity(
        WorkspaceEntity.generateId(),
        params.name,
        params.originalFilePath || null,
        [] // Initial empty SQL models
      );

      // Add extracted CTEs (legacy implementation placeholder)
      // TODO: Implement proper CTE integration for extracted CTEs
      console.log(`[WORKSPACE] Extracted ${extractedCTEs.length} CTEs`);
      
      // Set original and decomposed queries
      (workspace as any).originalQuery = params.sql;
      (workspace as any).decomposedQuery = decomposedQuery;

      // Save workspace (legacy implementation with type casting)
      await this.workspaceRepository.save(workspace as any);

      return {
        success: true,
        data: workspace as any,
        message: 'Workspace created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workspace'
      };
    }
  }

  async loadWorkspace(): Promise<ApiResponse<Workspace | null>> {
    try {
      const workspace = await this.workspaceRepository.findById('current');
      
      return {
        success: true,
        data: workspace
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load workspace'
      };
    }
  }

  async updateCTE(params: {
    cteName: string;
    query: string;
    description?: string;
  }): Promise<ApiResponse<void>> {
    try {
      const workspace = await this.workspaceRepository.findById('current');
      if (!workspace) {
        return {
          success: false,
          error: 'No active workspace found'
        };
      }

      const workspaceEntity = new WorkspaceEntity(
        workspace.id,
        workspace.name,
        workspace.originalFilePath || null,
        [] // SQL models from workspace
      );

      // Legacy CTE update functionality
      // TODO: Implement proper CTE update mechanism
      console.log(`[WORKSPACE] Would update CTE ${params.cteName}`);
      (workspaceEntity as any).privateCtes = workspace.privateCtes;

      await this.workspaceRepository.save(workspaceEntity as any);

      return {
        success: true,
        message: `CTE ${params.cteName} updated successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update CTE'
      };
    }
  }

  async generateExecutableCTE(cteName: string): Promise<ApiResponse<string>> {
    try {
      const workspace = await this.workspaceRepository.findById('current');
      if (!workspace) {
        return {
          success: false,
          error: 'No active workspace found'
        };
      }

      if (!workspace.privateCtes[cteName]) {
        return {
          success: false,
          error: `CTE not found: ${cteName}`
        };
      }

      const executableSQL = this.cteResolver.resolveDependencies(
        cteName,
        workspace.privateCtes
      );

      return {
        success: true,
        data: executableSQL
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate executable CTE'
      };
    }
  }

  async validateWorkspace(): Promise<ApiResponse<{ isValid: boolean; errors: string[] }>> {
    try {
      const workspace = await this.workspaceRepository.findById('current');
      if (!workspace) {
        return {
          success: false,
          error: 'No active workspace found'
        };
      }

      const errors: string[] = [];

      // Check for circular dependencies
      try {
        const isValid = this.cteResolver.validateNoCycles(workspace.privateCtes);
        if (!isValid) {
          errors.push('Circular dependency detected in CTEs');
        }
      } catch (error) {
        errors.push(`Dependency validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Validate each CTE syntax
      for (const [name, cte] of Object.entries(workspace.privateCtes)) {
        try {
          await this.sqlParser.parseQuery(cte.query);
        } catch (error) {
          errors.push(`Invalid SQL syntax in CTE '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: true,
        data: {
          isValid: errors.length === 0,
          errors
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate workspace'
      };
    }
  }

  async clearWorkspace(): Promise<ApiResponse<void>> {
    try {
      await this.workspaceRepository.clear();
      
      return {
        success: true,
        message: 'Workspace cleared successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear workspace'
      };
    }
  }
}
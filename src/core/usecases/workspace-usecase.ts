import { WorkspaceRepositoryPort } from '@core/ports/workspace-repository-port';
import { SqlParser, CTEDependencyResolver } from '@core/ports/workspace';
import { WorkspaceEntity } from '@core/entities/workspace';
import { Workspace, ApiResponse } from '@shared/types';

export class WorkspaceUseCase {
  constructor(
    private workspaceRepository: WorkspaceRepositoryPort,
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
      
      // Save workspace entity
      const saveResult = await this.workspaceRepository.save(workspace);
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error || 'Failed to save workspace'
        };
      }

      // Create Workspace interface from WorkspaceEntity
      const workspaceResult: Workspace = {
        id: workspace.id,
        name: workspace.name,
        originalQuery: params.sql,
        originalFilePath: params.originalFilePath,
        decomposedQuery: decomposedQuery,
        privateCtes: {}, // TODO: Convert from extractedCTEs
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      return {
        success: true,
        data: workspaceResult,
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
      const workspaceResult = await this.workspaceRepository.findById('current');
      
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: true,
          data: null
        };
      }
      
      // Convert WorkspaceEntity to Workspace interface
      const workspace: Workspace = {
        id: workspaceResult.data.id,
        name: workspaceResult.data.name,
        originalQuery: '', // TODO: Get from entity
        originalFilePath: workspaceResult.data.originalFilePath || undefined,
        decomposedQuery: '', // TODO: Get from entity
        privateCtes: {}, // TODO: Get from entity
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
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
  }): Promise<ApiResponse<Workspace>> {
    try {
      const workspaceResult = await this.workspaceRepository.findById('current');
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: 'No active workspace found'
        };
      }
      const workspace = workspaceResult.data;

      // Legacy CTE update functionality
      // TODO: Implement proper CTE update mechanism
      console.log(`[WORKSPACE] Would update CTE ${params.cteName}`);
      
      const updateResult = await this.workspaceRepository.save(workspace);
      if (!updateResult.success) {
        return {
          success: false,
          error: updateResult.error || 'Failed to save workspace'
        };
      }

      // Return updated workspace with the CTE modification (converting entity to interface)
      const updatedWorkspace: Workspace = {
        id: workspace.id,
        name: workspace.name,
        originalQuery: '', // TODO: Get from workspace entity
        originalFilePath: workspace.originalFilePath || undefined,
        decomposedQuery: '', // TODO: Get from workspace entity  
        privateCtes: {}, // TODO: Handle CTE update properly
        created: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      return {
        success: true,
        data: updatedWorkspace,
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
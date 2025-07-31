/**
 * Workspace Management Use Case
 * Hexagonal Architecture - Domain Layer Use Case
 * Contains business logic for workspace operations using ports
 */

import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlModelEntity } from '@core/entities/sql-model';
import { WorkspaceRepositoryPort, RepositoryResult } from '@core/ports/workspace-repository-port';
import { WorkspaceSerializationPort } from '@core/ports/workspace-serialization-port';
import { SecureFileAccessPort, BackupRestorePort } from '@core/ports/file-storage-port';
import { SqlDecomposerUseCase } from './sql-decomposer-usecase';

/**
 * Workspace creation request
 */
export interface CreateWorkspaceRequest {
  readonly name: string;
  readonly sql?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}

/**
 * Workspace update request
 */
export interface UpdateWorkspaceRequest {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}

/**
 * Workspace import request
 */
export interface ImportWorkspaceRequest {
  readonly filePath: string;
  readonly name?: string;
  readonly overwriteExisting?: boolean;
}

/**
 * Workspace export request
 */
export interface ExportWorkspaceRequest {
  readonly workspaceId: string;
  readonly filePath: string;
  readonly includeHistory?: boolean;
  readonly compress?: boolean;
}

/**
 * Use Case for workspace management operations
 * Pure business logic with no infrastructure dependencies
 */
export class WorkspaceManagementUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepositoryPort,
    private readonly serialization: WorkspaceSerializationPort,
    private readonly fileAccess: SecureFileAccessPort,
    private readonly backup: BackupRestorePort | null,
    private readonly sqlDecomposer: SqlDecomposerUseCase | null
  ) {}

  /**
   * Create new workspace with SQL decomposition
   */
  async createWorkspace(request: CreateWorkspaceRequest): Promise<RepositoryResult<WorkspaceEntity>> {
    // Validate input
    if (!request.name.trim()) {
      return {
        success: false,
        error: 'Workspace name is required'
      };
    }

    // Check if workspace name already exists
    const existingWorkspace = await this.workspaceRepository.findByName(request.name);
    if (existingWorkspace.success && existingWorkspace.data) {
      return {
        success: false,
        error: `Workspace with name '${request.name}' already exists`
      };
    }

    try {
      let sqlModels: SqlModelEntity[] = [];

      // If SQL is provided, decompose it
      if (request.sql && this.sqlDecomposer) {
        // Decompose SQL into models
        sqlModels = await this.sqlDecomposer.decomposeSql(request.sql, `${request.name}.sql`);
      }

      // Create workspace entity
      const workspace = new WorkspaceEntity(
        WorkspaceEntity.generateId(),
        request.name,
        null, // No file path for new workspace
        sqlModels
      );

      // Save to repository
      const saveResult = await this.workspaceRepository.save(workspace);
      if (!saveResult.success) {
        return saveResult;
      }

      // Create automatic backup
      if (this.backup) {
        await this.backup.createBackup(workspace.id, workspace.toJSON(), {
          compress: true,
          includeHistory: false
        });
      }

      return {
        success: true,
        data: workspace
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workspace'
      };
    }
  }

  /**
   * Load workspace by ID
   */
  async loadWorkspace(workspaceId: string): Promise<RepositoryResult<WorkspaceEntity>> {
    if (!workspaceId.trim()) {
      return {
        success: false,
        error: 'Workspace ID is required'
      };
    }

    return await this.workspaceRepository.findById(workspaceId);
  }

  /**
   * Update existing workspace
   */
  async updateWorkspace(request: UpdateWorkspaceRequest): Promise<RepositoryResult<WorkspaceEntity>> {
    // Load existing workspace
    const existingResult = await this.workspaceRepository.findById(request.id);
    if (!existingResult.success || !existingResult.data) {
      return {
        success: false,
        error: 'Workspace not found'
      };
    }

    const workspace = existingResult.data;

    try {
      // Update fields
      if (request.name && request.name !== workspace.name) {
        // Check name uniqueness
        const nameCheck = await this.workspaceRepository.findByName(request.name);
        if (nameCheck.success && nameCheck.data && nameCheck.data.id !== workspace.id) {
          return {
            success: false,
            error: `Workspace with name '${request.name}' already exists`
          };
        }
        
        // Update name (would need to implement name change in WorkspaceEntity)
      }

      // Save updated workspace
      const updateResult = await this.workspaceRepository.update(workspace);
      if (!updateResult.success) {
        return updateResult;
      }

      // Create backup after update
      if (this.backup) {
        await this.backup.createBackup(workspace.id, workspace.toJSON(), {
          compress: true,
          includeHistory: false
        });
      }

      return {
        success: true,
        data: workspace
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update workspace'
      };
    }
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<RepositoryResult<void>> {
    if (!workspaceId.trim()) {
      return {
        success: false,
        error: 'Workspace ID is required'
      };
    }

    // Check if workspace exists
    const exists = await this.workspaceRepository.exists(workspaceId);
    if (!exists) {
      return {
        success: false,
        error: 'Workspace not found'
      };
    }

    try {
      // Create final backup before deletion
      const workspace = await this.workspaceRepository.findById(workspaceId);
      if (workspace.success && workspace.data) {
        if (this.backup) {
          await this.backup.createBackup(workspaceId, workspace.data.toJSON(), {
            compress: true,
            includeHistory: true
          });
        }
      }

      // Delete from repository
      return await this.workspaceRepository.delete(workspaceId);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete workspace'
      };
    }
  }

  /**
   * Import workspace from file
   */
  async importWorkspace(request: ImportWorkspaceRequest): Promise<RepositoryResult<WorkspaceEntity>> {
    try {
      // Validate file path
      const pathValidation = await this.fileAccess.validateFilePath(request.filePath);
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid file path: ${pathValidation.errors.join(', ')}`
        };
      }

      // Read file content
      const fileResult = await this.fileAccess.readFile(request.filePath);
      if (!fileResult.success || !fileResult.data) {
        return {
          success: false,
          error: fileResult.error || 'Failed to read import file'
        };
      }

      // Validate import data
      const validationResult = await this.serialization.validateImportData(fileResult.data);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.errors.join(', ') || 'Invalid workspace data format'
        };
      }

      // Import workspace
      const importResult = await this.serialization.importWorkspace(fileResult.data, {
        overwriteExisting: request.overwriteExisting
      });
      if (!importResult.success || !importResult.workspace) {
        return {
          success: false,
          error: importResult.error || 'Failed to import workspace'
        };
      }

      const workspace = importResult.workspace;

      // Update name if provided
      if (request.name) {
        // Check name uniqueness
        const existingWorkspace = await this.workspaceRepository.findByName(request.name);
        if (existingWorkspace.success && existingWorkspace.data && !request.overwriteExisting) {
          return {
            success: false,
            error: `Workspace with name '${request.name}' already exists`
          };
        }
      }

      // Save imported workspace
      const saveResult = await this.workspaceRepository.save(workspace);
      if (!saveResult.success) {
        return saveResult;
      }

      // Create backup of imported workspace
      if (this.backup) {
        await this.backup.createBackup(workspace.id, workspace.toJSON(), {
          compress: true,
          includeHistory: false
        });
      }

      return {
        success: true,
        data: workspace
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import workspace'
      };
    }
  }

  /**
   * Export workspace to file
   */
  async exportWorkspace(request: ExportWorkspaceRequest): Promise<RepositoryResult<string>> {
    try {
      // Load workspace
      const workspaceResult = await this.workspaceRepository.findById(request.workspaceId);
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: 'Workspace not found'
        };
      }

      const workspace = workspaceResult.data;

      // Export workspace to serialized format
      const exportResult = await this.serialization.exportWorkspace(workspace, {
        format: 'json',
        includeHistory: request.includeHistory,
        prettyPrint: true
      });
      if (!exportResult.success || !exportResult.data) {
        return {
          success: false,
          error: exportResult.error || 'Failed to export workspace'
        };
      }

      // Validate file path for export
      const pathValidation = await this.fileAccess.validateFilePath(request.filePath);
      if (!pathValidation.isValid) {
        return {
          success: false,
          error: `Invalid export path: ${pathValidation.errors.join(', ')}`
        };
      }

      // Write to file
      const dataToWrite = typeof exportResult.data === 'string' ? exportResult.data : exportResult.data?.toString('utf-8') || '';
      const writeResult = await this.fileAccess.writeFile(request.filePath, dataToWrite);
      if (!writeResult.success) {
        return {
          success: false,
          error: writeResult.error || 'Failed to write export file'
        };
      }

      return {
        success: true,
        data: request.filePath
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export workspace'
      };
    }
  }

  /**
   * List all workspaces
   */
  async listWorkspaces(limit?: number): Promise<RepositoryResult<WorkspaceEntity[]>> {
    return await this.workspaceRepository.findAll(limit);
  }

  /**
   * Search workspaces by criteria
   */
  async searchWorkspaces(searchTerm: string): Promise<RepositoryResult<WorkspaceEntity[]>> {
    return await this.workspaceRepository.findByCriteria({
      name: searchTerm,
      limit: 50
    });
  }

  /**
   * Create backup of workspace
   */
  async createWorkspaceBackup(
    workspaceId: string,
    options?: { includeHistory?: boolean; compress?: boolean }
  ): Promise<RepositoryResult<string>> {
    try {
      // Load workspace
      const workspaceResult = await this.workspaceRepository.findById(workspaceId);
      if (!workspaceResult.success || !workspaceResult.data) {
        return {
          success: false,
          error: 'Workspace not found'
        };
      }

      // Create backup
      const backupResult = this.backup ? await this.backup.createBackup(
        workspaceId,
        workspaceResult.data.toJSON(),
        {
          compress: options?.compress ?? true,
          includeHistory: options?.includeHistory ?? false
        }
      ) : { success: true, data: null };

      if (!backupResult?.success) {
        return {
          success: false,
          error: ('error' in backupResult && backupResult.error) ? backupResult.error : 'Failed to create backup'
        };
      }

      return {
        success: true,
        data: backupResult.data || ''
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create backup'
      };
    }
  }
}
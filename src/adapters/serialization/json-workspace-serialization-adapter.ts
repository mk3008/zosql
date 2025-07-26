/**
 * JSON Workspace Serialization Adapter
 * Infrastructure Layer - JSON implementation of WorkspaceSerializationPort
 * Concrete adapter implementing workspace import/export using JSON format
 */

import { createHash } from 'crypto';
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import {
  WorkspaceSerializationPort,
  WorkspaceExportOptions,
  WorkspaceImportOptions,
  ExportResult,
  ImportResult,
  ValidationResult,
  ExportFormat
} from '@core/ports/workspace-serialization-port';
import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlModelEntity } from '@core/entities/sql-model';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Serialized workspace structure
 */
interface SerializedWorkspace {
  readonly version: string;
  readonly exportedAt: string;
  readonly workspace: {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly createdAt: string;
    readonly lastModified: string;
    readonly sqlModels: SerializedSqlModel[];
  };
  readonly metadata?: {
    readonly exporterVersion: string;
    readonly platform: string;
    readonly checksum?: string;
  };
}

/**
 * Serialized SQL model structure
 */
interface SerializedSqlModel {
  readonly id: string;
  readonly name: string;
  readonly sql: string;
  readonly description?: string;
  readonly testData?: string;
  readonly isRootCte: boolean;
  readonly dependents: string[];
  readonly conditions?: string;
  readonly createdAt: string;
  readonly lastModified: string;
}

/**
 * JSON implementation of WorkspaceSerializationPort
 * Provides workspace serialization using JSON with optional compression
 */
export class JsonWorkspaceSerializationAdapter implements WorkspaceSerializationPort {
  private readonly CURRENT_VERSION = '1.0.0';
  private readonly SUPPORTED_FORMATS: readonly ExportFormat[] = ['json', 'compressed'];
  
  async exportWorkspace(
    workspace: WorkspaceEntity,
    options: WorkspaceExportOptions
  ): Promise<ExportResult> {
    try {
      console.log(`[SERIALIZATION] Exporting workspace: ${workspace.name}`);
      
      // Create serialized structure
      const serialized = this.serializeWorkspace(workspace, options);
      
      // Convert to JSON
      const jsonString = options.prettyPrint 
        ? JSON.stringify(serialized, null, 2)
        : JSON.stringify(serialized);
      
      // Calculate checksum
      const checksum = this.calculateChecksum(jsonString);
      (serialized as any).metadata = {
        ...serialized.metadata,
        checksum
      };
      
      // Re-serialize with checksum
      const finalJson = options.prettyPrint 
        ? JSON.stringify(serialized, null, 2)
        : JSON.stringify(serialized);
      
      // Handle compression if requested
      let exportData: string | Buffer = finalJson;
      let format: ExportFormat = 'json';
      
      if (options.format === 'compressed' || options.compress) {
        exportData = await gzipAsync(finalJson);
        format = 'compressed';
      }
      
      // Encrypt if password provided
      if (options.password) {
        exportData = await this.encrypt(exportData, options.password);
      }
      
      const size = Buffer.isBuffer(exportData) ? exportData.length : Buffer.byteLength(exportData);
      
      console.log(`[SERIALIZATION] Export complete: ${format} format, ${size} bytes`);
      
      return {
        success: true,
        data: exportData,
        format,
        size,
        metadata: {
          exportedAt: new Date(),
          version: this.CURRENT_VERSION,
          checksum
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      console.error(`[SERIALIZATION] Export error:`, error);
      
      return {
        success: false,
        format: options.format,
        size: 0,
        error: `Export failed: ${errorMessage}`
      };
    }
  }

  async importWorkspace(
    data: string | Buffer,
    options: WorkspaceImportOptions
  ): Promise<ImportResult> {
    try {
      console.log(`[SERIALIZATION] Importing workspace`);
      
      // Decrypt if password provided
      let processedData = data;
      if (options.password) {
        processedData = await this.decrypt(data, options.password);
      }
      
      // Decompress if needed
      let jsonString: string;
      if (Buffer.isBuffer(processedData)) {
        try {
          const decompressed = await gunzipAsync(processedData);
          jsonString = decompressed.toString('utf-8');
        } catch {
          // Not compressed, treat as plain JSON
          jsonString = processedData.toString('utf-8');
        }
      } else {
        jsonString = processedData;
      }
      
      // Parse JSON
      const parsed = JSON.parse(jsonString) as SerializedWorkspace;
      
      // Validate structure if requested
      if (options.validateStructure) {
        const validation = await this.validateStructure(parsed);
        if (!validation.isValid) {
          return {
            success: false,
            error: `Invalid structure: ${validation.errors.join(', ')}`,
            warnings: validation.warnings
          };
        }
      }
      
      // Check version and migrate if needed
      const migrated = await this.migrateIfNeeded(parsed);
      
      // Verify checksum if present
      if (migrated.metadata?.checksum) {
        const expectedChecksum = migrated.metadata.checksum;
        const withoutChecksum = { ...migrated };
        if (withoutChecksum.metadata) {
          delete (withoutChecksum.metadata as any).checksum;
        }
        
        const jsonForChecksum = JSON.stringify(withoutChecksum);
        const actualChecksum = this.calculateChecksum(jsonForChecksum);
        
        if (actualChecksum !== expectedChecksum) {
          console.warn(`[SERIALIZATION] Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
        }
      }
      
      // Deserialize to workspace entity
      const workspace = this.deserializeWorkspace(migrated);
      
      console.log(`[SERIALIZATION] Import complete: ${workspace.name}`);
      
      return {
        success: true,
        workspace,
        metadata: {
          importedAt: new Date(),
          originalVersion: parsed.version,
          migrated: parsed.version !== this.CURRENT_VERSION
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      console.error(`[SERIALIZATION] Import error:`, error);
      
      return {
        success: false,
        error: `Import failed: ${errorMessage}`
      };
    }
  }

  async validateImportData(data: string | Buffer): Promise<ValidationResult> {
    try {
      // Try to decompress if needed
      let jsonString: string;
      let format: ExportFormat = 'json';
      
      if (Buffer.isBuffer(data)) {
        try {
          const decompressed = await gunzipAsync(data);
          jsonString = decompressed.toString('utf-8');
          format = 'compressed';
        } catch {
          jsonString = data.toString('utf-8');
        }
      } else {
        jsonString = data;
      }
      
      // Parse JSON
      const parsed = JSON.parse(jsonString) as SerializedWorkspace;
      
      // Validate structure
      const validation = await this.validateStructure(parsed);
      
      return {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        metadata: {
          format,
          version: parsed.version,
          workspaceName: parsed.workspace?.name,
          exportDate: parsed.exportedAt ? new Date(parsed.exportedAt) : undefined
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      
      return {
        isValid: false,
        errors: [`Invalid data format: ${errorMessage}`],
        warnings: []
      };
    }
  }

  async exportBatch(
    workspaces: readonly WorkspaceEntity[],
    options: WorkspaceExportOptions
  ): Promise<ExportResult> {
    try {
      const batch = {
        version: this.CURRENT_VERSION,
        exportedAt: new Date().toISOString(),
        workspaces: workspaces.map(ws => this.serializeWorkspace(ws, options).workspace),
        metadata: {
          exporterVersion: '1.0.0',
          platform: process.platform,
          count: workspaces.length
        }
      };
      
      const jsonString = options.prettyPrint 
        ? JSON.stringify(batch, null, 2)
        : JSON.stringify(batch);
      
      let exportData: string | Buffer = jsonString;
      let format: ExportFormat = 'json';
      
      if (options.format === 'compressed' || options.compress) {
        exportData = await gzipAsync(jsonString);
        format = 'compressed';
      }
      
      if (options.password) {
        exportData = await this.encrypt(exportData, options.password);
      }
      
      const size = Buffer.isBuffer(exportData) ? exportData.length : Buffer.byteLength(exportData);
      
      return {
        success: true,
        data: exportData,
        format,
        size,
        metadata: {
          exportedAt: new Date(),
          version: this.CURRENT_VERSION,
          checksum: this.calculateChecksum(jsonString)
        }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch export failed';
      
      return {
        success: false,
        format: options.format,
        size: 0,
        error: errorMessage
      };
    }
  }

  async importBatch(
    data: string | Buffer,
    options: WorkspaceImportOptions
  ): Promise<{
    success: boolean;
    workspaces: WorkspaceEntity[];
    failures: { index: number; error: string; }[];
  }> {
    try {
      let processedData = data;
      if (options.password) {
        processedData = await this.decrypt(data, options.password);
      }
      
      let jsonString: string;
      if (Buffer.isBuffer(processedData)) {
        try {
          const decompressed = await gunzipAsync(processedData);
          jsonString = decompressed.toString('utf-8');
        } catch {
          jsonString = processedData.toString('utf-8');
        }
      } else {
        jsonString = processedData;
      }
      
      const parsed = JSON.parse(jsonString);
      const workspaces: WorkspaceEntity[] = [];
      const failures: { index: number; error: string; }[] = [];
      
      if (Array.isArray(parsed.workspaces)) {
        for (let i = 0; i < parsed.workspaces.length; i++) {
          try {
            const serialized: SerializedWorkspace = {
              version: parsed.version || this.CURRENT_VERSION,
              exportedAt: parsed.exportedAt || new Date().toISOString(),
              workspace: parsed.workspaces[i],
              metadata: parsed.metadata
            };
            
            const workspace = this.deserializeWorkspace(serialized);
            workspaces.push(workspace);
          } catch (error) {
            failures.push({
              index: i,
              error: error instanceof Error ? error.message : 'Import failed'
            });
          }
        }
      }
      
      return {
        success: failures.length === 0,
        workspaces,
        failures
      };
      
    } catch (error) {
      return {
        success: false,
        workspaces: [],
        failures: [{
          index: -1,
          error: error instanceof Error ? error.message : 'Batch import failed'
        }]
      };
    }
  }

  getSupportedFormats(): readonly ExportFormat[] {
    return this.SUPPORTED_FORMATS;
  }

  getSchemaVersion(): string {
    return this.CURRENT_VERSION;
  }

  async migrateData(
    data: unknown,
    fromVersion: string
  ): Promise<{
    success: boolean;
    migratedData?: unknown;
    error?: string;
  }> {
    try {
      // Simple version check for now
      if (fromVersion === this.CURRENT_VERSION) {
        return {
          success: true,
          migratedData: data
        };
      }
      
      // Add migration logic here as schema evolves
      console.log(`[SERIALIZATION] Migrating from version ${fromVersion} to ${this.CURRENT_VERSION}`);
      
      // For now, assume backward compatibility
      return {
        success: true,
        migratedData: data
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed'
      };
    }
  }

  /**
   * Serialize workspace entity to export format
   */
  private serializeWorkspace(
    workspace: WorkspaceEntity,
    options: WorkspaceExportOptions
  ): SerializedWorkspace {
    const sqlModels: SerializedSqlModel[] = [];
    
    for (const model of workspace.sqlModels) {
      const serializedModel: SerializedSqlModel = {
        id: (model as any).id || model.name,
        name: model.name,
        sql: model.sqlWithoutCte || (model as any).sql,
        description: (model as any).description || '',
        isRootCte: model.type === 'main',
        dependents: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      if (options.includeTestData && (model as any).testData) {
        (serializedModel as any).testData = (model as any).testData;
      }
      
      if ((model as any).conditions) {
        (serializedModel as any).conditions = (model as any).conditions;
      }
      
      sqlModels.push(serializedModel);
    }
    
    return {
      version: this.CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      workspace: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.originalFilePath || '',
        createdAt: workspace.created,
        lastModified: workspace.lastModified,
        sqlModels
      },
      metadata: {
        exporterVersion: '1.0.0',
        platform: process.platform
      }
    };
  }

  /**
   * Deserialize export format to workspace entity
   */
  private deserializeWorkspace(serialized: SerializedWorkspace): WorkspaceEntity {
    const workspace = new WorkspaceEntity(
      serialized.workspace.id,
      serialized.workspace.name,
      serialized.workspace.description || null
    );
    
    // Override timestamps
    (workspace as any).created = serialized.workspace.createdAt;
    (workspace as any).lastModified = serialized.workspace.lastModified;
    
    // Add SQL models
    for (const serializedModel of serialized.workspace.sqlModels) {
      const model = new SqlModelEntity(
        serializedModel.isRootCte ? 'main' : 'cte',
        serializedModel.name,
        serializedModel.sql,
        [],
        undefined,
        serializedModel.sql
      );
      
      workspace.addSqlModel(model);
    }
    
    return workspace;
  }

  /**
   * Validate serialized structure
   */
  private async validateStructure(
    data: SerializedWorkspace
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    if (!data.version) errors.push('Missing version field');
    if (!data.workspace) errors.push('Missing workspace field');
    if (!data.exportedAt) errors.push('Missing exportedAt field');
    
    if (data.workspace) {
      if (!data.workspace.id) errors.push('Missing workspace.id');
      if (!data.workspace.name) errors.push('Missing workspace.name');
      if (!Array.isArray(data.workspace.sqlModels)) errors.push('workspace.sqlModels must be an array');
      
      // Validate SQL models
      if (Array.isArray(data.workspace.sqlModels)) {
        data.workspace.sqlModels.forEach((model, index) => {
          if (!model.id) errors.push(`SQL model ${index}: missing id`);
          if (!model.name) errors.push(`SQL model ${index}: missing name`);
          if (!model.sql) errors.push(`SQL model ${index}: missing sql`);
          if (!Array.isArray(model.dependents)) errors.push(`SQL model ${index}: dependents must be an array`);
        });
      }
    }
    
    // Version warnings
    if (data.version && data.version !== this.CURRENT_VERSION) {
      warnings.push(`Version mismatch: file version ${data.version}, current version ${this.CURRENT_VERSION}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Migrate data if needed
   */
  private async migrateIfNeeded(data: SerializedWorkspace): Promise<SerializedWorkspace> {
    if (data.version === this.CURRENT_VERSION) {
      return data;
    }
    
    const result = await this.migrateData(data, data.version);
    if (result.success && result.migratedData) {
      return result.migratedData as SerializedWorkspace;
    }
    
    throw new Error(`Migration failed: ${result.error}`);
  }

  /**
   * Simple encryption (for demonstration - use proper encryption in production)
   */
  private async encrypt(data: string | Buffer, _password: string): Promise<Buffer> {
    // TODO: Implement proper encryption using crypto module
    console.warn('[SERIALIZATION] Password protection not fully implemented');
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  }

  /**
   * Simple decryption (for demonstration - use proper decryption in production)
   */
  private async decrypt(data: string | Buffer, _password: string): Promise<Buffer> {
    // TODO: Implement proper decryption using crypto module
    console.warn('[SERIALIZATION] Password decryption not fully implemented');
    return Buffer.isBuffer(data) ? data : Buffer.from(data);
  }
}
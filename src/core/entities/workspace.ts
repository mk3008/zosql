/**
 * Workspace Entity
 * Core Layer - Manages SQL models, test values, formatter, and filter conditions
 */

import { SqlModelEntity } from './sql-model';
import { TestValuesModel } from './test-values-model';
import { FilterConditionsEntity } from './filter-conditions';
import { SqlFormatterEntity } from './sql-formatter';

/**
 * UI-specific filter conditions for SQL models display
 * (Different from rawsql-ts FilterConditions which is for SQL WHERE clauses)
 */
export interface ModelFilterConditions {
  /** Show only main queries */
  showMainOnly?: boolean;
  /** Show only CTEs */
  showCtesOnly?: boolean;
  /** Filter by model name */
  nameFilter?: string;
  /** Filter by dependency count */
  minDependencies?: number;
  /** Filter by column count */
  minColumns?: number;
  /** Show models with specific dependencies */
  dependsOn?: string[];
}

/**
 * Represents an opened object in the workspace
 */
export interface OpenedObject {
  id: string;
  title: string;
  type: 'main' | 'cte' | 'values' | 'formatter' | 'condition';
  content: string;
  isDirty: boolean;
  modelEntity?: SqlModelEntity;
}

/**
 * UI Layout state for workspace
 */
export interface WorkspaceLayoutState {
  leftSidebarVisible: boolean;
  rightSidebarVisible: boolean;
  resultsVisible: boolean;
}

/**
 * Workspace entity managing SQL models and related configurations
 */
export class WorkspaceEntity {
  private _openedObjects: OpenedObject[] = [];
  private _activeObjectId: string = '';
  private _layoutState: WorkspaceLayoutState = {
    leftSidebarVisible: true,
    rightSidebarVisible: true,
    resultsVisible: false
  };

  constructor(
    public id: string,
    public name: string,
    public originalFilePath: string | null,
    public sqlModels: SqlModelEntity[] = [],
    public testValues: TestValuesModel = new TestValuesModel(''),
    public formatter: SqlFormatterEntity = new SqlFormatterEntity(), // SQL formatter wrapper
    public filterConditions: FilterConditionsEntity = new FilterConditionsEntity(), // rawsql-ts FilterConditions wrapper
    public modelFilterConditions: ModelFilterConditions = {}, // UI filter conditions for model display
    public created: string = new Date().toISOString(),
    public lastModified: string = new Date().toISOString()
  ) {}

  // Opened Objects Management
  
  get openedObjects(): OpenedObject[] {
    return this._openedObjects;
  }

  get activeObjectId(): string {
    return this._activeObjectId;
  }

  get activeObject(): OpenedObject | null {
    return this._openedObjects.find(obj => obj.id === this._activeObjectId) || null;
  }

  openObject(object: OpenedObject): void {
    // Check if object already exists
    const existingIndex = this._openedObjects.findIndex(obj => obj.id === object.id);
    if (existingIndex !== -1) {
      // Update existing object
      this._openedObjects[existingIndex] = object;
    } else {
      // Add new object
      this._openedObjects.push(object);
    }
    this._activeObjectId = object.id;
    this.updateLastModified();
  }

  closeObject(objectId: string): void {
    this._openedObjects = this._openedObjects.filter(obj => obj.id !== objectId);
    
    // Update active object if needed
    if (this._activeObjectId === objectId && this._openedObjects.length > 0) {
      this._activeObjectId = this._openedObjects[0].id;
    } else if (this._openedObjects.length === 0) {
      this._activeObjectId = '';
    }
    this.updateLastModified();
  }

  setActiveObject(objectId: string): void {
    if (this._openedObjects.find(obj => obj.id === objectId)) {
      this._activeObjectId = objectId;
      this.updateLastModified();
    }
  }

  updateObjectContent(objectId: string, content: string): void {
    const object = this._openedObjects.find(obj => obj.id === objectId);
    if (object) {
      object.content = content;
      object.isDirty = true;
      this.updateLastModified();
    }
  }

  clearAllObjects(): void {
    this._openedObjects = [];
    this._activeObjectId = '';
    this.updateLastModified();
  }

  // Layout State Management

  get layoutState(): WorkspaceLayoutState {
    return { ...this._layoutState };
  }

  setLeftSidebarVisible(visible: boolean): void {
    this._layoutState.leftSidebarVisible = visible;
    this.updateLastModified();
  }

  setRightSidebarVisible(visible: boolean): void {
    this._layoutState.rightSidebarVisible = visible;
    this.updateLastModified();
  }

  setResultsVisible(visible: boolean): void {
    this._layoutState.resultsVisible = visible;
    this.updateLastModified();
  }

  updateLayoutState(layoutState: Partial<WorkspaceLayoutState>): void {
    this._layoutState = { ...this._layoutState, ...layoutState };
    this.updateLastModified();
  }

  /**
   * Create a new workspace from file data
   */
  static createFromFile(
    fileName: string,
    filePath: string | null,
    sqlModels: SqlModelEntity[]
  ): WorkspaceEntity {
    const workspace = new WorkspaceEntity(
      WorkspaceEntity.generateId(),
      fileName,
      filePath,
      [],
      new TestValuesModel(''),
      new SqlFormatterEntity(), // formatter
      new FilterConditionsEntity(), // filterConditions
      {}  // modelFilterConditions
    );

    // Add all SQL models
    for (const model of sqlModels) {
      workspace.addSqlModel(model);
    }

    // Initialize filter conditions template from SQL models
    workspace.filterConditions.initializeFromModels(sqlModels);

    return workspace;
  }

  /**
   * Add a SQL model to the workspace
   */
  addSqlModel(model: SqlModelEntity): void {
    // Check if model already exists
    const existingIndex = this.sqlModels.findIndex(m => m.name === model.name && m.type === model.type);
    if (existingIndex >= 0) {
      this.sqlModels[existingIndex] = model;
    } else {
      this.sqlModels.push(model);
    }
    this.updateModified();
  }

  /**
   * Remove a SQL model from the workspace
   */
  removeSqlModel(name: string, type: 'main' | 'cte'): boolean {
    const initialLength = this.sqlModels.length;
    this.sqlModels = this.sqlModels.filter(m => !(m.name === name && m.type === type));
    
    if (this.sqlModels.length < initialLength) {
      this.updateModified();
      return true;
    }
    return false;
  }

  /**
   * Get SQL model by name and type
   */
  getSqlModel(name: string, type: 'main' | 'cte'): SqlModelEntity | null {
    return this.sqlModels.find(m => m.name === name && m.type === type) || null;
  }

  /**
   * Get all main query models
   */
  getMainModels(): SqlModelEntity[] {
    return this.sqlModels.filter(m => m.type === 'main');
  }

  /**
   * Get all CTE models
   */
  getCteModels(): SqlModelEntity[] {
    return this.sqlModels.filter(m => m.type === 'cte');
  }

  /**
   * Get filtered models based on current model filter conditions
   */
  getFilteredModels(): SqlModelEntity[] {
    let filtered = [...this.sqlModels];

    if (this.modelFilterConditions.showMainOnly) {
      filtered = filtered.filter(m => m.type === 'main');
    } else if (this.modelFilterConditions.showCtesOnly) {
      filtered = filtered.filter(m => m.type === 'cte');
    }

    if (this.modelFilterConditions.nameFilter) {
      const nameFilter = this.modelFilterConditions.nameFilter.toLowerCase();
      filtered = filtered.filter(m => m.name.toLowerCase().includes(nameFilter));
    }

    if (this.modelFilterConditions.minDependencies !== undefined) {
      filtered = filtered.filter(m => m.dependents.length >= this.modelFilterConditions.minDependencies!);
    }

    if (this.modelFilterConditions.minColumns !== undefined) {
      filtered = filtered.filter(m => (m.columns?.length || 0) >= this.modelFilterConditions.minColumns!);
    }

    if (this.modelFilterConditions.dependsOn && this.modelFilterConditions.dependsOn.length > 0) {
      filtered = filtered.filter(m => 
        this.modelFilterConditions.dependsOn!.some(dep => 
          m.dependents.some(d => d.name === dep)
        )
      );
    }

    return filtered;
  }

  /**
   * Update test values
   */
  updateTestValues(testValues: TestValuesModel): void {
    this.testValues = testValues;
    this.updateModified();
  }

  /**
   * Update SQL formatter entity
   */
  updateFormatter(formatter: SqlFormatterEntity): void {
    this.formatter = formatter;
    this.updateModified();
  }

  /**
   * Update filter conditions entity
   */
  updateFilterConditions(filterConditions: FilterConditionsEntity): void {
    this.filterConditions = filterConditions;
    this.updateModified();
  }

  /**
   * Update model filter conditions (for UI display)
   */
  updateModelFilterConditions(conditions: ModelFilterConditions): void {
    this.modelFilterConditions = { ...this.modelFilterConditions, ...conditions };
    this.updateModified();
  }

  /**
   * Clear all filter conditions
   */
  clearFilterConditions(): void {
    this.filterConditions.reset();
    this.modelFilterConditions = {};
    this.updateModified();
  }

  /**
   * Get workspace statistics
   */
  getStatistics(): {
    totalModels: number;
    mainQueries: number;
    ctes: number;
    maxDependencyDepth: number;
    totalColumns: number;
  } {
    const mainQueries = this.getMainModels().length;
    const ctes = this.getCteModels().length;
    const totalColumns = this.sqlModels.reduce((sum, m) => sum + (m.columns?.length || 0), 0);
    
    // Calculate max dependency depth
    const maxDependencyDepth = this.calculateMaxDependencyDepth();

    return {
      totalModels: this.sqlModels.length,
      mainQueries,
      ctes,
      maxDependencyDepth,
      totalColumns
    };
  }

  /**
   * Calculate maximum dependency depth
   */
  private calculateMaxDependencyDepth(): number {
    const modelMap = new Map(this.sqlModels.map(m => [m.name, m]));
    const depths = new Map<string, number>();

    const getDepth = (modelName: string, visited: Set<string> = new Set()): number => {
      if (depths.has(modelName)) {
        return depths.get(modelName)!;
      }

      if (visited.has(modelName)) {
        return 0; // Circular dependency
      }

      visited.add(modelName);
      const model = modelMap.get(modelName);

      if (!model || model.dependents.length === 0) {
        depths.set(modelName, 0);
        return 0;
      }

      const maxDepDepth = Math.max(
        ...model.dependents
          .filter(dep => modelMap.has(dep.name))
          .map(dep => getDepth(dep.name, new Set(visited)))
      );

      const depth = 1 + maxDepDepth;
      depths.set(modelName, depth);
      return depth;
    };

    let maxDepth = 0;
    for (const model of this.sqlModels) {
      maxDepth = Math.max(maxDepth, getDepth(model.name));
    }

    return maxDepth;
  }

  /**
   * Clone the workspace
   */
  clone(): WorkspaceEntity {
    return new WorkspaceEntity(
      this.id,
      this.name,
      this.originalFilePath,
      this.sqlModels.map(m => m.clone()),
      this.testValues.clone(),
      this.formatter.clone(),
      this.filterConditions.clone(),
      { ...this.modelFilterConditions },
      this.created,
      this.lastModified
    );
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): {
    id: string;
    name: string;
    originalFilePath: string | null;
    sqlModels: ReturnType<SqlModelEntity['toJSON']>[];
    testValues: ReturnType<TestValuesModel['toJSON']>;
    formatter: ReturnType<SqlFormatterEntity['toJSON']>;
    filterConditions: ReturnType<FilterConditionsEntity['toJSON']>;
    modelFilterConditions: ModelFilterConditions;
    created: string;
    lastModified: string;
  } {
    return {
      id: this.id,
      name: this.name,
      originalFilePath: this.originalFilePath,
      sqlModels: this.sqlModels.map(m => m.toJSON()),
      testValues: this.testValues.toJSON(),
      formatter: this.formatter.toJSON(),
      filterConditions: this.filterConditions.toJSON(),
      modelFilterConditions: this.modelFilterConditions,
      created: this.created,
      lastModified: this.lastModified
    };
  }

  /**
   * Create from plain object (for deserialization)
   */
  static fromJSON(data: any): WorkspaceEntity {
    const workspace = new WorkspaceEntity(
      data.id,
      data.name,
      data.originalFilePath,
      [],
      new TestValuesModel(data.testValues?.withClause || ''),
      SqlFormatterEntity.fromJSON(data.formatter || {}),
      FilterConditionsEntity.fromJSON(data.filterConditions || {}),
      data.modelFilterConditions || {},
      data.created,
      data.lastModified
    );

    // Reconstruct SQL models
    if (data.sqlModels && Array.isArray(data.sqlModels)) {
      // First pass: Create all models
      const modelMap = new Map<string, SqlModelEntity>();
      const dependencyMap = new Map<string, string[]>();
      
      for (const modelData of data.sqlModels) {
        const model = SqlModelEntity.fromJSON(modelData, workspace.formatter.getSqlFormatter());
        modelMap.set(model.name, model);
        dependencyMap.set(model.name, modelData.dependents || []);
        workspace.addSqlModel(model);
      }
      
      // Second pass: Resolve dependencies
      for (const [modelName, dependentNames] of dependencyMap) {
        const model = modelMap.get(modelName);
        if (model) {
          const dependents = dependentNames
            .map(depName => modelMap.get(depName))
            .filter((dep): dep is SqlModelEntity => dep !== undefined);
          model.setDependents(dependents);
        }
      }
    }

    return workspace;
  }

  /**
   * Update the last modified timestamp
   */
  private updateModified(): void {
    this.lastModified = new Date().toISOString();
  }

  /**
   * Generate unique ID for workspace
   */
  static generateId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
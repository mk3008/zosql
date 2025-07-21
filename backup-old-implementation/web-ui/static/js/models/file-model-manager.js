/**
 * FileModelManager - Centralized file model management
 * ファイルモデルの一元管理とライフサイクル管理
 */

import { FileModel } from './file-model.js';

export class FileModelManager {
  constructor() {
    this.models = new Map(); // id -> FileModel
    this.nameToIdMap = new Map(); // name -> id
    this.activeModelId = null;
    this.maxModels = 20; // Limit number of open models
    
    // Persistence settings
    this.autosaveEnabled = true;
    this.autosaveInterval = 30000; // 30 seconds
    this.persistenceKey = 'zosql_file_models';
    
    this.init();
  }

  /**
   * Initialize manager
   */
  init() {
    this.loadFromStorage();
    this.setupAutosave();
    console.log('[FileModelManager] Initialized');
  }

  /**
   * Create or get existing file model
   */
  createOrGetModel(name, content = '', options = {}) {
    // Check if model with this name already exists
    const existingId = this.nameToIdMap.get(name);
    if (existingId && this.models.has(existingId)) {
      const existingModel = this.models.get(existingId);
      console.log(`[FileModelManager] Reusing existing model for: ${name}`);
      return existingModel;
    }

    // Create new model
    const model = new FileModel(name, content, options);
    this.addModel(model);
    
    console.log(`[FileModelManager] Created new model for: ${name} (${model.id})`);
    return model;
  }

  /**
   * Add model to manager
   */
  addModel(model) {
    // Check limit
    if (this.models.size >= this.maxModels) {
      this.removeOldestModel();
    }

    // Remove existing model with same name if exists
    const existingId = this.nameToIdMap.get(model.name);
    if (existingId) {
      this.removeModel(existingId);
    }

    // Add new model
    this.models.set(model.id, model);
    this.nameToIdMap.set(model.name, model.id);
    
    // Set as active if no active model
    if (!this.activeModelId) {
      this.setActiveModel(model.id);
    }
    
    this.saveToStorage();
  }

  /**
   * Remove oldest unmodified model
   */
  removeOldestModel() {
    let oldestModel = null;
    let oldestTime = Date.now();
    
    // Find oldest unmodified model
    for (const model of this.models.values()) {
      if (!model.hasChanges() && model.lastModified.getTime() < oldestTime) {
        oldestModel = model;
        oldestTime = model.lastModified.getTime();
      }
    }
    
    // If no unmodified model found, remove oldest modified model
    if (!oldestModel) {
      for (const model of this.models.values()) {
        if (model.lastModified.getTime() < oldestTime) {
          oldestModel = model;
          oldestTime = model.lastModified.getTime();
        }
      }
    }
    
    if (oldestModel) {
      console.log(`[FileModelManager] Removing oldest model: ${oldestModel.name}`);
      this.removeModel(oldestModel.id);
    }
  }

  /**
   * Remove model by ID
   */
  removeModel(modelId) {
    const model = this.models.get(modelId);
    if (!model) return false;
    
    // Remove from maps
    this.models.delete(modelId);
    this.nameToIdMap.delete(model.name);
    
    // Update active model if necessary
    if (this.activeModelId === modelId) {
      this.activeModelId = this.models.size > 0 ? this.models.keys().next().value : null;
    }
    
    // Cleanup model
    model.destroy();
    this.saveToStorage();
    
    console.log(`[FileModelManager] Removed model: ${model.name} (${modelId})`);
    return true;
  }

  /**
   * Get model by ID
   */
  getModel(modelId) {
    return this.models.get(modelId);
  }

  /**
   * Get model by name
   */
  getModelByName(name) {
    const modelId = this.nameToIdMap.get(name);
    return modelId ? this.models.get(modelId) : null;
  }

  /**
   * Get active model
   */
  getActiveModel() {
    return this.activeModelId ? this.models.get(this.activeModelId) : null;
  }

  /**
   * Set active model
   */
  setActiveModel(modelId) {
    if (this.models.has(modelId)) {
      this.activeModelId = modelId;
      console.log(`[FileModelManager] Set active model: ${modelId}`);
      return true;
    }
    return false;
  }

  /**
   * Update model content
   */
  updateModelContent(modelId, content, source = 'user') {
    const model = this.models.get(modelId);
    if (!model) return false;
    
    const changed = model.updateContent(content, source);
    if (changed) {
      this.saveToStorage();
    }
    return changed;
  }

  /**
   * Get all models
   */
  getAllModels() {
    return Array.from(this.models.values());
  }

  /**
   * Get models with changes
   */
  getModifiedModels() {
    return Array.from(this.models.values()).filter(model => model.hasChanges());
  }

  /**
   * Check if any models have unsaved changes
   */
  hasUnsavedChanges() {
    return this.getModifiedModels().length > 0;
  }

  /**
   * Get model statistics
   */
  getStats() {
    const models = this.getAllModels();
    return {
      totalModels: models.length,
      modifiedModels: this.getModifiedModels().length,
      activeModelId: this.activeModelId,
      totalSize: models.reduce((sum, model) => sum + model.metadata.size, 0),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage() {
    let totalBytes = 0;
    for (const model of this.models.values()) {
      totalBytes += model.currentContent.length * 2; // Approximate character size
      totalBytes += model.originalContent.length * 2;
      totalBytes += model.changeHistory.length * 100; // Approximate history size
    }
    return totalBytes;
  }

  /**
   * Save to localStorage
   */
  saveToStorage() {
    if (!this.autosaveEnabled) return;
    
    try {
      const data = {
        models: Array.from(this.models.values()).map(model => model.toJSON()),
        activeModelId: this.activeModelId,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(this.persistenceKey, JSON.stringify(data));
      console.log(`[FileModelManager] Saved ${data.models.length} models to storage`);
    } catch (error) {
      console.warn('[FileModelManager] Failed to save to storage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  loadFromStorage() {
    try {
      const data = localStorage.getItem(this.persistenceKey);
      if (!data) return;
      
      const parsed = JSON.parse(data);
      if (!parsed.models) return;
      
      // Clear current models
      this.models.clear();
      this.nameToIdMap.clear();
      
      // Load models
      parsed.models.forEach(modelData => {
        try {
          const model = FileModel.fromJSON(modelData);
          this.models.set(model.id, model);
          this.nameToIdMap.set(model.name, model.id);
        } catch (error) {
          console.warn('[FileModelManager] Failed to restore model:', modelData.name, error);
        }
      });
      
      // Restore active model
      if (parsed.activeModelId && this.models.has(parsed.activeModelId)) {
        this.activeModelId = parsed.activeModelId;
      }
      
      console.log(`[FileModelManager] Loaded ${this.models.size} models from storage`);
    } catch (error) {
      console.warn('[FileModelManager] Failed to load from storage:', error);
    }
  }

  /**
   * Setup autosave
   */
  setupAutosave() {
    if (this.autosaveEnabled && this.autosaveInterval > 0) {
      setInterval(() => {
        this.saveToStorage();
      }, this.autosaveInterval);
    }
  }

  /**
   * Clear all models
   */
  clearAll() {
    for (const model of this.models.values()) {
      model.destroy();
    }
    this.models.clear();
    this.nameToIdMap.clear();
    this.activeModelId = null;
    this.saveToStorage();
    console.log('[FileModelManager] Cleared all models');
  }

  /**
   * Export all models
   */
  exportModels() {
    return {
      models: Array.from(this.models.values()).map(model => model.toJSON()),
      activeModelId: this.activeModelId,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Destroy manager
   */
  destroy() {
    this.clearAll();
    console.log('[FileModelManager] Destroyed');
  }
}

// Create global instance
export const fileModelManager = new FileModelManager();
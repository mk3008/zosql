/**
 * FileModel - Individual file model for tracking content and modifications
 * ファイルの状態管理とコンテンツ追跡
 */

export class FileModel {
  constructor(name, originalContent = '', options = {}) {
    this.id = this.generateId();
    this.name = name;
    this.originalContent = originalContent;
    this.currentContent = originalContent;
    this.isModified = false;
    this.lastModified = new Date();
    this.type = options.type || this.inferTypeFromName(name);
    this.metadata = {
      encoding: options.encoding || 'UTF-8',
      size: originalContent.length,
      created: new Date(),
      ...options.metadata
    };
    
    // Change tracking
    this.changeHistory = [];
    this.maxHistorySize = options.maxHistorySize || 50;
    
    console.log(`[FileModel] Created model for: ${name} (${this.id})`);
  }

  /**
   * Generate unique ID for the file model
   */
  generateId() {
    return 'file_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  /**
   * Infer file type from name
   */
  inferTypeFromName(name) {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'sql':
        return 'sql';
      case 'js':
        return 'javascript';
      case 'ts':
        return 'typescript';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      default:
        return 'text';
    }
  }

  /**
   * Update content and track changes
   */
  updateContent(newContent, source = 'user') {
    if (newContent === this.currentContent) {
      return false; // No change
    }

    // Save to history
    this.saveToHistory(this.currentContent, source);

    // Update content
    this.currentContent = newContent;
    this.isModified = (newContent !== this.originalContent);
    this.lastModified = new Date();
    this.metadata.size = newContent.length;

    console.log(`[FileModel] Content updated for: ${this.name}, modified: ${this.isModified}`);
    return true;
  }

  /**
   * Save current state to change history
   */
  saveToHistory(content, source) {
    this.changeHistory.push({
      content,
      timestamp: new Date(),
      source,
      checksum: this.calculateChecksum(content)
    });

    // Limit history size
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift();
    }
  }

  /**
   * Calculate simple checksum for content comparison
   */
  calculateChecksum(content) {
    let hash = 0;
    if (content.length === 0) return hash;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  /**
   * Reset to original content
   */
  resetToOriginal() {
    this.updateContent(this.originalContent, 'reset');
    console.log(`[FileModel] Reset to original for: ${this.name}`);
  }

  /**
   * Check if content has been modified
   */
  hasChanges() {
    return this.isModified;
  }

  /**
   * Get content for display/editing
   */
  getContent() {
    return this.currentContent;
  }

  /**
   * Get original content
   */
  getOriginalContent() {
    return this.originalContent;
  }

  /**
   * Get file statistics
   */
  getStats() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      isModified: this.isModified,
      size: this.metadata.size,
      originalSize: this.originalContent.length,
      created: this.metadata.created,
      lastModified: this.lastModified,
      changeCount: this.changeHistory.length,
      encoding: this.metadata.encoding
    };
  }

  /**
   * Get tab name (filename without extension)
   */
  getTabName() {
    return this.name.replace(/\.(sql|SQL)$/, '');
  }

  /**
   * Get change history
   */
  getHistory() {
    return [...this.changeHistory];
  }

  /**
   * Export to JSON for persistence
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      originalContent: this.originalContent,
      currentContent: this.currentContent,
      isModified: this.isModified,
      lastModified: this.lastModified.toISOString(),
      type: this.type,
      metadata: this.metadata,
      changeHistory: this.changeHistory.slice(-10) // Only save last 10 changes
    };
  }

  /**
   * Create from JSON (for persistence restore)
   */
  static fromJSON(data) {
    const model = new FileModel(data.name, data.originalContent, {
      type: data.type,
      encoding: data.metadata?.encoding,
      metadata: data.metadata
    });
    
    model.id = data.id;
    model.currentContent = data.currentContent;
    model.isModified = data.isModified;
    model.lastModified = new Date(data.lastModified);
    model.changeHistory = data.changeHistory || [];
    
    return model;
  }

  /**
   * Destroy model and cleanup
   */
  destroy() {
    this.changeHistory = [];
    console.log(`[FileModel] Destroyed model for: ${this.name} (${this.id})`);
  }
}
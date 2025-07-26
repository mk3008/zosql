/**
 * Filter Conditions Entity
 * Core Layer - Manages rawsql-ts FilterConditions with JSON string GUI binding
 */

import { FilterConditions, SelectableColumnCollector, DuplicateDetectionMode, SelectQueryParser } from 'rawsql-ts';
import { SqlModelEntity } from './sql-model';

/**
 * Filter Conditions Entity for GUI binding
 * Wraps rawsql-ts FilterConditions with string-based GUI interface
 */
export class FilterConditionsEntity {
  constructor(
    public conditions: string = 'undefined'
  ) {}

  /**
   * Get parsed FilterConditions object from JSON string
   * @returns Parsed FilterConditions object, undefined if not set, or empty object if parsing fails
   */
  getFilterConditions(): FilterConditions | undefined {
    console.log('[DEBUG] FilterConditionsEntity.getFilterConditions - conditions string:', this.conditions);
    
    if (this.conditions === 'undefined') {
      console.log('[DEBUG] FilterConditionsEntity - returning undefined (conditions string is "undefined")');
      return undefined;
    }
    
    try {
      const parsed = JSON.parse(this.conditions);
      console.log('[DEBUG] FilterConditionsEntity - parsed conditions:', parsed);
      console.log('[DEBUG] FilterConditionsEntity - parsed conditions keys:', Object.keys(parsed || {}));
      return parsed as FilterConditions;
    } catch (error) {
      console.warn('Failed to parse filter conditions:', error);
      return {};
    }
  }

  /**
   * Update conditions from FilterConditions object
   * @param conditions - FilterConditions object to convert to string, or undefined to reset
   */
  setFilterConditions(conditions: FilterConditions | undefined): void {
    if (conditions === undefined) {
      this.conditions = 'undefined';
      return;
    }
    
    try {
      this.conditions = JSON.stringify(conditions, null, 2);
    } catch (error) {
      console.warn('Failed to stringify filter conditions:', error);
      this.conditions = 'undefined';
    }
  }

  /**
   * Generate template FilterConditions JSON from SQL models
   * Uses SelectableColumnCollector with upstream: true to get all available columns
   * @param sqlModels - Array of SQL models to analyze
   * @returns Template JSON string with undefined values
   */
  static generateTemplate(sqlModels: SqlModelEntity[]): string {
    try {
      console.log('[DEBUG] generateTemplate called with sqlModels:', sqlModels.length);
      sqlModels.forEach((model, i) => {
        console.log(`[DEBUG] sqlModel[${i}]:`, {
          type: model.type,
          name: model.name,
          hasOriginalSql: !!model.originalSql,
          originalSql: model.originalSql?.substring(0, 100) + '...'
        });
      });
      
      // Find main model with original SQL
      const mainModel = sqlModels.find(m => m.type === 'main' && m.originalSql);
      console.log('[DEBUG] Found mainModel:', !!mainModel, mainModel?.name);
      
      if (!mainModel || !mainModel.originalSql) {
        console.log('[DEBUG] No main model with originalSql found, using default template');
        return FilterConditionsEntity.getDefaultTemplate();
      }

      // Parse the SQL to collect columns
      const query = SelectQueryParser.parse(mainModel.originalSql);
      
      // Use SelectableColumnCollector with upstream: true
      const collector = new SelectableColumnCollector(
        null, // tableColumnResolver
        false, // includeWildCard
        DuplicateDetectionMode.ColumnNameOnly,
        { upstream: true } // Enable upstream collection
      );

      const columns = collector.collect(query);
      
      // Generate template FilterConditions with all undefined values
      const template: FilterConditions = {};
      
      for (const column of columns) {
        const columnName = column.name;
        console.log('[DEBUG] Processing column:', columnName);
        // Generate appropriate conditions based on likely column type with demo values
        if (columnName.includes('id') || columnName.includes('Id')) {
          console.log('[DEBUG] ID column detected:', columnName);
          // Numeric ID columns - add demo filter
          template[columnName] = { eq: 1 } as any;
          console.log('[DEBUG] Set ID conditions for', columnName);
        } else if (columnName.includes('name') || columnName.includes('title') || columnName.includes('description')) {
          // Text columns - add demo like filter
          template[columnName] = { like: "%a%" } as any;
        } else if (columnName.includes('date') || columnName.includes('time') || columnName.includes('created') || columnName.includes('updated')) {
          // Date/time columns - add demo date filter
          template[columnName] = { gte: "2024-01-01" } as any;
        } else {
          // Default mixed conditions - add basic filter
          template[columnName] = { ne: null } as any;
        }
      }

      return JSON.stringify(template, null, 2);
    } catch (error) {
      console.warn('Failed to generate template from SQL models:', error);
      return FilterConditionsEntity.getDefaultTemplate();
    }
  }

  /**
   * Get default template when SQL analysis fails
   */
  private static getDefaultTemplate(): string {
    const defaultTemplate: FilterConditions = {
      user_id: { eq: 1 } as any, // Demo filter: user_id = 1
      name: { like: "%a%" } as any, // Demo filter: name LIKE '%a%'
    };

    return JSON.stringify(defaultTemplate, null, 2);
  }

  /**
   * Initialize template from SQL models
   * @param sqlModels - Array of SQL models to analyze
   */
  initializeFromModels(sqlModels: SqlModelEntity[]): void {
    this.conditions = FilterConditionsEntity.generateTemplate(sqlModels);
  }

  /**
   * Reset to default template
   */
  reset(): void {
    this.conditions = FilterConditionsEntity.getDefaultTemplate();
  }

  /**
   * Validate JSON format
   * @returns true if valid JSON, false otherwise
   */
  isValid(): boolean {
    try {
      JSON.parse(this.conditions);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get formatted JSON string for display
   * @returns Formatted JSON string
   */
  getFormattedString(): string {
    try {
      const parsed = JSON.parse(this.conditions);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return this.conditions;
    }
  }

  /**
   * Clone the filter conditions entity
   */
  clone(): FilterConditionsEntity {
    return new FilterConditionsEntity(this.conditions);
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): { conditions: string } {
    return {
      conditions: this.conditions
    };
  }

  /**
   * Create from plain object (for deserialization)
   */
  static fromJSON(data: any): FilterConditionsEntity {
    return new FilterConditionsEntity(data.conditions || '{}');
  }

  /**
   * Get display string for GUI binding (getter property)
   */
  get displayString(): string {
    return this.conditions;
  }

  /**
   * Set display string for GUI binding (setter property)
   */
  set displayString(value: string) {
    this.conditions = value;
  }

  /**
   * Get string representation
   */
  toString(): string {
    return this.conditions;
  }
}
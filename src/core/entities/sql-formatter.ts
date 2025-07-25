/**
 * SQL Formatter Entity
 * Core Layer - Manages rawsql-ts SqlFormatter with JSON string GUI binding
 */

import { SqlFormatter, type SqlFormatterOptions } from 'rawsql-ts';

/**
 * Default formatter configuration
 */
const DEFAULT_FORMATTER_CONFIG: SqlFormatterOptions = {
  identifierEscape: {
    start: "",
    end: ""
  },
  parameterSymbol: ":",
  parameterStyle: "named",
  indentSize: 4,
  indentChar: " " as const, // IndentCharOption: '' | ' ' | '\t'
  newline: "\n" as const,   // NewlineOption: ' ' | '\n' | '\r\n'
  keywordCase: "lower",
  commaBreak: "before",
  andBreak: "before",
  exportComment: true  // Changed from preserveComments to exportComment per SqlFormatterOptions
};

/**
 * SQL Formatter Entity for GUI binding
 * Wraps rawsql-ts SqlFormatter with string-based GUI interface
 */
export class SqlFormatterEntity {
  constructor(
    public config: string = JSON.stringify(DEFAULT_FORMATTER_CONFIG, null, 2)
  ) {}

  /**
   * Get SqlFormatter instance from JSON configuration
   * @returns SqlFormatter instance or default formatter if parsing fails
   */
  getSqlFormatter(): SqlFormatter {
    try {
      const parsedConfig = JSON.parse(this.config);
      return new SqlFormatter(parsedConfig);
    } catch (error) {
      console.warn('Failed to parse formatter config, using default:', error);
      return new SqlFormatter(DEFAULT_FORMATTER_CONFIG);
    }
  }

  /**
   * Update config from SqlFormatter options object
   * @param options - Formatter options object to convert to string
   */
  setFormatterConfig(options: any): void {
    try {
      this.config = JSON.stringify(options, null, 2);
    } catch (error) {
      console.warn('Failed to stringify formatter config:', error);
      this.config = JSON.stringify(DEFAULT_FORMATTER_CONFIG, null, 2);
    }
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = JSON.stringify(DEFAULT_FORMATTER_CONFIG, null, 2);
  }

  /**
   * Validate JSON format
   * @returns true if valid JSON, false otherwise
   */
  isValid(): boolean {
    try {
      JSON.parse(this.config);
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
      const parsed = JSON.parse(this.config);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return this.config;
    }
  }

  /**
   * Clone the formatter entity
   */
  clone(): SqlFormatterEntity {
    return new SqlFormatterEntity(this.config);
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): { config: string } {
    return {
      config: this.config
    };
  }

  /**
   * Create from plain object (for deserialization)
   */
  static fromJSON(data: any): SqlFormatterEntity {
    return new SqlFormatterEntity(data.config || JSON.stringify(DEFAULT_FORMATTER_CONFIG, null, 2));
  }

  /**
   * Get display string for GUI binding (getter property)
   */
  get displayString(): string {
    return this.config;
  }

  /**
   * Set display string for GUI binding (setter property)
   */
  set displayString(value: string) {
    this.config = value;
  }

  /**
   * Get string representation
   */
  toString(): string {
    return this.config;
  }

  /**
   * Get default template configuration as JSON string
   */
  static getDefaultTemplate(): string {
    return JSON.stringify(DEFAULT_FORMATTER_CONFIG, null, 2);
  }

  /**
   * Initialize with default template
   */
  initializeDefault(): void {
    this.config = SqlFormatterEntity.getDefaultTemplate();
  }
}
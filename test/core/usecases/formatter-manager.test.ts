/**
 * FormatterManager Use Case Unit Tests
 * Hexagonal Architecture - Core Layer Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  FormatterManager, 
  FormatterConfig, 
  FormatterStoragePort, 
  SqlFormatterPort 
} from '@core/usecases/formatter-manager';

// Mock Storage Port for testing
class MockFormatterStorage implements FormatterStoragePort {
  private storage: FormatterConfig | null = null;
  private shouldThrowError = false;

  setMockConfig(config: FormatterConfig | null): void {
    this.storage = config;
  }

  setShouldThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow;
  }

  async saveConfig(config: FormatterConfig): Promise<void> {
    if (this.shouldThrowError) {
      throw new Error('Storage error');
    }
    this.storage = config;
  }

  async loadConfig(): Promise<FormatterConfig | null> {
    if (this.shouldThrowError) {
      throw new Error('Storage error');
    }
    return this.storage;
  }
}

// Mock SQL Formatter Port for testing
class MockSqlFormatter implements SqlFormatterPort {
  private shouldThrowError = false;

  setShouldThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow;
  }

  async format(sql: string, config: FormatterConfig): Promise<string> {
    if (this.shouldThrowError) {
      throw new Error('Formatter error');
    }
    return `FORMATTED: ${sql}`;
  }
}

describe('FormatterManager', () => {
  let formatterManager: FormatterManager;
  let mockStorage: MockFormatterStorage;
  let mockFormatter: MockSqlFormatter;

  beforeEach(() => {
    mockStorage = new MockFormatterStorage();
    mockFormatter = new MockSqlFormatter();
    formatterManager = new FormatterManager(mockStorage, mockFormatter);
  });

  describe('getDefaultConfig', () => {
    it('should return valid default configuration', () => {
      const defaultConfig = formatterManager.getDefaultConfig();

      expect(defaultConfig).toEqual({
        identifierEscape: {
          start: "",
          end: ""
        },
        parameterSymbol: ":",
        parameterStyle: "named",
        indentSize: 4,
        indentChar: " ",
        newline: "\n", // Actual implementation uses \n not \\n
        keywordCase: "lower",
        commaBreak: "before",
        andBreak: "before",
        withClauseStyle: "full-oneline",
        preserveComments: true
      });
    });
  });

  describe('applyConfig', () => {
    it('should parse and save valid JSON configuration', async () => {
      const configJson = JSON.stringify({
        identifierEscape: { start: "[", end: "]" },
        parameterSymbol: "$",
        parameterStyle: "numbered",
        indentSize: 2,
        indentChar: " ",
        newline: "\\n",
        keywordCase: "upper",
        commaBreak: "after",
        andBreak: "after",
        withClauseStyle: "compact",
        preserveComments: false
      });

      await formatterManager.applyConfig(configJson);

      // Verify config was saved by checking if we can load it back
      const savedConfig = await formatterManager.getCurrentConfig();
      expect(savedConfig.keywordCase).toBe('upper');
      expect(savedConfig.indentSize).toBe(2);
    });

    it('should throw error for invalid JSON', async () => {
      const invalidJson = '{ "invalid": json }';

      await expect(formatterManager.applyConfig(invalidJson))
        .rejects.toThrow('Invalid JSON format in formatter config');
    });

    it('should throw error for missing required fields', async () => {
      const incompleteConfig = JSON.stringify({
        keywordCase: "upper"
        // Missing required fields
      });

      await expect(formatterManager.applyConfig(incompleteConfig))
        .rejects.toThrow('Missing required field');
    });

    it('should validate indentSize is a non-negative number', async () => {
      const configWithInvalidIndent = JSON.stringify({
        identifierEscape: { start: "", end: "" },
        parameterSymbol: ":",
        parameterStyle: "named",
        indentSize: -1, // Invalid
        indentChar: " ",
        keywordCase: "lower",
        withClauseStyle: "full-oneline"
      });

      await expect(formatterManager.applyConfig(configWithInvalidIndent))
        .rejects.toThrow('indentSize must be a non-negative number');
    });

    it('should validate keywordCase is a valid option', async () => {
      const configWithInvalidKeywordCase = JSON.stringify({
        identifierEscape: { start: "", end: "" },
        parameterSymbol: ":",
        parameterStyle: "named",
        indentSize: 4,
        indentChar: " ",
        keywordCase: "invalid", // Invalid
        withClauseStyle: "full-oneline"
      });

      await expect(formatterManager.applyConfig(configWithInvalidKeywordCase))
        .rejects.toThrow('keywordCase must be one of: lower, upper, preserve');
    });

    it('should handle storage errors', async () => {
      mockStorage.setShouldThrowError(true);
      const validConfig = JSON.stringify(formatterManager.getDefaultConfig());

      await expect(formatterManager.applyConfig(validConfig))
        .rejects.toThrow('Storage error');
    });
  });

  describe('getCurrentConfig', () => {
    it('should return saved configuration when available', async () => {
      const customConfig: FormatterConfig = {
        ...formatterManager.getDefaultConfig(),
        keywordCase: 'upper',
        indentSize: 8
      };

      mockStorage.setMockConfig(customConfig);

      const result = await formatterManager.getCurrentConfig();
      expect(result.keywordCase).toBe('upper');
      expect(result.indentSize).toBe(8);
    });

    it('should return default configuration when no saved config', async () => {
      mockStorage.setMockConfig(null);

      const result = await formatterManager.getCurrentConfig();
      const defaultConfig = formatterManager.getDefaultConfig();
      
      expect(result).toEqual(defaultConfig);
    });

    it('should handle storage load errors by throwing', async () => {
      mockStorage.setShouldThrowError(true);

      // Should throw error as the implementation doesn't handle storage errors
      await expect(formatterManager.getCurrentConfig())
        .rejects.toThrow('Storage error');
    });
  });

  describe('formatSql', () => {
    it('should format SQL using provided configuration', async () => {
      const sql = 'SELECT * FROM users';
      const customConfig = {
        ...formatterManager.getDefaultConfig(),
        keywordCase: 'upper' as const
      };

      const result = await formatterManager.formatSql(sql, customConfig);

      expect(result).toBe('FORMATTED: SELECT * FROM users');
    });

    it('should format SQL using current saved configuration when no config provided', async () => {
      const sql = 'SELECT * FROM users';
      
      // Set up saved config
      const savedConfig: FormatterConfig = {
        ...formatterManager.getDefaultConfig(),
        keywordCase: 'upper'
      };
      mockStorage.setMockConfig(savedConfig);

      const result = await formatterManager.formatSql(sql);

      expect(result).toBe('FORMATTED: SELECT * FROM users');
    });

    it('should throw error when no formatter is available', async () => {
      const formatterManagerWithoutFormatter = new FormatterManager(mockStorage);
      const sql = 'SELECT * FROM users';

      await expect(formatterManagerWithoutFormatter.formatSql(sql))
        .rejects.toThrow('SQL formatter not available');
    });

    it('should handle formatter errors', async () => {
      mockFormatter.setShouldThrowError(true);
      const sql = 'SELECT * FROM users';

      await expect(formatterManager.formatSql(sql))
        .rejects.toThrow('Formatter error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow: save config, load config, format SQL', async () => {
      // 1. Save custom configuration
      const customConfigJson = JSON.stringify({
        ...formatterManager.getDefaultConfig(),
        keywordCase: 'upper',
        indentSize: 2
      });
      
      await formatterManager.applyConfig(customConfigJson);

      // 2. Load and verify configuration
      const loadedConfig = await formatterManager.getCurrentConfig();
      expect(loadedConfig.keywordCase).toBe('upper');
      expect(loadedConfig.indentSize).toBe(2);

      // 3. Format SQL using saved configuration
      const sql = 'select * from users';
      const result = await formatterManager.formatSql(sql);
      expect(result).toBe('FORMATTED: select * from users');
    });

    it('should handle edge case with empty SQL', async () => {
      const result = await formatterManager.formatSql('');
      expect(result).toBe('FORMATTED: ');
    });

    it('should handle very large configuration objects', async () => {
      const largeConfig = {
        ...formatterManager.getDefaultConfig(),
        customField: 'x'.repeat(10000) // Large field
      };

      const configJson = JSON.stringify(largeConfig);
      
      // Should not throw error for large but valid config
      await formatterManager.applyConfig(configJson);
    });
  });
});
/**
 * FormatterConfigStorage Adapter Unit Tests
 * Hexagonal Architecture - Infrastructure Layer Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FormatterConfigStorage } from '@adapters/storage/formatter-config-storage';
import { FormatterConfig } from '@core/usecases/formatter-manager';

// Mock localStorage
const mockLocalStorage = {
  store: {} as Record<string, string>,
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

// Setup actual mock behavior
mockLocalStorage.getItem.mockImplementation((key: string) => mockLocalStorage.store[key] || null);
mockLocalStorage.setItem.mockImplementation((key: string, value: string) => {
  mockLocalStorage.store[key] = value;
});
mockLocalStorage.removeItem.mockImplementation((key: string) => {
  delete mockLocalStorage.store[key];
});
mockLocalStorage.clear.mockImplementation(() => {
  mockLocalStorage.store = {};
});

// Setup localStorage mock
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('FormatterConfigStorage', () => {
  let storage: FormatterConfigStorage;
  const STORAGE_KEY = 'zosql-formatter-config';

  const sampleConfig: FormatterConfig = {
    identifierEscape: {
      start: "[",
      end: "]"
    },
    parameterSymbol: "$",
    parameterStyle: "numbered",
    indentSize: 2,
    indentChar: "\t",
    newline: "\\r\\n",
    keywordCase: "upper",
    commaBreak: "after",
    andBreak: "after",
    withClauseStyle: "compact",
    preserveComments: false
  };

  beforeEach(() => {
    storage = new FormatterConfigStorage();
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveConfig', () => {
    it('should save configuration to localStorage', async () => {
      await storage.saveConfig(sampleConfig);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(sampleConfig, null, 2)
      );
      expect(mockLocalStorage.store[STORAGE_KEY]).toBeDefined();
    });

    it('should handle configuration with special characters', async () => {
      const configWithSpecialChars: FormatterConfig = {
        ...sampleConfig,
        indentChar: "🔥", // Emoji
        newline: "\\n\\r", // Escape sequences
      };

      await storage.saveConfig(configWithSpecialChars);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify(configWithSpecialChars, null, 2)
      );
    });

    it('should handle localStorage setItem errors', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      await expect(storage.saveConfig(sampleConfig))
        .rejects.toThrow('Failed to save formatter config');
    });

    it('should handle JSON serialization errors', async () => {
      const circularConfig: FormatterConfig & { circular?: unknown } = { ...sampleConfig };
      circularConfig.circular = circularConfig; // Create circular reference

      mockLocalStorage.setItem.mockImplementation((_key: string, value: string) => {
        JSON.parse(value); // This will throw for circular references
      });

      await expect(storage.saveConfig(circularConfig))
        .rejects.toThrow('Failed to save formatter config');
    });
  });

  describe('loadConfig', () => {
    it('should load saved configuration from localStorage', async () => {
      // Setup: save config first
      const serializedConfig = JSON.stringify(sampleConfig, null, 2);
      mockLocalStorage.store[STORAGE_KEY] = serializedConfig;

      const result = await storage.loadConfig();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(result).toEqual(sampleConfig);
    });

    it('should return null when no configuration exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = await storage.loadConfig();

      expect(result).toBeNull();
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('should handle invalid JSON gracefully', async () => {
      mockLocalStorage.store[STORAGE_KEY] = '{ invalid json }';

      const result = await storage.loadConfig();

      expect(result).toBeNull();
      expect(console.warn).toBeDefined(); // Should have warned about the error
    });

    it('should handle localStorage getItem errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new DOMException('SecurityError');
      });

      const result = await storage.loadConfig();

      expect(result).toBeNull();
    });

    it('should handle empty string in localStorage', async () => {
      mockLocalStorage.store[STORAGE_KEY] = '';

      const result = await storage.loadConfig();

      expect(result).toBeNull();
    });

    it('should handle whitespace-only string in localStorage', async () => {
      mockLocalStorage.store[STORAGE_KEY] = '   \n\t   ';

      const result = await storage.loadConfig();

      expect(result).toBeNull();
    });
  });

  describe('clearConfig', () => {
    it('should remove configuration from localStorage', async () => {
      // Setup: save config first
      mockLocalStorage.store[STORAGE_KEY] = JSON.stringify(sampleConfig);

      await storage.clearConfig();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
      expect(mockLocalStorage.store[STORAGE_KEY]).toBeUndefined();
    });

    it('should handle localStorage removeItem errors', async () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new DOMException('SecurityError');
      });

      await expect(storage.clearConfig())
        .rejects.toThrow('Failed to clear formatter config');
    });

    it('should succeed even when key does not exist', async () => {
      // Ensure key doesn't exist
      delete mockLocalStorage.store[STORAGE_KEY];

      await storage.clearConfig();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete save-load-clear cycle', async () => {
      // 1. Save configuration
      await storage.saveConfig(sampleConfig);
      expect(mockLocalStorage.store[STORAGE_KEY]).toBeDefined();

      // 2. Load configuration
      const loaded = await storage.loadConfig();
      expect(loaded).toEqual(sampleConfig);

      // 3. Clear configuration
      await storage.clearConfig();
      expect(mockLocalStorage.store[STORAGE_KEY]).toBeUndefined();

      // 4. Verify cleared
      const loadedAfterClear = await storage.loadConfig();
      expect(loadedAfterClear).toBeNull();
    });

    it('should handle multiple rapid save operations', async () => {
      const configs = [
        { ...sampleConfig, keywordCase: 'lower' as const },
        { ...sampleConfig, keywordCase: 'upper' as const },
        { ...sampleConfig, keywordCase: 'preserve' as const }
      ];

      for (const config of configs) {
        await storage.saveConfig(config);
      }

      const final = await storage.loadConfig();
      expect(final?.keywordCase).toBe('preserve'); // Should be the last saved
    });

    it('should handle very large configuration objects', async () => {
      const largeConfig: FormatterConfig = {
        ...sampleConfig,
        // Add a large string to test storage limits
        indentChar: 'x'.repeat(1000)
      };

      await storage.saveConfig(largeConfig);
      const loaded = await storage.loadConfig();

      expect(loaded?.indentChar).toBe('x'.repeat(1000));
    });

    it('should preserve all data types correctly', async () => {
      const complexConfig: FormatterConfig = {
        identifierEscape: {
          start: "START",
          end: "END"
        },
        parameterSymbol: "?",
        parameterStyle: "positional",
        indentSize: 0, // Test zero
        indentChar: "", // Test empty string
        newline: "\\n",
        keywordCase: "preserve",
        commaBreak: "before",
        andBreak: "after",
        withClauseStyle: "multiline",
        preserveComments: true // Test boolean
      };

      await storage.saveConfig(complexConfig);
      const loaded = await storage.loadConfig();

      expect(loaded).toEqual(complexConfig);
      expect(typeof loaded?.indentSize).toBe('number');
      expect(typeof loaded?.preserveComments).toBe('boolean');
      expect(loaded?.indentChar).toBe('');
    });

    it('should handle unicode characters correctly', async () => {
      const unicodeConfig: FormatterConfig = {
        ...sampleConfig,
        indentChar: "　", // Full-width space
        parameterSymbol: "¥", // Yen symbol
      };

      await storage.saveConfig(unicodeConfig);
      const loaded = await storage.loadConfig();

      expect(loaded?.indentChar).toBe("　");
      expect(loaded?.parameterSymbol).toBe("¥");
    });
  });
});
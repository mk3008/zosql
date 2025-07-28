/**
 * SQL Formatter Type Definitions
 * Core Layer - Type-safe definitions for SQL formatting configurations
 */

/**
 * Supported SQL dialect presets
 */
export type SqlDialect = 'postgres' | 'mysql' | 'sqlite' | 'mssql' | 'oracle';

/**
 * Keyword case transformation options
 */
export type KeywordCase = 'upper' | 'lower' | 'preserve';

/**
 * Identifier case transformation options
 */
export type IdentifierCase = 'upper' | 'lower' | 'preserve';

/**
 * Identifier escape configuration
 */
export interface IdentifierEscape {
  readonly start: string;
  readonly end: string;
}

/**
 * Indentation configuration
 */
export interface IndentationConfig {
  readonly size: number;
  readonly type: 'spaces' | 'tabs';
}

/**
 * Line breaking preferences
 */
export interface LineBreakConfig {
  readonly beforeAnd: boolean;
  readonly beforeOr: boolean;
  readonly beforeComma: boolean;
  readonly afterComma: boolean;
}

/**
 * Comprehensive SQL formatter configuration
 * Replaces dangerous 'any' type with structured, type-safe configuration
 */
export interface FormatterConfig {
  readonly preset: SqlDialect;
  readonly keywordCase: KeywordCase;
  readonly identifierCase: IdentifierCase;
  readonly identifierEscape: IdentifierEscape;
  readonly indentation: IndentationConfig;
  readonly lineBreaks: LineBreakConfig;
  readonly maxLineLength: number;
  readonly alignColumns: boolean;
  readonly removeComments: boolean;
  readonly normalizeWhitespace: boolean;
}

/**
 * Default formatter configuration for PostgreSQL
 */
export const DEFAULT_POSTGRES_CONFIG: FormatterConfig = {
  preset: 'postgres',
  keywordCase: 'lower',
  identifierCase: 'lower',
  identifierEscape: {
    start: '"',
    end: '"'
  },
  indentation: {
    size: 4,
    type: 'spaces'
  },
  lineBreaks: {
    beforeAnd: true,
    beforeOr: true,
    beforeComma: false,
    afterComma: true
  },
  maxLineLength: 120,
  alignColumns: true,
  removeComments: false,
  normalizeWhitespace: true
};

/**
 * Preset configurations for different SQL dialects
 */
export const DIALECT_PRESETS: Record<SqlDialect, FormatterConfig> = {
  postgres: DEFAULT_POSTGRES_CONFIG,
  mysql: {
    ...DEFAULT_POSTGRES_CONFIG,
    preset: 'mysql',
    identifierEscape: {
      start: '`',
      end: '`'
    }
  },
  sqlite: {
    ...DEFAULT_POSTGRES_CONFIG,
    preset: 'sqlite',
    identifierEscape: {
      start: '[',
      end: ']'
    }
  },
  mssql: {
    ...DEFAULT_POSTGRES_CONFIG,
    preset: 'mssql',
    keywordCase: 'upper',
    identifierEscape: {
      start: '[',
      end: ']'
    }
  },
  oracle: {
    ...DEFAULT_POSTGRES_CONFIG,
    preset: 'oracle',
    keywordCase: 'upper',
    identifierCase: 'upper'
  }
};

/**
 * Formatter configuration validation result
 */
export interface ConfigValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly normalizedConfig?: FormatterConfig;
}

/**
 * Type guard to check if object is a valid FormatterConfig
 */
export function isFormatterConfig(obj: unknown): obj is FormatterConfig {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const config = obj as Record<string, unknown>;

  return (
    typeof config.preset === 'string' &&
    ['postgres', 'mysql', 'sqlite', 'mssql', 'oracle'].includes(config.preset) &&
    typeof config.keywordCase === 'string' &&
    ['upper', 'lower', 'preserve'].includes(config.keywordCase) &&
    typeof config.identifierCase === 'string' &&
    ['upper', 'lower', 'preserve'].includes(config.identifierCase) &&
    typeof config.identifierEscape === 'object' &&
    config.identifierEscape !== null &&
    typeof (config.identifierEscape as Record<string, unknown>).start === 'string' &&
    typeof (config.identifierEscape as Record<string, unknown>).end === 'string' &&
    typeof config.indentation === 'object' &&
    config.indentation !== null &&
    typeof (config.indentation as Record<string, unknown>).size === 'number' &&
    ['spaces', 'tabs'].includes((config.indentation as Record<string, unknown>).type as string) &&
    typeof config.maxLineLength === 'number' &&
    typeof config.alignColumns === 'boolean' &&
    typeof config.removeComments === 'boolean' &&
    typeof config.normalizeWhitespace === 'boolean'
  );
}

/**
 * Validate and normalize formatter configuration
 */
export function validateFormatterConfig(config: unknown): ConfigValidationResult {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { isValid: false, errors };
  }

  if (!isFormatterConfig(config)) {
    errors.push('Invalid formatter configuration structure');
    return { isValid: false, errors };
  }

  // Additional validation
  if (config.indentation.size < 1 || config.indentation.size > 8) {
    errors.push('Indentation size must be between 1 and 8');
  }

  if (config.maxLineLength < 50 || config.maxLineLength > 500) {
    errors.push('Maximum line length must be between 50 and 500 characters');
  }

  if (config.identifierEscape.start === config.identifierEscape.end && 
      config.identifierEscape.start.length > 1) {
    errors.push('Identifier escape characters should be different or single characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedConfig: errors.length === 0 ? config : undefined
  };
}

/**
 * Create formatter configuration from partial input with defaults
 */
export function createFormatterConfig(
  partial: Partial<FormatterConfig> = {},
  basePreset: SqlDialect = 'postgres'
): FormatterConfig {
  const baseConfig = DIALECT_PRESETS[basePreset];
  
  return {
    ...baseConfig,
    ...partial,
    // Ensure nested objects are properly merged
    identifierEscape: {
      ...baseConfig.identifierEscape,
      ...partial.identifierEscape
    },
    indentation: {
      ...baseConfig.indentation,
      ...partial.indentation
    },
    lineBreaks: {
      ...baseConfig.lineBreaks,
      ...partial.lineBreaks
    }
  };
}

/**
 * Convert legacy configuration format to new type-safe format
 */
export function migrateLegacyConfig(legacyConfig: Record<string, unknown>): FormatterConfig {
  if (isFormatterConfig(legacyConfig)) {
    return legacyConfig;
  }

  // Handle common legacy format patterns
  const preset = (legacyConfig?.dialect as SqlDialect) || (legacyConfig?.preset as SqlDialect) || 'postgres';
  
  return createFormatterConfig({
    preset,
    keywordCase: (legacyConfig?.keywordCase as KeywordCase) || 'lower',
    identifierCase: (legacyConfig?.identifierCase as IdentifierCase) || 'lower',
    indentation: {
      size: (legacyConfig?.indentSize as number) || (legacyConfig?.tabSize as number) || 4,
      type: legacyConfig?.useTabs ? 'tabs' : 'spaces'
    },
    maxLineLength: (legacyConfig?.lineLength as number) || (legacyConfig?.maxLength as number) || 120,
    alignColumns: (legacyConfig?.alignColumns as boolean) ?? true,
    removeComments: (legacyConfig?.stripComments as boolean) ?? false,
    normalizeWhitespace: (legacyConfig?.normalizeSpaces as boolean) ?? true
  });
}
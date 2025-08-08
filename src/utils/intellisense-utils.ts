// Extracted IntelliSense utility functions for unit testing

import { pipe } from '../lib/functional/index.js';
import * as Result from '../lib/functional/result.js';
import * as Option from '../lib/functional/option.js';

/**
 * Check if the current position is in a FROM clause context
 * This function determines if the user is typing table names after FROM or JOIN keywords
 */
export function checkFromClauseContext(fullText: string, position: { lineNumber: number; column: number }): boolean {
  try {
    // Get text up to current position
    const lines = fullText.split('\n');
    let textUpToPosition = '';
    
    for (let i = 0; i < position.lineNumber; i++) {
      if (i < position.lineNumber - 1) {
        textUpToPosition += lines[i] + '\n';
      } else {
        const line = lines[i];
        if (line) {
          textUpToPosition += line.substring(0, position.column - 1);
        }
      }
    }
    
    // Remove comments and strings to avoid false positives
    const cleanedText = textUpToPosition
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/'[^']*'/g, "''") // Remove string literals
      .replace(/"[^"]*"/g, '""'); // Remove quoted identifiers
    
    // Check if we're in a FROM clause context - more flexible patterns
    const fromPattern = /\bFROM\s*$/i;
    const joinPattern = /\b(?:INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN)\s*$/i;
    
    // Also check for incomplete table names after FROM
    const fromTablePattern = /\bFROM\s+\w*$/i;
    const joinTablePattern = /\b(?:INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN)\s+\w*$/i;
    
    const isFromContext = fromPattern.test(cleanedText) || 
                        joinPattern.test(cleanedText) ||
                        fromTablePattern.test(cleanedText) ||
                        joinTablePattern.test(cleanedText);
    
    return isFromContext;
  } catch (error) {
    console.error('Error checking FROM clause context:', error);
    return false;
  }
}

/**
 * Extract alias from text before cursor for table column completion
 * Returns [fullMatch, alias, partialColumn] or null if no alias found
 */
export function extractAliasFromText(textBeforeCursor: string, charBeforeCursor: string): string[] | null {
  let periodMatch = null;

  // 1. ドット入力直後のケース
  if (charBeforeCursor === '.') {
    // Check if textBeforeCursor already includes the dot
    if (textBeforeCursor.endsWith('.')) {
      // Case: textBeforeCursor = "where u.", charBeforeCursor = "."
      const aliasMatch = textBeforeCursor.match(/([a-zA-Z][a-zA-Z0-9_]*)\.$/);
      if (aliasMatch) {
        periodMatch = [aliasMatch[0], aliasMatch[1], ''];
      }
    } else {
      // Case: textBeforeCursor = "SELECT o", charBeforeCursor = "."
      const aliasMatch = textBeforeCursor.match(/([a-zA-Z][a-zA-Z0-9_]*)$/);
      if (aliasMatch) {
        periodMatch = [aliasMatch[0] + '.', aliasMatch[1], ''];
      }
    }
  } 
  // 2. 既にドットが含まれているケース
  else {
    const match = textBeforeCursor.match(/([a-zA-Z][a-zA-Z0-9_]*)\.([a-zA-Z0-9_]*)$/);
    if (match) {
      periodMatch = [match[0], match[1], match[2]];
    }
  }
  
  return periodMatch;
}

/**
 * Find table name by alias from parse results
 */
export function findTableByAlias(parseResult: unknown, alias: string): string | null {
  if (!parseResult || typeof parseResult !== 'object' || parseResult === null) {
    return null;
  }
  
  const result = parseResult as Record<string, unknown>;
  if (!Array.isArray(result.tables)) {
    return null;
  }

  for (const table of result.tables) {
    if (table && typeof table === 'object') {
      const tableObj = table as Record<string, unknown>;
      if (tableObj.alias === alias && typeof tableObj.name === 'string') {
        return tableObj.name;
      }
    }
  }
  
  return null;
}

/**
 * Find table object by alias from parse results (for CTE/subquery support)
 */
export function findTableObjectByAlias(parseResult: unknown, alias: string): Record<string, unknown> | null {
  if (!parseResult || typeof parseResult !== 'object' || parseResult === null) {
    return null;
  }
  
  const result = parseResult as Record<string, unknown>;
  if (!Array.isArray(result.tables)) {
    return null;
  }

  for (const table of result.tables) {
    if (table && typeof table === 'object') {
      const tableObj = table as Record<string, unknown>;
      if (tableObj.alias === alias) {
        return tableObj;
      }
    }
  }
  
  return null;
}

/**
 * Combine tables and shared CTE schema data for IntelliSense
 */
export function combineSchemaData(tablesData: unknown, sharedCteData: unknown): Record<string, unknown> {
  const tables = tablesData && typeof tablesData === 'object' ? tablesData as Record<string, unknown> : {};
  const sharedCte = sharedCteData && typeof sharedCteData === 'object' ? sharedCteData as Record<string, unknown> : {};
  
  return {
    success: tables.success,
    tables: [...(Array.isArray(tables.tables) ? tables.tables : []), ...(Array.isArray(sharedCte.sharedCteTables) ? sharedCte.sharedCteTables : [])],
    columns: {...(tables.columns && typeof tables.columns === 'object' ? tables.columns : {}), ...(sharedCte.sharedCteColumns && typeof sharedCte.sharedCteColumns === 'object' ? sharedCte.sharedCteColumns : {})},
    functions: Array.isArray(tables.functions) ? tables.functions : [],
    keywords: Array.isArray(tables.keywords) ? tables.keywords : [],
    sharedCtes: sharedCte.sharedCtes && typeof sharedCte.sharedCtes === 'object' ? sharedCte.sharedCtes : {}
  };
}

/**
 * Get columns for a table (supports CTE, subquery, and shared CTEs)
 */
export function getColumnsForTable(
  tableName: string, 
  alias: string, 
  parseResult: unknown, 
  schemaData: unknown
): string[] {
  let columns: string[] = [];
  const schema = schemaData && typeof schemaData === 'object' ? schemaData as Record<string, unknown> : {};
  
  // Check if it's a CTE or subquery table with columns in parse result
  if (parseResult) {
    const tableObject = findTableObjectByAlias(parseResult, alias);
    if (tableObject && (tableObject.type === 'cte' || tableObject.type === 'subquery') && Array.isArray(tableObject.columns) && tableObject.columns.length > 0) {
      columns = tableObject.columns as string[];
    } else if (schema.columns && typeof schema.columns === 'object' && schema.columns !== null) {
      const columnsObj = schema.columns as Record<string, unknown>;
      if (Array.isArray(columnsObj[tableName])) {
        columns = columnsObj[tableName] as string[];
      }
    } else {
      // Check if it's a shared CTE
      if (schema.sharedCtes && typeof schema.sharedCtes === 'object' && schema.sharedCtes !== null) {
        const sharedCtes = schema.sharedCtes as Record<string, unknown>;
        const sharedCte = sharedCtes[tableName];
        if (sharedCte && typeof sharedCte === 'object' && sharedCte !== null) {
          const cteObj = sharedCte as Record<string, unknown>;
          if (Array.isArray(cteObj.columns)) {
            columns = cteObj.columns.map((col: unknown) => {
              if (col && typeof col === 'object' && col !== null) {
                const colObj = col as Record<string, unknown>;
                return typeof colObj.name === 'string' ? colObj.name : '';
              }
              return '';
            }).filter(name => name !== '');
          }
        }
      }
    }
  } else {
    // Check shared CTEs first when no parse result
    if (schema.sharedCtes && typeof schema.sharedCtes === 'object' && schema.sharedCtes !== null) {
      const sharedCtes = schema.sharedCtes as Record<string, unknown>;
      const sharedCte = sharedCtes[tableName];
      if (sharedCte && typeof sharedCte === 'object' && sharedCte !== null) {
        const cteObj = sharedCte as Record<string, unknown>;
        if (Array.isArray(cteObj.columns)) {
          columns = cteObj.columns.map((col: unknown) => {
            if (col && typeof col === 'object' && col !== null) {
              const colObj = col as Record<string, unknown>;
              return typeof colObj.name === 'string' ? colObj.name : '';
            }
            return '';
          }).filter(name => name !== '');
        }
      }
    } else if (schema.columns && typeof schema.columns === 'object' && schema.columns !== null) {
      const columnsObj = schema.columns as Record<string, unknown>;
      if (Array.isArray(columnsObj[tableName])) {
        columns = columnsObj[tableName] as string[];
      }
    }
  }
  
  return columns;
}

// ===== NEW FUNCTIONAL VERSIONS - BACKWARD COMPATIBLE =====

/**
 * Functional version: Clean SQL text by removing comments and strings
 * Pure function for SQL text preprocessing
 */
export const cleanSqlTextFunc = (text: string): string => {
  return pipe(
    text,
    (text: string) => text.replace(/--.*$/gm, ''), // Remove line comments
    (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, ''), // Remove block comments
    (text: string) => text.replace(/'[^']*'/g, "''"), // Remove string literals
    (text: string) => text.replace(/"[^"]*"/g, '""') // Remove quoted identifiers
  );
};

/**
 * Functional version: Extract text up to position
 * Pure function for getting text up to cursor position
 */
export const extractTextUpToPositionFunc = (
  fullText: string, 
  position: { lineNumber: number; column: number }
): Result.Result<string, Error> => {
  return Result.tryCatch(() => {
    const lines = fullText.split('\n');
    let textUpToPosition = '';
    
    for (let i = 0; i < position.lineNumber; i++) {
      if (i < position.lineNumber - 1) {
        textUpToPosition += lines[i] + '\n';
      } else {
        const line = lines[i];
        if (line) {
          textUpToPosition += line.substring(0, position.column - 1);
        }
      }
    }
    
    return textUpToPosition;
  });
};

/**
 * Functional version: Check FROM clause context patterns
 * Pure function for pattern matching
 */
export const checkFromClauseContextPatternsFunc = (cleanedText: string): boolean => {
  const patterns = [
    /\bFROM\s*$/i,
    /\b(?:INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN)\s*$/i,
    /\bFROM\s+\w*$/i,
    /\b(?:INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN)\s+\w*$/i
  ];
  
  return patterns.some(pattern => pattern.test(cleanedText));
};

/**
 * Functional version: Check FROM clause context
 * Returns Result type for error handling
 */
export const checkFromClauseContextFunc = (
  fullText: string, 
  position: { lineNumber: number; column: number }
): Result.Result<boolean, Error> => {
  const textResult = extractTextUpToPositionFunc(fullText, position);
  
  if (Result.isErr(textResult)) {
    return textResult;
  }
  
  const cleanedText = cleanSqlTextFunc(textResult.value);
  const isFromContext = checkFromClauseContextPatternsFunc(cleanedText);
  
  return Result.ok(isFromContext);
};

/**
 * Functional version: Parse alias patterns from text
 * Pure function for alias extraction patterns
 */
export const parseAliasFromTextFunc = (
  textBeforeCursor: string, 
  charBeforeCursor: string
): Option.Option<[string, string, string]> => {
  // 1. Dot input case
  if (charBeforeCursor === '.') {
    if (textBeforeCursor.endsWith('.')) {
      const aliasMatch = textBeforeCursor.match(/([a-zA-Z][a-zA-Z0-9_]*)\.$/);
      if (aliasMatch) {
        return Option.some([aliasMatch[0], aliasMatch[1], '']);
      }
    } else {
      const aliasMatch = textBeforeCursor.match(/([a-zA-Z][a-zA-Z0-9_]*)$/);
      if (aliasMatch) {
        return Option.some([aliasMatch[0] + '.', aliasMatch[1], '']);
      }
    }
  } 
  // 2. Already contains dot case
  else {
    const match = textBeforeCursor.match(/([a-zA-Z][a-zA-Z0-9_]*)\.([a-zA-Z0-9_]*)$/);
    if (match) {
      return Option.some([match[0], match[1], match[2]]);
    }
  }
  
  return Option.none;
};

/**
 * Functional version: Extract alias from text
 * Returns Option type instead of null
 */
export const extractAliasFromTextFunc = (
  textBeforeCursor: string, 
  charBeforeCursor: string
): Option.Option<string[]> => {
  const aliasResult = parseAliasFromTextFunc(textBeforeCursor, charBeforeCursor);
  
  if (Option.isSome(aliasResult)) {
    return Option.some(aliasResult.value);
  }
  
  return Option.none;
};

/**
 * Functional version: Find table by alias from tables array
 * Pure function with Option return type
 */
export const findTableByAliasFromArrayFunc = (
  tables: unknown[], 
  alias: string
): Option.Option<string> => {
  for (const table of tables) {
    if (table && typeof table === 'object') {
      const tableObj = table as Record<string, unknown>;
      if (tableObj.alias === alias && typeof tableObj.name === 'string') {
        return Option.some(tableObj.name);
      }
    }
  }
  
  return Option.none;
};

/**
 * Functional version: Find table by alias
 * Returns Option type instead of null
 */
export const findTableByAliasFunc = (
  parseResult: unknown, 
  alias: string
): Option.Option<string> => {
  if (!parseResult || typeof parseResult !== 'object' || parseResult === null) {
    return Option.none;
  }
  
  const result = parseResult as Record<string, unknown>;
  if (!Array.isArray(result.tables)) {
    return Option.none;
  }
  
  return findTableByAliasFromArrayFunc(result.tables, alias);
};

/**
 * Functional version: Find table object by alias from tables array
 * Pure function with Option return type
 */
export const findTableObjectByAliasFromArrayFunc = (
  tables: unknown[], 
  alias: string
): Option.Option<Record<string, unknown>> => {
  for (const table of tables) {
    if (table && typeof table === 'object') {
      const tableObj = table as Record<string, unknown>;
      if (tableObj.alias === alias) {
        return Option.some(tableObj);
      }
    }
  }
  
  return Option.none;
};

/**
 * Functional version: Find table object by alias
 * Returns Option type instead of null
 */
export const findTableObjectByAliasFunc = (
  parseResult: unknown, 
  alias: string
): Option.Option<Record<string, unknown>> => {
  if (!parseResult || typeof parseResult !== 'object' || parseResult === null) {
    return Option.none;
  }
  
  const result = parseResult as Record<string, unknown>;
  if (!Array.isArray(result.tables)) {
    return Option.none;
  }
  
  return findTableObjectByAliasFromArrayFunc(result.tables, alias);
};

/**
 * Functional version: Extract columns from CTE object
 * Pure function for extracting column names from CTE structure
 */
export const extractColumnsFromCTEFunc = (cteObj: Record<string, unknown>): string[] => {
  if (!Array.isArray(cteObj.columns)) {
    return [];
  }
  
  return pipe(
    cteObj.columns,
    (columns: unknown[]) => columns
      .map((col: unknown) => {
        if (col && typeof col === 'object' && col !== null) {
          const colObj = col as Record<string, unknown>;
          return typeof colObj.name === 'string' ? colObj.name : '';
        }
        return '';
      }),
    (columnNames: string[]) => columnNames.filter(name => name !== '')
  );
};

/**
 * Functional version: Get columns from shared CTEs
 * Pure function for extracting columns from shared CTE structure
 */
export const getColumnsFromSharedCTEsFunc = (
  tableName: string, 
  sharedCtes: Record<string, unknown>
): Option.Option<string[]> => {
  const sharedCte = sharedCtes[tableName];
  if (sharedCte && typeof sharedCte === 'object' && sharedCte !== null) {
    const columns = extractColumnsFromCTEFunc(sharedCte as Record<string, unknown>);
    return columns.length > 0 ? Option.some(columns) : Option.none;
  }
  
  return Option.none;
};

/**
 * Functional version: Get columns from schema columns
 * Pure function for extracting columns from schema structure
 */
export const getColumnsFromSchemaFunc = (
  tableName: string, 
  columns: Record<string, unknown>
): Option.Option<string[]> => {
  if (Array.isArray(columns[tableName])) {
    return Option.some(columns[tableName] as string[]);
  }
  
  return Option.none;
};

/**
 * Functional version: Get columns for table
 * Functional pipeline for column extraction with multiple fallbacks
 */
export const getColumnsForTableFunc = (
  tableName: string, 
  alias: string, 
  parseResult: unknown, 
  schemaData: unknown
): string[] => {
  const schema = schemaData && typeof schemaData === 'object' ? schemaData as Record<string, unknown> : {};
  
  // Check CTE or subquery table first
  if (parseResult) {
    const tableObjectOption = findTableObjectByAliasFunc(parseResult, alias);
    if (Option.isSome(tableObjectOption)) {
      const tableObject = tableObjectOption.value;
      if (
        (tableObject.type === 'cte' || tableObject.type === 'subquery') && 
        Array.isArray(tableObject.columns) && 
        tableObject.columns.length > 0
      ) {
        return tableObject.columns as string[];
      }
    }
  }
  
  // Check schema columns
  if (schema.columns && typeof schema.columns === 'object' && schema.columns !== null) {
    const columnsFromSchema = getColumnsFromSchemaFunc(tableName, schema.columns as Record<string, unknown>);
    if (Option.isSome(columnsFromSchema)) {
      return columnsFromSchema.value;
    }
  }
  
  // Check shared CTEs
  if (schema.sharedCtes && typeof schema.sharedCtes === 'object' && schema.sharedCtes !== null) {
    const columnsFromCTE = getColumnsFromSharedCTEsFunc(tableName, schema.sharedCtes as Record<string, unknown>);
    if (Option.isSome(columnsFromCTE)) {
      return columnsFromCTE.value;
    }
  }
  
  return [];
};

/**
 * Functional version: Merge schema arrays
 * Pure function for merging array data safely
 */
export const mergeSchemaArraysFunc = <T>(arr1: unknown, arr2: unknown): T[] => {
  const array1 = Array.isArray(arr1) ? arr1 : [];
  const array2 = Array.isArray(arr2) ? arr2 : [];
  return [...array1, ...array2] as T[];
};

/**
 * Functional version: Merge schema objects
 * Pure function for merging object data safely
 */
export const mergeSchemaObjectsFunc = (obj1: unknown, obj2: unknown): Record<string, unknown> => {
  const object1 = (obj1 && typeof obj1 === 'object') ? obj1 as Record<string, unknown> : {};
  const object2 = (obj2 && typeof obj2 === 'object') ? obj2 as Record<string, unknown> : {};
  return { ...object1, ...object2 };
};

/**
 * Functional version: Combine schema data
 * Functional approach to merging schema information
 */
export const combineSchemaDataFunc = (
  tablesData: unknown, 
  sharedCteData: unknown
): Record<string, unknown> => {
  const tables = tablesData && typeof tablesData === 'object' ? tablesData as Record<string, unknown> : {};
  const sharedCte = sharedCteData && typeof sharedCteData === 'object' ? sharedCteData as Record<string, unknown> : {};
  
  return {
    success: tables.success,
    tables: mergeSchemaArraysFunc(tables.tables, sharedCte.sharedCteTables),
    columns: mergeSchemaObjectsFunc(tables.columns, sharedCte.sharedCteColumns),
    functions: Array.isArray(tables.functions) ? tables.functions : [],
    keywords: Array.isArray(tables.keywords) ? tables.keywords : [],
    sharedCtes: sharedCte.sharedCtes && typeof sharedCte.sharedCtes === 'object' ? sharedCte.sharedCtes : {}
  };
};

/**
 * Functional version: Validate schema data structure
 * Returns Result with validation information
 */
export const validateSchemaDataStructureFunc = (schemaData: unknown): Result.Result<{
  hasColumns: boolean;
  hasTables: boolean;
  hasSharedCtes: boolean;
  columnsCount: number;
  tablesCount: number;
}, string> => {
  if (!schemaData || typeof schemaData !== 'object') {
    return Result.err('Schema data must be an object');
  }
  
  const schema = schemaData as Record<string, unknown>;
  
  const hasColumns = !!(schema.columns && typeof schema.columns === 'object' && schema.columns !== null);
  const hasTables = Array.isArray(schema.tables);
  const hasSharedCtes = !!(schema.sharedCtes && typeof schema.sharedCtes === 'object' && schema.sharedCtes !== null);
  
  const columnsCount = hasColumns ? Object.keys(schema.columns as Record<string, unknown>).length : 0;
  const tablesCount = hasTables ? (schema.tables as unknown[]).length : 0;
  
  return Result.ok({
    hasColumns,
    hasTables,
    hasSharedCtes,
    columnsCount,
    tablesCount
  });
};
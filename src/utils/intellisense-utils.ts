// Extracted IntelliSense utility functions for unit testing

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
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
export function findTableByAlias(parseResult: any, alias: string): string | null {
  if (!parseResult || !parseResult.tables) {
    return null;
  }

  for (const table of parseResult.tables) {
    if (table.alias === alias) {
      return table.name;
    }
  }
  
  return null;
}

/**
 * Find table object by alias from parse results (for CTE/subquery support)
 */
export function findTableObjectByAlias(parseResult: any, alias: string): any | null {
  if (!parseResult || !parseResult.tables) {
    return null;
  }

  for (const table of parseResult.tables) {
    if (table.alias === alias) {
      return table;
    }
  }
  
  return null;
}

/**
 * Combine public and private schema data for IntelliSense
 */
export function combineSchemaData(publicData: any, privateData: any): any {
  return {
    success: publicData.success,
    tables: [...(publicData.tables || []), ...(privateData.privateTables || [])],
    columns: {...(publicData.columns || {}), ...(privateData.privateColumns || {})},
    functions: publicData.functions || [],
    keywords: publicData.keywords || [],
    privateResources: privateData.privateResources || {}
  };
}

/**
 * Get columns for a table (supports CTE, subquery, and private resources)
 */
export function getColumnsForTable(
  tableName: string, 
  alias: string, 
  parseResult: any, 
  schemaData: any
): string[] {
  let columns: string[] = [];
  
  // Check if it's a CTE or subquery table with columns in parse result
  if (parseResult) {
    const tableObject = findTableObjectByAlias(parseResult, alias);
    if (tableObject && (tableObject.type === 'cte' || tableObject.type === 'subquery') && tableObject.columns && tableObject.columns.length > 0) {
      columns = tableObject.columns;
    } else if (schemaData.columns && schemaData.columns[tableName]) {
      columns = schemaData.columns[tableName];
    } else {
      // Check if it's a private resource
      const privateResource = schemaData.privateResources && schemaData.privateResources[tableName];
      if (privateResource && privateResource.columns) {
        columns = privateResource.columns.map((col: any) => col.name);
      }
    }
  } else {
    // Check private resources first when no parse result
    const privateResource = schemaData.privateResources && schemaData.privateResources[tableName];
    if (privateResource && privateResource.columns) {
      columns = privateResource.columns.map((col: any) => col.name);
    } else if (schemaData.columns && schemaData.columns[tableName]) {
      columns = schemaData.columns[tableName];
    }
  }
  
  return columns;
}
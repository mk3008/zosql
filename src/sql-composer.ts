import { FileManager } from './file-manager.js';
import { SelectQueryParser, SqlFormatter } from 'rawsql-ts';
import { DEFAULT_FORMATTER_CONFIG, FormatterConfig } from './formatter-config.js';

export interface ComposeResult {
  sql: string;
}

export function composeSQL(fileManager: FileManager, developPath: string, _originalPath: string, formatterConfig?: FormatterConfig): ComposeResult {
  // Read main.sql file
  const mainSql = fileManager.readFile(`${developPath}/main.sql`);
  if (!mainSql) {
    throw new Error(`main.sql not found in ${developPath}`);
  }
  
  // Find and read CTE files
  const cteFiles = fileManager.listFiles().filter(f => f.startsWith(`${developPath}/cte/`) && f.endsWith('.sql'));
  
  if (cteFiles.length === 0) {
    // Return main.sql content as-is if no CTEs found
    return {
      sql: mainSql
    };
  }
  
  // Extract CTEs from main.sql
  const mainQuery = SelectQueryParser.parse(mainSql).toSimpleQuery();
  
  // Replace with CTE file contents
  for (const cteFile of cteFiles) {
    const cteName = cteFile.replace(`${developPath}/cte/`, '').replace('.sql', '');
    const cteContent = fileManager.readFile(cteFile);
    
    if (cteContent && mainQuery.withClause) {
      // Find CTE and replace content
      for (const cte of mainQuery.withClause.tables) {
        if (cte.aliasExpression.table.name === cteName) {
          // Parse and replace CTE content
          const cteQuery = SelectQueryParser.parse(cteContent).toSimpleQuery();
          cte.query = cteQuery;
        }
      }
    }
  }
  
  // Format and return
  const config = formatterConfig || DEFAULT_FORMATTER_CONFIG;
  const formatter = new SqlFormatter({
    identifierEscape: { start: "", end: "" },
    indentChar: config.indentChar,
    indentSize: config.indentSize,
    newline: config.newline,
    commaBreak: config.commaBreak,
    andBreak: config.andBreak,
    keywordCase: config.keywordCase
  });
  
  const formatResult = formatter.format(mainQuery);
  
  return {
    sql: formatResult.formattedSql
  };
}
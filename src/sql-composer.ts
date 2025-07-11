import { FileManager } from './file-manager.js';
import { SelectQueryParser, SqlFormatter } from 'rawsql-ts';
import { DEFAULT_FORMATTER_CONFIG, FormatterConfig } from './formatter-config.js';

export interface ComposeResult {
  sql: string;
}

export function composeSQL(fileManager: FileManager, developPath: string, _originalPath: string, formatterConfig?: FormatterConfig): ComposeResult {
  // main.sqlファイルを読み込み
  const mainSql = fileManager.readFile(`${developPath}/main.sql`);
  if (!mainSql) {
    throw new Error(`main.sql not found in ${developPath}`);
  }
  
  // CTEファイルを見つけて読み込み
  const cteFiles = fileManager.listFiles().filter(f => f.startsWith(`${developPath}/cte/`) && f.endsWith('.sql'));
  
  if (cteFiles.length === 0) {
    // CTEが無い場合は、main.sqlの内容をそのまま返す
    return {
      sql: mainSql
    };
  }
  
  // main.sqlからCTEを抽出
  const mainQuery = SelectQueryParser.parse(mainSql).toSimpleQuery();
  
  // CTEファイルの内容で置換
  for (const cteFile of cteFiles) {
    const cteName = cteFile.replace(`${developPath}/cte/`, '').replace('.sql', '');
    const cteContent = fileManager.readFile(cteFile);
    
    if (cteContent && mainQuery.withClause) {
      // CTEを見つけて内容を置換
      for (const cte of mainQuery.withClause.tables) {
        if (cte.aliasExpression.table.name === cteName) {
          // CTE内容を解析して置換
          const cteQuery = SelectQueryParser.parse(cteContent).toSimpleQuery();
          cte.query = cteQuery;
        }
      }
    }
  }
  
  // フォーマットして返す
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
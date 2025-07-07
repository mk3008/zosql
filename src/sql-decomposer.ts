import { SelectQueryParser, SqlFormatter } from 'rawsql-ts';
import { parseSQL } from './sql-parser';
import { FileManager } from './file-manager';
import { applyFormatterConfig, DEFAULT_FORMATTER_CONFIG, FormatterConfig } from './formatter-config';

export interface DecomposedFile {
  name: string;
  content: string;
}

export interface DecomposeResult {
  files: DecomposedFile[];
  fileManager: FileManager;
}

export function decomposeSQL(sql: string, formatterConfig?: FormatterConfig): DecomposeResult {
  const parsed = parseSQL(sql);
  const files: DecomposedFile[] = [];
  const fileManager = new FileManager();
  const config = formatterConfig || DEFAULT_FORMATTER_CONFIG;
  
  // CTEファイルの生成
  for (const cte of parsed.ctes) {
    const cteQuery = cte.query.query; // CommonTable内のSimpleSelectQuery
    const formatter = new SqlFormatter();
    const formatResult = formatter.format(cteQuery);
    
    const fileName = `${cte.name}.cte.sql`;
    const formattedContent = applyFormatterConfig(formatResult.formattedSql, config);
    
    files.push({
      name: fileName,
      content: formattedContent
    });
    
    fileManager.writeFile(fileName, formattedContent);
  }
  
  // メインファイルの生成（元のSQLをそのまま保存）
  if (parsed.ctes.length > 0) {
    const mainFileName = 'main.sql';
    // TODO: 将来的にCTEのワンライナー整形を実装
    const mainContent = sql.trim();
    
    files.push({
      name: mainFileName,
      content: mainContent
    });
    
    fileManager.writeFile(mainFileName, mainContent);
  }
  
  return { files, fileManager };
}
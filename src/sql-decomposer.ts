import { SelectQueryParser, SqlFormatter } from 'rawsql-ts';
import { parseSQL } from './sql-parser';
import { FileManager } from './file-manager';

export interface DecomposedFile {
  name: string;
  content: string;
}

export interface DecomposeResult {
  files: DecomposedFile[];
  fileManager: FileManager;
}

export function decomposeSQL(sql: string): DecomposeResult {
  const parsed = parseSQL(sql);
  const files: DecomposedFile[] = [];
  const fileManager = new FileManager();
  
  // CTEファイルの生成
  for (const cte of parsed.ctes) {
    const cteQuery = cte.query.query; // CommonTable内のSimpleSelectQuery
    const formatter = new SqlFormatter();
    const formatResult = formatter.format(cteQuery);
    
    const fileName = `${cte.name}.cte.sql`;
    const content = formatResult.formattedSql;
    
    files.push({
      name: fileName,
      content
    });
    
    fileManager.writeFile(fileName, content);
  }
  
  // メインファイルの生成（CTEの中身を空にして）
  if (parsed.ctes.length > 0) {
    // WITH句を含むメインクエリ
    let withClause = 'WITH\n';
    parsed.ctes.forEach((cte, index) => {
      withClause += `  ${cte.name} AS ()`;
      if (index < parsed.ctes.length - 1) {
        withClause += ',';
      }
      withClause += '\n';
    });
    
    // メインクエリ部分を抽出（簡易実装）
    const mainSelectMatch = sql.match(/\)\s*(SELECT[\s\S]*)/i);
    const mainSelect = mainSelectMatch ? mainSelectMatch[1] : 'SELECT * FROM ' + parsed.ctes[0].name;
    
    const mainFileName = 'main.sql';
    const mainContent = withClause + mainSelect;
    
    files.push({
      name: mainFileName,
      content: mainContent
    });
    
    fileManager.writeFile(mainFileName, mainContent);
  }
  
  return { files, fileManager };
}
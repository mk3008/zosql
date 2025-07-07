import { FileManager } from './file-manager';

export interface ComposeResult {
  sql: string;
}

export function composeSQL(fileManager: FileManager): ComposeResult {
  // main.sqlファイルを読み込み
  const mainSql = fileManager.readFile('main.sql');
  if (!mainSql) {
    throw new Error('main.sql not found');
  }
  
  // CTEファイルを見つけて読み込み
  const cteFiles = fileManager.listFiles().filter(f => f.endsWith('.cte.sql'));
  
  let composedSql = mainSql;
  
  // 各CTEファイルの内容をメインSQLに埋め込み
  for (const cteFile of cteFiles) {
    const cteName = cteFile.replace('.cte.sql', '');
    const cteContent = fileManager.readFile(cteFile);
    
    if (cteContent) {
      // "cteName AS ()" を "cteName AS (cteContent)" に置換
      const placeholder = `${cteName} AS ()`;
      const replacement = `${cteName} AS (\n    ${cteContent}\n  )`;
      composedSql = composedSql.replace(placeholder, replacement);
    }
  }
  
  return {
    sql: composedSql
  };
}
import { SelectQueryParser, SqlFormatter } from 'rawsql-ts';
import { parseSQL } from './sql-parser.js';
import { FileManager } from './file-manager.js';
import { DEFAULT_FORMATTER_CONFIG, FormatterConfig } from './formatter-config.js';

export interface DecomposedFile {
  name: string;
  content: string;
}

export interface DecomposeResult {
  files: DecomposedFile[];
  fileManager: FileManager;
}

function generateDependencyComments(cteNames: string[], outputPath: string): string[] {
  if (cteNames.length === 0) {
    return [];
  }
  
  const comments = [];
  comments.push('Auto-generated CTE block - do not edit manually');
  comments.push('Dependencies:');
  
  for (const cteName of cteNames) {
    comments.push(`${outputPath}/cte/${cteName}.sql`);
  }
  
  return comments;
}

export function decomposeSQL(sql: string, outputPath: string, formatterConfig?: FormatterConfig): DecomposeResult {
  const parsed = parseSQL(sql);
  const files: DecomposedFile[] = [];
  const fileManager = new FileManager();
  const config = formatterConfig || DEFAULT_FORMATTER_CONFIG;
  
  // CTEファイルの生成（/cte/フォルダ内）
  for (const cte of parsed.ctes) {
    const cteQuery = cte.query.query; // CommonTable内のSimpleSelectQuery
    
    // rawsql-tsのSqlFormatterを使用（構造化フォーマット）
    const formatter = new SqlFormatter({
      identifierEscape: { start: "", end: "" },
      indentChar: config.indentChar,
      indentSize: config.indentSize,
      newline: config.newline,
      commaBreak: config.commaBreak,
      andBreak: config.andBreak,
      keywordCase: config.keywordCase
    });
    
    const formatResult = formatter.format(cteQuery);
    
    const fileName = `${outputPath}/cte/${cte.name}.sql`;
    const content = formatResult.formattedSql;
    
    files.push({
      name: fileName,
      content
    });
    
    fileManager.writeFile(fileName, content);
  }
  
  // メインファイルの生成（CTEワンライナー整形を適用）
  if (parsed.ctes.length > 0) {
    const mainFileName = `${outputPath}/main.sql`;
    
    // rawsql-tsのSqlFormatterを使用（cte-onelineスタイル + コメント出力）
    const mainFormatter = new SqlFormatter({
      identifierEscape: { start: "", end: "" },
      withClauseStyle: 'full-oneline',
      exportComment: true,
      indentChar: config.indentChar,
      indentSize: config.indentSize,
      newline: config.newline,
      commaBreak: config.commaBreak,
      andBreak: config.andBreak,
      keywordCase: config.keywordCase
    });
    
    // 元のクエリを解析してフォーマット
    const parsedQuery = SelectQueryParser.parse(sql).toSimpleQuery();
    
    // CTE依存関係コメントを生成してSelectQueryに設定（絶対パス形式）
    const cteNames = parsed.ctes.map(cte => cte.name);
    const dependencyComments = generateDependencyComments(cteNames, outputPath);
    
    if (dependencyComments.length > 0) {
      // SelectQueryにコメントを追加
      if (!parsedQuery.comments) {
        parsedQuery.comments = [];
      }
      parsedQuery.comments.push(...dependencyComments);
    }
    
    const formatResult = mainFormatter.format(parsedQuery);
    const mainContent = formatResult.formattedSql;
    
    files.push({
      name: mainFileName,
      content: mainContent
    });
    
    fileManager.writeFile(mainFileName, mainContent);
  }
  
  return { files, fileManager };
}
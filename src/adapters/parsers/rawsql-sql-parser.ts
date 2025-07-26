/**
 * rawsql-ts SQL Parser Adapter
 * Infrastructure Layer - External Dependencies
 */

import { SelectQueryParser } from 'rawsql-ts';
import { SqlParserPort } from '@core/usecases/prompt-generator';

export class RawsqlSqlParser implements SqlParserPort {
  /**
   * SQLクエリからテーブル名を抽出
   * @param sql - 対象SQLクエリ
   * @returns テーブル名の配列
   */
  async extractSchema(sql: string): Promise<string[]> {
    try {
      const query = SelectQueryParser.parse(sql);
      const simpleQuery = query.toSimpleQuery();
      
      const tables: string[] = [];
      
      // FROM句からテーブル名を抽出
      if (simpleQuery.fromClause) {
        this.extractTablesFromSource(simpleQuery.fromClause.source, tables);
        
        // JOIN句からテーブル名を抽出
        if (simpleQuery.fromClause.joins) {
          for (const join of simpleQuery.fromClause.joins) {
            this.extractTablesFromSource(join.source, tables);
          }
        }
      }
      
      // WITH句のCTEは除外（これらはテストデータで作成するため）
      const cteNames = new Set<string>();
      if (simpleQuery.withClause?.tables) {
        for (const cte of simpleQuery.withClause.tables) {
          const cteName = cte.aliasExpression?.table?.name;
          if (cteName) {
            cteNames.add(cteName);
          }
        }
      }
      
      // CTEではないテーブルのみを返す
      const externalTables = tables.filter(table => !cteNames.has(table));
      
      // 重複を除去してソート
      return [...new Set(externalTables)].sort();
      
    } catch (error) {
      throw new Error(`SQL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * SourceExpressionからテーブル名を再帰的に抽出
   */
  private extractTablesFromSource(source: any, tables: string[]): void {
    if (!source) return;
    
    // TableSourceの場合
    if (source.datasource && source.datasource.table) {
      const tableName = source.datasource.table.name;
      if (tableName) {
        tables.push(tableName);
      }
    }
    
    // SubQuerySourceの場合は再帰的に解析
    if (source.datasource && source.datasource.query) {
      // サブクエリの解析は複雑になるため、現時点では簡易実装
      // 必要に応じて拡張
    }
  }
}
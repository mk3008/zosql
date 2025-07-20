/**
 * CTE合成ロジック - rawsql-tsベース
 * 
 * 安全なCTE合成のためにrawsql-tsパーサーを使用
 * string manipulationではなくAST操作で実装
 */

import { SelectQueryParser, WithClauseParser, SqlFormatter } from 'rawsql-ts';

export class CteComposer {
  private formatter: SqlFormatter;

  constructor() {
    this.formatter = new SqlFormatter({
      withClauseStyle: 'full-oneline'
    });
  }

  /**
   * メインクエリとCTE定義を合成する（rawsql-ts使用）
   */
  compose(mainQuery: string, cteDefinitions: string): string {
    // CTEが空の場合はそのまま返す
    if (!cteDefinitions || cteDefinitions.trim() === '') {
      return mainQuery;
    }

    // メインクエリをパース
    const mainQueryParsed = SelectQueryParser.parse(mainQuery).toSimpleQuery();
    
    // CTE定義を準備してパース
    const preparedCteDefinitions = this.prepareForWithClauseParser(cteDefinitions);
    const ctesParsed = WithClauseParser.parse(preparedCteDefinitions);
    
    // メインクエリに既にWITH句がある場合
    if (mainQueryParsed.withClause) {
      // 既存のCTEに新しいCTEを追加
      const existingCtes = mainQueryParsed.withClause.tables || [];
      const newCtes = ctesParsed.tables || [];
      mainQueryParsed.withClause.tables = [...newCtes, ...existingCtes];
    } else {
      // 新しいWITH句を設定
      mainQueryParsed.withClause = ctesParsed;
    }
    
    // SqlFormatterで整形して返す
    const formatResult = this.formatter.format(mainQueryParsed);
    return typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
  }

  /**
   * WithClauseParser用にCTE定義を準備する
   */
  private prepareForWithClauseParser(cteDefinitions: string): string {
    let prepared = cteDefinitions.trim();
    
    // コメントを無視してWITHキーワードの存在をチェック
    const withoutComments = prepared.replace(/^\s*--.*$/gm, '').trim();
    
    // WITHキーワードがない場合は追加
    if (!withoutComments.toLowerCase().startsWith('with')) {
      prepared = `WITH ${prepared}`;
    }
    
    return prepared;
  }

  /**
   * CTE定義の数をカウントする（rawsql-ts使用）
   */
  countCtes(cteDefinitions: string): number {
    if (!cteDefinitions || cteDefinitions.trim() === '') {
      return 0;
    }

    const preparedCteDefinitions = this.prepareForWithClauseParser(cteDefinitions);
    const ctesParsed = WithClauseParser.parse(preparedCteDefinitions);
    return ctesParsed.tables?.length || 0;
  }

}
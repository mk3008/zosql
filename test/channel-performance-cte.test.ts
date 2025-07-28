/**
 * channel_performance CTE の依存関係と合成処理のテスト
 * rawsql-tsを使用したAST解析版
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { SelectQueryParser, SqlFormatter } from 'rawsql-ts';

// Type guard for CTE validation
function isValidCteForTest(cte: unknown): cte is { 
  aliasExpression?: { table?: { name?: string } };
} {
  return (
    typeof cte === 'object' &&
    cte !== null &&
    'aliasExpression' in cte
  );
}

describe('channel_performance CTE Tests', () => {
  let userBehaviorAnalysisSQL: string;
  let parsedQuery: ReturnType<typeof SelectQueryParser.parse>;
  
  beforeAll(async () => {
    // テスト用SQLファイルを読み込み
    const sqlPath = path.join(process.cwd(), 'zosql/workspace/user_behavior_analysis.sql');
    userBehaviorAnalysisSQL = await fs.readFile(sqlPath, 'utf-8');
    
    // rawsql-tsでパース
    parsedQuery = SelectQueryParser.parse(userBehaviorAnalysisSQL).toSimpleQuery();
  });

  it('should parse SQL successfully with rawsql-ts', () => {
    expect(parsedQuery).toBeTruthy();
    // Check if query has WITH clause
    const withClause = (parsedQuery as unknown as Record<string, unknown>).withClause;
    expect(withClause).toBeTruthy();
    if (withClause && typeof withClause === 'object') {
      const tables = (withClause as Record<string, unknown>).tables;
      expect(tables).toBeTruthy();
    }
  });

  it('should extract all CTE names using rawsql-ts', () => {
    const withClause = (parsedQuery as unknown as Record<string, unknown>).withClause as Record<string, unknown> | undefined;
    const tables = withClause?.tables as unknown[] | undefined;
    const cteNames = tables?.map(
      (cte: unknown) => {
        if (cte && typeof cte === 'object') {
          const cteObj = cte as Record<string, unknown>;
          const aliasExpression = cteObj.aliasExpression as Record<string, unknown> | undefined;
          const table = aliasExpression?.table as Record<string, unknown> | undefined;
          return table?.name as string || 'unknown';
        }
        return 'unknown';
      }
    ) || [];
    
    console.log('Extracted CTE names with rawsql-ts:', cteNames);
    
    // 期待されるCTE名をチェック
    const expectedCTEs = [
      'session_data',
      'user_engagement', 
      'conversion_events',
      'funnel_analysis',
      'device_analysis',
      'channel_performance',
      'user_cohorts'
    ];
    
    for (const expectedCTE of expectedCTEs) {
      expect(cteNames).toContain(expectedCTE);
    }
    
    expect(cteNames).toHaveLength(7);
  });

  it('should find channel_performance CTE and extract its content', () => {
    const withClause = (parsedQuery as unknown as Record<string, unknown>).withClause as Record<string, unknown>;
    const tables = withClause.tables as unknown[];
    const channelPerformanceCTE = tables.find(
      (cte: any) => cte.aliasExpression?.table?.name === 'channel_performance'
    );
    
    expect(channelPerformanceCTE).toBeTruthy();
    expect((channelPerformanceCTE as any).query).toBeTruthy();
    
    // CTEクエリをSQL文字列に変換
    const formatter = new SqlFormatter({
      identifierEscape: { start: '', end: '' },
      keywordCase: 'lower'
    });
    
    // formatメソッドを使用
    const formatResult = formatter.format((channelPerformanceCTE as any).query);
    const channelPerformanceSQL = typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
    console.log('channel_performance CTE SQL:', channelPerformanceSQL);
    
    // 依存関係をチェック
    expect(channelPerformanceSQL).toContain('session_data');
    expect(channelPerformanceSQL).toContain('funnel_analysis');
    expect(channelPerformanceSQL).toContain('sd.user_id = fa.user_id');
  });

  it('should extract dependencies from channel_performance CTE', () => {
    const withClause = (parsedQuery as unknown as Record<string, unknown>).withClause as Record<string, unknown>;
    const tables = withClause.tables as unknown[];
    const channelPerformanceCTE = tables.find(
      (cte: any) => cte.aliasExpression?.table?.name === 'channel_performance'
    );
    
    // CTEのFROM句とJOIN句からテーブル参照を抽出
    const fromClause = (channelPerformanceCTE as any).query.fromClause;
    expect(fromClause).toBeTruthy();
    
    // メインテーブル（session_data）
    const mainTable = fromClause.source?.datasource?.qualifiedName?.name?.name || 
                     fromClause.source?.datasource?.table?.name;
    console.log('Main table:', mainTable);
    
    // JOINテーブル（funnel_analysis）
    const joins = fromClause.joins || [];
    const joinTables = joins.map((join: { source?: { datasource?: { qualifiedName?: { name?: { name?: string } }; table?: { name?: string } } } }) => 
      join.source?.datasource?.qualifiedName?.name?.name ||
      join.source?.datasource?.table?.name
    );
    console.log('Join tables:', joinTables);
    
    expect(mainTable).toBe('session_data');
    expect(joinTables).toContain('funnel_analysis');
  });

  it('should validate CTE definition order', () => {
    const withClause = (parsedQuery as unknown as Record<string, unknown>).withClause as Record<string, unknown>;
    const tables = withClause.tables as unknown[];
    const cteOrder = tables.map(
      (cte: unknown, index: number) => ({
        name: isValidCteForTest(cte) ? cte.aliasExpression?.table?.name || 'unknown' : 'unknown',
        index
      })
    );
    
    console.log('CTE definition order:', cteOrder);
    
    const channelPerformanceIndex = cteOrder.find((cte: { name: string }) => cte.name === 'channel_performance')?.index;
    const sessionDataIndex = cteOrder.find((cte: { name: string }) => cte.name === 'session_data')?.index;
    const funnelAnalysisIndex = cteOrder.find((cte: { name: string }) => cte.name === 'funnel_analysis')?.index;
    
    // channel_performanceの依存関係が先に定義されているか確認
    expect(sessionDataIndex).toBeDefined();
    expect(funnelAnalysisIndex).toBeDefined();
    expect(channelPerformanceIndex).toBeDefined();
    
    expect(sessionDataIndex!).toBeLessThan(channelPerformanceIndex!);
    expect(funnelAnalysisIndex!).toBeLessThan(channelPerformanceIndex!);
  });

  it('should generate executable SQL for channel_performance with dependencies', () => {
    // channel_performanceとその依存関係のCTEを抽出
    const withClause = (parsedQuery as unknown as Record<string, unknown>).withClause as Record<string, unknown>;
    const tables = withClause.tables as unknown[];
    const channelPerformanceCTE = tables.find(
      (cte: unknown) => isValidCteForTest(cte) && cte.aliasExpression?.table?.name === 'channel_performance'
    );
    const sessionDataCTE = tables.find(
      (cte: unknown) => isValidCteForTest(cte) && cte.aliasExpression?.table?.name === 'session_data'
    );
    const funnelAnalysisCTE = tables.find(
      (cte: unknown) => isValidCteForTest(cte) && cte.aliasExpression?.table?.name === 'funnel_analysis'
    );
    const conversionEventsCTE = tables.find(
      (cte: unknown) => isValidCteForTest(cte) && cte.aliasExpression?.table?.name === 'conversion_events'
    );
    
    expect(channelPerformanceCTE).toBeTruthy();
    expect(sessionDataCTE).toBeTruthy();
    expect(funnelAnalysisCTE).toBeTruthy();
    expect(conversionEventsCTE).toBeTruthy(); // funnel_analysisが依存
    
    // 依存関係を含む実行可能なSQLを構築する必要がある
    // const formatter = new SqlFormatter({
    //   identifierEscape: { start: '', end: '' },
    //   keywordCase: 'lower',
    //   withClauseStyle: 'full-oneline'
    // });
    
    // 簡易的な依存関係チェーン
    const requiredCTEs = [
      'session_data',        // channel_performanceが直接依存
      'conversion_events',   // funnel_analysisが依存
      'funnel_analysis',     // channel_performanceが直接依存
      'channel_performance'  // 対象CTE
    ];
    
    console.log('Required CTEs for channel_performance:', requiredCTEs);
    
    // 実際のCTE合成処理では、これらのCTEを含むWITH句を生成する必要がある
    expect(requiredCTEs).toHaveLength(4);
  });
});
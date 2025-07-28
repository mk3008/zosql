/**
 * WorkspaceServiceのCTE処理の単体テスト
 * 実際のuser_behavior_analysis.sqlを使用
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { SelectQueryParser } from 'rawsql-ts';
import { CTEDependencyResolverImpl } from '@core/usecases/cte-dependency-resolver';
import { CTE } from '@shared/types';

describe('WorkspaceService CTE Processing', () => {
  let userBehaviorAnalysisSQL: string;
  let parsedQuery: ReturnType<typeof SelectQueryParser.parse>;
  const privateCtes: Record<string, CTE> = {};
  
  beforeAll(async () => {
    // 実際のSQLファイルを読み込み
    const sqlPath = path.join(process.cwd(), 'zosql/workspace/user_behavior_analysis.sql');
    userBehaviorAnalysisSQL = await fs.readFile(sqlPath, 'utf-8');
    
    // rawsql-tsでパース
    parsedQuery = SelectQueryParser.parse(userBehaviorAnalysisSQL).toSimpleQuery();
    
    // WorkspaceServiceが行う処理をシミュレート
    // CTEを抽出して依存関係を解析
    const withClause = (parsedQuery as unknown as Record<string, unknown>).withClause as Record<string, unknown> | undefined;
    const tables = withClause?.tables as unknown[] | undefined;
    if (tables) {
      for (const cte of tables) {
        const cteObj = cte as Record<string, unknown>;
        const aliasExpression = cteObj.aliasExpression as Record<string, unknown> | undefined;
        const table = aliasExpression?.table as Record<string, unknown> | undefined;
        const cteName = table?.name as string || 'unknown';
        
        // CTEの内部クエリを抽出（WorkspaceServiceのextractCTEQueryをシミュレート）
        const cteQuery = extractCTEQueryContent(cte);
        
        // 依存関係を抽出（WorkspaceServiceのextractCTEDependenciesをシミュレート）
        const dependencies = extractCTEDependencies(cteQuery);
        
        privateCtes[cteName] = {
          name: cteName,
          query: cteQuery,
          dependencies: dependencies,
          columns: [] // 簡易テストのため空配列
        };
      }
    }
  });

  // CTEクエリの内容を抽出する関数（WorkspaceServiceの処理をシミュレート）
  function extractCTEQueryContent(cte: { aliasExpression?: { table?: { name?: string } } }): string {
    const cteName = cte.aliasExpression?.table?.name || 'unknown';
    
    // 実際のCTEクエリごとの内容を手動で設定（本来はSqlFormatterが生成）
    const cteQueries: Record<string, string> = {
      session_data: 'select user_id, session_id, start_time, end_time, extract(epoch from (end_time - start_time)) / 60 as session_duration_minutes, page_views, actions_taken, device_type, browser, source_channel from user_sessions where start_time >= current_date - INTERVAL \'7 days\' and end_time is not null',
      
      user_engagement: 'select user_id, count(distinct session_id) as total_sessions, count(distinct DATE(start_time)) as active_days, sum(session_duration_minutes) as total_time_spent from session_data group by user_id',
      
      conversion_events: 'select user_id, event_type, event_time, session_id, event_value from events where event_time >= current_date - INTERVAL \'7 days\'',
      
      funnel_analysis: 'select ce.user_id, max(case when ce.event_type = \'signup\' then 1 else 0 end) as has_signup from conversion_events as ce group by ce.user_id',
      
      device_analysis: 'select device_type, browser, count(distinct user_id) as unique_users from session_data group by device_type, browser',
      
      channel_performance: 'select source_channel, count(distinct user_id) as unique_visitors, sum(fa.total_purchase_value) as revenue_generated from session_data as sd left join funnel_analysis as fa on sd.user_id = fa.user_id group by source_channel',
      
      user_cohorts: 'select ue.user_id, u.registration_date from user_engagement as ue join users as u on ue.user_id = u.user_id left join funnel_analysis as fa on ue.user_id = fa.user_id'
    };
    
    return cteQueries[cteName] || '';
  }

  // CTE依存関係を抽出する関数（WorkspaceServiceの処理をシミュレート）
  function extractCTEDependencies(cteQuery: string): string[] {
    const dependencies: string[] = [];
    
    // FROM句とJOIN句からテーブル名を抽出
    const fromMatches = cteQuery.match(/\b(?:from|join)\s+([a-zA-Z][a-zA-Z0-9_]*)/gi);
    if (fromMatches) {
      fromMatches.forEach(match => {
        const tableName = match.replace(/^(?:from|join)\s+/i, '').trim();
        if (!dependencies.includes(tableName)) {
          dependencies.push(tableName);
        }
      });
    }
    
    return dependencies;
  }

  it('should extract all CTEs from user_behavior_analysis.sql', () => {
    const cteNames = Object.keys(privateCtes);
    expect(cteNames).toContain('session_data');
    expect(cteNames).toContain('channel_performance');
    expect(cteNames).toContain('funnel_analysis');
    expect(cteNames).toHaveLength(7);
  });

  it('should extract correct dependencies for channel_performance', () => {
    const channelPerformance = privateCtes['channel_performance'];
    expect(channelPerformance).toBeDefined();
    console.log('All CTEs and their dependencies:');
    for (const [name, cte] of Object.entries(privateCtes)) {
      console.log(`${name}: dependencies = [${cte.dependencies.join(', ')}]`);
    }
    
    expect(channelPerformance.dependencies).toContain('session_data');
    expect(channelPerformance.dependencies).toContain('funnel_analysis');
  });

  it('should generate executable SQL for channel_performance with dependencies', () => {
    // WorkspaceServiceのgenerateExecutableCTEQueryが内部で呼ぶresolveCTEDependencies
    const resolver = new CTEDependencyResolverImpl();
    const result = resolver.resolveDependencies('channel_performance', privateCtes);
    
    console.log('Generated SQL for channel_performance:');
    console.log(result);
    
    // WITH句が含まれることを確認
    expect(result).toContain('with');
    
    // 必要なCTEが含まれることを確認
    expect(result).toContain('session_data as (');
    expect(result).toContain('funnel_analysis as (');
    expect(result).toContain('channel_performance as (');
    
    // 最後にSELECT文があることを確認
    expect(result).toContain('select * from channel_performance');
    
    // WITH句が正しく構成されているか確認
    const withMatch = result.match(/^with\s+/i);
    expect(withMatch).toBeTruthy();
  });

  it('should include all transitive dependencies for channel_performance', () => {
    // channel_performanceの完全な依存関係チェーン
    const resolver = new CTEDependencyResolverImpl();
    const result = resolver.resolveDependencies('channel_performance', privateCtes);
    
    // funnel_analysisがconversion_eventsに依存している場合、それも含まれるべき
    if (privateCtes['funnel_analysis']?.dependencies.includes('conversion_events')) {
      expect(result).toContain('conversion_events as (');
    }
  });

  it('should generate correct SQL that matches the expected format', () => {
    const resolver = new CTEDependencyResolverImpl();
    const result = resolver.resolveDependencies('channel_performance', privateCtes);
    
    // 期待される形式：
    // with session_data as (
    //     ...
    // ),
    // funnel_analysis as (
    //     ...  
    // ),
    // channel_performance as (
    //     ...
    // )
    // select * from channel_performance
    
    const lines = result.split('\n');
    expect(lines[0]).toMatch(/^with\s+\w+\s+as\s+\(/i);
    expect(lines[lines.length - 1]).toMatch(/^select\s+\*\s+from\s+channel_performance$/i);
  });
});
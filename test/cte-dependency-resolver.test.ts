/**
 * CTE依存関係解決ロジックのテスト（TDD）
 */

import { describe, it, expect } from 'vitest';

/**
 * CTE依存関係を解決して実行可能なSQLを生成する純粋関数
 */
export function resolveCTEDependencies(
  targetCTEName: string,
  allCTEs: Record<string, { query: string; dependencies: string[] }>
): string {
  const targetCTE = allCTEs[targetCTEName];
  if (!targetCTE) {
    throw new Error(`CTE not found: ${targetCTEName}`);
  }

  // 依存関係を収集
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const orderedCTEs: string[] = [];

  function visit(cteName: string) {
    if (visited.has(cteName)) return;
    
    if (visiting.has(cteName)) {
      throw new Error('Circular dependency detected');
    }

    visiting.add(cteName);
    
    const cte = allCTEs[cteName];
    if (cte && cte.dependencies) {
      for (const dep of cte.dependencies) {
        if (allCTEs[dep]) {
          visit(dep);
        }
      }
    }
    
    visiting.delete(cteName);
    visited.add(cteName);
    orderedCTEs.push(cteName);
  }

  // ターゲットCTEの依存関係を解決
  visit(targetCTEName);

  // 依存関係がない場合は単純にクエリを返す
  if (orderedCTEs.length === 1 && orderedCTEs[0] === targetCTEName) {
    return targetCTE.query;
  }

  // WITH句を構築
  const cteDefinitions = orderedCTEs.map(cteName => {
    const cte = allCTEs[cteName];
    return `${cteName} as (\n    ${cte.query}\n)`;
  });

  return `with ${cteDefinitions.join(',\n')}\nselect * from ${targetCTEName}`;
}

describe('CTE Dependency Resolver', () => {
  const testCTEs = {
    session_data: {
      query: 'select user_id, session_id from user_sessions',
      dependencies: []
    },
    conversion_events: {
      query: 'select user_id, event_type from events',
      dependencies: []
    },
    funnel_analysis: {
      query: 'select user_id from conversion_events',
      dependencies: ['conversion_events']
    },
    channel_performance: {
      query: 'select * from session_data sd join funnel_analysis fa on sd.user_id = fa.user_id',
      dependencies: ['session_data', 'funnel_analysis']
    }
  };

  it('should return simple CTE query when no dependencies', () => {
    const result = resolveCTEDependencies('session_data', testCTEs);
    expect(result).toBe('select user_id, session_id from user_sessions');
  });

  it('should generate WITH clause for CTE with direct dependencies', () => {
    const result = resolveCTEDependencies('funnel_analysis', testCTEs);
    const expected = `with conversion_events as (
    select user_id, event_type from events
),
funnel_analysis as (
    select user_id from conversion_events
)
select * from funnel_analysis`;
    expect(result).toBe(expected);
  });

  it('should generate WITH clause for CTE with nested dependencies', () => {
    const result = resolveCTEDependencies('channel_performance', testCTEs);
    const expected = `with session_data as (
    select user_id, session_id from user_sessions
),
conversion_events as (
    select user_id, event_type from events
),
funnel_analysis as (
    select user_id from conversion_events
),
channel_performance as (
    select * from session_data sd join funnel_analysis fa on sd.user_id = fa.user_id
)
select * from channel_performance`;
    expect(result).toBe(expected);
  });

  it('should handle circular dependencies gracefully', () => {
    const circularCTEs = {
      a: { query: 'select * from b', dependencies: ['b'] },
      b: { query: 'select * from c', dependencies: ['c'] },
      c: { query: 'select * from a', dependencies: ['a'] }
    };
    
    expect(() => resolveCTEDependencies('a', circularCTEs)).toThrow('Circular dependency detected');
  });

  it('should ignore missing dependencies', () => {
    const incompleteCTEs = {
      cte1: {
        query: 'select * from missing_table',
        dependencies: ['missing_cte']
      }
    };
    
    const result = resolveCTEDependencies('cte1', incompleteCTEs);
    expect(result).toBe('select * from missing_table');
  });
});
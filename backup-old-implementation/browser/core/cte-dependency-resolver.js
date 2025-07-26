/**
 * CTE依存関係解決ロジック
 * UI層から分離されたビジネスロジック
 */

/**
 * CTE依存関係を解決して実行可能なSQLを生成する純粋関数
 * @param {string} targetCTEName - 対象のCTE名
 * @param {Record<string, {query: string, dependencies: string[]}>} allCTEs - 全てのCTE定義
 * @returns {string} 実行可能なSQL
 */
export function resolveCTEDependencies(targetCTEName, allCTEs) {
  const targetCTE = allCTEs[targetCTEName];
  if (!targetCTE) {
    throw new Error(`CTE not found: ${targetCTEName}`);
  }

  // 依存関係を収集
  const visited = new Set();
  const visiting = new Set();
  const orderedCTEs = [];

  function visit(cteName) {
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
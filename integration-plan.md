# rawsql-ts PR #175 統合計画

## 概要
rawsql-ts PR #175 の CTEComposer/CTEQueryDecomposer を zosql に統合し、現在の手動実装を置き換える。

## 期待される改善
1. **コード品質向上**: 手動CTE分解 → ライブラリ公式機能
2. **依存関係解析の正確性**: 現在のCTEDependencyAnalyzer → 新しいdecomposer内蔵機能
3. **エラー処理**: rawsql-tsが内部でvalidation実行
4. **AI対応**: 各CTEが独立実行可能なSQL形式で出力

## 必要な作業

### Phase 1: rawsql-ts更新
- [ ] PR #175のブランチからカスタムパッケージ作成
- [ ] package.jsonの依存関係更新
- [ ] 新しいAPIのimport追加

### Phase 2: WorkspaceApi刷新
```typescript
// Before (現在の実装)
const collector = new CTECollector();
const dependencyAnalyzer = new CTEDependencyAnalyzer();
const disabler = new CTEDisabler();

// After (PR #175対応)
const decomposer = new CTEQueryDecomposer({
  preset: 'postgres',
  generateComments: true,
  schema: tableSchemas
});

const results = decomposer.decompose(sql);
// results.decomposedCTEs: 各CTEが実行可能SQL形式
// results.rootQuery: CTE除去済みクエリ  
// results.dependencies: 依存関係マップ
```

### Phase 3: Compose機能強化
```typescript
const composer = new CTEComposer({
  preset: 'postgres',
  validateSchema: true,
  schema: tableSchemas
});

const editedCTEs = await this.loadPrivateCtes();
const composedSQL = composer.compose(editedCTEs, rootQuery);
```

## 利点
1. **ライブラリ標準機能**: 手動実装のバグリスクを削減
2. **依存関係精度**: より正確な依存関係解析
3. **実行可能SQL**: 各Private CTEが独立実行可能
4. **AI支援向上**: 標準SQL形式でAI理解度向上
5. **将来性**: rawsql-ts公式サポートによる継続的改善

## 実装優先度
**High Priority**: decompose機能のライブラリ化（現在手動実装中）
**Medium Priority**: compose機能の強化
**Low Priority**: 高度な依存関係可視化機能

## リスク評価
- **リスク**: PR #175未リリース → カスタムパッケージ必要
- **対策**: パッケージ作成手順の文書化
- **フォールバック**: 現在の実装を残してオプション切り替え対応
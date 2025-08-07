# TypeScript修正計画

## Phase 3完了時点での状態

### ✅ 完了済み
- MainContentFunctional.tsx - 完全に型安全
- useMainContentState.ts - 完全に型安全  
- useMainContentExecution.ts - 完全に型安全
- DataTabResults.tsx - 完全に型安全
- QueryResults.tsx - 完全に型安全
- shared/types/index.ts - CoreのQueryExecutionResultを使用するよう統一

### 🔧 修正が必要なファイル（優先度順）

#### 高優先度（現在使用中）
1. **src/core/commands/execute-query-command.ts**
   - 未使用変数の警告（executionTime）
   - すでにcreateSuccessResult/createErrorResultを使用するよう部分修正済み

2. **src/core/services/sql-execution-service.ts**  
   - 未使用変数の警告（calculateExecutionTime, context）
   - 1箇所のみ古い形式が残存（158行目）→ 修正済み

#### 中優先度（将来的に使用可能性あり）
3. **src/ui/viewmodels/main-content-viewmodel.ts**
   - Phase 4で完全削除予定
   - 現在はMainContentFunctionalが使用されているため影響なし

#### 低優先度（使用されていない）
4. **src/ui/hooks/useSqlEditor.ts**
   - 古いhook、使用されていない
   - Phase 4で削除候補

5. **src/ui/hooks/useSqlEditorComplete.ts**
   - 古いhook、使用されていない  
   - Phase 4で削除候補

6. **test/ui/hooks/useSqlEditor.test.ts**
   - 上記hookのテスト
   - hookと一緒に削除予定

## 修正方針

### Phase 3.5（次回作業）
1. execute-query-command.tsの警告を解消
2. sql-execution-service.tsの警告を解消

### Phase 4（将来作業）
1. ViewModelの完全削除
2. 未使用hooksの削除
3. 関連テストの削除または書き換え

## 現在の影響
- MainContentFunctionalは完全に動作している
- 型エラーは古いコードに限定されており、新しい実装には影響なし
- ユーザー体験に影響なし
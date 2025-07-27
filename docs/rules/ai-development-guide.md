# AI開発ガイド - 品質チェックコマンド一覧

このドキュメントは、AI（Claude Code等）がzosqlプロジェクトで開発作業を行う際の標準的な品質チェックコマンドを定義します。

## 基本原則

### 開発フロー
1. **コード変更**
2. **品質チェック実行**（必須）
3. **エラー修正**
4. **再チェック**
5. **コミット**

### 品質基準
- **TypeScriptエラー: 0件**
- **Lintエラー: 0件**
- **テスト失敗: 0件**
- **ビルドエラー: 0件**

## 必須品質チェックコマンド

### 1. TypeScript型チェック
```bash
# 型エラーの確認（最重要）
tsc --noEmit

# 型エラーがある場合の例
# src/core/entities/user.ts(15,3): error TS2322: Type 'string' is not assignable to type 'number'
```

**実行タイミング**: コード変更後、必ず最初に実行

### 2. ESLint実行
```bash
# Lintエラーの確認
npm run lint

# 自動修正可能な問題を修正
npm run lint:fix
```

**実行タイミング**: TypeScript型チェック後

### 3. テスト実行
```bash
# 全テスト実行（CI環境と同じ）
npm run test:run

# 特定のテストファイル実行
npm run test sql-editor

# カバレッジ付きテスト実行
npm run test:coverage
```

**実行タイミング**: Lint修正後

### 4. ビルド確認
```bash
# 本番ビルド
npm run build

# GitHub Pages用ビルド
npm run build:github

# ビルド成果物の確認
npm run preview
```

**実行タイミング**: テスト合格後

## 開発中の部分チェック

### ファイル単位の型チェック
```bash
# 特定ファイルの型チェック
tsc --noEmit src/core/entities/workspace.ts

# 特定ディレクトリの型チェック
tsc --noEmit src/core/**/*.ts
```

### ウォッチモード
```bash
# 開発中のテスト監視
npm run test

# TypeScript監視（VS Code等のIDE機能推奨）
tsc --noEmit --watch
```

## エラー対応フロー

### TypeScriptエラーの修正
```bash
# 1. エラー確認
tsc --noEmit

# 2. エラー内容を分析
# - 型定義の不足
# - 型の不一致
# - importの誤り

# 3. 修正後再チェック
tsc --noEmit
```

### Lintエラーの修正
```bash
# 1. エラー確認
npm run lint

# 2. 自動修正試行
npm run lint:fix

# 3. 手動修正が必要な場合
# - 未使用の変数削除
# - 命名規則の修正
# - コードスタイルの統一

# 4. 修正後再チェック
npm run lint
```

### テスト失敗の修正
```bash
# 1. 失敗したテストの確認
npm run test:run

# 2. 特定のテストファイルを詳細実行
npm run test failing-test-name --verbose

# 3. 修正後の再テスト
npm run test:run
```

## AIによる自動品質チェック

### チェックスクリプトの例
```typescript
// scripts/quality-check.ts
export async function runQualityChecks(): Promise<QualityCheckResult> {
  const results: QualityCheckResult = {
    typescript: false,
    lint: false,
    tests: false,
    build: false
  };
  
  // TypeScript型チェック
  try {
    await execCommand('tsc --noEmit');
    results.typescript = true;
  } catch (error) {
    console.error('TypeScript errors found:', error);
  }
  
  // ESLint実行
  try {
    await execCommand('npm run lint');
    results.lint = true;
  } catch (error) {
    console.error('Lint errors found:', error);
  }
  
  // テスト実行
  try {
    await execCommand('npm run test:run');
    results.tests = true;
  } catch (error) {
    console.error('Test failures found:', error);
  }
  
  // ビルド確認
  try {
    await execCommand('npm run build');
    results.build = true;
  } catch (error) {
    console.error('Build errors found:', error);
  }
  
  return results;
}
```

### 段階的チェック戦略
```bash
# ステップ1: 基本チェック（高速）
tsc --noEmit && npm run lint

# ステップ2: 完全チェック（詳細）
npm run test:run && npm run build

# ステップ3: 統合チェック（最終確認）
npm run build:github && npm run preview
```

## パフォーマンス最適化

### 並列実行
```bash
# 型チェックとLintを並列実行
tsc --noEmit & npm run lint & wait

# テストとビルドを並列実行（リソースに余裕がある場合）
npm run test:run & npm run build & wait
```

### キャッシュ活用
```bash
# TypeScriptの増分コンパイル
tsc --noEmit --incremental

# Jestのキャッシュクリア（必要時のみ）
npm run test:run -- --clearCache
```

## CI/CD環境との整合性

### GitHub Actions同等のチェック
```bash
# .github/workflows/test.ymlと同じ内容
npm ci
npm run lint
npm run test:run
npm run build
```

### 本番環境デプロイ前チェック
```bash
# GitHub Pages用の最終確認
npm run build:github
cd docs && python -m http.server 8000
# ブラウザで http://localhost:8000 を確認
```

## トラブルシューティング

### よくあるエラーパターン

#### 1. 型エラー
```typescript
// エラー例
Property 'name' does not exist on type 'User'

// 修正方法
interface User {
  id: string;
  name: string; // 型定義に追加
}
```

#### 2. Lintエラー
```typescript
// エラー例
'React' is defined but never used

// 修正方法
import type { FC } from 'react'; // type importに変更
```

#### 3. テスト失敗
```typescript
// エラー例
Expected: "SELECT * FROM users"
Received: "select * from users"

// 修正方法
expect(result.toUpperCase()).toBe("SELECT * FROM USERS");
```

#### 4. ビルドエラー
```bash
# エラー例
Module not found: Can't resolve '@core/entities/user'

# 修正方法
# tsconfig.jsonのpathsを確認
# vite.config.tsのaliasを確認
```

### デバッグコマンド
```bash
# 詳細なエラー情報
tsc --noEmit --listFiles --traceResolution

# Lintの詳細情報
npm run lint -- --debug

# テストの詳細情報
npm run test:run -- --verbose --no-coverage

# ビルドの詳細情報
npm run build -- --mode development
```

## 品質チェックのベストプラクティス

### 1. 小さな変更での頻繁チェック
```bash
# ファイル保存後すぐに実行
tsc --noEmit src/path/to/changed-file.ts
```

### 2. エラーの優先順位
1. **TypeScriptエラー** - 最優先で修正
2. **テスト失敗** - ビジネスロジックの問題
3. **Lintエラー** - コードスタイルの問題
4. **ビルドエラー** - 環境設定の問題

### 3. 修正後の完全チェック
```bash
# 修正完了後は必ず全チェック実行
tsc --noEmit && npm run lint && npm run test:run && npm run build
```

## AIアシスタント向けガイド

### 開発作業時の必須チェックリスト
- [ ] `tsc --noEmit` でTypeScriptエラー0件
- [ ] `npm run lint` でLintエラー0件  
- [ ] `npm run test:run` でテスト全合格
- [ ] `npm run build` でビルド成功

### 修正作業の進め方
1. **エラー内容を正確に把握**
2. **最小限の変更で修正**
3. **修正後に関連テストを実行**
4. **全体品質チェックで最終確認**

### 報告形式
```markdown
## 品質チェック結果

### TypeScript
✅ エラー0件

### ESLint  
✅ エラー0件

### テスト
✅ 全127件合格

### ビルド
✅ 成功

## 修正内容
- [変更点の概要]
```

## 更新履歴
- 2025-01-27: 初版作成
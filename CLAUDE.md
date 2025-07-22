# CLAUDE.md - zosql CTE Debug App 開発メモ
参照: `/root/github/worktree/repositories/zosql/first_commit/CLAUDE.md`

## 🎯 プロジェクト目標
**GitHub PagesでCTEのデバッグが行えるアプリを作成する**

### 🏗️ アーキテクチャ設計原則
**アーキテクチャ名**: **Modular Layered SPA with Hexagonal Core**

#### 基本設計思想
- **Hexagonal Architecture (Ports & Adapters)**: コアビジネスロジックを外部依存から完全分離
- **Modular Monolith**: 機能別モジュール分割で保守性確保
- **TypeScript-First**: 完全型安全性による実行時エラー防止  
- **Test-Driven Development**: コアロジックの品質保証
- **Component-Based UI**: React/TypeScriptによる宣言的UI構築

### 技術要件
- **GitHub Pages**: 静的サイトホスティング（バックエンドサーバー不要）
- **WASM Postgres**: ブラウザ内でSQL実行環境を提供
- **rawsql-ts**: SQL解析・CTE依存解析・CTE合成・パース・整形を担当
- **React + TypeScript**: モダンUIライブラリによる宣言的コンポーネント
- **LocalStorage**: クライアントサイドでのデータ永続化

### 開発方針
- **完全TypeScript化**: 全コードの型安全性確保
- **ファイルサイズ制限**: 1ファイル500行推奨、1000行上限（コメント除く）
- **TDD実践**: t-wada形式でのテスト駆動開発
- **レイヤー分離**: UI・ビジネスロジック・インフラの明確な分離
- **単体テスト重視**: ビジネスロジックを徹底的にテスト

## 🚨 アーキテクチャ刷新計画 (2025年7月)

### **現状の深刻な問題**
1. **型安全性危機**: コアビジネスロジック (2,229行) がJavaScriptで未テスト状態
2. **責務混在**: WorkspaceService (287行) でUI・永続化・ビジネスロジックが癒合
3. **保守性低下**: ファイルサイズ制限違反により可読性・テスト性が劣化

### **段階的マイグレーション計画**

#### **Phase 1: 緊急対応 (1-2週間)**
1. **コアロジックTypeScript化**
   - `src/browser/core/cte-dependency-resolver.js` → `src/core/cte-resolver.ts`
   - `src/browser/api/workspace-service.js` → 責務分離リファクタリング
   - 完全な型安全性確保

2. **新ディレクトリ構造 (Hexagonal Architecture)**
```
src/
├── core/                    # Domain Layer (ビジネスロジック)
│   ├── entities/           # エンティティ (<200行/ファイル)
│   ├── usecases/           # ユースケース (<300行/ファイル)
│   └── ports/              # インターフェース定義 (<100行/ファイル)
├── adapters/               # Infrastructure Layer
│   ├── storage/            # LocalStorage実装 (<200行/ファイル)
│   ├── api/                # API実装 (<300行/ファイル)
│   └── parsers/            # rawsql-ts統合 (<400行/ファイル)
├── ui/                     # Presentation Layer (React)
│   ├── components/         # UIコンポーネント (<200行/ファイル)
│   ├── hooks/              # カスタムフック (<150行/ファイル)
│   └── pages/              # ページコンポーネント (<300行/ファイル)
└── shared/                 # 共有型・ユーティリティ
    ├── types/              # 型定義 (<100行/ファイル)
    └── utils/              # ヘルパー関数 (<200行/ファイル)
```

#### **Phase 2: React + TypeScript移行 (2-4週間)**
1. **React導入**
   - Shadow DOM → React コンポーネント移行
   - 状態管理: Zustand (軽量) または Redux Toolkit
   - Monaco Editor: `@monaco-editor/react`で統合

2. **GitHub Pages最適化**
```javascript
// vite.config.ts (webpackから移行)
export default defineConfig({
  base: '/zosql/',
  build: {
    outDir: 'docs',
    rollupOptions: {
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js'
      }
    }
  }
});
```

#### **Phase 3: 品質向上・最適化 (1-2ヶ月)**
1. **完全TypeScript化**: 残存JavaScript除去
2. **包括的テストスイート**: 全レイヤーの単体・統合テスト
3. **パフォーマンス最適化**: コード分割・遅延読み込み

### **新アーキテクチャの効果**
- ✅ **型安全性**: 100% TypeScript でコンパイル時エラー検出
- ✅ **保守性**: ファイルサイズ制限遵守で可読性向上
- ✅ **テスタビリティ**: レイヤー分離で単体テスト容易化
- ✅ **拡張性**: Hexagonal架構で外部依存変更に柔軟対応

## rawsql-ts の使用方法

### SelectQueryParser
- SQLクエリの解析には `SelectQueryParser` クラスを**静的メソッド**で使用
- `SelectQueryParser.parse(sql: string)` でSQLを解析（インスタンス化不要）
- 返されるオブジェクトは解析されたクエリオブジェクト

### 主なクエリタイプ
- `SimpleSelectQuery` - 単一のSELECT文（WITH句を含む場合はこの形式）
- `BinarySelectQuery` - UNION/INTERSECT/EXCEPTで結合されたクエリ
- `ValuesQuery` - VALUES句のクエリ

**重要**: WITH句を扱う場合は必ず`toSimpleQuery()`で変換する必要がある
```typescript
const query = SelectQueryParser.parse(sql).toSimpleQuery();
```

### 基本的な使用例
```typescript
import { SelectQueryParser } from 'rawsql-ts';

// 静的メソッドで解析
const query = SelectQueryParser.parse('SELECT id, name FROM users');

// クエリタイプの確認
console.log(query.constructor.name); // "SimpleSelectQuery" など
```

### SimpleSelectQueryの主な機能
- CTE（Common Table Expression）の追加・操作
- WHERE条件の動的追加
- JOINの追加
- UNION/INTERSECT/EXCEPTでの結合

### CTEの操作（zosqlで重要）
```typescript
// CTEを含むクエリの解析
const withQuery = SelectQueryParser.parse(`
  WITH user_stats AS (
    SELECT user_id, COUNT(*) as count FROM orders GROUP BY user_id
  )
  SELECT * FROM user_stats
`);

// プログラムでCTEを追加することも可能
const query = SelectQueryParser.parse('SELECT * FROM users');
// query.addCTE() などのメソッドがあるかは要確認
```

## 📊 現状実装分析 (2025年7月)

### **コードベース統計**
- **TypeScript**: 10,421行 (完全型安全)
- **JavaScript**: 2,229行 ⚠️ **リスク: 型チェック対象外**
- **テストコード**: 3,520行 (良好なカバレッジ)

### **問題のあるファイル**
| ファイル | 行数 | 言語 | 問題 |
|---------|------|------|------|
| `src/browser/api/workspace-service.js` | 287行 | JS | 責務過多・未テスト |
| `src/browser/core/cte-dependency-resolver.js` | 73行 | JS | コアロジック・未テスト |
| 旧UIコンポーネント群 | ~1,800行 | JS | Shadow DOM複雑性 |

### **優秀なアーキテクチャ例**
- ✅ **TDD実装**: 20+テストファイルで包括的検証
- ✅ **型定義**: StorageInterface等の抽象化設計
- ✅ **IntelliSense**: 60+ケースの回帰防止システム

## 🔧 アーキテクチャ原則・制約事項

### **ファイルサイズガバナンス**
- **500行推奨**: 可読性・保守性の最適化
- **1000行上限**: コメント除く実行コード
- **違反時対応**: 責務分離による分割必須

### **技術選択制約**
- **rawsql-ts準拠**: SQL解析・整形は必ずrawsql-ts使用
- **TypeScript-First**: 新規コードはTypeScript必須
- **TDD実践**: コアロジックは必ずテスト先行
- **レイヤー分離**: UI・Domain・Infrastructure混在禁止

### **品質保証方針**
```typescript
// 必須の品質ゲート
interface QualityGates {
  typeCheck: "tsc --noEmit"; // 型エラー0件
  unittest: "vitest run";    // テスト成功率100%
  linting: "eslint --max-warnings 0"; // 警告0件
  fileSize: "< 1000 lines";  // ファイルサイズ制限
}
```

## 🔧 デバッグ機能強化 (Phase 2完了)

### **ファイル出力システム**
- **すべてのコンソール出力をファイル出力に変更**
- **分類別ログファイル**:
  - `.tmp/debug.log` - 一般的なログ
  - `.tmp/error.log` - エラーログ
  - `.tmp/intellisense.log` - IntelliSense専用ログ  
  - `.tmp/query.log` - クエリ実行ログ

### **Logger機能拡張**
```typescript
// 新機能
Logger.replaceConsole(); // console.logを自動的にファイル出力に変更
logger.intelliSense(message); // IntelliSense専用ログ
logger.query(message); // クエリ実行専用ログ
logger.error(message); // エラー専用ログ
logger.getLogFilePaths(); // ログファイルパス取得
```

### **フォールバック機能**
- メインログファイル書き込み失敗時、エラーログに記録
- エラーログ失敗時、タイムスタンプ付きファイルを作成
- 完全な障害耐性を実現

## 🏗️ UI責務分離実装 (Phase 2完了)

### **問題**: web-ui-template.ts が1728行で保守困難

### **解決策**: 責務による分離実装
- `src/web-ui/html-template.ts` - HTML構造・CSS
- `src/web-ui/client-javascript.ts` - メインJavaScript統合
- `src/web-ui/intellisense-client.ts` - IntelliSense機能
- `src/web-ui/helper-functions.ts` - ヘルパー・デバッグ関数
- `src/web-ui/utility-functions.ts` - ユーティリティ関数
- `src/web-ui/template-system.ts` - 統合システム

### **改善効果**
- **保守性向上**: 各ファイルが明確な責務を持つ
- **再利用性向上**: 機能別にモジュール化
- **テスト容易性**: 個別機能のテストが可能
- **コード可読性**: 1728行→200-400行/ファイルに分割

### **テストファイル整理**
- `test/` フォルダに移動: `intellisense-utils.test.ts`, `intellisense-integration.test.ts`
- `vitest.config.ts` 作成でテスト設定を明確化

## 🧪 IntelliSense回帰防止システム (Phase 2完了)

### **問題認識**: IntelliSenseはデグレしやすい複雑機能

### **解決策**: 包括的テストスイートとCI/CD統合
- **`test/intellisense-regression.test.ts`**: 60+の実用的テストケース
- **`scripts/test-intellisense.js`**: 自動回帰検知スクリプト
- **`npm run test:intellisense`**: ワンコマンドでの完全テスト

## 🔧 ロギング設定システム (Phase 2完了)

### **完全制御可能なロギング機能**
- **環境変数制御**: `ZOSQL_LOG_*`でON/OFF切り替え
- **設定ファイル対応**: `zosql.config.json`による設定
- **コマンドラインオプション**: `--no-log`等でリアルタイム制御

### **設定項目**
```bash
# 環境変数
ZOSQL_LOG_ENABLED=false           # 全ログ無効
ZOSQL_LOG_CONSOLE=false          # コンソール出力のみ無効
ZOSQL_LOG_INTELLISENSE=false     # IntelliSenseログのみ無効
ZOSQL_LOG_QUERY=false            # クエリログのみ無効
ZOSQL_LOG_LEVEL=error            # ログレベル設定

# CLIオプション
zosql web --no-log                    # 全ログ無効
zosql web --no-console-log           # コンソール出力のみ無効
zosql web --no-intellisense-log      # IntelliSenseログのみ無効
zosql web --log-level=error          # エラーレベルのみ

# 設定確認
zosql config                         # 現在の設定を表示
```

### **設定ファイル例** (`zosql.config.json`)
```json
{
  "logging": {
    "enabled": true,
    "console": false,
    "intellisense": true,
    "query": false,
    "debug": true,
    "logLevel": "warn"
  }
}
```

### **優先順位**
1. **環境変数** (最優先)
2. **設定ファイル** 
3. **デフォルト値** (最低優先)

### **実装された機能**
- ✅ **動的設定更新**: 実行時に設定変更可能
- ✅ **ログレベル制御**: debug/info/warn/error選択
- ✅ **カテゴリ別制御**: コンソール/IntelliSense/クエリを個別制御
- ✅ **設定表示**: `zosql config`でリアルタイム確認
- ✅ **フォールバック機能**: ログ書き込み失敗時の安全機構

これでプロダクション環境での細かなログ制御が可能になりました。

## ⚠️ WASM Postgres使用方針 (重要制約)

### **使用目的限定: DBエンジンのみ**
- ✅ **許可**: SQL構文解析・検証・実行エンジンとしての使用
- ❌ **禁止**: テーブル作成・データ挿入・永続化

### **実装制約**
```typescript
// ✅ 正しい使用法
const db = new PGlite(); // エンジン初期化のみ
await db.exec(userSql);   // ユーザーSQLの実行・検証

// ❌ 禁止事項
await db.exec('CREATE TABLE users (...)');    // テーブル作成
await db.exec('INSERT INTO users VALUES(...)'); // データ挿入
```

### **理由・背景**
1. **zosqlの目的**: CTE解析・デバッグツール（データベースではない）
2. **セキュリティ**: 意図しないデータ永続化防止
3. **パフォーマンス**: 軽量なSQL実行環境維持
4. **責務分離**: SQL解析とデータ管理の明確な分離

### **遵守事項**
- `createDefaultSchema()`: 削除済み
- `insertSampleData()`: 削除済み  
- 今後の開発: テーブル作成処理追加禁止
- コードレビュー: CREATE TABLE/INSERT文の検出必須
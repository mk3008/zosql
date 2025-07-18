# CLAUDE.md - zosql開発メモ
発言時、参照しているclaude.md ファイルのフルパスを明示すること。

## 🔧 デプロイ手順（重要）
**スクロールバー問題を防ぐため、以下の手順を必ず守ること**

### 問題が発生する原因
- tsxやNode.jsのモジュールキャッシュが原因で、古いコードが実行される
- 未追跡ファイル（src/web-ui.ts, src/web-routes.ts等）が残っていると、それらもコンパイルされ、意図しないHTMLが送信される
- dist/フォルダに古いコンパイル結果が残っている

### 正しいデプロイ手順
1. **未追跡ファイルの削除**: `git status` で未追跡ファイルを確認し、不要なファイルを削除
2. **キャッシュクリア**: `rm -rf node_modules/.cache/tsx` でtsxキャッシュを削除
3. **クリーンビルド**: `rm -rf dist/ && npm run build` で完全リビルド
4. **サーバー起動**: `npm run dev web` または `node dist/index.js web` で起動
5. **動作確認**: `curl http://localhost:3000` で実際のHTMLを確認

### 緊急時の対処法
- 複雑なHTML/JavaScriptが返される場合は、必ず上記手順を実行
- 特に「textarea#sql-editor」が含まれる場合は、Monaco Editor統合が原因
- 問題のあるコミットから `git reset --hard` でロールバックを検討

## 開発方針の大原則
- **スモールスタート**: 最小限の機能から開始
- **細かく検証**: 各機能を個別に確認・テスト
- **小さい成功を重ねる**: 段階的な成果を積み上げ
- **一気に作りこまない**: 複雑な機能は後回し
- **小さい成功をするたびにコミット**: 機能単位で確実にコミット
- **テスト可能な事例ならt-wada方式で進める**: TDD実践
- **コミット前の確認**: 単体テスト・TSC実行でデグレがないことを確認
- **一時ファイル**: 調査・実験用ファイルは`.tmp/`ディレクトリを使用（gitignore済み）
- **`.tmp/`フォルダ処理**: 内容はテスト格上げ・機能取り込み・検証後削除のいずれかを実施

## 🚨 重要な設計判断

### Monaco EditorとShadow DOMの非互換性
Monaco EditorはShadow DOM内で正常に動作しないため、意図的に通常のDOM（document.body）に配置しています。

**問題点**:
- IME（日本語入力）が正しく動作しない（高さ0の不可視入力エリア）
- フォーカス管理の失敗（document.activeElementがShadow DOM境界を越えられない）
- イベント伝播の問題（キーボード/マウスイベントの処理不良）

**解決策**:
- Monaco Editorを通常DOMに作成し、Shadow DOM内のコンテナと位置を同期
- `center-panel-shadow.js`のsetupMonacoEditorメソッドで実装

**注意**: この実装を変更する際は必ず日本語入力のテストを実施すること

## 🏗️ difitアーキテクチャ分析と改修計画

### **difitの優れた設計思想**
1. **明確な責務分離**: CLI/Server/Client/Shared/Utilsの5層構造
2. **型安全性**: 共有型定義による契約の保証
3. **ライフサイクル管理**: SSEによるブラウザ連動
4. **開発体験**: Hot Reload、並行起動、自動フォーマット
5. **堅牢性**: ポートフォールバック、エラーハンドリング

### **zosqlの現状課題**
- **レイアウト崩れの頻発**: div戦略の限界、CSS設計の問題
- **責務の混在**: CLI/Server/Clientが密結合
- **型定義の分散**: API契約が不明確
- **開発体験の不足**: ビルドプロセスなし

### **改修優先順位**
1. **UIコンポーネントシステム** (優先度:高)
   - Web Components採用でレイアウト問題解決
   - Shadow DOMによるスタイル分離
   - 標準技術で学習コスト低

2. **CLI/Server分離** (優先度:高)
   ```
   src/cli/     → CLIエントリーポイント
   src/server/  → Expressサーバー
   src/client/  → 静的リソース
   ```

3. **共有型定義** (優先度:高)
   ```
   src/types/
   ├── api.types.ts
   ├── schema.types.ts
   └── shared.types.ts
   ```

## 🚀 革新的なアイデア：SQLの制約を超えたIDE

### **核心概念**
GUIとIntelliSenseを完全に制御できるようになったことで、**SQLの文法制約から解放**された開発環境を実現可能。

### **テーブル/共有CTE の概念**
- **テーブル**: 従来のテーブル定義（users, orders, products等）
- **共有CTE**: CTE（Common Table Expression）に名前を付けたもの
- **革新点**: IDE内ではCTEのimportを明示する必要がない

```sql
-- 従来のSQL（制約あり）
WITH dat AS (SELECT 1 as value)  -- 毎回定義が必要
SELECT o.user_id FROM orders AS o 
INNER JOIN dat AS d ON d.value = 1

-- zosql IDE（制約なし）
SELECT o.user_id FROM orders AS o 
INNER JOIN dat AS d ON d.value = 1  -- datは既に共有CTEに登録済み
```

### **実現予定の機能**
1. **動的テストデータ注入**
   ```sql
   -- GUI上の表記
   SELECT * FROM orders WHERE user_id = @test_user_id
   
   -- 実行時変換
   WITH test_data AS (VALUES (1, 'test_user'))
   SELECT * FROM orders WHERE user_id = (SELECT user_id FROM test_data)
   ```

2. **Visual Query Builder**（ドラッグ&ドロップでCTE組み立て）
3. **依存関係の可視化**
4. **Smart IntelliSense**（コンテキスト別補完）

### **技術的実装**
```typescript
// 新しいスキーマレジストリ
interface SharedCte {
  name: string;           // CTE名
  query: string;          // SELECT文
  columns: Column[];      // カラム定義
  dependencies: string[]; // 依存するCTE
}

// SQL トランスパイラ
class SqlTranspiler {
  transpile(extendedSql: string): string {
    // zosql独自構文 → 標準SQL
    // 共有CTE参照 → WITH句展開
    // テストデータ埋め込み → VALUES句展開
  }
}
```

## 現在のTODOリスト
**重要**: 計画に進捗、変更があるたびに以下のTODOリストを更新すること

### Phase 1 (完了) - zosql browser基盤構築
1. **基盤設計**: フォルダ構成・アーキテクチャ設計 [x]
2. **Web UI構築**: Express.js + 基本UI [x]
3. **Monaco Editor**: SQL編集機能 [x]
4. **スキーマ管理**: zosql.schema.js読み込み [x]
5. **インテリセンス**: SQL補完機能 [x]
6. **構文チェック**: rawsql-ts統合 [x]
7. **CTE対応**: WITH句のIntelliSense [x]
8. **サブクエリ対応**: JOIN内サブクエリの補完 [x]
9. **FROM句コンテキスト**: テーブル名のみ表示 [x]
10. **リファクタリング**: 責務分離による保守性向上 [x]

### Phase 2 (完了) - SQL制約を超えた機能
1. **クエリ実行機能**: WASM Postgres統合 [x]
2. **共有CTE**: 事前定義リソース機能 [x]
3. **デバッグ機能強化**: ファイル出力システム [x]
4. **UI責務分離**: web-ui-template.ts分離 [x]

### Phase 3 (実装中) - アーキテクチャ改善
1. **UIコンポーネントシステム**: レイアウト崩れ対策 [ ]
2. **CLI/Server分離**: 責務の明確化 [ ]
3. **共有型定義**: src/types/ディレクトリ作成 [ ]
4. **ブラウザライフサイクル**: SSE実装 [ ]
5. **ポート衝突対策**: フォールバック機能 [ ]

### Phase 4 (次期実装) - 高度機能拡張
1. **共有CTE管理**: 追加・編集・削除機能 [ ]
2. **SQL トランスパイラ**: 独自構文→標準SQL変換 [ ]
3. **スキーマレジストリ**: テーブル/共有CTE管理 [ ]
4. **テストデータ埋め込み**: VALUES句自動生成 [ ]

### Phase 5 (将来実装) - 高度機能
- **npx zosql web**: ブラウザ自動起動 [ ]
- **ファイルシステム**: /develop/,/resources/管理 [ ]
- **セッション管理**: /develop/{session_id}/自動作成 [ ]
- **AIコメントシステム**: Copy Prompt機能 [ ]
- **プロジェクトエクスプローラー**: ファイル一覧・操作UI [ ]
- **CTE依存関係可視化**: グラフ表示機能 [ ]
- **リアルタイム更新**: WebSocket/SSE実装 [ ]
- **リソース管理**: /resources/⇔/develop/移動機能 [ ]
- **従来CLI機能統合**: browser内でdecompose/compose [ ]

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

## 📁 現在のアーキテクチャ（リファクタリング後）

### **責務分離による保守性向上**
- **web-server.ts**: 118行（92%削減） - メインサーバークラス
- **api/sql-parser-api.ts**: 351行 - SQL解析ロジック
- **api/schema-api.ts**: 69行 - スキーマ処理
- **api/debug-api.ts**: 22行 - デバッグAPI
- **utils/logging.ts**: 46行 - ログ管理
- **web-ui-template.ts**: 994行 - HTML+クライアントサイドJS

### **実装済み機能**
- ✅ **Monaco Editor統合** - SQL構文ハイライト・補完
- ✅ **スキーマ管理** - zosql.schema.js読み込み
- ✅ **IntelliSense** - テーブル・カラム・関数・キーワード補完
- ✅ **CTE対応** - WITH句のテーブル認識・補完
- ✅ **サブクエリ対応** - JOIN内サブクエリの補完
- ✅ **ワイルドカード展開** - SELECT *を実際のカラム名に展開
- ✅ **FROM句コンテキスト** - FROM/JOIN後はテーブル名のみ表示
- ✅ **キャッシュ管理** - パース結果キャッシュでパフォーマンス向上

## プロジェクトの開発方針
- t-wada方式でTDD実践
- テストが成功するたびにステージング・コミット
- vitestを使用してテスト実行

## ファイル管理設計
- `FileManager`クラスでメモリ上のファイル管理を実装
- 実際のファイルシステムに書き出す前にメモリ上で検証可能
- テスト時にファイルI/Oを避けて高速実行を実現

## フォーマッター設定
- デフォルトフォーマットスタイルを実装
  - 識別子クォートなし
  - キーワード小文字
  - パラメータスタイル: named
  - インデント: 4スペース
- `FormatterConfig`インターフェースで設定をカスタマイズ可能
- 将来的にユーザー設定ファイルからの読み込みに対応予定

## SqlFormatterオプション（rawsql-ts 0.11.11-beta）
- `withClauseStyle` - WITH句の整形スタイル
  - `'standard'` - 標準的な改行付きフォーマット
  - `'cte-oneline'` - 各CTEを1行にまとめる（CTEリストは改行）
  - `'full-oneline'` - WITH句全体を1行にまとめる **（zosqlで使用）**
- `cteOneline: true` - CTEをワンライナーでフォーマット（廃止予定、withClauseStyleを使用）
- `indentChar`, `indentSize`, `newline` - インデント・改行設定
- `commaBreak`, `andBreak`, `keywordCase` - 構造設定

## 重要な制約・方針
- **SQLの整形はrawsql-tsを必ず使用すること**
- **現時点では独自のパース、整形処理は実装してはならない**
- rawsql-ts 0.11.11-betaからは`withClauseStyle: 'full-oneline'`を使用
- CTE依存関係コメントはzosql側でSelectQueryに追加する（rawsql-ts機能ではない）

## CTE操作に関する調査結果
- `withClause`プロパティにCTE情報が格納される
- `withClause.tables`配列に各CTEが格納（CommonTableオブジェクト）
- CTE名は`cte.aliasExpression.table.name`でアクセス
- `cteNameCache`にCTE名のSetが格納される
- `getCTENames()`メソッドでCTE名一覧を取得可能

## CTE依存関係コメント形式
- zosqlではCTEの依存関係をコメントとして記述
- SelectQueryのコメントとしてWITH句の前に配置
- フォーマット:
  ```
  /* Auto-generated CTE block - do not edit manually */
  /* Dependencies: */
  /* - {cte_name}.cte.sql */
  ```
- 将来的にはVSCode拡張でファイルリンク化を想定

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

### **テストカバレッジ**
```typescript
// 実際のユーザーシナリオをテスト
{ text: 'where u.', char: '.', expected: ['u.', 'u', ''] }  // 最頻出パターン
{ text: 'SELECT o', char: '.', expected: ['o.', 'o', ''] }  // Monaco Editor動作
{ text: 'high_value_orders.', char: '.', expected: [...] } // 複雑エイリアス
{ text: '123.invalid', char: 'd', expected: null }         // 不正パターン拒否
```

### **エイリアス検出修正**
```typescript
// 修正前: 数字開始エイリアスを許可（不正）
/([a-zA-Z0-9_]+)$/

// 修正後: アルファベット開始のみ許可（正常）
/([a-zA-Z][a-zA-Z0-9_]*)$/
```

### **回帰防止効果**
- ✅ **60+ テストケース**ですべての動作パターンを検証
- ✅ **自動レポート生成**で問題の早期発見
- ✅ **CI/CD統合可能**でデプロイ前検証
- ✅ **実用性重視**でユーザー体験を直接テスト

### **使用方法**
```bash
npm run test:intellisense      # 完全回帰テスト
npm run test:regression        # 回帰テストのみ  
npm run test:once -- test/    # 全テスト実行
```

これでIntelliSenseの品質が大幅に向上し、デグレのリスクが最小化されました。

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
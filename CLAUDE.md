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

## 🚀 革新的なアイデア：SQLの制約を超えたIDE

### **核心概念**
GUIとIntelliSenseを完全に制御できるようになったことで、**SQLの文法制約から解放**された開発環境を実現可能。

### **Public/Private スキーマの概念**
- **Public スキーマ**: 従来のテーブル定義（users, orders, products等）
- **Private スキーマ**: CTE（Common Table Expression）に名前を付けたもの
- **革新点**: IDE内ではCTEのimportを明示する必要がない

```sql
-- 従来のSQL（制約あり）
WITH dat AS (SELECT 1 as value)  -- 毎回定義が必要
SELECT o.user_id FROM orders AS o 
INNER JOIN dat AS d ON d.value = 1

-- zosql IDE（制約なし）
SELECT o.user_id FROM orders AS o 
INNER JOIN dat AS d ON d.value = 1  -- datは既にprivateスキーマに登録済み
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
interface PrivateSchema {
  name: string;           // CTE名
  query: string;          // SELECT文
  columns: Column[];      // カラム定義
  dependencies: string[]; // 依存するCTE
}

// SQL トランスパイラ
class SqlTranspiler {
  transpile(extendedSql: string): string {
    // zosql独自構文 → 標準SQL
    // private スキーマ参照 → WITH句展開
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

### Phase 2 (次期実装) - SQL制約を超えた機能
1. **クエリ実行機能**: WASM Postgres統合 [ ]
2. **Private スキーマ**: CTE名前付け機能 [ ]
3. **SQL トランスパイラ**: 独自構文→標準SQL変換 [ ]
4. **スキーマレジストリ**: Public/Private管理 [ ]
5. **テストデータ埋め込み**: VALUES句自動生成 [ ]

### Phase 3 (将来実装) - 高度機能
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
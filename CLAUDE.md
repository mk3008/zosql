# CLAUDE.md - zosql開発メモ
発言時、参照しているclaude.md ファイルのフルパスを明示すること。

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

## 現在のTODOリスト
**重要**: 計画に進捗、変更があるたびに以下のTODOリストを更新すること

### Phase 1 (高優先度) - zosql browser基盤構築
1. **基盤設計**: フォルダ構成・アーキテクチャ設計 [x]
2. **Web UI構築**: Express.js + 基本UI [x]
3. **npx zosql web**: ブラウザ自動起動 [ ]
4. **Monaco Editor**: SQL編集機能 [ ]
5. **ファイルシステム**: /develop/,/resources/管理 [ ]
6. **スキーマ管理**: zosql.schema.js読み込み [ ]
7. **インテリセンス**: SQL補完機能 [ ]
8. **構文チェック**: rawsql-ts統合 [ ]
9. **WASM Postgres**: 基本SQL実行 [ ]

### Phase 2 (中優先度) - 機能拡張
- セッション管理: /develop/{session_id}/自動作成 [ ]
- AIコメントシステム: Copy Prompt機能 [ ]
- ダミーデータ生成: スキーマ→プロンプト自動生成 [ ]
- VALUES+CTE自動生成: テストデータ→CTE変換 [ ]
- SQL結果表示: テーブル形式・エラー表示 [ ]
- プロジェクトエクスプローラー: ファイル一覧・操作UI [ ]

### Phase 3 (低優先度) - 高度機能
- CTE依存関係可視化: グラフ表示機能 [ ]
- リアルタイム更新: WebSocket/SSE実装 [ ]
- リソース管理: /resources/⇔/develop/移動機能 [ ]
- 従来CLI機能統合: browser内でdecompose/compose [ ]

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
# CLAUDE.md - zosql開発メモ

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
- 一時的な調査用ファイルは`.tmp/`ディレクトリに作成（gitignore済み）
- `.tmp/`内のコードは機能化・テスト化を検討後、不要なら削除

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

## CTE操作に関する調査結果
- `withClause`プロパティにCTE情報が格納される
- `withClause.tables`配列に各CTEが格納（CommonTableオブジェクト）
- CTE名は`cte.aliasExpression.table.name`でアクセス
- `cteNameCache`にCTE名のSetが格納される
- `getCTENames()`メソッドでCTE名一覧を取得可能
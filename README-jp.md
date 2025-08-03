# zosql

**[🚀 ライブサイト](https://mk3008.github.io/zosql)** | **[🎮 デモモード](https://mk3008.github.io/zosql/#demo)**

> **ライブサイト**: 空のワークスペースから開始、SQLファイルをアップロード  
> **デモモード**: 事前設定されたサンプルデータとクエリを試用

## 概要

zosqlは、SQL文の分解・構成を支援するSQLデバッグツールです。複雑なCTE（Common Table Expression）を含むSQL文を効率的に開発・テストできるモジュラー化されたSQL開発環境を提供します。

## 特徴

- **SQL分解・構成**: 複雑なSQL文をCTEベースでモジュール化し、部分的な実行・テストが可能
- **リアルタイム実行**: PGliteを使用したブラウザ内PostgreSQL環境での即座なクエリ実行
- **インタラクティブエディタ**: Monaco Editorによる高度なSQL編集機能（シンタックスハイライト、自動補完）
- **フィルター条件管理**: 動的なWHERE条件の組み合わせとテスト
- **テストデータ管理**: CTE形式でのテストデータ定義と管理
- **SQL整形**: 統一されたコードスタイルでのSQL自動整形

## デモモードの使い方

サンプルデータでzosqlを試すには、**[デモモード](https://mk3008.github.io/zosql/#demo)**にアクセスしてください。サンプルテーブルとクエリが事前設定されたワークスペースで、以下の手順で機能を体験できます：

### 1. クエリ実行を試す

1. 画面左上の **Run** ボタンをクリック
2. 下部のResult画面でクエリ結果を確認
3. デフォルトのSQL（`SELECT user_id, name FROM users;`）の実行結果が表示されます

### 2. Filter Conditionsを変更する

1. 画面右側の **Conditions** タブを開く
2. Filter Conditionsの内容を編集（例：`{"name": {"ilike": "%a%"}}`）
3. **Run** ボタンでフィルター適用後の結果を確認

### 3. テストデータを変更する

1. 画面上部の **data** タブを開く
2. CTE形式のテストデータを編集
   ```sql
   with users(user_id, name) as (
     values
       (1::bigint, 'alice'::text),
       (2::bigint, 'bob'::text),
       (3::bigint, 'adam'::text)
   )
   ```
3. **Run** ボタンで新しいテストデータでの結果を確認

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ブラウザで http://localhost:3000 にアクセス
```

### 基本的なワークフロー

1. **SQLファイルの読み込み**: ローカルの.sqlファイルをアップロード
2. **CTE分解**: 複雑なSQLが自動的にCTEベースで分解される
3. **部分実行**: 各CTEや最終結果を個別に実行・テスト
4. **条件調整**: Filter Conditionsで動的WHERE条件をテスト
5. **データ調整**: Test Valuesでさまざまなテストケースを実行

### 品質チェック

```bash
# 型チェック
npm run typecheck

# リント
npm run lint

# テスト実行
npm run test

# 統合品質チェック
npm run quality
```

## 使用ライブラリとライセンス

### 主要依存関係

- **[rawsql-ts](https://github.com/hurui200320/rawsql-ts)**: SQL解析・分解エンジン（MIT License）
- **[@electric-sql/pglite](https://github.com/electric-sql/pglite)**: ブラウザ内PostgreSQL（Apache License 2.0）
- **[Monaco Editor](https://github.com/microsoft/monaco-editor)**: 高機能コードエディタ（MIT License）
- **[React](https://github.com/facebook/react)**: UIライブラリ（MIT License）
- **[Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)**: CSSフレームワーク（MIT License）

### 開発・テスト依存関係

- **[TypeScript](https://github.com/microsoft/TypeScript)**: 型安全JavaScript（Apache License 2.0）
- **[Vite](https://github.com/vitejs/vite)**: ビルドツール（MIT License）
- **[Vitest](https://github.com/vitest-dev/vitest)**: テストフレームワーク（MIT License）
- **[ESLint](https://github.com/eslint/eslint)**: JavaScript/TypeScriptリンター（MIT License）

**詳細なライセンス条項**: 各ライブラリの完全なライセンス条項については [THIRD-PARTY-LICENSES.md](./THIRD-PARTY-LICENSES.md) をご確認ください。

## ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) ファイルを参照してください。

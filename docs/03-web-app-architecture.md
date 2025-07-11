# インスタントWebアプリ起動システム（difitインスパイア）

## 参考プロジェクト
- **difit**: https://github.com/yoshiko-pg/difit
- `npx difit`でブラウザが起動し、即座にWebアプリが利用可能
- コメントシステム・編集機能を内蔵
- 軽量CLI + 自動Webアプリ起動

## zosql Web編集環境のコンセプト
```bash
npx zosql web [project]
# → ブラウザが自動起動
# → http://localhost:3000 でzosql Web編集環境が利用可能
```

## Web編集環境の機能（将来課題）
- **プロジェクトエクスプローラー**: /zosql/develop/ フォルダ構造の表示
- **SQL編集機能**: 各CTEファイルの直接編集
- **依存関係可視化**: CTE間の依存関係をグラフ表示
- **リアルタイム整形**: 編集時のrawsql-ts自動整形
- **コメント・アノテーション**: CTE/SQLファイルへのコメント機能

## 技術的アプローチ（標準的な実装）
- **CLI**: Commander.js + `open` パッケージでブラウザ起動
- **バックエンド**: Express.js（ファイル操作・API）
- **フロントエンド**: React + TypeScript + Vite（またはバニラJS）
- **エディタ**: Monaco Editor（VS Code風）
- **ファイル監視**: chokidar（リアルタイム更新）
- **通信**: WebSocket または Server-Sent Events
- **SQL整形**: rawsql-ts統合

## 実装の単純さ
```javascript
// CLI entry point
const open = require('open');
const { spawn } = require('child_process');

// サーバー起動
const server = spawn('node', ['server.js']);
await waitForServer('http://localhost:3000');

// ブラウザ起動
await open('http://localhost:3000');
```

AI coding生成なので特別なテクニックではなく、標準的なNode.js + Web技術の組み合わせ。

## 革新的な開発体験
```
1. npx zosql web → ブラウザ起動
2. Web上でCTE編集
3. 保存時に自動整形・検証
4. compose結果をリアルタイム確認
5. 必要に応じてCLIコマンドも実行
```

## 独自AIエディタラッパー vs VS Code拡張機能

### 独自ラッパーの圧倒的メリット
- **完全カスタマイズ**: zosql特化のUI/UX設計
- **AI統合自由度**: 独自のAIワークフロー実装
- **配布簡単**: `npx zosql web` だけでインストール不要
- **クロスプラットフォーム**: ブラウザがあれば動作
- **バージョン管理**: ツール自体のバージョン管理が容易

### VS Code拡張機能の制約
- **VS Code依存**: ユーザーがVS Code使用必須
- **拡張機能制限**: VS Code APIの制約内での実装
- **配布複雑**: マーケットプレイス登録・インストール必要
- **UI制限**: VS Code UIフレームワーク内での実装

### zosql特化エディタの可能性
```
npx zosql web → 専用SQL編集環境
- CTE依存関係グラフ
- SQL整形リアルタイム
- AIプロンプト生成
- compose/decompose統合
- プロジェクト構造専用UI
```

### 技術的実現性
- **Monaco Editor**: VS Codeと同じエディタエンジン
- **完全制御**: レイアウト・機能を完全にカスタマイズ
- **AI統合**: 独自のAIワークフロー実装
- **軽量**: 必要機能のみ搭載

### 実装優先度（方針変更）
- **Phase 1**: 基本的のWeb UI + Monaco Editor
- **Phase 2**: zosql特化機能（CTE依存関係、compose/decompose）
- **Phase 3**: AI統合コメントシステム
- **Phase 4**: 高度なSQL開発支援機能

独自AIエディタラッパーの方が、VS Code拡張機能よりも自由度・配布性・特化機能の実装で圧倒的に有利。
# zosql Documentation

この `docs/` フォルダは、FUTURE_IDEAS.mdが大きくなったため、セクション別に分割して管理するためのものです。

## ドキュメント構成

### 01-interactive-workflow.md
- インタラクティブなSQL編集ワークフロー
- 基本コンセプト・フォルダ構成
- 主要コマンド（decompose, recompose, compose）

### 02-cte-resource-management.md
- CTEリソース管理・インポート機能
- 依存関係コメント形式
- 検討すべき質問・課題

### 03-web-app-architecture.md
- インスタントWebアプリ起動システム（difitインスパイア）
- 独自AIエディタラッパー vs VS Code拡張機能
- Web編集環境の機能設計

### 04-database-schema-strategy.md
- DB統合・スキーマ管理戦略
- WASM Postgres vs Docker/物理DBサーバー
- 段階的DB対応戦略

### 05-test-data-ai-integration.md
- テストデータ管理・AI統合
- VALUES+CTE自動生成
- developフォルダの位置づけ変更

## 使用方法

作業時には関連するドキュメントのみを参照し、不必要な読み込みを避けてください。

- **Phase 1実装時**: 01, 03, 04を参照
- **AI統合実装時**: 05を参照
- **リソース管理実装時**: 02を参照
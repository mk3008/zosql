# インタラクティブなSQL編集ワークフロー

## 基本コンセプト（仕様化済み）
- オリジナルSQLファイルをzosql形式に分解して保守性を向上
- 分解されたファイルは `/zosql` フォルダ配下に配置（バージョン管理対象）
- ターミナルコマンドによる操作（スモールスタート）

## フォルダ構成（決定済み）
```
/sql                     # オリジナルSQLファイル
  /{group}
    {feature}.sql

/zosql                   # 分解されたファイル（バージョン管理対象）
  zosql.config          # フォーマッターなどの設定
  /{group}
    /{feature}.sql/     # フォルダ
       main.sql         # rootクエリ（with句ワンライナー）
       /cte
         {ctename}.sql  # CTE単体（動作可能な最小構成、with句ワンライナー）
```

## 主要コマンド（3つ）
1. **decompose**: オリジナルSQLからzosqlファイルを作り直す
2. **recompose**: zosqlフォルダ内でCTE追加時の再分解
3. **compose**: zosqlフォルダの内容を結合し、オリジナルSQLに書き戻す

## recomposeコマンドの詳細動作
CTEを追加した場合の自動整形と分解：
```sql
# 編集前
/* Dependencies: */
/* - cte1.sql */
with cte1 as (...) select ...

# CTEを手動追加
/* Dependencies: */
/* - cte1.sql */
with cte1 as (...), cteX as (...) select ...

# recomposeコマンド実行後
/* Dependencies: */
/* - cte1.sql */
/* - cteX.sql */
with cte1 as (...), cteX as (...) select ...
# → cteX.sqlも自動生成される
```

## 実装方針（スモールスタート）
- ターミナルコマンドとして実装（後でVSCode拡張化も可能）
- 複雑な競合解決は後回し（単純な上書きから開始）
- ファイルウォッチャーなし（手動実行のみ）

## 今後の検討課題

### 段階的な機能拡張
1. **Phase 1（現在）**: 基本的なCLIコマンド実装
2. **Phase 2**: VSCode拡張（ショートカットキー、ステータス表示）
3. **Phase 3**: リソース機能（共有CTE、バージョン管理の高度化）

### 保守モードとリソースモード
- **保守モード**: 一時的な編集用（将来的にはgitignore対象も検討）
- **リソースモード**: 共有資産として格上げ（バージョン管理必須）

### 技術的課題（後回し）
- 大規模SQLファイルのパフォーマンス最適化
- SQL構文エラー時のグレースフルな処理
- 依存関係の循環検出
- バックアップ・履歴管理（git以外の選択肢）
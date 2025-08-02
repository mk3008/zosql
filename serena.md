# Serena MCP Server 起動ガイド

## 概要
SerenaはMCP（Model Context Protocol）サーバーとして動作し、コードベースに対する高度な解析・編集機能を提供します。

## 前提条件
- `uv` (Python package manager) がインストールされていること
- serenaリポジトリがクローンされていること

## インストール
```bash
# uvのインストール
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env

# serenaのクローン
git clone https://github.com/oraios/serena
```

## 起動方法

### 基本的な起動
```bash
source $HOME/.local/bin/env
uv run serena-mcp-server --project /root/github/worktree/repositories/zosql/refactor
```

### 起動オプション
```bash
uv run serena-mcp-server --help
```

主要オプション:
- `--project [PROJECT_PATH]`: プロジェクトパスを指定
- `--context [CONTEXT]`: コンテキスト指定 (デフォルト: desktop-app)
- `--mode [MODE]`: モード指定 (デフォルト: interactive, editing)
- `--transport [stdio|sse]`: 通信プロトコル (デフォルト: stdio)
- `--host [HOST]`: ホスト (デフォルト: 0.0.0.0)
- `--port [PORT]`: ポート (デフォルト: 8000)

## 設定ファイル
- **設定ファイル**: `~/.serena/serena_config.yml`
- **ログ**: `~/.serena/logs/`

## 利用可能なツール (30個)
- **ファイル操作**: `read_file`, `create_text_file`, `list_dir`, `find_file`
- **シンボル解析**: `get_symbols_overview`, `find_symbol`, `find_referencing_symbols`
- **コード編集**: `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`
- **検索**: `search_for_pattern`, `replace_regex`
- **メモリ**: `write_memory`, `read_memory`, `list_memories`, `delete_memory`
- **システム**: `execute_shell_command`, `restart_language_server`
- **プロジェクト管理**: `activate_project`, `remove_project`, `switch_modes`

## Webダッシュボード
起動後、以下のURLでWebダッシュボードにアクセス可能:
```
http://127.0.0.1:24282/dashboard/index.html
```

## Claude Desktop での設定

### 設定方法
1. Claude Desktopを開く
2. `File / Settings / Developer / MCP Servers / Edit Config` を選択
3. `claude_desktop_config.json` に以下の設定を追加：

```json
{
  "mcpServers": {
    "serena": {
      "command": "/root/.local/bin/uvx",
      "args": [
        "--from", 
        "git+https://github.com/oraios/serena", 
        "serena-mcp-server",
        "--context",
        "ide-assistant",
        "--project",
        "/root/github/worktree/repositories/zosql/refactor"
      ]
    }
  }
}
```

### 代替設定（ローカルインストール使用）
```json
{
  "mcpServers": {
    "serena": {
      "command": "/root/.local/bin/uv",
      "args": [
        "run", 
        "--directory", 
        "/root/github/worktree/repositories/zosql/refactor/serena", 
        "serena-mcp-server",
        "--context",
        "ide-assistant",
        "--project",
        "/root/github/worktree/repositories/zosql/refactor"
      ]
    }
  }
}
```

4. Claude Desktopを再起動

### 使用方法
1. Claude Desktopでチャットを開始
2. serenaの初期指示を読む
3. プロジェクトが自動的にアクティベートされる
4. serenaのツールを使用してコード解析・編集

## 使用例
1. MCPサーバーを起動
2. MCPクライアント（Claude Code等）から接続
3. 提供されるツールを使用してコードベースを解析・編集

## プロジェクトインデックス作成

大規模プロジェクトでは、初回のツール実行を高速化するためインデックス作成を推奨：

```bash
source $HOME/.local/bin/env
uv run serena project index /root/github/worktree/repositories/zosql/refactor
```

- インデックスファイルは `.serena/cache/` に保存されます
- 処理時間は約2-3分（プロジェクトサイズにより変動）

## トラブルシューティング
- TypeScriptプロジェクトの場合、自動的にTypeScript言語サーバーが初期化されます
- 言語サーバーの初期化に時間がかかる場合がありますが、通常は1-3秒で完了します
- インデックス作成中にタイムアウトした場合は、再実行してください
- ログは `~/.serena/logs/` に記録されます
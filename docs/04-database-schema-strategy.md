# DB統合・スキーマ管理戦略

## DB接続機能の実装選択肢

### 選択肢1: Docker/物理DBサーバー
**メリット:**
- 本格的なDB環境（本番環境に近い）
- 高パフォーマンス
- 全SQL機能をサポート
- 既存DB接続可能

**デメリット:**
- 環境構築が複雑
- Docker依存・環境依存
- `npx zosql web`の簡単さを損なう
- チーム共有時の環境差異

### 選択肢2: WASM Postgres ⭐️推奨
**メリット:**
- **環境構築不要**: `npx zosql web`だけで完結
- **ポータビリティ**: ブラウザがあれば動作
- **一貫性**: zosqlのコンセプトに合致
- **チーム共有**: 環境差異なし

**デメリット:**
- パフォーマンス制約
- 機能制限の可能性
- メモリ制約

### 推奨: WASM Postgres
zosqlの「即座に使える」コンセプトとの一貫性を考慮すると、**WASM Postgres**が最適。

```javascript
// 実装イメージ
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();

// SQLテスト実行
async function testSQL(sql) {
  try {
    const result = await db.query(sql);
    return { success: true, data: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// エディタ統合
editor.onDidChangeModelContent(() => {
  const sql = editor.getValue();
  testSQL(sql).then(result => {
    if (result.success) {
      showResults(result.data);
    } else {
      showError(result.error);
    }
  });
});
```

### 段階的DB対応戦略

**Phase 1: WASM Postgres（デフォルト）**
- 即座に使える開発環境
- 機能制限があっても構わない
- 基本的なSQL開発・テスト

**Phase 2: 物理DB対応追加**
- 設定ファイルでDB接続先を切り替え
- 同一インターフェースで異なるDB接続

### 実装の簡単さ
```javascript
// DB接続抽象化
class DatabaseManager {
  constructor(config) {
    if (config.type === 'wasm') {
      this.db = new PGlite();
    } else if (config.type === 'postgres') {
      this.db = new Client(config.connection);
    }
  }
  
  async query(sql) {
    return await this.db.query(sql);
  }
}

// 設定ファイル例
// zosql.config.js
export default {
  database: {
    type: 'wasm', // または 'postgres', 'mysql'
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'mydb'
    }
  }
};
```

### 機能制限の対処法
```javascript
// 機能チェック＆フォールバック
async function executeSQL(sql) {
  try {
    return await db.query(sql);
  } catch (error) {
    if (error.message.includes('function not supported')) {
      // WASM制限の場合、警告表示
      showWarning('This function is not supported in WASM mode. Consider using external DB.');
    }
    throw error;
  }
}
```

### 実装優先度
1. **Phase 1**: WASM Postgres（デフォルト）
2. **Phase 2**: 設定ファイルでDB切り替え機能
3. **Phase 3**: PostgreSQL/MySQL/SQLite対応
4. **Phase 4**: 機能制限の自動検出・警告

**結論**: WASM → 物理DBへの拡張は、抽象化レイヤーを作るだけで簡単に実現できる。機能制限があっても警告表示で対応可能。

## スキーマ管理戦略

### 現実的なアプローチ（推奨）
**Phase 1: スキーマ管理必須**
- テーブル定義・型情報は必須とする
- 実用的なSQL開発には避けられない
- インテリセンス・構文チェックの精度向上

**Phase 2: 物理テーブル依存廃止（将来課題）**
- VALUES CTEでのテーブル定義代替
- 完全な物理テーブル非依存
- 技術的難易度が高い（型推論、日付処理等）

### スキーマ定義形式
```javascript
// zosql.schema.js
export default {
  tables: {
    users: {
      columns: {
        id: { type: 'INTEGER', primaryKey: true },
        name: { type: 'VARCHAR(255)', nullable: false },
        email: { type: 'VARCHAR(255)', unique: true },
        created_at: { type: 'TIMESTAMP', default: 'NOW()' }
      }
    },
    orders: {
      columns: {
        id: { type: 'INTEGER', primaryKey: true },
        user_id: { type: 'INTEGER', foreignKey: 'users.id' },
        amount: { type: 'DECIMAL(10,2)', nullable: false },
        status: { type: 'VARCHAR(50)', enum: ['pending', 'completed'] }
      }
    }
  }
};
```

### VALUES CTE代替の課題
```sql
-- 現実的な課題例
WITH users AS (
  VALUES 
    (1, 'John', 'john@example.com', '2024-01-01'::timestamp),
    (2, 'Jane', 'jane@example.com', '2024-01-02'::timestamp)
  AS t(id, name, email, created_at)
)
-- 型キャスト、日付処理、制約チェック等が複雑
```

### 実装優先度
1. **Phase 1**: スキーマ定義必須の実装
2. **Phase 2**: WASM Postgres + スキーマ統合
3. **Phase 3**: 高度なインテリセンス（型ベース）
4. **Phase 4**: VALUES CTE代替研究（実験的）

**方針**: 実用性を優先し、スキーマ管理必須で開始。将来的な物理テーブル非依存は研究課題として段階的に取り組む。
# テストデータ管理・AI統合

## テーブル定義 vs データ管理戦略

### 課題の整理
**スキーマ定義（テーブル構造）**: 必要
- 独自書式で開始 → 将来的にDDL抽出
- インテリセンス・型チェックに必須

**データ管理**: 複雑な問題
- **物理テーブル依存**: データ依存発生、テスト困難
- **VALUES+CTE**: 理論的に可能、実際の用意が大変
- **複数テーブル依存**: テストデータ準備の複雑さ
- **環境整備**: 用意が大変だからあまり流行らない

### 段階的解決アプローチ

#### Phase 1: ハイブリッド方式（実用性優先）
```javascript
// スキーマ定義 + サンプルデータ
export default {
  tables: {
    users: {
      schema: {
        id: { type: 'INTEGER', primaryKey: true },
        name: { type: 'VARCHAR(255)', nullable: false },
        email: { type: 'VARCHAR(255)', unique: true }
      },
      // 開発・テスト用サンプルデータ
      sampleData: [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ]
    }
  }
};
```

#### Phase 2: 自動VALUES+CTE生成
```javascript
// サンプルデータから自動生成
function generateValuesCTE(tableName, sampleData) {
  const values = sampleData.map(row => 
    `(${Object.values(row).map(v => formatValue(v)).join(', ')})`
  ).join(',\n    ');
  
  return `WITH ${tableName} AS (
  VALUES 
    ${values}
  AS t(${Object.keys(sampleData[0]).join(', ')})
)`;
}
```

#### Phase 3: テストデータセット管理
```javascript
// テストシナリオ別データセット
export default {
  testSets: {
    'basic_users': {
      users: [/* 基本的なユーザーデータ */],
      orders: [/* 対応する注文データ */]
    },
    'edge_cases': {
      users: [/* エッジケースデータ */],
      orders: [/* 対応する注文データ */]
    }
  }
};
```

### 実用性を重視した機能

#### 1. 自動テストデータ生成
```javascript
// スキーマからダミーデータ自動生成
function generateTestData(schema, count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User${i + 1}`,
    email: `user${i + 1}@example.com`,
    created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
  }));
}
```

#### 2. 依存関係を考慮した自動生成
```javascript
// 外部キー関係を考慮した関連データ生成
function generateRelatedData(schemas, relations) {
  // users → orders の関係を考慮して自動生成
  // 整合性のあるテストデータを自動作成
}
```

#### 3. テストデータプリセット
```javascript
// よく使われるテストパターンのプリセット
const testPresets = {
  'ecommerce_basic': {
    users: generateEcommerceUsers(10),
    products: generateProducts(20),
    orders: generateOrders(50)
  },
  'analytics_sample': {
    events: generateEventData(1000),
    users: generateAnalyticsUsers(100)
  }
};
```

### 実装優先度（実用性重視）
1. **Phase 1**: スキーマ定義 + サンプルデータ管理
2. **Phase 2**: VALUES+CTE自動生成機能
3. **Phase 3**: 自動テストデータ生成
4. **Phase 4**: 高度なテストデータセット管理

**核心的解決策**: 
- テストデータの用意を限りなく自動化
- スキーマ定義からダミーデータ自動生成
- 関連テーブルの整合性自動確保
- プリセットによる即座利用

これにより、VALUES+CTEの理論的利点を実用的な形で実現できる。

## AI統合によるダミーデータ生成

### Copy Promptによるダミーデータ作成指示
```javascript
// スキーマ定義からAI用プロンプト自動生成
function generateDataCreationPrompt(schema) {
  return `
以下のスキーマ定義に基づいて、テスト用のダミーデータ。10件生成してください：

${JSON.stringify(schema, null, 2)}

要件：
- 現実的なデータ内容（名前、メール、日付など）
- 外部キー関係の整合性を保つ
- VALUES+CTE形式で出力
- 日本語・英語のバランス良いデータ

出力形式：
WITH users AS (
  VALUES 
    (1, 'John Doe', 'john@example.com', '2024-01-01'::timestamp),
    ...
  AS t(id, name, email, created_at)
)
  `;
}
```

### UI統合例
```javascript
// スキーマ定義画面での「Generate Test Data」ボタン
function onGenerateTestDataClick() {
  const prompt = generateDataCreationPrompt(currentSchema);
  
  // Copy Promptボタン表示
  showCopyPromptDialog({
    title: "AI用ダミーデータ生成指示",
    prompt: prompt,
    instruction: "このプロンプトをAIエージェントに貼り付けて、ダミーデータを生成してください"
  });
}
```

### 段階的なAI活用
1. **基本ダミーデータ**: スキーマ → AI → VALUES+CTE
2. **関連データ**: 複数テーブル → AI → 整合性のあるデータセット
3. **シナリオ別**: 「ECサイトの注文データ」→ AI → 現実的なテストデータ
4. **エッジケース**: 「NULL値やエラーパターン」→ AI → テスト用境界値

### 実用性の向上
- **自動プロンプト生成**: スキーマ定義から最適化されたAI指示
- **コンテキスト情報**: テーブル関係、データ型、制約条件を含む
- **出力形式指定**: VALUES+CTE形式で確実に出力
- **カスタマイズ可能**: データ量、言語、現実性レベルの調整

これにより、「テストデータ用意が大変」問題を、AI×zosqlの組み合わせで解決できる。

## developフォルダの位置づけ変更

### 新しいコンセプト: ワークスペース的な位置づけ
```
/zosql
  /develop           # 一時的なワークスペース（zosql browser専用）
    /{session_id}/   # ブラウザセッション別
      /scratch/      # スクラッチパッド
      /test_data/    # AI生成テストデータ
      /experiments/  # 実験用SQL
  /resources         # 永続的なリソース（バージョン管理対象）
    /schemas/        # スキーマ定義
    /cte/           # 共有CTE
    /templates/     # SQLテンプレート
```

### 機能の再整理
**develop（一時的）:**
- zosql browserでの作業領域
- AI生成テストデータの保存
- 実験・検証用SQL
- セッション終了時にクリーンアップ可能

**resources（永続的）:**
- スキーマ定義
- 再利用可能なCTE
- プロジェクト共有リソース
- バージョン管理対象

### ワークフロー例
```
1. npx zosql web → ブラウザ起動
2. /develop/{session_id}/ 自動作成
3. スキーマ定義 → AI → テストデータ生成
4. /develop/test_data/ に保存
5. 実験・検証・開発
6. 有用なCTE → /resources/cte/ に移動
7. セッション終了 → /develop/ クリーンアップ
```

### 実装上の利点
- **軽量**: 一時的なファイルはバージョン管理不要
- **柔軟**: 実験・検証・AI統合に最適
- **整理**: 永続化すべきものと一時的な作業の分離
- **AI統合**: テストデータ生成・実験がしやすい

### 従来のdecompose/compose機能
```
/sql/original.sql → /develop/decompose_work/ → 作業 → /sql/original.sql
# 一時的な分解作業もdevelopで実施
```

developを一時的なワークスペースにすることで、zosql browserの自由度が大幅に向上する。
# TypeScriptテストルール

このドキュメントは、zosqlプロジェクトにおけるTypeScriptテストの標準ルールを定義します。

## テストフレームワーク

### 使用するテストフレームワーク
- **Vitest** - モダンで高速なテストランナー
  - Viteベースのプロジェクトとの親和性が高い
  - Jest APIとの互換性
  - 並列実行による高速化
  - TypeScriptのサポートが組み込み済み

## 基本方針

### テスト信頼性優先の戦略
- **実装に最も近い形でテストする**
- **モックは本当に必要な外部依存のみ**
- **軽量な実装クラスを積極活用**

### テスト戦略のピラミッド
```
        統合テスト (5%)
      ┌─────────────────┐
      │  ブラウザテスト  │  ← 最小限
      └─────────────────┘
    ┌───────────────────────┐
    │   コンポーネントテスト  │  ← UI binding確認のみ (15%)
    └───────────────────────┘
  ┌─────────────────────────────┐
  │    実装重視単体テスト       │  ← メインフォーカス (80%)
  └─────────────────────────────┘
```

### 品質目標
- **単体テストカバレッジ: 90%以上**
- **ビジネスロジックカバレッジ: 100%**
- **実行時間: 単体テスト全体で30秒以内**
- **テストと実装の乖離最小化**

## テストファイル構成

### ファイル命名規則
```
src/
├── core/
│   ├── commands/
│   │   ├── execute-query-command.ts
│   │   └── execute-query-command.test.ts     # 同じディレクトリ
│   └── usecases/
│       ├── sql-decomposer-usecase.ts
│       └── sql-decomposer-usecase.test.ts
├── ui/
│   ├── viewmodels/
│   │   ├── main-content-viewmodel.ts
│   │   └── main-content-viewmodel.test.ts
│   └── components/
│       ├── SqlEditor.tsx
│       └── SqlEditor.test.tsx               # 最小限のテスト
└── test/
    ├── integration/                          # 統合テスト
    │   └── sql-execution-flow.test.ts
    └── helpers/                              # テストヘルパー
        ├── mock-factories.ts
        └── test-data.ts
```

### ファイル命名パターン
- 単体テスト: `*.test.ts` または `*.spec.ts`
- 統合テスト: `*.integration.test.ts`
- E2Eテスト: `*.e2e.test.ts`

## 単体テストルール

### 必須対象
以下のコードは**必ず**単体テストを書く：

1. **Commandクラス** - すべてのメソッド
2. **UseCaseクラス** - すべてのメソッド
3. **ViewModelクラス** - すべてのメソッドとプロパティ
4. **Entityクラス** - ビジネスロジックを含むメソッド
5. **純粋関数** - すべての関数

### テスト構造
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ExecuteQueryCommand', () => {
  // テスト対象の準備
  let command: ExecuteQueryCommand;
  let mockSqlExecutor: MockedObject<SqlExecutor>;
  let mockWorkspace: MockedObject<Workspace>;
  
  beforeEach(() => {
    // モックの初期化（vi.mocked を使用）
    mockSqlExecutor = createMockSqlExecutor();
    mockWorkspace = createMockWorkspace();
    
    command = new ExecuteQueryCommand({
      sql: 'SELECT * FROM users',
      sqlExecutor: mockSqlExecutor,
      workspace: mockWorkspace
    });
  });
  
  describe('canExecute', () => {
    it('should return true when SQL is not empty', () => {
      expect(command.canExecute()).toBe(true);
    });
    
    it('should return false when SQL is empty', () => {
      command = new ExecuteQueryCommand({
        sql: '',
        sqlExecutor: mockSqlExecutor,
        workspace: mockWorkspace
      });
      
      expect(command.canExecute()).toBe(false);
    });
  });
  
  describe('execute', () => {
    it('should execute SQL and return results', async () => {
      // Arrange
      const expectedResult = { rows: [{ id: 1, name: 'John' }] };
      mockSqlExecutor.execute.mockResolvedValue(expectedResult);
      
      // Act
      const result = await command.execute();
      
      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockSqlExecutor.execute).toHaveBeenCalledWith('SELECT * FROM users');
    });
    
    it('should throw BusinessError when SQL is invalid', async () => {
      // Arrange
      mockSqlExecutor.execute.mockRejectedValue(new Error('Syntax error'));
      
      // Act & Assert
      await expect(command.execute()).rejects.toThrow(BusinessError);
    });
  });
});
```

### AAA（Arrange-Act-Assert）パターン
```typescript
it('should format SQL with workspace formatter style', async () => {
  // Arrange - テストデータの準備
  const sql = 'SELECT id,name FROM users WHERE active=1';
  const formatterStyle = { indentSize: 2, uppercase: true };
  const command = new FormatSqlCommand(sql, formatterStyle);
  
  // Act - 実際の実行
  const result = await command.execute();
  
  // Assert - 結果の検証
  expect(result).toContain('SELECT');
  expect(result).toContain('FROM');
  expect(result).toContain('WHERE');
  expect(result.split('\n').length).toBeGreaterThan(1);
});
```

## ViewModelテストルール

### 実装重視のViewModelテスト
```typescript
describe('SqlEditorViewModel', () => {
  let viewModel: SqlEditorViewModel;
  let commandExecutor: CommandExecutor; // 実装を使用
  let workspace: Workspace;
  
  beforeEach(() => {
    // 軽量な実装を使用
    commandExecutor = new CommandExecutor();
    workspace = createTestWorkspace(); // 実際のWorkspaceエンティティ
    viewModel = new SqlEditorViewModel(commandExecutor, workspace);
  });
  
  describe('sql property', () => {
    it('should notify change when sql is updated', () => {
      const changeListener = vi.fn();
      viewModel.subscribe('sql', changeListener);
      
      viewModel.sql = 'SELECT * FROM users';
      
      expect(changeListener).toHaveBeenCalledWith('sql');
      expect(viewModel.sql).toBe('SELECT * FROM users');
    });
  });
  
  describe('formatQuery', () => {
    it('should format SQL using real formatter', async () => {
      // Arrange
      viewModel.sql = 'SELECT id,name FROM users WHERE active=1';
      
      // Act - 実際のフォーマット処理を実行
      await viewModel.formatQuery();
      
      // Assert - 実際にフォーマットされているかチェック
      expect(viewModel.sql).toContain('\n'); // 改行が入っている
      expect(viewModel.sql).toContain('SELECT');
      expect(viewModel.sql).toContain('FROM');
      expect(viewModel.sql).toContain('WHERE');
    });
  });
  
  describe('executeQuery', () => {
    it('should manage execution state correctly', async () => {
      // Arrange
      viewModel.sql = 'SELECT 1 as test';
      
      // Act
      const executePromise = viewModel.executeQuery();
      
      // Assert - 実行中の状態
      expect(viewModel.isExecuting).toBe(true);
      expect(viewModel.canExecute).toBe(false);
      
      await executePromise;
      
      // Assert - 実行後の状態
      expect(viewModel.isExecuting).toBe(false);
      expect(viewModel.canExecute).toBe(true);
    });
  });
});

// テストヘルパー: 実際のエンティティを作成
function createTestWorkspace(): Workspace {
  return new Workspace({
    id: 'test-workspace',
    name: 'Test Workspace',
    formatterStyle: {
      indentSize: 2,
      uppercase: true,
      linesBetweenQueries: 1
    }
  });
}
```

## テストダブル戦略

### 優先順位：実装 > 軽量実装 > モック

```typescript
// 🥇 最優先: 実装をそのまま使用
describe('SqlFormatterCommand', () => {
  it('should format SQL using real rawsql-ts', async () => {
    const command = new FormatSqlCommand(
      'SELECT * FROM users',
      { indentSize: 2, uppercase: true }
    );
    
    // 実際のrawsql-tsを使用
    const result = await command.execute();
    expect(result).toContain('SELECT');
  });
});

// 🥈 次優先: 軽量なテスト実装
class InMemoryWorkspaceRepository implements WorkspaceRepositoryPort {
  private workspaces = new Map<string, Workspace>();
  
  async save(workspace: Workspace): Promise<void> {
    this.workspaces.set(workspace.id, workspace);
  }
  
  async findById(id: string): Promise<Workspace | null> {
    return this.workspaces.get(id) || null;
  }
}

// 🥉 最後の手段: 外部依存のみモック
describe('FileSystemService', () => {
  let mockFileSystem: MockedObject<FileSystem>;
  
  beforeEach(() => {
    // ファイルシステムは実際にアクセスできないためモック
    mockFileSystem = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      exists: vi.fn()
    };
  });
});
```

### モック使用の判断基準

#### ✅ モックしてよいもの
- **ブラウザAPI**: localStorage, IndexedDB, FileSystem
- **重い外部ライブラリ**: PGliteの実際のSQL実行
- **非同期I/O**: ネットワーク通信、ファイル読み書き
- **時間依存**: Date.now(), setTimeout
- **ランダム性**: Math.random()

#### ❌ モックしてはいけないもの
- **自作のビジネスロジック**: Entityクラス、UseCaseクラス
- **軽量なライブラリ**: rawsql-tsのパーサー部分
- **純粋関数**: 計算処理、フォーマット処理
- **データ構造**: 配列操作、オブジェクト変換

### 実装重視のテスト例
```typescript
// ✅ 推奨: 実際のrawsql-tsを使用
describe('SqlDecomposerUseCase', () => {
  let usecase: SqlDecomposerUseCase;
  let repository: InMemoryWorkspaceRepository;
  
  beforeEach(() => {
    repository = new InMemoryWorkspaceRepository();
    usecase = new SqlDecomposerUseCase(repository);
  });
  
  it('should decompose CTE using real parser', async () => {
    const sql = `
      WITH user_stats AS (
        SELECT user_id, COUNT(*) FROM orders GROUP BY user_id
      )
      SELECT * FROM user_stats
    `;
    
    // 実際のパーサーでテスト
    const result = await usecase.decompose(sql);
    
    expect(result.ctes).toHaveLength(1);
    expect(result.ctes[0].name).toBe('user_stats');
    expect(result.ctes[0].sql).toContain('SELECT user_id, COUNT(*)');
  });
});

// ❌ 避ける: 不要なモック
describe('SqlDecomposerUseCase', () => {
  let mockParser: MockedObject<SqlParser>;
  
  beforeEach(() => {
    mockParser = {
      parse: vi.fn().mockReturnValue(fakeParsedResult)
    };
  });
  
  // このテストは実際のパーサーの動作を検証していない
});
```

## UIコンポーネントテスト

### 最小限の統合テスト
```typescript
// ui/components/SqlEditor.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

describe('SqlEditor Component', () => {
  let mockViewModel: MockedObject<SqlEditorViewModel>;
  
  beforeEach(() => {
    mockViewModel = {
      sql: '',
      canExecute: false,
      isExecuting: false,
      executeQuery: vi.fn(),
      formatQuery: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    };
  });
  
  it('should render monaco editor with viewmodel sql', () => {
    mockViewModel.sql = 'SELECT * FROM users';
    
    render(<SqlEditor viewModel={mockViewModel} />);
    
    expect(screen.getByDisplayValue('SELECT * FROM users')).toBeInTheDocument();
  });
  
  it('should call viewModel.executeQuery when execute button is clicked', () => {
    mockViewModel.canExecute = true;
    
    render(<SqlEditor viewModel={mockViewModel} />);
    fireEvent.click(screen.getByText('Execute'));
    
    expect(mockViewModel.executeQuery).toHaveBeenCalled();
  });
  
  // ❌ 避ける: 詳細なUI操作テスト
  // it('should show loading spinner during execution', () => { ... });
});
```

## パフォーマンステスト

### 実行時間の測定
```typescript
describe('Performance Tests', () => {
  it('should parse large SQL within time limit', async () => {
    const largeSql = generateLargeSql(1000); // 1000行のSQL
    const startTime = performance.now();
    
    const command = new ParseSqlCommand(largeSql);
    await command.execute();
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(100); // 100ms以内
  });
});
```

## テストデータ管理

### テストフィクスチャ
```typescript
// test/helpers/test-data.ts
export const TEST_SQL_QUERIES = {
  simple: 'SELECT id, name FROM users',
  withWhere: 'SELECT id, name FROM users WHERE active = 1',
  withCte: `
    WITH active_users AS (
      SELECT id, name FROM users WHERE active = 1
    )
    SELECT * FROM active_users
  `,
  complex: `
    WITH user_stats AS (
      SELECT user_id, COUNT(*) as order_count
      FROM orders 
      GROUP BY user_id
    ),
    high_value_users AS (
      SELECT user_id FROM user_stats WHERE order_count > 10
    )
    SELECT u.name, us.order_count
    FROM users u
    JOIN user_stats us ON u.id = us.user_id
    WHERE u.id IN (SELECT user_id FROM high_value_users)
  `
};

export const TEST_WORKSPACES = {
  default: {
    id: 'default',
    name: 'Default Workspace',
    formatterStyle: DEFAULT_FORMATTER_STYLE
  },
  custom: {
    id: 'custom',
    name: 'Custom Workspace',
    formatterStyle: {
      indentSize: 4,
      uppercase: false,
      linesBetweenQueries: 2
    }
  }
};
```

## テスト実行ルール

### 実行コマンド
```bash
# 全テスト実行
npm run test:run

# ウォッチモード
npm run test

# UIモードでテスト実行
npm run test:ui

# カバレッジ付き実行
npm run test:coverage

# 特定のテストファイル
npm run test sql-editor

# 特定のテストパターン
npm run test -- -t "should execute"
```

### CI/CD要件
```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: |
    npm run test:run
    npm run test:coverage
  env:
    NODE_ENV: test
    
- name: Check Coverage Thresholds
  run: |
    # カバレッジが90%未満の場合は失敗
    npm run test:coverage:check
```

## 禁止事項

### やってはいけないテスト
```typescript
// ❌ 実装詳細をテストしない
it('should call internal method', () => {
  const spy = vi.spyOn(service, '_internalMethod');
  service.execute();
  expect(spy).toHaveBeenCalled();
});

// ❌ 外部サービスに実際にアクセス
it('should save to database', async () => {
  await service.save(data);
  const saved = await database.find(data.id);
  expect(saved).toEqual(data);
});

// ❌ 時間に依存するテスト
it('should return current timestamp', () => {
  const result = service.getCurrentTime();
  expect(result).toBe(Date.now()); // 不安定
});

// ❌ 順序に依存するテスト
describe('Sequential Tests', () => {
  let sharedState: any;
  
  it('should set state', () => {
    sharedState = { value: 1 };
  });
  
  it('should use previous state', () => {
    expect(sharedState.value).toBe(1); // 前のテストに依存
  });
});
```

### 推奨される代替案
```typescript
// ✅ 振る舞いをテスト
it('should return formatted SQL', async () => {
  const result = await service.format(inputSql);
  expect(result).toContain('SELECT');
  expect(result).toContain('FROM');
});

// ✅ モックを使用
it('should call save with correct data', async () => {
  const mockDatabase = vi.fn();
  const service = new Service(mockDatabase);
  
  await service.save(data);
  expect(mockDatabase).toHaveBeenCalledWith(data);
});

// ✅ 時間をモック
it('should return current timestamp', () => {
  const fixedTime = new Date('2023-01-01').getTime();
  vi.spyOn(Date, 'now').mockReturnValue(fixedTime);
  
  const result = service.getCurrentTime();
  expect(result).toBe(fixedTime);
});

// ✅ 独立したテスト
describe('Independent Tests', () => {
  let service: Service;
  
  beforeEach(() => {
    service = new Service();
  });
  
  it('should handle empty input', () => {
    const result = service.process('');
    expect(result).toEqual(EMPTY_RESULT);
  });
  
  it('should handle valid input', () => {
    const result = service.process('valid input');
    expect(result).toEqual(EXPECTED_RESULT);
  });
});
```

## デバッグとトラブルシューティング

### テスト失敗時の調査手順
```typescript
// デバッグ用のログ出力
it('should process complex query', async () => {
  const command = new ProcessQueryCommand(complexSql);
  
  // デバッグ情報を出力
  console.log('Input SQL:', complexSql);
  console.log('Command state:', command.getState());
  
  const result = await command.execute();
  
  console.log('Result:', result);
  expect(result.success).toBe(true);
});

// モックの呼び出し履歴を確認
it('should call dependencies in correct order', async () => {
  await service.execute();
  
  expect(mockParser.parse).toHaveBeenCalledBefore(mockValidator.validate);
  expect(mockValidator.validate).toHaveBeenCalledBefore(mockExecutor.execute);
});
```

### 非同期テストのデバッグ
```typescript
it('should handle async operations', async () => {
  const promise = service.asyncOperation();
  
  // Promiseの状態を確認
  expect(promise).toBeInstanceOf(Promise);
  
  const result = await promise;
  expect(result).toBeDefined();
});

// タイムアウトの設定
it('should complete within timeout', async () => {
  const result = await service.longRunningOperation();
  expect(result).toBeDefined();
}, 10000); // 10秒タイムアウト
```

## 品質チェックリスト

### プルリクエスト前の確認事項
- [ ] 新規追加したビジネスロジックに単体テストを追加
- [ ] カバレッジが90%以上を維持
- [ ] すべてのテストが独立して実行可能
- [ ] モックが適切に使用されている
- [ ] テスト名が振る舞いを表現している
- [ ] AAA（Arrange-Act-Assert）パターンに従っている
- [ ] 実装詳細ではなく振る舞いをテストしている
- [ ] 非同期処理が適切にテストされている

### 定期的なメンテナンス
- **月次**: テスト実行時間を計測し、30秒以内を維持
- **四半期**: 不要になったテストの削除
- **半年**: テストヘルパーとモックファクトリの見直し

## 更新履歴
- 2025-01-27: 初版作成
- 2025-01-27: Vitestの使用を明記、Jest関数をVitest関数に更新
# TypeScript開発ルール

このドキュメントは、zosqlプロジェクトにおけるTypeScript開発の標準ルールを定義します。

## 基本原則

### 型安全性の徹底
- **すべてのコードに型定義を必須とする**
- `any`型の使用は原則禁止（やむを得ない場合は`// @ts-ignore`とコメントで理由を明記）
- `unknown`型を使用し、型ガードで安全に絞り込む

### ファイルサイズ制限
- **推奨: 500行以内**
- **上限: 1000行**（コメント除く）
- 上限を超える場合は責任ごとにファイルを分割

### エラーハンドリング原則
- **指示されない限りフォールバックをしない**
- エラーは適切に伝播させ、呼び出し元で処理する
- デフォルト値への自動フォールバックは避ける

### モジュール読み込み規則
- **動的import（`await import()`）は使用禁止**
- **理由**: GitHub Pagesなどの静的ホスティング環境では動的importが正しく動作しない可能性があるため
- すべてのモジュールは静的import（`import ... from`）を使用する
- 条件付きモジュール読み込みが必要な場合は、事前に全モジュールをimportし、実行時に選択する

## コーディング規約

### 命名規則
```typescript
// インターフェース: PascalCase + 接頭辞なし
interface User {
  id: string;
  name: string;
}

// 型エイリアス: PascalCase
type UserId = string;
type QueryResult = Record<string, unknown>;

// クラス: PascalCase
class UserService {
  // プライベートメンバー: アンダースコア接頭辞
  private _users: User[] = [];
  
  // パブリックメソッド: camelCase
  public getUser(id: UserId): User | undefined {
    return this._users.find(u => u.id === id);
  }
}

// 関数: camelCase
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// 定数: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT_MS = 5000;

// Enum: PascalCase（値はUPPER_SNAKE_CASE）
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  ERROR = 'ERROR'
}
```

### インポート順序
```typescript
// 1. Node.js組み込みモジュール
import fs from 'fs';
import path from 'path';

// 2. 外部ライブラリ
import React from 'react';
import { z } from 'zod';

// 3. 内部モジュール（エイリアス使用）
import { User } from '@core/entities/user';
import { useAuth } from '@ui/hooks/useAuth';

// 4. 相対パス（同一ディレクトリ）
import { formatDate } from './utils';
import type { LocalConfig } from './types';
```

### 型定義のベストプラクティス

#### 1. インターフェース vs 型エイリアス
```typescript
// ✅ オブジェクトの形状定義にはインターフェース
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

// ✅ ユニオン型、交差型、プリミティブ型のエイリアスには型エイリアス
type Status = 'pending' | 'active' | 'inactive';
type Id = string | number;
type ExtendedUser = User & { role: string };
```

#### 2. Readonly修飾子の活用
```typescript
// ✅ 不変性を保証
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}

// ✅ ReadonlyArrayの使用
function processItems(items: ReadonlyArray<Item>): void {
  // items.push() はコンパイルエラー
}
```

#### 3. 厳密な型付け
```typescript
// ❌ 避けるべき: 曖昧な型
function process(data: any): void { }

// ✅ 推奨: 厳密な型
function process(data: unknown): void {
  if (isValidData(data)) {
    // 型安全に処理
  }
}

// 型ガード関数
function isValidData(data: unknown): data is ValidData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  );
}
```

## アーキテクチャルール

### SQL処理の標準化
- **SQL解析には必ずrawsql-tsを使用する**
- 正規表現による独自のSQL解析実装は禁止
- SQL文字列の直接操作は避け、ASTベースの操作を行う
- **SQLモデルからstringへの変換にはrawsql-tsのSqlFormatterを使用する**
- **WorkspaceのFormatterスタイル設定を再利用する**

```typescript
// ✅ 正しい実装
import { 
  SelectQueryParser, 
  SqlFormatter,
  SelectQuery,  // 型もrawsql-tsからインポート
  FormatterOptions
} from 'rawsql-ts';
import type { Workspace } from '@core/entities/workspace';
import type { FormatterStyle } from '@core/types/formatter-types';

// SQL解析の実装例
export function analyzeSql(sql: string) {
  const query = SelectQueryParser.parse(sql);
  return {
    tables: query.tableList,
    columns: query.columnList,
    conditions: query.whereClause
  };
}

// SQLフォーマットの実装例（Workspaceを引数で受け取る）
export function formatSql(
  query: SelectQuery, 
  workspace: Workspace
): string {
  // WorkspaceのformatterStyleをrawsql-tsのFormatterOptionsに変換
  const options: FormatterOptions = {
    indent: ' '.repeat(workspace.formatterStyle.indentSize),
    uppercase: workspace.formatterStyle.uppercase,
    linesBetweenQueries: workspace.formatterStyle.linesBetweenQueries
  };
  
  const formatter = new SqlFormatter(options);
  return formatter.format(query).formattedSql;
}

// 使用例: コマンドクラス内での実装
export class FormatSqlCommand implements Command<string> {
  constructor(
    private readonly sql: string,
    private readonly workspace: Workspace  // DIやContextから取得
  ) {}
  
  async execute(): Promise<string> {
    const query = SelectQueryParser.parse(this.sql);
    return formatSql(query, this.workspace);
  }
}

// ❌ 禁止された実装: 正規表現でのSQL解析
export function analyzeSqlBad(sql: string) {
  const tableMatch = sql.match(/FROM\s+(\w+)/i);
  const columnMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
  // 独自パーサーの実装は禁止
}

// ❌ 禁止された実装: 文字列結合でのSQL構築
export function buildSqlBad(query: any): string {
  return `SELECT ${query.columns} FROM ${query.table}`;  // 禁止
}
```

### レイヤー分離
```typescript
// ✅ Core層（ビジネスロジック）- 外部依存なし
// src/core/entities/user.ts
export interface User {
  id: string;
  name: string;
}

// src/core/usecases/create-user.ts
export class CreateUserUseCase {
  constructor(private repository: UserRepositoryPort) {}
  
  async execute(data: CreateUserData): Promise<User> {
    // ビジネスロジック
  }
}

// ✅ Adapter層（外部との接続）
// src/adapters/repositories/user-repository.ts
export class UserRepository implements UserRepositoryPort {
  async save(user: User): Promise<void> {
    // 実装
  }
}
```

### 依存性の方向
- Core層は他のレイヤーに依存しない
- Adapter層とUI層はCore層に依存する
- 循環依存は絶対に避ける

## パターンとプラクティス

### MVVMパターン（必須）
すべてのUI実装はMVVMパターンに従い、ビジネスロジックとUIを完全に分離する。

```typescript
// ViewModel（ビジネスロジック）- UIフレームワークに依存しない
export class SqlEditorViewModel extends BaseViewModel {
  private _sql = '';
  private _isExecuting = false;
  
  constructor(
    private readonly commandExecutor: CommandExecutor,
    private readonly workspace: Workspace
  ) {
    super();
  }
  
  get sql() { return this._sql; }
  set sql(value: string) { 
    this._sql = value;
    this.notifyChange('sql');
  }
  
  get canExecute() {
    return this.sql.trim().length > 0 && !this._isExecuting;
  }
  
  async executeQuery() {
    this._isExecuting = true;
    this.notifyChange('canExecute');
    
    try {
      const command = new ExecuteQueryCommand({
        sql: this.sql,
        workspace: this.workspace
      });
      await this.commandExecutor.execute(command);
    } finally {
      this._isExecuting = false;
      this.notifyChange('canExecute');
    }
  }
}

// View（React Component）- ロジックを含まない
export function SqlEditor({ viewModel }: { viewModel: SqlEditorViewModel }) {
  return (
    <div>
      <MonacoEditor 
        value={viewModel.sql}
        onChange={(value) => viewModel.sql = value || ''}
      />
      <button 
        onClick={() => viewModel.executeQuery()}
        disabled={!viewModel.canExecute}
      >
        Execute
      </button>
    </div>
  );
}
```

### コマンドパターン（単体テスト可能性のため必須）
ブラウザでのテストを最小限にするため、すべてのビジネスロジックをコマンドとして実装する。

```typescript
// すべてのコマンドはこのインターフェースを実装
interface Command<T = void> {
  execute(): Promise<T>;
  canExecute(): boolean;
  readonly description?: string;
}

// 実装例（単体テスト可能）
export class FormatSqlCommand implements Command<string> {
  constructor(
    private readonly sql: string,
    private readonly formatterStyle: FormatterStyle
  ) {}
  
  canExecute(): boolean {
    return this.sql.trim().length > 0;
  }
  
  async execute(): Promise<string> {
    const query = SelectQueryParser.parse(this.sql);
    const formatter = new SqlFormatter(this.formatterStyle);
    return formatter.format(query);
  }
  
  get description(): string {
    return 'Format SQL query';
  }
}

// 単体テスト例
describe('FormatSqlCommand', () => {
  it('should format SQL with workspace style', async () => {
    const command = new FormatSqlCommand(
      'SELECT * FROM users WHERE id=1',
      { indentSize: 2, uppercase: true }
    );
    
    expect(command.canExecute()).toBe(true);
    const result = await command.execute();
    expect(result).toContain('SELECT');
    expect(result).toContain('FROM');
  });
});
```

### エラーハンドリング
```typescript
// カスタムエラークラスの定義
class BusinessError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

// エラーハンドリング例
async function executeOperation(): Promise<Result> {
  try {
    return await riskyOperation();
  } catch (error) {
    if (error instanceof BusinessError) {
      // ビジネスエラーの処理
      logger.warn(`Business error: ${error.code}`, error.details);
      throw error;
    }
    
    // 予期しないエラー
    logger.error('Unexpected error', error);
    throw new BusinessError(
      'An unexpected error occurred',
      'UNEXPECTED_ERROR',
      error
    );
  }
}
```

### 非同期処理
```typescript
// ✅ async/awaitを使用
async function fetchData(): Promise<Data> {
  const response = await fetch('/api/data');
  return response.json();
}

// ❌ Promiseチェーンは避ける
function fetchData(): Promise<Data> {
  return fetch('/api/data').then(r => r.json());
}

// ✅ 並列処理にはPromise.allを使用
async function fetchMultiple(): Promise<[Users, Posts]> {
  const [users, posts] = await Promise.all([
    fetchUsers(),
    fetchPosts()
  ]);
  return [users, posts];
}
```

## テストルール

### ユニットテスト
```typescript
// ファイル名: *.test.ts
// 配置: テスト対象と同じディレクトリ or test/ディレクトリ

describe('UserService', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  
  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new UserService(mockRepository);
  });
  
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = { name: 'John', email: 'john@example.com' };
      const expectedUser = { id: '123', ...userData };
      mockRepository.save.mockResolvedValue(expectedUser);
      
      // Act
      const result = await service.createUser(userData);
      
      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockRepository.save).toHaveBeenCalledWith(userData);
    });
    
    it('should throw error when name is empty', async () => {
      // テストケース
    });
  });
});
```

### テスト命名規則
- `should + 動詞 + 条件`の形式
- 日本語での記述も可（チーム内で統一）

### テスト戦略
- **ビジネスロジックは単体テストで100%カバー**
- **ViewModelは単体テストで検証（UIフレームワーク非依存）**
- **コマンドは単体テストで全パターンを検証**
- **ブラウザテストは最小限に留める（統合テストのみ）**

```typescript
// ✅ 推奨: ViewModelの単体テスト（ブラウザ不要）
describe('SqlEditorViewModel', () => {
  let viewModel: SqlEditorViewModel;
  let mockCommandExecutor: jest.Mocked<CommandExecutor>;
  
  beforeEach(() => {
    mockCommandExecutor = createMockCommandExecutor();
    viewModel = new SqlEditorViewModel(mockCommandExecutor, workspace);
  });
  
  it('should enable execute when SQL is not empty', () => {
    viewModel.sql = 'SELECT * FROM users';
    expect(viewModel.canExecute).toBe(true);
  });
  
  it('should disable execute while executing', async () => {
    viewModel.sql = 'SELECT * FROM users';
    const executePromise = viewModel.executeQuery();
    
    expect(viewModel.canExecute).toBe(false);
    await executePromise;
    expect(viewModel.canExecute).toBe(true);
  });
});

// ❌ 避ける: UIコンポーネントの重いテスト
it('should render button when SQL is entered', () => {
  render(<SqlEditor />);
  // ブラウザ環境が必要で遅い
});
```

## 品質保証

### 必須チェック項目
```bash
# TypeScriptコンパイル（エラー0件必須）
tsc --noEmit

# ESLint（警告0件必須）
npm run lint

# テスト実行（全テスト合格必須）
npm run test:run

# フォーマット
npm run format
```

### コードレビューチェックリスト
- [ ] 型定義は適切か（any型を使用していないか）
- [ ] ファイルサイズは制限内か（500行推奨、1000行上限）
- [ ] 命名規則に従っているか
- [ ] エラーハンドリングは適切か
- [ ] テストは十分か（カバレッジ80%以上）
- [ ] ドキュメントコメントは必要な箇所に記載されているか

## 禁止事項

### 絶対に使用してはいけないパターン
```typescript
// ❌ eval()の使用
eval('console.log("危険")');

// ❌ Function()コンストラクタ
new Function('return true');

// ❌ any型の濫用
let data: any = fetchData();

// ❌ 型アサーションの濫用
const user = {} as User;  // 危険

// ❌ @ts-ignoreの濫用
// @ts-ignore
const result = dangerousOperation();

// ❌ !（非null assertion）の濫用
const value = possiblyNull!;  // 危険

// ❌ SQL解析の独自実装
function parseSQL(sql: string) {
  const match = sql.match(/SELECT\s+(.+?)\s+FROM/i);  // 危険
  return match?.[1].split(',');
}

// ❌ 正規表現によるSQL操作
const modifiedSQL = originalSQL.replace(/WHERE .+/, 'WHERE 1=1');  // 危険
```

### 推奨される代替案
```typescript
// ✅ 型ガードを使用
if (isUser(data)) {
  // 安全に使用
}

// ✅ 適切な型定義
const user: Partial<User> = {};

// ✅ nullチェック
if (possiblyNull !== null) {
  const value = possiblyNull;
}

// ✅ SQL解析にはrawsql-tsを使用
import { SelectQueryParser } from 'rawsql-ts';

const query = SelectQueryParser.parse(sql);
const columns = query.columnList.map(col => col.columnName);

// ✅ SQL操作もrawsql-tsで実装
const parsedQuery = SelectQueryParser.parse(originalSQL);
// 構造化されたオブジェクトとして操作
```

## パフォーマンス考慮事項

### メモ化の活用
```typescript
// React コンポーネントでの例
const ExpensiveComponent = React.memo(({ data }: Props) => {
  const processedData = useMemo(
    () => expensiveProcessing(data),
    [data]
  );
  
  return <div>{processedData}</div>;
});
```

### 遅延読み込み
```typescript
// 動的インポートの使用
const HeavyModule = lazy(() => import('./HeavyModule'));
```

## 更新履歴
- 2025-01-27: 初版作成
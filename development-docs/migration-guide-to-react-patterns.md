# React パターン移行ガイドライン

## 概要
このドキュメントは、MVVM + Commandパターンから標準的なReactパターンへの移行ガイドラインです。

## 移行の原則

### 1. 段階的移行
- 動作している機能を壊さない
- 新旧パターンの並行稼働期間を設ける
- Feature Flagによる切り替え

### 2. Reactのベストプラクティス
- Hooks中心の設計
- 単方向データフロー
- 宣言的UI

## パターン変換ガイド

### ViewModel → Custom Hook

#### Before (ViewModel)
```typescript
// viewmodels/ExampleViewModel.ts
export class ExampleViewModel extends BaseViewModel {
  private _data: string = '';
  private _loading: boolean = false;

  get data() { return this._data; }
  get loading() { return this._loading; }

  async loadData() {
    this._loading = true;
    this.notifyPropertyChanged('loading', true);
    
    try {
      const result = await fetchData();
      this._data = result;
      this.notifyPropertyChanged('data', result);
    } finally {
      this._loading = false;
      this.notifyPropertyChanged('loading', false);
    }
  }
}

// components/Example.tsx
const Example = () => {
  const viewModel = useViewModel(ExampleViewModel);
  
  return (
    <div>
      {viewModel.loading && <Spinner />}
      <div>{viewModel.data}</div>
      <button onClick={() => viewModel.loadData()}>Load</button>
    </div>
  );
};
```

#### After (Custom Hook)
```typescript
// hooks/useExample.ts
export const useExample = () => {
  const [data, setData] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchData();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, loadData };
};

// components/Example.tsx
const Example = () => {
  const { data, loading, loadData } = useExample();
  
  return (
    <div>
      {loading && <Spinner />}
      <div>{data}</div>
      <button onClick={loadData}>Load</button>
    </div>
  );
};
```

### Command → Hook Function

#### Before (Command)
```typescript
// commands/SaveCommand.ts
export class SaveCommand implements ICommand {
  constructor(private data: string) {}

  canExecute(): boolean {
    return this.data.trim().length > 0;
  }

  async execute(): Promise<void> {
    await saveData(this.data);
  }
}

// Usage in ViewModel
const command = new SaveCommand(this.data);
if (command.canExecute()) {
  await command.execute();
}
```

#### After (Hook Function)
```typescript
// hooks/useSave.ts
export const useSave = () => {
  const save = useCallback(async (data: string) => {
    if (data.trim().length === 0) {
      throw new Error('Data is required');
    }
    await saveData(data);
  }, []);

  const canSave = useCallback((data: string) => {
    return data.trim().length > 0;
  }, []);

  return { save, canSave };
};
```

## 状態管理パターン

### 単純な状態: useState
```typescript
const [value, setValue] = useState(initialValue);
```

### 複雑な状態: useReducer
```typescript
const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, data: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

const [state, dispatch] = useReducer(reducer, initialState);
```

### グローバル状態: Context API
```typescript
const AppContext = createContext<AppState | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};
```

## パフォーマンス最適化

### メモ化
```typescript
// 計算結果のメモ化
const computedValue = useMemo(() => {
  return expensiveComputation(data);
}, [data]);

// 関数のメモ化
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// コンポーネントのメモ化
const MemoizedComponent = memo(Component);
```

## テスト戦略

### Custom Hookのテスト
```typescript
import { renderHook, act } from '@testing-library/react-hooks';

test('useExample hook', async () => {
  const { result } = renderHook(() => useExample());
  
  expect(result.current.data).toBe('');
  expect(result.current.loading).toBe(false);
  
  await act(async () => {
    await result.current.loadData();
  });
  
  expect(result.current.data).toBe('expected data');
});
```

## 移行チェックリスト

### Phase 0: 準備
- [ ] 既存テストの確認
- [ ] 型定義の整理
- [ ] 依存関係の確認

### Phase 1: Hook移行
- [ ] ViewModelの分析
- [ ] Custom Hook作成
- [ ] 並行稼働テスト
- [ ] 旧コード削除

### Phase 2: Command簡素化
- [ ] Command分析
- [ ] Hook関数作成
- [ ] テスト追加

### Phase 3: 状態管理
- [ ] Context設計
- [ ] グローバル状態移行
- [ ] 最適化実施

## よくある質問

### Q: ViewModelのプロパティ監視はどうする？
A: useEffectで依存配列を使用して監視します。

### Q: DIコンテナはどうなる？
A: Context APIとProvider patternで代替します。

### Q: MobXの代わりは？
A: useState, useReducer, Context APIの組み合わせで実現します。

## 参考リンク
- [React Hooks Documentation](https://react.dev/reference/react)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Kent C. Dodds - Application State Management](https://kentcdodds.com/blog/application-state-management-with-react)
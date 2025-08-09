# React Best Practices

Core React patterns for hooks and state.

## Hook Patterns

### useState
```typescript
// Minimal state + derived values
function ShoppingCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const updateItem = (id: string, quantity: number) => 
    setItems(prev => prev.map(item => item.id === id ? {...item, quantity} : item));
}
```

### useEffect
```typescript
// Data fetching with cleanup
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let cancelled = false;
    getUserById(userId).then(data => !cancelled && setUser(data));
    return () => { cancelled = true; };
  }, [userId]);
}
```

### Performance Hooks
```typescript
// useMemo for expensive calculations
const expensiveValue = useMemo(() => 
  items.filter(item => item.isActive).reduce((sum, item) => sum + item.total, 0), [items]);

// useCallback for stable references  
const handleToggle = useCallback((id: string) => {/* logic */}, []);
```

## Functional Programming Core

### Function over Class
```typescript
// Use hooks instead of classes
const useSqlEditor = () => {
  const [sql, setSql] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  
  const executeSql = useCallback(async () => {
    setIsExecuting(true);
    try {
      return await executeQuery(sql);
    } finally {
      setIsExecuting(false);
    }
  }, [sql]);
  
  return { sql, setSql, executeSql, isExecuting };
};
```

### Pure State Updates
```typescript
// useReducer for complex state
type State = { isLoading: boolean; data: string | null; error: string | null };
type Action = 
  | { type: 'START' }
  | { type: 'SUCCESS'; payload: string }
  | { type: 'ERROR'; payload: string };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'START': return { ...state, isLoading: true, error: null };
    case 'SUCCESS': return { ...state, isLoading: false, data: action.payload };
    case 'ERROR': return { ...state, isLoading: false, error: action.payload };
  }
};
```

### Immutable Updates
```typescript
// Create new objects/arrays instead of mutating
const addItem = (items: Item[], newItem: Item) => [...items, newItem];
const updateItem = (items: Item[], id: string, updates: Partial<Item>) =>
  items.map(item => item.id === id ? { ...item, ...updates } : item);
```

### Function Composition
```typescript
// Compose pure functions in hooks
const validateSql = (sql: string): boolean => sql.trim().length > 0;
const formatSql = (sql: string): string => sql.trim().toUpperCase();

const useSqlProcessor = (sql: string) => {
  const isValid = useMemo(() => validateSql(sql), [sql]);
  const formatted = useMemo(() => formatSql(sql), [sql]);
  return { isValid, formatted };
};
```

## Component Structure
```typescript
// Function components with TypeScript
interface Props {
  title: string;
  onSubmit: (value: string) => void;
}

function MyComponent({ title, onSubmit }: Props) {
  const [value, setValue] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(value); }}>
      <h1>{title}</h1>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
    </form>
  );
}
```

## Key Rules
- **Prefer hooks over classes** - Use function components with hooks
- **Calculate derived state** - Don't store what can be computed
- **Immutable updates** - Create new objects instead of mutating
- **Pure functions** - Separate side effects from business logic
- **Cleanup effects** - Always cleanup subscriptions and async operations
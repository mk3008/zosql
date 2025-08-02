# React Best Practices

Core React patterns for hooks and state.

## useState Patterns
- Minimal state, calculate derived values
- Group related state, use functional updates
- Avoid stale closures with functional setters

```typescript
// State grouping + derived values
function ShoppingCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const updateItem = (id: string, quantity: number) => 
    setItems(prev => prev.map(item => item.id === id ? {...item, quantity} : item));
}
```

## useEffect Patterns
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

// Event listeners
function WindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const updateSize = () => setSize({width: window.innerWidth, height: window.innerHeight});
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
}
```

## Performance Patterns
```typescript
// useMemo for expensive calculations
function ExpensiveComponent({ items }: { items: Item[] }) {
  const expensiveValue = useMemo(() => 
    items.filter(item => item.isActive).reduce((sum, item) => sum + item.complexCalculation(), 0)
  , [items]);
}

// useCallback for stable references
function TodoList({ todos }: { todos: Todo[] }) {
  const [filter, setFilter] = useState('all');
  const handleToggle = useCallback((id: string) => {/* toggle logic */}, []);
  const filteredTodos = useMemo(() => todos.filter(/* filter logic */), [todos, filter]);
}
```

## Component Patterns
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

## Anti-Patterns
```typescript
// Bad: Redundant state
const [users, setUsers] = useState([]);
const [userCount, setUserCount] = useState(0); // Calculate instead!

// Bad: Object mutation
user.name = 'New Name'; setUser(user); // Create new object instead!

// Good: Immutable updates
setUser({ ...user, name: 'New Name' });
```
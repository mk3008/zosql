# Common TypeScript Patterns

Essential TypeScript patterns for zosql.

## Interface vs Type Usage
```typescript
// Interfaces for object shapes
interface UserProfile { id: string; name: string; email: string; }

// Type aliases for unions, intersections, primitives
type Status = 'pending' | 'active' | 'inactive';
type ExtendedUser = User & { role: string };
```

## Type Safety Patterns
```typescript
// Use unknown instead of any, with type guards
function processData(data: unknown): string {
  if (isValidData(data)) return data.someProperty;
  throw new Error('Invalid data');
}

function isValidData(data: unknown): data is { someProperty: string } {
  return typeof data === 'object' && data !== null && 
         'someProperty' in data && typeof (data as any).someProperty === 'string';
}
```

## Additional Patterns
```typescript
// Readonly for immutability
interface Config { readonly apiUrl: string; readonly timeout: number; }
function processItems(items: ReadonlyArray<Item>): void { /* items.push() is compile error */ }

// Generic constraints
interface Repository<TEntity extends BaseEntity> {
  save(entity: TEntity): Promise<void>;
  findById(id: string): Promise<TEntity | null>;
}

// Utility types
type CreateUserData = Omit<User, 'id' | 'createdAt'>;
type UpdateUserData = Partial<Pick<User, 'name' | 'email'>>;

// Result pattern: See rules/architecture-principles.md for error handling patterns
```
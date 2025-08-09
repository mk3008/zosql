# Architecture Principles

## Use Functional Programming with Hexagonal Architecture
**Why**: Pure functions and immutable data create predictable, testable code. Hexagonal architecture isolates business logic from external dependencies.

### Implement Layered Architecture
**Why**: Clear separation prevents coupling and makes code easier to maintain and test.
**How**:
```
UI Layer (React) → Services Layer (Functions) → Domain Layer (Entities/Ports) → Infrastructure Layer (Adapters)
API Layer → Services Layer → Domain Layer → Infrastructure Layer
```

### Follow Inward Dependency Rule
**Why**: Dependencies pointing inward keeps business logic independent of external frameworks and databases.
**How**:
- Adapters depend on Core
- UI depends on Core  
- Core remains independent of Adapters and UI

### Use Pure Functions for Business Logic
**Why**: Pure functions are predictable, testable, and have no side effects, making debugging easier.
**How**:
```typescript
// Service: Pure business logic
export const createUser = async (
  data: CreateUserData,
  repository: UserRepositoryPort
): Promise<User> => {
  const user: User = { id: generateId(), ...data };
  await repository.save(user);
  return user;
};
```

### Define Ports as Function Interfaces
**Why**: Function interfaces are simpler than class interfaces and promote functional composition.
**How**:
```typescript
export type UserRepositoryPort = {
  save: (user: User) => Promise<void>;
  findById: (id: string) => Promise<User | null>;
};
```

### Use Readonly Types for Immutable Data
**Why**: Immutable data prevents accidental mutations and makes state changes explicit and predictable.
**How**:
```typescript
export interface User {
  readonly id: string;
  readonly name: string;
}

// Updates create new objects
const updatedUsers = [...users, newUser];
```

### Pass Dependencies as Function Parameters
**Why**: Makes dependencies explicit and enables easy testing and mocking.
**How**:
```typescript
export const workspaceService = {
  calculateDependencies: (models: SqlModel[]): Map<string, number> => {
    // Pure function - testable without external dependencies
  }
};
```

### Group Related Functions in Service Objects  
**Why**: Service objects organize related business logic and provide clear API boundaries.
**How**:
```typescript
export const workspaceService = {
  calculateModelDependencies: (models: readonly SqlModel[]): Map<string, number> => {
    // Pure dependency calculation logic
  },
  
  filterModelsByName: (models: readonly SqlModel[], searchTerm: string): readonly SqlModel[] => {
    return models.filter(model => model.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }
};
```

### Use Result Pattern for Error Handling
**Why**: Explicit error handling without exceptions makes error states visible in the type system.
**How**:
```typescript
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const parseSQL = (sqlText: string): Result<ParsedSQL, string> => {
  try {
    const parsed = rawsqlParser.parse(sqlText);
    return { success: true, data: parsed };
  } catch (error) {
    return { success: false, error: `SQL parsing failed: ${error.message}` };
  }
};
```

### Test Pure Functions Directly
**Why**: Pure functions are easy to test with predictable inputs and outputs, no mocking required.
**How**:
```typescript
it('should calculate dependency depths', () => {
  const models = [
    { name: 'root', dependencies: ['session_data'] },
    { name: 'session_data', dependencies: [] }
  ];
  
  const result = workspaceService.calculateModelDependencies(models);
  expect(result.get('session_data')).toBe(0);
  expect(result.get('root')).toBe(1);
});
```
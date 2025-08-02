# Development Patterns

Essential TypeScript design patterns and restrictions.

## Fallback Logic Prohibition (CRITICAL)

**NO fallbacks without explicit business justification.**

### FORBIDDEN Patterns
```typescript
// Silent defaults hide errors
const data = getData() || [];
if (!result) return defaultValue;
```

### REQUIRED Pattern
```typescript
const data = getData();
if (!data) {
  // FALLBACK JUSTIFICATION: API timeout, show cached data
  // Business: Keep UI responsive during outages
  // Risk: Stale data, user notified via toast
  logger.warn('Using cached data due to API timeout');
  return getCachedData();
}
```

**Enforcement**: Missing justification = automatic code rejection.

## Core Patterns

```typescript
// MVVM: Separate UI from business logic
class SqlEditorViewModel extends BaseViewModel {
  private _sql = '';
  get sql() { return this._sql; }
  set sql(value: string) { this._sql = value; this.notifyChange('sql'); }
}

// Command: Encapsulate operations
interface Command<T> { execute(): Promise<T>; canExecute(): boolean; }
class ExecuteQueryCommand implements Command<QueryResult> {
  canExecute() { return this.sql.trim().length > 0; }
  async execute() { return await this.executor.execute(this.sql); }
}

// Repository: Data access abstraction
interface WorkspaceRepository {
  save(workspace: Workspace): Promise<void>;
  findById(id: string): Promise<Workspace | null>;
}

// Result: Type-safe error handling
type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };
```
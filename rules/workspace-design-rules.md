# Workspace-Centric Design Rules

## Always Pass Workspace as Function Parameter
**Why**: Workspace context provides configuration, schema, and state needed for all operations. Global operations without context are untestable and unpredictable.
**How**:
```typescript
// Pass workspace to all operations
export const executeSql = async (sql: string, workspace: WorkspaceEntity): Promise<QueryResult> => {
  const formattedSql = formatWithWorkspaceSettings(sql, workspace);
  return executeWithValidation(formattedSql, workspace);
};

// Service functions with workspace context
export const workspaceService = {
  formatSql: (sql: string, workspace: WorkspaceEntity): string => {
    return formatSqlWithSettings(sql, workspace.formatter.config);
  },
  
  validateSql: (sql: string, workspace: WorkspaceEntity): ValidationResult => {
    return validateAgainstWorkspaceSchema(sql, workspace.schema);
  }
};
```

## Use Workspace Entity for All Configuration
**Why**: Centralized configuration makes operations consistent and predictable across the application.
**How**: Access workspace properties for:
- `workspace.models` - SQL model definitions
- `workspace.schema` - Database schema information  
- `workspace.formatter.config` - Formatting settings

## Test Operations with Mock Workspace
**Why**: Workspace dependency injection enables easy testing with predictable configurations.
**How**:
```typescript
const mockWorkspace: WorkspaceEntity = {
  name: 'test-workspace',
  models: [],
  schema: {},
  formatter: { config: '{}' }
};

it('should format SQL with workspace settings', () => {
  const result = formatSql('select * from users', mockWorkspace);
  expect(result).toContain('SELECT');
});
```
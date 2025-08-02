# Workspace-Centric Design Rules

All operations must use workspace context.

## Workspace Context Requirement (MANDATORY)
```typescript
// Required: Pass workspace to all operations
export class SqlExecutor {
  constructor(private workspace: Workspace) {}
  
  async execute(sql: string): Promise<QueryResult> {
    // Use workspace settings for formatting, validation, etc.
    const formattedSql = this.formatWithWorkspaceSettings(sql);
    return this.executeWithValidation(formattedSql);
  }
}

// Forbidden: Global operations without workspace context
export function globalSqlFormat(sql: string): string {
  // Missing workspace context - FORBIDDEN
}
```

## Directory Structure
```
src/
├── core/
│   ├── entities/
│   │   ├── workspace.ts          # Core workspace entity
│   │   ├── sql-query.ts         # SQL query representations
│   │   └── filter-conditions.ts # Query filtering logic
│   ├── usecases/
│   │   ├── sql-decomposer-usecase.ts  # CTE decomposition
│   │   └── workspace-management-usecase.ts
│   └── commands/
│       ├── execute-query-command.ts   # Query execution
│       └── format-sql-command.ts      # SQL formatting
├── adapters/
│   ├── sql/
│   │   └── pglite-executor.ts    # PGlite integration
│   ├── parsers/
│   │   └── rawsql-adapter.ts     # rawsql-ts integration
│   └── storage/
│       └── workspace-repository.ts
└── ui/
    ├── components/
    │   ├── sql-editor/           # Monaco Editor integration
    │   └── workspace-panel/      # Workspace management
    └── viewmodels/
        ├── sql-editor-viewmodel.ts
        └── workspace-viewmodel.ts
```
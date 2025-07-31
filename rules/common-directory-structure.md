# Common Directory Structure

Standard directory structure for zosql TypeScript projects.

## Standard Project Layout

```
src/
├── core/                    # Domain Layer (Business Logic)
│   ├── entities/           # Domain entities (<200 lines/file)
│   ├── usecases/          # Business use cases (<300 lines/file)
│   ├── commands/          # Command pattern implementations
│   ├── services/          # Domain services
│   └── ports/             # Interfaces for external dependencies
├── adapters/              # Infrastructure Layer
│   ├── storage/          # LocalStorage implementations
│   ├── sql/              # PGlite SQL executor
│   ├── parsers/          # rawsql-ts integration
│   └── repositories/     # Data access implementations
├── ui/                   # Presentation Layer
│   ├── components/       # React components (<200 lines/file)
│   ├── hooks/           # Custom hooks (<150 lines/file)
│   ├── viewmodels/      # MVVM ViewModels
│   └── context/         # React Context providers
├── shared/              # Shared utilities and types
│   ├── types/          # Shared type definitions
│   └── utils/          # Helper functions
└── di/                 # Dependency Injection
    └── container.ts    # DI container configuration
```

## zosql-Specific Structure

```
src/
├── core/
│   ├── entities/
│   │   ├── workspace.ts           # Workspace entity
│   │   ├── sql-query.ts          # SQL query representations
│   │   └── filter-conditions.ts  # Query filtering logic  
│   ├── usecases/
│   │   ├── sql-decomposer-usecase.ts  # CTE decomposition
│   │   └── sql-composer-usecase.ts    # SQL composition
│   └── commands/
│       ├── execute-query-command.ts   # Query execution
│       └── format-sql-command.ts      # SQL formatting
├── adapters/
│   ├── sql/
│   │   └── pglite-executor.ts     # PGlite integration
│   └── parsers/
│       └── rawsql-adapter.ts      # rawsql-ts integration
└── ui/
    ├── components/
    │   ├── sql-editor/             # Monaco Editor integration
    │   └── workspace-panel/        # Workspace management
    └── viewmodels/
        ├── sql-editor-viewmodel.ts     # Editor logic
        └── workspace-viewmodel.ts      # Workspace logic
```

## Layer Responsibilities

- **Core Layer**: Business logic, entities, use cases (no external dependencies)
- **Adapters Layer**: External integrations, data persistence, API calls
- **UI Layer**: React components, ViewModels, user interaction
- **Shared Layer**: Common utilities, types, helper functions

## File Size Guidelines

- **Recommended**: 500 lines per file
- **Maximum**: 1000 lines per file (excluding comments)
- Split files by responsibility when exceeding limits
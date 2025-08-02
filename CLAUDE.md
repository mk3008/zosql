# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**zosql** is a SQL decomposition and composition tool that enables debugging and modularization of Complex Common Table Expressions (CTEs). The application is designed to be deployed on GitHub Pages as a static React SPA with WASM Postgres for in-browser SQL execution.

### Key Goals
- Enable CTE debugging through decomposition into testable units
- Provide SQL composition from modular CTE files
- Maintain 100% SQL compatibility for existing tooling

## Common Development Commands

```bash
# Development
npm run dev                 # Start development server (port 3000)
npm run build              # Build for production
npm run build:github       # Build for GitHub Pages deployment

# Testing
npm run test               # Run tests in watch mode
npm run test:run           # Run tests once
npm run test:ui            # Run tests with UI

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix          # Run ESLint with auto-fix
tsc --noEmit              # Type checking only

# Preview
npm run preview           # Preview production build
```

## Architecture

### **Core Design Philosophy**
- **Hexagonal Architecture (Ports & Adapters)**: Complete separation of core business logic from external dependencies
- **Modular Monolith**: Feature-based module separation for maintainability
- **TypeScript-First**: Complete type safety to prevent runtime errors
- **Test-Driven Development**: Quality assurance for core logic
- **Component-Based UI**: Declarative UI construction with React/TypeScript
- **Command Pattern**: Separation of UI events and business logic for testability
- **MVVM Pattern (Passive View)**: UI handles only display and binding, logic concentrated in ViewModel/Model

### **Technical Requirements**
- **GitHub Pages**: Static site hosting (no backend server required)
- **WASM Postgres**: In-browser SQL execution environment via PGlite
- **rawsql-ts**: SQL parsing, CTE dependency analysis, composition, and formatting
- **React + TypeScript**: Modern UI library for declarative components
- **LocalStorage**: Client-side data persistence

### **Development Guidelines**
- **Complete TypeScript**: Type safety for all code
- **File Size Limits**: 500 lines recommended, 1000 lines maximum (excluding comments)
- **TDD Practice**: Test-driven development for core logic
- **Layer Separation**: Clear separation of UI, business logic, and infrastructure
- **Unit Test Focus**: Thorough testing of business logic

### **Directory Structure**
```
src/
├── core/                    # Domain Layer (Business Logic)
│   ├── entities/           # Domain entities (<200 lines/file)
│   ├── usecases/           # Business use cases (<300 lines/file)
│   ├── commands/           # Command pattern implementations
│   ├── services/           # Domain services
│   └── ports/              # Interfaces for external dependencies
├── adapters/               # Infrastructure Layer
│   ├── storage/            # LocalStorage implementations
│   ├── sql/                # PGlite SQL executor
│   ├── parsers/            # rawsql-ts integration
│   └── repositories/       # Data access implementations
├── ui/                     # Presentation Layer (React)
│   ├── components/         # UI components (<200 lines/file)
│   ├── hooks/              # Custom hooks (<150 lines/file)
│   ├── viewmodels/         # MVVM pattern ViewModels
│   └── context/            # React Context providers
└── shared/                 # Shared types and utilities
    ├── types/              # Type definitions
    └── utils/              # Helper functions
```

## Key Technologies

- **rawsql-ts**: SQL parsing and manipulation → See `rules/sql-processing-rules.md`
- **PGlite**: In-browser SQL execution → See `rules/sql-processing-rules.md`
- **Monaco Editor**: SQL editing → See `rules/monaco-editor-rules.md`
- **Zustand**: State management
- **DI Container**: Located in `src/core/di/container.ts`

## Development Patterns

### **Command Pattern**
All business operations follow the Command Pattern:

```typescript
interface Command<T = void> {
  execute(): Promise<T>;
  canExecute(): boolean;
  readonly description?: string;
}

class ExecuteQueryCommand extends BaseCommand<QueryExecutionResult> {
  constructor(private readonly context: ExecuteQueryContext) {
    super('Execute SQL Query');
  }
  
  canExecute(): boolean {
    return this.context.tabContent.trim().length > 0;
  }
  
  async execute(): Promise<QueryExecutionResult> {
    // Business logic implementation
  }
}
```

### **MVVM Pattern**
UI components use ViewModels for business logic separation:

```typescript
// ViewModel (pure logic)
class SqlEditorViewModel extends BaseViewModel {
  private _sql = '';
  
  get sql() { return this._sql; }
  set sql(value: string) { 
    this._sql = value;
    this.notifyChange('sql');
  }
  
  async executeQuery() {
    const command = new ExecuteQueryCommand({ sql: this.sql });
    await this.commandExecutor.execute(command);
  }
}

// View (React component - logic-free)
function SqlEditor({ viewModel }: { viewModel: SqlEditorViewModel }) {
  return (
    <MonacoEditor 
      value={viewModel.sql}
      onChange={(value) => viewModel.sql = value}
    />
  );
}
```

## Testing Strategy

See `rules/testing-standards.md` for comprehensive testing guidelines including React component testing rules, Context Provider requirements, and business logic testing patterns.

## Configuration and Deployment

### **Environment Configuration**
Configuration is managed through `zosql.config.json`:

```json
{
  "logging": {
    "enabled": true,
    "console": true,
    "intellisense": true,
    "query": true,
    "logLevel": "debug"
  },
  "server": {
    "port": 3000,
    "host": "localhost"
  }
}
```

### **Path Aliases**
The project uses TypeScript path aliases:
- `@/` → `./src/`
- `@core/` → `./src/core/`
- `@adapters/` → `./src/adapters/`
- `@ui/` → `./src/ui/`
- `@shared/` → `./src/shared/`

### **GitHub Pages Deployment**
- Build target: `docs/` directory
- Run `npm run build:github` for GitHub Pages deployment
- Vite configuration handles static asset optimization

## Logging System

Debug logging to `.tmp/` directory:
- `.tmp/debug.log` - General application logs
- `.tmp/error.log` - Error logs
- `.tmp/intellisense.log` - IntelliSense-specific logs
- `.tmp/query.log` - Query execution logs

Control logging with environment variables:
```bash
ZOSQL_LOG_ENABLED=false           # Disable all logging
ZOSQL_LOG_CONSOLE=false          # Disable console output only
ZOSQL_LOG_INTELLISENSE=false     # Disable IntelliSense logs only
ZOSQL_LOG_QUERY=false            # Disable query logs only
ZOSQL_LOG_LEVEL=error            # Set log level
```

## Quality Gates

See `rules/quality-gates.md` for complete quality standards and validation requirements.

### **Project-Specific Commands**
```bash
# Essential pre-push validation (matches GitHub Actions)
npm run ci:essential      # TypeScript + ESLint
npm run ci:check          # TypeScript + ESLint + Tests  
npm run ci:full           # TypeScript + ESLint + Tests + Build

# Development workflow
npm run quality           # Full quality checks for development
npm run quality:fix       # Auto-fix ESLint issues, then typecheck
```

## Legacy Information

Legacy JavaScript implementation is preserved in `backup-old-implementation/` for reference, including Shadow DOM-based UI components and original workspace service implementation. The current implementation has migrated to React + TypeScript with hexagonal architecture.
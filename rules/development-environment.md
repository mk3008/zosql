# Development Environment Rules

Comprehensive development environment setup and configuration rules for zosql.

## Common Development Commands

### Development
```bash
npm run dev                 # Start development server (port 3000)
npm run build              # Build for production
npm run build:github       # Build for GitHub Pages deployment
npm run preview           # Preview production build
```

### Testing
```bash
npm run test               # Run tests in watch mode
npm run test:run           # Run tests once
npm run test:ui            # Run tests with UI
```

### Code Quality
```bash
npm run lint               # Run ESLint
npm run lint:fix          # Run ESLint with auto-fix
tsc --noEmit              # Type checking only
```

### Quality Gates - Project-Specific Commands
```bash
# Essential pre-push validation (matches GitHub Actions)
npm run ci:essential      # TypeScript + ESLint
npm run ci:check          # TypeScript + ESLint + Tests  
npm run ci:full           # TypeScript + ESLint + Tests + Build

# Development workflow
npm run quality           # Full quality checks for development
npm run quality:fix       # Auto-fix ESLint issues, then typecheck
```

## Configuration

### Environment Configuration
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

### Path Aliases
The project uses TypeScript path aliases:
- `@/` → `./src/`
- `@core/` → `./src/core/`
- `@adapters/` → `./src/adapters/`
- `@ui/` → `./src/ui/`
- `@shared/` → `./src/shared/`

### GitHub Pages Deployment
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

## Key Technologies Integration

- **rawsql-ts**: SQL parsing and manipulation → See `rules/sql-processing-rules.md`
- **PGlite**: In-browser SQL execution → See `rules/sql-processing-rules.md`
- **Monaco Editor**: SQL editing → See `rules/monaco-editor-rules.md`
- **Zustand**: State management
- **DI Container**: Located in `src/core/di/container.ts`

## Legacy Information

Legacy JavaScript implementation is preserved in `backup-old-implementation/` for reference, including Shadow DOM-based UI components and original workspace service implementation. The current implementation has migrated to React + TypeScript with hexagonal architecture.
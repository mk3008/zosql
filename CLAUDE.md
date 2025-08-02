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

- **Architecture principles**: See `rules/architecture-principles.md`
- **Directory structure**: See `rules/common-directory-structure.md`

## Key Technologies

- **rawsql-ts**: SQL parsing and manipulation → See `rules/sql-processing-rules.md`
- **PGlite**: In-browser SQL execution → See `rules/sql-processing-rules.md`
- **Monaco Editor**: SQL editing → See `rules/monaco-editor-rules.md`
- **Zustand**: State management
- **DI Container**: Located in `src/core/di/container.ts`

## Development Patterns

- **Development patterns**: See `rules/development-patterns.md`

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
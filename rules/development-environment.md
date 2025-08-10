# Development Environment Rules

## Essential Commands

### Development & Build
- `npm run dev` - Start dev server (port 3000)
- `npm run build` - Production build  
- `npm run build:github` - GitHub Pages build
- `npm run preview` - Preview production build

### Testing & Quality
- `npm run test` / `test:run` / `test:ui` - Testing options
- `npm run lint` / `lint:fix` - ESLint checks
- `tsc --noEmit` - Type checking only

### Quality Gates (matches CI)
- `npm run ci:essential` - TypeScript + ESLint
- `npm run ci:check` - Essential + Tests
- `npm run ci:full` - Check + Build
- `npm run quality` / `quality:fix` - Development workflow

## Configuration

### Environment Config (`zosql.config.json`)
- **Logging**: Controls debug output to `.tmp/` directory
- **Server**: Port (3000) and host settings

### Path Aliases  
- `@/` → `./src/`, `@core/` → `./src/core/`, `@adapters/` → `./src/adapters/`
- `@ui/` → `./src/ui/`, `@shared/` → `./src/shared/`

### GitHub Pages
- Build target: `docs/` directory
- Use `npm run build:github` for deployment

### Logging System
- **Files**: `.tmp/debug.log`, `.tmp/error.log`, `.tmp/intellisense.log`, `.tmp/query.log`
- **Control**: Environment variables `ZOSQL_LOG_ENABLED`, `ZOSQL_LOG_CONSOLE`, etc.

### Key Technologies
- **rawsql-ts** + **PGlite**: SQL processing → See `rules/sql-processing-rules.md`
- **Monaco Editor**: SQL editing → See `rules/monaco-editor-rules.md`  
- **Zustand**: State management
- **DI Container**: `src/core/di/container.ts`

### Legacy
JavaScript implementation preserved in `backup-old-implementation/` for reference. Current implementation uses React + TypeScript with hexagonal architecture.
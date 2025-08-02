# Project Overview - zosql

Overview of the zosql project, goals, and technical stack.

## Project Description

**zosql** is a SQL decomposition and composition tool for debugging and modularizing Complex Common Table Expressions (CTEs). Deployed as a static React SPA on GitHub Pages with WASM Postgres for in-browser SQL execution.

### Key Features
- **CTE Decomposition**: Break down complex SQL queries into testable units
- **SQL Composition**: Build SQL from modular CTE files
- **In-Browser Execution**: Run SQL using WASM Postgres
- **100% SQL Compatibility**: Works with existing SQL tooling

### Target Users
- SQL developers working with complex queries
- Data engineers debugging CTEs
- Teams modularizing and testing SQL code

## Technical Stack

### Core Technologies
- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **SQL Engine**: PGlite (WASM Postgres)
- **SQL Parser**: rawsql-ts
- **Editor**: Monaco Editor
- **State Management**: Zustand
- **Testing**: Vitest + React Testing Library

### Deployment
- **Platform**: GitHub Pages
- **Type**: Static SPA
- **Build Output**: `docs/` directory
- **Client-side only**: No backend required

## Development Environment

### Prerequisites
```bash
# Required
node >= 18.0.0
npm >= 9.0.0

# Recommended
git >= 2.30.0
VS Code with TypeScript extension
```

### Setup
```bash
# Clone and install
git clone <repository>
cd zosql
npm install

# Development
npm run dev          # Start dev server
npm run test         # Run tests
npm run build        # Build for production
```

## Architecture Overview

### Hexagonal Architecture
- **Core Layer**: Business logic (entities, use cases, ports)
- **Adapters Layer**: External integrations (storage, SQL, parsers)
- **UI Layer**: React components and ViewModels
- **Shared Layer**: Common utilities and types

### Key Constraints
- **Static hosting**: All processing client-side
- **WASM limitations**: No external database connections
- **Bundle size**: Optimized for web delivery
- **Browser compatibility**: Modern browsers only
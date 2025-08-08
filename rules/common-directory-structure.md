# Directory Structure Rules

## Follow Standard Layer-Based Directory Structure
**Why**: Consistent structure makes navigation easier and enforces architectural boundaries between layers.

**How**:
```
src/
├── api/                   # HTTP endpoints
├── core/
│   ├── services/         # PRIMARY - Pure business functions
│   ├── entities/         # Domain models
│   ├── usecases/         # Complex workflows
│   └── di/               # Dependency injection
├── adapters/             # External integrations
├── ui/                   # React components
└── shared/               # Cross-layer utilities
```

### Place Business Logic in Services Layer
**Why**: Services layer using pure functions creates testable, maintainable business logic separated from infrastructure concerns.
**How**: 
- `src/core/services/` - Primary business logic
- `src/core/entities/` - Domain models  
- `src/core/usecases/` - Complex workflows

### Separate Infrastructure from Core Logic  
**Why**: External dependencies in adapters layer prevents vendor lock-in and enables easy testing.
**How**:
- `src/adapters/sql/` - Database integrations
- `src/adapters/storage/` - File system operations
- `src/adapters/parsers/` - External library integrations

### Keep UI Layer Minimal
**Why**: Thin UI layer with Context providers keeps business logic out of components.
**How**:
- `src/ui/components/` - Pure React components
- `src/ui/context/` - State management
- `src/ui/hooks/` - UI-specific logic

### Limit File Size to 500 Lines
**Why**: Smaller files are easier to understand, test, and maintain. Forces single responsibility.
**How**: Split files when exceeding 500 lines by extracting related functions or components.
# React Best Practices

Core React patterns for hooks and state.

## Hook Patterns

### useState Pattern
**Why**: Minimize state, derive values from existing state to reduce complexity
**How**: Store only essential state, calculate derived values in render

### useEffect Pattern  
**Why**: Cleanup prevents memory leaks and race conditions
**How**: Always return cleanup function for async operations

### Performance Hooks
**Why**: Prevent unnecessary re-renders and expensive recalculations
**How**: `useMemo` for calculations, `useCallback` for stable function references

## Functional Programming Core

### Use Function Components with Custom Hooks
**Why**: Hooks provide better composition and testing than classes
**How**: Extract logic into custom hooks, return only necessary values

### Pure State Updates  
**Why**: Predictable state changes prevent bugs and make debugging easier
**How**: Use `useReducer` for complex state, always return new objects

### Immutable Updates
**Why**: Prevents accidental mutations and enables React optimization
**How**: Use spread operator `[...array, newItem]` and object spread `{...obj, updates}`

### Function Composition
**Why**: Small, testable functions are easier to maintain and debug
**How**: Compose pure functions with `useMemo` for performance

### Component Structure
**Why**: Explicit prop types and function components improve maintainability
**How**: Define interface for props, use function components with TypeScript

## Key Rules
- **Prefer hooks over classes** - Use function components with hooks
- **Calculate derived state** - Don't store what can be computed
- **Immutable updates** - Create new objects instead of mutating
- **Pure functions** - Separate side effects from business logic
- **Cleanup effects** - Always cleanup subscriptions and async operations
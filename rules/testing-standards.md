# Testing Standards

React testing patterns and requirements for the zosql project.

## Test Structure
- **Unit Tests**: Focus on business logic in `src/core/`
- **Integration Tests**: Test adapter implementations  
- **Component Tests**: Minimal UI binding verification only

## Key Test Files
- `test/intellisense-regression.test.ts` - 60+ test cases for IntelliSense functionality
- `test/core/` - Business logic unit tests
- `test/ui/viewmodels/` - ViewModel unit tests (UI-independent)

## React Component Testing Rules (CRITICAL)

**Always use test helpers for React component tests to prevent Context Provider errors:**

```typescript
// ✅ REQUIRED: Use renderWithProviders for ALL React component tests
import { renderWithProviders } from '../helpers/test-wrapper';

describe('MyComponent', () => {
  it('should render without Context errors', () => {
    renderWithProviders(<MyComponent />);
    // No "must be used within Provider" errors
  });
});

// ❌ FORBIDDEN: Direct render() without providers
describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />); // Will cause Context Provider errors
  });
});
```

## Context Provider Requirements
All React components in this project require these providers:
- `WorkspaceProvider` - For workspace state
- `EditorProvider` - For editor state

**Root cause of Provider errors:**
- Components use `useWorkspace()` and `useEditor()` hooks
- These hooks **MUST** be wrapped in corresponding providers
- Test failures occur when providers are missing

## Business Logic Testing

```typescript
// ✅ Good: ViewModel unit test (no UI)
describe('SqlEditorViewModel', () => {
  it('should enable execute when SQL is not empty', () => {
    const vm = new SqlEditorViewModel();
    vm.sql = 'SELECT * FROM users';
    expect(vm.canExecute).toBe(true);
  });
});

// ✅ Good: Command unit test
describe('ExecuteQueryCommand', () => {
  it('should validate SQL before execution', async () => {
    const command = new ExecuteQueryCommand(context);
    expect(command.canExecute()).toBe(true);
  });
});

// ❌ Avoid: Heavy UI integration tests
```
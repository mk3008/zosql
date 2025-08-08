# Testing Guidelines

## Test Strategy Hierarchy

### 1. Unit Tests (Vitest)
- **Purpose**: Test individual functions and components in isolation
- **Location**: `src/**/*.test.ts`
- **Command**: `npm run test`, `npm run test:run`
- **Coverage**: Business logic, utility functions, pure components

### 2. Integration Tests (Vitest)
- **Purpose**: Test interactions between components and services
- **Location**: `src/**/*.integration.test.ts`
- **Coverage**: ViewModels, service interactions, data flow

### 3. E2E Tests (Playwright)
- **Purpose**: Test complete user journeys and prevent regressions
- **Location**: `tests/e2e/**/*.spec.js`
- **Command**: `npm run test:e2e`
- **Coverage**: Critical user flows, regression scenarios

## Quality Gates

### Pre-Commit Checks
```bash
npm run ci:essential  # TypeScript + ESLint
```

### Pre-Push Checks  
```bash
npm run ci:check     # TypeScript + ESLint + Unit Tests
```

### CI/CD Pipeline
```bash
npm run quality      # Full test suite including E2E
```

## Regression Prevention Protocol

### When Fixing Bugs
1. **Reproduce the Bug**: Create a failing E2E test first
2. **Fix the Issue**: Implement the solution
3. **Verify the Fix**: Ensure the E2E test passes
4. **Document**: Update test descriptions with bug context

### Critical Scenarios to Test
- Left menu navigation → Tab creation
- Component state persistence
- User input handling
- Error boundary behavior
- Data loading states

## Test Naming Conventions

### E2E Test Names
```javascript
// Pattern: [test type]: [specific behavior] 
test('regression: tabs should not disappear after creation', ...)
test('navigation: left menu items create visible tabs', ...)
test('user flow: complete SQL query execution', ...)
```

### Test File Organization
```
tests/e2e/
├── navigation/           # UI navigation tests
├── regression/          # Specific bug prevention tests
├── user-flows/         # Complete user journey tests
└── components/         # Component-specific E2E tests
```

## Test Data Strategy

### Test Selectors Priority
1. `data-testid="specific-element"` (Preferred)
2. `[aria-label="Action"]` (Semantic)
3. `.component-class:not([disabled])` (State-aware)
4. `button:visible` (Fallback)

### Avoid Fragile Selectors
- ❌ CSS class names only: `.btn-primary`
- ❌ Element positioning: `div:nth-child(3)`
- ❌ Text content: `'Click here'`
- ✅ Semantic attributes: `[data-testid="submit-button"]`

## Error Handling in Tests

### Expected Error Handling
```javascript
test('error handling: invalid input shows error message', async ({ page }) => {
  await page.fill('[data-testid="input"]', 'invalid-data');
  await page.click('[data-testid="submit"]');
  
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid');
});
```

### Test Stability
- Always use appropriate waits (`waitForLoadState`, `waitForTimeout`)
- Filter out disabled elements: `:not([disabled])`
- Verify element state before interaction
- Take screenshots for debugging failed tests

## Performance Considerations

### Test Execution Speed
- Run tests in parallel where possible (but avoid conflicts)
- Use `reuseExistingServer` for development
- Minimize unnecessary waits and timeouts
- Group related tests to reduce setup/teardown

### Resource Management
- Close browser contexts properly
- Clean up test data
- Avoid memory leaks in long-running test suites

## Documentation Requirements

### Test Documentation
- Describe WHY the test exists (especially for regression tests)
- Include bug ticket references where applicable
- Document any special setup or prerequisites
- Explain expected behavior vs actual behavior

### Bug Prevention
- Create E2E test BEFORE fixing the bug
- Ensure test fails initially (red)
- Fix the bug to make test pass (green)
- Keep test as regression prevention (maintain)

## Maintenance Guidelines

### Test Review Criteria
- Does the test validate actual user behavior?
- Is the test name descriptive and specific?
- Are selectors stable and semantic?
- Does the test include appropriate waits and error handling?
- Is there sufficient documentation for future maintainers?

### Test Cleanup
- Remove obsolete tests for deprecated features
- Update tests when UI changes
- Refactor common test patterns into utilities
- Keep test suite execution time reasonable
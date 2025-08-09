# End-to-End Tests

This directory contains Playwright E2E tests for the ZoSQL application.

## Test Structure

### Core Test Files

- **`query-execution-flow.spec.js`**: Tests the critical query execution flow and UI responsiveness
- **`workspace-functionality.spec.js`**: Tests workspace initialization, tab management, and state persistence

### Support Files

- **`helpers/workspace-setup.js`**: Common utilities for setting up workspace state in tests
- **`fixtures/`**: Test data files including sample workspaces and SQL files

## Key Test Scenarios

### Query Execution Flow Tests

1. **Results Area Immediate Visibility**: Ensures results area appears immediately when Run button is clicked (prevents UI delay regression)
2. **Loading State Indicators**: Verifies proper loading indicators during query execution
3. **Loading to Results Transition**: Tests complete flow from loading state to final results
4. **Results Area Persistence**: Regression test ensuring results don't disappear unexpectedly
5. **Keyboard Shortcut Support**: Tests Ctrl+Enter keyboard shortcut functionality
6. **Values Tab Integration**: Tests Values tab functionality and interactions

### Workspace Functionality Tests

1. **Demo Workspace Loading**: Verifies default demoworkspace opens with proper SQL content
2. **Sidebar Items Display**: Tests left sidebar workspace item display
3. **Tab Switching**: Tests switching between different workspace tabs (main.sql, Values, Formatter, Conditions)
4. **State Persistence**: Ensures workspace state is maintained during tab operations

## Test Setup

### Before Each Test

1. Navigate to application root (`/`)
2. Setup workspace using `setupWorkspaceForTesting()` helper
3. Ensure proper workspace initialization with demo data
4. Wait for application stability before proceeding

### Key Helper Functions

- `setupWorkspaceForTesting(page, options)`: Initializes workspace for testing
- `waitForRunButton(page, timeout)`: Waits for and finds the Run button
- `checkResultsArea(page)`: Checks if results area is visible and returns detailed state

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run specific test file
npx playwright test query-execution-flow.spec.js

# Run with debug mode
npm run test:e2e:debug
```

## Test Configuration

- **Port**: Tests run against `http://localhost:3000` (configured in `playwright.config.js`)
- **Screenshots**: Automatic screenshots on failure, custom screenshots for debugging
- **Timeout**: 30s overall timeout, 10s expect timeout
- **Workers**: 1 worker (serial execution to avoid conflicts)

## Screenshot Artifacts

Test screenshots are saved to `tests/e2e/screenshots/`:

- `setup-*.png`: Workspace setup phases
- `query-flow-*.png`: Query execution flow states
- `workspace-*.png`: Workspace functionality states

## Regression Prevention

The tests specifically target regression scenarios:

- **UI Responsiveness**: Results area must appear immediately on Run click
- **State Persistence**: Workspace state must survive tab switching
- **Loading Indicators**: Proper feedback during async operations
- **Keyboard Shortcuts**: Alternative interaction methods must work

## Test Data

### Demo Workspace

Tests use the built-in demo workspace which includes:

- **Main SQL**: `SELECT user_id, name FROM users;`
- **Test Values**: Sample users data with alice, bob, etc.
- **Filter Conditions**: Pre-configured filter options
- **Formatter Settings**: Default SQL formatting configuration

### Custom Test Data

- `fixtures/test-workspace.json`: Custom workspace configuration for testing
- `fixtures/sample.sql`: Sample SQL file for file loading tests

## Troubleshooting

### Common Issues

1. **Workspace not loading**: Check that demo workspace factory is working
2. **Run button not found**: Ensure workspace tabs are properly opened
3. **Results area not visible**: Check for proper CSS selectors and timing
4. **Monaco editor issues**: Verify editor initialization timing

### Debug Tips

1. Use `await page.screenshot()` for visual debugging
2. Check console logs with `console.log()` statements in tests
3. Use `page.pause()` in debug mode to inspect page state
4. Review screenshot artifacts in `tests/e2e/screenshots/`

## Maintenance

### Adding New Tests

1. Create new test files following the naming pattern `*.spec.js`
2. Use the helper functions from `workspace-setup.js`
3. Follow the consistent console logging pattern `[TEST] message`
4. Add appropriate screenshots for verification and debugging

### Updating Selectors

When UI changes require selector updates:

1. Update selectors in helper functions first
2. Test across all test files to ensure compatibility
3. Add fallback selectors for robustness
4. Document any breaking changes in commit messages
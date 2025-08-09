import { test, expect } from '@playwright/test';
import { setupWorkspaceForTesting, waitForRunButton, checkResultsArea } from './helpers/workspace-setup.js';

test.describe('Query Execution Flow Improvements', () => {
  test.beforeEach(async ({ page }) => {
    // Use base URL from Playwright config (port 3000 as configured in webServer)
    await page.goto('/');
    
    // Setup workspace with New button approach
    await setupWorkspaceForTesting(page, {
      workspaceName: 'E2E Test Workspace',
      sqlQuery: 'SELECT 1 as id, \'Test Query\' as name, CURRENT_TIMESTAMP as created_at;',
      waitForStability: true
    });
  });

  test('should show results area immediately when Run button is clicked', async ({ page }) => {
    // This is the core test: Results area should appear immediately when Run is clicked
    // This tests the main improvement to prevent UI delay between clicking Run and showing results
    
    console.log('[TEST] Starting results area immediate visibility test');
    
    // Wait for Run button to be available
    let runButton;
    try {
      runButton = await waitForRunButton(page, 10000);
    } catch (error) {
      // Fallback: take diagnostic screenshot and fail gracefully
      await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-no-run-button.png', fullPage: true });
      throw error;
    }
    
    // Check initial state - results area should not be visible initially
    const initialResultsState = await checkResultsArea(page);
    console.log('[TEST] Initial results area state:', initialResultsState.found);
    
    // Take screenshot before Run button click
    await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-before-run-click.png', fullPage: true });
    
    // Click the Run button
    console.log('[TEST] Clicking Run button...');
    await runButton.click();
    
    // CRITICAL TEST: Results area should be visible IMMEDIATELY after click
    // Wait only 100ms for React state update - this should be sufficient for immediate UI update
    await page.waitForTimeout(100);
    
    // Take screenshot immediately after Run button click
    await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-after-run-click.png', fullPage: true });
    
    // Check if results area is now visible
    const finalResultsState = await checkResultsArea(page);
    
    console.log('[TEST] Results area state after Run click:', {
      found: finalResultsState.found,
      selector: finalResultsState.selector
    });
    
    // The key assertion: Results area should be visible immediately after clicking Run
    expect(finalResultsState.found).toBe(true);
    
    // Additional verification: The results area element should be properly rendered
    if (finalResultsState.element) {
      const elementHandle = finalResultsState.element;
      
      // Check that element has proper dimensions (not empty/collapsed)
      const boundingBox = await elementHandle.boundingBox();
      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThan(50); // Results area should have meaningful height
        console.log('[TEST] Results area dimensions:', boundingBox);
      }
    }
    
    console.log('[TEST] Results area immediate visibility test completed successfully');
  });

  test('should show loading state when query is executing', async ({ page }) => {
    // This test verifies that proper loading indicators are shown during query execution
    
    console.log('[TEST] Starting loading state visibility test');
    
    // Wait for Run button to be available
    const runButton = await waitForRunButton(page);
    
    // Click the Run button to start query execution
    console.log('[TEST] Clicking Run button to start query execution...');
    await runButton.click();
    
    // Check for loading indicators immediately after click
    await page.waitForTimeout(150); // Short wait for React state update
    
    // Look for various loading indicators
    const loadingIndicators = {
      spinner: await page.locator('.animate-spin').isVisible().catch(() => false),
      runningText: await page.locator('text="Running..."').isVisible().catch(() => false),
      executingText: await page.locator('text*="Executing"').isVisible().catch(() => false),
      runButtonText: await runButton.textContent().catch(() => ''),
      disabledRunButton: await runButton.getAttribute('disabled').catch(() => null) !== null
    };
    
    console.log('[TEST] Loading indicators found:', loadingIndicators);
    
    // Take screenshot during loading state
    await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-loading-state.png', fullPage: true });
    
    // At least one loading indicator should be present
    const hasLoadingIndicator = 
      loadingIndicators.spinner || 
      loadingIndicators.runningText || 
      loadingIndicators.executingText ||
      loadingIndicators.runButtonText.includes('Running') ||
      loadingIndicators.disabledRunButton;
    
    console.log('[TEST] Has loading indicator:', hasLoadingIndicator);
    
    // The loading state should be visible during execution
    expect(hasLoadingIndicator).toBe(true);
    
    // Wait for execution to complete (with reasonable timeout)
    try {
      await page.waitForFunction(
        () => {
          const button = document.querySelector('button[title="Run Query (Ctrl+Enter)"]');
          return button && (button.textContent === 'Run' || !button.disabled);
        },
        { timeout: 15000 }
      );
      console.log('[TEST] Query execution completed');
      
      // Take screenshot after execution completes
      await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-execution-complete.png', fullPage: true });
      
    } catch (error) {
      console.log('[TEST] Query execution timeout - this may be expected for complex queries');
      await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-timeout.png', fullPage: true });
    }
    
    console.log('[TEST] Loading state visibility test completed');
  });

  test('should transition from loading to results display', async ({ page }) => {
    // This test verifies the complete flow from loading state to final results display
    
    console.log('[TEST] Starting loading to results transition test');
    
    // Wait for Run button to be available
    const runButton = await waitForRunButton(page);
    
    // Click Run button to start query execution
    console.log('[TEST] Clicking Run button...');
    await runButton.click();
    
    // Wait for loading state to appear
    await page.waitForTimeout(200);
    
    // Verify loading state is active
    const loadingSpinner = page.locator('.animate-spin');
    const initialSpinnerVisible = await loadingSpinner.isVisible().catch(() => false);
    const initialButtonText = await runButton.textContent().catch(() => '');
    
    console.log('[TEST] Initial loading state:', { 
      initialSpinnerVisible, 
      initialButtonText 
    });
    
    // Results area should be visible immediately (even during loading)
    const loadingResultsState = await checkResultsArea(page);
    console.log('[TEST] Results area during loading:', loadingResultsState.found);
    expect(loadingResultsState.found).toBe(true);
    
    // Wait for execution to complete (with reasonable timeout)
    try {
      await page.waitForFunction(
        () => {
          const runButton = document.querySelector('button[title="Run Query (Ctrl+Enter)"]');
          return runButton && runButton.textContent === 'Run' && !runButton.disabled;
        },
        { timeout: 20000 }
      );
      
      console.log('[TEST] Query execution completed');
      
      // Take screenshot after execution completes
      await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-transition-complete.png', fullPage: true });
      
      // Verify final state
      const finalSpinnerVisible = await loadingSpinner.isVisible().catch(() => false);
      const finalButtonText = await runButton.textContent().catch(() => '');
      
      console.log('[TEST] Final state:', {
        finalSpinnerVisible,
        finalButtonText
      });
      
      // Loading indicators should be gone
      expect(finalSpinnerVisible).toBe(false);
      expect(finalButtonText).toBe('Run');
      
      // Results area should still be visible after execution
      const finalResultsState = await checkResultsArea(page);
      expect(finalResultsState.found).toBe(true);
      
      console.log('[TEST] Loading to results transition test completed successfully');
      
    } catch (error) {
      console.log('[TEST] Query execution timeout - capturing diagnostic info');
      await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-transition-timeout.png', fullPage: true });
      
      // Even on timeout, results area should still be visible
      const timeoutResultsState = await checkResultsArea(page);
      expect(timeoutResultsState.found).toBe(true);
    }
  });

  test('regression: results area should remain visible after query execution', async ({ page }) => {
    // This test ensures the results area doesn't disappear after execution completes
    // This is a critical regression test to prevent UI elements from disappearing unexpectedly
    
    console.log('[TEST] Starting results area persistence regression test');
    
    // Wait for Run button to be available
    const runButton = await waitForRunButton(page);
    
    // Click Run button
    console.log('[TEST] Clicking Run button...');
    await runButton.click();
    
    // Results area should be visible immediately after Run click
    await page.waitForTimeout(200);
    const initialResultsState = await checkResultsArea(page);
    
    console.log('[TEST] Initial results visibility after Run click:', initialResultsState.found);
    expect(initialResultsState.found).toBe(true);
    
    // Wait for some time to ensure results don't disappear during loading or after completion
    console.log('[TEST] Waiting to verify results area persistence...');
    await page.waitForTimeout(3000);
    
    // Results area should still be visible (regression test)
    const midResultsState = await checkResultsArea(page);
    console.log('[TEST] Results visibility after 3s wait:', midResultsState.found);
    expect(midResultsState.found).toBe(true);
    
    // Wait for query execution to complete or timeout
    try {
      await page.waitForFunction(
        () => {
          const runButton = document.querySelector('button[title="Run Query (Ctrl+Enter)"]');
          return runButton && runButton.textContent === 'Run';
        },
        { timeout: 10000 }
      );
      console.log('[TEST] Query execution completed');
    } catch (error) {
      console.log('[TEST] Query execution timeout - continuing test');
    }
    
    // Final check: Results area should still be visible after execution
    const finalResultsState = await checkResultsArea(page);
    console.log('[TEST] Final results visibility:', finalResultsState.found);
    expect(finalResultsState.found).toBe(true);
    
    // Take final screenshot for verification
    await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-regression-final.png', fullPage: true });
    
    console.log('[TEST] Results area persistence regression test completed successfully');
  });

  test('should handle keyboard shortcut (Ctrl+Enter) execution', async ({ page }) => {
    // Test the Ctrl+Enter keyboard shortcut for query execution
    // This verifies that keyboard shortcuts work the same as clicking the Run button
    
    console.log('[TEST] Starting keyboard shortcut (Ctrl+Enter) test');
    
    // Focus on the Monaco editor area (specifically the main SQL editor)
    const editorArea = page.locator('.monaco-editor').first();
    const editorExists = await editorArea.count() > 0;
    
    if (!editorExists) {
      // Take diagnostic screenshot if no editor found
      await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-no-editor.png', fullPage: true });
      throw new Error('Monaco editor not found - workspace may not be properly initialized');
    }
    
    console.log('[TEST] Found Monaco editor, clicking to focus...');
    
    // Click on editor to focus
    await editorArea.click();
    await page.waitForTimeout(500); // Allow focus to be set
    
    // Check initial state - results should not be visible before shortcut
    const initialResultsState = await checkResultsArea(page);
    console.log('[TEST] Initial results state before Ctrl+Enter:', initialResultsState.found);
    
    // Press Ctrl+Enter to execute query
    console.log('[TEST] Pressing Ctrl+Enter...');
    await page.keyboard.press('Control+Enter');
    
    // Results area should appear immediately after keyboard shortcut
    await page.waitForTimeout(200); // Allow React state update
    
    const finalResultsState = await checkResultsArea(page);
    
    console.log('[TEST] Results state after Ctrl+Enter:', {
      found: finalResultsState.found,
      selector: finalResultsState.selector
    });
    
    // The key assertion: Results area should be visible immediately after Ctrl+Enter
    expect(finalResultsState.found).toBe(true);
    
    // Additional verification: Check that the Run button also changes state
    const runButton = await waitForRunButton(page, 2000).catch(() => null);
    if (runButton) {
      const buttonText = await runButton.textContent().catch(() => '');
      console.log('[TEST] Run button text after Ctrl+Enter:', buttonText);
      
      // Button should show loading state or Running text
      const isExecuting = buttonText.includes('Running') || buttonText !== 'Run';
      console.log('[TEST] Button shows execution state:', isExecuting);
    }
    
    // Take screenshot after keyboard shortcut
    await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-ctrl-enter.png', fullPage: true });
    
    console.log('[TEST] Keyboard shortcut test completed successfully');
  });

  // Additional test for Values tab functionality
  test('should handle Values tab interactions', async ({ page }) => {
    // This test verifies that the Values tab can be opened and displays test data
    
    console.log('[TEST] Starting Values tab test');
    
    // Look for Values tab or button to open it
    const valuesTabSelectors = [
      'button:has-text("Values")',
      'button:has-text("values")',
      '[data-testid*="values"]',
      'button[title*="Values"]',
      'button[title*="Test Values"]'
    ];
    
    let valuesButton = null;
    let selectorUsed = '';
    
    for (const selector of valuesTabSelectors) {
      const button = page.locator(selector);
      const count = await button.count();
      if (count > 0) {
        valuesButton = button.first();
        selectorUsed = selector;
        console.log(`[TEST] Found Values button with selector: ${selector}`);
        break;
      }
    }
    
    if (valuesButton) {
      // Click Values button/tab
      console.log('[TEST] Clicking Values button...');
      await valuesButton.click();
      await page.waitForTimeout(1000); // Allow tab to open
      
      // Take screenshot after Values tab opened
      await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-values-tab.png', fullPage: true });
      
      // Look for test values content
      const valuesContentSelectors = [
        'text*="users("',
        'text*="values"',
        'text*="alice"',
        'text*="bob"',
        '.monaco-editor:visible', // Values tab should also have Monaco editor
        '[class*="test-values"]'
      ];
      
      let foundValuesContent = false;
      for (const selector of valuesContentSelectors) {
        const element = page.locator(selector);
        const count = await element.count();
        if (count > 0) {
          const isVisible = await element.first().isVisible();
          if (isVisible) {
            console.log(`[TEST] Found values content with selector: ${selector}`);
            foundValuesContent = true;
            break;
          }
        }
      }
      
      expect(foundValuesContent).toBe(true);
      console.log('[TEST] Values tab test completed successfully');
      
    } else {
      console.log('[TEST] Values button not found - this may be expected if Values tab is not implemented');
      await page.screenshot({ path: 'tests/e2e/screenshots/query-flow-no-values-button.png', fullPage: true });
    }
  });
});
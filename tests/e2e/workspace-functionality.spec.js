import { test, expect } from '@playwright/test';
import { setupWorkspaceForTesting, waitForRunButton, checkResultsArea } from './helpers/workspace-setup.js';

test.describe('Workspace Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Setup workspace with proper initialization
    await setupWorkspaceForTesting(page, {
      useTestData: false, // Use demo workspace
      openTab: true,
      waitForStability: true
    });
  });

  test('should open demoworkspace by default and display SQL content', async ({ page }) => {
    console.log('[TEST] Starting demoworkspace default opening test');
    
    // Verify that demoworkspace is loaded by checking for SQL content
    const monacoEditor = page.locator('.monaco-editor');
    await monacoEditor.waitFor({ state: 'visible', timeout: 10000 });
    
    console.log('[TEST] Monaco editor is visible');
    
    // Check for typical demo workspace SQL content
    const expectedSqlPatterns = [
      'SELECT',
      'FROM users',
      'user_id',
      'name'
    ];
    
    let foundSqlContent = false;
    for (const pattern of expectedSqlPatterns) {
      const textElement = page.locator(`text*="${pattern}"`);
      const count = await textElement.count();
      if (count > 0) {
        console.log(`[TEST] Found expected SQL pattern: ${pattern}`);
        foundSqlContent = true;
      }
    }
    
    expect(foundSqlContent).toBe(true);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'tests/e2e/screenshots/workspace-demoworkspace-loaded.png', fullPage: true });
    
    console.log('[TEST] Demoworkspace default opening test completed');
  });

  test('should display workspace items in left sidebar', async ({ page }) => {
    console.log('[TEST] Starting left sidebar workspace items test');
    
    // Look for sidebar elements
    const sidebarSelectors = [
      'aside',
      '[data-testid="left-sidebar"]', 
      '.sidebar',
      '.workspace-sidebar'
    ];
    
    let sidebar = null;
    for (const selector of sidebarSelectors) {
      const element = page.locator(selector);
      const count = await element.count();
      if (count > 0 && await element.first().isVisible()) {
        sidebar = element.first();
        console.log(`[TEST] Found sidebar with selector: ${selector}`);
        break;
      }
    }
    
    expect(sidebar).not.toBeNull();
    
    // Look for workspace items within sidebar
    const workspaceItemSelectors = [
      'button:has-text("main.sql")',
      'button:has-text("demoworkspace")', 
      'button:has-text("Values")',
      'button:has-text("Formatter")',
      'button:has-text("Conditions")'
    ];
    
    let foundWorkspaceItems = 0;
    for (const selector of workspaceItemSelectors) {
      const element = page.locator(selector);
      const count = await element.count();
      if (count > 0) {
        foundWorkspaceItems++;
        console.log(`[TEST] Found workspace item: ${selector}`);
      }
    }
    
    // Should have at least main.sql item
    expect(foundWorkspaceItems).toBeGreaterThan(0);
    
    console.log(`[TEST] Found ${foundWorkspaceItems} workspace items`);
    await page.screenshot({ path: 'tests/e2e/screenshots/workspace-sidebar-items.png', fullPage: true });
    
    console.log('[TEST] Left sidebar workspace items test completed');
  });

  test('should switch between different workspace tabs', async ({ page }) => {
    console.log('[TEST] Starting workspace tab switching test');
    
    // First, ensure we have the main SQL tab open
    const runButton = await waitForRunButton(page);
    expect(runButton).toBeDefined();
    
    // Look for different tab types to open
    const tabButtons = [
      { selector: 'button:has-text("Values")', name: 'Values' },
      { selector: 'button:has-text("Formatter")', name: 'Formatter' }, 
      { selector: 'button:has-text("Conditions")', name: 'Conditions' }
    ];
    
    let tabsOpened = 0;
    
    for (const tabButton of tabButtons) {
      const button = page.locator(tabButton.selector);
      const count = await button.count();
      
      if (count > 0) {
        console.log(`[TEST] Clicking ${tabButton.name} tab...`);
        await button.first().click();
        await page.waitForTimeout(1000); // Allow tab to load
        
        // Take screenshot after opening tab
        await page.screenshot({ 
          path: `tests/e2e/screenshots/workspace-${tabButton.name.toLowerCase()}-tab.png`, 
          fullPage: true 
        });
        
        tabsOpened++;
        
        // Look for tab-specific content
        if (tabButton.name === 'Values') {
          // Values tab should show test data
          const valuesContent = page.locator('text*="values"');
          const valuesVisible = await valuesContent.isVisible().catch(() => false);
          if (valuesVisible) {
            console.log(`[TEST] ${tabButton.name} tab content verified`);
          }
        } else if (tabButton.name === 'Formatter') {
          // Formatter tab should show configuration options
          const formatterContent = page.locator('text*="identifier"');
          const formatterVisible = await formatterContent.isVisible().catch(() => false);
          if (formatterVisible) {
            console.log(`[TEST] ${tabButton.name} tab content verified`);
          }
        }
      }
    }
    
    console.log(`[TEST] Opened ${tabsOpened} different tabs`);
    
    // Go back to main SQL tab
    const mainSqlTab = page.locator('button:has-text("main.sql")');
    const mainTabCount = await mainSqlTab.count();
    if (mainTabCount > 0) {
      console.log('[TEST] Switching back to main.sql tab...');
      await mainSqlTab.first().click();
      await page.waitForTimeout(500);
      
      // Verify Run button is still available (indicates we're on SQL tab)
      const runButtonAfterSwitch = await waitForRunButton(page, 5000);
      expect(runButtonAfterSwitch).toBeDefined();
      
      console.log('[TEST] Successfully switched back to main SQL tab');
    }
    
    await page.screenshot({ path: 'tests/e2e/screenshots/workspace-tab-switching-complete.png', fullPage: true });
    
    console.log('[TEST] Workspace tab switching test completed');
  });

  test('should maintain workspace state after tab operations', async ({ page }) => {
    console.log('[TEST] Starting workspace state persistence test');
    
    // Get initial workspace state
    const initialRunButton = await waitForRunButton(page);
    expect(initialRunButton).toBeDefined();
    
    // Execute a query to establish results area
    console.log('[TEST] Executing initial query...');
    await initialRunButton.click();
    await page.waitForTimeout(500);
    
    const initialResultsState = await checkResultsArea(page);
    expect(initialResultsState.found).toBe(true);
    
    // Switch to Values tab
    const valuesTab = page.locator('button:has-text("Values")');
    const valuesTabCount = await valuesTab.count();
    
    if (valuesTabCount > 0) {
      console.log('[TEST] Switching to Values tab...');
      await valuesTab.first().click();
      await page.waitForTimeout(1000);
      
      // Switch back to main SQL tab  
      const mainSqlTab = page.locator('button:has-text("main.sql")');
      const mainTabCount = await mainSqlTab.count();
      
      if (mainTabCount > 0) {
        console.log('[TEST] Switching back to main SQL tab...');
        await mainSqlTab.first().click();
        await page.waitForTimeout(1000);
        
        // Verify workspace state is maintained
        const finalRunButton = await waitForRunButton(page, 5000);
        expect(finalRunButton).toBeDefined();
        
        // Results area should still be visible if it was before
        const finalResultsState = await checkResultsArea(page);
        expect(finalResultsState.found).toBe(initialResultsState.found);
        
        console.log('[TEST] Workspace state maintained after tab switching');
      }
    }
    
    await page.screenshot({ path: 'tests/e2e/screenshots/workspace-state-persistence.png', fullPage: true });
    
    console.log('[TEST] Workspace state persistence test completed');
  });
});
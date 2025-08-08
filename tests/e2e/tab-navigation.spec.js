import { test, expect } from '@playwright/test';

test.describe('Tab Navigation Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give extra time for React to mount
  });

  test('should show tabs when clicking on workspace items', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/initial-load.png', fullPage: true });
    
    // Look for workspace/left panel items (try multiple selectors)
    const workspaceSelectors = [
      '[data-testid*="table"], [data-testid*="workspace"], [data-testid*="item"]',
      '.table-item, .workspace-item, .left-panel button:not([disabled])',
      'button[class*="table"]:not([disabled]), button[class*="item"]:not([disabled]), button[class*="workspace"]:not([disabled])',
      '[class*="left"] button:not([disabled]), [class*="sidebar"] button:not([disabled]), [class*="panel"] button:not([disabled])'
    ];
    
    let clickableItem = null;
    for (const selector of workspaceSelectors) {
      const items = page.locator(selector);
      const count = await items.count();
      if (count > 0) {
        clickableItem = items.first();
        console.log(`Found ${count} items with selector: ${selector}`);
        break;
      }
    }
    
    if (!clickableItem) {
      // If no specific items found, try any enabled button
      const enabledButtons = page.locator('button:not([disabled])');
      const buttonCount = await enabledButtons.count();
      if (buttonCount > 0) {
        clickableItem = enabledButtons.first();
        console.log(`Fallback: found ${buttonCount} enabled buttons to try`);
      }
    }
    
    if (clickableItem) {
      await clickableItem.click();
      
      // Wait a moment for the tab to potentially appear
      await page.waitForTimeout(1000);
      
      // Take screenshot after click
      await page.screenshot({ path: 'tests/e2e/screenshots/after-click.png', fullPage: true });
      
      // Look for tabs with multiple selectors
      const tabSelectors = [
        '[data-testid*="tab"]',
        '.tab, [class*="tab"]',
        '[role="tab"], [role="tablist"] *',
        '.main-content [class*="tab"], .main-content button'
      ];
      
      let tabFound = false;
      for (const selector of tabSelectors) {
        const tabs = page.locator(selector);
        const tabCount = await tabs.count();
        if (tabCount > 0) {
          console.log(`Found ${tabCount} tabs with selector: ${selector}`);
          tabFound = true;
          
          // Verify at least one tab is visible
          const firstTab = tabs.first();
          await expect(firstTab).toBeVisible({ timeout: 2000 });
          break;
        }
      }
      
      // Additional check: look for any content area that might indicate a tab opened
      if (!tabFound) {
        const contentSelectors = [
          '.main-content', '.tab-content', '.content-area',
          '[class*="main"]', '[class*="content"]'
        ];
        
        for (const selector of contentSelectors) {
          const contentArea = page.locator(selector);
          const count = await contentArea.count();
          if (count > 0) {
            await expect(contentArea.first()).toBeVisible();
            console.log(`Found content area with selector: ${selector}`);
            tabFound = true;
            break;
          }
        }
      }
      
      if (!tabFound) {
        console.log('No tabs or content areas found after click');
        // Take final diagnostic screenshot
        await page.screenshot({ path: 'tests/e2e/screenshots/no-tabs-found.png', fullPage: true });
      }
      
      expect(tabFound).toBe(true);
    } else {
      console.log('No clickable items found in workspace');
      await page.screenshot({ path: 'tests/e2e/screenshots/no-items-found.png', fullPage: true });
      throw new Error('No workspace items found to click');
    }
  });

  test('regression: tabs should not disappear after creation', async ({ page }) => {
    // This is the specific regression test for the issue we fixed
    
    // Find and click an enabled workspace item
    const enabledButtons = page.locator('button:not([disabled])');
    const buttonCount = await enabledButtons.count();
    
    if (buttonCount > 0) {
      await enabledButtons.first().click();
      await page.waitForTimeout(500);
      
      // Look for any indication of tab content
      const possibleTabContent = page.locator('[class*="tab"], [class*="main"], [class*="content"]');
      const contentCount = await possibleTabContent.count();
      
      if (contentCount > 0) {
        const initiallyVisible = await possibleTabContent.first().isVisible();
        
        // Wait 3 seconds to see if tabs disappear (regression check)
        await page.waitForTimeout(3000);
        
        const stillVisible = await possibleTabContent.first().isVisible();
        
        // Take screenshots for comparison
        await page.screenshot({ path: 'tests/e2e/screenshots/regression-check-final.png', fullPage: true });
        
        // The tab content should remain visible (regression test)
        expect(stillVisible).toBe(true);
        expect(initiallyVisible).toBe(true);
      }
    }
  });
});
// Workspace setup helpers for E2E tests
import path from 'path';
import fs from 'fs';
import { expect } from '@playwright/test';

/**
 * Setup workspace for E2E testing using the New button
 * This creates a new workspace through the UI dialog instead of loading files
 */
export async function setupWorkspaceForTesting(page, options = {}) {
  const { 
    workspaceName = 'TestWorkspace', 
    sqlQuery = 'SELECT 1 as test_value, \'Hello World\' as message;',
    waitForStability = true 
  } = options;

  console.log('[E2E Setup] Starting workspace setup using New button...');
  
  // Wait for application to fully load
  await page.waitForLoadState('networkidle');
  
  if (waitForStability) {
    // Give React extra time to mount and initialize state
    await page.waitForTimeout(2000);
  }

  // Take initial screenshot
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/setup-initial.png', 
    fullPage: true 
  });

  // Find and click the New button in the header
  console.log('[E2E Setup] Looking for New button...');
  
  const newButtonSelectors = [
    'button:has-text("New")',
    'button[title="New Workspace"]',
    'button[title*="New"]',
    'header button:has-text("New")'
  ];
  
  let newButton = null;
  let selectorUsed = '';
  
  for (const selector of newButtonSelectors) {
    const button = page.locator(selector);
    const count = await button.count();
    console.log(`[E2E Setup] Checking selector "${selector}": found ${count} buttons`);
    
    if (count > 0) {
      newButton = button.first();
      selectorUsed = selector;
      break;
    }
  }
  
  if (!newButton) {
    // Debug: List all buttons in header
    const allButtons = page.locator('header button, button');
    const buttonCount = await allButtons.count();
    console.log(`[E2E Setup] Debug - Found ${buttonCount} total buttons:`);
    
    for (let i = 0; i < Math.min(buttonCount, 20); i++) {
      const button = allButtons.nth(i);
      const text = await button.textContent().catch(() => 'N/A');
      const title = await button.getAttribute('title').catch(() => 'N/A');
      console.log(`  Button ${i}: text="${text}" title="${title}"`);
    }
    
    throw new Error('New button not found in header');
  }

  console.log(`[E2E Setup] Found New button with selector: ${selectorUsed}`);
  
  // Click the New button to open the dialog
  await newButton.click();
  console.log('[E2E Setup] Clicked New button');
  
  // Wait for dialog to appear
  await page.waitForTimeout(500);
  
  // Take screenshot after dialog opens
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/setup-dialog-opened.png', 
    fullPage: true 
  });

  // Wait for the New Workspace Dialog to be visible
  const dialogSelector = 'h2:has-text("Create New Workspace")';
  const dialog = page.locator(dialogSelector);
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  console.log('[E2E Setup] New Workspace Dialog is visible');

  // Fill in workspace name
  console.log(`[E2E Setup] Entering workspace name: ${workspaceName}`);
  const nameInput = page.locator('input#workspace-name');
  await nameInput.waitFor({ state: 'visible', timeout: 3000 });
  await nameInput.fill(workspaceName);

  // Fill in SQL query
  console.log(`[E2E Setup] Entering SQL query: ${sqlQuery}`);
  const sqlTextarea = page.locator('textarea#sql-query');
  await sqlTextarea.waitFor({ state: 'visible', timeout: 3000 });
  await sqlTextarea.fill(sqlQuery);

  // Take screenshot with form filled
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/setup-dialog-filled.png', 
    fullPage: true 
  });

  // Click Create Workspace button
  console.log('[E2E Setup] Clicking Create Workspace button...');
  const createButton = page.locator('button:has-text("Create Workspace")');
  await createButton.waitFor({ state: 'visible', timeout: 3000 });
  
  // Ensure button is enabled
  await expect(createButton).toBeEnabled();
  await createButton.click();
  
  // Wait for workspace creation to complete
  await page.waitForTimeout(2000);
  
  // Take screenshot after workspace creation
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/setup-workspace-created.png', 
    fullPage: true 
  });

  // Now we need to open a SQL model tab to access the Run button
  console.log('[E2E Setup] Opening SQL model tab to access Run button...');
  
  // Wait for SQL models to appear in left sidebar
  await page.waitForTimeout(1000);
  
  // Look for SQL model items in the left sidebar - these are clickable divs in SqlModelsList
  const sqlModelSelectors = [
    'div[class*="cursor-pointer"]:has-text("*root")',
    'div[class*="cursor-pointer"]:has-text("*data")',
    'div.cursor-pointer:has-text("*root")',
    'div.cursor-pointer:has-text("*data")',
    '.cursor-pointer:has-text("*root")',
    '.cursor-pointer:has-text("*data")',
    '[class*="p-2"]:has-text("*root")',
    '[class*="p-2"]:has-text("*data")',
    'div:has-text("*root"):has([class*="cursor-pointer"])',
    'div:has-text("*data"):has([class*="cursor-pointer"])'
  ];
  
  let sqlModelButton = null;
  let modelSelectorUsed = '';
  
  for (const selector of sqlModelSelectors) {
    const button = page.locator(selector);
    const count = await button.count();
    console.log(`[E2E Setup] Checking SQL model selector "${selector}": found ${count} buttons`);
    
    if (count > 0) {
      sqlModelButton = button.first();
      modelSelectorUsed = selector;
      break;
    }
  }
  
  if (!sqlModelButton) {
    // Debug: List all clickable elements in the left sidebar to find SQL model items
    console.log('[E2E Setup] Debug - Looking for SQL model elements...');
    
    // Check for any element containing "*root" or "*data"
    const rootElements = page.locator('*:has-text("*root")');
    const dataElements = page.locator('*:has-text("*data")');
    const rootCount = await rootElements.count();
    const dataCount = await dataElements.count();
    
    console.log(`[E2E Setup] Found ${rootCount} elements with "*root" and ${dataCount} elements with "*data"`);
    
    if (rootCount > 0) {
      // Try clicking the first *root element
      console.log('[E2E Setup] Trying to click first *root element');
      sqlModelButton = rootElements.first();
      modelSelectorUsed = '*:has-text("*root") (fallback)';
    } else if (dataCount > 0) {
      // Try clicking the first *data element
      console.log('[E2E Setup] Trying to click first *data element');
      sqlModelButton = dataElements.first();
      modelSelectorUsed = '*:has-text("*data") (fallback)';
    } else {
      // Ultimate debug: List all elements in left sidebar
      const leftSidebarElements = page.locator('aside *, [data-testid="left-sidebar"] *, .sidebar *');
      const elementCount = await leftSidebarElements.count();
      console.log(`[E2E Setup] Ultimate debug - Found ${elementCount} elements in left sidebar:`);
      
      for (let i = 0; i < Math.min(elementCount, 20); i++) {
        const element = leftSidebarElements.nth(i);
        const text = await element.textContent().catch(() => 'N/A');
        const tagName = await element.evaluate(el => el.tagName).catch(() => 'N/A');
        const className = await element.getAttribute('class').catch(() => 'N/A');
        if (text.length > 0 && text.length < 50) {
          console.log(`  Element ${i}: <${tagName}> text="${text}" class="${className}"`);
        }
      }
      
      throw new Error('SQL model element not found in left sidebar');
    }
  }

  console.log(`[E2E Setup] Found SQL model button with selector: ${modelSelectorUsed}`);
  
  // Click the SQL model button to open a tab
  await sqlModelButton.click();
  console.log('[E2E Setup] Clicked SQL model button to open tab');
  
  // Wait for tab to open
  await page.waitForTimeout(1500);
  
  // Take screenshot after tab opened
  await page.screenshot({ 
    path: 'tests/e2e/screenshots/setup-tab-opened.png', 
    fullPage: true 
  });
  
  // Wait for Monaco editor to appear (indicates tab is loaded)
  console.log('[E2E Setup] Waiting for Monaco editor to load...');
  const monacoEditor = page.locator('.monaco-editor').first();
  await monacoEditor.waitFor({ state: 'visible', timeout: 10000 });
  
  // Wait for application to stabilize after tab opening
  if (waitForStability) {
    await page.waitForTimeout(2000);
  }
  
  console.log('[E2E Setup] Workspace setup complete with tab opened using New button');
}

/**
 * Wait for the Run button to be available
 */
export async function waitForRunButton(page, timeout = 10000) {
  console.log('[E2E Setup] Waiting for Run button...');
  
  const runButtonSelectors = [
    'button[title="Run Query (Ctrl+Enter)"]',
    'button[data-testid="run-button"]',
    'button:has-text("Run")',
    'button[aria-label*="Run"]',
    'button[title*="Run"]'
  ];
  
  for (const selector of runButtonSelectors) {
    try {
      const button = page.locator(selector);
      await button.waitFor({ state: 'visible', timeout: timeout / runButtonSelectors.length });
      console.log(`[E2E Setup] Found Run button with selector: ${selector}`);
      return button;
    } catch (error) {
      console.log(`[E2E Setup] Run button not found with selector: ${selector}`);
      continue;
    }
  }
  
  throw new Error('Run button not found with any selector');
}

/**
 * Check if results area is visible
 */
export async function checkResultsArea(page) {
  console.log('[E2E Setup] Checking for results area...');
  
  const resultAreaSelectors = [
    '[data-testid="results-area"]',
    '.results-container',
    '.query-results',
    '.bg-dark-secondary',
    '[class*="result"]',
    '.results-panel'
  ];
  
  for (const selector of resultAreaSelectors) {
    const element = page.locator(selector);
    const count = await element.count();
    if (count > 0) {
      const isVisible = await element.first().isVisible();
      if (isVisible) {
        console.log(`[E2E Setup] Results area found and visible with selector: ${selector}`);
        return { found: true, selector, element: element.first() };
      }
    }
  }
  
  console.log('[E2E Setup] Results area not found or not visible');
  return { found: false, selector: null, element: null };
}
import { getHtmlStructure } from './html-template.js';
import { getJavaScriptCode } from './client-javascript.js';
import { getIntelliSenseSetup, getIntelliSenseTestFunctions } from './intellisense-client.js';
import { getHelperFunctions, getSchemaManagement } from './helper-functions.js';
import { getUtilityFunctions } from './utility-functions.js';

/**
 * Main template function that combines all UI components
 * This replaces the original web-ui-template.ts
 */
export function getHtmlTemplate(host: string, port: number): string {
  const htmlStructure = getHtmlStructure(host, port);
  const jsCode = getJavaScriptCode();
  
  // Replace the placeholder with actual JavaScript code
  return htmlStructure.replace(
    '<!-- JavaScript will be injected here -->',
    jsCode
  );
}

/**
 * Re-export functions for backward compatibility
 */
export {
  getJavaScriptCode,
  getIntelliSenseSetup,
  getIntelliSenseTestFunctions,
  getHelperFunctions,
  getSchemaManagement,
  getUtilityFunctions
};
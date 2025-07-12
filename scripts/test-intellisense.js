#!/usr/bin/env node

/**
 * IntelliSense Test Runner and Regression Detector
 * 
 * This script runs comprehensive IntelliSense tests and provides detailed
 * reporting on any regressions or failures.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function logHeader(message) {
  log(`\n${COLORS.BOLD}${COLORS.BLUE}=== ${message} ===${COLORS.RESET}`);
}

function runTests() {
  logHeader('Running IntelliSense Regression Tests');
  
  try {
    // Run specific IntelliSense tests
    const intelliSenseTests = [
      'test/intellisense-utils.test.ts',
      'test/intellisense-integration.test.ts',
      'test/intellisense-regression.test.ts'
    ];
    
    let allPassed = true;
    const results = [];
    
    for (const testFile of intelliSenseTests) {
      log(`\n📋 Running ${testFile}...`);
      
      try {
        const output = execSync(`npm run test:once -- ${testFile}`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        
        // Parse test results
        const lines = output.split('\n');
        const passedLine = lines.find(line => line.includes('passed'));
        const failedLine = lines.find(line => line.includes('failed'));
        
        if (failedLine && failedLine.includes('failed')) {
          allPassed = false;
          log(`❌ ${testFile}: FAILED`, COLORS.RED);
          results.push({ file: testFile, status: 'FAILED', output });
        } else {
          log(`✅ ${testFile}: PASSED`, COLORS.GREEN);
          results.push({ file: testFile, status: 'PASSED', output });
        }
        
      } catch (error) {
        allPassed = false;
        log(`💥 ${testFile}: ERROR`, COLORS.RED);
        results.push({ file: testFile, status: 'ERROR', error: error.message });
      }
    }
    
    // Generate report
    generateReport(results, allPassed);
    
    return allPassed;
    
  } catch (error) {
    log(`Fatal error running tests: ${error.message}`, COLORS.RED);
    return false;
  }
}

function generateReport(results, allPassed) {
  logHeader('IntelliSense Test Report');
  
  const timestamp = new Date().toISOString();
  const reportData = {
    timestamp,
    allPassed,
    results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'PASSED').length,
      failed: results.filter(r => r.status === 'FAILED').length,
      errors: results.filter(r => r.status === 'ERROR').length
    }
  };
  
  // Console summary
  log(`\n📊 Summary:`);
  log(`   Total tests: ${reportData.summary.total}`);
  log(`   Passed: ${reportData.summary.passed}`, COLORS.GREEN);
  log(`   Failed: ${reportData.summary.failed}`, reportData.summary.failed > 0 ? COLORS.RED : COLORS.GREEN);
  log(`   Errors: ${reportData.summary.errors}`, reportData.summary.errors > 0 ? COLORS.RED : COLORS.GREEN);
  
  if (allPassed) {
    log(`\n🎉 All IntelliSense tests passed! No regressions detected.`, COLORS.GREEN);
  } else {
    log(`\n⚠️  IntelliSense regression detected! Please review failed tests.`, COLORS.YELLOW);
    
    // Show failed test details
    const failedResults = results.filter(r => r.status !== 'PASSED');
    for (const result of failedResults) {
      log(`\n❌ ${result.file}:`, COLORS.RED);
      if (result.error) {
        log(`   Error: ${result.error}`, COLORS.RED);
      } else if (result.output) {
        // Extract failure details from test output
        const lines = result.output.split('\n');
        const failureLines = lines.filter(line => 
          line.includes('FAIL') || 
          line.includes('expected') || 
          line.includes('AssertionError')
        );
        failureLines.forEach(line => log(`   ${line}`, COLORS.RED));
      }
    }
  }
  
  // Save detailed report
  const reportPath = path.join(process.cwd(), '.tmp', 'intellisense-test-report.json');
  try {
    if (!fs.existsSync(path.dirname(reportPath))) {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    log(`\n📄 Detailed report saved to: ${reportPath}`);
  } catch (error) {
    log(`⚠️  Could not save report: ${error.message}`, COLORS.YELLOW);
  }
}

function checkTestCoverage() {
  logHeader('Checking IntelliSense Test Coverage');
  
  const testFiles = [
    'test/intellisense-utils.test.ts',
    'test/intellisense-integration.test.ts', 
    'test/intellisense-regression.test.ts'
  ];
  
  const sourceFiles = [
    'src/utils/intellisense-utils.ts',
    'src/web-ui/intellisense-client.ts',
    'src/web-ui/utility-functions.ts'
  ];
  
  log('📁 Test Files:');
  testFiles.forEach(file => {
    const exists = fs.existsSync(file);
    log(`   ${exists ? '✅' : '❌'} ${file}`, exists ? COLORS.GREEN : COLORS.RED);
  });
  
  log('\n📁 Source Files:');
  sourceFiles.forEach(file => {
    const exists = fs.existsSync(file);
    log(`   ${exists ? '✅' : '❌'} ${file}`, exists ? COLORS.GREEN : COLORS.RED);
  });
}

function main() {
  log(`${COLORS.BOLD}🧪 IntelliSense Regression Test Suite${COLORS.RESET}`);
  log('This tool helps prevent IntelliSense regressions by running comprehensive tests.\n');
  
  // Check test coverage
  checkTestCoverage();
  
  // Run tests
  const success = runTests();
  
  // Exit with appropriate code
  if (success) {
    log(`\n🎯 All IntelliSense tests passed! Safe to deploy.`, COLORS.GREEN);
    process.exit(0);
  } else {
    log(`\n🚨 IntelliSense tests failed! Please fix regressions before deploying.`, COLORS.RED);
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
IntelliSense Test Runner

Usage:
  node scripts/test-intellisense.js

Options:
  --help, -h    Show this help message

This script runs comprehensive IntelliSense tests to detect regressions.
It's recommended to run this before any IntelliSense-related changes.
  `);
  process.exit(0);
}

main();
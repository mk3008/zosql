// ai-auto-test.js - AI-driven automated testing system for zosql

import ZosqlApiTestClient from './api-test-client.js';

class ZosqlAiAutoTest {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.apiClient = new ZosqlApiTestClient(baseUrl);
    this.testScenarios = [];
    this.results = [];
  }

  async runAiTests() {
    console.log('🤖 Starting AI-driven automated tests...');
    console.log('=' .repeat(60));

    // Generate test scenarios
    this.generateTestScenarios();

    // Run basic API tests first
    console.log('\n📋 Running basic API health checks...');
    const apiResults = await this.apiClient.runAllTests();
    
    // Check if basic APIs are working
    const failedApis = apiResults.filter(r => r.status === 'FAIL');
    if (failedApis.length > 0) {
      console.log('❌ Basic API tests failed. Fixing issues...');
      await this.diagnoseFixes(failedApis);
    }

    // Run AI-generated test scenarios
    console.log('\n🤖 Running AI-generated test scenarios...');
    await this.runTestScenarios();

    // Generate comprehensive report
    this.generateReport();

    return this.results;
  }

  generateTestScenarios() {
    this.testScenarios = [
      {
        name: 'Complex SQL Decomposition',
        description: 'Test decomposition of complex SQL with multiple CTEs',
        type: 'decompose',
        sql: `
          WITH high_value_customers AS (
            SELECT user_id, SUM(amount) as total_spent
            FROM orders
            WHERE order_date >= '2024-01-01'
            GROUP BY user_id
            HAVING SUM(amount) > 1000
          ),
          customer_orders AS (
            SELECT 
              hvc.user_id,
              hvc.total_spent,
              COUNT(o.id) as order_count,
              AVG(o.amount) as avg_order_value
            FROM high_value_customers hvc
            JOIN orders o ON hvc.user_id = o.user_id
            GROUP BY hvc.user_id, hvc.total_spent
          )
          SELECT 
            u.name,
            u.email,
            co.total_spent,
            co.order_count,
            co.avg_order_value,
            CASE 
              WHEN co.total_spent > 5000 THEN 'Premium'
              WHEN co.total_spent > 2000 THEN 'Gold'
              ELSE 'Silver'
            END as customer_tier
          FROM users u
          JOIN customer_orders co ON u.id = co.user_id
          ORDER BY co.total_spent DESC
        `,
        expectedBehavior: 'Should decompose into main.sql and 2 CTE files'
      },
      {
        name: 'Simple Query Execution',
        description: 'Test basic query execution with sample data',
        type: 'execute',
        sql: 'SELECT COUNT(*) as user_count FROM users',
        expectedBehavior: 'Should return count of users'
      },
      {
        name: 'Join Query with Aggregation',
        description: 'Test complex join with aggregation',
        type: 'execute',
        sql: `
          SELECT 
            u.name,
            COUNT(o.id) as order_count,
            SUM(o.amount) as total_spent
          FROM users u
          LEFT JOIN orders o ON u.id = o.user_id
          GROUP BY u.id, u.name
          ORDER BY total_spent DESC NULLS LAST
        `,
        expectedBehavior: 'Should return user statistics with order data'
      },
      {
        name: 'Malformed SQL Handling',
        description: 'Test error handling for malformed SQL',
        type: 'error-handling',
        sql: 'SELECT * FROM non_existent_table WHERE invalid syntax',
        expectedBehavior: 'Should return appropriate error message'
      },
      {
        name: 'SQL Formatting',
        description: 'Test SQL formatting with various styles',
        type: 'format',
        sql: 'select*from users where id=1and name like\'%test%\'',
        expectedBehavior: 'Should format SQL with proper spacing and case'
      },
      {
        name: 'Nested CTE Decomposition',
        description: 'Test decomposition of nested CTEs',
        type: 'decompose',
        sql: `
          WITH base_data AS (
            SELECT id, name, email FROM users
          ),
          enriched_data AS (
            SELECT 
              bd.*,
              (SELECT COUNT(*) FROM orders WHERE user_id = bd.id) as order_count
            FROM base_data bd
          )
          SELECT * FROM enriched_data WHERE order_count > 0
        `,
        expectedBehavior: 'Should handle nested CTEs correctly'
      }
    ];

    console.log(`📝 Generated ${this.testScenarios.length} test scenarios`);
  }

  async runTestScenarios() {
    for (const scenario of this.testScenarios) {
      console.log(`\n🧪 Testing: ${scenario.name}`);
      console.log(`   Description: ${scenario.description}`);
      
      try {
        const result = await this.executeScenario(scenario);
        this.results.push({
          scenario: scenario.name,
          status: 'PASS',
          result: result,
          timestamp: new Date().toISOString()
        });
        console.log(`   ✅ ${scenario.name} passed`);
      } catch (error) {
        this.results.push({
          scenario: scenario.name,
          status: 'FAIL',
          error: error.message,
          timestamp: new Date().toISOString()
        });
        console.log(`   ❌ ${scenario.name} failed: ${error.message}`);
      }
    }
  }

  async executeScenario(scenario) {
    switch (scenario.type) {
      case 'decompose':
        return await this.testDecompose(scenario);
      case 'execute':
        return await this.testExecute(scenario);
      case 'format':
        return await this.testFormat(scenario);
      case 'error-handling':
        return await this.testErrorHandling(scenario);
      default:
        throw new Error(`Unknown scenario type: ${scenario.type}`);
    }
  }

  async testDecompose(scenario) {
    const response = await fetch(`${this.baseUrl}/api/decompose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: scenario.sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Decomposition failed');
    }

    // Validate decomposition results
    if (!data.mainQuery && !data.decomposedFiles) {
      throw new Error('Decomposition should return mainQuery or decomposedFiles');
    }

    return data;
  }

  async testExecute(scenario) {
    const response = await fetch(`${this.baseUrl}/api/execute-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: scenario.sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Query execution failed');
    }

    return data;
  }

  async testFormat(scenario) {
    const response = await fetch(`${this.baseUrl}/api/format-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: scenario.sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'SQL formatting failed');
    }

    if (!data.formatted) {
      throw new Error('Formatted SQL not returned');
    }

    return data;
  }

  async testErrorHandling(scenario) {
    const response = await fetch(`${this.baseUrl}/api/execute-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: scenario.sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // For error handling tests, we expect the API to return success=false
    if (data.success) {
      throw new Error('Expected error but query succeeded');
    }

    if (!data.error) {
      throw new Error('Error message not provided');
    }

    return data;
  }

  async diagnoseFixes(failedApis) {
    console.log('\n🔧 Diagnosing and suggesting fixes...');
    
    for (const failure of failedApis) {
      console.log(`\n❌ ${failure.testName}: ${failure.message}`);
      
      // AI-like diagnosis based on common patterns
      if (failure.testName.includes('Decompose')) {
        console.log('   💡 Suggestion: Check if workspace API is properly configured');
        console.log('   💡 Suggestion: Verify SQL decomposer is working');
      } else if (failure.testName.includes('Query Execution')) {
        console.log('   💡 Suggestion: Check database connection');
        console.log('   💡 Suggestion: Verify PGLite initialization');
      } else if (failure.testName.includes('Schema')) {
        console.log('   💡 Suggestion: Check schema.js file exists');
        console.log('   💡 Suggestion: Verify schema API endpoint');
      }
    }
  }

  generateReport() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    console.log('\n' + '=' .repeat(60));
    console.log('🤖 AI Auto-Test Report');
    console.log('=' .repeat(60));
    console.log(`📊 Overall Results:`);
    console.log(`   Total Scenarios: ${total}`);
    console.log(`   Passed: ${passed} ✅`);
    console.log(`   Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Scenarios:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`   - ${r.scenario}: ${r.error}`);
        });
      
      console.log('\n🔧 Recommended Actions:');
      console.log('   1. Check server logs for detailed error messages');
      console.log('   2. Verify all API endpoints are properly configured');
      console.log('   3. Test individual APIs manually');
      console.log('   4. Check database connectivity and sample data');
    }
    
    console.log('\n📈 Test Coverage Analysis:');
    const coverageAreas = ['decompose', 'execute', 'format', 'error-handling'];
    coverageAreas.forEach(area => {
      const areaTests = this.results.filter(r => r.scenario.toLowerCase().includes(area));
      if (areaTests.length > 0) {
        const areaPassed = areaTests.filter(r => r.status === 'PASS').length;
        console.log(`   ${area}: ${areaPassed}/${areaTests.length} (${((areaPassed / areaTests.length) * 100).toFixed(1)}%)`);
      }
    });
    
    console.log('=' .repeat(60));
  }
}

// Command line usage
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('ai-auto-test.js')) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const aiTest = new ZosqlAiAutoTest(baseUrl);
  
  aiTest.runAiTests()
    .then(results => {
      const failed = results.filter(r => r.status === 'FAIL').length;
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('AI Auto-Test error:', error);
      process.exit(1);
    });
}

export default ZosqlAiAutoTest;
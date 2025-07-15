// api-test-client.js - API testing client for zosql browser

class ZosqlApiTestClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
    this.startTime = null;
  }

  async runAllTests() {
    this.startTime = Date.now();
    this.testResults = [];

    console.log('🚀 Starting zosql API Tests...');
    console.log('=' .repeat(50));

    const testSuites = [
      { name: 'Health Check', test: () => this.testHealthCheck() },
      { name: 'Schema API', test: () => this.testSchemaApi() },
      { name: 'Shared CTE API', test: () => this.testSharedCteApi() },
      { name: 'SQL Parser API', test: () => this.testSqlParserApi() },
      { name: 'SQL Formatter API', test: () => this.testSqlFormatterApi() },
      { name: 'Decompose API', test: () => this.testDecomposeApi() },
      { name: 'Query Execution API', test: () => this.testQueryExecutionApi() },
      { name: 'Workspace API', test: () => this.testWorkspaceApi() }
    ];

    for (const suite of testSuites) {
      try {
        console.log(`\n📋 Testing ${suite.name}...`);
        await suite.test();
        this.logResult(suite.name, 'PASS', 'All tests passed');
      } catch (error) {
        this.logResult(suite.name, 'FAIL', error.message);
        console.error(`❌ ${suite.name} failed:`, error.message);
      }
    }

    this.printSummary();
    return this.testResults;
  }

  async testHealthCheck() {
    const response = await this.fetch('/api/health');
    this.assertResponse(response, 200);
    
    const data = await response.json();
    this.assert(data.status === 'ok', 'Health check status should be ok');
    this.assert(data.timestamp, 'Health check should include timestamp');
    
    console.log('✅ Health check passed');
  }

  async testSchemaApi() {
    // Test schema endpoint
    const response = await this.fetch('/api/schema');
    this.assertResponse(response, 200);
    
    const data = await response.json();
    this.assert(data.success, 'Schema API should return success');
    this.assert(data.schema, 'Schema API should return schema data');
    this.assert(data.schema.tables, 'Schema should contain tables');
    this.assert(Array.isArray(data.schema.tables), 'Tables should be an array');
    
    console.log(`✅ Schema API passed (${data.schema.tables.length} tables)`);

    // Test schema completion endpoint
    const completionResponse = await this.fetch('/api/schema/completion');
    this.assertResponse(completionResponse, 200);
    
    const completionData = await completionResponse.json();
    this.assert(completionData.success, 'Schema completion API should return success');
    
    console.log('✅ Schema completion API passed');
  }

  async testSharedCteApi() {
    // Test shared CTE endpoint
    const response = await this.fetch('/api/shared-cte');
    this.assertResponse(response, 200);
    
    const data = await response.json();
    this.assert(data.success, 'Shared CTE API should return success');
    
    console.log('✅ Shared CTE API passed');

    // Test shared CTE completion endpoint
    const completionResponse = await this.fetch('/api/shared-cte/completion');
    this.assertResponse(completionResponse, 200);
    
    console.log('✅ Shared CTE completion API passed');
  }

  async testSqlParserApi() {
    const testSql = 'SELECT * FROM users WHERE id = 1';
    
    const response = await this.fetch('/api/parse-sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: testSql })
    });
    
    this.assertResponse(response, 200);
    
    const data = await response.json();
    this.assert(data.success, 'SQL Parser API should return success');
    
    console.log('✅ SQL Parser API passed');
  }

  async testSqlFormatterApi() {
    const testSql = 'select * from users where id=1';
    
    const response = await this.fetch('/api/format-sql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: testSql })
    });
    
    this.assertResponse(response, 200);
    
    const data = await response.json();
    this.assert(data.success, 'SQL Formatter API should return success');
    this.assert(data.formatted || data.formattedSql, 'SQL Formatter should return formatted SQL');
    
    console.log('✅ SQL Formatter API passed');
  }

  async testDecomposeApi() {
    const testSql = `
      WITH user_stats AS (
        SELECT user_id, COUNT(*) as order_count
        FROM orders
        GROUP BY user_id
      )
      SELECT u.name, us.order_count
      FROM users u
      JOIN user_stats us ON u.id = us.user_id
      WHERE us.order_count > 5
    `;
    
    const response = await this.fetch('/api/decompose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: testSql })
    });
    
    this.assertResponse(response, 200);
    
    const data = await response.json();
    this.assert(data.success, 'Decompose API should return success');
    
    console.log('✅ Decompose API passed');
  }

  async testQueryExecutionApi() {
    const testSql = 'SELECT 1 as test_value';
    
    const response = await this.fetch('/api/execute-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: testSql })
    });
    
    this.assertResponse(response, 200);
    
    const data = await response.json();
    this.assert(data.success, 'Query Execution API should return success');
    this.assert(data.results || data.result, 'Query Execution should return results');
    
    console.log('✅ Query Execution API passed');
  }

  async testWorkspaceApi() {
    // Test workspace info
    const response = await this.fetch('/api/workspace');
    this.assertResponse(response, 200);
    
    const data = await response.json();
    this.assert(data.success, 'Workspace API should return success');
    
    console.log('✅ Workspace API passed');
  }

  async fetch(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, options);
    return response;
  }

  assertResponse(response, expectedStatus) {
    this.assert(response.status === expectedStatus, 
      `Expected status ${expectedStatus}, got ${response.status}`);
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  logResult(testName, status, message) {
    const result = {
      testName,
      status,
      message,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
  }

  printSummary() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Summary:');
    console.log(`   Total: ${total}`);
    console.log(`   Passed: ${passed} ✅`);
    console.log(`   Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.testName}: ${r.message}`));
    }
    
    console.log('=' .repeat(50));
  }
}

// Export as ES module
export default ZosqlApiTestClient;

// Browser usage
if (typeof window !== 'undefined') {
  window.ZosqlApiTestClient = ZosqlApiTestClient;
}

// Auto-run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('api-test-client.js')) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const client = new ZosqlApiTestClient(baseUrl);
  
  client.runAllTests()
    .then(results => {
      const failed = results.filter(r => r.status === 'FAIL').length;
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}
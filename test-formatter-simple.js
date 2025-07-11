import pkg from 'rawsql-ts';
const { SqlFormatter, SelectQueryParser } = pkg;

console.log('=== Testing SqlFormatter configurations ===\n');

// Simple SQL string to test
const sqlString = 'SELECT user_id, name, email FROM users WHERE user_id = 123 AND active = true';

// Parse the SQL into AST
const query = SelectQueryParser.parse(sqlString);

// Test 1: Default configuration
console.log('1. Default configuration:');
const formatter1 = new SqlFormatter();
const result1 = formatter1.format(query);
console.log(result1.formattedSql);
console.log();

// Test 2: Empty identifierEscape
console.log('2. Empty identifierEscape:');
try {
  const formatter2 = new SqlFormatter({
    identifierEscape: { start: '', end: '' }
  });
  const result2 = formatter2.format(query);
  console.log(result2.formattedSql);
} catch (error) {
  console.log('Error:', error.message);
}
console.log();

// Test 3: MySQL preset (backticks)
console.log('3. MySQL preset:');
const formatter3 = new SqlFormatter({ preset: 'mysql' });
const result3 = formatter3.format(query);
console.log(result3.formattedSql);
console.log();

// Test 4: PostgreSQL preset (double quotes)
console.log('4. PostgreSQL preset:');
const formatter4 = new SqlFormatter({ preset: 'postgres' });
const result4 = formatter4.format(query);
console.log(result4.formattedSql);
console.log();

// Test 5: SQL Server preset (square brackets)
console.log('5. SQL Server preset:');
const formatter5 = new SqlFormatter({ preset: 'sqlserver' });
const result5 = formatter5.format(query);
console.log(result5.formattedSql);
console.log();

// Test 6: Custom identifierEscape with no quotes
console.log('6. Custom identifierEscape with no quotes:');
try {
  const formatter6 = new SqlFormatter({
    identifierEscape: { start: '', end: '' }
  });
  const result6 = formatter6.format(query);
  console.log(result6.formattedSql);
} catch (error) {
  console.log('Error:', error.message);
}
console.log();

// Test 7: No preset provided
console.log('7. No preset provided:');
const formatter7 = new SqlFormatter({});
const result7 = formatter7.format(query);
console.log(result7.formattedSql);
console.log();

// Test 8: Null/undefined identifierEscape
console.log('8. Null identifierEscape:');
try {
  const formatter8 = new SqlFormatter({
    identifierEscape: null
  });
  const result8 = formatter8.format(query);
  console.log(result8.formattedSql);
} catch (error) {
  console.log('Error:', error.message);
}
console.log();
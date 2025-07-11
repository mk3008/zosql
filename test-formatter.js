import pkg from 'rawsql-ts';
const { sql, SqlFormatter } = pkg;

// Test query
const query = sql`
  SELECT user_id, name, email
  FROM users
  WHERE user_id = ${123}
    AND active = ${true}
`;

console.log('=== Testing different SqlFormatter configurations ===\n');

// Test 1: Default configuration
console.log('1. Default configuration:');
const formatter1 = new SqlFormatter();
const result1 = formatter1.format(query);
console.log(result1.formattedSql);
console.log('Params:', result1.params);
console.log();

// Test 2: No identifierEscape
console.log('2. Empty identifierEscape:');
try {
  const formatter2 = new SqlFormatter({
    identifierEscape: { start: '', end: '' }
  });
  const result2 = formatter2.format(query);
  console.log(result2.formattedSql);
  console.log('Params:', result2.params);
} catch (error) {
  console.log('Error:', error.message);
}
console.log();

// Test 3: MySQL preset (backticks)
console.log('3. MySQL preset:');
const formatter3 = new SqlFormatter({ preset: 'mysql' });
const result3 = formatter3.format(query);
console.log(result3.formattedSql);
console.log('Params:', result3.params);
console.log();

// Test 4: PostgreSQL preset (double quotes)
console.log('4. PostgreSQL preset:');
const formatter4 = new SqlFormatter({ preset: 'postgres' });
const result4 = formatter4.format(query);
console.log(result4.formattedSql);
console.log('Params:', result4.params);
console.log();

// Test 5: SQL Server preset (square brackets)
console.log('5. SQL Server preset:');
const formatter5 = new SqlFormatter({ preset: 'sqlserver' });
const result5 = formatter5.format(query);
console.log(result5.formattedSql);
console.log('Params:', result5.params);
console.log();

// Test 6: Custom identifierEscape with space
console.log('6. Custom identifierEscape with space:');
try {
  const formatter6 = new SqlFormatter({
    identifierEscape: { start: ' ', end: ' ' }
  });
  const result6 = formatter6.format(query);
  console.log(result6.formattedSql);
  console.log('Params:', result6.params);
} catch (error) {
  console.log('Error:', error.message);
}
console.log();

// Test 7: Try undefined identifierEscape
console.log('7. Undefined identifierEscape:');
try {
  const formatter7 = new SqlFormatter({
    identifierEscape: undefined
  });
  const result7 = formatter7.format(query);
  console.log(result7.formattedSql);
  console.log('Params:', result7.params);
} catch (error) {
  console.log('Error:', error.message);
}
console.log();

// Test 8: Try null identifierEscape
console.log('8. Null identifierEscape:');
try {
  const formatter8 = new SqlFormatter({
    identifierEscape: null
  });
  const result8 = formatter8.format(query);
  console.log(result8.formattedSql);
  console.log('Params:', result8.params);
} catch (error) {
  console.log('Error:', error.message);
}
console.log();
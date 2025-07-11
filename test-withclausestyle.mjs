import { SelectQueryParser, SqlFormatter } from 'rawsql-ts';

// Test SQL with CTE
const sqlWithCTE = `
    WITH user_summary AS (
        SELECT id, name, COUNT(*)
        FROM users
        WHERE active = true
        GROUP BY id, name
    )
    SELECT * FROM user_summary
    ORDER BY name;
`;

const sqlWithMultipleCTEs = `
    WITH 
    active_users AS (
        SELECT id, name
        FROM users
        WHERE active = true
    ),
    user_orders AS (
        SELECT user_id, COUNT(*) as order_count
        FROM orders
        GROUP BY user_id
    )
    SELECT u.id, u.name, o.order_count
    FROM active_users u
    LEFT JOIN user_orders o ON u.id = o.user_id
    ORDER BY u.name;
`;

console.log('=== Testing withClauseStyle in rawsql-ts 0.11.11-beta ===');

// Test different withClauseStyle values
const testCases = [
    { name: 'Default (no withClauseStyle)', options: {} },
    { name: 'withClauseStyle: "normal"', options: { withClauseStyle: 'normal' } },
    { name: 'withClauseStyle: "oneline"', options: { withClauseStyle: 'oneline' } },
    { name: 'withClauseStyle: "full-oneline"', options: { withClauseStyle: 'full-oneline' } },
    { name: 'withClauseStyle: "multiline"', options: { withClauseStyle: 'multiline' } },
    { name: 'cteOneline: true (existing)', options: { cteOneline: true } },
    { name: 'both withClauseStyle: "full-oneline" and cteOneline: true', options: { withClauseStyle: 'full-oneline', cteOneline: true } },
];

console.log('\n=== Single CTE Tests ===');
testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}:`);
    try {
        const query = SelectQueryParser.parse(sqlWithCTE);
        const formatter = new SqlFormatter({
            newline: '\n',
            indentSize: 2,
            indentChar: ' ',
            ...testCase.options
        });
        const result = formatter.format(query);
        console.log(result.formattedSql);
    } catch (error) {
        console.log('Error:', error.message);
    }
});

console.log('\n=== Multiple CTEs Tests ===');
testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}:`);
    try {
        const query = SelectQueryParser.parse(sqlWithMultipleCTEs);
        const formatter = new SqlFormatter({
            newline: '\n',
            indentSize: 2,
            indentChar: ' ',
            ...testCase.options
        });
        const result = formatter.format(query);
        console.log(result.formattedSql);
    } catch (error) {
        console.log('Error:', error.message);
    }
});

// Test complex nested CTEs
console.log('\n=== Complex nested CTEs with withClauseStyle ===');
const complexCTE = `
    WITH level1 AS (
        SELECT id, name FROM users WHERE active = true
    ),
    level2 AS (
        SELECT l1.id, l1.name, COUNT(o.id) as order_count
        FROM level1 l1
        LEFT JOIN orders o ON l1.id = o.user_id
        GROUP BY l1.id, l1.name
    ),
    level3 AS (
        SELECT l2.*, AVG(p.amount) as avg_payment
        FROM level2 l2
        LEFT JOIN payments p ON l2.id = p.user_id
        GROUP BY l2.id, l2.name, l2.order_count
    )
    SELECT * FROM level3 ORDER BY avg_payment DESC;
`;

console.log('\nComplex CTE with withClauseStyle: "full-oneline":');
try {
    const query = SelectQueryParser.parse(complexCTE);
    const formatter = new SqlFormatter({
        newline: '\n',
        indentSize: 2,
        indentChar: ' ',
        withClauseStyle: 'full-oneline'
    });
    const result = formatter.format(query);
    console.log(result.formattedSql);
} catch (error) {
    console.log('Error:', error.message);
}
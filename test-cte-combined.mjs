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

console.log('=== Testing cteOneline and withClauseStyle combinations ===');

// Test different combinations
const testCases = [
    { name: 'cteOneline: true only', options: { cteOneline: true } },
    { name: 'withClauseStyle: "full-oneline" only', options: { withClauseStyle: 'full-oneline' } },
    { name: 'both cteOneline: true and withClauseStyle: "full-oneline"', options: { cteOneline: true, withClauseStyle: 'full-oneline' } },
    { name: 'cteOneline: true and withClauseStyle: "normal"', options: { cteOneline: true, withClauseStyle: 'normal' } },
    { name: 'cteOneline: true and withClauseStyle: "oneline"', options: { cteOneline: true, withClauseStyle: 'oneline' } },
    { name: 'cteOneline: true and withClauseStyle: "multiline"', options: { cteOneline: true, withClauseStyle: 'multiline' } },
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

// Test with different formatting options
console.log('\n=== Testing with different formatting options ===');
const advancedTests = [
    { 
        name: 'withClauseStyle: "full-oneline" + cteOneline: true + keywordCase: "upper"',
        options: { 
            withClauseStyle: 'full-oneline', 
            cteOneline: true, 
            keywordCase: 'upper' 
        }
    },
    { 
        name: 'withClauseStyle: "full-oneline" + cteOneline: true + commaBreak: "before"',
        options: { 
            withClauseStyle: 'full-oneline', 
            cteOneline: true, 
            commaBreak: 'before' 
        }
    },
    { 
        name: 'withClauseStyle: "full-oneline" + cteOneline: true + one-liner format',
        options: { 
            withClauseStyle: 'full-oneline', 
            cteOneline: true,
            newline: ' ',
            indentSize: 0,
            indentChar: ''
        }
    },
];

advancedTests.forEach((testCase, index) => {
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
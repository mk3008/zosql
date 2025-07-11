import { SelectQueryParser, SqlFormatter } from 'rawsql-ts';

console.log('=== Final Verification: rawsql-ts 0.11.11-beta withClauseStyle ===');

// Test SQL with complex CTE structure
const complexSQL = `
    WITH RECURSIVE category_hierarchy AS (
        SELECT id, name, parent_id, 1 as level
        FROM categories
        WHERE parent_id IS NULL
        UNION ALL
        SELECT c.id, c.name, c.parent_id, ch.level + 1
        FROM categories c
        JOIN category_hierarchy ch ON c.parent_id = ch.id
    ),
    product_stats AS (
        SELECT 
            category_id,
            COUNT(*) as product_count,
            AVG(price) as avg_price,
            MAX(price) as max_price
        FROM products
        WHERE active = true
        GROUP BY category_id
    ),
    final_report AS (
        SELECT 
            ch.id,
            ch.name,
            ch.level,
            COALESCE(ps.product_count, 0) as product_count,
            COALESCE(ps.avg_price, 0) as avg_price,
            COALESCE(ps.max_price, 0) as max_price
        FROM category_hierarchy ch
        LEFT JOIN product_stats ps ON ch.id = ps.category_id
    )
    SELECT * FROM final_report
    ORDER BY level, name;
`;

console.log('\n=== Available withClauseStyle Options ===');
const withClauseStyleOptions = [
    'normal',
    'oneline', 
    'full-oneline',
    'multiline'
];

withClauseStyleOptions.forEach((style, index) => {
    console.log(`\n${index + 1}. withClauseStyle: "${style}"`);
    try {
        const query = SelectQueryParser.parse(complexSQL);
        const formatter = new SqlFormatter({
            newline: '\n',
            indentSize: 2,
            indentChar: ' ',
            withClauseStyle: style
        });
        const result = formatter.format(query);
        console.log(result.formattedSql);
    } catch (error) {
        console.log('Error:', error.message);
    }
});

console.log('\n=== Recommended Usage Examples ===');

// Example 1: Compact CTE formatting
console.log('\n1. Compact CTE formatting (withClauseStyle: "full-oneline" + cteOneline: true):');
try {
    const query = SelectQueryParser.parse(complexSQL);
    const formatter = new SqlFormatter({
        newline: '\n',
        indentSize: 2,
        indentChar: ' ',
        withClauseStyle: 'full-oneline',
        cteOneline: true
    });
    const result = formatter.format(query);
    console.log(result.formattedSql);
} catch (error) {
    console.log('Error:', error.message);
}

// Example 2: Ultra-compact one-liner
console.log('\n2. Ultra-compact one-liner (全て一行):');
try {
    const query = SelectQueryParser.parse(complexSQL);
    const formatter = new SqlFormatter({
        newline: ' ',
        indentSize: 0,
        indentChar: '',
        withClauseStyle: 'full-oneline',
        cteOneline: true
    });
    const result = formatter.format(query);
    console.log(result.formattedSql);
} catch (error) {
    console.log('Error:', error.message);
}

// Example 3: Normal formatting with keywords in uppercase
console.log('\n3. Normal formatting with uppercase keywords:');
try {
    const query = SelectQueryParser.parse(complexSQL);
    const formatter = new SqlFormatter({
        newline: '\n',
        indentSize: 2,
        indentChar: ' ',
        withClauseStyle: 'normal',
        keywordCase: 'upper'
    });
    const result = formatter.format(query);
    console.log(result.formattedSql);
} catch (error) {
    console.log('Error:', error.message);
}

// Summary
console.log('\n=== Summary ===');
console.log('rawsql-ts 0.11.11-beta withClauseStyle options:');
console.log('- "normal": Default behavior (same as no option)');
console.log('- "oneline": Same as normal (CTE内容は通常フォーマット)');
console.log('- "full-oneline": WITH句全体を1行に配置、CTE内容は通常フォーマット');
console.log('- "multiline": Same as normal (CTE内容は通常フォーマット)');
console.log('');
console.log('Additional cteOneline option:');
console.log('- cteOneline: true - 各CTE定義内容を1行に配置');
console.log('');
console.log('Recommended combinations:');
console.log('- withClauseStyle: "full-oneline" + cteOneline: true - 最もコンパクト');
console.log('- withClauseStyle: "full-oneline" only - WITH句のみ1行、CTE内容は見やすく');
console.log('- cteOneline: true only - WITH句は通常、CTE内容のみ1行');
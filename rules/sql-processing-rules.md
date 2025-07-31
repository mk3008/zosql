# SQL Processing Rules

Core rules for SQL parsing, processing, and execution.

## rawsql-ts Usage (MANDATORY)
ALL SQL parsing must use rawsql-ts - no exceptions.

```typescript
import {SelectQueryParser,SqlFormatter,FormatterOptions} from 'rawsql-ts';

// SQL parsing
export function analyzeSql(sql: string) {
  const query = SelectQueryParser.parse(sql);
  return {tables: query.tableList, columns: query.columnList, conditions: query.whereClause};
}

// SQL formatting - use Workspace settings
export function formatSql(query: SelectQuery, workspace: Workspace): string {
  const options: FormatterOptions = {
    indent: ' '.repeat(workspace.formatterStyle.indentSize),
    uppercase: workspace.formatterStyle.uppercase,
    linesBetweenQueries: workspace.formatterStyle.linesBetweenQueries
  };
  return new SqlFormatter(options).format(query).formattedSql;
}

// Forbidden: Regex parsing/string manipulation
function parseSqlBad(sql: string) {
  const tableMatch = sql.match(/FROM\s+(\w+)/i); // NEVER DO THIS
}
```

## CTE Handling (MANDATORY)
```typescript
// Always convert WITH clauses to SimpleSelectQuery
export function processCteQuery(sql: string): SelectQuery {
  const query = SelectQueryParser.parse(sql);
  return query.type === 'WITH' ? query.toSimpleQuery() : query;
}
```

## PGlite Constraints (CRITICAL)
Use only for SQL validation. Schema/data operations forbidden.

```typescript
// Safe: SQL validation only
const db = new PGlite();
try {
  await db.exec(userSql);
} catch (error) {
  throw new ValidationError('Invalid SQL syntax');
}

// Forbidden: Schema/data operations
await db.exec('CREATE TABLE users (...)');    // FORBIDDEN
await db.exec('INSERT INTO users VALUES(...)'); // FORBIDDEN
await db.exec('DROP TABLE users');            // FORBIDDEN
```
# zosql

**[🚀 Live Site](https://mk3008.github.io/zosql)** | **[🎮 Demo Mode](https://mk3008.github.io/zosql/#demo)**

> **Live Site**: Start with a blank workspace, upload your SQL files  
> **Demo Mode**: Try pre-loaded sample data and queries

## Overview

zosql is a powerful SQL debugging tool that supports decomposition and composition of SQL statements. It provides a modularized SQL development environment for efficiently developing and testing complex SQL statements with CTEs (Common Table Expressions).

## Features

- **SQL Decomposition & Composition**: Modularize complex SQL statements using CTE-based approach, enabling partial execution and testing
- **Real-time Execution**: Instant query execution in a browser-based PostgreSQL environment using PGlite
- **Interactive Editor**: Advanced SQL editing capabilities with Monaco Editor (syntax highlighting, auto-completion)
- **Filter Condition Management**: Dynamic WHERE condition combinations and testing
- **Test Data Management**: CTE-format test data definition and management
- **SQL Formatting**: Automatic SQL formatting with unified code style

## Demo Mode Usage

To try zosql with sample data, visit the **[Demo Mode](https://mk3008.github.io/zosql/#demo)** which provides a pre-configured workspace with sample tables and queries. Follow these steps to explore the features:

### 1. Try Query Execution

1. Click the **Run** button in the top-left corner
2. Check the query results in the Result panel at the bottom
3. The execution result of the default SQL (`SELECT user_id, name FROM users;`) will be displayed

### 2. Modify Filter Conditions

1. Open the **Conditions** tab on the right side
2. Edit the Filter Conditions content (e.g., `{"name": {"ilike": "%a%"}}`)
3. Click the **Run** button to see results with the applied filter

#### Filter Conditions Specification

Filter Conditions use the rawsql-ts specification and support various operators for dynamic WHERE clause generation:

**Empty Conditions (ignored):**
```json
{
  "user_id": {},
  "name": {},
  "status": {}
}
```
Generated SQL: No WHERE clause added (empty conditions are ignored)

**Basic Operators:**
```json
{
  "user_id": {"=": 123},
  "age": {">": 18, "<=": 65},
  "status": {"!=": "inactive"}
}
```
Generated SQL: `WHERE user_id = $1 AND age > $2 AND age <= $3 AND status != $4`

**Text Search:**
```json
{
  "name": {"ilike": "%john%"},
  "description": {"like": "important%"}
}
```
Generated SQL: `WHERE name ILIKE $1 AND description LIKE $2`

**Array Operations:**
```json
{
  "status": {"in": ["active", "pending"]},
  "tags": {"any": ["urgent", "priority"]}
}
```
Generated SQL: `WHERE status IN ($1, $2) AND tags = ANY($3)`

**Range Conditions:**
```json
{
  "price": {"min": 10, "max": 100}
}
```
Generated SQL: `WHERE price >= $1 AND price <= $2`

**Complex Logical Operations:**
```json
{
  "premium_or_high_score": {
    "or": [
      {"column": "type", "=": "premium"},
      {"column": "score", ">": 80}
    ]
  }
}
```
Generated SQL: `WHERE (type = $1 OR score > $2)`

Note: The key `premium_or_high_score` is used as a condition group name and doesn't appear in the generated SQL.

**Multiple Conditions (automatically combined with AND):**
```json
{
  "name": {"ilike": "%john%"},
  "age": {">": 18},
  "status": {"in": ["active", "verified"]}
}
```
Generated SQL: `WHERE name ILIKE $1 AND age > $2 AND status IN ($3, $4)`

### 3. Change Test Data

1. Open the **data** tab at the top
2. Edit the CTE-format test data:
   ```sql
   with users(user_id, name) as (
     values
       (1::bigint, 'alice'::text),
       (2::bigint, 'bob'::text),
       (3::bigint, 'adam'::text)
   )
   ```
3. Click the **Run** button to see results with the new test data

## Development Environment Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access http://localhost:3000 in your browser
```

### Basic Workflow

1. **Load SQL File**: Upload local .sql files
2. **CTE Decomposition**: Complex SQL is automatically decomposed using CTE-based approach
3. **Partial Execution**: Execute and test each CTE and final results individually
4. **Condition Adjustment**: Test dynamic WHERE conditions with Filter Conditions
5. **Data Adjustment**: Run various test cases with Test Values

### Quality Checks

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm run test

# Integrated quality check
npm run quality
```

## Third-Party Libraries and Licenses

### Main Dependencies

- **[rawsql-ts](https://github.com/hurui200320/rawsql-ts)**: SQL parsing and decomposition engine (MIT License)
- **[@electric-sql/pglite](https://github.com/electric-sql/pglite)**: In-browser PostgreSQL (Apache License 2.0)
- **[Monaco Editor](https://github.com/microsoft/monaco-editor)**: Advanced code editor (MIT License)
- **[React](https://github.com/facebook/react)**: UI library (MIT License)
- **[Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)**: CSS framework (MIT License)

### Development & Testing Dependencies

- **[TypeScript](https://github.com/microsoft/TypeScript)**: Type-safe JavaScript (Apache License 2.0)
- **[Vite](https://github.com/vitejs/vite)**: Build tool (MIT License)
- **[Vitest](https://github.com/vitest-dev/vitest)**: Testing framework (MIT License)
- **[ESLint](https://github.com/eslint/eslint)**: JavaScript/TypeScript linter (MIT License)

**Detailed License Terms**: For complete license terms of each library, please refer to [THIRD-PARTY-LICENSES.md](./THIRD-PARTY-LICENSES.md).

## License

MIT License - See [LICENSE](./LICENSE) file for details.

## Development & Contributing

This project is built with TypeScript + React + Vite. For contributors, please check the following:

- Pre-implementation quality checks: `npm run quality`
- Pre-commit hooks: Automatic linting and testing with Husky
- Architecture: Hexagonal Architecture + MVVM pattern
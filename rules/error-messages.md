# Error Message Guidelines

Defines error message strategy for the ZoSQL editor application.

## Core Principles

1. **Clear Attribution**: Distinguish user errors from system errors
2. **Actionable Guidance**: Provide specific next steps for developers
3. **Developer Context**: Use appropriate technical terms with clear action guidance

## Error Categories

### 1. User Input Errors
**Template**: `[COMPONENT] Invalid input: {issue}. Please {action}.`
**Example**: `[SQL Editor] Invalid input: SQL syntax error near 'SELCT'. Please check your SQL syntax.`

**Good Technical Examples**:
- `CTE parsing failed. Verify your SQL syntax and CTE dependencies.`
- `rawsql-ts compilation error. Check your SQL file for syntax issues.`
- `PGlite connection failed. Verify database initialization completed.`

### 2. File System Errors  
**Template**: `[COMPONENT] File operation failed: {operation} {target}. Reason: {reason}. Please {action}.`
**Example**: `[Workspace] File operation failed: Cannot save workspace.sql. Reason: Permission denied. Please check write permissions.`

### 3. System/Internal Errors
**Template**: `[COMPONENT] System error: {description}. Error ID: {id}. This appears to be an application issue.`
**Example**: `[SQL Executor] System error: Database connection failed. Error ID: 2024-01-15-1642-a3f2. This appears to be an application issue.`

### 4. Network/External Service Errors
**Template**: `[COMPONENT] Connection error: {service}. Status: {status}. Please {action}.`
**Example**: `[Shared CTE] Connection error: Cannot reach repository. Status: Network timeout. Please check your connection.`

## Implementation Structure

```typescript
interface ErrorContext {
  component: string;
  operation: string;
  errorType: 'user' | 'system' | 'file' | 'network';
  userMessage: string;
  technicalDetails?: any;
  suggestion?: string;
  errorId?: string; // For system errors only
}
```

## Common Patterns

**Permission Issues**: `Please check that you have {read/write} permissions for {resource}.`

**Invalid SQL**: `Your SQL contains {error type} at line {line}. Hint: {suggestion}.`

**Missing Dependencies**: `{Component} requires {dependency}. Please {install/configure} {dependency} first.`

## Error Handling Best Practices

- **Log**: Full error with stack trace and context
- **Display**: User-friendly message and suggestion only
- **Recovery**: Define retry capability and cleanup requirements
- **Classification**: Use error type to determine user vs system responsibility

## Quick Reference

| Error Type | Developer Message Focus | Technical Log | Recovery Action |
|------------|------------------------|---------------|-----------------|
| User | What's wrong + specific fix | Input validation details | Retry with corrected input |
| File | Operation + permission check | File path + system error | Check permissions/path |
| System | Component + error ID | Full stack trace | Report with ID |
| Network | Service + connectivity | Connection details | Check connection |

## Prohibited Patterns

### Meaningless Error Messages (Detectable by Pattern)
**Pattern**: `'Unknown error'` | `'Something went wrong'` | `'Error occurred'`
**Problem**: Provides no actionable information
**Fix**: Use specific error description or template above

### Missing Action Guidance
**Pattern**: Error messages ending without "Please {action}" or recovery suggestion
**Problem**: Developers don't know what action to take next
**Fix**: Always include specific next step, e.g., "Check write permissions", "Verify SQL syntax"

### Generic Fallback Messages
**Pattern**: `error instanceof Error ? error.message : 'Unknown error'`
**Problem**: 'Unknown error' provides no value
**Fix**: Use specific fallback like `'Unable to complete operation'` with component context

### Vague Failure Messages
**Pattern**: Messages like "Failed to write shared CTEs" without specific guidance
**Problem**: Developers know something failed but not what to do about it
**Fix**: Add specific action guidance, e.g., "Failed to write shared CTEs to file. Check write permissions for the target directory."

### Implementation Details in User Messages
**Pattern**: File paths like `/src/` | Stack traces | Internal variable names
**Problem**: Exposes internal application structure
**Fix**: Use user-context terms like "workspace file" | "application error"

## Detection Rules for file-operation-safety-check

```typescript
// Prohibited patterns to flag during code review
const prohibitedErrorPatterns = [
  /'Unknown error'/,
  /'Something went wrong'/,
  /'Error occurred'/,
  /'Failed to .* without action guidance/,
  /error instanceof Error \? error\.message : '(?!Unable to|Cannot |Failed to)/,
  /throw new Error\(`[^`]*`\)/ // Missing context or action
];
```

## Cross-References

- See `rules/error-handling-rules.md` for SQL-specific error types and fallback restrictions
- For component-specific error patterns, consult individual agent documentation
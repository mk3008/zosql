# Error Handling Rules

Specific error types and patterns for SQL operations, plus fallback restrictions.

## Fallback Logic Restrictions (CRITICAL)

**Fallback logic is PROHIBITED unless explicitly justified.**

### FORBIDDEN
```typescript
// Silent fallback - hides problems
const result = apiCall() || 'default';
if (!data) createFallback();
```

### REQUIRED - Explicit Justification
```typescript
if (!workspace.openedObjects?.length) {
  // FALLBACK JUSTIFICATION: User preference allows empty startup
  // Business: Support blank workspace users  
  // Risk: No data loss, manual file open available
  logger.warn('Using empty workspace per user preference');
  return;
}
```

### MANDATORY Documentation
Every fallback requires:
1. **FALLBACK JUSTIFICATION** comment
2. **Business requirement** explanation  
3. **Risk assessment**
4. **Scope limitation**
5. **User notification** if needed

### Review Rules  
- Missing justification = **automatic rejection**
- Fallbacks require business approval
- Must log with appropriate severity
- Track as technical debt for removal

## SQL Error Types (MANDATORY)
```typescript
// Specific error types for SQL operations
export class SqlParseError extends Error {
  constructor(
    message: string,
    public readonly sql: string,
    public readonly position?: number
  ) {
    super(message);
    this.name = 'SqlParseError';
  }
}

export class CteCircularDependencyError extends Error {
  constructor(
    message: string,
    public readonly dependencies: string[]
  ) {
    super(message);
    this.name = 'CteCircularDependencyError';
  }
}

// Usage in parsers
try {
  const query = SelectQueryParser.parse(sql);
  return query;
} catch (error) {
  throw new SqlParseError(
    `Failed to parse SQL: ${error.message}`,
    sql,
    error.position
  );
}
```
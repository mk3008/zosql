# Error Message Guidelines

Defines error message strategy for the ZoSQL editor application.

## Core Principles

1. **Clear Attribution**: Distinguish user errors from system errors
2. **Actionable Guidance**: Provide specific next steps for developers
3. **Developer Context**: Use appropriate technical terms with clear action guidance

## Error Categories

### Error Templates

1. **User Input**: `[COMPONENT] Invalid input: {issue}. Please {action}.`
2. **File System**: `[COMPONENT] File operation failed: {operation}. Reason: {reason}. Please {action}.`  
3. **System/Internal**: `[COMPONENT] System error: {description}. Error ID: {id}. This appears to be an application issue.`
4. **Network**: `[COMPONENT] Connection error: {service}. Status: {status}. Please {action}.`

## Implementation Pattern
```typescript
interface ErrorContext {
  component: string;
  errorType: 'user' | 'system' | 'file' | 'network';
  userMessage: string;
  suggestion?: string;
  errorId?: string; // System errors only
}
```

## Best Practices
- **Log**: Full error with stack trace and context
- **Display**: User-friendly message with specific action guidance
- **Recovery**: Define retry capability and cleanup requirements
- **Classification**: Use error type to determine responsibility

## Prohibited Patterns

### Avoid These Patterns
- **Meaningless messages**: 'Unknown error', 'Something went wrong', 'Error occurred'
- **Missing action guidance**: Error without "Please {action}" or recovery suggestion  
- **Generic fallbacks**: `error.message : 'Unknown error'` - use specific context instead
- **Vague failures**: "Operation failed" without specific guidance
- **Implementation details**: Internal paths, stack traces, variable names in user messages

### Detection Rules  
```typescript
const prohibitedErrorPatterns = [
  /'Unknown error'/, /'Something went wrong'/, /'Error occurred'/,
  /'Failed to .* without action guidance/,
  /throw new Error\(`[^`]*`\)/ // Missing context
];
```

### Required Fixes
- Always include component context and specific next action
- Use error templates above for consistency
- Log technical details separately from user messages
- Provide recovery guidance for each error type
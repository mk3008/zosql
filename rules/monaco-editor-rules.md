# Monaco Editor Integration Rules

Rules for Monaco Editor SQL integration and IntelliSense.

## IntelliSense Configuration (MANDATORY)
```typescript
// Configure Monaco with SQL language support
export function configureMonacoSql(monaco: Monaco): void {
  monaco.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems: (model, position) => {
      const workspace = getCurrentWorkspace();
      const suggestions = generateSqlSuggestions(workspace, model, position);
      return { suggestions };
    }
  });
}

// Use workspace context for IntelliSense
function generateSqlSuggestions(
  workspace: Workspace,
  model: ITextModel,
  position: Position
): CompletionItem[] {
  // Generate suggestions based on workspace schema
  return workspace.schema.tables.map(table => ({
    label: table.name,
    kind: monaco.languages.CompletionItemKind.Table,
    insertText: table.name
  }));
}
```
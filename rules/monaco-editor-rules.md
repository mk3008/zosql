# Monaco Editor Integration Rules

Rules for Monaco Editor SQL integration, theme management, and remount prevention.

## Theme Management and Flicker Prevention (CRITICAL)
```typescript
// MUST: Use global flag to prevent theme re-initialization on remounts
let globalThemeInitialized = false;

export const MonacoEditor: React.FC<Props> = ({ ... }) => {
  const handleEditorDidMount = (editor: IStandaloneCodeEditor, monaco: Monaco) => {
    // Define theme ONLY ONCE globally to prevent flicker
    if (!globalThemeInitialized) {
      monaco.editor.defineTheme('zosql-dark', { ... });
      globalThemeInitialized = true;
    }
    // Apply theme after ensuring it's defined
    monaco.editor.setTheme('zosql-dark');
  };
};
```

## Preventing Unnecessary Remounts
```typescript
// AVOID: Props that cause unnecessary remounts
// BAD: Inline objects/functions cause remounts
<MonacoEditor 
  options={{ fontSize: 14 }}  // ❌ Creates new object every render
  onMount={() => {...}}       // ❌ Creates new function every render
/>

// GOOD: Memoize options and callbacks
const editorOptions = useMemo(() => ({ fontSize: 14 }), []);
const handleMount = useCallback((editor, monaco) => {...}, []);
<MonacoEditor options={editorOptions} onMount={handleMount} />
```

## Editor Reference Management
```typescript
// MUST: Store editor refs to prevent recreation
const editorRef = useRef<IStandaloneCodeEditor | null>(null);
const monacoRef = useRef<Monaco | null>(null);

// MUST: Clean up on unmount
useEffect(() => {
  return () => {
    editorRef.current?.dispose();
  };
}, []);
```

## IntelliSense Configuration
```typescript
// Configure SQL language support with workspace context
export function configureMonacoSql(monaco: Monaco, workspace: Workspace): void {
  // Register completion provider once per language
  if (!monaco.languages.getLanguages().some(l => l.id === 'sql')) {
    monaco.languages.register({ id: 'sql' });
  }
  
  monaco.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems: (model, position) => {
      return { suggestions: generateSqlSuggestions(workspace, model, position) };
    }
  });
}
```

## Common Issues and Solutions

### Dark Mode Flash on Mount
**Problem**: Editor briefly shows light theme before applying dark theme
**Solution**: Define theme globally once, apply immediately on mount

### Editor Remounting on Tab Switch
**Problem**: Editor loses state when switching tabs
**Solution**: Keep editor instance alive, hide/show with CSS instead of unmounting

### IntelliSense Not Working
**Problem**: Completions not showing for SQL keywords/tables
**Solution**: Ensure language is set to 'sql' and completion provider is registered

## Performance Optimization
```typescript
// MUST: Debounce onChange to prevent excessive updates
const debouncedOnChange = useMemo(
  () => debounce((value: string) => onChange(value), 300),
  [onChange]
);

// MUST: Use virtual scrolling for large files
const options = {
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  fastScrollSensitivity: 5
};
```

## Testing Checklist
- [ ] No theme flicker on initial mount
- [ ] No theme flicker on tab switches
- [ ] Editor state preserved on tab switches
- [ ] IntelliSense shows workspace tables/columns
- [ ] No memory leaks on unmount
- [ ] Smooth scrolling for large SQL files
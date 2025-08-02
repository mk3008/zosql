# Performance Rules

Optimization patterns for CTE processing and SQL parsing.

## CTE Processing Optimization (MANDATORY)
```typescript
// Cache parsed queries
export class SqlQueryCache {
  private cache = new Map<string, SelectQuery>();
  
  getOrParse(sql: string): SelectQuery {
    if (this.cache.has(sql)) {
      return this.cache.get(sql)!;
    }
    
    const query = SelectQueryParser.parse(sql);
    this.cache.set(sql, query);
    return query;
  }
}

// Debounce SQL parsing for editor
export function useDebouncedSqlParsing(sql: string, delay: number = 300) {
  const [parsedQuery, setParsedQuery] = useState<SelectQuery | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const query = SelectQueryParser.parse(sql);
        setParsedQuery(query);
      } catch (error) {
        setParsedQuery(null);
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [sql, delay]);
  
  return parsedQuery;
}
```
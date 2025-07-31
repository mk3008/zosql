# Import Conventions

Import/export standards for TypeScript.

## Import Rules
- Static imports only (no dynamic imports for GitHub Pages)
- Order: Node.js built-ins → External libraries → Internal modules (@aliases) → Relative imports

```typescript
// Import order example
import fs from 'fs';                                    // Node.js
import { SelectQueryParser } from 'rawsql-ts';         // External
import { User } from '@core/entities/user';            // Internal (@alias)
import { formatDate } from './utils';                  // Relative
```

## Path Aliases
Use configured aliases, avoid deep relative paths:
```typescript
// Good: Use @aliases
import { Workspace } from '@core/entities/workspace';

// Bad: Deep relative paths
import { Workspace } from '../../../core/entities/workspace';
```

## Additional Patterns
```typescript
// Type-only imports
import type { User } from '@core/entities/user';

// Named imports for tree shaking
import { useState, useEffect } from 'react';

// Hexagonal architecture: Adapters/UI can import Core, but Core never imports Adapters/UI
// Good: import { User } from '@core/entities/user';
// Bad: import { DatabaseConnection } from '@adapters/database'; // in core files

// Barrel exports for clean imports
// index.ts: export { User } from './user';
// Usage: import { User, Workspace } from '@core/entities';

// Bundle optimization: Import specific functions
import { format } from 'date-fns'; // Good
import * as dateFns from 'date-fns'; // Bad
```
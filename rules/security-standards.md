# Security Standards

Security requirements and forbidden patterns.

## Core Principles
- Defense in depth, never trust user input
- Validate at multiple layers, fail securely
- Use TypeScript's type system as first defense

## Forbidden Patterns
```typescript
// Never: eval(), Function constructor, setTimeout with strings
eval('code'); new Function('return true'); setTimeout('alert("XSS")', 1000);

// Never: any type - use unknown with type guards
function processData(data: unknown): string {
  if (isValidData(data)) return data.someProperty;
  throw new Error('Invalid data');
}

// Never: Dynamic imports with user input
const module = await import(userInput); // FORBIDDEN

// Safe: Static imports only
import { specificModule } from './modules/known-module';
```

## Input Validation & Storage
```typescript
// Validate user inputs with type guards
function validateEmail(email: unknown): string {
  if (typeof email !== 'string') throw new ValidationError('Email must be string');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new ValidationError('Invalid email format');
  return email;
}

// Sanitize HTML content
const sanitizeHtml = (content: string) => content
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

// Safe localStorage with validation
function getStoredData<T>(key: string, validator: (data: unknown) => T): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return validator(JSON.parse(stored));
  } catch (error) {
    localStorage.removeItem(key);
    return null;
  }
}
```

## SQL Security & Environment
```typescript
// PGlite: SQL validation only
const db = new PGlite();
try {
  await db.exec(userSql); // Validate syntax only
} catch (error) {
  throw new ValidationError('Invalid SQL syntax');
}
// FORBIDDEN: CREATE/INSERT/DROP operations

// No hardcoded secrets
const API_URL = process.env.VITE_API_URL || 'https://api.example.com';
// Note: GitHub Pages = all config is public

// Secure error messages - generic for users, detailed for logs
function authenticateUser(credentials: LoginCredentials): User {
  try {
    return performAuthentication(credentials);
  } catch (error) {
    console.error('Auth failed:', error); // Log details
    throw new Error('Invalid credentials'); // Generic message
  }
}
```
# Quality Gates

Quality standards before commit/merge.

## Core Requirements
```bash
# All must pass before commit
tsc --noEmit              # TypeScript errors: 0
npm run lint              # ESLint errors: 0  
npm run test:run          # All tests passing
npm run build             # Build succeeds
```

## Standards
- File size: 500 lines recommended, 1000 max (excluding comments)
- TypeScript: Strict mode, zero errors, no type suppression comments allowed
- ESLint: `@typescript-eslint/no-explicit-any: error`, `@typescript-eslint/ban-ts-comment: error`, `no-unused-vars: error`, `eqeqeq: always`

## Type Safety Requirements
### Prohibit Type Suppression Comments
**Why**: @ts-nocheck and @ts-ignore comments disable TypeScript's safety mechanisms, allowing runtime errors and reducing code reliability
**How**: All code must pass TypeScript compilation without suppression comments. Fix underlying type issues through proper typing, type guards, or refactoring.

## Test & Build Standards
- Coverage: Core logic 90%+, ViewModels 85%+, utilities 80%+
- Build: <500KB main bundle, <2MB total, no warnings  
- Security: No secrets, eval(), regular `npm audit`

## Pre-commit Checklist
```bash
tsc --noEmit && npm run lint && npm run test:run && npm run build
```

## Code Review Requirements
- [ ] TypeScript/ESLint/tests pass, file size limits, naming conventions
- [ ] Business logic tested, no security vulnerabilities, performance assessed
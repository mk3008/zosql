# Git Workflow Standards

Git usage rules and workflows for the project.

## Branch Strategy
- **Main Branch**: `main` or `master`
- **Development Branches**: Create feature-specific branches
- **Hotfix Branches**: Emergency fix branches

## Commit Principles
- Small and frequent commits
- One change per commit
- Run quality checks before committing

## Commit Message Format
```
type: brief description (50 characters or less)

Detailed explanation (if necessary)
- Reason for change
- Impact scope
- Notes

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Commit Types
- `feat`: Add new feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `style`: Code style changes
- `test`: Add or modify tests
- `chore`: Build and configuration changes

## Example Commit
```bash
feat: add CTE dependency analysis functionality

Implement automatic detection of WITH clause dependencies
- Use SelectQueryParser for AST analysis
- Handle circular dependency errors
- Performance improvement: 30% faster for large queries

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Workflow Steps
1. Create feature branch from main
2. Make changes with quality checks
3. Write descriptive commit messages
4. Push branch and create pull request
5. Code review and merge

## Branch Naming
- `feature/description`
- `fix/bug-description`
- `refactor/component-name`
- `docs/update-readme`

## Pre-commit Requirements
- TypeScript compilation passes
- All tests pass
- ESLint rules satisfied
- Build succeeds
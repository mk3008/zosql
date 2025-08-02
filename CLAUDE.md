# CLAUDE.md

This file serves as an agent directory for Claude Code when working with this repository. Choose the appropriate main agent based on your development task.

## Available Main Agents

### 🎯 dev-orchestrator
**Purpose**: Primary development task coordinator  
**Use for**: General development tasks, bug fixes, feature implementation  
**What it does**: Analyzes your request and automatically delegates to the appropriate specialist (core logic, UI components, or integration) to prevent scope creep and regressions.

### 🔍 qa-orchestrator  
**Purpose**: Quality assurance and testing coordination  
**Use for**: Running tests, quality checks, pre-commit validation  
**What it does**: Orchestrates TypeScript compilation, ESLint checks, tests, builds, and architecture validation in parallel for fast quality assurance.

### 🛠️ development-workflow-agent
**Purpose**: Development workflow and best practices guidance  
**Use for**: Git workflows, coding patterns, project conventions  
**What it does**: Guides developers through development workflows including Git operations, code patterns, and project-specific conventions.

### 🔄 sql-processing-agent
**Purpose**: SQL parsing and workspace management specialist  
**Use for**: SQL parsing, CTE handling, rawsql-ts integration, PGlite validation  
**What it does**: Expert in SQL parsing using rawsql-ts, CTE decomposition/composition, and workspace SQL management.

### 🎨 ui-development-agent
**Purpose**: React and UI development specialist  
**Use for**: React components, Monaco Editor integration, UI patterns  
**What it does**: Specializes in React component development, Monaco Editor integration, TypeScript patterns, and UI best practices.

### 📚 rule-organizer
**Purpose**: Documentation and rule management specialist  
**Use for**: Organizing project documentation, optimizing rules, cleaning up guidelines  
**What it does**: Optimizes project documentation for AI comprehension by organizing, consolidating, and streamlining rules and guidelines.

---

**How to Choose**: Start with **dev-orchestrator** for most development tasks - it will automatically route you to the right specialist. Use specific agents directly when you have focused needs in their domain.
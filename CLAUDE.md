# CLAUDE.md

This file serves as an agent directory for Claude Code when working with this repository. Choose the appropriate main agent based on your development task.

## Automatic Work History Recording
@.claude/work-history.md

## Project Structure
- **Agents**: `.claude/agents/` - Agent implementation files
- **Rules**: `rules/` - Development rules and guidelines
  - **File Editing**: `rules/file-editing-best-practices.md` - Tool selection and editing guidelines
- **Configuration**: `CLAUDE.md` - Agent directory and selection guide

## Available Main Agents

### 🎯 dev-coordinator
**Purpose**: Development request analysis and specialist coordination  
**Use for**: General development tasks, bug fixes, feature implementation  
**What it does**: Analyzes development requests and coordinates appropriate specialist agents (core-logic, ui-component, or integration) to prevent scope creep and regressions.

### 🔍 qa-analyzer  
**Purpose**: Code quality analysis and validation coordination  
**Use for**: Running tests, quality checks, pre-commit validation  
**What it does**: Analyzes code quality and coordinates validation processes by running TypeScript compilation, ESLint checks, tests, builds, and architecture validation in parallel for fast quality assurance.

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

### 💡 claude-code-advisor
**Purpose**: Claude Code capabilities and workflow guidance specialist  
**Use for**: Tool selection, workflow optimization, troubleshooting, best practices  
**What it does**: Provides expert guidance on Claude Code capabilities and workflows. Maintains up-to-date knowledge by consulting official documentation for optimal tool usage and workflow optimization.

### 🔍 retrospective-analyzer
**Purpose**: Automatic work history recording and retrospective analysis  
**Use for**: Session recording, pattern analysis, continuous improvement  
**What it does**: Automatically records work activities, decisions, and outcomes using Claude Code's Memory feature. Provides retrospective analysis for identifying patterns, recurring issues, and improvement opportunities. Operates with zero configuration - simply use the agent to begin automatic recording.

### 🎭 e2e-test-agent
**Purpose**: End-to-End testing and regression prevention specialist  
**Use for**: Playwright E2E tests, regression scenarios, UI interaction validation  
**What it does**: Creates and maintains E2E tests using Playwright, focuses on preventing regressions, validates critical user flows, and handles browser automation troubleshooting.

### 🎬 playwright-export-agent
**Purpose**: Playwright test recording and export functionality specialist  
**Use for**: Test recording via codegen, automated test generation, export management  
**What it does**: Records user interactions to generate test code, optimizes exported tests for maintainability, manages test artifacts and reports, and maintains export configurations.

---

## ⚠️ Important: Task Tool Usage

When using the Task tool to call agents, be aware of the distinction between **analysis agents** and **implementation agents**:

### Analysis-Only Agents
These agents provide recommendations and analysis but DO NOT modify files:
- **claude-code-advisor**: Provides workflow guidance and tool recommendations
- **retrospective-analyzer**: Records and analyzes work history (only modifies work-history.md)

### Implementation Agents  
These agents WILL create/modify files when called:
- **dev-coordinator**, **qa-analyzer**: Delegate to implementation specialists
- **e2e-test-agent**: Creates/modifies test files
- **rule-organizer**: Modifies documentation and rule files

**Always check `git diff` after Task tool usage** to verify expected vs actual file changes.

---

**How to Choose**: Start with **dev-coordinator** for most development tasks - it will automatically route you to the right specialist. Use specific agents directly when you have focused needs in their domain.
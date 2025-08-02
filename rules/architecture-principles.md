# Architecture Principles

Hexagonal Architecture (Ports & Adapters) for TypeScript.

## Core Principles
1. Domain-Driven Design: Business logic at center
2. Dependency Rule: Dependencies point inward only  
3. Interface Segregation: Small, focused interfaces
4. Single Responsibility: One reason to change per module

## Layer Structure
```
UI Layer (React) → Application Layer (Commands/UseCases) → Domain Layer (Entities/Ports) → Infrastructure Layer (Adapters)
```

## Dependency Rules
- Adapters depend on Core
- UI depends on Core
- Core remains independent of Adapters and UI

## Port/Adapter Example
```typescript
// Core: Port interface
export interface UserRepositoryPort {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
}

// Core: Use case
export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}
  async execute(data: CreateUserData): Promise<User> {
    const user = { id: generateId(), ...data };
    await this.userRepository.save(user);
    return user;
  }
}

// Adapter: Implementation
export class LocalStorageUserRepository implements UserRepositoryPort {
  async save(user: User): Promise<void> {
    const users = await this.getAll();
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
  }
}
```

## Guidelines
- Keep interfaces focused, use dependency injection
- Test through ports, business logic in use cases
- Avoid: Business logic in UI, direct external dependencies, circular dependencies
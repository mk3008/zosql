import { CTE, ColumnInfo } from '@shared/types';

export class CTEEntity implements CTE {
  constructor(
    public name: string,
    public query: string,
    public dependencies: string[] = [],
    public columns: ColumnInfo[] = [],
    public description?: string
  ) {
    this.validateName();
  }

  private validateName(): void {
    // CTE name must be valid SQL identifier
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(this.name)) {
      throw new Error(`Invalid CTE name: ${this.name}. Must start with letter and contain only letters, numbers, and underscores.`);
    }
  }

  static create(params: {
    name: string;
    query: string;
    description?: string;
  }): CTEEntity {
    return new CTEEntity(
      params.name,
      params.query,
      [],
      [],
      params.description
    );
  }

  updateQuery(query: string): void {
    this.query = query;
    // Reset dependencies as they might have changed
    this.dependencies = [];
  }

  addDependency(cteName: string): void {
    if (!this.dependencies.includes(cteName)) {
      this.dependencies.push(cteName);
    }
  }

  removeDependency(cteName: string): void {
    this.dependencies = this.dependencies.filter(dep => dep !== cteName);
  }

  setDependencies(dependencies: string[]): void {
    this.dependencies = [...dependencies];
  }

  hasDependency(cteName: string): boolean {
    return this.dependencies.includes(cteName);
  }

  setColumns(columns: ColumnInfo[]): void {
    this.columns = [...columns];
  }

  getColumnNames(): string[] {
    return this.columns.map(col => col.name);
  }

  updateDescription(description: string): void {
    this.description = description;
  }

  // Create a copy for immutable operations
  clone(): CTEEntity {
    return new CTEEntity(
      this.name,
      this.query,
      [...this.dependencies],
      [...this.columns],
      this.description
    );
  }
}
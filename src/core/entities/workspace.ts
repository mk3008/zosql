import { Workspace, CTE } from '@shared/types';

export class WorkspaceEntity implements Workspace {
  constructor(
    public id: string,
    public name: string,
    public originalQuery: string,
    public decomposedQuery: string,
    public privateCtes: Record<string, CTE> = {},
    public originalFilePath?: string,
    public created: string = new Date().toISOString(),
    public lastModified: string = new Date().toISOString()
  ) {}

  static create(params: {
    name: string;
    originalQuery: string;
    decomposedQuery?: string;
    originalFilePath?: string;
  }): WorkspaceEntity {
    return new WorkspaceEntity(
      crypto.randomUUID(),
      params.name,
      params.originalQuery,
      params.decomposedQuery || params.originalQuery,
      {},
      params.originalFilePath
    );
  }

  addCTE(cte: CTE): void {
    this.privateCtes[cte.name] = cte;
    this.lastModified = new Date().toISOString();
  }

  updateCTE(name: string, updates: Partial<CTE>): void {
    if (this.privateCtes[name]) {
      this.privateCtes[name] = {
        ...this.privateCtes[name],
        ...updates
      };
      this.lastModified = new Date().toISOString();
    }
  }

  removeCTE(name: string): void {
    delete this.privateCtes[name];
    this.lastModified = new Date().toISOString();
  }

  getCTE(name: string): CTE | undefined {
    return this.privateCtes[name];
  }

  getCTENames(): string[] {
    return Object.keys(this.privateCtes);
  }

  getCTECount(): number {
    return Object.keys(this.privateCtes).length;
  }

  updateQuery(decomposedQuery: string): void {
    this.decomposedQuery = decomposedQuery;
    this.lastModified = new Date().toISOString();
  }
}
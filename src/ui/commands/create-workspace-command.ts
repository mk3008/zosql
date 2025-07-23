/**
 * CreateWorkspaceCommand - Command Pattern Implementation
 * ワークスペース作成のビジネスロジックをカプセル化
 */

import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';
import { TestValuesModel } from '@core/entities/test-values-model';
import { SqlModelEntity } from '@core/entities/sql-model';
import { SqlDecomposerUseCase } from '@core/usecases/sql-decomposer-usecase';
import { SqlDecomposerParser } from '@adapters/parsers/sql-decomposer-parser';
import { CteDependencyAnalyzerAdapter } from '@adapters/dependency-analyzer/cte-dependency-analyzer-adapter';

export interface Command<T = void> {
  execute(): Promise<T>;
  canExecute(): boolean;
}

export class CreateWorkspaceCommand implements Command<WorkspaceEntity> {
  private readonly decomposer: SqlDecomposerUseCase;

  constructor(
    private readonly name: string,
    private readonly sql: string
  ) {
    // 依存関係をコンストラクタで初期化（DIパターン）
    const parser = new SqlDecomposerParser();
    const analyzer = new CteDependencyAnalyzerAdapter();
    this.decomposer = new SqlDecomposerUseCase(parser, analyzer);
  }

  canExecute(): boolean {
    return this.name.trim().length > 0 && this.sql.trim().length > 0;
  }

  async execute(): Promise<WorkspaceEntity> {
    // 入力検証
    const trimmedName = this.name.trim();
    const trimmedSql = this.sql.trim();

    if (!trimmedName) {
      throw new Error('Workspace name is required');
    }

    if (!trimmedSql) {
      throw new Error('SQL query is required');
    }

    try {
      // SQL分解処理
      const sqlModels = await this.decomposer.decomposeSql(
        trimmedSql, 
        `${trimmedName}.sql`,
        new SqlFormatterEntity() // デフォルトフォーマッター
      );

      // ワークスペースエンティティ作成
      const workspace = new WorkspaceEntity(
        WorkspaceEntity.generateId(),
        trimmedName,
        `${trimmedName}.sql`,
        sqlModels,
        new TestValuesModel(''),
        new SqlFormatterEntity(),
        new FilterConditionsEntity(),
        {}
      );

      // フィルター条件をSQLモデルから初期化
      workspace.filterConditions.initializeFromModels(sqlModels);

      // メインSQLファイルを自動で開く
      const mainModel = sqlModels.find(model => model.type === 'main');
      if (mainModel) {
        workspace.openSqlModelTab(mainModel);
      }

      return workspace;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`SQL parsing failed: ${error.message}`);
      }
      throw new Error('Failed to create workspace');
    }
  }
}
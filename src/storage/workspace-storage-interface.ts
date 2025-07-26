/**
 * Workspace Storage Interface
 * ストレージ方式を抽象化するインターフェース
 */

export interface PrivateCte {
  name: string;
  query: string;
  description?: string;
  dependencies: string[];
  columns?: string[];
}

export interface WorkspaceInfo {
  name: string;
  originalQuery: string;
  originalFilePath: string;
  decomposedQuery: string;
  privateCtes: Record<string, PrivateCte>;
  created: string;
  lastModified: string;
}

export interface WorkspaceStorageInterface {
  /**
   * ワークスペースの存在確認
   */
  hasWorkspace(): Promise<boolean>;

  /**
   * ワークスペース情報の取得
   */
  getWorkspace(): Promise<WorkspaceInfo | null>;

  /**
   * ワークスペースの保存
   */
  saveWorkspace(workspaceInfo: WorkspaceInfo): Promise<void>;

  /**
   * ワークスペースのクリア
   */
  clearWorkspace(): Promise<void>;

  /**
   * プライベートCTE一覧の取得
   */
  getPrivateCtes(): Promise<Record<string, PrivateCte>>;

  /**
   * 単一プライベートCTEの取得
   */
  getPrivateCte(cteName: string): Promise<PrivateCte | null>;

  /**
   * プライベートCTEの更新
   */
  updatePrivateCte(cteName: string, cte: PrivateCte): Promise<void>;

  /**
   * プライベートCTEの削除
   */
  deletePrivateCte(cteName: string): Promise<void>;

  /**
   * ワークスペースファイルの取得
   */
  getWorkspaceFile(type: 'main' | 'cte', fileName: string): Promise<{ content: string; fileName: string; type: string } | null>;
}
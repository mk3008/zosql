/**
 * Copy Prompt生成ビジネスロジック
 * Hexagonal Architecture - Use Case Layer
 */

export interface SqlParserPort {
  extractSchema(sql: string): Promise<string[]>;
}

export interface PromptGeneratorConfig {
  useSchemaCollector: boolean;
}

export class PromptGenerator {
  constructor(
    private sqlParser?: SqlParserPort
  ) {}

  /**
   * SQLクエリからAI用プロンプトを生成
   * @param sql - 対象SQLクエリ
   * @param config - 生成設定
   * @returns 生成されたプロンプト文字列
   */
  async generatePrompt(sql: string, config: PromptGeneratorConfig): Promise<string> {
    if (!sql || !sql.trim()) {
      throw new Error('No SQL query provided');
    }

    if (!config.useSchemaCollector) {
      return this.generateBasicPrompt(sql);
    }

    try {
      return await this.generateSchemaAwarePrompt(sql);
    } catch (error) {
      // Schema解析失敗時はbasicモードにフォールバック
      return this.generateBasicPrompt(sql);
    }
  }

  /**
   * 基本的なプロンプト生成（AI支援モード）
   */
  private generateBasicPrompt(sql: string): string {
    return `このSQLをDB環境依存なしで動かしたいので、
元のSQLは変更せずに、必要なテーブルを VALUES 文で定義したモックテーブルとして
WITH句のみ を作成してください。
SELECT文などは不要で、WITH句だけ回答してください。

\`\`\`sql
${sql}
\`\`\``;
  }

  /**
   * スキーマ解析結果を含むプロンプト生成
   */
  private async generateSchemaAwarePrompt(sql: string): Promise<string> {
    if (!this.sqlParser) {
      throw new Error('SQL parser not available for schema analysis');
    }

    const tables = await this.sqlParser.extractSchema(sql);
    
    if (tables.length === 0) {
      return this.generateBasicPrompt(sql);
    }

    const tableDescriptions = tables.join(', ');

    return `このSQLをDB環境依存なしで動かしたいので、
元のSQLは変更せずに、必要なテーブル ${tableDescriptions} を VALUES 文で定義したモックテーブルとして
WITH句のみ を作成してください。
SELECT文などは不要で、WITH句だけ回答してください。

\`\`\`sql
${sql}
\`\`\``;
  }
}
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
      // Schema解析失敗時はエラーをスロー
      console.error('Schema analysis failed:', error);
      
      let errorMessage = 'Failed to analyze SQL schema. Schema collector is enabled but analysis failed';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      const enhancedError = new Error(errorMessage);
      if (error instanceof Error) {
        enhancedError.stack = error.stack;
      }
      throw enhancedError;
    }
  }

  /**
   * 基本的なプロンプト生成（AI支援モード）
   */
  private generateBasicPrompt(sql: string): string {
    return `I want to run this SQL without database dependencies.
Please provide only WITH clauses that define the required tables as mock tables using VALUES statements.

Example response:
with users(user_id, user_name) as (values (1, 'alice'), (2, 'bob'))

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

    const schemaInfo = await this.sqlParser.extractSchema(sql);
    
    if (schemaInfo.length === 0) {
      return this.generateBasicPrompt(sql);
    }

    // Schema情報をJSON形式で整形
    const schemaJson = JSON.stringify(schemaInfo, null, 2);

    return `I want to run this SQL without database dependencies.
Please provide only WITH clauses that define the required tables as mock tables using VALUES statements.
The schema information being used is as follows:
\`\`\`schema
${schemaJson}
\`\`\`

Example response:
with users(user_id, user_name) as (values (1, 'alice'), (2, 'bob'))

\`\`\`sql
${sql}
\`\`\``;
  }
}
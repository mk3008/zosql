/**
 * SQL Formatter管理ビジネスロジック
 * Hexagonal Architecture - Use Case Layer
 */

export interface FormatterConfig {
  identifierEscape: {
    start: string;
    end: string;
  };
  parameterSymbol: string;
  parameterStyle: string;
  indentSize: number;
  indentChar: string;
  newline: string;
  keywordCase: string;
  commaBreak: string;
  andBreak: string;
  withClauseStyle: string;
  preserveComments: boolean;
}

export interface FormatterStoragePort {
  saveConfig(config: FormatterConfig): Promise<void>;
  loadConfig(): Promise<FormatterConfig | null>;
}

export interface SqlFormatterPort {
  format(sql: string, config: FormatterConfig): Promise<string>;
}

export class FormatterManager {
  constructor(
    private storage: FormatterStoragePort,
    private formatter?: SqlFormatterPort
  ) {}

  /**
   * デフォルトフォーマッター設定を取得
   */
  getDefaultConfig(): FormatterConfig {
    return {
      identifierEscape: {
        start: "",
        end: ""
      },
      parameterSymbol: ":",
      parameterStyle: "named",
      indentSize: 4,
      indentChar: " ",
      newline: "\n",
      keywordCase: "lower",
      commaBreak: "before",
      andBreak: "before",
      withClauseStyle: "full-oneline",
      preserveComments: true
    };
  }

  /**
   * フォーマッター設定を適用・保存
   * @param configJson - JSON形式の設定文字列
   */
  async applyConfig(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson) as FormatterConfig;
      
      // 設定の基本的なバリデーション
      this.validateConfig(config);
      
      // 設定を保存
      await this.storage.saveConfig(config);
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in formatter config');
      }
      throw error;
    }
  }

  /**
   * 現在の設定を取得
   */
  async getCurrentConfig(): Promise<FormatterConfig> {
    const saved = await this.storage.loadConfig();
    return saved || this.getDefaultConfig();
  }

  /**
   * SQLをフォーマット
   * @param sql - 対象SQL
   * @param config - 使用する設定（オプション）
   */
  async formatSql(sql: string, config?: FormatterConfig): Promise<string> {
    if (!this.formatter) {
      throw new Error('SQL formatter not available');
    }

    const activeConfig = config || await this.getCurrentConfig();
    return await this.formatter.format(sql, activeConfig);
  }

  /**
   * 設定の基本的なバリデーション
   */
  private validateConfig(config: FormatterConfig): void {
    const required = [
      'parameterSymbol', 'parameterStyle', 'indentSize', 
      'indentChar', 'keywordCase', 'withClauseStyle'
    ];

    for (const field of required) {
      if (!(field in config)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (typeof config.indentSize !== 'number' || config.indentSize < 0) {
      throw new Error('indentSize must be a non-negative number');
    }

    const validKeywordCases = ['lower', 'upper', 'preserve'];
    if (!validKeywordCases.includes(config.keywordCase)) {
      throw new Error(`keywordCase must be one of: ${validKeywordCases.join(', ')}`);
    }
  }
}
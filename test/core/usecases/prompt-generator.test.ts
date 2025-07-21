/**
 * PromptGenerator Use Case Unit Tests
 * Hexagonal Architecture - Core Layer Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptGenerator, SqlParserPort, PromptGeneratorConfig } from '@core/usecases/prompt-generator';

// Mock SQL Parser for testing
class MockSqlParser implements SqlParserPort {
  private mockTables: string[] = [];

  setMockTables(tables: string[]): void {
    this.mockTables = tables;
  }

  async extractSchema(sql: string): Promise<string[]> {
    if (sql.includes('ERROR')) {
      throw new Error('SQL parsing failed');
    }
    return this.mockTables;
  }
}

describe('PromptGenerator', () => {
  let promptGenerator: PromptGenerator;
  let mockSqlParser: MockSqlParser;

  beforeEach(() => {
    mockSqlParser = new MockSqlParser();
    promptGenerator = new PromptGenerator(mockSqlParser);
  });

  describe('generatePrompt', () => {
    it('should generate AI-assisted prompt when useSchemaCollector is false', async () => {
      const sql = 'SELECT * FROM users';
      const config: PromptGeneratorConfig = { useSchemaCollector: false };

      const result = await promptGenerator.generatePrompt(sql, config);

      expect(result).toContain('このSQLをDB環境依存なしで動かしたいので');
      expect(result).toContain('WITH句のみ を作成してください');
      expect(result).toContain(sql);
      expect(result).toContain('必要なテーブルを VALUES 文で定義した'); // Basic mode still contains this
    });

    it('should generate schema-aware prompt when useSchemaCollector is true', async () => {
      const sql = 'SELECT * FROM users JOIN orders ON users.id = orders.user_id';
      const config: PromptGeneratorConfig = { useSchemaCollector: true };
      
      mockSqlParser.setMockTables(['users', 'orders']);

      const result = await promptGenerator.generatePrompt(sql, config);

      expect(result).toContain('このSQLをDB環境依存なしで動かしたいので');
      expect(result).toContain('必要なテーブル users, orders を VALUES 文で定義した');
      expect(result).toContain('WITH句のみ を作成してください');
      expect(result).toContain(sql);
    });

    it('should handle empty table list in schema-aware mode', async () => {
      const sql = 'SELECT 1';
      const config: PromptGeneratorConfig = { useSchemaCollector: true };
      
      mockSqlParser.setMockTables([]);

      const result = await promptGenerator.generatePrompt(sql, config);

      expect(result).toContain('このSQLをDB環境依存なしで動かしたいので');
      expect(result).toContain('必要なテーブルを VALUES 文で定義した'); // Falls back to basic mode
      expect(result).toContain(sql);
    });

    it('should handle duplicate table names in schema extraction', async () => {
      const sql = 'SELECT * FROM users u1 JOIN users u2 ON u1.id = u2.parent_id';
      const config: PromptGeneratorConfig = { useSchemaCollector: true };
      
      mockSqlParser.setMockTables(['users', 'users']); // Duplicate tables

      const result = await promptGenerator.generatePrompt(sql, config);

      expect(result).toContain('必要なテーブル users, users を VALUES 文で定義した');
    });

    it('should fallback to basic mode when SQL parsing fails', async () => {
      const sql = 'SELECT ERROR FROM invalid';
      const config: PromptGeneratorConfig = { useSchemaCollector: true };

      const result = await promptGenerator.generatePrompt(sql, config);
      
      // Should fallback to basic mode instead of throwing
      expect(result).toContain('このSQLをDB環境依存なしで動かしたいので');
      expect(result).toContain('必要なテーブルを VALUES 文で定義した');
      expect(result).toContain(sql);
    });

    it('should throw error for empty SQL input', async () => {
      const sql = '';
      const config: PromptGeneratorConfig = { useSchemaCollector: false };

      await expect(promptGenerator.generatePrompt(sql, config))
        .rejects.toThrow('No SQL query provided');
    });

    it('should throw error for SQL with only whitespace', async () => {
      const sql = '   \n\t   ';
      const config: PromptGeneratorConfig = { useSchemaCollector: false };

      await expect(promptGenerator.generatePrompt(sql, config))
        .rejects.toThrow('No SQL query provided');
    });
  });

  describe('edge cases', () => {
    it('should handle very long SQL queries', async () => {
      const longSql = 'SELECT * FROM users WHERE ' + 'condition = 1 AND '.repeat(1000) + 'final = 1';
      const config: PromptGeneratorConfig = { useSchemaCollector: false };

      const result = await promptGenerator.generatePrompt(longSql, config);

      expect(result).toContain('このSQLをDB環境依存なしで動かしたいので');
      expect(result).toContain(longSql);
    });

    it('should handle SQL with special characters', async () => {
      const sql = "SELECT 'hello世界' FROM users WHERE name = 'テスト'";
      const config: PromptGeneratorConfig = { useSchemaCollector: false };

      const result = await promptGenerator.generatePrompt(sql, config);

      expect(result).toContain(sql);
      expect(result).toContain('hello世界');
      expect(result).toContain('テスト');
    });

    it('should handle SQL with backticks and markdown characters', async () => {
      const sql = "SELECT `column`, '```markdown```' FROM `table`";
      const config: PromptGeneratorConfig = { useSchemaCollector: false };

      const result = await promptGenerator.generatePrompt(sql, config);

      expect(result).toContain(sql);
      expect(result).toMatch(/```sql\n.*```markdown.*\n```/s); // Should be properly escaped in markdown
    });
  });
});
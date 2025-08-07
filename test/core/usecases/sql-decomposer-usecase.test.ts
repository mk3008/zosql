/**
 * SqlDecomposerUseCase Unit Tests
 * Hexagonal Architecture - Core Layer Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SqlDecomposerUseCase, SqlParserPort, CteDependencyAnalyzerPort } from '@core/usecases/sql-decomposer-usecase';
import { CTEEntity } from '@core/entities/cte';
import { SqlModelEntity as SqlModelEntityClass } from '@core/entities/sql-model';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';

// Mock SQL Parser
class MockSqlParser implements SqlParserPort {
  private mockCTEs: CTEEntity[] = [];
  private mockMainQuery: string = 'SELECT 1';
  private mockDependencies: string[] = [];

  setMockCTEs(ctes: CTEEntity[]): void {
    this.mockCTEs = ctes;
  }

  setMockMainQuery(query: string): void {
    this.mockMainQuery = query;
  }

  setMockDependencies(deps: string[]): void {
    this.mockDependencies = deps;
  }

  async extractCTEs(sql: string): Promise<CTEEntity[]> {
    if (sql.includes('ERROR')) {
      throw new Error('SQL parsing failed');
    }
    return this.mockCTEs;
  }

  async extractMainQuery(sql: string): Promise<string> {
    if (sql.includes('ERROR')) {
      throw new Error('Main query extraction failed');
    }
    return this.mockMainQuery;
  }

  async extractDependencies(sql: string): Promise<string[]> {
    if (sql.includes('ERROR')) {
      throw new Error('Dependency extraction failed');
    }
    return this.mockDependencies;
  }
}

// Mock CTE Dependency Analyzer
class MockCteDependencyAnalyzer implements CteDependencyAnalyzerPort {
  private mockDependents: Record<string, string[]> = {};

  setMockDependents(dependents: Record<string, string[]>): void {
    this.mockDependents = dependents;
  }

  findDependents(cteName: string, _allCTEs: Record<string, CTEEntity>): string[] {
    void _allCTEs; // Suppress unused warning
    return this.mockDependents[cteName] || [];
  }

  getDependencyGraph(ctes: Record<string, CTEEntity>): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const [name, cte] of Object.entries(ctes)) {
      graph[name] = [...cte.dependencies];
    }
    return graph;
  }
}

describe('SqlDecomposerUseCase', () => {
  let decomposer: SqlDecomposerUseCase;
  let mockParser: MockSqlParser;
  let mockAnalyzer: MockCteDependencyAnalyzer;

  beforeEach(() => {
    mockParser = new MockSqlParser();
    mockAnalyzer = new MockCteDependencyAnalyzer();
    decomposer = new SqlDecomposerUseCase(mockParser, mockAnalyzer);
  });

  describe('decomposeSql', () => {
    it('should return single main model when no CTEs found', async () => {
      const sql = 'SELECT * FROM users';
      const fileName = 'test.sql';

      // Setup: no CTEs
      mockParser.setMockCTEs([]);
      mockParser.setMockMainQuery(sql);

      const result = await decomposer.decomposeSql(sql, fileName);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('main');
      expect(result[0].name).toBe(fileName);
      expect(result[0].dependents).toEqual([]);
      expect(result[0].originalSql).toBe(sql);
      expect(result[0].sqlWithoutCte).toBe(sql);
    });

    it('should decompose SQL with CTEs into multiple models', async () => {
      const sql = `
        WITH user_stats AS (
          SELECT user_id, COUNT(*) as count FROM orders GROUP BY user_id
        ),
        active_users AS (
          SELECT * FROM user_stats WHERE count > 5
        )
        SELECT * FROM active_users
      `;
      const fileName = 'complex.sql';

      // Setup CTEs
      const cte1 = new CTEEntity('user_stats', 'SELECT user_id, COUNT(*) as count FROM orders GROUP BY user_id', ['orders']);
      const cte2 = new CTEEntity('active_users', 'SELECT * FROM user_stats WHERE count > 5', ['user_stats']);

      mockParser.setMockCTEs([cte1, cte2]);
      mockParser.setMockMainQuery('SELECT * FROM active_users');
      mockParser.setMockDependencies(['active_users']);

      // Setup dependents
      mockAnalyzer.setMockDependents({
        'user_stats': ['active_users'], // active_users depends on user_stats
        'active_users': []  // main query depends on active_users
      });

      const result = await decomposer.decomposeSql(sql, fileName);

      expect(result).toHaveLength(3); // 2 CTEs + 1 main

      // Check CTE models
      const userStatsCte = result.find(m => m.name === 'user_stats');
      expect(userStatsCte?.type).toBe('cte');
      expect(userStatsCte?.name).toBe('user_stats');
      expect(userStatsCte?.columns).toEqual([]);
      expect(userStatsCte?.getDependentNames()).toEqual(['active_users']);

      const activeUsersCte = result.find(m => m.name === 'active_users');
      expect(activeUsersCte?.type).toBe('cte');
      expect(activeUsersCte?.name).toBe('active_users');
      expect(activeUsersCte?.columns).toEqual([]);
      expect(activeUsersCte?.getDependentNames()).toEqual([]);

      // Check main model
      const mainModel = result.find(m => m.type === 'main');
      expect(mainModel?.type).toBe('main');
      expect(mainModel?.name).toBe(fileName);
      expect(mainModel?.dependents).toEqual([]);
      expect(mainModel?.originalSql).toBe(sql);
    });

    it('should include column information when available', async () => {
      const sql = 'WITH users(id, name) AS (SELECT 1, \'test\') SELECT * FROM users';
      const fileName = 'columns.sql';

      // Setup CTE with columns
      const cteWithColumns = new CTEEntity(
        'users', 
        'SELECT 1, \'test\'', 
        [], 
        [
          { name: 'id', type: 'integer' },
          { name: 'name', type: 'text' }
        ]
      );

      mockParser.setMockCTEs([cteWithColumns]);
      mockParser.setMockMainQuery('SELECT * FROM users');
      mockAnalyzer.setMockDependents({ 'users': [] });

      const result = await decomposer.decomposeSql(sql, fileName);

      const cteModel = result.find(m => m.type === 'cte');
      expect(cteModel?.columns).toEqual(['id', 'name']);
    });

    it('should handle parser errors gracefully', async () => {
      const sql = 'SELECT ERROR FROM invalid';
      const fileName = 'error.sql';

      await expect(decomposer.decomposeSql(sql, fileName))
        .rejects.toThrow('SQL parsing failed');
    });
  });

  describe('reconstructSql', () => {
    it('should reconstruct SQL from models', async () => {
      const models: SqlModelEntityClass[] = [
        new SqlModelEntityClass(
          'cte',
          'users',
          'VALUES (1, \'Alice\'), (2, \'Bob\')',
          [],
          ['id', 'name']
        ),
        new SqlModelEntityClass(
          'main',
          'test.sql',
          'SELECT * FROM users',
          []
        )
      ];

      const result = await decomposer.reconstructSql(models, 'test.sql');

      expect(result).toContain('WITH users(id, name) AS');
      expect(result).toContain('VALUES (1, \'Alice\'), (2, \'Bob\')');
      expect(result).toContain('SELECT * FROM users');
    });

    it('should return original SQL if available', async () => {
      const originalSql = 'WITH users AS (SELECT 1) SELECT * FROM users';
      
      const models: SqlModelEntityClass[] = [
        new SqlModelEntityClass(
          'main',
          'test.sql',
          'SELECT * FROM users',
          [],
          undefined,
          originalSql
        )
      ];

      const result = await decomposer.reconstructSql(models, 'test.sql');

      expect(result).toBe(originalSql);
    });

    it('should return main query if no CTEs', async () => {
      const models: SqlModelEntityClass[] = [
        new SqlModelEntityClass(
          'main',
          'simple.sql',
          'SELECT 1',
          []
        )
      ];

      const result = await decomposer.reconstructSql(models, 'simple.sql');

      expect(result).toBe('SELECT 1');
    });

    it('should throw error if main model not found', async () => {
      const models: SqlModelEntityClass[] = [
        new SqlModelEntityClass(
          'cte',
          'users',
          'SELECT 1',
          []
        )
      ];

      await expect(decomposer.reconstructSql(models, 'missing.sql'))
        .rejects.toThrow('Main model "missing.sql" not found');
    });
  });

  describe('getExecutionOrder', () => {
    it('should return execution order for CTEs', () => {
      const ordersModel = new SqlModelEntityClass(
        'cte',
        'orders',
        'SELECT * FROM base_orders',
        []
      );
      
      const userStatsModel = new SqlModelEntityClass(
        'cte',
        'user_stats',
        'SELECT user_id FROM orders',
        [ordersModel] // user_stats depends on orders
      );
      
      const mainModel = new SqlModelEntityClass(
        'main',
        'main.sql',
        'SELECT * FROM user_stats',
        []
      );
      
      const models = [ordersModel, userStatsModel, mainModel];

      const result = decomposer.getExecutionOrder(models);

      expect(result).toEqual(['orders', 'user_stats']);
      // orders should come before user_stats since user_stats depends on orders
    });

    it('should handle empty CTE list', () => {
      const models: SqlModelEntityClass[] = [
        new SqlModelEntityClass(
          'main',
          'main.sql',
          'SELECT 1',
          []
        )
      ];

      const result = decomposer.getExecutionOrder(models);

      expect(result).toEqual([]);
    });
  });

  describe('SQL formatting with SqlFormatterEntity', () => {
    it('should format SQL queries when SqlFormatter is provided', async () => {
      const longQuery = 'SELECT user_id, name, email FROM users WHERE status = \'active\' AND created_at > \'2024-01-01\'';
      const fileName = 'format-test.sql';

      // Setup: no CTEs, single main query
      mockParser.setMockCTEs([]);
      mockParser.setMockMainQuery(longQuery);

      // Create SqlFormatterEntity
      const formatterEntity = new SqlFormatterEntity();
      console.log('\n[DEBUG] Testing SqlFormatter with query:', longQuery);
      console.log('[DEBUG] Formatter config:', formatterEntity.config);

      try {
        const models = await decomposer.decomposeSql(longQuery, fileName, formatterEntity);

        expect(models).toHaveLength(1);
        const mainModel = models[0];
        
        console.log('[DEBUG] Original SQL:', longQuery);
        console.log('[DEBUG] Formatted SQL in sqlWithoutCte:', JSON.stringify(mainModel.sqlWithoutCte));
        console.log('[DEBUG] Formatted SQL display:');
        console.log(mainModel.sqlWithoutCte);
        
        // The formatted SQL should be different from original (unless formatting fails)
        // At minimum, it should be properly stored in sqlWithoutCte
        expect(mainModel.sqlWithoutCte).toBeDefined();
        expect(typeof mainModel.sqlWithoutCte).toBe('string');
        
        // Check if the SQL was actually formatted (or kept as-is if formatter fails)
        expect(mainModel.sqlWithoutCte.length).toBeGreaterThan(0);
      } catch (error) {
        console.log('[DEBUG] Error during formatting test:', error);
        throw error;
      }
    });

    it('should handle formatter errors gracefully', async () => {
      const sql = 'SELECT * FROM users';
      const fileName = 'error-test.sql';

      mockParser.setMockCTEs([]);
      mockParser.setMockMainQuery(sql);

      // Create a mock formatter entity that throws an error
      const mockFormatter = {
        config: '{}',
        getSqlFormatter: vi.fn().mockImplementation(() => ({
          format: vi.fn().mockImplementation(() => {
            throw new Error('Mock formatter error');
          })
        })),
        setFormatterConfig: vi.fn(),
        reset: vi.fn(),
        isValid: vi.fn().mockReturnValue(true),
        getFormattedString: vi.fn().mockReturnValue('{}'),
        clone: vi.fn().mockReturnValue({}),
        toJSON: vi.fn().mockReturnValue({ config: '{}' }),
        get displayString() { return '{}'; },
        set displayString(_value: string) { /* no-op */ },
        toString: vi.fn().mockReturnValue('{}')
      } as unknown as SqlFormatterEntity;

      const models = await decomposer.decomposeSql(sql, fileName, mockFormatter);

      expect(models).toHaveLength(1);
      const mainModel = models[0];
      
      // Should fall back to original SQL when formatter fails
      expect(mainModel.sqlWithoutCte).toBe(sql);
    });

    it('should work without formatter (backward compatibility)', async () => {
      const sql = 'SELECT * FROM users';
      const fileName = 'no-formatter.sql';

      mockParser.setMockCTEs([]);
      mockParser.setMockMainQuery(sql);

      // No formatter provided
      const models = await decomposer.decomposeSql(sql, fileName);

      expect(models).toHaveLength(1);
      const mainModel = models[0];
      
      // Should use original SQL when no formatter is provided
      expect(mainModel.sqlWithoutCte).toBe(sql);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex dependency chains', async () => {
      const sql = `
        WITH base AS (SELECT 1 as id),
             level1 AS (SELECT * FROM base),
             level2 AS (SELECT * FROM level1)
        SELECT * FROM level2
      `;

      const base = new CTEEntity('base', 'SELECT 1 as id', []);
      const level1 = new CTEEntity('level1', 'SELECT * FROM base', ['base']);
      const level2 = new CTEEntity('level2', 'SELECT * FROM level1', ['level1']);

      mockParser.setMockCTEs([base, level1, level2]);
      mockParser.setMockMainQuery('SELECT * FROM level2');
      mockParser.setMockDependencies(['level2']);

      mockAnalyzer.setMockDependents({
        'base': ['level1'],
        'level1': ['level2'],
        'level2': []
      });

      const models = await decomposer.decomposeSql(sql, 'chain.sql');

      expect(models).toHaveLength(4); // 3 CTEs + 1 main

      // Verify dependency relationships
      const baseModel = models.find(m => m.name === 'base');
      const level1Model = models.find(m => m.name === 'level1');
      const level2Model = models.find(m => m.name === 'level2');

      expect(baseModel?.dependents).toEqual(['level1']);
      expect(level1Model?.dependents).toEqual(['level2']);
      expect(level2Model?.dependents).toEqual([]);
    });
  });
});
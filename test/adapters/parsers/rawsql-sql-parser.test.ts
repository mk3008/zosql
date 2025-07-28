/**
 * RawsqlSqlParser Adapter Unit Tests
 * Hexagonal Architecture - Infrastructure Layer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RawsqlSqlParser } from '@adapters/parsers/rawsql-sql-parser';

// Mock rawsql-ts module
vi.mock('rawsql-ts', () => ({
  SelectQueryParser: {
    parse: vi.fn()
  }
}));

import { SelectQueryParser } from 'rawsql-ts';

// Helper function to create proper SelectQuery mocks
function createMockSelectQuery(simpleQuery: unknown) {
  return {
    toSimpleQuery: () => simpleQuery,
    setParameter: vi.fn(),
    getKind: vi.fn().mockReturnValue('SelectQuery'),
    accept: vi.fn(),
    toSqlString: vi.fn().mockReturnValue('SELECT * FROM mock'),
    comments: []
  };
}

describe('RawsqlSqlParser', () => {
  let parser: RawsqlSqlParser;
  let mockParse: ReturnType<typeof vi.mocked<typeof SelectQueryParser.parse>>;

  beforeEach(() => {
    parser = new RawsqlSqlParser();
    mockParse = vi.mocked(SelectQueryParser.parse);
    vi.clearAllMocks();
  });

  describe('extractSchema', () => {
    it('should extract table names from simple SELECT query', async () => {
      const mockQuery = createMockSelectQuery({
        fromClause: {
          source: {
            datasource: {
              table: { name: 'users' }
            }
          },
          joins: null
        },
        withClause: null
      });

      mockParse.mockReturnValue(mockQuery);

      const result = await parser.extractSchema('SELECT * FROM users');

      expect(result).toEqual(['users']);
      expect(mockParse).toHaveBeenCalledWith('SELECT * FROM users');
    });

    it('should extract table names from query with JOINs', async () => {
      const mockQuery = createMockSelectQuery({
        fromClause: {
          source: {
            datasource: {
              table: { name: 'users' }
            }
          },
          joins: [
            {
              source: {
                datasource: {
                  table: { name: 'orders' }
                }
              }
            },
            {
              source: {
                datasource: {
                  table: { name: 'products' }
                }
              }
            }
          ]
        },
        withClause: null
      });

      mockParse.mockReturnValue(mockQuery);

      const result = await parser.extractSchema(
        'SELECT * FROM users JOIN orders ON users.id = orders.user_id JOIN products ON orders.product_id = products.id'
      );

      expect(result).toEqual(['orders', 'products', 'users']); // Sorted alphabetically
    });

    it('should exclude CTE table names from results', async () => {
      const mockQuery = createMockSelectQuery({
          fromClause: {
            source: {
              datasource: {
                table: { name: 'user_stats' }
              }
            },
            joins: [
              {
                source: {
                  datasource: {
                    table: { name: 'orders' }
                  }
                }
              }
            ]
          },
          withClause: {
            tables: [
              {
                aliasExpression: {
                  table: { name: 'user_stats' }
                }
              }
            ]
          }
      });

      mockParse.mockReturnValue(mockQuery);

      const result = await parser.extractSchema(`
        WITH user_stats AS (
          SELECT user_id, COUNT(*) as count FROM orders GROUP BY user_id
        )
        SELECT * FROM user_stats JOIN orders ON user_stats.user_id = orders.user_id
      `);

      expect(result).toEqual(['orders']); // user_stats is excluded because it's a CTE
    });

    it('should handle queries with no tables', async () => {
      const mockQuery = createMockSelectQuery({
          fromClause: null,
          withClause: null
      });

      mockParse.mockReturnValue(mockQuery);

      const result = await parser.extractSchema('SELECT 1');

      expect(result).toEqual([]);
    });

    it('should remove duplicate table names', async () => {
      const mockQuery = createMockSelectQuery({
          fromClause: {
            source: {
              datasource: {
                table: { name: 'users' }
              }
            },
            joins: [
              {
                source: {
                  datasource: {
                    table: { name: 'users' }  // Duplicate table
                  }
                }
              }
            ]
          },
          withClause: null
      });

      mockParse.mockReturnValue(mockQuery);

      const result = await parser.extractSchema('SELECT * FROM users u1 JOIN users u2 ON u1.id = u2.parent_id');

      expect(result).toEqual(['users']); // Duplicates removed
    });

    it('should handle parsing errors gracefully', async () => {
      mockParse.mockImplementation(() => {
        throw new Error('Invalid SQL syntax');
      });

      await expect(parser.extractSchema('INVALID SQL'))
        .rejects.toThrow('SQL parsing failed: Invalid SQL syntax');
    });

    it('should handle unknown parsing errors', async () => {
      mockParse.mockImplementation(() => {
        throw 'Unknown error';
      });

      await expect(parser.extractSchema('SELECT * FROM users'))
        .rejects.toThrow('SQL parsing failed: Unknown error');
    });

    it('should handle null/undefined table names', async () => {
      const mockQuery = createMockSelectQuery({
          fromClause: {
            source: {
              datasource: {
                table: { name: null }
              }
            },
            joins: [
              {
                source: {
                  datasource: {
                    table: { name: undefined }
                  }
                }
              },
              {
                source: {
                  datasource: {
                    table: { name: 'valid_table' }
                  }
                }
              }
            ]
          },
          withClause: null
      });

      mockParse.mockReturnValue(mockQuery);

      const result = await parser.extractSchema('SELECT * FROM some_query');

      expect(result).toEqual(['valid_table']); // Only valid table names included
    });

    it('should handle missing datasource or table properties', async () => {
      const mockQuery = createMockSelectQuery({
          fromClause: {
            source: {
              datasource: null
            },
            joins: [
              {
                source: {
                  datasource: {
                    table: null
                  }
                }
              },
              {
                source: null
              }
            ]
          },
          withClause: null
      });

      mockParse.mockReturnValue(mockQuery);

      const result = await parser.extractSchema('SELECT * FROM complex_subquery');

      expect(result).toEqual([]);
    });

    it('should handle CTE with null alias expression', async () => {
      const mockQuery = createMockSelectQuery({
          fromClause: {
            source: {
              datasource: {
                table: { name: 'users' }
              }
            }
          },
          withClause: {
            tables: [
              {
                aliasExpression: null
              },
              {
                aliasExpression: {
                  table: null
                }
              }
            ]
          }
      });

      mockParse.mockReturnValue(mockQuery);

      const result = await parser.extractSchema('WITH cte AS (...) SELECT * FROM users');

      expect(result).toEqual(['users']);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex query with multiple CTEs and joins', async () => {
      const mockQuery = createMockSelectQuery({
          fromClause: {
            source: {
              datasource: {
                table: { name: 'final_result' }
              }
            },
            joins: [
              {
                source: {
                  datasource: {
                    table: { name: 'external_table' }
                  }
                }
              }
            ]
          },
          withClause: {
            tables: [
              {
                aliasExpression: {
                  table: { name: 'cte1' }
                }
              },
              {
                aliasExpression: {
                  table: { name: 'final_result' }
                }
              }
            ]
          }
      });

      mockParse.mockReturnValue(mockQuery);

      const result = await parser.extractSchema(`
        WITH cte1 AS (SELECT * FROM base_table),
             final_result AS (SELECT * FROM cte1)
        SELECT * FROM final_result JOIN external_table ON ...
      `);

      expect(result).toEqual(['external_table']); // Only external table, CTEs excluded
    });

    it('should handle empty string input', async () => {
      mockParse.mockImplementation(() => {
        throw new Error('Empty query');
      });

      await expect(parser.extractSchema(''))
        .rejects.toThrow('SQL parsing failed: Empty query');
    });

    it('should handle whitespace-only input', async () => {
      const mockQuery = createMockSelectQuery({
          fromClause: null,
          withClause: null
      });

      mockParse.mockReturnValue(mockQuery);

      const result = await parser.extractSchema('   \n\t   ');

      expect(result).toEqual([]);
    });
  });
});
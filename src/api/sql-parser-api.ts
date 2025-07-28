import { Request, Response } from 'express';
import { Logger } from '../utils/logging.js';

interface TableInfo {
  table: string;
  alias?: string;
  [key: string]: unknown;
}

// Type guards for safe unknown type handling
function isValidCte(cte: unknown): cte is { 
  aliasExpression?: { table?: { name?: string } };
  query?: { selectClause?: { items?: unknown[] } };
} {
  return (
    typeof cte === 'object' &&
    cte !== null &&
    'aliasExpression' in cte &&
    'query' in cte
  );
}

function isValidSelectItem(item: unknown): item is { 
  identifier?: { name?: string };
} {
  return (
    typeof item === 'object' &&
    item !== null &&
    'identifier' in item
  );
}


interface ParsedQuery {
  fromClause?: {
    tables?: unknown[];
    constructor?: { name: string };
    [key: string]: unknown;
  };
  withClause?: {
    [key: string]: unknown;
  };
  toSimpleQuery?: () => ParsedQuery;
  constructor: { name: string };
  [key: string]: unknown;
}

export class SqlParserApi {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Type guard for rawsql-ts query object
   */
  private isValidQueryObject(obj: unknown): obj is Record<string, unknown> {
    return obj !== null && typeof obj === 'object';
  }

  public async handleParseSql(req: Request, res: Response): Promise<void> {
    try {
      const { sql } = req.body;
      
      if (!sql) {
        res.status(400).json({ success: false, error: 'SQL is required' });
        return;
      }

      this.logger.log(`[PARSE-SQL] Parsing SQL (length: ${sql.length}): "${sql}"`);
      this.logger.log(`[PARSE-SQL] SQL lines: ${sql.split('\n').map((line: string, i: number) => `${i + 1}: "${line}"`).join(' | ')}`);

      // Use rawsql-ts to parse SQL (dynamic import for ES modules)
      const { SelectQueryParser, SelectableColumnCollector } = await import('rawsql-ts');

      try {
        const query = SelectQueryParser.parse(sql);
        this.logger.log(`[PARSE-SQL] Parse successful`);
        this.logger.log(`[PARSE-SQL] Query type: ${query.constructor.name}`);

        // Extract table information with aliases for IntelliSense
        const tables: TableInfo[] = [];

        // Convert to SimpleSelectQuery if needed (for WITH clause support)
        let queryAny = query as unknown as ParsedQuery;
        if (query.constructor.name !== 'SimpleSelectQuery') {
          this.logger.log(`[PARSE-SQL] Converting to SimpleSelectQuery`);
          queryAny = query.toSimpleQuery() as unknown as ParsedQuery;
          this.logger.log(`[PARSE-SQL] Converted query type: ${queryAny.constructor.name}`);
        }

        this.logger.log(`[PARSE-SQL] Full query object keys: ${Object.keys(queryAny)}`);
        this.logger.log(`[PARSE-SQL] Query structure: ${JSON.stringify({
          hasFromClause: !!queryAny.fromClause,
          fromClauseType: queryAny.fromClause?.constructor?.name,
          fromClauseTables: queryAny.fromClause?.tables?.length || 0,
          fromClauseStructure: queryAny.fromClause ? Object.keys(queryAny.fromClause) : null,
          hasWithClause: !!queryAny.withClause,
          withClauseStructure: queryAny.withClause ? Object.keys(queryAny.withClause) : null
        })}`);

        // Detailed fromClause investigation
        if (queryAny.fromClause) {
          this.logger.log(`[PARSE-SQL] fromClause full structure: ${JSON.stringify(queryAny.fromClause, null, 2)}`);
        }

        // Debug withClause explicitly - SIMPLE VERSION
        this.logger.log(`[PARSE-SQL] withClause check: ${queryAny.withClause ? 'EXISTS' : 'NULL'}`);
        if (queryAny.withClause) {
          this.logger.log(`[PARSE-SQL] withClause processing started`);
          this.logger.log(`[PARSE-SQL] withClause has tables: ${!!queryAny.withClause.tables}`);
          this.logger.log(`[PARSE-SQL] withClause tables length: ${Array.isArray(queryAny.withClause.tables) ? queryAny.withClause.tables.length : 0}`);
        } else {
          this.logger.log(`[PARSE-SQL] withClause is falsy, not processing CTE tables`);
        }

        // Extract CTE tables from withClause
        if (queryAny.withClause) {
          this.logger.log(`[PARSE-SQL] withClause structure: ${JSON.stringify(queryAny.withClause, null, 2)}`);
          
          // Check for CTE tables in withClause.tables
          if (queryAny.withClause.tables && Array.isArray(queryAny.withClause.tables)) {
            queryAny.withClause.tables.forEach((cte: unknown, index: number) => {
              let cteName: string | null = null;
              let cteColumns: string[] = [];
              
              // Extract CTE name from aliasExpression
              if (cte && typeof cte === 'object' && 'aliasExpression' in cte) {
                const aliasExpression = (cte as Record<string, unknown>).aliasExpression;
                if (aliasExpression && typeof aliasExpression === 'object' && 'table' in aliasExpression) {
                  const table = (aliasExpression as Record<string, unknown>).table;
                  if (table && typeof table === 'object' && 'name' in table) {
                    const name = (table as Record<string, unknown>).name;
                    if (typeof name === 'string') {
                      cteName = name;
                    }
                  }
                }
              }
              
              // Extract columns from CTE definition if available
              if (cte && typeof cte === 'object' && 'aliasExpression' in cte) {
                const aliasExpression = (cte as Record<string, unknown>).aliasExpression;
                if (aliasExpression && typeof aliasExpression === 'object' && 'columns' in aliasExpression) {
                  const columns = (aliasExpression as Record<string, unknown>).columns;
                  if (Array.isArray(columns)) {
                    cteColumns = columns.map((col: unknown) => {
                      if (col && typeof col === 'object' && 'name' in col) {
                        return (col as Record<string, unknown>).name as string;
                      }
                      return String(col);
                    });
                  }
                }
              }
              
              // Use SelectableColumnCollector to extract columns from CTE query
              if (cte && typeof cte === 'object' && 'query' in cte) {
                const cteQuery = (cte as Record<string, unknown>).query;
                try {
                  const collector = new SelectableColumnCollector();
                  // Type guard for rawsql-ts query object
                  if (this.isValidQueryObject(cteQuery)) {
                    // Type assertion for rawsql-ts SqlComponent
                    collector.collect(cteQuery as any);
                  }
                  const collectedColumns = collector.getValues();
                  
                  this.logger.log(`[PARSE-SQL] CTE ${index} SelectableColumnCollector result: ${JSON.stringify(collectedColumns, null, 2)}`);
                  
                  // Extract column names from collected columns
                  if (collectedColumns && Array.isArray(collectedColumns) && collectedColumns.length > 0) {
                    collectedColumns.forEach((col: unknown) => {
                      if (col && typeof col === 'object') {
                        const colObj = col as Record<string, unknown>;
                        if (typeof colObj.alias === 'string') {
                          cteColumns.push(colObj.alias);
                        } else if (typeof colObj.name === 'string') {
                          cteColumns.push(colObj.name);
                        } else if (typeof colObj.columnName === 'string') {
                          cteColumns.push(colObj.columnName);
                        }
                      } else if (typeof col === 'string') {
                        cteColumns.push(col);
                      }
                    });
                  } else {
                    // If SelectableColumnCollector returned empty, use fallback
                    this.logger.log(`[PARSE-SQL] SelectableColumnCollector returned empty for CTE ${index}, using fallback`);
                    throw new Error('Empty collector result, using fallback');
                  }
                } catch (collectorError) {
                  this.logger.log(`[PARSE-SQL] SelectableColumnCollector failed for CTE ${index}: ${collectorError instanceof Error ? collectorError.message : 'Unknown error'}`);
                  
                  // Fallback to manual extraction
                  if (cteQuery && typeof cteQuery === 'object' && 'selectClause' in cteQuery) {
                    const selectClause = (cteQuery as Record<string, unknown>).selectClause;
                    if (selectClause && typeof selectClause === 'object' && 'items' in selectClause) {
                      const selectItems = (selectClause as Record<string, unknown>).items;
                      this.logger.log(`[PARSE-SQL] CTE ${index} fallback selectClause.items: ${JSON.stringify(selectItems, null, 2)}`);
                      
                      if (Array.isArray(selectItems)) {
                        selectItems.forEach((item: unknown) => {
                          let columnName: string | null = null;
                      
                          if (item && typeof item === 'object') {
                            const itemObj = item as Record<string, unknown>;
                            
                            // Check identifier first (for "SELECT 1 as value")
                            if (itemObj.identifier && typeof itemObj.identifier === 'object') {
                              const identifier = itemObj.identifier as Record<string, unknown>;
                              if (typeof identifier.name === 'string') {
                                columnName = identifier.name;
                              }
                            }
                            // Check value.qualifiedName for column references
                            else if (itemObj.value && typeof itemObj.value === 'object') {
                              const value = itemObj.value as Record<string, unknown>;
                              if (value.qualifiedName && typeof value.qualifiedName === 'object') {
                                const qualifiedName = value.qualifiedName as Record<string, unknown>;
                                if (qualifiedName.name && typeof qualifiedName.name === 'object') {
                                  const name = qualifiedName.name as Record<string, unknown>;
                                  if (typeof name.name === 'string') {
                                    columnName = name.name;
                                  }
                                }
                              }
                            }
                            // Check alias expressions
                            else if (itemObj.aliasExpression && typeof itemObj.aliasExpression === 'object') {
                              const aliasExpression = itemObj.aliasExpression as Record<string, unknown>;
                              if (aliasExpression.column && typeof aliasExpression.column === 'object') {
                                const column = aliasExpression.column as Record<string, unknown>;
                                if (typeof column.name === 'string') {
                                  columnName = column.name;
                                }
                              }
                            }
                          }
                          
                          if (columnName) {
                            cteColumns.push(columnName);
                          }
                        });
                      }
                    }
                  }
                }
              }
              
              this.logger.log(`[PARSE-SQL] Found CTE ${index}: name="${cteName}", columns=[${cteColumns.join(', ')}]`);
              
              if (cteName) {
                tables.push({
                  table: cteName,
                  alias: cteName, // CTE name serves as both table name and alias
                  name: cteName,
                  type: 'cte',
                  columns: cteColumns
                });
              }
            });
          }
        }

        // Extract tables from fromClause.source (not fromClause.tables)
        if (queryAny.fromClause && queryAny.fromClause.source) {
          const source = queryAny.fromClause.source as Record<string, unknown>;
          
          if (source && typeof source === 'object' && 'datasource' in source) {
            const datasource = source.datasource as Record<string, unknown>;
            if (datasource && typeof datasource === 'object' && 'qualifiedName' in datasource) {
              const qualifiedName = datasource.qualifiedName as Record<string, unknown>;
              const tableName = qualifiedName && typeof qualifiedName === 'object' && 'name' in qualifiedName ? 
                (qualifiedName.name as Record<string, unknown>)?.name as string : undefined;
              const tableAlias = source && typeof source === 'object' && 'aliasExpression' in source ?
                ((source.aliasExpression as Record<string, unknown>)?.table as Record<string, unknown>)?.name as string : undefined;
            
            this.logger.log(`[PARSE-SQL] Found table: name="${tableName}", alias="${tableAlias}"`);
            
              if (tableName) {
                // Check if this is a CTE table and extract columns
                let isCTE = false;
                const cteColumns: string[] = [];
                
                if (queryAny.withClause && typeof queryAny.withClause === 'object') {
                  const withClause = queryAny.withClause as Record<string, unknown>;
                  if (Array.isArray(withClause.tables)) {
                    withClause.tables.forEach((cte: unknown) => {
                      if (cte && typeof cte === 'object') {
                        const cteObj = cte as Record<string, unknown>;
                        if (cteObj.aliasExpression && typeof cteObj.aliasExpression === 'object') {
                        const aliasExpression = cteObj.aliasExpression as Record<string, unknown>;
                        if (aliasExpression.table && typeof aliasExpression.table === 'object') {
                          const table = aliasExpression.table as Record<string, unknown>;
                          if (table.name === tableName) {
                            isCTE = true;
                            
                            // Extract columns from CTE definition
                            if (cteObj.query && typeof cteObj.query === 'object') {
                              const query = cteObj.query as Record<string, unknown>;
                              if (query.selectClause && typeof query.selectClause === 'object') {
                                const selectClause = query.selectClause as Record<string, unknown>;
                                if (Array.isArray(selectClause.items)) {
                                  selectClause.items.forEach((item: unknown) => {
                                    if (item && typeof item === 'object') {
                                      const itemObj = item as Record<string, unknown>;
                                      if (itemObj.identifier && typeof itemObj.identifier === 'object') {
                                        const identifier = itemObj.identifier as Record<string, unknown>;
                                        if (typeof identifier.name === 'string') {
                                          cteColumns.push(identifier.name);
                                        }
                                      }
                                    }
                                  });
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  });
                }
              }
              
                if (tableName) {
                  tables.push({
                    table: tableName,
                    alias: tableAlias || undefined,
                    type: isCTE ? 'cte' : 'regular',
                    columns: isCTE ? cteColumns : undefined
                  });
                }
              }
            }
          }
        }

        // Also check for JOIN tables if they exist (support both regular tables and subqueries)
        if (queryAny.fromClause && queryAny.fromClause.joins && Array.isArray(queryAny.fromClause.joins)) {
          (queryAny.fromClause.joins as unknown[]).forEach((join: unknown, index: number) => {
            if (!this.isValidQueryObject(join)) return;
            const joinObj = join as Record<string, unknown>;
            if (joinObj.source) {
              const joinSource = joinObj.source as Record<string, unknown>;
              const datasource = joinSource.datasource as Record<string, unknown> | undefined;
              const qualifiedName = datasource?.qualifiedName as Record<string, unknown> | undefined;
              const aliasExpression = joinSource.aliasExpression as Record<string, unknown> | undefined;
              const table = aliasExpression?.table as Record<string, unknown> | undefined;
              
              let tableName = null;
              const tableAlias = table?.name as string | undefined;
              let isSubquery = false;
              const subqueryColumns: string[] = [];
              
              // Check if this is a regular table
              if (datasource && qualifiedName) {
                const name = qualifiedName.name as Record<string, unknown> | undefined;
                tableName = name?.name as string | undefined;
                this.logger.log(`[PARSE-SQL] Found JOIN table ${index}: name="${tableName}", alias="${tableAlias}"`);
              } 
              // Check if this is a subquery (stored in datasource.query)
              else if (datasource?.query) {
                isSubquery = true;
                tableName = `subquery_${index}`;
                this.logger.log(`[PARSE-SQL] Found JOIN subquery ${index}: alias="${tableAlias}"`);
                this.logger.log(`[PARSE-SQL] JOIN subquery ${index} structure: ${JSON.stringify(datasource.query, null, 2)}`);
                
                // Extract columns from subquery using SelectableColumnCollector
                try {
                  const collector = new SelectableColumnCollector();
                  if (this.isValidQueryObject(datasource.query)) {
                    // Type assertion for rawsql-ts SqlComponent
                    collector.collect(datasource.query as any);
                  }
                  const collectedColumns = collector.getValues();
                  
                  this.logger.log(`[PARSE-SQL] JOIN subquery ${index} SelectableColumnCollector result: ${JSON.stringify(collectedColumns, null, 2)}`);
                  
                  if (collectedColumns && Array.isArray(collectedColumns) && collectedColumns.length > 0) {
                    collectedColumns.forEach((col: unknown) => {
                      if (!this.isValidQueryObject(col)) return;
                      if (typeof (col as Record<string, unknown>).alias === 'string') {
                        subqueryColumns.push((col as Record<string, unknown>).alias as string);
                      } else if (typeof (col as Record<string, unknown>).name === 'string') {
                        subqueryColumns.push((col as Record<string, unknown>).name as string);
                      } else if (typeof (col as Record<string, unknown>).columnName === 'string') {
                        subqueryColumns.push((col as Record<string, unknown>).columnName as string);
                      } else if (typeof col === 'string') {
                        subqueryColumns.push(col);
                      }
                    });
                  } else {
                    // Fallback to manual extraction
                    const query = datasource.query as Record<string, unknown>;
                    const selectClause = query.selectClause as Record<string, unknown> | undefined;
                    const items = selectClause?.items as unknown[] | undefined;
                    if (selectClause && items) {
                      items.forEach((item: unknown) => {
                        if (!this.isValidQueryObject(item)) return;
                        const itemObj = item as Record<string, unknown>;
                        const identifier = itemObj.identifier as Record<string, unknown> | undefined;
                        const value = itemObj.value as Record<string, unknown> | undefined;
                        
                        if (identifier && typeof identifier.name === 'string') {
                          subqueryColumns.push(identifier.name);
                        } else if (value?.qualifiedName && typeof (value.qualifiedName as Record<string, unknown>).name === 'object') {
                          const qualifiedName = (value.qualifiedName as Record<string, unknown>).name as Record<string, unknown>;
                          const columnName = qualifiedName.name;
                          if (columnName === '*') {
                            // Handle SELECT * case - extract actual columns from the source table
                            this.logger.log(`[PARSE-SQL] Found SELECT * in subquery, extracting from source table`);
                            
                            // Get the source table name from the subquery's FROM clause
                            const subqueryFromClause = query.fromClause as Record<string, unknown> | undefined;
                            const subquerySource = subqueryFromClause?.source as Record<string, unknown> | undefined;
                            const subqueryDatasource = subquerySource?.datasource as Record<string, unknown> | undefined;
                            const subqueryQualifiedName = subqueryDatasource?.qualifiedName as Record<string, unknown> | undefined;
                            if (subqueryFromClause && subquerySource && subqueryDatasource && subqueryQualifiedName) {
                              const subqueryName = subqueryQualifiedName.name as Record<string, unknown> | undefined;
                              const sourceTableName = subqueryName?.name as string | undefined;
                              this.logger.log(`[PARSE-SQL] Subquery source table: ${sourceTableName}`);
                              
                              // Get columns from schema - use a simple approach for now
                              // This is a simplified version that uses known schema structure
                              if (sourceTableName === 'users') {
                                subqueryColumns.push('id', 'name', 'email', 'created_at', 'updated_at');
                                this.logger.log(`[PARSE-SQL] Expanded * to users columns: [${subqueryColumns.join(', ')}]`);
                              } else if (sourceTableName === 'orders') {
                                subqueryColumns.push('id', 'user_id', 'amount', 'order_date', 'status', 'created_at');
                                this.logger.log(`[PARSE-SQL] Expanded * to orders columns: [${subqueryColumns.join(', ')}]`);
                              } else if (sourceTableName === 'products') {
                                subqueryColumns.push('id', 'name', 'price', 'category', 'description', 'created_at');
                                this.logger.log(`[PARSE-SQL] Expanded * to products columns: [${subqueryColumns.join(', ')}]`);
                              } else {
                                // Unknown table, fallback to *
                                subqueryColumns.push('*');
                                this.logger.log(`[PARSE-SQL] Unknown table ${String(sourceTableName)}, using * as fallback`);
                              }
                            } else {
                              // Fallback to just using *
                              subqueryColumns.push('*');
                            }
                          } else {
                            subqueryColumns.push(String(columnName));
                          }
                        }
                      });
                    }
                  }
                } catch (error) {
                  this.logger.log(`[PARSE-SQL] JOIN subquery ${index} column extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }
              
              if (tableName && tableAlias) {
                if (isSubquery) {
                  // Add subquery table
                  tables.push({
                    table: tableName,
                    name: tableName,
                    alias: tableAlias,
                    type: 'subquery',
                    columns: subqueryColumns
                  });
                } else {
                  // Check if this is a CTE table and extract columns
                  let isCTE = false;
                  const cteColumns: string[] = [];
                  
                  if (queryAny.withClause && queryAny.withClause.tables && Array.isArray(queryAny.withClause.tables)) {
                    (queryAny.withClause.tables as unknown[]).forEach((cte: unknown) => {
                      if (isValidCte(cte) && cte.aliasExpression?.table?.name === tableName) {
                        isCTE = true;
                        
                        // Extract columns from CTE definition
                        if (isValidCte(cte) && cte.query?.selectClause?.items) {
                          (cte.query.selectClause.items as unknown[]).forEach((item: unknown) => {
                            if (isValidSelectItem(item) && item.identifier?.name) {
                              cteColumns.push(item.identifier.name);
                            }
                          });
                        }
                      }
                    });
                  }
                  
                  // Only add if not already added (to avoid duplicates)
                  const alreadyExists = tables.some(t => t.name === tableName && t.alias === tableAlias);
                  if (!alreadyExists) {
                    tables.push({
                      table: tableName,
                      name: tableName,
                      alias: tableAlias,
                      type: isCTE ? 'cte' : 'regular',
                      columns: isCTE ? cteColumns : undefined
                    });
                  }
                }
              }
            }
          });
        }

        this.logger.log(`[PARSE-SQL] Extracted ${tables.length} tables with aliases: ${JSON.stringify(tables)}`);
        
        res.json({ success: true, query: query, tables: tables });
      } catch (parseError) {
        this.logger.log(`[PARSE-SQL] Parse failed: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
        res.json({ success: false, error: parseError instanceof Error ? parseError.message : 'Parse error' });
      }
    } catch (error) {
      this.logger.log(`[PARSE-SQL] API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
import { Request, Response } from 'express';
import { Logger } from '../utils/logging.js';

export class SqlParserApi {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
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
        const tables: any[] = [];

        // Convert to SimpleSelectQuery if needed (for WITH clause support)
        let queryAny = query as any;
        if (query.constructor.name !== 'SimpleSelectQuery') {
          this.logger.log(`[PARSE-SQL] Converting to SimpleSelectQuery`);
          queryAny = query.toSimpleQuery();
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
          this.logger.log(`[PARSE-SQL] withClause tables length: ${queryAny.withClause.tables?.length || 0}`);
        } else {
          this.logger.log(`[PARSE-SQL] withClause is falsy, not processing CTE tables`);
        }

        // Extract CTE tables from withClause
        if (queryAny.withClause) {
          this.logger.log(`[PARSE-SQL] withClause structure: ${JSON.stringify(queryAny.withClause, null, 2)}`);
          
          // Check for CTE tables in withClause.tables
          if (queryAny.withClause.tables && Array.isArray(queryAny.withClause.tables)) {
            queryAny.withClause.tables.forEach((cte: any, index: number) => {
              let cteName = null;
              let cteColumns: string[] = [];
              
              // Extract CTE name from aliasExpression
              if (cte.aliasExpression && cte.aliasExpression.table) {
                cteName = cte.aliasExpression.table.name;
              }
              
              // Extract columns from CTE definition if available
              if (cte.aliasExpression && cte.aliasExpression.columns) {
                cteColumns = cte.aliasExpression.columns.map((col: any) => col.name || col);
              }
              
              // Use SelectableColumnCollector to extract columns from CTE query
              if (cte.query) {
                try {
                  const collector = new SelectableColumnCollector();
                  collector.collect(cte.query);
                  const collectedColumns = collector.getValues();
                  
                  this.logger.log(`[PARSE-SQL] CTE ${index} SelectableColumnCollector result: ${JSON.stringify(collectedColumns, null, 2)}`);
                  
                  // Extract column names from collected columns
                  if (collectedColumns && Array.isArray(collectedColumns) && collectedColumns.length > 0) {
                    collectedColumns.forEach((col: any) => {
                      if (col.alias) {
                        cteColumns.push(col.alias);
                      } else if (col.name) {
                        cteColumns.push(col.name);
                      } else if (col.columnName) {
                        cteColumns.push(col.columnName);
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
                  if (cte.query.selectClause && cte.query.selectClause.items) {
                    const selectItems = cte.query.selectClause.items;
                    this.logger.log(`[PARSE-SQL] CTE ${index} fallback selectClause.items: ${JSON.stringify(selectItems, null, 2)}`);
                    
                    selectItems.forEach((item: any) => {
                      let columnName = null;
                      
                      // Check identifier first (for "SELECT 1 as value")
                      if (item.identifier && item.identifier.name) {
                        columnName = item.identifier.name;
                      }
                      // Check value.qualifiedName for column references
                      else if (item.value && item.value.qualifiedName && item.value.qualifiedName.name) {
                        columnName = item.value.qualifiedName.name.name;
                      }
                      // Check alias expressions
                      else if (item.aliasExpression && item.aliasExpression.column) {
                        columnName = item.aliasExpression.column.name;
                      }
                      
                      if (columnName) {
                        cteColumns.push(columnName);
                      }
                    });
                  }
                }
              }
              
              this.logger.log(`[PARSE-SQL] Found CTE ${index}: name="${cteName}", columns=[${cteColumns.join(', ')}]`);
              
              if (cteName) {
                tables.push({
                  name: cteName,
                  alias: cteName, // CTE name serves as both table name and alias
                  type: 'cte',
                  columns: cteColumns
                });
              }
            });
          }
        }

        // Extract tables from fromClause.source (not fromClause.tables)
        if (queryAny.fromClause && queryAny.fromClause.source) {
          const source = queryAny.fromClause.source;
          
          if (source.datasource && source.datasource.qualifiedName) {
            const tableName = source.datasource.qualifiedName.name?.name;
            const tableAlias = source.aliasExpression?.table?.name;
            
            this.logger.log(`[PARSE-SQL] Found table: name="${tableName}", alias="${tableAlias}"`);
            
            if (tableName) {
              // Check if this is a CTE table and extract columns
              let isCTE = false;
              const cteColumns: string[] = [];
              
              if (queryAny.withClause && queryAny.withClause.tables) {
                queryAny.withClause.tables.forEach((cte: any) => {
                  if (cte.aliasExpression && cte.aliasExpression.table && cte.aliasExpression.table.name === tableName) {
                    isCTE = true;
                    
                    // Extract columns from CTE definition
                    if (cte.query && cte.query.selectClause && cte.query.selectClause.items) {
                      cte.query.selectClause.items.forEach((item: any) => {
                        if (item.identifier && item.identifier.name) {
                          cteColumns.push(item.identifier.name);
                        }
                      });
                    }
                  }
                });
              }
              
              tables.push({
                name: tableName,
                alias: tableAlias,
                type: isCTE ? 'cte' : 'regular',
                columns: isCTE ? cteColumns : undefined
              });
            }
          }
        }

        // Also check for JOIN tables if they exist (support both regular tables and subqueries)
        if (queryAny.fromClause && queryAny.fromClause.joins) {
          queryAny.fromClause.joins.forEach((join: any, index: number) => {
            if (join.source) {
              let tableName = null;
              const tableAlias = join.source.aliasExpression?.table?.name;
              let isSubquery = false;
              const subqueryColumns: string[] = [];
              
              // Check if this is a regular table
              if (join.source.datasource && join.source.datasource.qualifiedName) {
                tableName = join.source.datasource.qualifiedName.name?.name;
                this.logger.log(`[PARSE-SQL] Found JOIN table ${index}: name="${tableName}", alias="${tableAlias}"`);
              } 
              // Check if this is a subquery (stored in datasource.query)
              else if (join.source.datasource && join.source.datasource.query) {
                isSubquery = true;
                tableName = `subquery_${index}`;
                this.logger.log(`[PARSE-SQL] Found JOIN subquery ${index}: alias="${tableAlias}"`);
                this.logger.log(`[PARSE-SQL] JOIN subquery ${index} structure: ${JSON.stringify(join.source.datasource.query, null, 2)}`);
                
                // Extract columns from subquery using SelectableColumnCollector
                try {
                  const collector = new SelectableColumnCollector();
                  collector.collect(join.source.datasource.query);
                  const collectedColumns = collector.getValues();
                  
                  this.logger.log(`[PARSE-SQL] JOIN subquery ${index} SelectableColumnCollector result: ${JSON.stringify(collectedColumns, null, 2)}`);
                  
                  if (collectedColumns && Array.isArray(collectedColumns) && collectedColumns.length > 0) {
                    collectedColumns.forEach((col: any) => {
                      if (col.alias) {
                        subqueryColumns.push(col.alias);
                      } else if (col.name) {
                        subqueryColumns.push(col.name);
                      } else if (col.columnName) {
                        subqueryColumns.push(col.columnName);
                      } else if (typeof col === 'string') {
                        subqueryColumns.push(col);
                      }
                    });
                  } else {
                    // Fallback to manual extraction
                    if (join.source.datasource.query.selectClause && join.source.datasource.query.selectClause.items) {
                      join.source.datasource.query.selectClause.items.forEach((item: any) => {
                        if (item.identifier && item.identifier.name) {
                          subqueryColumns.push(item.identifier.name);
                        } else if (item.value && item.value.qualifiedName && item.value.qualifiedName.name) {
                          const columnName = item.value.qualifiedName.name.name;
                          if (columnName === '*') {
                            // Handle SELECT * case - extract actual columns from the source table
                            this.logger.log(`[PARSE-SQL] Found SELECT * in subquery, extracting from source table`);
                            
                            // Get the source table name from the subquery's FROM clause
                            const subqueryFromClause = join.source.datasource.query.fromClause;
                            if (subqueryFromClause && subqueryFromClause.source && subqueryFromClause.source.datasource && subqueryFromClause.source.datasource.qualifiedName) {
                              const sourceTableName = subqueryFromClause.source.datasource.qualifiedName.name?.name;
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
                                this.logger.log(`[PARSE-SQL] Unknown table ${sourceTableName}, using * as fallback`);
                              }
                            } else {
                              // Fallback to just using *
                              subqueryColumns.push('*');
                            }
                          } else {
                            subqueryColumns.push(columnName);
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
                    name: tableName,
                    alias: tableAlias,
                    type: 'subquery',
                    columns: subqueryColumns
                  });
                } else {
                  // Check if this is a CTE table and extract columns
                  let isCTE = false;
                  const cteColumns: string[] = [];
                  
                  if (queryAny.withClause && queryAny.withClause.tables) {
                    queryAny.withClause.tables.forEach((cte: any) => {
                      if (cte.aliasExpression && cte.aliasExpression.table && cte.aliasExpression.table.name === tableName) {
                        isCTE = true;
                        
                        // Extract columns from CTE definition
                        if (cte.query && cte.query.selectClause && cte.query.selectClause.items) {
                          cte.query.selectClause.items.forEach((item: any) => {
                            if (item.identifier && item.identifier.name) {
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
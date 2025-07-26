/**
 * SQL Parser Service
 * rawsql-tsを使用したSQL解析機能をブラウザで提供
 */

import { RawSqlBrowser } from '../core/rawsql-browser.js';

export class SqlParserService {
    constructor() {
        this.formatterConfig = this.getDefaultFormatterConfig();
        this.parseCache = new Map();
    }
    
    async initialize() {
        // RawSqlBrowserが初期化されているか確認
        if (!RawSqlBrowser.rawsqlModule) {
            throw new Error('RawSqlBrowser not initialized');
        }
    }
    
    /**
     * SQLのパース
     */
    async parseSql(body) {
        const { sql, options = {} } = body;
        
        if (!sql) {
            return { success: false, error: 'SQL is required' };
        }
        
        // キャッシュチェック
        const cacheKey = this.getCacheKey(sql, options);
        if (this.parseCache.has(cacheKey)) {
            return this.parseCache.get(cacheKey);
        }
        
        try {
            const parser = RawSqlBrowser.getParser();
            const query = parser.parse(sql);
            
            const result = {
                success: true,
                query: this.serializeQuery(query),
                type: query.constructor.name,
                hasCTE: !!(query.withClause && query.withClause.tables.length > 0)
            };
            
            // キャッシュに保存
            this.parseCache.set(cacheKey, result);
            
            return result;
            
        } catch (error) {
            console.error('[SqlParserService] Parse error:', error);
            return {
                success: false,
                error: error.message || 'Failed to parse SQL'
            };
        }
    }
    
    /**
     * SQLの検証
     */
    async validateSql(body) {
        const { sql } = body;
        
        if (!sql) {
            return { success: false, isValid: false, error: 'SQL is required' };
        }
        
        try {
            const parser = RawSqlBrowser.getParser();
            parser.parse(sql);
            
            return {
                success: true,
                isValid: true,
                message: 'SQL is valid'
            };
            
        } catch (error) {
            console.error('[SqlParserService] Validation error:', error);
            return {
                success: true,
                isValid: false,
                error: error.message || 'Invalid SQL syntax',
                details: error.stack
            };
        }
    }
    
    /**
     * SQLのフォーマット
     */
    async formatSql(body) {
        const { sql, config } = body;
        
        if (!sql) {
            return { success: false, error: 'SQL is required' };
        }
        
        try {
            const formatter = RawSqlBrowser.getFormatter(config || this.formatterConfig);
            const parser = RawSqlBrowser.getParser();
            
            const query = parser.parse(sql);
            const formatted = formatter.format(query);
            
            return {
                success: true,
                formattedSql: typeof formatted === 'string' ? formatted : formatted.formattedSql,
                originalSql: sql
            };
            
        } catch (error) {
            console.error('[SqlParserService] Format error:', error);
            return {
                success: false,
                error: error.message || 'Failed to format SQL',
                originalSql: sql
            };
        }
    }
    
    /**
     * CTE依存関係の分析
     */
    async analyzeCTEDependencies(body) {
        const { sql } = body;
        
        if (!sql) {
            return { success: false, error: 'SQL is required' };
        }
        
        try {
            const parser = RawSqlBrowser.getParser();
            const query = parser.parse(sql);
            const simpleQuery = query.toSimpleQuery();
            
            const dependencies = {};
            
            if (simpleQuery.withClause && simpleQuery.withClause.tables) {
                simpleQuery.withClause.tables.forEach(cte => {
                    const cteName = cte.aliasExpression?.table?.name || 'unknown';
                    dependencies[cteName] = {
                        name: cteName,
                        dependencies: this.extractCTEDependencies(cte),
                        query: this.extractCTEQuery(cte)
                    };
                });
            }
            
            return {
                success: true,
                dependencies,
                mainQuery: this.extractMainQuery(simpleQuery),
                cteCount: Object.keys(dependencies).length
            };
            
        } catch (error) {
            console.error('[SqlParserService] CTE analysis error:', error);
            return {
                success: false,
                error: error.message || 'Failed to analyze CTE dependencies'
            };
        }
    }
    
    /**
     * デフォルトフォーマッター設定
     */
    getDefaultFormatterConfig() {
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
     * キャッシュキーの生成
     */
    getCacheKey(sql, options) {
        return `${sql.trim()}_${JSON.stringify(options)}`;
    }
    
    /**
     * クエリオブジェクトのシリアライズ
     */
    serializeQuery(query) {
        // 循環参照を避けるための簡易シリアライズ
        return {
            type: query.constructor.name,
            sql: query.sql || '',
            hasCTE: !!(query.withClause && query.withClause.tables.length > 0)
        };
    }
    
    /**
     * CTE依存関係の抽出
     */
    extractCTEDependencies(cte) {
        // CTEクエリから参照している他のCTE名を抽出
        const dependencies = [];
        
        // 簡易的な実装（実際にはAST解析が必要）
        if (cte.query && typeof cte.query === 'string') {
            const matches = cte.query.match(/\b(?:FROM|JOIN)\s+(\w+)/gi);
            if (matches) {
                matches.forEach(match => {
                    const tableName = match.replace(/^(?:FROM|JOIN)\s+/i, '');
                    dependencies.push(tableName);
                });
            }
        }
        
        return [...new Set(dependencies)];
    }
    
    /**
     * CTEクエリの抽出
     */
    extractCTEQuery(cte) {
        // CTEのクエリ部分を抽出
        if (cte.query) {
            return typeof cte.query === 'string' ? cte.query : '';
        }
        return '';
    }
    
    /**
     * メインクエリの抽出
     */
    extractMainQuery(simpleQuery) {
        // WITH句を除いたメインクエリ部分を抽出
        if (simpleQuery.sql) {
            const sql = simpleQuery.sql;
            const withMatch = sql.match(/^WITH\s+.*?\s+SELECT/is);
            if (withMatch) {
                return sql.substring(withMatch[0].lastIndexOf('SELECT'));
            }
        }
        return simpleQuery.sql || '';
    }
    
    /**
     * スキーマ情報の抽出
     * rawsql-tsのSchemaCollectorを使用してテーブル名と列名を抽出
     */
    async extractSchema(body) {
        const { sql } = body;
        
        if (!sql) {
            return { success: false, error: 'SQL is required' };
        }
        
        try {
            const parser = RawSqlBrowser.getParser();
            const query = parser.parse(sql);
            
            // SchemaCollectorでスキーマ情報を抽出
            const schemaCollector = RawSqlBrowser.getSchemaCollector();
            const tableSchemas = schemaCollector.collect(query);
            
            // レスポンス形式に変換
            const tables = tableSchemas.map(schema => ({
                name: schema.name,
                columns: schema.columns
            }));
            
            return {
                success: true,
                tables,
                message: `Extracted schema from ${tables.length} table(s)`
            };
            
        } catch (error) {
            console.error('[SqlParserService] Schema extraction error:', error);
            return {
                success: false,
                error: error.message || 'Failed to extract schema from SQL'
            };
        }
    }
}
/**
 * RawSQL-TS Browser Adapter
 * rawsql-tsをブラウザ環境で動作させるためのアダプター
 */

export class RawSqlBrowser {
    static rawsqlModule = null;
    
    /**
     * rawsql-tsモジュールの初期化
     */
    static async initialize() {
        try {
            // rawsql-tsを動的インポート
            // webpackがNode.js依存を除去してブラウザ用にバンドル
            const rawsql = await import('rawsql-ts');
            
            this.rawsqlModule = {
                SelectQueryParser: rawsql.SelectQueryParser,
                SqlFormatter: rawsql.SqlFormatter,
                QueryFlowDiagramGenerator: rawsql.QueryFlowDiagramGenerator,
                CTEComposer: rawsql.CTEComposer,
                SchemaCollector: rawsql.SchemaCollector,
                // その他必要なクラス/関数
            };
            
            // グローバルに公開（既存コードとの互換性）
            window.rawsqlTs = this.rawsqlModule;
            
            console.log('[RawSqlBrowser] rawsql-ts module loaded successfully');
            return this.rawsqlModule;
            
        } catch (error) {
            console.error('[RawSqlBrowser] Failed to load rawsql-ts:', error);
            
            // フォールバック: 基本的な機能のみ提供
            this.rawsqlModule = this.createFallbackModule();
            window.rawsqlTs = this.rawsqlModule;
            
            throw new Error('rawsql-ts initialization failed, using fallback mode');
        }
    }
    
    /**
     * フォールバックモジュールの作成
     * rawsql-tsが読み込めない場合の最小限の実装
     */
    static createFallbackModule() {
        return {
            SelectQueryParser: {
                parse: (sql) => {
                    console.warn('[RawSqlBrowser] Using fallback parser');
                    return {
                        toSimpleQuery: () => ({ 
                            type: 'select',
                            sql: sql,
                            tables: [],
                            columns: []
                        }),
                        withClause: null
                    };
                }
            },
            
            SqlFormatter: class {
                constructor(config) {
                    this.config = config || {};
                }
                
                format(query) {
                    console.warn('[RawSqlBrowser] Using fallback formatter');
                    // 簡易的なフォーマット
                    return typeof query === 'string' ? query : query.sql || '';
                }
            },
            
            QueryFlowDiagramGenerator: class {
                generateMermaidFlow(sql, options) {
                    console.warn('[RawSqlBrowser] Using fallback diagram generator');
                    return `graph TD\n    A[Query] --> B[Result]`;
                }
            },
            
            CTEComposer: class {
                constructor(config) {
                    this.config = config || {};
                }
                
                compose(ctes, mainQuery) {
                    console.warn('[RawSqlBrowser] Using fallback CTE composer');
                    if (!ctes || ctes.length === 0) {
                        return mainQuery;
                    }
                    
                    // 簡易的なCTE合成
                    const withClause = ctes.map(cte => 
                        `${cte.name} AS (\n${cte.query}\n)`
                    ).join(',\n');
                    
                    return `WITH ${withClause}\n${mainQuery}`;
                }
            }
        };
    }
    
    /**
     * パーサーの取得
     */
    static getParser() {
        if (!this.rawsqlModule) {
            throw new Error('RawSqlBrowser not initialized');
        }
        return this.rawsqlModule.SelectQueryParser;
    }
    
    /**
     * フォーマッターの取得
     */
    static getFormatter(config) {
        if (!this.rawsqlModule) {
            throw new Error('RawSqlBrowser not initialized');
        }
        return new this.rawsqlModule.SqlFormatter(config);
    }
    
    /**
     * CTE Composerの取得
     */
    static getCTEComposer(config) {
        if (!this.rawsqlModule) {
            throw new Error('RawSqlBrowser not initialized');
        }
        return new this.rawsqlModule.CTEComposer(config);
    }
    
    /**
     * Flow Diagram Generatorの取得
     */
    static getFlowDiagramGenerator() {
        if (!this.rawsqlModule) {
            throw new Error('RawSqlBrowser not initialized');
        }
        return new this.rawsqlModule.QueryFlowDiagramGenerator();
    }
    
    /**
     * Schema Collectorの取得
     */
    static getSchemaCollector() {
        if (!this.rawsqlModule) {
            throw new Error('RawSqlBrowser not initialized');
        }
        return new this.rawsqlModule.SchemaCollector();
    }
}
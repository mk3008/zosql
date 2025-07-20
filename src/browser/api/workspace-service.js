/**
 * Workspace Service
 * ワークスペース管理機能をブラウザで提供
 * LocalStorageを使用してデータを永続化
 */

import { RawSqlBrowser } from '../core/rawsql-browser.js';

export class WorkspaceService {
    constructor() {
        this.STORAGE_KEY = 'zosql_workspace';
        this.VERSION = '1.0.0';
        this.workspace = null;
    }
    
    async initialize() {
        // LocalStorageからワークスペースを読み込み
        this.loadWorkspace();
    }
    
    /**
     * ワークスペースの取得
     */
    async getWorkspace() {
        return {
            success: true,
            workspace: this.workspace ? this.workspace.workspaceInfo : null,
            hasWorkspace: !!this.workspace
        };
    }
    
    /**
     * クエリの分解
     */
    async decomposeQuery(body) {
        const { sql, queryName, originalFilePath } = body;
        
        if (!sql) {
            return { success: false, error: 'SQL is required' };
        }
        
        try {
            console.log('[WorkspaceService] Decomposing query:', queryName || 'unnamed');
            
            // CTEの抽出と分解
            const { privateCtes, decomposedQuery, flowDiagram } = await this.extractCTEsAndDecomposeQuery(sql);
            
            // ワークスペース情報の作成
            const workspaceInfo = {
                name: queryName || 'decomposed_query',
                originalQuery: sql,
                originalFilePath: originalFilePath || '',
                decomposedQuery,
                privateCtes,
                created: new Date().toISOString(),
                lastModified: new Date().toISOString()
            };
            
            // ワークスペースの保存
            this.saveWorkspace(workspaceInfo);
            
            return {
                success: true,
                workspace: workspaceInfo,
                privateCteCount: Object.keys(privateCtes).length,
                decomposedQuery,
                flowDiagram,
                message: 'Query decomposed successfully'
            };
            
        } catch (error) {
            console.error('[WorkspaceService] Error decomposing query:', error);
            return {
                success: false,
                error: error.message || 'Failed to decompose query'
            };
        }
    }
    
    /**
     * クエリの合成
     */
    async composeQuery(body) {
        const { decomposedQuery } = body;
        
        if (!this.workspace) {
            return {
                success: false,
                error: 'No active workspace found'
            };
        }
        
        try {
            const privateCtes = this.workspace.privateCtes || {};
            const composedQuery = this.composeQueryWithCTEs(
                decomposedQuery || this.workspace.workspaceInfo.decomposedQuery,
                privateCtes
            );
            
            return {
                success: true,
                composedQuery,
                originalFilePath: this.workspace.workspaceInfo.originalFilePath,
                message: 'Query composed successfully'
            };
            
        } catch (error) {
            console.error('[WorkspaceService] Error composing query:', error);
            return {
                success: false,
                error: error.message || 'Failed to compose query'
            };
        }
    }
    
    /**
     * ワークスペースのクリア
     */
    async clearWorkspace() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            this.workspace = null;
            
            return {
                success: true,
                message: 'Workspace cleared successfully'
            };
            
        } catch (error) {
            console.error('[WorkspaceService] Error clearing workspace:', error);
            return {
                success: false,
                error: error.message || 'Failed to clear workspace'
            };
        }
    }
    
    /**
     * プライベートCTEの取得
     */
    async getPrivateCtes() {
        const privateCtes = this.workspace?.privateCtes || {};
        
        return {
            success: true,
            privateCtes,
            count: Object.keys(privateCtes).length
        };
    }
    
    /**
     * 単一プライベートCTEの取得
     */
    async getSinglePrivateCte(cteName) {
        if (!cteName) {
            return {
                success: false,
                error: 'CTE name is required'
            };
        }
        
        const privateCtes = this.workspace?.privateCtes || {};
        const cte = privateCtes[cteName];
        
        if (!cte) {
            return {
                success: false,
                error: `Private CTE not found: ${cteName}`
            };
        }
        
        return {
            success: true,
            cte,
            message: `Private CTE ${cteName} retrieved successfully`
        };
    }
    
    /**
     * プライベートCTEの更新
     */
    async updatePrivateCte(cteName, body) {
        const { query, description } = body;
        
        if (!cteName || !query) {
            return {
                success: false,
                error: 'CTE name and query are required'
            };
        }
        
        if (!this.workspace) {
            return {
                success: false,
                error: 'No active workspace found'
            };
        }
        
        try {
            // CTEの更新
            this.workspace.privateCtes[cteName] = {
                name: cteName,
                query: query,
                description: description || this.workspace.privateCtes[cteName]?.description || '',
                dependencies: this.workspace.privateCtes[cteName]?.dependencies || [],
                columns: []
            };
            
            // ワークスペースの更新
            this.workspace.workspaceInfo.privateCtes = this.workspace.privateCtes;
            this.workspace.workspaceInfo.lastModified = new Date().toISOString();
            
            // 保存
            this.saveWorkspace(this.workspace.workspaceInfo);
            
            return {
                success: true,
                message: `Private CTE ${cteName} updated successfully`
            };
            
        } catch (error) {
            console.error('[WorkspaceService] Error updating CTE:', error);
            return {
                success: false,
                error: error.message || 'Failed to update CTE'
            };
        }
    }
    
    /**
     * ワークスペースファイルの取得
     */
    async getWorkspaceFile(type, fileName) {
        try {
            let content = '';
            
            if (type === 'main') {
                content = this.workspace?.mainQuery || 
                         this.workspace?.workspaceInfo?.decomposedQuery || '';
            } else if (type === 'cte') {
                const cteName = fileName.replace('.cte', '').replace('.sql', '');
                const cte = this.workspace?.privateCtes?.[cteName];
                content = cte?.query || '';
            }
            
            if (content) {
                return {
                    success: true,
                    content,
                    fileName,
                    type
                };
            } else {
                return {
                    success: false,
                    error: `File not found: ${fileName}`,
                    fileName,
                    type
                };
            }
        } catch (error) {
            console.error('[WorkspaceService] Error getting workspace file:', error);
            return {
                success: false,
                error: error.message || 'Failed to get workspace file'
            };
        }
    }
    
    /**
     * ワークスペースの検証
     */
    async validateWorkspace() {
        if (!this.workspace) {
            return {
                success: false,
                error: 'No active workspace found'
            };
        }
        
        const results = [];
        
        // メインクエリの検証
        const mainQuery = this.workspace.workspaceInfo.decomposedQuery;
        if (mainQuery) {
            const mainResult = await this.validateSingleQuery('main', 'main_query', mainQuery);
            results.push(mainResult);
        }
        
        // 各CTEの検証
        const privateCtes = this.workspace.privateCtes || {};
        for (const [cteName, cte] of Object.entries(privateCtes)) {
            const cteResult = await this.validateSingleQuery('cte', cteName, cte.query);
            results.push(cteResult);
        }
        
        return {
            success: true,
            results,
            summary: {
                total: results.length,
                valid: results.filter(r => r.isValid).length,
                invalid: results.filter(r => !r.isValid).length
            }
        };
    }
    
    /**
     * 単一クエリの検証
     */
    async validateSingleQuery(type, name, sql) {
        try {
            const parser = RawSqlBrowser.getParser();
            parser.parse(sql);
            
            return {
                type,
                name,
                isValid: true,
                error: null
            };
        } catch (error) {
            return {
                type,
                name,
                isValid: false,
                error: error.message || 'Invalid SQL syntax'
            };
        }
    }
    
    /**
     * CTEの抽出と分解
     */
    async extractCTEsAndDecomposeQuery(sql) {
        const privateCtes = {};
        let decomposedQuery = sql;
        let flowDiagram = '';
        
        try {
            const parser = RawSqlBrowser.getParser();
            const query = parser.parse(sql);
            const simpleQuery = query.toSimpleQuery();
            
            // CTEの抽出
            if (simpleQuery.withClause && simpleQuery.withClause.tables) {
                simpleQuery.withClause.tables.forEach(cte => {
                    const cteName = cte.aliasExpression?.table?.name || 'unknown';
                    privateCtes[cteName] = {
                        name: cteName,
                        query: this.extractCTEQuery(cte),
                        description: `Extracted CTE: ${cteName}`,
                        dependencies: this.extractCTEDependencies(cte),
                        columns: []
                    };
                });
            }
            
            // フォーマット
            const formatter = RawSqlBrowser.getFormatter(this.getDefaultFormatterConfig());
            const formatResult = formatter.format(simpleQuery);
            decomposedQuery = typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
            
            // フロー図の生成
            try {
                const diagramGenerator = RawSqlBrowser.getFlowDiagramGenerator();
                flowDiagram = diagramGenerator.generateMermaidFlow(sql, {
                    direction: 'TD',
                    title: 'Query Flow Diagram'
                });
            } catch (diagramError) {
                console.warn('[WorkspaceService] Failed to generate flow diagram:', diagramError);
            }
            
        } catch (error) {
            console.error('[WorkspaceService] CTE extraction error:', error);
        }
        
        return { privateCtes, decomposedQuery, flowDiagram };
    }
    
    /**
     * CTEを含むクエリの合成
     */
    composeQueryWithCTEs(decomposedQuery, privateCtes) {
        if (!privateCtes || Object.keys(privateCtes).length === 0) {
            return decomposedQuery;
        }
        
        try {
            const composer = RawSqlBrowser.getCTEComposer({
                preset: 'postgres',
                withClauseStyle: 'full-oneline'
            });
            
            const editedCTEs = Object.values(privateCtes).map(cte => ({
                name: cte.name,
                query: cte.query
            }));
            
            return composer.compose(editedCTEs, decomposedQuery);
            
        } catch (error) {
            console.error('[WorkspaceService] CTE composition error:', error);
            return decomposedQuery;
        }
    }
    
    /**
     * ワークスペースの読み込み
     */
    loadWorkspace() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) {
                this.workspace = null;
                return;
            }
            
            const workspace = JSON.parse(stored);
            
            // バージョンチェック
            if (workspace.version !== this.VERSION) {
                console.warn('[WorkspaceService] Version mismatch, clearing workspace');
                this.clearWorkspace();
                return;
            }
            
            this.workspace = workspace;
            
        } catch (error) {
            console.error('[WorkspaceService] Error loading workspace:', error);
            this.workspace = null;
        }
    }
    
    /**
     * ワークスペースの保存
     */
    saveWorkspace(workspaceInfo) {
        try {
            this.workspace = {
                version: this.VERSION,
                workspaceInfo,
                privateCtes: workspaceInfo.privateCtes || {},
                mainQuery: workspaceInfo.decomposedQuery || '',
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.workspace));
            console.log('[WorkspaceService] Workspace saved to localStorage');
            
        } catch (error) {
            console.error('[WorkspaceService] Error saving workspace:', error);
            throw error;
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
     * CTEクエリの抽出（修正版）
     * rawsql-tsのSelectQueryオブジェクトをSQL文字列に変換
     */
    extractCTEQuery(cte) {
        if (!cte || !cte.query) {
            return '';
        }
        
        try {
            // cte.queryはSelectQueryオブジェクトなので、SqlFormatterで文字列に変換
            const formatter = RawSqlBrowser.getFormatter(this.getDefaultFormatterConfig());
            const formatResult = formatter.format(cte.query);
            
            // formatResultは {formattedSql: string, params: any} の形式
            const sql = typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
            
            return sql || '';
            
        } catch (error) {
            console.error('[WorkspaceService] Error extracting CTE query:', error);
            console.error('[WorkspaceService] CTE object:', cte);
            return '';
        }
    }
    
    /**
     * CTE依存関係の抽出（修正版）
     * rawsql-tsのSelectQueryオブジェクトから依存関係を正しく抽出
     */
    extractCTEDependencies(cte) {
        const dependencies = [];
        
        if (!cte || !cte.query) {
            return dependencies;
        }
        
        try {
            // まずSelectQueryオブジェクトをSQL文字列に変換
            const formatter = RawSqlBrowser.getFormatter(this.getDefaultFormatterConfig());
            const formatResult = formatter.format(cte.query);
            const sql = typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
            
            if (sql) {
                // SQL文字列から依存関係を抽出
                const matches = sql.match(/\b(?:FROM|JOIN)\s+([a-zA-Z][a-zA-Z0-9_]*)/gi);
                if (matches) {
                    matches.forEach(match => {
                        const tableName = match.replace(/^(?:FROM|JOIN)\s+/i, '').trim();
                        // SQLキーワードや数字で始まる無効な識別子を除外
                        if (tableName && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(tableName)) {
                            dependencies.push(tableName);
                        }
                    });
                }
            }
            
        } catch (error) {
            console.error('[WorkspaceService] Error extracting CTE dependencies:', error);
        }
        
        // 重複を除去して返す
        return [...new Set(dependencies)];
    }
}
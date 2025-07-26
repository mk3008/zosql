/**
 * Browser API Adapter
 * サーバーサイドAPIをブラウザ環境で実行するアダプター
 * フロントエンドとバックエンドの責務を明確に分離
 */

import { SchemaParser } from './schema-parser.js';
import { SqlParserService } from './sql-parser-service.js';
import { WorkspaceService } from './workspace-service.js';
import { FileService } from './file-service.js';

export class BrowserApiAdapter {
    constructor() {
        // サービスインスタンス
        this.schemaParser = new SchemaParser();
        this.sqlParser = new SqlParserService();
        this.workspace = new WorkspaceService();
        this.fileService = new FileService();
        
        // APIエンドポイントマッピング
        this.endpoints = new Map();
        this.setupEndpoints();
    }
    
    /**
     * 初期化
     */
    async initialize() {
        // 各サービスの初期化
        await this.schemaParser.initialize();
        await this.sqlParser.initialize();
        await this.workspace.initialize();
        
        // APIインターセプターの設定
        this.setupFetchInterceptor();
        
        console.log('[BrowserApiAdapter] Initialized');
    }
    
    /**
     * エンドポイントの設定
     */
    setupEndpoints() {
        // スキーマ関連
        this.endpoints.set('GET /api/schema', () => this.schemaParser.getSchema());
        this.endpoints.set('POST /api/schema/reload', () => this.schemaParser.reloadSchema());
        
        // SQLパース関連
        this.endpoints.set('POST /api/parse-sql', (body) => this.sqlParser.parseSql(body));
        this.endpoints.set('POST /api/validate-sql', (body) => this.sqlParser.validateSql(body));
        this.endpoints.set('POST /api/format-sql', (body) => this.sqlParser.formatSql(body));
        this.endpoints.set('POST /api/analyze-cte-dependencies', (body) => this.sqlParser.analyzeCTEDependencies(body));
        this.endpoints.set('POST /api/extract-schema', (body) => this.sqlParser.extractSchema(body));
        
        // ワークスペース関連
        this.endpoints.set('GET /api/workspace', () => this.workspace.getWorkspace());
        this.endpoints.set('POST /api/workspace/decompose', (body) => this.workspace.decomposeQuery(body));
        this.endpoints.set('POST /api/workspace/compose', (body) => this.workspace.composeQuery(body));
        this.endpoints.set('DELETE /api/workspace/clear', () => this.workspace.clearWorkspace());
        this.endpoints.set('GET /api/workspace/private-ctes', () => this.workspace.getPrivateCtes());
        this.endpoints.set('GET /api/workspace/cte/:name', (_, params) => this.workspace.getSinglePrivateCte(params.name));
        this.endpoints.set('PUT /api/workspace/cte/:name', (body, params) => this.workspace.updatePrivateCte(params.name, body));
        this.endpoints.set('GET /api/validate-workspace', () => this.workspace.validateWorkspace());
        
        // ファイル関連
        this.endpoints.set('POST /api/read-sql-file', (body) => this.fileService.readSqlFile(body));
        this.endpoints.set('GET /api/workspace/:type/:fileName', (_, params) => 
            this.workspace.getWorkspaceFile(params.type, params.fileName)
        );
        
        // デバッグ関連
        this.endpoints.set('POST /api/debug/write', (body) => this.handleDebugWrite(body));
        this.endpoints.set('GET /api/logs', () => this.getLogs());
        
        // UI テンプレート
        this.endpoints.set('GET /api/ui-template', () => this.getUITemplate());
        
        // Toast通知
        this.endpoints.set('POST /api/toast', (body) => this.handleToast(body));
    }
    
    /**
     * Fetchインターセプターの設定
     * 既存のfetch呼び出しをインターセプトしてブラウザ実装にリダイレクト
     */
    setupFetchInterceptor() {
        const originalFetch = window.fetch;
        const adapter = this;
        
        window.fetch = async function(url, options = {}) {
            // APIエンドポイントへのリクエストをインターセプト
            if (typeof url === 'string' && url.startsWith('/api/')) {
                return adapter.handleApiRequest(url, options);
            }
            
            // その他のリクエストは通常のfetchに委譲
            return originalFetch.call(this, url, options);
        };
    }
    
    /**
     * APIリクエストの処理
     */
    async handleApiRequest(url, options) {
        const method = options.method || 'GET';
        const path = url.replace(/^\/api/, '/api');
        
        // パラメータの抽出
        const urlObj = new URL(url, window.location.origin);
        const params = this.extractParams(path, urlObj);
        
        // エンドポイントキーの作成
        const endpointKey = `${method} ${this.normalizeEndpoint(path)}`;
        
        // ハンドラーの取得
        const handler = this.endpoints.get(endpointKey);
        
        if (!handler) {
            console.warn(`[BrowserApiAdapter] No handler for: ${endpointKey}`);
            return new Response(JSON.stringify({ error: 'Not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        try {
            // リクエストボディの解析
            let body = null;
            if (options.body) {
                body = JSON.parse(options.body);
            }
            
            // ハンドラーの実行
            const result = await handler(body, params);
            
            // レスポンスの作成
            return new Response(JSON.stringify(result), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } catch (error) {
            console.error(`[BrowserApiAdapter] Error handling ${endpointKey}:`, error);
            return new Response(JSON.stringify({ 
                error: error.message || 'Internal error',
                success: false 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    
    /**
     * エンドポイントの正規化
     */
    normalizeEndpoint(path) {
        // パラメータを含むパスを正規化
        return path
            .replace(/\/cte\/[^\/]+/, '/cte/:name')
            .replace(/\/workspace\/[^\/]+\/[^\/]+/, '/workspace/:type/:fileName');
    }
    
    /**
     * URLパラメータの抽出
     */
    extractParams(path, urlObj) {
        const params = {};
        
        // パスパラメータの抽出
        const pathParts = path.split('/');
        
        // CTEパラメータ
        if (path.includes('/cte/')) {
            const cteIndex = pathParts.indexOf('cte');
            if (cteIndex !== -1 && pathParts[cteIndex + 1]) {
                params.name = decodeURIComponent(pathParts[cteIndex + 1]);
            }
        }
        
        // ワークスペースファイルパラメータ
        if (path.includes('/workspace/') && pathParts.length > 3) {
            params.type = pathParts[pathParts.length - 2];
            params.fileName = decodeURIComponent(pathParts[pathParts.length - 1]);
        }
        
        // クエリパラメータ
        urlObj.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        
        return params;
    }
    
    /**
     * デバッグ書き込みの処理
     */
    async handleDebugWrite(body) {
        const { filename, content } = body;
        console.log(`[Debug] ${filename}:`, content);
        return { success: true, message: 'Debug message logged to console' };
    }
    
    /**
     * ログの取得
     */
    async getLogs() {
        // ブラウザ環境では、コンソールログを返す
        return {
            success: true,
            logs: {
                general: ['See browser console for logs'],
                error: [],
                intellisense: [],
                query: []
            }
        };
    }
    
    /**
     * UIテンプレートの取得
     */
    async getUITemplate() {
        // 静的HTMLを返す（既存のデザインを維持）
        const response = await fetch('/static/ui-template.html');
        return response.text();
    }
    
    /**
     * Toast通知の処理
     */
    async handleToast(body) {
        const { message, type = 'info', title = '', duration = 4000 } = body;
        
        if (!message) {
            return { success: false, error: 'Message is required' };
        }
        
        try {
            // トースト関数がグローバルに利用可能になるまで待機
            let attempts = 0;
            while (typeof window.showToast !== 'function' && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (typeof window.showToast === 'function') {
                const toastId = window.showToast(message, type, title, duration);
                return { 
                    success: true, 
                    toastId,
                    message: 'Toast notification shown'
                };
            } else {
                // フォールバック: コンソールに表示
                console.log(`[TOAST ${type.toUpperCase()}] ${message}`);
                return { 
                    success: true, 
                    message: 'Toast logged to console (fallback)'
                };
            }
            
        } catch (error) {
            console.error('[BrowserApiAdapter] Error showing toast:', error);
            return {
                success: false,
                error: error.message || 'Failed to show toast'
            };
        }
    }
}
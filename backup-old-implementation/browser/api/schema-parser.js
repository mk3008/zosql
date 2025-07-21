/**
 * Schema Parser Service
 * スキーマ情報をブラウザで管理
 */

export class SchemaParser {
    constructor() {
        this.schema = null;
        this.STORAGE_KEY = 'zosql_schema';
    }
    
    async initialize() {
        // デフォルトスキーマまたはLocalStorageから読み込み
        await this.loadSchema();
    }
    
    /**
     * スキーマの取得
     */
    async getSchema() {
        if (!this.schema) {
            await this.loadSchema();
        }
        
        return {
            success: true,
            schema: this.schema,
            tableCount: this.schema ? Object.keys(this.schema).length : 0
        };
    }
    
    /**
     * スキーマの再読み込み
     */
    async reloadSchema() {
        try {
            // ブラウザ環境では、埋め込みスキーマまたは外部JSONから読み込み
            await this.loadSchema();
            
            return {
                success: true,
                message: 'Schema reloaded successfully',
                tableCount: this.schema ? Object.keys(this.schema).length : 0
            };
            
        } catch (error) {
            console.error('[SchemaParser] Error reloading schema:', error);
            return {
                success: false,
                error: error.message || 'Failed to reload schema'
            };
        }
    }
    
    /**
     * スキーマの読み込み
     */
    async loadSchema() {
        try {
            // 1. LocalStorageから読み込み
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.schema = JSON.parse(stored);
                return;
            }
            
            // 2. 静的JSONファイルから読み込み
            try {
                const response = await fetch('/static/zosql.schema.json');
                if (response.ok) {
                    this.schema = await response.json();
                    // LocalStorageに保存
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.schema));
                    return;
                }
            } catch (fetchError) {
                console.warn('[SchemaParser] Failed to fetch schema file:', fetchError);
            }
            
            // 3. デフォルトスキーマを使用
            this.schema = this.getDefaultSchema();
            
        } catch (error) {
            console.error('[SchemaParser] Error loading schema:', error);
            this.schema = this.getDefaultSchema();
        }
    }
    
    /**
     * デフォルトスキーマ
     */
    getDefaultSchema() {
        return {
            users: {
                user_id: { type: 'integer', nullable: false },
                username: { type: 'varchar', nullable: false },
                email: { type: 'varchar', nullable: false },
                created_at: { type: 'timestamp', nullable: false },
                updated_at: { type: 'timestamp', nullable: false }
            },
            orders: {
                order_id: { type: 'integer', nullable: false },
                user_id: { type: 'integer', nullable: false },
                product_id: { type: 'integer', nullable: false },
                quantity: { type: 'integer', nullable: false },
                total_amount: { type: 'numeric', nullable: false },
                order_date: { type: 'timestamp', nullable: false },
                status: { type: 'varchar', nullable: false }
            },
            products: {
                product_id: { type: 'integer', nullable: false },
                name: { type: 'varchar', nullable: false },
                description: { type: 'text', nullable: true },
                price: { type: 'numeric', nullable: false },
                stock_quantity: { type: 'integer', nullable: false },
                category: { type: 'varchar', nullable: true },
                created_at: { type: 'timestamp', nullable: false }
            },
            categories: {
                category_id: { type: 'integer', nullable: false },
                name: { type: 'varchar', nullable: false },
                description: { type: 'text', nullable: true },
                parent_category_id: { type: 'integer', nullable: true }
            }
        };
    }
    
    /**
     * カスタムスキーマの設定
     */
    async setSchema(schema) {
        try {
            this.schema = schema;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(schema));
            
            return {
                success: true,
                message: 'Schema updated successfully',
                tableCount: Object.keys(schema).length
            };
            
        } catch (error) {
            console.error('[SchemaParser] Error setting schema:', error);
            return {
                success: false,
                error: error.message || 'Failed to set schema'
            };
        }
    }
    
    /**
     * スキーマのクリア
     */
    async clearSchema() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            this.schema = this.getDefaultSchema();
            
            return {
                success: true,
                message: 'Schema cleared, using default schema'
            };
            
        } catch (error) {
            console.error('[SchemaParser] Error clearing schema:', error);
            return {
                success: false,
                error: error.message || 'Failed to clear schema'
            };
        }
    }
}
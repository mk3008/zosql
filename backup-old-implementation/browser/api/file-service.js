/**
 * File Service
 * ブラウザ環境でのファイル操作を提供
 */

export class FileService {
    constructor() {
        this.fileCache = new Map();
    }
    
    /**
     * SQLファイルの読み込み（ブラウザ環境）
     */
    async readSqlFile(body) {
        const { filePath } = body;
        
        if (!filePath) {
            return {
                success: false,
                error: 'File path is required'
            };
        }
        
        try {
            // キャッシュチェック
            if (this.fileCache.has(filePath)) {
                const content = this.fileCache.get(filePath);
                return {
                    success: true,
                    content,
                    filePath,
                    size: content.length
                };
            }
            
            // ブラウザ環境では、File APIを使用するか、
            // 事前に用意されたファイルを読み込む
            const content = await this.readFileContent(filePath);
            
            // キャッシュに保存
            this.fileCache.set(filePath, content);
            
            return {
                success: true,
                content,
                filePath,
                size: content.length
            };
            
        } catch (error) {
            console.error('[FileService] Error reading file:', error);
            return {
                success: false,
                error: `File not found: ${filePath}`
            };
        }
    }
    
    /**
     * ファイルコンテンツの読み込み
     */
    async readFileContent(filePath) {
        // 静的ファイルとして提供されている場合
        try {
            const response = await fetch(`/static/sql-examples/${filePath}`);
            if (response.ok) {
                return await response.text();
            }
        } catch (fetchError) {
            console.warn('[FileService] Failed to fetch file:', fetchError);
        }
        
        // LocalStorageから読み込み
        const storageKey = `zosql_file_${filePath}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            return stored;
        }
        
        // デモファイルを返す
        return this.getDemoFile(filePath);
    }
    
    /**
     * デモファイルの取得
     */
    getDemoFile(filePath) {
        const demoFiles = {
            'example.sql': `-- Example SQL Query
WITH user_orders AS (
    SELECT 
        u.user_id,
        u.username,
        COUNT(o.order_id) as order_count,
        SUM(o.total_amount) as total_spent
    FROM users u
    LEFT JOIN orders o ON u.user_id = o.user_id
    GROUP BY u.user_id, u.username
),
high_value_customers AS (
    SELECT *
    FROM user_orders
    WHERE total_spent > 1000
)
SELECT 
    hvc.*,
    RANK() OVER (ORDER BY total_spent DESC) as spending_rank
FROM high_value_customers hvc
ORDER BY total_spent DESC`,
            
            'analytics.sql': `-- Analytics Query
WITH daily_sales AS (
    SELECT 
        DATE(order_date) as sale_date,
        COUNT(*) as order_count,
        SUM(total_amount) as daily_total
    FROM orders
    WHERE status = 'completed'
    GROUP BY DATE(order_date)
),
moving_average AS (
    SELECT 
        sale_date,
        order_count,
        daily_total,
        AVG(daily_total) OVER (
            ORDER BY sale_date 
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) as seven_day_avg
    FROM daily_sales
)
SELECT * FROM moving_average
ORDER BY sale_date DESC
LIMIT 30`
        };
        
        return demoFiles[filePath] || `-- File not found: ${filePath}`;
    }
    
    /**
     * ファイルの保存（ブラウザ環境）
     */
    async saveFile(filePath, content) {
        try {
            // LocalStorageに保存
            const storageKey = `zosql_file_${filePath}`;
            localStorage.setItem(storageKey, content);
            
            // キャッシュ更新
            this.fileCache.set(filePath, content);
            
            return {
                success: true,
                message: `File saved: ${filePath}`
            };
            
        } catch (error) {
            console.error('[FileService] Error saving file:', error);
            return {
                success: false,
                error: error.message || 'Failed to save file'
            };
        }
    }
    
    /**
     * ファイルのダウンロード
     */
    downloadFile(filename, content) {
        try {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            return {
                success: true,
                message: `File downloaded: ${filename}`
            };
            
        } catch (error) {
            console.error('[FileService] Error downloading file:', error);
            return {
                success: false,
                error: error.message || 'Failed to download file'
            };
        }
    }
    
    /**
     * ファイルアップロード処理
     */
    async handleFileUpload(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const content = e.target.result;
                this.saveFile(file.name, content);
                resolve({
                    success: true,
                    filename: file.name,
                    content: content,
                    size: content.length
                });
            };
            
            reader.onerror = (error) => {
                reject({
                    success: false,
                    error: 'Failed to read file'
                });
            };
            
            reader.readAsText(file);
        });
    }
}
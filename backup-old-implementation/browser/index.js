/**
 * zosql Browser Entry Point
 * フロントエンドとバックエンドの責務を明確に分離
 */

import { BrowserApiAdapter } from './api/browser-api-adapter.js';
import { UILoader } from './core/ui-loader.js';
import { RawSqlBrowser } from './core/rawsql-browser.js';

// グローバルエラーハンドリング
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

/**
 * アプリケーション初期化
 */
async function initializeApp() {
    try {
        console.log('[zosql] Initializing browser version...');
        
        // 1. rawsql-tsのブラウザ版を初期化
        await RawSqlBrowser.initialize();
        console.log('[zosql] rawsql-ts browser initialized');
        
        // 2. APIアダプターを初期化（サーバーAPIをブラウザ実装に置き換え）
        const apiAdapter = new BrowserApiAdapter();
        await apiAdapter.initialize();
        console.log('[zosql] API adapter initialized');
        
        // 3. 既存のUIを読み込み（デザイン変更なし）
        const uiLoader = new UILoader();
        await uiLoader.loadExistingUI();
        console.log('[zosql] UI loaded successfully');
        
        // 4. グローバルAPIを設定（既存コードとの互換性維持）
        window.zosqlAPI = apiAdapter;
        
        // 5. イベントリスナーの設定
        setupEventHandlers();
        
        // 6. 初期化完了を通知
        window.dispatchEvent(new CustomEvent('zosql-ready', {
            detail: { version: '1.0.0-browser' }
        }));
        
        console.log('[zosql] Browser initialization complete');
        
    } catch (error) {
        console.error('[zosql] Initialization error:', error);
        showError(error);
    }
}

/**
 * イベントハンドラーの設定
 */
function setupEventHandlers() {
    // ファイル開くイベントの処理
    document.addEventListener('header-open-file', handleFileOpen);
    
    // その他のコンポーネントイベントの処理
    document.addEventListener('center-panel-file-content-changed', handleFileContentChanged);
    
    console.log('[zosql] Event handlers setup complete');
}

/**
 * ファイル開くイベントの処理
 */
async function handleFileOpen(event) {
    const { fileName, content } = event.detail;
    
    try {
        console.log(`[zosql] Opening file: ${fileName}`);
        
        // 1. 中央パネルにファイルを表示
        const centerPanel = document.getElementById('center-panel-shadow');
        if (centerPanel && centerPanel.createOrReuseTabForFile) {
            centerPanel.createOrReuseTabForFile(fileName, content, {
                type: 'sql',
                source: 'file-open'
            });
        }
        
        // 2. SQLファイルの場合、自動分解を実行
        if (fileName.toLowerCase().endsWith('.sql') && content.trim()) {
            try {
                const response = await fetch('/api/workspace/decompose', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sql: content,
                        queryName: fileName.replace(/\.sql$/i, ''),
                        originalFilePath: fileName
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('[zosql] SQL decomposed successfully:', result);
                    
                    // ワークスペースパネルの更新
                    const workspacePanel = document.getElementById('workspace-panel-shadow');
                    if (workspacePanel && workspacePanel.updateCTEDependencies) {
                        workspacePanel.updateCTEDependencies(result.workspace);
                    }
                }
            } catch (decomposeError) {
                console.warn('[zosql] Failed to decompose SQL:', decomposeError);
            }
        }
        
    } catch (error) {
        console.error('[zosql] Error handling file open:', error);
    }
}

/**
 * ファイル内容変更イベントの処理
 */
function handleFileContentChanged(event) {
    const { fileName, content } = event.detail;
    console.log(`[zosql] File content changed: ${fileName}`);
    
    // ファイル変更の処理（必要に応じて実装）
}

/**
 * エラー表示
 */
function showError(error) {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; padding: 20px;">
            <div style="max-width: 600px; text-align: center;">
                <h2 style="color: #ef4444; margin-bottom: 16px;">Initialization Error</h2>
                <p style="color: #6b7280; margin-bottom: 8px;">Failed to initialize zosql browser version.</p>
                <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: left; overflow-x: auto;">
${error.stack || error.message || error}
                </pre>
                <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Reload Page
                </button>
            </div>
        </div>
    `;
}

// DOMContentLoaded時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
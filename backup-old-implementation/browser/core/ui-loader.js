/**
 * UI Loader
 * 既存のUIをブラウザ環境に読み込む（デザイン変更なし）
 */

export class UILoader {
    /**
     * 既存のUIを読み込み
     */
    async loadExistingUI() {
        try {
            // 既存の静的HTMLファイルを取得
            const response = await fetch('./static/index.html');
            if (!response.ok) {
                throw new Error(`Failed to fetch static HTML: ${response.status}`);
            }
            
            const htmlContent = await response.text();
            
            // HTMLパーサーでパース
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // body要素の内容のみを取得
            const bodyContent = doc.body.innerHTML;
            
            // アプリケーションコンテナに挿入
            const appContainer = document.getElementById('app');
            appContainer.innerHTML = bodyContent;
            
            // 既存のスタイルシートを読み込み
            await this.loadExistingStyles();
            
            // Web Componentsの読み込み
            await this.loadWebComponents();
            
            // 必須モジュールの読み込み
            await this.loadEssentialModules();
            
            console.log('[UILoader] UI loaded successfully');
            
        } catch (error) {
            console.error('[UILoader] Failed to load UI:', error);
            
            // フォールバック: 静的HTMLを直接読み込み
            await this.loadStaticUI();
        }
    }
    
    /**
     * 静的UIの読み込み（フォールバック）
     */
    async loadStaticUI() {
        const appContainer = document.getElementById('app');
        
        // 既存のレイアウト構造を維持（スプリッター含む）
        appContainer.innerHTML = `
            <!-- Shadow DOM版 Header -->
            <header-shadow id="header-shadow" title="zosql Browser" show-logo show-open show-sidebar-toggles></header-shadow>
            
            <div class="main-container" style="display: flex; height: calc(100vh - 60px);">
                <!-- Shadow DOM版 Left Sidebar -->
                <div class="sidebar" id="left-sidebar" style="width: 280px; min-width: 200px; max-width: 500px; background: #f9fafb; border-right: 1px solid #e5e7eb; padding: 12px; overflow-y: auto; position: relative; flex-shrink: 0;">
                    <workspace-panel-shadow id="workspace-panel-shadow"></workspace-panel-shadow>
                    <div class="resize-handle" id="left-resize-handle"></div>
                </div>
                
                <!-- Left-Center Splitter -->
                <div class="splitter" id="left-center-splitter" style="width: 4px; background: transparent; cursor: col-resize; flex-shrink: 0;"></div>
                
                <!-- Shadow DOM版 中央パネル -->
                <center-panel-shadow id="center-panel-shadow" style="flex: 1; min-width: 0; background: #ffffff; display: flex; flex-direction: column;"></center-panel-shadow>
                
                <!-- Center-Right Splitter -->
                <div class="splitter" id="center-right-splitter" style="width: 4px; background: transparent; cursor: col-resize; flex-shrink: 0;"></div>
                
                <!-- Shadow DOM版 Right Panel -->
                <right-panel-shadow id="right-panel-shadow" title="Context Panel" collapsible resizable style="width: 300px; min-width: 200px; max-width: 500px; flex-shrink: 0;"></right-panel-shadow>
            </div>
        `;
        
        // Web Componentsスクリプトを読み込み
        await this.loadWebComponents();
    }
    
    /**
     * 既存のスクリプトを読み込み
     */
    async loadExistingScripts() {
        const scripts = [
            '/static/js/modules/monaco-loader.js',
            '/static/js/modules/sidebar-manager.js',
            '/static/js/components/workspace-panel-shadow.js',
            '/static/js/components/center-panel-shadow.js',
            '/static/js/components/context-panel-shadow.js',
            '/static/js/file-model-system/file-model-manager.js',
            '/static/js/file-model-system/file-model.js'
        ];
        
        for (const scriptPath of scripts) {
            await this.loadScript(scriptPath);
        }
    }
    
    /**
     * Web Componentsを読み込み
     */
    async loadWebComponents() {
        try {
            // Web Componentsのスクリプトを動的に読み込み
            const componentScripts = [
                './static/js/components/workspace-panel-shadow.js',
                './static/js/components/right-panel-shadow.js',
                './static/js/components/header-shadow.js',
                './static/js/components/center-panel-shadow.js',
                './static/js/components/monaco-editor-shadow.js'
            ];
            
            // 並列で読み込み
            await Promise.all(
                componentScripts.map(script => this.loadScript(script))
            );
            
            console.log('[UILoader] Web Components loaded');
        } catch (error) {
            console.error('[UILoader] Failed to load Web Components:', error);
        }
    }
    
    /**
     * 既存のスタイルシートを読み込み
     */
    async loadExistingStyles() {
        // 既存のHTMLに含まれているCSSリンクは自動的に読み込まれるため、
        // 追加で必要なものだけを読み込む
        
        // Monaco Editorの最新版スタイル
        const monacoLink = document.createElement('link');
        monacoLink.rel = 'stylesheet';
        monacoLink.href = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.36.1/min/vs/editor/editor.main.css';
        document.head.appendChild(monacoLink);
        
        console.log('[UILoader] Additional styles loaded');
    }
    
    /**
     * 必須モジュールの読み込み
     */
    async loadEssentialModules() {
        try {
            // Toast システム
            await this.loadScript('./static/js/modules/toast.js');
            
            // その他の必須モジュール
            const essentialModules = [
                './static/js/modules/logger.js',
                './static/js/modules/events.js',
                './static/js/modules/shortcuts.js'
            ];
            
            // 並列で読み込み（エラーは無視）
            await Promise.allSettled(
                essentialModules.map(module => this.loadScript(module))
            );
            
            // Sidebar Manager と Splitter Manager を最後に読み込み（DOM初期化完了後）
            await this.loadScript('./static/js/modules/sidebar-manager.js');
            await this.loadScript('./static/js/modules/splitter-manager.js');
            
            // サイドバーマネージャーの初期化を遅延実行
            setTimeout(() => {
                this.initializeSidebarManager();
            }, 500);
            
            console.log('[UILoader] Essential modules loaded');
        } catch (error) {
            console.warn('[UILoader] Some essential modules failed to load:', error);
        }
    }
    
    /**
     * サイドバーマネージャーの初期化
     */
    initializeSidebarManager() {
        try {
            // SidebarManagerクラスがグローバルに利用可能か確認
            if (typeof window.SidebarManager === 'function') {
                window.sidebarManager = new window.SidebarManager();
                console.log('[UILoader] SidebarManager initialized');
            } else {
                console.warn('[UILoader] SidebarManager class not found in global scope');
            }
        } catch (error) {
            console.warn('[UILoader] Error initializing SidebarManager:', error);
        }
    }
    
    /**
     * スクリプトを動的に読み込み
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
}
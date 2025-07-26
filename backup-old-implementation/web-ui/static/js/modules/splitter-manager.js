/**
 * Splitter Manager
 * パネル間のスプリッターによるリサイズ機能
 */

console.log('[SplitterManager] Script loaded');

export class SplitterManager {
    constructor() {
        this.isResizing = false;
        this.currentSplitter = null;
        this.startX = 0;
        this.startWidths = {};
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        console.log('[SplitterManager] Initialized');
        
        // スプリッター要素が存在するか確認
        setTimeout(() => {
            const leftCenterSplitter = document.getElementById('left-center-splitter');
            const centerRightSplitter = document.getElementById('center-right-splitter');
            
            console.log('[SplitterManager] Splitter elements check:', {
                leftCenterSplitter: !!leftCenterSplitter,
                centerRightSplitter: !!centerRightSplitter
            });
        }, 100);
    }
    
    setupEventListeners() {
        // スプリッターのマウスダウンイベント
        document.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('splitter')) {
                this.startResize(e);
            }
        });
        
        // グローバルマウスイベント
        document.addEventListener('mousemove', (e) => {
            if (this.isResizing) {
                this.handleResize(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isResizing) {
                this.stopResize();
            }
        });
    }
    
    startResize(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isResizing = true;
        this.currentSplitter = e.target;
        this.startX = e.clientX;
        
        // 現在の幅を記録
        const leftSidebar = document.getElementById('left-sidebar');
        const centerPanel = document.getElementById('center-panel-shadow');
        const rightPanel = document.getElementById('right-panel-shadow');
        
        console.log('[SplitterManager] Elements found:', {
            leftSidebar: !!leftSidebar,
            centerPanel: !!centerPanel,
            rightPanel: !!rightPanel,
            leftWidth: leftSidebar?.offsetWidth,
            centerWidth: centerPanel?.offsetWidth,
            rightWidth: rightPanel?.offsetWidth
        });
        
        this.startWidths = {
            left: leftSidebar ? leftSidebar.offsetWidth : 0,
            center: centerPanel ? centerPanel.offsetWidth : 0,
            right: rightPanel ? rightPanel.offsetWidth : 0
        };
        
        // マウスカーソルを変更
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        console.log('[SplitterManager] Resize started', {
            splitter: this.currentSplitter.id,
            startWidths: this.startWidths,
            startX: this.startX
        });
    }
    
    handleResize(e) {
        if (!this.isResizing || !this.currentSplitter) return;
        
        const deltaX = e.clientX - this.startX;
        const splitterId = this.currentSplitter.id;
        
        const leftSidebar = document.getElementById('left-sidebar');
        const centerPanel = document.getElementById('center-panel-shadow');
        const rightPanel = document.getElementById('right-panel-shadow');
        
        console.log('[SplitterManager] Resizing', {
            deltaX,
            splitterId,
            currentX: e.clientX,
            startX: this.startX
        });
        
        if (splitterId === 'left-center-splitter') {
            // 左サイドバーのリサイズ
            if (leftSidebar) {
                const newWidth = Math.max(200, Math.min(500, this.startWidths.left + deltaX));
                leftSidebar.style.width = `${newWidth}px`;
                console.log('[SplitterManager] Left sidebar resized to:', newWidth);
            }
        } else if (splitterId === 'center-right-splitter') {
            // 右パネルのリサイズ
            if (rightPanel) {
                const newWidth = Math.max(200, Math.min(500, this.startWidths.right - deltaX));
                rightPanel.style.width = `${newWidth}px`;
                console.log('[SplitterManager] Right panel resized to:', newWidth);
            }
        }
    }
    
    stopResize() {
        this.isResizing = false;
        this.currentSplitter = null;
        
        // マウスカーソルを元に戻す
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        console.log('[SplitterManager] Resize stopped');
    }
    
    /**
     * デバッグ用：現在のパネル幅を取得
     */
    getCurrentWidths() {
        const leftSidebar = document.getElementById('left-sidebar');
        const centerPanel = document.getElementById('center-panel-shadow');
        const rightPanel = document.getElementById('right-panel-shadow');
        
        return {
            left: leftSidebar ? leftSidebar.offsetWidth : 0,
            center: centerPanel ? centerPanel.offsetWidth : 0,
            right: rightPanel ? rightPanel.offsetWidth : 0
        };
    }
}

// グローバルに公開
window.SplitterManager = SplitterManager;

// 自動初期化
if (!window.splitterManager) {
    console.log('[SplitterManager] Creating new instance');
    window.splitterManager = new SplitterManager();
    console.log('[SplitterManager] Instance created and assigned to window.splitterManager');
} else {
    console.log('[SplitterManager] Instance already exists');
}

// デバッグ用関数
window.getSplitterWidths = () => window.splitterManager.getCurrentWidths();
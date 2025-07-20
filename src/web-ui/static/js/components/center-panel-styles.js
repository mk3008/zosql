/**
 * Center Panel CSS Styles Module
 * 中央パネルのCSS定義を分離
 * Shadow DOM対応
 */

export class CenterPanelStyles {
  /**
   * 完全なスタイルシートを取得
   */
  static getStyles() {
    return `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          flex: 1;
          min-width: 0;
          width: 100%;
          background: var(--bg-primary, #1e1e1e);
          color: var(--text-primary, #cccccc);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          overflow: hidden;
        }
        
        /* タブバー */
        .tab-bar {
          display: flex;
          align-items: center;
          background: #1a1a1a;
          height: 40px;
          min-height: 40px;
          position: relative;
          overflow: hidden;
        }
        
        /* タブバーの下線を別要素として追加 */
        .tab-bar::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--border-primary, #454545);
          z-index: 1;
        }
        
        .tab-scroll-container {
          flex: 1;
          overflow: hidden;
          position: relative;
          z-index: 2;
        }
        
        .tab-list {
          display: flex;
          align-items: center;
          height: 100%;
          transition: transform 0.2s ease;
          white-space: nowrap;
          position: relative;
          z-index: 2;
        }
        
        .tab {
          display: flex;
          align-items: center;
          background: #181818;
          border-right: 1px solid var(--border-primary, #454545);
          color: #aaaaaa;
          cursor: pointer;
          height: 40px;
          padding: 0 16px;
          min-width: 120px;
          max-width: 200px;
          position: relative;
          transition: all 0.2s ease;
          user-select: none;
          flex-shrink: 0;
        }
        
        /* 非アクティブタブの下線 */
        .tab::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--border-primary, #454545);
        }
        
        .tab:hover {
          background: var(--bg-hover, #383838);
          color: var(--text-primary, #cccccc);
        }
        
        .tab.active {
          background: var(--bg-secondary, #1e293b);
          color: var(--text-white, #ffffff);
          border-top: 1px solid var(--accent, #007acc);
          border-bottom: none;
          position: relative;
          z-index: 3;
          height: 41px; /* 1px 高くして下線を隠す */
          margin-bottom: -1px;
        }
        
        /* アクティブタブの下線を隠す */
        .tab.active::after {
          display: none;
        }
        
        .tab-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 13px;
          font-weight: 400;
        }
        
        .tab.active .tab-name {
          font-weight: 500;
        }
        
        .tab-close {
          margin-left: 8px;
          width: 16px;
          height: 16px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          opacity: 0.6;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .tab:hover .tab-close {
          opacity: 0.8;
        }
        
        .tab-close:hover {
          background: var(--bg-hover, #383838);
          opacity: 1;
        }
        
        .tab.active .tab-close {
          opacity: 0.8;
        }
        
        /* タブスクロールボタン */
        .tab-scroll-btn {
          background: #1a1a1a;
          border: none;
          border-bottom: 1px solid var(--border-primary, #454545);
          color: var(--text-secondary, #888888);
          cursor: pointer;
          height: 100%;
          padding: 0 8px;
          transition: all 0.2s ease;
          display: none;
          position: relative;
          z-index: 2;
        }
        
        .tab-scroll-btn:hover {
          background: var(--bg-hover, #383838);
          color: var(--text-primary, #cccccc);
        }
        
        .tab-scroll-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        
        .tab-scroll-btn.visible {
          display: block;
        }
        
        /* タブコントロール */
        .tab-controls {
          display: flex;
          align-items: center;
          background: var(--bg-secondary, #252526);
          padding: 0 8px;
          gap: 4px;
        }
        
        .new-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary, #888888);
          cursor: pointer;
          font-size: 16px;
          height: 32px;
          width: 32px;
          border-radius: 3px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .new-tab-btn:hover {
          background: var(--bg-hover, #383838);
          color: var(--text-primary, #cccccc);
        }
        
        /* コンテンツエリア */
        .tab-content-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        
        .tab-content {
          flex: 1;
          display: none;
          flex-direction: column;
          overflow: hidden;
        }
        
        .tab-content.active {
          display: flex;
        }
        
        /* スプリッター付きレイアウト */
        .split-layout {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .editor-section {
          background: var(--bg-primary, #1e1e1e);
          border-bottom: 1px solid var(--border-primary, #454545);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          /* transition: height 0.2s ease; */ /* Monaco Editor初期化を妨げるため無効化 */
          width: 100%;
          min-width: 0;
        }
        
        .editor-toolbar {
          background: var(--bg-secondary, #252526);
          border-top: none;
          border-bottom: 1px solid var(--border-primary, #454545);
          color: var(--text-primary, #cccccc);
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
          height: 40px;
          box-sizing: border-box;
          outline: none;
        }
        
        .editor-container {
          flex: 1;
          background: var(--bg-primary, #1e1e1e);
          overflow: hidden;
          position: relative;
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
        }

        /* Monaco Editor - 標準設定で干渉なし */
        
        /* スプリッター */
        .splitter {
          height: 4px;
          background: var(--bg-secondary, #252526);
          border-top: 1px solid var(--border-primary, #454545);
          border-bottom: 1px solid var(--border-primary, #454545);
          cursor: ns-resize;
          transition: background-color 0.2s ease;
          position: relative;
          z-index: 10;
          width: 100%;
          min-width: 0;
        }
        
        .splitter:hover {
          background: var(--accent, #007acc);
        }
        
        .splitter.dragging {
          background: var(--accent, #007acc);
        }
        
        .splitter::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 1px;
          background: var(--text-muted, #666666);
          border-radius: 1px;
        }
        
        /* 結果セクション */
        .results-section {
          background: var(--bg-primary, #1e1e1e);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: height 0.2s ease;
        }
        
        .results-header {
          background: var(--bg-secondary, #252526);
          border-bottom: 1px solid var(--border-primary, #454545);
          color: var(--text-primary, #cccccc);
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          height: 40px;
        }
        
        .results-content {
          flex: 1;
          background: var(--bg-primary, #1e1e1e);
          color: var(--text-primary, #cccccc);
          overflow: auto;
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        
        .results-placeholder {
          text-align: center;
          color: var(--text-muted, #666666);
          font-style: italic;
          padding: 40px 20px;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* SQL Results Grid Styles */
        .results-table-container {
          overflow: auto;
          height: 100%;
          background: #1e1e1e;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          color: #cccccc;
          border: 1px solid #404040;
        }
        
        .results-table th {
          background: #2d2d30;
          color: #ffffff;
          font-weight: 600;
          padding: 8px 12px;
          text-align: left;
          border: 1px solid #404040;
          position: sticky;
          top: 0;
          z-index: 10;
          white-space: nowrap;
        }
        
        .results-table td {
          padding: 6px 12px;
          border: 1px solid #333333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 300px;
        }
        
        .results-table tbody tr:hover {
          background: #252526;
        }
        
        .results-table tbody tr:nth-child(even) {
          background: #1a1a1a;
        }
        
        .results-table tbody tr:nth-child(even):hover {
          background: #2a2a2a;
        }
        
        /* Results states */
        .results-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100px;
          color: #cccccc;
          font-style: italic;
        }
        
        .results-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100px;
          color: #888888;
          font-style: italic;
        }
        
        .results-error {
          padding: 20px;
          color: #f44336;
          background: rgba(244, 67, 54, 0.1);
          border: 1px solid #f44336;
          border-radius: 4px;
          margin: 10px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.4;
        }
        
        .results-info {
          background: #2d2d30;
          padding: 6px 12px;
          border-top: 1px solid #404040;
          color: #cccccc;
          font-size: 12px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          position: sticky;
          bottom: 0;
        }
        
        /* ツールバーボタン */
        .toolbar-btn {
          background: var(--bg-button, #3c3c3c);
          border: 1px solid var(--border-primary, #454545);
          color: var(--text-primary, #cccccc);
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          height: 28px;
          padding: 0 8px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .toolbar-btn:hover {
          background: var(--bg-button-hover, #484848);
          border-color: var(--accent, #007acc);
        }
        
        .toolbar-btn.primary {
          background: var(--bg-button-primary, #0e639c);
          border-color: var(--bg-button-primary, #0e639c);
        }
        
        .toolbar-btn.primary:hover {
          background: var(--bg-button-primary-hover, #1177bb);
        }
        
        /* 空のタブ状態 */
        .empty-tabs {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, #666666);
          text-align: center;
          padding: 40px;
        }
        
        .empty-tabs-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        
        .empty-tabs-title {
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 8px;
        }
        
        .empty-tabs-subtitle {
          font-size: 14px;
          opacity: 0.7;
        }
        
        /* スクロール時のマウスホイール対応 */
        .tab-scroll-container::-webkit-scrollbar {
          display: none;
        }
        
        /* レスポンシブ対応 */
        @media (max-width: 768px) {
          .tab {
            min-width: 100px;
            max-width: 150px;
            padding: 0 12px;
          }
          
          .editor-toolbar,
          .results-header {
            padding: 6px 8px;
            height: 36px;
          }
          
          .toolbar-btn {
            height: 24px;
            padding: 0 6px;
            font-size: 11px;
          }
        }
        
        /* アニメーション */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .tab-content.active {
          animation: fadeIn 0.2s ease-out;
        }
      </style>
    `;
  }
}
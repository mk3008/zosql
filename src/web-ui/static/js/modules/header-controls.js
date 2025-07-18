/**
 * Header Controls Manager
 * ヘッダーのアクションボタン管理
 */

import { fileModelManager } from '../models/file-model-manager.js';

export class HeaderControls {
  constructor() {
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.setupEventListeners();
    console.log('[HeaderControls] Initialized');
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // ヘッダーのOpenボタン
    const headerOpenBtn = document.getElementById('open-file-btn-header');
    if (headerOpenBtn) {
      headerOpenBtn.addEventListener('click', () => this.handleOpenFile());
    }

    // レガシーのOpenボタン（互換性のため）
    const legacyOpenBtn = document.getElementById('open-file-btn');
    if (legacyOpenBtn) {
      legacyOpenBtn.addEventListener('click', () => this.handleOpenFile());
    }
  }

  /**
   * ファイルオープン処理
   */
  handleOpenFile() {
    // ファイル選択ダイアログを表示
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.sql';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        this.loadFile(file);
      }
      // 一時的な入力要素を削除
      document.body.removeChild(fileInput);
    });
    
    // DOM に追加してクリック
    document.body.appendChild(fileInput);
    fileInput.click();
  }

  /**
   * ファイル読み込み処理
   */
  async loadFile(file) {
    try {
      const content = await this.readFileContent(file);
      
      // SQLを整形する
      const formattedContent = await this.formatSQL(content);
      
      // 新しいタブでファイルを開く（ファイルモデル使用）
      await this.openInNewTab(file.name, formattedContent);
      
      // CTE依存関係を解析
      await this.analyzeCTEDependencies(formattedContent, file.name);
      
      // 成功メッセージ表示
      this.showToast(`ファイル "${file.name}" を開きました`, 'success');
      
      console.log(`[HeaderControls] Loaded file: ${file.name}`);
      
    } catch (error) {
      console.error('[HeaderControls] Failed to load file:', error);
      this.showToast(`ファイル読み込みエラー: ${error.message}`, 'error');
    }
  }

  /**
   * ファイル内容の読み込み
   */
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = (event) => {
        reject(new Error('ファイル読み込みに失敗しました'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * CTE依存関係を解析
   */
  async analyzeCTEDependencies(sqlContent, fileName) {
    try {
      console.log('[HeaderControls] Analyzing CTE dependencies...');
      
      const response = await fetch('/api/decompose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          sql: sqlContent,
          queryName: fileName.replace('.sql', ''),
          originalFilePath: fileName
        })
      });
      
      if (!response.ok) {
        throw new Error(`Decompose API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('[HeaderControls] CTE analysis successful:', result);
        
        // 左パネルのWorkspaceエリアに結果を表示
        this.displayCTEDependenciesInWorkspace(result.workspace, result);
        
      } else {
        console.warn('[HeaderControls] CTE analysis failed:', result.error);
        // CTE分析に失敗しても、ファイル読み込みは成功として扱う
      }
    } catch (error) {
      console.warn('[HeaderControls] Failed to analyze CTE dependencies:', error);
      // エラーが発生しても、ファイル読み込みは成功として扱う
    }
  }

  /**
   * Workspace エリアにCTE依存関係ツリーを表示
   */
  displayCTEDependenciesInWorkspace(workspace, fullResult = null) {
    try {
      // Workspace Panel Shadow コンポーネントを取得
      const workspacePanelShadow = document.getElementById('workspace-panel-shadow');
      if (!workspacePanelShadow || !workspacePanelShadow.component) {
        console.warn('[HeaderControls] Workspace panel shadow not found');
        return;
      }

      // CTE依存関係データを準備（メインクエリ内容も含める）
      const cteDependencyData = {
        privateCtes: workspace.privateCtes,
        mainQueryName: workspace.name,
        mainQuery: fullResult?.decomposedQuery || '', // メインクエリの内容を追加
        dependencyTree: this.buildCTEDependencyTree(workspace.privateCtes)
      };
      
      // Workspace Panel ShadowのupdateCTEDependenciesメソッドを呼び出し
      if (workspacePanelShadow.component.updateCTEDependencies) {
        workspacePanelShadow.component.updateCTEDependencies(cteDependencyData);
        console.log('[HeaderControls] CTE dependency tree updated in workspace shadow');
      } else {
        console.warn('[HeaderControls] Workspace panel shadow updateCTEDependencies method not found');
      }
    } catch (error) {
      console.error('[HeaderControls] Error displaying CTE dependencies:', error);
    }
  }

  /**
   * CTE依存関係ツリーを構築
   */
  buildCTEDependencyTree(privateCtes) {
    if (!privateCtes || Object.keys(privateCtes).length === 0) {
      return {};
    }

    // ルートCTE（他のCTEから参照されていないCTE）を見つける
    const allCteNames = Object.keys(privateCtes);
    const referencedCtes = new Set();
    
    // 全CTEの依存関係を調べて、参照されているCTEを収集
    Object.values(privateCtes).forEach(cte => {
      if (cte.dependencies) {
        cte.dependencies.forEach(dep => referencedCtes.add(dep));
      }
    });
    
    // 参照されていないCTEがルート
    const rootCtes = allCteNames.filter(name => !referencedCtes.has(name));
    
    // 再帰的にツリーを構築
    const buildTree = (cteName, level = 0) => {
      const cte = privateCtes[cteName];
      if (!cte) return null;
      
      const children = {};
      if (cte.dependencies && cte.dependencies.length > 0) {
        cte.dependencies.forEach(depName => {
          const childTree = buildTree(depName, level + 1);
          if (childTree) {
            children[depName] = childTree;
          }
        });
      }
      
      return {
        name: cteName,
        level: level,
        dependencies: cte.dependencies || [],
        children: children,
        query: cte.query,
        description: cte.description
      };
    };
    
    // ルートCTEからツリーを構築
    const tree = {};
    rootCtes.forEach(rootName => {
      const rootTree = buildTree(rootName);
      if (rootTree) {
        tree[rootName] = rootTree;
      }
    });
    
    console.log('[HeaderControls] Built CTE dependency tree:', tree);
    return tree;
  }

  /**
   * SQLを整形する
   */
  async formatSQL(sqlContent) {
    try {
      // サーバーのフォーマッターAPIを呼び出す（zosql.formatter.jsonを自動使用）
      const response = await fetch('/api/format-sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: sqlContent })
      });
      
      if (!response.ok) {
        throw new Error(`Format API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result.formattedSql || result.formatted || sqlContent;
      } else {
        console.warn('[HeaderControls] Format API failed:', result.error);
        return sqlContent;
      }
    } catch (error) {
      console.warn('[HeaderControls] Failed to format SQL, using original:', error);
      return sqlContent;
    }
  }

  /**
   * 新しいタブでファイルを開く（ファイルモデル対応）
   */
  async openInNewTab(fileName, content) {
    // 中央パネルのタブマネージャーを取得
    const centerPanel = document.getElementById('center-panel-shadow');
    
    if (centerPanel && centerPanel.createOrReuseTabForFile) {
      // ファイルモデルを使用してタブを作成または再利用
      const tabId = centerPanel.createOrReuseTabForFile(fileName, content, {
        type: 'sql'
      });
      
      console.log(`[HeaderControls] Created/reused tab for file: ${fileName} (${tabId})`);
      
    } else {
      console.warn('[HeaderControls] Center panel not available to load file');
    }
  }

  /**
   * トーストメッセージ表示
   */
  showToast(message, type = 'info') {
    // 既存のトーストを削除
    const existingToast = document.querySelector('.header-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'header-toast';
    toast.textContent = message;
    
    const colors = {
      success: { bg: '#10b981', border: '#059669' },
      info: { bg: '#3b82f6', border: '#2563eb' },
      error: { bg: '#ef4444', border: '#dc2626' }
    };
    
    const color = colors[type] || colors.info;
    
    toast.style.cssText = `
      position: fixed;
      top: 70px;
      right: 10px;
      z-index: 10000;
      padding: 12px 16px;
      background: ${color.bg};
      color: white;
      border: 2px solid ${color.border};
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease-out;
      max-width: 300px;
    `;

    document.body.appendChild(toast);

    // 3秒後に自動削除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, 3000);
  }
}

// 自動初期化は削除 - app.js で明示的に初期化
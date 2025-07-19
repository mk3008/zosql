/**
 * Center Panel Monaco Editor Management Module
 * 中央パネルのMonaco Editor機能を分離
 * 
 * 責務:
 * - Monaco Editorの初期化と管理
 * - Shadow DOMとの位置同期
 * - 外部DOMコンテナの管理
 * - IME対応とイベント処理
 * 
 * 重要な設計判断: Monaco EditorはShadow DOMとの互換性問題により、
 * 意図的にShadow DOMの外（通常DOM）に配置しています。
 */

export class CenterPanelMonacoManager {
  constructor(shadowRoot, callbacks = new Map()) {
    this.shadowRoot = shadowRoot;
    this.callbacks = callbacks;
    this.monacoEditors = new Map(); // tabId -> Monaco Editor instance
    this.externalContainers = new Map(); // tabId -> external DOM container
  }

  /**
   * Monaco Editorのセットアップ
   */
  setupMonacoEditor(tabId, component) {
    console.log(`[MonacoManager] setupMonacoEditor called for tab: ${tabId}`);
    
    // Shadow DOM内のエディターコンテナを取得
    const editorContainer = this.shadowRoot.getElementById(`editor-${tabId}`);
    if (!editorContainer) {
      console.warn(`[MonacoManager] Editor container not found for tab: ${tabId}`);
      return;
    }

    // 既に初期化済みかチェック
    if (editorContainer.dataset.monacoInitialized) {
      console.log(`[MonacoManager] Monaco Editor already initialized for tab: ${tabId}`);
      return;
    }

    // 初期化中フラグを設定
    editorContainer.dataset.monacoInitializing = 'true';
    console.log('[MonacoManager] Setting up Monaco Editor for tab:', tabId);

    // Monaco Editorのロードを待つ
    this.waitForMonaco().then(() => {
      this.createMonacoEditor(tabId, component, editorContainer);
    }).catch((error) => {
      console.error('[MonacoManager] Monaco Editor load timeout:', error);
      editorContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #f44336; background: #2d2d2d; border-radius: 4px;">
          <h3>Monaco Editor Load Failed</h3>
          <p>${error.message}</p>
          <p>Please check the Monaco Editor setup in your HTML.</p>
          <button onclick="location.reload()" style="padding: 8px 16px; margin-top: 10px; background: #007acc; color: white; border: none; border-radius: 3px; cursor: pointer;">
            Reload Page
          </button>
        </div>
      `;
      delete editorContainer.dataset.monacoInitializing;
    });
  }

  /**
   * Monaco Editorの実際の作成処理
   */
  createMonacoEditor(tabId, component, editorContainer) {
    try {
      /**
       * 重要な設計判断: Monaco EditorをShadow DOMの外で作成
       * 
       * 理由:
       *    - Shadow DOM内でMonaco Editorを作成すると、IMEの入力エリアが正しく配置されない
       *    - 特に日本語入力時に、入力候補ウィンドウが見えない位置に表示される
       *    - キーボードイベントやフォーカス管理でも問題が発生する
       *    - Monaco Editorは内部でdocument.activeElementやグローバルイベントを使用
       *      するため、Shadow DOMの境界で正しく動作しない
       * 
       * 解決策:
       * - Monaco Editorを通常のDOM（document.body）に作成
       * - Shadow DOM内のコンテナと位置・サイズを同期させる
       * - これにより、IME機能とイベント処理の問題を回避
       */

      // Monaco EditorをShadow DOMの外で作成
      const externalContainer = document.createElement('div');
      externalContainer.id = `monaco-external-${tabId}`;
      externalContainer.style.position = 'absolute';
      externalContainer.style.top = '0';
      externalContainer.style.left = '0';
      externalContainer.style.zIndex = '1';
      
      // 初期表示状態を設定（Monaco Editorの正常な初期化のため、常にblockで作成）
      const isActiveTab = (tabId === component.tabManager.activeTabId);
      externalContainer.style.display = 'block';
      
      // 非アクティブタブは画面外に配置（display:noneではなく位置で制御）
      if (!isActiveTab) {
        externalContainer.style.top = '-10000px';
        externalContainer.style.left = '-10000px';
      }
      
      // デバッグ用の識別子
      externalContainer.setAttribute('data-tab-id', tabId);
      externalContainer.setAttribute('data-debug-info', 'Monaco Editor (External DOM)');
      
      // 外部コンテナをShadow DOM内のコンテナに位置合わせ
      document.body.appendChild(externalContainer);
      
      // ファイルモデルからコンテンツを取得
      const tab = component.tabManager.tabs.get(tabId);
      const fileModel = component.getFileModelForTab(tabId);
      const initialContent = fileModel ? fileModel.getContent() : '-- Start writing your SQL query here\nSELECT * FROM users\nLIMIT 10;';
      
      const editor = window.monaco.editor.create(externalContainer, {
        value: initialContent,
        language: 'sql',
        theme: 'vs-dark',
        automaticLayout: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        glyphMargin: false,
        folding: true,
        lineDecorationsWidth: 10,
        renderLineHighlight: 'line',
        selectionHighlight: false,
        wordWrap: 'off',
        contextmenu: true,
        mouseWheelZoom: true
      });

      // 位置同期機能のセットアップ
      this.setupPositionSync(tabId, component, editorContainer, externalContainer, editor);

      // エディターインスタンスを保存
      editorContainer.monacoEditor = editor;
      editorContainer.dataset.monacoInitialized = 'true';
      this.monacoEditors.set(tabId, editor);
      this.externalContainers.set(tabId, externalContainer);
      delete editorContainer.dataset.monacoInitializing;

      // ファイルモデルとの同期設定
      if (fileModel) {
        // エディターの変更をファイルモデルに反映
        editor.onDidChangeModelContent((e) => {
          const content = editor.getValue();
          component.updateTabContent(tabId, content, 'monaco');
        });
      }

      console.log('[MonacoManager] Monaco Editor initialized successfully for tab:', tabId);
      
      // 初期化完了コールバック
      this.triggerCallback('monaco-editor-created', { tabId, editor, fileModel });

    } catch (error) {
      console.error('[MonacoManager] Monaco Editor creation failed:', error);
      editorContainer.innerHTML = `<div style="padding: 20px; color: #f44336;">Monaco Editor initialization failed: ${error.message}</div>`;
      delete editorContainer.dataset.monacoInitializing;
    }
  }

  /**
   * 位置同期機能のセットアップ
   */
  setupPositionSync(tabId, component, editorContainer, externalContainer, editor) {
    const syncPosition = () => {
      console.log('[MonacoManager] syncPosition called for tab', tabId);
      
      const rect = editorContainer.getBoundingClientRect();
      console.log('[MonacoManager] Shadow DOM container rect for tab-' + tabId + ':', rect.left, rect.top, rect.width + 'x' + rect.height);
      console.log('[MonacoManager] Editor container display:', editorContainer.style.display);
      console.log('[MonacoManager] Editor container parent:', editorContainer.parentElement?.className);
      
      if (rect.width > 0 && rect.height > 0) {
        externalContainer.style.left = rect.left + 'px';
        externalContainer.style.top = rect.top + 'px';
        externalContainer.style.width = rect.width + 'px';
        externalContainer.style.height = rect.height + 'px';
        
        // Monaco Editorのレイアウトを更新
        if (editor) {
          editor.layout({
            width: rect.width,
            height: rect.height
          });
        }
      }
    };
    
    // 初期位置設定
    setTimeout(syncPosition, 100);
    
    // リサイズイベントで位置同期
    window.addEventListener('resize', syncPosition);
    
    // サイドバー開閉イベントで位置同期
    document.addEventListener('sidebar-toggled', syncPosition);
    
    // Shadow DOM要素の変更を監視
    const observer = new MutationObserver(syncPosition);
    observer.observe(editorContainer, { attributes: true, childList: true, subtree: true });
    
    // スプリッターのドラッグイベントを監視
    const splitter = this.shadowRoot.querySelector('.splitter');
    if (splitter) {
      splitter.addEventListener('mousedown', () => {
        const mouseMoveHandler = () => syncPosition();
        const mouseUpHandler = () => {
          document.removeEventListener('mousemove', mouseMoveHandler);
          document.removeEventListener('mouseup', mouseUpHandler);
        };
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
      });
    }
    
    // 位置同期インターバル（頻度を下げ、アクティブタブのみ同期）
    const syncInterval = setInterval(() => {
      // アクティブタブの場合のみ同期実行
      if (tabId === component.tabManager.activeTabId) {
        const rect = editorContainer.getBoundingClientRect();
        // サイズが0の場合は同期をスキップ（無限ループ防止）
        if (rect.width > 0 && rect.height > 0) {
          syncPosition();
        }
      }
    }, 200);
    
    // クリーンアップ情報を保存
    editorContainer.externalContainer = externalContainer;
    editorContainer.positionSync = syncPosition;
    editorContainer.resizeObserver = observer;
    editorContainer.syncInterval = syncInterval;
    
    console.log('[MonacoManager] Position sync setup completed for tab:', tabId);
  }

  /**
   * Monaco Editorのロード待機
   */
  waitForMonaco(timeout = 15000) {
    return new Promise((resolve, reject) => {
      // 既にロード済みかチェック
      if (typeof window.monaco !== 'undefined' && window.monaco.editor) {
        console.log('[MonacoManager] Monaco Editor already available');
        resolve();
        return;
      }

      // monacoLoadedフラグをチェック
      if (window.monacoLoaded) {
        console.log('[MonacoManager] Monaco Editor loaded flag detected');
        resolve();
        return;
      }

      // イベントリスナーでロードを待つ
      const onMonacoLoaded = () => {
        console.log('[MonacoManager] Monaco Editor loaded via event');
        window.removeEventListener('monaco-loaded', onMonacoLoaded);
        resolve();
      };

      window.addEventListener('monaco-loaded', onMonacoLoaded);

      // タイムアウト設定
      setTimeout(() => {
        window.removeEventListener('monaco-loaded', onMonacoLoaded);
        reject(new Error('Monaco Editor load timeout after ' + timeout + 'ms'));
      }, timeout);
    });
  }

  /**
   * Monaco Editorインスタンスの取得
   */
  getMonacoEditor(tabId) {
    return this.monacoEditors.get(tabId);
  }

  /**
   * Monaco Editorインスタンスの設定
   */
  setMonacoEditor(tabId, editor) {
    this.monacoEditors.set(tabId, editor);
  }

  /**
   * タブ削除時のクリーンアップ
   */
  cleanupMonacoEditor(tabId) {
    // Monaco Editorのクリーンアップ
    const editor = this.monacoEditors.get(tabId);
    if (editor) {
      editor.dispose();
      this.monacoEditors.delete(tabId);
      console.log(`[MonacoManager] Disposed Monaco Editor for tab ${tabId}`);
    }

    // 外部コンテナのクリーンアップ
    const externalContainer = this.externalContainers.get(tabId);
    if (externalContainer) {
      // インターバルとオブザーバーのクリーンアップ
      const editorContainer = this.shadowRoot.getElementById(`editor-${tabId}`);
      if (editorContainer) {
        if (editorContainer.syncInterval) {
          clearInterval(editorContainer.syncInterval);
        }
        if (editorContainer.resizeObserver) {
          editorContainer.resizeObserver.disconnect();
        }
      }

      externalContainer.remove();
      this.externalContainers.delete(tabId);
      console.log(`[MonacoManager] Removed external container for tab ${tabId}`);
    }
  }

  /**
   * アクティブタブのMonaco Editorの同期を強制実行
   */
  syncActiveMonacoEditor(activeTabId) {
    if (!activeTabId) return;

    console.log(`[MonacoManager] Syncing Monaco Editor for active tab: ${activeTabId}`);
    
    // 外部コンテナの確認
    const externalContainer = this.externalContainers.get(activeTabId);
    if (!externalContainer) {
      console.warn(`[MonacoManager] External container not found for active tab: ${activeTabId}`);
      return;
    }

    // Monaco Editorインスタンスの確認
    const editor = this.monacoEditors.get(activeTabId);
    if (!editor) {
      console.warn(`[MonacoManager] Monaco Editor instance not found for active tab: ${activeTabId}`);
      return;
    }

    // 外部コンテナが非表示になっている場合は表示
    if (externalContainer.style.display === 'none') {
      console.log(`[MonacoManager] Making external container visible for tab: ${activeTabId}`);
      externalContainer.style.display = 'block';
    }

    // Shadow DOM内のエディターコンテナを探す
    const editorContainer = this.shadowRoot.getElementById(`editor-${activeTabId}`);
    if (editorContainer && editorContainer.positionSync) {
      console.log(`[MonacoManager] Executing position sync for tab: ${activeTabId}`);
      editorContainer.positionSync();
    }

    // Monaco Editorのレイアウトを更新
    setTimeout(() => {
      if (editor) {
        editor.layout();
        console.log(`[MonacoManager] Monaco Editor layout updated for tab: ${activeTabId}`);
      }
    }, 50);
  }

  /**
   * 外部Monaco Editorコンテナの表示制御
   */
  updateExternalContainerVisibility(activeTabId, allTabIds) {
    // 外部Monaco Editorコンテナの最小限制御
    // タブが存在しない場合のみ全てのコンテナを非表示
    if (allTabIds.length === 0) {
      const externalContainers = document.querySelectorAll('[id^="monaco-external-"]');
      externalContainers.forEach(container => {
        container.style.display = 'none';
      });
    } else {
      // タブが存在する場合は、アクティブコンテナのみ表示（位置同期に委ねる）
      const externalContainers = document.querySelectorAll('[id^="monaco-external-"]');
      externalContainers.forEach(container => {
        const tabId = container.id.replace('monaco-external-', '');
        if (tabId === activeTabId) {
          container.style.display = 'block';
          // 位置同期は既存のsyncPositionメカニズムに委ねる
        } else if (allTabIds.includes(tabId)) {
          // 存在するタブの非アクティブコンテナは非表示
          container.style.display = 'none';
        }
        // 削除されたタブのコンテナはcleanupで削除済み
      });
    }
  }

  /**
   * デバッグ用メソッド
   */
  debugMonacoEditor(activeTabId) {
    console.log('[MonacoManager] Debug Monaco Editor:');
    console.log('  - Active tab:', activeTabId);
    console.log('  - Monaco editors count:', this.monacoEditors.size);
    console.log('  - External containers count:', this.externalContainers.size);
    console.log('  - Monaco available:', typeof monaco !== 'undefined');
    
    if (activeTabId) {
      const editorContainer = this.shadowRoot.getElementById(`editor-${activeTabId}`);
      const externalContainer = this.externalContainers.get(activeTabId);
      const editor = this.monacoEditors.get(activeTabId);
      
      console.log('  - Editor container:', !!editorContainer);
      console.log('  - Monaco initialized:', editorContainer?.dataset.monacoInitialized);
      console.log('  - Monaco instance:', !!editor);
      console.log('  - External container:', !!externalContainer);
    }
  }

  /**
   * コールバック実行
   */
  triggerCallback(event, data = null) {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback(data);
    }
  }

  /**
   * 破棄
   */
  destroy() {
    // 全てのMonaco Editorインスタンスを破棄
    this.monacoEditors.forEach((editor, tabId) => {
      this.cleanupMonacoEditor(tabId);
    });
    
    this.monacoEditors.clear();
    this.externalContainers.clear();
    
    console.log('[MonacoManager] Destroyed');
  }
}
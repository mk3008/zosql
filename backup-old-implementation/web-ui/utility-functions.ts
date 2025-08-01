export function getUtilityFunctions(): string {
  return `
    // Toggle collapsible sections
    function toggleSection(sectionId) {
      const section = document.getElementById(sectionId);
      const iconId = sectionId.replace('-section', '-icon');
      const icon = document.getElementById(iconId);
      
      if (section.style.display === 'none') {
        section.style.display = 'block';
        icon.textContent = '▼';
      } else {
        section.style.display = 'none';
        icon.textContent = '▶';
      }
    }
    
    // Make toggleSection globally accessible
    window.toggleSection = toggleSection;
    
    // ====================================================================
    // IntelliSense Context Detection Functions
    // ====================================================================
    // これらの関数はSQL文のカーソル位置に基づいて適切なコンテキストを判定し、
    // 適切な補完候補のみを表示するために使用される
    
    /**
     * SELECT句のコンテキストを検出する
     * SELECT ... FROM の間にカーソルがある場合にtrueを返す
     * この場合は補完候補を表示せず、クラッターを避ける
     */
    function checkSelectClauseContext(fullText, position) {
      try {
        // Get text up to current position
        const lines = fullText.split('\\n');
        let textUpToCursor = '';
        
        for (let i = 0; i < position.lineNumber - 1; i++) {
          textUpToCursor += lines[i] + '\\n';
        }
        
        if (lines[position.lineNumber - 1]) {
          textUpToCursor += lines[position.lineNumber - 1].substring(0, position.column - 1);
        }
        
        // Remove comments and string literals for better parsing
        const cleanedText = textUpToCursor
          .replace(/--.*$/gm, '') // Remove line comments
          .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '') // Remove block comments
          .replace(/'[^']*'/g, "''") // Remove string literals
          .replace(/"[^"]*"/g, '""'); // Remove quoted identifiers
        
        // Check if we're in SELECT clause context (between SELECT and FROM)
        // SELECT句が存在し、まだFROM句に到達していない場合
        const selectPattern = /\\bSELECT\\s+[^;]*$/i;
        const hasFrom = /\\bFROM\\b/i.test(cleanedText);
        
        const isSelectContext = selectPattern.test(cleanedText) && !hasFrom;
        
        return isSelectContext;
      } catch (error) {
        console.error('Error checking SELECT clause context:', error);
        return false;
      }
    }
    
    /**
     * テーブル名直後のコンテキストを検出する
     * "FROM table_name " や "JOIN table_name " の直後にカーソルがある場合にtrueを返す
     * この場合はASキーワードのみを提案する
     */
    function checkPostTableContext(fullText, position) {
      try {
        // Get text up to current position
        const lines = fullText.split('\\n');
        let textUpToCursor = '';
        
        for (let i = 0; i < position.lineNumber - 1; i++) {
          textUpToCursor += lines[i] + '\\n';
        }
        
        if (lines[position.lineNumber - 1]) {
          textUpToCursor += lines[position.lineNumber - 1].substring(0, position.column - 1);
        }
        
        // Remove comments and string literals for better parsing
        const cleanedText = textUpToCursor
          .replace(/--.*$/gm, '') // Remove line comments
          .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '') // Remove block comments
          .replace(/'[^']*'/g, "''") // Remove string literals
          .replace(/"[^"]*"/g, '""'); // Remove quoted identifiers
        
        // テーブル名の直後（スペース）にカーソルがある場合を検出
        // パターン1: FROM table_name の直後
        const postTablePattern = /\\bFROM\\s+\\w+\\s+$/i;
        // パターン2: JOIN table_name の直後  
        const postJoinTablePattern = /\\b(?:INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+JOIN|JOIN)\\s+\\w+\\s+$/i;
        
        const isPostTableContext = postTablePattern.test(cleanedText) || postJoinTablePattern.test(cleanedText);
        
        return isPostTableContext;
      } catch (error) {
        console.error('Error checking post-table context:', error);
        return false;
      }
    }
    
    /**
     * AS キーワード直後のコンテキストを検出する
     * "FROM table_name AS " の直後にカーソルがある場合にtrueを返す
     * この場合はテーブル名に基づいた推奨エイリアス名を提案する
     */
    function checkPostAliasContext(fullText, position) {
      try {
        // Get text up to current position
        const lines = fullText.split('\\n');
        let textUpToCursor = '';
        
        for (let i = 0; i < position.lineNumber - 1; i++) {
          textUpToCursor += lines[i] + '\\n';
        }
        
        if (lines[position.lineNumber - 1]) {
          textUpToCursor += lines[position.lineNumber - 1].substring(0, position.column - 1);
        }
        
        // Remove comments and string literals for better parsing
        const cleanedText = textUpToCursor
          .replace(/--.*$/gm, '') // Remove line comments
          .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '') // Remove block comments
          .replace(/'[^']*'/g, "''") // Remove string literals
          .replace(/"[^"]*"/g, '""'); // Remove quoted identifiers
        
        // AS キーワードの直後を検出
        // パターン1: FROM table_name AS の直後
        const postAliasPattern = /\\bFROM\\s+(\\w+)\\s+AS\\s+$/i;
        // パターン2: JOIN table_name AS の直後
        const postJoinAliasPattern = /\\b(?:INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+JOIN|JOIN)\\s+(\\w+)\\s+AS\\s+$/i;
        
        const fromMatch = postAliasPattern.exec(cleanedText);
        const joinMatch = postJoinAliasPattern.exec(cleanedText);
        
        if (fromMatch || joinMatch) {
          const tableName = fromMatch ? fromMatch[1] : joinMatch[1];
          return { isPostAliasContext: true, tableName: tableName };
        }
        
        return { isPostAliasContext: false, tableName: null };
      } catch (error) {
        console.error('Error checking post-alias context:', error);
        return { isPostAliasContext: false, tableName: null };
      }
    }
    
    /**
     * エイリアス完了後のコンテキストを検出する
     * "FROM table_name AS alias " の直後にカーソルがある場合にtrueを返す
     * この場合は候補を表示しない（無意味な提案を避ける）
     */
    function checkPostAliasCompletedContext(fullText, position) {
      try {
        // Get text up to current position
        const lines = fullText.split('\\n');
        let textUpToCursor = '';
        
        for (let i = 0; i < position.lineNumber - 1; i++) {
          textUpToCursor += lines[i] + '\\n';
        }
        
        if (lines[position.lineNumber - 1]) {
          textUpToCursor += lines[position.lineNumber - 1].substring(0, position.column - 1);
        }
        
        // Remove comments and string literals for better parsing
        const cleanedText = textUpToCursor
          .replace(/--.*$/gm, '') // Remove line comments
          .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '') // Remove block comments
          .replace(/'[^']*'/g, "''") // Remove string literals
          .replace(/"[^"]*"/g, '""'); // Remove quoted identifiers
        
        // エイリアス完了後のパターンを検出
        // パターン1: FROM table_name AS alias の直後
        const postAliasCompletedPattern = /\\bFROM\\s+\\w+\\s+AS\\s+\\w+\\s+$/i;
        // パターン2: JOIN table_name AS alias の直後
        const postJoinAliasCompletedPattern = /\\b(?:INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+JOIN|JOIN)\\s+\\w+\\s+AS\\s+\\w+\\s+$/i;
        
        const isPostAliasCompletedContext = postAliasCompletedPattern.test(cleanedText) || postJoinAliasCompletedPattern.test(cleanedText);
        
        return isPostAliasCompletedContext;
      } catch (error) {
        console.error('Error checking post-alias completed context:', error);
        return false;
      }
    }
    
    /**
     * テーブル名から推奨エイリアス名を生成する
     * 例: users -> u, active_users -> au, user_stats -> us
     */
    function generateTableAlias(tableName) {
      if (!tableName) return '';
      
      // アンダースコアで分割して各単語の最初の文字を取得
      const parts = tableName.toLowerCase().split('_');
      if (parts.length > 1) {
        // 複数単語の場合: user_stats -> us, active_users -> au
        return parts.map(part => part.charAt(0)).join('');
      } else {
        // 単一単語の場合: users -> u, orders -> o
        return tableName.charAt(0).toLowerCase();
      }
    }
    
    /**
     * FROM句/JOIN句のコンテキストを検出する
     * "FROM " や "JOIN " の直後でテーブル名を入力中の場合にtrueを返す
     * この場合はテーブル名とプライベートリソースを提案する
     */
    function checkFromClauseContext(fullText, position) {
      try {
        // Get text up to current position
        const lines = fullText.split('\\n');
        let textUpToCursor = '';
        
        for (let i = 0; i < position.lineNumber - 1; i++) {
          textUpToCursor += lines[i] + '\\n';
        }
        
        if (lines[position.lineNumber - 1]) {
          textUpToCursor += lines[position.lineNumber - 1].substring(0, position.column - 1);
        }
        
        // Remove comments and string literals for better parsing
        const cleanedText = textUpToCursor
          .replace(/--.*$/gm, '') // Remove line comments
          .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '') // Remove block comments
          .replace(/'[^']*'/g, "''") // Remove string literals
          .replace(/"[^"]*"/g, '""'); // Remove quoted identifiers
        
        console.log('FROM context check - cleanedText:', JSON.stringify(cleanedText));
        
        // FROM句/JOIN句のコンテキストパターンを検出
        // パターン1: FROM の直後（スペースあり・なし）
        const fromPattern = /\\bFROM\\s*$/i;
        const joinPattern = /\\b(?:INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+JOIN|JOIN)\\s*$/i;
        
        // パターン2: FROM/JOIN の後に不完全なテーブル名がある場合
        const fromTablePattern = /\\bFROM\\s+\\w*$/i;
        const joinTablePattern = /\\b(?:INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+JOIN|JOIN)\\s+\\w*$/i;
        
        const isFromContext = fromPattern.test(cleanedText) || 
                            joinPattern.test(cleanedText) ||
                            fromTablePattern.test(cleanedText) ||
                            joinTablePattern.test(cleanedText);
        
        console.log('FROM patterns test:', {
          fromPattern: fromPattern.test(cleanedText),
          joinPattern: joinPattern.test(cleanedText),
          fromTablePattern: fromTablePattern.test(cleanedText),
          joinTablePattern: joinTablePattern.test(cleanedText),
          result: isFromContext
        });
        
        return isFromContext;
      } catch (error) {
        console.error('Error checking FROM clause context:', error);
        return false;
      }
    }
    
    // ====================================================================
    // Utility Functions for IntelliSense
    // ====================================================================
    
    /**
     * IntelliSenseのデバッグログを送信する
     * サーバーサイドのログファイルに記録され、後で分析可能
     */
    function sendIntelliSenseDebugLog(phase, data, error = null) {
      try {
        fetch('/api/intellisense-debug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phase: phase,
            data: data,
            error: error
          })
        }).catch(err => {
          console.error('Failed to send IntelliSense debug log:', err);
        });
      } catch (err) {
        console.error('Error in sendIntelliSenseDebugLog:', err);
      }
    }
    
    /**
     * テキストからエイリアス情報を抽出する
     * "u.id" や "u." のような形式からテーブルエイリアスとカラム名を分離
     * intellisense-utils.tsの実装と一致させる必要がある
     */
    function extractAliasFromText(textBeforeCursor, charBeforeCursor) {
      let periodMatch = null;

      // 1. ドット入力直後のケース
      if (charBeforeCursor === '.') {
        // Check if textBeforeCursor already includes the dot
        if (textBeforeCursor.endsWith('.')) {
          // Case: textBeforeCursor = "where u.", charBeforeCursor = "."
          const aliasMatch = textBeforeCursor.match(/([a-zA-Z][a-zA-Z0-9_]*)\\.$/);
          if (aliasMatch) {
            periodMatch = [aliasMatch[0], aliasMatch[1], ''];
          }
        } else {
          // Case: textBeforeCursor = "SELECT o", charBeforeCursor = "."
          const aliasMatch = textBeforeCursor.match(/([a-zA-Z][a-zA-Z0-9_]*)$/);
          if (aliasMatch) {
            periodMatch = [aliasMatch[0] + '.', aliasMatch[1], ''];
          }
        }
      } 
      // 2. 既にドットが含まれているケース
      else {
        const match = textBeforeCursor.match(/([a-zA-Z][a-zA-Z0-9_]*)\\.([a-zA-Z0-9_]*)$/);
        if (match) {
          periodMatch = [match[0], match[1], match[2]];
        }
      }
      
      return periodMatch;
    }
  `;
}
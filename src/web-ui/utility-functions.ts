export function getUtilityFunctions(): string {
  return `
    // Import utility functions for IntelliSense
    // Note: In production, these would be imported from the utils module
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
        
        // Check if we're in a FROM clause context - more flexible patterns
        const fromPattern = /\\bFROM\\s*$/i;
        const joinPattern = /\\b(?:INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+JOIN|JOIN)\\s*$/i;
        
        // Also check for incomplete table names after FROM
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
    
    // IntelliSense debug logging function
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
    
    // Utility function for extracting alias from text (matches intellisense-utils.ts)
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
export function getWithClauseHandler(): string {
  return `
    // WITH clause handling for Private CTE editing
    let withClauseHandler = {
      hiddenRanges: [],
      originalContent: '',
      
      // Extract the target CTE content from a full WITH query
      extractTargetCte: function(content, targetCteName) {
        const lines = content.split('\\n');
        let targetCteStart = -1;
        let targetCteEnd = -1;
        let braceCount = 0;
        let inTargetCte = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Look for target CTE definition
          if (line.includes(targetCteName + ' AS (')) {
            targetCteStart = i;
            inTargetCte = true;
            braceCount = 1;
            continue;
          }
          
          if (inTargetCte) {
            // Count opening and closing parentheses
            for (const char of line) {
              if (char === '(') braceCount++;
              if (char === ')') braceCount--;
            }
            
            // When braces balance, we've found the end of this CTE
            if (braceCount === 0) {
              targetCteEnd = i;
              break;
            }
          }
        }
        
        if (targetCteStart >= 0 && targetCteEnd >= 0) {
          // Extract just the SELECT part (skip "ctename AS (")
          const cteLines = lines.slice(targetCteStart + 1, targetCteEnd);
          return cteLines.join('\\n').trim();
        }
        
        return content; // Fallback: return original content
      },
      
      // Identify WITH clause ranges that should be hidden
      findWithClauseRanges: function(content, targetCteName) {
        const lines = content.split('\\n');
        const ranges = [];
        let currentRange = null;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Start of WITH clause
          if (line.startsWith('WITH ') && !currentRange) {
            currentRange = { start: i + 1, end: i + 1 };
          }
          
          // Target CTE found - end the hidden range
          if (currentRange && line.includes(targetCteName + ' AS (')) {
            currentRange.end = i;
            if (currentRange.start < currentRange.end) {
              ranges.push(currentRange);
            }
            currentRange = null;
            
            // Skip the target CTE definition line and start a new range after it
            let braceCount = 1;
            let j = i + 1;
            
            // Find the end of target CTE
            while (j < lines.length && braceCount > 0) {
              for (const char of lines[j]) {
                if (char === '(') braceCount++;
                if (char === ')') braceCount--;
              }
              if (braceCount > 0) j++;
            }
            
            // Start new hidden range after target CTE
            if (j + 1 < lines.length) {
              currentRange = { start: j + 1, end: lines.length };
            }
            break;
          }
        }
        
        // Close any remaining range
        if (currentRange) {
          currentRange.end = lines.length;
          ranges.push(currentRange);
        }
        
        return ranges;
      },
      
      // Apply hidden ranges to Monaco Editor
      applyHiddenRanges: function(editor, ranges) {
        this.hiddenRanges = ranges;
        
        ranges.forEach(range => {
          // Create decorations to gray out hidden content
          const decorations = editor.deltaDecorations([], [{
            range: new monaco.Range(range.start, 1, range.end, 1),
            options: {
              isWholeLine: true,
              className: 'hidden-with-clause',
              linesDecorationsClassName: 'hidden-with-clause-line'
            }
          }]);
          
          // Store decoration IDs for cleanup
          range.decorationIds = decorations;
        });
      },
      
      // Setup WITH clause hiding for Private CTE editing
      setupWithClauseHiding: function(editor, content, cteName) {
        if (!cteName || !content.includes('WITH ')) {
          return; // Not a Private CTE or no WITH clause
        }
        
        this.originalContent = content;
        const ranges = this.findWithClauseRanges(content, cteName);
        this.applyHiddenRanges(editor, ranges);
        
        // Extract and display only the target CTE content
        const targetCteContent = this.extractTargetCte(content, cteName);
        if (targetCteContent && targetCteContent !== content) {
          editor.setValue(targetCteContent);
        }
      },
      
      // Restore full content when saving
      restoreFullContent: function(editor, editedContent, cteName) {
        if (!this.originalContent || !cteName) {
          return editedContent;
        }
        
        // Reconstruct full WITH clause with edited target CTE
        const lines = this.originalContent.split('\\n');
        let result = [];
        let targetCteStart = -1;
        let targetCteEnd = -1;
        let braceCount = 0;
        let inTargetCte = false;
        
        // Find target CTE boundaries
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (line.includes(cteName + ' AS (')) {
            targetCteStart = i;
            inTargetCte = true;
            braceCount = 1;
            result.push(lines[i]); // Keep the CTE definition line
            continue;
          }
          
          if (inTargetCte) {
            for (const char of line) {
              if (char === '(') braceCount++;
              if (char === ')') braceCount--;
            }
            
            if (braceCount === 0) {
              targetCteEnd = i;
              // Insert edited content
              const editedLines = editedContent.split('\\n');
              editedLines.forEach(editedLine => {
                result.push(editedLine);
              });
              result.push(lines[i]); // Keep the closing parenthesis
              inTargetCte = false;
            }
          } else {
            result.push(lines[i]);
          }
        }
        
        return result.join('\\n');
      }
    };
    
    // CSS for hidden WITH clause styling
    const withClauseStyles = \`
      .hidden-with-clause {
        opacity: 0.3 !important;
        background-color: #2d2d30 !important;
        pointer-events: none !important;
      }
      
      .hidden-with-clause-line {
        background-color: #404040 !important;
      }
      
      .monaco-editor .hidden-with-clause .mtk1 {
        color: #666 !important;
      }
    \`;
    
    // Inject styles
    if (!document.getElementById('with-clause-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'with-clause-styles';
      styleElement.textContent = withClauseStyles;
      document.head.appendChild(styleElement);
    }
  `;
}
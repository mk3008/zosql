export function getHelperFunctions(): string {
  return `
    // Debug and helper functions
    async function testParseCurrentSQL() {
      if (!editor) {
        alert('Editor not available');
        return;
      }
      
      const sql = editor.getValue();
      
      try {
        const response = await fetch('/api/parse-sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql: sql })
        });
        
        const data = await response.json();
        
        let message = \`SQL Parse Test:\\n\\n\`;
        message += \`SQL: \${sql}\\n\\n\`;
        message += \`Success: \${data.success}\\n\`;
        
        if (data.success) {
          message += \`Tables found: \${data.tables?.length || 0}\\n\`;
          if (data.tables && data.tables.length > 0) {
            data.tables.forEach((table, index) => {
              message += \`  \${index + 1}. \${table.name}\${table.alias ? \` (as \${table.alias})\` : ''}\${table.type ? \` [type: \${table.type}]\` : ''}\\n\`;
              if (table.columns && table.columns.length > 0) {
                message += \`     Columns: \${table.columns.join(', ')}\\n\`;
              }
            });
          }
          message += \`CTEs found: \${data.cteNames?.length || 0}\\n\`;
          if (data.cteNames && data.cteNames.length > 0) {
            message += \`  CTEs: \${data.cteNames.join(', ')}\\n\`;
          }
        } else {
          message += \`Error: \${data.error}\\n\`;
        }
        
        alert(message);
      } catch (error) {
        alert('Parse test failed: ' + error.message);
      }
    }
    
    async function testAliasSearch() {
      if (!editor) {
        alert('Editor not available');
        return;
      }
      
      const sql = editor.getValue();
      const position = editor.getPosition();
      
      if (!position) {
        alert('Cannot get cursor position');
        return;
      }
      
      const textBeforeCursor = editor.getModel().getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      });
      
      let message = \`Alias Search Test:\\n\\n\`;
      message += \`Current SQL: \${sql}\\n\`;
      message += \`Cursor position: Line \${position.lineNumber}, Column \${position.column}\\n\`;
      message += \`Text before cursor: "\${textBeforeCursor}"\\n\`;
      
      // Test different patterns
      const patterns = ['.', '_', 'a', 'r'];
      patterns.forEach(char => {
        const result = extractAliasFromText(textBeforeCursor, char);
        message += \`Char '\${char}': \${result ? JSON.stringify(result) : 'null'}\\n\`;
      });
      
      alert(message);
    }
    
    // Helper function to get columns for table (matches intellisense-utils.ts)
    function getColumnsForTable(tableName, alias, parseResult, schemaData) {
      let columns = [];
      
      // Check if it's a CTE or subquery table with columns in parse result
      if (parseResult) {
        const tableObject = findTableObjectByAlias(parseResult, alias);
        if (tableObject && (tableObject.type === 'cte' || tableObject.type === 'subquery') && tableObject.columns && tableObject.columns.length > 0) {
          columns = tableObject.columns;
        } else if (schemaData.columns && schemaData.columns[tableName]) {
          columns = schemaData.columns[tableName];
        } else {
          // Check if it's a private resource
          const privateResource = schemaData.privateResources && schemaData.privateResources[tableName];
          if (privateResource && privateResource.columns) {
            columns = privateResource.columns.map(col => col.name);
          }
        }
      } else {
        // Check private resources first when no parse result
        const privateResource = schemaData.privateResources && schemaData.privateResources[tableName];
        if (privateResource && privateResource.columns) {
          columns = privateResource.columns.map(col => col.name);
        } else if (schemaData.columns && schemaData.columns[tableName]) {
          columns = schemaData.columns[tableName];
        }
      }
      
      return columns;
    }
    
    // Helper function to find table name by alias (with CTE support)
    function findTableByAlias(parseResult, alias) {
      try {
        if (!parseResult || !parseResult.tables) {
          return null;
        }
        
        const table = parseResult.tables.find(t => t.alias === alias);
        return table ? table.name : null;
      } catch (error) {
        console.error('Error finding table by alias:', error);
        return null;
      }
    }
    
    // Helper function to find table object by alias
    function findTableObjectByAlias(parseResult, alias) {
      try {
        if (!parseResult || !parseResult.tables) {
          return null;
        }
        
        return parseResult.tables.find(t => t.alias === alias) || null;
      } catch (error) {
        console.error('Error finding table object by alias:', error);
        return null;
      }
    }
    
    // Helper function to combine schema data
    function combineSchemaData(tablesData, sharedCteData) {
      const combined = {
        tables: [...(tablesData.tables || [])],
        columns: { ...(tablesData.columns || {}) },
        functions: [...(tablesData.functions || [])],
        keywords: [...(tablesData.keywords || [])],
        sharedCtes: {}
      };
      
      // Add shared CTE data if available
      if (sharedCteData && sharedCteData.success) {
        // Note: Shared CTEs should NOT be added to the tables array
        // to avoid duplicate suggestions. They are handled separately via sharedCtes.
        if (sharedCteData.sharedCteColumns) {
          Object.assign(combined.columns, sharedCteData.sharedCteColumns);
        }
        if (sharedCteData.sharedCtes) {
          combined.sharedCtes = sharedCteData.sharedCtes;
        }
      }
      
      return combined;
    }
  `;
}

export function getSchemaManagement(): string {
  return `
    // Load and display schema information (both tables and shared CTEs)
    async function loadSchemaInfo() {
      try {
        logToServer('Schema loading attempt');
        
        // Load both tables and shared CTE schema concurrently
        const [tablesResponse, sharedCteResponse] = await Promise.all([
          fetch('/api/schema'),
          fetch('/api/shared-cte')
        ]);
        
        const tablesData = await tablesResponse.json();
        const sharedCteData = await sharedCteResponse.json();
        
        logToServer('Schema responses received', {
          tablesSuccess: tablesData.success,
          sharedCteSuccess: sharedCteData.success,
          tablesCount: tablesData.schema?.tables?.length || 0,
          sharedCtesCount: Object.keys(sharedCteData.sharedCtes || {}).length
        });
        
        // Display tables
        if (tablesData.success) {
          const tablesInfo = document.getElementById('tables-info');
          let tablesHtml = '';
          
          tablesData.schema.tables.forEach(table => {
            tablesHtml += \`<div style="margin-bottom: 10px; padding: 5px; background: rgba(0,122,204,0.1); border-radius: 3px;">
              <strong style="color: #007acc;">\${table.name}</strong><br>
              \${table.columns.map(col => \`<span style="color: #9cdcfe;">• \${col.name}</span>\`).join('<br>')}
            </div>\`;
          });
          
          tablesInfo.innerHTML = tablesHtml;
          console.log('Tables loaded successfully');
        } else {
          document.getElementById('tables-info').innerHTML = 
            '<div style="color: red;">Failed to load tables</div>';
        }
        
        // Update global sharedCteData and display shared CTEs
        if (sharedCteData.success && sharedCteData.sharedCtes) {
          // Update global variable for IntelliSense
          window.sharedCteData = sharedCteData.sharedCtes;
          
          const sharedCteInfo = document.getElementById('shared-cte-info');
          let sharedCteHtml = '';
          
          Object.values(sharedCteData.sharedCtes).forEach(cte => {
            sharedCteHtml += \`<div style="margin-bottom: 10px; padding: 5px; background: rgba(255,165,0,0.1); border-radius: 3px; cursor: pointer;" 
                                  onclick="openSharedCteTab('\${cte.name}')">
              <strong style="color: #ffa500;">\${cte.name}</strong><br>
              <small style="color: #808080;">\${cte.description || 'No description'}</small><br>
              \${cte.columns.map(col => \`<span style="color: #dcdcaa;">• \${col.name} (\${col.type})</span>\`).join('<br>')}
            </div>\`;
          });
          
          sharedCteInfo.innerHTML = sharedCteHtml;
          console.log('Shared CTEs loaded and global data updated');
        } else {
          window.sharedCteData = {};
          document.getElementById('shared-cte-info').innerHTML = 
            '<div style="color: #808080;">No shared CTEs found</div>';
        }
        
        logToServer('Schema UI updated successfully');
      } catch (error) {
        console.error('Error loading schema:', error);
        document.getElementById('tables-info').innerHTML = 
          '<div style="color: red;">Error loading tables</div>';
        document.getElementById('shared-cte-info').innerHTML = 
          '<div style="color: red;">Error loading shared CTEs</div>';
        logToServer('Schema load error', { error: error.message });
      }
    }
  `;
}
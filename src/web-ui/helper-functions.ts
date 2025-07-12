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
    function combineSchemaData(publicData, privateData) {
      const combined = {
        tables: [...(publicData.tables || [])],
        columns: { ...(publicData.columns || {}) },
        functions: [...(publicData.functions || [])],
        keywords: [...(publicData.keywords || [])],
        privateResources: {}
      };
      
      // Add private data if available
      if (privateData && privateData.success) {
        if (privateData.privateTables) {
          combined.tables.push(...privateData.privateTables);
        }
        if (privateData.privateColumns) {
          Object.assign(combined.columns, privateData.privateColumns);
        }
        if (privateData.privateResources) {
          combined.privateResources = privateData.privateResources;
        }
      }
      
      return combined;
    }
  `;
}

export function getSchemaManagement(): string {
  return `
    // Load and display schema information (both public and private)
    async function loadSchemaInfo() {
      try {
        logToServer('Schema loading attempt');
        
        // Load both public and private schema concurrently
        const [publicResponse, privateResponse] = await Promise.all([
          fetch('/api/schema'),
          fetch('/api/private-schema')
        ]);
        
        const publicData = await publicResponse.json();
        const privateData = await privateResponse.json();
        
        logToServer('Schema responses received', {
          publicSuccess: publicData.success,
          privateSuccess: privateData.success,
          publicTablesCount: publicData.schema?.tables?.length || 0,
          privateResourcesCount: Object.keys(privateData.privateSchema || {}).length
        });
        
        // Display public schema
        if (publicData.success) {
          const publicSchemaInfo = document.getElementById('public-schema-info');
          let publicHtml = '';
          
          publicData.schema.tables.forEach(table => {
            publicHtml += \`<div style="margin-bottom: 10px; padding: 5px; background: rgba(0,122,204,0.1); border-radius: 3px;">
              <strong style="color: #007acc;">\${table.name}</strong><br>
              \${table.columns.map(col => \`<span style="color: #9cdcfe;">• \${col.name}</span>\`).join('<br>')}
            </div>\`;
          });
          
          publicSchemaInfo.innerHTML = publicHtml;
          console.log('Public schema loaded successfully');
        } else {
          document.getElementById('public-schema-info').innerHTML = 
            '<div style="color: red;">Failed to load public schema</div>';
        }
        
        // Display private schema
        if (privateData.success && privateData.privateSchema) {
          const privateSchemaInfo = document.getElementById('private-schema-info');
          let privateHtml = '';
          
          Object.values(privateData.privateSchema).forEach(resource => {
            privateHtml += \`<div style="margin-bottom: 10px; padding: 5px; background: rgba(255,165,0,0.1); border-radius: 3px;">
              <strong style="color: #ffa500;">\${resource.name}</strong><br>
              <small style="color: #808080;">\${resource.description || 'No description'}</small><br>
              \${resource.columns.map(col => \`<span style="color: #dcdcaa;">• \${col.name} (\${col.type})</span>\`).join('<br>')}
            </div>\`;
          });
          
          privateSchemaInfo.innerHTML = privateHtml;
          console.log('Private schema loaded successfully');
        } else {
          document.getElementById('private-schema-info').innerHTML = 
            '<div style="color: #808080;">No private resources found</div>';
        }
        
        logToServer('Schema UI updated successfully');
      } catch (error) {
        console.error('Error loading schema:', error);
        document.getElementById('public-schema-info').innerHTML = 
          '<div style="color: red;">Error loading public schema</div>';
        document.getElementById('private-schema-info').innerHTML = 
          '<div style="color: red;">Error loading private schema</div>';
        logToServer('Schema load error', { error: error.message });
      }
    }
  `;
}
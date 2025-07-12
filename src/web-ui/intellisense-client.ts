export function getIntelliSenseSetup(): string {
  return `
    // IntelliSense setup
    function setupIntelliSense() {
      if (!editor || !monaco) {
        console.error('Editor or Monaco not available for IntelliSense setup');
        return;
      }
      
      // Register SQL completion provider
      monaco.languages.registerCompletionItemProvider('sql', {
        triggerCharacters: ['.', ' '],
        provideCompletionItems: async function(model, position) {
          try {
            sendIntelliSenseDebugLog('COMPLETION_REQUEST', {
              position: position,
              lineContent: model.getLineContent(position.lineNumber),
              modelValue: model.getValue()
            });

            // Get full text and check context
            const fullText = model.getValue();
            const textUntilPosition = model.getValueInRange({
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: position.lineNumber,
              endColumn: position.column
            });
            
            const lineContent = model.getLineContent(position.lineNumber);
            const textBeforeCursor = lineContent.substring(0, position.column - 1);
            const charBeforeCursor = position.column > 1 ? lineContent.charAt(position.column - 2) : '';
            
            sendIntelliSenseDebugLog('CONTEXT_ANALYSIS', {
              fullText: fullText,
              textUntilPosition: textUntilPosition,
              textBeforeCursor: textBeforeCursor,
              charBeforeCursor: charBeforeCursor
            });

            // Check context
            const isFromContext = checkFromClauseContext(fullText, position);
            const isSelectContext = checkSelectClauseContext(fullText, position);
            
            sendIntelliSenseDebugLog('CONTEXT_CHECK', {
              isFromContext: isFromContext,
              isSelectContext: isSelectContext,
              position: position
            });

            // Load completion data
            const [publicResponse, privateResponse] = await Promise.all([
              fetch('/api/schema/completion'),
              fetch('/api/private-schema/completion')
            ]);

            const publicData = await publicResponse.json();
            const privateData = await privateResponse.json();
            
            sendIntelliSenseDebugLog('SCHEMA_DATA_LOADED', {
              publicSuccess: publicData.success,
              privateSuccess: privateData.success,
              publicTablesCount: publicData.tables?.length || 0,
              privateTablesCount: privateData.privateTables?.length || 0
            });

            if (!publicData.success) {
              sendIntelliSenseDebugLog('SCHEMA_LOAD_FAILED', { error: publicData.error });
              return { suggestions: [] };
            }

            // Combine schema data
            currentSchemaData = combineSchemaData(publicData, privateData);
            
            sendIntelliSenseDebugLog('SCHEMA_COMBINED', {
              totalTables: currentSchemaData.tables?.length || 0,
              totalPrivateResources: Object.keys(currentSchemaData.privateResources || {}).length
            });

            // Check for alias completion (column suggestions)
            const aliasMatch = extractAliasFromText(textBeforeCursor, charBeforeCursor);
            
            sendIntelliSenseDebugLog('ALIAS_DETECTION', {
              textBeforeCursor: textBeforeCursor,
              charBeforeCursor: charBeforeCursor,
              result: aliasMatch
            });

            if (aliasMatch) {
              // This is column completion after alias
              const [fullMatch, alias, partialColumn] = aliasMatch;
              
              try {
                // Parse SQL to get table information
                const parseResponse = await fetch('/api/parse-sql', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sql: fullText, enableDebug: true })
                });
                
                const parseResult = await parseResponse.json();
                
                sendIntelliSenseDebugLog('SQL_PARSING', {
                  success: parseResult.success,
                  alias: alias,
                  partialColumn: partialColumn,
                  error: parseResult.error
                });

                if (parseResult.success) {
                  lastSuccessfulParseResult = parseResult; // キャッシュ
                  
                  // Find table name by alias
                  const tableName = findTableByAlias(parseResult, alias);
                  
                  sendIntelliSenseDebugLog('TABLE_RESOLUTION', {
                    alias: alias,
                    resolvedTableName: tableName
                  });

                  if (tableName) {
                    // Get columns for the table
                    const columns = getColumnsForTable(tableName, alias, parseResult, currentSchemaData);
                    
                    sendIntelliSenseDebugLog('COLUMN_RESOLUTION', {
                      tableName: tableName,
                      alias: alias,
                      columns: columns
                    });

                    const suggestions = columns.map(column => ({
                      label: column,
                      kind: monaco.languages.CompletionItemKind.Field,
                      insertText: column,
                      detail: \`Column from \${tableName}\`,
                      range: {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: position.column - partialColumn.length,
                        endColumn: position.column
                      }
                    }));

                    sendIntelliSenseDebugLog('COLUMN_SUGGESTIONS_GENERATED', {
                      suggestionCount: suggestions.length,
                      suggestions: suggestions.map(s => s.label)
                    });

                    return { suggestions };
                  }
                } else {
                  // Use cached result if parsing fails
                  if (lastSuccessfulParseResult) {
                    const tableName = findTableByAlias(lastSuccessfulParseResult, alias);
                    if (tableName) {
                      const columns = getColumnsForTable(tableName, alias, lastSuccessfulParseResult, currentSchemaData);
                      const suggestions = columns.map(column => ({
                        label: column,
                        kind: monaco.languages.CompletionItemKind.Field,
                        insertText: column,
                        detail: \`Column from \${tableName} (cached)\`,
                        range: {
                          startLineNumber: position.lineNumber,
                          endLineNumber: position.lineNumber,
                          startColumn: position.column - partialColumn.length,
                          endColumn: position.column
                        }
                      }));

                      sendIntelliSenseDebugLog('CACHED_COLUMN_SUGGESTIONS', {
                        suggestionCount: suggestions.length
                      });

                      return { suggestions };
                    }
                  }
                }
              } catch (error) {
                sendIntelliSenseDebugLog('COLUMN_COMPLETION_ERROR', null, error.message);
              }
            }

            // Context-based suggestions
            let suggestions = [];

            if (isSelectContext) {
              // SELECT clause context - no suggestions to avoid clutter
              sendIntelliSenseDebugLog('SELECT_CONTEXT_NO_SUGGESTIONS', {
                message: 'No suggestions in SELECT context to avoid clutter'
              });
              
              return { suggestions: [] };
            } else if (isFromContext) {
              // FROM clause context - show tables and private resources
              suggestions = [
                // Public tables
                ...currentSchemaData.tables.map(table => ({
                  label: table,
                  kind: monaco.languages.CompletionItemKind.Class,
                  insertText: table,
                  detail: 'Table',
                  documentation: \`Table: \${table}\`
                })),
                // Private resources
                ...Object.keys(currentSchemaData.privateResources || {}).map(resourceName => ({
                  label: resourceName,
                  kind: monaco.languages.CompletionItemKind.Module,
                  insertText: resourceName,
                  detail: 'Private Resource',
                  documentation: currentSchemaData.privateResources[resourceName]?.description || \`Private resource: \${resourceName}\`
                }))
              ];
              
              sendIntelliSenseDebugLog('FROM_CONTEXT_SUGGESTIONS', {
                publicTables: currentSchemaData.tables.length,
                privateResources: Object.keys(currentSchemaData.privateResources || {}).length,
                totalSuggestions: suggestions.length
              });
            } else {
              // General context - show keywords, functions, tables
              suggestions = [
                // SQL Keywords
                ...currentSchemaData.keywords.map(keyword => ({
                  label: keyword,
                  kind: monaco.languages.CompletionItemKind.Keyword,
                  insertText: keyword,
                  detail: 'SQL Keyword'
                })),
                // Functions
                ...currentSchemaData.functions.map(func => ({
                  label: func,
                  kind: monaco.languages.CompletionItemKind.Function,
                  insertText: func + '(',
                  detail: 'SQL Function'
                })),
                // Tables (lower priority in general context)
                ...currentSchemaData.tables.map(table => ({
                  label: table,
                  kind: monaco.languages.CompletionItemKind.Class,
                  insertText: table,
                  detail: 'Table'
                }))
              ];
              
              sendIntelliSenseDebugLog('GENERAL_CONTEXT_SUGGESTIONS', {
                keywords: currentSchemaData.keywords.length,
                functions: currentSchemaData.functions.length,
                tables: currentSchemaData.tables.length,
                totalSuggestions: suggestions.length
              });
            }

            return { suggestions };

          } catch (error) {
            sendIntelliSenseDebugLog('INTELLISENSE_ERROR', null, error.message);
            console.error('IntelliSense error:', error);
            return { suggestions: [] };
          }
        }
      });
    }
  `;
}

export function getIntelliSenseTestFunctions(): string {
  return `
    // IntelliSense Test Functions
    async function testFromClauseContext() {
      if (!editor) {
        alert('Editor not available');
        return;
      }
      
      const testCases = [
        'SELECT * FROM ',
        'SELECT * FROM user',
        'SELECT * FROM users u INNER JOIN ',
        'SELECT * FROM users u LEFT JOIN ord',
        'SELECT * FROM users WHERE id = 1'
      ];
      
      let results = 'FROM Clause Context Test Results:\\n\\n';
      
      for (const [index, testSql] of testCases.entries()) {
        const position = { lineNumber: 1, column: testSql.length + 1 };
        const isFromContext = checkFromClauseContext(testSql, position);
        results += \`\${index + 1}. "\${testSql}"\\n\`;
        results += \`   Context: \${isFromContext ? 'FROM clause' : 'Normal'}\\n\\n\`;
      }
      
      alert(results);
    }
    
    async function testAliasCompletion() {
      if (!editor) {
        alert('Editor not available');
        return;
      }
      
      // Test the current SQL in editor for alias completion
      const sql = editor.getValue();
      const position = editor.getPosition();
      
      if (!position) {
        alert('Cannot get cursor position');
        return;
      }
      
      try {
        // Get text before cursor
        const textBeforeCursor = editor.getModel().getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        
        const charBeforeCursor = position.column > 1 ? 
          editor.getModel().getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column - 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          }) : '';
        
        // Test alias extraction
        const aliasMatch = extractAliasFromText(textBeforeCursor, charBeforeCursor);
        
        let message = \`Alias Completion Test:\\n\\n\`;
        message += \`Current SQL: \${sql}\\n\`;
        message += \`Cursor position: Line \${position.lineNumber}, Column \${position.column}\\n\`;
        message += \`Text before cursor: "\${textBeforeCursor}"\\n\`;
        message += \`Char before cursor: "\${charBeforeCursor}"\\n\`;
        message += \`Alias match: \${aliasMatch ? JSON.stringify(aliasMatch) : 'null'}\\n\`;
        
        if (aliasMatch) {
          const alias = aliasMatch[1];
          
          // Test table resolution
          if (lastSuccessfulParseResult) {
            const tableName = findTableByAlias(lastSuccessfulParseResult, alias);
            message += \`Resolved table: \${tableName || 'not found'}\\n\`;
            
            // Test column retrieval
            if (tableName && currentSchemaData) {
              const columns = getColumnsForTable(tableName, alias, lastSuccessfulParseResult, currentSchemaData);
              message += \`Available columns: \${columns.join(', ') || 'none'}\\n\`;
            }
          } else {
            message += \`No parse result available for table resolution\\n\`;
          }
        }
        
        alert(message);
      } catch (error) {
        alert('Alias completion test failed: ' + error.message);
      }
    }
    
    async function testPrivateResourceCompletion() {
      try {
        // Load private resources
        const response = await fetch('/api/private-schema/completion');
        const data = await response.json();
        
        let message = \`Private Resource Completion Test:\\n\\n\`;
        
        if (data.success) {
          message += \`Private tables: \${data.privateTables?.join(', ') || 'none'}\\n\`;
          message += \`Private columns:\\n\`;
          
          Object.entries(data.privateColumns || {}).forEach(([table, columns]) => {
            message += \`  \${table}: \${columns.join(', ')}\\n\`;
          });
          
          message += \`\\nPrivate resources:\\n\`;
          Object.entries(data.privateResources || {}).forEach(([name, resource]) => {
            message += \`  \${name}: \${resource.description || 'No description'}\\n\`;
          });
          
          // Test FROM clause context with private resources
          const testSql = 'SELECT * FROM user_st';
          const position = { lineNumber: 1, column: testSql.length + 1 };
          const isFromContext = checkFromClauseContext(testSql, position);
          
          message += \`\\nFROM context test with "SELECT * FROM user_st": \${isFromContext}\\n\`;
          
        } else {
          message += \`Failed to load private resources: \${data.error}\\n\`;
        }
        
        alert(message);
      } catch (error) {
        alert('Private resource test failed: ' + error.message);
      }
    }
    
    async function analyzeIntelliSenseIssues() {
      try {
        const response = await fetch('/api/intellisense-debug/analyze');
        const data = await response.json();
        
        if (data.success) {
          let message = 'IntelliSense Issues Analysis:\\n\\n';
          
          const analysis = data.analysis;
          message += \`Total recent logs: \${analysis.totalLogs}\\n\`;
          message += \`Successful alias detections: \${analysis.successfulAliasDetections}\\n\`;
          message += \`Failed alias detections: \${analysis.failedAliasDetections}\\n\`;
          message += \`SQL parse successes: \${analysis.sqlParseSuccesses}\\n\`;
          message += \`SQL parse failures: \${analysis.sqlParseFailures}\\n\`;
          message += \`Column resolution successes: \${analysis.columnResolutionSuccesses}\\n\`;
          message += \`Column resolution failures: \${analysis.columnResolutionFailures}\\n\\n\`;
          
          if (analysis.commonIssues.length > 0) {
            message += 'Common Issues:\\n';
            analysis.commonIssues.forEach((issue, i) => {
              message += \`\${i + 1}. \${issue}\\n\`;
            });
            message += '\\n';
          }
          
          if (analysis.suggestions.length > 0) {
            message += 'Suggestions:\\n';
            analysis.suggestions.forEach((suggestion, i) => {
              message += \`\${i + 1}. \${suggestion}\\n\`;
            });
          }
          
          alert(message);
        } else {
          alert('Failed to analyze IntelliSense issues: ' + data.error);
        }
      } catch (error) {
        alert('Error analyzing IntelliSense issues: ' + error.message);
      }
    }
  `;
}
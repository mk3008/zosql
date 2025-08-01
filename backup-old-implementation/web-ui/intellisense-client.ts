export function getIntelliSenseSetup(): string {
  return `
    // ====================================================================
    // IntelliSense Setup and Main Provider
    // ====================================================================
    // このセクションはMonaco EditorにSQL補完機能を統合するためのメインロジック
    // コンテキストベースの補完（SELECT句、FROM句、テーブル名後等）を提供
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
            const isPostTableContext = checkPostTableContext(fullText, position);
            const postAliasInfo = checkPostAliasContext(fullText, position);
            const isPostAliasCompletedContext = checkPostAliasCompletedContext(fullText, position);
            
            sendIntelliSenseDebugLog('CONTEXT_CHECK', {
              isFromContext: isFromContext,
              isSelectContext: isSelectContext,
              isPostTableContext: isPostTableContext,
              isPostAliasContext: postAliasInfo.isPostAliasContext,
              isPostAliasCompletedContext: isPostAliasCompletedContext,
              aliasTableName: postAliasInfo.tableName,
              position: position
            });

            // Load completion data
            const [tablesResponse, sharedCteResponse] = await Promise.all([
              fetch('/api/schema/completion'),
              fetch('/api/shared-cte/completion')
            ]);

            const tablesData = await tablesResponse.json();
            const sharedCteData = await sharedCteResponse.json();
            
            sendIntelliSenseDebugLog('SCHEMA_DATA_LOADED', {
              tablesSuccess: tablesData.success,
              sharedCteSuccess: sharedCteData.success,
              tablesCount: tablesData.tables?.length || 0,
              sharedCteTablesCount: sharedCteData.sharedCteTables?.length || 0
            });

            if (!tablesData.success) {
              sendIntelliSenseDebugLog('SCHEMA_LOAD_FAILED', { error: tablesData.error });
              return { suggestions: [] };
            }

            // Combine schema data
            currentSchemaData = combineSchemaData(tablesData, sharedCteData);
            
            sendIntelliSenseDebugLog('SCHEMA_COMBINED', {
              totalTables: currentSchemaData.tables?.length || 0,
              totalSharedCtes: Object.keys(currentSchemaData.sharedCtes || {}).length
            });

            // ============================================================
            // Column Completion Logic (alias.column pattern)
            // ============================================================
            // "u.id" や "u." のようなパターンでカラム補完を実行
            const aliasMatch = extractAliasFromText(textBeforeCursor, charBeforeCursor);
            
            sendIntelliSenseDebugLog('ALIAS_DETECTION', {
              textBeforeCursor: textBeforeCursor,
              charBeforeCursor: charBeforeCursor,
              result: aliasMatch
            });

            if (aliasMatch) {
              // エイリアス後のカラム補完処理
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

            // ============================================================
            // Context-Based Suggestion Logic
            // ============================================================
            // カーソル位置に基づいて適切な補完候補のみを提供
            let suggestions = [];

            if (isSelectContext) {
              // SELECT句内 - 候補なしでクラッターを回避
              sendIntelliSenseDebugLog('SELECT_CONTEXT_NO_SUGGESTIONS', {
                message: 'No suggestions in SELECT context to avoid clutter'
              });
              
              return { suggestions: [] };
            } else if (isPostAliasCompletedContext) {
              // エイリアス完了後 - 候補なしで無意味な提案を回避
              sendIntelliSenseDebugLog('POST_ALIAS_COMPLETED_NO_SUGGESTIONS', {
                message: 'No suggestions after alias completion to avoid meaningless proposals'
              });
              
              return { suggestions: [] };
            } else if (postAliasInfo.isPostAliasContext) {
              // AS キーワード直後 - 推奨エイリアス名を提案
              const recommendedAlias = generateTableAlias(postAliasInfo.tableName);
              
              if (recommendedAlias) {
                suggestions = [{
                  label: recommendedAlias,
                  kind: monaco.languages.CompletionItemKind.Variable,
                  insertText: recommendedAlias + ' ',
                  detail: \`Recommended alias for \${postAliasInfo.tableName}\`,
                  documentation: \`Suggested alias based on table name '\${postAliasInfo.tableName}'\`,
                  command: {
                    id: 'editor.action.triggerSuggest',
                    title: 'Trigger IntelliSense'
                  }
                }];
                
                sendIntelliSenseDebugLog('POST_ALIAS_CONTEXT_SUGGESTIONS', {
                  message: 'Suggesting recommended alias after AS keyword',
                  tableName: postAliasInfo.tableName,
                  recommendedAlias: recommendedAlias,
                  totalSuggestions: suggestions.length
                });
              } else {
                // エイリアス生成に失敗した場合は候補なし
                sendIntelliSenseDebugLog('POST_ALIAS_CONTEXT_NO_SUGGESTIONS', {
                  message: 'No alias suggestions after AS keyword',
                  tableName: postAliasInfo.tableName
                });
                
                return { suggestions: [] };
              }
            } else if (isPostTableContext) {
              // テーブル名直後 - ASキーワードのみ提案
              suggestions = [{
                label: 'AS',
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: 'AS ',
                detail: 'SQL Alias Keyword',
                documentation: 'Use AS to create an alias for the table',
                command: {
                  id: 'editor.action.triggerSuggest',
                  title: 'Trigger IntelliSense'
                }
              }];
              
              sendIntelliSenseDebugLog('POST_TABLE_CONTEXT_SUGGESTIONS', {
                message: 'Suggesting AS keyword after table name',
                totalSuggestions: suggestions.length
              });
            } else if (isFromContext) {
              // FROM句/JOIN句 - テーブル名とshared cteを提案
              suggestions = [
                // Tables
                ...currentSchemaData.tables.map(table => ({
                  label: table,
                  kind: monaco.languages.CompletionItemKind.Class,
                  insertText: table + ' ',
                  detail: 'Table',
                  documentation: \`Table: \${table}\`,
                  command: {
                    id: 'editor.action.triggerSuggest',
                    title: 'Trigger IntelliSense'
                  }
                })),
                // Shared CTEs
                ...Object.keys(currentSchemaData.sharedCtes || {}).map(cteName => ({
                  label: cteName,
                  kind: monaco.languages.CompletionItemKind.Module,
                  insertText: cteName + ' ',
                  detail: 'Shared CTE',
                  documentation: currentSchemaData.sharedCtes[cteName]?.description || \`Shared CTE: \${cteName}\`,
                  command: {
                    id: 'editor.action.triggerSuggest',
                    title: 'Trigger IntelliSense'
                  }
                }))
              ];
              
              sendIntelliSenseDebugLog('FROM_CONTEXT_SUGGESTIONS', {
                tables: currentSchemaData.tables.length,
                sharedCtes: Object.keys(currentSchemaData.sharedCtes || {}).length,
                totalSuggestions: suggestions.length
              });
            } else {
              // 一般的なコンテキスト - 候補なしでクラッターを回避
              sendIntelliSenseDebugLog('GENERAL_CONTEXT_NO_SUGGESTIONS', {
                message: 'No suggestions in general context to avoid clutter'
              });
              
              return { suggestions: [] };
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
    
    async function testSharedCteCompletion() {
      try {
        // Load shared CTEs
        const response = await fetch('/api/shared-cte/completion');
        const data = await response.json();
        
        let message = \`Shared CTE Completion Test:\\n\\n\`;
        
        if (data.success) {
          message += \`Shared CTE tables: \${data.sharedCteTables?.join(', ') || 'none'}\\n\`;
          message += \`Shared CTE columns:\\n\`;
          
          Object.entries(data.sharedCteColumns || {}).forEach(([table, columns]) => {
            message += \`  \${table}: \${columns.join(', ')}\\n\`;
          });
          
          message += \`\\nShared CTEs:\\n\`;
          Object.entries(data.sharedCtes || {}).forEach(([name, cte]) => {
            message += \`  \${name}: \${cte.description || 'No description'}\\n\`;
          });
          
          // Test FROM clause context with shared CTEs
          const testSql = 'SELECT * FROM user_st';
          const position = { lineNumber: 1, column: testSql.length + 1 };
          const isFromContext = checkFromClauseContext(testSql, position);
          
          message += \`\\nFROM context test with "SELECT * FROM user_st": \${isFromContext}\\n\`;
          
        } else {
          message += \`Failed to load shared CTEs: \${data.error}\\n\`;
        }
        
        alert(message);
      } catch (error) {
        alert('Shared CTE test failed: ' + error.message);
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
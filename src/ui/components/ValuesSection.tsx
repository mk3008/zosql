import React, { useState } from 'react';
import { MonacoEditor } from './MonacoEditor';

interface ValuesSectionProps {
  onOpenTab?: () => void;
}

export const ValuesSection: React.FC<ValuesSectionProps> = ({ onOpenTab }) => {
  const [valuesContent, setValuesContent] = useState(`-- Define test data CTEs here
-- Write WITH clauses, SELECT clauses can be omitted (they will be ignored if written)
-- Example:
with users(user_id, name) as (
  values
    (1::bigint, 'alice'::text),
    (2::bigint, 'bob'::text)
)`);

  const [isExpanded, setIsExpanded] = useState(true);
  const [useSchemaCollector, setUseSchemaCollector] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [copyPromptStatus, setCopyPromptStatus] = useState('');

  const copyPrompt = async () => {
    try {
      setErrorMessage('');
      setCopyPromptStatus('Copying...');
      
      // TODO: Get current SQL from main editor context
      const currentSql = '-- Example SQL from main editor\nSELECT * FROM users u JOIN orders o ON u.id = o.user_id;';
      
      if (!currentSql || !currentSql.trim()) {
        throw new Error('No SQL query found in main editor');
      }

      const prompt = await generatePrompt(currentSql, useSchemaCollector);
      
      await navigator.clipboard.writeText(prompt);
      setCopyPromptStatus('Copied!');
      setTimeout(() => setCopyPromptStatus(''), 2000);
      
    } catch (error) {
      console.error('Copy prompt failed:', error);
      setCopyPromptStatus('Failed');
      setTimeout(() => setCopyPromptStatus(''), 2000);
      
      if (error instanceof Error && error.message.includes('Schema analysis failed')) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(`Failed to copy prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const generatePrompt = async (sql: string, useSchemaCollector: boolean): Promise<string> => {
    if (!useSchemaCollector) {
      // AI-assisted mode
      return `このSQLをDB環境依存なしで動かしたいので、
元のSQLは変更せずに、必要なテーブルを VALUES 文で定義したモックテーブルとして
WITH句のみ を作成してください。
SELECT文などは不要で、WITH句だけ回答してください。

\`\`\`sql
${sql}
\`\`\``;
    }

    // Schema-aware mode (simplified for now)
    try {
      // TODO: Implement schema extraction using rawsql-ts
      const mockTables = ['users(id, name, email)', 'orders(id, user_id, amount)'];
      const tableDescriptions = mockTables.join(', ');

      return `このSQLをDB環境依存なしで動かしたいので、
元のSQLは変更せずに、必要なテーブル ${tableDescriptions} を VALUES 文で定義したモックテーブルとして
WITH句のみ を作成してください。
SELECT文などは不要で、WITH句だけ回答してください。

\`\`\`sql
${sql}
\`\`\``;
    } catch (error) {
      throw new Error(`Schema analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please fix the SQL query to resolve ambiguous column references (e.g., use table.column instead of column).`);
    }
  };

  return (
    <div className="mb-6">
      <div 
        className="flex items-center justify-between cursor-pointer mb-3 border-b border-dark-border-primary pb-2"
        onClick={() => {
          if (onOpenTab) {
            onOpenTab();
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <h3 className="text-sm font-medium text-dark-text-white hover:text-primary-400 transition-colors">
          Values & Test Data
        </h3>
        <span className="text-dark-text-secondary text-xs">
          {onOpenTab ? '→' : (isExpanded ? '▼' : '▶')}
        </span>
      </div>

      {isExpanded && !onOpenTab && (
        <div className="space-y-3">
          {/* Values Editor */}
          <div className="border border-dark-border-primary rounded overflow-hidden">
            <div className="h-48">
              <MonacoEditor
                value={valuesContent}
                onChange={setValuesContent}
                language="sql"
                height="100%"
                options={{
                  wordWrap: 'off',
                  wrappingStrategy: 'simple',
                  scrollBeyondLastLine: false,
                  minimap: { enabled: false }
                }}
              />
            </div>
          </div>

          {/* Copy Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-dark-text-primary">
                <input
                  type="checkbox"
                  checked={useSchemaCollector}
                  onChange={(e) => setUseSchemaCollector(e.target.checked)}
                  className="w-3 h-3 rounded border border-dark-border-primary bg-dark-background checked:bg-primary-600"
                />
                Use Schema Collector
              </label>
            </div>
            
            <button
              onClick={copyPrompt}
              className="w-full px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors text-xs font-medium flex items-center justify-center gap-2"
              title="Copy prompt for generating VALUES CTEs to clipboard"
            >
              📋 Copy Prompt
              {copyPromptStatus && (
                <span className="text-xs opacity-80">({copyPromptStatus})</span>
              )}
            </button>
            
            {errorMessage && (
              <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Usage Hint */}
          <div className="text-xs text-dark-text-muted bg-dark-primary p-2 rounded">
            💡 <strong>Tip:</strong> Define your test data here using VALUES clauses. 
            Use "Copy Prompt" to generate AI prompts for creating mock data from your main SQL query.
          </div>
        </div>
      )}
    </div>
  );
};
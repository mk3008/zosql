/**
 * CTEDecomposer - CTE分解処理をFileManagerを使用して実装
 * ブラウザ操作不要で単体テスト可能
 */

import { SelectQueryParser, CTEQueryDecomposer, SqlFormatter } from 'rawsql-ts';
import { FileManager } from './file-manager.js';
import fs from 'fs/promises';
import path from 'path';

export interface CTEDecomposerOptions {
    addComments?: boolean;
    exportComment?: boolean;
    preset?: 'postgres' | 'mysql' | 'sqlite';
    withClauseStyle?: 'standard' | 'cte-oneline' | 'full-oneline';
    useCustomFormatter?: boolean;
}

export interface DecomposedCTE {
    name: string;
    query: string;
    dependencies: string[];
    comment?: string;
}

export interface DecomposeResult {
    privateCtesCreated: number;
    mainQuery: string;
    decomposedCTEs: DecomposedCTE[];
}

export class CTEDecomposer {
    private options: CTEDecomposerOptions;

    constructor(options: CTEDecomposerOptions = {}) {
        this.options = {
            addComments: true,
            exportComment: true,
            preset: 'postgres',
            withClauseStyle: 'full-oneline',
            useCustomFormatter: true,
            ...options
        };
    }

    /**
     * フォーマット設定をロード
     */
    private async loadFormatterConfig(): Promise<Record<string, unknown>> {
        try {
            const configPath = path.join(process.cwd(), 'zosql.formatter.json');
            const configContent = await fs.readFile(configPath, 'utf8');
            return JSON.parse(configContent);
        } catch (error) {
            // デフォルト設定を返す
            return {
                identifierEscape: { start: "", end: "" },
                parameterSymbol: ":",
                parameterStyle: "named",
                indentSize: 4,
                indentChar: " ",
                newline: "\n",
                keywordCase: "lower",
                commaBreak: "before",
                andBreak: "before",
                withClauseStyle: "full-oneline",
                preserveComments: true
            };
        }
    }

    /**
     * CTEクエリをカスタムフォーマットで整形
     */
    private async formatCteQuery(query: string): Promise<string> {
        if (!this.options.useCustomFormatter) {
            return query;
        }

        try {
            const formatterConfig = await this.loadFormatterConfig();
            const formatter = new SqlFormatter(formatterConfig);
            
            // SelectQueryParserでクエリを解析してからフォーマット
            const parsedQuery = SelectQueryParser.parse(query);
            const formatResult = formatter.format(parsedQuery);
            
            return typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
        } catch (error) {
            // フォーマットに失敗した場合は元のクエリを返す
            return query;
        }
    }

    /**
     * SQLクエリからCTEを分解し、FileManagerに格納
     */
    async decompose(sql: string, fileManager: FileManager, targetDir: string = 'zosql/workspace/private-cte'): Promise<DecomposeResult> {
        try {
            // rawsql-tsでクエリを解析
            const query = SelectQueryParser.parse(sql);
            const simpleQuery = query.toSimpleQuery();

            // CTEQueryDecomposerを使用してCTEを分解
            const decomposer = new CTEQueryDecomposer(this.options);
            const decomposedCTEs = decomposer.decompose(simpleQuery);

            // 分解結果をFileManagerに格納
            const result: DecomposeResult = {
                privateCtesCreated: 0,
                mainQuery: sql,
                decomposedCTEs: []
            };

            for (const cteData of decomposedCTEs) {
                const dependencies = cteData.dependencies || [];
                
                // CTEクエリをカスタムフォーマットで整形
                const formattedQuery = await this.formatCteQuery(cteData.query);
                
                const decomposedCTE: DecomposedCTE = {
                    name: cteData.name,
                    query: formattedQuery,
                    dependencies,
                    comment: (cteData as { comment?: string }).comment
                };

                // ファイル内容を作成
                const fileContent = this.createCTEFileContent(decomposedCTE);
                const filePath = `${targetDir}/${cteData.name}.sql`;

                // FileManagerに保存
                fileManager.writeFile(filePath, fileContent);

                result.decomposedCTEs.push(decomposedCTE);
                result.privateCtesCreated++;
            }

            return result;

        } catch (error) {
            throw new Error(`CTE decomposition failed: ${error}`);
        }
    }


    /**
     * CTE ファイルの内容を作成
     */
    private createCTEFileContent(cte: DecomposedCTE): string {
        const lines: string[] = [
            `/* name: ${cte.name} */`,
            `/* description: Extracted CTE: ${cte.name} */`,
            `/* dependencies: ${JSON.stringify(cte.dependencies)} */`,
            ''
        ];

        // コメントがある場合は追加
        if (cte.comment) {
            lines.push(`/* ${cte.comment} */`);
            lines.push('');
        }

        lines.push(cte.query);

        return lines.join('\n');
    }

    /**
     * FileManager内のPrivate CTEファイルを取得
     */
    getPrivateCTEFiles(fileManager: FileManager, targetDir: string = 'zosql/workspace/private-cte'): string[] {
        return fileManager.glob(`${targetDir}/*.sql`);
    }

    /**
     * Private CTE ファイルから CTE を読み込み
     */
    loadPrivateCTE(fileManager: FileManager, filePath: string): DecomposedCTE | null {
        const content = fileManager.readFile(filePath);
        if (!content) {
            return null;
        }

        // ファイル名からCTE名を抽出
        const fileName = filePath.split('/').pop();
        const cteName = fileName?.replace('.sql', '') || '';

        // コメントから情報を抽出
        const nameMatch = content.match(/\/\*\s*name:\s*(.*?)\s*\*\//);
        const descMatch = content.match(/\/\*\s*description:\s*(.*?)\s*\*\//);
        const depsMatch = content.match(/\/\*\s*dependencies:\s*(\[.*?\])\s*\*\//);

        let dependencies: string[] = [];
        if (depsMatch) {
            try {
                dependencies = JSON.parse(depsMatch[1]);
            } catch (e) {
                // JSON解析失敗時は空配列
            }
        }

        // SQL部分を抽出（最後の */以降）
        const lastCommentEnd = content.lastIndexOf('*/');
        const query = lastCommentEnd >= 0 
            ? content.substring(lastCommentEnd + 2).trim()
            : content;

        return {
            name: nameMatch?.[1] || cteName,
            query,
            dependencies,
            comment: descMatch?.[1]
        };
    }

    /**
     * すべてのPrivate CTEを読み込み
     */
    loadAllPrivateCTEs(fileManager: FileManager, targetDir: string = 'zosql/workspace/private-cte'): DecomposedCTE[] {
        const files = this.getPrivateCTEFiles(fileManager, targetDir);
        const ctes: DecomposedCTE[] = [];

        for (const filePath of files) {
            const cte = this.loadPrivateCTE(fileManager, filePath);
            if (cte) {
                ctes.push(cte);
            }
        }

        return ctes;
    }

    /**
     * FileManagerの内容を実際のファイルシステムに書き出し
     */
    async flushToFileSystem(fileManager: FileManager, basePath: string = ''): Promise<void> {
        await fileManager.flushToFileSystem(basePath);
    }
}
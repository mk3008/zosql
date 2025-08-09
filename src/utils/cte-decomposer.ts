/**
 * CTEDecomposer - CTE分解処理をFileManagerを使用して実装
 * ブラウザ操作不要で単体テスト可能
 */

import { SelectQueryParser, CTEQueryDecomposer, SqlFormatter } from 'rawsql-ts';
import { FileManager } from './file-manager.js';
import fs from 'fs/promises';
import path from 'path';
import { pipe } from '../lib/functional/index.js';
import * as Result from '../lib/functional/result.js';
import * as Option from '../lib/functional/option.js';

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

// ===== NEW FUNCTIONAL VERSIONS - BACKWARD COMPATIBLE =====

/**
 * Functional version: Load formatter configuration
 */
export const loadFormatterConfigFunc = async (): Promise<Result.Result<Record<string, unknown>, Error>> => {
    return Result.asyncTryCatch(async () => {
        const configPath = path.join(process.cwd(), 'zosql.formatter.json');
        const configContent = await fs.readFile(configPath, 'utf8');
        return JSON.parse(configContent);
    }).then(result => 
        Result.isErr(result) 
            ? Result.ok({
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
            })
            : result
    );
};

/**
 * Functional version: Format CTE query
 */
export const formatCteQueryFunc = (options: CTEDecomposerOptions) => 
    async (query: string): Promise<Result.Result<string, Error>> => {
        if (!options.useCustomFormatter) {
            return Result.ok(query);
        }

        return Result.asyncTryCatch(async () => {
            const configResult = await loadFormatterConfigFunc();
            if (Result.isErr(configResult)) {
                return query;
            }
            
            const formatter = new SqlFormatter(configResult.value);
            const parsedQuery = SelectQueryParser.parse(query);
            const formatResult = formatter.format(parsedQuery);
            
            return typeof formatResult === 'string' ? formatResult : formatResult.formattedSql;
        });
    };

/**
 * Functional version: Create CTE file content
 */
export const createCTEFileContentFunc = (cte: DecomposedCTE): string => {
    return pipe(
        [
            `/* name: ${cte.name} */`,
            `/* description: Extracted CTE: ${cte.name} */`,
            `/* dependencies: ${JSON.stringify(cte.dependencies)} */`,
            '',
            ...(cte.comment ? [`/* ${cte.comment} */`, ''] : []),
            cte.query
        ],
        lines => lines.join('\n')
    );
};

/**
 * Functional version: Parse CTE from file content
 */
export const parseCTEFromContentFunc = (content: string, fileName: string): Option.Option<DecomposedCTE> => {
    const cteName = fileName.replace('.sql', '');
    
    const nameMatch = content.match(/\/\*\s*name:\s*(.*?)\s*\*\//);
    const descMatch = content.match(/\/\*\s*description:\s*(.*?)\s*\*\//);
    const depsMatch = content.match(/\/\*\s*dependencies:\s*(\[.*?\])\s*\*\//);
    
    const dependencies = pipe(
        Option.fromNullable(depsMatch?.[1]),
        Option.map(depsStr => {
            try {
                return JSON.parse(depsStr) as string[];
            } catch {
                return [] as string[];
            }
        }),
        Option.getOrElse([] as string[])
    );
    
    const lastCommentEnd = content.lastIndexOf('*/');
    const query = lastCommentEnd >= 0 
        ? content.substring(lastCommentEnd + 2).trim()
        : content;
    
    return Option.some({
        name: nameMatch?.[1] || cteName,
        query,
        dependencies,
        comment: descMatch?.[1]
    });
};

/**
 * Functional version: Load private CTE
 */
export const loadPrivateCTEFunc = (fileManager: FileManager) => 
    (filePath: string): Option.Option<DecomposedCTE> => {
        const content = fileManager.readFile(filePath);
        if (!content) {
            return Option.none;
        }
        
        const fileName = filePath.split('/').pop() || '';
        return parseCTEFromContentFunc(content, fileName);
    };

/**
 * Functional version: Load all private CTEs
 */
export const loadAllPrivateCTEsFunc = (fileManager: FileManager, targetDir: string = 'zosql/workspace/private-cte'): DecomposedCTE[] => {
    const files = fileManager.glob(`${targetDir}/*.sql`);
    const ctes: DecomposedCTE[] = [];
    
    for (const filePath of files) {
        const cteOption = loadPrivateCTEFunc(fileManager)(filePath);
        if (Option.isSome(cteOption)) {
            ctes.push(cteOption.value);
        }
    }
    
    return ctes;
};

/**
 * Functional version: Decompose SQL with Result type
 */
export const decomposeFunc = (options: CTEDecomposerOptions) => 
    async (sql: string, fileManager: FileManager, targetDir: string = 'zosql/workspace/private-cte'): 
    Promise<Result.Result<DecomposeResult, Error>> => {
        return Result.asyncTryCatch(async () => {
            const query = SelectQueryParser.parse(sql);
            const simpleQuery = query.toSimpleQuery();
            
            const decomposer = new CTEQueryDecomposer(options);
            const decomposedCTEs = decomposer.decompose(simpleQuery);
            
            const result: DecomposeResult = {
                privateCtesCreated: 0,
                mainQuery: sql,
                decomposedCTEs: []
            };
            
            const formatter = formatCteQueryFunc(options);
            
            for (const cteData of decomposedCTEs) {
                const formattedQueryResult = await formatter(cteData.query);
                const formattedQuery = Result.isOk(formattedQueryResult) 
                    ? formattedQueryResult.value 
                    : cteData.query;
                
                const decomposedCTE: DecomposedCTE = {
                    name: cteData.name,
                    query: formattedQuery,
                    dependencies: cteData.dependencies || [],
                    comment: (cteData as { comment?: string }).comment
                };
                
                const fileContent = createCTEFileContentFunc(decomposedCTE);
                const filePath = `${targetDir}/${cteData.name}.sql`;
                
                fileManager.writeFile(filePath, fileContent);
                
                result.decomposedCTEs.push(decomposedCTE);
                result.privateCtesCreated++;
            }
            
            return result;
        });
    };
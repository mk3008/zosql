import { Request, Response } from 'express';
import { SelectQueryParser, SchemaCollector } from 'rawsql-ts';
import { Logger } from '../utils/logging.js';
import fs from 'fs';
import path from 'path';

interface ValidationResult {
    type: 'main' | 'cte';
    name: string;
    filePath: string;
    isValid: boolean;
    error?: string;
    schemaInfo?: unknown;
}

interface ValidationResponse {
    success: boolean;
    results: ValidationResult[];
    timestamp: string;
}

/**
 * SQL静的検査API - workspace内のMAINとPrivateCTEsをSchemaCollectorで検査
 */
export class SqlValidatorApi {
    
    /**
     * ワークスペース全体のSQL検査を実行
     */
    static async handleValidateWorkspace(_req: Request, res: Response): Promise<void> {
        try {
            const logger = Logger.getInstance();
            logger.info('Starting workspace SQL validation');
            
            const workspaceDir = path.join(process.cwd(), 'zosql', 'workspace');
            
            // workspace.jsonの存在確認
            const workspaceJsonPath = path.join(workspaceDir, 'workspace.json');
            if (!fs.existsSync(workspaceJsonPath)) {
                res.status(404).json({
                    success: false,
                    error: 'No workspace found. Please open a workspace first.',
                    results: [],
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // workspace.jsonの読み込み
            const workspaceContent = fs.readFileSync(workspaceJsonPath, 'utf-8');
            const workspaceInfo = JSON.parse(workspaceContent);
            
            const results: ValidationResult[] = [];

            // MAINクエリの検査
            const mainResult = await SqlValidatorApi.validateMainQuery(workspaceDir, workspaceInfo);
            if (mainResult) {
                results.push(mainResult);
            }

            // PrivateCTEsの検査
            const cteResults = await SqlValidatorApi.validatePrivateCTEs(workspaceDir, workspaceInfo);
            results.push(...cteResults);

            const response: ValidationResponse = {
                success: true,
                results,
                timestamp: new Date().toISOString()
            };

            logger.info(`Validation completed: ${results.length} files checked`);
            res.json(response);

        } catch (error) {
            const logger = Logger.getInstance();
            logger.error(`Workspace validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                results: [],
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * MAINクエリの検査
     */
    private static async validateMainQuery(workspaceDir: string, workspaceInfo: { name: string; [key: string]: unknown }): Promise<ValidationResult | null> {
        const logger = Logger.getInstance();
        try {
            // MAINクエリファイルのパス構築
            const mainFileName = `${workspaceInfo.name}.sql`;
            const mainFilePath = path.join(workspaceDir, mainFileName);

            if (!fs.existsSync(mainFilePath)) {
                logger.warn(`Main query file not found: ${mainFilePath}`);
                return null;
            }

            // SQLファイルの読み込み
            const sqlContent = fs.readFileSync(mainFilePath, 'utf-8');
            
            // SQL検査の実行
            const validationResult = SqlValidatorApi.validateSqlContent(sqlContent);

            return {
                type: 'main',
                name: workspaceInfo.name,
                filePath: mainFileName,
                isValid: validationResult.isValid,
                error: validationResult.error,
                schemaInfo: validationResult.schemaInfo
            };

        } catch (error) {
            logger.error(`Main query validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                type: 'main',
                name: workspaceInfo.name,
                filePath: `${workspaceInfo.name}.sql`,
                isValid: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * PrivateCTEsの検査
     */
    private static async validatePrivateCTEs(workspaceDir: string, _workspaceInfo: { [key: string]: unknown }): Promise<ValidationResult[]> {
        const logger = Logger.getInstance();
        const results: ValidationResult[] = [];
        const privateCteDir = path.join(workspaceDir, 'private-cte');

        if (!fs.existsSync(privateCteDir)) {
            logger.info('Private CTE directory not found');
            return results;
        }

        // private-cte内のすべての.sqlファイルを検査
        const cteFiles = fs.readdirSync(privateCteDir).filter(file => file.endsWith('.sql'));

        for (const cteFile of cteFiles) {
            try {
                const cteFilePath = path.join(privateCteDir, cteFile);
                const sqlContent = fs.readFileSync(cteFilePath, 'utf-8');
                
                // SQL検査の実行
                const validationResult = SqlValidatorApi.validateSqlContent(sqlContent);
                
                const cteName = path.basename(cteFile, '.sql');
                
                results.push({
                    type: 'cte',
                    name: cteName,
                    filePath: `private-cte/${cteFile}`,
                    isValid: validationResult.isValid,
                    error: validationResult.error,
                    schemaInfo: validationResult.schemaInfo
                });

            } catch (error) {
                logger.error(`CTE validation failed for ${cteFile}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                const cteName = path.basename(cteFile, '.sql');
                
                results.push({
                    type: 'cte',
                    name: cteName,
                    filePath: `private-cte/${cteFile}`,
                    isValid: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return results;
    }

    /**
     * SQLコンテンツの検査（SchemaCollectorを使用）
     */
    private static validateSqlContent(sqlContent: string): { isValid: boolean; error?: string; schemaInfo?: unknown } {
        const logger = Logger.getInstance();
        try {
            // 空文字やコメントのみの場合はスキップ
            const trimmedSql = sqlContent.trim();
            if (!trimmedSql || trimmedSql.startsWith('--')) {
                return {
                    isValid: true,
                    schemaInfo: []
                };
            }

            // rawsql-tsでSQLをパース
            const query = SelectQueryParser.parse(sqlContent);
            
            // SchemaCollectorで検査実行
            const collector = new SchemaCollector();
            const schemaInfo = collector.collect(query);

            logger.info(`SQL validation successful, schema collected: ${JSON.stringify(schemaInfo)}`);
            
            return {
                isValid: true,
                schemaInfo
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
            logger.error(`SQL validation failed: ${errorMessage}`);
            
            return {
                isValid: false,
                error: errorMessage
            };
        }
    }

    /**
     * 個別ファイルの検査（将来の拡張用）
     */
    static async handleValidateFile(req: Request, res: Response): Promise<void> {
        const logger = Logger.getInstance();
        try {
            const { type, fileName } = req.params;
            
            if (type !== 'main' && type !== 'cte') {
                res.status(400).json({
                    success: false,
                    error: 'Invalid file type. Must be "main" or "cte".'
                });
                return;
            }

            const workspaceDir = path.join(process.cwd(), 'zosql', 'workspace');
            let filePath: string;

            if (type === 'main') {
                filePath = path.join(workspaceDir, `${fileName}.sql`);
            } else {
                filePath = path.join(workspaceDir, 'private-cte', `${fileName}.sql`);
            }

            if (!fs.existsSync(filePath)) {
                res.status(404).json({
                    success: false,
                    error: `File not found: ${fileName}`
                });
                return;
            }

            const sqlContent = fs.readFileSync(filePath, 'utf-8');
            const validationResult = SqlValidatorApi.validateSqlContent(sqlContent);

            const result: ValidationResult = {
                type: type as 'main' | 'cte',
                name: fileName,
                filePath: type === 'main' ? `${fileName}.sql` : `private-cte/${fileName}.sql`,
                isValid: validationResult.isValid,
                error: validationResult.error,
                schemaInfo: validationResult.schemaInfo
            };

            res.json({
                success: true,
                results: [result],
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error(`File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
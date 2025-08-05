import { Request, Response } from 'express';
import { SelectQueryParser, SchemaCollector } from 'rawsql-ts';
import { Logger } from '../utils/logging.js';
import { SqlDecomposerParser } from '../adapters/parsers/sql-decomposer-parser.js';
import { LocalStorageWorkspaceStorage } from '../storage/localstorage-workspace-storage.js';

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
 * SQL static validation API - validates MAIN and PrivateCTEs in workspace using SchemaCollector
 */
export class SqlValidatorApi {
    private static storage = new LocalStorageWorkspaceStorage();
    
    /**
     * Execute SQL validation for entire workspace
     */
    static async handleValidateWorkspace(_req: Request, res: Response): Promise<void> {
        try {
            const logger = Logger.getInstance();
            logger.info('Starting workspace SQL validation');
            
            // Check if workspace exists in LocalStorage
            const hasWorkspace = await this.storage.hasWorkspace();
            if (!hasWorkspace) {
                res.status(404).json({
                    success: false,
                    error: 'No workspace found. Please open a workspace first.',
                    results: [],
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Load workspace from LocalStorage
            const workspaceInfo = await this.storage.getWorkspace();
            
            const results: ValidationResult[] = [];

            // Validate MAIN query
            const mainResult = await SqlValidatorApi.validateMainQuery(workspaceInfo as Record<string, unknown> | null);
            if (mainResult) {
                results.push(mainResult);
            }

            // Validate PrivateCTEs
            const cteResults = await SqlValidatorApi.validatePrivateCTEs();
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
     * Validate MAIN query
     */
    private static async validateMainQuery(workspaceInfo: Record<string, unknown> | null): Promise<ValidationResult | null> {
        const logger = Logger.getInstance();
        try {
            if (!workspaceInfo) {
                return null;
            }

            // Get main query content from workspace
            const mainQuery = workspaceInfo.decomposedQuery as string || workspaceInfo.originalQuery as string;
            if (!mainQuery) {
                logger.warn('No main query found in workspace');
                return null;
            }
            
            // Get all private CTEs from LocalStorage
            const privateCtes = await this.storage.getPrivateCtes();
            let composedSql = mainQuery;
            
            if (Object.keys(privateCtes).length > 0) {
                const cteDefinitions: string[] = [];
                
                for (const [cteName, cte] of Object.entries(privateCtes)) {
                    if (cte.query) {
                        cteDefinitions.push(`${cteName} AS (\n${cte.query}\n)`);
                    }
                }
                
                // Compose if CTE definitions exist
                if (cteDefinitions.length > 0) {
                    const { CteComposer } = await import('../utils/cte-composer.js');
                    const composer = new CteComposer();
                    const allCtes = cteDefinitions.join(',\n');
                    composedSql = composer.compose(mainQuery, allCtes);
                    logger.info(`Composed SQL with ${cteDefinitions.length} CTEs for validation`);
                }
            }
            
            // Execute validation with composed SQL
            logger.info(`Validating main query with ${composedSql.length} characters`);
            logger.debug(`Composed SQL content: ${composedSql.substring(0, 500)}...`);
            const validationResult = SqlValidatorApi.validateSqlContent(composedSql);

            return {
                type: 'main',
                name: workspaceInfo.name as string || 'unknown',
                filePath: `${workspaceInfo.name as string || 'unknown'}.sql`,
                isValid: validationResult.isValid,
                error: validationResult.error,
                schemaInfo: validationResult.schemaInfo
            };

        } catch (error) {
            logger.error(`Main query validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return {
                type: 'main',
                name: workspaceInfo?.name as string || 'unknown',
                filePath: `${workspaceInfo?.name as string || 'unknown'}.sql`,
                isValid: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Validate PrivateCTEs
     */
    private static async validatePrivateCTEs(): Promise<ValidationResult[]> {
        const logger = Logger.getInstance();
        const results: ValidationResult[] = [];

        try {
            // Get all private CTEs from LocalStorage
            const privateCtes = await this.storage.getPrivateCtes();
            
            if (Object.keys(privateCtes).length === 0) {
                logger.info('No private CTEs found');
                return results;
            }

            // Validate each CTE
            for (const [cteName, cte] of Object.entries(privateCtes)) {
                try {
                    // Analyze CTEs that this CTE depends on
                    const dependencies = await this.extractCteDependencies(cte.query);
                    
                    // Create composed SQL including dependent CTEs
                    let composedSql = cte.query;
                    const dependentCtes: string[] = [];
                    
                    for (const dep of dependencies) {
                        if (privateCtes[dep] && dep !== cteName) {
                            dependentCtes.push(`${dep} AS (\n${privateCtes[dep].query}\n)`);
                        }
                    }
                    
                    // Compose if dependent CTEs exist
                    if (dependentCtes.length > 0) {
                        const { CteComposer } = await import('../utils/cte-composer.js');
                        const composer = new CteComposer();
                        const allDependentCtes = dependentCtes.join(',\n');
                        // Add dummy SELECT to validate CTE as standalone SELECT query
                        const dummyQuery = `SELECT * FROM ${cteName}`;
                        composedSql = composer.compose(dummyQuery, `${allDependentCtes},\n${cteName} AS (\n${cte.query}\n)`);
                        logger.info(`Composed CTE ${cteName} with ${dependentCtes.length} dependencies for validation`);
                    }
                    
                    // Execute SQL validation
                    const validationResult = SqlValidatorApi.validateSqlContent(composedSql);
                    
                    results.push({
                        type: 'cte',
                        name: cteName,
                        filePath: `private-cte/${cteName}.sql`,
                        isValid: validationResult.isValid,
                        error: validationResult.error,
                        schemaInfo: validationResult.schemaInfo
                    });

                } catch (error) {
                    logger.error(`CTE validation failed for ${cteName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    
                    results.push({
                        type: 'cte',
                        name: cteName,
                        filePath: `private-cte/${cteName}.sql`,
                        isValid: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            return results;
        } catch (error) {
            logger.error(`Private CTEs validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return results;
        }
    }

    /**
     * Extract CTE dependencies
     */
    private static async extractCteDependencies(sql: string): Promise<string[]> {
        try {
            const parser = new SqlDecomposerParser();
            return await parser.extractDependencies(sql);
        } catch (error) {
            Logger.getInstance().warn(`Failed to extract CTE dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
        }
    }

    /**
     * Validate SQL content (using SchemaCollector)
     */
    private static validateSqlContent(sqlContent: string): { isValid: boolean; error?: string; schemaInfo?: unknown } {
        const logger = Logger.getInstance();
        try {
            // Skip if empty or comment-only
            const trimmedSql = sqlContent.trim();
            if (!trimmedSql || trimmedSql.startsWith('--')) {
                return {
                    isValid: true,
                    schemaInfo: []
                };
            }

            // Parse SQL with rawsql-ts
            const query = SelectQueryParser.parse(sqlContent);
            
            // Execute validation with SchemaCollector
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
     * Validate individual file (for future extension)
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

            let sqlContent = '';
            
            if (type === 'main') {
                // Get main query from workspace
                const workspace = await this.storage.getWorkspace();
                if (!workspace) {
                    res.status(404).json({
                        success: false,
                        error: 'No workspace found'
                    });
                    return;
                }
                sqlContent = (workspace as unknown as Record<string, unknown>).decomposedQuery as string || (workspace as unknown as Record<string, unknown>).originalQuery as string || '';
            } else {
                // Get CTE from LocalStorage
                const cte = await this.storage.getPrivateCte(fileName);
                if (!cte) {
                    res.status(404).json({
                        success: false,
                        error: `CTE not found: ${fileName}`
                    });
                    return;
                }
                sqlContent = cte.query;
            }

            if (!sqlContent) {
                res.status(404).json({
                    success: false,
                    error: `File not found: ${fileName}`
                });
                return;
            }

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
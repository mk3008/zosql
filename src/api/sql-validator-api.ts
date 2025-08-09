import { Request, Response } from 'express';
import { SelectQueryParser, SchemaCollector } from 'rawsql-ts';
import { Logger } from '../utils/logging.js';
import { SqlDecomposerParser } from '../adapters/parsers/sql-decomposer-parser.js';
import { LocalStorageWorkspaceStorage } from '../storage/localstorage-workspace-storage.js';
import * as Result from '../lib/functional/result.js';
import * as Option from '../lib/functional/option.js';

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

// ===== NEW FUNCTIONAL VERSIONS - BACKWARD COMPATIBLE =====

/**
 * Functional version: Validate SQL content
 * Returns Result type for explicit error handling
 */
export const validateSqlContentFunc = (sqlContent: string): Result.Result<{ schemaInfo: unknown }, string> => {
    const trimmedSql = sqlContent.trim();
    
    // Handle empty or comment-only content
    if (!trimmedSql || trimmedSql.startsWith('--')) {
        return Result.ok({ schemaInfo: [] });
    }
    
    const result = Result.tryCatch(() => {
        const query = SelectQueryParser.parse(sqlContent);
        const collector = new SchemaCollector();
        const schemaInfo = collector.collect(query);
        return { schemaInfo };
    });
    
    if (Result.isOk(result)) {
        return Result.ok(result.value);
    } else {
        return Result.err(result.error.message);
    }
};

/**
 * Functional version: Extract CTE dependencies
 * Returns Result type instead of throwing
 */
export const extractCteDependenciesFunc = async (sql: string): Promise<Result.Result<string[], Error>> => {
    return Result.asyncTryCatch(async () => {
        const parser = new SqlDecomposerParser();
        return await parser.extractDependencies(sql);
    });
};

/**
 * Functional version: Validate single CTE with dependencies
 * Allows parallel validation of dependencies
 */
export const validateCteWithDependenciesFunc = (
    privateCtes: Record<string, { query: string }>
) => async (
    cteName: string,
    cteContent: { query: string }
): Promise<Result.Result<ValidationResult, string>> => {
    // Extract dependencies
    const dependenciesResult = await extractCteDependenciesFunc(cteContent.query);
    const dependencies = Result.isOk(dependenciesResult) ? dependenciesResult.value : [];
    
    // Build composed SQL with dependencies
    const dependentCtes: string[] = [];
    for (const dep of dependencies) {
        if (privateCtes[dep] && dep !== cteName) {
            dependentCtes.push(`${dep} AS (\n${privateCtes[dep].query}\n)`);
        }
    }
    
    // Compose SQL for validation
    let composedSql = cteContent.query;
    if (dependentCtes.length > 0) {
        const { CteComposer } = await import('../utils/cte-composer.js');
        const composer = new CteComposer();
        const allDependentCtes = dependentCtes.join(',\n');
        const dummyQuery = `SELECT * FROM ${cteName}`;
        composedSql = composer.compose(dummyQuery, `${allDependentCtes},\n${cteName} AS (\n${cteContent.query}\n)`);
    }
    
    // Validate the composed SQL
    const validationResult = validateSqlContentFunc(composedSql);
    
    if (Result.isOk(validationResult)) {
        return Result.ok({
            type: 'cte' as const,
            name: cteName,
            filePath: `private-cte/${cteName}.sql`,
            isValid: true,
            schemaInfo: validationResult.value.schemaInfo
        });
    } else {
        return Result.err(validationResult.error);
    }
};

/**
 * Functional version: Validate all private CTEs in parallel
 * Returns array of validation results
 */
export const validatePrivateCTEsFunc = async (
    privateCtes: Record<string, { query: string }>
): Promise<ValidationResult[]> => {
    if (Object.keys(privateCtes).length === 0) {
        return [];
    }
    
    const validateCte = validateCteWithDependenciesFunc(privateCtes);
    
    // Create validation promises for parallel execution
    const validationPromises = Object.entries(privateCtes).map(
        async ([cteName, cte]) => {
            const result = await validateCte(cteName, cte);
            if (Result.isOk(result)) {
                return result.value;
            } else {
                return {
                    type: 'cte' as const,
                    name: cteName,
                    filePath: `private-cte/${cteName}.sql`,
                    isValid: false,
                    error: result.error
                };
            }
        }
    );
    
    // Execute all validations in parallel
    const results = await Promise.all(validationPromises);
    return results;
};

/**
 * Functional version: Validate main query with CTEs
 * Composes main query with private CTEs and validates
 */
export const validateMainQueryFunc = async (
    workspaceInfo: Option.Option<Record<string, unknown>>,
    privateCtes: Record<string, { query: string }>
): Promise<Option.Option<ValidationResult>> => {
    if (Option.isNone(workspaceInfo)) {
        return Option.none;
    }
    
    const info = workspaceInfo.value;
    const mainQuery = info.decomposedQuery as string || info.originalQuery as string;
    
    if (!mainQuery) {
        return Option.none;
    }
    
    try {
        // Compose with CTEs if they exist
        let composedSql = mainQuery;
        if (Object.keys(privateCtes).length > 0) {
            const cteDefinitions: string[] = [];
            for (const [cteName, cte] of Object.entries(privateCtes)) {
                if (cte.query) {
                    cteDefinitions.push(`${cteName} AS (\n${cte.query}\n)`);
                }
            }
            
            if (cteDefinitions.length > 0) {
                const { CteComposer } = await import('../utils/cte-composer.js');
                const composer = new CteComposer();
                const allCtes = cteDefinitions.join(',\n');
                composedSql = composer.compose(mainQuery, allCtes);
            }
        }
        
        // Validate the composed SQL
        const validationResult = validateSqlContentFunc(composedSql);
        
        if (Result.isOk(validationResult)) {
            return Option.some({
                type: 'main' as const,
                name: info.name as string || 'unknown',
                filePath: `${info.name as string || 'unknown'}.sql`,
                isValid: true,
                schemaInfo: validationResult.value.schemaInfo
            });
        } else {
            return Option.some({
                type: 'main' as const,
                name: info.name as string || 'unknown',
                filePath: `${info.name as string || 'unknown'}.sql`,
                isValid: false,
                error: validationResult.error
            });
        }
    } catch (error) {
        return Option.some({
            type: 'main' as const,
            name: info.name as string || 'unknown',
            filePath: `${info.name as string || 'unknown'}.sql`,
            isValid: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * Functional version: Parallel workspace validation
 * Validates main query and all CTEs in parallel
 */
export const validateWorkspaceFunc = async (
    storage: LocalStorageWorkspaceStorage
): Promise<Result.Result<ValidationResponse, string>> => {
    try {
        // Check workspace existence
        const hasWorkspace = await storage.hasWorkspace();
        if (!hasWorkspace) {
            return Result.err('No workspace found. Please open a workspace first.');
        }
        
        // Load workspace and CTEs
        const [workspaceInfo, privateCtes] = await Promise.all([
            storage.getWorkspace(),
            storage.getPrivateCtes()
        ]);
        
        // Execute validations in parallel
        const [mainResultOption, cteResults] = await Promise.all([
            validateMainQueryFunc(
                Option.fromNullable(workspaceInfo as unknown as Record<string, unknown>),
                privateCtes
            ),
            validatePrivateCTEsFunc(privateCtes)
        ]);
        
        // Combine results
        const results: ValidationResult[] = [];
        
        // Add main result if present
        if (Option.isSome(mainResultOption)) {
            results.push(mainResultOption.value);
        }
        
        // Add CTE results
        results.push(...cteResults);
        
        return Result.ok({
            success: true,
            results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        return Result.err(error instanceof Error ? error.message : 'Unknown error');
    }
};

/**
 * Functional version: Aggregate validation errors
 * Collects all errors from validation results
 */
export const aggregateValidationErrorsFunc = (
    results: ValidationResult[]
): { errors: string[]; failedFiles: string[] } => {
    return results.reduce(
        (acc, result) => {
            if (!result.isValid && result.error) {
                acc.errors.push(`${result.name}: ${result.error}`);
                acc.failedFiles.push(result.filePath);
            }
            return acc;
        },
        { errors: [], failedFiles: [] } as { errors: string[]; failedFiles: string[] }
    );
};

/**
 * Functional version: Validate with retry logic
 * Retries validation on transient failures
 */
export const validateWithRetryFunc = <T>(
    validateFn: () => Promise<Result.Result<T, string>>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<Result.Result<T, string>> => {
    return (async () => {
        let lastError: string = '';
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const result = await validateFn();
            
            if (Result.isOk(result)) {
                return result;
            }
            
            lastError = result.error;
            
            // Don't delay on last attempt
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
            }
        }
        
        return Result.err(`Validation failed after ${maxRetries} attempts: ${lastError}`);
    })();
};
/**
 * SQL Decomposer Hook
 * UI Layer - Hook for decomposing SQL into models
 */

import { useState, useCallback, useMemo } from 'react';
import { SqlModelEntity } from '@shared/types';
import { SqlDecomposerUseCase } from '@core/usecases/sql-decomposer-usecase';
import { SqlDecomposerParser } from '@adapters/parsers/sql-decomposer-parser';
import { CteDependencyAnalyzerAdapter } from '@adapters/dependency-analyzer/cte-dependency-analyzer-adapter';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';

interface UseSqlDecomposerResult {
  decomposeSql: (sql: string, fileName: string, formatterEntity?: SqlFormatterEntity) => Promise<SqlModelEntity[]>;
  reconstructSql: (models: SqlModelEntity[], mainModelName: string) => Promise<string>;
  isDecomposing: boolean;
  error: string | null;
  models: SqlModelEntity[];
  clearModels: () => void;
}

export const useSqlDecomposer = (): UseSqlDecomposerResult => {
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<SqlModelEntity[]>([]);

  // Initialize dependencies
  const decomposer = useMemo(() => {
    const parser = new SqlDecomposerParser();
    const analyzer = new CteDependencyAnalyzerAdapter();
    return new SqlDecomposerUseCase(parser, analyzer);
  }, []);

  const decomposeSql = useCallback(async (
    sql: string, 
    fileName: string,
    formatterEntity?: SqlFormatterEntity
  ): Promise<SqlModelEntity[]> => {
    setIsDecomposing(true);
    setError(null);

    try {
      const decomposedModels = await decomposer.decomposeSql(sql, fileName, formatterEntity);
      setModels(decomposedModels);
      return decomposedModels;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decompose SQL';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsDecomposing(false);
    }
  }, [decomposer]);

  const reconstructSql = useCallback(async (
    models: import('@core/entities/sql-model').SqlModelEntity[], 
    mainModelName: string
  ): Promise<string> => {
    try {
      return await decomposer.reconstructSql(models, mainModelName);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reconstruct SQL';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [decomposer]);

  const clearModels = useCallback(() => {
    setModels([]);
    setError(null);
  }, []);

  return {
    decomposeSql,
    reconstructSql: reconstructSql as any,
    isDecomposing,
    error,
    models,
    clearModels
  };
};
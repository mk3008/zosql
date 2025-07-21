/**
 * SQL Models List Component
 * Displays decomposed SQL models (CTEs and main query) in the workspace
 */

import React from 'react';
import { SqlModelEntity } from '@shared/types';

interface SqlModelsListProps {
  models: SqlModelEntity[];
  onModelClick?: (model: SqlModelEntity) => void;
  selectedModelName?: string;
}

export const SqlModelsList: React.FC<SqlModelsListProps> = ({ 
  models, 
  onModelClick,
  selectedModelName 
}) => {
  if (!models || models.length === 0) {
    return (
      <div className="text-sm text-dark-text-muted">
        No SQL models loaded
      </div>
    );
  }

  // Separate main queries and CTEs
  const mainModels = models.filter(m => m.type === 'main');
  const cteModels = models.filter(m => m.type === 'cte');

  return (
    <div className="space-y-4">
      {/* Main Query Section */}
      {mainModels.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-dark-text-secondary uppercase mb-2">
            Main Queries
          </h4>
          <div className="space-y-1">
            {mainModels.map((model) => (
              <div
                key={model.name}
                onClick={() => onModelClick?.(model)}
                className={`
                  p-2 rounded cursor-pointer transition-all
                  ${selectedModelName === model.name 
                    ? 'bg-primary-600 text-white' 
                    : 'hover:bg-dark-hover text-dark-text-primary'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">📄</span>
                    <span className="text-sm font-medium">{model.name}</span>
                  </div>
                  {model.dependents.length > 0 && (
                    <span className={`text-xs ${
                      selectedModelName === model.name 
                        ? 'text-white opacity-80' 
                        : 'text-dark-text-secondary'
                    }`}>
                      {model.dependents.length} deps
                    </span>
                  )}
                </div>
                {model.dependents.length > 0 && (
                  <div className={`text-xs mt-1 ${
                    selectedModelName === model.name 
                      ? 'text-white opacity-80' 
                      : 'text-dark-text-muted'
                  }`}>
                    Uses: {model.dependents.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTE Section */}
      {cteModels.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-dark-text-secondary uppercase mb-2">
            CTEs ({cteModels.length})
          </h4>
          <div className="space-y-1">
            {cteModels.map((model) => (
              <div
                key={model.name}
                onClick={() => onModelClick?.(model)}
                className={`
                  p-2 rounded cursor-pointer transition-all
                  ${selectedModelName === model.name 
                    ? 'bg-primary-600 text-white' 
                    : 'hover:bg-dark-hover text-dark-text-primary'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🔗</span>
                    <span className="text-sm font-medium">{model.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {model.columns && model.columns.length > 0 && (
                      <span className={`text-xs ${
                        selectedModelName === model.name 
                          ? 'text-white opacity-80' 
                          : 'text-dark-text-secondary'
                      }`}>
                        {model.columns.length} cols
                      </span>
                    )}
                    {model.dependents.length > 0 && (
                      <span className={`text-xs ${
                        selectedModelName === model.name 
                          ? 'text-white opacity-80' 
                          : 'text-dark-text-secondary'
                      }`}>
                        {model.dependents.length} deps
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Show columns if available */}
                {model.columns && model.columns.length > 0 && (
                  <div className={`text-xs mt-1 ${
                    selectedModelName === model.name 
                      ? 'text-white opacity-80' 
                      : 'text-dark-text-muted'
                  }`}>
                    Columns: {model.columns.join(', ')}
                  </div>
                )}
                
                {/* Show dependents */}
                {model.dependents.length > 0 && (
                  <div className={`text-xs mt-1 ${
                    selectedModelName === model.name 
                      ? 'text-white opacity-80' 
                      : 'text-dark-text-muted'
                  }`}>
                    Used by: {model.dependents.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependency Summary */}
      {cteModels.length > 0 && (
        <div className="mt-4 pt-4 border-t border-dark-border-primary">
          <h4 className="text-xs font-medium text-dark-text-secondary uppercase mb-2">
            Dependency Summary
          </h4>
          <div className="text-xs text-dark-text-muted space-y-1">
            <div>Total models: {models.length}</div>
            <div>Main queries: {mainModels.length}</div>
            <div>CTEs: {cteModels.length}</div>
            {cteModels.length > 0 && (
              <div>
                Max depth: {calculateMaxDepth(models)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Calculate maximum dependency depth in the model graph
 */
function calculateMaxDepth(models: SqlModelEntity[]): number {
  const modelMap = new Map(models.map(m => [m.name, m]));
  const depths = new Map<string, number>();
  
  function getDepth(modelName: string, visited: Set<string> = new Set()): number {
    if (depths.has(modelName)) {
      return depths.get(modelName)!;
    }
    
    if (visited.has(modelName)) {
      return 0; // Circular dependency
    }
    
    visited.add(modelName);
    const model = modelMap.get(modelName);
    
    if (!model || model.dependents.length === 0) {
      depths.set(modelName, 0);
      return 0;
    }
    
    const maxDepDepth = Math.max(
      ...model.dependents
        .filter((dep: any) => modelMap.has(dep.name))
        .map((dep: any) => getDepth(dep.name, new Set(visited)))
    );
    
    const depth = 1 + maxDepDepth;
    depths.set(modelName, depth);
    return depth;
  }
  
  let maxDepth = 0;
  for (const model of models) {
    maxDepth = Math.max(maxDepth, getDepth(model.name));
  }
  
  return maxDepth;
}
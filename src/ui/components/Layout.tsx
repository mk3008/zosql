import React, { useState, useRef, useEffect } from 'react';
import { Header } from './Header';
import { LeftSidebar } from './LeftSidebar';
import { MainContentMvvm as MainContent, MainContentRef } from './MainContentMvvm';
import { RightSidebar } from './RightSidebar';
import { Toast } from './Toast';
import { ErrorPanel } from './ErrorPanel';
import { useSqlDecomposer } from '@ui/hooks/useSqlDecomposer';
import { SqlModelEntity } from '@core/entities/sql-model';
import { useToast } from '@ui/hooks/useToast';
import { useErrorPanel } from '@ui/hooks/useErrorPanel';
import { WorkspaceEntity } from '@core/entities/workspace';
import { createValidatedDemoWorkspace } from '@core/factories/demo-workspace-factory';
import { CreateWorkspaceCommand } from '@ui/commands/create-workspace-command';
import { commandExecutor } from '@core/services/command-executor';
import { DebugLogger } from '../../utils/debug-logger';

/**
 * Read file content as text
 */
function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

export const Layout: React.FC = () => {
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [selectedModelName, setSelectedModelName] = useState<string>();
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceEntity | null>(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [lastExecutedSql, setLastExecutedSql] = useState<string>('');
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [leftSidebarKey, setLeftSidebarKey] = useState(0); // Force re-render key
  const hasLoadedWorkspace = useRef(false);
  const mainContentRef = useRef<MainContentRef>(null);
  
  // SQL decomposer hook
  const { decomposeSql, isDecomposing, error } = useSqlDecomposer();
  
  
  // Toast notifications
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  // Error panel
  const { errors, addError, clearError, clearAllErrors } = useErrorPanel();
  
  const handleModelClick = (model: SqlModelEntity) => {
    console.log('[DEBUG] handleModelClick called for model:', model.name);
    console.log('[DEBUG] Current state - selectedModelName:', selectedModelName, 'activeTabId:', activeTabId);
    // Update both states synchronously to prevent flicker
    setSelectedModelName(model.name);
    setActiveTabId(model.name);
    console.log('[DEBUG] State updated - selectedModelName:', model.name, 'activeTabId:', model.name);
    // Open model in editor tab with entity reference (SQL is already formatted during creation)
    mainContentRef.current?.openSqlModel(model.name, model.sqlWithoutCte, model.type, model);
  };
  
  // Handle SQL decomposition when requested
  const handleDecomposeQuery = async () => {
    const currentSql = mainContentRef.current?.getCurrentSql();
    if (!currentSql) {
      showError('No SQL content to decompose');
      return;
    }
    
    try {
      // Use the main tab name as filename
      const fileName = 'main.sql'; // TODO: Get actual file name from active tab
      const models = await decomposeSql(currentSql, fileName);
      showSuccess(`Decomposed into ${models.length} SQL models`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to decompose SQL');
    }
  };
  
  // Handle file open with automatic decomposition and workspace creation  
  const handleFileOpen = async (file: File) => {
    try {
      // Clear all existing tabs and workspace content before opening new file
      mainContentRef.current?.clearAllTabs();
      
      // Read file content
      const content = await readFileContent(file);
      const fileName = file.name.replace(/\.sql$/i, '');
      
      // Use CreateWorkspaceCommand to ensure correct dependency setup
      const command = new CreateWorkspaceCommand(fileName, content);
      const workspace = await commandExecutor.execute(command);
      
      
      setCurrentWorkspace(workspace);
      
      // Save workspace to localStorage
      try {
        localStorage.setItem('zosql_workspace_v3', JSON.stringify(workspace.toJSON()));
      } catch (error) {
        console.warn('Failed to save workspace to localStorage:', error);
      }
      
      // Open the main SQL model from workspace (processed data)
      const mainModel = workspace.sqlModels.find(m => m.type === 'main');
      if (mainModel) {
        console.log('[DEBUG] Setting initial selectedModelName to:', mainModel.name);
        // Set initial selectedModelName and activeTabId
        setSelectedModelName(mainModel.name);
        setActiveTabId(mainModel.name);
        
        // Use processed sqlWithoutCte instead of original file content
        mainContentRef.current?.openSqlModel(
          mainModel.name, 
          mainModel.sqlWithoutCte, 
          'main',
          mainModel  // Pass the model entity for proper integration
        );
      }
      
      showSuccess(`Opened ${file.name} with ${workspace.sqlModels.length} models`);
      
      // Automatically analyze all schemas after opening file
      console.log('[DEBUG] Starting automatic static analysis after file open');
      try {
        await workspace.validateAllSchemas();
        
        // Check validation results
        const modelsToValidate = workspace.sqlModels.filter(model => 
          model.type === 'main' || model.type === 'cte'
        );
        
        const failedModels = modelsToValidate
          .map(model => ({ 
            model, 
            result: workspace.getValidationResult(model.name) 
          }))
          .filter(({ result }) => result && !result.success);
        
        if (failedModels.length > 0) {
          const errorSummary = `Static analysis found issues in ${failedModels.length} model(s)`;
          const errorDetails = failedModels
            .map(({ model, result }) => `${model.name}: ${result?.error || 'Unknown error'}`)
            .join('\n');
          
          addError(errorSummary, errorDetails);
        } else {
          console.log('[DEBUG] All schemas analyzed successfully');
        }
      } catch (validationError) {
        console.error('[DEBUG] Static analysis failed:', validationError);
        // Continue anyway - validation failure shouldn't prevent file opening
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to open file');
    }
  };
  
  // Load workspace on mount
  useEffect(() => {
    const loadSavedWorkspace = async () => {
      if (isWorkspaceLoading || hasLoadedWorkspace.current) return; // Prevent multiple executions
      hasLoadedWorkspace.current = true;
      setIsWorkspaceLoading(true);
      
      try {
        const saved = localStorage.getItem('zosql_workspace_v3');
        console.log('[DEBUG] Loading saved workspace from localStorage:', saved ? 'found' : 'not found');
        
        if (saved) {
          const workspaceData = JSON.parse(saved);
          console.log('[DEBUG] Saved workspace data:', workspaceData);
          
          // Check if this is an old workspace that needs to be reset
          if (workspaceData.name === 'syokiworkspace' || 
              !workspaceData.testValues?.withClause ||
              !workspaceData.openedObjects ||
              !workspaceData.layoutState) {
            console.log('[DEBUG] Old workspace detected (missing openedObjects/layoutState), will create new demoworkspace');
            localStorage.removeItem('zosql_workspace_v3'); // Clear old data
            // Continue to create new workspace below
          } else {
            console.log('[DEBUG] Valid workspace found, restoring it');
            const workspace = WorkspaceEntity.fromJSON(workspaceData);
            console.log('[DEBUG] Loaded workspace:', workspace.name, 'testValues:', workspace.testValues.withClause);
            setCurrentWorkspace(workspace);
            
            console.log('[DEBUG] Loaded workspace with opened objects:', workspace.openedObjects.length);
            
            // Restore tabs from workspace opened objects
            if (workspace.openedObjects.length > 0 && mainContentRef.current) {
              console.log('[DEBUG] Restoring tabs from workspace opened objects');
              
              // Clear any existing tabs first to prevent duplicates
              mainContentRef.current.clearAllTabs();
              
              for (const openedObject of workspace.openedObjects) {
                console.log('[DEBUG] Restoring tab:', openedObject.id, openedObject.type);
                
                if (openedObject.type === 'main' || openedObject.type === 'cte') {
                  // Find the corresponding SQL model
                  const model = workspace.sqlModels.find(m => m.name === openedObject.id);
                  if (model) {
                    mainContentRef.current.openSqlModel(
                      openedObject.id, 
                      openedObject.content, 
                      openedObject.type,
                      model
                    );
                  }
                } else if (openedObject.type === 'values') {
                  mainContentRef.current.openValuesTab();
                } else if (openedObject.type === 'formatter') {
                  mainContentRef.current.openFormatterTab();
                } else if (openedObject.type === 'condition') {
                  mainContentRef.current.openConditionTab();
                }
              }
              
              // Set active tab to the workspace's active object
              if (workspace.activeObjectId) {
                console.log('[DEBUG] Setting active tab to:', workspace.activeObjectId);
                setActiveTabId(workspace.activeObjectId);
                
                // Also set selectedModelName if it's a SQL model
                const activeObject = workspace.openedObjects.find(obj => obj.id === workspace.activeObjectId);
                if (activeObject && (activeObject.type === 'main' || activeObject.type === 'cte')) {
                  setSelectedModelName(workspace.activeObjectId);
                }
              }
            } else {
              // No opened objects - set initial selectedModelName for main model only
              const mainModel = workspace.sqlModels.find(m => m.type === 'main');
              if (mainModel) {
                console.log('[DEBUG] No opened objects, setting initial selectedModelName from saved workspace to:', mainModel.name);
                setSelectedModelName(mainModel.name);
                setActiveTabId(mainModel.name);
              }
            }
            
            // Automatically validate all schemas after loading workspace
            console.log('[DEBUG] Starting automatic static analysis after workspace load');
            try {
              await workspace.validateAllSchemas();
              
              // Check validation results but don't show errors on initial load
              const modelsToValidate = workspace.sqlModels.filter(model => 
                model.type === 'main' || model.type === 'cte'
              );
              
              const failedModels = modelsToValidate
                .map(model => ({ 
                  model, 
                  result: workspace.getValidationResult(model.name) 
                }))
                .filter(({ result }) => result && !result.success);
              
              if (failedModels.length > 0) {
                console.log('[DEBUG] Schema validation found issues in', failedModels.length, 'models on initial load');
              } else {
                console.log('[DEBUG] All schemas validated successfully on initial load');
              }
            } catch (validationError) {
              console.error('[DEBUG] Schema validation failed on initial load:', validationError);
              // Continue anyway - validation failure shouldn't prevent workspace loading
            }
            
            setIsWorkspaceLoading(false);
            return; // Exit early - workspace loaded successfully, don't create demo workspace
          }
        }
        
        // Create initial workspace for main.sql if no saved workspace exists OR old workspace was cleared
        console.log('[DEBUG] Creating new demoworkspace using factory');
        
        let initialWorkspace: WorkspaceEntity;
        try {
          initialWorkspace = createValidatedDemoWorkspace();
          console.log('[DEBUG] Created workspace with testValues:', initialWorkspace.testValues.withClause);
          console.log('[DEBUG] Initialized FilterConditions:', initialWorkspace.filterConditions.displayString);
          
          setCurrentWorkspace(initialWorkspace);
          
          // Set initial selectedModelName for main model
          const mainModel = initialWorkspace.sqlModels.find(m => m.type === 'main');
          if (mainModel) {
            console.log('[DEBUG] Setting initial selectedModelName from new workspace to:', mainModel.name);
            setSelectedModelName(mainModel.name);
            setActiveTabId(mainModel.name);
          }
          
          console.log('[DEBUG] Created workspace with opened objects:', initialWorkspace.openedObjects.length);
          
          // Automatically validate all schemas after creating new workspace
          console.log('[DEBUG] Starting automatic static analysis after workspace creation');
          try {
            await initialWorkspace.validateAllSchemas();
            
            // Check validation results
            const modelsToValidate = initialWorkspace.sqlModels.filter(model => 
              model.type === 'main' || model.type === 'cte'
            );
            
            const failedModels = modelsToValidate
              .map(model => ({ 
                model, 
                result: initialWorkspace.getValidationResult(model.name) 
              }))
              .filter(({ result }) => result && !result.success);
            
            if (failedModels.length > 0) {
              console.log('[DEBUG] Schema validation found issues in', failedModels.length, 'models in demo workspace');
            } else {
              console.log('[DEBUG] All schemas validated successfully in demo workspace');
            }
          } catch (validationError) {
            console.error('[DEBUG] Schema validation failed for demo workspace:', validationError);
            // Continue anyway - validation failure shouldn't prevent workspace creation
          }
        } catch (error) {
          console.error('[ERROR] Failed to create demo workspace:', error);
          showError('Failed to create initial workspace');
          return;
        }
        
        // Save initial workspace to localStorage
        try {
          localStorage.setItem('zosql_workspace_v3', JSON.stringify(initialWorkspace.toJSON()));
          console.log('[DEBUG] Saved new workspace to localStorage');
        } catch (error) {
          console.warn('Failed to save initial workspace to localStorage:', error);
        }
      } catch (error) {
        console.error('[ERROR] Failed to load or create workspace:', error);
        showError('Failed to load workspace');
      } finally {
        setIsWorkspaceLoading(false);
      }
    };

    loadSavedWorkspace();
  }, []);

  // Watch for decomposition errors
  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col">
      {/* Header */}
      <Header 
        onToggleLeftSidebar={() => setLeftSidebarVisible(!leftSidebarVisible)}
        onToggleRightSidebar={() => setRightSidebarVisible(!rightSidebarVisible)}
        leftSidebarVisible={leftSidebarVisible}
        rightSidebarVisible={rightSidebarVisible}
        onFileOpen={handleFileOpen}
        onWorkspaceCreated={(workspace) => {
          try {
            let workspaceEntity;
            const isFromJson = workspace && typeof workspace.toJSON !== 'function';
            
            // Check if workspace is already a WorkspaceEntity or raw JSON data
            if (workspace && typeof workspace.toJSON === 'function') {
              // Already a WorkspaceEntity
              workspaceEntity = workspace;
            } else {
              // Raw JSON data - restore it
              console.log('[DEBUG] Restoring workspace from JSON:', workspace);
              
              // Clear all existing tabs when loading from JSON
              if (mainContentRef.current) {
                console.log('[DEBUG] Clearing all tabs before loading JSON workspace');
                mainContentRef.current.clearAllTabs();
              }
              
              workspaceEntity = WorkspaceEntity.fromJSON(workspace as unknown as Record<string, unknown>);
            }
            
            setCurrentWorkspace(workspaceEntity);
            
            // Set initial selectedModelName for main model
            const mainModel = workspaceEntity.sqlModels.find(m => m.type === 'main');
            if (mainModel) {
              setSelectedModelName(mainModel.name);
              setActiveTabId(mainModel.name);
            }
            
            // Restore tabs from workspace opened objects (JSON restored workspace)
            if (isFromJson && workspaceEntity.openedObjects.length > 0 && mainContentRef.current) {
              console.log('[DEBUG] Restoring tabs from JSON workspace opened objects');
              setTimeout(() => {
                // Use setTimeout to ensure mainContentRef is ready
                if (mainContentRef.current) {
                  for (const openedObject of workspaceEntity.openedObjects) {
                    console.log('[DEBUG] Restoring JSON tab:', openedObject.id, openedObject.type);
                    
                    if (openedObject.type === 'main' || openedObject.type === 'cte') {
                      // Find the corresponding SQL model
                      const model = workspaceEntity.sqlModels.find(m => m.name === openedObject.id);
                      if (model) {
                        mainContentRef.current!.openSqlModel(
                          openedObject.id, 
                          openedObject.content, 
                          openedObject.type,
                          model
                        );
                      }
                    } else if (openedObject.type === 'values') {
                      mainContentRef.current!.openValuesTab();
                    } else if (openedObject.type === 'formatter') {
                      mainContentRef.current!.openFormatterTab();
                    } else if (openedObject.type === 'condition') {
                      mainContentRef.current!.openConditionTab();
                    }
                  }
                  
                  // Set active tab to the workspace's active object
                  if (workspaceEntity.activeObjectId) {
                    console.log('[DEBUG] Setting active tab from JSON to:', workspaceEntity.activeObjectId);
                    setActiveTabId(workspaceEntity.activeObjectId);
                    
                    // Also set selectedModelName if it's a SQL model
                    const activeObject = workspaceEntity.openedObjects.find(obj => obj.id === workspaceEntity.activeObjectId);
                    if (activeObject && (activeObject.type === 'main' || activeObject.type === 'cte')) {
                      setSelectedModelName(workspaceEntity.activeObjectId);
                    }
                  }
                }
              }, 100);
            }
            
            // Save to localStorage
            try {
              localStorage.setItem('zosql_workspace_v3', JSON.stringify(workspaceEntity.toJSON()));
              showSuccess(isFromJson ? 'Workspace loaded successfully' : 'Workspace created successfully');
            } catch (error) {
              console.warn('Failed to save workspace to localStorage:', error);
            }
            
            // Run static analysis for JSON loaded workspaces
            if (isFromJson && mainContentRef.current) {
              console.log('[DEBUG] Running static analysis for loaded JSON workspace');
              setTimeout(() => {
                // Use setTimeout to ensure workspace is fully loaded
                if (mainContentRef.current) {
                  mainContentRef.current.runStaticAnalysis();
                }
              }, 100);
            }
          } catch (error) {
            console.error('Failed to process workspace:', error);
            showError('Failed to load workspace: ' + (error instanceof Error ? error.message : 'Unknown error'));
          }
        }}
        onWorkspaceSave={() => {
          if (currentWorkspace) {
            try {
              const workspaceJson = currentWorkspace.toJSON();
              const dataStr = JSON.stringify(workspaceJson, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              
              const link = document.createElement('a');
              link.href = URL.createObjectURL(dataBlob);
              link.download = `${workspaceJson.name || 'workspace'}.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              showSuccess('Workspace saved successfully');
            } catch (error) {
              console.error('Failed to save workspace:', error);
              showError('Failed to save workspace');
            }
          }
        }}
        onViewFinalSql={async () => {
          if (!currentWorkspace) {
            return { sql: '', error: 'No workspace available' };
          }
          
          try {
            const finalSql = await currentWorkspace.generateFinalSql();
            return { sql: finalSql };
          } catch (error) {
            console.error('Failed to generate Final SQL:', error);
            return { 
              sql: '', 
              error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
          }
        }}
        currentWorkspace={currentWorkspace}
      />
      
      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {leftSidebarVisible && (
          <LeftSidebar 
            key={leftSidebarKey} // Force re-render when static analysis completes
            onOpenValuesTab={() => {
              console.log('[DEBUG] onOpenValuesTab called');
              console.log('[DEBUG] Current state - selectedModelName:', selectedModelName, 'activeTabId:', activeTabId);
              // Update states synchronously to prevent flicker
              setActiveTabId('values');
              // Keep selectedModelName as is - don't clear it to avoid flicker
              console.log('[DEBUG] State updated - selectedModelName: unchanged, activeTabId: values');
              mainContentRef.current?.openValuesTab();
            }} 
            sqlModels={currentWorkspace?.sqlModels || []}
            onModelClick={handleModelClick as any}
            selectedModelName={selectedModelName}
            onDecomposeQuery={handleDecomposeQuery}
            isDecomposing={isDecomposing}
            workspace={currentWorkspace}
            activeTabId={activeTabId}
            showErrorWithDetails={addError}
            showSuccess={showSuccess}
            mainContentRef={mainContentRef}
          />
        )}
        
        {/* Main Content Area */}
        <MainContent 
          ref={mainContentRef} 
          workspace={currentWorkspace}
          showSuccess={showSuccess}
          showError={showError}
          showErrorWithDetails={addError}
          onActiveTabChange={(tabId) => {
            console.log('[DEBUG] onActiveTabChange called with tabId:', tabId, 'current activeTabId:', activeTabId);
            // Only update if tabId actually changed to prevent unnecessary re-renders
            if (activeTabId !== tabId) {
              console.log('[DEBUG] Updating activeTabId from', activeTabId, 'to', tabId);
              // Update active tab ID first
              setActiveTabId(tabId);
              
              // Sync left sidebar selection with active tab only for model tabs
              if (tabId && currentWorkspace && tabId !== 'values') {
                const model = currentWorkspace.sqlModels.find(m => m.name === tabId);
                if (model) {
                  console.log('[DEBUG] Setting selectedModelName to:', model.name);
                  setSelectedModelName(model.name);
                } else {
                  console.log('[DEBUG] No model found for tabId:', tabId);
                  // Don't clear selectedModelName if no model found
                }
              }
              // Don't clear selectedModelName when switching to values tab to avoid flicker
            } else {
              console.log('[DEBUG] activeTabId unchanged, skipping update');
            }
          }}
          onSqlExecuted={(sql) => setLastExecutedSql(sql)}
          onAnalysisUpdated={() => {
            DebugLogger.info('Layout', 'Analysis updated notification from MainContent');
            // Get the updated workspace from MainContent's ViewModel
            const updatedWorkspace = mainContentRef.current?.getWorkspace?.();
            if (updatedWorkspace) {
              DebugLogger.info('Layout', 'Updating Layout currentWorkspace with validation results');
              setCurrentWorkspace(updatedWorkspace);
            }
            // Force LeftSidebar re-render to update validation icons
            setLeftSidebarKey(prev => {
              const newKey = prev + 1;
              DebugLogger.debug('Layout', `LeftSidebar key updated: ${prev} -> ${newKey}`);
              return newKey;
            });
          }}
        />
        
        {/* Right Sidebar */}
        {rightSidebarVisible && (
          <RightSidebar 
            lastExecutedSql={lastExecutedSql}
            workspace={currentWorkspace}
          />
        )}
      </div>
      
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
      
      {/* Error Panel */}
      <ErrorPanel
        errors={errors}
        onClearError={clearError}
        onClearAll={clearAllErrors}
      />
    </div>
  );
};
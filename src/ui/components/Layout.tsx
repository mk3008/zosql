// MainContentMvvm removed - functionality moved to MainContent component
// CreateWorkspaceCommand removed - functionality moved to useNewWorkspace hook
// CommandExecutor removed - functionality moved to functional services
import React, { useState, useEffect, useRef } from 'react';
import { DebugLogger } from '../../utils/debug-logger';
import { WorkspaceEntity, SqlModelEntity } from '@shared/types';
import { Header } from './Header';
import { LeftSidebar } from './LeftSidebar';
// Phase 3: Use MainContentFunctional (complete functional implementation)
import { MainContentFunctional as MainContent, MainContentRef as MainContentHandle } from './MainContentFunctional';
import { RightSidebar } from './RightSidebar';
import { Toast } from './Toast';
import { ErrorPanel } from './ErrorPanel';
import { StableResizableLayout } from './StableResizableLayout';
import { useSqlDecomposer } from '@ui/hooks/useSqlDecomposer';
import { useToast } from '@ui/hooks/useToast';
import { useErrorPanel } from '@ui/hooks/useErrorPanel';
import { createValidatedDemoWorkspace } from '../../core/factories/demo-workspace-factory';

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

// MainContent ref interface - now implemented
// Using MainContentHandle from MainContent.tsx

interface LayoutProps {
  forceDemo?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ forceDemo }) => {
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [selectedModelName, setSelectedModelName] = useState<string>();
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceEntity | null>(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [lastExecutedSql] = useState<string>('');
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [leftSidebarKey] = useState(0); // Force re-render key
  const hasLoadedWorkspace = useRef(false);
  const mainContentRef = useRef<MainContentHandle>(null);
  
  // SQL decomposer hook
  const { decomposeSql, isDecomposing, error } = useSqlDecomposer();
  
  
  // Toast notifications
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  // Error panel
  const { errors, addError, clearError, clearAllErrors } = useErrorPanel();
  
  const handleModelClick = (model: SqlModelEntity) => {
    DebugLogger.debug('Layout', 'handleModelClick called for model:', model.name);
    DebugLogger.debug('Layout', 'Current state - selectedModelName:', selectedModelName, 'activeTabId:', activeTabId);
    // Update both states synchronously to prevent flicker
    setSelectedModelName(model.name);
    setActiveTabId(model.name);
    DebugLogger.debug('Layout', 'State updated - selectedModelName:', model.name, 'activeTabId:', model.name);
    // Open model in editor tab with entity reference (SQL is already formatted during creation)
    if (mainContentRef.current) {
      mainContentRef.current.openSqlModel(model.name, model.sqlWithoutCte, model.type, model);
    }
  };
  
  // Handle SQL decomposition when requested
  const handleDecomposeQuery = async () => {
    const currentSql = mainContentRef.current?.getCurrentSql?.();
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
      // MainContent method removed - needs functional implementation
    // mainContentRef.current?.$1();
      
      // Read file content
      await readFileContent(file);
      // const fileName = file.name.replace(/\.sql$/i, ''); // TODO: Use when implementing functional workspace creation
      
      // CreateWorkspaceCommand removed - using direct workspace creation
      console.warn('[LAYOUT] CreateWorkspaceCommand removed - needs functional implementation');
      // TODO: Implement functional workspace creation
      // For now, return early to prevent null workspace errors
      showError('File opening functionality needs to be reimplemented without Command pattern');
      return;
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
        // If forceDemo is true, skip loading saved workspace and create demo
        if (forceDemo) {
          DebugLogger.debug('Layout', 'Force demo mode enabled, skipping saved workspace');
          // Jump to demo creation below
        } else {
          const saved = localStorage.getItem('zosql_workspace_v3');
          DebugLogger.debug('Layout', 'Loading saved workspace from localStorage:', saved ? 'found' : 'not found');
        
          // Debug: Show actual localStorage content
          if (saved) {
          try {
            const parsedData = JSON.parse(saved);
            DebugLogger.debug('Layout', 'Saved workspace openedObjects count:', parsedData.openedObjects?.length || 0);
            DebugLogger.debug('Layout', 'Saved workspace activeObjectId:', parsedData.activeObjectId);
            if (parsedData.openedObjects?.length > 0) {
              DebugLogger.debug('Layout', 'Saved opened objects:', parsedData.openedObjects.map((obj: unknown) => {
                const typedObj = obj as { id?: string; type?: string };
                return `${typedObj.id} (${typedObj.type})`;
              }).join(', '));
            }
          } catch (e) {
            DebugLogger.warn('Layout', 'Failed to parse localStorage data for debugging:', e);
          }
        }
        
        if (saved) {
          const workspaceData = JSON.parse(saved);
          DebugLogger.debug('Layout', 'Saved workspace data:', workspaceData);
          
          // Check if this is an old workspace that needs to be reset  
          // Only reset if it's the specific old workspace name or completely missing core structure
          if (workspaceData.name === 'syokiworkspace' || 
              !workspaceData.sqlModels || 
              !Array.isArray(workspaceData.sqlModels) ||
              workspaceData.sqlModels.length === 0) {
            DebugLogger.info('Layout', 'Old workspace detected (missing core structure), will create new demoworkspace');
            localStorage.removeItem('zosql_workspace_v3'); // Clear old data
            // Continue to create new workspace below
          } else {
            DebugLogger.info('Layout', 'Valid workspace found, restoring it');
            const workspace = WorkspaceEntity.fromJSON(workspaceData);
            DebugLogger.debug('Layout', 'Loaded workspace:', workspace.name, 'testValues:', workspace.testValues.withClause);
            setCurrentWorkspace(workspace);
            
            DebugLogger.debug('Layout', 'Loaded workspace with opened objects:', workspace.openedObjects.length);
            
            // Restore tabs from workspace opened objects
            if (workspace.openedObjects.length > 0) {
              DebugLogger.debug('Layout', 'Restoring tabs from workspace opened objects');
              
              // Delay tab restoration to ensure MainContent is mounted
              setTimeout(() => {
                if (!mainContentRef.current) {
                  DebugLogger.error('Layout', 'MainContent ref not available for tab restoration');
                  return;
                }
                
                // Clear any existing tabs first to prevent duplicates
                mainContentRef.current?.clearAllTabs?.();
                
                for (const openedObject of workspace.openedObjects) {
                  DebugLogger.debug('Layout', 'Restoring tab:', openedObject.id, openedObject.type);
                  
                  if (openedObject.type === 'main' || openedObject.type === 'cte') {
                    // Find the corresponding SQL model
                    const model = workspace.sqlModels.find(m => m.name === openedObject.id);
                    if (model) {
                      mainContentRef.current?.openSqlModel?.(
                        openedObject.id, 
                        openedObject.content, 
                        openedObject.type,
                        model
                      );
                    }
                  } else if (openedObject.type === 'values') {
                    mainContentRef.current?.openValuesTab?.();
                  } else if (openedObject.type === 'formatter') {
                    mainContentRef.current?.openFormatterTab?.();
                  } else if (openedObject.type === 'condition') {
                    mainContentRef.current?.openConditionTab?.();
                  }
                }
                
                // Set active tab to the workspace's active object
                if (workspace.activeObjectId) {
                  DebugLogger.debug('Layout', 'Setting active tab to:', workspace.activeObjectId);
                  setActiveTabId(workspace.activeObjectId);
                  
                  // Also set selectedModelName if it's a SQL model
                  const activeObject = workspace.openedObjects.find(obj => obj.id === workspace.activeObjectId);
                  if (activeObject && (activeObject.type === 'main' || activeObject.type === 'cte')) {
                    setSelectedModelName(workspace.activeObjectId);
                  }
                }
              }, 100); // 100ms delay to ensure component mounting
            } else {
              // ERROR: No opened objects found in workspace - this should not happen
              DebugLogger.error('Layout', 'CRITICAL: No opened objects found in workspace - this indicates a data corruption issue');
              DebugLogger.error('Layout', 'Workspace name:', workspace.name, 'SQL models:', workspace.sqlModels.length);
              
              // DO NOT use fallback - this masks the real problem
              // The root cause is that openedObjects is not being properly maintained
            }
            
            // Automatically validate all schemas after loading workspace
            DebugLogger.debug('Layout', 'Starting automatic static analysis after workspace load');
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
                DebugLogger.debug('Layout', 'Schema validation found issues in', failedModels.length, 'models on initial load');
              } else {
                DebugLogger.debug('Layout', 'All schemas validated successfully on initial load');
              }
            } catch (validationError) {
              DebugLogger.debug('Layout', 'Schema validation failed on initial load:', validationError);
              // Continue anyway - validation failure shouldn't prevent workspace loading
            }
            
            setIsWorkspaceLoading(false);
            return; // Exit early - workspace loaded successfully, don't create demo workspace
          }
        }
        }
        
        // Create initial workspace for main.sql if no saved workspace exists OR old workspace was cleared
        DebugLogger.debug('Layout', 'Creating new demoworkspace using factory');
        
        try {
          // Create demo workspace using factory
          const demoWorkspace = createValidatedDemoWorkspace();
          setCurrentWorkspace(demoWorkspace);
          
          // Set initial selectedModelName for main model
          const mainModel = demoWorkspace.sqlModels.find(m => m.type === 'main');
          if (mainModel) {
            setSelectedModelName(mainModel.name);
            setActiveTabId(mainModel.name);
          }
          
          // Save to localStorage
          localStorage.setItem('zosql_workspace_v3', JSON.stringify(demoWorkspace.toJSON()));
          
          // Open main.sql tab in the editor
          setTimeout(() => {
            if (mainContentRef.current && mainModel) {
              mainContentRef.current.openSqlModel(
                mainModel.name,
                mainModel.sqlWithoutCte,
                mainModel.type,
                mainModel
              );
            }
          }, 100);
          
          showSuccess('Demo workspace created successfully');
        } catch (error) {
          DebugLogger.error('Layout', 'Failed to create demo workspace:', error);
          showError('Failed to create initial workspace');
          return;
        }
      } catch (error) {
        DebugLogger.error('Layout', 'Failed to load or create workspace:', error);
        showError('Failed to load workspace');
      } finally {
        setIsWorkspaceLoading(false);
      }
    };

    loadSavedWorkspace();
  }, [forceDemo, showError, showSuccess, isWorkspaceLoading]);

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
        isDemo={forceDemo}
        onWorkspaceCreated={(workspace) => {
          try {
            let workspaceEntity;
            const isFromJson = workspace && typeof workspace.toJSON !== 'function';
            
            DebugLogger.debug('Layout', 'Opening new workspace, clearing existing state');
            DebugLogger.debug('Layout', 'Previous workspace:', currentWorkspace?.name || 'None');
            
            // CRITICAL: Always clear existing workspace state when opening new workspace
            if (mainContentRef.current) {
              DebugLogger.debug('Layout', 'Clearing all tabs and resetting MainContent state');
              mainContentRef.current?.clearAllTabs?.();
            }
            
            // Clear any existing workspace state in Layout
            DebugLogger.debug('Layout', 'Clearing Layout state');
            setActiveTabId('');
            setSelectedModelName('');
            
            // Force garbage collection hint (if available)
            if (typeof window !== 'undefined' && (window as unknown as { gc?: () => void }).gc) {
              try {
                (window as unknown as { gc: () => void }).gc();
                DebugLogger.debug('Layout', 'Forced garbage collection');
              } catch (e) {
                // Silently ignore - gc() is not always available
              }
            }
            
            // Check if workspace is already a WorkspaceEntity or raw JSON data
            if (workspace && typeof workspace.toJSON === 'function') {
              // Already a WorkspaceEntity
              workspaceEntity = workspace;
              DebugLogger.debug('Layout', 'Using existing WorkspaceEntity:', workspaceEntity.name);
            } else {
              // Raw JSON data - restore it
              DebugLogger.debug('Layout', 'Restoring workspace from JSON:', workspace);
              workspaceEntity = WorkspaceEntity.fromJSON(workspace as unknown as Record<string, unknown>);
            }
            
            setCurrentWorkspace(workspaceEntity);
            
            // Set initial selectedModelName for main model
            const mainModel = workspaceEntity.sqlModels.find(m => m.type === 'main');
            if (mainModel) {
              setSelectedModelName(mainModel.name);
              setActiveTabId(mainModel.name);
            }
            
            // Restore tabs from workspace opened objects (for both new and restored workspaces)
            if (workspaceEntity.openedObjects.length > 0 && mainContentRef.current) {
              DebugLogger.debug('Layout', isFromJson ? 'Restoring tabs from JSON workspace' : 'Opening tabs for new workspace');
              setTimeout(() => {
                // Use setTimeout to ensure mainContentRef is ready
                if (mainContentRef.current) {
                  for (const openedObject of workspaceEntity.openedObjects) {
                    DebugLogger.debug('Layout', 'Opening tab:', openedObject.id, openedObject.type);
                    
                    if (openedObject.type === 'main' || openedObject.type === 'cte') {
                      // Find the corresponding SQL model
                      const model = workspaceEntity.sqlModels.find(m => m.name === openedObject.id);
                      if (model) {
                        mainContentRef.current?.openSqlModel?.(
                          openedObject.id, 
                          openedObject.content, 
                          openedObject.type,
                          model
                        );
                      }
                    } else if (openedObject.type === 'values') {
                      mainContentRef.current?.openValuesTab?.();
                    } else if (openedObject.type === 'formatter') {
                      mainContentRef.current?.openFormatterTab?.();
                    } else if (openedObject.type === 'condition') {
                      mainContentRef.current?.openConditionTab?.();
                    }
                  }
                  
                  // Set active tab to the workspace's active object
                  if (workspaceEntity.activeObjectId) {
                    DebugLogger.debug('Layout', 'Setting active tab to:', workspaceEntity.activeObjectId);
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
              DebugLogger.warn('Layout', 'Failed to save workspace to localStorage:', error);
            }
            
            // Run static analysis for JSON loaded workspaces
            if (isFromJson && mainContentRef.current) {
              DebugLogger.debug('Layout', 'Running static analysis for loaded JSON workspace');
              setTimeout(() => {
                // Use setTimeout to ensure workspace is fully loaded
                if (mainContentRef.current) {
                  mainContentRef.current?.runStaticAnalysis?.();
                }
              }, 100);
            }
          } catch (error) {
            DebugLogger.error('Layout', 'Failed to process workspace:', error);
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
              DebugLogger.error('Layout', 'Failed to save workspace:', error);
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
            DebugLogger.error('Layout', 'Failed to generate Final SQL:', error);
            return { 
              sql: '', 
              error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
          }
        }}
        currentWorkspace={currentWorkspace}
      />
      
      {/* Main Container - Use wrapper components to maintain MainContent instance */}
      <div className="flex-1 overflow-hidden">
        <StableResizableLayout
          leftSidebarVisible={leftSidebarVisible}
          rightSidebarVisible={rightSidebarVisible}
          leftPanel={
            <LeftSidebar 
              key={leftSidebarKey}
              onOpenValuesTab={() => {
                DebugLogger.debug('Layout', 'onOpenValuesTab called');
                DebugLogger.debug('Layout', 'Current state - selectedModelName:', selectedModelName, 'activeTabId:', activeTabId);
                setActiveTabId('values');
                DebugLogger.debug('Layout', 'State updated - selectedModelName: unchanged, activeTabId: values');
                if (mainContentRef.current) {
                  mainContentRef.current.openValuesTab();
                }
              }} 
              sqlModels={currentWorkspace?.sqlModels || []}
              onModelClick={handleModelClick}
              selectedModelName={selectedModelName}
              onDecomposeQuery={handleDecomposeQuery}
              isDecomposing={isDecomposing}
              workspace={currentWorkspace}
              activeTabId={activeTabId}
              showErrorWithDetails={addError}
              showSuccess={showSuccess}
              mainContentRef={mainContentRef}
            />
          }
          mainPanel={
            <MainContent 
              ref={mainContentRef}
              workspace={currentWorkspace}
              onActiveTabChange={(tabId) => {
                setActiveTabId(tabId);
                // Update selectedModelName if it's a SQL model tab
                if (tabId && currentWorkspace?.sqlModels.find(m => m.name === tabId)) {
                  setSelectedModelName(tabId);
                }
              }}
              showSuccess={showSuccess}
              showError={showError}
              showErrorWithDetails={addError}
              onAnalysisUpdated={() => {
                // Force re-render of LeftSidebar when static analysis completes
                // setLeftSidebarKey(prev => prev + 1); // Commented out since _setLeftSidebarKey is unused
              }}
            />
          }
          rightPanel={
            <RightSidebar 
              lastExecutedSql={lastExecutedSql}
              workspace={currentWorkspace}
            />
          }
        />
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
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
            console.log('[DEBUG] Old workspace detected (missing openedObjects/layoutState), creating new demoworkspace');
            localStorage.removeItem('zosql_workspace_v3'); // Clear old data
            // Force create new workspace below
          } else {
            const workspace = WorkspaceEntity.fromJSON(workspaceData);
            console.log('[DEBUG] Loaded workspace:', workspace.name, 'testValues:', workspace.testValues.withClause);
            setCurrentWorkspace(workspace);
            
            // Set initial selectedModelName for main model
            const mainModel = workspace.sqlModels.find(m => m.type === 'main');
            if (mainModel) {
              console.log('[DEBUG] Setting initial selectedModelName from saved workspace to:', mainModel.name);
              setSelectedModelName(mainModel.name);
              setActiveTabId(mainModel.name);
            }
            
            console.log('[DEBUG] Loaded workspace with opened objects:', workspace.openedObjects.length);
            setIsWorkspaceLoading(false);
            return; // Exit early if we loaded successfully
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
        console.warn('Failed to load saved workspace:', error);
        // Create fallback initial workspace using factory
        console.log('[DEBUG] Creating fallback workspace using factory');
        const initialWorkspace = createValidatedDemoWorkspace();
        console.log('[DEBUG] Fallback workspace created with FilterConditions:', initialWorkspace.filterConditions.displayString);
        
        setCurrentWorkspace(initialWorkspace);
        
        // Set initial selectedModelName for main model
        const mainModel = initialWorkspace.sqlModels.find(m => m.type === 'main');
        if (mainModel) {
          console.log('[DEBUG] Setting initial selectedModelName from fallback workspace to:', mainModel.name);
          setSelectedModelName(mainModel.name);
          setActiveTabId(mainModel.name);
        }
        
        console.log('[DEBUG] Created fallback workspace with opened objects:', initialWorkspace.openedObjects.length);
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
          setCurrentWorkspace(workspace);
          // Save to localStorage
          try {
            localStorage.setItem('zosql_workspace_v3', JSON.stringify(workspace.toJSON()));
          } catch (error) {
            console.warn('Failed to save workspace to localStorage:', error);
          }
        }}
        workspaceName={currentWorkspace?.name}
      />
      
      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {leftSidebarVisible && (
          <LeftSidebar 
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
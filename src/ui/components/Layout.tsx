import React, { useState, useRef, useEffect } from 'react';
import { Header } from './Header';
import { LeftSidebar } from './LeftSidebar';
import { MainContent, MainContentRef } from './MainContent';
import { RightSidebar } from './RightSidebar';
import { useSqlDecomposer } from '@ui/hooks/useSqlDecomposer';
import { useFileOpen } from '@ui/hooks/useFileOpen';
import { SqlModelEntity } from '@core/entities/sql-model';
import { useToast } from '@ui/hooks/useToast';
import { WorkspaceEntity } from '@core/entities/workspace';
import { TestValuesModel } from '@core/entities/test-values-model';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';
import { createValidatedDemoWorkspace } from '@core/factories/demo-workspace-factory';

export const Layout: React.FC = () => {
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [selectedModelName, setSelectedModelName] = useState<string>();
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceEntity | null>(null);
  const mainContentRef = useRef<MainContentRef>(null);
  
  // SQL decomposer hook
  const { decomposeSql, isDecomposing, error } = useSqlDecomposer();
  
  // File open hook  
  const { openFile } = useFileOpen();
  
  // Toast notifications
  const { showSuccess, showError } = useToast();
  
  const handleModelClick = (model: SqlModelEntity) => {
    setSelectedModelName(model.name);
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
      
      // Create new WorkspaceEntity first with default formatter
      const fileName = file.name.replace(/\.sql$/i, '');
      const workspace = new WorkspaceEntity(
        WorkspaceEntity.generateId(),
        fileName,
        file.name,
        [], // Will be populated after decomposition
        new TestValuesModel(''),
        new SqlFormatterEntity(),
        new FilterConditionsEntity(),
        {}
      );
      
      // Decompose file using the workspace's formatter entity
      const result = await openFile(file, workspace.formatter);
      
      // Add the decomposed models to the workspace
      for (const model of result.models) {
        workspace.addSqlModel(model);
      }
      
      // Initialize filter conditions template from SQL models
      workspace.filterConditions.initializeFromModels(result.models);
      
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
        // Use processed sqlWithoutCte instead of original file content
        mainContentRef.current?.openSqlModel(
          mainModel.name, 
          mainModel.sqlWithoutCte, 
          'main',
          mainModel  // Pass the model entity for proper integration
        );
      }
      
      showSuccess(`Opened ${result.fileName} with ${result.models.length} models`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to open file');
    }
  };
  
  // Load workspace on mount
  useEffect(() => {
    const loadSavedWorkspace = async () => {
      try {
        const saved = localStorage.getItem('zosql_workspace_v3');
        console.log('[DEBUG] Loading saved workspace from localStorage:', saved ? 'found' : 'not found');
        
        if (saved) {
          const workspaceData = JSON.parse(saved);
          console.log('[DEBUG] Saved workspace data:', workspaceData);
          
          // Check if this is an old workspace that needs to be reset
          if (workspaceData.name === 'syokiworkspace' || !workspaceData.testValues?.withClause) {
            console.log('[DEBUG] Old workspace detected, creating new demoworkspace');
            localStorage.removeItem('zosql_workspace_v3'); // Clear old data
            // Force create new workspace below
          } else {
            const workspace = WorkspaceEntity.fromJSON(workspaceData);
            console.log('[DEBUG] Loaded workspace:', workspace.name, 'testValues:', workspace.testValues.withClause);
            setCurrentWorkspace(workspace);
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
      />
      
      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {leftSidebarVisible && (
          <LeftSidebar 
            onOpenValuesTab={() => mainContentRef.current?.openValuesTab()} 
            sqlModels={currentWorkspace?.sqlModels || []}
            onModelClick={handleModelClick}
            selectedModelName={selectedModelName}
            onDecomposeQuery={handleDecomposeQuery}
            isDecomposing={isDecomposing}
            workspace={currentWorkspace}
          />
        )}
        
        {/* Main Content Area */}
        <MainContent ref={mainContentRef} workspace={currentWorkspace} />
        
        {/* Right Sidebar */}
        {rightSidebarVisible && (
          <RightSidebar 
            workspace={currentWorkspace} 
            onOpenFormatterTab={() => mainContentRef.current?.openFormatterTab()}
            onOpenConditionTab={() => mainContentRef.current?.openConditionTab()}
          />
        )}
      </div>
    </div>
  );
};
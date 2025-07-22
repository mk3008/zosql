import React, { useState, useRef, useEffect } from 'react';
import { Header } from './Header';
import { LeftSidebar } from './LeftSidebar';
import { MainContent, MainContentRef } from './MainContent';
import { RightSidebar } from './RightSidebar';
import { useSqlDecomposer } from '@ui/hooks/useSqlDecomposer';
import { useFileOpen } from '@ui/hooks/useFileOpen';
import { SqlModelEntity } from '@shared/types';
import { useToast } from '@ui/hooks/useToast';
import { WorkspaceEntity } from '@core/entities/workspace';
import { TestValuesModel } from '@core/entities/test-values-model';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';

export const Layout: React.FC = () => {
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [selectedModelName, setSelectedModelName] = useState<string>();
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceEntity | null>(null);
  const mainContentRef = useRef<MainContentRef>(null);
  
  // SQL decomposer hook
  const { models: sqlModels, decomposeSql, isDecomposing, error } = useSqlDecomposer();
  
  // File open hook  
  const { openFile, isOpening } = useFileOpen();
  
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
      
      // Open the main SQL in editor
      const mainModel = result.models.find(m => m.type === 'main');
      if (mainModel) {
        const sql = mainModel.originalSql || mainModel.sqlWithoutCte;
        mainContentRef.current?.openSqlModel(
          mainModel.name, 
          sql, 
          'main'
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
        if (saved) {
          const workspaceData = JSON.parse(saved);
          const workspace = WorkspaceEntity.fromJSON(workspaceData);
          setCurrentWorkspace(workspace);
        }
      } catch (error) {
        console.warn('Failed to load saved workspace:', error);
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
            onOpenFormatterTab={() => mainContentRef.current?.openFormatterTab()}
            sqlModels={currentWorkspace?.sqlModels || []}
            onModelClick={handleModelClick}
            selectedModelName={selectedModelName}
            onDecomposeQuery={handleDecomposeQuery}
            isDecomposing={isDecomposing}
            workspace={currentWorkspace}
          />
        )}
        
        {/* Main Content Area */}
        <MainContent ref={mainContentRef} />
        
        {/* Right Sidebar */}
        {rightSidebarVisible && (
          <RightSidebar workspace={currentWorkspace} />
        )}
      </div>
    </div>
  );
};
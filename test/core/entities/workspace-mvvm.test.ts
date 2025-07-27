/**
 * WorkspaceEntity MVVM Integration Tests
 * Testing opened objects management and state synchronization
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceEntity } from '@core/entities/workspace';
import { TestValuesModel } from '@core/entities/test-values-model';
import { SqlFormatterEntity } from '@core/entities/sql-formatter';
import { FilterConditionsEntity } from '@core/entities/filter-conditions';
import { SqlModelEntity } from '@core/entities/sql-model';
import { createValidatedDemoWorkspace } from '@core/factories/demo-workspace-factory';

describe('WorkspaceEntity MVVM Integration', () => {
  let workspace: WorkspaceEntity;

  beforeEach(() => {
    workspace = new WorkspaceEntity(
      'test-workspace',
      'Test Workspace',
      'test.sql',
      [],
      new TestValuesModel('with users as (select 1 as id)'),
      new SqlFormatterEntity(),
      new FilterConditionsEntity(),
      {}
    );
  });

  describe('Opened Objects Management', () => {
    it('should start with no opened objects', () => {
      expect(workspace.openedObjects).toHaveLength(0);
      expect(workspace.activeObjectId).toBe('');
      expect(workspace.activeObject).toBeNull();
    });

    it('should open Values tab with correct content', () => {
      workspace.openValuesTab();

      expect(workspace.openedObjects).toHaveLength(1);
      const valuesTab = workspace.openedObjects[0];
      
      expect(valuesTab.id).toBe('values');
      expect(valuesTab.title).toBe('Values & Test Data');
      expect(valuesTab.type).toBe('values');
      expect(valuesTab.content).toBe('with users as (select 1 as id)');
      expect(valuesTab.isDirty).toBe(false);
      expect(workspace.activeObjectId).toBe('values');
    });

    it('should open Formatter tab with correct content', () => {
      workspace.openFormatterTab();

      expect(workspace.openedObjects).toHaveLength(1);
      const formatterTab = workspace.openedObjects[0];
      
      expect(formatterTab.id).toBe('formatter');
      expect(formatterTab.title).toBe('SQL Formatter Config');
      expect(formatterTab.type).toBe('formatter');
      expect(formatterTab.content).toBe(workspace.formatter.displayString);
      expect(formatterTab.isDirty).toBe(false);
      expect(workspace.activeObjectId).toBe('formatter');
    });

    it('should open Condition tab with correct content', () => {
      workspace.openConditionTab();

      expect(workspace.openedObjects).toHaveLength(1);
      const conditionTab = workspace.openedObjects[0];
      
      expect(conditionTab.id).toBe('condition');
      expect(conditionTab.title).toBe('Filter Conditions');
      expect(conditionTab.type).toBe('condition');
      expect(conditionTab.content).toBe(workspace.filterConditions.displayString);
      expect(conditionTab.isDirty).toBe(false);
      expect(workspace.activeObjectId).toBe('condition');
      
      // Verify content is not 'undefined'
      expect(conditionTab.content).not.toBe('undefined');
      console.log('[TEST] Condition content:', conditionTab.content);
    });

    it('should open SQL model tab with correct content', () => {
      const sqlModel = new SqlModelEntity(
        'cte',
        'test_query.sql',
        'SELECT * FROM users',
        [],
        undefined,
        'SELECT * FROM users'
      );
      
      workspace.openSqlModelTab(sqlModel);

      expect(workspace.openedObjects).toHaveLength(1);
      const modelTab = workspace.openedObjects[0];
      
      expect(modelTab.id).toBe('test_query');
      expect(modelTab.title).toBe('test_query');
      expect(modelTab.type).toBe('main');
      expect(modelTab.content).toBe('SELECT * FROM users');
      expect(modelTab.modelEntity).toBe(sqlModel);
      expect(workspace.activeObjectId).toBe('test_query');
    });

    it('should manage multiple opened objects', () => {
      workspace.openValuesTab();
      workspace.openFormatterTab();
      workspace.openConditionTab();

      expect(workspace.openedObjects).toHaveLength(3);
      expect(workspace.activeObjectId).toBe('condition'); // Last opened becomes active
      
      const ids = workspace.openedObjects.map(obj => obj.id);
      expect(ids).toContain('values');
      expect(ids).toContain('formatter');
      expect(ids).toContain('condition');
    });

    it('should close objects correctly', () => {
      workspace.openValuesTab();
      workspace.openFormatterTab();
      
      expect(workspace.openedObjects).toHaveLength(2);
      expect(workspace.activeObjectId).toBe('formatter');
      
      workspace.closeObject('values');
      
      expect(workspace.openedObjects).toHaveLength(1);
      expect(workspace.openedObjects[0].id).toBe('formatter');
      expect(workspace.activeObjectId).toBe('formatter'); // Still active
      
      workspace.closeObject('formatter');
      
      expect(workspace.openedObjects).toHaveLength(0);
      expect(workspace.activeObjectId).toBe('');
    });
  });

  describe('Demo Workspace Factory Integration', () => {
    it('should create demo workspace with main.sql tab already opened', () => {
      const demoWorkspace = createValidatedDemoWorkspace();
      
      expect(demoWorkspace.openedObjects).toHaveLength(1);
      const mainTab = demoWorkspace.openedObjects[0];
      
      expect(mainTab.id).toBe('main.sql');
      expect(mainTab.title).toBe('main.sql');
      expect(mainTab.type).toBe('main');
      expect(mainTab.content).toContain('SELECT');
      expect(mainTab.modelEntity).toBeDefined();
      expect(demoWorkspace.activeObjectId).toBe('main.sql');
    });

    it('should have properly initialized filter conditions in demo workspace', () => {
      const demoWorkspace = createValidatedDemoWorkspace();
      
      // Open condition tab to verify content
      demoWorkspace.openConditionTab();
      
      const conditionTab = demoWorkspace.openedObjects.find(obj => obj.id === 'condition');
      expect(conditionTab).toBeDefined();
      expect(conditionTab!.content).not.toBe('undefined');
      
      // Verify it's valid JSON
      expect(() => JSON.parse(conditionTab!.content)).not.toThrow();
      
      const parsedConditions = JSON.parse(conditionTab!.content);
      expect(typeof parsedConditions).toBe('object');
      expect(parsedConditions).not.toBeNull();
      
      console.log('[TEST] Demo workspace conditions:', parsedConditions);
    });
  });

  describe('Serialization with Opened Objects', () => {
    it('should serialize and deserialize opened objects correctly', () => {
      workspace.openValuesTab();
      workspace.openFormatterTab();
      
      const serialized = workspace.toJSON();
      
      expect(serialized.openedObjects).toHaveLength(2);
      expect(serialized.activeObjectId).toBe('formatter');
      expect(serialized.layoutState).toBeDefined();
      
      const restored = WorkspaceEntity.fromJSON(serialized);
      
      expect(restored.openedObjects).toHaveLength(2);
      expect(restored.activeObjectId).toBe('formatter');
      expect(restored.layoutState.leftSidebarVisible).toBe(true);
      
      const valuesTab = restored.openedObjects.find(obj => obj.id === 'values');
      expect(valuesTab).toBeDefined();
      expect(valuesTab!.content).toBe('with users as (select 1 as id)');
    });
  });

  describe('Layout State Management', () => {
    it('should manage layout state correctly', () => {
      expect(workspace.layoutState.leftSidebarVisible).toBe(true);
      expect(workspace.layoutState.rightSidebarVisible).toBe(true);
      expect(workspace.layoutState.resultsVisible).toBe(false);
      
      workspace.setLeftSidebarVisible(false);
      workspace.setResultsVisible(true);
      
      expect(workspace.layoutState.leftSidebarVisible).toBe(false);
      expect(workspace.layoutState.rightSidebarVisible).toBe(true);
      expect(workspace.layoutState.resultsVisible).toBe(true);
    });
  });
});
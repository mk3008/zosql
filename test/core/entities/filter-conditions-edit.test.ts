/**
 * FilterConditionsEntity編集テスト
 */

import { describe, it, expect } from 'vitest';
import { FilterConditionsEntity } from '../../../src/core/entities/filter-conditions.js';
import { SqlModelEntity } from '../../../src/core/entities/sql-model.js';

describe('FilterConditionsEntity Editing', () => {
  it('should allow manual editing of filter conditions JSON', () => {
    // Arrange
    const filterConditions = new FilterConditionsEntity('{"user_id": {}, "name": {}}');
    
    // Act - ユーザーが手動で編集
    const userEditedJson = '{"user_id": {"=": 123}, "name": {"like": "test%"}}';
    filterConditions.displayString = userEditedJson;
    
    // Assert
    expect(filterConditions.displayString).toBe(userEditedJson);
    expect(filterConditions.conditions).toBe(userEditedJson);
    
    // Verify parsed conditions
    const parsed = filterConditions.getFilterConditions();
    expect(parsed).toEqual({
      user_id: { '=': 123 },
      name: { like: 'test%' }
    });
  });

  it('should generate editable template with empty objects', () => {
    // Arrange
    const models = [
      new SqlModelEntity(
        'main', 
        'test.sql', 
        'SELECT user_id, name FROM users',
        [],
        ['user_id', 'name'],
        'SELECT user_id, name FROM users'
      )
    ];
    
    // Act
    const template = FilterConditionsEntity.generateTemplate(models);
    
    // Assert - テンプレートが生成される（IDは空、nameには初期値）
    expect(template).toBe(JSON.stringify({
      user_id: {},
      name: { ilike: "%a%" }
    }, null, 2));
    
    // Verify it's valid JSON
    const parsed = JSON.parse(template);
    expect(parsed).toEqual({
      user_id: {},
      name: { ilike: "%a%" }
    });
  });

  it('should handle partial edits correctly', () => {
    // Arrange
    const filterConditions = new FilterConditionsEntity('{"user_id": {}, "name": {}}');
    
    // Act - ユーザーがuser_idだけ編集
    const partialEdit = '{"user_id": {"=": 456}, "name": {}}';
    filterConditions.displayString = partialEdit;
    
    // Assert
    const parsed = filterConditions.getFilterConditions();
    expect(parsed).toEqual({
      user_id: { '=': 456 },
      name: {}
    });
  });

  it('should preserve user edits even with invalid partial JSON', () => {
    // Arrange
    const filterConditions = new FilterConditionsEntity('{"user_id": {}, "name": {}}');
    
    // Act - ユーザーが編集中（不完全なJSON）
    const incompleteJson = '{"user_id": {"=": 12';
    filterConditions.displayString = incompleteJson;
    
    // Assert - 文字列は保存される
    expect(filterConditions.displayString).toBe(incompleteJson);
    
    // But parsing returns empty object due to invalid JSON
    const parsed = filterConditions.getFilterConditions();
    expect(parsed).toEqual({});
  });
});
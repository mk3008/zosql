/**
 * CTE Composition Test
 * Tests WITH clause composition functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SqlModelEntity } from '@core/entities/sql-model';
import { WorkspaceEntity } from '@core/entities/workspace';
import { TestValuesModel } from '@core/entities/test-values-model';

describe('CTE Composition Test', () => {
  let mainModel: SqlModelEntity;
  let cteModel1: SqlModelEntity;
  let cteModel2: SqlModelEntity;
  let workspace: WorkspaceEntity;

  beforeEach(() => {
    // Create CTE models
    cteModel1 = new SqlModelEntity(
      'cte',
      'session_data',
      `select 
        user_id,
        session_id,
        start_time,
        end_time
      from user_sessions 
      where start_time >= current_date - INTERVAL '7 days'`,
      []
    );

    cteModel2 = new SqlModelEntity(
      'cte', 
      'user_engagement',
      `select 
        user_id,
        count(distinct session_id) as total_sessions,
        sum(session_duration_minutes) as total_time_spent
      from session_data 
      group by user_id`,
      [cteModel1] // depends on session_data
    );

    // Create main model that depends on CTEs
    mainModel = new SqlModelEntity(
      'main',
      'user_behavior_analysis',
      `SELECT 
        'Engagement Overview' as analysis_type,
        uc.engagement_level as segment,
        COUNT(*) as user_count,
        ROUND(AVG(uc.total_sessions), 2) as avg_sessions
      FROM user_cohorts uc
      GROUP BY uc.engagement_level`,
      [cteModel1, cteModel2] // depends on both CTEs
    );

    // Create workspace
    workspace = new WorkspaceEntity('test', 'Test Workspace', null);
    workspace.addSqlModel(mainModel);
    workspace.addSqlModel(cteModel1);
    workspace.addSqlModel(cteModel2);
  });

  describe('getDynamicSql', () => {
    it('should compose WITH clause when dependencies exist (no testValues)', async () => {
      // Act
      const result = await mainModel.getDynamicSql(undefined, undefined, false);

      // Assert
      console.log('Generated SQL:', result.formattedSql);
      
      expect(result.formattedSql).toContain('WITH');
      expect(result.formattedSql).toContain('session_data AS');
      expect(result.formattedSql).toContain('user_engagement AS');
      expect(result.formattedSql).toContain('FROM user_cohorts uc');
      
      // Should have proper CTE order (dependencies first)
      const sessionDataIndex = result.formattedSql.indexOf('session_data AS');
      const userEngagementIndex = result.formattedSql.indexOf('user_engagement AS');
      const mainQueryIndex = result.formattedSql.indexOf('SELECT');
      
      expect(sessionDataIndex).toBeLessThan(userEngagementIndex);
      expect(userEngagementIndex).toBeLessThan(mainQueryIndex);
    });

    it('should compose WITH clause with testValues', async () => {
      // Arrange
      const testValues = new TestValuesModel(`
        with users(user_id, name) as (
          values (1, 'alice'), (2, 'bob')
        )
      `);

      // Act
      const result = await mainModel.getDynamicSql(testValues, undefined, false);

      // Assert
      console.log('Generated SQL with test values:', result.formattedSql);
      
      expect(result.formattedSql).toContain('WITH');
      expect(result.formattedSql).toContain('users(user_id, name) as');
      expect(result.formattedSql).toContain('session_data AS');
      expect(result.formattedSql).toContain('user_engagement AS');
      
      // Test values should come first
      const usersIndex = result.formattedSql.indexOf('users(user_id, name) as');
      const sessionDataIndex = result.formattedSql.indexOf('session_data AS');
      
      expect(usersIndex).toBeLessThan(sessionDataIndex);
    });

    it('should handle empty testValues gracefully', async () => {
      // Arrange
      const emptyTestValues = new TestValuesModel('');

      // Act
      const result = await mainModel.getDynamicSql(emptyTestValues, undefined, false);

      // Assert
      console.log('Generated SQL with empty test values:', result.formattedSql);
      
      expect(result.formattedSql).toContain('WITH');
      expect(result.formattedSql).toContain('session_data AS');
      expect(result.formattedSql).toContain('user_engagement AS');
    });

    it('should work with no dependencies and no testValues', async () => {
      // Arrange
      const simpleModel = new SqlModelEntity(
        'main',
        'simple_query',
        'SELECT user_id, name FROM users',
        [] // no dependencies
      );

      // Act
      const result = await simpleModel.getDynamicSql(undefined, undefined, false);

      // Assert
      console.log('Generated SQL for simple query:', result.formattedSql);
      
      expect(result.formattedSql).not.toContain('WITH');
      expect(result.formattedSql).toContain('SELECT user_id, name FROM users');
    });

    it('should handle complex dependency chain', async () => {
      // Arrange - Create a more complex dependency chain
      const cte3 = new SqlModelEntity(
        'cte',
        'conversion_events',
        `select user_id, event_type, event_time 
         from events 
         where event_time >= current_date - INTERVAL '7 days'`,
        []
      );

      const cte4 = new SqlModelEntity(
        'cte',
        'funnel_analysis', 
        `select user_id, 
               max(case when event_type = 'signup' then 1 else 0 end) as has_signup
         from conversion_events 
         group by user_id`,
        [cte3] // depends on conversion_events
      );

      // Update main model to depend on all CTEs
      const complexMain = new SqlModelEntity(
        'main',
        'complex_analysis',
        `SELECT ue.user_id, ue.total_sessions, fa.has_signup
         FROM user_engagement ue
         LEFT JOIN funnel_analysis fa ON ue.user_id = fa.user_id`,
        [cteModel1, cteModel2, cte3, cte4] // complex dependencies
      );

      // Act
      const result = await complexMain.getDynamicSql(undefined, undefined, false);

      // Assert
      console.log('Generated SQL for complex query:', result.formattedSql);
      
      expect(result.formattedSql).toContain('WITH');
      expect(result.formattedSql).toContain('session_data AS');
      expect(result.formattedSql).toContain('user_engagement AS');
      expect(result.formattedSql).toContain('conversion_events AS');
      expect(result.formattedSql).toContain('funnel_analysis AS');
      
      // Check proper dependency order
      const indices = [
        result.formattedSql.indexOf('session_data AS'),
        result.formattedSql.indexOf('conversion_events AS'),
        result.formattedSql.indexOf('user_engagement AS'),
        result.formattedSql.indexOf('funnel_analysis AS')
      ];
      
      // session_data and conversion_events should come before their dependents
      expect(indices[0]).toBeLessThan(indices[2]); // session_data before user_engagement
      expect(indices[1]).toBeLessThan(indices[3]); // conversion_events before funnel_analysis
    });
  });

  describe('Real User Behavior Analysis Test', () => {
    it('should properly compose the actual user_behavior_analysis.sql query', async () => {
      // Arrange - Create the exact models from the real SQL file
      const sessionData = new SqlModelEntity('cte', 'session_data', 
        `select "user_id", "session_id", "start_time", "end_time", extract(epoch from ("end_time" - "start_time")) / 60 as "session_duration_minutes", "page_views", "actions_taken", "device_type", "browser", "source_channel" from "user_sessions" where "start_time" >= current_date - INTERVAL '7 days' and "end_time" is not null and extract(epoch from ("end_time" - "start_time")) >= 30`, 
        []
      );

      const userEngagement = new SqlModelEntity('cte', 'user_engagement',
        `select "user_id", count(distinct "session_id") as "total_sessions", count(distinct DATE("start_time")) as "active_days", sum("session_duration_minutes") as "total_time_spent", avg("session_duration_minutes") as "avg_session_duration", sum("page_views") as "total_page_views", sum("actions_taken") as "total_actions", max("start_time") as "last_session_time", min("start_time") as "first_session_time" from "session_data" group by "user_id"`,
        [sessionData]
      );

      const realMainQuery = new SqlModelEntity('main', 'user_behavior_analysis',
        `SELECT 
    'Engagement Overview' as analysis_type,
    uc.engagement_level as segment,
    COUNT(*) as user_count,
    ROUND(AVG(uc.total_sessions), 2) as avg_sessions,
    ROUND(AVG(uc.active_days), 2) as avg_active_days
FROM user_cohorts uc
GROUP BY uc.engagement_level`,
        [sessionData, userEngagement]
      );

      // Act
      const result = await realMainQuery.getDynamicSql(undefined, undefined, false);

      // Assert
      console.log('Real query composition result:', result.formattedSql);
      
      expect(result.formattedSql).toContain('WITH');
      expect(result.formattedSql).toContain('session_data AS');
      expect(result.formattedSql).toContain('user_engagement AS');
      expect(result.formattedSql).toContain('SELECT');
      expect(result.formattedSql).toContain('user_cohorts uc');
      
      // Verify the structure
      expect(result.formattedSql).toMatch(/WITH[\s\S]*session_data AS[\s\S]*user_engagement AS[\s\S]*SELECT/);
    });
  });
});
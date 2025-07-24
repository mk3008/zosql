/**
 * Workspace Dependency Analysis Test
 * Tests workspace creation and CTE dependency resolution
 */

import { describe, it, expect } from 'vitest';
import { WorkspaceEntity } from '@core/entities/workspace';
import { SqlDecomposerUseCase } from '@core/usecases/sql-decomposer-usecase';
import { SqlDecomposerParser } from '@adapters/parsers/sql-decomposer-parser';
import { CteDependencyAnalyzerAdapter } from '@adapters/dependency-analyzer/cte-dependency-analyzer-adapter';

describe('Workspace Dependency Analysis Test', () => {
  const realUserBehaviorAnalysisSQL = `WITH session_data AS (
    SELECT 
        user_id,
        session_id,
        start_time,
        end_time,
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60 as session_duration_minutes,
        page_views,
        actions_taken,
        device_type,
        browser,
        source_channel
    FROM user_sessions 
    WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
      AND end_time IS NOT NULL
      AND EXTRACT(EPOCH FROM (end_time - start_time)) >= 30
),
user_engagement AS (
    SELECT 
        user_id,
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(DISTINCT DATE(start_time)) as active_days,
        SUM(session_duration_minutes) as total_time_spent,
        AVG(session_duration_minutes) as avg_session_duration,
        SUM(page_views) as total_page_views,
        SUM(actions_taken) as total_actions,
        MAX(start_time) as last_session_time,
        MIN(start_time) as first_session_time
    FROM session_data
    GROUP BY user_id
),
conversion_events AS (
    SELECT 
        user_id,
        event_type,
        event_time,
        session_id,
        event_value,
        ROW_NUMBER() OVER (PARTITION BY user_id, event_type ORDER BY event_time) as event_sequence
    FROM events 
    WHERE event_time >= CURRENT_DATE - INTERVAL '7 days'
      AND event_type IN ('add_to_cart', 'checkout_start', 'purchase_complete', 'signup')
),
funnel_analysis AS (
    SELECT 
        ce.user_id,
        MAX(CASE WHEN ce.event_type = 'signup' THEN 1 ELSE 0 END) as has_signup,
        MAX(CASE WHEN ce.event_type = 'add_to_cart' THEN 1 ELSE 0 END) as has_add_to_cart,
        MAX(CASE WHEN ce.event_type = 'checkout_start' THEN 1 ELSE 0 END) as has_checkout_start,
        MAX(CASE WHEN ce.event_type = 'purchase_complete' THEN 1 ELSE 0 END) as has_purchase,
        COUNT(CASE WHEN ce.event_type = 'add_to_cart' THEN 1 END) as cart_additions,
        COUNT(CASE WHEN ce.event_type = 'purchase_complete' THEN 1 END) as purchases,
        SUM(CASE WHEN ce.event_type = 'purchase_complete' THEN ce.event_value ELSE 0 END) as total_purchase_value
    FROM conversion_events ce
    GROUP BY ce.user_id
),
device_analysis AS (
    SELECT 
        device_type,
        browser,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as total_sessions,
        AVG(session_duration_minutes) as avg_session_duration,
        AVG(page_views) as avg_page_views_per_session,
        AVG(actions_taken) as avg_actions_per_session
    FROM session_data
    GROUP BY device_type, browser
),
channel_performance AS (
    SELECT 
        source_channel,
        COUNT(DISTINCT user_id) as unique_visitors,
        COUNT(DISTINCT session_id) as total_sessions,
        AVG(session_duration_minutes) as avg_session_duration,
        SUM(CASE WHEN fa.has_signup = 1 THEN 1 ELSE 0 END) as signups,
        SUM(CASE WHEN fa.has_purchase = 1 THEN 1 ELSE 0 END) as conversions,
        SUM(fa.total_purchase_value) as revenue_generated
    FROM session_data sd
    LEFT JOIN funnel_analysis fa ON sd.user_id = fa.user_id
    GROUP BY source_channel
),
user_cohorts AS (
    SELECT 
        ue.user_id,
        u.registration_date,
        DATE_TRUNC('week', u.registration_date) as cohort_week,
        ue.total_sessions,
        ue.active_days,
        ue.total_time_spent,
        fa.has_purchase,
        fa.total_purchase_value,
        CASE 
            WHEN ue.total_sessions >= 10 AND ue.active_days >= 5 THEN 'Highly Engaged'
            WHEN ue.total_sessions >= 5 AND ue.active_days >= 3 THEN 'Moderately Engaged'
            WHEN ue.total_sessions >= 2 THEN 'Lightly Engaged'
            ELSE 'Single Session'
        END as engagement_level
    FROM user_engagement ue
    JOIN users u ON ue.user_id = u.user_id
    LEFT JOIN funnel_analysis fa ON ue.user_id = fa.user_id
    WHERE u.registration_date >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
    'Engagement Overview' as analysis_type,
    uc.engagement_level as segment,
    COUNT(*) as user_count,
    ROUND(AVG(uc.total_sessions), 2) as avg_sessions,
    ROUND(AVG(uc.active_days), 2) as avg_active_days,
    ROUND(AVG(uc.total_time_spent), 2) as avg_time_spent_minutes,
    ROUND(
        SUM(CASE WHEN uc.has_purchase = 1 THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) * 100, 
        2
    ) as conversion_rate_percent,
    ROUND(AVG(uc.total_purchase_value), 2) as avg_purchase_value
FROM user_cohorts uc
GROUP BY uc.engagement_level

UNION ALL

SELECT 
    'Channel Analysis' as analysis_type,
    cp.source_channel as segment,
    cp.unique_visitors as user_count,
    ROUND(cp.avg_session_duration, 2) as avg_sessions,
    cp.total_sessions as avg_active_days,
    0 as avg_time_spent_minutes,
    ROUND(
        CASE 
            WHEN cp.unique_visitors > 0 
            THEN (cp.conversions::DECIMAL / cp.unique_visitors) * 100 
            ELSE 0 
        END, 2
    ) as conversion_rate_percent,
    ROUND(cp.revenue_generated, 2) as avg_purchase_value
FROM channel_performance cp

UNION ALL

SELECT 
    'Device Performance' as analysis_type,
    CONCAT(da.device_type, ' - ', da.browser) as segment,
    da.unique_users as user_count,
    ROUND(da.avg_session_duration, 2) as avg_sessions,
    da.total_sessions as avg_active_days,
    ROUND(da.avg_page_views_per_session, 2) as avg_time_spent_minutes,
    ROUND(da.avg_actions_per_session, 2) as conversion_rate_percent,
    0 as avg_purchase_value
FROM device_analysis da

ORDER BY 
    CASE analysis_type
        WHEN 'Engagement Overview' THEN 1
        WHEN 'Channel Analysis' THEN 2
        WHEN 'Device Performance' THEN 3
    END,
    user_count DESC`;

  describe('SQL Decomposition and Workspace Creation', () => {
    it('should create workspace with correct CTE dependencies', async () => {
      // Arrange
      const decomposer = new SqlDecomposerUseCase();

      // Act
      const result = await decomposer.decomposeSql(realUserBehaviorAnalysisSQL, 'user_behavior_analysis');

      // Assert
      console.log('Decomposition result:', {
        mainQuery: result.mainQuery.substring(0, 200) + '...',
        cteCount: result.ctes.length,
        cteNames: result.ctes.map(c => c.name)
      });

      // Verify we have the expected CTEs
      expect(result.ctes).toHaveLength(7);
      expect(result.ctes.map(c => c.name)).toEqual(
        expect.arrayContaining([
          'session_data',
          'user_engagement', 
          'conversion_events',
          'funnel_analysis',
          'device_analysis',
          'channel_performance',
          'user_cohorts'
        ])
      );

      // Verify dependencies are analyzed correctly
      const sessionData = result.ctes.find(c => c.name === 'session_data');
      const userEngagement = result.ctes.find(c => c.name === 'user_engagement');
      const conversionEvents = result.ctes.find(c => c.name === 'conversion_events');
      const funnelAnalysis = result.ctes.find(c => c.name === 'funnel_analysis');
      const channelPerformance = result.ctes.find(c => c.name === 'channel_performance');
      const userCohorts = result.ctes.find(c => c.name === 'user_cohorts');

      expect(sessionData?.dependencies).toEqual([]);
      expect(userEngagement?.dependencies).toEqual(['session_data']);
      expect(conversionEvents?.dependencies).toEqual([]);
      expect(funnelAnalysis?.dependencies).toEqual(['conversion_events']);
      expect(channelPerformance?.dependencies).toEqual(expect.arrayContaining(['session_data', 'funnel_analysis']));
      expect(userCohorts?.dependencies).toEqual(expect.arrayContaining(['user_engagement', 'funnel_analysis']));
    });

    it('should create SqlModelEntity instances with correct dependencies', async () => {
      // Arrange
      const decomposer = new SqlDecomposerUseCase();
      const result = await decomposer.decomposeSql(realUserBehaviorAnalysisSQL, 'user_behavior_analysis');

      // Act - Create workspace like the actual New command does
      const workspace = new WorkspaceEntity('test', 'Test Workspace');
      
      // Create and add CTE models first
      const cteModels = new Map();
      for (const cte of result.ctes) {
        const model = workspace.createSqlModel('cte', cte.name, cte.query);
        cteModels.set(cte.name, model);
      }

      // Create main model
      const mainModel = workspace.createSqlModel('main', 'user_behavior_analysis', result.mainQuery);

      // Set up dependencies (this is the critical part that might be missing)
      for (const cte of result.ctes) {
        const model = cteModels.get(cte.name);
        if (model && cte.dependencies.length > 0) {
          const deps = cte.dependencies.map(depName => cteModels.get(depName)).filter(Boolean);
          model.dependents = deps;
        }
      }

      // Set up main model dependencies
      const mainDependencies = [];
      for (const cte of result.ctes) {
        if (result.mainQuery.includes(cte.name)) {
          const depModel = cteModels.get(cte.name);
          if (depModel) {
            mainDependencies.push(depModel);
          }
        }
      }
      mainModel.dependents = mainDependencies;

      // Assert
      console.log('Workspace models:', {
        totalModels: workspace.sqlModels.length,
        mainModelDependents: mainModel.dependents.length,
        mainModelDependentNames: mainModel.dependents.map(d => d.name),
        allModels: workspace.sqlModels.map(m => ({
          name: m.name,
          type: m.type,
          dependentsCount: m.dependents.length,
          dependentNames: m.dependents.map(d => d.name)
        }))
      });

      expect(workspace.sqlModels).toHaveLength(8); // 7 CTEs + 1 main
      expect(mainModel.dependents.length).toBeGreaterThan(0);
      
      // Main model should depend on user_cohorts, channel_performance, device_analysis at minimum
      const mainDepNames = mainModel.dependents.map(d => d.name);
      expect(mainDepNames).toEqual(expect.arrayContaining(['user_cohorts', 'channel_performance', 'device_analysis']));
    });

    it('should generate WITH clause when executing main model', async () => {
      // Arrange
      const decomposer = new SqlDecomposerUseCase();
      const result = await decomposer.decomposeSql(realUserBehaviorAnalysisSQL, 'user_behavior_analysis');
      
      const workspace = new WorkspaceEntity('test', 'Test Workspace');
      
      // Create and add CTE models with proper dependencies
      const cteModels = new Map();
      for (const cte of result.ctes) {
        const model = workspace.createSqlModel('cte', cte.name, cte.query);
        cteModels.set(cte.name, model);
      }

      const mainModel = workspace.createSqlModel('main', 'user_behavior_analysis', result.mainQuery);

      // Set up dependencies properly
      for (const cte of result.ctes) {
        const model = cteModels.get(cte.name);
        if (model && cte.dependencies.length > 0) {
          model.dependents = cte.dependencies.map(depName => cteModels.get(depName)).filter(Boolean);
        }
      }

      // Set main model dependencies
      const referencedCtes = ['user_cohorts', 'channel_performance', 'device_analysis'];
      mainModel.dependents = referencedCtes.map(name => cteModels.get(name)).filter(Boolean);

      // Act
      const dynamicResult = await mainModel.getDynamicSql(undefined, undefined, false);

      // Assert
      console.log('Generated SQL:', {
        sqlLength: dynamicResult.formattedSql.length,
        hasWithClause: dynamicResult.formattedSql.toLowerCase().includes('with'),
        firstLines: dynamicResult.formattedSql.substring(0, 300) + '...'
      });

      expect(dynamicResult.formattedSql.toLowerCase()).toContain('with');
      expect(dynamicResult.formattedSql).toContain('session_data');
      expect(dynamicResult.formattedSql).toContain('user_engagement');
      expect(dynamicResult.formattedSql).toContain('user_cohorts');
      expect(dynamicResult.formattedSql).toContain('channel_performance');
      expect(dynamicResult.formattedSql).toContain('device_analysis');
    });
  });
});
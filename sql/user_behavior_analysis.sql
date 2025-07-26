-- User Behavior Analysis
-- Complex hierarchical CTE structure demonstration

WITH 
  -- Base session data
  session_data AS (
    SELECT 
      user_id,
      session_id,
      created_at as session_start,
      updated_at as session_end,
      EXTRACT(EPOCH FROM (updated_at - created_at)) as session_duration_seconds
    FROM user_sessions
    WHERE created_at >= '2024-01-01'
  ),
  
  -- User engagement metrics
  user_engagement AS (
    SELECT 
      sd.user_id,
      COUNT(sd.session_id) as total_sessions,
      AVG(sd.session_duration_seconds) as avg_session_duration,
      SUM(sd.session_duration_seconds) as total_engagement_time,
      MIN(sd.session_start) as first_session,
      MAX(sd.session_end) as last_session
    FROM session_data sd
    GROUP BY sd.user_id
  ),
  
  -- User cohorts based on engagement
  user_cohorts AS (
    SELECT 
      ue.user_id,
      ue.total_sessions,
      ue.avg_session_duration,
      ue.total_engagement_time,
      CASE 
        WHEN ue.total_sessions >= 20 AND ue.avg_session_duration >= 300 THEN 'highly_engaged'
        WHEN ue.total_sessions >= 10 AND ue.avg_session_duration >= 180 THEN 'moderately_engaged'
        WHEN ue.total_sessions >= 5 THEN 'low_engaged'
        ELSE 'inactive'
      END as engagement_level,
      DATE_TRUNC('month', ue.first_session) as cohort_month
    FROM user_engagement ue
  ),
  
  -- Conversion events tracking
  conversion_events AS (
    SELECT 
      user_id,
      event_type,
      created_at as event_time,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as event_sequence
    FROM user_events
    WHERE event_type IN ('signup', 'first_purchase', 'subscription', 'referral')
  ),
  
  -- Funnel analysis
  funnel_analysis AS (
    SELECT 
      ce.user_id,
      uc.engagement_level,
      uc.cohort_month,
      COUNT(CASE WHEN ce.event_type = 'signup' THEN 1 END) as signup_events,
      COUNT(CASE WHEN ce.event_type = 'first_purchase' THEN 1 END) as first_purchase_events,
      COUNT(CASE WHEN ce.event_type = 'subscription' THEN 1 END) as subscription_events,
      COUNT(CASE WHEN ce.event_type = 'referral' THEN 1 END) as referral_events,
      MIN(CASE WHEN ce.event_type = 'signup' THEN ce.event_time END) as signup_time,
      MIN(CASE WHEN ce.event_type = 'first_purchase' THEN ce.event_time END) as first_purchase_time,
      MIN(CASE WHEN ce.event_type = 'subscription' THEN ce.event_time END) as subscription_time
    FROM conversion_events ce
    JOIN user_cohorts uc ON ce.user_id = uc.user_id
    GROUP BY ce.user_id, uc.engagement_level, uc.cohort_month
  ),
  
  -- Cohort retention analysis
  cohort_retention AS (
    SELECT 
      fa.cohort_month,
      fa.engagement_level,
      COUNT(DISTINCT fa.user_id) as cohort_size,
      COUNT(DISTINCT CASE WHEN fa.first_purchase_events > 0 THEN fa.user_id END) as purchasers,
      COUNT(DISTINCT CASE WHEN fa.subscription_events > 0 THEN fa.user_id END) as subscribers,
      COUNT(DISTINCT CASE WHEN fa.referral_events > 0 THEN fa.user_id END) as referrers,
      AVG(CASE 
        WHEN fa.first_purchase_time IS NOT NULL AND fa.signup_time IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (fa.first_purchase_time - fa.signup_time)) / 86400 
      END) as avg_days_to_purchase,
      AVG(CASE 
        WHEN fa.subscription_time IS NOT NULL AND fa.signup_time IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (fa.subscription_time - fa.signup_time)) / 86400 
      END) as avg_days_to_subscription
    FROM funnel_analysis fa
    GROUP BY fa.cohort_month, fa.engagement_level
  ),
  
  -- Revenue attribution
  revenue_attribution AS (
    SELECT 
      fa.user_id,
      fa.engagement_level,
      fa.cohort_month,
      COALESCE(SUM(o.total_amount), 0) as total_revenue,
      COUNT(o.id) as total_orders,
      AVG(o.total_amount) as avg_order_value,
      MAX(o.created_at) as last_order_date
    FROM funnel_analysis fa
    LEFT JOIN orders o ON fa.user_id = o.user_id
    GROUP BY fa.user_id, fa.engagement_level, fa.cohort_month
  ),
  
  -- Final comprehensive analysis
  user_behavior_analysis AS (
    SELECT 
      ra.cohort_month,
      ra.engagement_level,
      cr.cohort_size,
      cr.purchasers,
      cr.subscribers,
      cr.referrers,
      ROUND(cr.purchasers::DECIMAL / cr.cohort_size * 100, 2) as purchase_conversion_rate,
      ROUND(cr.subscribers::DECIMAL / cr.cohort_size * 100, 2) as subscription_conversion_rate,
      ROUND(cr.referrers::DECIMAL / cr.cohort_size * 100, 2) as referral_rate,
      ROUND(cr.avg_days_to_purchase, 1) as avg_days_to_purchase,
      ROUND(cr.avg_days_to_subscription, 1) as avg_days_to_subscription,
      SUM(ra.total_revenue) as cohort_total_revenue,
      ROUND(AVG(ra.total_revenue), 2) as avg_revenue_per_user,
      ROUND(AVG(ra.avg_order_value), 2) as avg_order_value,
      SUM(ra.total_orders) as total_orders
    FROM revenue_attribution ra
    JOIN cohort_retention cr ON ra.cohort_month = cr.cohort_month AND ra.engagement_level = cr.engagement_level
    GROUP BY ra.cohort_month, ra.engagement_level, cr.cohort_size, cr.purchasers, cr.subscribers, cr.referrers, cr.avg_days_to_purchase, cr.avg_days_to_subscription
  )

-- Final result with business insights
SELECT 
  uba.cohort_month,
  uba.engagement_level,
  uba.cohort_size,
  uba.purchase_conversion_rate,
  uba.subscription_conversion_rate,
  uba.referral_rate,
  uba.avg_days_to_purchase,
  uba.avg_days_to_subscription,
  uba.cohort_total_revenue,
  uba.avg_revenue_per_user,
  uba.avg_order_value,
  uba.total_orders,
  CASE 
    WHEN uba.avg_revenue_per_user > 200 THEN 'High Value'
    WHEN uba.avg_revenue_per_user > 100 THEN 'Medium Value'
    WHEN uba.avg_revenue_per_user > 50 THEN 'Low Value'
    ELSE 'Minimal Value'
  END as cohort_value_segment,
  CASE 
    WHEN uba.purchase_conversion_rate > 15 THEN 'High Converting'
    WHEN uba.purchase_conversion_rate > 8 THEN 'Medium Converting'
    WHEN uba.purchase_conversion_rate > 3 THEN 'Low Converting'
    ELSE 'Poor Converting'
  END as conversion_performance
FROM user_behavior_analysis uba
ORDER BY uba.cohort_month DESC, uba.engagement_level, uba.avg_revenue_per_user DESC;
-- Analytics Query Example
-- This demonstrates complex CTE hierarchies for analytics

WITH 
  -- Base data extraction
  daily_sales AS (
    SELECT 
      DATE(o.created_at) as sale_date,
      o.user_id,
      o.total_amount,
      o.id as order_id
    FROM orders o
    WHERE o.created_at >= '2024-01-01'
  ),
  
  -- User segmentation
  user_segments AS (
    SELECT 
      u.id as user_id,
      u.name,
      u.email,
      CASE 
        WHEN u.created_at >= '2024-01-01' THEN 'new_user'
        WHEN u.created_at >= '2023-01-01' THEN 'existing_user'
        ELSE 'old_user'
      END as user_segment
    FROM users u
  ),
  
  -- Daily aggregations
  daily_metrics AS (
    SELECT 
      ds.sale_date,
      us.user_segment,
      COUNT(DISTINCT ds.user_id) as active_users,
      COUNT(ds.order_id) as total_orders,
      SUM(ds.total_amount) as total_revenue,
      AVG(ds.total_amount) as avg_order_value
    FROM daily_sales ds
    JOIN user_segments us ON ds.user_id = us.user_id
    GROUP BY ds.sale_date, us.user_segment
  ),
  
  -- Monthly rollups
  monthly_summary AS (
    SELECT 
      DATE_TRUNC('month', dm.sale_date) as month,
      dm.user_segment,
      SUM(dm.active_users) as monthly_active_users,
      SUM(dm.total_orders) as monthly_orders,
      SUM(dm.total_revenue) as monthly_revenue,
      AVG(dm.avg_order_value) as avg_monthly_order_value
    FROM daily_metrics dm
    GROUP BY DATE_TRUNC('month', dm.sale_date), dm.user_segment
  ),
  
  -- Growth calculations
  growth_metrics AS (
    SELECT 
      ms.month,
      ms.user_segment,
      ms.monthly_revenue,
      LAG(ms.monthly_revenue) OVER (
        PARTITION BY ms.user_segment 
        ORDER BY ms.month
      ) as prev_month_revenue,
      ms.monthly_orders,
      LAG(ms.monthly_orders) OVER (
        PARTITION BY ms.user_segment 
        ORDER BY ms.month
      ) as prev_month_orders
    FROM monthly_summary ms
  ),
  
  -- Final calculations
  analytics_report AS (
    SELECT 
      gm.month,
      gm.user_segment,
      gm.monthly_revenue,
      gm.monthly_orders,
      CASE 
        WHEN gm.prev_month_revenue IS NOT NULL AND gm.prev_month_revenue > 0 
        THEN ROUND((gm.monthly_revenue - gm.prev_month_revenue) / gm.prev_month_revenue * 100, 2)
        ELSE NULL
      END as revenue_growth_percent,
      CASE 
        WHEN gm.prev_month_orders IS NOT NULL AND gm.prev_month_orders > 0 
        THEN ROUND((gm.monthly_orders - gm.prev_month_orders) / gm.prev_month_orders * 100, 2)
        ELSE NULL
      END as order_growth_percent
    FROM growth_metrics gm
  )

-- Final result
SELECT 
  ar.month,
  ar.user_segment,
  ar.monthly_revenue,
  ar.monthly_orders,
  ar.revenue_growth_percent,
  ar.order_growth_percent,
  CASE 
    WHEN ar.revenue_growth_percent > 10 THEN 'High Growth'
    WHEN ar.revenue_growth_percent > 0 THEN 'Moderate Growth'
    WHEN ar.revenue_growth_percent IS NULL THEN 'New Period'
    ELSE 'Declining'
  END as growth_category
FROM analytics_report ar
ORDER BY ar.month DESC, ar.user_segment;
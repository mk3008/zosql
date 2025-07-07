WITH user_stats AS (
  SELECT 
    user_id, 
    COUNT(*) as order_count,
    SUM(amount) as total_amount
  FROM orders 
  WHERE created_at >= '2024-01-01'
  GROUP BY user_id
),
active_users AS (
  SELECT user_id
  FROM users 
  WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
  u.user_id,
  u.order_count,
  u.total_amount,
  CASE 
    WHEN u.total_amount > 1000 THEN 'Premium'
    ELSE 'Standard'
  END as user_tier
FROM user_stats u
INNER JOIN active_users a ON u.user_id = a.user_id
ORDER BY u.total_amount DESC;
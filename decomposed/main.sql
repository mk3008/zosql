WITH
  user_stats AS (),
  active_users AS ()
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
WITH user_orders AS (
    SELECT 
        user_id,
        COUNT(*) as order_count,
        SUM(amount) as total_amount
    FROM orders 
    WHERE created_at >= '2024-01-01'
    GROUP BY user_id
),
active_users AS (
    SELECT 
        user_id,
        email,
        region
    FROM users 
    WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
    au.region,
    COUNT(DISTINCT au.user_id) as user_count,
    SUM(uo.order_count) as total_orders,
    SUM(uo.total_amount) as total_revenue
FROM active_users au
LEFT JOIN user_orders uo ON au.user_id = uo.user_id
GROUP BY au.region
ORDER BY total_revenue DESC
WITH user_stats AS (
    SELECT 
        user_id,
        COUNT(*) as total_orders,
        SUM(amount) as total_amount,
        AVG(amount) as avg_order_amount,
        MIN(created_at) as first_order_date,
        MAX(created_at) as last_order_date
    FROM orders 
    WHERE created_at >= '2024-01-01' 
      AND created_at < '2024-02-01'
      AND status IN ('completed', 'shipped')
    GROUP BY user_id
    HAVING COUNT(*) >= 2
),
active_users AS (
    SELECT 
        user_id,
        email,
        registration_date,
        last_login,
        user_type,
        region
    FROM users 
    WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
      AND status = 'active'
      AND email IS NOT NULL
),
product_performance AS (
    SELECT 
        p.product_id,
        p.product_name,
        p.category,
        p.price,
        COUNT(oi.order_item_id) as times_ordered,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.quantity * oi.unit_price) as total_revenue,
        AVG(oi.unit_price) as avg_selling_price
    FROM products p
    JOIN order_items oi ON p.product_id = oi.product_id
    JOIN orders o ON oi.order_id = o.order_id
    WHERE o.created_at >= '2024-01-01' 
      AND o.created_at < '2024-02-01'
      AND o.status IN ('completed', 'shipped')
    GROUP BY p.product_id, p.product_name, p.category, p.price
),
regional_metrics AS (
    SELECT 
        au.region,
        COUNT(DISTINCT au.user_id) as active_users_count,
        COUNT(DISTINCT us.user_id) as purchasing_users_count,
        COALESCE(SUM(us.total_amount), 0) as region_revenue,
        COALESCE(AVG(us.total_amount), 0) as avg_revenue_per_user,
        COALESCE(SUM(us.total_orders), 0) as total_orders_in_region
    FROM active_users au
    LEFT JOIN user_stats us ON au.user_id = us.user_id
    GROUP BY au.region
),
top_products AS (
    SELECT 
        product_id,
        product_name,
        category,
        total_revenue,
        total_quantity_sold,
        ROW_NUMBER() OVER (ORDER BY total_revenue DESC) as revenue_rank,
        ROW_NUMBER() OVER (ORDER BY total_quantity_sold DESC) as quantity_rank
    FROM product_performance
),
customer_segments AS (
    SELECT 
        us.user_id,
        au.email,
        au.region,
        us.total_amount,
        us.total_orders,
        us.avg_order_amount,
        CASE 
            WHEN us.total_amount >= 1000 THEN 'High Value'
            WHEN us.total_amount >= 500 THEN 'Medium Value'
            WHEN us.total_amount >= 100 THEN 'Regular'
            ELSE 'Low Value'
        END as customer_segment,
        CASE 
            WHEN us.total_orders >= 10 THEN 'Frequent'
            WHEN us.total_orders >= 5 THEN 'Moderate'
            ELSE 'Occasional'
        END as purchase_frequency,
        EXTRACT(DAY FROM (us.last_order_date - us.first_order_date)) as customer_lifetime_days
    FROM user_stats us
    JOIN active_users au ON us.user_id = au.user_id
)
SELECT 
    'Summary Report' as report_section,
    rm.region,
    rm.active_users_count,
    rm.purchasing_users_count,
    ROUND(rm.region_revenue, 2) as region_revenue,
    ROUND(rm.avg_revenue_per_user, 2) as avg_revenue_per_user,
    rm.total_orders_in_region,
    ROUND(
        CASE 
            WHEN rm.active_users_count > 0 
            THEN (rm.purchasing_users_count::DECIMAL / rm.active_users_count) * 100 
            ELSE 0 
        END, 2
    ) as conversion_rate_percent
FROM regional_metrics rm

UNION ALL

SELECT 
    'Customer Segments' as report_section,
    cs.customer_segment as region,
    COUNT(*) as active_users_count,
    COUNT(*) as purchasing_users_count,
    ROUND(SUM(cs.total_amount), 2) as region_revenue,
    ROUND(AVG(cs.total_amount), 2) as avg_revenue_per_user,
    SUM(cs.total_orders) as total_orders_in_region,
    ROUND(AVG(cs.customer_lifetime_days), 2) as conversion_rate_percent
FROM customer_segments cs
GROUP BY cs.customer_segment

UNION ALL

SELECT 
    'Top Products by Revenue' as report_section,
    tp.product_name as region,
    tp.revenue_rank as active_users_count,
    tp.quantity_rank as purchasing_users_count,
    ROUND(tp.total_revenue, 2) as region_revenue,
    tp.total_quantity_sold as avg_revenue_per_user,
    0 as total_orders_in_region,
    0 as conversion_rate_percent
FROM top_products tp
WHERE tp.revenue_rank <= 10

ORDER BY 
    CASE report_section
        WHEN 'Summary Report' THEN 1
        WHEN 'Customer Segments' THEN 2
        WHEN 'Top Products by Revenue' THEN 3
    END,
    region_revenue DESC
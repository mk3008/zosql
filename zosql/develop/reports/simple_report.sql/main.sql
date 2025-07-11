/* Auto-generated CTE block - do not edit manually */
/* Dependencies: */
/* /zosql/develop/reports/simple_report.sql/cte/user_orders.sql */
/* /zosql/develop/reports/simple_report.sql/cte/active_users.sql */
with user_orders as (select user_id, count(*) as order_count, sum(amount) as total_amount from orders where created_at >= '2024-01-01' group by user_id), active_users as (select user_id, email, region from users where last_login >= current_date - INTERVAL '30 days')
select
    au.region
    , count(distinct au.user_id) as user_count
    , sum(uo.order_count) as total_orders
    , sum(uo.total_amount) as total_revenue
from
    active_users as au
    left join user_orders as uo on au.user_id = uo.user_id
group by
    au.region
order by
    total_revenue desc
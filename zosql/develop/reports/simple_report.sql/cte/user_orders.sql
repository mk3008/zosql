select
    user_id
    , count(*) as order_count
    , sum(amount) as total_amount
from
    orders
where
    created_at >= '2024-01-01'
group by
    user_id
with
    user_stats as (select user_id , count(*) as order_count , sum(amount) as total_amount from orders where created_at >= '2024-01-01' group by user_id),
    active_users as (select user_id from users where last_login >= current_date - INTERVAL '30 days')
select
    u.user_id
    , u.order_count
    , u.total_amount
    , case
        when u.total_amount > 1000 then
            'Premium'
        else
            'Standard'
    end as user_tier
from
    user_stats as u
    inner join active_users as a on u.user_id = a.user_id
order by
    u.total_amount desc
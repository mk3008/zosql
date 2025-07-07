select
    user_id
from
    users
where
    last_login >= current_date - INTERVAL '30 days'
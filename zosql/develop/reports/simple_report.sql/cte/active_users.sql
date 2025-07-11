select
    user_id
    , email
    , region
from
    users
where
    last_login >= current_date - INTERVAL '30 days'
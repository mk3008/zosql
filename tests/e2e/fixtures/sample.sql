-- Test SQL file for E2E testing
SELECT user_id, name, email FROM users 
WHERE active = true 
ORDER BY user_id;
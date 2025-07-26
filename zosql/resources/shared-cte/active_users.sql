/* name: active_users */
/* description: 注文履歴があるユーザー */
/* dependencies: [] */
SELECT u.* 
FROM users u 
WHERE u.id IN
 (SELECT DISTINCT user_id FROM orders)

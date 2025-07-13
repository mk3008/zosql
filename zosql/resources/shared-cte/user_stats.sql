/* name: user_stats */
/* description: ユーザーごとの注文統計 */
/* dependencies: [] */
SELECT user_id, COUNT(*) as order_count, SUM(amount) as total_amount 
FROM orders 
GROUP BY user_id
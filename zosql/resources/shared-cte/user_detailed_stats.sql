/* name: user_detailed_stats */
/* description: ユーザー情報付きの詳細統計 */
/* dependencies: ["user_stats"] */
SELECT us.*, u.name, u.email 
FROM user_stats us 
JOIN users u ON us.user_id = u.id
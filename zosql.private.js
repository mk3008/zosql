// zosql Shared CTE Definition
// These CTEs can be referenced like tables within the IDE

const sharedCtes = {
  // ユーザー統計CTE
  user_stats: {
    name: "user_stats",
    query: "SELECT user_id, COUNT(*) as order_count, SUM(amount) as total_amount FROM orders GROUP BY user_id",
    columns: [
      { name: "user_id", type: "INTEGER" },
      { name: "order_count", type: "BIGINT" },
      { name: "total_amount", type: "DECIMAL" }
    ],
    dependencies: [], // Dependencies on other shared CTEs
    description: "ユーザーごとの注文統計"
  },

  // 高額注文CTE
  high_value_orders: {
    name: "high_value_orders", 
    query: "SELECT * FROM orders WHERE amount > 100",
    columns: [
      { name: "id", type: "INTEGER" },
      { name: "user_id", type: "INTEGER" },
      { name: "amount", type: "DECIMAL" },
      { name: "order_date", type: "DATE" },
      { name: "status", type: "VARCHAR" },
      { name: "created_at", type: "TIMESTAMP" }
    ],
    dependencies: [],
    description: "100以上の高額注文"
  },

  // アクティブユーザーCTE
  active_users: {
    name: "active_users",
    query: "SELECT u.* FROM users u WHERE u.id IN (SELECT DISTINCT user_id FROM orders)",
    columns: [
      { name: "id", type: "INTEGER" },
      { name: "name", type: "VARCHAR" },
      { name: "email", type: "VARCHAR" },
      { name: "created_at", type: "TIMESTAMP" },
      { name: "updated_at", type: "TIMESTAMP" }
    ],
    dependencies: [],
    description: "注文履歴があるアクティブユーザー"
  },

  // ユーザー詳細統計（依存関係の例）
  user_detailed_stats: {
    name: "user_detailed_stats",
    query: "SELECT us.*, u.name, u.email FROM user_stats us JOIN users u ON us.user_id = u.id",
    columns: [
      { name: "user_id", type: "INTEGER" },
      { name: "order_count", type: "BIGINT" },
      { name: "total_amount", type: "DECIMAL" },
      { name: "name", type: "VARCHAR" },
      { name: "email", type: "VARCHAR" }
    ],
    dependencies: ["user_stats"], // user_statsに依存
    description: "ユーザー情報付きの詳細統計"
  }
};

export default sharedCtes;
// zosql Schema Definition
// This file defines the database schema for SQL IntelliSense

const schema = {
  tables: [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name', type: 'VARCHAR(255)' },
        { name: 'email', type: 'VARCHAR(255)' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'orders',
      columns: [
        { name: 'id', type: 'INTEGER PRIMARY KEY' },
        { name: 'user_id', type: 'INTEGER' },
        { name: 'amount', type: 'DECIMAL(10,2)' },
        { name: 'order_date', type: 'DATE' },
        { name: 'status', type: 'VARCHAR(50)' },
        { name: 'created_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'products',
      columns: [
        { name: 'id', type: 'INTEGER PRIMARY KEY' },
        { name: 'name', type: 'VARCHAR(255)' },
        { name: 'price', type: 'DECIMAL(10,2)' },
        { name: 'category', type: 'VARCHAR(100)' },
        { name: 'description', type: 'TEXT' },
        { name: 'created_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'user_sessions',
      columns: [
        { name: 'id', type: 'INTEGER PRIMARY KEY' },
        { name: 'user_id', type: 'INTEGER' },
        { name: 'session_id', type: 'VARCHAR(100)' },
        { name: 'start_time', type: 'TIMESTAMP' },
        { name: 'end_time', type: 'TIMESTAMP' },
        { name: 'page_views', type: 'INTEGER' },
        { name: 'actions_taken', type: 'INTEGER' },
        { name: 'device_type', type: 'VARCHAR(50)' },
        { name: 'browser', type: 'VARCHAR(50)' },
        { name: 'source_channel', type: 'VARCHAR(100)' },
        { name: 'created_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'events',
      columns: [
        { name: 'id', type: 'INTEGER PRIMARY KEY' },
        { name: 'user_id', type: 'INTEGER' },
        { name: 'session_id', type: 'VARCHAR(100)' },
        { name: 'event_type', type: 'VARCHAR(100)' },
        { name: 'event_time', type: 'TIMESTAMP' },
        { name: 'event_value', type: 'DECIMAL(10,2)' },
        { name: 'page_url', type: 'VARCHAR(500)' },
        { name: 'action_type', type: 'VARCHAR(100)' },
        { name: 'created_at', type: 'TIMESTAMP' }
      ]
    }
  ],
  functions: [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT',
    'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP',
    'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'SUBSTRING',
    'COALESCE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
  ]
};

// ES Module export
export default schema;
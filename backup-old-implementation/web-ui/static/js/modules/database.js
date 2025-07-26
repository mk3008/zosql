// database.js - Database initialization and management

let pgLiteInstance = null;

export async function initializeDatabase() {
  try {
    window.logger.info('Initializing PGLite database...');
    
    // Import PGLite dynamically
    const { PGlite } = await import('https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.2.0/dist/index.js');
    
    // Initialize PGlite
    pgLiteInstance = new PGlite();
    
    // Test database connection
    await pgLiteInstance.query('SELECT 1');
    
    // Update status
    const statusElement = document.getElementById('pglite-status');
    if (statusElement) {
      statusElement.textContent = 'Connected';
      statusElement.style.color = '#4caf50';
    }
    
    window.logger.info('PGLite database initialized successfully');
    
    // Initialize with sample data
    await initializeSampleData();
    
  } catch (error) {
    window.logger.error('Failed to initialize PGLite database:', error);
    
    const statusElement = document.getElementById('pglite-status');
    if (statusElement) {
      statusElement.textContent = 'Error';
      statusElement.style.color = '#f44336';
    }
    
    throw error;
  }
}

async function initializeSampleData() {
  try {
    // Create sample tables
    await pgLiteInstance.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pgLiteInstance.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10,2) NOT NULL,
        order_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await pgLiteInstance.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert sample data
    await pgLiteInstance.query(`
      INSERT INTO users (name, email) VALUES 
      ('John Doe', 'john@example.com'),
      ('Jane Smith', 'jane@example.com'),
      ('Bob Johnson', 'bob@example.com')
      ON CONFLICT (email) DO NOTHING;
    `);
    
    await pgLiteInstance.query(`
      INSERT INTO products (name, price, category, description) VALUES 
      ('Laptop', 999.99, 'Electronics', 'High-performance laptop'),
      ('Mouse', 29.99, 'Electronics', 'Wireless mouse'),
      ('Keyboard', 79.99, 'Electronics', 'Mechanical keyboard')
      ON CONFLICT DO NOTHING;
    `);
    
    await pgLiteInstance.query(`
      INSERT INTO orders (user_id, amount, order_date, status) VALUES 
      (1, 999.99, '2024-01-15', 'completed'),
      (2, 29.99, '2024-01-16', 'pending'),
      (1, 79.99, '2024-01-17', 'completed')
      ON CONFLICT DO NOTHING;
    `);
    
    window.logger.info('Sample data initialized successfully');
    
  } catch (error) {
    window.logger.warn('Error initializing sample data:', error);
    // Non-critical error, continue execution
  }
}

export async function executeQuery(sql) {
  if (!pgLiteInstance) {
    throw new Error('Database not initialized');
  }
  
  try {
    window.logger.info('Executing query:', sql);
    
    const startTime = performance.now();
    const result = await pgLiteInstance.query(sql);
    const executionTime = performance.now() - startTime;
    
    window.logger.info('Query executed successfully', {
      rowCount: result.rows?.length || 0,
      executionTime: `${executionTime.toFixed(2)}ms`
    });
    
    return {
      success: true,
      rows: result.rows || [],
      fields: result.fields || [],
      executionTime: executionTime
    };
    
  } catch (error) {
    window.logger.error('Query execution failed:', error);
    
    return {
      success: false,
      error: error.message,
      executionTime: 0
    };
  }
}

export async function resetDatabase() {
  try {
    window.logger.info('Resetting database...');
    
    // Drop all tables
    await pgLiteInstance.query('DROP TABLE IF EXISTS orders CASCADE');
    await pgLiteInstance.query('DROP TABLE IF EXISTS products CASCADE');
    await pgLiteInstance.query('DROP TABLE IF EXISTS users CASCADE');
    
    // Recreate sample data
    await initializeSampleData();
    
    window.logger.info('Database reset successfully');
    
  } catch (error) {
    window.logger.error('Failed to reset database:', error);
    throw error;
  }
}

export function getDatabaseInstance() {
  return pgLiteInstance;
}

export async function checkDatabaseStatus() {
  const statusElement = document.getElementById('pglite-status');
  
  if (!statusElement) return;
  
  try {
    if (pgLiteInstance) {
      await pgLiteInstance.query('SELECT 1');
      statusElement.textContent = 'Connected';
      statusElement.style.color = '#4caf50';
    } else {
      statusElement.textContent = 'Not initialized';
      statusElement.style.color = '#f44336';
    }
  } catch (error) {
    statusElement.textContent = 'Error';
    statusElement.style.color = '#f44336';
  }
}
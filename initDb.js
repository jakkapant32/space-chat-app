const pool = require('./db');
const bcrypt = require('bcrypt');

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Initializing database...');

    // Create users table with role and status
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        status VARCHAR(20) DEFAULT 'active',
        sleep_mode BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table chat_users created/verified');

    // Create pending users table (for registration approval)
    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table pending_users created/verified');

    // Create messages table (for persistent general chat)
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES chat_users(id) ON DELETE CASCADE,
        username VARCHAR(100),
        type VARCHAR(20) DEFAULT 'text',
        text TEXT,
        image TEXT,
        caption TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table messages created/verified');

    // Create private messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS private_messages (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER REFERENCES chat_users(id) ON DELETE CASCADE,
        to_user_id INTEGER REFERENCES chat_users(id) ON DELETE CASCADE,
        type VARCHAR(20) DEFAULT 'text',
        text TEXT,
        image TEXT,
        caption TEXT,
        deleted_by_sender BOOLEAN DEFAULT FALSE,
        deleted_by_receiver BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table private_messages created/verified');

    // Create friendships table
    await client.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER REFERENCES chat_users(id) ON DELETE CASCADE,
        user2_id INTEGER REFERENCES chat_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_id, user2_id)
      )
    `);
    console.log('✅ Table friendships created/verified');

    // Create friend requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER REFERENCES chat_users(id) ON DELETE CASCADE,
        to_user_id INTEGER REFERENCES chat_users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_user_id, to_user_id)
      )
    `);
    console.log('✅ Table friend_requests created/verified');

    // Check if users already exist
    const existingUsers = await client.query('SELECT username FROM chat_users');
    
    if (existingUsers.rows.length === 0) {
      // Hash passwords
      const password = '13141504';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert default users (admin and regular user)
      await client.query(`
        INSERT INTO chat_users (username, password_hash, display_name, role, status)
        VALUES 
          ($1, $2, $3, $4, $5),
          ($6, $7, $8, $9, $10)
      `, ['admin', hashedPassword, 'Admin', 'admin', 'active',
          'saturn', hashedPassword, 'Saturn', 'user', 'active']);

      console.log('✅ Users created:');
      console.log('   - Username: admin, Display Name: Admin, Password: 13141504, Role: admin');
      console.log('   - Username: saturn, Display Name: Saturn, Password: 13141504, Role: user');
    } else {
      console.log('ℹ️  Users already exist:', existingUsers.rows.map(r => r.username).join(', '));
    }

    console.log('✅ Database initialization completed!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('\n✅ Setup complete! You can now start the server with: npm start');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = initializeDatabase;


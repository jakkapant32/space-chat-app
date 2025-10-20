const pool = require('./db');
const bcrypt = require('bcrypt');

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Initializing database...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table chat_users created/verified');

    // Check if users already exist
    const existingUsers = await client.query('SELECT username FROM chat_users');
    
    if (existingUsers.rows.length === 0) {
      // Hash passwords
      const password = '13141504';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert users
      await client.query(`
        INSERT INTO chat_users (username, password_hash, display_name)
        VALUES 
          ($1, $2, $3),
          ($4, $5, $6)
      `, ['saturn', hashedPassword, 'Saturn', 'pluto', hashedPassword, 'Pluto']);

      console.log('✅ Users created:');
      console.log('   - Username: saturn, Display Name: Saturn, Password: 13141504');
      console.log('   - Username: pluto, Display Name: Pluto, Password: 13141504');
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


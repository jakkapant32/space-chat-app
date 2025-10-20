const { Pool } = require('pg');
const config = require('./config');

// PostgreSQL connection pool
const poolConfig = {
  connectionString: config.databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
};

const pool = new Pool(poolConfig);

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = pool;


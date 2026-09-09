// ============================================================
// db.js - PostgreSQL Connection Pool for Node.js
// ============================================================
const { Pool } = require('pg');

const pool = new Pool({
    host:     'localhost',
    port:     5432,
    database: 'canteen_comparison',
    user:     'postgres',
    password: 'drawing12345',
    max:      20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
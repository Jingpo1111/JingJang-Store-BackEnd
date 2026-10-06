require('dotenv').config(); // load variables from .env file
const mysql = require('mysql2');

// Configure MySQL connection pool using .env variables
const poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
};

const db = mysql.createPool(poolConfig);

// Verify initial database connection from pool
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Failed to connect to MySQL pool:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL database pool.');

    // Auto-ensure role column exists in users table
    connection.query("SHOW COLUMNS FROM users LIKE 'role'", (colErr, rows) => {
        if (!colErr && rows && rows.length === 0) {
            connection.query("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'customer'", (alterErr) => {
                if (!alterErr) console.log("✅ Added 'role' column to users table.");
            });
        }
    });

    connection.release();
});

module.exports = db;
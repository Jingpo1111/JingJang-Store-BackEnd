require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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

// Handle SSL if configured (e.g. for Aiven cloud database)
if (process.env.DB_SSL_CA) {
    const caPath = path.resolve(process.env.DB_SSL_CA);
    if (fs.existsSync(caPath)) {
        poolConfig.ssl = {
            ca: fs.readFileSync(caPath)
        };
    } else {
        const fallbackPath = path.resolve('aiven/ca.pem');
        if (fs.existsSync(fallbackPath)) {
            poolConfig.ssl = {
                ca: fs.readFileSync(fallbackPath)
            };
        }
    }
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;

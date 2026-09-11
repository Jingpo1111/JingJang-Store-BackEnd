require('dotenv').config();
const mysql = require('mysql2/promise');


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
const pool = mysql.createPool(poolConfig);

module.exports = pool;

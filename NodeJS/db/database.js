require('dotenv').config(); // load variables from .env file
const mysql = require('mysql2');

const fs = require('fs');
const path = require('path');

// Configure the MySQL connection using .env variables
const connectionConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: 'Z'
};

// Handle SSL if configured
if (process.env.DB_SSL_CA) {
    const caPath = path.resolve(process.env.DB_SSL_CA);
    if (fs.existsSync(caPath)) {
        connectionConfig.ssl = {
            ca: fs.readFileSync(caPath)
        };
    } else {
        // Fallback to checking aiven/ca.pem if certs/ca.pem does not exist
        const fallbackPath = path.resolve('aiven/ca.pem');
        if (fs.existsSync(fallbackPath)) {
            connectionConfig.ssl = {
                ca: fs.readFileSync(fallbackPath)
            };
        } else {
            console.warn(`⚠️ SSL CA file not found at: ${caPath} or ${fallbackPath}. Connecting without SSL CA...`);
        }
    }
}

const db = mysql.createConnection(connectionConfig);

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('❌ Failed to connect to MySQL:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL database.');
});

module.exports = db;
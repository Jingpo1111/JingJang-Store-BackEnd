require('dotenv').config(); // load variables from .env file
const mysql = require('mysql2');

// Configure the MySQL connection using .env variables
const connectionConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: 'Z'
};


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
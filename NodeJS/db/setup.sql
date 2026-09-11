-- ============================================================
-- JingJang Store — MySQL Database Setup
-- Run this in your MySQL database: JingJang_store
-- ============================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    userid          INT AUTO_INCREMENT PRIMARY KEY,
    userid_str      VARCHAR(20) NOT NULL UNIQUE,   -- e.g. JJ-0001
    username        VARCHAR(100) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,           -- base64 encoded
    email           VARCHAR(150) NOT NULL UNIQUE,
    register_date   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Orders table
CREATE TABLE IF NOT EXISTS orders (
    orderid         INT AUTO_INCREMENT PRIMARY KEY,
    order_id_str    VARCHAR(20) NOT NULL UNIQUE,    -- e.g. ORD-0001
    userid          VARCHAR(50) NOT NULL,           -- references users.userid_str
    name            VARCHAR(200),
    Phone           VARCHAR(30),
    Address         TEXT,
    Total           DECIMAL(10,2),
    Items           TEXT,                           -- JSON string of cart items
    Receipt         LONGTEXT,                       -- base64 image or 'No Receipt'
    CurrentStatus   VARCHAR(50) DEFAULT 'Pending',
    Note            TEXT,
    status_history  TEXT,                           -- JSON array of {status, date}
    order_date      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. OTP codes table (for email verification)
CREATE TABLE IF NOT EXISTS otp_codes (
    email       VARCHAR(150) PRIMARY KEY,
    otp_code    VARCHAR(10),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Categories table
CREATE TABLE IF NOT EXISTS categarys (
    categaryid      INT AUTO_INCREMENT PRIMARY KEY,
    categaryname    VARCHAR(150) NOT NULL
);

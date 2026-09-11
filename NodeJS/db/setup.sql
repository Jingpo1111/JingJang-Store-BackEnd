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
    Receipt         VARCHAR(500) DEFAULT 'No Receipt', -- Cloudinary HTTPS image URL or 'No Receipt'
    CurrentStatus   VARCHAR(50) DEFAULT 'Pending',
    Note            TEXT,
    status_history  TEXT,                           -- JSON array of {status, date}
    order_date      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. OTP codes table (for email verification & password reset tokens)
CREATE TABLE IF NOT EXISTS otp_codes (
    email            VARCHAR(150) PRIMARY KEY,
    otp_code         VARCHAR(10),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    reset_token      VARCHAR(500) DEFAULT NULL,
    token_expires_at DATETIME DEFAULT NULL
);

-- 4. Categories table
CREATE TABLE IF NOT EXISTS categories (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL
);

-- 5. Products table (supports custom options: Size, Type, etc.)
CREATE TABLE IF NOT EXISTS products (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    category_id     INT,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(100),
    cart_name       VARCHAR(255),
    specs           TEXT,
    price           DECIMAL(10,2) NOT NULL,
    color_name      VARCHAR(100),
    colors          TEXT,
    option_name     VARCHAR(100) DEFAULT NULL,   -- e.g. 'Size', 'Type', 'Model'
    option_values   TEXT DEFAULT NULL,           -- JSON array e.g. ["S","M","L","XL"]
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 6. Product images table
CREATE TABLE IF NOT EXISTS product_images (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    product_id      INT NOT NULL,
    image_url       TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

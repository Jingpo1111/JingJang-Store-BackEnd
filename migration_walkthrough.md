# JingJang Store — Migration Documentation (Before & After)

This document provides a detailed overview of the system architecture before and after the migration. It details how to set up, run, and develop the application under the new Node.js & Aiven MySQL architecture.

---

## 1. Before vs. After Architecture

| Feature | Before (Google Apps Script) | After (Node.js & Aiven MySQL) |
| :--- | :--- | :--- |
| **Backend Server** | Serverless: Google Apps Script Web Apps | Dedicated: Node.js Express server (`http://localhost:3000`) |
| **Database** | Google Sheets (tables represented as spreadsheets) | Aiven Hosted MySQL Database (`jingjang_store` DB) |
| **Authentication** | Username/password stored in Sheet. Simple base64 encode | Stored in MySQL `users` table. Stored in base64. |
| **OTP Verification** | Google Apps Script + EmailJS CDN | Express `/otp` routes + local db storage + EmailJS CDN |
| **Receipt Processing** | Base64 strings sent to Telegram | Backend multipart binary stream upload to Telegram |
| **Admin Dashboard** | Script-based fetching from Sheets | Admin page (`dashboard.html`) interacting with Express API |

---

## 2. File & Folder Structure

```
JingJang-Store/
├── FrontEnd/                     # Frontend SPA Client
│   ├── index.html                # SPA Main Shell (loads pages dynamically)
│   ├── dashboard.html            # Admin Dashboard (Orders & Users control)
│   ├── login/                    # Login, Register, & OTP pages
│   │   ├── login.html
│   │   ├── login.js              # Interacts with Node.js /user & /otp APIs
│   │   └── OTP.html
│   ├── checkout/                 # Cart Checkout (Submits order, uploads receipts)
│   │   ├── checkout.html
│   │   └── checkout.js
│   ├── profile/                  # User Profile & Order History
│   │   ├── profile.html
│   │   └── profile.js
│   └── (other static folders)    # about, contact, footer, header, img, etc.
└── NodeJS/                       # Express API Backend
    ├── .env                      # Database configuration & API tokens (ignored by git)
    ├── .gitignore                # Prevents committing .env and node_modules
    ├── sever.js                  # Main server entry point
    ├── aiven/
    │   └── ca.pem                # SSL Certificate file for Aiven DB connection
    ├── db/
    │   ├── database.js           # Initializes mysql2 pool with SSL and UTC timezone
    │   ├── migrate.sql           # Schema definition (orders, users, otp_codes tables)
    │   └── setup.sql             # DB schema migration commands
    └── routes/                   # Route handlers
        ├── Categary.js           # Categories API
        ├── order.js              # Orders API (CRUD, status edits, deletes, Telegram uploads)
        ├── otp.js                # OTP Code generators/verifiers
        └── user.js               # Registration, Login, and Password changes APIs
```

---

## 3. Database Schema (`NodeJS/db/migrate.sql`)

### Users Table
```sql
CREATE TABLE users (
    userid INT AUTO_INCREMENT PRIMARY KEY,
    userid_str VARCHAR(50) UNIQUE,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    register_date DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Table
```sql
CREATE TABLE orders (
    orderid INT AUTO_INCREMENT PRIMARY KEY,
    order_id_str VARCHAR(100) UNIQUE,
    userid_str VARCHAR(50),
    username VARCHAR(100),
    items TEXT,
    total_price DECIMAL(10,2),
    payment_method VARCHAR(50),
    receipt_photo LONGTEXT, -- Stores base64 encoded receipt image
    status VARCHAR(50) DEFAULT 'Pending',
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### OTP Codes Table
```sql
CREATE TABLE otp_codes (
    email VARCHAR(150) PRIMARY KEY,
    otp_code VARCHAR(10) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Key Feature Changes & Implementations

### A. Database Timezone Correction (`NodeJS/db/database.js`)
*   **Before**: Querying DB time directly created discrepancies since your Aiven DB was configured in UTC time, whereas your Node.js process interpreted it in Cambodia time (+7 hours). This caused generated OTPs to expire immediately.
*   **After**: Configured the MySQL connection with `timezone: 'Z'` (UTC). Now Node.js parses the dates correctly, and OTP verification succeeds.

### B. Order Deletion Security
*   **Action**: Order deletion from the Admin Dashboard (`FrontEnd/dashboard.html`) now prompts for a password.
*   **Password**: `15102006`

### C. Telegram Receipt Uploads
*   **Before**: The Google Apps Script sent raw base64 images directly which had file size limitations.
*   **After**: The Node.js backend converts the base64 receipt to a binary buffer stream and performs a multipart form POST request directly to Telegram's `sendPhoto` API. This results in stable, large-file receipts reaching your Telegram channel.

---

## 5. Development Guide (How to Use Before & After Edits)

### Step 1: Set Up Backend Environment Variables (`NodeJS/.env`)
Create a file named `.env` inside the `NodeJS/` directory. Fill it with the database credentials:
```env
PORT=3000
DB_HOST=mysql-2fff3a1a-phaijingpo016441653-189e.a.aivencloud.com
DB_PORT=12141
DB_USER=avnadmin
DB_PASSWORD=<YOUR_AIVEN_DB_PASSWORD>
DB_NAME=jingjang_store
DB_SSL_CA=aiven/ca.pem

TELEGRAM_BOT_TOKEN=<YOUR_TELEGRAM_BOT_TOKEN>
TELEGRAM_CHAT_ID=<YOUR_TELEGRAM_CHAT_ID>
```

### Step 2: Start the Backend Server
```bash
cd NodeJS
npm install
npm run dev
```
The server will boot on `http://localhost:3000` with hot-reloading (`nodemon`).

### Step 3: Run the Frontend SPA Client
You can open `FrontEnd/index.html` directly in the browser or serve it using any simple static live server (e.g. VS Code Live Server extension). The frontend is configured to call `http://localhost:3000` for all API needs.

---

## 6. How to Edit Code Safely (Git Best Practices)

*   **Never commit `.env`**: Make sure `.env` is listed inside `NodeJS/.gitignore` so your database password doesn't get leaked onto GitHub.
*   **Single Git Repo**: Keep the `FrontEnd/.git` folder deleted. This ensures your main repository contains all files in a single place without problematic nested submodule structures.

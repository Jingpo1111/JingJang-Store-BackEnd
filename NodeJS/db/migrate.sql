-- Drop FK constraint before changing userid column type
ALTER TABLE orders DROP FOREIGN KEY orders_ibfk_1;

-- Add userid_str column to users (JJ-XXXX format)
ALTER TABLE users ADD COLUMN userid_str VARCHAR(20) UNIQUE AFTER userid;
ALTER TABLE users ADD COLUMN register_date DATETIME DEFAULT CURRENT_TIMESTAMP AFTER email;

-- Add missing columns to orders
ALTER TABLE orders ADD COLUMN order_id_str VARCHAR(20) UNIQUE AFTER orderid;
ALTER TABLE orders ADD COLUMN name VARCHAR(200) AFTER userid;
ALTER TABLE orders ADD COLUMN Items TEXT AFTER Receipt;
ALTER TABLE orders ADD COLUMN status_history TEXT AFTER Note;
ALTER TABLE orders ADD COLUMN order_date DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Change userid to VARCHAR (was INT FK, now stores JJ-XXXX strings)
ALTER TABLE orders MODIFY COLUMN userid VARCHAR(50);

-- Make CurrentStatus a plain VARCHAR (was ENUM)
ALTER TABLE orders MODIFY COLUMN CurrentStatus VARCHAR(50) DEFAULT 'Pending';

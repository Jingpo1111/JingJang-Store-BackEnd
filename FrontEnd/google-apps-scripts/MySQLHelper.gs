// ============================================================
// 📌 MySQLHelper.gs — MySQL Connection & Query Helper for Google Apps Script
// ============================================================
// Google Apps Script built-in Jdbc service lets you connect directly 
// to Cloud SQL or public MySQL databases.
// ============================================================

// ⚠️ Database Configuration (Replace with your actual Database Credentials)
var DB_CONFIG = {
  host: 'YOUR_MYSQL_HOST',     // e.g. '34.xxx.xxx.xxx' or Cloud SQL connection string
  port: '3306',                 // Default MySQL port
  dbName: 'jingjing_store',     // Database name created from mysql_schema.sql
  username: 'YOUR_DB_USER',     // Database user
  password: 'YOUR_DB_PASSWORD'  // Database password
};

/**
 * Open JDBC MySQL Connection
 * Note: If using GCP Cloud SQL, use Jdbc.getCloudSqlConnection("jdbc:google:mysql://instance-name/dbname", user, pass)
 */
function getDbConnection() {
  try {
    var connectionUrl = 'jdbc:mysql://' + DB_CONFIG.host + ':' + DB_CONFIG.port + '/' + DB_CONFIG.dbName;
    return Jdbc.getConnection(connectionUrl, DB_CONFIG.username, DB_CONFIG.password);
  } catch (e) {
    Logger.log('MySQL Connection Error: ' + e.message);
    throw new Error('Failed to connect to MySQL database: ' + e.message);
  }
}

/**
 * Execute SELECT Query and return Array of Objects
 * @param {string} sql - SQL query string with ? placeholders
 * @param {Array} params - Parameters to bind to placeholders
 * @returns {Array<Object>}
 */
function queryMySQL(sql, params) {
  var conn = getDbConnection();
  var stmt = conn.prepareStatement(sql);
  
  if (params && params.length > 0) {
    for (var i = 0; i < params.length; i++) {
      stmt.setObject(i + 1, params[i]);
    }
  }
  
  var rs = stmt.executeQuery();
  var metaData = rs.getMetaData();
  var columnCount = metaData.getColumnCount();
  var results = [];
  
  while (rs.next()) {
    var row = {};
    for (var col = 1; col <= columnCount; col++) {
      var colName = metaData.getColumnLabel(col);
      row[colName] = rs.getObject(col);
    }
    results.push(row);
  }
  
  rs.close();
  stmt.close();
  conn.close();
  
  return results;
}

/**
 * Execute INSERT / UPDATE / DELETE Statement
 * @param {string} sql - SQL command with ? placeholders
 * @param {Array} params - Parameters to bind
 * @returns {number} Number of rows affected
 */
function executeMySQL(sql, params) {
  var conn = getDbConnection();
  var stmt = conn.prepareStatement(sql);
  
  if (params && params.length > 0) {
    for (var i = 0; i < params.length; i++) {
      stmt.setObject(i + 1, params[i]);
    }
  }
  
  var affectedRows = stmt.executeUpdate();
  stmt.close();
  conn.close();
  
  return affectedRows;
}

// ============================================================
// 💡 EXAMPLE USAGE REPLACING GOOGLE SHEETS WITH MYSQL:
// ============================================================

/**
 * Example 1: Register User in MySQL (AuthScript.gs)
 */
function registerUserMySQL(userId, username, password, email, registerDate) {
  var sql = "INSERT INTO users (user_id, username, password, email, register_date) VALUES (?, ?, ?, ?, ?)";
  return executeMySQL(sql, [userId, username, password, email, registerDate]);
}

/**
 * Example 2: Check Username or Email in MySQL (AuthScript.gs)
 */
function checkUserExistsMySQL(username, email) {
  var sql = "SELECT user_id, username, email FROM users WHERE username = ? OR email = ?";
  var results = queryMySQL(sql, [username, email]);
  return results;
}

/**
 * Example 3: Save Order in MySQL (OrderScript.gs)
 */
function saveOrderMySQL(orderId, userId, orderDate, name, phone, address, total, items, receiptUrl, status, note) {
  var sql = "INSERT INTO orders (order_id, user_id, order_date, name, phone, address, total, items, receipt_url, status, note) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
  
  executeMySQL(sql, [orderId, userId, orderDate, name, phone, address, total, items, receiptUrl, status, note]);
  
  var historySql = "INSERT INTO order_history (order_id, status, status_date) VALUES (?, ?, ?)";
  executeMySQL(historySql, [orderId, status, orderDate]);
}

/**
 * Example 4: Save / Verify OTP in MySQL (OTP.gs)
 */
function saveOtpMySQL(email, otpCode, timestamp) {
  var sql = "INSERT INTO otp_codes (email, otp_code, timestamp) VALUES (?, ?, ?) " +
            "ON DUPLICATE KEY UPDATE otp_code = VALUES(otp_code), timestamp = VALUES(timestamp)";
  return executeMySQL(sql, [email, otpCode, timestamp]);
}

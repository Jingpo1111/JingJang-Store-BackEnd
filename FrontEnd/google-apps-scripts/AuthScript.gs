// ============================================================
// 📌 AuthScript.gs — NEW Apps Script for Login/Register
// ============================================================
// Deploy this as a Web App (Execute as: Me, Access: Anyone)
// Uses Sheet tab "Users" in the same Spreadsheet
// Columns: A=UserID, B=Username, C=Password(base64), D=RegisterDate, E=Email
// ============================================================

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Users");

    // បង្កើត Sheet "Users" បើមិនទាន់មាន
    if (!sheet) {
      sheet = ss.insertSheet("Users");
      sheet.appendRow(["UserID", "Username", "Password", "RegisterDate", "Email"]);
    }

    var data = JSON.parse(e.postData.contents);

    // ========================
    // 📝 CHECK REGISTER (ពិនិត្យឈ្មោះ និង អ៊ីមែល)
    // ========================
    if (data.action === "checkRegister") {
      var username = data.username ? data.username.trim() : "";
      var email = data.email ? data.email.trim() : "";

      if (!username || !email) {
        return jsonResponse({ status: "error", message: "Username and email are required." });
      }

      var allData = sheet.getDataRange().getValues();
      for (var i = 1; i < allData.length; i++) {
        if (allData[i][1].toString().toLowerCase() === username.toLowerCase()) {
          return jsonResponse({ status: "error", message: "Username already exists. Please choose another." });
        }
        if (allData[i][4] && allData[i][4].toString().toLowerCase() === email.toLowerCase()) {
          return jsonResponse({ status: "error", message: "Email already registered. Please use another email." });
        }
      }

      return jsonResponse({ status: "success", message: "Username and email are available." });
    }

    // ========================
    // 📝 REGISTER (ចុះឈ្មោះ)
    // ========================
    if (data.action === "register") {
      var username = data.username.trim();
      var password = data.password;
      var email = data.email ? data.email.trim() : "";

      // ពិនិត្យ Username ទទេ
      if (!username || !password) {
        return jsonResponse({ status: "error", message: "Username and password are required." });
      }

      // ពិនិត្យ Email ទទេ
      if (!email) {
        return jsonResponse({ status: "error", message: "Email is required." });
      }

      // ពិនិត្យ Username ស្ទួន
      var allData = sheet.getDataRange().getValues();
      for (var i = 1; i < allData.length; i++) {
        if (allData[i][1].toString().toLowerCase() === username.toLowerCase()) {
          return jsonResponse({ status: "error", message: "Username already exists. Please choose another." });
        }
        // ពិនិត្យ Email ស្ទួន
        if (allData[i][4] && allData[i][4].toString().toLowerCase() === email.toLowerCase()) {
          return jsonResponse({ status: "error", message: "Email already registered. Please use another email." });
        }
      }

      // បង្កើត User ID ថ្មី (JJ-0001, JJ-0002...)
      var lastRow = sheet.getLastRow();
      var newIdNum = lastRow; // row 1 = header, so row 2 = user #1
      var userId = "JJ-" + ("0000" + newIdNum).slice(-4);

      // Encode password ជា base64 (សម្រាប់ school project)
      var encodedPassword = Utilities.base64Encode(password);

      // ថ្ងៃខែចុះឈ្មោះ
      var now = new Date();
      var registerDate = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy hh:mm a");

      // បញ្ចូលទិន្នន័យ (ថែម Email នៅ Column E)
      sheet.appendRow([userId, username, encodedPassword, registerDate, email]);

      return jsonResponse({
        status: "success",
        action: "register",
        userId: userId,
        username: username,
        email: email,
        registerDate: registerDate,
        message: "Registration successful! Your User ID is: " + userId
      });
    }

    // ========================
    // 🔐 LOGIN (ចូលប្រើ — Username ឬ Email)
    // ========================
    if (data.action === "login") {
      var loginInput = data.username.trim(); // អាចជា username ឬ email
      var password = data.password;

      if (!loginInput || !password) {
        return jsonResponse({ status: "error", message: "Username/Email and password are required." });
      }

      var encodedPassword = Utilities.base64Encode(password);
      var allData = sheet.getDataRange().getValues();

      for (var i = 1; i < allData.length; i++) {
        var dbUsername = allData[i][1].toString().toLowerCase();
        var dbEmail = (allData[i][4] || "").toString().toLowerCase();
        var dbPassword = allData[i][2].toString();

        // ពិនិត្យ username ឬ email
        if ((dbUsername === loginInput.toLowerCase() || dbEmail === loginInput.toLowerCase()) &&
            dbPassword === encodedPassword) {
          return jsonResponse({
            status: "success",
            action: "login",
            userId: allData[i][0],
            username: allData[i][1],
            email: allData[i][4] || "",
            registerDate: allData[i][3] || "",
            message: "Login successful!"
          });
        }
      }

      return jsonResponse({ status: "error", message: "Invalid username/email or password." });
    }

    // ========================
    // 🔄 CHANGE PASSWORD (ផ្លាស់ប្តូរពាក្យសម្ងាត់)
    // ========================
    if (data.action === "changePassword") {
      var userId = data.userId;
      var currentPassword = data.currentPassword;
      var newPassword = data.newPassword;

      if (!userId || !currentPassword || !newPassword) {
        return jsonResponse({ status: "error", message: "All fields are required." });
      }

      if (newPassword.length < 4) {
        return jsonResponse({ status: "error", message: "New password must be at least 4 characters." });
      }

      var encodedCurrent = Utilities.base64Encode(currentPassword);
      var encodedNew = Utilities.base64Encode(newPassword);
      var allData = sheet.getDataRange().getValues();

      for (var i = 1; i < allData.length; i++) {
        if (allData[i][0].toString() === userId) {
          // ពិនិត្យ current password ត្រូវឬអត់
          if (allData[i][2].toString() !== encodedCurrent) {
            return jsonResponse({ status: "error", message: "Current password is incorrect." });
          }
          // កែប្រែ password ថ្មី (Column C = index 3)
          sheet.getRange(i + 1, 3).setValue(encodedNew);
          return jsonResponse({ status: "success", message: "Password changed successfully!" });
        }
      }

      return jsonResponse({ status: "error", message: "User not found." });
    }

    // ========================
    // 🔐 VERIFY PASSWORD (សម្រាប់ Logout Confirmation)
    // ========================
    if (data.action === "verifyPassword") {
      var userId = data.userId;
      var password = data.password;

      if (!userId || !password) {
        return jsonResponse({ status: "error", message: "User ID and password are required." });
      }

      var encodedPassword = Utilities.base64Encode(password);
      var allData = sheet.getDataRange().getValues();

      for (var i = 1; i < allData.length; i++) {
        if (allData[i][0].toString() === userId) {
          if (allData[i][2].toString() === encodedPassword) {
            return jsonResponse({ status: "success", message: "Password verified." });
          } else {
            return jsonResponse({ status: "error", message: "Incorrect password." });
          }
        }
      }

      return jsonResponse({ status: "error", message: "User not found." });
    }

    // ========================
    // ℹ️ GET USER INFO (ព័ត៌មានអ្នកប្រើប្រាស់)
    // ========================
    if (data.action === "getUserInfo") {
      var userId = data.userId;

      if (!userId) {
        return jsonResponse({ status: "error", message: "User ID is required." });
      }

      var allData = sheet.getDataRange().getValues();
      for (var i = 1; i < allData.length; i++) {
        if (allData[i][0].toString() === userId) {
          return jsonResponse({
            status: "success",
            userId: allData[i][0],
            username: allData[i][1],
            registerDate: allData[i][3],
            email: allData[i][4] || ""
          });
        }
      }

      return jsonResponse({ status: "error", message: "User not found." });
    }

    // ========================
    // 🔑 RESET PASSWORD (កំណត់ពាក្យសម្ងាត់ឡើងវិញ — ពី Forgot Password)
    // ========================
    if (data.action === "resetPassword") {
      var email = data.email ? data.email.trim().toLowerCase() : "";
      var newPassword = data.newPassword;

      if (!email || !newPassword) {
        return jsonResponse({ status: "error", message: "Email and new password are required." });
      }

      if (newPassword.length < 4) {
        return jsonResponse({ status: "error", message: "New password must be at least 4 characters." });
      }

      var encodedNew = Utilities.base64Encode(newPassword);
      var allData = sheet.getDataRange().getValues();

      for (var i = 1; i < allData.length; i++) {
        if ((allData[i][4] || "").toString().toLowerCase() === email) {
          sheet.getRange(i + 1, 3).setValue(encodedNew);
          return jsonResponse({
            status: "success",
            message: "Password reset successfully! You can now login."
          });
        }
      }

      return jsonResponse({ status: "error", message: "Email not found." });
    }

    // ========================
    // 📧 CHECK EMAIL (ពិនិត្យមើល Email)
    // ========================
    if (data.action === "checkEmail") {
      var email = data.email ? data.email.trim().toLowerCase() : "";
      if (!email) {
        return jsonResponse({ status: "error", message: "Email is required." });
      }

      var allData = sheet.getDataRange().getValues();
      for (var i = 1; i < allData.length; i++) {
        if ((allData[i][4] || "").toString().toLowerCase() === email) {
          return jsonResponse({ status: "success", message: "Email is registered." });
        }
      }

      return jsonResponse({ status: "error", message: "Email not found." });
    }

    // ========================
    // 👥 GET ALL USERS (សម្រាប់ Admin Dashboard)
    // ========================
    if (data.action === "getAllUsers") {
      var allData = sheet.getDataRange().getValues();
      var usersList = [];
      
      for (var i = 1; i < allData.length; i++) {
        usersList.push({
          userId: allData[i][0],
          username: allData[i][1],
          registerDate: allData[i][3],
          email: allData[i][4] || ""
        });
      }
      
      return jsonResponse({
        status: "success",
        users: usersList
      });
    }

    return jsonResponse({ status: "error", message: "Unknown action." });

  } catch (error) {
    return jsonResponse({ status: "error", message: error.message });
  }
}

// មុខងារ doGet សម្រាប់ CORS preflight
function doGet(e) {
  return jsonResponse({ status: "ok", message: "Auth API is running." });
}

// Helper function សម្រាប់ JSON Response
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 📌 OrderScript.gs — MODIFIED Apps Script for Orders
// ============================================================
// This replaces your old script. Deploy as Web App.
// Sheet tab "Sheet1" (or your orders sheet)
// NEW Columns: A=OrderID, B=UserID, C=Date, D=Name, E=Phone,
//              F=Address, G=Total, H=Items, I=Receipt, J=Status, K=Note
// ============================================================

// ⚠️ Telegram Bot Token និង Chat ID របស់អ្នក
var TELEGRAM_BOT_TOKEN = '8787748303:AAFUFtL_fOr-24FUze7yA9SKVAgz3oBWXn4';
var TELEGRAM_CHAT_ID = '1671759342';

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    }
    var data = JSON.parse(e.postData.contents);

    // មុខងារសម្រាប់ Update Status (Column J = 10)
    if (data.action === "updateStatus") {
      sheet.getRange(data.rowIndex, 10).setValue(data.status);
      
      // Update History (Column L = 12)
      var now = new Date();
      var formattedDate = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy hh:mm a");
      var historyStr = sheet.getRange(data.rowIndex, 12).getValue();
      var history = [];
      if (historyStr) {
        try { history = JSON.parse(historyStr); } catch (e) { history = []; }
      }
      history.push({ status: data.status, date: formattedDate });
      sheet.getRange(data.rowIndex, 12).setValue(JSON.stringify(history));
      
      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // មុខងារសម្រាប់លុបទិន្នន័យ (Delete)
    if (data.action === "deleteOrder") {
      sheet.deleteRow(data.rowIndex);
      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // មុខងារបញ្ចូល Order ថ្មី
    var imageUrl = "No Receipt";
    if (data.image) {
      var decodedImage = Utilities.base64Decode(data.image.split(',')[1]);
      var blob = Utilities.newBlob(decodedImage, data.mimeType, data.name + '_Receipt');
      var file = DriveApp.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      imageUrl = file.getUrl();
    }

    // ⏱️ ចាប់យកថ្ងៃខែ និងម៉ោងបច្ចុប្បន្ន
    var now = new Date();
    var formattedDate = Utilities.formatDate(now, "GMT+7", "dd/MM/yyyy hh:mm a");

    // ចាប់យកចំណាំ (បើគ្មាន ដាក់ថា "គ្មាន")
    var note = data.note ? data.note : "គ្មាន";

    // 🆕 បង្កើត Order ID ថ្មី (ORD-0001, ORD-0002...)
    var lastRow = sheet.getLastRow();
    var orderNum = lastRow; // row 1 might be header or first data
    var orderId = "ORD-" + ("0000" + orderNum).slice(-4);

    // 🆕 ចាប់យក User ID ពី Frontend
    var userId = data.userId || "GUEST";

    // 🆕 បង្កើត History ដំបូង
    var initialHistory = JSON.stringify([{ status: "Pending", date: formattedDate }]);

    // 📝 បញ្ចូលទិន្នន័យទៅ Sheet (ថែម OrderID និង UserID នៅខាងមុខ)
    sheet.appendRow([
      orderId,        // Column A: Order ID
      userId,         // Column B: User ID
      formattedDate,  // Column C: Date/Time
      data.name,      // Column D: Name
      "'" + data.phone, // Column E: Phone
      data.address,   // Column F: Address
      data.total,     // Column G: Total
      data.items,     // Column H: Items
      imageUrl,       // Column I: Receipt
      "Pending",      // Column J: Status
      note,           // Column K: Note
      initialHistory  // Column L: Status History
    ]);

    // 🚀 ផ្ញើសារទៅកាន់ Telegram
    sendTelegramNotification(data, imageUrl, formattedDate, orderId, userId);

    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "orderId": orderId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

// មុខងារទាញទិន្នន័យទៅបង្ហាញលើ Dashboard
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  }
  var data = sheet.getDataRange().getValues();
  var result = [];

  // ពិនិត្យ Query Parameter សម្រាប់ Search by User ID
  var searchUserId = "";
  if (e && e.parameter && e.parameter.action === "searchByUser" && e.parameter.userId) {
    searchUserId = e.parameter.userId.trim().toUpperCase();
  }

  for (var i = 1; i < data.length; i++) {
    var order = {
      rowIndex: i + 1,
      orderId: data[i][0],    // Column A: Order ID
      userId: data[i][1],     // Column B: User ID
      date: data[i][2],       // Column C: Date
      name: data[i][3],       // Column D: Name
      phone: data[i][4],      // Column E: Phone
      address: data[i][5],    // Column F: Address
      total: data[i][6],      // Column G: Total
      items: data[i][7],      // Column H: Items
      receipt: data[i][8],    // Column I: Receipt
      status: data[i][9] || "Pending", // Column J: Status
      note: data[i][10] || "គ្មាន",     // Column K: Note
      history: data[i][11] || "[]"     // Column L: Status History
    };

    // បើមាន searchUserId រើសតែ order ដែលត្រូវ
    if (searchUserId) {
      if (String(order.userId).trim().toUpperCase() === searchUserId) {
        result.push(order);
      }
    } else {
      result.push(order);
    }
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

// មុខងារសម្រាប់រៀបចំ និងផ្ញើសារទៅ Telegram (ថែម OrderID និង UserID)
function sendTelegramNotification(orderData, receiptUrl, formattedDate, orderId, userId) {
  var message = "🔔 <b>មានការបញ្ជាទិញថ្មី (New Order)</b>\n\n";
  message += "🆔 Order ID: <b>" + orderId + "</b>\n";
  message += "👤 User ID: <b>" + userId + "</b>\n";
  message += "📅 ថ្ងៃម៉ោង: " + formattedDate + "\n";
  message += "👤 ឈ្មោះ: " + orderData.name + "\n";
  message += "📞 ទូរស័ព្ទ: <code>" + orderData.phone + "</code>\n";

  // ពិនិត្យមើលថាតើអាសយដ្ឋានជា Link ឬអត្ថបទធម្មតា
  if (orderData.address && orderData.address.startsWith('http')) {
    message += "📍 អាសយដ្ឋាន: <a href='" + orderData.address + "'>🗺️ បើកមើលផែនទី (Google Maps)</a>\n";
  } else {
    message += "📍 អាសយដ្ឋាន: " + orderData.address + "\n";
  }

  // 📦 បញ្ជីទំនិញ (Items)
  message += "\n🛍️ <b>ទំនិញដែលបានកុម្ម៉ង់:</b>\n";
  try {
    var itemsArray = JSON.parse(orderData.items);
    for (var i = 0; i < itemsArray.length; i++) {
      message += "- " + itemsArray[i].name + " <b>(x" + itemsArray[i].quantity + ")</b>\n";
    }
  } catch (e) {
    message += "- " + orderData.items + "\n";
  }

  message += "\n💰 ទឹកប្រាក់សរុប: <b>$" + orderData.total + "</b>\n";
  message += "📝 ចំណាំពីភ្ញៀវ: <b>" + (orderData.note || "គ្មាន") + "</b>\n";
  message += "🌐 View Admin Dashboard: https://dashboardjingjang.netlify.app/\n\n";

  if(receiptUrl !== "No Receipt") {
     message += "🧾 វិក្កយបត្រ: <a href='" + receiptUrl + "'>មើលរូបភាព</a>\n";
  }

  var url = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
  var payload = {
    "chat_id": TELEGRAM_CHAT_ID,
    "text": message,
    "parse_mode": "HTML"
  };

  UrlFetchApp.fetch(url, {
    "method": "post",
    "payload": payload
  });
}

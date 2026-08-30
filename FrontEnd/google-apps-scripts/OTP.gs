const SHEET_NAME = "OTP";

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action; 
    const email = params.email;
    
    if (action === "generate") {
      return ContentService.createTextOutput(JSON.stringify(generateOTP(email)))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === "verify") {
      return ContentService.createTextOutput(JSON.stringify(verifyOTP(email, params.otp)))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "ERROR", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function generateOTP(email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const timestamp = new Date();
  const data = sheet.getDataRange().getValues();
  let emailFound = false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      sheet.getRange(i + 1, 2).setValue(otp);
      sheet.getRange(i + 1, 3).setValue(timestamp);
      emailFound = true;
      break;
    }
  }
  
  if (!emailFound) {
    sheet.appendRow([email, otp, timestamp]);
  }
  
  // Return the OTP code back to the client so EmailJS can forward it securely
  return { status: "SUCCESS", otp: otp };
}

function verifyOTP(email, userOTP) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const NOW = new Date();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      if (NOW - new Date(data[i][2]) > (5 * 60 * 1000)) {
        return { status: "FAILED", message: "OTP has expired." };
      }
      if (data[i][1].toString() === userOTP.toString()) {
        sheet.getRange(i + 1, 2).setValue(""); 
        return { status: "SUCCESS", message: "Email verified successfully!" };
      } else {
        return { status: "FAILED", message: "Invalid OTP." };
      }
    }
  }
  return { status: "FAILED", message: "Email not found." };
}
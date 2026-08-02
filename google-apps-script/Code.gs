const SPREADSHEET_ID = "1fRIpH8-CKstOmlq22G2_BciHgd-qu7HwLhai-Cy8CEA";
const SHEET_NAME = "Odpowiedzi";
const TIME_ZONE = "Europe/Warsaw";
const SCRIPT_VERSION = "2026-08-02-2208";

/**
 * Run this function manually in Apps Script to verify access and configuration.
 * It does not add or change any rows.
 */
function testConfiguration() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === "PASTE_SPREADSHEET_ID_HERE") {
    throw new Error("Uzupełnij SPREADSHEET_ID w pierwszej linii pliku Code.gs.");
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(
      'Nie znaleziono arkusza "' + SHEET_NAME + '". Dostępne arkusze: ' +
      spreadsheet.getSheets().map(function (item) {
        return item.getName();
      }).join(", ")
    );
  }

  console.log(
    'Połączenie działa. Plik: "%s", arkusz: "%s".',
    spreadsheet.getName(),
    sheet.getName()
  );
}

/**
 * Lets the owner verify which deployed Web App version is currently active.
 */
function doGet() {
  return jsonResponse_({
    success: true,
    version: SCRIPT_VERSION,
    message: "Web App is running"
  });
}

/**
 * Receives application/x-www-form-urlencoded submissions from the static form.
 */
function doPost(e) {
  try {
    const data = getRequestData_(e);

    // Bots that fill the hidden field receive a normal success response,
    // but their submission is intentionally not stored.
    if (String(data.website || "").trim()) {
      return jsonResponse_({
        success: true,
        version: SCRIPT_VERSION
      });
    }

    const validated = validateData_(data);
    if (!validated) {
      return jsonResponse_({
        success: false,
        message: "Validation error",
        version: SCRIPT_VERSION
      });
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      throw new Error("Configured sheet does not exist");
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      sheet.appendRow([
        Utilities.getUuid(),
        Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd HH:mm:ss"),
        validated.name,
        validated.phone,
        validated.email,
        "TAK",
        validated.marketingConsent ? "TAK" : "NIE",
        validated.source
      ]);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse_({
      success: true,
      version: SCRIPT_VERSION
    });
  } catch (error) {
    console.error("Form submission failed: %s", error && error.message);
    return jsonResponse_({
      success: false,
      message: "Validation error",
      version: SCRIPT_VERSION
    });
  }
}

function getRequestData_(e) {
  if (e && e.parameter && Object.keys(e.parameter).length) {
    return e.parameter;
  }

  try {
    return JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (error) {
    return {};
  }
}

function validateData_(data) {
  const name = String(data.name || "").trim();
  const phone = normalizePhone_(data.phone);
  const email = String(data.email || "").replace(/\s+/g, "").toLowerCase();
  const privacyConsent = parseBoolean_(data.privacyConsent);
  const marketingConsent = parseBoolean_(data.marketingConsent);
  const source = String(data.source || "web").trim().slice(0, 50);

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  if (name.length < 2) {
    return null;
  }

  if (phone === null) {
    return null;
  }

  if (emailIsValid === false) {
    return null;
  }

  if (privacyConsent !== true) {
    return null;
  }

  return {
    name: name.slice(0, 100),
    phone: phone,
    email: email.slice(0, 254),
    marketingConsent: marketingConsent,
    source: source || "web"
  };
}

function normalizePhone_(value) {
  const rawValue = String(value || "").trim();
  if (!/^\+?[\d\s-]+$/.test(rawValue)) {
    return null;
  }

  let digits = rawValue.replace(/\D/g, "");

  if (digits.indexOf("48") === 0 && digits.length === 11) {
    digits = digits.slice(2);
  }

  return /^\d{9}$/.test(digits) ? "+48" + digits : null;
}

function parseBoolean_(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

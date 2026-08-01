/**
 * MONITORING PHOTO SYSTEM — BACKEND (v2)
 * ----------------------------------------
 * Read (doGet) is public — anyone can search/browse, matching the
 * requirement that visitors can view everything but not modify it.
 *
 * Write (doPost) requires a shared password sent with every request,
 * checked here on the server — not just hidden in the frontend UI.
 * Supports three actions: "verify" (check a password without writing
 * anything — used for instant UI feedback), "add" (create folder +
 * upload photos + append Sheet row), and "delete" (remove a Sheet row
 * and trash its Drive folder).
 *
 * SETUP:
 * 1. Set ROOT_FOLDER_ID, SHEET_NAME, and ADMIN_PASSWORD below
 * 2. Deploy -> Manage deployments -> New version (or New deployment if
 *    this is the first time) -> Web app -> Execute as: Me, Who has
 *    access: Anyone
 * 3. Copy the /exec URL into src/lib/api.ts's APPS_SCRIPT_URL
 */

// ---------- CONFIG: fill these in ----------
const ROOT_FOLDER_ID = "PASTE_YOUR_DRIVE_FOLDER_ID_HERE";
const SHEET_NAME = "Monitoring Index";
const ADMIN_PASSWORD = "123456"; // change this to your real 6-digit password

// ---------- read: serves the sheet's data to the website, or a single folder's photos ----------
function doGet(e) {
  if (e.parameter.action === "photos" && e.parameter.folderId) {
    return getFolderPhotos(e.parameter.folderId);
  }

  // Cache the sheet listing for 4 minutes — repeated page loads/refreshes
  // (from you or anyone else browsing) hit this cache instead of re-reading
  // the whole Sheet every single time, which is the slowest part of a read.
  const cache = CacheService.getScriptCache();
  const cached = cache.get("sheet_data");
  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1)
    .filter((row) => row.some((cell) => cell !== "" && cell !== null))
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = row[i];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
        }
        obj[h] = val;
      });
      return obj;
    });

  const json = JSON.stringify(rows);
  cache.put("sheet_data", json, 240); // 4 minutes — well under the 5-minute sync cycle
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// ---------- read: lists a folder's actual image files, with viewable URLs ----------
function getFolderPhotos(folderId) {
  try {
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const photos = [];
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType().indexOf("image/") === 0) {
        photos.push({
          id: file.getId(),
          name: file.getName(),
          // works for files shared "Anyone with the link — Viewer", no auth needed
          url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w600",
        });
      }
    }
    return jsonResponse(photos);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ---------- write: add / delete / verify, all password-gated ----------
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || "add"; // default to "add" for backward compatibility

    if (action === "verify") {
      return jsonResponse({ ok: data.password === ADMIN_PASSWORD });
    }

    // every other action requires the correct password — checked here,
    // not trusted from the frontend
    if (data.password !== ADMIN_PASSWORD) {
      return jsonResponse({ ok: false, error: "Incorrect password." });
    }

    if (action === "delete") {
      return handleDelete(data);
    }

    return handleAdd(data);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

// ---------- add: create Drive folder + upload photos + append Sheet row ----------
function handleAdd(data) {
  const { brand, site, panel, direction, date, department, photos } = data;

  if (!brand || !site || !date) {
    return jsonResponse({ ok: false, error: "Missing required fields (brand, site, date)." });
  }

  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const brandFolder = getOrCreateFolder(root, brand);

  const dateObj = new Date(date + "T00:00:00");
  const dateCode = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "MMddyy");
  const folderNameParts = [site, panel, direction, dateCode].filter(Boolean);
  const folderName = folderNameParts.join(" ");
  const siteFolder = brandFolder.createFolder(folderName);

  (photos || []).forEach((p) => {
    const bytes = Utilities.base64Decode(p.base64Data);
    const blob = Utilities.newBlob(bytes, p.mimeType, p.name);
    siteFolder.createFile(blob);
  });

  // append the row, matching the Sheet's real column order exactly:
  // Brand, Site, Panel, Direction, Date, Department, Photo Count,
  // Folder Name (original), Folder Link, Needs Review
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  sheet.appendRow([
    brand,
    site,
    panel || "",
    direction || "",
    date,
    department || "",
    (photos || []).length,
    folderName,
    siteFolder.getUrl(),
    "", // Needs Review — blank, since required fields were validated above
  ]);

  CacheService.getScriptCache().remove("sheet_data"); // so the new row shows up immediately
  return jsonResponse({ ok: true, folderUrl: siteFolder.getUrl() });
}

// ---------- delete: remove the matching Sheet row + trash its Drive folder ----------
function handleDelete(data) {
  const { folderLink } = data;
  if (!folderLink) {
    return jsonResponse({ ok: false, error: "Missing folderLink to identify which row to delete." });
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const linkCol = headers.indexOf("Folder Link");

  if (linkCol === -1) {
    return jsonResponse({ ok: false, error: "Could not find 'Folder Link' column." });
  }

  let rowIndexToDelete = -1;
  for (let r = 1; r < values.length; r++) {
    if (values[r][linkCol] === folderLink) {
      rowIndexToDelete = r;
      break;
    }
  }

  if (rowIndexToDelete === -1) {
    return jsonResponse({ ok: false, error: "No matching row found for that folder." });
  }

  // trash the Drive folder (soft delete — recoverable from Drive trash)
  const folderId = extractFolderId(folderLink);
  if (folderId) {
    try {
      DriveApp.getFolderById(folderId).setTrashed(true);
    } catch (err) {
      // folder may already be gone — don't block the row deletion on this
    }
  }

  sheet.deleteRow(rowIndexToDelete + 1); // +1 because Sheet rows are 1-indexed
  CacheService.getScriptCache().remove("sheet_data"); // so the removal shows up immediately
  return jsonResponse({ ok: true });
}

// ---------- helper: pull the Drive folder ID out of its share URL ----------
function extractFolderId(url) {
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// ---------- helper: find a subfolder by name, or create it ----------
function getOrCreateFolder(parent, name) {
  const existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(name);
}

// ---------- helper: JSON response with CORS-friendly plain text ----------
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ---------- sync: keeps the Sheet in step with Drive ----------
 * Run this on a timer (see installSyncTrigger below) so that folders added
 * or removed directly in Drive — outside the website entirely — show up
 * correctly on the website without anyone having to do anything manually.
 *
 * - A new site-visit folder found in Drive but missing from the Sheet gets
 *   a new row added automatically. Since Site/Date/etc. weren't entered
 *   through the website's form, those fields are left blank and the row is
 *   flagged "Needs Review" — someone should fill those in from the Sheet
 *   directly afterward.
 * - A Sheet row whose folder no longer exists in Drive (deleted or moved
 *   out) gets its row removed automatically.
 */
function syncDriveWithSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const linkCol = headers.indexOf("Folder Link");

  if (linkCol === -1) {
    Logger.log("Could not find 'Folder Link' column — check SHEET_NAME/headers. Aborting sync, no changes made.");
    return;
  }

  // existing Sheet rows, keyed by the folder's actual Drive ID (not the raw
  // link text — Drive can format the same folder's link slightly differently
  // depending on how it was generated, which previously caused real folders
  // to look "missing" and get wrongly deleted; the ID never changes)
  const sheetRowsByFolderId = new Map();
  for (let r = 1; r < values.length; r++) {
    const link = values[r][linkCol];
    const folderId = link ? extractFolderId(link) : null;
    if (folderId) sheetRowsByFolderId.set(folderId, r + 1); // 1-indexed Sheet row number
  }

  // walk Drive: root -> brand folders -> site-visit folders.
  // SAFETY: if anything goes wrong partway through this scan (a permissions
  // hiccup, a folder that failed to load, etc.), we abort the ENTIRE sync
  // and touch nothing — a partial/incomplete scan must never be allowed to
  // make real folders look "missing" and get deleted.
  const driveFolderIds = new Set();
  const rowsToAdd = [];

  try {
    const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const brandFolders = root.getFolders();
    while (brandFolders.hasNext()) {
      const brandFolder = brandFolders.next();
      const siteFolders = brandFolder.getFolders();
      while (siteFolders.hasNext()) {
        const siteFolder = siteFolders.next();
        const folderId = siteFolder.getId();
        driveFolderIds.add(folderId);

        if (!sheetRowsByFolderId.has(folderId)) {
          // found in Drive but not in the Sheet yet — someone added this
          // folder by hand directly in Drive, so add a matching row
          rowsToAdd.push([
            brandFolder.getName(), // Brand
            "",                    // Site — left blank, needs manual fill
            "",                    // Panel
            "",                    // Direction
            "",                    // Date — left blank, needs manual fill
            "",                    // Department
            countImageFiles(siteFolder), // Photo Count
            siteFolder.getName(),  // Folder Name (original)
            siteFolder.getUrl(),   // Folder Link
            "YES",                 // Needs Review — since Site/Date are missing
          ]);
        }
      }
    }
  } catch (err) {
    Logger.log(`Sync ABORTED — error while scanning Drive: ${err.message}. No changes made, nothing was deleted.`);
    return;
  }

  rowsToAdd.forEach((row) => sheet.appendRow(row));

  // Sheet rows whose Drive folder genuinely no longer exists — candidates for removal.
  const deleteCandidates = [];
  sheetRowsByFolderId.forEach((rowNum, folderId) => {
    if (!driveFolderIds.has(folderId)) deleteCandidates.push(rowNum);
  });

  // SAFETY CAP: never let one sync run wipe out a large chunk of the Sheet
  // at once. A handful of genuine deletions is normal; if the number looks
  // suspiciously large, that's a sign something's wrong with the scan
  // (not that dozens of folders really vanished from Drive simultaneously) —
  // so we skip the deletions and just log a warning for a human to check,
  // rather than silently wiping data.
  const SAFE_DELETE_LIMIT = 5;
  let rowsToDelete = [];
  if (deleteCandidates.length > SAFE_DELETE_LIMIT) {
    Logger.log(
      `Sync found ${deleteCandidates.length} rows whose folders appear missing from Drive — ` +
      `that's more than the safety limit of ${SAFE_DELETE_LIMIT}, so NONE were deleted automatically. ` +
      `This usually means something's off with the scan rather than that many folders really being gone. ` +
      `Check manually before deleting anything.`
    );
  } else {
    rowsToDelete = deleteCandidates;
  }

  // delete bottom-to-top so earlier row numbers don't shift as we go
  rowsToDelete.sort((a, b) => b - a).forEach((rowNum) => sheet.deleteRow(rowNum));

  if (rowsToAdd.length > 0 || rowsToDelete.length > 0) {
    CacheService.getScriptCache().remove("sheet_data");
  }

  Logger.log(`Sync complete: ${rowsToAdd.length} row(s) added, ${rowsToDelete.length} row(s) removed.`);
}

function countImageFiles(folder) {
  let count = 0;
  const files = folder.getFiles();
  while (files.hasNext()) {
    if (files.next().getMimeType().indexOf("image/") === 0) count++;
  }
  return count;
}

/**
 * ---------- run this ONCE to make syncDriveWithSheet run automatically ----------
 * In the Apps Script editor: select "installSyncTrigger" in the function
 * dropdown next to Run, then click Run. It'll ask you to authorize once.
 * After that, syncDriveWithSheet runs automatically every 5 minutes,
 * forever — you never need to run this installer again unless you delete
 * the trigger.
 */
function installSyncTrigger() {
  // remove any existing sync triggers first, so re-running this doesn't
  // create duplicates
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === "syncDriveWithSheet") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("syncDriveWithSheet")
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log("Sync trigger installed — syncDriveWithSheet will now run every 5 minutes automatically.");
}

// ---------- optional: quick manual tests you can run in the editor ----------
function testVerify() {
  const fakeEvent = { postData: { contents: JSON.stringify({ action: "verify", password: "123456" }) } };
  Logger.log(doPost(fakeEvent).getContent());
}

function testDoPost() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        action: "add",
        password: "123456",
        brand: "TestBrand",
        site: "Test Site",
        panel: "1",
        direction: "NB",
        date: "2026-07-30",
        department: "Field Ops",
        photos: [],
      }),
    },
  };
  Logger.log(doPost(fakeEvent).getContent());
}

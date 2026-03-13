// ================================================================
// BN CONVENT SCHOOL — Google Apps Script Backend
// FILE: Code.gs  (paste this entire file into Apps Script)
// ================================================================
// HOW TO USE:
//   1. Open your Google Sheet → Extensions → Apps Script
//   2. Delete all existing code, paste this entire file
//   3. Click Deploy → New Deployment → Web App
//      - Execute as: Me
//      - Who has access: Anyone
//   4. Copy the Web App URL → paste into dashboard HTML
// ================================================================

// ── SHEET NAMES (must match your Google Sheet tab names) ──────────
const SHEET_FEE_ENTRY    = "Fee Entry";
const SHEET_STUDENTS     = "Student Master";
const SHEET_BANK         = "Bank Deposits";
const SHEET_EXPENSES     = "Expenses";
const SHEET_SALARY       = "Staff Salary";

// ── ADMIN PASSWORD (change this!) ─────────────────────────────────
const ADMIN_PASSWORD = "school@2025";
const ADMIN_USERNAME = "admin";

// ── MAIN ENTRY POINT ──────────────────────────────────────────────
function doGet(e) {
  const params = e.parameter;
  const action = params.action || "";
  const token  = params.token  || "";

  let result;

  try {
    switch (action) {
      case "login":
        result = handleLogin(params.username, params.password, params.role, params.studentName);
        break;
      case "getDashboard":
        requireAdmin(token);
        result = getDashboardData();
        break;
      case "getStudents":
        requireAdmin(token);
        result = getStudents(params.search, params.cls, params.hostelOnly);
        break;
      case "getHostelStudents":
        requireAdmin(token);
        result = getHostelStudents();
        break;
      case "getSiblings":
        requireAdmin(token);
        result = getSiblings();
        break;
      case "getFeeRegister":
        requireAdmin(token);
        result = getFeeRegister(params.search, params.feeType, params.page);
        break;
      case "getLastReceiptNo":
        result = getLastReceiptNo();
        break;
      case "checkDuplicateReceipt":
        requireAdmin(token);
        result = checkDuplicateReceipt(params.receiptNo, params.studentName, params.feeType);
        break;
      case "addFeeEntry":
        requireAdmin(token);
        result = addFeeEntry(params);
        break;
      case "addStudent":
        requireAdmin(token);
        result = addStudent(params);
        break;
      case "getStudentHistory":
        // Public — no token needed (student view)
        result = getStudentHistory(params.query);
        break;
      default:
        result = { error: "Unknown action: " + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return jsonResponse(result);
}

// ── ALSO HANDLE POST (for adding fee entries) ─────────────────────
function doPost(e) {
  const data   = JSON.parse(e.postData.contents);
  const action = data.action || "";
  const token  = data.token  || "";

  let result;
  try {
    switch (action) {
      case "addFeeEntry":
        requireAdmin(token);
        result = addFeeEntry(data);
        break;
      case "addStudent":
        requireAdmin(token);
        result = addStudent(data);
        break;
      default:
        result = { error: "Unknown POST action" };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return jsonResponse(result);
}

// ── AUTH ──────────────────────────────────────────────────────────
function handleLogin(username, password, role, studentName) {
  if (role === "admin") {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return { success: true, role: "admin", token: generateToken(), user: "Administrator" };
    }
    return { success: false, error: "Invalid username or password" };
  }

  if (role === "student") {
    const q = (studentName || "").toLowerCase().trim();
    if (!q) return { success: false, error: "Please enter a name" };
    const students = getAllStudentData();
    const matched  = students.filter(s =>
      s.name.toLowerCase().includes(q) || s.father.toLowerCase().includes(q)
    );
    if (matched.length === 0) return { success: false, error: "No student found with that name" };
    return { success: true, role: "student", user: matched[0].name, studentQuery: q };
  }

  return { success: false, error: "Invalid role" };
}

function generateToken() {
  // Simple session token — in production use PropertiesService for real sessions
  return "ADMIN_" + new Date().getTime() + "_" + Math.random().toString(36).slice(2);
}

function requireAdmin(token) {
  if (!token || !token.startsWith("ADMIN_")) {
    throw new Error("Unauthorized. Admin access required.");
  }
}

// ── DASHBOARD DATA ────────────────────────────────────────────────
function getDashboardData() {
  const records  = getFeeEntryRows();
  const students = getAllStudentData();

  // Totals by fee type
  const feeTotals = {};
  const monthly   = {};
  records.forEach(r => {
    feeTotals[r.feeType] = (feeTotals[r.feeType] || 0) + r.amount;
    const month = r.date ? r.date.toString().slice(0, 7) : "";
    if (month) monthly[month] = (monthly[month] || 0) + r.amount;
  });

  const hostelStudents = students.filter(s => (s.hostel || 0) > 0).length;
  const totalCollected = records.reduce((a, r) => a + r.amount, 0);

  return {
    summary: {
      totalStudents:      students.length,
      hostelStudents:     hostelStudents,
      totalCollected:     totalCollected,
      hostelCollected:    feeTotals["Hostel Fee"]      || 0,
      admissionCollected: feeTotals["Admission Fee"]   || 0,
      tuitionCollected:   feeTotals["Tuition Fee"]     || 0,
      schoolCollected:    feeTotals["School Fee"]      || 0,
    },
    feeTotals: feeTotals,
    monthly:   monthly,
  };
}

// ── STUDENTS ──────────────────────────────────────────────────────
function getStudents(search, cls, hostelOnly) {
  let students = getAllStudentData();
  const q = (search || "").toLowerCase();
  if (q) students = students.filter(s =>
    s.name.toLowerCase().includes(q) || s.father.toLowerCase().includes(q)
  );
  if (cls) students = students.filter(s => s.class === cls);
  if (hostelOnly === "true") students = students.filter(s => s.hostel > 0);
  return { students };
}

function getHostelStudents() {
  const students = getAllStudentData().filter(s => (s.hostel || 0) > 0);
  // Attach payment modes from fee records
  const records  = getFeeEntryRows().filter(r => r.feeType === "Hostel Fee");
  const modeMap  = {};
  records.forEach(r => {
    if (!modeMap[r.studentName]) modeMap[r.studentName] = new Set();
    modeMap[r.studentName].add(r.payMode);
  });
  const result = students.map(s => ({
    ...s,
    payModes: [...(modeMap[s.name] || [])].join(", ")
  }));
  return { students: result };
}

function getSiblings() {
  const students = getAllStudentData();
  // Group by family key: match if father name same OR mother name same (non-empty)
  // Build a union-find style family grouping
  const families = buildFamilyGroups(students);
  return { families };
}

// Groups students into families where father OR mother name matches
function buildFamilyGroups(students) {
  // Map each student to a family representative
  const groups = {}; // familyKey -> [students]

  students.forEach(s => {
    const fKey = (s.father || "").trim().toLowerCase();
    const mKey = (s.mother || "").trim().toLowerCase();

    // Try to find existing group that shares father or mother
    let matched = null;
    for (const key of Object.keys(groups)) {
      const rep = groups[key][0];
      const repF = (rep.father || "").trim().toLowerCase();
      const repM = (rep.mother || "").trim().toLowerCase();
      const fatherMatch = fKey && repF && fKey === repF;
      const motherMatch = mKey && repM && mKey === repM;
      if (fatherMatch || motherMatch) { matched = key; break; }
    }

    if (matched) {
      groups[matched].push(s);
    } else {
      const newKey = fKey || mKey || s.name;
      if (!groups[newKey]) groups[newKey] = [];
      groups[newKey].push(s);
    }
  });

  return Object.values(groups)
    .filter(ss => ss.length > 1)
    .sort((a, b) => b.length - a.length)
    .map(children => {
      const rep = children[0];
      return {
        father: rep.father || "—",
        mother: rep.mother || "",
        count:  children.length,
        familyTotal: children.reduce((a, c) => a + c.total, 0),
        children
      };
    });
}

function getFeeRegister(search, feeType, page) {
  let records = getFeeEntryRows();
  const q = (search || "").toLowerCase();
  if (q) records = records.filter(r =>
    r.studentName.toLowerCase().includes(q) ||
    (r.fatherName || "").toLowerCase().includes(q) ||
    r.receiptNo.toString().includes(q)
  );
  if (feeType) records = records.filter(r => r.feeType === feeType);
  const pageNum  = parseInt(page || "0");
  const pageSize = 25;
  const total    = records.length;
  const slice    = records.slice(pageNum * pageSize, (pageNum + 1) * pageSize);
  return { records: slice, total, page: pageNum, pageSize };
}

function getStudentHistory(query) {
  if (!query) return { error: "No query provided" };
  const q        = query.toLowerCase().trim();
  const allStudents = getAllStudentData();
  const students = allStudents.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.father.toLowerCase().includes(q) ||
    (s.mother || "").toLowerCase().includes(q)
  );
  if (students.length === 0) return { students: [] };

  const records = getFeeEntryRows();

  const result = students.map(s => {
    const receipts = records
      .filter(r => r.studentName === s.name)
      .map(r => ({
        receiptNo: r.receiptNo,
        date:      r.date,
        feeType:   r.feeType,
        amount:    r.amount,
        payMode:   r.payMode,
      }));

    // Find siblings: same father OR same mother (non-empty match)
    const siblings = allStudents.filter(x => {
      if (x.name === s.name) return false;
      const fMatch = s.father && x.father && s.father.toLowerCase() === x.father.toLowerCase();
      const mMatch = s.mother && x.mother && s.mother.toLowerCase() === x.mother.toLowerCase();
      return fMatch || mMatch;
    }).map(x => ({ name: x.name, class: x.class }));

    return { ...s, receipts, siblings };
  });

  return { students: result };
}

// ── GET LAST RECEIPT NO ───────────────────────────────────────────
function getLastReceiptNo() {
  const rows = getFeeEntryRows();
  let maxNo = 200;
  rows.forEach(r => {
    const n = parseInt(r.receiptNo);
    if (!isNaN(n) && n > maxNo) maxNo = n;
  });
  return { lastReceiptNo: maxNo, nextReceiptNo: maxNo + 1 };
}

// ── CHECK DUPLICATE RECEIPT ───────────────────────────────────────
function checkDuplicateReceipt(receiptNo, studentName, feeType) {
  const rows = getFeeEntryRows();
  const byRno = rows.filter(r => r.receiptNo.toString() === receiptNo.toString());
  if (byRno.length > 0) {
    return {
      duplicate: true,
      type: 'receiptNo',
      message: 'Receipt #' + receiptNo + ' already exists for student: ' + byRno[0].studentName
    };
  }
  // Check same student + same fee type already paid this session
  if (studentName && feeType && feeType !== 'Other') {
    const byStudentFee = rows.filter(r =>
      r.studentName.toLowerCase() === studentName.toLowerCase() &&
      r.feeType === feeType
    );
    if (byStudentFee.length > 0) {
      return {
        duplicate: true,
        type: 'studentFee',
        message: studentName + ' has already paid ' + feeType + ' (Receipt #' + byStudentFee[0].receiptNo + ' on ' + byStudentFee[0].date + ')'
      };
    }
  }
  return { duplicate: false };
}

// ── ADD STUDENT ───────────────────────────────────────────────────
function addStudent(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_STUDENTS);
  if (!ws) throw new Error("Sheet '" + SHEET_STUDENTS + "' not found");

  const name = (data.studentName || "").trim();
  if (!name) throw new Error("Student name is required");

  // Check duplicate
  const rows = ws.getDataRange().getValues();
  for (let i = 2; i < rows.length; i++) {
    if ((rows[i][1] || "").toString().trim().toLowerCase() === name.toLowerCase()) {
      return { success: false, error: "Student '" + name + "' already exists in Student Master (row " + (i+1) + ")" };
    }
  }

  const lastRow = ws.getLastRow();
  const sNo = lastRow - 1; // serial number (header is row 1, data starts row 2 + 1 header row 2)
  
  ws.appendRow([
    sNo,
    name,
    (data.fatherName    || "").trim(),
    (data.class         || "").trim(),
    (data.mobile        || "").trim(),
    0, 0, 0, 0, 0, 0, 0, // fee columns (will be filled by SUMIFS)
    "", // balance
    [
      data.gender       ? "Gender: " + data.gender : "",
      data.dob          ? "DOB: " + data.dob : "",
      data.hostel       ? "Hostel: " + data.hostel : "",
      data.address      ? "Address: " + data.address : "",
      data.motherName   ? "Mother: " + data.motherName : "",
      data.admissionDate? "Admitted: " + data.admissionDate : "",
      data.notes        || "",
    ].filter(Boolean).join(" | "),
  ]);

  return { success: true, message: "Student '" + name + "' registered successfully in row " + (lastRow + 1) };
}

// ── ADD FEE ENTRY (from receipt form) ────────────────────────────
function addFeeEntry(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_FEE_ENTRY);
  if (!ws) throw new Error("Sheet '" + SHEET_FEE_ENTRY + "' not found");

  const lastRow = ws.getLastRow();
  const feeTypes = [
    { key: "admission", name: "Admission Fee" },
    { key: "tuition",   name: "Tuition Fee" },
    { key: "school",    name: "School Fee" },
    { key: "hostel",    name: "Hostel Fee" },
    { key: "stationary",name: "Stationary Charge" },
    { key: "other",     name: "Other" },
  ];

  let rowsAdded = 0;
  feeTypes.forEach(ft => {
    const amt = parseFloat(data[ft.key] || 0);
    if (amt > 0) {
      ws.appendRow([
        data.receiptNo,
        new Date(data.date),
        data.studentName,
        data.fatherName || "",
        data.class      || "",
        ft.name,
        amt,
        data.payMode    || "Cash",
        data.receivedBy || "",
        "2025-26",
        data.remarks    || "",
      ]);
      rowsAdded++;
    }
  });

  if (rowsAdded === 0) throw new Error("No fee amounts provided");
  return { success: true, rowsAdded, message: rowsAdded + " row(s) added to Fee Entry" };
}

// ── DATA READERS ──────────────────────────────────────────────────
function getAllStudentData() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const feeWs = ss.getSheetByName(SHEET_FEE_ENTRY);
  if (!feeWs) return [];

  // Also read mother names from Student Master if available
  const motherMap = {};
  const smWs = ss.getSheetByName(SHEET_STUDENTS);
  if (smWs) {
    const smRows = smWs.getDataRange().getValues();
    // Student Master: col B=name, col C=father, col N=notes (contains "Mother: X")
    for (let i = 2; i < smRows.length; i++) {
      const sName  = (smRows[i][1] || "").toString().trim();
      const notes  = (smRows[i][13] || "").toString();
      const mMatch = notes.match(/Mother:\s*([^|]+)/i);
      if (sName && mMatch) motherMap[sName] = mMatch[1].trim();
    }
  }

  const rows     = feeWs.getDataRange().getValues();
  const students = {};

  for (let i = 2; i < rows.length; i++) {
    const row     = rows[i];
    const rno     = row[0]; if (!rno) continue;
    const name    = (row[2] || "").toString().trim();
    const father  = (row[3] || "").toString().trim();
    const cls     = (row[4] || "").toString().trim();
    const feeType = (row[5] || "").toString().trim();
    const amount  = parseFloat(row[6]) || 0;

    if (!students[name]) {
      students[name] = {
        name, father,
        mother: motherMap[name] || "",
        class: cls, total: 0,
        admission: 0, tuition: 0, school: 0, hostel: 0, stationary: 0, other: 0
      };
    }
    students[name].total += amount;
    if (feeType === "Admission Fee")     students[name].admission  += amount;
    if (feeType === "Tuition Fee")       students[name].tuition    += amount;
    if (feeType === "School Fee")        students[name].school     += amount;
    if (feeType === "Hostel Fee")        students[name].hostel     += amount;
    if (feeType === "Stationary Charge") students[name].stationary += amount;
    if (feeType === "Other")             students[name].other      += amount;
  }

  return Object.values(students).map(s => ({ ...s, hasHostel: s.hostel > 0 }));
}

function getFeeEntryRows() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const ws    = ss.getSheetByName(SHEET_FEE_ENTRY);
  if (!ws) return [];

  const rows  = ws.getDataRange().getValues();
  const result = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const rno = row[0]; if (!rno) continue;
    const dateVal = row[1];
    let dateStr = "";
    if (dateVal instanceof Date) {
      dateStr = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      dateStr = dateVal ? dateVal.toString().slice(0, 10) : "";
    }
    result.push({
      receiptNo:   rno.toString(),
      date:        dateStr,
      studentName: (row[2] || "").toString().trim(),
      fatherName:  (row[3] || "").toString().trim(),
      class:       (row[4] || "").toString().trim(),
      feeType:     (row[5] || "").toString().trim(),
      amount:      parseFloat(row[6]) || 0,
      payMode:     (row[7] || "Cash").toString().trim(),
      receivedBy:  (row[8] || "").toString().trim(),
    });
  }
  return result;
}

// ── HELPERS ───────────────────────────────────────────────────────
function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

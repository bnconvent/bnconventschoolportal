// ================================================================
// BN CONVENT SCHOOL — Google Apps Script Backend
// FILE: Code.gs
// ================================================================

// ── SHEET NAMES ───────────────────────────────────────────────────
const SHEET_FEE_ENTRY    = "Fee Entry";
const SHEET_STUDENTS     = "Student Master";
const SHEET_BANK         = "Bank Deposits";
const SHEET_EXPENSES     = "Expenses";
const SHEET_SALARY       = "Staff Salary";
const SHEET_TESTS        = "Test Scores";
const SHEET_EXAM_RESULTS = "Exam Results";

// ── ADMIN CREDENTIALS ─────────────────────────────────────────────
const ADMIN_PASSWORD = "school@2025";
const ADMIN_USERNAME = "admin";

// ══════════════════════════════════════════════════════════════════
// COMPOSITE KEY HELPER
// Uniquely identifies a student by name + class + father.
// Used everywhere instead of name-only lookups.
// ══════════════════════════════════════════════════════════════════
function makeStudentKey(name, cls, father) {
  return [
    (name   || "").trim().toUpperCase(),
    (cls    || "").trim().toUpperCase(),
    (father || "").trim().toUpperCase(),
  ].join("||");
}

// ── MAIN ENTRY POINT ──────────────────────────────────────────────
function doGet(e) {
  const params = e.parameter;
  const action = params.action || "";
  const token  = params.token  || "";
  let result;

  try {
    switch (action) {
      case "login":
        result = handleLogin(params.username, params.password, params.role, params.studentName, params.motherName);
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

      case "addStudent":
        requireAdmin(token);
        result = addStudent(params);
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

      case "getExpenses":
        requireAdmin(token);
        result = getExpensesList();
        break;

      case "getBankDeposits":
        requireAdmin(token);
        result = getBankDepositsList();
        break;

      case "addExpense":
        requireAdmin(token);
        result = addExpense(params);
        break;

      case "addBankDeposit":
        requireAdmin(token);
        result = addBankDeposit(params);
        break;

      case "getTests":
        requireAdmin(token);
        result = getTests(params.cls, params.type);
        break;

      case "addTestResult":
        requireAdmin(token);
        result = addTestResult(params);
        break;

      case "getStudentHistory":
        // params: query (name), mother, cls (optional), father (optional)
        result = getStudentHistory(params.query, params.mother, params.cls, params.father);
        break;

      case "getStudentDetail":
        // accepts name + class + father for disambiguation
        result = getStudentDetail(
          params.studentName || params.name,
          params.class || params.cls,
          params.father
        );
        break;

      case "getStudentTests":
        result = getStudentTests(params.studentName, params.cls, params.father);
        break;

      case "getExamResults":
        result = getExamResults(params.studentName, params.examType, params.session, params.cls, params.father);
        break;

      case "addExamResults":
        requireAdmin(token);
        result = addExamResults(params);
        break;

      default:
        result = { error: "Unknown action: " + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return jsonResponse(result);
}

// ── POST HANDLER ──────────────────────────────────────────────────
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
function handleLogin(username, password, role, studentName, motherName) {
  if (role === "admin") {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD)
      return { success: true, role: "admin", token: generateToken(), user: "Administrator" };
    return { success: false, error: "Invalid username or password" };
  }

  if (role === "student") {
    const q = (studentName || "").toLowerCase().trim();
    const m = (motherName  || "").toLowerCase().trim();
    if (!q || !m) return { success: false, error: "Please enter student name and mother name" };

    const students = getAllStudentData();
    const matched  = students.filter(s =>
      s.name.toLowerCase() === q && (s.mother || "").toLowerCase() === m
    );
    if (!matched.length) return { success: false, error: "No student found with that name + mother" };

    // If multiple students share the name+mother (edge case), return first
    const s = matched[0];
    return {
      success:      true,
      role:         "student",
      user:         s.name,
      studentQuery: s.name,
      motherName:   s.mother,
      studentClass: s.class,    // ← pass class back so frontend can disambiguate
      fatherName:   s.father,   // ← pass father back too
    };
  }

  return { success: false, error: "Invalid role" };
}

function generateToken() {
  return "ADMIN_" + new Date().getTime() + "_" + Math.random().toString(36).slice(2);
}

function requireAdmin(token) {
  if (!token || !token.startsWith("ADMIN_"))
    throw new Error("Unauthorized. Admin access required.");
}

// ── DASHBOARD ─────────────────────────────────────────────────────
function getDashboardData() {
  const records  = getFeeEntryRows();
  const students = getAllStudentData();

  const feeTotals = {}, monthly = {};
  records.forEach(r => {
    feeTotals[r.feeType] = (feeTotals[r.feeType] || 0) + r.amount;
    const month = r.date ? r.date.toString().slice(0, 7) : "";
    if (month) monthly[month] = (monthly[month] || 0) + r.amount;
  });

  return {
    summary: {
      totalStudents:      students.length,
      hostelStudents:     students.filter(s => (s.hostel || 0) > 0).length,
      totalCollected:     records.reduce((a, r) => a + r.amount, 0),
      hostelCollected:    feeTotals["Hostel Fee"]    || 0,
      admissionCollected: feeTotals["Admission Fee"] || 0,
      tuitionCollected:   feeTotals["Tuition Fee"]   || 0,
      schoolCollected:    feeTotals["School Fee"]    || 0,
    },
    feeTotals,
    monthly,
  };
}

// ── STUDENTS ──────────────────────────────────────────────────────
function getStudents(search, cls, hostelOnly) {
  let students = getAllStudentData();
  const q = (search || "").trim().toLowerCase();
  if (q) students = students.filter(s =>
    (s.name   || "").toLowerCase().includes(q) ||
    (s.father || "").toLowerCase().includes(q) ||
    (s.mother || "").toLowerCase().includes(q)
  );
  if (cls && cls !== "All") students = students.filter(s => String(s.class) === String(cls));
  if (hostelOnly === "true" || hostelOnly === true) students = students.filter(s => parseFloat(s.hostel) > 0);
  return { students, count: students.length };
}

function getHostelStudents() {
  const students = getAllStudentData().filter(s => (s.hostel || 0) > 0);
  const records  = getFeeEntryRows().filter(r => r.feeType === "Hostel Fee");
  const modeMap  = {};
  records.forEach(r => {
    const key = makeStudentKey(r.studentName, r.class, r.fatherName);
    if (!modeMap[key]) modeMap[key] = new Set();
    modeMap[key].add(r.payMode);
  });
  return {
    students: students.map(s => ({
      ...s,
      payModes: [...(modeMap[makeStudentKey(s.name, s.class, s.father)] || [])].join(", ")
    }))
  };
}

function getSiblings() {
  return { families: buildFamilyGroups(getAllStudentData()) };
}

function buildFamilyGroups(students) {
  const groups = {};
  students.forEach(s => {
    const f = (s.father || "").trim().toUpperCase();
    const m = (s.mother || "").trim().toUpperCase();
    if (!f || !m) return;
    const key = f + " + " + m;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });
  return Object.values(groups)
    .filter(c => c.length > 1)
    .sort((a, b) => b.length - a.length)
    .map(children => ({
      father:      children[0].father,
      mother:      children[0].mother,
      mobile:      children[0].mobile || "—",
      count:       children.length,
      familyTotal: children.reduce((s, c) => s + (parseFloat(c.total) || 0), 0),
      children:    children.map(c => ({
        name: c.name, class: c.class, penNo: c.penNo,
        total: c.total || 0, hasHostel: c.hasHostel || false
      }))
    }));
}

// ── FEE REGISTER ──────────────────────────────────────────────────
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
  return { records: records.slice(pageNum * pageSize, (pageNum + 1) * pageSize), total, page: pageNum, pageSize };
}

// ── STUDENT HISTORY — disambiguates duplicate names ───────────────
function getStudentHistory(query, mother, cls, father) {
  if (!query) return { error: "No student name provided" };
  const q = query.toLowerCase().trim();
  const m = (mother || "").toLowerCase().trim();
  const allStudents = getAllStudentData();

  // Step 1: match by name + mother (required)
  let matched = allStudents.filter(s =>
    s.name.toLowerCase() === q && (s.mother || "").toLowerCase() === m
  );

  // Step 2: if multiple found, narrow by class and/or father
  if (matched.length > 1 && cls)
    matched = matched.filter(s => String(s.class) === String(cls)) || matched;
  if (matched.length > 1 && father)
    matched = matched.filter(s => (s.father || "").toLowerCase() === father.toLowerCase()) || matched;

  if (!matched.length) return { students: [] };

  const records = getFeeEntryRows();

  return {
    students: matched.map(s => {
      // Match receipts using composite key (name + class + father)
      const key = makeStudentKey(s.name, s.class, s.father);
      const receipts = records
        .filter(r => makeStudentKey(r.studentName, r.class, r.fatherName) === key)
        .map(r => ({
          receiptNo: r.receiptNo, date: r.date,
          feeType: r.feeType, amount: r.amount, payMode: r.payMode,
        }));

      // Siblings: same father + mother, different name OR same name different class
      const siblings = allStudents.filter(x => {
        if (x.name === s.name && x.class === s.class && x.father === s.father) return false;
        return s.father && x.father &&
               s.father.trim().toUpperCase() === x.father.trim().toUpperCase() &&
               s.mother && x.mother &&
               s.mother.trim().toUpperCase() === x.mother.trim().toUpperCase();
      }).map(x => ({ name: x.name, class: x.class }));

      return { ...s, receipts, siblings };
    })
  };
}

// ── STUDENT DETAIL — uses composite key ───────────────────────────
function getStudentDetail(name, cls, father) {
  if (!name) return { student: null };
  const allStudents = getAllStudentData();

  // Find with progressive narrowing
  let matches = allStudents.filter(x => x.name.toLowerCase() === name.toLowerCase());
  if (matches.length > 1 && cls)
    matches = matches.filter(x => String(x.class) === String(cls)) || matches;
  if (matches.length > 1 && father)
    matches = matches.filter(x => (x.father || "").toLowerCase() === father.toLowerCase()) || matches;

  const s = matches[0];
  if (!s) return { student: null };

  const records = getFeeEntryRows();
  const key     = makeStudentKey(s.name, s.class, s.father);

  const receipts = records
    .filter(r => makeStudentKey(r.studentName, r.class, r.fatherName) === key)
    .map(r => ({
      receiptNo: r.receiptNo, date: r.date,
      feeType: r.feeType, amount: r.amount, payMode: r.payMode,
    }));

  const siblings = allStudents.filter(x => {
    if (x.name === s.name && x.class === s.class && x.father === s.father) return false;
    return s.father && x.father &&
           s.father.toUpperCase() === x.father.toUpperCase() &&
           s.mother && x.mother &&
           s.mother.toUpperCase() === x.mother.toUpperCase();
  }).map(x => ({ name: x.name, class: x.class, total: x.total }));

  return { student: { ...s, receipts, siblings } };
}

// ── RECEIPT NO ────────────────────────────────────────────────────
function getLastReceiptNo() {
  const rows = getFeeEntryRows();
  if (!rows.length) return { lastReceiptNo: 200, nextReceiptNo: 201 };
  let maxNo = 0;
  rows.forEach(r => {
    const n = parseInt((r.receiptNo || "").toString().replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n) && n > maxNo) maxNo = n;
  });
  if (maxNo === 0) maxNo = 200;
  return { lastReceiptNo: maxNo, nextReceiptNo: maxNo + 1 };
}

// ── DUPLICATE RECEIPT CHECK ───────────────────────────────────────
function checkDuplicateReceipt(receiptNo, studentName, feeType) {
  const rows = getFeeEntryRows();
  const byRno = rows.filter(r => r.receiptNo.toString() === receiptNo.toString());
  if (byRno.length)
    return { duplicate: true, type: "receiptNo",
      message: "Receipt #" + receiptNo + " already exists for: " + byRno[0].studentName };
  if (studentName && feeType && feeType !== "Other") {
    const byStudentFee = rows.filter(r =>
      r.studentName.toLowerCase() === studentName.toLowerCase() && r.feeType === feeType
    );
    if (byStudentFee.length)
      return { duplicate: true, type: "studentFee",
        message: studentName + " has already paid " + feeType +
                 " (Receipt #" + byStudentFee[0].receiptNo + " on " + byStudentFee[0].date + ")" };
  }
  return { duplicate: false };
}

// ── ADD STUDENT ───────────────────────────────────────────────────
function addStudent(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_STUDENTS);
  if (!ws) throw new Error("Sheet '" + SHEET_STUDENTS + "' not found");

  const name   = (data.studentName || "").trim();
  const father = (data.fatherName  || "").trim();
  const cls    = (data.class       || "").trim();
  if (!name) throw new Error("Student name is required");

  // Duplicate check: same name + class + father = same student
  const rows = ws.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rName   = (rows[i][1] || "").toString().trim().toLowerCase();
    const rFather = (rows[i][2] || "").toString().trim().toLowerCase();
    const rClass  = (rows[i][4] || "").toString().trim();
    if (rName === name.toLowerCase() && rFather === father.toLowerCase() && rClass === cls)
      return { success: false, error: "Student '" + name + "' (Class " + cls + ", Father: " + father + ") already exists in row " + (i + 1) };
  }

  ws.appendRow([
    ws.getLastRow(),          // Col A: S.No
    name,                     // Col B: Student Name
    father,                   // Col C: Father Name
    (data.motherName || "").trim(), // Col D: Mother Name
    cls,                      // Col E: Class
    (data.mobile || "").trim(),     // Col F: Mobile
    0, 0, 0, 0, 0, 0, 0,     // Col G–M: fee columns
    "",                       // Col N: Balance
    [
      data.gender       ? "Gender: "  + data.gender       : "",
      data.dob          ? "DOB: "     + data.dob          : "",
      data.hostel       ? "Hostel: "  + data.hostel       : "",
      data.address      ? "Address: " + data.address      : "",
      data.admissionDate? "Admitted: "+ data.admissionDate: "",
      data.notes        || "",
    ].filter(Boolean).join(" | "),
  ]);
  return { success: true, message: "Student '" + name + "' registered successfully." };
}

// ── ADD FEE ENTRY ─────────────────────────────────────────────────
function addFeeEntry(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_FEE_ENTRY);
  if (!ws) throw new Error("Sheet '" + SHEET_FEE_ENTRY + "' not found");

  const feeTypes = [
    { key: "admission",  name: "Admission Fee"      },
    { key: "tuition",    name: "Tuition Fee"         },
    { key: "school",     name: "School Fee"          },
    { key: "hostel",     name: "Hostel Fee"          },
    { key: "stationary", name: "Stationary Charge"   },
    { key: "other",      name: "Other"               },
  ];

  let rowsAdded = 0, totalAmt = 0;
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
      totalAmt += amt;
      const lr = ws.getLastRow();
      ws.getRange(lr, 2).setNumberFormat("dd-MMM-yyyy");
      ws.getRange(lr, 7).setNumberFormat("\"₹\"#,##0");
      ws.getRange(lr, 1, 1, 11).setFontFamily("Arial").setFontSize(9);
    }
  });

  if (rowsAdded > 0)
    return { success: true, message: "Receipt #" + data.receiptNo + " saved.", rowsCreated: rowsAdded, totalAmount: totalAmt };
  return { success: false, error: "No fee amounts entered." };
}

// ── DATA READERS ──────────────────────────────────────────────────
function getAllStudentData() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const smWs  = ss.getSheetByName(SHEET_STUDENTS);
  const feeWs = ss.getSheetByName(SHEET_FEE_ENTRY);
  if (!smWs) return [];

  const students = {}; // keyed by composite key
  const smData   = smWs.getDataRange().getValues();
  const feeData  = feeWs ? feeWs.getDataRange().getValues() : [];

  // Row 0 = title (if present), row 1 = headers — start from row 2
  for (let i = 2; i < smData.length; i++) {
    const row    = smData[i];
    const name   = (row[1] || "").toString().trim();
    const father = (row[2] || "").toString().trim();
    const cls    = (row[4] || "").toString().trim();
    if (!name) continue;

    const key = makeStudentKey(name, cls, father);
    students[key] = {
      penNo:      (row[0] || "").toString().trim(),
      name,
      father,
      mother:     (row[3] || "").toString().trim(),
      class:      cls,
      mobile:     (row[5] || "").toString().trim(),
      total: 0, admission: 0, tuition: 0,
      school: 0, hostel: 0, stationary: 0, other: 0,
    };
  }

  // Map fee rows to correct student using composite key
  // Fee Entry sheet: col C = studentName, col D = fatherName, col E = class
  for (let j = 2; j < feeData.length; j++) {
    const row    = feeData[j];
    const fName  = (row[2] || "").toString().trim();
    const fFath  = (row[3] || "").toString().trim();
    const fCls   = (row[4] || "").toString().trim();
    const fType  = (row[5] || "").toString().trim();
    const fAmt   = parseFloat(row[6]) || 0;
    if (!fName || !fAmt) continue;

    const key = makeStudentKey(fName, fCls, fFath);

    // Try exact composite key first
    if (students[key]) {
      addFeeToStudent(students[key], fType, fAmt);
    } else {
      // Fallback: match by name only (for old records without class/father in fee sheet)
      const fallback = Object.values(students).find(s => s.name === fName);
      if (fallback) addFeeToStudent(fallback, fType, fAmt);
    }
  }

  return Object.values(students).map(s => ({ ...s, hasHostel: s.hostel > 0 }));
}

function addFeeToStudent(student, fType, fAmt) {
  student.total += fAmt;
  if      (fType === "Admission Fee")      student.admission  += fAmt;
  else if (fType === "Tuition Fee")        student.tuition    += fAmt;
  else if (fType === "School Fee")         student.school     += fAmt;
  else if (fType === "Hostel Fee")         student.hostel     += fAmt;
  else if (fType === "Stationary Charge")  student.stationary += fAmt;
  else if (fType === "Other")              student.other      += fAmt;
}

function getFeeEntryRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_FEE_ENTRY);
  if (!ws) return [];
  const rows = ws.getDataRange().getValues();
  const result = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const dv = row[1];
    let dateStr = "";
    if (dv instanceof Date)
      dateStr = Utilities.formatDate(dv, Session.getScriptTimeZone(), "yyyy-MM-dd");
    else
      dateStr = dv ? dv.toString().slice(0, 10) : "";
    result.push({
      receiptNo:   row[0].toString(),
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

// ── UTILITIES ─────────────────────────────────────────────────────
function jsonResponse(data) {
  const out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function formatDate(dateVal, format) {
  if (!dateVal) return "";
  try {
    let d;
    if (dateVal instanceof Date)          d = dateVal;
    else if (typeof dateVal === "number") d = new Date((dateVal - 25569) * 86400 * 1000);
    else                                  d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal).slice(0, 10);
    const dd   = String(d.getDate()).padStart(2, "0");
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mon  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
    if (format === "yyyy-MM-dd")  return `${yyyy}-${mm}-${dd}`;
    if (format === "dd/MM/yyyy")  return `${dd}/${mm}/${yyyy}`;
    if (format === "dd-MMM-yyyy") return `${dd}-${mon}-${yyyy}`;
    return `${dd}-${mon}-${yyyy}`;
  } catch (e) {
    return String(dateVal).slice(0, 10);
  }
}

// ── EXPENSES ──────────────────────────────────────────────────────
function getExpensesList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_EXPENSES);
  if (!ws) return { expenses: [], total: 0 };
  const rows = ws.getDataRange().getValues();
  const result = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[1]) continue;
    result.push({
      sno:         String(row[0] || ""),
      date:        formatDate(row[1], "dd-MMM-yyyy"),
      description: String(row[2] || ""),
      amount:      parseFloat(String(row[3]).replace(/[₹,\s]/g, "")) || 0,
      by:          String(row[4] || ""),
      category:    String(row[5] || ""),
      paidTo:      String(row[6] || ""),
    });
  }
  return { expenses: result, total: result.reduce((a, e) => a + e.amount, 0) };
}

function addExpense(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_EXPENSES);
  if (!ws) throw new Error("Sheet 'Expenses' not found");
  ws.appendRow([
    ws.getLastRow() - 1,
    new Date(data.date),
    data.description || "",
    parseFloat(data.amount) || 0,
    data.by || "",
    data.category || "",
    data.paidTo || "",
  ]);
  return { success: true, message: "Expense recorded" };
}

// ── BANK DEPOSITS ─────────────────────────────────────────────────
function getBankDepositsList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_BANK);
  if (!ws) return { deposits: [], total: 0 };
  const rows = ws.getDataRange().getValues();
  const result = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[1]) continue;
    result.push({
      sno:         String(row[0] || ""),
      date:        formatDate(row[1], "dd-MMM-yyyy"),
      amount:      parseFloat(String(row[2]).replace(/[₹,\s]/g, "")) || 0,
      depositedBy: String(row[3] || ""),
      bank:        String(row[4] || ""),
      accountNo:   String(row[5] || ""),
      remarks:     String(row[6] || ""),
    });
  }
  return { deposits: result, total: result.reduce((a, b) => a + b.amount, 0) };
}

function addBankDeposit(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_BANK);
  if (!ws) throw new Error("Sheet 'Bank Deposits' not found");
  ws.appendRow([
    ws.getLastRow() - 1,
    new Date(data.date),
    parseFloat(data.amount) || 0,
    data.depositedBy || "",
    data.bank || "",
    data.accountNo || "",
    data.description || "",
  ]);
  return { success: true, message: "Bank deposit recorded" };
}

// ── TEST SCORES ───────────────────────────────────────────────────

function getTests(cls, type) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_TESTS);
  if (!ws) return { tests: [] };
  const rows = ws.getDataRange().getValues();
  const map  = {};
  for (let i = 2; i < rows.length; i++) {
    const row    = rows[i]; if (!row[0]) continue;
    const testId = String(row[0]);
    const tClass = String(row[2] || "");
    const tType  = String(row[6] || "");
    if (cls  && tClass !== cls)  continue;
    if (type && tType  !== type) continue;
    const dv = row[1];
    const ds = dv instanceof Date
      ? Utilities.formatDate(dv, Session.getScriptTimeZone(), "yyyy-MM-dd")
      : String(dv).slice(0, 10);
    if (!map[testId]) map[testId] = {
      id: testId, date: ds, class: tClass,
      testName: String(row[3] || ""), subject: String(row[4] || ""),
      maxMarks: parseFloat(row[5]) || 25, type: tType, scores: []
    };
    // Col H = StudentName, Col I = FatherName (new), Col J = Obtained (new)
    const hasFatherCol = rows[0] && rows[0][8] && rows[0][8].toString().toLowerCase().includes("father");
    const obtainedCol  = hasFatherCol ? 9 : 8; // if father col exists, obtained is col J else col I
    const rawObt       = String(rows[i][obtainedCol] || "").toUpperCase();
    const obtained     = rawObt === "AB" ? null : parseFloat(rows[i][obtainedCol]);
    map[testId].scores.push({
      name:       String(row[7] || ""),
      fatherName: hasFatherCol ? String(row[8] || "") : "",
      obtained:   isNaN(obtained) ? null : obtained,
    });
  }
  return { tests: Object.values(map) };
}

function getStudentTests(studentName, cls, father) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_TESTS);
  if (!ws) return { results: [] };
  const rows    = ws.getDataRange().getValues();
  const results = [];
  // Detect if sheet has father column
  const hasFatherCol = rows[1] && rows[1][8] !== undefined &&
                       rows[0] && String(rows[0][8] || "").toLowerCase().includes("father");
  const obtainedCol  = hasFatherCol ? 9 : 8;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i]; if (!row[0]) continue;
    const rowName   = String(row[7] || "").trim();
    const rowFather = hasFatherCol ? String(row[8] || "").trim() : "";
    const rowClass  = String(row[2] || "").trim();

    // Match by name; if father/class provided, use them to disambiguate
    if (rowName.toLowerCase() !== studentName.toLowerCase()) continue;
    if (cls    && rowClass.toLowerCase()  !== cls.toLowerCase())    continue;
    if (father && rowFather.toLowerCase() !== father.toLowerCase()) continue;

    const dv  = row[1];
    const ds  = dv instanceof Date
      ? Utilities.formatDate(dv, Session.getScriptTimeZone(), "yyyy-MM-dd")
      : String(dv).slice(0, 10);
    const rawObt  = String(row[obtainedCol] || "").toUpperCase();
    const obtained = rawObt === "AB" ? null : parseFloat(row[obtainedCol]);
    results.push({
      testId: String(row[0]), date: ds, class: rowClass,
      testName: String(row[3] || ""), subject: String(row[4] || ""),
      maxMarks: parseFloat(row[5]) || 25, type: String(row[6] || "weekly"),
      obtained: isNaN(obtained) ? null : obtained,
    });
  }
  return { results };
}

function addTestResult(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ws   = ss.getSheetByName(SHEET_TESTS);
  if (!ws) {
    ws = ss.insertSheet(SHEET_TESTS);
    // Updated header includes FatherName for disambiguation
    ws.appendRow(["TestID","Date","Class","TestName","Subject","MaxMarks","Type","StudentName","FatherName","Obtained"]);
  }
  const testId = "T" + new Date().getTime();
  const scores = JSON.parse(data.scores || "[]");
  scores.forEach(sc => {
    ws.appendRow([
      testId,
      new Date(data.date),
      data.class,
      data.testName,
      data.subject,
      parseFloat(data.maxMarks) || 25,
      data.type || "weekly",
      sc.studentName,
      sc.obtained === null ? "AB" : sc.obtained,  // ← col I = Obtained
      sc.fatherName || "",           // ← ADD THIS: col J = FatherName
    ]);
  });
  return { success: true, message: "Test results saved for " + scores.length + " students" };
}


function getExamResults(studentName, examType, session, cls, father) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ws = ss.getSheetByName(SHEET_EXAM_RESULTS);
  if (!ws) return { results: [], found: false };

  const rows    = ws.getDataRange().getValues();
  const results = [];
  const sess    = session || "2025-26";

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;

    const rowStudent = String(row[4]  || "").trim().toLowerCase();
    const rowFather  = String(row[5]  || "").trim().toLowerCase();
    const rowSession = String(row[1]  || "").trim();
    const rowExam    = String(row[3]  || "").trim().toLowerCase();
    const rowClass   = String(row[2]  || "").trim();

    if (rowStudent !== studentName.toLowerCase()) continue;
    if (rowExam    !== examType.toLowerCase())    continue;
    if (rowSession !== sess)                      continue;
    // Optional narrowing
    if (cls    && String(cls).trim()             !== rowClass)  continue;
    if (father && father.trim().toLowerCase()    !== rowFather) continue;

    const isAbsent     = String(row[12] || "").toUpperCase() === "TRUE";
    const theoryObt    = isAbsent ? null : (parseFloat(row[9])  || 0);
    const practicalObt = isAbsent ? null : (parseFloat(row[11]) || 0);
    const practicalMax = parseFloat(row[10]) || 0;

    results.push({
      examId:       String(row[0] || ""),
      session:      rowSession,
      class:        rowClass,
      examType:     rowExam,
      studentName:  String(row[4] || ""),
      fatherName:   String(row[5] || ""),
      subject:      String(row[6] || "").trim(),
      maxMarks:     parseFloat(row[7])  || 0,
      passMarks:    parseFloat(row[8])  || 0,
      theoryObt,
      practicalMax,
      practicalObt,
      totalObt:     isAbsent ? null : theoryObt + practicalObt,
      totalMax:     (parseFloat(row[7]) || 0) + practicalMax,
      isAbsent,
    });
  }

  return { results, found: results.length > 0 };
}

function addExamResults(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ws   = ss.getSheetByName(SHEET_EXAM_RESULTS);
  if (!ws) {
    ws = ss.insertSheet(SHEET_EXAM_RESULTS);
    // Updated header with FatherName column for disambiguation
    ws.appendRow([
      "ExamID","Session","Class","ExamType","StudentName","FatherName",
      "Subject","MaxMarks","PassMarks","TheoryObt","PracticalMax","PracticalObt","IsAbsent"
    ]);
  }

  const scores  = JSON.parse(data.scores || "[]");
  const examId  = data.examId || (data.examType.toUpperCase() + "-" + (data.session || "2526").replace("-", ""));
  const session = data.session || "2025-26";
  let added     = 0;

  scores.forEach(sc => {
    ws.appendRow([
      examId,
      session,
      data.class       || "",
      data.examType    || "",
      sc.studentName   || "",
      sc.subject       || "",
      parseFloat(sc.maxMarks)     || 0,
      parseFloat(sc.passMarks)    || 0,
      parseFloat(sc.theoryObt)    || 0,
      parseFloat(sc.practicalMax) || 0,
      parseFloat(sc.practicalObt) || 0,
      sc.isAbsent ? "TRUE" : "FALSE",
      sc.fatherName    || "",       // ← store father for disambiguation
    ]);
    added++;
  });

  return { success: true, message: added + " result(s) saved for " + data.examType.toUpperCase() };
}

// ================================================================
// app-core.js  —  BN Convent Fee Portal
// Config · API · Demo data · Auth · Nav · Utils
// ================================================================

// ── CONFIG ───────────────────────────────────────────────────────
let SCRIPT_URL    = 'https://script.google.com/macros/s/AKfycbxnzWqP5TmZbkQssuGJ_INeJHiovPJquo4qlfqZWcq7UVmWX7NbAJ7iqOt1_kNy0sni/exec';
let SESSION_TOKEN = '';
let CURRENT_ROLE  = 'admin';
let CURRENT_USER  = '';
let CURRENT_MOTHER = '';
let studentQuery  = '';

// Charts (dashboard)
let chartMonthly = null, chartDonut = null;
// Pagination
let stuPage = 0, regPage = 0;
let stuData = [], regData = [];
let hostelOnly = false;
// Student suggestion cache
let _studentCache = null;

const PAGE_SZ = 20;
const SCHOOL_UPI_ID   = 'bnconventwadrafnagar@upi';
const SCHOOL_UPI_NAME = 'BN Convent School';

// ── FEE STRUCTURE (per class, full session) ──────────────────────
const FEE_STRUCTURE = {
  'Nursery':{ admission:1500, tuition:0,    school:3000,  hostel:0     },
  'LKG':    { admission:1500, tuition:0,    school:3000,  hostel:0     },
  'UKG':    { admission:1500, tuition:0,    school:3000,  hostel:0     },
  '1st':    { admission:2000, tuition:2000, school:5000,  hostel:0     },
  '2nd':    { admission:2000, tuition:2000, school:5000,  hostel:0     },
  '3rd':    { admission:2000, tuition:2000, school:5000,  hostel:0     },
  '4th':    { admission:2000, tuition:2000, school:5000,  hostel:0     },
  '5th':    { admission:2000, tuition:3000, school:6000,  hostel:0     },
  '6th':    { admission:2500, tuition:3000, school:7000,  hostel:20000 },
  '7th':    { admission:2500, tuition:3000, school:7000,  hostel:20000 },
  '8th':    { admission:2500, tuition:3000, school:7000,  hostel:20000 },
  '9th':    { admission:3000, tuition:4000, school:8000,  hostel:20000 },
  '10th':   { admission:3000, tuition:4000, school:8000,  hostel:20000 },
  '11th':   { admission:3500, tuition:5000, school:10000, hostel:20000 },
  '12th':   { admission:3500, tuition:5000, school:10000, hostel:20000 },
};

// ── DEMO DATA ────────────────────────────────────────────────────
const DEMO_STUDENTS = [
  {"name":"Himanshu Gurjar","father":"Shivkumar Gurjar","mother":"Savitri Gurjar","mobile":"9876543210","class":"4th","total":14000,"admission":10000,"tuition":0,"school":4000,"hostel":0,"stationary":0,"other":0,"hasHostel":false},
  {"name":"Amrendra Gurjar","father":"Kanshiram Gurjar","mother":"Radha Gurjar","mobile":"","class":"5th","total":1500,"admission":1500,"tuition":0,"school":0,"hostel":0,"stationary":0,"other":0,"hasHostel":false},
  {"name":"Angad Kumar","father":"Mohan Pyare","mother":"Sunita Devi","mobile":"","class":"12th","total":4000,"admission":0,"tuition":4000,"school":0,"hostel":0,"stationary":0,"other":0,"hasHostel":false},
  {"name":"Arti","father":"Bramhdev","mother":"Kamla Devi","mobile":"","class":"5th","total":10000,"admission":0,"tuition":0,"school":10000,"hostel":0,"stationary":0,"other":0,"hasHostel":false},
  {"name":"Suraj Dhurve","father":"Dharmpal","mother":"Geeta Dhurve","mobile":"","class":"UKG","total":2000,"admission":2000,"tuition":0,"school":0,"hostel":0,"stationary":0,"other":0,"hasHostel":false},
  {"name":"Arjun Yadav","father":"Devnath Yadav","mother":"Parvati Yadav","mobile":"9999900001","class":"7th","total":26000,"admission":6000,"tuition":0,"school":0,"hostel":20000,"stationary":0,"other":0,"hasHostel":true},
  {"name":"Prince Gupta","father":"Ratnesh Kumar","mother":"Meena Gupta","mobile":"","class":"7th","total":20000,"admission":10000,"tuition":0,"school":0,"hostel":10000,"stationary":0,"other":0,"hasHostel":true},
  {"name":"Ashutosh Paikara","father":"Vinod Kumar","mother":"Sushma Paikara","mobile":"","class":"9th","total":17500,"admission":3500,"tuition":0,"school":0,"hostel":14000,"stationary":0,"other":0,"hasHostel":true},
  {"name":"Mansh Singh","father":"Ramvichar","mother":"Laxmi Singh","mobile":"","class":"8th","total":20000,"admission":10000,"tuition":0,"school":0,"hostel":10000,"stationary":0,"other":0,"hasHostel":true},
  {"name":"Pritam Gupta","father":"Umashankar Gupta","mother":"Rekha Gupta","mobile":"","class":"6th","total":5000,"admission":5000,"tuition":0,"school":0,"hostel":0,"stationary":0,"other":0,"hasHostel":false},
  {"name":"Saroj","father":"Umashankar Gupta","mother":"Rekha Gupta","mobile":"","class":"7th","total":5000,"admission":0,"tuition":0,"school":5000,"hostel":0,"stationary":0,"other":0,"hasHostel":false},
  {"name":"Supriya Yadav","father":"Suresh Yadav","mother":"Anita Yadav","mobile":"","class":"8th","total":3000,"admission":3000,"tuition":0,"school":0,"hostel":0,"stationary":0,"other":0,"hasHostel":false},
  {"name":"Satyam Yadav","father":"Suresh Yadav","mother":"Anita Yadav","mobile":"","class":"6th","total":5000,"admission":0,"tuition":5000,"school":0,"hostel":0,"stationary":0,"other":0,"hasHostel":false},
  {"name":"Pooja","father":"Suresh Yadav","mother":"Anita Yadav","mobile":"","class":"5th","total":20000,"admission":0,"tuition":0,"school":0,"hostel":20000,"stationary":0,"other":0,"hasHostel":true},
  {"name":"Rishu Kurre","father":"Krishnlal Kurre","mother":"Savita Kurre","mobile":"","class":"7th","total":1000,"admission":1000,"tuition":0,"school":0,"hostel":0,"stationary":0,"other":0,"hasHostel":false},
  {"name":"Paridhi","father":"Krishnlal Kurre","mother":"Savita Kurre","mobile":"","class":"1st","total":500,"admission":500,"tuition":0,"school":0,"hostel":0,"stationary":0,"other":0,"hasHostel":false}
];
const DEMO_RECORDS = [
  {"rno":"201","date":"2025-06-03","name":"Himanshu Gurjar","father":"Shivkumar Gurjar","class":"4th","fee_type":"Admission Fee","amount":1500,"pay_mode":"Cash","recv_by":"Parmeshwar"},
  {"rno":"202","date":"2025-06-03","name":"Amrendra Gurjar","father":"Kanshiram Gurjar","class":"5th","fee_type":"Admission Fee","amount":1500,"pay_mode":"Cash","recv_by":"Parmeshwar"},
  {"rno":"203","date":"2025-06-03","name":"Angad Kumar","father":"Mohan Pyare","class":"12th","fee_type":"Tuition Fee","amount":4000,"pay_mode":"Cash","recv_by":"Parmeshwar"},
  {"rno":"204","date":"2025-06-03","name":"Arti","father":"Bramhdev","class":"5th","fee_type":"School Fee","amount":10000,"pay_mode":"Cash","recv_by":"Parmeshwar"},
  {"rno":"205","date":"2025-06-04","name":"Suraj Dhurve","father":"Dharmpal","class":"UKG","fee_type":"Admission Fee","amount":2000,"pay_mode":"Cash","recv_by":"Chandrasen Yadav"},
  {"rno":"210","date":"2025-07-10","name":"Arjun Yadav","father":"Devnath Yadav","class":"7th","fee_type":"Hostel Fee","amount":20000,"pay_mode":"PhonePe","recv_by":"Parmeshwar"},
  {"rno":"211","date":"2025-07-11","name":"Prince Gupta","father":"Ratnesh Kumar","class":"7th","fee_type":"Hostel Fee","amount":10000,"pay_mode":"Cash","recv_by":"Roshni"}
];
const DEMO_MONTHLY    = {"2025-06":97500,"2025-07":132000,"2025-08":83500,"2025-09":75500,"2025-10":14000,"2025-11":10000,"2025-12":45000,"2026-01":113500,"2026-02":153000,"2026-03":57000};
const DEMO_FEE_TOTALS = {"Admission Fee":195500,"Tuition Fee":76500,"School Fee":203500,"Hostel Fee":315500};
const DEMO_SUMMARY    = {totalStudents:94,hostelStudents:22,totalCollected:791000,hostelCollected:315500,admissionCollected:195500,tuitionCollected:76500,schoolCollected:203500};

const DEMO_EXPENSES = [
  {date:"2025-06-05",category:"Stationery",description:"Chart papers & markers",amount:850,paidTo:"Ravi General Store",by:"Parmeshwar"},
  {date:"2025-06-12",category:"Maintenance",description:"Classroom fan repair",amount:1200,paidTo:"Electrician Sunil",by:"Chandrasen Yadav"},
  {date:"2025-07-01",category:"Salary",description:"June staff salary advance",amount:15000,paidTo:"Staff",by:"Parmeshwar"},
  {date:"2025-08-10",category:"Furniture",description:"2 new benches Class 6",amount:3400,paidTo:"Carpenter Ramesh",by:"Pathak Sir"},
  {date:"2025-09-05",category:"Utility",description:"Electricity bill August",amount:2200,paidTo:"CSPDCL",by:"Parmeshwar"},
];
const DEMO_BANK = [
  {date:"2025-06-05",bank:"CRGB",accountNo:"XXXX1234",description:"Fee deposit June batch 1",amount:45000,depositedBy:"Parmeshwar",txnRef:"TXN001"},
  {date:"2025-07-02",bank:"SBI",accountNo:"XXXX5678",description:"Fee deposit July",amount:62000,depositedBy:"Chandrasen Yadav",txnRef:"TXN002"},
  {date:"2025-08-08",bank:"CRGB",accountNo:"XXXX1234",description:"Hostel fee deposit",amount:80000,depositedBy:"Parmeshwar",txnRef:"TXN003"},
];
// Demo test scores (class → [tests])
const DEMO_TESTS = [
  {id:1,date:"2026-01-15",class:"7th",testName:"Weekly Test 1",subject:"Mathematics",maxMarks:25,type:"weekly",
   scores:[
     {name:"Arjun Yadav",   obtained:22},
     {name:"Prince Gupta",  obtained:18},
     {name:"Rishu Kurre",   obtained:20},
     {name:"Saroj",         obtained:15},
   ]},
  {id:2,date:"2026-01-22",class:"7th",testName:"Weekly Test 2",subject:"Science",maxMarks:25,type:"weekly",
   scores:[
     {name:"Arjun Yadav",   obtained:20},
     {name:"Prince Gupta",  obtained:23},
     {name:"Rishu Kurre",   obtained:17},
     {name:"Saroj",         obtained:19},
   ]},
  {id:3,date:"2026-02-10",class:"7th",testName:"Monthly Test Feb",subject:"All Subjects",maxMarks:100,type:"monthly",
   scores:[
     {name:"Arjun Yadav",   obtained:82},
     {name:"Prince Gupta",  obtained:76},
     {name:"Rishu Kurre",   obtained:68},
     {name:"Saroj",         obtained:71},
   ]},
  {id:4,date:"2026-01-18",class:"9th",testName:"Weekly Test 1",subject:"Mathematics",maxMarks:25,type:"weekly",
   scores:[
     {name:"Ashutosh Paikara", obtained:21},
   ]},
];

// ── API HELPER ────────────────────────────────────────────────────
async function api(params) {
  if (!SCRIPT_URL) return demoHandler(params);
  const url = SCRIPT_URL + '?' + new URLSearchParams(params).toString();
  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch(e) {
    console.warn('API error, falling back to demo:', e.message);
    return demoHandler(params);
  }
}

// ── DEMO HANDLER ─────────────────────────────────────────────────
function demoHandler(params) {
  const action = params.action;

  if (action === 'login') {
    if (params.role === 'admin') {
      if (params.username === 'admin' && params.password === 'school@2025')
        return {success:true,role:'admin',token:'ADMIN_DEMO_TOKEN',user:'Administrator'};
      return {success:false,error:'Invalid credentials'};
    }
    // Student login: exact name + mother match
    const sn = (params.studentName||'').toLowerCase().trim();
    const sm = (params.motherName||'').toLowerCase().trim();
    if (!sn || !sm) return {success:false,error:'Please enter both fields'};
    const matched = DEMO_STUDENTS.filter(s => s.name.toLowerCase()===sn && (s.mother||'').toLowerCase()===sm);
    if (!matched.length) return {success:false,error:'No student found. Check name and mother\'s name.'};
    return {success:true,role:'student',user:matched[0].name,studentQuery:matched[0].name,motherName:matched[0].mother||''};
  }

  if (action === 'getDashboard')    return {summary:DEMO_SUMMARY,feeTotals:DEMO_FEE_TOTALS,monthly:DEMO_MONTHLY};
  if (action === 'getStudents') {
    let s = [...DEMO_STUDENTS];
    const q=(params.search||'').toLowerCase();
    if(q) s=s.filter(x=>x.name.toLowerCase().includes(q)||x.father.toLowerCase().includes(q));
    if(params.cls) s=s.filter(x=>x.class===params.cls);
    if(params.hostelOnly==='true') s=s.filter(x=>x.hasHostel);
    return {students:s};
  }
  if (action === 'getStudentDetail') {
    const q = (params.name||'').toLowerCase().trim();
    const s = DEMO_STUDENTS.find(x=>x.name.toLowerCase()===q);
    if (!s) return {student:null};
    const receipts = DEMO_RECORDS.filter(r=>r.name===s.name).map(r=>({receiptNo:r.rno,date:r.date,feeType:r.fee_type,amount:r.amount,payMode:r.pay_mode}));
    const siblings = DEMO_STUDENTS.filter(x=>{
      if(x.name===s.name) return false;
      return s.father && x.father && s.father.toUpperCase()===x.father.toUpperCase() &&
             s.mother && x.mother && s.mother.toUpperCase()===x.mother.toUpperCase();
    }).map(x=>({name:x.name,class:x.class,total:x.total}));
    return {student:{...s,receipts,siblings}};
  }
  if (action === 'getHostelStudents') return {students:DEMO_STUDENTS.filter(s=>s.hasHostel).map(s=>({...s,payModes:'Cash'}))};
  if (action === 'getSiblings') {
    const families = buildFamilyGroupsJS(DEMO_STUDENTS);
    return {families};
  }
  if (action === 'getFeeRegister') {
    let r=[...DEMO_RECORDS];
    const q=(params.search||'').toLowerCase();
    if(q) r=r.filter(x=>x.name.toLowerCase().includes(q)||String(x.rno).includes(q));
    if(params.feeType) r=r.filter(x=>x.fee_type===params.feeType);
    return {records:r,total:r.length,page:0,pageSize:25};
  }
  if (action === 'getStudentHistory') {
    const q = (params.query||'').toLowerCase().trim();
    const m = (params.mother||'').toLowerCase().trim();
    const matched = DEMO_STUDENTS.filter(s=>s.name.toLowerCase()===q && (s.mother||'').toLowerCase()===m);
    if (!matched.length) return {students:[]};
    return {students: matched.map(s=>({
      ...s,
      receipts: DEMO_RECORDS.filter(r=>r.name===s.name).map(r=>({receiptNo:r.rno,date:r.date,feeType:r.fee_type,amount:r.amount,payMode:r.pay_mode})),
      siblings: DEMO_STUDENTS.filter(x=>{
        if(x.name===s.name) return false;
        return s.father&&x.father&&s.father.toUpperCase()===x.father.toUpperCase()&&s.mother&&x.mother&&s.mother.toUpperCase()===x.mother.toUpperCase();
      }).map(x=>({name:x.name,class:x.class}))
    }))};
  }
  if (action === 'addStudent')    return {success:true,message:'Student registered (demo)'};
  if (action === 'addFeeEntry')   return {success:true,rowsAdded:1,message:'Fee saved (demo)'};
  if (action === 'getLastReceiptNo') {
    const max = Math.max(...DEMO_RECORDS.map(r=>parseInt(r.rno)||0),200);
    return {lastReceiptNo:max,nextReceiptNo:max+1};
  }
  if (action === 'checkDuplicateReceipt') {
    const byRno = DEMO_RECORDS.filter(r=>r.rno===params.receiptNo);
    if (byRno.length) return {duplicate:true,type:'receiptNo',message:'Receipt #'+params.receiptNo+' exists for: '+byRno[0].name};
    return {duplicate:false};
  }
  if (action === 'getExpenses')    return {expenses:DEMO_EXPENSES,total:DEMO_EXPENSES.reduce((a,e)=>a+e.amount,0)};
  if (action === 'getBankDeposits') return {deposits:DEMO_BANK,total:DEMO_BANK.reduce((a,b)=>a+b.amount,0)};
  if (action === 'addExpense')      return {success:true,message:'Expense recorded (demo)'};
  if (action === 'addBankDeposit')  return {success:true,message:'Bank deposit recorded (demo)'};
  if (action === 'getTests') {
    let tests = [...DEMO_TESTS];
    if (params.cls)  tests = tests.filter(t=>t.class===params.cls);
    if (params.type) tests = tests.filter(t=>t.type===params.type);
    return {tests};
  }
  if (action === 'getStudentTests') {
    const name = (params.studentName||'').trim();
    const results = DEMO_TESTS
      .filter(t=>t.scores.some(s=>s.name===name))
      .map(t=>{
        const sc = t.scores.find(s=>s.name===name);
        return {testId:t.id,date:t.date,testName:t.testName,subject:t.subject,maxMarks:t.maxMarks,type:t.type,class:t.class,obtained:sc?sc.obtained:null};
      });
    return {results};
  }
  if (action === 'addTestResult')   return {success:true,message:'Test result saved (demo)'};
  return {error:'Unknown action: '+action};
}

// ── AUTH ──────────────────────────────────────────────────────────
function setRole(r) {
  CURRENT_ROLE = r;
  document.getElementById('tab-admin').classList.toggle('active', r==='admin');
  document.getElementById('tab-student').classList.toggle('active', r==='student');
  document.getElementById('admin-fields').style.display    = r==='admin'?'':'none';
  document.getElementById('student-fields').style.display  = r==='student'?'':'none';
  document.getElementById('login-hint').style.display      = 'block';
  const sh = document.getElementById('student-hint');
  if (sh) sh.style.display = r==='student'?'inline':'none';
}

async function doLogin() {
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  err.style.display='none';
  btn.disabled=true; btn.textContent='Signing in…';
  try {
    let params;
    if (CURRENT_ROLE==='admin') {
      params = {action:'login',role:'admin',username:document.getElementById('uname').value.trim(),password:document.getElementById('upass').value.trim()};
    } else {
      const sName   = document.getElementById('student-name-input').value.trim();
      const sMother = document.getElementById('student-mother-input').value.trim();
      if (!sName||!sMother) {
        err.textContent='Please enter both Student Name and Mother\'s Name';
        err.style.display='block';
        btn.disabled=false; btn.textContent='Sign In →';
        return;
      }
      params = {action:'login',role:'student',studentName:sName,motherName:sMother};
    }
    const res = await api(params);
    if (res.success) {
      SESSION_TOKEN  = res.token || '';
      CURRENT_USER   = res.user;
      CURRENT_MOTHER = res.motherName || '';
      studentQuery   = res.studentQuery || '';
      launchApp(res.role);
    } else {
      err.textContent = res.error||'Login failed';
      err.style.display='block';
    }
  } catch(e) {
    err.textContent='Connection error: '+e.message;
    err.style.display='block';
  }
  btn.disabled=false; btn.textContent='Sign In →';
}

function doLogout() {
  SESSION_TOKEN=''; CURRENT_USER=''; CURRENT_MOTHER=''; stuPage=0; regPage=0;
  _studentCache=null;
  if(chartMonthly){chartMonthly.destroy();chartMonthly=null;}
  if(chartDonut){chartDonut.destroy();chartDonut=null;}
  document.getElementById('app').style.display='none';
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('upass').value='';
  const mi=document.getElementById('student-mother-input'); if(mi) mi.value='';
  const si=document.getElementById('student-name-input');   if(si) si.value='';
  document.getElementById('login-error').style.display='none';
}

function launchApp(role) {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').style.display='block';
  document.getElementById('role-badge').textContent = role==='admin'?'Admin':'Student';
  document.getElementById('role-badge').className   = 'role-badge '+role;
  document.getElementById('user-display').textContent = CURRENT_USER;
  buildNav(role);
  showPage(role==='admin' ? 'dashboard' : 'history');
}

// ── NAV ───────────────────────────────────────────────────────────
const ADMIN_PAGES = [
  {id:'dashboard',  l:'📊 Dashboard'},
  {id:'students',   l:'👥 Students'},
  {id:'hostel',     l:'🏠 Hostel'},
  {id:'siblings',   l:'👨‍👧‍👦 Families'},
  {id:'register',   l:'📋 Fee Register'},
  {id:'admit',      l:'➕ Admit'},
  {id:'feepay',     l:'💳 Collect Fee'},
  {id:'expenses',   l:'💸 Expenses & Bank'},
  {id:'tests',      l:'📝 Scores & Results'},
];
const STUDENT_PAGES = [
  {id:'history',  l:'📄 Fee History'},
  {id:'report',   l:'📋 Report Card'},
  {id:'myscores', l:'📝 My Scores'},
  {id:'payment',  l:'💳 Pay Online'},
  {id:'notices',  l:'📢 Notices'},
];

function buildNav(role) {
  const pages = role==='admin' ? ADMIN_PAGES : STUDENT_PAGES;
  document.getElementById('nav-tabs').innerHTML = pages.map(p=>
    `<button class="nav-tab" onclick="showPage('${p.id}')" id="nav-${p.id}">${p.l}</button>`
  ).join('');
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  const pageEl = document.getElementById('page-'+id);
  const tabEl  = document.getElementById('nav-'+id);
  if (pageEl) pageEl.classList.add('active');
  if (tabEl)  tabEl.classList.add('active');
  // Handler map built at call-time so all scripts are loaded
  const h = {
    dashboard:  typeof loadDashboard      !=='undefined' ? loadDashboard      : null,
    students:   typeof loadStudentsPage   !=='undefined' ? loadStudentsPage   : null,
    hostel:     typeof loadHostel         !=='undefined' ? loadHostel         : null,
    siblings:   typeof loadSiblings       !=='undefined' ? loadSiblings       : null,
    register:   typeof loadRegister       !=='undefined' ? loadRegister       : null,
    admit:      typeof loadAdmitPage      !=='undefined' ? loadAdmitPage      : null,
    feepay:     typeof loadFeePayPage     !=='undefined' ? loadFeePayPage     : null,
    expenses:   typeof loadExpensesPage   !=='undefined' ? loadExpensesPage   : null,
    tests:      typeof loadTestsAdminPage !=='undefined' ? loadTestsAdminPage : null,
    history:    typeof renderHistoryPage  !=='undefined' ? renderHistoryPage  : null,
    report:     typeof renderReportPage   !=='undefined' ? renderReportPage   : null,
    myscores:   typeof renderMyScoresPage !=='undefined' ? renderMyScoresPage : null,
    payment:    typeof renderPaymentPage  !=='undefined' ? renderPaymentPage  : null,
    notices:    typeof renderNoticesPage  !=='undefined' ? renderNoticesPage  : null,
  };
  if (h[id]) h[id]();
}

// ── SHARED FAMILY GROUPING ────────────────────────────────────────
function buildFamilyGroupsJS(students) {
  const groups = {};
  students.forEach(s => {
    const fKey = (s.father||'').trim().toUpperCase();
    const mKey = (s.mother||'').trim().toUpperCase();
    if (!fKey || !mKey) return;
    const familyKey = fKey+' + '+mKey;
    if (!groups[familyKey]) groups[familyKey]=[];
    groups[familyKey].push(s);
  });
  return Object.values(groups)
    .filter(ss=>ss.length>1)
    .sort((a,b)=>b.length-a.length)
    .map(children=>({
      father:children[0].father||'—', mother:children[0].mother||'',
      mobile:children[0].mobile||'—',
      count:children.length,
      familyTotal:children.reduce((a,c)=>a+(parseFloat(c.total)||0),0),
      children
    }));
}

// ── CGBSE SUBJECTS ────────────────────────────────────────────────
const CGBSE_SUBJECTS = {
  primary:{ label:'Primary (1–5)', subjects:[
    {name:'Hindi',max:100,type:'theory'},{name:'English',max:100,type:'theory'},
    {name:'Mathematics',max:100,type:'theory'},{name:'Environmental Studies (EVS)',max:100,type:'theory'},
    {name:'General Knowledge',max:50,type:'theory'},{name:'Drawing & Art',max:50,type:'practical'},
  ]},
  middle:{ label:'Middle (6–8)', subjects:[
    {name:'Hindi',max:100,type:'theory'},{name:'English',max:100,type:'theory'},
    {name:'Sanskrit / Urdu',max:100,type:'theory'},{name:'Mathematics',max:100,type:'theory'},
    {name:'Science',max:100,type:'theory'},{name:'Social Science',max:100,type:'theory'},
    {name:'General Knowledge',max:50,type:'theory'},{name:'Drawing & Art',max:50,type:'practical'},
    {name:'Physical Education',max:50,type:'practical'},
  ]},
  high:{ label:'High School (9–10)', subjects:[
    {name:'Hindi',max:100,type:'theory',pass:33},{name:'English',max:100,type:'theory',pass:33},
    {name:'Sanskrit / Urdu / 3rd Language',max:100,type:'theory',pass:33},
    {name:'Mathematics',max:100,type:'theory',pass:33},
    {name:'Science',max:100,type:'theory',pass:33,practical:true},
    {name:'Social Science',max:100,type:'theory',pass:33},
    {name:'Computer Science / Vocational',max:100,type:'theory',pass:33,practical:true},
  ]},
  higher:{ label:'Higher Sec (11–12)', subjects:[
    {name:'Hindi / English (Compulsory)',max:100,type:'theory',pass:33},
    {name:'Subject 1 (Core)',max:100,type:'theory',pass:33,practical:true},
    {name:'Subject 2 (Core)',max:100,type:'theory',pass:33,practical:true},
    {name:'Subject 3 (Core)',max:100,type:'theory',pass:33,practical:true},
    {name:'Subject 4 (Elective)',max:100,type:'theory',pass:33},
    {name:'Physical Education / Vocational',max:50,type:'practical'},
  ]},
};
const EXAMS = [
  {id:'pq', label:'Pre-Quarterly',short:'Pre-QT',month:'July–Aug',  color:'#06b6d4'},
  {id:'hy', label:'Half Yearly',  short:'Half-Yr',month:'Oct–Nov',  color:'#f59e0b'},
  {id:'ann',label:'Annual Exam',  short:'Annual', month:'March–Apr',color:'#10b981'},
];

function getClassGroup(cls) {
  const n=cls.replace(/[^0-9]/g,'');
  if(!n) return 'primary';
  const num=parseInt(n);
  if(num<=5) return 'primary';
  if(num<=8) return 'middle';
  if(num<=10) return 'high';
  return 'higher';
}
function getGrade(marks,max) {
  if(marks===null) return 'AB';
  const p=(marks/max)*100;
  if(p>=91) return 'O'; if(p>=71) return 'A'; if(p>=56) return 'B';
  if(p>=41) return 'C'; if(p>=33) return 'D'; return 'F';
}
function getGradeLabel(g){return {O:'Outstanding',A:'Excellent',B:'Good',C:'Average',D:'Satisfactory',F:'Needs Improvement',AB:'Absent'}[g]||'';}
function mockMarks(sName,cls,examId,subjName,maxMarks){
  const seed=(sName+subjName+examId+cls).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const rng=(seed*9301+49297)%233280/233280;
  const rng2=((seed*6364+1442695)%233280)/233280;
  if(rng2>0.92) return null;
  return Math.round(maxMarks*(0.38+rng*0.57));
}

// ── RECEIPT PRINT (shared) ────────────────────────────────────────
function printReceipt(r,s) {
  openReceiptPrint({receiptNo:r.receiptNo,date:r.date,studentName:s.name,fatherName:s.father,class:s.class,feeType:r.feeType,amount:r.amount,payMode:r.payMode,feeBreakdown:null,inWords:'',receivedBy:'',remarks:''},s);
}
function openReceiptPrint(r,s) {
  const breakdown = r.feeBreakdown
    ? Object.entries(r.feeBreakdown).filter(([,v])=>v>0).map(([k,v])=>`<tr><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb">${k}</td><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">₹${Number(v).toLocaleString('en-IN')}</td></tr>`).join('')
    : `<tr><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb">${r.feeType}</td><td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">₹${Number(r.amount).toLocaleString('en-IN')}</td></tr>`;
  const total = r.feeBreakdown ? Object.values(r.feeBreakdown).reduce((a,v)=>a+v,0) : r.amount;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receipt #${r.receiptNo}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:20px}
  .receipt{max-width:580px;margin:0 auto;border:2px solid #1e3a5f;border-radius:8px;overflow:hidden}
  .header{background:#1e3a5f;color:white;text-align:center;padding:18px 16px}
  .header h1{font-size:20px;font-weight:bold;margin-bottom:3px}.header p{font-size:12px;opacity:.85}
  .receipt-badge{background:#f59e0b;color:#000;text-align:center;padding:8px;font-size:13px;font-weight:bold;letter-spacing:.05em}
  .body{padding:18px}.row{display:flex;justify-content:space-between;margin-bottom:10px;font-size:13px}
  .row .label{color:#6b7280;font-size:12px}.row .val{font-weight:600;font-size:14px}
  table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13px}
  thead th{background:#f3f4f6;padding:8px 12px;text-align:left;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:#6b7280}
  .total-row td{padding:10px 12px;background:#1e3a5f;color:white;font-weight:bold;font-size:15px}.total-row td:last-child{text-align:right}
  .footer{border-top:2px dashed #e5e7eb;margin-top:18px;padding-top:16px;display:flex;justify-content:space-between;font-size:12px;color:#6b7280}
  .sig{border-top:1px solid #9ca3af;padding-top:6px;margin-top:30px;font-size:11px;text-align:center;width:45%}
  .cut{text-align:center;padding:10px;font-size:11px;color:#9ca3af;border-top:2px dashed #d1d5db;border-bottom:2px dashed #d1d5db;margin:16px 0;letter-spacing:.05em}
  @media print{.no-print{display:none}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
  <div class="no-print" style="text-align:center;margin-bottom:16px">
    <button onclick="window.print()" style="padding:10px 28px;background:#1e3a5f;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;margin-right:10px">🖨 Print</button>
    <button onclick="window.close()" style="padding:10px 20px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;font-size:14px;cursor:pointer">✕ Close</button>
  </div>
  <div class="receipt">
    <div class="header"><h1>B.N. CONVENT HIGHER SECONDARY SCHOOL</h1><p>Wadrafnagar, Balrampur – 497225 | Contact: 9826278578</p></div>
    <div class="receipt-badge">FEE RECEIPT — SESSION 2025-26</div>
    <div class="body">
      <div class="row"><span><span class="label">Receipt No.</span><br><span class="val">#${r.receiptNo}</span></span><span style="text-align:right"><span class="label">Date</span><br><span class="val">${r.date}</span></span></div>
      <div class="row"><span><span class="label">Student Name</span><br><span class="val">${r.studentName}</span></span><span style="text-align:right"><span class="label">Class</span><br><span class="val">${r.class||'—'}</span></span></div>
      <div class="row"><span><span class="label">Father's Name</span><br><span class="val">${r.fatherName||'—'}</span></span><span style="text-align:right"><span class="label">Payment Mode</span><br><span class="val">${r.payMode}</span></span></div>
      <table><thead><tr><th>Fee Particulars</th><th style="text-align:right">Amount (₹)</th></tr></thead><tbody>${breakdown}</tbody>
      <tr class="total-row"><td>TOTAL PAID</td><td>₹${Number(total).toLocaleString('en-IN')}</td></tr></table>
      ${r.inWords?`<p style="font-size:12px;color:#374151;margin-bottom:8px"><strong>In Words:</strong> ${r.inWords}</p>`:''}
      <div class="footer"><span>Received By: <strong>${r.receivedBy||'—'}</strong></span><span>Computer-generated receipt</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:24px"><div class="sig">Parent / Guardian</div><div class="sig">Authorised Signatory</div></div>
    </div>
  </div>
  <div class="cut">✂ SCHOOL COPY — CUT HERE ✂</div>
  <div class="receipt" style="border-color:#d1d5db">
    <div class="header" style="background:#374151;padding:12px 16px"><h1 style="font-size:15px">B.N. CONVENT H.S.S. — SCHOOL COPY</h1><p>Receipt #${r.receiptNo} | ${r.date}</p></div>
    <div class="body" style="padding:14px">
      <div class="row"><span class="label">Student</span><span class="val">${r.studentName} (Class ${r.class||'—'})</span></div>
      <div class="row"><span class="label">Father</span><span class="val">${r.fatherName||'—'}</span></div>
      <div class="row"><span class="label">Total Paid</span><span class="val" style="color:#1e3a5f;font-size:16px">₹${Number(total).toLocaleString('en-IN')}</span></div>
      <div class="row"><span class="label">Mode</span><span class="val">${r.payMode}</span></div>
    </div>
  </div></body></html>`;
  const win=window.open('','_blank','width=680,height=800');
  win.document.write(html); win.document.close();
}

// ── FORM MESSAGE HELPER ───────────────────────────────────────────
function showFormMsg(id,type,text){
  const el=document.getElementById(id); if(!el) return;
  const bg={success:'rgba(16,185,129,.1)',error:'rgba(239,68,68,.1)',info:'rgba(6,182,212,.08)'};
  const bd={success:'rgba(16,185,129,.3)',error:'rgba(239,68,68,.3)',info:'rgba(6,182,212,.25)'};
  const tc={success:'#6ee7b7',error:'#fca5a5',info:  'var(--accent2)'};
  el.style.cssText=`display:block;padding:12px 16px;border-radius:10px;font-size:13px;background:${bg[type]};border:1px solid ${bd[type]};color:${tc[type]}`;
  el.textContent=text;
  if(type==='success') setTimeout(()=>el.style.display='none',5000);
}

// ── SHARED UTILS ──────────────────────────────────────────────────
function fmt(n){return Number(n).toLocaleString('en-IN')}
function loader(){return `<div class="loader"><div class="spinner"></div>Loading…</div>`}
function errorBox(msg){return `<div class="loader" style="color:var(--danger)">⚠️ ${msg}</div>`}
function kpi(icon,label,value,sub,cls,money){
  return `<div class="kpi-card ${cls}"><div class="kpi-icon">${icon}</div><div class="kpi-label">${label}</div><div class="kpi-value ${money?'money':''}">${value}</div><div class="kpi-sub">${sub}</div></div>`;
}
function feeColor(k){return {'Hostel Fee':'#8b5cf6','School Fee':'#10b981','Admission Fee':'#f59e0b','Tuition Fee':'#06b6d4'}[k]||'#94a3b8'}
function classOrd(a,b){const o={Nursery:0,LKG:1,UKG:2,'1st':3,'2nd':4,'3rd':5,'4th':6,'5th':7,'6th':8,'7th':9,'8th':10,'9th':11,'10th':12,'11th':13,'12th':14};return (o[a]??99)-(o[b]??99);}
const _timers={};
function debounce(fn,ms){return function(){clearTimeout(_timers[fn]);_timers[fn]=setTimeout(fn,ms);};}
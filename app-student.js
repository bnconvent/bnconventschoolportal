// ================================================================
// app-student.js  —  Student / Parent portal pages
// Fee History · Report Card · My Test Scores · Pay Online · Notices
// ================================================================

// ════════════════════════════════════════════════════════════════════
// FEE HISTORY  (auto-loads from login credentials)
// ════════════════════════════════════════════════════════════════════
function renderHistoryPage() {
  const el = document.getElementById('page-history');
  el.innerHTML = `<div id="hist-result">${loader()}</div>`;
  loadStudentHistory(CURRENT_USER, CURRENT_MOTHER);
}

async function loadStudentHistory(name, mother) {
  const el = document.getElementById('hist-result');
  if (!el) return;
  el.innerHTML = loader();
  try {
    const d = await api({action:'getStudentHistory', query:name, mother});
    const students = d.students || [];
    if (!students.length) {
      el.innerHTML = `
      <div style="text-align:center;padding:60px 20px">
        <div style="font-size:44px;margin-bottom:14px;opacity:.5">🔍</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:6px">No fee records found</div>
        <div style="font-size:12px;color:var(--muted)">Records for <strong>${name}</strong> are not yet in the system.<br>Please contact the school office.</div>
      </div>`;
      return;
    }
    renderStudentProfileHTML(el, students);
  } catch(e) { el.innerHTML = errorBox(e.message); }
}

function renderStudentProfileHTML(el, students) {
  let html = '';
  students.forEach(s => {
    const initials = s.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    html += `
    <div class="sprofile">
      <div class="sph">
        <div class="spav">${initials}</div>
        <div>
          <div class="spname">${s.name}</div>
          <div class="spmeta">
            Father: ${s.father||'—'} &nbsp;·&nbsp; Mother: ${s.mother||'—'} &nbsp;·&nbsp; Class ${s.class}
            ${s.hasHostel?' &nbsp;·&nbsp; 🏠 Hostel':''}
            ${s.mobile?` &nbsp;·&nbsp; 📱 ${s.mobile}`:''}
          </div>
        </div>
      </div>`;

    if (s.siblings && s.siblings.length > 0) {
      html += `<div class="sib-notice" style="margin:0 0 14px">
        <div class="ni">👨‍👧‍👦</div>
        <div>
          <div class="nt">Sibling(s) in school — Father: ${s.father}${s.mother?' · Mother: '+s.mother:''}</div>
          <div class="sib-chips" style="margin-top:6px">${s.siblings.map(x=>`<span class="chip">${x.name} · Class ${x.class}</span>`).join('')}</div>
        </div>
      </div>`;
    }

    html += `
      <div class="fee-pills">
        ${s.admission>0?`<div class="pill paid"><div class="pl">Admission</div><div class="pv">₹${fmt(s.admission)}</div></div>`:''}
        ${s.tuition>0?`<div class="pill paid"><div class="pl">Tuition</div><div class="pv">₹${fmt(s.tuition)}</div></div>`:''}
        ${s.school>0?`<div class="pill paid"><div class="pl">School Fee</div><div class="pv">₹${fmt(s.school)}</div></div>`:''}
        ${s.hostel>0?`<div class="pill hostel"><div class="pl">Hostel</div><div class="pv">₹${fmt(s.hostel)}</div></div>`:''}
        ${s.stationary>0?`<div class="pill paid"><div class="pl">Stationary</div><div class="pv">₹${fmt(s.stationary)}</div></div>`:''}
        <div class="pill total"><div class="pl">Total Paid</div><div class="pv">₹${fmt(s.total)}</div></div>
      </div>
    </div>
    <div class="receipt-list">
      ${(s.receipts||[]).length===0
        ? '<div class="empty">No payment records found.</div>'
        : (s.receipts||[]).map(r=>`
        <div class="ritem">
          <div>
            <div class="rno">Receipt #${r.receiptNo} · ${r.payMode}</div>
            <div class="rtype">${r.feeType}</div>
            <div class="rdate">${r.date}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="ramt">₹${fmt(r.amount)}</div>
            <button onclick="printReceipt(${JSON.stringify(r).replace(/"/g,'&quot;')},${JSON.stringify(s).replace(/"/g,'&quot;')})"
              style="padding:5px 10px;background:rgba(6,182,212,.15);border:1px solid rgba(6,182,212,.3);border-radius:7px;color:var(--accent2);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">🖨 Print</button>
          </div>
        </div>`).join('')}
    </div>
    <div style="margin-bottom:20px"></div>`;
  });
  el.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════════
// REPORT CARD  (auto-loads from login credentials)
// ════════════════════════════════════════════════════════════════════
let rcCurrentStudent = null;
let rcCurrentExam    = 'pq';

function renderReportPage() {
  const el = document.getElementById('page-report');
  el.innerHTML = `
  <div class="rc-tabs" id="rc-exam-tabs">
    ${EXAMS.map(e=>`<button class="rc-tab${e.id===rcCurrentExam?' active':''}" onclick="rcCurrentExam='${e.id}';renderReportPage()">${e.label} <span style="font-size:10px;color:var(--muted);margin-left:4px">${e.month}</span></button>`).join('')}
  </div>
  <div id="rc-result">${loader()}</div>`;
  loadReportCard(CURRENT_USER, CURRENT_MOTHER);
}

async function loadReportCard(name, mother) {
  const el = document.getElementById('rc-result');
  if (!el) return;
  el.innerHTML = loader();
  try {
    // Fetch student info + exam results in parallel
    const [studentData, examData] = await Promise.all([
      api({ action: 'getStudentHistory', query: name, mother }),
      api({ action: 'getExamResults', studentName: name, examType: rcCurrentExam })
    ]);

    const students = studentData.students || [];
    if (!students.length) {
      el.innerHTML = `<div class="rc-na-box"><div class="rc-na-icon">🔍</div>
        <p>No records found for <strong>${name}</strong>.<br>Contact school office.</p></div>`;
      return;
    }

    rcCurrentStudent = students[0];
    rcCurrentStudent._examResults = examData.results || [];  // attach live marks
    rcCurrentStudent._liveData    = examData.found;          // flag: real vs demo
    renderReportCard();
  } catch(e) { el.innerHTML = errorBox(e.message); }
}

function renderReportCard() {
  const s = rcCurrentStudent;
  if (!s) return;
  const el = document.getElementById('rc-result');
  if (!el) return;
  const group = getClassGroup(s.class);
  const subjectSet = CGBSE_SUBJECTS[group];
  const exam = EXAMS.find(e=>e.id===rcCurrentExam);

 const rows = subjectSet.subjects.map(sub => {
  // Try live data first
  const live = (s._examResults || []).find(
    r => r.subject.toLowerCase() === sub.name.toLowerCase()
  );

  let obtained;
  if (live) {
    obtained = live.isAbsent ? null : live.totalObt;
  } else {
    obtained = s._liveData ? null : mockMarks(s.name, s.class, rcCurrentExam, sub.name, sub.max);
  }

  const grade  = getGrade(obtained, sub.max);
  const pass   = sub.pass || Math.round(sub.max * 0.33);
  return { ...sub, obtained, grade, isPassed: obtained === null ? null : obtained >= pass, pass };
});

  const attempted    = rows.filter(r=>r.obtained!==null);
  const totalMax     = attempted.reduce((a,r)=>a+r.max,0);
  const totalObt     = attempted.reduce((a,r)=>a+r.obtained,0);
  const percentage   = totalMax>0 ? ((totalObt/totalMax)*100).toFixed(1) : 0;
  const allPassed    = attempted.length>0 && attempted.every(r=>r.isPassed);
  const overallGrade = getGrade(totalObt,totalMax);

  el.innerHTML = `
  <div class="rc-card">
    <div class="rc-header">
      <div>
        <div class="rc-school">B.N. Convent Higher Secondary School</div>
        <div class="rc-school-sub">Wadrafnagar, Balrampur – 497225 &nbsp;·&nbsp; CGBSE Affiliated &nbsp;·&nbsp; Session 2025-26</div>
      </div>
      <div class="rc-exam-badge">${exam.label.toUpperCase()}</div>
    </div>
    <div class="rc-student-strip">
      <div class="rc-sinfo"><div style="margin-bottom:2px">Student Name</div><strong>${s.name}</strong></div>
      <div class="rc-sinfo"><div style="margin-bottom:2px">Father's Name</div><strong>${s.father||'—'}</strong></div>
      <div class="rc-sinfo"><div style="margin-bottom:2px">Class</div><strong>${s.class}</strong></div>
      <div class="rc-sinfo"><div style="margin-bottom:2px">Group</div><strong>${subjectSet.label}</strong></div>
      <div class="rc-sinfo"><div style="margin-bottom:2px">Exam Month</div><strong>${exam.month}</strong></div>
    </div>
    <div class="rc-table-wrap">
      <table class="rc-table">
        <thead><tr>
          <th style="width:36px">#</th><th>Subject</th>
          <th class="center">Max</th><th class="center">Pass</th>
          <th class="center">Obtained</th><th class="center">%</th>
          <th class="center">Grade</th><th class="center">Status</th>
        </tr></thead>
        <tbody>
          ${rows.map((r,i)=>{
            const pct = r.obtained!==null ? ((r.obtained/r.max)*100).toFixed(0) : '—';
            const statusHtml = r.obtained===null
              ? '<span style="font-size:11px;color:var(--muted)">Absent</span>'
              : r.isPassed
                ? '<span style="font-size:11px;color:var(--accent3);font-weight:700">✓ Pass</span>'
                : '<span style="font-size:11px;color:var(--danger);font-weight:700">✗ Fail</span>';
            return `<tr>
              <td style="color:var(--muted);font-size:11px">${i+1}</td>
              <td><div style="font-weight:500">${r.name}</div>
                  ${r.practical?'<div style="font-size:10px;color:var(--accent2)">+Practical</div>':''}
                  <div style="font-size:10px;color:var(--muted);text-transform:capitalize">${r.type}</div></td>
              <td class="center rc-marks">${r.max}</td>
              <td class="center" style="font-size:12px;color:var(--muted)">${r.pass}</td>
              <td class="center"><span class="rc-marks ${r.obtained===null?'absent':r.isPassed?'pass':'fail'}">${r.obtained===null?'AB':r.obtained}</span></td>
              <td class="center" style="font-size:12px;color:var(--muted)">${pct}${pct!=='—'?'%':''}</td>
              <td class="center"><span class="grade-pill grade-${r.grade}">${r.grade}</span></td>
              <td class="center">${statusHtml}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="rc-summary">
      <div class="rc-sum-item"><div class="rc-sum-val">${totalObt} / ${totalMax}</div><div class="rc-sum-lbl">Total Marks</div></div>
      <div class="rc-sum-item"><div class="rc-sum-val">${percentage}%</div><div class="rc-sum-lbl">Percentage</div></div>
      <div class="rc-sum-item"><div class="rc-sum-val"><span class="grade-pill grade-${overallGrade}" style="font-size:15px;padding:4px 12px">${overallGrade}</span></div><div class="rc-sum-lbl">Grade</div></div>
      <div class="rc-sum-item">
        <div style="margin-bottom:4px"><span class="rc-result-badge ${attempted.length===0?'na':allPassed?'pass':'fail'}">${attempted.length===0?'N/A':allPassed?'✓ PASSED':'✗ FAILED'}</span></div>
        <div class="rc-sum-lbl">Result</div>
      </div>
      <div class="rc-sum-item"><div class="rc-sum-val">${rows.filter(r=>r.obtained===null).length}</div><div class="rc-sum-lbl">Absent</div></div>
      <div class="rc-sum-item" style="margin-left:auto">
        <div style="font-size:11px;color:var(--muted);line-height:1.9;text-align:right">
          <strong style="color:var(--text)">CGBSE Grade Scale</strong><br>
          O ≥91% &nbsp; A ≥71% &nbsp; B ≥56%<br>C ≥41% &nbsp; D ≥33% &nbsp; F &lt;33%
        </div>
      </div>
    </div>
    <div class="rc-print-btn">
      <button onclick="printReportCard()" class="form-btn blue" style="font-size:12px;padding:9px 18px">🖨 Print Report Card</button>
      <button onclick="showPage('history')" class="form-btn secondary" style="font-size:12px;padding:9px 18px">📄 Fee History</button>
    </div>
  </div>
  ${!s._liveData ? `
  <div class="rc-coming-soon">
    <div class="cs-icon">🔗</div>
    <h3>Live Marks Coming Soon</h3>
    <p>Above marks are <strong>sample/demo data</strong>.<br>
    Once results are uploaded to <strong>"Exam Results"</strong> sheet, they appear here automatically.</p>
  </div>` : ''}
  `;
}

function printReportCard() {
  const s = rcCurrentStudent; if (!s) return;
  const group = getClassGroup(s.class);
  const subjectSet = CGBSE_SUBJECTS[group];
  const exam = EXAMS.find(e=>e.id===rcCurrentExam);
  const rows = subjectSet.subjects.map(sub=>{
    const obtained=mockMarks(s.name,s.class,rcCurrentExam,sub.name,sub.max);
    const grade=getGrade(obtained,sub.max);
    const pass=sub.pass||Math.round(sub.max*0.33);
    return{...sub,obtained,grade,isPassed:obtained===null?null:obtained>=pass,pass};
  });
  const attempted=rows.filter(r=>r.obtained!==null);
  const totalMax=attempted.reduce((a,r)=>a+r.max,0);
  const totalObt=attempted.reduce((a,r)=>a+r.obtained,0);
  const pct=totalMax>0?((totalObt/totalMax)*100).toFixed(1):0;
  const allPassed=attempted.length>0&&attempted.every(r=>r.isPassed);
  const oGrade=getGrade(totalObt,totalMax);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report Card – ${s.name}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:20px}
  .wrap{max-width:720px;margin:0 auto}.header{background:#1e3a5f;color:white;padding:18px 20px;text-align:center;border-radius:8px 8px 0 0}
  .header h1{font-size:18px;font-weight:bold;margin-bottom:4px}.header p{font-size:11px;opacity:.8}
  .badge{background:#f59e0b;color:#000;text-align:center;padding:7px;font-size:13px;font-weight:bold}
  .sstrip{display:flex;flex-wrap:wrap;border:1px solid #e5e7eb;border-top:none}
  .sf{flex:1 1 30%;padding:8px 14px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;min-width:110px}
  .sf .lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em}
  .sf .val{font-size:13px;font-weight:700;margin-top:2px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:14px}
  th{background:#f3f4f6;padding:8px 10px;text-align:center;font-size:10px;text-transform:uppercase;color:#6b7280;border:1px solid #e5e7eb}
  th:first-child,th:nth-child(2){text-align:left}
  td{padding:8px 10px;border:1px solid #e5e7eb;text-align:center}td:first-child,td:nth-child(2){text-align:left}
  .pass{color:#059669;font-weight:700}.fail{color:#dc2626;font-weight:700}.absent{color:#9ca3af}
  .summary{margin-top:14px;display:flex;gap:0;border:2px solid #1e3a5f;border-radius:8px;overflow:hidden}
  .si{flex:1;padding:12px;text-align:center;border-right:1px solid #e5e7eb}.si:last-child{border-right:none}
  .sv{font-size:17px;font-weight:bold;color:#1e3a5f}.sl{font-size:9px;color:#6b7280;text-transform:uppercase;margin-top:3px;letter-spacing:.06em}
  .rp{background:#d1fae5;color:#059669;font-weight:bold}.rf{background:#fee2e2;color:#dc2626;font-weight:bold}
  .sigs{display:flex;justify-content:space-between;margin-top:40px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280}
  .sig{border-top:1px solid #9ca3af;padding-top:5px;margin-top:28px;text-align:center;width:160px}
  .no-print{text-align:center;margin-bottom:16px}
  @media print{.no-print{display:none}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
  <div class="no-print">
    <button onclick="window.print()" style="padding:10px 28px;background:#1e3a5f;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;margin-right:8px">🖨 Print</button>
    <button onclick="window.close()" style="padding:10px 16px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;font-size:14px;cursor:pointer">✕ Close</button>
  </div>
  <div class="wrap">
    <div class="header"><h1>B.N. CONVENT HIGHER SECONDARY SCHOOL</h1><p>Wadrafnagar, Balrampur – 497225 | 9826278578 | CGBSE Affiliated</p></div>
    <div class="badge">${exam.label.toUpperCase()} — SESSION 2025-26</div>
    <div class="sstrip">
      <div class="sf"><div class="lbl">Student</div><div class="val">${s.name}</div></div>
      <div class="sf"><div class="lbl">Father</div><div class="val">${s.father||'—'}</div></div>
      <div class="sf"><div class="lbl">Class</div><div class="val">${s.class}</div></div>
      <div class="sf"><div class="lbl">Exam Month</div><div class="val">${exam.month}</div></div>
      <div class="sf"><div class="lbl">Date of Report</div><div class="val">${new Date().toLocaleDateString('en-IN')}</div></div>
    </div>
    <table><thead><tr><th>#</th><th>Subject</th><th>Max</th><th>Pass</th><th>Obtained</th><th>%</th><th>Grade</th><th>Status</th></tr></thead>
    <tbody>${rows.map((r,i)=>`<tr>
      <td>${i+1}</td><td>${r.name}</td><td>${r.max}</td><td>${r.pass}</td>
      <td class="${r.obtained===null?'absent':r.isPassed?'pass':'fail'}">${r.obtained===null?'AB':r.obtained}</td>
      <td>${r.obtained!==null?((r.obtained/r.max)*100).toFixed(0)+'%':'—'}</td>
      <td><strong>${r.grade}</strong></td>
      <td class="${r.obtained===null?'absent':r.isPassed?'pass':'fail'}">${r.obtained===null?'Absent':r.isPassed?'Pass':'Fail'}</td>
    </tr>`).join('')}</tbody></table>
    <div class="summary">
      <div class="si"><div class="sv">${totalObt}/${totalMax}</div><div class="sl">Total Marks</div></div>
      <div class="si"><div class="sv">${pct}%</div><div class="sl">Percentage</div></div>
      <div class="si"><div class="sv">${oGrade}</div><div class="sl">Grade</div></div>
      <div class="si ${allPassed?'rp':'rf'}"><div class="sv">${allPassed?'PASS':'FAIL'}</div><div class="sl">Result</div></div>
      <div class="si"><div class="sv">${rows.filter(r=>r.obtained===null).length}</div><div class="sl">Absent</div></div>
    </div>
    <div style="margin-top:10px;font-size:10px;color:#6b7280;text-align:center">Grade Scale: O(≥91%) · A(≥71%) · B(≥56%) · C(≥41%) · D(≥33%) · F(&lt;33%)</div>
    <div class="sigs">
      <div class="sig">Class Teacher</div><div class="sig">Parent / Guardian</div><div class="sig">Principal</div>
    </div>
  </div></body></html>`;
  const win=window.open('','_blank','width=720,height=860');
  win.document.write(html); win.document.close();
}

// ════════════════════════════════════════════════════════════════════
// MY TEST SCORES  (student view)
// ════════════════════════════════════════════════════════════════════
async function renderMyScoresPage() {
  const el = document.getElementById('page-myscores');
  el.innerHTML = loader();
  try {
    const d = await api({action:'getStudentTests', studentName:CURRENT_USER});
    const results = d.results || [];

    const weekly  = results.filter(r=>r.type==='weekly');
    const monthly = results.filter(r=>r.type==='monthly');

    if (!results.length) {
      el.innerHTML = `
      <div style="max-width:640px;margin:0 auto">
        <div class="shdr" style="margin-bottom:20px"><div><div class="stitle">📝 My Test Scores</div><div class="ssub">Weekly & monthly test results</div></div></div>
        <div style="text-align:center;padding:60px 20px;background:var(--card);border:1px solid var(--border);border-radius:16px">
          <div style="font-size:44px;margin-bottom:14px;opacity:.5">📝</div>
          <div style="font-size:15px;font-weight:600;margin-bottom:6px">No test scores yet</div>
          <div style="font-size:12px;color:var(--muted)">Your teacher will enter your scores after each test.<br>Check back after your next exam.</div>
        </div>
      </div>`;
      return;
    }

    // Summary stats
    const totalTests   = results.length;
    const avgPct       = results.filter(r=>r.obtained!==null).length
      ? (results.filter(r=>r.obtained!==null).reduce((a,r)=>a+(r.obtained/r.maxMarks)*100,0) / results.filter(r=>r.obtained!==null).length).toFixed(1)
      : '—';
    const bestScore    = results.filter(r=>r.obtained!==null).sort((a,b)=>(b.obtained/b.maxMarks)-(a.obtained/a.maxMarks))[0];
    const absentCount  = results.filter(r=>r.obtained===null).length;

    el.innerHTML = `
    <div style="max-width:720px;margin:0 auto">
      <div class="shdr" style="margin-bottom:20px"><div><div class="stitle">📝 My Test Scores</div><div class="ssub">${CURRENT_USER} · ${totalTests} tests</div></div></div>

      <!-- Summary KPIs -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px">
        ${[
          ['📊','Tests Taken',totalTests,'','cyan'],
          ['📈','Avg Score',avgPct+'%','across all tests','green'],
          ['🏆','Best Test',bestScore?bestScore.testName:'-',bestScore?bestScore.subject:'','gold'],
          ['⚠️','Absent',absentCount,'test(s)','purple'],
        ].map(([icon,label,val,sub,cls])=>kpi(icon,label,val,sub,cls,false)).join('')}
      </div>

      <!-- Weekly Tests -->
      ${weekly.length ? `
      <div class="shdr" style="margin-bottom:14px"><div><div class="stitle" style="font-size:16px">📅 Weekly Tests</div></div></div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:24px">
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--subtle)">
            <th style="padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Date</th>
            <th style="padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Test Name</th>
            <th style="padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Subject</th>
            <th style="padding:10px 14px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Marks</th>
            <th style="padding:10px 14px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">%</th>
            <th style="padding:10px 14px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">Grade</th>
          </tr></thead>
          <tbody>
            ${weekly.map(r=>{
              const pct = r.obtained!==null ? ((r.obtained/r.maxMarks)*100).toFixed(0) : null;
              const grade = getGrade(r.obtained, r.maxMarks);
              const barW  = pct!==null ? pct : 0;
              return `<tr style="border-top:1px solid rgba(30,45,69,.4)">
                <td style="padding:11px 14px;font-size:12px;color:var(--muted)">${r.date}</td>
                <td style="padding:11px 14px;font-weight:500">${r.testName}</td>
                <td style="padding:11px 14px;font-size:12px;color:var(--muted)">${r.subject}</td>
                <td style="padding:11px 14px;text-align:center">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${r.obtained===null?'var(--muted)':parseInt(pct)>=60?'var(--accent3)':'var(--danger)'}">${r.obtained===null?'Absent':r.obtained+' / '+r.maxMarks}</div>
                  ${pct!==null?`<div style="height:3px;background:var(--border);border-radius:2px;margin-top:4px;width:80px;margin-left:auto;margin-right:auto"><div style="height:100%;width:${barW}%;background:${parseInt(pct)>=60?'var(--accent3)':'var(--danger)'};border-radius:2px"></div></div>`:''}
                </td>
                <td style="padding:11px 14px;text-align:center;font-size:12px;color:var(--muted)">${pct!==null?pct+'%':'—'}</td>
                <td style="padding:11px 14px;text-align:center"><span class="grade-pill grade-${grade}">${grade}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </div>` : ''}

      <!-- Monthly Tests -->
      ${monthly.length ? `
      <div class="shdr" style="margin-bottom:14px"><div><div class="stitle" style="font-size:16px">🗓 Monthly Tests</div></div></div>
      <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:24px">
        ${monthly.map(r=>{
          const pct = r.obtained!==null ? ((r.obtained/r.maxMarks)*100).toFixed(1) : null;
          const grade = getGrade(r.obtained, r.maxMarks);
          return `
          <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px">
              <div>
                <div style="font-family:'DM Serif Display',serif;font-size:15px;margin-bottom:3px">${r.testName}</div>
                <div style="font-size:12px;color:var(--muted)">${r.subject} · ${r.date} · Class ${r.class}</div>
              </div>
              <span class="grade-pill grade-${grade}" style="font-size:14px;padding:5px 14px">${grade}</span>
            </div>
            ${pct!==null ? `
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:5px">
                <span>Score: <strong style="color:var(--text)">${r.obtained} / ${r.maxMarks}</strong></span>
                <span>${pct}%</span>
              </div>
              <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${parseFloat(pct)>=60?'var(--accent3)':'var(--danger)'};border-radius:4px;transition:width 1s ease"></div>
              </div>
            </div>` : `<div style="font-size:13px;color:var(--muted);font-style:italic">Absent</div>`}
          </div>`;
        }).join('')}
      </div>` : ''}
    </div>`;
  } catch(e) { el.innerHTML = errorBox(e.message); }
}

// ════════════════════════════════════════════════════════════════════
// PAY FEE ONLINE
// ════════════════════════════════════════════════════════════════════
function renderPaymentPage() {
  const el = document.getElementById('page-payment');
  el.innerHTML = `<div style="max-width:700px;margin:0 auto">${loader()}</div>`;
  loadPaymentPage();
}

async function loadPaymentPage() {
  const el = document.getElementById('page-payment');
  let student = null;
  try {
    const d = await api({action:'getStudentHistory', query:CURRENT_USER, mother:CURRENT_MOTHER});
    student = (d.students||[])[0] || null;
  } catch(e) {}

  const cls  = student ? student.class : '';
  const fee  = FEE_STRUCTURE[cls] || {};
  const paid = student || {admission:0,tuition:0,school:0,hostel:0};

  const dueAdm = Math.max(0,(fee.admission||0)-(paid.admission||0));
  const dueTui = Math.max(0,(fee.tuition||0)  -(paid.tuition||0));
  const dueSch = Math.max(0,(fee.school||0)   -(paid.school||0));
  const dueHos = student&&student.hasHostel ? Math.max(0,(fee.hostel||0)-(paid.hostel||0)) : 0;
  const totalDue = dueAdm+dueTui+dueSch+dueHos;

  const upiLink     = `upi://pay?pa=${SCHOOL_UPI_ID}&pn=${encodeURIComponent(SCHOOL_UPI_NAME)}&am=${totalDue}&cu=INR&tn=${encodeURIComponent('Fee: '+CURRENT_USER+' Cl.'+cls)}`;
  const phonepeLink = `phonepe://pay?pa=${SCHOOL_UPI_ID}&pn=${encodeURIComponent(SCHOOL_UPI_NAME)}&am=${totalDue}&cu=INR`;
  const gpayLink    = `tez://upi/pay?pa=${SCHOOL_UPI_ID}&pn=${encodeURIComponent(SCHOOL_UPI_NAME)}&am=${totalDue}&cu=INR`;

  el.innerHTML = `
  <div style="max-width:700px;margin:0 auto">
    <div class="shdr" style="margin-bottom:20px"><div><div class="stitle">💳 Pay Fee Online</div><div class="ssub">Pay via UPI · Session 2025-26</div></div></div>

    ${student ? `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px;margin-bottom:20px">
      <div class="form-section-title">📊 Fee Summary — ${student.name} · Class ${cls}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:18px">
        ${[['Admission',fee.admission||0,paid.admission||0,dueAdm,'#f59e0b'],
           ['Tuition',  fee.tuition||0,  paid.tuition||0,  dueTui,'#06b6d4'],
           ['School',   fee.school||0,   paid.school||0,   dueSch,'#10b981'],
           ...(student.hasHostel?[['Hostel',fee.hostel||0,paid.hostel||0,dueHos,'#8b5cf6']]:[])
          ].map(([label,tot,paidAmt,due,color])=>`
          <div style="background:var(--subtle);border-radius:12px;padding:14px">
            <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">${label}</div>
            <div style="font-size:11px;color:var(--muted)">Total: ₹${fmt(tot)}</div>
            <div style="font-size:11px;color:var(--accent3)">Paid: ₹${fmt(paidAmt)}</div>
            <div style="font-size:14px;font-weight:700;color:${due>0?'var(--danger)':'var(--accent3)'};margin-top:2px">${due>0?'Due: ₹'+fmt(due):'✓ Paid'}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;background:${totalDue>0?'rgba(239,68,68,.08)':'rgba(16,185,129,.08)'};border:1px solid ${totalDue>0?'rgba(239,68,68,.2)':'rgba(16,185,129,.2)'};border-radius:10px;padding:14px 18px">
        <span style="font-size:14px;font-weight:600">Total Fee Due</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:${totalDue>0?'var(--danger)':'var(--accent3)'}">
          ${totalDue>0?'₹'+fmt(totalDue):'✓ All Clear'}
        </span>
      </div>
    </div>` : ''}

    <!-- UPI Payment -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:26px;margin-bottom:20px;text-align:center">
      <div class="form-section-title" style="text-align:center;margin-bottom:20px">Scan & Pay via UPI</div>
      <div style="background:white;padding:16px;border-radius:12px;display:inline-block;margin-bottom:18px;box-shadow:0 4px 20px rgba(0,0,0,.3)">
        <img src="https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(upiLink)}&choe=UTF-8"
          alt="UPI QR Code" width="200" height="200" style="display:block;border-radius:4px"
          onerror="this.parentElement.innerHTML='<div style=\\'width:200px;height:200px;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border-radius:8px;font-size:12px;color:#6b7280;text-align:center;padding:20px\\'>QR code unavailable</div>'"/>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:6px">Scan with any UPI app — or tap below</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--accent2);margin-bottom:22px;padding:8px 16px;background:rgba(6,182,212,.08);border-radius:8px;display:inline-block">${SCHOOL_UPI_ID}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:18px">
        <a href="${phonepeLink}" style="text-decoration:none">
          <div style="background:#5f259f;color:white;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px">📱 PhonePe</div>
        </a>
        <a href="${gpayLink}" style="text-decoration:none">
          <div style="background:#1a73e8;color:white;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px">💙 Google Pay</div>
        </a>
        <a href="${upiLink}" style="text-decoration:none">
          <div style="background:var(--accent3);color:#000;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px">₹ Any UPI App</div>
        </a>
      </div>
      <div style="font-size:11px;color:var(--muted);line-height:1.8;max-width:420px;margin:0 auto;padding:12px;background:rgba(245,158,11,.05);border:1px solid rgba(245,158,11,.15);border-radius:8px">
        ⚠️ After payment, bring your <strong>transaction ID</strong> to the school office for receipt generation.
      </div>
    </div>

    <!-- Bank Details -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px">
      <div class="form-section-title">🏦 Bank Transfer Details</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
        ${[['Bank Name','Chhattisgarh Rajya Gramin Bank (CRGB)'],['Account Name','BN Convent Higher Secondary School'],['Account No.','XXXXXXXXXXXX'],['IFSC Code','CRGB0XXXXXX'],['Branch','Wadrafnagar, Balrampur'],['Contact','9826278578']].map(([l,v])=>`
        <div style="background:var(--subtle);border-radius:10px;padding:12px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px">${l}</div>
          <div style="font-size:13px;font-weight:600;color:var(--text)">${v}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════════
// NOTICES
// ════════════════════════════════════════════════════════════════════
const SCHOOL_NOTICES = [
  {id:1,type:'urgent',icon:'🔔',date:'2026-03-10',title:'Annual Exam Schedule Released',
   body:'Annual examinations will commence from 15th March 2026. All students must carry their admit cards. Exam hall opens at 9:00 AM. Students reaching after 9:30 AM will not be allowed.'},
  {id:2,type:'fee',icon:'💰',date:'2026-03-05',title:'Last Date for Fee Submission — 31st March',
   body:'All pending fees for session 2025-26 must be cleared by 31st March 2026. Students with outstanding dues will not receive mark sheets. Pay online or visit the school office.'},
  {id:3,type:'holiday',icon:'🎉',date:'2026-03-01',title:'Holi Holiday — 14th March 2026',
   body:'The school will remain closed on 14th March 2026 (Holi). Classes will resume on 16th March 2026. Students with pending practicals should contact their subject teacher.'},
  {id:4,type:'general',icon:'📚',date:'2026-02-20',title:'Admit Cards for Class 10 & 12 CGBSE Exam',
   body:'CGBSE board exam admit cards are available at the school office. Parents must collect them with ID proof. Last date to collect: 10th March 2026.'},
  {id:5,type:'general',icon:'🏅',date:'2026-02-15',title:'Annual Sports Day — 20th March 2026',
   body:'Annual Sports Day will be held on 20th March 2026 at 10:00 AM on the school ground. Parents are invited. Students participating must submit event forms by 15th March.'},
  {id:6,type:'general',icon:'📝',date:'2026-01-10',title:'Admissions Open for Session 2026-27',
   body:'Admissions for session 2026-27 are now open for Nursery to Class 12. Admission forms available at school office from 9 AM – 2 PM on all working days. Limited seats.'},
];
const NOTICE_COLORS = {
  urgent:  {bg:'rgba(239,68,68,.08)', border:'rgba(239,68,68,.2)', badge:'var(--danger)',  label:'Urgent'},
  fee:     {bg:'rgba(245,158,11,.08)',border:'rgba(245,158,11,.2)',badge:'var(--accent)',  label:'Fee'},
  holiday: {bg:'rgba(16,185,129,.08)',border:'rgba(16,185,129,.2)',badge:'var(--accent3)', label:'Holiday'},
  general: {bg:'rgba(6,182,212,.06)', border:'rgba(6,182,212,.18)',badge:'var(--accent2)', label:'General'},
};

function renderNoticesPage() {
  const el = document.getElementById('page-notices');
  el.innerHTML = `
  <div style="max-width:700px;margin:0 auto">
    <div class="shdr" style="margin-bottom:20px">
      <div><div class="stitle">📢 School Notices</div><div class="ssub">Latest announcements — Session 2025-26</div></div>
      <div style="font-size:11px;color:var(--muted);background:var(--subtle);padding:5px 12px;border-radius:20px">${SCHOOL_NOTICES.length} notices</div>
    </div>
    ${SCHOOL_NOTICES.map(n=>{
      const col=NOTICE_COLORS[n.type]||NOTICE_COLORS.general;
      const dateStr=new Date(n.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
      return `
      <div style="background:${col.bg};border:1px solid ${col.border};border-radius:14px;padding:20px;margin-bottom:14px;transition:transform .2s" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
        <div style="display:flex;align-items:flex-start;gap:14px">
          <div style="font-size:26px;flex-shrink:0;margin-top:2px">${n.icon}</div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
              <span style="font-size:15px;font-weight:700;color:var(--text);font-family:'DM Serif Display',serif">${n.title}</span>
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;padding:2px 8px;border-radius:4px;background:${col.border};color:${col.badge}">${col.label}</span>
            </div>
            <div style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:10px">${n.body}</div>
            <div style="font-size:11px;color:var(--muted)">📅 ${dateStr}</div>
          </div>
        </div>
      </div>`;
    }).join('')}
    <div style="text-align:center;padding:20px;font-size:12px;color:var(--muted)">
      For more info contact school office: <strong style="color:var(--text)">9826278578</strong>
    </div>
  </div>`;
}
// ================================================================
// app-admin.js  —  All admin panel pages
// Dashboard · Students · Hostel · Siblings · Fee Register
// Admit · Collect Fee · Expenses & Bank · Test Scores (admin)
// ================================================================

const FCLRS = {'Hostel Fee':'var(--hostel)','Admission Fee':'var(--accent)','School Fee':'var(--accent3)','Tuition Fee':'var(--accent2)'};
let allClasses = [];

// ════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════
async function loadDashboard() {
  const el = document.getElementById('page-dashboard');
  el.innerHTML = loader();
  try {
    const d = await api({action:'getDashboard',token:SESSION_TOKEN});
    renderDashboard(d);
  } catch(e) { el.innerHTML = errorBox(e.message); }
}

function renderDashboard(d) {
  const s=d.summary, ft=d.feeTotals, mo=d.monthly;
  const total=s.totalCollected;
  document.getElementById('page-dashboard').innerHTML = `
  <div class="kpi-grid">
    ${kpi('👥','Total Students',s.totalStudents,'Enrolled 2025-26','cyan',false)}
    ${kpi('💰','Total Collected','₹'+fmt(total),'All fee types','gold',true)}
    ${kpi('🏠','Hostel Students',s.hostelStudents,'With hostel fee','purple',false)}
    ${kpi('🛏️','Hostel Revenue','₹'+fmt(s.hostelCollected),'Session total','purple',true)}
    ${kpi('📚','School Fee','₹'+fmt(s.schoolCollected),'Session total','green',true)}
    ${kpi('📝','Admission Fee','₹'+fmt(s.admissionCollected),'New admissions','cyan',true)}
  </div>
  <div class="charts-grid">
    <div class="chart-card">
      <div class="chart-title"><span class="dot" style="background:var(--accent)"></span>Monthly Collection</div>
      <div class="chart-wrap"><canvas id="chart-monthly"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-title"><span class="dot" style="background:var(--accent2)"></span>Fee Breakdown</div>
      <div class="chart-wrap"><canvas id="chart-donut"></canvas></div>
    </div>
  </div>
  <div class="fee-bars">
    ${Object.entries(ft).map(([k,v])=>`
    <div class="fee-bar-item">
      <div class="fee-bar-header"><span class="fee-bar-label">${k}</span><span class="fee-bar-amount">₹${fmt(v)}</span></div>
      <div class="fee-bar-track"><div class="fee-bar-fill" style="width:${(v/total*100).toFixed(1)}%;background:${feeColor(k)}"></div></div>
      <div style="font-size:11px;color:var(--muted);margin-top:5px">${(v/total*100).toFixed(1)}% of total</div>
    </div>`).join('')}
  </div>`;
  // Monthly bar chart
  const months=Object.keys(mo),vals=Object.values(mo);
  const ctx1=document.getElementById('chart-monthly').getContext('2d');
  if(chartMonthly) chartMonthly.destroy();
  chartMonthly=new Chart(ctx1,{type:'bar',data:{
    labels:months.map(m=>{const[y,m2]=m.split('-');return ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m2]+"'"+(y.slice(2));}),
    datasets:[{data:vals,backgroundColor:vals.map((_,i)=>`hsl(${200+i*14},65%,55%)`),borderRadius:6,borderSkipped:false}]
  },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>'₹'+fmt(c.parsed.y)}}},
    scales:{x:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:'#64748b',font:{size:10}}},
            y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#64748b',font:{size:10},callback:v=>'₹'+fmt(v)}}}}});
  // Donut
  const ctx2=document.getElementById('chart-donut').getContext('2d');
  if(chartDonut) chartDonut.destroy();
  chartDonut=new Chart(ctx2,{type:'doughnut',data:{
    labels:Object.keys(ft),
    datasets:[{data:Object.values(ft),backgroundColor:['#f59e0b','#06b6d4','#10b981','#8b5cf6'],borderWidth:0,hoverOffset:6}]
  },options:{responsive:true,maintainAspectRatio:false,cutout:'64%',
    plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:11},padding:12}},
             tooltip:{callbacks:{label:c=>c.label+': ₹'+fmt(c.raw)}}}}});
}

// ════════════════════════════════════════════════════════════════════
// STUDENTS — search-first approach with rich detail drawer
// ════════════════════════════════════════════════════════════════════
let _stuDetailOpen = false;

async function loadStudentsPage() {
  const el = document.getElementById('page-students');
  el.innerHTML = `
  <div class="shdr" style="margin-bottom:18px">
    <div><div class="stitle">👥 Students</div><div class="ssub">Search by name, father, class or mother</div></div>
  </div>

  <!-- Search Bar -->
  <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:18px">
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
      <div style="flex:2;min-width:200px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Student / Father / Mother Name</div>
        <input class="search-box" id="stu-search" placeholder="Type to search…" oninput="debounce(runStudentSearch,350)()" style="width:100%"/>
      </div>
      <div style="flex:1;min-width:130px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Class</div>
        <select class="filter-select" id="stu-class" onchange="stuPage=0;runStudentSearch()" style="width:100%">
          <option value="">All Classes</option>
          ${['Nursery','LKG','UKG','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(c=>`<option>${c}</option>`).join('')}
        </select>
      </div>
      <button class="hostel-toggle" id="hostel-tog" onclick="toggleHostel()" style="height:38px">🏠 Hostel Only</button>
      <button onclick="openAdmitFromStudents()" style="height:38px;padding:0 16px;background:var(--accent3);border:none;border-radius:9px;color:#000;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit">➕ Admit New</button>
    </div>
  </div>

  <!-- Results grid -->
  <div id="stu-grid-wrap">
    <div class="loader"><div class="spinner"></div>Loading students…</div>
  </div>

  <!-- Detail side-panel -->
  <div id="stu-detail-panel" style="display:none;position:fixed;top:0;right:0;bottom:0;width:440px;max-width:100vw;background:var(--surface);border-left:1px solid var(--border);z-index:200;overflow-y:auto;box-shadow:-8px 0 32px rgba(0,0,0,.4);animation:slideInR .25s ease">
    <div id="stu-detail-body"></div>
  </div>
  <div id="stu-overlay" onclick="closeStudentDetail()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:199"></div>`;

  runStudentSearch();
}

async function runStudentSearch() {
  const search = document.getElementById('stu-search')?.value || '';
  const cls    = document.getElementById('stu-class')?.value  || '';
  const wrap   = document.getElementById('stu-grid-wrap');
  if (!wrap) return;
  wrap.innerHTML = loader();
  try {
    const d = await api({action:'getStudents',token:SESSION_TOKEN,search,cls,hostelOnly:hostelOnly?'true':'false'});
    stuData = d.students || [];
    renderStudentGrid(stuData, wrap);
  } catch(e) { wrap.innerHTML = errorBox(e.message); }
}

function renderStudentGrid(students, wrap) {
  const count = students.length;
  if (!count) {
    wrap.innerHTML = `<div class="empty" style="padding:60px;text-align:center"><div style="font-size:40px;margin-bottom:10px">🔍</div><div>No students found. Try a different search.</div></div>`;
    return;
  }
  wrap.innerHTML = `
  <div style="font-size:12px;color:var(--muted);margin-bottom:12px">${count} student${count!==1?'s':''} found · Click any card to see full details</div>
  <div id="stu-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
    ${students.map(s=>`
    <div onclick="openStudentDetail('${s.name.replace(/'/g,"\\'")}','${(s.father||'').replace(/'/g,"\\'")}','${(s.mother||'').replace(/'/g,"\\'")}')"
      style="background:var(--card);border:1px solid var(--border);border-radius:13px;padding:16px;cursor:pointer;transition:all .2s"
      onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='var(--accent2)'"
      onmouseout="this.style.transform='';this.style.borderColor='var(--border)'">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div style="display:flex;gap:10px;align-items:center">
          <div style="width:38px;height:38px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:14px;color:#000;font-weight:bold;flex-shrink:0">
            ${s.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
          </div>
          <div>
            <div style="font-weight:600;font-size:13px;color:var(--text)">${s.name}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:1px">${s.father||'—'}</div>
          </div>
        </div>
        <span class="cbadge">${s.class}</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${s.total>0?`<span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent3);background:rgba(16,185,129,.08);padding:2px 7px;border-radius:4px">₹${fmt(s.total)} paid</span>`:''}
        ${s.hasHostel?`<span style="font-size:11px;color:var(--hostel);background:rgba(139,92,246,.08);padding:2px 7px;border-radius:4px">🏠 Hostel</span>`:''}
        ${s.mobile?`<span style="font-size:11px;color:var(--muted);background:var(--subtle);padding:2px 7px;border-radius:4px">📱 ${s.mobile}</span>`:''}
      </div>
    </div>`).join('')}
  </div>`;
}

async function openStudentDetail(name) {
  document.getElementById('stu-detail-panel').style.display = 'block';
  document.getElementById('stu-overlay').style.display = 'block';
  const body = document.getElementById('stu-detail-body');
  body.innerHTML = `<div style="padding:24px">${loader()}</div>`;
  try {
    const d = await api({action:'getStudentDetail',token:SESSION_TOKEN,name});
    const s = d.student;
    if (!s) { body.innerHTML=`<div style="padding:24px">${errorBox('Student not found')}</div>`; return; }
    const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const feeTypes = ['admission','tuition','school','hostel','stationary','other'];
    const feeLabels = {'admission':'Admission','tuition':'Tuition','school':'School','hostel':'Hostel','stationary':'Stationary','other':'Other'};
    body.innerHTML = `
    <div style="padding:22px">
      <!-- Close -->
      <button onclick="closeStudentDetail()" style="position:absolute;top:14px;right:14px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:13px;padding:4px 10px;cursor:pointer">✕ Close</button>

      <!-- Profile -->
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:20px">
        <div style="width:52px;height:52px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:14px;display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:20px;color:#000;flex-shrink:0">${initials}</div>
        <div>
          <div style="font-family:'DM Serif Display',serif;font-size:18px">${s.name}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:3px">
            Class ${s.class} ${s.hasHostel?'· 🏠 Hostel':''}
          </div>
        </div>
      </div>

      <!-- Info grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
        ${[['👨 Father',s.father||'—'],['👩 Mother',s.mother||'—'],['📱 Mobile',s.mobile||'—'],['🏫 Class',s.class]].map(([l,v])=>`
        <div style="background:var(--subtle);border-radius:10px;padding:11px">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">${l}</div>
          <div style="font-size:13px;font-weight:600;color:var(--text)">${v}</div>
        </div>`).join('')}
      </div>

      <!-- Fee Summary -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">💰 Fee Paid</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
        ${feeTypes.filter(k=>s[k]>0).map(k=>`
        <div style="padding:8px 14px;border-radius:9px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.18)">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">${feeLabels[k]}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--accent3)">₹${fmt(s[k])}</div>
        </div>`).join('')}
        <div style="padding:8px 14px;border-radius:9px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.18)">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Total</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;color:var(--accent)">₹${fmt(s.total)}</div>
        </div>
      </div>

      <!-- Siblings -->
      ${s.siblings && s.siblings.length > 0 ? `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">👨‍👧‍👦 Siblings</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
        ${s.siblings.map(x=>`
        <div onclick="closeStudentDetail();setTimeout(()=>openStudentDetail('${x.name.replace(/'/g,"\\'")}'),200)" style="padding:8px 14px;border-radius:9px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.18);cursor:pointer">
          <div style="font-size:12px;font-weight:600;color:var(--accent2)">${x.name}</div>
          <div style="font-size:10px;color:var(--muted)">Class ${x.class} · ₹${fmt(x.total||0)}</div>
        </div>`).join('')}
      </div>` : ''}

      <!-- Receipt History -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">🧾 Receipt History</div>
      <div style="display:flex;flex-direction:column;gap:0">
        ${(s.receipts||[]).length===0
          ? '<div class="empty" style="padding:20px;text-align:center">No receipts found</div>'
          : (s.receipts||[]).map(r=>`
          <div style="padding:11px 2px;border-bottom:1px solid rgba(30,45,69,.4);display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:11px;color:var(--muted)">Receipt #${r.receiptNo} · ${r.payMode}</div>
              <div style="font-size:13px;font-weight:500;color:var(--text)">${r.feeType}</div>
              <div style="font-size:11px;color:var(--muted)">${r.date}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--accent3);font-weight:700">₹${fmt(r.amount)}</span>
              <button onclick="printReceipt(${JSON.stringify(r).replace(/"/g,'&quot;')},${JSON.stringify(s).replace(/"/g,'&quot;')})" style="padding:4px 9px;background:rgba(6,182,212,.15);border:1px solid rgba(6,182,212,.3);border-radius:6px;color:var(--accent2);font-size:11px;cursor:pointer;font-family:inherit">🖨</button>
            </div>
          </div>`).join('')}
      </div>

      <!-- Actions -->
      <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
        <button onclick="showPage('feepay');setTimeout(()=>{const el=document.getElementById('ff-name');if(el){el.value='${s.name.replace(/'/g,"\\'")}';selectStudentByName('${s.name.replace(/'/g,"\\'")}');}},400);closeStudentDetail()" style="flex:1;padding:10px;background:var(--accent3);border:none;border-radius:10px;color:#000;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit">💳 Collect Fee</button>
        <button onclick="closeStudentDetail()" style="padding:10px 16px;background:var(--subtle);border:1px solid var(--border);border-radius:10px;color:var(--muted);font-size:12px;cursor:pointer;font-family:inherit">Close</button>
      </div>
    </div>`;
  } catch(e) { body.innerHTML=`<div style="padding:24px">${errorBox(e.message)}</div>`; }
}

function closeStudentDetail() {
  document.getElementById('stu-detail-panel').style.display='none';
  document.getElementById('stu-overlay').style.display='none';
}
function toggleHostel(){hostelOnly=!hostelOnly;stuPage=0;document.getElementById('hostel-tog')?.classList.toggle('active',hostelOnly);runStudentSearch();}
function openAdmitFromStudents(){showPage('admit');}

// ════════════════════════════════════════════════════════════════════
// HOSTEL
// ════════════════════════════════════════════════════════════════════
async function loadHostel() {
  const el=document.getElementById('page-hostel');
  el.innerHTML=loader();
  try {
    const d=await api({action:'getHostelStudents',token:SESSION_TOKEN});
    const ss=d.students||[];
    const totalH=ss.reduce((a,s)=>a+s.hostel,0);
    const avg=ss.length?totalH/ss.length:0;
    const clsDist={};
    ss.forEach(s=>{clsDist[s.class]=(clsDist[s.class]||0)+1;});
    const topCls=Object.entries(clsDist).sort((a,b)=>b[1]-a[1])[0];
    el.innerHTML=`
    <div class="hostel-stats">
      <div class="hstat"><div class="val">${ss.length}</div><div class="lbl">Total Hostel</div></div>
      <div class="hstat"><div class="val">₹${fmt(totalH)}</div><div class="lbl">Total Collected</div></div>
      <div class="hstat"><div class="val">₹${fmt(Math.round(avg))}</div><div class="lbl">Avg per Student</div></div>
      <div class="hstat"><div class="val">${topCls?topCls[0]:'—'}</div><div class="lbl">Top Class</div></div>
    </div>
    <div class="shdr"><div><div class="stitle">Hostel Students</div><div class="ssub">${ss.length} students</div></div></div>
    <div class="table-wrap"><div style="overflow-x:auto"><table>
      <thead><tr><th>#</th><th>Student</th><th>Father</th><th>Class</th><th>Hostel Fee</th><th>School Fee</th><th>Total</th><th>Mode</th></tr></thead>
      <tbody>${ss.map((s,i)=>`<tr>
        <td style="color:var(--muted);font-size:11px">${i+1}</td>
        <td style="font-weight:500">${s.name}</td>
        <td style="color:var(--muted)">${s.father}</td>
        <td><span class="cbadge">${s.class}</span></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--hostel);font-weight:700">₹${fmt(s.hostel)}</td>
        <td class="${s.school>0?'ac':'zc'}">${s.school>0?'₹'+fmt(s.school):'—'}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--accent)">₹${fmt(s.total)}</td>
        <td style="font-size:11px;color:var(--muted)">${s.payModes||'Cash'}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  } catch(e){el.innerHTML=errorBox(e.message);}
}

// ════════════════════════════════════════════════════════════════════
// FAMILIES / SIBLINGS — full details like a sheet
// ════════════════════════════════════════════════════════════════════
async function loadSiblings() {
  const el=document.getElementById('page-siblings');
  el.innerHTML=loader();
  try {
    const d=await api({action:'getSiblings',token:SESSION_TOKEN});
    const families=d.families||[];
    const totalFamilies=families.length;
    const totalChildren=families.reduce((a,f)=>a+f.count,0);
    el.innerHTML=`
    <div class="shdr" style="margin-bottom:20px">
      <div><div class="stitle">👨‍👧‍👦 Family Groups</div><div class="ssub">${totalFamilies} families · ${totalChildren} students · grouped by same father + mother</div></div>
      <div style="font-size:11px;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.2);padding:5px 12px;border-radius:20px;color:var(--accent2)">
        ₹${fmt(families.reduce((a,f)=>a+f.familyTotal,0))} family total
      </div>
    </div>
    <!-- Summary table header -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:20px">
      <div style="padding:12px 18px;background:var(--subtle);display:grid;grid-template-columns:2fr 2fr 1fr 1fr 1fr;gap:10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">
        <span>Father</span><span>Mother</span><span>Children</span><span>Mobile</span><span>Family Total</span>
      </div>
      ${families.map(f=>`
      <details style="border-bottom:1px solid rgba(30,45,69,.5)" onmouseout="">
        <summary style="padding:13px 18px;display:grid;grid-template-columns:2fr 2fr 1fr 1fr 1fr;gap:10px;cursor:pointer;list-style:none;align-items:center" onmouseover="this.parentElement.style.background='rgba(255,255,255,.02)'" onmouseout="this.parentElement.style.background=''">
          <span style="font-weight:600;font-size:13px;color:var(--text)">${f.father}</span>
          <span style="font-size:13px;color:var(--muted)">${f.mother||'—'}</span>
          <span><span style="background:rgba(6,182,212,.12);color:var(--accent2);padding:2px 8px;border-radius:5px;font-size:11px;font-weight:700">${f.count}</span></span>
          <span style="font-size:12px;color:var(--muted)">${f.mobile||'—'}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--accent)">₹${fmt(f.familyTotal)}</span>
        </summary>
        <!-- Children detail rows -->
        <div style="padding:0 18px 14px">
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
            <thead><tr style="background:var(--subtle)">
              <th style="padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Student</th>
              <th style="padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Class</th>
              <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Admission</th>
              <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">School</th>
              <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Hostel</th>
              <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Total</th>
              <th style="padding:7px 10px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)">Detail</th>
            </tr></thead>
            <tbody>
              ${f.children.map(c=>`<tr style="border-top:1px solid rgba(30,45,69,.4)">
                <td style="padding:8px 10px;font-weight:500;color:var(--text)">${c.name}${c.hasHostel?` <span style="font-size:10px;color:var(--hostel)">🏠</span>`:''}</td>
                <td style="padding:8px 10px"><span class="cbadge">${c.class}</span></td>
                <td style="padding:8px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px" class="${(c.admission||0)>0?'ac':'zc'}">${(c.admission||0)>0?'₹'+fmt(c.admission||0):'—'}</td>
                <td style="padding:8px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px" class="${(c.school||0)>0?'ac':'zc'}">${(c.school||0)>0?'₹'+fmt(c.school||0):'—'}</td>
                <td style="padding:8px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px;color:${(c.hostel||0)>0?'var(--hostel)':'var(--muted)'}">${(c.hostel||0)>0?'₹'+fmt(c.hostel||0):'—'}</td>
                <td style="padding:8px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--accent)">₹${fmt(c.total||0)}</td>
                <td style="padding:8px 10px;text-align:center"><button onclick="openStudentDetail('${c.name.replace(/'/g,"\\'")}');document.querySelector('details[open]')?.removeAttribute('open')" style="padding:3px 9px;background:rgba(6,182,212,.12);border:1px solid rgba(6,182,212,.25);border-radius:6px;color:var(--accent2);font-size:10px;cursor:pointer;font-family:inherit">View</button></td>
              </tr>`).join('')}
              <tr style="border-top:2px solid rgba(245,158,11,.3);background:rgba(245,158,11,.04)">
                <td colspan="5" style="padding:9px 10px;font-size:12px;font-weight:700;color:var(--accent)">Family Total</td>
                <td style="padding:9px 10px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--accent)">₹${fmt(f.familyTotal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>`).join('')}
    </div>`;
  } catch(e){el.innerHTML=errorBox(e.message);}
}

// ════════════════════════════════════════════════════════════════════
// FEE REGISTER
// ════════════════════════════════════════════════════════════════════
function renderRegisterPage() {
  document.getElementById('page-register').innerHTML=`
  <div class="table-wrap">
    <div class="table-toolbar">
      <input class="search-box" id="reg-search" placeholder="Search by name or receipt #…" oninput="debounce(loadRegister,400)()"/>
      <select class="filter-select" id="reg-feetype" onchange="regPage=0;loadRegister()">
        <option value="">All Fee Types</option>
        <option>Admission Fee</option><option>Tuition Fee</option><option>School Fee</option>
        <option>Hostel Fee</option><option>Stationary Charge</option><option>Other</option>
      </select>
      <span class="tcount" id="reg-count"></span>
    </div>
    <div style="overflow-x:auto"><table>
      <thead><tr><th>Receipt</th><th>Date</th><th>Student</th><th>Father</th><th>Class</th><th>Fee Type</th><th>Amount</th><th>Mode</th><th>Received By</th></tr></thead>
      <tbody id="reg-tbody"></tbody>
    </table></div>
    <div class="pager">
      <span id="reg-pinfo"></span>
      <div class="pager-btns">
        <button class="pbtn" onclick="regPage--;loadRegister()" id="reg-prev">← Prev</button>
        <button class="pbtn" onclick="regPage++;loadRegister()" id="reg-next">Next →</button>
      </div>
    </div>
  </div>`;
}
async function loadRegister(){
  if(!document.getElementById('reg-tbody')) renderRegisterPage();
  const search=document.getElementById('reg-search')?.value||'';
  const feeType=document.getElementById('reg-feetype')?.value||'';
  try{
    const d=await api({action:'getFeeRegister',token:SESSION_TOKEN,search,feeType,page:regPage});
    const recs=d.records||[],tot=d.total||recs.length;
    const start=regPage*PAGE_SZ;
    document.getElementById('reg-count').textContent=tot+' record(s)';
    document.getElementById('reg-pinfo').textContent=`${start+1}–${Math.min(start+PAGE_SZ,tot)} of ${tot}`;
    document.getElementById('reg-prev').disabled=regPage===0;
    document.getElementById('reg-next').disabled=start+PAGE_SZ>=tot;
    const fld=r=>r.fee_type||r.feeType||'';
    document.getElementById('reg-tbody').innerHTML=recs.map(r=>`<tr>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted)">#${r.rno||r.receiptNo}</td>
      <td style="font-size:12px;color:var(--muted)">${r.date}</td>
      <td style="font-weight:500">${r.name||r.studentName}</td>
      <td style="color:var(--muted);font-size:12px">${r.father||r.fatherName||'—'}</td>
      <td><span class="cbadge">${r.class}</span></td>
      <td><span style="font-size:12px;color:${FCLRS[fld(r)]||'var(--text)'}">${fld(r)}</span></td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent3);font-weight:600">₹${fmt(r.amount||0)}</td>
      <td style="font-size:11px;color:var(--muted)">${r.pay_mode||r.payMode||''}</td>
      <td style="font-size:11px;color:var(--muted)">${r.recv_by||r.receivedBy||''}</td>
    </tr>`).join('');
  } catch(e){document.getElementById('page-register').innerHTML=errorBox(e.message);}
}

// ════════════════════════════════════════════════════════════════════
// ADMIT STUDENT
// ════════════════════════════════════════════════════════════════════
function loadAdmitPage(){
  document.getElementById('page-admit').innerHTML=`
  <div style="max-width:680px;margin:0 auto">
    <div class="shdr" style="margin-bottom:20px"><div><div class="stitle">➕ Admit New Student</div><div class="ssub">Register into Student Master</div></div></div>
    <div class="form-card" id="admit-card">
      <div class="form-section-title">👤 Student Information</div>
      <div class="form-grid">
        <div class="fg"><label class="fl">Student Full Name <span class="req">*</span></label><input class="fi" id="ad-name" type="text"/></div>
        <div class="fg"><label class="fl">Father's Name <span class="req">*</span></label><input class="fi" id="ad-father" type="text"/></div>
        <div class="fg"><label class="fl">Mother's Name</label><input class="fi" id="ad-mother" type="text"/></div>
        <div class="fg"><label class="fl">Class <span class="req">*</span></label>
          <select class="fi" id="ad-class"><option value="">Select</option>
            ${['Nursery','LKG','UKG','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(c=>`<option>${c}</option>`).join('')}
          </select></div>
        <div class="fg"><label class="fl">Date of Birth</label><input class="fi" id="ad-dob" type="date"/></div>
        <div class="fg"><label class="fl">Gender</label>
          <select class="fi" id="ad-gender"><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
        <div class="fg"><label class="fl">Mobile No.</label><input class="fi" id="ad-mobile" type="tel"/></div>
        <div class="fg"><label class="fl">Admission Date <span class="req">*</span></label><input class="fi" id="ad-date" type="date"/></div>
      </div>
      <div class="form-section-title" style="margin-top:20px">🏠 Hostel & Address</div>
      <div class="form-grid">
        <div class="fg"><label class="fl">Hostel</label>
          <select class="fi" id="ad-hostel"><option value="No">No (Day Scholar)</option><option value="Yes">Yes (Hosteller)</option></select></div>
        <div class="fg"><label class="fl">Village / Address</label><input class="fi" id="ad-address" type="text"/></div>
        <div class="fg" style="grid-column:1/-1"><label class="fl">Notes / Remarks</label><input class="fi" id="ad-notes" type="text"/></div>
      </div>
      <div id="admit-msg" style="display:none;margin-top:16px"></div>
      <div style="display:flex;gap:12px;margin-top:24px">
        <button class="form-btn primary" onclick="submitAdmit()">✅ Register Student</button>
        <button class="form-btn secondary" onclick="clearAdmit()">🗑 Clear</button>
      </div>
    </div>
  </div>`;
  document.getElementById('ad-date').value=new Date().toISOString().slice(0,10);
}
async function submitAdmit(){
  const name=document.getElementById('ad-name').value.trim();
  const father=document.getElementById('ad-father').value.trim();
  const cls=document.getElementById('ad-class').value;
  const date=document.getElementById('ad-date').value;
  if(!name){showFormMsg('admit-msg','error','Please enter Student Name');return;}
  if(!father){showFormMsg('admit-msg','error','Please enter Father\'s Name');return;}
  if(!cls){showFormMsg('admit-msg','error','Please select Class');return;}
  if(!date){showFormMsg('admit-msg','error','Please select Admission Date');return;}
  const btn=document.querySelector('#admit-card .form-btn.primary');
  btn.disabled=true;btn.textContent='Registering…';
  try{
    const d=await api({action:'addStudent',token:SESSION_TOKEN,studentName:name,fatherName:father,
      motherName:document.getElementById('ad-mother').value.trim(),
      class:cls,dob:document.getElementById('ad-dob').value,
      gender:document.getElementById('ad-gender').value,
      mobile:document.getElementById('ad-mobile').value.trim(),
      admissionDate:date,hostel:document.getElementById('ad-hostel').value,
      address:document.getElementById('ad-address').value.trim(),
      notes:document.getElementById('ad-notes').value.trim()});
    if(d.success){showFormMsg('admit-msg','success','✅ '+name+' registered successfully!');clearAdmit();}
    else showFormMsg('admit-msg','error','❌ '+(d.error||'Failed'));
  }catch(e){showFormMsg('admit-msg','error','❌ '+e.message);}
  btn.disabled=false;btn.textContent='✅ Register Student';
}
function clearAdmit(){
  ['ad-name','ad-father','ad-mother','ad-mobile','ad-address','ad-notes'].forEach(id=>document.getElementById(id).value='');
  ['ad-class','ad-gender'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ad-hostel').value='No';
  document.getElementById('ad-date').value=new Date().toISOString().slice(0,10);
  document.getElementById('ad-dob').value='';
}

// ════════════════════════════════════════════════════════════════════
// COLLECT FEE
// ════════════════════════════════════════════════════════════════════
let feeFormReceipt={data:null};

async function loadFeePayPage(){
  const today=new Date().toISOString().slice(0,10);
  document.getElementById('page-feepay').innerHTML=`
  <div style="max-width:740px;margin:0 auto">
    <div class="shdr" style="margin-bottom:20px"><div><div class="stitle">💳 Collect Fee</div><div class="ssub">Generate printable receipt</div></div></div>
    <div class="form-card" id="fee-form-card">
      <div class="form-section-title">🧾 Receipt Details</div>
      <div class="form-grid">
        <div class="fg"><label class="fl">Receipt No. <span class="req">*</span></label>
          <div style="position:relative">
            <input class="fi" id="ff-rno" type="number" value="" placeholder="Fetching…" readonly style="padding-right:70px;background:rgba(148,163,184,.12);cursor:not-allowed" onblur="checkReceiptNoDuplicate(this.value)"/>
            <span id="rno-badge" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:10px;padding:2px 7px;border-radius:4px;background:rgba(245,158,11,.15);color:var(--accent);font-weight:700;pointer-events:none">LOADING</span>
          </div>
          <div id="rno-warn" style="display:none;font-size:11px;margin-top:4px;color:#fca5a5"></div>
        </div>
        <div class="fg"><label class="fl">Date <span class="req">*</span></label><input class="fi" id="ff-date" type="date" value="${today}"/></div>
      </div>
      <div class="form-section-title" style="margin-top:20px">👤 Student Details</div>
      <div class="form-grid">
        <div class="fg" style="position:relative">
          <label class="fl">Student Name <span class="req">*</span></label>
          <input class="fi" id="ff-name" type="text" placeholder="Type name to search…" oninput="suggestStudents(this.value)" autocomplete="off"/>
          <div id="ff-suggest"></div>
        </div>
        <div class="fg"><label class="fl">Father's Name</label><input class="fi" id="ff-father" type="text" placeholder="Auto-filled"/></div>
        <div class="fg"><label class="fl">Class</label>
          <select class="fi" id="ff-class"><option value="">Select</option>
            ${['Nursery','LKG','UKG','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(c=>`<option>${c}</option>`).join('')}
          </select></div>
        <div class="fg"><label class="fl">Mobile No.</label><input class="fi" id="ff-mobile" type="tel"/></div>
      </div>
      <div class="form-section-title" style="margin-top:20px">💰 Fee Amounts</div>
      <div class="form-grid">
        <div class="fg"><label class="fl">Admission Fee (₹)</label><input class="fi" id="ff-admission" type="number" min="0" placeholder="0" oninput="updateFeeTotal()"/></div>
        <div class="fg"><label class="fl">Tuition Fee (₹)</label><input class="fi" id="ff-tuition" type="number" min="0" placeholder="0" oninput="updateFeeTotal()"/></div>
        <div class="fg"><label class="fl">School Fee (₹)</label><input class="fi" id="ff-school" type="number" min="0" placeholder="0" oninput="updateFeeTotal()"/></div>
        <div class="fg"><label class="fl">Hostel Fee (₹)</label><input class="fi" id="ff-hostel" type="number" min="0" placeholder="0" oninput="updateFeeTotal()"/></div>
        <div class="fg"><label class="fl">Stationary (₹)</label><input class="fi" id="ff-stationary" type="number" min="0" placeholder="0" oninput="updateFeeTotal()"/></div>
        <div class="fg"><label class="fl">Other (₹)</label><input class="fi" id="ff-other" type="number" min="0" placeholder="0" oninput="updateFeeTotal()"/></div>
      </div>
      <div class="fee-total-bar"><span>Total Amount</span><span id="ff-total" style="font-family:'JetBrains Mono',monospace;font-size:20px;color:var(--accent)">₹0</span></div>
      <div class="form-grid" style="margin-top:16px">
        <div class="fg"><label class="fl">Payment Mode <span class="req">*</span></label>
          <select class="fi" id="ff-paymode"><option>Cash</option><option>PhonePe</option><option>A/C Transfer</option><option>CRGB</option><option>SBI Transfer</option><option>Other</option></select></div>
        <div class="fg"><label class="fl">Received By <span class="req">*</span></label>
          <select class="fi" id="ff-recvby"><option>Parmeshwar</option><option>Chandrasen Yadav</option><option>Roshni</option><option>Pathak Sir</option><option>Abhay Murum</option><option>Other</option></select></div>
        <div class="fg" style="grid-column:1/-1"><label class="fl">Amount in Words</label><input class="fi" id="ff-inwords" type="text" placeholder="e.g. Five Thousand Rupees Only"/></div>
        <div class="fg" style="grid-column:1/-1"><label class="fl">Remarks</label><input class="fi" id="ff-remarks" type="text"/></div>
      </div>
      <div id="feepay-msg" style="display:none;margin-top:14px"></div>
      <div style="display:flex;gap:12px;margin-top:22px;flex-wrap:wrap">
        <button class="form-btn primary" onclick="submitFeeEntry()">💾 Save & Generate Receipt</button>
        <button class="form-btn blue" id="ff-print-btn" onclick="printFeeReceipt()" style="display:none">🖨 Print Receipt</button>
        <button class="form-btn secondary" onclick="clearFeeForm()">🗑 Clear</button>
      </div>
    </div>
  </div>`;

  const [rnoResult,stuResult]=await Promise.allSettled([
    api({action:'getLastReceiptNo'}),
    api({action:'getStudents',token:SESSION_TOKEN,search:'',cls:'',hostelOnly:'false'})
  ]);
  const rnoField=document.getElementById('ff-rno');
  const rnoBadge=document.getElementById('rno-badge');
  if(rnoField){
    if(rnoResult.status==='fulfilled'&&rnoResult.value.nextReceiptNo){
      rnoField.value=rnoResult.value.nextReceiptNo;
      rnoField.readOnly=false; rnoField.style.background=''; rnoField.style.cursor='';
      rnoBadge.textContent='AUTO';rnoBadge.style.background='rgba(16,185,129,.15)';rnoBadge.style.color='var(--accent3)';
    } else {
      rnoField.value='';rnoBadge.textContent='ERROR';rnoBadge.style.background='rgba(239,68,68,.15)';rnoBadge.style.color='var(--danger)';
    }
  }
  if(stuResult.status==='fulfilled'&&stuResult.value.students) _studentCache=stuResult.value.students;
  else _studentCache=DEMO_STUDENTS;
}

function suggestStudents(q){
  const box=document.getElementById('ff-suggest');
  if(!box) return;
  if(!q||q.length<1){box.innerHTML='';return;}
  const pool=_studentCache||DEMO_STUDENTS;
  const ql=q.toLowerCase();
  const matches=pool.filter(s=>s.name.toLowerCase().includes(ql)||(s.father||'').toLowerCase().includes(ql)).slice(0,8);
  if(!matches.length){box.innerHTML='';return;}
  const feeIcons={admission:'📝',tuition:'📚',school:'🏫',hostel:'🏠'};
  box.innerHTML=matches.map(s=>{
    const paidTags=Object.entries(feeIcons).filter(([k])=>(s[k]||0)>0).map(([k,icon])=>`<span style="background:rgba(16,185,129,.1);color:#6ee7b7;padding:1px 5px;border-radius:3px;font-size:10px">${icon} ${k.charAt(0).toUpperCase()+k.slice(1)} ✓</span>`).join(' ');
    const hostelTag=s.hasHostel?`<span style="background:rgba(139,92,246,.1);color:#c4b5fd;padding:1px 5px;border-radius:3px;font-size:10px">🏠 Hostel</span>`:'';
    return `<div onclick="selectStudent(${JSON.stringify(s).replace(/"/g,'&quot;')})" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s" onmouseover="this.style.background='rgba(255,255,255,.06)'" onmouseout="this.style.background=''">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:600;font-size:13px;color:var(--text)">${s.name}</div>
        <span style="font-size:11px;background:rgba(6,182,212,.1);color:var(--accent2);padding:2px 7px;border-radius:4px">Class ${s.class}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">Father: ${s.father||'—'}${s.mobile?' · 📱 '+s.mobile:''}</div>
      ${paidTags||hostelTag?`<div style="margin-top:5px;display:flex;gap:4px;flex-wrap:wrap">${paidTags}${hostelTag}</div>`:''}
    </div>`;
  }).join('');
}
function selectStudent(s){
  document.getElementById('ff-name').value=s.name;
  document.getElementById('ff-father').value=s.father||'';
  if(s.mobile) document.getElementById('ff-mobile').value=s.mobile;
  const sel=document.getElementById('ff-class');
  if(sel) for(let i=0;i<sel.options.length;i++) if(sel.options[i].text===s.class){sel.selectedIndex=i;break;}
  const box=document.getElementById('ff-suggest'); if(box) box.innerHTML='';
}
function selectStudentByName(name){
  const s=(_studentCache||DEMO_STUDENTS).find(x=>x.name===name);
  if(s) selectStudent(s);
}
function updateFeeTotal(){
  const ids=['ff-admission','ff-tuition','ff-school','ff-hostel','ff-stationary','ff-other'];
  const t=ids.reduce((a,id)=>a+(parseFloat(document.getElementById(id)?.value)||0),0);
  const el=document.getElementById('ff-total'); if(el) el.textContent='₹'+fmt(t);
}
async function checkReceiptNoDuplicate(rno){
  if(!rno) return;
  const warn=document.getElementById('rno-warn'); if(!warn) return;
  try{
    const d=await api({action:'checkDuplicateReceipt',token:SESSION_TOKEN,receiptNo:rno});
    if(d.duplicate&&d.type==='receiptNo'){warn.style.display='block';warn.textContent='⚠️ '+d.message;document.getElementById('ff-rno').style.borderColor='var(--danger)';}
    else{warn.style.display='none';document.getElementById('ff-rno').style.borderColor='';}
  }catch(e){}
}
async function submitFeeEntry(){
  const name=document.getElementById('ff-name').value.trim();
  const rno=document.getElementById('ff-rno').value.trim();
  const date=document.getElementById('ff-date').value;
  const cls=document.getElementById('ff-class').value;
  const feeIds=['ff-admission','ff-tuition','ff-school','ff-hostel','ff-stationary','ff-other'];
  const feeKeys=['admission','tuition','school','hostel','stationary','other'];
  const total=feeIds.reduce((a,id)=>a+(parseFloat(document.getElementById(id)?.value)||0),0);
  if(!rno){showFormMsg('feepay-msg','error','Please enter Receipt Number');return;}
  if(!date){showFormMsg('feepay-msg','error','Please select Date');return;}
  if(!name){showFormMsg('feepay-msg','error','Please enter Student Name');return;}
  if(total<=0){showFormMsg('feepay-msg','error','Please enter at least one fee amount');return;}
  const btn=document.querySelector('#fee-form-card .form-btn.primary');
  btn.disabled=true;btn.textContent='Checking…';
  try{
    const rnoCheck=await api({action:'checkDuplicateReceipt',token:SESSION_TOKEN,receiptNo:rno});
    if(rnoCheck.duplicate&&rnoCheck.type==='receiptNo'){
      showFormMsg('feepay-msg','error','⚠️ '+rnoCheck.message);
      btn.disabled=false;btn.textContent='💾 Save & Generate Receipt';return;
    }
  }catch(e){showFormMsg('feepay-msg','error','⚠️ Duplicate check failed');btn.disabled=false;btn.textContent='💾 Save & Generate Receipt';return;}
  btn.textContent='Saving…';
  const payload={action:'addFeeEntry',token:SESSION_TOKEN,receiptNo:rno,date,studentName:name,
    fatherName:document.getElementById('ff-father').value.trim(),class:cls,
    mobile:document.getElementById('ff-mobile').value.trim(),
    payMode:document.getElementById('ff-paymode').value,
    receivedBy:document.getElementById('ff-recvby').value,
    inWords:document.getElementById('ff-inwords').value.trim(),
    remarks:document.getElementById('ff-remarks').value.trim()};
  feeKeys.forEach((k,i)=>payload[k]=(parseFloat(document.getElementById(feeIds[i])?.value)||0));
  try{
    const d=await api(payload);
    if(d.success||d.rowsAdded){
      showFormMsg('feepay-msg','success','✅ Receipt #'+rno+' saved!');
      feeFormReceipt.data={...payload,total};
      document.getElementById('ff-print-btn').style.display='inline-flex';
    } else showFormMsg('feepay-msg','error','❌ '+(d.error||'Save failed'));
  }catch(e){showFormMsg('feepay-msg','error','❌ '+e.message);}
  btn.disabled=false;btn.textContent='💾 Save & Generate Receipt';
}

function clearFeeForm(){
  ['ff-name','ff-father','ff-mobile','ff-inwords','ff-remarks'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['ff-admission','ff-tuition','ff-school','ff-hostel','ff-stationary','ff-other'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const t=document.getElementById('ff-total');if(t)t.textContent='₹0';
  const pb=document.getElementById('ff-print-btn');if(pb)pb.style.display='none';
  feeFormReceipt.data=null;
  document.getElementById('feepay-msg').style.display='none';
}

function printFeeReceipt(){
  const d=feeFormReceipt.data; if(!d) return;
  openReceiptPrint({receiptNo:d.receiptNo,date:d.date,studentName:d.studentName,fatherName:d.fatherName,class:d.class,feeType:'Multiple',amount:d.total,payMode:d.payMode,
    feeBreakdown:{'Admission Fee':d.admission||0,'Tuition Fee':d.tuition||0,'School Fee':d.school||0,'Hostel Fee':d.hostel||0,'Stationary':d.stationary||0,'Other':d.other||0},
    inWords:d.inWords,receivedBy:d.receivedBy,remarks:d.remarks},null);
}

document.addEventListener('click',e=>{const b=document.getElementById('ff-suggest');if(b&&!b.contains(e.target)&&e.target.id!=='ff-name')b.innerHTML='';});

// ════════════════════════════════════════════════════════════════════
// EXPENSES & BANK DEPOSITS
// ════════════════════════════════════════════════════════════════════
let expTab = 'expense'; // 'expense' | 'bank'

async function loadExpensesPage() {
  const el = document.getElementById('page-expenses');
  el.innerHTML = `
  <div class="shdr" style="margin-bottom:20px"><div><div class="stitle">💸 Expenses & Bank</div><div class="ssub">Track school expenses and bank deposits</div></div></div>
  <div style="display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:22px">
    <button class="rc-tab ${expTab==='expense'?'active':''}" onclick="switchExpTab('expense')">📤 Expenses</button>
    <button class="rc-tab ${expTab==='bank'?'active':''}" onclick="switchExpTab('bank')">🏦 Bank Deposits</button>
  </div>
  <div id="exp-tab-body"></div>`;
  renderExpTab();
}

function switchExpTab(tab){
  expTab=tab;
  document.querySelectorAll('#page-expenses .rc-tab').forEach((t,i)=>{
    t.classList.toggle('active',(i===0&&tab==='expense')||(i===1&&tab==='bank'));
  });
  renderExpTab();
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }); // → "03 Jun 2025"
  } catch { return dateStr; }
}

async function renderExpTab() {
  const body = document.getElementById('exp-tab-body');
  if (!body) return;
  body.innerHTML = loader();
  try {
    if (expTab === 'expense') {
      const d = await api({ action: 'getExpenses', token: SESSION_TOKEN });
      const items = d.expenses || [];
      const total = d.total || items.reduce((a, e) => a + e.amount, 0);
      body.innerHTML = `
      <div class="form-card" style="margin-bottom:22px" id="exp-form-card">
        <div class="form-section-title">➕ Add Expense</div>
        <div class="form-grid">
          <div class="fg"><label class="fl">Date <span class="req">*</span></label><input class="fi" id="exp-date" type="date" value="${new Date().toISOString().slice(0,10)}"/></div>
          <div class="fg"><label class="fl">Category <span class="req">*</span></label>
            <select class="fi" id="exp-cat">
              <option value="">Select</option>
              <option>Stationery</option><option>Maintenance</option><option>Salary</option>
              <option>Furniture</option><option>Utility</option><option>Cleaning</option>
              <option>Transport</option><option>Travel</option><option>Events</option><option>Other</option>
            </select></div>
          <div class="fg"><label class="fl">Description <span class="req">*</span></label><input class="fi" id="exp-desc" type="text" placeholder="What was purchased/paid"/></div>
          <div class="fg"><label class="fl">Amount (₹) <span class="req">*</span></label><input class="fi" id="exp-amount" type="number" min="0" placeholder="0"/></div>
          <div class="fg"><label class="fl">Spent For</label><input class="fi" id="exp-to" type="text" placeholder="Purpose / person name"/></div>
          <div class="fg"><label class="fl">Spent By</label>
            <select class="fi" id="exp-by">
              <option>Parmeshwar</option><option>Chandrasen Yadav</option>
              <option>Roshni</option><option>Pathak Sir</option><option>Other</option>
            </select></div>
        </div>
        <div id="exp-msg" style="display:none;margin-top:12px"></div>
        <div style="margin-top:18px;display:flex;gap:10px">
          <button class="form-btn primary" onclick="submitExpense()">💾 Save Expense</button>
          <button class="form-btn secondary" onclick="clearExpenseForm()">🗑 Clear</button>
        </div>
      </div>

      <div class="shdr" style="margin-bottom:14px">
        <div><div class="stitle" style="font-size:16px">Expense History</div></div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--danger);font-weight:700">Total: ₹${fmt(total)}</div>
      </div>

      <div class="table-wrap"><div style="overflow-x:auto"><table>
        <thead>
          <tr>
            <th style="min-width:40px">#</th>
            <th style="min-width:100px">Date</th>
            <th style="min-width:180px">Description</th>
            <th style="min-width:90px;text-align:right">Amount</th>
            <th style="min-width:100px">Spent By</th>
            <th style="min-width:110px">Category</th>
            <th style="min-width:120px">Spent For</th>
          </tr>
        </thead>
        <tbody>
          ${items.length === 0
            ? '<tr><td colspan="7" class="empty" style="padding:30px;text-align:center">No expenses recorded yet</td></tr>'
            : items.map(e => `<tr>
                <td style="font-size:12px;color:var(--muted)">${e.sno}</td>
                <td style="font-size:12px;color:var(--muted)">${e.date}</td>
                <td style="font-size:13px">${e.description}</td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--danger);font-weight:700;text-align:right">₹${fmt(e.amount)}</td>
                <td style="font-size:12px;color:var(--muted)">${e.by || '—'}</td>
                <td><span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(239,68,68,.1);color:#fca5a5">${e.category || '—'}</span></td>
                <td style="font-size:12px;color:var(--muted)">${e.paidTo || '—'}</td>
              </tr>`).join('')
          }
        </tbody>
      </table></div></div>`;

    } else {
      // ── BANK DEPOSITS ──
      const d = await api({ action: 'getBankDeposits', token: SESSION_TOKEN });
      const items = d.deposits || [];
      const total = d.total || items.reduce((a, b) => a + b.amount, 0);
      body.innerHTML = `
      <div class="form-card" style="margin-bottom:22px" id="bank-form-card">
        <div class="form-section-title">➕ Add Bank Deposit</div>
        <div class="form-grid">
          <div class="fg"><label class="fl">Date <span class="req">*</span></label><input class="fi" id="bank-date" type="date" value="${new Date().toISOString().slice(0,10)}"/></div>
          <div class="fg"><label class="fl">Amount (₹) <span class="req">*</span></label><input class="fi" id="bank-amount" type="number" min="0" placeholder="0"/></div>
          <div class="fg"><label class="fl">Deposited By</label>
            <select class="fi" id="bank-by">
              <option>Parmeshwar</option><option>Chandrasen Yadav</option>
              <option>Roshni</option><option>Pathak Sir</option><option>Other</option>
            </select></div>
          <div class="fg"><label class="fl">Bank <span class="req">*</span></label>
            <select class="fi" id="bank-name"><option>CRGB</option><option>SBI</option><option>PNB</option><option>Other</option></select></div>
          <div class="fg"><label class="fl">Account No.</label><input class="fi" id="bank-acc" type="text" placeholder="Account number"/></div>
          <div class="fg"><label class="fl">Remarks</label><input class="fi" id="bank-desc" type="text" placeholder="e.g. Fee deposit June batch"/></div>
          <div class="fg"><label class="fl">Transaction Ref.</label><input class="fi" id="bank-txn" type="text" placeholder="TXN / Challan no."/></div>
        </div>
        <div id="bank-msg" style="display:none;margin-top:12px"></div>
        <div style="margin-top:18px;display:flex;gap:10px">
          <button class="form-btn primary" onclick="submitBankDeposit()">💾 Save Deposit</button>
          <button class="form-btn secondary" onclick="clearBankForm()">🗑 Clear</button>
        </div>
      </div>

      <div class="shdr" style="margin-bottom:14px">
        <div><div class="stitle" style="font-size:16px">Bank Deposit History</div></div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--accent3);font-weight:700">Total: ₹${fmt(total)}</div>
      </div>

      <div class="table-wrap"><div style="overflow-x:auto"><table>
        <thead>
          <tr>
            <th style="min-width:40px">#</th>
            <th style="min-width:100px">Date</th>
            <th style="min-width:90px;text-align:right">Amount</th>
            <th style="min-width:110px">Deposited By</th>
            <th style="min-width:80px">Bank</th>
            <th style="min-width:120px">Account No.</th>
            <th style="min-width:150px">Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${items.length === 0
            ? '<tr><td colspan="7" class="empty" style="padding:30px;text-align:center">No deposits recorded yet</td></tr>'
            : items.map(b => `<tr>
                <td style="font-size:12px;color:var(--muted)">${b.sno}</td>
                <td style="font-size:12px;color:var(--muted)">${b.date}</td>
                <td style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent3);font-weight:700;text-align:right">₹${fmt(b.amount)}</td>
                <td style="font-size:12px">${b.depositedBy || '—'}</td>
                <td><span class="cbadge">${b.bank || '—'}</span></td>
                <td style="font-size:12px;color:var(--muted)">${b.accountNo || '—'}</td>
                <td style="font-size:12px;color:var(--muted)">${b.remarks || '—'}</td>
              </tr>`).join('')
          }
        </tbody>
      </table></div></div>`;
    }
  } catch(e) { body.innerHTML = errorBox(e.message); }
}

async function submitExpense(){
  const date=document.getElementById('exp-date').value;
  const cat=document.getElementById('exp-cat').value;
  const desc=document.getElementById('exp-desc').value.trim();
  const amt=parseFloat(document.getElementById('exp-amount').value)||0;
  if(!date||!cat||!desc||amt<=0){showFormMsg('exp-msg','error','Please fill all required fields');return;}
  const btn=document.querySelector('#exp-form-card .form-btn.primary');
  btn.disabled=true;btn.textContent='Saving…';
  try{
    const d=await api({action:'addExpense',token:SESSION_TOKEN,date,category:cat,description:desc,amount:amt,paidTo:document.getElementById('exp-to').value.trim(),by:document.getElementById('exp-by').value});
    if(d.success){showFormMsg('exp-msg','success','✅ Expense recorded!');clearExpenseForm();renderExpTab();}
    else showFormMsg('exp-msg','error','❌ '+(d.error||'Failed'));
  }catch(e){showFormMsg('exp-msg','error','❌ '+e.message);}
  btn.disabled=false;btn.textContent='💾 Save Expense';
}

function clearExpenseForm(){['exp-desc','exp-amount','exp-to'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('exp-cat').value='';}


async function submitBankDeposit(){
  const date=document.getElementById('bank-date').value;
  const bank=document.getElementById('bank-name').value;
  const amt=parseFloat(document.getElementById('bank-amount').value)||0;
  if(!date||!bank||amt<=0){showFormMsg('bank-msg','error','Please fill all required fields');return;}
  const btn=document.querySelector('#bank-form-card .form-btn.primary');
  btn.disabled=true;btn.textContent='Saving…';
  try{
    const d=await api({action:'addBankDeposit',token:SESSION_TOKEN,date,bank,accountNo:document.getElementById('bank-acc').value.trim(),amount:amt,description:document.getElementById('bank-desc').value.trim(),txnRef:document.getElementById('bank-txn').value.trim(),depositedBy:document.getElementById('bank-by').value});
    if(d.success){showFormMsg('bank-msg','success','✅ Deposit recorded!');clearBankForm();renderExpTab();}
    else showFormMsg('bank-msg','error','❌ '+(d.error||'Failed'));
  }catch(e){showFormMsg('bank-msg','error','❌ '+e.message);}
  btn.disabled=false;btn.textContent='💾 Save Deposit';
}


function clearBankForm(){['bank-acc','bank-amount','bank-desc','bank-txn'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});}

// ════════════════════════════════════════════════════════════════════
// TEST SCORES ADMIN PAGE
// ════════════════════════════════════════════════════════════════════

let testAdminClass='', testAdminType='';

// ════════════════════════════════════════════════════════════════════
// SCORES & RESULTS — unified page (Test Entry · Exam Entry · View Tests · View Exams)
// ════════════════════════════════════════════════════════════════════
let scoresTab = 'addTest'; // 'addTest' | 'addExam' | 'viewTests' | 'viewExams'

// shared state
let tsStudents  = [];  // students loaded for test entry
let erStudents  = [];  // students loaded for exam entry
let erCurrentClass = '', erCurrentExam = 'pq', erCurrentSubject = '';

async function loadTestsAdminPage() {
  const el = document.getElementById('page-tests');
  el.innerHTML = `
  <div class="shdr" style="margin-bottom:20px">
    <div><div class="stitle">📝 Scores & Results</div>
    <div class="ssub">Weekly/Monthly tests · PQ / Half-Yearly / Annual exam marks</div></div>
  </div>
  <div style="display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:22px;overflow-x:auto">
    <button class="rc-tab active" id="sr-tab-addTest"  onclick="switchScoresTab('addTest')">➕ Add Test</button>
    <button class="rc-tab"        id="sr-tab-addExam"  onclick="switchScoresTab('addExam')">📋 Add Exam Result</button>
    <button class="rc-tab"        id="sr-tab-viewTests" onclick="switchScoresTab('viewTests')">📊 View Tests</button>
    <button class="rc-tab"        id="sr-tab-viewExams" onclick="switchScoresTab('viewExams')">🏆 View Exam Results</button>
  </div>
  <div id="scores-tab-body"></div>`;
  renderScoresTab('addTest');
}

function switchScoresTab(tab) {
  scoresTab = tab;
  ['addTest','addExam','viewTests','viewExams'].forEach(t => {
    document.getElementById('sr-tab-'+t)?.classList.toggle('active', t === tab);
  });
  renderScoresTab(tab);
}

async function renderScoresTab(tab) {
  const body = document.getElementById('scores-tab-body');
  if (!body) return;

  // ── TAB 1: ADD TEST ───────────────────────────────────────────────
  if (tab === 'addTest') {
    body.innerHTML = `
    <div class="form-card" id="test-form-card">
      <div class="form-section-title">📝 New Weekly / Monthly Test Entry</div>
      <div class="form-grid">
        <div class="fg"><label class="fl">Date <span class="req">*</span></label>
          <input class="fi" id="ts-date" type="date" value="${new Date().toISOString().slice(0,10)}"/></div>
        <div class="fg"><label class="fl">Class <span class="req">*</span></label>
          <select class="fi" id="ts-class" onchange="tsLoadStudents()">
            <option value="">Select Class</option>
            ${['Nursery','LKG','UKG','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(c=>`<option>${c}</option>`).join('')}
          </select></div>
        <div class="fg"><label class="fl">Test Name <span class="req">*</span></label>
          <input class="fi" id="ts-name" type="text" placeholder="e.g. Weekly Test 3"/></div>
        <div class="fg"><label class="fl">Subject <span class="req">*</span></label>
          <input class="fi" id="ts-subject" type="text" placeholder="e.g. Mathematics"/></div>
        <div class="fg"><label class="fl">Max Marks <span class="req">*</span></label>
          <input class="fi" id="ts-max" type="number" min="1" value="25" oninput="tsUpdateMax()"/></div>
        <div class="fg"><label class="fl">Type</label>
          <select class="fi" id="ts-type">
            <option value="weekly">Weekly Test</option>
            <option value="monthly">Monthly Test</option>
          </select></div>
      </div>
      <div style="margin-top:20px">
        <div class="form-section-title">🎓 Student Scores</div>
        <div id="ts-score-table">
          <div style="padding:20px;text-align:center;color:var(--muted);font-size:13px">Select a class above to load students</div>
        </div>
      </div>
      <div id="test-msg" style="display:none;margin-top:14px"></div>
      <div style="display:flex;gap:12px;margin-top:20px">
        <button class="form-btn primary" onclick="submitTestScores()">💾 Save All Scores</button>
        <button class="form-btn secondary" onclick="clearTestForm()">🗑 Clear</button>
      </div>
    </div>`;

  // ── TAB 2: ADD EXAM RESULT ────────────────────────────────────────
  } else if (tab === 'addExam') {
    body.innerHTML = `
    <div class="form-card" style="margin-bottom:22px">
      <div class="form-section-title">Step 1 — Select Exam, Class & Subject</div>
      <div class="form-grid">
        <div class="fg"><label class="fl">Exam <span class="req">*</span></label>
          <select class="fi" id="er-exam" onchange="erOnFilterChange()">
            <option value="pq">Pre-Quarterly (PQ)</option>
            <option value="hy">Half Yearly (HY)</option>
            <option value="annual">Annual</option>
            <option value="ut1">Unit Test 1</option>
            <option value="ut2">Unit Test 2</option>
          </select></div>
        <div class="fg"><label class="fl">Class <span class="req">*</span></label>
          <select class="fi" id="er-class" onchange="erOnFilterChange()">
            <option value="">— Select Class —</option>
            ${['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'].map(c=>`<option value="${c}">${c}</option>`).join('')}
          </select></div>
        <div class="fg"><label class="fl">Subject <span class="req">*</span></label>
          <select class="fi" id="er-subject" onchange="erOnFilterChange()">
            <option value="">— Select Subject —</option>
          </select></div>
        <div class="fg"><label class="fl">Max Marks <span class="req">*</span></label>
          <input class="fi" id="er-max" type="number" min="1" max="200" value="100" oninput="erUpdateMaxHints()"/></div>
        <div class="fg"><label class="fl">Pass Marks <span class="req">*</span></label>
          <input class="fi" id="er-pass" type="number" min="1" max="200" value="33"/></div>
        <div class="fg"><label class="fl">Practical Max</label>
          <input class="fi" id="er-pmax" type="number" min="0" max="100" value="0" oninput="erUpdateMaxHints()" placeholder="0 if none"/></div>
        <div class="fg"><label class="fl">Session</label>
          <input class="fi" id="er-session" type="text" value="2025-26" readonly style="color:var(--muted)"/></div>
      </div>
      <div style="margin-top:14px">
        <button class="form-btn primary" onclick="erLoadStudents()">👥 Load Students</button>
      </div>
    </div>

    <div id="er-marks-section" style="display:none">
      <div class="form-card">
        <div class="form-section-title" id="er-table-title">Step 2 — Enter Marks</div>
        <div style="margin-bottom:14px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div id="er-hint" style="font-size:12px;color:var(--muted)"></div>
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="er-show-absent" onchange="erToggleAbsentCol()" style="width:14px;height:14px"/>
            Mark absent students
          </label>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr id="er-thead">
                <th style="padding:10px 8px;text-align:left;border-bottom:2px solid var(--border);min-width:40px">#</th>
                <th style="padding:10px 8px;text-align:left;border-bottom:2px solid var(--border);min-width:160px">Student</th>
                <th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);min-width:120px">
                  Theory <span id="er-th-max" style="font-size:10px;color:var(--muted)"></span>
                </th>
                <th id="er-prac-th" style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);min-width:120px;display:none">
                  Practical <span id="er-th-pmax" style="font-size:10px;color:var(--muted)"></span>
                </th>
                <th id="er-absent-th" style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);min-width:80px;display:none">Absent</th>
              </tr>
            </thead>
            <tbody id="er-tbody"></tbody>
          </table>
        </div>
        <div id="er-save-msg" style="display:none;margin-top:14px"></div>
        <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="form-btn primary" onclick="erSaveResults()">💾 Save All Results</button>
          <button class="form-btn secondary" onclick="erFillAllAbsent()">🔴 Mark All Absent</button>
          <button class="form-btn secondary" onclick="erClearAll()">🗑 Clear All</button>
        </div>
      </div>
    </div>`;
    erPopulateSubjects();

  // ── TAB 3: VIEW TESTS ─────────────────────────────────────────────
  } else if (tab === 'viewTests') {
    body.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;align-items:flex-end">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Class</div>
        <select class="filter-select" id="tv-class" onchange="loadTestView()">
          <option value="">All Classes</option>
          ${['Nursery','LKG','UKG','1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'].map(c=>`<option>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Type</div>
        <select class="filter-select" id="tv-type" onchange="loadTestView()">
          <option value="">All Types</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
    </div>
    <div id="test-view-body">${loader()}</div>`;
    loadTestView();

  // ── TAB 4: VIEW EXAM RESULTS ──────────────────────────────────────
  } else if (tab === 'viewExams') {
    body.innerHTML = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;align-items:flex-end">
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Exam</div>
        <select class="filter-select" id="ev-exam" onchange="loadExamView()">
          <option value="">All Exams</option>
          <option value="pq">Pre-Quarterly</option>
          <option value="hy">Half Yearly</option>
          <option value="annual">Annual</option>
          <option value="ut1">Unit Test 1</option>
          <option value="ut2">Unit Test 2</option>
        </select>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Class</div>
        <select class="filter-select" id="ev-class" onchange="loadExamView()">
          <option value="">All Classes</option>
          ${['Nursery','LKG','UKG','1','2','3','4','5','6','7','8','9','10','11','12'].map(c=>`<option>${c}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="exam-view-body">${loader()}</div>`;
    loadExamView();
  }
}

// ── TEST ENTRY HELPERS ────────────────────────────────────────────
async function tsLoadStudents() {
  const cls = document.getElementById('ts-class')?.value;
  if (!cls) return;
  const wrap = document.getElementById('ts-score-table');
  wrap.innerHTML = loader();
  try {
    const d = await api({action:'getStudents',token:SESSION_TOKEN,search:'',cls,hostelOnly:'false'});
    tsStudents = d.students || [];
    if (!tsStudents.length) { wrap.innerHTML='<div style="padding:20px;text-align:center;color:var(--muted)">No students in class '+cls+'</div>'; return; }
    const maxM = parseInt(document.getElementById('ts-max')?.value)||25;
    wrap.innerHTML = `<div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:var(--subtle)">
          <th style="padding:9px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--muted)">#</th>
          <th style="padding:9px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:var(--muted)">Student Name</th>
          <th style="padding:9px 12px;text-align:center;font-size:10px;text-transform:uppercase;color:var(--muted)">Marks (max: <span id="max-display">${maxM}</span>)</th>
          <th style="padding:9px 12px;text-align:center;font-size:10px;text-transform:uppercase;color:var(--muted)">Absent</th>
        </tr></thead>
        <tbody id="score-rows">
          ${tsStudents.map((s,i)=>`
          <tr style="border-top:1px solid rgba(30,45,69,.4)">
            <td style="padding:9px 12px;color:var(--muted);font-size:11px">${i+1}</td>
            <td style="padding:9px 12px;font-weight:500">${s.name}</td>
            <td style="padding:6px 12px;text-align:center">
              <input type="number" min="0" max="${maxM}" id="score-${i}" data-name="${s.name}"
                style="width:80px;padding:7px 10px;background:var(--subtle);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;text-align:center;outline:none"
                onfocus="this.style.borderColor='var(--accent2)'"
                onblur="this.style.borderColor='var(--border)'"
                oninput="if(parseFloat(this.value)>${maxM})this.value=${maxM}"/>
            </td>
            <td style="padding:9px 12px;text-align:center">
              <input type="checkbox" id="absent-${i}"
                onchange="document.getElementById('score-${i}').value='';document.getElementById('score-${i}').disabled=this.checked;document.getElementById('score-${i}').style.opacity=this.checked?'0.35':'1'"
                style="width:16px;height:16px;cursor:pointer"/>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  } catch(e) { wrap.innerHTML = errorBox(e.message); }
}

function tsUpdateMax() {
  const max = parseInt(document.getElementById('ts-max')?.value)||25;
  document.querySelectorAll('#score-rows input[type=number]').forEach(inp=>{ inp.max=max; });
  const disp = document.getElementById('max-display');
  if (disp) disp.textContent = max;
}

async function submitTestScores() {
  const date     = document.getElementById('ts-date')?.value;
  const cls      = document.getElementById('ts-class')?.value;
  const testName = document.getElementById('ts-name')?.value.trim();
  const subject  = document.getElementById('ts-subject')?.value.trim();
  const maxM     = parseInt(document.getElementById('ts-max')?.value)||25;
  const type     = document.getElementById('ts-type')?.value||'weekly';
  if (!date||!cls||!testName||!subject) { showFormMsg('test-msg','error','Please fill all test details'); return; }
  const scores = [];
  tsStudents.forEach((s,i) => {
    const inp    = document.getElementById('score-'+i);
    const absCb  = document.getElementById('absent-'+i);
    if (!inp) return;
    const absent  = absCb?.checked || false;
    const obtained = absent ? null : (parseFloat(inp.value)||0);
    scores.push({studentName:s.name,fatherName:s.father, obtained});
  });
  if (!scores.length) { showFormMsg('test-msg','error','No scores to save'); return; }
  const btn = document.querySelector('#test-form-card .form-btn.primary');
  btn.disabled=true; btn.textContent='Saving…';
  try {
    const d = await api({action:'addTestResult',token:SESSION_TOKEN,date,class:cls,testName,subject,maxMarks:maxM,type,scores:JSON.stringify(scores)});
    if (d.success) { showFormMsg('test-msg','success','✅ Scores saved for '+scores.length+' students!'); clearTestForm(); }
    else showFormMsg('test-msg','error','❌ '+(d.error||'Failed'));
  } catch(e) { showFormMsg('test-msg','error','❌ '+e.message); }
  btn.disabled=false; btn.textContent='💾 Save All Scores';
}

function clearTestForm() {
  ['ts-name','ts-subject'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const cls=document.getElementById('ts-class'); if(cls) cls.value='';
  const typ=document.getElementById('ts-type'); if(typ) typ.value='weekly';
  const mx=document.getElementById('ts-max'); if(mx) mx.value='25';
  const wrap=document.getElementById('ts-score-table');
  if(wrap) wrap.innerHTML='<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px">Select a class above to load students</div>';
  tsStudents=[];
}

// ── EXAM ENTRY HELPERS ────────────────────────────────────────────
function erGetSubjects(cls) {
  const n = parseInt(cls);
  if (!n || n <= 2) return ['Hindi','English','Math','EVS','Drawing'];
  if (n <= 5)  return ['Hindi','English','Math','EVS','Sanskrit','Drawing','Computer'];
  if (n <= 8)  return ['Hindi','English','Math','Science','Social Science','Sanskrit','Computer','Drawing'];
  if (n <= 10) return ['Hindi','English','Math','Science','Social Science','Sanskrit','Computer'];
  return ['Hindi','English','Math','Physics','Chemistry','Biology','Accountancy','Business Studies','Economics','History','Geography','Political Science','Computer','Physical Education'];
}

function erPopulateSubjects() {
  const cls = document.getElementById('er-class')?.value || '';
  const sel = document.getElementById('er-subject');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select Subject —</option>' +
    erGetSubjects(cls).map(s=>`<option value="${s}">${s}</option>`).join('');
}

function erOnFilterChange() {
  erCurrentClass   = document.getElementById('er-class')?.value   || '';
  erCurrentExam    = document.getElementById('er-exam')?.value    || 'pq';
  erCurrentSubject = document.getElementById('er-subject')?.value || '';
  erPopulateSubjects();
  const sel = document.getElementById('er-subject');
  if (sel && erCurrentSubject) sel.value = erCurrentSubject;
  erUpdateMaxHints();
}

function erUpdateMaxHints() {
  const max  = parseInt(document.getElementById('er-max')?.value)  || 0;
  const pmax = parseInt(document.getElementById('er-pmax')?.value) || 0;
  const thMax  = document.getElementById('er-th-max');
  const thPmax = document.getElementById('er-th-pmax');
  if (thMax)  thMax.innerHTML  = max  ? `(0–${max})`  : '';
  if (thPmax) thPmax.innerHTML = pmax ? `(0–${pmax})` : '';
  const hint = document.getElementById('er-hint');
  if (hint) hint.innerHTML = `<span style="background:rgba(99,102,241,.12);color:var(--accent);padding:3px 10px;border-radius:20px;font-size:11px">Theory: ${max}${pmax?` · Practical: ${pmax}`:''} · Total: ${max+pmax} marks</span>`;
  document.querySelectorAll('.er-theory-input').forEach(inp=>{ inp.max=max; inp.placeholder=`0–${max}`; });
  document.querySelectorAll('.er-prac-input').forEach(inp=>{ inp.max=pmax; inp.placeholder=`0–${pmax}`; });
}

async function erLoadStudents() {
  const cls     = document.getElementById('er-class').value;
  const subject = document.getElementById('er-subject').value;
  const max     = parseInt(document.getElementById('er-max').value) || 0;
  const pmax    = parseInt(document.getElementById('er-pmax').value) || 0;
  if (!cls)     { showToast('Please select a class',   'error'); return; }
  if (!subject) { showToast('Please select a subject', 'error'); return; }
  if (!max)     { showToast('Enter max marks',         'error'); return; }
  const section = document.getElementById('er-marks-section');
  const tbody   = document.getElementById('er-tbody');
  tbody.innerHTML = `<tr><td colspan="5" style="padding:20px;text-align:center">${loader()}</td></tr>`;
  section.style.display = 'block';
  section.scrollIntoView({behavior:'smooth',block:'start'});
  try {
    const d = await api({action:'getStudents',token:SESSION_TOKEN,search:'',cls,hostelOnly:'false'});
    erStudents = (d.students||[]).sort((a,b)=>a.name.localeCompare(b.name));
    if (!erStudents.length) {
      tbody.innerHTML=`<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--muted)">No students in Class ${cls}</td></tr>`;
      return;
    }
    document.getElementById('er-table-title').textContent =
      `Step 2 — Enter Marks · Class ${cls} · ${subject} · ${document.getElementById('er-exam').selectedOptions[0].text}`;
    document.getElementById('er-prac-th').style.display = pmax > 0 ? '' : 'none';
    erUpdateMaxHints();
    erBuildTable(erStudents, max, pmax, pmax > 0);
  } catch(e) { tbody.innerHTML=`<tr><td colspan="5">${errorBox(e.message)}</td></tr>`; }
}

function erBuildTable(students, max, pmax, showPrac) {
  const tbody      = document.getElementById('er-tbody');
  const showAbsent = document.getElementById('er-show-absent')?.checked;
  tbody.innerHTML  = students.map((s,i) => `
    <tr id="er-row-${i}" style="border-bottom:1px solid var(--border)">
      <td style="padding:8px;color:var(--muted);font-size:11px">${i+1}</td>
      <td style="padding:8px">
        <div style="font-weight:500;font-size:13px">${s.name}</div>
        <div style="font-size:11px;color:var(--muted)">${s.father||''}</div>
      </td>
      <td style="padding:8px;text-align:center">
        <input class="fi er-theory-input" id="er-t-${i}" type="number" min="0" max="${max}"
          placeholder="0–${max}" style="width:90px;text-align:center;padding:6px 8px"
          oninput="erValidateInput(this,${max},'theory',${i})"
          onblur="erValidateInput(this,${max},'theory',${i})"/>
        <div id="er-t-err-${i}" style="font-size:10px;color:var(--danger);margin-top:2px;min-height:14px"></div>
      </td>
      ${showPrac ? `<td style="padding:8px;text-align:center">
        <input class="fi er-prac-input" id="er-p-${i}" type="number" min="0" max="${pmax}"
          placeholder="0–${pmax}" style="width:90px;text-align:center;padding:6px 8px"
          oninput="erValidateInput(this,${pmax},'prac',${i})"
          onblur="erValidateInput(this,${pmax},'prac',${i})"/>
        <div id="er-p-err-${i}" style="font-size:10px;color:var(--danger);margin-top:2px;min-height:14px"></div>
      </td>` : ''}
      <td style="padding:8px;text-align:center;display:${showAbsent?'':'none'}" class="er-absent-col">
        <input type="checkbox" id="er-ab-${i}"
          style="width:16px;height:16px;cursor:pointer;accent-color:var(--danger)"
          onchange="erToggleRowAbsent(${i})"/>
      </td>
    </tr>`).join('');
}

function erValidateInput(inp, max, type, idx) {
  const errEl = document.getElementById(`er-${type==='theory'?'t':'p'}-err-${idx}`);
  const val   = parseFloat(inp.value);
  inp.style.borderColor = '';
  if (inp.value === '') { if (errEl) errEl.textContent=''; return true; }
  if (isNaN(val) || val < 0) {
    inp.style.borderColor='var(--danger)';
    if (errEl) errEl.textContent='Must be ≥ 0';
    inp.value=''; return false;
  }
  if (val > max) {
    inp.style.borderColor='var(--danger)';
    if (errEl) errEl.textContent=`Max is ${max}`;
    setTimeout(()=>{ inp.value=max; inp.style.borderColor='var(--accent)';
      if(errEl) errEl.textContent=`Capped at ${max}`;
      setTimeout(()=>{ inp.style.borderColor=''; if(errEl) errEl.textContent=''; },1500);
    },600);
    return false;
  }
  if (errEl) errEl.textContent='';
  return true;
}

function erToggleRowAbsent(idx) {
  const cb   = document.getElementById(`er-ab-${idx}`);
  const tInp = document.getElementById(`er-t-${idx}`);
  const pInp = document.getElementById(`er-p-${idx}`);
  const row  = document.getElementById(`er-row-${idx}`);
  const abs  = cb?.checked;
  [tInp,pInp].forEach(el=>{ if(el){ el.disabled=abs; el.value=abs?'':el.value; el.style.opacity=abs?'0.35':'1'; }});
  if (row) row.style.background = abs ? 'rgba(239,68,68,0.06)' : '';
}

function erToggleAbsentCol() {
  const show = document.getElementById('er-show-absent')?.checked;
  document.querySelectorAll('.er-absent-col').forEach(td=>{ td.style.display=show?'':'none'; });
  const th = document.getElementById('er-absent-th');
  if (th) th.style.display = show ? '' : 'none';
  if (!show) erStudents.forEach((_,i)=>{ const cb=document.getElementById(`er-ab-${i}`); if(cb){cb.checked=false;erToggleRowAbsent(i);} });
}

function erFillAllAbsent() {
  const cb = document.getElementById('er-show-absent');
  if (cb) { cb.checked=true; erToggleAbsentCol(); }
  erStudents.forEach((_,i)=>{ const c=document.getElementById(`er-ab-${i}`); if(c){c.checked=true;erToggleRowAbsent(i);} });
}

function erClearAll() {
  erStudents.forEach((_,i)=>{
    const t=document.getElementById(`er-t-${i}`), p=document.getElementById(`er-p-${i}`), cb=document.getElementById(`er-ab-${i}`);
    if(t){t.value='';t.disabled=false;t.style.opacity='1';}
    if(p){p.value='';p.disabled=false;p.style.opacity='1';}
    if(cb) cb.checked=false;
    const row=document.getElementById(`er-row-${i}`); if(row) row.style.background='';
  });
}

async function erSaveResults() {
  const cls     = document.getElementById('er-class').value;
  const exam    = document.getElementById('er-exam').value;
  const subject = document.getElementById('er-subject').value;
  const max     = parseInt(document.getElementById('er-max').value)  || 0;
  const pass    = parseInt(document.getElementById('er-pass').value) || 0;
  const pmax    = parseInt(document.getElementById('er-pmax').value) || 0;
  const session = document.getElementById('er-session').value || '2025-26';
  if (!cls||!exam||!subject||!max) { showFormMsg('er-save-msg','error','Please complete Step 1 first.'); return; }
  const scores=[]; let hasError=false, filledCount=0;
  erStudents.forEach((s,i)=>{
    const tInp=document.getElementById(`er-t-${i}`), pInp=document.getElementById(`er-p-${i}`);
    const absCb=document.getElementById(`er-ab-${i}`);
    const absent=absCb?.checked||false;
    if(!absent&&tInp?.value==='') return;
    const theory=absent?0:(parseFloat(tInp?.value)||0);
    const prac=absent?0:(parseFloat(pInp?.value)||0);
    if(!absent){ if(theory>max){if(tInp)tInp.style.borderColor='var(--danger)';hasError=true;} if(pmax&&prac>pmax){if(pInp)pInp.style.borderColor='var(--danger)';hasError=true;} }
    scores.push({studentName:s.name,fatherName:s.father,subject,maxMarks:max,passMarks:pass,theoryObt:theory,practicalMax:pmax,practicalObt:prac,isAbsent:absent});
    filledCount++;
  });
  if (hasError) { showFormMsg('er-save-msg','error','❌ Some marks exceed maximum. Fix highlighted fields.'); return; }
  if (!filledCount) { showFormMsg('er-save-msg','error','No marks entered.'); return; }
  const btn=document.querySelector('#er-marks-section .form-btn.primary');
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  try {
    const result=await api({action:'addExamResults',token:SESSION_TOKEN,class:cls,examType:exam,session,examId:`${exam.toUpperCase()}-${session.replace('-','')}`,scores:JSON.stringify(scores)});
    if(result.success){
      showFormMsg('er-save-msg','success',`✅ ${result.message} (${filledCount} students saved)`);
      scores.forEach((sc,i)=>{ const row=document.getElementById(`er-row-${i}`); if(row) row.style.background=sc.isAbsent?'rgba(239,68,68,0.06)':'rgba(16,185,129,0.06)'; });
    } else showFormMsg('er-save-msg','error','❌ '+(result.error||'Save failed'));
  } catch(e) { showFormMsg('er-save-msg','error','❌ '+e.message); }
  if(btn){btn.disabled=false;btn.textContent='💾 Save All Results';}
}

// ── VIEW TESTS ────────────────────────────────────────────────────
async function loadTestView() {
  const cls  = document.getElementById('tv-class')?.value||'';
  const type = document.getElementById('tv-type')?.value||'';
  const body = document.getElementById('test-view-body');
  if (!body) return;
  body.innerHTML = loader();
  try {
    const d = await api({action:'getTests',token:SESSION_TOKEN,cls,type});
    const tests = d.tests||[];
    if (!tests.length) { body.innerHTML='<div class="empty" style="padding:50px;text-align:center">No test records found</div>'; return; }
    body.innerHTML = tests.map(t=>{
      const valid = t.scores.filter(s=>s.obtained!==null);
      const avg   = valid.length ? (valid.reduce((a,s)=>a+s.obtained,0)/valid.length).toFixed(1) : '—';
      const top   = valid.sort((a,b)=>b.obtained-a.obtained)[0];
      return `
      <details style="background:var(--card);border:1px solid var(--border);border-radius:14px;margin-bottom:12px;overflow:hidden">
        <summary style="padding:16px 20px;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center"
          onmouseover="this.parentElement.style.borderColor='var(--accent2)'"
          onmouseout="this.parentElement.style.borderColor='var(--border)'">
          <div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span style="font-family:'DM Serif Display',serif;font-size:15px">${t.testName}</span>
              <span class="cbadge">${t.class}</span>
              <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${t.type==='monthly'?'rgba(245,158,11,.12)':'rgba(6,182,212,.12)'};color:${t.type==='monthly'?'var(--accent)':'var(--accent2)'}">${t.type}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px">${t.subject} · ${t.date} · ${t.scores.length} students · Max ${t.maxMarks}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--accent)">Avg: ${avg}</div>
            ${top?`<div style="font-size:11px;color:var(--muted)">Top: ${top.name} (${top.obtained})</div>`:''}
          </div>
        </summary>
        <div style="padding:0 20px 16px">
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
            <thead><tr style="background:var(--subtle)">
              <th style="padding:7px 10px;text-align:left;color:var(--muted);font-size:10px;text-transform:uppercase">#</th>
              <th style="padding:7px 10px;text-align:left;color:var(--muted);font-size:10px;text-transform:uppercase">Student</th>
              <th style="padding:7px 10px;text-align:center;color:var(--muted);font-size:10px;text-transform:uppercase">Marks</th>
              <th style="padding:7px 10px;text-align:center;color:var(--muted);font-size:10px;text-transform:uppercase">%</th>
              <th style="padding:7px 10px;text-align:center;color:var(--muted);font-size:10px;text-transform:uppercase">Grade</th>
            </tr></thead>
            <tbody>
              ${[...t.scores].sort((a,b)=>(b.obtained||0)-(a.obtained||0)).map((sc,i)=>{
                const pct   = sc.obtained!=null ? ((sc.obtained/t.maxMarks)*100).toFixed(0) : null;
                const grade = getGrade(sc.obtained, t.maxMarks);
                return `<tr style="border-top:1px solid rgba(30,45,69,.4)">
                  <td style="padding:7px 10px;color:var(--muted);font-size:11px">${i+1}</td>
                  <td style="padding:7px 10px;font-weight:500">${sc.name}</td>
                  <td style="padding:7px 10px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:${sc.obtained===null?'var(--muted)':sc.obtained/t.maxMarks>=0.6?'var(--accent3)':'var(--danger)'}">${sc.obtained===null?'AB':sc.obtained+' / '+t.maxMarks}</td>
                  <td style="padding:7px 10px;text-align:center;font-size:12px;color:var(--muted)">${pct!=null?pct+'%':'—'}</td>
                  <td style="padding:7px 10px;text-align:center"><span class="grade-pill grade-${grade}">${grade}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </details>`;
    }).join('');
  } catch(e) { body.innerHTML = errorBox(e.message); }
}

// ── VIEW EXAM RESULTS ─────────────────────────────────────────────
async function loadExamView() {
  const examType = document.getElementById('ev-exam')?.value  || '';
  const cls      = document.getElementById('ev-class')?.value || '';
  const body     = document.getElementById('exam-view-body');
  if (!body) return;
  body.innerHTML = loader();
  try {
    const d = await api({action:'getExamResults',token:SESSION_TOKEN,examType,cls,session:'2025-26'});
    const results = d.results || [];
    if (!results.length) {
      body.innerHTML = `<div class="empty" style="padding:50px;text-align:center">
        <div style="font-size:40px;margin-bottom:12px;opacity:.4">📋</div>
        No exam results found. Add results using the "Add Exam Result" tab.</div>`;
      return;
    }
    // Group by examId + subject
    const grouped = {};
    results.forEach(r => {
      const key = (r.examId||r.examType) + ' · ' + r.subject + ' · Class ' + r.class;
      if (!grouped[key]) grouped[key] = {key, examType:r.examType, subject:r.subject, class:r.class, maxMarks:r.maxMarks, passMarks:r.passMarks, rows:[]};
      grouped[key].rows.push(r);
    });
    body.innerHTML = Object.values(grouped).map(g => {
      const valid   = g.rows.filter(r=>!r.isAbsent && r.totalObt!=null);
      const avg     = valid.length ? (valid.reduce((a,r)=>a+(r.totalObt||0),0)/valid.length).toFixed(1) : '—';
      const passed  = valid.filter(r=>(r.totalObt||0)>=(r.passMarks||0)).length;
      const top     = valid.sort((a,b)=>(b.totalObt||0)-(a.totalObt||0))[0];
      const examLabel = {pq:'Pre-Quarterly',hy:'Half Yearly',annual:'Annual',ut1:'Unit Test 1',ut2:'Unit Test 2'}[g.examType] || g.examType;
      return `
      <details style="background:var(--card);border:1px solid var(--border);border-radius:14px;margin-bottom:12px;overflow:hidden">
        <summary style="padding:16px 20px;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"
          onmouseover="this.parentElement.style.borderColor='var(--accent2)'"
          onmouseout="this.parentElement.style.borderColor='var(--border)'">
          <div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span style="font-family:'DM Serif Display',serif;font-size:15px">${g.subject}</span>
              <span class="cbadge">Class ${g.class}</span>
              <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(245,158,11,.12);color:var(--accent)">${examLabel}</span>
            </div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px">
              ${g.rows.length} students · Max ${g.maxMarks} · Pass ${g.passMarks} · ${passed}/${valid.length} passed
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--accent)">Avg: ${avg}</div>
            ${top?`<div style="font-size:11px;color:var(--muted)">Top: ${top.studentName} (${top.totalObt})</div>`:''}
          </div>
        </summary>
        <div style="padding:0 20px 16px">
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
            <thead><tr style="background:var(--subtle)">
              <th style="padding:7px 10px;text-align:left;color:var(--muted);font-size:10px;text-transform:uppercase">#</th>
              <th style="padding:7px 10px;text-align:left;color:var(--muted);font-size:10px;text-transform:uppercase">Student</th>
              <th style="padding:7px 10px;text-align:center;color:var(--muted);font-size:10px;text-transform:uppercase">Theory</th>
              ${g.rows.some(r=>r.practicalMax>0)?'<th style="padding:7px 10px;text-align:center;color:var(--muted);font-size:10px;text-transform:uppercase">Practical</th>':''}
              <th style="padding:7px 10px;text-align:center;color:var(--muted);font-size:10px;text-transform:uppercase">Total</th>
              <th style="padding:7px 10px;text-align:center;color:var(--muted);font-size:10px;text-transform:uppercase">%</th>
              <th style="padding:7px 10px;text-align:center;color:var(--muted);font-size:10px;text-transform:uppercase">Grade</th>
              <th style="padding:7px 10px;text-align:center;color:var(--muted);font-size:10px;text-transform:uppercase">Result</th>
            </tr></thead>
            <tbody>
              ${[...g.rows].sort((a,b)=>(b.totalObt||0)-(a.totalObt||0)).map((r,i)=>{
                const absent  = r.isAbsent;
                const total   = absent ? null : (r.totalObt||0);
                const pct     = total!=null ? ((total/g.maxMarks)*100).toFixed(0) : null;
                const grade   = getGrade(total, g.maxMarks);
                const isPassed = !absent && total!=null && total >= (r.passMarks||g.passMarks||0);
                const hasPrac  = g.rows.some(x=>x.practicalMax>0);
                return `<tr style="border-top:1px solid rgba(30,45,69,.4)${absent?' opacity:.6':''}">
                  <td style="padding:7px 10px;color:var(--muted);font-size:11px">${i+1}</td>
                  <td style="padding:7px 10px;font-weight:500">${r.studentName}</td>
                  <td style="padding:7px 10px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12px;color:${absent?'var(--muted)':'var(--text)'}">${absent?'AB':(r.theoryObt||0)}</td>
                  ${hasPrac?`<td style="padding:7px 10px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted)">${absent?'—':(r.practicalObt||0)}</td>`:''}
                  <td style="padding:7px 10px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:${absent?'var(--muted)':isPassed?'var(--accent3)':'var(--danger)'}">${absent?'AB':total+' / '+g.maxMarks}</td>
                  <td style="padding:7px 10px;text-align:center;font-size:12px;color:var(--muted)">${pct!=null?pct+'%':'—'}</td>
                  <td style="padding:7px 10px;text-align:center"><span class="grade-pill grade-${grade}">${grade}</span></td>
                  <td style="padding:7px 10px;text-align:center;font-size:11px;font-weight:700;color:${absent?'var(--muted)':isPassed?'var(--accent3)':'var(--danger)'}">${absent?'Absent':isPassed?'✓ Pass':'✗ Fail'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </details>`;
    }).join('');
  } catch(e) { body.innerHTML = errorBox(e.message); }
}

// Keep loadExamResultsPage as alias in case anything references it
function loadExamResultsPage() { loadTestsAdminPage(); }

// (unified page — see loadTestsAdminPage above)


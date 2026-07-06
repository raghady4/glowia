const SK  = "glowia_pts_v3";
const SPK = "glowia_plans_v3";
const SSK = "glowia_sessions_v1";
const SYK = "glowia_sync_cfg_v1";
const SMK = "glowia_monthly_v1";

let patients = [];
let plans    = {};
let sessions = [];
let monthly  = {};
let editId   = null;
let delId    = null;
let planPtId = null;
let editSessionId   = null;
let sessionModalMode = "free";

/* ─── قياسات الجلسات ─── */
const SESSION_AREA_LABELS = [
  { test:/بطن/,    m1:"قياس الخصر", m2:"قياس البطن" },
  { test:/فخذين/,  m1:"فخذ يمين",   m2:"فخذ يسار"  },
  { test:/ذراعين/, m1:"ذراع يمين",  m2:"ذراع يسار" },
];

/* ─── الأيام والوجبات ─── */
const DAYS  = ["السبت","الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"];
const MEALS = [
  { id:"فطور",  label:"فطور",  isSnack:false },
  { id:"سناك1", label:"سناك",  isSnack:true  },
  { id:"غداء",  label:"غداء",  isSnack:false },
  { id:"سناك2", label:"سناك",  isSnack:true  },
  { id:"عشاء",  label:"عشاء",  isSnack:false },
];

/* ─── خريطة حقول المريض — KEY → ELEMENT_ID ─── */
const FM = {
  name         : "fName",
  weight       : "fWeight",
  height       : "fHeight",
  age          : "fAge",
  bioAge       : "fBioAge",
  bmi          : "fBmi",
  bmiNote      : "fBmiNote",
  fat          : "fFat",
  targetWeight : "fTargetWeight",
  muscles      : "fMuscles",
  musclesGoal  : "fMusclesGoal",
  legR         : "fLegR",
  legL         : "fLegL",
  legT         : "fLegT",
  armR         : "fArmR",
  armL         : "fArmL",
  armT         : "fArmT",
  trunk        : "fTrunk",
  trunkT       : "fTrunkT",
  chest        : "fChest",
  waist        : "fWaist",
  hip          : "fHip",
  lowerAbdomen : "fLowerAbdomen",
  forearmR     : "fForearmR",
  forearmL     : "fForearmL",
  thighR       : "fThighR",
  thighL       : "fThighL",
  notes        : "fNotes",
};

/* ════════════════════════════════════════
   التهيئة
════════════════════════════════════════ */
function init() {
  load();
  buildPlanTable();
  setDate();
  render();
}

function setDate() {
  const d = new Date();
  const s = d.toLocaleDateString("ar-SA",{weekday:"short",year:"numeric",month:"short",day:"numeric"});
  const el = document.getElementById("hDate");
  if (el) el.textContent = s;
  const npDate = document.getElementById("npDate");
  if (npDate) npDate.value = d.toLocaleDateString("ar-SA");
}

/* ─── تحميل / حفظ ─── */
function load() {
  try { patients = JSON.parse(localStorage.getItem(SK)  || "[]"); } catch { patients=[]; }
  try { plans    = JSON.parse(localStorage.getItem(SPK) || "{}"); } catch { plans={}; }
  try { sessions = JSON.parse(localStorage.getItem(SSK) || "[]"); } catch { sessions=[]; }
  try { monthly  = JSON.parse(localStorage.getItem(SMK) || "{}"); } catch { monthly={}; }
}
function saveAll()       { localStorage.setItem(SK,  JSON.stringify(patients)); }
function savePlanStore() { localStorage.setItem(SPK, JSON.stringify(plans));    }
function saveSessions()  { localStorage.setItem(SSK, JSON.stringify(sessions)); }
function saveMonthly()   { localStorage.setItem(SMK, JSON.stringify(monthly));  }

/* ════════════════════════════════════════
   التنقل
════════════════════════════════════════ */
function navTo(pageId, el) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.querySelectorAll(".mob-nav-item").forEach(n => n.classList.remove("active"));
  const page = document.getElementById("page-"+pageId);
  if (page) page.classList.add("active");
  document.querySelectorAll("[data-page="+pageId+"]").forEach(n => n.classList.add("active"));
  if (pageId==="dashboard") render();
  if (pageId==="nutrition") loadPlanUI();
  if (pageId==="sessions")  { populateSessionPatientList(); renderSessionsTable(); }
  if (pageId==="monthly")   { populateMonthlyPatientList(); }
  if (pageId==="sync")      initSyncUI();
  const main = document.getElementById("mainArea");
  if (main) main.scrollTop = 0;
}

/* ════════════════════════════════════════
   CRUD المرضى — منع التداخل
════════════════════════════════════════ */
function doNewPatient() {
  editId = null; planPtId = null;
  clearFm();
  setText("fmTitle",'إضافة <span class="accent">مريض جديد</span>', true);
  setText("fmSub","أدخلي بيانات المريض بالكامل");
  setPatientCtx(null);
  toggleExportButtons(false);
}

function clearFm() {
  Object.values(FM).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function readFm() {
  const d = {};
  Object.entries(FM).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    let v = el.value.trim();
    if (el.type === "number") {
      d[key] = v === "" ? null : parseFloat(v);
    } else {
      d[key] = v || "";
    }
  });
  return d;
}

function fillFm(p) {
  clearFm();
  Object.entries(FM).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el || p[key] === undefined || p[key] === null) return;
    
    if (typeof p[key] === "number") {
      el.value = p[key];
    } else {
      el.value = p[key];
    }
  });
}

function savePatient() {
  const d = readFm();
  if (!d.name) {
    toast("يرجى إدخال اسم المريض", true);
    document.getElementById("fName")?.focus();
    return;
  }

  if (editId) {
    const i = patients.findIndex(x => x.id === editId);
    if (i > -1) {
      patients[i] = {
        id        : patients[i].id,
        createdAt : patients[i].createdAt,
        ...d,
        updatedAt : new Date().toISOString()
      };
      toast("تم تحديث بيانات المريض بنجاح ✅");
    } else {
      toast("لم يُعثر على المريض، حاولي مرة أخرى", true);
      return;
    }
  } else {
    const np = {
      id        : uid(),
      ...d,
      createdAt : new Date().toISOString(),
      updatedAt : new Date().toISOString()
    };
    patients.push(np);
    editId   = np.id;
    planPtId = np.id;
    toast("تم حفظ المريض بنجاح ✅");
    toggleExportButtons(true);
  }
  saveAll();
  updateBadge();
  updateStats();
  setPatientCtx(d.name);
}

function loadPatient(id) {
  const p = patients.find(x => x.id === id);
  if (!p) return;
  editId = id; planPtId = id;
  fillFm(p);
  setText("fmTitle",'تعديل <span class="accent">'+(p.name||"المريض")+"</span>", true);
  setText("fmSub","راجعي وعدّلي بيانات المريض");
  setPatientCtx(p.name);
  toggleExportButtons(true);
  navTo("patient", document.querySelector("[data-page=patient]"));
}

function gotoNutrition() {
  const d = readFm();
  if (d.name) savePatient();
  navTo("nutrition", document.querySelector("[data-page=nutrition]"));
}

function openNutrition(id) {
  const p = patients.find(x => x.id === id);
  if (!p) return;
  editId = id; planPtId = id;
  fillFm(p);
  setPatientCtx(p.name);
  setText2("npName", p.name||"—");
  setVal("npNameIn", p.name||"");
  loadPlanUI();
  navTo("nutrition", document.querySelector("[data-page=nutrition]"));
}

function toggleExportButtons(show) {
  const banner = document.getElementById("exportBanner");
  const btnBot = document.getElementById("exportBtnBottom");
  if (banner) banner.style.display = show ? "flex" : "none";
  if (btnBot) btnBot.style.display = show ? ""    : "none";
}

function setPatientCtx(name) {
  const el = document.getElementById("hPatientTag");
  if (!el) return;
  if (name) { el.textContent = name; el.classList.add("visible"); }
  else      { el.textContent = ""; el.classList.remove("visible"); }
}

/* ─── مساعدات DOM ─── */
function setText(id, html, isHTML=false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (isHTML) el.innerHTML = html;
  else el.textContent = html;
}
function setText2(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
function setVal(id, v) {
  const el = document.getElementById(id);
  if (el) el.value = v;
}

/* ════════════════════════════════════════
   لوحة التحكم
════════════════════════════════════════ */
function render() { renderTable(); updateStats(); updateBadge(); }

function renderTable() {
  const q     = (document.getElementById("searchQ")?.value||"").trim().toLowerCase();
  const f     = q ? patients.filter(p=>(p.name||"").toLowerCase().includes(q)) : patients;
  const body  = document.getElementById("patientsBody");
  const empty = document.getElementById("dashEmpty");
  if (!body) return;
  if (!f.length) {
    body.innerHTML="";
    if (empty) empty.style.display="";
    return;
  }
  if (empty) empty.style.display="none";
  const sorted = [...f].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  body.innerHTML = sorted.map((p,i)=>{
    const hasPlan = !!plans[p.id];
    return `<tr>
      <td style="color:var(--muted);font-size:0.76rem;">${i+1}</td>
      <td><div class="pt-name-cell"><div class="av">${initials(p.name)}</div><div>
        <div style="font-weight:600;">${escapeHtml(p.name||"—")}</div>
        ${hasPlan?'<div class="pt-sub">لديه برنامج غذائي</div>':""}
      </div></div></td>
      <td>${bmiChip(p.bmi)}</td>
      <td>${p.weight?p.weight+" kg":"—"}</td>
      <td>${p.height?p.height+" cm":"—"}</td>
      <td>${p.age?p.age+" سنة":"—"}</td>
      <td><span class="date-chip">${fmtDate(p.createdAt)}</span></td>
      <td><div class="act-cell">
        <button class="btn btn-outline btn-xs" onclick="loadPatient('${p.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
        <button class="btn btn-xs" style="background:var(--mauve-pale);color:var(--mauve);border:1.5px solid var(--mauve-light);" onclick="openNutrition('${p.id}')"><i class="fa-solid fa-utensils"></i> برنامج</button>
        <button class="btn btn-xs" style="background:var(--lavender-pale);color:var(--lavender);border:1.5px solid var(--lavender-light);" onclick="openMonthlyForPatient('${p.id}')"><i class="fa-solid fa-chart-line"></i> متابعة</button>
        <button class="btn btn-xs" style="background:#fff0f0;color:#b02020;border:1.5px solid #f5c6c6;" onclick="askDelete('${p.id}')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join("");
}

function updateStats() {
  const today = new Date().toDateString();
  setText2("stTotal",  patients.length);
  setText2("stToday",  patients.filter(p=>new Date(p.createdAt).toDateString()===today).length);
  setText2("stGoal",   patients.filter(p=>p.targetWeight).length);
  setText2("stPlans",  Object.keys(plans).filter(id=>patients.find(p=>p.id===id)).length);
}
function updateBadge() { setText2("navCount", patients.length); }

/* ════════════════════════════════════════
   الحذف
════════════════════════════════════════ */
function askDelete(id) { delId=id; document.getElementById("delOverlay").classList.add("open"); }
function closeDialog() { delId=null; document.getElementById("delOverlay").classList.remove("open"); }
function confirmDelete() {
  if (!delId) return;
  patients = patients.filter(x=>x.id!==delId);
  delete plans[delId]; delete monthly[delId];
  saveAll(); savePlanStore(); saveMonthly();
  if (editId===delId)   { editId=null; clearFm(); setPatientCtx(null); toggleExportButtons(false); }
  if (planPtId===delId) planPtId=null;
  delId=null; closeDialog(); render();
  toast("تم حذف المريض بنجاح");
}

/* ════════════════════════════════════════
   المتابعة الشهرية الموسّعة
   (إضافة كافة القياسات وتحسين عرض البطاقات)
════════════════════════════════════════ */
let currentMonthlyPtId = null;

/* حقول القياس الشهري الكاملة (تشمل جميع الحقول من إضافة مريض) */
const MONTHLY_FIELDS = [
  // أساسيات
  { id: "mDate",         label: "التاريخ",         unit: "",     group: "أساسيات" },
  { id: "mWeight",       label: "الوزن",            unit: "kg",   group: "أساسيات" },
  { id: "mBioAge",       label: "العمر البيولوجي", unit: "سنة", group: "أساسيات" },
  { id: "mBmi",          label: "BMI",              unit: "",     group: "أساسيات" },
  { id: "mFat",          label: "نسبة الدهون",     unit: "kg",   group: "أساسيات" },
  { id: "mMuscles",      label: "العضلات",         unit: "kg",   group: "أساسيات" },
  { id: "mTargetWeight", label: "الوزن المستهدف",  unit: "kg",   group: "أساسيات" },

  // قياسات المحيط
  { id: "mChest",        label: "الصدر",            unit: "cm",   group: "القياسات" },
  { id: "mWaist",        label: "الخصر",            unit: "cm",   group: "القياسات" },
  { id: "mHip",          label: "الورك",            unit: "cm",   group: "القياسات" },
  { id: "mAbdomen",      label: "البطن",            unit: "cm",   group: "القياسات" },
  { id: "mLowerAbdomen", label: "البطن السفلي",     unit: "cm",   group: "القياسات" },

  // عضلات
  { id: "mArmR",         label: "ذراع يمين",       unit: "kg",   group: "العضلات" },
  { id: "mArmL",         label: "ذراع يسار",       unit: "kg",   group: "العضلات" },
  { id: "mArmT",         label: "هدف الذراعين",    unit: "kg",   group: "العضلات" },
  { id: "mLegR",         label: "ساق يمين",        unit: "kg",   group: "العضلات" },
  { id: "mLegL",         label: "ساق يسار",        unit: "kg",   group: "العضلات" },
  { id: "mLegT",         label: "هدف الساقين",     unit: "kg",   group: "العضلات" },
  { id: "mTrunk",        label: "الجذع",            unit: "kg",   group: "العضلات" },
  { id: "mTrunkT",       label: "هدف الجذع",       unit: "kg",   group: "العضلات" },

  // قياسات دقيقة
  { id: "mForearmR",     label: "الزند يمين",      unit: "cm",   group: "قياسات دقيقة" },
  { id: "mForearmL",     label: "الزند يسار",      unit: "cm",   group: "قياسات دقيقة" },
  { id: "mThighR",       label: "الفخذ يمين",      unit: "cm",   group: "قياسات دقيقة" },
  { id: "mThighL",       label: "الفخذ يسار",      unit: "cm",   group: "قياسات دقيقة" },
];
/* تحديث renderMonthlyCards لاستخدام بطاقات جميلة */
function renderMonthlyCards() {
  if (!currentMonthlyPtId) return;
  const container = document.getElementById("monthlyCardsContainer");
  const empty = document.getElementById("monthlyEmpty");

  let list = (monthly[currentMonthlyPtId] || []).slice().sort((a,b) => new Date(b.mDate) - new Date(a.mDate));

  if (!list.length) {
    container.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  let html = `<div class="history-cards-grid">`;

  list.forEach((rec, idx) => {
    const prev = idx + 1 < list.length ? list[idx + 1] : null;
    
    let metricsHTML = '';
    MONTHLY_FIELDS.forEach(f => {
      if (f.id === "mDate" || !rec[f.id]) return;
      const val = rec[f.id];
      let diffHTML = '';

      if (prev && prev[f.id]) {
        const diff = (parseFloat(val) - parseFloat(prev[f.id])).toFixed(1);
        const isLoss = parseFloat(diff) < 0;
        diffHTML = `<span style="color:${isLoss?'#2d9a50':'#d42020'}; font-weight:700; font-size:0.8rem;">
          ${isLoss ? '▼' : '▲'} ${diff} ${f.unit}
        </span>`;
      }

      metricsHTML += `
        <div class="metric-badge">
          <span class="metric-label">${f.label}</span>
          <span class="metric-val">${val} ${f.unit}</span>
          ${diffHTML}
        </div>`;
    });

    html += `
      <div class="history-record-card">
        <div class="record-card-header">
          <span class="record-card-date"><i class="fas fa-calendar"></i> ${rec.mDate}</span>
          <button class="btn btn-xs" onclick="deleteMonthlyRecord('${rec.id}')" style="color:#b02020;background:#fff0f0;">حذف</button>
        </div>
        <div class="record-card-body">${metricsHTML}</div>
        ${rec.mNotes ? `<div class="monthly-rec-notes">${escapeHtml(rec.mNotes)}</div>` : ''}
      </div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

function populateMonthlyPatientList() {
  const sel = document.getElementById("monthlyPatientSelect");
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- اختاري مريضة --</option>';
  patients.forEach(p => {
    sel.innerHTML += `<option value="${p.id}"${cur===p.id?" selected":""}>${escapeHtml(p.name||"—")}</option>`;
  });
  if (cur) loadMonthlyData();
}

function openMonthlyForPatient(id) {
  navTo("monthly", document.querySelector("[data-page=monthly]"));
  setTimeout(()=>{
    const sel = document.getElementById("monthlyPatientSelect");
    if (sel) { sel.value=id; loadMonthlyData(); }
  }, 100);
}

function loadMonthlyData() {
  const sel = document.getElementById("monthlyPatientSelect");
  if (!sel) return;
  
  const id = sel.value;
  currentMonthlyPtId = id || null;
  
  const card = document.getElementById("monthlyTableCard");
  const sumDiv = document.getElementById("monthlySummaryCards");

  if (!id) {
    if (card) card.style.display = "none";
    if (sumDiv) sumDiv.style.display = "none";
    return;
  }

  const p = patients.find(x => x.id === id);
  setText2("monthlyPatientTitle", "سجل التغيرات — " + (p?.name || ""));

  if (card) card.style.display = "";

  // === الجزء الجديد: إنشاء تلقائي لأول قياس ===
  if (!monthly[id] || monthly[id].length === 0) {
    createInitialMonthlyRecord(id);
  }

  renderMonthlyCards();
  renderMonthlySummary();
}

function createInitialMonthlyRecord(ptId) {
  const p = patients.find(x => x.id === ptId);
  if (!p) return;

  const today = new Date().toISOString().slice(0, 10); // التاريخ الحالي

  const initialRec = {
    id: uid(),
    mDate: today,
    createdAt: new Date().toISOString(),
    mWeight: p.weight || "",
    mBioAge: p.bioAge || "",
    mBmi: p.bmi || "",
    mFat: p.fat || "",
    mMuscles: p.muscles || "",
    mTargetWeight: p.targetWeight || "",
    mChest: p.chest || "",
    mWaist: p.waist || "",
    mHip: p.hip || "",
    mAbdomen: "", 
    mLowerAbdomen: p.lowerAbdomen || "",
    mArmR: p.armR || "",
    mArmL: p.armL || "",
    mArmT: p.armT || "",
    mLegR: p.legR || "",
    mLegL: p.legL || "",
    mLegT: p.legT || "",
    mTrunk: p.trunk || "",
    mTrunkT: p.trunkT || "",
    mForearmR: p.forearmR || "",
    mForearmL: p.forearmL || "",
    mThighR: p.thighR || "",
    mThighL: p.thighL || "",
    mNotes: "القياس الأولي - من بيانات التسجيل الأساسية"
  };

  monthly[ptId] = [initialRec];
  saveMonthly();
  toast(`تم إنشاء أول قياس شهري تلقائياً لـ ${p.name}`);
}


/* ── عرض القياسات كبطاقات تفاعلية أنيقة ── */
function renderMonthlyCards() {
  if (!currentMonthlyPtId) return;
  const container = document.getElementById("monthlyCardsContainer");
  const empty     = document.getElementById("monthlyEmpty");
  if (!container) return;

  const list = (monthly[currentMonthlyPtId]||[]).slice().sort((a,b)=>a.month>b.month?1:-1);

  if (!list.length) {
    container.innerHTML="";
    if (empty) empty.style.display="";
    return;
  }
  if (empty) empty.style.display="none";

  const trendIcon = (diff) => {
    if (diff===null||isNaN(diff)) return "";
    if (diff<0) return `<div style="color:#2d9a50;font-weight:700;font-size:0.75rem; background:#e8f8ee; padding:2px 6px; border-radius:4px;">▼ ${diff}</div>`;
    if (diff>0) return `<div style="color:#d42020;font-weight:700;font-size:0.75rem; background:#ffeaea; padding:2px 6px; border-radius:4px;">▲ +${diff}</div>`;
    return `<div style="color:#888;font-size:0.75rem; background:#f5f0fa; padding:2px 6px; border-radius:4px;">— 0</div>`;
  };

  container.innerHTML = list.map((rec, idx)=>{
    const prev = idx>0 ? list[idx-1] : null;

    const groups = {};
    MONTHLY_FIELDS.forEach(f => {
      if (!groups[f.group]) groups[f.group]=[];
      const val  = rec[f.id] !== undefined ? rec[f.id] : "";
      const pVal = prev?.[f.id];
      const diff = (val!==undefined&&val!==""&&pVal!==undefined&&pVal!=="")
                   ? (parseFloat(val)-parseFloat(pVal)).toFixed(1) : null;
      groups[f.group].push({...f, val, diff});
    });

    const groupsHTML = Object.entries(groups).map(([gName, fields])=>{
      const cells = fields.filter(f=>f.val!==undefined&&f.val!=="").map(f=>`
        <div style="background:#fdf8ff; border:1px solid #f0e8fa; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:4px; text-align:center;">
          <span style="font-size:0.75rem; color:var(--ink-soft); font-weight:600;">${f.label}</span>
          <span style="font-weight:800; font-size:1rem; color:var(--mauve);">${f.val} <small style="font-size:0.65rem;color:var(--muted);">${f.unit}</small></span>
          ${f.diff !== null ? trendIcon(parseFloat(f.diff)) : ''}
        </div>`).join("");
      
      return cells ? `
        <div style="margin-bottom:16px;">
          <div style="font-size:0.8rem;font-weight:800;color:var(--mauve);letter-spacing:1px;margin-bottom:8px; border-bottom:1px dashed #e0d0f0; padding-bottom:4px;">${gName}</div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:10px;">${cells}</div>
        </div>` : "";
    }).join("");

    return `
      <div class="monthly-rec-card" style="background:#fff; border:1px solid var(--card-border); border-radius:var(--r-lg); padding:20px; margin-bottom:16px; box-shadow:var(--sh-xs);">
        <div class="monthly-rec-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <span class="monthly-rec-month" style="font-size:1.1rem; font-weight:800; color:var(--text-head); background:var(--mauve-pale); padding:4px 12px; border-radius:var(--r-pill);">${rec.month||"—"}</span>
          <button class="btn btn-xs" style="background:#fff0f0;color:#b02020;border:1.5px solid #f5c6c6;" onclick="deleteMonthlyRecord('${rec.id}')"><i class="fa-solid fa-trash"></i> حذف الشهر</button>
        </div>
        <div class="monthly-rec-body">${groupsHTML||'<div style="color:var(--muted);font-size:0.8rem;text-align:center;padding:10px;">لا توجد قياسات مسجلة لهذا الشهر</div>'}</div>
        ${rec.notes?`<div class="monthly-rec-notes" style="margin-top:12px; padding:10px; background:#fffbf0; border-right:3px solid #ffcc00; font-size:0.85rem;"><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(rec.notes)}</div>`:""}
      </div>`;
  }).join("");
}

function renderMonthlySummary() {
  if (!currentMonthlyPtId) return;
  const list   = (monthly[currentMonthlyPtId]||[]).slice().sort((a,b)=>a.month>b.month?1:-1);
  const sumDiv = document.getElementById("monthlySummaryCards");
  const grid   = document.getElementById("monthlySummaryGrid");
  if (!sumDiv||!grid||list.length<2) { if (sumDiv) sumDiv.style.display="none"; return; }

  const first=list[0], last=list[list.length-1];
  const diffCard=(label,f1,f2,icon,unit="kg")=>{
    if (!f1||!f2) return "";
    const diff=(parseFloat(f2)-parseFloat(f1)).toFixed(1);
    const isDown=parseFloat(diff)<0;
    const color=isDown?"#2d9a50":"#d42020";
    const bg=isDown?"#e8f8ee":"#ffeaea";
    return `<div class="stat-card">
      <div class="stat-icon-wrap" style="background:${bg};color:${color};font-size:1rem;"><i class="fa-solid ${icon}"></i></div>
      <div class="stat-val" style="color:${color};font-size:1.4rem;">${parseFloat(diff)>0?"+":""}${diff} ${unit}</div>
      <div class="stat-lbl">${label}</div></div>`;
  };

  const html=[
    diffCard("تغير الوزن",first.mWeight,last.mWeight,"fa-weight-scale"),
    diffCard("تغير الخصر",first.mWaist,last.mWaist,"fa-ruler","cm"),
    diffCard("تغير الورك",first.mHip,last.mHip,"fa-circle-dot","cm"),
    diffCard("تغير البطن",first.mAbdomen,last.mAbdomen,"fa-circle","cm"),
    diffCard("تغير الدهون",first.mFat,last.mFat,"fa-droplet","kg"),
    diffCard("تغير العضلات",first.mMuscles,last.mMuscles,"fa-dumbbell","kg"),
  ].filter(Boolean).join("");
  if (!html) { sumDiv.style.display="none"; return; }
  grid.innerHTML=html; sumDiv.style.display="";
}

function openAddMonthlyModal() {
  if (!currentMonthlyPtId) {
    toast("اختاري مريضة أولاً", true);
    return;
  }

  const p = patients.find(x => x.id === currentMonthlyPtId);
  
  // تعبئة التاريخ باليوم الحالي
  const today = new Date().toISOString().slice(0, 10);
  setVal("mDate", today);

  // تعبئة الحقول من بيانات المريض (للتسهيل)
  if (p) {
    setVal("mWeight", p.weight || "");
    setVal("mBmi", p.bmi || "");
    setVal("mBioAge", p.bioAge || "");
    setVal("mFat", p.fat || "");
    setVal("mMuscles", p.muscles || "");
    setVal("mTargetWeight", p.targetWeight || "");
    
    setVal("mChest", p.chest || "");
    setVal("mWaist", p.waist || "");
    setVal("mHip", p.hip || "");
    setVal("mLowerAbdomen", p.lowerAbdomen || "");
    setVal("mArmR", p.armR || "");
    setVal("mArmL", p.armL || "");
    setVal("mLegR", p.legR || "");
    setVal("mLegL", p.legL || "");
    // ... باقي الحقول إذا أردت
  }

  // تفريغ الحقول الأخرى
  MONTHLY_FIELDS.forEach(f => {
    if (f.id !== "mDate" && document.getElementById(f.id)) {
      if (!["mWeight","mBmi","mBioAge","mFat","mMuscles","mTargetWeight"].includes(f.id)) {
        document.getElementById(f.id).value = "";
      }
    }
  });

  setVal("mNotes", "");
  document.getElementById("monthlyModal").classList.add("open");
}

function saveMonthlyRecord() {
  if (!currentMonthlyPtId) {
    toast("اختاري مريضة أولاً", true);
    return;
  }

  const dateInput = document.getElementById("mDate")?.value;
  if (!dateInput) {
    toast("يرجى اختيار التاريخ", true);
    document.getElementById("mDate")?.focus();
    return;
  }

  const rec = { 
    id: uid(), 
    mDate: dateInput,
    createdAt: new Date().toISOString() 
  };

  // حفظ كل الحقول
  MONTHLY_FIELDS.forEach(f => {
    if (f.id === "mDate") return;
    const el = document.getElementById(f.id);
    if (el) rec[f.id] = el.value.trim();
  });

  rec.mNotes = document.getElementById("mNotes")?.value.trim() || "";

  if (!monthly[currentMonthlyPtId]) monthly[currentMonthlyPtId] = [];

  // التحقق من وجود قياس بنفس التاريخ
  const existingIndex = monthly[currentMonthlyPtId].findIndex(r => r.mDate === dateInput);
  
  if (existingIndex > -1) {
    if (!confirm("يوجد قياس لهذا التاريخ. هل تريدين استبداله؟")) return;
    monthly[currentMonthlyPtId][existingIndex] = rec;
  } else {
    monthly[currentMonthlyPtId].push(rec);
  }

  saveMonthly();
  document.getElementById("monthlyModal").classList.remove("open");
  renderMonthlyCards();
  renderMonthlySummary();
  toast("تم حفظ القياس الشهري بنجاح ✅");
}
function deleteMonthlyRecord(recId) {
  if (!currentMonthlyPtId) return;
  if (!confirm("هل تريدين حذف هذا القياس؟")) return;
  monthly[currentMonthlyPtId]=(monthly[currentMonthlyPtId]||[]).filter(r=>r.id!==recId);
  saveMonthly(); renderMonthlyCards(); renderMonthlySummary();
  toast("تم الحذف");
}

function exportMonthlyPDF() {
  if (!currentMonthlyPtId) return;
  const p = patients.find(x => x.id === currentMonthlyPtId);
  let list = (monthly[currentMonthlyPtId] || []).slice()
             .sort((a, b) => new Date(a.mDate) - new Date(b.mDate));

  if (!list.length) {
    toast("لا توجد بيانات للتصدير", true);
    return;
  }

  // إعداد الصفوف (القياسات)
  const fields = MONTHLY_FIELDS.filter(f => f.id !== "mDate");

  let rowsHTML = '';
  
  fields.forEach(f => {
    let cells = `<td style="font-weight:700; background:#f5e8ff; padding:10px;">${f.label} (${f.unit})</td>`;
    
    list.forEach(rec => {
      const val = rec[f.id] || '—';
      let diff = '';
      
      // حساب التغيير عن السابق
      const currentIndex = list.findIndex(r => r.id === rec.id);
      if (currentIndex > 0) {
        const prev = list[currentIndex - 1];
        if (prev[f.id] && rec[f.id]) {
          const d = (parseFloat(rec[f.id]) - parseFloat(prev[f.id])).toFixed(1);
          const color = parseFloat(d) < 0 ? '#2d9a50' : (parseFloat(d) > 0 ? '#d42020' : '#666');
          diff = `<br><small style="color:${color};">${parseFloat(d) > 0 ? '+' : ''}${d}</small>`;
        }
      }
      
      cells += `<td style="padding:10px; text-align:center; border:1px solid #e0d0f0;">${val}${diff}</td>`;
    });
    
    rowsHTML += `<tr>${cells}</tr>`;
  });

  // رؤوس الأعمدة (التواريخ)
  let headerDates = list.map(rec => 
    `<th style="padding:10px; background:#7c3aad; color:white; writing-mode:vertical-rl; text-orientation:mixed; height:140px;">${rec.mDate}</th>`
  ).join("");

  const html = `
  <div dir="rtl" style="font-family:'Tajawal',sans-serif; padding:25px; background:white;">
    <div style="display:flex; justify-content:space-between; border-bottom:3px solid #cc6faa; padding-bottom:15px; margin-bottom:20px;">
      <div>
        <div style="color:#7c3aad; font-size:20px; font-weight:800;">Glowia Clinic — عيادة التغذية</div>
        <div style="color:#b0508e; font-weight:700;">الدكتورة صبا وليد الزعبي</div>
      </div>
      <div dir="ltr" style="font-size:12px; color:#555;">sebaalzoubi03@gmail.com<br/>0982720825</div>
    </div>

    <div style="font-size:18px; font-weight:800; color:#7c3aad; margin:20px 0 15px;">سجل المتابعة الشهرية — ${escapeHtml(p?.name || "")}</div>

    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:11px; border:2px solid #c9a8e8;">
        <thead>
          <tr>
            <th style="background:#7c3aad; color:white; padding:12px; text-align:right; min-width:160px;">القياس</th>
            ${headerDates}
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    </div>

    <div style="margin-top:25px; text-align:center; font-size:10px; color:#9070b8;">
      تم إصدار هذا التقرير بواسطة Glowia Clinic
    </div>
  </div>`;

  const target = document.getElementById("pdfTarget");
  target.innerHTML = html;
  target.style.display = "block";

  html2pdf().set({
    margin: [10, 8, 10, 8],
    filename: `Glowia_Monthly_${(p?.name || "").replace(/\s+/g, "_")}.pdf`,
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
  }).from(target).save().then(() => {
    target.style.display = "none";
    toast("✅ تم تصدير التقرير بنجاح");
  });
}

/* ════════════════════════════════════════
   البرنامج الغذائي
════════════════════════════════════════ */
function buildPlanTable() {
  const container=document.getElementById("planTablesContainer");
  if (!container) return;
  container.innerHTML="";
  DAYS.forEach(day=>{
    container.innerHTML+=`
      <div class="day-card">
        <div class="day-header">${day}</div>
        <table class="single-day-table">
          <thead><tr><th class="meal-col">الوجبة</th><th class="content-col">البرنامج الغذائي</th></tr></thead>
          <tbody>${MEALS.map(m=>`
            <tr class="${m.isSnack?"meal-snack":""}">
              <td class="meal-lbl">${m.label}</td>
              <td><textarea id="cell_${m.id}_${day}" placeholder="اكتبي الوجبة هنا..."></textarea></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  });
}

function getPlanData() {
  const d={};
  MEALS.forEach(m=>{
    d[m.id]={};
    DAYS.forEach(day=>{
      const el=document.getElementById(`cell_${m.id}_${day}`);
      d[m.id][day]=el?el.value:"";
    });
  });
  d._inst      = document.getElementById("npInst")?.value||"";
  d._allowed   = document.getElementById("npAllowed")?.value||"";
  d._forbidden = document.getElementById("npForbidden")?.value||"";
  d._name      = document.getElementById("npNameIn")?.value||"";
  d._date      = document.getElementById("npDate")?.value||"";
  d._weight    = document.getElementById("npWeight")?.value||"";
  d._targetW   = document.getElementById("npTargetWeight")?.value||"";
  d._bmi       = document.getElementById("npBmi")?.value||"";
  d._calories  = document.getElementById("npCalories")?.value||"";
  return d;
}

function setPlanData(d) {
  if (!d) return;
  MEALS.forEach(m=>DAYS.forEach(day=>{
    const el=document.getElementById(`cell_${m.id}_${day}`);
    if (el) el.value=(d[m.id]&&d[m.id][day])||"";
  }));
  setVal("npInst",d._inst); setVal("npAllowed",d._allowed); setVal("npForbidden",d._forbidden);
  setVal("npNameIn",d._name); setVal("npDate",d._date);
  setVal("npWeight",d._weight||""); setVal("npTargetWeight",d._targetW||"");
  setVal("npBmi",d._bmi||""); setVal("npCalories",d._calories||"");
  if (d._name) setText2("npName",d._name);
}

function loadPlanUI() {
  const key=planPtId||"_draft";
  if (plans[key]) setPlanData(plans[key]);
  const p=planPtId?patients.find(x=>x.id===planPtId):null;
  if (p) {
    setText2("npName",p.name||"—");
    setVal("npNameIn",p.name||"");
    if (!plans[key]?._weight && p.weight) setVal("npWeight",p.weight);
    if (!plans[key]?._targetW && p.targetWeight) setVal("npTargetWeight",p.targetWeight);
    if (!plans[key]?._bmi && p.bmi) setVal("npBmi",p.bmi);
  }
}

function savePlan() {
  const d=getPlanData();
  const key=planPtId||"_draft";
  plans[key]=d; savePlanStore();
  toast("تم حفظ البرنامج الغذائي");
}

function clearPlan() {
  MEALS.forEach(m=>DAYS.forEach(day=>{
    const el=document.getElementById(`cell_${m.id}_${day}`);
    if (el) el.value="";
  }));
  ["npInst","npAllowed","npForbidden"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
  toast("تم مسح البرنامج");
}

/* ════════════════════════════════════════
   تصدير PDF — البرنامج الغذائي
   (إصلاح التداخل العربي/الرياضي وفصل السعرات)
════════════════════════════════════════ */
function exportPDF() {
  savePlan();
  const d=getPlanData();
  const target=document.getElementById("pdfTarget");
  toast("⏳ جاري إعداد التصدير...");

  /* ══ الإصلاح النهائي لـ fixAr ══
     هذه النسخة تعزل الأرقام والرموز بشكل كلي داخل spans من نوع ltr
     وبالتالي تمنع أي تداخل بين السطور العربية والعملات/الأرقام أثناء تحويلها للصورة
  */
const fixAr = (raw) => {
  if (!raw || raw.trim() === "") return "—";

  let safe = raw.trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // تقسيم النص مع الحفاظ على الأرقام والرموز منفصلة
  const parts = safe.split(/([0-9٠-٩.,٫٪%+\-x×÷=><\s]+)/g);
  
  const spanned = parts.map(part => {
    if (!part) return "";
    // إذا كان الجزء يحتوي على أرقام أو رموز رياضية
    if (/[0-9٠-٩.,٫٪%+\-x×÷=><]/.test(part)) {
      return `<span dir="ltr" style="direction:ltr; unicode-bidi:bidi-override; display:inline-block;">${part}</span>`;
    }
    return `<span dir="rtl" style="unicode-bidi:isolate;">${part}</span>`;
  }).join("");

  return `<div dir="rtl" style="direction:rtl; text-align:right; line-height:1.85; white-space:pre-wrap;">${spanned}</div>`;
};

  const ptName = d._name?d._name.trim():"مريض";
  
  /* تم التعديل إلى 5 أعمدة لفصل السعرات عن BMI بشكل مستقل */
  const metaHTML = `
    <div dir="rtl" style="background:#f5e8ff;border:1.5px solid #c9a8e8;border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:12px;">
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">
        <div style="text-align:center;background:#fff;border-radius:8px;padding:8px;">
          <div style="font-size:10px;color:#888;">الاسم</div>
          <div style="font-weight:800;color:#7c3aad;font-size:13px;">${escapeHtml(ptName)}</div>
        </div>
        <div style="text-align:center;background:#fff;border-radius:8px;padding:8px;">
          <div style="font-size:10px;color:#888;">الوزن الحالي</div>
          <div style="font-weight:800;color:#7c3aad;font-size:13px;">${d._weight||"—"} kg</div>
        </div>
        <div style="text-align:center;background:#fff;border-radius:8px;padding:8px;">
          <div style="font-size:10px;color:#888;">الوزن المستهدف</div>
          <div style="font-weight:800;color:#7c3aad;font-size:13px;">${d._targetW||"—"} kg</div>
        </div>
        <div style="text-align:center;background:#fff;border-radius:8px;padding:8px;">
          <div style="font-size:10px;color:#888;">الـ BMI</div>
          <div style="font-weight:800;color:#7c3aad;font-size:13px;">${d._bmi||"—"}</div>
        </div>
        <div style="text-align:center;background:#fff;border-radius:8px;padding:8px;">
          <div style="font-size:10px;color:#888;">السعرات</div>
          <div style="font-weight:800;color:#7c3aad;font-size:13px;">${d._calories||"—"}</div>
        </div>
      </div>
    </div>`;

  const dayGroups=[["السبت","الأحد"],["الاثنين","الثلاثاء"],["الأربعاء","الخميس"],["الجمعة"]];
  let daysHTML="";
  dayGroups.forEach(group=>{
    let groupHTML=`<div style="display:grid;grid-template-columns:${group.length>1?"1fr 1fr":"1fr"};gap:14px;margin-bottom:14px;">`;
    let hasContent=false;
    group.forEach(day=>{
      let rowsHTML=""; let hasDay=false;
      MEALS.forEach(meal=>{
        const content=(d[meal.id]&&d[meal.id][day])?d[meal.id][day].trim():"";
        if (!content) return;
        hasDay=true; hasContent=true;
        rowsHTML+=`<tr style="${meal.isSnack?"background:#fdf8ff":""}">
          <td style="padding:6px 10px;border:1px solid #e0c8f0;width:55px;font-weight:700;font-size:11px;white-space:nowrap;vertical-align:top;">${meal.label}</td>
          <td style="padding:6px 10px;border:1px solid #e0c8f0;font-size:11.5px;line-height:1.8;">${fixAr(content)}</td></tr>`;
      });
      if (hasDay) {
        groupHTML+=`<div style="break-inside:avoid;">
          <div dir="rtl" style="background:linear-gradient(90deg,#5b1f8a,#9b59c8);color:white;padding:7px 12px;font-size:12px;font-weight:800;border-radius:7px 7px 0 0;">${day}</div>
          <table dir="rtl" style="width:100%;border-collapse:collapse;direction:rtl;">
            <thead><tr>
              <th style="background:#ede0f8;padding:6px 10px;border:1px solid #d4b8e8;font-size:10px;width:55px;text-align:right;">الوجبة</th>
              <th style="background:#ede0f8;padding:6px 10px;border:1px solid #d4b8e8;font-size:10px;text-align:right;">المحتوى</th>
            </tr></thead>
            <tbody>${rowsHTML}</tbody>
          </table></div>`;
      }
    });
    groupHTML+="</div>";
    if (hasContent) daysHTML+=groupHTML;
  });

  const pdfTemplate=`
  <div dir="rtl" style="direction:rtl;font-family:'Tajawal',Arial,sans-serif;padding:8mm 10mm;background:white;">
    <div dir="rtl" style="display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #cc6faa;padding-bottom:10px;margin-bottom:14px;">
      <div>
        <div style="color:#7c3aad;font-size:20px;font-weight:800;direction:rtl;">عيادة التغذية — Glowia Clinic</div>
        <div style="color:#b0508e;font-weight:800;font-size:14px;">الدكتورة صبا وليد الزعبي</div>
      </div>
      <div dir="ltr" style="text-align:left;font-size:11px;color:#555;">sebaalzoubi03@gmail.com<br/>0982720825</div>
    </div>
    ${metaHTML}
    <div dir="rtl" style="font-size:16px;font-weight:800;color:#7c3aad;margin:14px 0 12px;border-right:5px solid #cc6faa;padding-right:10px;">البرنامج الغذائي الأسبوعي</div>
    ${daysHTML}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px;">
      <div>
        <div dir="rtl" style="color:#7c3aad;font-weight:700;margin-bottom:6px;font-size:12px;">✅ المسموحات</div>
        <div dir="rtl" style="background:#fdfdfd;border:1px solid #ddd;padding:10px;border-radius:8px;font-size:11px;line-height:1.9;">${fixAr(d._allowed)}</div>
      </div>
      <div>
        <div dir="rtl" style="color:#b02020;font-weight:700;margin-bottom:6px;font-size:12px;">❌ الممنوعات</div>
        <div dir="rtl" style="background:#fdfdfd;border:1px solid #ddd;padding:10px;border-radius:8px;font-size:11px;line-height:1.9;">${fixAr(d._forbidden)}</div>
      </div>
    </div>
    ${d._inst?`<div style="margin-top:14px;">
      <div dir="rtl" style="color:#7c3aad;font-weight:700;margin-bottom:6px;font-size:12px;">📋 تعليمات إضافية</div>
      <div dir="rtl" style="background:#fdfdfd;border:1px solid #ddd;padding:10px;border-radius:8px;font-size:11px;line-height:1.9;">${fixAr(d._inst)}</div>
    </div>`:""}
  </div>`;

  target.innerHTML=pdfTemplate; target.style.display="block";
  const fileName=ptName.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g,"_").replace(/\s+/g,"_");
  html2pdf().set({
    margin:[4,5,5,5],
    filename:`Glowia_Plan_${fileName}.pdf`,
    html2canvas:{ scale:3, useCORS:true, letterRendering:true, allowTaint:true },
    jsPDF:{ unit:"mm", format:"a4", orientation:"portrait" },
  }).from(target).save().then(()=>{ target.style.display="none"; toast("✅ تم تصدير البرنامج بنجاح"); });
}

/* ════════════════════════════════════════
   تصدير PDF — تقرير المؤشرات الجسدية
════════════════════════════════════════ */
function exportPatientReport() {
  const fv = id => document.getElementById(id)?.value||"";
  const d = {
    name:fv("fName"), targetWeight:fv("fTargetWeight"), weight:fv("fWeight"),
    height:fv("fHeight"), age:fv("fAge"), bioAge:fv("fBioAge"),
    bmi:fv("fBmi"), bmiNote:fv("fBmiNote"), fat:fv("fFat"),
    muscles:fv("fMuscles"), legR:fv("fLegR"), legL:fv("fLegL"), legT:fv("fLegT"),
    armR:fv("fArmR"), armL:fv("fArmL"), armT:fv("fArmT"),
    trunk:fv("fTrunk"), trunkT:fv("fTrunkT"), chest:fv("fChest"),
    waist:fv("fWaist"), hip:fv("fHip"), lowerAbdomen:fv("fLowerAbdomen"),
    thighR:fv("fThighR"), thighL:fv("fThighL"), notes:fv("fNotes"),
  };
  if (!d.name) { toast("يرجى إدخال اسم المريض أولاً",true); return; }
  const v=(x,u="")=>(x!==""&&x!==null&&x!==undefined)?`${x}${u?" "+u:""}`:"—";
  const date=new Date().toLocaleDateString("ar-SA",{year:"numeric",month:"long",day:"numeric"});

  const rHTML=`
  <div dir="rtl" style="direction:rtl;font-family:'Tajawal',Tahoma,sans-serif;text-align:right;background:white;padding:30px 30px 40px 45px;">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #cc6faa;padding-bottom:12px;margin-bottom:20px;">
      <div><div style="color:#7c3aad;font-size:21px;font-weight:bold;">عيادة التغذية — Glowia Clinic</div>
      <div style="color:#b0508e;font-weight:700;font-size:14px;">الدكتورة صبا وليد الزعبي</div></div>
      <div dir="ltr" style="text-align:left;font-size:12px;color:#555;">sebaalzoubi03@gmail.com<br/>0982720825</div>
    </div>
    <div style="text-align:center;font-size:18px;font-weight:800;color:#7c3aad;margin-bottom:20px;">تقرير المؤشرات الجسدية</div>
    <div style="background:#f5e8ff;padding:10px 16px;border-radius:8px;margin-bottom:18px;display:flex;justify-content:space-between;font-size:13.5px;">
      <div><strong>الاسم:</strong> ${v(d.name)}</div><div><strong>التاريخ:</strong> ${date}</div>
    </div>
    <div style="font-size:14px;font-weight:700;color:#7c3aad;margin-bottom:10px;">المؤشرات الجسدية</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px;">
      ${[["العمر البيولوجي",v(d.bioAge)],["العمر",v(d.age)],["الطول CM",v(d.height)],["الوزن KG",v(d.weight)]].map(([l,x])=>
      `<div style="background:#f0e8fc;border:1px solid #c9a8e8;border-radius:10px;padding:10px;text-align:center;">
        <div style="font-size:11px;color:#666;">${l}</div>
        <div style="font-size:20px;font-weight:800;color:#7c3aad;">${x}</div></div>`).join("")}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;">
      ${[["الوزن المستهدف KG",v(d.targetWeight)],["هدف الدهون KG",v(d.fat)],["هدف العضلات KG",v(d.muscles)]].map(([l,x])=>
      `<div style="background:#fff0f8;border:2px solid #cc6faa;border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:11px;color:#666;">${l}</div>
        <div style="font-size:22px;font-weight:900;color:#7c3aad;">${x}</div></div>`).join("")}
    </div>
    <div style="margin:18px 0;">
      <div style="font-size:14px;font-weight:700;color:#7c3aad;margin-bottom:10px;">تفصيل العضلات</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#cc6faa;color:white;">
          <th style="padding:10px;">العضلات</th><th style="padding:10px;">اليمين</th><th style="padding:10px;">اليسار</th><th style="padding:10px;">الهدف</th>
        </tr></thead>
        <tbody>
          <tr><td style="padding:10px;font-weight:600;border-bottom:1px solid #eee;">الذراعين</td><td style="padding:10px;text-align:center;border-bottom:1px solid #eee;">${v(d.armR,"كجم")}</td><td style="padding:10px;text-align:center;border-bottom:1px solid #eee;">${v(d.armL,"كجم")}</td><td style="padding:10px;text-align:center;color:#7c3aad;font-weight:700;">${v(d.armT,"كجم")}</td></tr>
          <tr><td style="padding:10px;font-weight:600;border-bottom:1px solid #eee;">الساقين</td><td style="padding:10px;text-align:center;border-bottom:1px solid #eee;">${v(d.legR,"كجم")}</td><td style="padding:10px;text-align:center;border-bottom:1px solid #eee;">${v(d.legL,"كجم")}</td><td style="padding:10px;text-align:center;color:#7c3aad;font-weight:700;">${v(d.legT,"كجم")}</td></tr>
          <tr><td style="padding:10px;font-weight:600;">الجذع</td><td style="padding:10px;text-align:center;">${v(d.trunk,"كجم")}</td><td style="padding:10px;text-align:center;">—</td><td style="padding:10px;text-align:center;color:#7c3aad;font-weight:700;">${v(d.trunkT,"كجم")}</td></tr>
        </tbody>
      </table>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px;">
      ${[["الصدر","cm",d.chest],["الخصر","cm",d.waist],["الورك","cm",d.hip],["البطن السفلي","cm",d.lowerAbdomen],["الفخذ يمين","cm",d.thighR],["الفخذ يسار","cm",d.thighL]].map(([l,u,x])=>
      `<div style="background:#f5e8ff;border:1px solid #c9a8e8;border-radius:10px;padding:10px;text-align:center;">
        <div style="font-size:10px;color:#888;">${l} (${u})</div>
        <div style="font-size:16px;font-weight:800;color:#b0508e;">${v(x)}</div></div>`).join("")}
    </div>
    <div style="page-break-before:always;">
    ${d.notes?`<div style="margin-bottom:20px;"><div style="font-size:14px;font-weight:700;color:#7c3aad;margin-bottom:10px;">ملاحظات الدكتورة</div>
      <div style="border:1.5px solid #cc6faa;border-radius:12px;padding:16px;min-height:80px;white-space:pre-wrap;font-size:13px;">${escapeHtml(d.notes)}</div></div>`:""}
    <div style="margin-top:25px;">
      <div style="font-size:14px;font-weight:700;color:#7c3aad;margin-bottom:10px;">ملاحظات الكوتش</div>
      <div style="border:2px dashed #7c3aad;border-radius:12px;padding:25px;min-height:180px;background:#f9f9f9;"></div>
    </div>
    <div style="text-align:center;margin-top:25px;font-size:10px;color:#888;">تم إصدار هذا التقرير بواسطة Glowia Clinic</div>
    </div>
  </div>`;

  const target=document.getElementById("pdfTarget");
  target.innerHTML=rHTML; target.style.display="block";
  const fn=d.name.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g,"_").replace(/\s+/g,"_");
  html2pdf().set({
    margin:[12,12,15,20], filename:`Glowia_Report_${fn}.pdf`,
    html2canvas:{scale:3,useCORS:true,letterRendering:true},
    jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}
  }).from(target).save().then(()=>{ target.style.display="none"; toast("✅ تم تصدير التقرير بنجاح"); });
}

/* ════════════════════════════════════════
   جلسات الجهاز وبقية الأكواد كما هي
════════════════════════════════════════ */
function populateSessionPatientList() {
  const dl  = document.getElementById("sesPatientList");
  const sel = document.getElementById("sesPatientSelect");
  const pSel= document.getElementById("patientSessionsSelect");
  if (dl)  dl.innerHTML  = patients.map(p=>`<option value="${escapeHtml(p.name||"")}"></option>`).join("");
  if (sel) {
    sel.innerHTML='<option value="">-- اختاري مريضة --</option>';
    patients.forEach(p=>{sel.innerHTML+=`<option value="${p.id}">${escapeHtml(p.name||"—")}</option>`;});
  }
  if (pSel) {
    pSel.innerHTML='<option value="">-- اختاري مريضة --</option>';
    patients.forEach(p=>{pSel.innerHTML+=`<option value="${p.id}">${escapeHtml(p.name||"—")}</option>`;});
  }
}

function openSessionModal(mode) {
  sessionModalMode=mode; editSessionId=null;
  const title=document.getElementById("sessionModalTitle");
  const secE=document.getElementById("sessionExistingSection");
  const secN=document.getElementById("sessionNewSection");
  const secF=document.getElementById("sessionFreeSection");
  [secE,secN,secF].forEach(s=>{if(s)s.style.display="none";});

  if (mode==="existing") {
    if(title)title.innerHTML='<i class="fa-solid fa-bolt"></i> تسجيل جلسة — مريضة مسجلة';
    if(secE)secE.style.display=""; populateSessionPatientList();
  } else if (mode==="new") {
    if(title)title.innerHTML='<i class="fa-solid fa-bolt"></i> تسجيل جلسة — مريضة جديدة';
    if(secN)secN.style.display="";
  } else {
    if(title)title.innerHTML='<i class="fa-solid fa-bolt"></i> تسجيل جلسة';
    if(secF)secF.style.display=""; populateSessionPatientList();
  }
  ["sesType","sesM1","sesM2","sesEmsMuscles","sesNotes","sesNewPatientName","sesNewPatientPhone"].forEach(id=>{
    const el=document.getElementById(id); if(el)el.value="";
  });
  setVal("sesNumber","");
  const sesDate=document.getElementById("sesDate");
  if(sesDate) sesDate.value=new Date().toISOString().slice(0,10);
  onSessionTypeChange();
  document.getElementById("sessionModal").classList.add("open");
}

function closeSessionModal() {
  document.getElementById("sessionModal").classList.remove("open");
  editSessionId=null;
}

function onSessionTypeChange() {
  const type   =document.getElementById("sesType")?.value;
  const wrap   =document.getElementById("sesMeasureWrap");
  const emsNote=document.getElementById("sesEmsNote");
  const m1Label=document.getElementById("sesM1Label");
  const m2Label=document.getElementById("sesM2Label");
  if (!wrap) return;
  if (!type) { wrap.style.display="none"; if(emsNote)emsNote.style.display="none"; return; }
  if (type==="EMS") { wrap.style.display="none"; if(emsNote)emsNote.style.display=""; return; }
  if(emsNote)emsNote.style.display="none"; wrap.style.display="";
  const match=SESSION_AREA_LABELS.find(a=>a.test.test(type));
  if(m1Label)m1Label.textContent=match?match.m1:"القياس الأول";
  if(m2Label)m2Label.textContent=match?match.m2:"القياس الثاني";
}

function saveSession() {
  let name="", linkedId=null;
  if (sessionModalMode==="existing") {
    const sel=document.getElementById("sesPatientSelect");
    if(!sel||!sel.value){toast("يرجى اختيار مريضة",true);return;}
    linkedId=sel.value;
    name=(patients.find(x=>x.id===sel.value)?.name)||"";
  } else if (sessionModalMode==="new") {
    const nEl=document.getElementById("sesNewPatientName");
    name=nEl?.value.trim()||"";
    if(!name){toast("يرجى إدخال اسم المريضة",true);nEl?.focus();return;}
    const phone=document.getElementById("sesNewPatientPhone")?.value.trim()||"";
    const np={id:uid(),name,phone,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    patients.push(np); saveAll(); updateBadge(); updateStats(); linkedId=np.id;
    toast(`تم إضافة المريضة "${name}" تلقائياً`);
  } else {
    const nEl=document.getElementById("sesPatientName");
    name=nEl?.value.trim()||"";
    if(!name){toast("يرجى إدخال اسم المريضة",true);nEl?.focus();return;}
    const found=patients.find(p=>(p.name||"").trim().toLowerCase()===name.toLowerCase());
    linkedId=found?found.id:null;
  }

  const typeEl=document.getElementById("sesType");
  const type=typeEl?.value;
  if(!type){toast("يرجى اختيار نوع الجلسة",true);typeEl?.focus();return;}

  const isEms=type==="EMS";
  const m1r=isEms?"":document.getElementById("sesM1")?.value.trim()||"";
  const m2r=isEms?"":document.getElementById("sesM2")?.value.trim()||"";

  const sd={
    patientId  :linkedId, patientName:name, type,
    date       :document.getElementById("sesDate")?.value.trim()||"",
    sessionNum :document.getElementById("sesNumber")?.value||"",
    m1Label    :document.getElementById("sesM1Label")?.textContent||"",
    m2Label    :document.getElementById("sesM2Label")?.textContent||"",
    m1         :m1r===""?"":parseFloat(m1r),
    m2         :m2r===""?"":parseFloat(m2r),
    emsMuscles :isEms?document.getElementById("sesEmsMuscles")?.value.trim()||"":"",
    notes      :document.getElementById("sesNotes")?.value.trim()||"",
  };

  if (editSessionId) {
    const i=sessions.findIndex(s=>s.id===editSessionId);
    if(i>-1) sessions[i]={...sessions[i],...sd,updatedAt:new Date().toISOString()};
    toast("تم تحديث الجلسة ✅");
  } else {
    sessions.push({id:uid(),...sd,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    toast("تم حفظ الجلسة ✅");
  }
  saveSessions(); closeSessionModal(); renderSessionsTable();
}

function loadSession(id) {
  const s=sessions.find(x=>x.id===id);
  if(!s) return;
  editSessionId=id; sessionModalMode="free";
  document.getElementById("sessionExistingSection").style.display="none";
  document.getElementById("sessionNewSection").style.display="none";
  document.getElementById("sessionFreeSection").style.display="";
  populateSessionPatientList();
  setText("sessionModalTitle",'<i class="fa-solid fa-pen"></i> تعديل الجلسة',true);
  setVal("sesPatientName",s.patientName||"");
  setVal("sesType",s.type||"");
  onSessionTypeChange();
  setVal("sesDate",s.date||""); setVal("sesNumber",s.sessionNum||"");
  if(s.type!=="EMS") { setVal("sesM1",(s.m1===""||s.m1===undefined)?"":s.m1); setVal("sesM2",(s.m2===""||s.m2===undefined)?"":s.m2); }
  else setVal("sesEmsMuscles",s.emsMuscles||"");
  setVal("sesNotes",s.notes||"");
  document.getElementById("sessionModal").classList.add("open");
}

function askDeleteSession(id) {
  if(!confirm("هل أنتِ متأكدة من حذف هذه الجلسة؟")) return;
  sessions=sessions.filter(x=>x.id!==id);
  saveSessions(); renderSessionsTable(); toast("تم الحذف");
}

function renderSessionsTable() {
  const q   =(document.getElementById("sesSearchQ")?.value||"").trim().toLowerCase();
  const list=q?sessions.filter(s=>(s.patientName||"").toLowerCase().includes(q)):sessions;
  const body=document.getElementById("sessionsBody");
  const empty=document.getElementById("sessionsEmpty");
  if(!body) return;
  if(!list.length){ body.innerHTML=""; if(empty)empty.style.display=""; return; }
  if(empty)empty.style.display="none";
  const sorted=[...list].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  body.innerHTML=sorted.map((s,i)=>{
    const isEms=s.type==="EMS";
    const c1=isEms?(s.emsMuscles?escapeHtml(s.emsMuscles):"—"):(s.m1!==""&&s.m1!==undefined&&s.m1!==null?`${s.m1} سم`:"—");
    const c2=isEms?"—":(s.m2!==""&&s.m2!==undefined&&s.m2!==null?`${s.m2} سم`:"—");
    return `<tr>
      <td style="color:var(--muted);font-size:0.76rem;">${i+1}</td>
      <td style="font-weight:600;">${escapeHtml(s.patientName||"—")}</td>
      <td>${escapeHtml(s.type||"—")}</td>
      <td>${c1}</td><td>${c2}</td>
      <td><span class="date-chip">${escapeHtml(s.date||"")||fmtDate(s.createdAt)}</span></td>
      <td><div class="act-cell">
        <button class="btn btn-outline btn-xs" onclick="loadSession('${s.id}')"><i class="fa-solid fa-pen"></i> تعديل</button>
        <button class="btn btn-xs" style="background:#fff0f0;color:#b02020;border:1.5px solid #f5c6c6;" onclick="askDeleteSession('${s.id}')"><i class="fa-solid fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join("");
}

function openPatientSessionsModal() {
  populateSessionPatientList();
  document.getElementById("patientSessionsModal").classList.add("open");
  document.getElementById("patientSessionsContent").innerHTML=
    '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-user-clock"></i></div><p>اختاري مريضة لعرض جلساتها</p></div>';
}

function renderPatientSessions() {
  const sel=document.getElementById("patientSessionsSelect");
  if(!sel||!sel.value) return;
  const ptId=sel.value;
  const p=patients.find(x=>x.id===ptId);
  const list=sessions.filter(s=>s.patientId===ptId||(s.patientName||"").toLowerCase()===(p?.name||"").toLowerCase());
  const cont=document.getElementById("patientSessionsContent");
  if(!cont) return;
  if(!list.length) {
    cont.innerHTML='<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-bolt-lightning"></i></div><p>لا توجد جلسات لهذه المريضة</p></div>';
    return;
  }

  const sorted=[...list].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const byType={};
  sorted.forEach(s=>{ if(!byType[s.type])byType[s.type]=[]; byType[s.type].push(s); });

  let html=`<div style="margin-bottom:14px;padding:10px 14px;background:var(--lavender-pale);border-radius:var(--r-md);font-size:0.88rem;">
    إجمالي الجلسات: <strong style="color:var(--mauve)">${list.length}</strong> جلسة
    ${Object.entries(byType).map(([t,l])=>`<span style="margin-right:12px;background:var(--mauve-pale);color:var(--mauve);padding:2px 10px;border-radius:var(--r-pill);font-size:0.78rem;">${t}: ${l.length}</span>`).join("")}
  </div>`;

  Object.entries(byType).forEach(([type,typeList])=>{
    html+=`<div style="margin-bottom:22px;">
      <div style="font-size:0.9rem;font-weight:800;color:var(--mauve);margin-bottom:12px;border-right:4px solid var(--mauve);padding-right:10px;">${escapeHtml(type)} — ${typeList.length} جلسة</div>
      <div class="patient-sessions-timeline">`;

    typeList.forEach((s,idx)=>{
      const isEms=s.type==="EMS";
      const prev=idx>0?typeList[idx-1]:null;
      const m1diff=(prev&&s.m1!==""&&s.m1!==undefined&&prev.m1!==""&&prev.m1!==undefined)
        ?(parseFloat(s.m1)-parseFloat(prev.m1)).toFixed(1):null;
      const m2diff=(prev&&s.m2!==""&&s.m2!==undefined&&prev.m2!==""&&prev.m2!==undefined)
        ?(parseFloat(s.m2)-parseFloat(prev.m2)).toFixed(1):null;

      const diffBadge=(diff,label)=>{
        if(diff===null) return "";
        const n=parseFloat(diff);
        const color=n<0?"#2d9a50":n>0?"#d42020":"#888";
        const arrow=n<0?"▼":n>0?"▲":"—";
        return `<span style="margin-right:8px;font-size:0.75rem;color:${color};font-weight:700;">${label}: ${arrow} ${n>0?"+":""}${diff} سم</span>`;
      };

      html+=`<div class="pst-item">
        <div class="pst-num">${s.sessionNum||idx+1}</div>
        <div class="pst-body">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:6px;">
            <div class="pst-type">${escapeHtml(s.type)} ${s.sessionNum?"— الجلسة رقم "+s.sessionNum:""}</div>
            <span class="pst-date"><i class="fa-solid fa-calendar"></i> ${escapeHtml(s.date||fmtDate(s.createdAt))}</span>
          </div>
          <div class="pst-meta" style="margin-top:6px;">
            ${isEms?`<span><i class="fa-solid fa-dumbbell"></i> ${escapeHtml(s.emsMuscles||"—")}</span>`:`
              <span><i class="fa-solid fa-ruler"></i> ${escapeHtml(s.m1Label||"Q1")}: <strong>${s.m1!==""&&s.m1!==undefined?s.m1+" سم":"—"}</strong></span>
              <span><i class="fa-solid fa-ruler"></i> ${escapeHtml(s.m2Label||"Q2")}: <strong>${s.m2!==""&&s.m2!==undefined?s.m2+" سم":"—"}</strong></span>
              ${diffBadge(m1diff,s.m1Label||"Q1")}${diffBadge(m2diff,s.m2Label||"Q2")}
            `}
            ${s.notes?`<span style="color:var(--ink-soft);"><i class="fa-solid fa-note-sticky"></i> ${escapeHtml(s.notes)}</span>`:""}
          </div>
        </div>
      </div>`;
    });
    html+=`</div></div>`;
  });

  cont.innerHTML=html;
}

function loadSyncCfg()    { try{return JSON.parse(localStorage.getItem(SYK)||"{}");}catch{return {};} }
function saveSyncCfg(cfg) { localStorage.setItem(SYK,JSON.stringify(cfg)); }

function initSyncUI() {
  const cfg=loadSyncCfg();
  setVal("syncApiKey",cfg.apiKey||""); setVal("syncBinId",cfg.binId||"");
  setText2("syncLastTime",cfg.lastSync?fmtDateTime(cfg.lastSync):"لم تتم أي مزامنة بعد");
}
function toggleSyncKeyVisibility() {
  const el=document.getElementById("syncApiKey");
  if(el)el.type=el.type==="password"?"text":"password";
}

async function syncPush() {
  const apiKey=document.getElementById("syncApiKey")?.value.trim();
  let   binId =document.getElementById("syncBinId")?.value.trim();
  if(!apiKey){toast("يرجى إدخال Master Key",true);return;}
  const payload={patients,plans,sessions,monthly,savedAt:new Date().toISOString()};
  const btn=document.getElementById("syncPushBtn"); const oh=btn?.innerHTML;
  if(btn){btn.disabled=true;btn.innerHTML="جارِ الرفع...";}
  try{
    let res;
    if(binId)res=await fetch(`https://api.jsonbin.io/v3/b/${binId}`,{method:"PUT",headers:{"Content-Type":"application/json","X-Master-Key":apiKey},body:JSON.stringify(payload)});
    else res=await fetch(`https://api.jsonbin.io/v3/b`,{method:"POST",headers:{"Content-Type":"application/json","X-Master-Key":apiKey,"X-Bin-Name":"Glowia Clinic Data"},body:JSON.stringify(payload)});
    if(!res.ok)throw new Error("HTTP "+res.status);
    const data=await res.json();
    if(!binId)binId=data?.metadata?.id||"";
    const cfg={apiKey,binId,lastSync:new Date().toISOString()};
    saveSyncCfg(cfg); setVal("syncBinId",binId); setText2("syncLastTime",fmtDateTime(cfg.lastSync));
    toast("✅ تم رفع البيانات بنجاح");
  }catch{toast("تعذّر الرفع، تحقّقي من Master Key",true);}
  finally{if(btn){btn.disabled=false;btn.innerHTML=oh;}}
}

async function syncPull() {
  const apiKey=document.getElementById("syncApiKey")?.value.trim();
  const binId =document.getElementById("syncBinId")?.value.trim();
  if(!apiKey||!binId){toast("يرجى إدخال Master Key و Bin ID",true);return;}
  if(!confirm("سيتم استبدال جميع البيانات الحالية. هل تريدين المتابعة؟"))return;
  const btn=document.getElementById("syncPullBtn"); const oh=btn?.innerHTML;
  if(btn){btn.disabled=true;btn.innerHTML="جارِ التنزيل...";}
  try{
    const res=await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`,{headers:{"X-Master-Key":apiKey}});
    if(!res.ok)throw new Error("HTTP "+res.status);
    const data=await res.json(); const r=data.record||{};
    patients=Array.isArray(r.patients)?r.patients:[];
    plans=r.plans&&typeof r.plans==="object"?r.plans:{};
    sessions=Array.isArray(r.sessions)?r.sessions:[];
    monthly=r.monthly&&typeof r.monthly==="object"?r.monthly:{};
    saveAll();savePlanStore();saveSessions();saveMonthly();
    const cfg={apiKey,binId,lastSync:new Date().toISOString()};
    saveSyncCfg(cfg); setText2("syncLastTime",fmtDateTime(cfg.lastSync));
    render();renderSessionsTable();populateSessionPatientList();
    toast("✅ تم تنزيل البيانات بنجاح");
  }catch{toast("تعذّر التنزيل، تحقّقي من Master Key و Bin ID",true);}
  finally{if(btn){btn.disabled=false;btn.innerHTML=oh;}}
}

function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function initials(n) { if(!n)return"؟"; const p=n.trim().split(" "); return p.length>=2?p[0][0]+p[1][0]:p[0][0]||"؟"; }
function fmtDate(iso)     { if(!iso)return"—"; try{return new Date(iso).toLocaleDateString("ar-SA",{year:"numeric",month:"short",day:"numeric"});}catch{return"—";} }
function fmtDateTime(iso) { if(!iso)return"—"; try{return new Date(iso).toLocaleString("ar-SA",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});}catch{return"—";} }
function escapeHtml(str)  { return String(str??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch])); }
function bmiChip(bmi) {
  if(bmi===""||bmi===undefined||bmi===null)return'<span class="chip chip-na">—</span>';
  const n=parseFloat(bmi);
  if(n<18.5)return`<span class="chip chip-u">${n} نحافة</span>`;
  if(n<25)  return`<span class="chip chip-n">${n} طبيعي</span>`;
  if(n<30)  return`<span class="chip chip-o">${n} زيادة</span>`;
  return          `<span class="chip chip-ob">${n} سمنة</span>`;
}

let _toastT;
function toast(msg, warn=false) {
  const el=document.getElementById("toast"); if(!el)return;
  el.textContent=msg;
  el.style.background=warn
    ?"linear-gradient(135deg,#b02020,#d94040)"
    :"linear-gradient(135deg,var(--mauve-deep),var(--lavender))";
  el.classList.add("show"); clearTimeout(_toastT);
  _toastT=setTimeout(()=>el.classList.remove("show"),3200);
}

["delOverlay","sessionModal","patientSessionsModal","monthlyModal"].forEach(id=>{
  document.getElementById(id)?.addEventListener("click",function(e){if(e.target===this)this.classList.remove("open");});
});
document.getElementById("delOverlay")?.addEventListener("click",function(e){if(e.target===this)closeDialog();});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    closeDialog(); closeSessionModal();
    ["patientSessionsModal","monthlyModal"].forEach(id=>document.getElementById(id)?.classList.remove("open"));
  }
});
function displayMonthlyCards(records) {
    const container = document.getElementById('monthlyCardsContainer');
    const emptyState = document.getElementById('monthlyEmpty');
    
    container.innerHTML = '';
    
    if (!records || records.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // ترتيب السجلات من الأحدث إلى الأقدم
    records.sort((a, b) => new Date(b.mDate) - new Date(a.mDate));
    
    records.forEach((rec, index) => {
        const card = document.createElement('div');
        card.className = 'history-record-card';
        
        card.innerHTML = `
            <div class="record-card-header">
                <span class="record-card-date"><i class="fas fa-calendar-alt"></i> ${rec.mDate}</span>
                <span class="badge-index" style="background:#e8def8; color:#6c5ce7; padding:2px 8px; border-radius:12px; font-size:0.8rem;">زيارة #${records.length - index}</span>
            </div>
            <div class="record-card-body bidi-safe-text">
                <div class="metric-badge">
                    <span class="metric-label">الوزن</span>
                    <span class="metric-val">${rec.mWeight || '-'} كغ</span>
                </div>
                <div class="metric-badge">
                    <span class="metric-label">العمر الحيوي</span>
                    <span class="metric-val">${rec.mBioAge || '-'}</span>
                </div>
                <div class="metric-badge">
                    <span class="metric-label">BMI</span>
                    <span class="metric-val">${rec.mBmi || '-'}</span>
                </div>
                <div class="metric-badge">
                    <span class="metric-label">نسبة الدهون</span>
                    <span class="metric-val">${rec.mFatPercentage || '-'} %</span>
                </div>
                <div class="metric-badge">
                    <span class="metric-label">الصدر/الجذع</span>
                    <span class="metric-val">${rec.mChest || '-'} سم</span>
                </div>
                <div class="metric-badge">
                    <span class="metric-label">الخصر</span>
                    <span class="metric-val">${rec.mWaist || '-'} سم</span>
                </div>
                <div class="metric-badge">
                    <span class="metric-label">الذراع (يمين/يسار)</span>
                    <span class="metric-val">${rec.mArmRight || '-'} / ${rec.mArmLeft || '-'} سم</span>
                </div>
                <div class="metric-badge">
                    <span class="metric-label">الفخذ (يمين/يسار)</span>
                    <span class="metric-val">${rec.mThighRight || '-'} / ${rec.mThighLeft || '-'} سم</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

init();
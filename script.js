/* ═══════════════════════════════════════════════════════════
   GLOWIA CLINIC — script.js
   جميع الوظائف: CRUD المرضى، التنقل، البرنامج الغذائي،
   تصدير PDF للخطة الغذائية وتقرير المؤشرات الجسدية
═══════════════════════════════════════════════════════════ */

/* ─── المفاتيح والحالة العامة ─── */
const SK  = "glowia_pts_v3";    // مفتاح تخزين المرضى
const SPK = "glowia_plans_v3";  // مفتاح تخزين الخطط الغذائية

let patients  = [];  // قائمة المرضى
let plans     = {};  // الخطط الغذائية مرتبطة بمعرف المريض
let editId    = null;  // معرف المريض قيد التعديل
let delId     = null;  // معرف المريض قيد الحذف
let planPtId  = null;  // معرف المريض المرتبط بالخطة الحالية

/* ─── الأيام والوجبات ─── */
const DAYS = ["السبت","الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة"];

const MEALS = [
  { id:"فطور",  label:"فطور",  isSnack:false },
  { id:"سناك1", label:"سناك",  isSnack:true  },
  { id:"غداء",  label:"غداء",  isSnack:false },
  { id:"سناك2", label:"سناك",  isSnack:true  },
  { id:"عشاء",  label:"عشاء",  isSnack:false },
  { id:"سناك3", label:"سناك",  isSnack:true  },
];

/* ─── خريطة حقول النموذج ─── */
const FM = {
  Name         : "fName",
  Weight       : "fWeight",
  Height       : "fHeight",
  Age          : "fAge",
  BioAge       : "fBioAge",
  bmi          : "fBmi",
  bmiNote      : "fBmiNote",
  Fat          : "fFat",
  TargetWeight : "fTargetWeight",
  Muscles      : "fMuscles",
  LegR         : "fLegR",
  LegL         : "fLegL",
  LegT         : "fLegT",
  ArmR         : "fArmR",
  ArmL         : "fArmL",
  ArmT         : "fArmT",
  Trunk        : "fTrunk",
  TrunkT       : "fTrunkT",
  Chest        : "fChest",
  Waist        : "fWaist",
  Hip          : "fHip",
  Wrist        : "fWrist",
  Thigh        : "fThigh",
  Notes        : "fNotes",
};

/* ═══════════════════════════════════════════════════════════
   التهيئة
═══════════════════════════════════════════════════════════ */
function init() {
  load();
  buildPlanTable();
  setDate();
  render();
}

function setDate() {
  const d = new Date();
  const s = d.toLocaleDateString("ar-SA", { weekday:"short", year:"numeric", month:"short", day:"numeric" });
  document.getElementById("hDate").textContent = s;
  document.getElementById("npDate").value = d.toLocaleDateString("ar-SA");
}

/* ─── تحميل وحفظ البيانات ─── */
function load() {
  try { patients = JSON.parse(localStorage.getItem(SK)  || "[]"); } catch { patients = []; }
  try { plans    = JSON.parse(localStorage.getItem(SPK) || "{}"); } catch { plans    = {}; }
}

function saveAll()       { localStorage.setItem(SK,  JSON.stringify(patients)); }
function savePlanStore() { localStorage.setItem(SPK, JSON.stringify(plans));    }

/* ═══════════════════════════════════════════════════════════
   التنقل بين الصفحات
═══════════════════════════════════════════════════════════ */
function navTo(pageId, el) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.querySelectorAll(".mob-nav-item").forEach(n => n.classList.remove("active"));

  document.getElementById("page-" + pageId).classList.add("active");
  document.querySelectorAll("[data-page=" + pageId + "]").forEach(n => n.classList.add("active"));

  if (pageId === "dashboard") render();
  if (pageId === "nutrition") loadPlanUI();

  document.getElementById("mainArea").scrollTop = 0;
}

/* ═══════════════════════════════════════════════════════════
   CRUD المرضى
═══════════════════════════════════════════════════════════ */
function doNewPatient() {
  editId = null;
  planPtId = null;
  clearFm();
  document.getElementById("fmTitle").innerHTML = 'إضافة <span class="accent">مريض جديد</span>';
  document.getElementById("fmSub").textContent = "أدخلي بيانات المريض بالكامل";
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
  Object.entries(FM).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const v   = el.value.trim();
    const key = k[0].toLowerCase() + k.slice(1);
    d[key] = el.type === "number" ? (v === "" ? "" : parseFloat(v)) : v;
  });
  return d;
}

function fillFm(p) {
  Object.entries(FM).forEach(([k, id]) => {
    const el  = document.getElementById(id);
    if (!el) return;
    const key = k[0].toLowerCase() + k.slice(1);
    if (p[key] !== undefined && p[key] !== "") el.value = p[key];
  });
}

function savePatient() {
  const d = readFm();
  if (!d.name) {
    toast("يرجى إدخال اسم المريض", true);
    document.getElementById("fName").focus();
    return;
  }

  if (editId) {
    const i = patients.findIndex(x => x.id === editId);
    if (i > -1) patients[i] = { ...patients[i], ...d, updatedAt: new Date().toISOString() };
    toast("تم تحديث بيانات المريض بنجاح");
  } else {
    const np = { id: uid(), ...d, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    patients.push(np);
    editId   = np.id;
    planPtId = np.id;
    toast("تم حفظ المريض بنجاح");
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
  editId   = id;
  planPtId = id;
  fillFm(p);
  document.getElementById("fmTitle").innerHTML = 'تعديل <span class="accent">' + (p.name || "المريض") + "</span>";
  document.getElementById("fmSub").textContent = "راجعي وعدّلي بيانات المريض";
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
  editId   = id;
  planPtId = id;
  fillFm(p);
  setPatientCtx(p.name);
  document.getElementById("npName").textContent = p.name || "—";
  document.getElementById("npNameIn").value     = p.name || "";
  loadPlanUI();
  navTo("nutrition", document.querySelector("[data-page=nutrition]"));
}

function toggleExportButtons(show) {
  const banner = document.getElementById("exportBanner");
  const btnBot = document.getElementById("exportBtnBottom");
  if (banner) banner.style.display = show ? "flex" : "none";
  if (btnBot) btnBot.style.display = show ? ""     : "none";
}

function setPatientCtx(name) {
  const el = document.getElementById("hPatientTag");
  if (name) {
    el.textContent = name;
    el.classList.add("visible");
  } else {
    el.textContent = "";
    el.classList.remove("visible");
  }
}

/* ═══════════════════════════════════════════════════════════
   عرض لوحة التحكم
═══════════════════════════════════════════════════════════ */
function render() {
  renderTable();
  updateStats();
  updateBadge();
}

function renderTable() {
  const q = (document.getElementById("searchQ")?.value || "").trim().toLowerCase();
  const f = q ? patients.filter(p => (p.name || "").toLowerCase().includes(q)) : patients;
  const body  = document.getElementById("patientsBody");
  const empty = document.getElementById("dashEmpty");

  if (!f.length) {
    body.innerHTML = "";
    empty.style.display = "";
    empty.innerHTML = q
      ? '<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><p>لا توجد نتائج</p><small>جربي كلمة بحث أخرى</small>'
      : '<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><p>لا يوجد مرضى مسجلون</p><small>اضغط "إضافة مريض جديد" للبدء</small>';
    return;
  }
  empty.style.display = "none";

  const sorted = [...f].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  body.innerHTML = sorted.map((p, i) => {
    const hasPlan = !!plans[p.id];
    return `<tr>
      <td style="color:var(--muted);font-size:0.76rem;">${i + 1}</td>
      <td>
        <div class="pt-name-cell">
          <div class="av">${initials(p.name)}</div>
          <div>
            <div style="font-weight:600;">${p.name || "—"}</div>
            ${hasPlan ? '<div class="pt-sub">لديه برنامج غذائي</div>' : ""}
          </div>
        </div>
      </td>
      <td>${bmiChip(p.bmi)}</td>
      <td>${p.weight ? p.weight + " kg" : "—"}</td>
      <td>${p.height ? p.height + " cm" : "—"}</td>
      <td>${p.age ? p.age + " سنة" : "—"}</td>
      <td><span class="date-chip">${fmtDate(p.createdAt)}</span></td>
      <td>
        <div class="act-cell">
          <button class="btn btn-outline btn-xs" onclick="loadPatient('${p.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            تعديل
          </button>
          <button class="btn btn-xs" style="background:var(--mauve-pale);color:var(--mauve);border:1.5px solid var(--mauve-light);" onclick="openNutrition('${p.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
            برنامج
          </button>
          <button class="btn btn-xs" style="background:#fff0f0;color:#b02020;border:1.5px solid #f5c6c6;" onclick="askDelete('${p.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

function updateStats() {
  const today = new Date().toDateString();
  document.getElementById("stTotal").textContent  = patients.length;
  document.getElementById("stToday").textContent  = patients.filter(p => new Date(p.createdAt).toDateString() === today).length;
  document.getElementById("stGoal").textContent   = patients.filter(p => p.targetWeight).length;
  document.getElementById("stPlans").textContent  = Object.keys(plans).filter(id => patients.find(p => p.id === id)).length;
}

function updateBadge() {
  document.getElementById("navCount").textContent = patients.length;
}

/* ═══════════════════════════════════════════════════════════
   الحذف
═══════════════════════════════════════════════════════════ */
function askDelete(id) {
  delId = id;
  document.getElementById("delOverlay").classList.add("open");
}
function closeDialog() {
  delId = null;
  document.getElementById("delOverlay").classList.remove("open");
}
function confirmDelete() {
  if (!delId) return;
  patients = patients.filter(x => x.id !== delId);
  delete plans[delId];
  saveAll();
  savePlanStore();
  if (editId   === delId) { editId = null;   clearFm(); setPatientCtx(null); toggleExportButtons(false); }
  if (planPtId === delId) planPtId = null;
  delId = null;
  closeDialog();
  render();
  toast("تم حذف المريض بنجاح");
}

/* ═══════════════════════════════════════════════════════════
   جدول البرنامج الغذائي
═══════════════════════════════════════════════════════════ */
function buildPlanTable() {
  const container = document.getElementById("planTablesContainer");
  container.innerHTML = "";

  DAYS.forEach(day => {
    const cardHTML = `
      <div class="day-card">
        <div class="day-header">
          <span class="day-title">${day}</span>
        </div>
        <table class="single-day-table">
          <thead>
            <tr>
              <th class="meal-col">الوجبة</th>
              <th class="content-col">البرنامج الغذائي</th>
            </tr>
          </thead>
          <tbody>
            ${MEALS.map(meal => `
              <tr class="${meal.isSnack ? "meal-snack" : ""}">
                <td class="meal-lbl">${meal.label}</td>
                <td>
                  <textarea id="cell_${meal.id}_${day}"
                    placeholder="اكتبي الوجبة هنا..."></textarea>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>`;
    container.innerHTML += cardHTML;
  });
}

function getPlanData() {
  const d = {};
  MEALS.forEach(m => {
    d[m.id] = {};
    DAYS.forEach(day => {
      const el = document.getElementById(`cell_${m.id}_${day}`);
      d[m.id][day] = el ? el.value.trim() : "";
    });
  });
  d._inst      = document.getElementById("npInst").value.trim();
  d._allowed   = document.getElementById("npAllowed").value.trim();
  d._forbidden = document.getElementById("npForbidden").value.trim();
  d._name      = document.getElementById("npNameIn").value.trim();
  d._date      = document.getElementById("npDate").value;
  return d;
}

function setPlanData(d) {
  if (!d) return;
  MEALS.forEach(m => {
    DAYS.forEach(day => {
      const el = document.getElementById(`cell_${m.id}_${day}`);
      if (el) el.value = (d[m.id] && d[m.id][day]) || "";
    });
  });
  const safe = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
  safe("npInst",     d._inst);
  safe("npAllowed",  d._allowed);
  safe("npForbidden",d._forbidden);
  safe("npNameIn",   d._name);
  safe("npDate",     d._date);
  if (d._name) document.getElementById("npName").textContent = d._name;
}

function loadPlanUI() {
  const key = planPtId || "_draft";
  if (plans[key]) setPlanData(plans[key]);
  const p = planPtId ? patients.find(x => x.id === planPtId) : null;
  if (p) {
    document.getElementById("npName").textContent = p.name || "—";
    document.getElementById("npNameIn").value     = p.name || "";
  }
}

function savePlan() {
  const d   = getPlanData();
  const key = planPtId || "_draft";
  plans[key] = d;
  savePlanStore();
  toast("تم حفظ البرنامج الغذائي");
}

function clearPlan() {
  MEALS.forEach(m =>
    DAYS.forEach(day => {
      const el = document.getElementById(`cell_${m.id}_${day}`);
      if (el) el.value = "";
    })
  );
  ["npInst","npAllowed","npForbidden"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  toast("تم مسح البرنامج");
}

/* ═══════════════════════════════════════════════════════════
   تصدير PDF — البرنامج الغذائي الأسبوعي (مصلّح لمنع القص الجانبي والسفلي)
═══════════════════════════════════════════════════════════ */
function exportPDF() {
  savePlan();
  const d      = getPlanData();
  const target = document.getElementById("pdfTarget");
  toast("⏳ جاري إعداد تصدير البرنامج الغذائي...");

  /* تهيئة النص العربي */
  const fixAr = (str) => {
    if (!str || str.trim() === "") return "—";
    let clean = str.trim()
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/([\u0600-\u06FF])(\d)/g,"$1 $2")
      .replace(/(\d)([\u0600-\u06FF])/g,"$1 $2")
      .replace(/([^\s+])\+([^\s+])/g,"$1 + $2")
      .replace(/([،.:؛])([^\s])/g,"$1 $2")
      .replace(/\s+/g," ");
    const lines = clean.split("\n").map(l =>
      `<div style="direction:rtl;unicode-bidi:isolate;text-align:right;line-height:1.85;">${l || "&nbsp;"}</div>`
    ).join("");
    return `<div style="direction:rtl;text-align:right;width:100%;">${lines}</div>`;
  };

  const dayGroups = [["السبت","الأحد"],["الاثنين","الثلاثاء"],["الأربعاء","الخميس"],["الجمعة"]];
  let daysHTML = "";

  dayGroups.forEach(group => {
    let groupHTML = `<div class="pdf-group" style="page-break-inside: avoid; break-inside: avoid; margin-bottom: 15px;">`;
    let hasContentInGroup = false;

    group.forEach(day => {
      let rowsHTML = "";
      let hasContentInDay = false;
      MEALS.forEach(meal => {
        const content = (d[meal.id] && d[meal.id][day]) ? d[meal.id][day].trim() : "";
        if (content === "") return;
        hasContentInDay   = true;
        hasContentInGroup = true;
        rowsHTML += `
          <tr class="${meal.isSnack ? "meal-snack" : ""}">
            <td class="pdf-meal" style="padding: 7px 10px; font-weight: bold; background: #fffdfd;">${meal.label}</td>
            <td class="pdf-content" style="padding: 7px 10px;">${fixAr(content)}</td>
          </tr>`;
      });
      if (hasContentInDay) {
        groupHTML += `
          <div class="pdf-day-card" style="margin-bottom: 12px; background: white; border: 1px solid #f8c8dc; border-radius: 8px; overflow: hidden;">
            <div class="pdf-day-header" style="background: linear-gradient(90deg, #8b3a9e, #e8739a); color: white; padding: 6px 12px; font-weight: bold; font-size: 14px;">${day}</div>
            <table class="pdf-single-day-table" style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
              <thead><tr style="background: #fff5f9; text-align: right;">
                <th class="pdf-meal-col" style="width: 20%; padding: 6px 10px; border-bottom: 1px solid #f8c8dc;">الوجبة</th>
                <th class="pdf-content-col" style="width: 80%; padding: 6px 10px; border-bottom: 1px solid #f8c8dc;">المحتوى</th>
              </tr></thead>
              <tbody>${rowsHTML}</tbody>
            </table>
          </div>`;
      }
    });

    groupHTML += `</div>`;
    if (hasContentInGroup) daysHTML += groupHTML;
  });

  const patientName = d._name ? d._name.trim() : "مريض";
  const pdfTemplate = `
    <div class="pdf-page" style="width: 100%; box-sizing: border-box; direction:rtl; font-family:'Tajawal',sans-serif; padding: 5mm; background:white; line-height:1.6;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid #E8739A; padding-bottom:10px; margin-bottom:15px;">
        <div>
          <h1 style="color:#8B3A9E; margin:0; font-size:22px;">عيادة التغذية — Glowia Clinic</h1>
          <p style="margin:3px 0 0; color:#D4547F; font-weight:800; font-size:15px;">الدكتورة صبا وليد الزعبي</p>
        </div>
        <div style="text-align:left; font-size:11px; color:#555; line-height:1.5;" dir="ltr">
          sebaalzoubi03@gmail.com<br/>0982720825
        </div>
      </div>

      <table style="width:100%; margin-bottom:15px; background:#FFF5F9; border:1px solid #F8C8DC; border-radius:10px; font-size:13px; border-collapse: separate; border-spacing: 0;">
        <tr>
          <td style="padding:8px 12px;"><b>الاسم:</b> ${fixAr(patientName)}</td>
          <td style="padding:8px 12px;"><b>التاريخ:</b> ${new Date().toLocaleDateString("ar-SA")}</td>
          <td style="padding:8px 12px;"><b>الهدف:</b> ${document.getElementById("fTargetWeight")?.value ? document.getElementById("fTargetWeight").value + " كجم" : "—"}</td>
        </tr>
      </table>

      <div style="font-size:16px; font-weight:800; color:#8B3A9E; margin:15px 0 12px; border-right:5px solid #E8739A; padding-right:10px;">
        البرنامج الغذائي الأسبوعي
      </div>

      <div class="pdf-days-container" style="width: 100%;">
        ${daysHTML}
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:15px; page-break-inside: avoid; break-inside: avoid;">
        <div>
          <div style="color:#8B3A9E; font-weight:700; font-size:13px; margin-bottom:5px;">المسموحات</div>
          <div style="background:#fdfdfd; border:1px solid #ddd; padding:10px; border-radius:8px; font-size:12px; min-height: 50px;">${fixAr(d._allowed)}</div>
        </div>
        <div>
          <div style="color:#8B3A9E; font-weight:700; font-size:13px; margin-bottom:5px;">الممنوعات</div>
          <div style="background:#fdfdfd; border:1px solid #ddd; padding:10px; border-radius:8px; font-size:12px; min-height: 50px;">${fixAr(d._forbidden)}</div>
        </div>
      </div>
      <div style="margin-top:12px; page-break-inside: avoid; break-inside: avoid;">
        <div style="color:#8B3A9E; font-weight:700; font-size:13px; margin-bottom:5px;">تعليمات إضافية</div>
        <div style="background:#fdfdfd; border:1px solid #ddd; padding:10px; border-radius:8px; font-size:12px; min-height: 50px;">${fixAr(d._inst)}</div>
      </div>
    </div>`;

  // تجهيز حاوية العرض لمنع الحواف المقطوعة جانبيًا
  target.innerHTML = pdfTemplate;
  target.style.display = "block";
  target.style.width = "185mm"; // ترك هامش أمان داخلي لحسابات html2canvas
  target.style.position = "absolute";
  target.style.left = "-9999px";

  const fileName = patientName.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g,"_").replace(/\s+/g,"_");

  html2pdf().set({
    margin         : [10, 12, 10, 12],
    filename       : `Glowia_Plan_${fileName}.pdf`,
    pagebreak      : { mode: ['avoid-all', 'css'] },
    html2canvas    : { scale: 3, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
    jsPDF          : { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(target).save().then(() => {
    target.style.display = "none";
    target.style.position = "";
    target.style.left = "";
    toast("✅ تم تصدير البرنامج الغذائي بنجاح");
  }).catch((err) => {
    console.error(err);
    toast("❌ حدث خطأ أثناء التصدير", true);
  });
}

/* ═══════════════════════════════════════════════════════════
   تصدير PDF — تقرير المؤشرات الجسدية للمريض (مصلّح تماماً)
═══════════════════════════════════════════════════════════ */
function exportPatientReport() {
  const d = readFm();
  if (!d.name) {
    toast("يرجى إدخال اسم المريض أولاً", true);
    return;
  }

  if (editId) savePatient();
  toast("⏳ جاري إعداد تقرير المريض...");

  const fixAr = (str) => {
    if (!str || str.trim() === "") return "—";
    return str.trim()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/([،.:؛])([^\s])/g, "$1 $2");
  };

  const val = (v, unit = "") => {
    if (v === "" || v === null || v === undefined) return "—";
    return `<bdi dir="ltr" style="unicode-bidi: isolate;">${v}${unit ? " " + unit : ""}</bdi>`;
  };

  const date = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  
  const reportHTML = `
    <div class="rpt-page" style="width: 100%; box-sizing: border-box; background: white; direction: rtl; font-family: 'Tajawal', Tahoma, sans-serif; line-height: 1.6; padding: 5mm;">

      <div class="rpt-header" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid transparent; border-image: linear-gradient(90deg, #6b2080, #e8739a) 1; padding-bottom: 12px; margin-bottom: 15px;">
        <div class="rpt-header-contact" style="font-size: 11px; color: #7b6b8d; text-align: left; direction: ltr; line-height: 1.6;">
          sebaalzoubi03@gmail.com<br/>0982720825
        </div>
        
        <div class="rpt-header-center" style="text-align: center; flex: 1; padding: 0 15px;">
          <div class="rpt-clinic-name" style="font-size: 20px; font-weight: 900; color: #6b2080;">عيادة التغذية</div>
          <div class="rpt-doctor-name" style="font-size: 13px; color: #d4547f; font-weight: 700; margin-top: 3px;">الدكتورة صبا وليد الزعبي — أخصائية التغذية</div>
        </div>
      </div>

      <div class="rpt-report-title" style="text-align: center; margin-bottom: 15px; font-size: 15px; font-weight: 800; color: #fff; background: linear-gradient(90deg, #8b3a9e, #e8739a); border-radius: 8px; padding: 8px 15px;">
        تقرير المؤشرات الجسدية والقياسات
      </div>

      <div class="rpt-patient-card" style="background: linear-gradient(90deg, #fff5f9, #edd9f5); border: 1px solid #f0d0e8; border-radius: 10px; padding: 12px 15px; margin-bottom: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
        <div class="rpt-patient-field" style="font-size: 12.5px;">الاسم: <span style="font-weight: 700; color: #6b2080;">${val(d.name)}</span></div>
        <div class="rpt-patient-field" style="font-size: 12.5px;">تاريخ التقرير: <span style="font-weight: 700; color: #6b2080;">${date}</span></div>
        <div class="rpt-patient-field" style="font-size: 12.5px;">الوزن المستهدف: <span style="font-weight: 700; color: #6b2080;">${val(d.targetWeight, "كجم")}</span></div>
      </div>

      <div class="rpt-section-title" style="font-size: 14px; font-weight: 800; color: #8b3a9e; border-right: 5px solid #e8739a; padding-right: 10px; margin: 15px 0 10px;">المؤشرات الجسدية الرئيسية</div>
      <div class="rpt-metrics-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px;">
        <div class="rpt-metric-card" style="background: #fff5f9; border: 1px solid #f8c8dc; border-radius: 8px; padding: 10px 6px; text-align: center;">
          <div class="rpt-metric-val" style="font-size: 16px; font-weight: 800; color: #8b3a9e;">${val(d.weight)}<span style="font-size: 10px; color: #9878a8;"> كجم</span></div>
          <div class="rpt-metric-lbl" style="font-size: 11px; color: #503060; font-weight: 600; margin-top: 3px;">الوزن الحالي</div>
        </div>
        <div class="rpt-metric-card" style="background: #fff5f9; border: 1px solid #f8c8dc; border-radius: 8px; padding: 10px 6px; text-align: center;">
          <div class="rpt-metric-val" style="font-size: 16px; font-weight: 800; color: #8b3a9e;">${val(d.height)}<span style="font-size: 10px; color: #9878a8;"> سم</span></div>
          <div class="rpt-metric-lbl" style="font-size: 11px; color: #503060; font-weight: 600; margin-top: 3px;">الطول</div>
        </div>
        <div class="rpt-metric-card" style="background: #fff5f9; border: 1px solid #f8c8dc; border-radius: 8px; padding: 10px 6px; text-align: center;">
          <div class="rpt-metric-val" style="font-size: 16px; font-weight: 800; color: #8b3a9e;">${val(d.age)}</div>
          <div class="rpt-metric-lbl" style="font-size: 11px; color: #503060; font-weight: 600; margin-top: 3px;">العمر الزمني</div>
        </div>
        <div class="rpt-metric-card" style="background: #fff5f9; border: 1px solid #f8c8dc; border-radius: 8px; padding: 10px 6px; text-align: center;">
          <div class="rpt-metric-val" style="font-size: 16px; font-weight: 800; color: #8b3a9e;">${val(d.bioAge)}</div>
          <div class="rpt-metric-lbl" style="font-size: 11px; color: #503060; font-weight: 600; margin-top: 3px;">العمر البيولوجي</div>
        </div>
        <div class="rpt-metric-card" style="background: #fff5f9; border: 1px solid #f8c8dc; border-radius: 8px; padding: 10px 6px; text-align: center;">
          <div class="rpt-metric-val" style="font-size: 16px; font-weight: 800; color: #d4547f;">${val(d.bmi)}</div>
          <div class="rpt-metric-lbl" style="font-size: 11px; color: #503060; font-weight: 600; margin-top: 3px;">مؤشر كتلة الجسم (BMI)</div>
        </div>
        <div class="rpt-metric-card" style="background: #fff5f9; border: 1px solid #f8c8dc; border-radius: 8px; padding: 10px 6px; text-align: center;">
          <div class="rpt-metric-val" style="font-size: 12px; font-weight:bold; padding-top: 2px; color: #444;">${val(d.bmiNote)}</div>
          <div class="rpt-metric-lbl" style="font-size: 11px; color: #503060; font-weight: 600; margin-top: 3px;">تصنيف الـ BMI</div>
        </div>
        <div class="rpt-metric-card" style="background: #fff5f9; border: 1px solid #f8c8dc; border-radius: 8px; padding: 10px 6px; text-align: center;">
          <div class="rpt-metric-val" style="font-size: 16px; font-weight: 800; color: #8b3a9e;">${val(d.fat)}<span style="font-size: 10px; color: #9878a8;"> كجم</span></div>
          <div class="rpt-metric-lbl" style="font-size: 11px; color: #503060; font-weight: 600; margin-top: 3px;">الدهون الكلية</div>
        </div>
        <div class="rpt-metric-card" style="background: #fff5f9; border: 1px solid #f8c8dc; border-radius: 8px; padding: 10px 6px; text-align: center;">
          <div class="rpt-metric-val" style="font-size: 16px; font-weight: 800; color: #8b3a9e;">${val(d.muscles)}<span style="font-size: 10px; color: #9878a8;"> كجم</span></div>
          <div class="rpt-metric-lbl" style="font-size: 11px; color: #503060; font-weight: 600; margin-top: 3px;">العضلات الإجمالية</div>
        </div>
      </div>

      <div class="rpt-section-title" style="font-size: 14px; font-weight: 800; color: #8b3a9e; border-right: 5px solid #e8739a; padding-right: 10px; margin: 15px 0 10px;">توزيع العضلات</div>
      <div class="rpt-muscles-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 15px;">
        <div class="rpt-muscle-block" style="background: linear-gradient(135deg, #edd9f5, #fff5f9); border: 1px solid #f0d0e8; border-radius: 8px; padding: 10px;">
          <div class="rpt-muscle-title" style="font-size: 12px; font-weight: 700; color: #6b2080; margin-bottom: 6px; border-bottom: 1px solid #f0d0e8; padding-bottom: 4px;">عضلات الذراعين</div>
          <div class="rpt-muscle-row" style="display: flex; justify-content: space-between; font-size: 11px; color: #503060; margin-bottom: 3px;"><span>اليمين</span><span style="font-weight: 700; color: #8b3a9e;">${val(d.armR, "كجم")}</span></div>
          <div class="rpt-muscle-row" style="display: flex; justify-content: space-between; font-size: 11px; color: #503060; margin-bottom: 3px;"><span>اليسار</span><span style="font-weight: 700; color: #8b3a9e;">${val(d.armL, "كجم")}</span></div>
          <div class="rpt-muscle-row" style="display: flex; justify-content: space-between; font-size: 11px; color: #503060;"><span>الهدف</span><span style="font-weight: 700; color: #8b3a9e;">${val(d.armT, "كجم")}</span></div>
        </div>
        <div class="rpt-muscle-block" style="background: linear-gradient(135deg, #edd9f5, #fff5f9); border: 1px solid #f0d0e8; border-radius: 8px; padding: 10px;">
          <div class="rpt-muscle-title" style="font-size: 12px; font-weight: 700; color: #6b2080; margin-bottom: 6px; border-bottom: 1px solid #f0d0e8; padding-bottom: 4px;">عضلات الساقين</div>
          <div class="rpt-muscle-row" style="display: flex; justify-content: space-between; font-size: 11px; color: #503060; margin-bottom: 3px;"><span>اليمين</span><span style="font-weight: 700; color: #8b3a9e;">${val(d.legR, "كجم")}</span></div>
          <div class="rpt-muscle-row" style="display: flex; justify-content: space-between; font-size: 11px; color: #503060; margin-bottom: 3px;"><span>اليسار</span><span style="font-weight: 700; color: #8b3a9e;">${val(d.legL, "كجم")}</span></div>
          <div class="rpt-muscle-row" style="display: flex; justify-content: space-between; font-size: 11px; color: #503060;"><span>الهدف</span><span style="font-weight: 700; color: #8b3a9e;">${val(d.legT, "كجم")}</span></div>
        </div>
        <div class="rpt-muscle-block" style="background: linear-gradient(135deg, #edd9f5, #fff5f9); border: 1px solid #f0d0e8; border-radius: 8px; padding: 10px;">
          <div class="rpt-muscle-title" style="font-size: 12px; font-weight: 700; color: #6b2080; margin-bottom: 6px; border-bottom: 1px solid #f0d0e8; padding-bottom: 4px;">عضلات الجذع</div>
          <div class="rpt-muscle-row" style="display: flex; justify-content: space-between; font-size: 11px; color: #503060; margin-bottom: 3px;"><span>الحالية</span><span style="font-weight: 700; color: #8b3a9e;">${val(d.trunk, "كجم")}</span></div>
          <div class="rpt-muscle-row" style="display: flex; justify-content: space-between; font-size: 11px; color: #503060;"><span>الهدف</span><span style="font-weight: 700; color: #8b3a9e;">${val(d.trunkT, "كجم")}</span></div>
        </div>
      </div>

      <div class="rpt-section-title" style="font-size: 14px; font-weight: 800; color: #8b3a9e; border-right: 5px solid #e8739a; padding-right: 10px; margin: 15px 0 10px;">القياسات الجسدية</div>
      <div class="rpt-measures-grid" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 15px;">
        <div class="rpt-measure-card" style="background: #fff; border: 1px solid #f0d0e8; border-radius: 8px; padding: 8px 4px; text-align: center;">
          <div class="rpt-measure-val" style="font-size: 15px; font-weight: 800; color: #d4547f;">${val(d.chest)}<span style="font-size: 9px; color: #9878a8;"> سم</span></div>
          <div class="rpt-measure-lbl" style="font-size: 10.5px; color: #503060; font-weight: 600; margin-top: 3px;">الصدر</div>
        </div>
        <div class="rpt-measure-card" style="background: #fff; border: 1px solid #f0d0e8; border-radius: 8px; padding: 8px 4px; text-align: center;">
          <div class="rpt-measure-val" style="font-size: 15px; font-weight: 800; color: #d4547f;">${val(d.waist)}<span style="font-size: 9px; color: #9878a8;"> سم</span></div>
          <div class="rpt-measure-lbl" style="font-size: 10.5px; color: #503060; font-weight: 600; margin-top: 3px;">الخصر</div>
        </div>
        <div class="rpt-measure-card" style="background: #fff; border: 1px solid #f0d0e8; border-radius: 8px; padding: 8px 4px; text-align: center;">
          <div class="rpt-measure-val" style="font-size: 15px; font-weight: 800; color: #d4547f;">${val(d.hip)}<span style="font-size: 9px; color: #9878a8;"> سم</span></div>
          <div class="rpt-measure-lbl" style="font-size: 10.5px; color: #503060; font-weight: 600; margin-top: 3px;">الورك</div>
        </div>
        <div class="rpt-measure-card" style="background: #fff; border: 1px solid #f0d0e8; border-radius: 8px; padding: 8px 4px; text-align: center;">
          <div class="rpt-measure-val" style="font-size: 15px; font-weight: 800; color: #d4547f;">${val(d.wrist)}<span style="font-size: 9px; color: #9878a8;"> سم</span></div>
          <div class="rpt-measure-lbl" style="font-size: 10.5px; color: #503060; font-weight: 600; margin-top: 3px;">الزند</div>
        </div>
        <div class="rpt-measure-card" style="background: #fff; border: 1px solid #f0d0e8; border-radius: 8px; padding: 8px 4px; text-align: center;">
          <div class="rpt-measure-val" style="font-size: 15px; font-weight: 800; color: #d4547f;">${val(d.thigh)}<span style="font-size: 9px; color: #9878a8;"> سم</span></div>
          <div class="rpt-measure-lbl" style="font-size: 10.5px; color: #503060; font-weight: 600; margin-top: 3px;">الفخذ</div>
        </div>
      </div>

      ${d.notes ? `
      <div style="page-break-inside: avoid; break-inside: avoid;">
        <div class="rpt-section-title" style="font-size: 14px; font-weight: 800; color: #8b3a9e; border-right: 5px solid #e8739a; padding-right: 10px; margin: 15px 0 10px;">ملاحظات الدكتورة</div>
        <div class="rpt-notes-box" style="background: #fffbfd; border: 1px solid #f0d0e8; border-radius: 8px; padding: 12px; font-size: 12px; color: #503060; line-height: 1.7; white-space: pre-wrap;">${d.notes}</div>
      </div>` : ""}

      <div class="rpt-footer" style="margin-top: 15px; padding: 8px 15px; background: linear-gradient(90deg, #edd9f5, #fde8f0); border-radius: 8px; text-align: center; font-size: 10px; color: #9878a8; line-height: 1.6; page-break-inside: avoid; break-inside: avoid;">
        تم إصدار هذا التقرير بواسطة عيادة التغذية — Glowia Clinic<br/>
        إشراف الدكتورة صبا وليد الزعبي | ${date}
      </div>
    </div>`;

  target.innerHTML = reportHTML;
  target.style.display = "block";
  target.style.width = "185mm"; // تحديد عرض آمن متوافق مع الحواف الداخلية للطباعة
  target.style.position = "absolute";
  target.style.left = "-9999px";

  html2pdf().set({
    margin: [10, 12, 10, 12],
    filename: `Glowia_Report_${d.name}.pdf`,
    pagebreak: { mode: ['avoid-all', 'css'] },
    html2canvas: { 
      scale: 3,          
      useCORS: true,
      letterRendering: true,
      scrollX: 0,        
      scrollY: 0
    },
    jsPDF: { 
      unit: "mm", 
      format: "a4", 
      orientation: "portrait" 
    }
  }).from(target).save().then(() => {
    target.style.display = "none";
    target.style.position = "";
    target.style.left = "";
    toast("✅ تم تصدير تقرير المريض بنجاح");
  }).catch((err) => {
    console.error("PDF Export Error: ", err);
    toast("❌ حدث خطأ أثناء تصدير الملف", true);
  });
}

/* ═══════════════════════════════════════════════════════════
   دوال مساعدة
═══════════════════════════════════════════════════════════ */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function initials(n) {
  if (!n) return "؟";
  const p = n.trim().split(" ");
  return p.length >= 2 ? p[0][0] + p[1][0] : p[0][0] || "؟";
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ar-SA", { year:"numeric", month:"short", day:"numeric" });
  } catch { return "—"; }
}

function bmiChip(bmi) {
  if (bmi === "" || bmi === undefined || bmi === null)
    return '<span class="chip chip-na">—</span>';
  const n = parseFloat(bmi);
  if (n < 18.5) return `<span class="chip chip-u">${n} نحافة</span>`;
  if (n < 25)   return `<span class="chip chip-n">${n} طبيعي</span>`;
  if (n < 30)   return `<span class="chip chip-o">${n} زيادة</span>`;
  return              `<span class="chip chip-ob">${n} سمنة</span>`;
}

/* ─── Toast ─── */
let _toastT;
function toast(msg, warn = false) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.background = warn
    ? "linear-gradient(135deg,#b02020,#d94040)"
    : "linear-gradient(135deg,var(--mauve-deep),var(--rose))";
  el.classList.add("show");
  clearTimeout(_toastT);
  _toastT = setTimeout(() => el.classList.remove("show"), 3200);
}

/* ─── Overlay/Dialog listeners ─── */
document.getElementById("delOverlay").addEventListener("click", function(e) {
  if (e.target === this) closeDialog();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDialog(); });

/* ═══════════════════════════════════════════════════════════
   البدء
═══════════════════════════════════════════════════════════ */
init();

/* ─── STATE ─── */
const SK = "glowia_pts_v3";
const SPK = "glowia_plans_v3";
let patients = [];
let plans = {};
let editId = null;
let delId = null;
let planPtId = null;

const DAYS = [
    "السبت",
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
];
/* 6-meal sequence: breakfast, snack, lunch, snack, dinner, snack */
const MEALS = [{
        id: "فطور",
        label: "فطور",
        isSnack: false
    },
    {
        id: "سناك1",
        label: "سناك",
        isSnack: true
    },
    {
        id: "غداء",
        label: "غداء",
        isSnack: false
    },
    {
        id: "سناك2",
        label: "سناك",
        isSnack: true
    },
    {
        id: "عشاء",
        label: "عشاء",
        isSnack: false
    },
    {
        id: "سناك3",
        label: "سناك",
        isSnack: true
    },
];

/* ─── FORM MAP ─── */
const FM = {
    Name: "fName",
    Weight: "fWeight",
    Height: "fHeight",
    Age: "fAge",
    BioAge: "fBioAge",
    BMI: "fBMI",
    BMINote: "fBMINote",
    Fat: "fFat",
    TargetWeight: "fTargetWeight",
    Muscles: "fMuscles",
    LegR: "fLegR",
    LegL: "fLegL",
    LegT: "fLegT",
    ArmR: "fArmR",
    ArmL: "fArmL",
    ArmT: "fArmT",
    Trunk: "fTrunk",
    TrunkT: "fTrunkT",
    Chest: "fChest",
    Waist: "fWaist",
    Hip: "fHip",
    Wrist: "fWrist",
    Thigh: "fThigh",
    Notes: "fNotes",
};

/* ─── INIT ─── */
function init() {
    load();
    buildPlanTable();
    setDate();
    render();
}

function setDate() {
    const d = new Date();
    const s = d.toLocaleDateString("ar-SA", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    document.getElementById("hDate").textContent = s;
    document.getElementById("npDate").value = d.toLocaleDateString("ar-SA");
}

function load() {
    try {
        patients = JSON.parse(localStorage.getItem(SK) || "[]");
    } catch {
        patients = [];
    }
    try {
        plans = JSON.parse(localStorage.getItem(SPK) || "{}");
    } catch {
        plans = {};
    }
}

function saveAll() {
    localStorage.setItem(SK, JSON.stringify(patients));
}

function savePlanStore() {
    localStorage.setItem(SPK, JSON.stringify(plans));
}

/* ─── NAVIGATION ─── */
function navTo(pageId, el) {
    document
        .querySelectorAll(".page")
        .forEach((p) => p.classList.remove("active"));
    // desktop nav
    document
        .querySelectorAll(".nav-item")
        .forEach((n) => n.classList.remove("active"));
    // mobile nav
    document
        .querySelectorAll(".mob-nav-item")
        .forEach((n) => n.classList.remove("active"));

    document.getElementById("page-" + pageId).classList.add("active");

    // highlight correct nav items
    document
        .querySelectorAll("[data-page=" + pageId + "]")
        .forEach((n) => n.classList.add("active"));

    if (pageId === "dashboard") {
        render();
    }
    if (pageId === "nutrition") {
        loadPlanUI();
    }

    // scroll to top
    document.getElementById("mainArea").scrollTop = 0;
}

/* ─── PATIENT CRUD ─── */
function doNewPatient() {
    editId = null;
    planPtId = null;
    clearFm();
    document.getElementById("fmTitle").innerHTML =
        'إضافة <span class="accent">مريض جديد</span>';
    document.getElementById("fmSub").textContent =
        "أدخلي بيانات المريض بالكامل";
    setPatientCtx(null);
}

function clearFm() {
    Object.values(FM).forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

function readFm() {
    const d = {};
    Object.entries(FM).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (!el) return;
        const v = el.value.trim();
        const key = k[0].toLowerCase() + k.slice(1);
        d[key] = el.type === "number" ? (v === "" ? "" : parseFloat(v)) : v;
    });
    return d;
}

function fillFm(p) {
    Object.entries(FM).forEach(([k, id]) => {
        const el = document.getElementById(id);
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
        const i = patients.findIndex((x) => x.id === editId);
        if (i > -1) {
            patients[i] = {
                ...patients[i],
                ...d,
                updatedAt: new Date().toISOString(),
            };
        }
        toast("تم تحديث بيانات المريض بنجاح");
    } else {
        const np = {
            id: uid(),
            ...d,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        patients.push(np);
        editId = np.id;
        planPtId = np.id;
        toast("تم حفظ المريض بنجاح");
    }
    saveAll();
    updateBadge();
    updateStats();
    setPatientCtx(d.name);
}

function loadPatient(id) {
    const p = patients.find((x) => x.id === id);
    if (!p) return;
    editId = id;
    planPtId = id;
    fillFm(p);
    document.getElementById("fmTitle").innerHTML =
        'تعديل <span class="accent">' + (p.name || "المريض") + "</span>";
    document.getElementById("fmSub").textContent =
        "راجعي وعدّلي بيانات المريض";
    setPatientCtx(p.name);
    navTo("patient", document.querySelector("[data-page=patient]"));
}

function gotoNutrition() {
    const d = readFm();
    if (d.name) savePatient();
    navTo("nutrition", document.querySelector("[data-page=nutrition]"));
}

function openNutrition(id) {
    const p = patients.find((x) => x.id === id);
    if (!p) return;
    editId = id;
    planPtId = id;
    fillFm(p);
    setPatientCtx(p.name);
    document.getElementById("npName").textContent = p.name || "—";
    document.getElementById("npNameIn").value = p.name || "";
    loadPlanUI();
    navTo("nutrition", document.querySelector("[data-page=nutrition]"));
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

/* ─── DASHBOARD RENDER ─── */
function render() {
    renderTable();
    updateStats();
    updateBadge();
}

function renderTable() {
    const q = (document.getElementById("searchQ")?.value || "")
        .trim()
        .toLowerCase();
    const f = q ?
        patients.filter((p) => (p.name || "").toLowerCase().includes(q)) :
        patients;
    const body = document.getElementById("patientsBody");
    const empty = document.getElementById("dashEmpty");

    if (!f.length) {
        body.innerHTML = "";
        empty.style.display = "";
        empty.innerHTML = q ?
            '<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><p>لا توجد نتائج</p><small>جربي كلمة بحث أخرى</small>' :
            '<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><p>لا يوجد مرضى مسجلون</p><small>اضغط "إضافة مريض جديد" للبدء</small>';
        return;
    }
    empty.style.display = "none";

    const sorted = [...f].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    body.innerHTML = sorted
        .map((p, i) => {
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
        })
        .join("");
}

function updateStats() {
    const today = new Date().toDateString();
    document.getElementById("stTotal").textContent = patients.length;
    document.getElementById("stToday").textContent = patients.filter(
        (p) => new Date(p.createdAt).toDateString() === today,
    ).length;
    document.getElementById("stGoal").textContent = patients.filter(
        (p) => p.targetWeight,
    ).length;
    document.getElementById("stPlans").textContent = Object.keys(
        plans,
    ).filter((id) => patients.find((p) => p.id === id)).length;
}

function updateBadge() {
    document.getElementById("navCount").textContent = patients.length;
}

/* ─── DELETE ─── */
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
    patients = patients.filter((x) => x.id !== delId);
    delete plans[delId];
    saveAll();
    savePlanStore();
    if (editId === delId) {
        editId = null;
        clearFm();
        setPatientCtx(null);
    }
    if (planPtId === delId) planPtId = null;
    delId = null;
    closeDialog();
    render();
    toast("تم حذف المريض بنجاح");
}

/* ─── NUTRITION PLAN TABLE ─── */
function buildPlanTable() {
    const body = document.getElementById("planBody");
    body.innerHTML = "";
    MEALS.forEach((m) => {
        const tr = document.createElement("tr");
        if (m.isSnack) tr.classList.add("meal-snack");
        let html = `<td class="row-lbl">${m.label}</td>`;
        DAYS.forEach((day) => {
            html += `<td><textarea placeholder="" id="cell_${m.id}_${day}"></textarea></td>`;
        });
        tr.innerHTML = html;
        body.appendChild(tr);
    });
}

function getPlanData() {
    const d = {};
    MEALS.forEach((m) => {
        d[m.id] = {};
        DAYS.forEach((day) => {
            const el = document.getElementById(`cell_${m.id}_${day}`);
            d[m.id][day] = el ? el.value : "";
        });
    });
    d._inst = document.getElementById("npInst").value;
    d._allowed = document.getElementById("npAllowed").value;
    d._forbidden = document.getElementById("npForbidden").value;
    d._name = document.getElementById("npNameIn").value;
    d._date = document.getElementById("npDate").value;
    return d;
}

function setPlanData(d) {
    if (!d) return;
    MEALS.forEach((m) => {
        DAYS.forEach((day) => {
            const el = document.getElementById(`cell_${m.id}_${day}`);
            if (el) el.value = (d[m.id] && d[m.id][day]) || "";
        });
    });
    const safe = (id, v) => {
        const el = document.getElementById(id);
        if (el && v) el.value = v;
    };
    safe("npInst", d._inst);
    safe("npAllowed", d._allowed);
    safe("npForbidden", d._forbidden);
    safe("npNameIn", d._name);
    safe("npDate", d._date);
    if (d._name) document.getElementById("npName").textContent = d._name;
}

function loadPlanUI() {
    const key = planPtId || "_draft";
    if (plans[key]) setPlanData(plans[key]);
    const p = planPtId ? patients.find((x) => x.id === planPtId) : null;
    if (p) {
        document.getElementById("npName").textContent = p.name || "—";
        document.getElementById("npNameIn").value = p.name || "";
    }
}

function savePlan() {
    const d = getPlanData();
    const key = planPtId || "_draft";
    plans[key] = d;
    savePlanStore();
    toast("تم حفظ البرنامج الغذائي");
}

function clearPlan() {
    MEALS.forEach((m) =>
        DAYS.forEach((day) => {
            const el = document.getElementById(`cell_${m.id}_${day}`);
            if (el) el.value = "";
        }),
    );
    ["npInst", "npAllowed", "npForbidden"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

/* ─── PDF EXPORT ─── */

function exportPDF() {
    savePlan();
    const d = getPlanData();
    const target = document.getElementById('pdfTarget');
    toast('⏳ جاري التصدير بالحل النهائي... يا رب!');

    // وظيفة عبقرية: تغليف كل كلمة بـ span له هامش لمنع الالتصاق نهائياً
    const fixAr = (str) => {
        if (!str || str.trim() === '') return '—';
        return str.trim().split(/\s+/).map(word =>
            `<span style="display:inline-block; margin-left:4px;">${word}</span>`
        ).join('');
    };

    let rowsHtml = '';
    MEALS.forEach(meal => {
        rowsHtml += `<tr>
            <td style="background:#F3E5F5; font-weight:bold; color:#8B3A9E; width:15%; border:1px solid #ddd; font-size:11px;">${meal.label}</td>`;
        DAYS.forEach(day => {
            const val = (d[meal.id] && d[meal.id][day]) ? d[meal.id][day] : '';
            rowsHtml += `<td style="border:1px solid #ddd; font-size:10px; padding:8px; line-height:1.6;">${fixAr(val)}</td>`;
        });
        rowsHtml += `</tr>`;
    });

    const pdfTemplate = `
        <div class="pdf-page" style="direction:rtl; text-align:right; font-family:'Tajawal', sans-serif; padding:15mm; background:white;">
            
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:4px solid #E8739A; padding-bottom:15px; margin-bottom:25px;">
                <div style="flex:2">
                    <h1 style="color:#8B3A9E; margin:0; font-size:26px; white-space:nowrap;">${fixAr("عيادة التغذية")}</h1>
                    <p style="margin:5px 0; color:#D4547F; font-weight:900; font-size:18px;">${fixAr("الدكتورة صبا وليد الزعبي")}</p>
                </div>
                <div style="text-align:left; font-size:12px; color:#666; flex:1" dir="ltr">
                    sebaalzoubi03@gmail.com<br>0982720825
                </div>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:25px; background:#FFF5F9; border:1px solid #F8C8DC; border-radius:12px;">
                <tr>
                    <td style="padding:15px; font-size:13px;"><b style="color:#8B3A9E;">${fixAr(":الاسم")}</b> ${fixAr(d._name)}</td>
                    <td style="padding:15px; font-size:13px;"><b style="color:#8B3A9E;">${fixAr(":التاريخ")}</b> ${fixAr(new Date().toLocaleDateString('ar-SA'))}</td>
                    <td style="padding:15px; font-size:13px;"><b style="color:#8B3A9E;">${fixAr(":الهدف")}</b><span style="display:inline-block; margin-right:10px;">${fixAr(document.getElementById('fTargetWeight')?.value ? document.getElementById('fTargetWeight').value + ' KG' : '')}</span></td>
                </tr>
            </table>

            <div style="color:#8B3A9E; border-right:6px solid #E8739A; padding-right:12px; font-weight:900; margin-bottom:15px; font-size:18px;">
                ${fixAr("البرنامج الغذائي الأسبوعي")}
            </div>
            
            <table style="width:100%; border-collapse:collapse; margin-bottom:25px; table-layout:fixed; border:1px solid #ddd;">
                <thead>
                    <tr style="background:#8B3A9E; color:white;">
                        <th style="padding:10px; border:1px solid #8B3A9E; font-size:12px; width:14%;">الوجبة</th>
                        ${DAYS.map(day => `<th style="padding:10px; border:1px solid #8B3A9E; font-size:11px;">${day}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <div>
                    <div style="color:#8B3A9E; border-right:5px solid #E8739A; padding-right:10px; font-weight:bold; margin-bottom:8px; font-size:15px;">${fixAr("المسموحات")}</div>
                    <div style="background:#fdfdfd; border:1px solid #eee; padding:15px; border-radius:10px; min-height:80px; font-size:12px; line-height:1.8;">${fixAr(d._allowed)}</div>
                </div>
                <div>
                    <div style="color:#8B3A9E; border-right:5px solid #666; padding-right:10px; font-weight:bold; margin-bottom:8px; font-size:15px;">${fixAr("الممنوعات")}</div>
                    <div style="background:#fdfdfd; border:1px solid #eee; padding:15px; border-radius:10px; min-height:80px; font-size:12px; line-height:1.8;">${fixAr(d._forbidden)}</div>
                </div>
            </div>

            <div style="margin-top:25px;">
                <div style="color:#8B3A9E; border-right:5px solid #E8739A; padding-right:10px; font-weight:bold; margin-bottom:8px; font-size:15px;">${fixAr("تعليمات إضافية")}</div>
                <div style="background:#fdfdfd; border:1px solid #eee; padding:15px; border-radius:10px; font-size:12px; line-height:1.8;">${fixAr(d._inst)}</div>
            </div>
        </div>
    `;

    target.innerHTML = pdfTemplate;
    target.style.display = 'block';

    html2pdf().set({
        margin: 5,
        filename: `Glowia_Plan_${d._name || 'Client'}.pdf`,
        image: {
            type: 'jpeg',
            quality: 1
        },
        html2canvas: {
            scale: 3,
            useCORS: true,
            letterRendering: false
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    }).from(target).save().then(() => {
        target.style.display = 'none';
        toast('✅ تم بنجاح! تم حفظ البرنامج الغذائي كملف PDF');
    });
}
/* ─── HELPERS ─── */
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
        return new Date(iso).toLocaleDateString("ar-SA", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "—";
    }
}

function bmiChip(bmi) {
    if (bmi === "" || bmi === undefined || bmi === null)
        return '<span class="chip chip-na">—</span>';
    const n = parseFloat(bmi);
    if (n < 18.5) return `<span class="chip chip-u">${n} نحافة</span>`;
    if (n < 25) return `<span class="chip chip-n">${n} طبيعي</span>`;
    if (n < 30) return `<span class="chip chip-o">${n} زيادة</span>`;
    return `<span class="chip chip-ob">${n} سمنة</span>`;
}

let _toastT;

function toast(msg, warn = false) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.style.background = warn ?
        "linear-gradient(135deg,#b02020,#d94040)" :
        "linear-gradient(135deg,var(--mauve-deep),var(--rose))";
    el.classList.add("show");
    clearTimeout(_toastT);
    _toastT = setTimeout(() => el.classList.remove("show"), 3200);
}

/* ─── OVERLAY ─── */
document
    .getElementById("delOverlay")
    .addEventListener("click", function (e) {
        if (e.target === this) closeDialog();
    });
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDialog();
});

/* ─── KICK OFF ─── */
init();
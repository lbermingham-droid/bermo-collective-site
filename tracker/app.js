/* BERMO TRACKER — application logic */
(function(){
"use strict";

const DATA = window.BERMO_DATA;
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// Single-init pipeline: modules queue their setup with onReady(); ONE
// DOMContentLoaded listener (registered at the bottom of this file) runs the
// queue in file order, each step isolated so one failure can't kill the rest.

/* =====================================================================
   CODE MAP (major blocks, in file order)
   ---------------------------------------------------------------------
    1. Init helpers (onReady / on) + storage + state
    2. Onboarding wizard + gate
    3. Tabs (goBase) + renderAll dispatch + toast/modal helpers
    4. Nutrition: totals, water, food modal (search/quicklog/templates/
       AI/barcode), meal render, quick chips
    5. Dashboard base render + activity (autoComputeActivity, rings)
    6. Activity log modal (Apple Watch snap) + macro calculator
    7. Fitness: WODs, lift modal, PRs (1/2/3/5RM), session lists
    8. Plan: weekly planner, plan-day modal (exercise schemes), programs
    9. Detail overlay (Day/Week/Month/90D/Year drill-down)
   10. Settings, AI setup (BYOK legacy), history/export
   11. Brain Dump (server ai-parse) + review/apply
   12. Workout Session overlay (live set logger + rest timer)
   13. Body Part Coverage + trends/insight engine + symptoms + cycle
   14. Reminders + smart banners + accountability callouts
   15. IRON deck (4-ring today/week + hit/fail strips)
   16. Cardio logger (MET) · Workout Library (builder/assign/start)
   17. Home cards (Today's Nutrition, Workouts This Week) · Goals view
   18. Muscle Map v2 + partsForExercise + sub-navs (fitness/nutrition)
   19. v9: section rings, training-volume progress, nutrients table,
       body composition
   20. PIPELINES (composed renders — extend HERE) + single init runner
   ===================================================================== */

const INIT_QUEUE = [];
function onReady(fn){ INIT_QUEUE.push(fn); }

// Bind an event to an element if it exists; warn (don't crash) if it doesn't.
// Static UI evolves — a removed element must never take down the whole init.
function on(sel, evt, fn){
  const el = document.querySelector(sel);
  if(el) el.addEventListener(evt, fn);
  else console.warn("[bermo] missing element for binding:", sel);
  return el;
}


// ---------- STORAGE ----------
const KEY = "bermo.tracker.v1";
let state = load();

function load(){
  try{ const raw = localStorage.getItem(KEY); if(raw) return JSON.parse(raw); }catch(e){}
  return defaultState();
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function defaultState(){
  return {
    profile:{ name:"", units:"imperial", onboarded:false },
    goals:{ ...DATA.defaultGoals },
    customFoods:[],
    days:{},                  // days[YYYY-MM-DD] = { meals:{breakfast:[], lunch:[], dinner:[], snacks:[]}, water:0, sessions:[], wodId:null, wodResult:null }
    weights:[],               // [{date,val}]
    measurements:[],          // [{date,type,val}]
    prs:{},                   // prs[lift] = {val, date, unit}
    wodIndex: 0,
  };
}
function todayKey(d){ const x = d || new Date(); return x.toISOString().slice(0,10); }
function dayObj(key){
  if(!state.days[key]) state.days[key] = {
    meals:{breakfast:[],lunch:[],dinner:[],snacks:[]},
    water:0, sessions:[], wodId:null, wodResult:null
  };
  return state.days[key];
}

// ---------- VIEW STATE ----------
let currentTab = "dashboard";
let currentDate = todayKey();

// ---------- INIT / GATE ----------
function init(){
  if(state.profile.onboarded){ enterApp(); }
  else { showGate(); }
  bindGlobal();
  // Apply preferred start tab if set
  if(state.profile.onboarded && state.profile.startTab && state.profile.startTab !== "dashboard"){
    setTimeout(() => { try{ go(state.profile.startTab); }catch(e){} }, 0);
  }
}
function showGate(){
  $("#gate").classList.remove("hidden");
  $("#app").classList.add("hidden");
  initWizard();
}

// ---------- SMART ONBOARDING WIZARD ----------
let wizStep = 1;
const WIZ_TOTAL = 3;

function initWizard(){
  // pre-fill from any prior profile
  const p = state.profile || {};
  if(p.name) $("#wizName").value = p.name;
  if(p.sex) $("#wizSex").value = p.sex;
  if(p.ageYears) $("#wizAge").value = p.ageYears;
  if(p.units) $("#wizUnits").value = p.units;
  if(p.heightIn){
    if(p.units === "metric"){
      $("#wizHeightCm").value = Math.round(p.heightIn * 2.54);
    } else {
      $("#wizHeightFt").value = Math.floor(p.heightIn / 12);
      $("#wizHeightIn").value = Math.round(p.heightIn % 12);
    }
  }
  if(p.weightLb) $("#wizWeight").value = p.units === "metric" ? Math.round(p.weightLb * 0.4536 * 10)/10 : p.weightLb;
  if(p.goal) $("#wizGoal").value = p.goal;
  if(p.goalRateLbWk) $("#wizRate").value = p.goalRateLbWk;
  if(p.activityLevel) $("#wizActivity").value = p.activityLevel;
  if(p.experience) $("#wizExp").value = p.experience;
  if(p.daysPerWeek) $("#wizDays").value = p.daysPerWeek;
  if(p.equipment) $("#wizEquipment").value = p.equipment;

  $("#wizUnits").addEventListener("change", onWizUnitsChange);
  $("#wizGoal").addEventListener("change", onWizGoalChange);
  $("#wizPrev").addEventListener("click", () => wizGo(wizStep - 1));
  $("#wizNext").addEventListener("click", () => wizGo(wizStep + 1));
  $("#wizApply").addEventListener("click", wizApply);
  onWizUnitsChange();
  onWizGoalChange();
  wizGo(1);
}

function onWizUnitsChange(){
  const metric = $("#wizUnits").value === "metric";
  $("#wizWtUnit").textContent = metric ? "(kg)" : "(lb)";
  const imp = $("#wizHtRowImperial"), met = $("#wizHtRowMetric");
  if(imp) imp.style.display = metric ? "none" : "grid";
  if(met) met.style.display = metric ? "block" : "none";
}
function onWizGoalChange(){
  const v = $("#wizGoal").value;
  $("#wizRateWrap").style.display = v === "maintain" ? "none" : "block";
  $("#wizRateLabel").textContent = v === "lose" ? "Loss rate" : "Gain rate";
}

function wizGo(n){
  if(n < 1) return;
  if(n > WIZ_TOTAL) return;
  if(n > wizStep && !wizValidateCurrent()) return;
  wizStep = n;
  $$(".wiz-step").forEach(el => el.classList.toggle("active", parseInt(el.dataset.step,10) === n));
  $("#wizProgFill").style.width = ((n / WIZ_TOTAL) * 100) + "%";
  $("#wizStepLabel").textContent = `Step ${n} of ${WIZ_TOTAL} — ${["About you","Your goal","Review"][n-1]}`;
  $("#wizPrev").style.display = n === 1 ? "none" : "inline-block";
  $("#wizNext").style.display = n === WIZ_TOTAL ? "none" : "inline-block";
  $("#wizApply").style.display = n === WIZ_TOTAL ? "inline-block" : "none";
  if(n === WIZ_TOTAL) renderWizSummary();
}

function wizValidateCurrent(){
  if(wizStep === 1){
    if(!$("#wizName").value.trim()) { toast("Add your name", "err"); return false; }
    const age = parseInt($("#wizAge").value, 10);
    if(!(age >= 13 && age <= 99)) { toast("Age 13–99", "err"); return false; }
  }
  return true;
}

function wizCollect(){
  const metric = $("#wizUnits").value === "metric";
  const weightInput = parseFloat($("#wizWeight").value);
  let heightIn;
  if(metric){
    const cm = parseFloat($("#wizHeightCm").value);
    heightIn = cm / 2.54;
  } else {
    const ft = parseInt($("#wizHeightFt").value, 10) || 0;
    const inches = parseInt($("#wizHeightIn").value, 10) || 0;
    heightIn = ft * 12 + inches;
  }
  return {
    name: $("#wizName").value.trim() || "Athlete",
    sex: $("#wizSex").value,
    ageYears: parseInt($("#wizAge").value, 10),
    units: metric ? "metric" : "imperial",
    heightIn,
    weightLb: metric ? weightInput / 0.4536 : weightInput,
    goal: $("#wizGoal").value,
    goalRateLbWk: parseFloat($("#wizRate").value),
    activityLevel: parseFloat($("#wizActivity").value),
    experience: $("#wizExp").value,
    daysPerWeek: parseInt($("#wizDays").value, 10),
    equipment: $("#wizEquipment").value,
  };
}

function computeTargets(p){
  // Mifflin-St Jeor (kg, cm)
  const kg = p.weightLb * 0.4536;
  const cm = p.heightIn * 2.54;
  const bmr = Math.round(p.sex === "male"
    ? 10*kg + 6.25*cm - 5*p.ageYears + 5
    : 10*kg + 6.25*cm - 5*p.ageYears - 161);
  const tdee = Math.round(bmr * p.activityLevel);
  let delta = 0;
  if(p.goal === "lose") delta = -Math.round(p.goalRateLbWk * 500);
  if(p.goal === "gain") delta =  Math.round(p.goalRateLbWk * 500);
  const cal = Math.max(1200, tdee + delta);
  // macro split shifts slightly by goal
  let pPct = 0.30, cPct = 0.40, fPct = 0.30;
  if(p.goal === "lose")  { pPct = 0.35; cPct = 0.35; fPct = 0.30; }
  if(p.goal === "gain")  { pPct = 0.28; cPct = 0.45; fPct = 0.27; }
  const protein = Math.round(cal * pPct / 4);
  const carbs   = Math.round(cal * cPct / 4);
  const fat     = Math.round(cal * fPct / 9);
  return { bmr, tdee, cal, protein, carbs, fat };
}

function suggestSplit(p){
  if(p.experience === "beginner" || p.daysPerWeek <= 3){
    return { id:"fb3", name:"Full Body 3x", days:3, focus:"Compound lifts every session — fastest beginner gains.", template:"Full Body 3x" };
  }
  if(p.daysPerWeek === 4){
    return { id:"ul4", name:"Upper / Lower 4x", days:4, focus:"Two upper days, two lower. Great balance for intermediates.", template:"Upper/Lower 4x" };
  }
  if(p.daysPerWeek >= 5){
    return { id:"ppl", name:"Push / Pull / Legs", days:6, focus:"Hits each muscle group 2x/week with high volume.", template:"PPL" };
  }
  return { id:"fb3", name:"Full Body 3x", days:3, focus:"Solid default.", template:"Full Body 3x" };
}

function renderWizSummary(){
  const p = wizCollect();
  const t = computeTargets(p);
  const split = suggestSplit(p);
  const goalLabel = p.goal === "lose" ? `Lose ${p.goalRateLbWk} lb/wk`
                  : p.goal === "gain" ? `Gain ${p.goalRateLbWk} lb/wk`
                  : "Maintain";
  $("#wizSummary").innerHTML = `
    <div class="wiz-sum-grid">
      <div class="wiz-sum-cell"><span>BMR</span><strong>${t.bmr}</strong><em>cal</em></div>
      <div class="wiz-sum-cell"><span>TDEE</span><strong>${t.tdee}</strong><em>cal</em></div>
      <div class="wiz-sum-cell hl"><span>Daily target</span><strong>${t.cal}</strong><em>cal</em></div>
      <div class="wiz-sum-cell"><span>Goal</span><strong>${goalLabel}</strong></div>
    </div>
    <div class="wiz-macro-row">
      <div class="wiz-macro p"><span>Protein</span><strong>${t.protein} g</strong></div>
      <div class="wiz-macro c"><span>Carbs</span><strong>${t.carbs} g</strong></div>
      <div class="wiz-macro f"><span>Fat</span><strong>${t.fat} g</strong></div>
    </div>`;
  $("#wizSplitCard").innerHTML = `
    <div class="wiz-split-head">Suggested split</div>
    <div class="wiz-split-name">${split.name}</div>
    <div class="wiz-split-focus">${split.focus}</div>
    <div class="wiz-split-meta">${split.days} days/week · matches your ${p.experience} level + ${p.daysPerWeek} day availability</div>`;
}

function wizApply(){
  const p = wizCollect();
  const t = computeTargets(p);
  const split = suggestSplit(p);
  state.profile = {
    ...state.profile,
    ...p,
    onboarded: true,
    onboardedAt: new Date().toISOString(),
    suggestedSplit: split.id,
    suggestedSplitName: split.name,
  };
  state.goals.cal = t.cal;
  state.goals.protein = t.protein;
  state.goals.carbs = t.carbs;
  state.goals.fat = t.fat;
  state.goals.bmr = t.bmr;
  state.goals.tdee = t.tdee;
  // Seed weight history if empty
  if(!state.weights.length){
    state.weights.push({ date: todayKey(), val: p.weightLb });
  }
  save();
  toast("Profile saved — let's go", "ok");
  enterApp();
}

// Re-run wizard from Settings
window.bermoRerunSetup = function(){
  $("#app").classList.add("hidden");
  $("#gate").classList.remove("hidden");
  initWizard();
};
function enterApp(){
  $("#gate").classList.add("hidden");
  $("#app").classList.remove("hidden");
  renderAll();
}

// ---------- TABS ----------
function goBase(tab){
  currentTab = tab;
  $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-"+tab));
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  $$(".mtab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  renderAll();
}

function bindGlobal(){
  $$(".tab,.mtab").forEach(b => b.addEventListener("click", () => go(b.dataset.tab)));
  document.addEventListener("click", (e) => {
    const goBtn = e.target.closest("[data-go]");
    if(goBtn) go(goBtn.dataset.go);
  });

  // Nutrition date picker
  on("#nutDateInput", "change", (e) => { currentDate = e.target.value; renderAll(); });
  on("#nutPrev", "click", () => shiftDate(-1));
  on("#nutNext", "click", () => shiftDate(1));



  // Quick chips

  // WOD shuffle
  on("#wodShuffle", "click", shuffleWod);
  on("#fitShuffle", "click", shuffleWod);
  on("#fitWodPicker", "change", (e) => { dayObj(currentDate).wodId = parseInt(e.target.value,10); save(); renderAll(); });

  // Fitness logging
  on("#fitNewLift", "click", openLiftHub);
  on("#fitNewWod", "click", openWodResultModal);
  on("#fitLogResult", "click", openWodResultModal);
  on("#addPrBtn", "click", openPrModal);

  // Body
  on("#weighInBtn", "click", openWeighInModal);
  on("#measureBtn", "click", openMeasureModal);

  // History filter
  on("#historyFilter", "change", renderHistory);
  on("#exportBtn", "click", exportData);

  // Settings forms
  on("#profileForm", "submit", saveProfile);
  on("#goalsForm", "submit", saveGoals);
  on("#customFoodForm", "submit", addCustomFood);
  on("#logoutBtn", "click", logout);
  on("#resetBtn", "click", resetAll);

  // Modal close
  $$("#modal [data-close]").forEach(b => b.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeModal(); });
}

function shiftDate(dir){
  const d = new Date(currentDate); d.setDate(d.getDate() + dir);
  currentDate = todayKey(d);
  renderAll();
}

// ---------- TOAST ----------
let toastTimer;
function toast(msg, kind=""){
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show " + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

// ---------- MODAL ----------
function openModal(title, bodyHtml, onMount){
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHtml;
  $("#modal").classList.add("open");
  if(onMount) onMount($("#modalBody"));
}
function closeModal(){ $("#modal").classList.remove("open"); }

// ---------- NUTRITION ----------
function totalsFor(key){
  const day = dayObj(key);
  let cal=0,p=0,c=0,f=0;
  ["breakfast","lunch","dinner","snacks"].forEach(m => {
    day.meals[m].forEach(it => { cal += it.cal; p += it.p; c += it.c; f += it.f; });
  });
  return { cal:Math.round(cal), p:Math.round(p), c:Math.round(c), f:Math.round(f) };
}
function addWater(oz){
  const d = dayObj(currentDate);
  d.water = Math.max(0, Math.min(state.goals.water * 2, d.water + oz));
  save(); renderAll();
}
function copyYesterday(){
  const y = new Date(currentDate); y.setDate(y.getDate()-1);
  const yKey = todayKey(y);
  const yDay = state.days[yKey];
  if(!yDay){ toast("No meals to copy from yesterday.", "pink"); return; }
  const cur = dayObj(currentDate);
  let copied = 0;
  ["breakfast","lunch","dinner","snacks"].forEach(m => {
    yDay.meals[m].forEach(it => {
      cur.meals[m].push({...it, id: uid()});
      copied++;
    });
  });
  save(); renderAll();
  toast(copied ? `Copied ${copied} items` : "Nothing to copy", "cyan");
}

// ---------- FOOD MODAL ----------
let _activeFoodMeal = "lunch";
function openFoodModal(meal){
  _activeFoodMeal = meal;
  const allFoods = [...DATA.foodDB, ...state.customFoods];
  const hasRecents = (state.recentFoods || []).length > 0;
  const hasTemplates = (state.mealTemplates || []).length > 0;
  // Smart default: if user has recents/templates, jump straight to one-tap quick log.
  const userPref = state.profile && state.profile.foodMode;
  const startMode = userPref || ((hasRecents || hasTemplates) ? "quicklog" : "search");
  const slotPills = ["breakfast","lunch","dinner","snacks"].map(m =>
    `<button type="button" class="meal-slot ${m===meal?"on":""}" data-meal-slot="${m}">${capitalize(m)}</button>`
  ).join("");
  openModal(`Log food`, `
    <div class="meal-slot-row" role="radiogroup" aria-label="Meal slot">${slotPills}</div>
    <div class="food-tabs">
      <button type="button" class="food-tab" data-fmode="quicklog">Quick log</button>
      <button type="button" class="food-tab" data-fmode="search">Search</button>
      <button type="button" class="food-tab" data-fmode="templates">Templates</button>
      <button type="button" class="food-tab" data-fmode="ai">AI</button>
      <button type="button" class="food-tab" data-fmode="barcode">Barcode</button>
    </div>
    <div class="food-pane" data-pane="search">
      <input type="search" id="foodSearch" class="search-input" placeholder="Search 200+ foods, restaurants, brands…" autocomplete="off">
      <ul class="search-results" id="searchResults"></ul>
    </div>
    <div class="food-pane" data-pane="quicklog">
      <input type="search" id="qlFilter" class="search-input" placeholder="Filter list…" autocomplete="off">
      <div class="ql-section-label">Recents</div>
      <ul class="ql-list" id="qlRecents"></ul>
      <div class="ql-section-label">All foods</div>
      <ul class="ql-list" id="qlAll"></ul>
    </div>
    <div class="food-pane" data-pane="templates">
      <p class="ql-hint">Save this meal as a template, or apply a saved one.</p>
      <ul class="ql-list" id="tplList"></ul>
      <button type="button" class="btn btn-ghost btn-sm" id="tplSaveCurrent" style="margin-top:8px">+ Save current ${capitalize(meal)} as template</button>
    </div>
    <div class="food-pane" data-pane="ai">
      <p class="ql-hint" id="foodAIStatusHint">Use an AI key (Claude or OpenAI) to read a photo of your plate or parse a typed description.</p>
      <button type="button" class="btn btn-cyan" id="foodAIPhotoBtn" style="width:100%;margin-bottom:8px">Snap a photo of food</button>
      <button type="button" class="btn btn-ghost" id="foodAITextBtn" style="width:100%;margin-bottom:8px">Type what you ate</button>
      <button type="button" class="btn btn-ghost btn-sm" id="foodAISetupBtn" style="width:100%;font-size:11px"><span class="bi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.11a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.11A1.6 1.6 0 0 0 4.57 8.8a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.11a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.11a1.6 1.6 0 0 0-1.47 1Z"/></svg></span> Set up / change API key</button>
    </div>
    <div class="food-pane" data-pane="barcode">
      <button type="button" class="btn btn-cyan" id="foodBarcodeBtn" style="width:100%;margin-bottom:8px">Scan with camera</button>
      <button type="button" class="btn btn-ghost" id="foodBarcodeManualBtn" style="width:100%">Type UPC manually</button>
    </div>
  `, () => {
    // Meal-slot pills — let user switch slot inside the modal so they don't get locked in
    document.querySelectorAll("[data-meal-slot]").forEach(b => {
      b.addEventListener("click", () => {
        _activeFoodMeal = b.dataset.mealSlot;
        document.querySelectorAll("[data-meal-slot]").forEach(x => x.classList.toggle("on", x === b));
        const tplSaveBtn = document.getElementById("tplSaveCurrent");
        if(tplSaveBtn) tplSaveBtn.textContent = `+ Save current ${capitalize(_activeFoodMeal)} as template`;
      });
    });

    // Tab switching
    const switchPane = (mode) => {
      document.querySelectorAll(".food-tab").forEach(t => t.classList.toggle("active", t.dataset.fmode === mode));
      document.querySelectorAll(".food-pane").forEach(p => p.classList.toggle("active", p.dataset.pane === mode));
    };
    document.querySelectorAll(".food-tab").forEach(t => t.addEventListener("click", () => switchPane(t.dataset.fmode)));
    switchPane(startMode);

    const input = $("#foodSearch");
    const list = $("#searchResults");

    // BARCODE pane
    const bc = $("#foodBarcodeBtn"); if(bc) bc.addEventListener("click", () => openBarcodeScanner(_activeFoodMeal));
    const bcm = $("#foodBarcodeManualBtn"); if(bcm) bcm.addEventListener("click", () => openBarcodeManual(_activeFoodMeal));

    // AI pane — reuse existing AI photo + text modals
    const aip = $("#foodAIPhotoBtn"); if(aip) aip.addEventListener("click", () => { closeModal(); if(typeof openAIPhotoModal === "function") openAIPhotoModal(_activeFoodMeal); });
    const ait = $("#foodAITextBtn"); if(ait) ait.addEventListener("click", () => { closeModal(); if(typeof openAITextModal === "function") openAITextModal(_activeFoodMeal); });
    const aiSetup = $("#foodAISetupBtn");
    if(aiSetup) aiSetup.addEventListener("click", () => { closeModal(); if(typeof openAIKeyPrompt === "function") openAIKeyPrompt("Set or change your AI key for photo + text food logging."); });
    // Show whether a key is already saved so the user knows what to expect
    const statusHint = $("#foodAIStatusHint");
    if(statusHint && typeof getAI === "function"){
      const ai = getAI();
      if(ai.key){
        statusHint.innerHTML = `<span style="color:var(--cyan)">✓ ${escape(ai.provider || "AI")} key saved.</span> Tap to log a photo or type a description — AI fills in calories + macros.`;
      } else {
        statusHint.innerHTML = `<span style="color:var(--pink)">No AI key yet.</span> The buttons below will walk you through setup (~2 min, free to sign up, ~$0.005 per photo).`;
      }
    }

    // QUICK LOG pane
    renderQuickLogPane(_activeFoodMeal, allFoods);
    const qlf = $("#qlFilter");
    if(qlf) qlf.addEventListener("input", () => renderQuickLogPane(_activeFoodMeal, allFoods, qlf.value));

    // TEMPLATES pane
    renderTemplatesPane(_activeFoodMeal);
    const tplSave = $("#tplSaveCurrent");
    if(tplSave) tplSave.addEventListener("click", () => saveCurrentMealAsTemplate(_activeFoodMeal));
    let _searchAbort = null;
    let _searchSeq = 0;
    const renderRow = (x, badge) => `
      <li class="search-result" data-key="${escape(x.id)}">
        <div>
          <div class="sr-name">${escape(x.name)}${badge || ""}</div>
          <div class="sr-meta">${escape(x.serving||"")} · P${x.p} C${x.c} F${x.f}</div>
        </div>
        <div class="sr-cal">${x.cal} kcal</div>
      </li>`;
    const wireRows = (items) => {
      list.querySelectorAll(".search-result").forEach(li => {
        li.addEventListener("click", () => {
          const food = items.find(x => x.id === li.dataset.key);
          if(!food) return;
          dayObj(currentDate).meals[_activeFoodMeal].push(mealItemFrom(food));
          if(typeof _trackRecent === "function") _trackRecent(food);
          save(); closeModal(); renderAll();
          toast(`Added ${food.name} to ${_activeFoodMeal}`, "cyan");
        });
      });
    };
    const render = (q="") => {
      const local = allFoods.filter(x => x.name.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
      let html = local.map(x => renderRow(x)).join("");
      // If the query is meaningful, search OpenFoodFacts in the background
      if(q && q.trim().length >= 3){
        if(_searchAbort) _searchAbort.abort();
        _searchAbort = new AbortController();
        const seq = ++_searchSeq;
        if(local.length === 0){
          html += `<li class="off-loading" style="padding:10px;font-size:11px;color:#888;font-style:italic">Searching OpenFoodFacts (2M items)…</li>`;
        } else {
          html += `<li class="off-loading" style="padding:8px;font-size:10px;color:#888;text-align:center;font-style:italic">+ searching OpenFoodFacts…</li>`;
        }
        list.innerHTML = html;
        wireRows(local);
        _searchOpenFoodFacts(q, _searchAbort.signal).then(off => {
          if(seq !== _searchSeq) return;
          // Dedupe: drop OFF items that match a local name
          const localNames = new Set(local.map(x => x.name.toLowerCase()));
          const offUnique = off.filter(o => !localNames.has(o.name.toLowerCase()));
          const merged = [...local, ...offUnique];
          let h = local.map(x => renderRow(x)).join("");
          if(offUnique.length){
            h += `<li class="off-divider" style="padding:6px 10px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--cyan);font-weight:700">From OpenFoodFacts</li>`;
            h += offUnique.map(x => renderRow(x, ` <span style="font-size:9px;color:var(--cyan);font-weight:600">OFF</span>`)).join("");
          } else if(local.length === 0){
            h = `<li style="padding:14px;color:#bbb;font-style:italic">No matches in local DB or OpenFoodFacts.</li>`;
          }
          list.innerHTML = h;
          wireRows(merged);
        }).catch(err => {
          if(err.name === "AbortError") return;
          // Silent fail — local results still shown
          const loading = list.querySelector(".off-loading");
          if(loading) loading.remove();
        });
      } else {
        list.innerHTML = html || `<li style="padding:14px;color:#bbb;font-style:italic">Type to search 200 local + 2M OpenFoodFacts items.</li>`;
        wireRows(local);
      }
    };
    render();
    input.addEventListener("input", () => render(input.value));
    if(startMode === "search") input.focus();
  });
}

function removeMealItem(meal, id){
  const day = dayObj(currentDate);
  day.meals[meal] = day.meals[meal].filter(x => x.id !== id);
  save(); renderAll();
}

// ---------- HELPERS ----------
function uid(){ return "x"+Math.random().toString(36).slice(2,9); }
function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
function escape(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function fmtDate(key){ const d = new Date(key+"T00:00:00"); return d.toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric"}); }
function fmtMed(key){ const d = new Date(key+"T00:00:00"); return d.toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"}); }
function unit(){ return state.profile.units === "metric" ? "kg" : "lb"; }
function unitVol(){ return state.profile.units === "metric" ? "ml" : "oz"; }

// expose for inline onclicks if any
window.BERMO_TRACKER = { go, removeMealItem, getCurrentDate: () => currentDate, setCurrentDate: (d) => { currentDate = d; } };

// ---------- RENDER ROOT ----------
function renderAll(){
  // top bar
  $("#tbName").textContent = state.profile.name || "Athlete";
  $("#tbAvatar").textContent = (state.profile.name||"A").charAt(0).toUpperCase();
  $("#tbDate").textContent = new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});

  if(currentTab === "dashboard") renderDashboard();
  else if(currentTab === "nutrition") renderNutrition();
  else if(currentTab === "fitness") renderFitness();
  else if(currentTab === "body") renderBody();
  else if(currentTab === "history") renderHistory();
  else if(currentTab === "settings") renderSettings();
  else if(currentTab === "goals") renderGoalsView();
  else if(currentTab === "library") renderLibrary();
}

// ---------- DASHBOARD ----------
let calRingChart, weeklyChart, weightChart, fitnessHeatChartRef = null;
function renderDashboardBase(){
  const t = totalsFor(currentDate);
  const g = state.goals;

  $("#dashDate").textContent = fmtMed(currentDate);
  $("#dashGreeting").textContent = greeting();

  // Calorie ring
  const consumed = t.cal;
  const remaining = Math.max(0, g.cal - consumed);
  $("#calConsumed").textContent = consumed;
  $("#calRem").textContent = (consumed > g.cal ? `${consumed - g.cal} over` : `${remaining} left`);
  $("#calMeta").textContent = `${consumed} / ${g.cal}`;
  drawCalorieRing(consumed, g.cal);

  // Macros
  setMacro("p", t.p, g.protein, "pVal", "pBar");
  setMacro("c", t.c, g.carbs,   "cVal", "cBar");
  setMacro("f", t.f, g.fat,     "fVal", "fBar");
  // fiber estimated as 10% of carbs as a stand-in
  const fiber = Math.round(t.c * 0.1);
  $("#fbVal").textContent = `${fiber}g / ${g.fiber}g`;
  $("#fbBar").style.width = Math.min(100, (fiber/g.fiber)*100) + "%";

  // Water
  renderWater();

  // WOD
  renderWodCard();

  // Last lift
  const last = lastSession();
  const ll = $("#lastLift");
  if(last){
    ll.innerHTML = `<span class="stat-big">${escape(last.name)}</span><span class="stat-sub">${last.weight}${unit()} × ${last.reps} · ${fmtDate(last.date)}</span>`;
  } else {
    ll.innerHTML = `<span class="stat-big">—</span><span class="stat-sub">No sessions yet</span>`;
  }

  // Weight
  const wlast = state.weights[state.weights.length-1];
  if(wlast){
    $("#weightBig").textContent = wlast.val + " " + unit();
    const prev = state.weights[state.weights.length-2];
    if(prev){
      const diff = (wlast.val - prev.val).toFixed(1);
      $("#weightDelta").textContent = (diff > 0 ? "+" : "") + diff + " " + unit() + " vs last";
    } else $("#weightDelta").textContent = "first weigh-in";
  } else { $("#weightBig").textContent = "—"; $("#weightDelta").textContent = "Log your first weigh-in"; }

  drawWeeklyChart();
  renderStreak();
}

function setMacro(k, val, goal, valEl, barEl){
  $("#"+valEl).textContent = `${val}g / ${goal}g`;
  $("#"+barEl).style.width = Math.min(100, (val/Math.max(1,goal))*100) + "%";
}

function greeting(){
  const h = new Date().getHours();
  const n = state.profile.name || "Athlete";
  if(h < 5)  return `Late night, ${n}.`;
  if(h < 12) return `Morning, ${n}.`;
  if(h < 18) return `Afternoon, ${n}.`;
  return `Evening, ${n}.`;
}

function renderWater(){
  const grid = $("#waterGrid");
  const cups = 8;
  const ozPerCup = state.goals.water / cups;
  const cur = dayObj(currentDate).water;
  const filled = Math.round(cur / ozPerCup);
  grid.innerHTML = "";
  for(let i=0;i<cups;i++){
    const cell = document.createElement("button");
    cell.className = "water-cell" + (i < filled ? " filled" : "");
    cell.title = `${Math.round(ozPerCup)} ${unitVol()}`;
    cell.textContent = i < filled ? "●" : "";
    cell.addEventListener("click", () => {
      // toggle: clicking sets fill up to (i+1) cups, or clears if already there
      dayObj(currentDate).water = (i+1 === filled) ? i*ozPerCup : (i+1)*ozPerCup;
      save(); renderAll();
    });
    grid.appendChild(cell);
  }
  $("#waterMeta").textContent = `${Math.round(cur)} / ${state.goals.water} ${unitVol()}`;
}

function renderStreak(){
  const days = streakDays();
  $("#streakNum").textContent = days;
  $("#streakFoot").textContent = days === 0
    ? "Log a meal or a workout today to start."
    : days === 1 ? "Day 1. Stack another tomorrow." : `${days} consecutive days. Keep it.`;
}
function streakDays(){
  let count = 0;
  let d = new Date();
  while(true){
    const k = todayKey(d);
    if(hasActivity(k)) count++;
    else if(k !== todayKey()) break;
    else break;
    d.setDate(d.getDate()-1);
    if(count > 365) break;
  }
  // recheck loop above needs cleaner pass
  count = 0;
  let cur = new Date();
  while(hasActivity(todayKey(cur))){
    count++;
    cur.setDate(cur.getDate()-1);
    if(count > 365) break;
  }
  return count;
}
function hasActivity(k){
  const d = state.days[k]; if(!d) return false;
  const meals = ["breakfast","lunch","dinner","snacks"].some(m => d.meals[m].length);
  return meals || d.water>0 || (d.sessions && d.sessions.length) || d.wodResult;
}

function lastSession(){
  let last = null;
  Object.keys(state.days).sort().reverse().some(k => {
    const s = (state.days[k].sessions||[]);
    if(s.length){ last = {...s[s.length-1], date:k}; return true; }
  });
  return last;
}

// ---------- CHARTS ----------
function drawCalorieRing(consumed, goal){
  const ctx = $("#calRing").getContext("2d");
  if(calRingChart) calRingChart.destroy();
  const eaten = Math.min(consumed, goal);
  const remaining = Math.max(0, goal - consumed);
  const over = Math.max(0, consumed - goal);
  calRingChart = new Chart(ctx, {
    type:"doughnut",
    data:{
      labels: over > 0 ? ["Eaten","Over"] : ["Eaten","Remaining"],
      datasets:[{
        data: over > 0 ? [goal, over] : [eaten, remaining],
        backgroundColor: over > 0 ? ["#ff4d9d","#0a0a0a"] : ["#c8f500","#f0efe9"],
        borderWidth:0, cutout:"75%"
      }]
    },
    options:{
      responsive:false, plugins:{legend:{display:false}, tooltip:{enabled:false}},
      animation:{duration:600}
    }
  });
}

function drawWeeklyChart(){
  const ctx = $("#weeklyChart").getContext("2d");
  if(weeklyChart) weeklyChart.destroy();
  const labels = [], data = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const k = todayKey(d);
    labels.push(d.toLocaleDateString(undefined,{weekday:"short"}));
    data.push(totalsFor(k).cal);
  }
  const avg = Math.round(data.reduce((a,b)=>a+b,0)/data.length);
  $("#weeklyAvg").textContent = "avg " + avg + " kcal";
  weeklyChart = new Chart(ctx, {
    type:"bar",
    data:{ labels, datasets:[{
      data, backgroundColor:"#00f5d4", borderRadius:8, maxBarThickness:36
    },{
      type:"line", data: labels.map(()=>state.goals.cal),
      borderColor:"#0a0a0a", borderWidth:1.5, borderDash:[4,4], pointRadius:0
    }] },
    options:{
      plugins:{legend:{display:false}, tooltip:{
        callbacks:{ title:(items)=>items[0].label, label:(c)=>c.parsed.y+" kcal"}
      }},
      scales:{
        y:{beginAtZero:true, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#a7b1c6",font:{size:10}}},
        x:{grid:{display:false}, ticks:{color:"#a7b1c6",font:{size:10}}}
      }
    }
  });
}

// ---------- NUTRITION VIEW ----------
function renderNutritionBase(){
  $("#nutDate").textContent = fmtMed(currentDate);
  $("#nutDateInput").value = currentDate;
}

// ---------- FITNESS VIEW ----------
function renderFitnessBase(){
  $("#fitDate").textContent = fmtMed(currentDate);

  // WOD picker / display
  const picker = $("#fitWodPicker");
  picker.innerHTML = DATA.wods.map((w,i) => `<option value="${i}">${escape(w.name)} · ${escape(w.type)}</option>`).join("");
  const day = dayObj(currentDate);
  const idx = day.wodId !== null && day.wodId !== undefined ? day.wodId : (state.wodIndex % DATA.wods.length);
  picker.value = idx;
  const wod = DATA.wods[idx];
  $("#fitWodTitle").textContent = wod.name + (wod.hero ? " ★" : "");
  $("#fitWodScript").textContent = wod.script;
  $("#fitWodType").textContent = wod.type;

  // Lift board is owned by renderLiftsList() (hooked below); nothing to do here.

  // (session list now rendered by renderSessionCard into #sessionCard)

  drawHeatmap();
}

function shuffleWod(){
  const day = dayObj(currentDate);
  let next = (day.wodId === null || day.wodId === undefined) ? state.wodIndex : day.wodId;
  next = (next + 1 + Math.floor(Math.random()*3)) % DATA.wods.length;
  day.wodId = next;
  state.wodIndex = next;
  save();
  renderAll();
}
function renderWodCard(){
  const day = dayObj(currentDate);
  const idx = day.wodId !== null && day.wodId !== undefined ? day.wodId : (state.wodIndex % DATA.wods.length);
  const wod = DATA.wods[idx];
  $("#wodName").textContent = wod.name + (wod.hero ? " ★" : "");
  $("#wodType").textContent = wod.type;
  $("#wodTitle").textContent = wod.name;
  $("#wodScript").textContent = wod.script;
}

function openLiftModal(prefillName){
  const moves = [...DATA.movements, ...DATA.prLifts].filter((v,i,a)=>a.indexOf(v)===i);
  const favs = getFavLifts();
  clearInterval(_setTimer); _setTimer = null; _setStart = null; _setElapsed = 0;
  openModal("Log a lift", `
    <div class="form-grid">
      <label><span>Date</span><input id="liftDate" type="date" value="${currentDate}"></label>
      <label><span>Time of day <em style="font-style:normal;color:var(--iron-mute)">optional</em></span><input id="liftTime" type="time"></label>
    </div>
    <label class="form-label">Movement</label>
    <input list="movelist" id="liftName" class="search-input" placeholder="Back Squat" value="${escape(prefillName||"")}" required>
    <datalist id="movelist">${favs.map(m=>`<option value="${escape(m)}">`).join("")}${moves.map(m=>`<option value="${escape(m)}">`).join("")}</datalist>
    <div class="form-grid">
      <label><span>Weight (${unit()})</span><input id="liftWeight" type="number" min="0" step="2.5"></label>
      <label><span>Reps</span><input id="liftReps" type="number" min="1" max="500" value="5"></label>
      <label><span>Sets</span><input id="liftSets" type="number" min="1" max="20" value="1"></label>
      <label><span>Type</span>
        <select id="liftType">
          <option value="strength">Strength</option>
          <option value="oly">Olympic</option>
          <option value="accessory">Accessory</option>
        </select>
      </label>
    </div>
    <div class="sess-timer">
      <div class="sess-clock" id="liftClock">0:00</div>
      <button type="button" class="btn btn-ghost btn-sm" id="liftTimerBtn">START TIMER</button>
      <span class="sess-timer-hint">optional</span>
    </div>
    <label><span>Notes</span><input id="liftNotes" type="text" placeholder="Felt strong, RPE 8"></label>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="liftSave">SAVE</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => { clearInterval(_setTimer); closeModal(); }));
    wireSessTimer("liftClock", "liftTimerBtn");
    $("#liftSave").addEventListener("click", () => {
      const name = $("#liftName").value.trim();
      const weight = parseFloat($("#liftWeight").value);
      const reps = parseInt($("#liftReps").value, 10);
      const sets = parseInt($("#liftSets").value, 10) || 1;
      const type = $("#liftType").value;
      const notes = $("#liftNotes").value.trim();
      const dateK = $("#liftDate").value || currentDate;
      const timeV = $("#liftTime").value || "";
      if(!name || isNaN(weight) || isNaN(reps)) { toast("Fill in name, weight, reps","pink"); return; }
      const mins = sessTimerMinutes();
      const day = dayObj(dateK);
      day.sessions = day.sessions || [];
      day.sessions.push({ id: uid(), name, weight, reps, sets, type, notes,
                          time: timeV || undefined, durationMin: mins || undefined });
      if((type === "strength" || type === "oly") && reps <= 10){
        const est = Math.round(weight * (1 + reps/30));
        const cur = state.prs[name];
        if(!cur || est > cur.val){
          state.prs[name] = { val: est, date: dateK, unit: unit() };
          toast(`New PR: ${name} ~ ${est}${unit()}`, "cyan");
        }
      }
      clearInterval(_setTimer);
      save(); closeModal(); renderAll();
      toast(`Logged ${name} · ${fmtDate(dateK)}`, "cyan");
    });
  });
}

// Shared optional timer used by lift + cardio modals
let _setTimer = null, _setStart = null, _setElapsed = 0;
function sessTimerMinutes(){
  const total = _setElapsed + (_setStart ? Date.now() - _setStart : 0);
  return Math.round(total / 60000);
}
function wireSessTimer(clockId, btnId){
  const clock = document.getElementById(clockId);
  const btn = document.getElementById(btnId);
  if(!clock || !btn) return;
  const tick = () => {
    const total = _setElapsed + (_setStart ? Date.now() - _setStart : 0);
    const m = Math.floor(total/60000), sec = Math.floor((total%60000)/1000);
    clock.textContent = `${m}:${String(sec).padStart(2,"0")}`;
  };
  tick();
  btn.addEventListener("click", () => {
    if(_setStart){
      _setElapsed += Date.now() - _setStart; _setStart = null;
      clearInterval(_setTimer); _setTimer = null;
      btn.textContent = "RESUME";
    } else {
      _setStart = Date.now();
      _setTimer = setInterval(tick, 500);
      btn.textContent = "PAUSE";
    }
    tick();
  });
}

function openWodResultModal(){
  const day = dayObj(currentDate);
  const idx = day.wodId !== null && day.wodId !== undefined ? day.wodId : (state.wodIndex % DATA.wods.length);
  const wod = DATA.wods[idx];
  openModal(`Log result · ${wod.name}`, `
    <p style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#888;margin:0 0 8px">${escape(wod.type)}</p>
    <label><span>Score (time, rounds, or load)</span><input id="wodScore" class="search-input" placeholder="e.g. 12:34 or 8 rounds + 12" required></label>
    <label><span>Notes</span><input id="wodNotes" class="search-input" placeholder="RX'd, scaled to ring rows…"></label>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-lime" id="wodSave">Save result</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    $("#wodSave").addEventListener("click", () => {
      const score = $("#wodScore").value.trim();
      if(!score){ toast("Add a score","pink"); return; }
      day.wodResult = { score, notes: $("#wodNotes").value.trim(), wodName: wod.name };
      save(); closeModal(); renderAll();
      toast("WOD logged", "cyan");
    });
  });
}

function openPrModal(){
  openModal("Add / update PR", `
    <label><span>Lift</span>
      <input list="prlifts" id="prLift" class="search-input" placeholder="Back Squat" required>
      <datalist id="prlifts">${DATA.prLifts.map(m=>`<option value="${escape(m)}">`).join("")}</datalist>
    </label>
    <div class="form-grid">
      <label><span>Value (${unit()})</span><input id="prVal" type="number" step="0.1" required></label>
      <label><span>Date</span><input id="prDate" type="date" value="${currentDate}"></label>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="prSave">Save PR</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    $("#prSave").addEventListener("click", () => {
      const lift = $("#prLift").value.trim();
      const val = parseFloat($("#prVal").value);
      const date = $("#prDate").value || currentDate;
      if(!lift || isNaN(val)) { toast("Add lift + value","pink"); return; }
      state.prs[lift] = { val, date, unit: unit() };
      save(); closeModal(); renderAll();
      toast(`PR: ${lift} = ${val}${unit()}`, "cyan");
    });
  });
}

// ---------- HEATMAP ----------
function drawHeatmap(){
  const wrap = $("#heatmap");
  if(!wrap) return;
  const weeks = 12;
  const today = new Date();
  const start = new Date(today); start.setDate(start.getDate() - weeks*7 + 1);
  // align to Sunday
  while(start.getDay() !== 0) start.setDate(start.getDate()-1);
  let html = "";
  let total = 0;
  for(let w=0; w<weeks; w++){
    html += `<div class="heat-col">`;
    for(let d=0; d<7; d++){
      const dt = new Date(start); dt.setDate(start.getDate() + w*7 + d);
      const key = todayKey(dt);
      const day = state.days[key];
      let intensity = 0;
      if(day){
        const sessCount = (day.sessions||[]).length + (day.wodResult ? 1 : 0);
        if(sessCount === 1) intensity = 1;
        else if(sessCount === 2) intensity = 2;
        else if(sessCount >= 3) intensity = 3;
        if(intensity === 0 && hasActivity(key)) intensity = 1;
      }
      total += intensity;
      html += `<div class="heat-cell h${intensity}" title="${key}"></div>`;
    }
    html += `</div>`;
  }
  wrap.innerHTML = html;
  $("#heatMeta").textContent = total + " active points · 12 wks";
}

// ---------- BODY ----------
function renderBodyBase(){
  const ws = state.weights.slice().sort((a,b)=>a.date.localeCompare(b.date));
  if(ws.length){
    const last = ws[ws.length-1];
    $("#bodyCurrent").textContent = last.val + " " + unit();
    if(ws.length > 1){
      const prev = ws[ws.length-2];
      const delta = (last.val - prev.val).toFixed(1);
      $("#bodyDelta").textContent = (delta>0?"+":"") + delta + " " + unit() + " vs last";
    } else $("#bodyDelta").textContent = "first weigh-in";

    const last7 = ws.slice(-7);
    const avg7 = last7.reduce((s,x)=>s+x.val,0)/last7.length;
    $("#body7").textContent = avg7.toFixed(1) + " " + unit();
  } else {
    $("#bodyCurrent").textContent = "—"; $("#bodyDelta").textContent = "Log first weigh-in";
    $("#body7").textContent = "—";
  }
  $("#bodyGoal").textContent = state.goals.weight ? state.goals.weight + " " + unit() : "—";
  if(state.goals.weight && ws.length){
    const last = ws[ws.length-1].val;
    const delta = (last - state.goals.weight).toFixed(1);
    $("#bodyGoalDelta").textContent = (delta>0?"+":"") + delta + " " + unit() + " from goal";
  } else $("#bodyGoalDelta").textContent = "set in settings";

  drawWeightChart();

  // weigh list
  $("#weighList").innerHTML = ws.slice().reverse().slice(0,12).map((w,i,arr) => {
    const next = arr[i+1];
    let delta = "—", cls = "flat";
    if(next){
      const d = (w.val - next.val).toFixed(1);
      delta = (d>0?"+":"") + d;
      cls = d>0?"up":(d<0?"down":"flat");
    }
    return `<li class="weigh-row">
      <div><div class="w-val">${w.val} ${unit()}</div><div class="w-date">${fmtDate(w.date)}</div></div>
      <span class="w-delta ${cls}">${delta}</span>
    </li>`;
  }).join("");

  // measurements
  $("#measList").innerHTML = state.measurements.slice().reverse().slice(0,12).map(m => `
    <li class="weigh-row">
      <div><div class="w-val">${escape(m.type)}: ${m.val}</div><div class="w-date">${fmtDate(m.date)}</div></div>
    </li>`).join("");
}

function drawWeightChart(){
  const ctx = $("#weightChart").getContext("2d");
  if(weightChart) weightChart.destroy();
  const ws = state.weights.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
  weightChart = new Chart(ctx, {
    type:"line",
    data:{
      labels: ws.map(w => fmtDate(w.date)),
      datasets:[{
        data: ws.map(w => w.val),
        borderColor:"#00f5d4", backgroundColor:"rgba(0,245,212,0.1)",
        fill:true, tension:.3, pointRadius:3, pointBackgroundColor:"#00f5d4",
        borderWidth:2.5
      }]
    },
    options:{
      plugins:{legend:{display:false}},
      scales:{
        y:{grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#a7b1c6",font:{size:10}}},
        x:{grid:{display:false}, ticks:{color:"#a7b1c6",font:{size:10},maxRotation:0,autoSkip:true}}
      }
    }
  });
  if(ws.length){
    $("#bodyRange").textContent = fmtDate(ws[0].date) + " → " + fmtDate(ws[ws.length-1].date);
  } else $("#bodyRange").textContent = "no data";
}

function openWeighInModal(){
  openModal("Weigh in", `
    <div class="form-grid">
      <label><span>Weight (${unit()})</span><input id="wiVal" type="number" step="0.1" required></label>
      <label><span>Date</span><input id="wiDate" type="date" value="${currentDate}"></label>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="wiSave">Log weigh-in</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    $("#wiSave").addEventListener("click", () => {
      const val = parseFloat($("#wiVal").value);
      if(isNaN(val)){ toast("Enter weight","pink"); return; }
      state.weights.push({ date: $("#wiDate").value || currentDate, val });
      save(); closeModal(); renderAll();
      toast("Weigh-in logged","cyan");
    });
  });
}
function openMeasureModal(){
  openModal("Measurement", `
    <div class="form-grid">
      <label><span>Type</span>
        <select id="mType">
          <option value="waist">Waist</option>
          <option value="chest">Chest</option>
          <option value="hips">Hips</option>
          <option value="arm">Arm</option>
          <option value="thigh">Thigh</option>
          <option value="bodyfat">Body Fat %</option>
        </select>
      </label>
      <label><span>Value</span><input id="mVal" type="number" step="0.1" required></label>
    </div>
    <label><span>Date</span><input id="mDate" type="date" value="${currentDate}"></label>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="mSave">Save</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    $("#mSave").addEventListener("click", () => {
      const val = parseFloat($("#mVal").value);
      if(isNaN(val)){ toast("Enter a value","pink"); return; }
      state.measurements.push({
        date: $("#mDate").value || currentDate,
        type: $("#mType").value, val
      });
      save(); closeModal(); renderAll();
      toast("Measurement saved","cyan");
    });
  });
}

// ---------- HISTORY ----------
function renderHistory(){
  const filter = $("#historyFilter").value;
  const rows = [];
  Object.keys(state.days).sort().reverse().forEach(k => {
    const day = state.days[k];
    if(filter === "all" || filter === "meal"){
      let totalCal = 0, items = 0;
      ["breakfast","lunch","dinner","snacks"].forEach(m => {
        day.meals[m].forEach(it => { totalCal += it.cal; items++; });
      });
      if(items) rows.push({ date:k, tag:"meal", body:`<strong>${items}</strong> food items · ${Math.round(totalCal)} kcal` });
    }
    if(filter === "all" || filter === "workout"){
      (day.sessions||[]).forEach(s => {
        rows.push({ date:k, tag:"workout", body:`<strong>${escape(s.name)}</strong> · ${s.weight}${unit()} × ${s.reps} × ${s.sets}` });
      });
      if(day.wodResult){
        rows.push({ date:k, tag:"wod", body:`<strong>WOD ${escape(day.wodResult.wodName||"")}</strong> · ${escape(day.wodResult.score)}` });
      }
    }
  });
  if(filter === "all" || filter === "weight"){
    state.weights.slice().reverse().forEach(w => rows.push({ date:w.date, tag:"weight", body:`<strong>Weigh-in</strong> · ${w.val} ${unit()}` }));
  }
  rows.sort((a,b) => b.date.localeCompare(a.date));
  $("#timeline").innerHTML = rows.map(r => `
    <li class="tl-row">
      <span class="tl-date">${fmtDate(r.date)}</span>
      <span class="tl-tag s-tag t-${r.tag === "wod" ? "wod" : (r.tag === "workout" ? "strength" : (r.tag === "weight" ? "cardio" : ""))}">${r.tag}</span>
      <span class="tl-body">${r.body}</span>
    </li>
  `).join("");
}

// ---------- SETTINGS ----------
function renderSettingsBase(){
  $("#setName").value = state.profile.name;
  $("#setUnits").value = state.profile.units;
  $("#setCal").value = state.goals.cal;
  $("#setP").value = state.goals.protein;
  $("#setC").value = state.goals.carbs;
  $("#setF").value = state.goals.fat;
  $("#setFiber").value = state.goals.fiber != null ? state.goals.fiber : 30;
  $("#setSugar").value = state.goals.sugar != null ? state.goals.sugar : 25;
  $("#setWater").value = state.goals.water;
  $("#setGoalWeight").value = state.goals.weight || "";
  // Layout card
  const stStart = $("#setStartTab"); if(stStart) stStart.value = state.profile.startTab || "dashboard";
  const stFood = $("#setFoodMode"); if(stFood) stFood.value = state.profile.foodMode || "search";
  $("#cfList").innerHTML = state.customFoods.map(f => `
    <li class="meal-item" style="background:#fff;border:1px solid var(--lgray)">
      <div>
        <div class="mi-name">${escape(f.name)}</div>
        <div class="mi-meta">${escape(f.serving||"")} · P${f.p} C${f.c} F${f.f}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="mi-cal">${f.cal} kcal</span>
        <button class="mi-del" data-cf="${f.id}">×</button>
      </div>
    </li>`).join("");
  $$("#cfList .mi-del").forEach(b => b.addEventListener("click", () => {
    state.customFoods = state.customFoods.filter(x => x.id !== b.dataset.cf);
    save(); renderSettings();
  }));
}
function saveProfile(e){
  e.preventDefault();
  state.profile.name = $("#setName").value.trim() || "Athlete";
  state.profile.units = $("#setUnits").value;
  save(); renderAll();
  toast("Profile saved","cyan");
}
function saveGoals(e){
  e.preventDefault();
  state.goals.cal = parseInt($("#setCal").value,10) || 2200;
  state.goals.protein = parseInt($("#setP").value,10) || 0;
  state.goals.carbs = parseInt($("#setC").value,10) || 0;
  state.goals.fat = parseInt($("#setF").value,10) || 0;
  state.goals.fiber = parseInt($("#setFiber").value,10) || 30;
  state.goals.sugar = parseInt($("#setSugar").value,10) || 25;
  state.goals.water = parseInt($("#setWater").value,10) || 64;
  const gw = parseFloat($("#setGoalWeight").value);
  state.goals.weight = isNaN(gw) ? null : gw;
  save(); renderAll();
  toast("Goals saved","cyan");
}

// ---------- Macro / calorie reconcile ----------
// When the user edits one macro field (P/C/F) and the macros no longer
// sum to the calorie target (within 5 kcal), ask whether to:
//   A) update calories to match the new macro total, or
//   B) rebalance the other two macros proportionally to keep the cal target
function _macrosToCal(p, c, f){ return p*4 + c*4 + f*9; }
function _reconcileMacros(changedField){
  const calEl = $("#setCal"); const pEl = $("#setP"); const cEl = $("#setC"); const fEl = $("#setF");
  if(!calEl || !pEl || !cEl || !fEl) return;
  const cal = parseInt(calEl.value, 10) || 0;
  const p = parseInt(pEl.value, 10) || 0;
  const c = parseInt(cEl.value, 10) || 0;
  const f = parseInt(fEl.value, 10) || 0;
  const sum = _macrosToCal(p, c, f);
  if(cal === 0 || sum === 0) return;
  if(Math.abs(sum - cal) <= 5) return;

  const fieldName = { p:"protein", c:"carbs", f:"fat" }[changedField] || "macro";
  const changedVal = { p, c, f }[changedField];

  openModal("Reconcile macros", `
    <p style="font-size:13px;color:#444;line-height:1.6;margin:0 0 10px">
      You changed <b>${fieldName}</b> to <b>${changedVal}g</b>. Your macros now total
      <b>${sum} kcal</b> but the calorie goal says <b>${cal} kcal</b>.
    </p>
    <p style="font-size:12px;color:#666;line-height:1.5;margin:0 0 14px">
      Pick one — both options keep your new ${fieldName} value:
    </p>
    <div class="modal-foot" style="flex-direction:column;gap:8px;align-items:stretch">
      <button class="btn btn-cyan" id="recCal">Set calories to ${sum} kcal (match new macros)</button>
      <button class="btn btn-ghost" id="recMac">Keep ${cal} kcal — rebalance other macros</button>
      <button class="btn btn-ghost btn-sm" data-close>Leave as-is for now</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("recCal").addEventListener("click", () => {
      $("#setCal").value = sum;
      closeModal();
      toast(`Calories updated to ${sum}`, "cyan");
    });
    document.getElementById("recMac").addEventListener("click", () => {
      // Rebalance the OTHER two macros proportionally to fill (cal − changedMacroCal)
      const changedCal = changedField === "f" ? changedVal*9 : changedVal*4;
      const remainingCal = Math.max(0, cal - changedCal);
      // Default split for the other two — preserve their existing ratio
      const others = changedField === "p" ? [["c", c, 4], ["f", f, 9]]
                   : changedField === "c" ? [["p", p, 4], ["f", f, 9]]
                                          : [["p", p, 4], ["c", c, 4]];
      const cur = [others[0][1] * others[0][2], others[1][1] * others[1][2]];
      const total = cur[0] + cur[1] || 1;
      const newCal0 = remainingCal * (cur[0] / total);
      const newCal1 = remainingCal * (cur[1] / total);
      const new0 = Math.max(0, Math.round(newCal0 / others[0][2]));
      const new1 = Math.max(0, Math.round(newCal1 / others[1][2]));
      $("#set" + others[0][0].toUpperCase()).value = new0;
      $("#set" + others[1][0].toUpperCase()).value = new1;
      closeModal();
      toast(`Rebalanced ${others[0][0].toUpperCase()}/${others[1][0].toUpperCase()} to keep ${cal} kcal`, "cyan");
    });
  });
}
// Same idea but in reverse: when user changes calories, ask if they want to
// scale the macros proportionally to the new calorie target.
function _reconcileCalories(){
  const calEl = $("#setCal"); const pEl = $("#setP"); const cEl = $("#setC"); const fEl = $("#setF");
  if(!calEl || !pEl || !cEl || !fEl) return;
  const cal = parseInt(calEl.value, 10) || 0;
  const p = parseInt(pEl.value, 10) || 0;
  const c = parseInt(cEl.value, 10) || 0;
  const f = parseInt(fEl.value, 10) || 0;
  const sum = _macrosToCal(p, c, f);
  if(cal === 0 || sum === 0) return;
  if(Math.abs(sum - cal) <= 5) return;
  const ratio = cal / sum;
  const newP = Math.round(p * ratio);
  const newC = Math.round(c * ratio);
  const newF = Math.round(f * ratio);
  openModal("Scale macros to match?", `
    <p style="font-size:13px;color:#444;line-height:1.6;margin:0 0 10px">
      You set calories to <b>${cal} kcal</b>. Current macros total <b>${sum} kcal</b>.
    </p>
    <p style="font-size:12px;color:#666;line-height:1.5;margin:0 0 14px">
      Scale macros proportionally to the new calorie target?
    </p>
    <table style="width:100%;font-size:13px;color:#444;margin:0 0 14px;border-collapse:collapse">
      <tr><th style="text-align:left;padding:4px 0">Macro</th><th style="text-align:right;padding:4px 0">Now</th><th style="text-align:right;padding:4px 0">After scaling</th></tr>
      <tr><td>Protein</td><td style="text-align:right">${p}g</td><td style="text-align:right;color:var(--cyan);font-weight:700">${newP}g</td></tr>
      <tr><td>Carbs</td><td style="text-align:right">${c}g</td><td style="text-align:right;color:var(--cyan);font-weight:700">${newC}g</td></tr>
      <tr><td>Fat</td><td style="text-align:right">${f}g</td><td style="text-align:right;color:var(--cyan);font-weight:700">${newF}g</td></tr>
    </table>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Keep current macros</button>
      <button class="btn btn-cyan" id="scaleApply">Scale macros</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("scaleApply").addEventListener("click", () => {
      $("#setP").value = newP; $("#setC").value = newC; $("#setF").value = newF;
      closeModal();
      toast("Macros scaled to new cal target", "cyan");
    });
  });
}
onReady(() => {
  // Wire reconcile prompts. Use 'change' (fires on blur or Enter) so we
  // don't badger the user mid-typing.
  const wire = (id, field) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("change", () => _reconcileMacros(field));
  };
  wire("setP", "p"); wire("setC", "c"); wire("setF", "f");
  const calEl = document.getElementById("setCal");
  if(calEl) calEl.addEventListener("change", _reconcileCalories);
});
function addCustomFood(e){
  e.preventDefault();
  const f = {
    id: "cf-"+uid(), custom:true,
    name: $("#cfName").value.trim(),
    serving: $("#cfServing").value.trim(),
    cal: parseInt($("#cfCal").value,10) || 0,
    p: parseFloat($("#cfP").value) || 0,
    c: parseFloat($("#cfC").value) || 0,
    f: parseFloat($("#cfF").value) || 0,
  };
  if(!f.name){ toast("Add a name","pink"); return; }
  state.customFoods.push(f);
  save(); renderSettings();
  e.target.reset();
  toast(`Added ${f.name}`,"cyan");
}
function exportData(){
  const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bermo-tracker-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function logout(){
  state.profile.onboarded = false;
  save();
  showGate();
}
function resetAll(){
  if(!confirm("Wipe ALL tracker data? There is no undo.")) return;
  state = defaultState();
  save();
  showGate();
}

// ---------- BOOT ----------
onReady(init);


// =================================================================
// PR REP-RANGE CARDS (SugarWOD-style)
// =================================================================
function getAllLifts(){
  const set = new Set();
  Object.values(state.days).forEach(day => {
    (day.sessions || []).forEach(s => {
      if(s.type === "strength" || s.type === "oly") set.add(s.name);
    });
  });
  Object.keys(state.prs).forEach(n => set.add(n));
  return Array.from(set).sort();
}

function getLiftRecords(liftName){
  const sets = [];
  Object.entries(state.days).forEach(([date, day]) => {
    (day.sessions || []).forEach(s => {
      if(s.name === liftName) sets.push({ ...s, date });
    });
  });
  const ranges = {};
  [1,3,5,10].forEach(target => {
    let best = null;
    sets.forEach(s => {
      if(s.reps >= target && (!best || s.weight > best.weight)){
        best = { weight: s.weight, reps: s.reps, date: s.date };
      }
    });
    ranges[target] = best;
  });
  let bestEst = null;
  sets.forEach(s => {
    const est = Math.round(s.weight * (1 + s.reps/30));
    if(!bestEst || est > bestEst.est){
      bestEst = { est, weight: s.weight, reps: s.reps, date: s.date };
    }
  });
  ranges.estimated = bestEst;
  ranges.totalSets = sets.length;
  return ranges;
}

function renderPrCards(){
  const lifts = getAllLifts();
  if(!lifts.length){
    return `<div style="color:#bbb;font-style:italic;font-size:13px;padding:8px 4px">No PRs yet — log a strength or Oly lift to start tracking.</div>`;
  }
  return lifts.map(lift => {
    const r = getLiftRecords(lift);
    const manual = state.prs[lift];
    return `<div class="pr-card">
      <div class="pr-card-head">
        <div class="pr-card-name">${escape(lift)}</div>
        <div class="pr-card-est">${r.estimated ? `~${r.estimated.est}${unit()} 1RM est.` : (manual ? `${manual.val}${manual.unit||unit()} (manual)` : "")}</div>
      </div>
      <div class="pr-card-grid">
        ${[1,3,5,10].map(reps => {
          const v = r[reps];
          return `<div class="pr-cell ${v ? "" : "pr-cell-empty"}">
            <div class="pr-cell-lbl">${reps}RM</div>
            <div class="pr-cell-val">${v ? v.weight + unit() : "—"}</div>
            <div class="pr-cell-date">${v ? fmtDate(v.date) : ""}</div>
          </div>`;
        }).join("")}
      </div>
      <div class="pr-card-foot">${r.totalSets} set${r.totalSets===1?"":"s"} logged</div>
    </div>`;
  }).join("");
}

// =================================================================
// APPLE HEALTH CSV IMPORT (Health Auto Export format)
// =================================================================
function bindImport(){
  const btn = document.getElementById("importBtn");
  const file = document.getElementById("importFile");
  if(!btn || !file) return;
  btn.addEventListener("click", () => file.click());
  file.addEventListener("change", () => {
    const f = file.files && file.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const text = reader.result;
        let result;
        if(f.name.toLowerCase().endsWith(".json")){
          result = importHealthJSON(text);
        } else {
          result = importHealthCSV(text);
        }
        save(); renderAll();
        const parts = [];
        if(result.weights) parts.push(`${result.weights} weigh-in${result.weights===1?"":"s"}`);
        if(result.bf)      parts.push(`${result.bf} body fat`);
        if(result.lean)    parts.push(`${result.lean} lean mass`);
        if(result.other)   parts.push(`${result.other} other`);
        toast(parts.length ? "Imported " + parts.join(" · ") : "Nothing imported", parts.length ? "cyan" : "pink");
      } catch(err){
        console.error(err);
        toast("Import failed: " + err.message, "pink");
      }
      file.value = "";
    };
    reader.readAsText(f);
  });
}

function importHealthCSVCore(text){
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if(lines.length < 2) throw new Error("CSV is empty");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,"").toLowerCase());

  // Find columns
  const findCol = (...needles) => {
    for(let i=0;i<headers.length;i++){
      const h = headers[i];
      if(needles.some(n => h.includes(n))) return i;
    }
    return -1;
  };
  const dateIdx   = findCol("date","start","time");
  const typeIdx   = findCol("type","metric","name");
  const valIdx    = findCol("value","amount","qty");
  const weightCol = findCol("body mass","weight","bodymass");
  const bfCol     = findCol("body fat percentage","body fat","bodyfat");
  const leanCol   = findCol("lean body mass","lean mass");

  if(dateIdx === -1) throw new Error("No date column found");

  let added = { weights:0, bf:0, lean:0, other:0 };

  for(let i=1; i<lines.length; i++){
    const cells = parseCsvLine(lines[i]);
    if(!cells.length) continue;
    const dateStr = (cells[dateIdx]||"").trim();
    if(!dateStr) continue;
    const date = parseDate(dateStr);
    if(!date) continue;

    // Wide format: explicit metric columns
    if(weightCol > -1){
      const v = parseFloat(cells[weightCol]);
      if(!isNaN(v) && v > 0){ state.weights.push({date, val:round1(v)}); added.weights++; }
    }
    if(bfCol > -1){
      const v = parseFloat(cells[bfCol]);
      if(!isNaN(v) && v > 0){ state.measurements.push({date, type:"bodyfat", val:round1(v)}); added.bf++; }
    }
    if(leanCol > -1){
      const v = parseFloat(cells[leanCol]);
      if(!isNaN(v) && v > 0){ state.measurements.push({date, type:"lean", val:round1(v)}); added.lean++; }
    }

    // Long format: type + value columns
    if(weightCol === -1 && bfCol === -1 && leanCol === -1 && typeIdx > -1 && valIdx > -1){
      const t = (cells[typeIdx]||"").toLowerCase();
      const v = parseFloat(cells[valIdx]);
      if(isNaN(v)) continue;
      if(t.includes("body mass") || t === "weight" || t === "bodymass"){
        state.weights.push({date, val:round1(v)}); added.weights++;
      } else if(t.includes("body fat") || t.includes("bodyfat")){
        state.measurements.push({date, type:"bodyfat", val:round1(v)}); added.bf++;
      } else if(t.includes("lean")){
        state.measurements.push({date, type:"lean", val:round1(v)}); added.lean++;
      } else if(t.length){
        state.measurements.push({date, type:t.slice(0,20), val:round1(v)}); added.other++;
      }
    }
  }

  // Sort weights by date for clean charting
  state.weights.sort((a,b)=>a.date.localeCompare(b.date));
  return added;
}

function importHealthJSON(text){
  // Health Auto Export JSON: { data: { metrics: [{ name, units, data: [{date,qty}] }] } }
  // Or our own tracker JSON export — detect by shape
  const obj = JSON.parse(text);
  if(obj && obj.profile && obj.days){
    // Our own export — full state restore (with confirm)
    if(!confirm("This looks like a tracker export. Replace ALL current data with it?")){
      return { weights:0, bf:0, lean:0, other:0 };
    }
    state = obj;
    return { weights: (obj.weights||[]).length, bf:0, lean:0, other:0 };
  }
  let added = { weights:0, bf:0, lean:0, other:0 };
  const metrics = (obj.data && obj.data.metrics) || obj.metrics || [];
  metrics.forEach(m => {
    const name = (m.name||"").toLowerCase();
    (m.data||[]).forEach(p => {
      const date = parseDate(p.date || p.startDate);
      const v = parseFloat(p.qty != null ? p.qty : p.value);
      if(!date || isNaN(v) || v <= 0) return;
      if(name.includes("body_mass") || name.includes("weight")){
        state.weights.push({date, val:round1(v)}); added.weights++;
      } else if(name.includes("body_fat")){
        state.measurements.push({date, type:"bodyfat", val:round1(v)}); added.bf++;
      } else if(name.includes("lean")){
        state.measurements.push({date, type:"lean", val:round1(v)}); added.lean++;
      }
    });
  });
  state.weights.sort((a,b)=>a.date.localeCompare(b.date));
  return added;
}

function parseCsvLine(line){
  const out = []; let cur = ""; let inQ = false;
  for(let i=0; i<line.length; i++){
    const c = line[i];
    if(c === '"'){ inQ = !inQ; continue; }
    if(c === ',' && !inQ){ out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}
function parseDate(s){
  if(!s) return null;
  const d = new Date(s);
  if(!isNaN(d.getTime())) return d.toISOString().slice(0,10);
  // Try MM/DD/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if(m){
    let yr = m[3]; if(yr.length === 2) yr = "20" + yr;
    return `${yr}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
  }
  return null;
}
function round1(v){ return Math.round(v * 10) / 10; }

// =================================================================
// MACRO AUTO-REBALANCE on calorie change
// =================================================================
function rebalanceMacros(cal){
  return {
    protein: Math.round(cal * 0.30 / 4),
    carbs:   Math.round(cal * 0.40 / 4),
    fat:     Math.round(cal * 0.30 / 9),
  };
}

// Boot extensions — call after main init
onReady(() => {
  bindImport();
  // Auto-rebalance: when #setCal changes in settings, suggest new macros
  const calInput = document.getElementById("setCal");
  if(calInput){
    calInput.addEventListener("change", () => {
      const v = parseInt(calInput.value, 10);
      if(!v || v < 800) return;
      if(!confirm(`Auto-balance macros for ${v} kcal (30% protein / 40% carbs / 30% fat)?`)) return;
      const m = rebalanceMacros(v);
      const p = document.getElementById("setP");
      const c = document.getElementById("setC");
      const f = document.getElementById("setF");
      if(p) p.value = m.protein;
      if(c) c.value = m.carbs;
      if(f) f.value = m.fat;
    });
  }
});


// =================================================================
// APPLE-STYLE ACTIVITY RINGS (Move / Exercise / Stand)
// =================================================================
function autoComputeActivity(key){
  const day = dayObj(key);
  let move = 0, exerciseMin = 0;
  const standHours = new Set();
  (day.sessions || []).forEach(s => {
    // Cardio sessions carry their own MET-derived calories + duration
    if(s.type === "cardio" && s.durationMin){
      move += s.calories || 0;
      exerciseMin += s.durationMin;
      return;
    }
    const reps = s.reps || 1, sets = s.sets || 1, weight = s.weight || 0;
    move += Math.round(sets * reps * Math.max(weight, 10) * 0.0008);
    exerciseMin += sets * 2;
  });
  if(day.workoutSession && day.workoutSession.exercises){
    Object.values(day.workoutSession.exercises).forEach(ex => {
      (ex.sets || []).forEach(set => {
        if(set.loggedAt) standHours.add(new Date(set.loggedAt).getHours());
      });
    });
  }
  const slotHr = { breakfast:8, lunch:12, dinner:18, snacks:15 };
  if(day.meals){
    Object.keys(slotHr).forEach(slot => {
      if(day.meals[slot] && day.meals[slot].length) standHours.add(slotHr[slot]);
    });
  }
  if((day.water||0) > 0) standHours.add(10);
  return { move, exercise: exerciseMin, stand: standHours.size };
}
function getActivityForDay(key){
  const day = dayObj(key);
  // Manual override wins
  if(day.activity && day.activity.manual){
    return day.activity;
  }
  // Apple Health import for this date wins next
  const ah = (state.appleHealth || []).find(x => x.date === key);
  if(ah){
    return {
      move: ah.activeEnergyKcal || 0,
      exercise: ah.exerciseMinutes || 0,
      stand: ah.standHours || 0,
      source: "applehealth"
    };
  }
  // Otherwise auto-derive from logs
  const auto = autoComputeActivity(key);
  if(!day.activity) day.activity = { move:0, exercise:0, stand:0 };
  return { ...auto, source: "auto" };
}
function getActivityGoals(){
  if(!state.activityGoals) state.activityGoals = { move:800, exercise:60, stand:16 };
  return state.activityGoals;
}

function drawActivityRingsBase(){
  const canvas = document.getElementById("rings3");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  const cx = w/2, cy = h/2;
  const a = getActivityForDay(currentDate);
  const g = getActivityGoals();
  const rings = [
    { color:"#ff2d56", track:"#3a0a14", val:a.move,     goal:g.move,     r:88, lw:18 }, // Move (red)
    { color:"#00f5d4", track:"#111622", val:a.exercise, goal:g.exercise, r:65, lw:18 }, // Exercise (lime)
    { color:"#00f5d4", track:"#003a32", val:a.stand,    goal:g.stand,    r:42, lw:18 }, // Stand (cyan)
  ];
  rings.forEach(ring => {
    ctx.beginPath();
    ctx.lineWidth = ring.lw;
    ctx.lineCap = "round";
    ctx.strokeStyle = ring.track;
    ctx.arc(cx, cy, ring.r, 0, Math.PI*2);
    ctx.stroke();

    const pct = Math.min(1, ring.val / Math.max(1, ring.goal));
    if(pct > 0){
      ctx.beginPath();
      ctx.strokeStyle = ring.color;
      ctx.arc(cx, cy, ring.r, -Math.PI/2, -Math.PI/2 + pct * Math.PI*2);
      ctx.stroke();
    }
  });

  document.getElementById("r3Move").textContent = `${Math.round(a.move)}/${g.move}`;
  document.getElementById("r3Ex").textContent   = `${Math.round(a.exercise)}/${g.exercise}`;
  document.getElementById("r3St").textContent   = `${Math.round(a.stand)}/${g.stand}`;

  // Weekly strip
  const wk = document.getElementById("rings3Week");
  if(wk){
    let html = "";
    for(let i=6; i>=0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = todayKey(d);
      const da = (state.days[k] && state.days[k].activity) || { move:0, exercise:0, stand:0 };
      const m = Math.min(1, da.move/g.move) * 100;
      const e = Math.min(1, da.exercise/g.exercise) * 100;
      const s = Math.min(1, da.stand/g.stand) * 100;
      const dayLetter = d.toLocaleDateString(undefined,{weekday:"narrow"});
      html += `<div class="rwk" title="${k}">
        <div class="rwk-stack">
          <div class="rwk-bar rwk-move"><span style="height:${m}%"></span></div>
          <div class="rwk-bar rwk-ex"><span style="height:${e}%"></span></div>
          <div class="rwk-bar rwk-st"><span style="height:${s}%"></span></div>
        </div>
        <div class="rwk-day">${dayLetter}</div>
      </div>`;
    }
    wk.innerHTML = html;
  }
}

function openActivityLogModal(){
  const a = getActivityForDay(currentDate);
  const g = getActivityGoals();
  const sourceLabel = a.source === "applehealth" ? "Apple Health import" : a.source === "auto" ? "Auto-derived from your logs" : a.manual ? "Manual entry (override)" : "Manual entry";
  const sessionsToday = ((state.days[currentDate] || {}).sessions || []).length;
  openModal("Log activity for " + fmtDate(currentDate), `
    <p style="font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;font-weight:700;margin:0 0 4px">Source: ${sourceLabel}</p>
    <p style="font-size:12px;color:#888;line-height:1.5;margin:0 0 10px">Type the numbers from your watch, or snap a photo of the Activity / Health screen and AI will read it.</p>
    <div class="aw-snap-row">
      <button type="button" class="btn btn-cyan" id="awSnapBtn" style="width:100%">Snap Apple Watch / Health screen</button>
      <input type="file" id="awSnapFile" accept="image/*" capture="environment" style="display:none">
      <div id="awSnapStatus" style="font-size:12px;color:#666;text-align:center;margin-top:6px"></div>
    </div>
    <div class="form-grid" style="margin-top:10px">
      <label><span>Move (cal burned)</span><input id="actMove" type="number" min="0" max="5000" value="${a.move||""}" placeholder="0"></label>
      <label><span>Exercise (min)</span><input id="actEx" type="number" min="0" max="600" value="${a.exercise||""}" placeholder="0"></label>
      <label><span>Stand (hrs)</span><input id="actSt" type="number" min="0" max="24" value="${a.stand||""}" placeholder="0"></label>
    </div>
    <div class="act-workout-block" style="margin-top:12px;padding:10px;border:1px dashed var(--navy-line-2);border-radius:8px">
      <p style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--cyan);font-weight:700;margin:0 0 6px">${sessionsToday ? "Workout already logged" : "What did you do?"}</p>
      ${sessionsToday
        ? `<p style="font-size:11px;color:#888;margin:0">${sessionsToday} session(s) on the lift page. Skip the box below — Move/Exercise will auto-fill from those.</p>`
        : `<input id="actWorkoutText" type="text" placeholder="e.g. 30 min run · CrossFit WOD · Legs day" style="width:100%;padding:8px 10px;border-radius:6px;font-size:13px">
           <label style="display:flex;gap:6px;align-items:center;margin-top:8px;font-size:11px;color:#bbb">
             <input id="actAlsoLog" type="checkbox" checked> Also log it on the Fitness page
           </label>`}
    </div>
    <details style="margin-top:8px">
      <summary style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#888;font-weight:700;cursor:pointer">Adjust goals</summary>
      <div class="form-grid" style="margin-top:10px">
        <label><span>Move goal</span><input id="goalMove" type="number" min="100" max="3000" value="${g.move}"></label>
        <label><span>Exercise goal</span><input id="goalEx" type="number" min="10" max="240" value="${g.exercise}"></label>
        <label><span>Stand goal</span><input id="goalSt" type="number" min="6" max="24" value="${g.stand}"></label>
      </div>
    </details>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-ghost" id="actAuto">↻ Use auto-derived</button>
      <button class="btn btn-cyan" id="actSave">Save</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const auto = document.getElementById("actAuto");
    if(auto) auto.addEventListener("click", () => {
      const day = dayObj(currentDate);
      delete day.activity;
      save(); closeModal(); renderAll();
      toast("Switched to auto-derived activity", "cyan");
    });

    // Apple Watch / Health screenshot OCR via AI (BYOK)
    const snapBtn = document.getElementById("awSnapBtn");
    const snapFile = document.getElementById("awSnapFile");
    const snapStatus = document.getElementById("awSnapStatus");
    if(snapBtn && snapFile){
      snapBtn.addEventListener("click", () => {
        if(!getAI || !getAI().key){
          if(typeof openAIKeyPrompt === "function"){
            closeModal();
            openAIKeyPrompt("Snap a photo of the Apple Watch / Health screen → AI reads Move, Exercise, and Stand for you.");
          } else {
            toast("Add an AI key in Settings to use screenshot import","pink");
          }
          return;
        }
        snapFile.click();
      });
      snapFile.addEventListener("change", async () => {
        if(!snapFile.files[0]) return;
        snapStatus.textContent = "Compressing screenshot…";
        try {
          const b64 = await compressImage(snapFile.files[0], 1280);
          snapStatus.textContent = "Reading numbers with AI…";
          const prompt = `You are reading an Apple Watch Activity ring summary or Apple Health screen.
Extract today's three values. Respond with ONLY valid JSON, no prose, no markdown:
{"move": <calories burned, integer>, "exercise": <minutes, integer>, "stand": <hours, integer>, "confidence": <0..1>}
Rules:
- "move" = Active Energy / Move ring (kcal). If shown as "kJ", convert to kcal (kJ * 0.239).
- "exercise" = Exercise minutes. If shown as "Apple Exercise Time" use that.
- "stand" = Stand hours (count of stand hours, max 24).
- If a value is not visible, use 0.
- No keys other than the four above.`;
          const text = await aiRequest(prompt, b64);
          let parsed;
          try { parsed = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,"")); }
          catch(e){
            const m = text.match(/\{[\s\S]*\}/);
            if(m) parsed = JSON.parse(m[0]);
            else throw new Error("AI response was not valid JSON");
          }
          const m = document.getElementById("actMove");
          const ex = document.getElementById("actEx");
          const st = document.getElementById("actSt");
          if(m && parsed.move != null) m.value = Math.round(parsed.move);
          if(ex && parsed.exercise != null) ex.value = Math.round(parsed.exercise);
          if(st && parsed.stand != null) st.value = Math.round(parsed.stand);
          const conf = parsed.confidence != null ? ` · ${Math.round(parsed.confidence*100)}% confident` : "";
          snapStatus.innerHTML = `<span style="color:var(--cyan)">✓ Filled in${conf} — review and Save</span>`;
        } catch(err){
          snapStatus.innerHTML = `<span style="color:var(--pink)">Failed: ${escape(err.message)}. Type the numbers below.</span>`;
        } finally {
          snapFile.value = "";
        }
      });
    }

    document.getElementById("actSave").addEventListener("click", () => {
      const day = dayObj(currentDate);
      day.activity = {
        move: parseFloat(document.getElementById("actMove").value) || 0,
        exercise: parseFloat(document.getElementById("actEx").value) || 0,
        stand: parseFloat(document.getElementById("actSt").value) || 0,
        manual: true,
      };
      // Optional: log workout description to fitness page
      const workoutEl = document.getElementById("actWorkoutText");
      const alsoLogEl = document.getElementById("actAlsoLog");
      if(workoutEl && workoutEl.value.trim() && alsoLogEl && alsoLogEl.checked){
        if(!day.sessions) day.sessions = [];
        day.sessions.push({
          id: uid(),
          name: workoutEl.value.trim(),
          lift: workoutEl.value.trim(),
          weight: 0, reps: 0, sets: 1,
          type: "cardio",
          notes: `Logged from rings · ${day.activity.exercise} min`,
          loggedFromRings: true,
        });
      }
      state.activityGoals = {
        move: parseInt(document.getElementById("goalMove").value,10) || 800,
        exercise: parseInt(document.getElementById("goalEx").value,10) || 60,
        stand: parseInt(document.getElementById("goalSt").value,10) || 16,
      };
      save(); closeModal(); renderAll();
      toast("Activity logged", "cyan");
    });
  });
}

// =================================================================
// MFP-STYLE MACRO CALCULATOR (Mifflin-St Jeor + Katch-McArdle)
// =================================================================
function openMacroCalcModal(){
  const lastWeight = (state.weights[state.weights.length-1] || {}).val || "";
  const lastBF = (state.measurements.slice().reverse().find(m => m.type==="bodyfat") || {}).val || "";
  const profYear = state.profile.birthYear || "";
  const sex = state.profile.sex || "f";
  openModal("Calculate macros for me", `
    <p style="font-size:12px;color:#666;line-height:1.5;margin:0 0 12px">Same math MyFitnessPal and most coaches use — Mifflin-St Jeor (or Katch-McArdle if you've logged body fat). Pulls latest weight + body fat from your log if available.</p>
    <div class="form-grid">
      <label><span>Sex</span>
        <select id="mcSex"><option value="f" ${sex==="f"?"selected":""}>Female</option><option value="m" ${sex==="m"?"selected":""}>Male</option></select>
      </label>
      <label><span>Age</span><input id="mcAge" type="number" min="14" max="90" value="${profYear ? new Date().getFullYear()-profYear : ""}" placeholder="35"></label>
      <label><span>Height (in or cm)</span><input id="mcHt" type="number" min="50" max="220" step="0.5" value="${state.profile.height||""}" placeholder="${state.profile.units==='metric'?'168':'66'}"></label>
      <label><span>Weight (${unit()})</span><input id="mcWt" type="number" min="60" max="600" step="0.1" value="${lastWeight}" placeholder=""></label>
      <label><span>Body fat % (optional)</span><input id="mcBF" type="number" min="3" max="60" step="0.1" value="${lastBF}" placeholder="auto from log"></label>
      <label><span>Activity</span>
        <select id="mcAct">
          <option value="1.2">Sedentary (desk)</option>
          <option value="1.375">Light (1-3 d/wk)</option>
          <option value="1.55" selected>Moderate (3-5 d/wk)</option>
          <option value="1.725">Heavy (6-7 d/wk)</option>
          <option value="1.9">Athlete (2x/day)</option>
        </select>
      </label>
      <label><span>Goal</span>
        <select id="mcGoal">
          <option value="cut">Lose fat (-500 cal)</option>
          <option value="cutmild">Lose slow (-250 cal)</option>
          <option value="maintain" selected>Maintain</option>
          <option value="recomp">Recomp — lean out + build (-150 cal)</option>
          <option value="leanbulk">Build muscle (+250 cal)</option>
          <option value="bulk">Bulk (+500 cal)</option>
        </select>
      </label>
      <label><span>Macro split</span>
        <select id="mcSplit">
          <option value="balanced" selected>Balanced 30/40/30</option>
          <option value="recomp">Lean / recomp 40/40/20 — high protein, low fat</option>
          <option value="highprotein">High protein 40/35/25</option>
          <option value="lowcarb">Low carb 30/20/50</option>
          <option value="endurance">Endurance 20/55/25</option>
        </select>
      </label>
      <label class="mc-cycle"><span>Carb cycling</span>
        <select id="mcCycle">
          <option value="off" selected>Off — same macros every day</option>
          <option value="on">On — high carb on training days, low on rest days</option>
        </select>
      </label>
    </div>
    <div id="mcResult" class="mc-result hidden"></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="mcCalc">Calculate</button>
      <button class="btn btn-lime hidden" id="mcApply">Apply to goals</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    let computed = null;
    document.getElementById("mcCalc").addEventListener("click", () => {
      const sex = document.getElementById("mcSex").value;
      const age = parseFloat(document.getElementById("mcAge").value);
      let ht = parseFloat(document.getElementById("mcHt").value);
      let wt = parseFloat(document.getElementById("mcWt").value);
      const bf = parseFloat(document.getElementById("mcBF").value);
      const act = parseFloat(document.getElementById("mcAct").value);
      const goal = document.getElementById("mcGoal").value;
      const split = document.getElementById("mcSplit").value;
      if(isNaN(age) || isNaN(ht) || isNaN(wt)) { toast("Fill in age, height, weight", "pink"); return; }

      // Convert to metric for the formulas
      let kg = wt, cm = ht;
      if(state.profile.units !== "metric"){ kg = wt * 0.4536; cm = ht * 2.54; }

      let bmr;
      let formula;
      if(!isNaN(bf) && bf > 3 && bf < 60){
        // Katch-McArdle: BMR = 370 + 21.6 * lean kg
        const lean = kg * (1 - bf/100);
        bmr = 370 + 21.6 * lean;
        formula = "Katch-McArdle";
      } else {
        // Mifflin-St Jeor
        bmr = 10*kg + 6.25*cm - 5*age + (sex === "m" ? 5 : -161);
        formula = "Mifflin-St Jeor";
      }
      const tdee = bmr * act;
      const adj = { cut:-500, cutmild:-250, maintain:0, recomp:-150, leanbulk:250, bulk:500 }[goal];
      const cal = Math.round(tdee + adj);

      const splits = {
        balanced:    [.30,.40,.30],
        recomp:      [.40,.40,.20],   // high protein, mod-high carbs, low fat
        highprotein: [.40,.35,.25],
        lowcarb:     [.30,.20,.50],
        endurance:   [.20,.55,.25],
      };
      const [pP, cP, fP] = splits[split];
      const protein = Math.round(cal * pP / 4);
      const carbs   = Math.round(cal * cP / 4);
      const fat     = Math.round(cal * fP / 9);
      // Protein floor for muscle building / cut: at least 0.8g/lb body weight
      const proteinFloor = Math.round(wt * 0.8);
      const finalProtein = Math.max(protein, proteinFloor);

      const cycleOn = document.getElementById("mcCycle").value === "on";
      const cycle = cycleOn ? buildCarbCycle(carbs, fat, state.profile.units === "metric" ? wt * 2.205 : wt) : null;
      computed = { cal, protein: finalProtein, carbs, fat, cycle };

      const lbsPerWeek = Math.abs(adj) * 7 / 3500;
      const dir = adj < 0 ? "lose" : adj > 0 ? "gain" : "maintain";
      const result = document.getElementById("mcResult");
      result.classList.remove("hidden");
      result.innerHTML = `
        <div class="mc-grid">
          <div><div class="mc-lbl">BMR</div><div class="mc-val">${Math.round(bmr)}</div><div class="mc-sub">${formula}</div></div>
          <div><div class="mc-lbl">TDEE</div><div class="mc-val">${Math.round(tdee)}</div><div class="mc-sub">maintenance</div></div>
          <div class="mc-hi"><div class="mc-lbl">Daily target</div><div class="mc-val">${cal}</div><div class="mc-sub">~${lbsPerWeek.toFixed(1)} ${unit()}/wk to ${dir}</div></div>
        </div>
        <div class="mc-macros">
          <div><div class="mc-lbl mc-p">Protein</div><div class="mc-mval">${finalProtein}<i>g</i></div></div>
          <div><div class="mc-lbl mc-c">Carbs</div><div class="mc-mval">${carbs}<i>g</i></div></div>
          <div><div class="mc-lbl mc-f">Fat</div><div class="mc-mval">${fat}<i>g</i></div></div>
        </div>
        ${cycle ? `<div class="mc-cyc">
          <div class="mc-cyc-h">Carb cycling — same calories, different shape</div>
          <div class="mc-cyc-row"><span>Training day</span><b>${cycle.trainC}g carbs</b><b>${cycle.trainF}g fat</b></div>
          <div class="mc-cyc-row"><span>Rest day</span><b>${cycle.restC}g carbs</b><b>${cycle.restF}g fat</b></div>
          <div class="mc-cyc-note">Protein stays at ${finalProtein}g every day. The app picks the right target automatically from whether you trained (or have a workout planned).</div>
        </div>` : ""}
      `;
      document.getElementById("mcApply").classList.remove("hidden");
    });
    document.getElementById("mcApply").addEventListener("click", () => {
      if(!computed) return;
      state.goals.cal = computed.cal;
      state.goals.protein = computed.protein;
      state.goals.carbs = computed.carbs;
      state.goals.fat = computed.fat;
      if(computed.cycle) state.goals.cycle = computed.cycle;
      else delete state.goals.cycle;
      save(); closeModal(); renderAll();
      toast(computed.cycle ? "Goals + carb cycling saved" : "Goals updated", "cyan");
    });
  });
}

// Hook into existing render and global init

onReady(() => {
  const a = document.getElementById("logActivityBtn");
  if(a) a.addEventListener("click", openActivityLogModal);
  const m = document.getElementById("macroCalcBtn");
  if(m) m.addEventListener("click", openMacroCalcModal);
});

// Also import Active Energy + Apple Exercise Time from Health CSV if present
// Health Auto Export CSVs can carry Apple Watch activity columns; pull
// Move / Exercise / Stand into each day's activity record.
function importActivityColumns(text, result){
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  if(lines.length < 2) return;
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,"").toLowerCase());
  const findCol = (...n) => { for(let i=0;i<headers.length;i++) if(n.some(x => headers[i].includes(x))) return i; return -1; };
  const dateIdx = findCol("date","start","time");
  const moveIdx = findCol("active energy","activeenergy","active_energy");
  const exIdx   = findCol("apple exercise time","exercise time","exercisetime");
  const standIdx= findCol("apple stand hours","stand hours","standhours");
  if(dateIdx === -1) return;
  let added = 0;
  for(let i=1; i<lines.length; i++){
    const cells = parseCsvLine(lines[i]);
    const date = parseDate((cells[dateIdx]||"").trim());
    if(!date) continue;
    const day = dayObj(date);
    if(!day.activity) day.activity = { move:0, exercise:0, stand:0 };
    if(moveIdx>-1){ const v = parseFloat(cells[moveIdx]); if(!isNaN(v) && v>0){ day.activity.move = v; added++; } }
    if(exIdx>-1){   const v = parseFloat(cells[exIdx]);   if(!isNaN(v) && v>0){ day.activity.exercise = v; added++; } }
    if(standIdx>-1){const v = parseFloat(cells[standIdx]);if(!isNaN(v) && v>0){ day.activity.stand = v; added++; } }
  }
  if(added) result.activity = added;
}


// =================================================================
// MEAL TEMPLATES ("My Usuals") + RED FLAG UI
// =================================================================
function getTemplates(){
  if(!state.mealTemplates) state.mealTemplates = [];
  return state.mealTemplates;
}

// Macro-based food classifier — three tiers based on actual nutrition content
// Returns { tier: "clean" | "watch" | "indulgent", reason: "..." }
function classifyFoodMacros(item){
  if(item.clean) return { tier:"clean", reason:"manual override" };
  if(item.cheat) return { tier:"indulgent", reason:"manual override" };

  const cal = +item.cal || 0;
  const p   = +item.p   || 0;
  const c   = +item.c   || 0;
  const f   = +item.f   || 0;
  if(cal < 50) return { tier:"clean", reason:"low calorie" };

  const proteinCal = p * 4;
  const carbCal    = c * 4;
  const fatCal     = f * 9;
  const macroCal   = proteinCal + carbCal + fatCal;
  if(macroCal === 0) return { tier:"clean", reason:"unknown macros" };

  const carbPct    = carbCal / macroCal;
  const fatPct     = fatCal  / macroCal;
  const protein100 = (p / cal) * 100;       // grams of protein per 100 kcal
  const carbDens   = (c / cal) * 100;       // grams of carbs per 100 kcal

  // INDULGENT — clear flags
  if(cal >= 100 && p < 2 && f < 2 && c > 10)
    return { tier:"indulgent", reason:`liquid sugar / alcohol — ${c}g carbs, no protein/fat` };
  if(cal >= 200 && carbPct > 0.65 && protein100 < 4)
    return { tier:"indulgent", reason:`refined carbs — ${Math.round(carbPct*100)}% cal from carbs, only ${p.toFixed(1)}g protein` };
  if(cal >= 200 && fatPct > 0.55 && protein100 < 5)
    return { tier:"indulgent", reason:`high-fat — ${Math.round(fatPct*100)}% cal from fat, only ${p.toFixed(1)}g protein` };
  if(cal >= 350 && protein100 < 4)
    return { tier:"indulgent", reason:`empty calories — ${cal} kcal, only ${p.toFixed(1)}g protein` };
  if(c >= 35 && carbDens > 18 && protein100 < 5)
    return { tier:"indulgent", reason:`high carb density — ${c}g carbs in ${cal} kcal` };

  // WATCH — borderline
  if(cal >= 150 && carbPct > 0.55 && protein100 < 6)
    return { tier:"watch", reason:`carb-heavy — ${Math.round(carbPct*100)}% cal from carbs` };
  if(cal >= 150 && fatPct > 0.45 && protein100 < 6)
    return { tier:"watch", reason:`fat-heavy — ${Math.round(fatPct*100)}% cal from fat` };
  if(cal >= 250 && protein100 < 5)
    return { tier:"watch", reason:`low protein density — ${p.toFixed(1)}g protein in ${cal} kcal` };

  return { tier:"clean", reason:"balanced" };
}

// Backward-compat shim (some code still references it)
function isCheatFood(item){
  return classifyFood(item).tier === "indulgent";
}

function renderUsuals(){
  const grid = document.getElementById("usualsGrid");
  if(!grid) return;
  const tpls = getTemplates();
  if(!tpls.length){
    grid.innerHTML = `<div class="usuals-empty">No saved meals yet. In the Diary, tap <b>SELECT</b>, pick items, then <b>SAVE AS MEAL</b>.</div>`;
    return;
  }
  grid.innerHTML = tpls.map(t => {
    const totals = (t.items||[]).reduce((a,it)=>({cal:a.cal+it.cal,p:a.p+it.p,c:a.c+it.c,f:a.f+it.f}), {cal:0,p:0,c:0,f:0});
    return `<div class="usual-card" data-id="${t.id}">
      <div class="usual-head">
        <div class="usual-name">${escape(t.name)}</div>
        <button class="usual-del" data-del="${t.id}" title="Delete">×</button>
      </div>
      <div class="usual-meta">${t.items.length} item${t.items.length===1?"":"s"} · ${Math.round(totals.cal)} kcal · P${Math.round(totals.p)} C${Math.round(totals.c)} F${Math.round(totals.f)}</div>
      <div class="usual-items">${t.items.slice(0,4).map(i => escape(i.name)).join(" · ")}${t.items.length>4?" · ...":""}</div>
      <div class="usual-actions">
        ${["breakfast","lunch","dinner","snacks"].map(m =>
          `<button class="usual-add" data-add="${t.id}" data-meal="${m}">+ ${m}</button>`
        ).join("")}
      </div>
    </div>`;
  }).join("");

  grid.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", () => {
    const tpl = getTemplates().find(x => x.id === b.dataset.add);
    if(!tpl) return;
    const day = dayObj(currentDate);
    tpl.items.forEach(it => {
      day.meals[b.dataset.meal].push({ id:uid(), ...it });
    });
    save(); renderAll();
    toast(`Logged ${tpl.name} → ${b.dataset.meal}`, "cyan");
  }));
  grid.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
    if(!confirm("Delete this usual?")) return;
    state.mealTemplates = getTemplates().filter(x => x.id !== b.dataset.del);
    save(); renderUsuals();
  }));
}

function saveMealAsTemplate(meal){
  const day = dayObj(currentDate);
  const items = (day.meals[meal] || []).map(it => ({
    name:it.name, serving:it.serving, cal:it.cal, p:it.p, c:it.c, f:it.f, cheat:it.cheat
  }));
  if(!items.length){ toast("Nothing in that meal yet", "pink"); return; }
  const default_name = `My ${capitalize(meal)}`;
  const name = prompt("Name this usual:", default_name);
  if(!name) return;
  getTemplates().push({ id:"tpl-"+uid(), name:name.trim().slice(0,40), items, createdAt:todayKey() });
  save(); renderAll();
  toast(`Saved "${name}"`, "cyan");
}

// =================================================================
// RED FLAG UI: paint over-goal bars red, mark cheat foods, banner
// =================================================================
function applyRedFlags(){
  // Macro bars: add .over class when val > goal
  const t = totalsFor(currentDate);
  const g = state.goals;
  const flagBar = (barId, val, goal) => {
    const el = document.getElementById(barId);
    if(!el) return;
    el.classList.toggle("over", val > goal);
    el.classList.toggle("warn", val > goal*0.9 && val <= goal);
  };
  flagBar("pBar", t.p, g.protein);
  flagBar("cBar", t.c, g.carbs);
  flagBar("fBar", t.f, g.fat);

  // Calorie ring caption (already handled by chart color), plus banner
  const banner = document.getElementById("overBanner");
  const overCal = t.cal - g.cal;
  if(banner){
    if(overCal > 0){
      banner.classList.remove("hidden");
      banner.textContent = `🔴 Over by ${overCal} kcal — ${Math.round((overCal/g.cal)*100)}% above goal`;
    } else if(t.cal > g.cal * 0.9){
      banner.classList.remove("hidden");
      banner.classList.add("warn");
      banner.textContent = `Within ${g.cal - t.cal} kcal of goal — careful`;
    } else {
      banner.classList.add("hidden");
      banner.classList.remove("warn");
    }
  }

  // Mark diary items by macro-based tier (indulgent / watch / clean)
  const day = dayObj(currentDate);
  MEAL_ORDER.forEach(meal => {
    const rows = document.querySelectorAll(`.dy-meal[data-meal="${meal}"] .dy-item`);
    (day.meals[meal] || []).forEach((item, i) => {
      const row = rows[i];
      if(!row) return;
      row.classList.remove("cheat","watch","clean");
      const { tier, reason } = classifyFood(item);
      row.classList.add(tier);
      row.title = reason;
    });
  });
}

// =================================================================
// HOOKS — extend existing renders without rewriting them
// =================================================================
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function renderNutritionStep_RenderNutritionForFlags(){
  renderUsuals();
  applyRedFlags();
}

// (addSaveAsUsualButtons removed — diary SELECT -> SAVE AS MEAL covers it)



// =================================================================
// APP-LIKE TOPBAR — settings gear + user menu
// =================================================================
onReady(() => {
  const sg = document.getElementById("tbSettingsBtn");
  if(sg) sg.addEventListener("click", () => {
    if(window.BERMO_TRACKER && window.BERMO_TRACKER.go) window.BERMO_TRACKER.go("settings");
  });

  const user = document.getElementById("tbUser");
  if(user){
    user.addEventListener("click", (e) => {
      e.stopPropagation();
      user.classList.toggle("open");
    });
    document.addEventListener("click", () => user.classList.remove("open"));
    user.querySelectorAll(".tbm-item[data-tab]").forEach(b => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        user.classList.remove("open");
        const tab = b.dataset.tab;
        if(window.BERMO_TRACKER && window.BERMO_TRACKER.go) window.BERMO_TRACKER.go(tab);
      });
    });
    const out = document.getElementById("tbmSignOut");
    if(out) out.addEventListener("click", (e) => {
      e.stopPropagation();
      user.classList.remove("open");
      const lo = document.getElementById("logoutBtn");
      if(lo) lo.click();
    });
  }
});

// =================================================================
// FIBER + SUGAR — secondary detailed nutrition tracking
// =================================================================
function totalsDetailFor(key){
  const day = dayObj(key);
  let cal=0,p=0,c=0,f=0,fib=0,sug=0;
  let knownFib = 0, knownSug = 0, count = 0;
  ["breakfast","lunch","dinner","snacks"].forEach(meal => {
    day.meals[meal].forEach(it => {
      cal += it.cal; p += it.p; c += it.c; f += it.f;
      count++;
      if(it.fiber != null){ fib += it.fiber; knownFib++; } else { fib += (it.c || 0) * 0.10; }
      if(it.sugar != null){ sug += it.sugar; knownSug++; } else { sug += (it.c || 0) * 0.30; }
    });
  });
  return {
    cal:Math.round(cal), p:Math.round(p), c:Math.round(c), f:Math.round(f),
    fiber:Math.round(fib*10)/10, sugar:Math.round(sug*10)/10,
    knownFib, knownSug, count
  };
}

// One place that turns a food record into a diary item, so fiber, sugar
// and micronutrients stop being dropped on the way in (they were).
function mealItemFrom(food, mult){
  const m = mult || 1;
  const r1 = (v) => Math.round(v * m * 10) / 10;
  const out = {
    id: uid(),
    name: food.name,
    serving: m === 1 ? (food.serving || "") : `${m} × ${food.serving || "serving"}`,
    cal: Math.round((+food.cal || 0) * m),
    p: r1(+food.p || 0), c: r1(+food.c || 0), f: r1(+food.f || 0),
  };
  if(food.fiber != null) out.fiber = r1(+food.fiber);
  if(food.sugar != null) out.sugar = r1(+food.sugar);
  if(food.micros){
    const mi = {};
    Object.keys(food.micros).forEach(k => { mi[k] = Math.round((+food.micros[k] || 0) * m * 10) / 10; });
    out.micros = mi;
  }
  if(food.upc || food._upc) out.upc = food.upc || food._upc;
  return out;
}

// =================================================================
// MICRONUTRIENTS
// Only ever shows numbers that came from a real source: a scanned or
// searched OpenFoodFacts product, or values typed on a custom food.
// The built-in whole-food list carries macros only, so the card always
// reports its own COVERAGE rather than pretending a total is complete.
// =================================================================
const MICROS = [
  { key:"satfat",  label:"Saturated fat", unit:"g",   goal:20,   cap:true,  off:"saturated-fat", mult:1 },
  { key:"sodium",  label:"Sodium",        unit:"mg",  goal:2300, cap:true,  off:"sodium",        mult:1000 },
  { key:"potassium",label:"Potassium",    unit:"mg",  goal:2600, cap:false, off:"potassium",     mult:1000 },
  { key:"calcium", label:"Calcium",       unit:"mg",  goal:1000, cap:false, off:"calcium",       mult:1000 },
  { key:"iron",    label:"Iron",          unit:"mg",  goal:18,   cap:false, off:"iron",          mult:1000 },
  { key:"magnesium",label:"Magnesium",    unit:"mg",  goal:320,  cap:false, off:"magnesium",     mult:1000 },
  { key:"vitc",    label:"Vitamin C",     unit:"mg",  goal:75,   cap:false, off:"vitamin-c",     mult:1000 },
  { key:"vitd",    label:"Vitamin D",     unit:"mcg", goal:20,   cap:false, off:"vitamin-d",     mult:1000000 },
  { key:"vita",    label:"Vitamin A",     unit:"mcg", goal:700,  cap:false, off:"vitamin-a",     mult:1000000 },
  { key:"chol",    label:"Cholesterol",   unit:"mg",  goal:300,  cap:true,  off:"cholesterol",   mult:1000 },
];

// Pull whatever micronutrients an OpenFoodFacts product actually carries.
function _microsFromOFF(n, preferServing){
  if(!n) return null;
  const out = {};
  MICROS.forEach(m => {
    const v = preferServing
      ? (n[m.off + "_serving"] != null ? n[m.off + "_serving"] : n[m.off + "_100g"])
      : (n[m.off + "_100g"] != null ? n[m.off + "_100g"] : n[m.off + "_serving"]);
    if(v == null || isNaN(v)) return;
    const scaled = v * m.mult;
    if(scaled > 0) out[m.key] = Math.round(scaled * 10) / 10;
  });
  return Object.keys(out).length ? out : null;
}

// Sum a day's micronutrients and report how much of the day they cover.
function microsFor(key){
  const day = dayObj(key);
  const totals = {};
  let items = 0, withData = 0, calWith = 0, calAll = 0;
  ["breakfast","lunch","dinner","snacks"].forEach(m => {
    (day.meals[m] || []).forEach(it => {
      items++; calAll += (+it.cal || 0);
      const mi = it.micros;
      if(!mi || !Object.keys(mi).length) return;
      withData++; calWith += (+it.cal || 0);
      Object.keys(mi).forEach(k => { totals[k] = (totals[k] || 0) + (+mi[k] || 0); });
    });
  });
  return { totals, items, withData, calWith, calAll,
           coverage: calAll ? Math.round(calWith / calAll * 100) : 0 };
}

function renderMicros(){
  const host = document.getElementById("microTable");
  if(!host) return;
  const m = microsFor(currentDate);
  const meta = document.getElementById("microMeta");
  if(meta) meta.textContent = m.items ? `${m.withData}/${m.items} items` : "—";

  if(!m.items){
    host.innerHTML = `<p class="wl-empty">Log food and any micronutrients your items carry show up here.</p>`;
    return;
  }
  const rows = MICROS.filter(x => m.totals[x.key] != null);
  if(!rows.length){
    host.innerHTML = `<p class="wl-empty">None of today's ${m.items} item${m.items===1?"":"s"} carry micronutrient data. Scanned barcodes and searched packaged foods usually do; the built-in whole-food list is macros only. You can also type these onto a custom food.</p>`;
    return;
  }
  host.innerHTML = `<div class="micro-cov">Based on <b>${m.withData} of ${m.items}</b> items — about <b>${m.coverage}%</b> of today's calories. Anything below is a floor, not a total.</div>`
    + rows.map(x => {
      const val = Math.round(m.totals[x.key] * 10) / 10;
      const pct = Math.min(100, (val / x.goal) * 100);
      const over = x.cap && val > x.goal;
      const low  = !x.cap && pct < 50;
      return `<div class="micro-row ${over ? "over" : (low ? "low" : "")}">
        <span class="micro-name">${x.label}</span>
        <span class="micro-bar"><i style="width:${pct}%"></i></span>
        <span class="micro-val">${val}<em>${x.unit}</em></span>
        <span class="micro-goal">${x.cap ? "max " : ""}${x.goal}</span>
      </div>`;
    }).join("")
    + `<p class="corr-foot">Targets are general adult reference values (${MICROS.filter(x=>x.cap).map(x=>x.label.toLowerCase()).join(", ")} are ceilings, the rest are floors) — not medical advice.</p>`;
}

function renderDetail(){
  const card = document.getElementById("detailCard");
  if(!card) return;
  const grid = document.getElementById("detailGrid");
  const note = document.getElementById("detailNote");
  const t = totalsDetailFor(currentDate);
  const fiberGoal = state.goals.fiber || 30;
  const sugarLimit = state.goals.sugar || 25; // soft cap — AHA added-sugar guidance for women
  const proteinDensity = t.cal ? (t.p / t.cal * 100).toFixed(1) : "0.0";
  const carbDensity    = t.cal ? (t.c / t.cal * 100).toFixed(1) : "0.0";

  grid.innerHTML = `
    <div class="detail-pill ${t.fiber < fiberGoal*0.5 ? "over" : ""}">
      <div class="dp-lbl">Fiber</div>
      <div class="dp-val">${t.fiber}<i>g / ${fiberGoal}g</i></div>
      <div class="dp-bar"><span style="width:${Math.min(100, (t.fiber/fiberGoal)*100)}%;background:#00f5d4"></span></div>
    </div>
    <div class="detail-pill ${t.sugar > sugarLimit ? "over" : ""}">
      <div class="dp-lbl">Sugar</div>
      <div class="dp-val">${t.sugar}<i>g / ${sugarLimit}g cap</i></div>
      <div class="dp-bar"><span style="width:${Math.min(100, (t.sugar/sugarLimit)*100)}%;background:${t.sugar > sugarLimit ? 'var(--pink)' : '#b788ff'}"></span></div>
    </div>
    <div class="detail-pill">
      <div class="dp-lbl">Protein density</div>
      <div class="dp-val">${proteinDensity}<i>g / 100kcal</i></div>
      <div class="dp-bar"><span style="width:${Math.min(100, (proteinDensity/10)*100)}%;background:var(--cyan)"></span></div>
    </div>
    <div class="detail-pill">
      <div class="dp-lbl">Carb density</div>
      <div class="dp-val">${carbDensity}<i>g / 100kcal</i></div>
      <div class="dp-bar"><span style="width:${Math.min(100, (carbDensity/20)*100)}%;background:#888"></span></div>
    </div>
  `;
  const unknown = t.count - t.knownFib;
  const unknownSug = t.count - t.knownSug;
  if(t.count === 0){
    note.textContent = "No food logged today.";
  } else if(unknown > 0 || unknownSug > 0){
    note.textContent = `Note: ${unknown} of ${t.count} items have estimated fiber, ${unknownSug} have estimated sugar (10% / 30% of carbs as defaults). For exact values, add fiber + sugar when creating custom foods in Settings.`;
  } else {
    note.textContent = "All values from logged data — no estimates.";
  }
}

// Hook into nutrition render

// Extend custom food form to read fiber + sugar inputs
onReady(() => {
  const form = document.getElementById("customFoodForm");
  if(!form) return;
  form.addEventListener("submit", (e) => {
    // The original handler runs first and pushes the custom food.
    // We piggyback to add fiber/sugar to the just-pushed item.
    setTimeout(() => {
      const fiber = parseFloat(document.getElementById("cfFiber") && document.getElementById("cfFiber").value);
      const sugar = parseFloat(document.getElementById("cfSugar") && document.getElementById("cfSugar").value);
      const last = state.customFoods[state.customFoods.length - 1];
      if(last){
        if(!isNaN(fiber)) last.fiber = fiber;
        if(!isNaN(sugar)) last.sugar = sugar;
        save();
      }
    }, 0);
  });
});

// Refine classifier: use sugar when known
// Sugar-aware wrapper over the macro classifier: known-high sugar always
// flags, moderate sugar upgrades an otherwise-clean food to "watch".
function classifyFood(item){
  if(item.sugar != null && item.sugar >= 15)
    return { tier:"indulgent", reason:`high sugar — ${item.sugar}g per serving` };
  const base = classifyFoodMacros(item);
  if(item.sugar != null && item.sugar >= 8 && base.tier === "clean")
    return { tier:"watch", reason:`moderate sugar — ${item.sugar}g per serving` };
  return base;
}


// =================================================================
// TRENDS — Daily check-in (sleep, mood, energy), cycle tracking,
//          pattern detection (rule-based, no AI)
// =================================================================

// ---------- Daily check-in ----------
function openCheckinModal(){
  const day = dayObj(currentDate);
  if(!day.checkin) day.checkin = {};
  const c = day.checkin;
  openModal("Daily check-in · " + fmtDate(currentDate), `
    <p style="font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;font-weight:700;margin:0">Track context once a day. Used for trend correlation.</p>
    <div class="form-grid">
      <label><span>Sleep (hrs)</span><input id="ciSleep" type="number" step="0.25" min="0" max="14" value="${c.sleep||""}"></label>
      <label><span>Water (cups today)</span><input id="ciWater" type="number" min="0" max="20" value="${c.water!=null?c.water:""}" placeholder="optional"></label>
    </div>
    <label><span>How do you feel? (1=rough, 5=amazing)</span></label>
    <div class="rating-row" id="ciMoodRow">
      ${[1,2,3,4,5].map(v => `<button type="button" class="rate-btn ${c.mood===v?"on":""}" data-mood="${v}">${["😩","😕","😐","🙂","🤩"][v-1]}</button>`).join("")}
    </div>
    <label><span>Energy</span></label>
    <div class="rating-row" id="ciEnergyRow">
      ${[1,2,3,4,5].map(v => `<button type="button" class="rate-btn ${c.energy===v?"on":""}" data-energy="${v}">${v}</button>`).join("")}
    </div>
    <label><span>Stress</span></label>
    <div class="rating-row" id="ciStressRow">
      ${[1,2,3,4,5].map(v => `<button type="button" class="rate-btn ${c.stress===v?"on":""}" data-stress="${v}">${v}</button>`).join("")}
    </div>
    <label><span>Note (optional)</span><input id="ciNote" type="text" maxlength="120" value="${escape(c.note||"")}" placeholder="Slept badly, busy day, sore..."></label>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="ciSave">Save</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    let mood = c.mood, energy = c.energy, stress = c.stress;
    root.querySelectorAll("[data-mood]").forEach(b => b.addEventListener("click", () => {
      mood = parseInt(b.dataset.mood,10);
      root.querySelectorAll("[data-mood]").forEach(x => x.classList.toggle("on", x === b));
    }));
    root.querySelectorAll("[data-energy]").forEach(b => b.addEventListener("click", () => {
      energy = parseInt(b.dataset.energy,10);
      root.querySelectorAll("[data-energy]").forEach(x => x.classList.toggle("on", x === b));
    }));
    root.querySelectorAll("[data-stress]").forEach(b => b.addEventListener("click", () => {
      stress = parseInt(b.dataset.stress,10);
      root.querySelectorAll("[data-stress]").forEach(x => x.classList.toggle("on", x === b));
    }));
    document.getElementById("ciSave").addEventListener("click", () => {
      const sleep = parseFloat(document.getElementById("ciSleep").value);
      const water = parseInt(document.getElementById("ciWater").value, 10);
      const note  = document.getElementById("ciNote").value.trim();
      day.checkin = {
        sleep: isNaN(sleep) ? undefined : sleep,
        mood, energy, stress, note: note || undefined,
        ...(isNaN(water) ? {} : {})
      };
      // Don't override water count just from check-in; that lives elsewhere
      save(); closeModal(); renderAll();
      toast("Check-in saved","cyan");
    });
  });
}

// ---------- Cycle tracking ----------
function getCycleData(){
  if(!state.cycle) state.cycle = { periods:[], avgLen:28 };
  return state.cycle;
}
function logPeriodStart(){
  const date = prompt("Period start date (YYYY-MM-DD):", currentDate);
  if(!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)){ toast("Need YYYY-MM-DD","pink"); return; }
  const cycle = getCycleData();
  cycle.periods.push({ start: date });
  cycle.periods.sort((a,b) => a.start.localeCompare(b.start));
  // recompute average cycle length
  if(cycle.periods.length >= 2){
    let total = 0, count = 0;
    for(let i=1;i<cycle.periods.length;i++){
      const a = new Date(cycle.periods[i-1].start);
      const b = new Date(cycle.periods[i].start);
      const days = Math.round((b - a) / 86400000);
      if(days >= 18 && days <= 45){ total += days; count++; }
    }
    if(count) cycle.avgLen = Math.round(total / count);
  }
  save(); renderTrends();
  toast("Period logged","cyan");
}
function cyclePhaseFor(dateKey){
  const cycle = getCycleData();
  if(!cycle.periods.length) return null;
  // Find most recent period start <= dateKey
  let last = null;
  for(const p of cycle.periods){ if(p.start <= dateKey) last = p; }
  if(!last) return null;
  const days = Math.round((new Date(dateKey) - new Date(last.start)) / 86400000);
  if(days < 0) return null;
  if(days < 5)  return "menstrual";
  if(days < 13) return "follicular";
  if(days < 16) return "ovulation";
  if(days <= cycle.avgLen) return "luteal";
  // After expected next period — assume still luteal until logged
  return "luteal";
}
function renderCyclePanel(){
  const panel = document.getElementById("cyclePanel");
  if(!panel) return;
  const cycle = getCycleData();
  if(!cycle.periods.length){
    panel.innerHTML = `Cycle tracking is off. Click <b>+ Log period start</b> to enable phase-based pattern detection.`;
    return;
  }
  const phase = cyclePhaseFor(currentDate);
  const last = cycle.periods[cycle.periods.length-1];
  const dayInCycle = Math.round((new Date(currentDate) - new Date(last.start))/86400000) + 1;
  panel.innerHTML = `
    <div class="cycle-row">
      <div><div class="cycle-lbl">Today</div><div class="cycle-val">Cycle day ${dayInCycle}</div><div class="cycle-sub">${phase ? phase.charAt(0).toUpperCase()+phase.slice(1)+" phase" : "—"}</div></div>
      <div><div class="cycle-lbl">Avg cycle</div><div class="cycle-val">${cycle.avgLen} days</div><div class="cycle-sub">from ${cycle.periods.length} period${cycle.periods.length===1?"":"s"} logged</div></div>
      <div><div class="cycle-lbl">Last period</div><div class="cycle-val">${fmtDate(last.start)}</div><div class="cycle-sub">${Math.round((new Date(currentDate)-new Date(last.start))/86400000)} days ago</div></div>
    </div>
    <div class="cycle-bar">
      ${[
        ["menstrual","#ff4d9d","1-5"],
        ["follicular","#b788ff","5-13"],
        ["ovulation","#00f5d4","13-16"],
        ["luteal","#4db8ff","16-"+cycle.avgLen],
      ].map(([p,c,r]) => `<div class="cph ${p===phase?"on":""}" style="--cc:${c}"><b class="cph-dot"></b><span>${p}</span><i>${r}</i></div>`).join("")}
    </div>
  `;
}

// ---------- Insight engine ----------
function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function pctDiff(a,b){ if(!b) return 0; return Math.round((a-b)/b*100); }

function computeInsights(){
  const insights = [];
  const dayKeys = Object.keys(state.days).sort();
  if(dayKeys.length < 7) return insights;

  // 1) Day-of-week calorie pattern
  const calByDow = [[],[],[],[],[],[],[]];
  dayKeys.forEach(k => {
    const dow = new Date(k+"T00:00:00").getDay();
    const t = totalsFor(k);
    if(t.cal > 0) calByDow[dow].push(t.cal);
  });
  const dowAvg = calByDow.map(arr => avg(arr));
  const overall = avg(dowAvg.filter(v => v>0));
  if(overall > 0){
    dowAvg.forEach((v, i) => {
      if(v > 0 && Math.abs(pctDiff(v, overall)) >= 18){
        const day = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i];
        const dir = v > overall ? "more" : "fewer";
        insights.push({
          icon: v > overall ? "🍕" : "🥗",
          tier: v > overall ? "watch" : "good",
          headline: `You eat ${Math.abs(pctDiff(v, overall))}% ${dir} on ${day}s`,
          body: `Average on ${day}s is ${Math.round(v)} kcal vs ${Math.round(overall)} kcal across the week. ${v > overall ? "Worth thinking about — that's where the slip happens." : "You're tighter on this day."}`
        });
      }
    });
  }

  // 2) Sleep vs PR / workout days
  const allSleep = dayKeys.map(k => (state.days[k].checkin && state.days[k].checkin.sleep)).filter(s => s != null);
  if(allSleep.length >= 5){
    const prDates = new Set();
    Object.values(state.prs).forEach(p => p.date && prDates.add(p.date));
    if(prDates.size >= 2){
      const sleepOnPR = [...prDates].map(d => state.days[d] && state.days[d].checkin && state.days[d].checkin.sleep).filter(s => s != null);
      const sleepOther = dayKeys.filter(k => !prDates.has(k)).map(k => state.days[k].checkin && state.days[k].checkin.sleep).filter(s => s != null);
      if(sleepOnPR.length && sleepOther.length){
        const a = avg(sleepOnPR), b = avg(sleepOther);
        if(Math.abs(a-b) >= 0.5){
          insights.push({
            icon: "sleep",
            tier: a > b ? "good" : "watch",
            headline: `PR days follow ${(a-b).toFixed(1)}h ${a>b?"more":"less"} sleep`,
            body: `Average sleep on days you set a PR: ${a.toFixed(1)}h. Average other days: ${b.toFixed(1)}h. ${a > b ? "Sleep is helping you lift heavier — protect it." : "Interesting — your PRs aren't tied to sleep, or you've been pushing through tired."}`
          });
        }
      }
    }
  }

  // 3) Workout quality vs water
  const workoutDays = dayKeys.filter(k => (state.days[k].sessions||[]).length > 0);
  const restDays    = dayKeys.filter(k => !(state.days[k].sessions||[]).length);
  if(workoutDays.length >= 3 && restDays.length >= 3){
    const wWater = avg(workoutDays.map(k => state.days[k].water || 0));
    const rWater = avg(restDays.map(k => state.days[k].water || 0));
    if(Math.abs(wWater - rWater) >= 4){
      insights.push({
        icon: "water",
        tier: "info",
        headline: `Workout days = ${Math.round(wWater)} oz water vs ${Math.round(rWater)} on rest days`,
        body: `${wWater > rWater ? "You hydrate more on training days." : "You actually drink less on training days — easy fix to log a couple more cups around your session."}`
      });
    }
  }

  // 4) Cycle phase calorie shift
  const cycle = getCycleData();
  if(cycle.periods.length >= 2){
    const phaseCal = { menstrual:[], follicular:[], ovulation:[], luteal:[] };
    dayKeys.forEach(k => {
      const ph = cyclePhaseFor(k);
      if(!ph) return;
      const t = totalsFor(k);
      if(t.cal > 0) phaseCal[ph].push(t.cal);
    });
    const baseline = avg([].concat(phaseCal.follicular, phaseCal.ovulation));
    if(baseline > 0 && phaseCal.luteal.length >= 3){
      const lutealAvg = avg(phaseCal.luteal);
      const diff = pctDiff(lutealAvg, baseline);
      if(Math.abs(diff) >= 12){
        insights.push({
          icon: "cycle",
          tier: "info",
          headline: `${diff > 0 ? "+" : ""}${diff}% calories during your luteal phase`,
          body: `Average ${Math.round(lutealAvg)} kcal in luteal vs ${Math.round(baseline)} kcal early-cycle. Real and normal — your TDEE is genuinely higher then. ${diff > 0 ? "Don't fight the cravings, just keep protein high." : "If under-eating, it can backfire."}`
        });
      }
    }
  }

  // 5) Logging consistency
  const logged = dayKeys.filter(k => totalsFor(k).cal > 0).length;
  const pct = Math.round(logged/dayKeys.length*100);
  if(dayKeys.length >= 14){
    insights.push({
      icon: pct > 70 ? "streak" : "alert",
      tier: pct > 70 ? "good" : "watch",
      headline: `You've logged meals on ${pct}% of days (${logged}/${dayKeys.length})`,
      body: pct > 70
        ? "Strong consistency — that's the variable that actually predicts results."
        : "Logging gaps are where most people slip. Try a one-tap usual on rough days."
    });
  }

  // 6) Protein hit rate
  const proteinHit = dayKeys.filter(k => totalsFor(k).p >= state.goals.protein * 0.9).length;
  const proteinPct = Math.round(proteinHit/Math.max(1,logged)*100);
  if(logged >= 7 && proteinPct < 50){
    insights.push({
      icon: "protein",
      tier: "watch",
      headline: `Hit your protein goal on only ${proteinPct}% of logged days`,
      body: `Goal is ${state.goals.protein}g. Adding a protein shake or extra serving once a day is the cheapest fix.`
    });
  }

  return insights;
}

// Named stroke icons for insight cards — the UI carries no emoji.
const INS_ICONS = {
  sleep:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.3 8.3 0 1 0 20 14.5Z"/></svg>',
  water:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.4 6 10.4A6 6 0 0 1 6 13.4C6 9.4 12 3 12 3Z"/></svg>',
  cycle:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" opacity=".35"/></svg>',
  protein:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 4.5h11l1.5 5.5-7 9.5-7-9.5 1.5-5.5Z"/><path d="M5 10h14"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
  streak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s4.5 4 4.5 8a4.5 4.5 0 0 1-9 0c0-1.6.8-3 1.6-4 .2 1.4 1 2.3 1.9 2.3 1.1 0 1.6-1 1-6.3Z"/><path d="M5.5 15.5a6.5 6.5 0 0 0 13 0"/></svg>',
  alert:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5 21 19H3l9-14.5Z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg>',
  sick:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5s1.3-1.2 3.5-1.2 3.5 1.2 3.5 1.2"/><path d="M9 9.5h.01"/><path d="M15 9.5h.01"/></svg>',
};
function insIcon(name){ return INS_ICONS[name] || INS_ICONS.target; }

function renderInsights(){
  const list = document.getElementById("insightsList");
  if(!list) return;
  const insights = computeInsights();
  document.getElementById("trCount").textContent = insights.length + " insight" + (insights.length===1?"":"s");
  if(!insights.length){
    list.innerHTML = `<div class="ins-empty">Not enough data yet — log a few weeks of meals + workouts and patterns will surface here automatically.</div>`;
    return;
  }
  list.innerHTML = insights.map(i => `
    <div class="ins-card ins-${i.tier}">
      <div class="ins-icon">${insIcon(i.icon)}</div>
      <div class="ins-body">
        <div class="ins-headline">${escape(i.headline)}</div>
        <div class="ins-text">${escape(i.body)}</div>
      </div>
    </div>
  `).join("");
}

function renderDowChart(){
  const c = document.getElementById("dowCalChart");
  if(!c || typeof Chart === "undefined") return;
  const dayKeys = Object.keys(state.days);
  const calByDow = [[],[],[],[],[],[],[]];
  dayKeys.forEach(k => {
    const dow = new Date(k+"T00:00:00").getDay();
    const t = totalsFor(k);
    if(t.cal > 0) calByDow[dow].push(t.cal);
  });
  const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const data = calByDow.map(arr => arr.length ? Math.round(avg(arr)) : 0);
  const overall = Math.round(avg(data.filter(v=>v>0)));
  document.getElementById("dowCalMeta").textContent = "avg " + overall + " kcal";
  if(window._dowChart) window._dowChart.destroy();
  window._dowChart = new Chart(c.getContext("2d"), {
    type:"bar",
    data:{ labels, datasets:[{ data, backgroundColor:"#00f5d4", borderRadius:6, maxBarThickness:32 }] },
    options:{
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>c.parsed.y+" kcal"}}},
      scales:{ y:{beginAtZero:true, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#a7b1c6",font:{size:10}}}, x:{grid:{display:false}, ticks:{color:"#a7b1c6",font:{size:10}}} }
    }
  });
}

function renderSleepChart(){
  const c = document.getElementById("sleepChart");
  if(!c || typeof Chart === "undefined") return;
  const dayKeys = Object.keys(state.days).sort().slice(-30);
  const labels = dayKeys.map(k => fmtDate(k));
  const data = dayKeys.map(k => (state.days[k].checkin && state.days[k].checkin.sleep) || null);
  const known = data.filter(x => x != null);
  document.getElementById("sleepMeta").textContent = known.length ? `avg ${avg(known).toFixed(1)} h · ${known.length}/${dayKeys.length} logged` : "no sleep data yet";
  if(window._sleepChart) window._sleepChart.destroy();
  window._sleepChart = new Chart(c.getContext("2d"), {
    type:"line",
    data:{ labels, datasets:[
      { data, borderColor:"#00f5d4", backgroundColor:"rgba(0,245,212,0.12)", fill:true, tension:.3, pointRadius:2, borderWidth:2, spanGaps:true },
      { type:"line", data:labels.map(()=>7), borderColor:"#4db8ff", borderWidth:1, borderDash:[4,4], pointRadius:0 }
    ] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{min:0, max:12, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#a7b1c6",font:{size:10}}}, x:{grid:{display:false}, ticks:{display:false}} } }
  });
}

function renderCtxGrid(){
  const grid = document.getElementById("ctxGrid");
  if(!grid) return;
  const dayKeys = Object.keys(state.days);
  const workoutDays = dayKeys.filter(k => (state.days[k].sessions||[]).length > 0);
  if(workoutDays.length === 0){ grid.innerHTML = `<div class="ins-empty">No workouts logged yet.</div>`; return; }
  const sleep = workoutDays.map(k => state.days[k].checkin && state.days[k].checkin.sleep).filter(s=>s!=null);
  const water = workoutDays.map(k => state.days[k].water || 0);
  const protein = workoutDays.map(k => totalsFor(k).p);
  const energy = workoutDays.map(k => state.days[k].checkin && state.days[k].checkin.energy).filter(s=>s!=null);
  const cells = [
    ["Sleep on training days", sleep.length ? avg(sleep).toFixed(1)+" h" : "—", "Goal: 7+ h"],
    ["Water on training days", Math.round(avg(water))+" oz", "Goal: 64+ oz"],
    ["Protein on training days", Math.round(avg(protein))+" g", "Goal: " + state.goals.protein + "+ g"],
    ["Reported energy", energy.length ? (avg(energy).toFixed(1)+" / 5") : "—", "Log via daily check-in"],
  ];
  grid.innerHTML = cells.map(([h,v,sub]) => `<div class="ctx-cell"><div class="ctx-h">${h}</div><div class="ctx-v">${v}</div><div class="ctx-sub">${sub}</div></div>`).join("");
}

function renderTrendsBase(){
  // hero hides once enough data
  const dayKeys = Object.keys(state.days);
  const hero = document.getElementById("trendHero");
  if(hero) hero.style.display = dayKeys.length >= 10 ? "none" : "flex";
  renderInsights();
  renderDowChart();
  renderSleepChart();
  renderCyclePanel();
  renderCtxGrid();
}

// Hook tab routing — call renderTrends when "trends" view becomes active
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function goStep_GoForTrends(tab){
  if(tab === "trends") renderTrends();
}

// Wire buttons
onReady(() => {
  const c = document.getElementById("trCheckinBtn");
  if(c) c.addEventListener("click", openCheckinModal);
  const r = document.getElementById("trRefreshBtn");
  if(r) r.addEventListener("click", renderTrends);
  const p = document.getElementById("trCyclePeriod");
  if(p) p.addEventListener("click", logPeriodStart);
});

// Expand Apple Health CSV to also import Sleep Analysis hours
// Sleep Analysis columns -> each day's check-in (minutes auto-converted).
function importSleepColumns(text, result){
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if(lines.length < 2) return;
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,"").toLowerCase());
  const findCol = (...n) => { for(let i=0;i<headers.length;i++) if(n.some(x => headers[i].includes(x))) return i; return -1; };
  const dateIdx = findCol("date","start","time");
  const sleepIdx = findCol("sleep analysis","sleep hours","asleep","sleep time");
  if(dateIdx === -1 || sleepIdx === -1) return;
  let added = 0;
  for(let i=1; i<lines.length; i++){
    const cells = parseCsvLine(lines[i]);
    const date = parseDate((cells[dateIdx]||"").trim());
    if(!date) continue;
    let hrs = parseFloat(cells[sleepIdx]);
    if(isNaN(hrs) || hrs <= 0) continue;
    if(hrs > 15) hrs = hrs / 60;   // value in minutes -> hours
    const day = dayObj(date);
    if(!day.checkin) day.checkin = {};
    day.checkin.sleep = Math.round(hrs * 4) / 4;   // round to 0.25h
    added++;
  }
  if(added) result.sleep = added;
}

// Composed CSV import: core rows, then supplemental Apple Watch columns.
function importHealthCSV(text){
  const result = importHealthCSVCore(text);
  importActivityColumns(text, result);
  importSleepColumns(text, result);
  return result;
}


// =================================================================
// SYMPTOM TRACKER + smart banners + symptom-aware insights
// =================================================================
const COMMON_SYMPTOMS = [
  // Gastro / gut
  "Stomach ache", "Bloating", "Heartburn", "Nausea", "Diarrhea", "Constipation",
  "Gas", "IBS flare", "Acid reflux", "Cramps (gut)",
  // Head / neuro
  "Headache", "Migraine", "Brain fog", "Dizziness", "Tension headache", "Sinus pressure",
  // Mood / mental
  "Anxiety", "Depression", "Emotional / weepy", "Mood swings", "Irritability",
  "Overwhelm", "Panic", "Apathy",
  // Energy / sleep
  "Low energy", "Fatigue", "Burnout", "Insomnia", "Restless sleep",
  "Nightmares", "Wake-ups", "Hunger spike", "Cravings", "Sugar crash",
  // Respiratory / ENT
  "Sore throat", "Laryngitis", "Cough", "Runny nose", "Stuffy nose",
  "Sinus infection", "Ear ache", "Strep", "Cold", "Pneumonia",
  "Bronchitis", "Sick (cold/flu)", "Shortness of breath", "Wheeze",
  // Skin / derm
  "Acne", "Skin breakout", "Rash", "Hives", "Eczema flare",
  "Cold sore", "Mouth ulcer / canker sore", "Dry skin", "Itchy skin",
  // Vascular / circulation
  "Raynaud's flare", "Cold hands/feet", "Bruising", "Tingling extremities",
  // Joint / muscle
  "Joint pain", "Sore muscles", "Back pain", "Neck pain", "Stiffness",
  "Knee pain", "Shoulder pain", "Lower back pain",
  // Hormonal / cycle
  "Period cramps", "Hot flashes", "Night sweats", "PMS", "Breast tenderness",
  "Acne (hormonal)", "Bloated face", "Water retention",
  // General / immune
  "Fever", "Chills", "Allergies", "Lymph node tender", "Cold sweats",
  // Misc
  "Eye strain", "Jaw / TMJ pain", "Tinnitus", "Acid mouth", "Dehydration headache"
];

function getDaySymptoms(key){
  const d = dayObj(key);
  if(!d.symptoms) d.symptoms = [];
  return d.symptoms;
}

function openSymptomModal(){
  openModal("Log symptom · " + fmtDate(currentDate), `
    <p style="font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;font-weight:700;margin:0">Tracking symptoms helps the insight engine spot triggers.</p>
    <label><span>Symptom</span>
      <input id="symName" list="symList" type="text" class="search-input" placeholder="Stomach ache, headache, low energy..." required>
      <datalist id="symList">${COMMON_SYMPTOMS.map(s => `<option value="${escape(s)}">`).join("")}</datalist>
    </label>
    <label><span>How bad? (1=mild, 5=severe)</span></label>
    <div class="rating-row" id="symSevRow">
      ${[1,2,3,4,5].map(v => `<button type="button" class="rate-btn" data-sev="${v}">${v}</button>`).join("")}
    </div>
    <div class="form-grid">
      <label><span>When?</span>
        <select id="symTime">
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening" selected>Evening</option>
          <option value="night">Night</option>
          <option value="all-day">All day</option>
        </select>
      </label>
      <label><span>Suspected trigger?</span>
        <select id="symTrigger">
          <option value="">No idea</option>
          <option value="food">Something I ate</option>
          <option value="dairy">Dairy</option>
          <option value="gluten">Gluten / bread</option>
          <option value="sugar">Sugar / sweets</option>
          <option value="alcohol">Alcohol</option>
          <option value="caffeine">Caffeine</option>
          <option value="dehydration">Dehydration</option>
          <option value="poor sleep">Poor sleep</option>
          <option value="stress">Stress</option>
          <option value="cycle">Cycle / hormones</option>
          <option value="workout">Workout</option>
          <option value="weather">Weather change</option>
        </select>
      </label>
    </div>
    <label><span>Note (optional)</span><input id="symNote" type="text" maxlength="120" placeholder="Worse after dinner, started at 3pm..."></label>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-pink" id="symSave">Log symptom</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    let sev = 3;
    root.querySelectorAll("[data-sev]").forEach((b, i) => {
      if(i === 2) b.classList.add("on");
      b.addEventListener("click", () => {
        sev = parseInt(b.dataset.sev,10);
        root.querySelectorAll("[data-sev]").forEach(x => x.classList.toggle("on", x === b));
      });
    });
    document.getElementById("symSave").addEventListener("click", () => {
      const name = document.getElementById("symName").value.trim();
      if(!name){ toast("What was the symptom?","pink"); return; }
      const time = document.getElementById("symTime").value;
      const trigger = document.getElementById("symTrigger").value;
      const note = document.getElementById("symNote").value.trim();
      getDaySymptoms(currentDate).push({
        id:uid(), name, severity:sev, time, trigger:trigger||null,
        note:note||null, loggedAt:Date.now()
      });
      save(); closeModal(); renderAll();
      toast("Symptom logged","pink");
    });
  });
}

function renderSymptomPanel(){
  const panel = document.getElementById("symptomPanel");
  if(!panel) return;
  // Aggregate symptoms last 30 days
  const dayKeys = Object.keys(state.days).sort().slice(-60);
  const all = [];
  dayKeys.forEach(k => (state.days[k].symptoms || []).forEach(s => all.push({...s, date:k})));
  if(!all.length){
    panel.innerHTML = `No symptoms logged yet. Use the button above to add one — patterns surface in your insights as you log.`;
    return;
  }
  const counts = {};
  all.forEach(s => { counts[s.name] = (counts[s.name]||0) + 1; });
  const ranked = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const recent = all.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  panel.innerHTML = `
    <div class="sym-grid">
      <div>
        <div class="sym-h">Top symptoms · last 60 days</div>
        <div class="sym-bars">
          ${ranked.map(([name, n]) => `
            <div class="sym-bar">
              <div class="sym-bar-name">${escape(name)}</div>
              <div class="sym-bar-track"><span style="width:${Math.min(100, n/all.length*100)}%"></span></div>
              <div class="sym-bar-count">${n}×</div>
            </div>
          `).join("")}
        </div>
      </div>
      <div>
        <div class="sym-h">Recent</div>
        <ul class="sym-recent">
          ${recent.map(s => `
            <li>
              <span class="sym-r-name">${escape(s.name)} ${s.severity != null && s.severity !== "" ? `<span class="sev sev-${s.severity}">${s.severity}/5</span>` : ""}</span>
              <span class="sym-r-meta">${fmtDate(s.date)}${s.trigger?" · "+escape(s.trigger):""}${s.note?" · "+escape(s.note):""}</span>
              <button class="sym-r-del" data-del="${s.date}|${s.id}" title="Delete">×</button>
            </li>
          `).join("")}
        </ul>
      </div>
    </div>
  `;
  panel.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", () => {
    const [dk, id] = b.dataset.del.split("|");
    const arr = (state.days[dk] && state.days[dk].symptoms) || [];
    const idx = arr.findIndex(x => x.id === id);
    if(idx >= 0){ arr.splice(idx,1); save(); renderTrends(); }
  }));
}

// ---------- Symptom-aware insights ----------
function computeSymptomInsights(){
  const out = [];
  const dayKeys = Object.keys(state.days).sort();
  if(dayKeys.length < 14) return out;

  // Aggregate
  const allSymptoms = [];
  dayKeys.forEach(k => (state.days[k].symptoms || []).forEach(s => allSymptoms.push({...s, date:k})));
  if(allSymptoms.length < 3) return out;

  // Group by symptom name
  const byName = {};
  allSymptoms.forEach(s => { (byName[s.name] = byName[s.name] || []).push(s); });

  Object.entries(byName).forEach(([name, occurrences]) => {
    if(occurrences.length < 3) return;

    // Look at the day-of and prior day for triggers
    const symDays = new Set(occurrences.map(s => s.date));
    const otherDays = dayKeys.filter(k => !symDays.has(k));
    if(!otherDays.length) return;

    // Sleep correlation
    const sleepOnSym = occurrences.map(s => state.days[s.date].checkin && state.days[s.date].checkin.sleep).filter(v => v != null);
    const sleepOther = otherDays.map(k => state.days[k].checkin && state.days[k].checkin.sleep).filter(v => v != null);
    if(sleepOnSym.length >= 2 && sleepOther.length >= 3){
      const a = avg(sleepOnSym), b = avg(sleepOther);
      if(a < b - 0.7){
        out.push({
          icon:"sleep", tier:"watch",
          headline:`${name} appears after ${(b-a).toFixed(1)}h less sleep`,
          body:`Avg sleep before "${name}" days: ${a.toFixed(1)}h. Other days: ${b.toFixed(1)}h. Sleep looks like a real trigger here.`
        });
      }
    }

    // Water correlation
    const waterOnSym = occurrences.map(s => state.days[s.date].water || 0);
    const waterOther = otherDays.map(k => state.days[k].water || 0);
    const aw = avg(waterOnSym), bw = avg(waterOther);
    if(aw < bw - 12 && bw > 0){
      out.push({
        icon:"water", tier:"watch",
        headline:`${name} happens on low-water days`,
        body:`On "${name}" days you average ${Math.round(aw)} oz water vs ${Math.round(bw)} oz other days. Hydration is a likely factor.`
      });
    }

    // Self-reported triggers
    const triggers = occurrences.map(s => s.trigger).filter(Boolean);
    if(triggers.length >= 2){
      const counts = {};
      triggers.forEach(t => counts[t] = (counts[t]||0)+1);
      const [topTrigger, n] = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
      if(n >= 2){
        out.push({
          icon:"target", tier:"info",
          headline:`You've flagged "${topTrigger}" as the trigger for ${name} ${n}× now`,
          body:`That's the most common suspected trigger when this symptom shows up. Worth a small experiment: cut it for two weeks and see if frequency drops.`
        });
      }
    }

    // Cycle phase clustering
    const cycle = getCycleData();
    if(cycle.periods.length >= 2){
      const phaseCount = { menstrual:0, follicular:0, ovulation:0, luteal:0 };
      occurrences.forEach(s => {
        const ph = cyclePhaseFor(s.date);
        if(ph) phaseCount[ph]++;
      });
      const total = Object.values(phaseCount).reduce((a,b)=>a+b,0);
      if(total >= 3){
        const top = Object.entries(phaseCount).sort((a,b)=>b[1]-a[1])[0];
        if(top[1] / total > 0.55){
          out.push({
            icon:"cycle", tier:"info",
            headline:`${name} shows up most in your ${top[0]} phase`,
            body:`${Math.round(top[1]/total*100)}% of "${name}" entries fell in ${top[0]} phase. Hormones likely a factor.`
          });
        }
      }
    }

    // Seasonal pattern (sicknesses)
    if(name.toLowerCase().includes("sick") || name.toLowerCase().includes("cold") || name.toLowerCase().includes("flu")){
      const months = occurrences.map(s => parseInt(s.date.slice(5,7),10));
      const counts = {};
      months.forEach(m => counts[m] = (counts[m]||0)+1);
      const ranked = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
      if(ranked.length && ranked[0][1] >= 2){
        const monthName = new Date(2000, ranked[0][0]-1, 1).toLocaleDateString(undefined, {month:"long"});
        out.push({
          icon:"sick", tier:"info",
          headline:`${ranked[0][1]} sicknesses logged in ${monthName}`,
          body:`Your sick days cluster in this month. Plan extra immune support / sleep / vitamin D heading into it.`
        });
      }
    }
  });

  return out.slice(0, 6); // cap to keep insight list focused
}

// ---------- Smart banners (missed log, over-cal alert) ----------
// (superseded renderSmartBanners removed — reminders version below owns this)

// ---------- Hooks ----------
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function renderTrendsStep_RenderTrendsForSym(){
  renderSymptomPanel();
  // Append symptom-driven insights to the existing list
  const list = document.getElementById("insightsList");
  if(list){
    const extra = computeSymptomInsights();
    if(extra.length){
      const html = extra.map(i => `
        <div class="ins-card ins-${i.tier}">
          <div class="ins-icon">${insIcon(i.icon)}</div>
          <div class="ins-body">
            <div class="ins-headline">${escape(i.headline)}</div>
            <div class="ins-text">${escape(i.body)}</div>
          </div>
        </div>`).join("");
      list.insertAdjacentHTML("beforeend", html);
      const totalEl = document.getElementById("trCount");
      if(totalEl){
        const cur = parseInt(totalEl.textContent, 10) || 0;
        totalEl.textContent = (cur + extra.length) + " insight" + (cur + extra.length === 1 ? "" : "s");
      }
    }
  }
}

onReady(() => {
  const s = document.getElementById("trSymptomBtn");
  if(s) s.addEventListener("click", openSymptomModal);
});


// =================================================================
// AI FOOD PARSING — photo + text → macros, BYOK (Anthropic / OpenAI)
// =================================================================
function getAI(){ if(!state.ai) state.ai = { provider:"claude", key:null }; return state.ai; }

// ---- Settings UI ----
function renderAISetup(){
  const ai = getAI();
  const meta = document.getElementById("aiStatusMeta");
  if(meta) meta.textContent = ai.key ? `✓ ${ai.provider} configured` : "not configured";
  const p = document.getElementById("aiProvider"); if(p) p.value = ai.provider || "claude";
  const k = document.getElementById("aiKey"); if(k) k.value = ai.key ? "•".repeat(20) : "";
}

onReady(() => {
  const form = document.getElementById("aiSetupForm");
  if(form){
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const provider = document.getElementById("aiProvider").value;
      const keyVal = document.getElementById("aiKey").value.trim();
      if(!keyVal || keyVal.startsWith("•")){ toast("Paste a valid key","pink"); return; }
      state.ai = { provider, key: keyVal };
      save(); renderAISetup();
      toast("AI key saved","cyan");
    });
    const test = document.getElementById("aiTestBtn");
    if(test) test.addEventListener("click", async () => {
      const ai = getAI();
      if(!ai.key) { toast("Save a key first","pink"); return; }
      toast("Testing…","cyan");
      try {
        const r = await aiRequest("Reply with: OK", null);
        toast(r.includes("OK") ? "✓ AI working" : "Got: " + r.slice(0,40), "cyan");
      } catch(err){
        toast("Failed: " + err.message, "pink");
      }
    });
    const clear = document.getElementById("aiClearBtn");
    if(clear) clear.addEventListener("click", () => {
      if(!confirm("Remove AI key?")) return;
      state.ai = { provider:"claude", key:null };
      save(); renderAISetup();
      toast("Key removed","cyan");
    });
  }

  // (aiPhotoBtn/aiTextBtn removed — brain row covers photo/text entry)
});

// ---- API caller ----
async function aiRequest(prompt, imageBase64){
  const ai = getAI();
  if(!ai.key) throw new Error("No AI key — set up in Settings first");
  if(ai.provider === "openai") return openaiCall(prompt, imageBase64, ai.key);
  return claudeCall(prompt, imageBase64, ai.key);
}

// ---- Server-backed AI brain dump (no per-user key required) ----
// Calls /.netlify/functions/ai-parse, which uses the project owner's
// ANTHROPIC_API_KEY from Netlify env. If the function is missing or
// not configured, falls back to the user's BYOK key when available.
async function aiBrainDump(text, base64Images){
  // Try server-backed function first
  try {
    const res = await fetch("/.netlify/functions/ai-parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, images: base64Images || [] }),
    });
    if(res.ok){
      const j = await res.json();
      if(j && j.parsed) return j.parsed;
      if(j && j.error) throw new Error(j.error);
    } else if(res.status === 503){
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Server AI not configured");
    } else {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `AI server returned ${res.status}`);
    }
  } catch(serverErr){
    // Fall through to BYOK only if user has a key set
    if(!getAI().key) throw serverErr;
    // BYOK fallback — single image only
    const prompt = "Parse this brain dump (food, lifts, sessions, activity, water, weight) into the schema described. Return JSON only.";
    const result = await aiRequest(prompt + "\n\n" + text, (base64Images && base64Images[0]) || null);
    const cleaned = result.trim().replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,"");
    return JSON.parse(cleaned);
  }
}

async function claudeCall(prompt, imageBase64, key){
  const content = imageBase64
    ? [
        { type:"image", source:{ type:"base64", media_type:"image/jpeg", data:imageBase64 }},
        { type:"text", text:prompt }
      ]
    : prompt;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type":"application/json"
    },
    body: JSON.stringify({
      model:"claude-sonnet-4-5",
      max_tokens: 1024,
      messages:[{ role:"user", content }]
    })
  });
  const data = await res.json();
  if(data.error) throw new Error(data.error.message || "API error");
  return (data.content && data.content[0] && data.content[0].text) || "";
}

async function openaiCall(prompt, imageBase64, key){
  const content = imageBase64
    ? [
        { type:"text", text: prompt },
        { type:"image_url", image_url:{ url:`data:image/jpeg;base64,${imageBase64}` }}
      ]
    : [{ type:"text", text: prompt }];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method:"POST",
    headers:{
      "Authorization": `Bearer ${key}`,
      "content-type":"application/json"
    },
    body: JSON.stringify({
      model:"gpt-4o-mini",
      max_tokens: 1024,
      messages:[{ role:"user", content }]
    })
  });
  const data = await res.json();
  if(data.error) throw new Error(data.error.message || "API error");
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
}

// ---- Prompts ----
const FOOD_PROMPT = `You are a precise nutrition database. Identify the food(s) shown and estimate calories + macros for the actual portion visible (or described).

Respond with ONLY valid JSON in this exact shape (no markdown, no prose):
{
  "items": [
    { "name": "Food name", "serving": "portion description", "cal": 0, "p": 0, "c": 0, "f": 0, "fiber": 0, "sugar": 0, "confidence": 0.0 }
  ],
  "notes": "Optional uncertainty notes"
}

Rules:
- Return realistic numbers. Round cal to integers, macros to 0.1g.
- If multiple foods are shown/listed, return one entry per food.
- Confidence: 0.0 to 1.0 (your honest read on identification + portion accuracy).
- fiber + sugar are optional; include if you can estimate.`;

// ---- Image compression ----
function compressImage(file, maxDim){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL("image/jpeg", 0.85);
        resolve(dataUrl.split(",")[1]);
      };
      img.onerror = reject;
      img.src = r.result;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ---- AI key prompt (instead of auto-redirect, which feels like getting kicked out) ----
function openAIKeyPrompt(reason){
  openModal("AI not set up yet", `
    <p style="font-size:13px;color:#444;line-height:1.6;margin:0 0 10px">
      ${escape(reason || "Photo + text food logging needs an AI key.")}
      It's free to sign up, ~$0.005 per photo, and the key stays in this browser only.
    </p>
    <ol style="font-size:13px;color:#555;line-height:1.7;margin:0 0 10px;padding-left:18px">
      <li>Go to <a href="https://console.anthropic.com" target="_blank" rel="noopener" style="color:var(--cyan);font-weight:600">console.anthropic.com</a> (or <a href="https://platform.openai.com" target="_blank" rel="noopener" style="color:var(--cyan);font-weight:600">platform.openai.com</a>)</li>
      <li>Make an account, add a small budget cap ($5), create an API key</li>
      <li>Copy the key — paste it into Settings → AI Setup</li>
    </ol>
    <p style="font-size:12px;color:#888;line-height:1.5;margin:0 0 12px">
      Skip this and you can still log food with the Search / Quick log / Templates tabs — no key needed.
    </p>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Maybe later</button>
      <button class="btn btn-cyan" id="aiKeyGoSettings">Take me to AI Setup →</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const go = document.getElementById("aiKeyGoSettings");
    if(go) go.addEventListener("click", () => {
      closeModal();
      const t = document.querySelector('.tab[data-tab="settings"], .mtab[data-tab="settings"]');
      if(t) t.click();
      setTimeout(() => {
        const card = document.querySelector("#aiSetupForm");
        if(card) card.scrollIntoView({ behavior:"smooth", block:"center" });
        const k = document.getElementById("aiKey");
        if(k) k.focus();
      }, 200);
    });
  });
}

// ---- Photo modal ----
function openAIPhotoModal(){
  if(!getAI().key){
    openAIKeyPrompt("Snap a photo of food → AI estimates calories + macros.");
    return;
  }
  openModal("Snap or upload food photo", `
    <p style="font-size:12px;color:#666;margin:0">Upload a photo of your food. Claude/GPT analyzes it and fills in calories + macros. You'll review before saving.</p>
    <input id="aiPhotoFile" type="file" accept="image/*" capture="environment" style="display:none">
    <button id="aiPhotoPick" class="btn btn-cyan" style="width:100%;justify-content:center">Choose photo</button>
    <div id="aiPhotoPreview" style="display:none;margin-top:10px"></div>
    <div id="aiPhotoStatus" style="font-size:13px;color:#666;text-align:center;padding:14px"></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const file = document.getElementById("aiPhotoFile");
    const pick = document.getElementById("aiPhotoPick");
    const prev = document.getElementById("aiPhotoPreview");
    const status = document.getElementById("aiPhotoStatus");
    pick.addEventListener("click", () => file.click());
    file.addEventListener("change", async () => {
      if(!file.files[0]) return;
      status.textContent = "Compressing…";
      try {
        const b64 = await compressImage(file.files[0], 1024);
        prev.style.display = "block";
        prev.innerHTML = `<img src="data:image/jpeg;base64,${b64}" style="max-width:100%;border-radius:10px">`;
        status.textContent = "Analyzing with AI…";
        const text = await aiRequest(FOOD_PROMPT, b64);
        const parsed = parseAIResponse(text);
        closeModal();
        openConfirmModal(parsed);
      } catch(err){
        status.innerHTML = `<span style="color:var(--pink)">Failed: ${escape(err.message)}</span>`;
      }
    });
  });
}

// ---- Text modal ----
function openAITextModal(){
  if(!getAI().key){
    openAIKeyPrompt("Type what you ate in plain English → AI parses it into items.");
    return;
  }
  openModal("Type what you ate", `
    <p style="font-size:12px;color:#666;margin:0">Describe in plain English. Examples:<br>
      <i style="color:#888">• 2 scrambled eggs, oatmeal with blueberries, large coffee with cream</i><br>
      <i style="color:#888">• Chipotle bowl with double chicken, brown rice, fajita veg, mild salsa</i></p>
    <textarea id="aiTextInput" class="search-input" rows="4" style="resize:vertical;min-height:90px" placeholder="What did you eat?" autofocus></textarea>
    <div id="aiTextStatus" style="font-size:13px;color:#666;text-align:center;padding:8px"></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="aiTextGo">Parse</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("aiTextGo").addEventListener("click", async () => {
      const text = document.getElementById("aiTextInput").value.trim();
      if(!text){ toast("Type something","pink"); return; }
      const status = document.getElementById("aiTextStatus");
      status.textContent = "Parsing with AI…";
      try {
        const result = await aiRequest(FOOD_PROMPT + "\n\nUser ate: " + text, null);
        const parsed = parseAIResponse(result);
        closeModal();
        openConfirmModal(parsed);
      } catch(err){
        status.innerHTML = `<span style="color:var(--pink)">Failed: ${escape(err.message)}</span>`;
      }
    });
  });
}

function parseAIResponse(text){
  // Strip markdown code fences if present
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,"");
  let obj;
  try { obj = JSON.parse(t); }
  catch(e){
    const m = t.match(/\{[\s\S]*\}/);
    if(m) obj = JSON.parse(m[0]);
    else throw new Error("AI response was not valid JSON");
  }
  if(!obj.items || !Array.isArray(obj.items)) throw new Error("No items in AI response");
  return obj;
}

// ---- Confirm modal ----
function openConfirmModal(parsed){
  const itemsHtml = parsed.items.map((it, i) => `
    <div class="cf-item" data-i="${i}">
      <div class="cf-item-row">
        <input data-f="name" type="text" value="${escape(it.name||"")}" placeholder="name">
        <input data-f="serving" type="text" value="${escape(it.serving||"")}" placeholder="serving" style="max-width:120px">
        <button class="cf-item-del" title="Remove">×</button>
      </div>
      <div class="cf-item-grid">
        <label>kcal<input data-f="cal" type="number" value="${Math.round(it.cal||0)}"></label>
        <label>P (g)<input data-f="p" type="number" step="0.1" value="${(it.p||0).toFixed(1)}"></label>
        <label>C (g)<input data-f="c" type="number" step="0.1" value="${(it.c||0).toFixed(1)}"></label>
        <label>F (g)<input data-f="f" type="number" step="0.1" value="${(it.f||0).toFixed(1)}"></label>
      </div>
      ${it.confidence != null ? `<div class="cf-confidence">Confidence: ${Math.round(it.confidence*100)}%</div>` : ""}
    </div>
  `).join("");

  openModal("Confirm AI parsed items", `
    <p style="font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;font-weight:700;margin:0">Review + edit before logging. Pick a meal slot.</p>
    <div id="aiConfirmList">${itemsHtml}</div>
    ${parsed.notes ? `<p style="font-size:11px;color:#999;font-style:italic;margin:6px 0 0">AI note: ${escape(parsed.notes)}</p>` : ""}
    <div class="form-grid" style="margin-top:10px">
      <label><span>Add to meal</span>
        <select id="aiConfirmMeal">
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner" selected>Dinner</option>
          <option value="snacks">Snacks</option>
        </select>
      </label>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="aiConfirmSave">+ Add all</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    root.querySelectorAll(".cf-item-del").forEach(b => b.addEventListener("click", () => b.closest(".cf-item").remove()));
    document.getElementById("aiConfirmSave").addEventListener("click", () => {
      const meal = document.getElementById("aiConfirmMeal").value;
      const day = dayObj(currentDate);
      let added = 0;
      root.querySelectorAll(".cf-item").forEach(div => {
        const get = (k) => div.querySelector(`[data-f="${k}"]`).value;
        const item = {
          id: uid(),
          name: get("name").trim(),
          serving: get("serving").trim(),
          cal: parseFloat(get("cal")) || 0,
          p: parseFloat(get("p")) || 0,
          c: parseFloat(get("c")) || 0,
          f: parseFloat(get("f")) || 0,
        };
        if(item.name && item.cal > 0){
          day.meals[meal].push(item);
          added++;
        }
      });
      save(); closeModal(); renderAll();
      toast(`Added ${added} item${added===1?"":"s"} to ${meal}`, "cyan");
    });
  });
}


// =================================================================
// BRAIN DUMP — natural language + photos → fills everything
// =================================================================
let _brainImages = []; // base64 strings
function openBrainDumpModal(mode){
  _brainImages = [];
  openModal("Brain dump", `
    <p style="font-size:13px;color:#444;line-height:1.5;margin:0 0 8px">
      Type your day. Add a food photo or Apple Watch screenshot. AI parses it all
      and fills food + lifts + activity + water — you review before saving.
    </p>
    <p style="font-size:11px;color:#888;line-height:1.5;margin:0 0 10px">
      Example: <i>"2 eggs for breakfast, banana for snack, 50 min leg day —
      back squat 45×10, 89×6, 120×3, 135×1, then leg press same as squat but
      last set 175."</i>
    </p>
    <textarea id="bdText" rows="6" class="search-input" style="resize:vertical;min-height:120px;font-size:14px;width:100%" placeholder="What did you eat / lift / do today?" autofocus></textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <button type="button" class="btn btn-ghost btn-sm" id="bdAddPhoto">+ Add photo (food / watch)</button>
      <input type="file" id="bdFile" accept="image/*" multiple style="display:none">
    </div>
    <div id="bdThumbs" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div>
    <div id="bdStatus" style="font-size:12px;color:#666;text-align:center;padding:10px"></div>
    <div id="bdNote" class="bd-note"></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-ghost" id="bdNoteSave">SAVE HEALTH NOTE</button>
      <button class="btn btn-cyan" id="bdGo">Parse with AI</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const fileEl = document.getElementById("bdFile");
    const thumbs = document.getElementById("bdThumbs");
    const renderThumbs = () => {
      thumbs.innerHTML = _brainImages.map((b64, i) => `
        <div style="position:relative;width:60px;height:60px">
          <img src="data:image/jpeg;base64,${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;border:1px solid var(--navy-line)">
          <button type="button" data-rm="${i}" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--pink);color:#fff;border:none;font-size:12px;line-height:1;cursor:pointer">×</button>
        </div>
      `).join("");
      thumbs.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => {
        _brainImages.splice(parseInt(b.dataset.rm,10), 1);
        renderThumbs();
      }));
    };
    document.getElementById("bdAddPhoto").addEventListener("click", () => fileEl.click());
    fileEl.addEventListener("change", async () => {
      const files = Array.from(fileEl.files || []);
      for(const f of files){
        if(_brainImages.length >= 4){ toast("Max 4 photos","pink"); break; }
        try {
          const b64 = await compressImage(f, 1024);
          _brainImages.push(b64);
        } catch(e){}
      }
      fileEl.value = "";
      renderThumbs();
    });
    // Entry modes from the one-line brain row
    if(mode === "photo"){
      setTimeout(() => fileEl.click(), 250);
    } else if(mode === "speak"){
      const ta = document.getElementById("bdText");
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if(SR){
        try {
          const rec = new SR();
          rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
          let base = "";
          rec.onresult = (ev) => {
            let interim = "";
            for(let i = ev.resultIndex; i < ev.results.length; i++){
              if(ev.results[i].isFinal) base += ev.results[i][0].transcript + " ";
              else interim += ev.results[i][0].transcript;
            }
            ta.value = (base + interim).trim();
          };
          rec.onerror = () => { ta.focus(); };
          rec.start();
          const status = document.getElementById("bdStatus");
          if(status) status.innerHTML = '<span style="color:var(--iron-volt)">Listening — just talk. Tap Parse when done.</span>';
          // stop dictation when modal closes or parse starts
          const stopRec = () => { try{ rec.stop(); }catch(e){} };
          document.getElementById("bdGo").addEventListener("click", stopRec, { once:true });
          document.querySelector("#modal [data-close]").addEventListener("click", stopRec, { once:true });
        } catch(e){ ta.focus(); }
      } else {
        // iOS Safari: no Web Speech — focus the box so the keyboard mic works
        ta.focus();
        const status = document.getElementById("bdStatus");
        if(status) status.innerHTML = '<span style="color:var(--iron-mute)">Tap the mic on your keyboard and just talk.</span>';
      }
    }
    // Local health-note pass — runs on every keystroke, needs no AI.
    const bdTa = document.getElementById("bdText");
    const bdNote = document.getElementById("bdNote");
    const bdRefreshNote = () => {
      const n = parseHealthNote(bdTa.value);
      if(!_noteHasAnything(n)){ bdNote.innerHTML = ""; return; }
      const bits = [];
      if(n.sleep != null) bits.push(`<span class="hn-chip">sleep ${n.sleep}h</span>`);
      if(n.water != null) bits.push(`<span class="hn-chip">water ${n.water}</span>`);
      n.symptoms.forEach(x => bits.push(`<span class="hn-chip sym">${escape(x)}</span>`));
      n.exposures.forEach(e => bits.push(`<span class="hn-chip exp">${escape(e.label)}</span>`));
      bdNote.innerHTML = `<div class="hn-h">Health note found — savable without AI</div><div class="hn-chips">${bits.join("")}</div>`;
    };
    bdTa.addEventListener("input", bdRefreshNote);
    document.getElementById("bdNoteSave").addEventListener("click", () => {
      const n = parseHealthNote(bdTa.value);
      if(!n.raw){ toast("Type something first", "pink"); return; }
      const applied = applyHealthNote(currentDate, n);
      closeModal(); renderAll();
      toast(applied.length ? `Logged: ${applied.slice(0,3).join(", ")}` : "Note saved", "cyan");
    });

    document.getElementById("bdGo").addEventListener("click", async () => {
      const text = document.getElementById("bdText").value.trim();
      if(!text && _brainImages.length === 0){ toast("Type something or add a photo","pink"); return; }
      const status = document.getElementById("bdStatus");
      status.innerHTML = `<span style="color:var(--cyan)">Parsing… (10–20 sec)</span>`;
      document.getElementById("bdGo").disabled = true;
      try {
        const parsed = await aiBrainDump(text, _brainImages);
        const hn = parseHealthNote(text);
        if(_noteHasAnything(hn)) applyHealthNote(currentDate, hn);
        closeModal();
        openBrainDumpReview(parsed);
      } catch(err){
        status.innerHTML = `<span style="color:var(--pink)">${escape(err.message || "Parse failed")}</span>`;
        document.getElementById("bdGo").disabled = false;
      }
    });
  });
}

function _bdCountSummary(parsed){
  const meals = parsed.meals || {};
  const mealCount = ["breakfast","lunch","dinner","snacks"].reduce((n, m) => n + ((meals[m]||[]).length), 0);
  const sessions = (parsed.sessions || []).length;
  const liftSets = (parsed.sessions || []).reduce((n, s) => n + (s.lifts || []).reduce((m, l) => m + (l.sets || []).length, 0), 0);
  const a = parsed.activity || {};
  const hasActivity = (a.move || a.exercise || a.stand) ? `Move ${a.move||0} · Ex ${a.exercise||0}m · Stand ${a.stand||0}h` : "—";
  const water = parsed.water_oz || 0;
  const wt = parsed.weight_lb || null;
  return { mealCount, sessions, liftSets, hasActivity, water, wt };
}

function openBrainDumpReview(parsed){
  const meals = parsed.meals || {};
  const sum = _bdCountSummary(parsed);
  const renderMeal = (slot) => {
    const items = meals[slot] || [];
    if(!items.length) return "";
    return `<div class="bd-section">
      <div class="bd-section-h">${capitalize(slot)} · ${items.length} item${items.length===1?"":"s"}</div>
      ${items.map((it,i) => `
        <label class="bd-item">
          <input type="checkbox" data-meal="${slot}" data-i="${i}" checked>
          <div>
            <div class="bd-item-name">${escape(it.name||"unknown")}</div>
            <div class="bd-item-meta">${escape(it.serving||"")} · ${Math.round(it.cal||0)} cal · P${(it.p||0).toFixed(1)} C${(it.c||0).toFixed(1)} F${(it.f||0).toFixed(1)}</div>
          </div>
        </label>
      `).join("")}
    </div>`;
  };
  const renderSessions = () => {
    const sess = parsed.sessions || [];
    if(!sess.length) return "";
    return `<div class="bd-section">
      <div class="bd-section-h">Sessions · ${sess.length}</div>
      ${sess.map((s,i) => `
        <label class="bd-item">
          <input type="checkbox" data-session="${i}" checked>
          <div>
            <div class="bd-item-name">${escape(s.name||"Session")} · ${escape(s.type||"")} · ${s.duration_min||0} min</div>
            ${(s.lifts||[]).map(l => `
              <div class="bd-item-meta">→ ${escape(l.exercise||"lift")}: ${(l.sets||[]).map(st => `${st.weight}×${st.reps}`).join(", ")}</div>
            `).join("")}
          </div>
        </label>
      `).join("")}
    </div>`;
  };
  const renderActivity = () => {
    const a = parsed.activity || {};
    if(!(a.move || a.exercise || a.stand)) return "";
    return `<div class="bd-section">
      <div class="bd-section-h">Apple Watch / activity</div>
      <label class="bd-item">
        <input type="checkbox" data-activity="1" checked>
        <div><div class="bd-item-name">${sum.hasActivity}</div></div>
      </label>
    </div>`;
  };
  const renderWater = () => {
    if(!sum.water) return "";
    return `<div class="bd-section">
      <div class="bd-section-h">Water</div>
      <label class="bd-item">
        <input type="checkbox" data-water="1" checked>
        <div><div class="bd-item-name">+ ${sum.water} oz</div></div>
      </label>
    </div>`;
  };
  const renderWeight = () => {
    if(!sum.wt) return "";
    return `<div class="bd-section">
      <div class="bd-section-h">Weigh-in</div>
      <label class="bd-item">
        <input type="checkbox" data-weight="1" checked>
        <div><div class="bd-item-name">${sum.wt} lb</div></div>
      </label>
    </div>`;
  };

  openModal("Review + apply", `
    <p style="font-size:12px;color:#666;line-height:1.5;margin:0 0 10px">
      Uncheck anything you don't want logged. AI is sometimes wrong on numbers — eyeball before saving.
    </p>
    ${renderMeal("breakfast")}
    ${renderMeal("lunch")}
    ${renderMeal("dinner")}
    ${renderMeal("snacks")}
    ${renderSessions()}
    ${renderActivity()}
    ${renderWater()}
    ${renderWeight()}
    ${parsed.notes ? `<p style="font-size:11px;color:#888;font-style:italic;margin:8px 0 0">AI note: ${escape(parsed.notes)}</p>` : ""}
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="bdApply">Apply checked items</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("bdApply").addEventListener("click", () => {
      const day = dayObj(currentDate);
      let added = 0;
      // Meals
      ["breakfast","lunch","dinner","snacks"].forEach(slot => {
        (meals[slot] || []).forEach((it, i) => {
          const cb = root.querySelector(`[data-meal="${slot}"][data-i="${i}"]`);
          if(cb && cb.checked && it.name){
            day.meals[slot].push({
              id: uid(), name: it.name, serving: it.serving || "",
              cal: Math.round(it.cal||0), p: (+it.p||0), c: (+it.c||0), f: (+it.f||0),
            });
            if(typeof _trackRecent === "function") _trackRecent({name:it.name, serving:it.serving, cal:it.cal, p:it.p, c:it.c, f:it.f});
            added++;
          }
        });
      });
      // Sessions
      (parsed.sessions || []).forEach((s, i) => {
        const cb = root.querySelector(`[data-session="${i}"]`);
        if(cb && cb.checked){
          if(!day.sessions) day.sessions = [];
          if((s.lifts || []).length === 0){
            day.sessions.push({
              id: uid(), name: s.name || "Session", lift: s.name || "Session",
              weight: 0, reps: 0, sets: 1,
              type: s.type || "wod",
              durationMin: s.duration_min || null,
              notes: `Brain dump · ${s.duration_min || 0} min`,
            });
            added++;
          } else {
            (s.lifts || []).forEach(l => {
              (l.sets || []).forEach(st => {
                day.sessions.push({
                  id: uid(), name: l.exercise || s.name || "Lift", lift: l.exercise || "Lift",
                  weight: +st.weight || 0, reps: +st.reps || 0, sets: 1,
                  type: "lift",
                  notes: s.name ? `Brain dump · ${s.name}` : "Brain dump",
                });
                added++;
              });
            });
          }
        }
      });
      // Activity
      const aCb = root.querySelector(`[data-activity="1"]`);
      if(aCb && aCb.checked){
        const a = parsed.activity || {};
        day.activity = {
          move: +a.move || 0,
          exercise: +a.exercise || 0,
          stand: +a.stand || 0,
          manual: true,
        };
        added++;
      }
      // Water
      const wCb = root.querySelector(`[data-water="1"]`);
      if(wCb && wCb.checked && sum.water > 0){
        day.water = (day.water || 0) + sum.water;
        added++;
      }
      // Weight
      const wgCb = root.querySelector(`[data-weight="1"]`);
      if(wgCb && wgCb.checked && sum.wt){
        if(!state.weights) state.weights = [];
        state.weights.push({ date: currentDate, val: +sum.wt });
        added++;
      }
      save(); closeModal(); renderAll();
      toast(`Logged ${added} item${added===1?"":"s"} from brain dump`, "cyan");
    });
  });
}

onReady(() => {
  // Brain rows exist on every page — delegate by class
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".js-brain");
    if(b) openBrainDumpModal(b.dataset.bmode || undefined);
  });
});


// =================================================================
// USABILITY — Floating Action Button + tappable cards + help banner
// =================================================================
function openFAB(){
  const sheet = document.getElementById("fabSheet");
  if(sheet) sheet.classList.add("open");
}
function closeFAB(){
  const sheet = document.getElementById("fabSheet");
  if(sheet) sheet.classList.remove("open");
}
function jumpToTab(tab){
  const t = document.querySelector(`.tab[data-tab="${tab}"], .mtab[data-tab="${tab}"]`);
  if(t) t.click();
}

onReady(() => {
  const fab = document.getElementById("fab");
  if(fab) fab.addEventListener("click", openFAB);
  document.querySelectorAll("[data-fab-close]").forEach(b => b.addEventListener("click", closeFAB));

  document.querySelectorAll("[data-fab]").forEach(b => b.addEventListener("click", () => {
    const action = b.dataset.fab;
    closeFAB();
    setTimeout(() => {
      switch(action){
        case "food":
          jumpToTab("nutrition");
          setTimeout(() => {
            const h = new Date().getHours();
            const meal = h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 18 ? "snacks" : "dinner";
            openFoodModal(meal);
          }, 200);
          break;
        case "photo":
          if(typeof openAIPhotoModal === "function") openAIPhotoModal();
          break;
        case "text":
          if(typeof openAITextModal === "function") openAITextModal();
          break;
        case "water":
          if(typeof addWater === "function"){ addWater(8); toast("+ 8 oz water","cyan"); }
          break;
        case "workout":
          if(typeof openLiftModal === "function") openLiftModal();
          else jumpToTab("fitness");
          break;
        case "weigh":
          if(typeof openWeighInModal === "function") openWeighInModal();
          else jumpToTab("body");
          break;
        case "checkin":
          if(typeof openCheckinModal === "function") openCheckinModal();
          break;
        case "symptom":
          if(typeof openSymptomModal === "function") openSymptomModal();
          break;
      }
    }, 150);
  }));

  // Tappable Activity Rings card on dashboard
  const ringsCanvas = document.getElementById("rings3");
  if(ringsCanvas){
    const card = ringsCanvas.closest(".card");
    if(card){
      card.style.cursor = "pointer";
      card.title = "Tap to log calories burned, exercise minutes, stand hours";
      card.addEventListener("click", (e) => {
        if(e.target.closest("button,a,input,select,textarea")) return;
        if(typeof openActivityLogModal === "function") openActivityLogModal();
      });
    }
  }
  // Tappable Calorie Ring card -> jump to Nutrition
  const calRing = document.getElementById("calRing");
  if(calRing){
    const card = calRing.closest(".card");
    if(card){
      card.style.cursor = "pointer";
      card.title = "Tap to open the food log";
      card.addEventListener("click", (e) => {
        if(e.target.closest("button,a,input,select,textarea")) return;
        jumpToTab("nutrition");
      });
    }
  }
  // Tappable WOD card -> jump to Fitness
  const wodCard = document.getElementById("wodScript") && document.getElementById("wodScript").closest(".card");
  if(wodCard){
    wodCard.style.cursor = "pointer";
    wodCard.addEventListener("click", (e) => {
      if(e.target.closest("button,a,input,select,textarea")) return;
      jumpToTab("fitness");
    });
  }
  // Tappable weight stat card -> jump to Body
  document.querySelectorAll('[data-go]').forEach(card => {
    // already wired
  });


  // Escape closes FAB
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeFAB(); });
});

// Hint markers on initial views (subtle)



// =================================================================
// CATEGORIZED LIFTS (SugarWOD-style) + per-rep PRs + percentages
// =================================================================
const LIFT_CATEGORIES = [
  { name:"Squats", lifts:[
    "Back Squat","Box Squat","Front Box Squat","Front Pause Squat",
    "Front Squat","High Bar Back Squat","Low Bar Back Squat",
    "Overhead Squat","Pause Squat","Split Squat","Zercher Squat"
  ]},
  { name:"Deadlifts", lifts:[
    "Deadlift","Sumo Deadlift","Romanian Deadlift","Stiff-leg Deadlift",
    "Trap-bar Deadlift","Deficit Deadlift"
  ]},
  { name:"Cleans", lifts:[
    "Clean","Power Clean","Hang Clean","Hang Power Clean","Squat Clean",
    "Clean Pull","Clean Extension","Block Clean"
  ]},
  { name:"Snatches", lifts:[
    "Snatch","Power Snatch","Hang Snatch","Hang Power Snatch","Squat Snatch",
    "Snatch Pull","Snatch Balance","Block Snatch"
  ]},
  { name:"Press", lifts:[
    "Strict Press","Push Press","Push Jerk","Split Jerk","Bench Press",
    "Incline Bench Press","Close-grip Bench","DB Bench","DB Press"
  ]},
  { name:"Pull", lifts:[
    "Pull-up","Strict Pull-up","Weighted Pull-up","Chin-up","Chest-to-Bar",
    "Muscle-up","Bent Row","Pendlay Row"
  ]},
  { name:"Other", lifts:[
    "Thruster","Hip Thrust","Good Morning","Clean & Jerk","Floor Press"
  ]}
];

const REP_RANGES = [1, 2, 3, 5];

function getRepPRs(){ if(!state.prsRep) state.prsRep = {}; return state.prsRep; }
function get1RM(lift){
  const r = getRepPRs()[lift];
  if(r && r["1"]) return r["1"];
  // fallback: estimate from any logged sets
  let best = null;
  Object.entries(state.days).forEach(([k, d]) => {
    (d.sessions||[]).forEach(s => {
      if(s.name === lift){
        const est = Math.round(s.weight * (1 + s.reps/30));
        if(!best || est > best.val) best = { val: est, date: k, est: true };
      }
    });
  });
  return best;
}

function renderLiftsList(){
  const root = document.getElementById("liftsContent");
  if(!root) return;
  const eyebrow = document.getElementById("liftsCardEyebrow");
  if(eyebrow) eyebrow.textContent = "Lifts · personal records";

  const html = LIFT_CATEGORIES.map(cat => {
    const items = cat.lifts.map(lift => {
      const pr = get1RM(lift);
      const valDisplay = pr ? `${pr.val}${unit()}${pr.est?" (est.)":""}` : "";
      return `<li class="lift-row" data-lift="${escape(lift)}">
        <span class="lift-name">${escape(lift)}</span>
        <span class="lift-val">${valDisplay}</span>
        <span class="lift-arrow">›</span>
      </li>`;
    }).join("");
    return `<div class="lift-cat">
      <div class="lift-cat-h">${cat.name}</div>
      <ul class="lift-list">${items}</ul>
    </div>`;
  }).join("");
  root.innerHTML = `<div class="lifts-scroll">${html}</div>`;
  root.querySelectorAll(".lift-row").forEach(li => li.addEventListener("click", () => {
    openLiftDetail(li.dataset.lift);
  }));
}

function openLiftDetailBase(lift){
  const root = document.getElementById("liftsContent");
  const eyebrow = document.getElementById("liftsCardEyebrow");
  if(!root) return;
  if(eyebrow) eyebrow.innerHTML = `<button class="lift-back" id="liftBack">‹ Back</button> ${escape(lift)}`;

  const prs = getRepPRs()[lift] || {};
  const cards = REP_RANGES.map(r => {
    const v = prs[String(r)];
    return `<div class="rep-card ${v?"":"rep-empty"}">
      <div class="rep-val">${v ? v.val : "--"}</div>
      <div class="rep-lbl">${r} REP MAX</div>
      ${v ? `<div class="rep-date">${fmtDate(v.date)}</div>` : ""}
    </div>`;
  }).join("");

  // Build percentages — based on 1RM if available
  const oneRM = (prs["1"] && prs["1"].val) || (get1RM(lift) || {}).val || null;
  const pcts = [105, 100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45, 40, 35, 30];

  const pctTabsHtml = REP_RANGES.map((r,i) => `<button class="pct-tab ${i===0?"on":""}" data-pct="${r}">${r} REP</button>`).join("");
  const pctGrid = pcts.map(p => {
    const w = oneRM ? Math.round(oneRM * p / 100) : "--";
    return `<div class="pct-cell"><div class="pct-w">${w}</div><div class="pct-p">${p}%</div></div>`;
  }).join("");

  // History — all sets logged for this lift
  const history = [];
  Object.entries(state.days).forEach(([k, d]) => {
    (d.sessions||[]).forEach(s => {
      if(s.name === lift) history.push({...s, date:k});
    });
  });
  history.sort((a,b)=>b.date.localeCompare(a.date));
  const histHtml = history.length
    ? history.slice(0,20).map(h => `
        <li class="lift-hist-row">
          <span class="lh-w">${h.weight}${unit()} × ${h.reps}${h.sets>1?" × "+h.sets:""}</span>
          <span class="lh-d">${fmtDate(h.date)}</span>
          ${h.notes ? `<span class="lh-n">${escape(h.notes)}</span>` : ""}
        </li>`).join("")
    : `<li class="lift-hist-empty">No history available.</li>`;

  root.innerHTML = `
    <div class="lift-detail">
      <div class="lift-d-actions">
        <button class="btn btn-cyan btn-sm" id="liftEditPRs">✎ Edit PRs</button>
        <button class="btn btn-lime btn-sm" id="liftLogSet">+ Log Lift</button>
      </div>
      <div class="rep-grid">${cards}</div>

      <div class="pct-section">
        <div class="lift-section-h">Percentages</div>
        <div class="pct-tabs">${pctTabsHtml}</div>
        <div class="pct-grid">${pctGrid}</div>
      </div>

      <div class="lift-hist">
        <div class="lift-section-h">History</div>
        <ul class="lift-hist-list">${histHtml}</ul>
      </div>
    </div>
  `;

  document.getElementById("liftBack").addEventListener("click", renderLiftsList);
  document.getElementById("liftEditPRs").addEventListener("click", () => openEditPRsModal(lift));
  document.getElementById("liftLogSet").addEventListener("click", () => {
    if(typeof openLiftModal === "function"){
      openLiftModal();
      // Pre-fill the lift name
      setTimeout(() => {
        const ln = document.getElementById("liftName");
        if(ln) ln.value = lift;
      }, 100);
    }
  });
  // Tab switching for percentages
  document.querySelectorAll(".pct-tab").forEach(t => t.addEventListener("click", () => {
    document.querySelectorAll(".pct-tab").forEach(x => x.classList.toggle("on", x===t));
    const r = t.dataset.pct;
    const base = (prs[r] && prs[r].val) || oneRM;
    const cells = document.querySelectorAll(".pct-cell .pct-w");
    pcts.forEach((p,i) => {
      cells[i].textContent = base ? Math.round(base * p / 100) : "--";
    });
  }));
}

function openEditPRsModal(lift){
  const prs = getRepPRs()[lift] || {};
  openModal(lift + " · Edit PRs", `
    <p style="font-size:12px;color:#666;margin:0 0 8px">Enter your current best for each rep range. Auto-updates when you log sets.</p>
    <div class="edit-pr-grid">
      ${REP_RANGES.map(r => `
        <div class="edit-pr-row">
          <label><input id="pr_${r}" type="number" step="0.5" min="0" value="${prs[String(r)] ? prs[String(r)].val : ""}" placeholder="--"> <span>${r} REP MAX (${unit()})</span></label>
        </div>
      `).join("")}
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="prSaveAll">Save</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("prSaveAll").addEventListener("click", () => {
      const all = getRepPRs();
      if(!all[lift]) all[lift] = {};
      REP_RANGES.forEach(r => {
        const v = parseFloat(document.getElementById("pr_"+r).value);
        if(!isNaN(v) && v > 0){
          all[lift][String(r)] = { val: v, date: todayKey() };
        } else {
          delete all[lift][String(r)];
        }
      });
      // Mirror 1RM into legacy state.prs for backward-compat
      if(all[lift]["1"]) state.prs[lift] = { val: all[lift]["1"].val, date: all[lift]["1"].date, unit: unit() };
      save(); closeModal();
      openLiftDetail(lift);
      toast("PRs saved","cyan");
    });
  });
}

// Auto-update per-rep PRs when a set is logged
function updateRepPRsFromSet(set){
  const all = getRepPRs();
  if(!all[set.name]) all[set.name] = {};
  REP_RANGES.forEach(r => {
    if(set.reps >= r){
      const cur = all[set.name][String(r)];
      if(!cur || set.weight > cur.val){
        all[set.name][String(r)] = { val: set.weight, date: todayKey() };
        toast(`PR! ${set.name} ${r}RM = ${set.weight}${unit()}`, "cyan");
      }
    }
  });
  save();
}

// Hook into existing fitness render to use new lift list

// =================================================================
// PLAN — Weekly workout planner
// =================================================================
const WORKOUT_TYPES = [
  // Body parts
  "Legs", "Upper Body", "Lower Body", "Push", "Pull", "Full Body",
  "Arms", "Shoulders", "Back", "Chest", "Glutes", "Core",
  // Activities
  "CrossFit / WOD", "Olympic Lifting", "Powerlifting",
  "Running", "Cycling", "Swimming", "Rowing",
  "Pilates", "Yoga", "Barre", "HIIT",
  // Recovery
  "Mobility", "Stretching", "Active Recovery", "Rest day"
];

function getPlan(){ if(!state.plan) state.plan = {}; return state.plan; }
function weekKey(date){
  // ISO week key: YYYY-W##
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay()||7)); // Thursday of week
  const y0 = new Date(d.getFullYear(),0,1);
  const w = Math.ceil(((d - y0) / 86400000 + 1)/7);
  return `${d.getFullYear()}-W${String(w).padStart(2,"0")}`;
}
function weekStart(date){
  // Sunday-start (user preference — applies to every week strip/list)
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// 12-hour time for display ("05:30" -> "5:30 AM"); inputs stay type=time
function fmtTime12(hm){
  if(!hm || typeof hm !== "string" || !hm.includes(":")) return hm || "";
  const [h, m] = hm.split(":").map(n => parseInt(n, 10));
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}


// =================================================================
// PWA — Service worker registration + install-to-home-screen helper
// =================================================================
if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/tracker/sw.js").catch(() => {});
  });
}

// Capture install prompt (Android Chrome) for in-app install button
let _deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  const btn = document.getElementById("pwaInstallBtn");
  if(btn) btn.style.display = "inline-flex";
});

// iOS detection (no beforeinstallprompt support)
function isIOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

onReady(() => {
  const btn = document.getElementById("pwaInstallBtn");
  if(!btn) return;
  if(isStandalone()){ btn.style.display = "none"; return; }
  // Always show the button (will give iOS instructions on tap)
  btn.style.display = "inline-flex";
  btn.addEventListener("click", async () => {
    if(_deferredInstallPrompt){
      _deferredInstallPrompt.prompt();
      const { outcome } = await _deferredInstallPrompt.userChoice;
      if(outcome === "accepted") toast("Installed! Find icon on home screen","cyan");
      _deferredInstallPrompt = null;
      return;
    }
    if(isIOS()){
      openModal("Install BERMO Tracker", `
        <p style="font-size:13px;line-height:1.7;color:#444">On iPhone Safari:</p>
        <ol style="font-size:13px;line-height:1.8;color:#444;padding-left:18px;margin:8px 0">
          <li>Tap the <b>Share</b> button (square with arrow up) at the bottom of Safari</li>
          <li>Scroll and tap <b>Add to Home Screen</b></li>
          <li>Tap <b>Add</b> in the top right</li>
        </ol>
        <p style="font-size:12px;color:#888;margin:6px 0 0">The tracker will install with its own icon and launch full-screen, no browser bar.</p>
        <div class="modal-foot"><button class="btn btn-cyan" data-close>Got it</button></div>
      `, (root) => {
        root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
      });
      return;
    }
    openModal("Install BERMO Tracker", `
      <p style="font-size:13px;line-height:1.7;color:#444">Look for an <b>Install</b> icon in your browser address bar (Chrome / Edge / Brave / Samsung) or use the browser menu → "Install app" / "Add to home screen".</p>
      <div class="modal-foot"><button class="btn btn-cyan" data-close>OK</button></div>
    `, (root) => {
      root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    });
  });
});


// =================================================================
// DETAIL OVERLAY — drill-down for dashboard cards (D/W/M/90D/Y)
// =================================================================
let detailMetric = "calories";
let detailScale = "7d";
let _detailChart = null;

const METRICS = {
  calories: {
    eyebrow: "Calories",
    title: "Calories Eaten",
    color: "#c8f500",
    unitLbl: "kcal",
    valueFor: (k) => totalsFor(k).cal,
    goalFor: () => state.goals.cal,
    todaySub: () => `${totalsFor(todayKey()).cal} of ${state.goals.cal} kcal goal`,
  },
  protein: {
    eyebrow: "Protein", title: "Protein Intake", color: "#00f5d4", unitLbl: "g",
    valueFor: (k) => totalsFor(k).p, goalFor: () => state.goals.protein,
    todaySub: () => `${totalsFor(todayKey()).p}g of ${state.goals.protein}g goal`,
  },
  carbs: {
    eyebrow: "Carbs", title: "Carbohydrates", color: "#a8f000", unitLbl: "g",
    valueFor: (k) => totalsFor(k).c, goalFor: () => state.goals.carbs,
    todaySub: () => `${totalsFor(todayKey()).c}g of ${state.goals.carbs}g goal`,
  },
  fat: {
    eyebrow: "Fat", title: "Fat Intake", color: "#ff4d9d", unitLbl: "g",
    valueFor: (k) => totalsFor(k).f, goalFor: () => state.goals.fat,
    todaySub: () => `${totalsFor(todayKey()).f}g of ${state.goals.fat}g goal`,
  },
  water: {
    eyebrow: "Water", title: "Water Intake", color: "#7cd9f1", unitLbl: "oz",
    valueFor: (k) => (state.days[k] && state.days[k].water) || 0,
    goalFor: () => state.goals.water,
    todaySub: () => `${(state.days[todayKey()]||{}).water||0} of ${state.goals.water} oz goal`,
  },
  move: {
    eyebrow: "Activity · Move", title: "Calories Burned", color: "#ff2d56", unitLbl: "cal",
    valueFor: (k) => (state.days[k] && state.days[k].activity && state.days[k].activity.move) || 0,
    goalFor: () => (state.activityGoals && state.activityGoals.move) || 800,
    todaySub: () => `${Math.round((dayObj(todayKey()).activity||{move:0}).move)} of ${(state.activityGoals||{move:800}).move} cal`,
  },
  exercise: {
    eyebrow: "Activity · Exercise", title: "Exercise Minutes", color: "#a8f000", unitLbl: "min",
    valueFor: (k) => (state.days[k] && state.days[k].activity && state.days[k].activity.exercise) || 0,
    goalFor: () => (state.activityGoals && state.activityGoals.exercise) || 60,
    todaySub: () => `${Math.round((dayObj(todayKey()).activity||{exercise:0}).exercise)} of ${(state.activityGoals||{exercise:60}).exercise} min`,
  },
  stand: {
    eyebrow: "Activity · Stand", title: "Stand Hours", color: "#00f5d4", unitLbl: "hrs",
    valueFor: (k) => (state.days[k] && state.days[k].activity && state.days[k].activity.stand) || 0,
    goalFor: () => (state.activityGoals && state.activityGoals.stand) || 16,
    todaySub: () => `${Math.round((dayObj(todayKey()).activity||{stand:0}).stand)} of ${(state.activityGoals||{stand:16}).stand} hrs`,
  },
  weight: {
    eyebrow: "Body weight", title: "Weight Trend", color: "#00f5d4", unitLbl: () => unit(),
    valueFor: (k) => {
      // Find last weight on or before this date
      const ws = state.weights || [];
      let last = null;
      ws.forEach(w => { if(w.date <= k && (!last || w.date > last.date)) last = w; });
      return last ? last.val : null;
    },
    goalFor: () => state.goals.weight || 0,
    todaySub: () => {
      const ws = state.weights || [];
      const last = ws[ws.length-1];
      return last ? `${last.val} ${unit()} as of ${fmtDate(last.date)}` : "No weigh-in yet";
    },
  },
  sleep: {
    eyebrow: "Sleep", title: "Sleep Hours", color: "#a78bfa", unitLbl: "hrs",
    valueFor: (k) => (state.days[k] && state.days[k].checkin && state.days[k].checkin.sleep) || null,
    goalFor: () => 7,
    todaySub: () => {
      const c = (state.days[todayKey()]||{}).checkin;
      return c && c.sleep ? `${c.sleep} hrs last night` : "No sleep logged";
    },
  },
};

function openDetail(metric){
  detailRefDate = new Date();   // always open on today
  detailMetric = metric;
  detailScale = "7d";
  document.getElementById("detailOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  document.querySelectorAll(".ds-btn").forEach(b => b.classList.toggle("on", b.dataset.scale === "7d"));
  // Re-label the inline + Log button per metric so the user knows what it does
  const logBtn = document.getElementById("detailLogBtn");
  if(logBtn){
    const map = {
      move: "+ Log activity",
      exercise: "+ Log activity",
      stand: "+ Log activity",
      nutrition: "+ Log food",
      water: "+ Log water",
      weight: "+ Weigh in",
      sleep: "+ Check-in",
      hr: "+ Check-in",
    };
    logBtn.textContent = map[metric] || "+ Log";
  }
  renderDetailView();
}
function _detailLogAction(){
  const m = detailMetric;
  if(m === "move" || m === "exercise" || m === "stand"){
    if(typeof openActivityLogModal === "function") openActivityLogModal();
  } else if(m === "nutrition"){
    const h = new Date().getHours();
    const meal = h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 18 ? "snacks" : "dinner";
    if(typeof openFoodModal === "function") openFoodModal(meal);
  } else if(m === "water"){
    if(typeof addWater === "function"){ addWater(8); toast("+8 oz water","cyan"); renderAll(); }
  } else if(m === "weight"){
    if(typeof openWeighInModal === "function") openWeighInModal();
  } else if(typeof openCheckinModal === "function"){
    openCheckinModal();
  }
}
onReady(() => {
  const logBtn = document.getElementById("detailLogBtn");
  if(logBtn) logBtn.addEventListener("click", _detailLogAction);
});
function closeDetail(){
  document.getElementById("detailOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

function scaleDays(scale){
  return scale === "1d" ? 1 : scale === "7d" ? 7 : scale === "30d" ? 30 : scale === "90d" ? 90 : 365;
}

function collectSeries(metric, scale){
  const m = METRICS[metric];
  const n = scaleDays(scale);
  const series = [];
  for(let i = n-1; i >= 0; i--){
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = todayKey(d);
    series.push({ date:k, val: m.valueFor(k) });
  }
  return series;
}

function renderDetailViewBase(){
  const m = METRICS[detailMetric];
  if(!m) return;
  document.getElementById("detailEyebrow").textContent = m.eyebrow;
  document.getElementById("detailTitle").textContent = m.title;

  const today = m.valueFor(todayKey());
  const unitStr = typeof m.unitLbl === "function" ? m.unitLbl() : m.unitLbl;
  document.getElementById("dcNum").innerHTML = `${today != null && today !== 0 ? Math.round(today*10)/10 : (today === 0 ? "0" : "—")}<i>${unitStr}</i>`;
  document.getElementById("dcSub").textContent = m.todaySub();

  const series = collectSeries(detailMetric, detailScale);
  const goal = m.goalFor();
  const known = series.filter(s => s.val != null && s.val > 0);
  const total = known.reduce((a,b)=>a+b.val,0);
  const avg = known.length ? total/known.length : 0;
  const best = known.length ? Math.max(...known.map(s => s.val)) : 0;
  const worst = known.length ? Math.min(...known.map(s => s.val)) : 0;
  const daysHit = goal ? known.filter(s => s.val >= goal*0.9).length : 0;
  const hitPct = known.length ? Math.round(daysHit/known.length*100) : 0;

  const fmt = (v) => v == null ? "—" : (Math.round(v*10)/10).toString();
  let statsCells = `
    <div class="dst-cell"><div class="dst-lbl">Average</div><div class="dst-val">${fmt(avg)}<i>${unitStr}</i></div></div>
    <div class="dst-cell"><div class="dst-lbl">Total</div><div class="dst-val">${fmt(total)}<i>${unitStr}</i></div></div>
    <div class="dst-cell"><div class="dst-lbl">Best day</div><div class="dst-val">${fmt(best)}<i>${unitStr}</i></div></div>
    <div class="dst-cell"><div class="dst-lbl">Logged</div><div class="dst-val">${known.length}<i>/ ${series.length} days</i></div></div>
  `;
  if(goal && known.length){
    statsCells += `<div class="dst-cell dst-wide"><div class="dst-lbl">Goal hit rate (>= 90%)</div><div class="dst-val">${hitPct}%<i>${daysHit}/${known.length} days</i></div><div class="dst-bar"><span style="width:${hitPct}%;background:${m.color}"></span></div></div>`;
  }
  document.getElementById("detailStats").innerHTML = statsCells;

  // Recent list (last 14 entries with values)
  const recent = series.slice().reverse().slice(0, 14);
  document.getElementById("detailList").innerHTML = recent.map(s => `
    <li class="dlist-row">
      <span class="dl-d">${fmtDate(s.date)}</span>
      <span class="dl-v">${s.val == null ? "—" : (Math.round(s.val*10)/10) + " " + unitStr}</span>
      ${goal && s.val != null ? (s.val >= goal*0.9 ? `<span class="dl-tag good">on track</span>` : (s.val > goal ? `<span class="dl-tag over">over</span>` : `<span class="dl-tag under">under</span>`)) : ""}
    </li>
  `).join("") || `<li class="dlist-empty">No data for this range yet.</li>`;

  drawDetailChart(series, goal, m.color, unitStr);
}

function drawDetailChart(series, goal, color, unitStr){
  const ctx = document.getElementById("detailChart").getContext("2d");
  if(_detailChart) _detailChart.destroy();
  const labels = series.map(s => {
    const d = new Date(s.date+"T00:00:00");
    if(series.length <= 7) return d.toLocaleDateString(undefined,{weekday:"short"});
    if(series.length <= 31) return d.toLocaleDateString(undefined,{day:"numeric"});
    return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});
  });
  const data = series.map(s => s.val == null ? null : s.val);
  const datasets = [{
    label: "Value",
    data,
    backgroundColor: color,
    borderColor: color,
    borderRadius: 4,
    maxBarThickness: 26,
    spanGaps: false,
  }];
  if(goal){
    datasets.push({
      type: "line",
      data: labels.map(() => goal),
      borderColor: "#666",
      borderWidth: 1.5,
      borderDash: [4,4],
      pointRadius: 0,
      label: "Goal"
    });
  }
  _detailChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend:{display:false},
        tooltip:{callbacks:{label:(c)=>`${c.parsed.y} ${unitStr}`}}
      },
      scales: {
        y: { beginAtZero: true, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#a7b1c6",font:{size:10}}},
        x: { grid:{display:false}, ticks:{color:"#a7b1c6",font:{size:10},maxRotation:0,autoSkip:true,autoSkipPadding:8}}
      }
    }
  });
}

// ---- Wire up ----
onReady(() => {
  const back = document.getElementById("detailBack");
  if(back) back.addEventListener("click", closeDetail);
  const close = document.getElementById("detailClose");
  if(close) close.addEventListener("click", closeDetail);
  document.querySelectorAll(".ds-btn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".ds-btn").forEach(x => x.classList.toggle("on", x === b));
    detailScale = b.dataset.scale;
    renderDetailView();
  }));
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && document.getElementById("detailOverlay").classList.contains("open")) closeDetail();
  });

  // Make dashboard cards open detail
  setTimeout(() => {
    // Calorie ring -> calories
    const calRing = document.getElementById("calRing");
    if(calRing){
      const card = calRing.closest(".card");
      if(card){
        // Remove any prior tab-jump handler by replacing the listener model with a simple one
        card.replaceWith(card.cloneNode(true));
      }
    }
  }, 100);

  // Use event delegation so we don't fight the existing handlers
  document.addEventListener("click", (e) => {
    const calRing = e.target.closest("#calRing");
    if(calRing){ openDetail("calories"); return; }
    // Activity rings card -> open with picker
    const ringsC = e.target.closest(".card");
    if(ringsC && ringsC.querySelector && ringsC.querySelector("#rings3")){
      // Show a small picker via metric tabs at top of detail
      openActivityDetail();
      return;
    }
    // Macro rows on dashboard
    const pBar = e.target.closest("#pBar"), cBar = e.target.closest("#cBar"), fBar = e.target.closest("#fBar");
    if(pBar){ openDetail("protein"); return; }
    if(cBar){ openDetail("carbs"); return; }
    if(fBar){ openDetail("fat"); return; }
    // Water card on dashboard
    const water = e.target.closest("#waterGrid");
    if(water){ openDetail("water"); return; }
  }, true);
});

function openActivityDetail(){
  // Quick chooser then open detail
  openModal("Activity detail", `
    <p style="font-size:12px;color:#666;margin:0 0 8px">Which ring?</p>
    <div class="form-grid" style="grid-template-columns:repeat(3,1fr);gap:8px">
      <button class="btn btn-pink" data-am="move" style="padding:14px;justify-content:center">🔴 Move</button>
      <button class="btn btn-lime" data-am="exercise" style="padding:14px;justify-content:center">🟢 Exercise</button>
      <button class="btn btn-cyan" data-am="stand" style="padding:14px;justify-content:center">🔵 Stand</button>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" data-close>Cancel</button></div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    root.querySelectorAll("[data-am]").forEach(b => b.addEventListener("click", () => {
      closeModal();
      openDetail(b.dataset.am);
    }));
  });
}


// =================================================================
// DETAIL OVERLAY — date navigation (overrides earlier basic version)
// =================================================================
let detailRefDate = new Date();

function _addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function _weekStart(d){ const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - x.getDay()); return x; }
function _monthStart(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function _monthEnd(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

function getDetailRange(scale, ref){
  if(scale === "1d")   return [new Date(ref), new Date(ref)];
  if(scale === "7d")   return [_weekStart(ref), _addDays(_weekStart(ref), 6)];
  if(scale === "30d")  return [_monthStart(ref), _monthEnd(ref)];
  if(scale === "90d")  return [_addDays(ref, -89), new Date(ref)];
  if(scale === "365d") return [new Date(ref.getFullYear(), 0, 1), new Date(ref.getFullYear(), 11, 31)];
  return [new Date(ref), new Date(ref)];
}

function shiftRefDate(scale, dir){
  const d = new Date(detailRefDate);
  if(scale === "1d")   d.setDate(d.getDate() + dir);
  if(scale === "7d")   d.setDate(d.getDate() + 7*dir);
  if(scale === "30d")  d.setMonth(d.getMonth() + dir);
  if(scale === "90d")  d.setDate(d.getDate() + 90*dir);
  if(scale === "365d") d.setFullYear(d.getFullYear() + dir);
  detailRefDate = d;
}

function rangeLabel(scale, ref){
  const [s, e] = getDetailRange(scale, ref);
  if(scale === "1d")   return ref.toLocaleDateString(undefined, {weekday:"long", month:"short", day:"numeric", year:"numeric"});
  if(scale === "7d")   return `${s.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – ${e.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}`;
  if(scale === "30d")  return ref.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  if(scale === "90d")  return `${s.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – ${e.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}`;
  if(scale === "365d") return ref.getFullYear().toString();
  return "";
}

function collectSeriesForRange(metric, scale, ref){
  const m = METRICS[metric];
  const [start, end] = getDetailRange(scale, ref);

  // YEAR view: aggregate by month (12 bars instead of 365)
  if(scale === "365d"){
    const months = [];
    for(let i = 0; i < 12; i++){
      const ms = new Date(ref.getFullYear(), i, 1);
      const me = new Date(ref.getFullYear(), i+1, 0);
      let sum = 0, count = 0;
      let cur = new Date(ms);
      while(cur <= me){
        const v = m.valueFor(todayKey(cur));
        if(v != null && v > 0){ sum += v; count++; }
        cur.setDate(cur.getDate()+1);
      }
      // For weight metric, store last known value per month rather than average
      let val = count ? sum/count : null;
      if(metric === "weight"){
        // last weight in or before this month
        const ws = (state.weights||[]).filter(w => w.date <= todayKey(me));
        val = ws.length ? ws[ws.length-1].val : null;
      }
      months.push({ date: todayKey(ms), label: ms.toLocaleDateString(undefined,{month:"short"}), val });
    }
    return { mode:"month", series: months };
  }

  // Otherwise, day-level bars
  const out = [];
  let cur = new Date(start);
  while(cur <= end){
    const k = todayKey(cur);
    out.push({ date:k, label:null, val: m.valueFor(k) });
    cur.setDate(cur.getDate()+1);
  }
  return { mode:"day", series: out };
}

// Override the earlier render function with date-aware version
renderDetailView = function(){
  const m = METRICS[detailMetric];
  if(!m) return;
  document.getElementById("detailEyebrow").textContent = m.eyebrow;
  document.getElementById("detailTitle").textContent = m.title;

  // Range label + nav
  document.getElementById("detailNavLabel").textContent = rangeLabel(detailScale, detailRefDate);
  document.getElementById("detailDatePicker").value = todayKey(detailRefDate);

  // Today's value (always today, regardless of refDate, for the big number)
  const todayVal = m.valueFor(todayKey());
  const unitStr = typeof m.unitLbl === "function" ? m.unitLbl() : m.unitLbl;
  document.getElementById("dcNum").innerHTML = `${todayVal != null && todayVal !== 0 ? Math.round(todayVal*10)/10 : (todayVal === 0 ? "0" : "—")}<i>${unitStr}</i>`;
  document.getElementById("dcSub").textContent = m.todaySub();

  // Series for selected range
  const { mode, series } = collectSeriesForRange(detailMetric, detailScale, detailRefDate);
  const goal = m.goalFor();
  const known = series.filter(s => s.val != null && s.val > 0);
  const total = known.reduce((a,b)=>a+b.val,0);
  const avg = known.length ? total/known.length : 0;
  const best = known.length ? Math.max(...known.map(s => s.val)) : 0;
  const daysHit = goal ? known.filter(s => s.val >= goal*0.9).length : 0;
  const hitPct = known.length ? Math.round(daysHit/known.length*100) : 0;

  const fmt = (v) => v == null ? "—" : (Math.round(v*10)/10).toString();

  // Stats vary by scale
  let statsCells = "";
  if(detailScale === "1d"){
    const v = series[0] ? series[0].val : null;
    statsCells = `
      <div class="dst-cell"><div class="dst-lbl">This day</div><div class="dst-val">${fmt(v)}<i>${unitStr}</i></div></div>
      <div class="dst-cell"><div class="dst-lbl">Goal</div><div class="dst-val">${goal||"—"}<i>${goal?unitStr:""}</i></div></div>
      <div class="dst-cell"><div class="dst-lbl">% of goal</div><div class="dst-val">${(v && goal) ? Math.round(v/goal*100) : "—"}<i>%</i></div></div>
      <div class="dst-cell"><div class="dst-lbl">Status</div><div class="dst-val" style="font-size:14px">${v == null ? "Not logged" : (v >= goal*0.9 ? "On track" : (v > goal ? "Over goal" : "Below goal"))}</div></div>
    `;
  } else {
    statsCells = `
      <div class="dst-cell"><div class="dst-lbl">${mode==="month" ? "Avg / day" : "Average"}</div><div class="dst-val">${fmt(avg)}<i>${unitStr}</i></div></div>
      <div class="dst-cell"><div class="dst-lbl">${mode==="month" ? "Total" : "Total"}</div><div class="dst-val">${fmt(total)}<i>${unitStr}</i></div></div>
      <div class="dst-cell"><div class="dst-lbl">Best</div><div class="dst-val">${fmt(best)}<i>${unitStr}</i></div></div>
      <div class="dst-cell"><div class="dst-lbl">Logged</div><div class="dst-val">${known.length}<i>/ ${series.length} ${mode==="month"?"months":"days"}</i></div></div>
    `;
    if(goal && known.length){
      statsCells += `<div class="dst-cell dst-wide"><div class="dst-lbl">Goal hit rate (>= 90%)</div><div class="dst-val">${hitPct}%<i>${daysHit}/${known.length}</i></div><div class="dst-bar"><span style="width:${hitPct}%;background:${m.color}"></span></div></div>`;
    }
  }
  document.getElementById("detailStats").innerHTML = statsCells;

  // Recent list
  const recent = series.slice().reverse().slice(0, mode==="month" ? 12 : 31);
  document.getElementById("detailList").innerHTML = recent.map(s => {
    const lbl = s.label || fmtDate(s.date);
    return `<li class="dlist-row">
      <span class="dl-d">${lbl}</span>
      <span class="dl-v">${s.val == null ? "—" : (Math.round(s.val*10)/10) + " " + unitStr}</span>
      ${goal && s.val != null ? (s.val >= goal*0.9 ? `<span class="dl-tag good">on track</span>` : (s.val > goal ? `<span class="dl-tag over">over</span>` : `<span class="dl-tag under">under</span>`)) : ""}
    </li>`;
  }).join("") || `<li class="dlist-empty">No data for this range yet.</li>`;

  drawDetailChart(series, goal, m.color, unitStr, mode);
};

drawDetailChart = function(series, goal, color, unitStr, mode){
  const ctx = document.getElementById("detailChart").getContext("2d");
  if(_detailChart) _detailChart.destroy();
  const labels = series.map(s => {
    if(s.label) return s.label;
    const d = new Date(s.date+"T00:00:00");
    if(series.length <= 7)  return d.toLocaleDateString(undefined,{weekday:"short"});
    if(series.length <= 31) return d.toLocaleDateString(undefined,{day:"numeric"});
    return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});
  });
  const data = series.map(s => s.val == null ? null : s.val);
  const datasets = [{
    data,
    backgroundColor: color,
    borderColor: color,
    borderRadius: 4,
    maxBarThickness: 26,
    spanGaps: false,
  }];
  if(goal){
    datasets.push({
      type: "line",
      data: labels.map(() => goal),
      borderColor: "#666",
      borderWidth: 1.5,
      borderDash: [4,4],
      pointRadius: 0,
    });
  }
  _detailChart = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend:{display:false},
        tooltip:{callbacks:{label:(c)=>`${c.parsed.y} ${unitStr}`}}
      },
      scales: {
        y: { beginAtZero: true, grid:{color:"rgba(255,255,255,.06)"}, ticks:{color:"#a7b1c6",font:{size:10}}},
        x: { grid:{display:false}, ticks:{color:"#a7b1c6",font:{size:10},maxRotation:0,autoSkip:true,autoSkipPadding:8}}
      }
    }
  });
};

// Override openDetail to reset refDate to today
// Update scale-button click handler so it preserves refDate
onReady(() => {
  document.querySelectorAll(".ds-btn").forEach(b => {
    // remove old listener by cloning
    const nb = b.cloneNode(true);
    b.parentNode.replaceChild(nb, b);
    nb.addEventListener("click", () => {
      document.querySelectorAll(".ds-btn").forEach(x => x.classList.toggle("on", x === nb));
      detailScale = nb.dataset.scale;
      renderDetailView();
    });
  });

  // Prev / Next arrows
  const prev = document.getElementById("detailPrev");
  const next = document.getElementById("detailNext");
  if(prev) prev.addEventListener("click", () => { shiftRefDate(detailScale, -1); renderDetailView(); });
  if(next) next.addEventListener("click", () => { shiftRefDate(detailScale,  1); renderDetailView(); });

  // Date label opens picker
  const lbl = document.getElementById("detailNavLabel");
  const picker = document.getElementById("detailDatePicker");
  if(lbl && picker){
    lbl.addEventListener("click", () => {
      picker.style.display = "block";
      picker.focus();
      try { picker.showPicker(); } catch(e){}
    });
    picker.addEventListener("change", () => {
      const v = picker.value;
      if(!v) return;
      detailRefDate = new Date(v + "T00:00:00");
      renderDetailView();
      picker.style.display = "none";
    });
    picker.addEventListener("blur", () => { picker.style.display = "none"; });
  }
});


// =================================================================
// DASHBOARD HUBS — 4-ring activity, hub renders, click-to-drill
// =================================================================

// Override drawActivityRings to draw 4 rings (Move/Exercise/Stand/Nutrition)
// using brand colors (distinct from Apple's red/green/cyan)
drawActivityRings = function(){
  const canvas = document.getElementById("rings3");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  const cx = w/2, cy = h/2;
  const a = getActivityForDay(currentDate);
  const g = getActivityGoals();

  // Nutrition ring: % of calorie goal eaten today (capped 1.0 for ring)
  const t = totalsFor(currentDate);
  const calVal = t.cal;
  const calGoal = state.goals.cal || 2200;

  // BERMO ring: gradient stroke + thick + segmented dots at the head
  const rings = [
    { c1:"#ff4d9d", c2:"#ff6b35", track:"rgba(255,45,122,.10)", val:a.move,     goal:g.move,     r:80, lw:16 },
    { c1:"#c8f500", c2:"#7be600", track:"rgba(200,245,0,.10)",  val:a.exercise, goal:g.exercise, r:60, lw:16 },
    { c1:"#00f5d4", c2:"#00b8a3", track:"rgba(0,245,212,.10)",  val:a.stand,    goal:g.stand,    r:40, lw:16 },
    { c1:"#b788ff", c2:"#ff8c1a", track:"rgba(183,136,255,.10)", val:calVal,     goal:calGoal,    r:20, lw:16 },
  ];
  rings.forEach(ring => {
    // Track
    ctx.beginPath();
    ctx.lineWidth = ring.lw;
    ctx.lineCap = "butt";
    ctx.strokeStyle = ring.track;
    ctx.arc(cx, cy, ring.r, 0, Math.PI*2);
    ctx.stroke();
    const pct = Math.min(1, ring.val / Math.max(1, ring.goal));
    if(pct > 0){
      // Gradient sweep
      const grad = ctx.createLinearGradient(cx-ring.r, cy-ring.r, cx+ring.r, cy+ring.r);
      grad.addColorStop(0, ring.c1);
      grad.addColorStop(1, ring.c2);
      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineCap = "butt";
      ctx.arc(cx, cy, ring.r, -Math.PI/2, -Math.PI/2 + pct * Math.PI*2);
      ctx.stroke();
      // Head dot — distinctive "bead" at progress tip
      const tipAngle = -Math.PI/2 + pct * Math.PI*2;
      const tipX = cx + Math.cos(tipAngle) * ring.r;
      const tipY = cy + Math.sin(tipAngle) * ring.r;
      ctx.beginPath();
      ctx.fillStyle = ring.c1;
      ctx.arc(tipX, tipY, ring.lw*0.55, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "#fff";
      ctx.arc(tipX, tipY, ring.lw*0.18, 0, Math.PI*2);
      ctx.fill();
    }
    // Tick marks at quarters for the unique BERMO look
    for(let q = 0; q < 4; q++){
      const ang = -Math.PI/2 + q * Math.PI/2;
      const x1 = cx + Math.cos(ang) * (ring.r - ring.lw/2 - 1);
      const y1 = cy + Math.sin(ang) * (ring.r - ring.lw/2 - 1);
      const x2 = cx + Math.cos(ang) * (ring.r + ring.lw/2 + 1);
      const y2 = cy + Math.sin(ang) * (ring.r + ring.lw/2 + 1);
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }
  });

  const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  setText("r3Move", `${Math.round(a.move)}/${g.move}`);
  setText("r3Ex",   `${Math.round(a.exercise)}/${g.exercise}`);
  setText("r3St",   `${Math.round(a.stand)}/${g.stand}`);
  setText("r3Nut",  `${calVal}/${calGoal}`);

  // 7-day strip (mini 4-bar stacks)
  const wk = document.getElementById("rings3Week");
  if(wk){
    let html = "";
    for(let i=6; i>=0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = todayKey(d);
      const da = (state.days[k] && state.days[k].activity) || { move:0, exercise:0, stand:0 };
      const dt = totalsFor(k);
      const m = Math.min(1, da.move/g.move) * 100;
      const e = Math.min(1, da.exercise/g.exercise) * 100;
      const s = Math.min(1, da.stand/g.stand) * 100;
      const n = Math.min(1, dt.cal/calGoal) * 100;
      const dayLetter = d.toLocaleDateString(undefined,{weekday:"narrow"});
      html += `<div class="rwk" title="${k}">
        <div class="rwk-stack">
          <div class="rwk-bar rwk-move"><span style="height:${m}%;background:#ff4d9d"></span></div>
          <div class="rwk-bar rwk-ex"><span style="height:${e}%;background:#c8f500"></span></div>
          <div class="rwk-bar rwk-st"><span style="height:${s}%;background:#00f5d4"></span></div>
          <div class="rwk-bar rwk-nut"><span style="height:${n}%;background:#b788ff"></span></div>
        </div>
        <div class="rwk-day">${dayLetter}</div>
      </div>`;
    }
    wk.innerHTML = html;
  }
};

// ---- Hub-specific renders ----
function renderNutritionHubBase(){
  const t = totalsFor(currentDate);
  const g = state.goals;
  const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  setText("hubCalNum", t.cal);
  setText("hubCalGoal", g.cal);
  setText("hubCalLeft", Math.max(0, g.cal - t.cal));
  const bar = document.getElementById("hubCalBar");
  if(bar){
    const pct = Math.min(100, t.cal/g.cal*100);
    bar.style.width = pct + "%";
    if(t.cal > g.cal) bar.style.background = "var(--pink)";
    else if(t.cal > g.cal*0.9) bar.style.background = "#b788ff";
    else bar.style.background = "var(--cyan)";
  }
  // Macros bars are filled by existing applyRedFlags / dashboard render
}

function renderFitnessHub(){
  const day = dayObj(currentDate);
  const sessions = day.sessions || [];
  const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  setText("hubTodaySets", sessions.length);

  // Last lift across all days
  let last = null;
  Object.keys(state.days).sort().reverse().some(k => {
    const ss = state.days[k].sessions || [];
    if(ss.length){ last = {...ss[ss.length-1], date:k}; return true; }
  });
  if(last){
    setText("hubLastLift", last.name.length > 16 ? last.name.slice(0,15)+"…" : last.name);
    setText("hubLastLiftSub", `${last.weight}${unit()} × ${last.reps} · ${fmtDate(last.date)}`);
  } else {
    setText("hubLastLift", "—");
    setText("hubLastLiftSub", "no sessions yet");
  }

  // Weekly volume
  let weekReps = 0;
  for(let i=0;i<7;i++){
    const d = new Date(); d.setDate(d.getDate()-i);
    const k = todayKey(d);
    (state.days[k] && state.days[k].sessions || []).forEach(s => {
      weekReps += (s.reps||0) * (s.sets||1);
    });
  }
  setText("hubWeekVol", weekReps);
}

function renderHealthHub(){
  const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  const c = (state.days[todayKey()]||{}).checkin;
  setText("hubSleep", c && c.sleep ? c.sleep + "h" : "—");
  if(c && c.mood){
    setText("hubMood", ["😩","😕","😐","🙂","🤩"][c.mood-1]);
    setText("hubMoodSub", "today");
  } else {
    setText("hubMood", "—");
    setText("hubMoodSub", "no check-in today");
  }
  let count = 0;
  for(let i=0;i<7;i++){
    const d = new Date(); d.setDate(d.getDate()-i);
    const k = todayKey(d);
    count += (state.days[k] && state.days[k].symptoms || []).length;
  }
  setText("hubSymCount", count);
}

function renderTrendsHub(){
  const list = document.getElementById("hubInsights");
  if(!list) return;
  let insights = [];
  try { insights = computeInsights().concat(computeSymptomInsights ? computeSymptomInsights() : []); } catch(e){}
  if(!insights.length){
    list.innerHTML = `<div class="hi-empty">Log consistently for ~10 days and patterns surface here.</div>`;
    return;
  }
  list.innerHTML = insights.slice(0,2).map(i => `
    <div class="hi-card hi-${i.tier}">
      <span class="hi-icon">${insIcon(i.icon)}</span>
      <span class="hi-text">${escape(i.headline)}</span>
    </div>
  `).join("");
}

function renderWeightHub(){
  const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  const ws = (state.weights||[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
  if(ws.length){
    const last = ws[ws.length-1];
    setText("hubWeightCur", last.val + " " + unit());
    if(ws.length > 1){
      const prev = ws[ws.length-2];
      const d = (last.val - prev.val).toFixed(1);
      setText("weightDelta", (d>0?"+":"") + d + " " + unit() + " vs prev");
    } else {
      setText("weightDelta", "first weigh-in");
    }
  } else {
    setText("hubWeightCur", "—");
    setText("weightDelta", "no weigh-in");
  }
  if(state.goals.weight){
    setText("hubWeightGoal", state.goals.weight + " " + unit());
    if(ws.length){
      const diff = (ws[ws.length-1].val - state.goals.weight).toFixed(1);
      setText("hubWeightDelta", (diff>0?"+":"") + diff + " from goal");
    }
  } else {
    setText("hubWeightGoal", "Set in Settings");
    setText("hubWeightDelta", "—");
  }

  // Mini line chart of last 30 weigh-ins
  const c = document.getElementById("hubWeightChart");
  if(c && typeof Chart !== "undefined"){
    if(window._hubWeightChart) window._hubWeightChart.destroy();
    const last30 = ws.slice(-30);
    window._hubWeightChart = new Chart(c.getContext("2d"), {
      type:"line",
      data:{
        labels: last30.map(()=>" "),
        datasets:[{
          data: last30.map(w=>w.val),
          borderColor:"#00f5d4",
          backgroundColor:"rgba(0,245,212,0.12)",
          fill:true, tension:.3, pointRadius:0, borderWidth:2
        }]
      },
      options:{
        plugins:{legend:{display:false}, tooltip:{enabled:false}},
        scales:{x:{display:false}, y:{display:false}}
      }
    });
  }
}

function renderHubsAllBase(){
  drawActivityRings();
  renderNutritionHub();
  renderFitnessHub();
  renderHealthHub();
  renderTrendsHub();
  renderWeightHub();
}

// Hook into dashboard render

// ---- Hub click + log button wiring ----
onReady(() => {
  document.querySelectorAll(".hub").forEach(hub => {
    hub.addEventListener("click", (e) => {
      // Don't intercept the inline log button or any inputs
      if(e.target.closest(".hub-log,button,input,select,canvas,a")) return;
      const target = hub.dataset.hub;
      if(target === "activity") openActivityDetail();
      else if(target === "nutrition") jumpToTab("nutrition");
      else if(target === "fitness") jumpToTab("fitness");
      else if(target === "health" || target === "trends") jumpToTab("trends");
      else if(target === "weight") jumpToTab("body");
    });
  });
  document.querySelectorAll("[data-hub-log]").forEach(b => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = b.dataset.hubLog;
      if(action === "activity" && typeof openActivityLogModal === "function") openActivityLogModal();
      else if(action === "food"){
        // Open food modal (lunch by time of day)
        const h = new Date().getHours();
        const meal = h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 18 ? "snacks" : "dinner";
        if(typeof openFoodModal === "function") openFoodModal(meal);
      }
      else if(action === "lift" && typeof openLiftModal === "function") openLiftModal();
      else if(action === "symptom" && typeof openSymptomModal === "function") openSymptomModal();
      else if(action === "checkin" && typeof openCheckinModal === "function") openCheckinModal();
      else if(action === "weigh" && typeof openWeighInModal === "function") openWeighInModal();
    });
  });
});


// =================================================================
// POLISH — back arrow, mobile nav, hub timestamps, reorder, PTR
// =================================================================

// ---- PER-HUB TIMESTAMPS ("Last: X ago") ----
function timeAgo(dateStr){
  if(!dateStr) return null;
  const d = new Date(dateStr+"T12:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diffDays = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if(diffDays === 0) return "today";
  if(diffDays === 1) return "yesterday";
  if(diffDays < 7) return `${diffDays}d ago`;
  if(diffDays < 30) return `${Math.floor(diffDays/7)}w ago`;
  return `${Math.floor(diffDays/30)}mo ago`;
}
function lastDateWith(predicate){
  const keys = Object.keys(state.days).sort().reverse();
  for(const k of keys){ if(predicate(state.days[k], k)) return k; }
  return null;
}
function applyHubTimestamps(){
  const stamps = {
    activity: lastDateWith(d => d.activity && (d.activity.move > 0 || d.activity.exercise > 0 || d.activity.stand > 0)),
    nutrition: lastDateWith(d => ["breakfast","lunch","dinner","snacks"].some(m => (d.meals||{})[m] && d.meals[m].length > 0)),
    fitness: lastDateWith(d => (d.sessions||[]).length > 0 || d.wodResult),
    health: lastDateWith(d => (d.symptoms||[]).length > 0 || d.checkin),
    weight: (state.weights || []).length ? state.weights[state.weights.length-1].date : null,
    trends: null, // derived
  };
  document.querySelectorAll(".hub").forEach(hub => {
    const h = hub.dataset.hub;
    let foot = hub.querySelector(".hub-foot .hub-stamp");
    if(!foot){
      const f = hub.querySelector(".hub-foot");
      if(!f) return;
      foot = document.createElement("span");
      foot.className = "hub-stamp";
      f.insertBefore(foot, f.firstChild);
    }
    const ago = timeAgo(stamps[h]);
    foot.textContent = ago ? `Last: ${ago}` : "";
  });
}

// Hook hub renders to also stamp + apply prefs
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function renderHubsAllStep_RenderHubsAll(){
  applyHubTimestamps();
}

// ---- PULL TO REFRESH ----
function setupPTR(){
  const indicator = document.getElementById("ptrIndicator");
  const text = document.getElementById("ptrText");
  if(!indicator) return;
  let startY = 0, currentY = 0, pulling = false;
  const THRESHOLD = 70;
  const main = () => document.querySelector(".main") || document.body;

  document.addEventListener("touchstart", (e) => {
    if(window.scrollY > 0) { pulling = false; return; }
    if(document.querySelector(".modal.open, .detail-overlay.open, .fab-sheet.open")) { pulling = false; return; }
    startY = e.touches[0].clientY;
    pulling = true;
  }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    if(!pulling) return;
    currentY = e.touches[0].clientY;
    const delta = currentY - startY;
    if(delta < 0){ pulling = false; indicator.classList.remove("show","ready"); return; }
    if(delta > 10){
      indicator.classList.add("show");
      indicator.style.transform = `translateY(${Math.min(delta * 0.4, 80)}px)`;
      if(delta > THRESHOLD){
        indicator.classList.add("ready");
        text.textContent = "Release to refresh";
      } else {
        indicator.classList.remove("ready");
        text.textContent = "Pull to refresh";
      }
    }
  }, { passive: true });

  document.addEventListener("touchend", () => {
    if(!pulling) return;
    const delta = currentY - startY;
    indicator.style.transform = "";
    if(delta > THRESHOLD){
      text.textContent = "Refreshing…";
      indicator.classList.add("refreshing");
      setTimeout(() => {
        if(typeof renderAll === "function") renderAll();
        text.textContent = "Refreshed";
        setTimeout(() => {
          indicator.classList.remove("show","ready","refreshing");
        }, 500);
      }, 250);
    } else {
      indicator.classList.remove("show","ready");
    }
    pulling = false;
  });
}

onReady(() => {
  applyHubTimestamps();
  setupPTR();
});


// =================================================================
// ACCOUNTABILITY PACK — Goal Contract, restart card, streak chain,
//                       quick 3-tap check-in
// =================================================================

// ---- Goal Contract ----
function getContract(){
  if(!state.contract) state.contract = {
    identity: "I am someone who shows up — even when it's hard.",
    goal: "",
    deadline: "",
    consequence: "",
    reward: ""
  };
  return state.contract;
}
function renderContract(){
  const c = getContract();
  const setText = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
  setText("ccIdentity", c.identity || "I am someone who shows up.");
  setText("ccGoal", c.goal || "Set your goal in one sentence — what, by when.");
  setText("ccDeadline", c.deadline ? fmtDate(c.deadline) : "Not set");
  if(c.deadline){
    const days = Math.ceil((new Date(c.deadline) - new Date()) / 86400000);
    setText("ccDaysLeft", days < 0 ? "Past due" : days + " days");
  } else {
    setText("ccDaysLeft", "—");
  }
  // Streak number
  let streak = 0;
  try { streak = (typeof streakDays === "function") ? streakDays() : 0; } catch(e){}
  setText("ccStreak", streak + " d");

  // Chain visual: 30 links, filled per logged day in last 30
  const chain = document.getElementById("ccChain");
  if(chain){
    const links = [];
    for(let i = 29; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = todayKey(d);
      const has = (function(){
        const dd = state.days[k]; if(!dd) return false;
        const meals = ["breakfast","lunch","dinner","snacks"].some(m => (dd.meals||{})[m] && dd.meals[m].length);
        return meals || (dd.sessions||[]).length > 0 || dd.water > 0;
      })();
      links.push(has ? "filled" : "empty");
    }
    chain.innerHTML = links.map(s => `<span class="chain-link ${s}"></span>`).join("");
    const filled = links.filter(s => s === "filled").length;
    const note = filled === 0 ? "Log anything today to start your chain"
               : filled === 30 ? "Perfect 30 — you don't break"
               : `${filled} of 30 days logged · auto-updates as you log`;
    setText("ccChainText", note);
  }
}
function openContractModal(){
  const c = getContract();
  openModal("My Contract", `
    <p style="font-size:12px;color:#666;margin:0 0 10px;line-height:1.5">Identity beats discipline. Write what you're committing to and why. The dashboard will hold you to it.</p>
    <label><span>Identity statement (start with "I am someone who...")</span>
      <textarea id="conIdentity" class="search-input" rows="2" maxlength="160" style="resize:vertical;min-height:60px">${escape(c.identity||"")}</textarea>
    </label>
    <label><span>The Goal — one sentence (what + by when)</span>
      <textarea id="conGoal" class="search-input" rows="2" maxlength="200" placeholder='e.g. "Reach 145 lb by July 4" or "Hit protein 6/7 days for 60 days"' style="resize:vertical;min-height:60px">${escape(c.goal||"")}</textarea>
    </label>
    <label><span>Deadline</span><input id="conDeadline" type="date" value="${c.deadline||""}"></label>
    <label><span>If I miss this, I will...</span>
      <input id="conCons" type="text" maxlength="120" value="${escape(c.consequence||"")}" placeholder="donate $X to a charity I hate / no wine for a month / etc.">
    </label>
    <label><span>If I hit this, I will...</span>
      <input id="conReward" type="text" maxlength="120" value="${escape(c.reward||"")}" placeholder="weekend trip / new gear / something meaningful">
    </label>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="conSave">Sign + Save</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("conSave").addEventListener("click", () => {
      state.contract = {
        identity: document.getElementById("conIdentity").value.trim(),
        goal: document.getElementById("conGoal").value.trim(),
        deadline: document.getElementById("conDeadline").value,
        consequence: document.getElementById("conCons").value.trim(),
        reward: document.getElementById("conReward").value.trim()
      };
      save(); closeModal(); renderContract();
      toast("Contract signed","cyan");
    });
  });
}

// ---- Restart Card (compassionate prompt when struggling) ----
function renderRestartCard(){
  const card = document.getElementById("restartCard");
  if(!card) return;
  // Count consecutive missed days (back from today)
  let missed = 0;
  let d = new Date();
  while(true){
    const k = todayKey(d);
    const has = (function(){
      const dd = state.days[k]; if(!dd) return false;
      const meals = ["breakfast","lunch","dinner","snacks"].some(m => (dd.meals||{})[m] && dd.meals[m].length);
      return meals || (dd.sessions||[]).length > 0;
    })();
    if(has) break;
    missed++; d.setDate(d.getDate()-1);
    if(missed >= 30) break;
  }
  // Don't show if dismissed today
  const dismissedKey = "bermo.tracker.restartDismissed." + todayKey();
  if(localStorage.getItem(dismissedKey) === "1"){ card.classList.add("hidden"); return; }
  if(missed >= 3){
    card.classList.remove("hidden");
    const title = document.getElementById("rsTitle");
    const sub = document.getElementById("rsSub");
    const phrase = missed >= 30 ? "30+ days happened" : `${missed} days happened`;
    title.textContent = `${phrase}. No guilt.`;
    sub.textContent = `Real life. Real reasons. The fastest restart isn't perfection — it's any small action right now. You can be back on track in 30 seconds.`;
  } else {
    card.classList.add("hidden");
  }
}
function setupRestartActions(){
  const card = document.getElementById("restartCard");
  if(!card) return;
  const wo = document.getElementById("rsLogWorkout");
  if(wo) wo.addEventListener("click", () => {
    if(typeof openLiftModal === "function") openLiftModal();
  });
  const dis = document.getElementById("rsDismiss");
  if(dis) dis.addEventListener("click", () => {
    localStorage.setItem("bermo.tracker.restartDismissed." + todayKey(), "1");
    document.getElementById("restartCard").classList.add("hidden");
  });
}

// ---- Quick 3-tap check-in (faster than full modal) ----
function openQuickCheckin(){
  const day = dayObj(currentDate);
  if(!day.checkin) day.checkin = {};
  const c = day.checkin;
  openModal("Quick check-in (3 taps)", `
    <p style="font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;font-weight:700;margin:0">Three Y/N questions. Done in 5 seconds.</p>
    <div class="quick-q">
      <div class="qq-text">Did you move today?<br><span>Walk, lift, anything ≥10 min</span></div>
      <div class="qq-buttons">
        <button class="qq-yes ${c.qMove===1?"on":""}" data-q="qMove" data-v="1">YES</button>
        <button class="qq-no ${c.qMove===0?"on":""}" data-q="qMove" data-v="0">NO</button>
      </div>
    </div>
    <div class="quick-q">
      <div class="qq-text">Protein at every meal?<br><span>Goal: ${state.goals.protein}g total</span></div>
      <div class="qq-buttons">
        <button class="qq-yes ${c.qProtein===1?"on":""}" data-q="qProtein" data-v="1">YES</button>
        <button class="qq-no ${c.qProtein===0?"on":""}" data-q="qProtein" data-v="0">NO</button>
      </div>
    </div>
    <div class="quick-q">
      <div class="qq-text">Sleep 7+ hours last night?<br><span>If no, we'll know</span></div>
      <div class="qq-buttons">
        <button class="qq-yes ${c.qSleep===1?"on":""}" data-q="qSleep" data-v="1">YES</button>
        <button class="qq-no ${c.qSleep===0?"on":""}" data-q="qSleep" data-v="0">NO</button>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Done</button>
      <button class="btn btn-cyan" id="qcMore">+ Add details</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => { save(); closeModal(); renderAll(); toast("Check-in saved","cyan"); }));
    root.querySelectorAll("[data-q]").forEach(b => b.addEventListener("click", () => {
      const q = b.dataset.q, v = parseInt(b.dataset.v, 10);
      day.checkin[q] = v;
      // Toggle visuals
      root.querySelectorAll(`[data-q="${q}"]`).forEach(x => x.classList.toggle("on", x === b));
    }));
    document.getElementById("qcMore").addEventListener("click", () => {
      save();
      closeModal();
      if(typeof openCheckinModal === "function") setTimeout(openCheckinModal, 100);
    });
  });
}

// ---- Hooks ----
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function renderDashboardStep_RDForAcc(){
  renderContract();
  renderRestartCard();
}

onReady(() => {
  const e = document.getElementById("ccEditBtn");
  if(e) e.addEventListener("click", openContractModal);
  setupRestartActions();
});

// Replace the FAB "checkin" handler to use the 3-tap version
onReady(() => {
  document.querySelectorAll('[data-fab="checkin"]').forEach(b => {
    const nb = b.cloneNode(true);
    b.parentNode.replaceChild(nb, b);
    nb.addEventListener("click", () => {
      closeFAB();
      setTimeout(openQuickCheckin, 150);
    });
  });
  // Also wire the Trends "+ Daily check-in" header button to quick version
  const tr = document.getElementById("trCheckinBtn");
  if(tr){
    const nb = tr.cloneNode(true);
    tr.parentNode.replaceChild(nb, tr);
    nb.addEventListener("click", openQuickCheckin);
  }
});


// =================================================================
// FIXES — modal X, ring tap goes to page, nutrition week strip,
//          metric tabs in detail overlay, customize relocations
// =================================================================

// ---- BULLETPROOF MODAL CLOSE via event delegation ----
// Catches [data-close] clicks no matter when the element was added
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-close]");
  if(!t) return;
  // Check what's open and close the right thing
  if(document.getElementById("modal").classList.contains("open")){
    document.getElementById("modal").classList.remove("open");
  }
}, true);

// Same for FAB close
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-fab-close]");
  if(!t) return;
  const sheet = document.getElementById("fabSheet");
  if(sheet) sheet.classList.remove("open");
}, true);

// Detail overlay X
document.addEventListener("click", (e) => {
  if(e.target.closest("#detailClose,#detailBack")){
    document.getElementById("detailOverlay").classList.remove("open");
    document.body.style.overflow = "";
  }
}, true);

// ---- RING/HUB TAP → STRAIGHT TO DETAIL (no picker) ----
// Override openActivityDetail so it doesn't show a picker
openActivityDetail = function(){
  // Default to Move; tabs in the detail overlay let user switch
  openDetail("move");
};

// Make the ring canvas itself tappable (was excluded by closest(canvas))
onReady(() => {
  document.querySelectorAll(".hub").forEach(hub => {
    // Replace prior click handler with one that allows canvas/svg taps
    const newHub = hub.cloneNode(true);
    hub.parentNode.replaceChild(newHub, hub);
    newHub.addEventListener("click", (e) => {
      // Only ignore actual buttons / inputs / labels (not canvas)
      if(e.target.closest(".hub-log") || e.target.tagName === "INPUT" ||
         e.target.tagName === "SELECT" || e.target.tagName === "BUTTON" ||
         e.target.tagName === "LABEL" || e.target.tagName === "A") return;
      const target = newHub.dataset.hub;
      if(target === "activity") openDetail("move");
      else if(target === "nutrition") jumpToTab("nutrition");
      else if(target === "fitness") jumpToTab("fitness");
      else if(target === "health" || target === "trends") jumpToTab("trends");
      else if(target === "weight") jumpToTab("body");
    });
  });
  // Re-bind hub-log buttons (since we cloned the hubs)
  document.querySelectorAll("[data-hub-log]").forEach(b => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = b.dataset.hubLog;
      if(action === "activity" && typeof openActivityLogModal === "function") openActivityLogModal();
      else if(action === "food"){
        const h = new Date().getHours();
        const meal = h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 18 ? "snacks" : "dinner";
        if(typeof openFoodModal === "function") openFoodModal(meal);
      }
      else if(action === "lift" && typeof openLiftModal === "function") openLiftModal();
      else if(action === "symptom" && typeof openSymptomModal === "function") openSymptomModal();
      else if(action === "checkin" && typeof openQuickCheckin === "function") openQuickCheckin();
      else if(action === "weigh" && typeof openWeighInModal === "function") openWeighInModal();
    });
  });
  // Re-trigger renders since we replaced hub DOM
  if(typeof renderAll === "function") setTimeout(renderAll, 50);
});

// ---- METRIC TABS in detail overlay (for activity sub-rings) ----
const RING_METRICS = ["move","exercise","stand","nutrition"];
function ensureMetricTabs(){
  const body = document.querySelector(".detail-body");
  if(!body) return;
  let tabs = document.getElementById("detailMetricTabs");
  if(!RING_METRICS.includes(detailMetric)){
    if(tabs) tabs.style.display = "none";
    return;
  }
  if(!tabs){
    tabs = document.createElement("div");
    tabs.id = "detailMetricTabs";
    tabs.className = "detail-metric-tabs";
    body.insertBefore(tabs, body.firstChild);
  }
  tabs.style.display = "flex";
  tabs.innerHTML = RING_METRICS.map(m => {
    const lbl = m === "nutrition" ? "Nutrition" : m.charAt(0).toUpperCase()+m.slice(1);
    const dotColor = m === "move" ? "#ff4d9d" : m === "exercise" ? "#c8f500" : m === "stand" ? "#00f5d4" : "#b788ff";
    return `<button class="dmt ${m===detailMetric?"on":""}" data-mt="${m}"><span class="dmt-dot" style="background:${dotColor}"></span>${lbl}</button>`;
  }).join("");
  tabs.querySelectorAll("[data-mt]").forEach(b => b.addEventListener("click", () => {
    detailMetric = b.dataset.mt;
    renderDetailView();
    ensureMetricTabs();
  }));
}

// ---- NUTRITION HUB WEEK STRIP (✓ for logged + within goal) ----
function renderNutritionWeekBase(){
  const wk = document.getElementById("nutWeek");
  if(!wk) return;
  let html = "";
  for(let i = 6; i >= 0; i--){
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = todayKey(d);
    const t = totalsFor(k);
    const goal = state.goals.cal;
    const day = state.days[k];
    const hasFood = day && ["breakfast","lunch","dinner","snacks"].some(m => (day.meals||{})[m] && day.meals[m].length);
    let status = "empty"; // no log
    let icon = "·";
    if(hasFood){
      if(t.cal === 0){ status = "empty"; }
      else if(t.cal > goal){ status = "over"; icon = "!"; }
      else if(t.cal >= goal*0.7){ status = "good"; icon = "✓"; }
      else { status = "low"; icon = "↓"; }
    }
    const dayLetter = d.toLocaleDateString(undefined,{weekday:"narrow"});
    const isToday = i === 0;
    html += `<div class="nw-day ${status} ${isToday?"today":""}">
      <div class="nw-letter">${dayLetter}</div>
      <div class="nw-circle"><span>${icon}</span></div>
    </div>`;
  }
  wk.innerHTML = html;
}

// ---- BIGGER WEEK STRIP for activity (per screenshot) ----
// Hook into existing drawActivityRings to make week strip more visible
// (CSS does the visual work; just ensure it renders)

// =================================================================
// FIXES — back buttons on all pages, activity week strip with status,
//          day-click quick view, compact macros (CSS-driven)
// =================================================================

// ---- BACK BUTTON on every view header ----
function addBackButtons(){
  document.querySelectorAll(".view").forEach(view => {
    if(view.id === "view-dashboard") return;          // dashboard is "home"
    const head = view.querySelector(".view-head");
    if(!head || head.querySelector(".view-back")) return;
    const btn = document.createElement("button");
    btn.className = "view-back";
    btn.setAttribute("aria-label", "Back to dashboard");
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg> <span>Home</span>`;
    btn.addEventListener("click", () => {
      const t = document.querySelector('.tab[data-tab="dashboard"], .mtab[data-tab="dashboard"]');
      if(t) t.click();
    });
    head.insertBefore(btn, head.firstChild);
  });
}
onReady(() => {
  setTimeout(addBackButtons, 100);
});

// ---- ACTIVITY WEEK STRIP — replace bars with status circles + day-click ----
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function drawActivityRingsStep_DrawRingsForStrip(){
  // Override the bar-stack week strip with circle-status one
  const wk = document.getElementById("rings3Week");
  if(!wk) return;
  const g = (state.activityGoals || { move:800, exercise:60, stand:16 });
  const calGoal = state.goals.cal || 2200;
  // Get this week's plan to inline lift type per day
  const plan = state.plan || {};
  const today = new Date(); today.setHours(0,0,0,0);
  const monday = weekStart(today);
  const wkKey = (typeof weekKey === "function") ? weekKey(monday) : null;
  const wkPlan = (wkKey && plan[wkKey]) || {};
  const planNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  let html = "";
  for(let i = 6; i >= 0; i--){
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = todayKey(d);
    const dayObjEntry = state.days[k] || {};
    const da = (typeof getActivityForDay === "function") ? getActivityForDay(k) : (dayObjEntry.activity || { move:0, exercise:0, stand:0 });
    const t = totalsFor(k);
    let closed = 0, partial = 0;
    [
      [da.move, g.move], [da.exercise, g.exercise],
      [da.stand, g.stand], [t.cal, calGoal]
    ].forEach(([v, goal]) => {
      if(v >= goal) closed++;
      else if(v > 0) partial++;
    });
    let status = "empty", icon = "·";
    if(closed === 4){ status = "good"; icon = "✓"; }
    else if(closed >= 1){ status = "good-some"; icon = closed.toString(); }
    else if(partial > 0){ status = "low"; icon = "◐"; }
    const dayLetter = d.toLocaleDateString(undefined,{weekday:"narrow"});
    const isToday = i === 0;
    // Workout-type label for this day (logged > planned > —)
    const dIso = new Date(d); dIso.setHours(0,0,0,0);
    const planDayName = planNames[dIso.getDay()];
    const planEntry = wkPlan[planDayName];
    const sessions = dayObjEntry.sessions || [];
    let liftLabel = "—", liftCls = "";
    if(dIso > today){
      liftLabel = planEntry ? planEntry.type : "—";
      if(!planEntry) liftCls = "lift-future";
    } else if(dayObjEntry.skipped){
      liftLabel = "SKIP"; liftCls = "lift-skipped";
    } else if(sessions.length){
      const first = sessions[0];
      liftLabel = (first.lift || first.exercise || first.name || planEntry?.type || "Done").slice(0, 8);
    } else if(planEntry){
      liftLabel = planEntry.type.slice(0, 8);
    } else {
      liftCls = "lift-future";
    }
    html += `<div class="aw-day ${status} ${isToday?"today":""} ${liftCls}" data-date="${k}" data-kind="activity">
      <div class="aw-letter">${dayLetter}</div>
      <div class="aw-circle"><span>${icon}</span></div>
      <div class="aw-lift">${escape(liftLabel)}</div>
    </div>`;
  }
  wk.className = "hub-week activity-week";
  wk.innerHTML = html;
  // (Old separate lift-mini-strip removed — consolidated above)
}

// (renderLiftMiniStrip removed — dead: zero callers, CSS-hidden)

function openDayQuickView(dateKey, kind){
  const d = new Date(dateKey + "T00:00:00");
  const dStr = d.toLocaleDateString(undefined,{weekday:"long", month:"short", day:"numeric", year:"numeric"});
  const t = totalsFor(dateKey);
  const day = state.days[dateKey] || {};
  const a = day.activity || { move:0, exercise:0, stand:0 };
  const g = (state.activityGoals || { move:800, exercise:60, stand:16 });

  // Different content for activity vs nutrition tap
  let body;
  if(kind === "activity"){
    body = `
      <div class="qv-rings">
        <div class="qv-ring"><div class="qv-lbl">Move</div><div class="qv-val" style="color:#ff4d9d">${Math.round(a.move)}<i>/${g.move}</i></div></div>
        <div class="qv-ring"><div class="qv-lbl">Exercise</div><div class="qv-val" style="color:#a8c500">${Math.round(a.exercise)}<i>/${g.exercise}</i></div></div>
        <div class="qv-ring"><div class="qv-lbl">Stand</div><div class="qv-val" style="color:#00b89e">${Math.round(a.stand)}<i>/${g.stand}</i></div></div>
        <div class="qv-ring"><div class="qv-lbl">Nutrition</div><div class="qv-val" style="color:#d68a26">${t.cal}<i>/${state.goals.cal}</i></div></div>
      </div>
    `;
  } else {
    body = `
      <div class="qv-rings">
        <div class="qv-ring"><div class="qv-lbl">Calories</div><div class="qv-val">${t.cal}<i>/${state.goals.cal}</i></div></div>
        <div class="qv-ring"><div class="qv-lbl">Protein</div><div class="qv-val">${t.p}g<i>/${state.goals.protein}g</i></div></div>
        <div class="qv-ring"><div class="qv-lbl">Carbs</div><div class="qv-val">${t.c}g<i>/${goalsForDay(dateKey).carbs}g</i></div></div>
        <div class="qv-ring"><div class="qv-lbl">Fat</div><div class="qv-val">${t.f}g<i>/${goalsForDay(dateKey).fat}g</i></div></div>
      </div>
    `;
  }

  openModal(dStr, `
    ${body}
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Close</button>
      <button class="btn btn-cyan" id="qvOpenFull">View full day →</button>
    </div>
  `, () => {
    document.getElementById("qvOpenFull").addEventListener("click", () => {
      currentDate = dateKey;
      closeModal();
      const tab = kind === "activity" ? "dashboard" : "nutrition";
      const t = document.querySelector(`.tab[data-tab="${tab}"], .mtab[data-tab="${tab}"]`);
      if(t) t.click();
      if(typeof renderAll === "function") renderAll();
    });
  });
}

// Legacy popup handler removed — see setHubViewDate for swap-in-place behavior below.

// ---- NUTRITION WEEK STRIP — add data-date / data-kind so clicks work ----
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function renderNutritionWeekStep_RNW(){
  document.querySelectorAll("#nutWeek .nw-day").forEach((el, idx) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - idx));
    el.dataset.date = todayKey(d);
    el.dataset.kind = "nutrition";
  });
}


// =================================================================
// PLANNER ENHANCEMENTS — exercises field + Today's Plan mini box
// =================================================================

// Day workout editor — used by the dashboard week list AND the planner.
// Supports multiple workouts per day (double days), a time-of-day per
// workout, and picking from Saved workouts / categories / custom names.
// Storage stays back-compat: { type, time, exercises, notes, extra:[...] }
function openPlanDayModal(wkKey, dayName){
  const plan = getPlan();
  if(!plan[wkKey]) plan[wkKey] = {};
  const cur = plan[wkKey][dayName] || {};
  const items = [{ name: cur.type || "", time: cur.time || "", why: cur.why || "", exercises: cur.exercises || [] }]
    .concat((cur.extra || []).map(x => ({ name: x.name || "", time: x.time || "", why: x.why || "", exercises: x.exercises || [] })));

  const lib = getWorkoutLib();
  const optionsHtml = (sel) => {
    const saved = lib.map(w => `<option value="saved:${w.id}" ${sel === ("saved:"+w.id) ? "selected":""}>★ ${escape(w.name)}</option>`).join("");
    const cats = WORKOUT_TYPES.map(t => `<option value="cat:${escape(t)}" ${sel === ("cat:"+t) ? "selected":""}>${escape(t)}</option>`).join("");
    return `<option value="">— pick —</option>
      ${saved ? `<optgroup label="My saved workouts">${saved}</optgroup>` : ""}
      <optgroup label="Categories">${cats}</optgroup>
      <option value="custom" ${sel === "custom" ? "selected":""}>Custom name…</option>`;
  };
  const rowHtml = (it, i) => {
    // preselect: saved workout with same name > category with same name > custom
    let sel = "";
    if(it.name){
      const savedMatch = lib.find(w => w.name === it.name);
      if(savedMatch) sel = "saved:" + savedMatch.id;
      else if(WORKOUT_TYPES.includes(it.name)) sel = "cat:" + it.name;
      else sel = "custom";
    }
    const moves = (it.exercises || []).map(e => e.name + (e.scheme ? " — " + e.scheme : "")).join("\n");
    const whyChips = WHY_PRESETS.map(w => `<button type="button" class="pde-chip" data-why="${escape(w)}">${escape(w)}</button>`).join("");
    return `<div class="pde-row-wrap" data-i="${i}">
      <div class="pde-row">
        <select class="pde-sel">${optionsHtml(sel)}</select>
        <input class="pde-custom" type="text" placeholder="Custom name (e.g. Legs — glute/ham focus)" maxlength="40"
          value="${sel === "custom" ? escape(it.name) : ""}" style="${sel === "custom" ? "" : "display:none"}">
        <input class="pde-time" type="time" value="${escape(it.time || "")}" title="Time of day">
        <button type="button" class="pde-del" title="Remove">×</button>
      </div>
      <textarea class="pde-moves" rows="3" placeholder="Movements — one per line:\nthruster machine\nRDL\nkickback machine\nhamstring curls">${escape(moves)}</textarea>
      <div class="pde-why">
        <span class="pde-why-lbl">Why this one today? <i>optional — it feeds your health patterns</i></span>
        <input class="pde-whytxt" type="text" maxlength="70" value="${escape(it.why || "")}"
          placeholder="e.g. hungover, so cardio">
        <div class="pde-chips">${whyChips}</div>
      </div>
    </div>`;
  };

  openModal(`${dayName.charAt(0).toUpperCase()+dayName.slice(1)} — workouts`, `
    <label style="margin-bottom:8px;display:block"><span>Gym / location (optional)</span>
      <input id="pdeGym" type="text" maxlength="40" placeholder="e.g. Planet Fitness" value="${escape(cur.gym || "")}"></label>
    <div class="pde-list" id="pdeList">${items.map(rowHtml).join("")}</div>
    <button type="button" class="btn btn-ghost btn-sm" id="pdeAdd" style="width:100%;margin-top:6px">+ ADD ANOTHER WORKOUT (double day)</button>
    <p class="wb-hint" style="margin-top:8px">Saved workouts bring their exercise list into the live session logger. Time is optional.</p>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      ${cur.type ? `<button class="btn btn-pink" id="pdeClear">CLEAR DAY</button>` : ""}
      <button class="btn btn-cyan" id="pdeSave">SAVE</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const list = document.getElementById("pdeList");
    const wireRow = (row) => {
      const sel = row.querySelector(".pde-sel");
      const custom = row.querySelector(".pde-custom");
      const moves = row.querySelector(".pde-moves");
      sel.addEventListener("change", () => {
        custom.style.display = sel.value === "custom" ? "" : "none";
        if(sel.value === "custom") custom.focus();
        if(sel.value.startsWith("saved:")){
          const w = lib.find(x => x.id === sel.value.slice(6));
          if(w && moves && !moves.value.trim())
            moves.value = w.exercises.map(e => e.name + (e.scheme ? " — " + e.scheme : "")).join("\n");
        }
      });
      const whyTxt = row.querySelector(".pde-whytxt");
      row.querySelectorAll(".pde-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          const w = chip.getAttribute("data-why");
          const cur = whyTxt.value.trim();
          const parts = cur ? cur.split(/\s*,\s*/) : [];
          const i = parts.indexOf(w);
          if(i > -1) parts.splice(i, 1); else parts.push(w);
          whyTxt.value = parts.join(", ");
          chip.classList.toggle("on", i === -1);
        });
        if((whyTxt.value || "").split(/\s*,\s*/).includes(chip.getAttribute("data-why"))) chip.classList.add("on");
      });
      row.querySelector(".pde-del").addEventListener("click", () => {
        if(list.children.length > 1) row.remove();
        else { sel.value = ""; custom.value = ""; custom.style.display = "none"; row.querySelector(".pde-time").value = ""; if(moves) moves.value = ""; }
      });
    };
    list.querySelectorAll(".pde-row-wrap").forEach(wireRow);
    document.getElementById("pdeAdd").addEventListener("click", () => {
      const div = document.createElement("div");
      div.innerHTML = rowHtml({ name:"", time:"", why:"", exercises:[] }, list.children.length);
      const row = div.firstElementChild;
      list.appendChild(row);
      wireRow(row);
    });
    document.getElementById("pdeSave").addEventListener("click", () => {
      const rows = Array.from(list.querySelectorAll(".pde-row-wrap"));
      const parseWhy = (row) => {
        const el = row.querySelector(".pde-whytxt");
        const v = el ? el.value.trim() : "";
        return v || undefined;
      };
      const parseMoves = (row) => {
        const ta = row.querySelector(".pde-moves");
        if(!ta || !ta.value.trim()) return [];
        return ta.value.split("\n").map(l => l.trim().replace(/^[-•*]\s*/, "")).filter(Boolean)
          .map(l => {
            const m = l.split("—");
            return { name: m[0].trim(), scheme: (m[1] || "").trim() };
          });
      };
      const parsed = rows.map(row => {
        const v = row.querySelector(".pde-sel").value;
        const time = row.querySelector(".pde-time").value;
        const moves = parseMoves(row);
        if(v.startsWith("saved:")){
          const w = lib.find(x => x.id === v.slice(6));
          if(!w) return null;
          return { name: w.name, time, why: parseWhy(row), exercises: moves.length ? moves : w.exercises.map(e => ({ name: e.name, scheme: e.scheme || "" })) };
        }
        if(v.startsWith("cat:")) return { name: v.slice(4), time, why: parseWhy(row), exercises: moves };
        if(v === "custom"){
          const name = row.querySelector(".pde-custom").value.trim();
          return name ? { name, time, why: parseWhy(row), exercises: moves } : null;
        }
        return null;
      }).filter(Boolean);
      if(!parsed.length){ toast("Pick at least one workout (or Clear day)", "pink"); return; }
      const main = parsed[0];
      const gym = (document.getElementById("pdeGym") || {}).value || "";
      plan[wkKey][dayName] = {
        type: main.name,
        time: main.time || undefined,
        why: main.why,
        gym: gym.trim() || undefined,
        exercises: main.exercises.length ? main.exercises : undefined,
        extra: parsed.length > 1 ? parsed.slice(1) : undefined,
      };
      save(); closeModal();
      renderAll();
      toast(`${dayName.toUpperCase()}: ${parsed.map(x => x.name).join(" + ")}`, "cyan");
    });
    const clear = document.getElementById("pdeClear");
    if(clear) clear.addEventListener("click", () => {
      delete plan[wkKey][dayName];
      save(); closeModal();
      renderAll();
    });
  });
}

// Update plan day rendering to show planned exercises preview
function startRestTimer(seconds){
  clearInterval(_restTimer);
  _restEndAt = Date.now() + seconds*1000;
  let bar = document.getElementById("restTimerBar");
  if(!bar){
    bar = document.createElement("div");
    bar.id = "restTimerBar";
    bar.className = "rest-bar";
    bar.innerHTML = `<div class="rt-icon">⏱</div><div class="rt-time" id="rtTime">${formatRest(seconds)}</div><button class="rt-skip" id="rtSkip">Skip</button><button class="rt-add" id="rtAdd">+ 30s</button>`;
    document.body.appendChild(bar);
  }
  bar.classList.add("show");
  document.getElementById("rtSkip").onclick = () => stopRestTimer();
  document.getElementById("rtAdd").onclick = () => { _restEndAt += 30000; tickRest(); };

  _restTimer = setInterval(tickRest, 250);
  tickRest();
}
function tickRest(){
  const ms = _restEndAt - Date.now();
  if(ms <= 0){
    document.getElementById("rtTime").textContent = "Done";
    if(navigator.vibrate) try { navigator.vibrate([100,50,100]); } catch(e){}
    setTimeout(stopRestTimer, 1500);
    clearInterval(_restTimer);
    return;
  }
  const s = Math.ceil(ms/1000);
  document.getElementById("rtTime").textContent = formatRest(s);
}
function formatRest(s){ const m = Math.floor(s/60); const r = s%60; return `${m}:${String(r).padStart(2,"0")}`; }
function stopRestTimer(){
  clearInterval(_restTimer);
  const bar = document.getElementById("restTimerBar");
  if(bar) bar.classList.remove("show");
}

// ---- Get previous performance for an exercise ----
function getPreviousSet(exerciseName){
  const keys = Object.keys(state.days).sort().reverse();
  for(const k of keys){
    const sessions = (state.days[k] && state.days[k].sessions) || [];
    const found = sessions.slice().reverse().find(s => s.name && s.name.toLowerCase() === exerciseName.toLowerCase());
    if(found) return { ...found, date:k };
  }
  return null;
}

// ---- Workout Session overlay ----
function openWorkoutSession(dateKey){
  const day = dayObj(dateKey);
  const dayName = ["sun","mon","tue","wed","thu","fri","sat"][new Date(dateKey+"T12:00:00").getDay()];
  const wkKey_ = weekKey(weekStart(new Date(dateKey+"T12:00:00")));
  const planned = (state.plan && state.plan[wkKey_] && state.plan[wkKey_][dayName] && state.plan[wkKey_][dayName].exercises) || [];

  // Initialize session state for the day if not present
  if(!day.workoutSession) day.workoutSession = { exercises: {} };

  // If no planned exercises, prompt user
  if(!planned.length){
    if(!confirm(`No exercises planned for ${fmtDate(dateKey)}. Open the planner to add some?`)) return;
    const t = document.querySelector('.tab[data-tab="plan"], .mtab[data-tab="plan"]');
    if(t) t.click();
    return;
  }

  // Build the overlay
  let overlay = document.getElementById("workoutOverlay");
  if(!overlay){
    overlay = document.createElement("div");
    overlay.id = "workoutOverlay";
    overlay.className = "workout-overlay";
    document.body.appendChild(overlay);
  }
  renderWorkoutSession(overlay, dateKey, planned);
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function renderWorkoutSession(overlay, dateKey, planned){
  const day = dayObj(dateKey);
  const sess = day.workoutSession;
  const planType = (function(){
    const dayName = ["sun","mon","tue","wed","thu","fri","sat"][new Date(dateKey+"T12:00:00").getDay()];
    const wkKey_ = weekKey(weekStart(new Date(dateKey+"T12:00:00")));
    return (state.plan && state.plan[wkKey_] && state.plan[wkKey_][dayName] && state.plan[wkKey_][dayName].type) || "Workout";
  })();

  const exHtml = planned.map((ex, exi) => {
    if(!sess.exercises[ex.name]) sess.exercises[ex.name] = { sets: [] };
    const exState = sess.exercises[ex.name];
    const prev = getPreviousSet(ex.name);
    const prevTxt = prev ? `Last: ${prev.weight}${unit()} × ${prev.reps} · ${fmtDate(prev.date)}` : "First time logging this";
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + " form tutorial")}`;

    // Parse scheme like "5x5 @ 135" to get default sets/reps/weight
    let dSets = 5, dReps = 5, dWeight = (prev ? prev.weight : "");
    if(ex.scheme){
      const m = ex.scheme.match(/(\d+)\s*x\s*(\d+)\s*(?:@\s*(\d+))?/i);
      if(m){ dSets = parseInt(m[1],10); dReps = parseInt(m[2],10); if(m[3]) dWeight = parseInt(m[3],10); }
    }
    // Ensure we have N empty set rows ready
    while(exState.sets.length < dSets){ exState.sets.push({ kind:"normal", reps:dReps, weight:dWeight, logged:false }); }

    const setsHtml = exState.sets.map((s, si) => `
      <div class="ws-set ${s.logged?"logged":""}" data-ex="${exi}" data-si="${si}">
        <button class="ws-num" data-kind-cycle title="${SET_KINDS.find(k=>k.k===s.kind).lbl}" style="background:${SET_KINDS.find(k=>k.k===s.kind).c}">${s.kind === "normal" ? si+1 : SET_KINDS.find(k=>k.k===s.kind).lbl[0]}</button>
        <input class="ws-reps" type="number" min="0" placeholder="${dReps}" value="${s.reps||""}">
        <input class="ws-weight" type="number" step="2.5" min="0" placeholder="${dWeight||0}" value="${s.weight||""}">
        <button class="ws-log" data-log title="Log this set">${s.logged ? "✓" : "Log"}</button>
      </div>
    `).join("");

    return `
      <div class="ws-ex" data-ex="${exi}" data-name="${escape(ex.name)}">
        <div class="ws-ex-head">
          <div>
            <div class="ws-ex-name">${escape(ex.name)}</div>
            <div class="ws-ex-prev">${escape(prevTxt)}</div>
          </div>
          <div class="ws-ex-actions">
            <button class="ws-fav ${(state.favLifts||[]).includes(ex.name) ? "on" : ""}" data-fav-lift="${escape(ex.name)}" title="Favorite this lift">♥</button>
            <a class="ws-howto" href="${ytUrl}" target="_blank" rel="noopener" title="How-To video">▶ How-To</a>
            <button class="ws-add-set" data-add-set>+ Set</button>
          </div>
        </div>
        <div class="ws-set-head">
          <span>SET</span><span>REPS</span><span>${unit().toUpperCase()}</span><span></span>
        </div>
        <div class="ws-sets">${setsHtml}</div>
      </div>
    `;
  }).join("");

  overlay.innerHTML = `
    <header class="workout-head">
      <button class="workout-back" id="woBack" aria-label="Close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <div class="workout-title">
        <div class="wt-eyebrow">${fmtDate(dateKey)} · ${escape(planType)}</div>
        <div class="wt-name">Workout Session</div>
      </div>
      <button class="wo-clock" id="woClock" title="Optional session timer — tap to start/pause">▶ 0:00</button>
      <button class="workout-done" id="woDone">Done</button>
    </header>
    <div class="workout-body">
      ${exHtml || `<div style="text-align:center;color:#888;padding:60px 20px">No exercises planned. Add some in the Planner.</div>`}
      <div class="workout-foot">
        <p style="font-size:12px;color:#888;text-align:center;line-height:1.5;margin:24px 0 0">Tap the set number circle to cycle Normal → Warm-up → Drop → Failure. Tap "Log" to record. Rest timer auto-starts after each logged set.</p>
      </div>
    </div>
  `;
  bindWorkoutSession(overlay, dateKey, planned);
}

let _woTimer = null, _woStart = null, _woElapsed = 0;
function _woTick(){
  const el = document.getElementById("woClock");
  if(!el) return;
  const total = _woElapsed + (_woStart ? Date.now() - _woStart : 0);
  const m = Math.floor(total/60000), sec = Math.floor((total%60000)/1000);
  el.textContent = `${_woStart ? "⏸" : "▶"} ${m}:${String(sec).padStart(2,"0")}`;
}
function bindWorkoutSession(overlay, dateKey, planned){
  const finish = () => {
    // save optional session duration once, then close
    if(_woElapsed || _woStart){
      if(_woStart){ _woElapsed += Date.now() - _woStart; _woStart = null; }
      clearInterval(_woTimer); _woTimer = null;
      const mins = Math.round(_woElapsed / 60000);
      if(mins >= 1){
        const day = dayObj(dateKey);
        if(!day.workoutSession) day.workoutSession = { exercises: {} };
        day.workoutSession.durationMin = (day.workoutSession.durationMin || 0) + mins;
        save();
        toast(`Session: ${mins} min`, "cyan");
      }
      _woElapsed = 0;
    }
    closeWorkoutSession();
  };
  document.getElementById("woBack").onclick = finish;
  document.getElementById("woDone").onclick = finish;
  const clock = document.getElementById("woClock");
  if(clock){
    _woTick();
    clock.onclick = () => {
      if(_woStart){ _woElapsed += Date.now() - _woStart; _woStart = null; clearInterval(_woTimer); _woTimer = null; }
      else { _woStart = Date.now(); _woTimer = setInterval(_woTick, 1000); }
      _woTick();
    };
  }

  // Cycle set kind on number-button tap
  overlay.querySelectorAll("[data-kind-cycle]").forEach(b => b.addEventListener("click", () => {
    const setEl = b.closest(".ws-set");
    const exi = +setEl.dataset.ex, si = +setEl.dataset.si;
    const exName = planned[exi].name;
    const cur = dayObj(dateKey).workoutSession.exercises[exName].sets[si];
    const idx = SET_KINDS.findIndex(k => k.k === cur.kind);
    cur.kind = SET_KINDS[(idx+1) % SET_KINDS.length].k;
    save(); renderWorkoutSession(overlay, dateKey, planned);
  }));

  // Reps / weight inputs save on blur
  overlay.querySelectorAll(".ws-reps, .ws-weight").forEach(inp => inp.addEventListener("change", () => {
    const setEl = inp.closest(".ws-set");
    const exi = +setEl.dataset.ex, si = +setEl.dataset.si;
    const exName = planned[exi].name;
    const cur = dayObj(dateKey).workoutSession.exercises[exName].sets[si];
    cur.reps = parseInt(setEl.querySelector(".ws-reps").value, 10) || 0;
    cur.weight = parseFloat(setEl.querySelector(".ws-weight").value) || 0;
    save();
  }));

  // Log button
  overlay.querySelectorAll("[data-log]").forEach(b => b.addEventListener("click", () => {
    const setEl = b.closest(".ws-set");
    const exi = +setEl.dataset.ex, si = +setEl.dataset.si;
    const exName = planned[exi].name;
    const day = dayObj(dateKey);
    const cur = day.workoutSession.exercises[exName].sets[si];
    cur.reps = parseInt(setEl.querySelector(".ws-reps").value, 10) || cur.reps;
    cur.weight = parseFloat(setEl.querySelector(".ws-weight").value) || cur.weight;
    if(!cur.reps || !cur.weight){ toast("Enter reps + weight first","pink"); return; }
    cur.logged = true;
    cur.loggedAt = Date.now();

    // Add to day.sessions for the existing systems (PRs, history, etc.)
    if(!day.sessions) day.sessions = [];
    const sessionRow = {
      id: uid(), name: exName, weight: cur.weight, reps: cur.reps, sets: 1,
      type: cur.kind === "warmup" ? "accessory" : "strength",
      notes: cur.kind !== "normal" ? SET_KINDS.find(k=>k.k===cur.kind).lbl : ""
    };
    day.sessions.push(sessionRow);
    if(typeof updateRepPRsFromSet === "function") updateRepPRsFromSet(sessionRow);
    save();

    // Animate logged state
    setEl.classList.add("logged");
    b.textContent = "✓";

    // Start rest timer (skip for warm-up sets)
    if(cur.kind !== "warmup"){
      const restSec = (state.restDefault || 90);
      startRestTimer(restSec);
    }
    toast(`${exName}: ${cur.weight}${unit()} × ${cur.reps}`, "cyan");
  }));

  // Favorite lifts
  overlay.querySelectorAll("[data-fav-lift]").forEach(b => b.addEventListener("click", () => {
    const name = b.dataset.favLift;
    const favs = getFavLifts();
    const i = favs.indexOf(name);
    if(i >= 0){ favs.splice(i, 1); b.classList.remove("on"); toast("Removed from favorite lifts", "pink"); }
    else { favs.unshift(name); state.favLifts = favs.slice(0, 40); b.classList.add("on"); toast(`♥ ${name}`, "cyan"); }
    save();
  }));

  // Add set
  overlay.querySelectorAll("[data-add-set]").forEach(b => b.addEventListener("click", () => {
    const exEl = b.closest(".ws-ex");
    const exi = +exEl.dataset.ex;
    const exName = planned[exi].name;
    const day = dayObj(dateKey);
    const sets = day.workoutSession.exercises[exName].sets;
    const last = sets[sets.length-1] || { kind:"normal", reps:5, weight:0 };
    sets.push({ kind:"normal", reps:last.reps, weight:last.weight, logged:false });
    save(); renderWorkoutSession(overlay, dateKey, planned);
  }));
}

function closeWorkoutSession(){
  const o = document.getElementById("workoutOverlay");
  if(o) o.classList.remove("open");
  document.body.style.overflow = "";
  if(typeof renderAll === "function") renderAll();
  stopRestTimer();
}

// ---- Wire "Start workout" button on planner day cards ----
function getExerciseStats(liftName){
  const sets = [];
  Object.entries(state.days).forEach(([date, day]) => {
    (day.sessions || []).forEach(s => { if(s.name === liftName) sets.push({...s, date}); });
  });
  if(!sets.length) return null;
  const heaviest = sets.reduce((b,s) => !b || s.weight > b.weight ? s : b, null);
  const mostReps = sets.reduce((b,s) => !b || s.reps > b.reps ? s : b, null);
  const bestSetVol = sets.reduce((b,s) => {
    const v = s.weight * s.reps;
    return !b || v > (b.weight * b.reps) ? s : b;
  }, null);
  // Best session volume: sum of all sets per day for this lift, find max
  const byDay = {};
  sets.forEach(s => { byDay[s.date] = (byDay[s.date] || 0) + s.weight * s.reps; });
  const bestSession = Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0];
  // True 1RM (any set with reps=1) vs projected (Epley)
  const true1RM = sets.filter(s => s.reps === 1).reduce((m,s) => Math.max(m, s.weight), 0);
  const proj1RM = sets.reduce((m,s) => {
    const e = Math.round(s.weight * (1 + s.reps/30));
    return Math.max(m, e);
  }, 0);
  // Delta vs 30 days ago
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const oldProj = sets.filter(s => new Date(s.date) < cutoff).reduce((m,s) => Math.max(m, Math.round(s.weight*(1+s.reps/30))), 0);
  const delta = oldProj ? proj1RM - oldProj : 0;
  return { heaviest, mostReps, bestSetVol, bestSessionDate: bestSession?bestSession[0]:null, bestSessionVol: bestSession?bestSession[1]:0, true1RM, proj1RM, delta, total:sets.length };
}

// Hook into lift detail to add Hevy-style stats panel
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function openLiftDetailStep_OpenLiftDetail(lift){
  const root = document.getElementById("liftsContent");
  if(!root) return;
  const stats = getExerciseStats(lift);
  if(!stats) return;
  // Insert after rep-grid
  const repGrid = root.querySelector(".rep-grid");
  if(!repGrid || root.querySelector(".lift-summary")) return;
  const summary = document.createElement("div");
  summary.className = "lift-summary";
  summary.innerHTML = `
    <div class="lift-section-h">Summary</div>
    <div class="lift-summary-grid">
      <div class="ls-cell"><div class="ls-lbl">Heaviest weight</div><div class="ls-val">${stats.heaviest.weight}${unit()}</div><div class="ls-sub">× ${stats.heaviest.reps} · ${fmtDate(stats.heaviest.date)}</div></div>
      <div class="ls-cell"><div class="ls-lbl">True 1RM</div><div class="ls-val">${stats.true1RM || "—"}${stats.true1RM?unit():""}</div><div class="ls-sub">${stats.true1RM ? "actual single" : "log a 1-rep set"}</div></div>
      <div class="ls-cell"><div class="ls-lbl">Projected 1RM</div><div class="ls-val">${stats.proj1RM}${unit()} ${stats.delta > 0 ? `<i class="ls-up">▲ ${stats.delta}</i>` : stats.delta < 0 ? `<i class="ls-dn">▼ ${Math.abs(stats.delta)}</i>` : ""}</div><div class="ls-sub">vs 30 days ago</div></div>
      <div class="ls-cell"><div class="ls-lbl">Best set volume</div><div class="ls-val">${Math.round(stats.bestSetVol.weight*stats.bestSetVol.reps)}${unit()}</div><div class="ls-sub">${stats.bestSetVol.weight}${unit()} × ${stats.bestSetVol.reps}</div></div>
      <div class="ls-cell"><div class="ls-lbl">Best session</div><div class="ls-val">${Math.round(stats.bestSessionVol)}${unit()}</div><div class="ls-sub">${stats.bestSessionDate ? fmtDate(stats.bestSessionDate) : "—"}</div></div>
      <div class="ls-cell"><div class="ls-lbl">Most reps</div><div class="ls-val">${stats.mostReps.reps}</div><div class="ls-sub">${stats.mostReps.weight}${unit()} · ${fmtDate(stats.mostReps.date)}</div></div>
    </div>
  `;
  repGrid.parentNode.insertBefore(summary, repGrid.nextSibling);
}


// =================================================================
// FIXES — day-strip swaps hub date (not popup), body part coverage
// =================================================================

// ---- Day strip click NOW changes the hub date instead of popup ----
let _hubViewDate = todayKey();
function setHubViewDate(dateKey){
  _hubViewDate = dateKey;
  currentDate = dateKey;
  if(typeof renderAll === "function") renderAll();
  // Visual: highlight selected day in strips
  document.querySelectorAll(".aw-day,.nw-day").forEach(d => {
    d.classList.toggle("selected", d.dataset.date === dateKey);
  });
}

// Override the prior delegated day-click (kept popup) — replace with hub-swap behavior
document.addEventListener("click", (e) => {
  const aw = e.target.closest(".aw-day, .nw-day");
  if(!aw) return;
  if(!aw.dataset.date) return;
  e.stopPropagation();
  e.preventDefault();
  setHubViewDate(aw.dataset.date);
}, true);

// "Today" indicator click in dashboard header returns to today
onReady(() => {
  const dash = document.getElementById("dashDate");
  if(dash){
    dash.style.cursor = "pointer";
    dash.title = "Click to return to today";
    dash.addEventListener("click", () => {
      setHubViewDate(todayKey());
      toast("Back to today", "cyan");
    });
  }
  // Add explicit "Today" button when viewing a different date
  const head = document.querySelector("#view-dashboard .view-head");
  if(head && !document.getElementById("dashTodayBtn")){
    const btn = document.createElement("button");
    btn.id = "dashTodayBtn";
    btn.className = "btn btn-ghost dash-today-btn hidden";
    btn.textContent = "← Today";
    btn.addEventListener("click", () => { setHubViewDate(todayKey()); btn.classList.add("hidden"); });
    head.querySelector(".view-head-actions").prepend(btn);
  }
});

// Hook render to show "← Today" when on a non-today date
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function renderDashboardStep_RDForToday(){
  const btn = document.getElementById("dashTodayBtn");
  if(btn){
    if(_hubViewDate !== todayKey()){
      btn.classList.remove("hidden");
      btn.textContent = `← Today (viewing ${fmtDate(_hubViewDate)})`;
    } else {
      btn.classList.add("hidden");
    }
  }
}

// =================================================================
// BODY PART COVERAGE — accountability for hitting all muscle groups
// =================================================================
const BODY_PART_MAP = {
  // Squats / lower
  "back squat":["legs","glutes"], "front squat":["legs","glutes","core"],
  "box squat":["legs","glutes"], "front box squat":["legs","glutes"],
  "front pause squat":["legs","glutes"], "high bar back squat":["legs","glutes"],
  "low bar back squat":["legs","glutes"], "overhead squat":["legs","glutes","shoulders","core"],
  "pause squat":["legs","glutes"], "split squat":["legs","glutes"],
  "zercher squat":["legs","glutes","core"],
  // Deadlifts / posterior
  "deadlift":["back","legs","glutes"], "sumo deadlift":["legs","glutes","back"],
  "romanian deadlift":["back","glutes","legs"], "stiff-leg deadlift":["back","glutes","legs"],
  "trap-bar deadlift":["back","legs","glutes"], "deficit deadlift":["back","legs","glutes"],
  // Cleans / oly
  "clean":["legs","glutes","back","shoulders"], "power clean":["legs","glutes","back","shoulders"],
  "hang clean":["back","shoulders","legs"], "hang power clean":["back","shoulders","legs"],
  "squat clean":["legs","glutes","back","shoulders"], "clean pull":["back","legs"],
  "clean extension":["back","legs"], "block clean":["back","shoulders","legs"],
  // Snatches
  "snatch":["legs","glutes","back","shoulders"], "power snatch":["legs","back","shoulders"],
  "hang snatch":["back","shoulders"], "hang power snatch":["back","shoulders"],
  "squat snatch":["legs","glutes","back","shoulders"], "snatch pull":["back","legs"],
  "snatch balance":["shoulders","legs"], "block snatch":["back","shoulders"],
  // Press / chest+shoulders
  "strict press":["shoulders","arms"], "push press":["shoulders","legs","arms"],
  "push jerk":["shoulders","legs"], "split jerk":["shoulders","legs"],
  "bench press":["chest","arms","shoulders"], "incline bench press":["chest","shoulders","arms"],
  "close-grip bench":["chest","arms"], "db bench":["chest","arms","shoulders"],
  "db press":["shoulders","arms"],
  // Pull / back
  "pull-up":["back","arms"], "strict pull-up":["back","arms"], "weighted pull-up":["back","arms"],
  "chin-up":["back","arms"], "chest-to-bar":["back","arms"],
  "muscle-up":["back","arms","chest"], "bent row":["back","arms"], "pendlay row":["back","arms"],
  // Other
  "thruster":["legs","glutes","shoulders","arms"], "hip thrust":["glutes","legs"],
  "good morning":["back","glutes","legs"], "clean & jerk":["legs","glutes","back","shoulders"],
  "floor press":["chest","arms"]
};
const ALL_BODY_PARTS = ["chest","back","shoulders","arms","legs","glutes","core"];

function getBodyCoverage(daysBack){
  daysBack = daysBack || 14;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysBack);
  const tally = {}; ALL_BODY_PARTS.forEach(p => tally[p] = 0);
  Object.entries(state.days).forEach(([date, day]) => {
    if(new Date(date) < cutoff) return;
    (day.sessions || []).forEach(s => {
      const parts = partsForExercise(s.name);
      parts.forEach(p => { tally[p] = (tally[p] || 0) + 1; });
    });
  });
  return tally;
}

const PART_SUGGESTIONS = {
  chest: "Bench Press, Incline DB Press, Push-ups, Cable Fly",
  back: "Pull-ups, Bent Row, Lat Pulldown, Deadlift",
  shoulders: "Strict Press, Lateral Raise, Push Press, Face Pull",
  arms: "Curls, Triceps Pushdown, Close-grip Bench, Chin-ups",
  legs: "Back Squat, Front Squat, Leg Press, Lunges",
  glutes: "Hip Thrust, Romanian Deadlift, Glute Bridge, Bulgarian Split Squat",
  core: "Plank, Toes-to-Bar, Hollow Hold, Hanging Leg Raise"
};

function renderBodyCoverage(){
  const fitView = document.getElementById("view-fitness");
  if(!fitView) return;
  let card = document.getElementById("bodyCoverageCard");
  if(!card){
    const grid = fitView.querySelector(".grid-12");
    if(!grid) return;
    card = document.createElement("div");
    card.id = "bodyCoverageCard";
    card.className = "card span-12";
    const dayCard = document.getElementById("fitDayCard");
    if(dayCard && dayCard.nextSibling) grid.insertBefore(card, dayCard.nextSibling);
    else grid.appendChild(card);
  }

  const cov14 = getBodyCoverage(14);
  const totalSessions = Object.values(cov14).reduce((a,b)=>a+b, 0);
  const sortedParts = ALL_BODY_PARTS.slice().sort((a,b) => cov14[b] - cov14[a]);
  const max = Math.max(1, ...Object.values(cov14));

  const barsHtml = sortedParts.map(p => {
    const n = cov14[p];
    const pct = (n / max) * 100;
    const status = n === 0 ? "missing" : n < 2 ? "low" : "good";
    return `<div class="bp-row bp-${status}">
      <div class="bp-name">${p.charAt(0).toUpperCase()+p.slice(1)}</div>
      <div class="bp-bar"><span style="width:${pct}%"></span></div>
      <div class="bp-count">${n} ${n===1?"set":"sets"}</div>
    </div>`;
  }).join("");

  const missing = ALL_BODY_PARTS.filter(p => cov14[p] === 0);
  const low = ALL_BODY_PARTS.filter(p => cov14[p] > 0 && cov14[p] < 2);

  let suggestion = "";
  if(missing.length){
    suggestion = `<div class="bp-suggest"><b>Missing in last 14 days:</b> ${missing.map(m=>m.charAt(0).toUpperCase()+m.slice(1)).join(", ")}.<br><i>Try: ${PART_SUGGESTIONS[missing[0]]}</i></div>`;
  } else if(low.length){
    suggestion = `<div class="bp-suggest bp-suggest-low"><b>👀 Under-trained:</b> ${low.map(m=>m.charAt(0).toUpperCase()+m.slice(1)).join(", ")} (only 1 set each).<br><i>Try: ${PART_SUGGESTIONS[low[0]]}</i></div>`;
  } else if(totalSessions > 0){
    suggestion = `<div class="bp-suggest bp-suggest-good"><b>✓ Balanced training</b> — every body part hit in the last 14 days.</div>`;
  }

  card.innerHTML = `
    <div class="card-head">
      <span class="card-eyebrow">Body Part Coverage · last 14 days</span>
      <span class="card-meta">${totalSessions} sets logged</span>
    </div>
    ${totalSessions === 0
      ? `<div class="bp-empty">No lifts logged in the last 14 days. Log a session to see coverage.</div>`
      : `<div class="bp-list">${barsHtml}</div>${suggestion}`}
  `;
}


// ============================================================
// FEATURES 2-7 — appended block
// ============================================================

function _ensureSection(stateKey, fallback){
  if(!state[stateKey]) state[stateKey] = fallback;
  return state[stateKey];
}
function _readImageAsBase64(file, maxSize){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const m = maxSize || 1280;
        let w = img.width, h = img.height;
        if(w > m || h > m){
          const ratio = Math.min(m/w, m/h);
          w = Math.round(w*ratio); h = Math.round(h*ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ base64: dataUrl.split(",")[1], thumb: dataUrl });
      };
      img.onerror = reject;
      img.src = r.result;
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Manual InBody / DEXA / smart-scale entry. This is the path that always
// works; the photo parser is the convenience on top of it.
function openInBodyManualModal(){
  const lastW = _latestWeight() || "";
  openModal("Body composition", `
    <p class="hn-intro">Type the numbers straight off your InBody, DEXA or scale printout. Body fat % is the one that matters most — it unlocks lean-mass protein targets and body-fat goals in <b>Design my plan</b>.</p>
    <div class="form-grid">
      <label><span>Date</span><input id="ibmDate" type="date" value="${todayKey()}"></label>
      <label><span>Weight (${unit()})</span><input id="ibmW" type="number" step="0.1" value="${lastW}"></label>
      <label><span>Body fat %</span><input id="ibmBF" type="number" step="0.1" placeholder="e.g. 28.4"></label>
      <label><span>Lean / muscle mass (${unit()})</span><input id="ibmLean" type="number" step="0.1" placeholder="optional"></label>
      <label><span>Visceral fat level</span><input id="ibmVisc" type="number" step="0.1" placeholder="optional"></label>
      <label><span>Body water (${unit()})</span><input id="ibmWater" type="number" step="0.1" placeholder="optional"></label>
    </div>
    <p class="gd-note">If lean mass is blank it's worked out from weight and body fat %.</p>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      ${(state.ai && state.ai.key) ? `<button class="btn btn-ghost" id="ibmPhoto">USE A PHOTO INSTEAD</button>` : ""}
      <button class="btn btn-cyan" id="ibmSave">SAVE</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const ph = document.getElementById("ibmPhoto");
    if(ph) ph.addEventListener("click", () => { closeModal(); setTimeout(openInBodyModal, 120); });
    document.getElementById("ibmSave").addEventListener("click", () => {
      const num = (id) => { const v = parseFloat((document.getElementById(id)||{}).value); return isNaN(v) ? null : v; };
      const date = document.getElementById("ibmDate").value || todayKey();
      const w = num("ibmW"), bf = num("ibmBF");
      let lean = num("ibmLean");
      if(lean == null && w != null && bf != null) lean = Math.round(w * (1 - bf/100) * 10) / 10;
      if(w == null && bf == null){ toast("Enter at least weight or body fat %", "pink"); return; }
      const added = [];
      if(w != null){ state.weights.push({ date, val: w, source:"scan" }); added.push("weight"); }
      if(bf != null){ state.measurements.push({ date, type:"bodyfat", val: bf }); added.push("body fat %"); }
      if(lean != null){ state.measurements.push({ date, type:"lean", val: lean }); added.push("lean mass"); }
      const visc = num("ibmVisc");
      if(visc != null){ state.measurements.push({ date, type:"visceral", val: visc }); added.push("visceral fat"); }
      const bw = num("ibmWater");
      if(bw != null){ state.measurements.push({ date, type:"bodywater", val: bw }); added.push("body water"); }
      state.weights.sort((a,b) => a.date.localeCompare(b.date));
      save(); closeModal(); renderAll();
      toast(`Saved ${added.join(", ")}`, "cyan");
    });
  });
}

// ---------- FEATURE 2: InBody scan ----------
function openInBodyModal(){
  if(!state.ai || !state.ai.key){
    // No AI key — don't dead-end. Typing four numbers off the printout
    // takes twenty seconds and gives the app everything it needs.
    openInBodyManualModal();
    return;
  }
  openModal("Upload InBody scan",
    `<p style="font-size:13px;color:#555;line-height:1.6;margin:0 0 12px">
       Snap or upload your latest InBody printout. We'll extract weight, body fat %, lean mass, and visceral fat — then save it to your Body history.
     </p>
     <input type="file" id="ibFile" accept="image/*" capture="environment" style="display:block;margin-bottom:14px">
     <div id="ibPreview" style="margin-bottom:12px"></div>
     <button type="button" class="btn btn-cyan" id="ibParseBtn" disabled>Parse scan</button>
     <div id="ibStatus" style="font-size:12px;color:#888;margin-top:10px"></div>`,
    () => {
      let pendingThumb = null, pendingBase64 = null;
      $("#ibFile").addEventListener("change", async (e) => {
        const f = e.target.files[0]; if(!f) return;
        $("#ibStatus").textContent = "Processing image...";
        try{
          const { base64, thumb } = await _readImageAsBase64(f, 1280);
          pendingThumb = thumb; pendingBase64 = base64;
          $("#ibPreview").innerHTML = `<img src="${thumb}" style="max-width:100%;border-radius:8px;max-height:240px;display:block">`;
          $("#ibParseBtn").disabled = false;
          $("#ibStatus").textContent = "Ready to parse.";
        }catch(err){ $("#ibStatus").textContent = "Couldn't read image: "+err.message; }
      });
      $("#ibParseBtn").addEventListener("click", async () => {
        if(!pendingBase64) return;
        $("#ibParseBtn").disabled = true;
        $("#ibStatus").textContent = "Sending to AI...";
        const prompt = `This is an InBody body composition scan. Extract the values you can read and return ONLY a JSON object (no markdown, no commentary) with this shape:
{"weightLb":number|null,"weightKg":number|null,"bodyFatPct":number|null,"skeletalMuscleMassLb":number|null,"skeletalMuscleMassKg":number|null,"leanBodyMassLb":number|null,"visceralFatLevel":number|null,"bmr":number|null,"bodyFatMassLb":number|null,"scanDate":"YYYY-MM-DD"|null}
Use null for any field you cannot confidently read. Return ONLY the JSON.`;
        try{
          const text = await aiRequest(prompt, pendingBase64);
          const cleaned = text.replace(/```json\s*|```\s*/g, "").trim();
          const parsed = JSON.parse(cleaned);
          let wLb = parsed.weightLb || (parsed.weightKg ? parsed.weightKg * 2.2046 : null);
          let smLb = parsed.skeletalMuscleMassLb || (parsed.skeletalMuscleMassKg ? parsed.skeletalMuscleMassKg * 2.2046 : null);
          const date = parsed.scanDate || todayKey();
          _ensureSection("inbodyScans", []).push({
            id: uid(), date, source:"inbody", thumb: pendingThumb,
            weightLb: wLb, bodyFatPct: parsed.bodyFatPct,
            skeletalMuscleMassLb: smLb, leanBodyMassLb: parsed.leanBodyMassLb,
            visceralFatLevel: parsed.visceralFatLevel, bmr: parsed.bmr,
            bodyFatMassLb: parsed.bodyFatMassLb,
          });
          if(wLb) state.weights.push({ date, val: Math.round(wLb*10)/10, source:"inbody" });
          if(parsed.bodyFatPct) state.measurements.push({ date, type:"Body Fat %", val: parsed.bodyFatPct });
          save();
          $("#ibStatus").innerHTML = `<span style="color:#0a8">✓ Parsed. Weight: ${wLb ? Math.round(wLb*10)/10+" lb" : "—"} · BF: ${parsed.bodyFatPct ?? "—"}% · LBM: ${parsed.leanBodyMassLb ?? "—"}</span>`;
          setTimeout(() => { closeModal(); renderAll(); toast("InBody scan saved", "ok"); }, 900);
        }catch(err){
          $("#ibStatus").innerHTML = `<span style="color:#c33">Parse failed: ${escape(err.message)}. Try a clearer photo.</span>`;
          $("#ibParseBtn").disabled = false;
        }
      });
    }
  );
}

// ---------- FEATURE 3: Adaptive macros ----------
function _adaptiveAvgWeight(daysBack){
  if(!state.weights || !state.weights.length) return null;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - daysBack);
  const recent = state.weights.filter(w => new Date(w.date) >= cutoff);
  if(!recent.length) return null;
  return recent.reduce((s,w) => s + w.val, 0) / recent.length;
}
function checkAdaptiveMacros(){
  const am = _ensureSection("adaptive", { lastReviewAt: null, history: [], dismissedSuggestion: null });
  if(am.lastReviewAt){
    const daysSince = (Date.now() - new Date(am.lastReviewAt).getTime()) / 86400000;
    if(daysSince < 7) return null;
  }
  const p = state.profile || {};
  if(!p.goal || p.goal === "maintain") return null;
  const w7  = _adaptiveAvgWeight(7);
  const w14 = _adaptiveAvgWeight(14);
  if(!w7 || !w14) return null;
  const observedRate = (w7 - w14);
  const targetRate = p.goal === "lose" ? -(p.goalRateLbWk||1) : (p.goalRateLbWk||1);
  if(targetRate === 0) return null;
  const ratio = observedRate / targetRate;
  if(ratio >= 0.8 && ratio <= 1.5) return null;
  const direction = (p.goal === "lose")
    ? (observedRate > targetRate ? -100 : +100)
    : (observedRate < targetRate ? +100 : -100);
  return {
    observedRate: Math.round(observedRate*100)/100,
    targetRate,
    suggestedDelta: direction,
    newCal: state.goals.cal + direction,
    reviewedAt: new Date().toISOString()
  };
}
function renderAdaptiveCard(){
  const sug = checkAdaptiveMacros();
  const dash = $("#view-dashboard");
  const existing = $("#adaptiveCard");
  if(existing) existing.remove();
  if(!sug || !dash) return;
  const am = state.adaptive || {};
  if(am.dismissedSuggestion === sug.suggestedDelta + "@" + state.goals.cal) return;
  const card = document.createElement("div");
  card.id = "adaptiveCard";
  card.className = "card adaptive-card";
  const sign = sug.suggestedDelta > 0 ? "+" : "";
  card.innerHTML = `
    <div class="card-head"><span class="card-eyebrow">✨ Adaptive macros · weekly review</span></div>
    <p class="adaptive-msg">Your 7-day weight trend is <strong>${sug.observedRate > 0 ? "+":""}${sug.observedRate} lb/wk</strong>, target <strong>${sug.targetRate > 0 ? "+":""}${sug.targetRate} lb/wk</strong>. Try <strong>${sign}${sug.suggestedDelta} cal/day</strong> for a week and we'll re-check.</p>
    <div class="adaptive-actions">
      <button type="button" class="btn btn-cyan btn-sm" id="adaptiveApply">Apply (${sug.newCal} cal)</button>
      <button type="button" class="btn btn-ghost btn-sm" id="adaptiveDismiss">Not now</button>
    </div>`;
  dash.prepend(card);
  $("#adaptiveApply").addEventListener("click", () => {
    const oldCal = state.goals.cal;
    state.goals.cal = sug.newCal;
    const goal = (state.profile && state.profile.goal) || "maintain";
    let pPct=0.30, cPct=0.40, fPct=0.30;
    if(goal === "lose")  { pPct=0.35; cPct=0.35; fPct=0.30; }
    if(goal === "gain")  { pPct=0.28; cPct=0.45; fPct=0.27; }
    state.goals.protein = Math.round(sug.newCal * pPct / 4);
    state.goals.carbs   = Math.round(sug.newCal * cPct / 4);
    state.goals.fat     = Math.round(sug.newCal * fPct / 9);
    state.adaptive.history.push({ date:new Date().toISOString(), from:oldCal, to:sug.newCal, observedRate:sug.observedRate, targetRate:sug.targetRate });
    state.adaptive.lastReviewAt = sug.reviewedAt;
    state.adaptive.dismissedSuggestion = null;
    save(); toast("New target applied", "ok"); renderAll();
  });
  $("#adaptiveDismiss").addEventListener("click", () => {
    state.adaptive.lastReviewAt = sug.reviewedAt;
    state.adaptive.dismissedSuggestion = sug.suggestedDelta + "@" + state.goals.cal;
    save(); card.remove();
  });
}

// ---------- FEATURE 4: Barcode scan ----------
function _barcodeCacheGet(upc){
  const cache = _ensureSection("barcodeCache", {});
  return cache[upc] || null;
}
function _barcodeCacheSet(upc, food){
  const cache = _ensureSection("barcodeCache", {});
  cache[upc] = food; save();
}
async function _fetchOpenFoodFacts(upc){
  const cached = _barcodeCacheGet(upc);
  if(cached) return cached;
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(upc)}.json`;
  const r = await fetch(url);
  const j = await r.json();
  if(j.status !== 1 || !j.product) throw new Error("Product not found in OpenFoodFacts");
  const p = j.product, n = p.nutriments || {};
  const food = {
    upc,
    name: (p.product_name || p.brands || "Unknown product").slice(0,60),
    brand: p.brands || "",
    serving: p.serving_size || "100 g",
    cal: Math.round(n["energy-kcal_serving"] || n["energy-kcal_100g"] || 0),
    p: Math.round((n.proteins_serving || n.proteins_100g || 0) * 10) / 10,
    c: Math.round((n.carbohydrates_serving || n.carbohydrates_100g || 0) * 10) / 10,
    f: Math.round((n.fat_serving || n.fat_100g || 0) * 10) / 10,
    fiber: Math.round((n.fiber_serving || n.fiber_100g || 0) * 10) / 10,
    sugar: Math.round((n.sugars_serving || n.sugars_100g || 0) * 10) / 10,
    micros: _microsFromOFF(n, true),
  };
  _barcodeCacheSet(upc, food);
  return food;
}

// ---- OpenFoodFacts search (free, no key, ~2M items) ----
const _offSearchCache = new Map(); // query → { ts, items }
const _OFF_TTL_MS = 24 * 60 * 60 * 1000;
async function _searchOpenFoodFacts(query, signal){
  const q = query.trim().toLowerCase();
  if(q.length < 3) return [];
  const cached = _offSearchCache.get(q);
  if(cached && (Date.now() - cached.ts) < _OFF_TTL_MS) return cached.items;
  const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(q)}&fields=code,product_name,brands,serving_size,nutriments&page_size=20&sort_by=popularity_key`;
  const r = await fetch(url, { signal });
  if(!r.ok) throw new Error("OFF search failed");
  const j = await r.json();
  const items = (j.products || [])
    .filter(p => p.product_name && p.nutriments && (p.nutriments["energy-kcal_100g"] || p.nutriments["energy-kcal_serving"]))
    .slice(0, 12)
    .map(p => {
      const n = p.nutriments || {};
      const hasServing = n["energy-kcal_serving"] != null && p.serving_size;
      const cal = Math.round(hasServing ? n["energy-kcal_serving"] : (n["energy-kcal_100g"] || 0));
      const pr  = Math.round((hasServing ? n.proteins_serving       : n.proteins_100g       || 0) * 10) / 10;
      const cb  = Math.round((hasServing ? n.carbohydrates_serving  : n.carbohydrates_100g  || 0) * 10) / 10;
      const ft  = Math.round((hasServing ? n.fat_serving            : n.fat_100g            || 0) * 10) / 10;
      return {
        id: "off-" + p.code,
        name: ((p.brands ? p.brands.split(",")[0].trim() + " · " : "") + p.product_name).slice(0,70),
        serving: hasServing ? p.serving_size : "100 g",
        cal, p: pr, c: cb, f: ft,
        fiber: (() => { const v = hasServing ? n.fiber_serving : n.fiber_100g; return v != null ? Math.round(v*10)/10 : undefined; })(),
        sugar: (() => { const v = hasServing ? n.sugars_serving : n.sugars_100g; return v != null ? Math.round(v*10)/10 : undefined; })(),
        micros: _microsFromOFF(n, hasServing),
        _source: "off", _upc: p.code,
      };
    });
  _offSearchCache.set(q, { ts: Date.now(), items });
  return items;
}
// Lazy-load ZXing for iOS / browsers that lack BarcodeDetector
let _zxingPromise = null;
function _loadZXing(){
  if(window.ZXingBrowser) return Promise.resolve(window.ZXingBrowser);
  if(_zxingPromise) return _zxingPromise;
  _zxingPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js";
    s.onload = () => window.ZXingBrowser ? resolve(window.ZXingBrowser) : reject(new Error("ZXing failed to expose globals"));
    s.onerror = () => reject(new Error("Failed to load ZXing barcode library"));
    document.head.appendChild(s);
  });
  return _zxingPromise;
}

async function openBarcodeScanner(meal){
  const hasNativeDetector = "BarcodeDetector" in window;
  openModal("Scan barcode",
    `<video id="bcVideo" playsinline muted autoplay style="width:100%;border-radius:8px;background:#000;max-height:50vh"></video>
     <p id="bcStatus" style="font-size:12px;color:#888;margin-top:10px">Point your camera at the barcode…</p>
     <button type="button" class="btn btn-ghost btn-sm" id="bcManualSwitch" style="margin-top:8px;width:100%">Type UPC instead</button>`,
    async (root) => {
      const video = root.querySelector("#bcVideo");
      const status = root.querySelector("#bcStatus");
      let stream, raf, zxControls, stopped = false;
      const stop = () => {
        stopped = true;
        if(raf) cancelAnimationFrame(raf);
        if(zxControls){ try{ zxControls.stop(); }catch(e){} zxControls = null; }
        if(stream) stream.getTracks().forEach(t => t.stop());
      };
      root.querySelector("#bcManualSwitch").addEventListener("click", () => { stop(); openBarcodeManual(meal); });
      $("#modal").addEventListener("transitionend", stop, { once:true });

      const onUPC = async (upc) => {
        if(stopped) return;
        status.textContent = `Found ${upc} — looking up…`;
        stop();
        try{
          const food = await _fetchOpenFoodFacts(upc);
          _barcodeAddFlow(meal, food);
        }catch(err){
          status.innerHTML = `<span style="color:var(--pink)">Lookup failed: ${escape(err.message)}.</span> <a href="#" id="bcRetry" style="color:var(--cyan)">Try another</a>`;
          const retry = root.querySelector("#bcRetry");
          if(retry) retry.addEventListener("click", (e) => { e.preventDefault(); closeModal(); openBarcodeScanner(meal); });
        }
      };

      try{
        if(hasNativeDetector){
          // Native path (Chrome/Edge desktop, some Android)
          stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"environment" }});
          video.srcObject = stream; await video.play();
          const detector = new BarcodeDetector({ formats:["ean_13","ean_8","upc_a","upc_e","code_128"] });
          const tick = async () => {
            if(stopped) return;
            try{
              const codes = await detector.detect(video);
              if(codes && codes.length){ onUPC(codes[0].rawValue); return; }
            }catch(e){ /* keep scanning */ }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        } else {
          // ZXing path (iOS Safari, Firefox)
          status.textContent = "Loading scanner…";
          const ZX = await _loadZXing();
          if(stopped) return;
          status.textContent = "Point your camera at the barcode…";
          const reader = new ZX.BrowserMultiFormatReader();
          zxControls = await reader.decodeFromVideoDevice(undefined, video, (result, err, controls) => {
            if(stopped) { try{ controls.stop(); }catch(e){} return; }
            if(result){
              const text = result.getText ? result.getText() : (result.text || "");
              if(text) onUPC(text);
            }
          });
        }
      }catch(err){
        status.innerHTML = `<span style="color:var(--pink)">Camera unavailable: ${escape(err.message || "permission denied")}.</span>`;
        setTimeout(() => { if(!stopped){ stop(); openBarcodeManual(meal); } }, 1200);
      }
    }
  );
}
function openBarcodeManual(meal, prefix){
  openModal("Enter UPC manually",
    `${prefix ? `<p style="color:#c80;font-size:13px;margin:0 0 10px">${escape(prefix)}</p>` : ""}
     <label style="display:block;margin-bottom:10px">
       <span style="font-size:11px;letter-spacing:1px;color:#888">UPC / EAN code</span>
       <input type="text" id="bcManualUpc" placeholder="012345678901" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:16px" autocomplete="off" inputmode="numeric">
     </label>
     <button type="button" class="btn btn-cyan" id="bcManualGo">Look up</button>
     <p id="bcManualStatus" style="font-size:12px;color:#888;margin-top:10px"></p>`,
    () => {
      $("#bcManualUpc").focus();
      $("#bcManualGo").addEventListener("click", async () => {
        const upc = $("#bcManualUpc").value.trim();
        if(!upc) return;
        $("#bcManualStatus").textContent = "Looking up...";
        try{
          const food = await _fetchOpenFoodFacts(upc);
          _barcodeAddFlow(meal, food);
        }catch(err){
          $("#bcManualStatus").innerHTML = `<span style="color:#c33">${escape(err.message)}</span>`;
        }
      });
    }
  );
}
function _barcodeAddFlow(meal, food){
  openModal(`Add: ${food.name}`,
    `<div style="font-size:12px;color:#888;margin-bottom:6px">${escape(food.brand||"")} · UPC ${escape(food.upc)}</div>
     <p style="font-size:13px;color:#555;margin:0 0 12px">Per <b>${escape(food.serving)}</b>: ${food.cal} cal · P ${food.p} · C ${food.c} · F ${food.f}</p>
     <label style="display:block;margin-bottom:10px">
       <span style="font-size:11px;letter-spacing:1px;color:#888">Servings</span>
       <input type="number" id="bcServings" value="1" min="0.1" max="20" step="0.1" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:16px">
     </label>
     <button type="button" class="btn btn-cyan" id="bcAddBtn">Add to ${capitalize(meal)}</button>
     <button type="button" class="btn btn-ghost btn-sm" id="bcSaveCustom" style="margin-top:8px">Also save as custom food</button>`,
    () => {
      $("#bcAddBtn").addEventListener("click", () => {
        const mult = parseFloat($("#bcServings").value) || 1;
        dayObj(currentDate).meals[meal].push(mealItemFrom(food, mult));
        save(); closeModal(); renderAll();
        toast(`Added ${food.name}`, "cyan");
      });
      $("#bcSaveCustom").addEventListener("click", () => {
        const id = "f-bc-" + food.upc;
        if(!state.customFoods.find(x => x.id === id)){
          state.customFoods.push({ id, name: food.name, serving: food.serving,
            cal: food.cal, p: food.p, c: food.c, f: food.f,
            fiber: food.fiber, sugar: food.sugar, micros: food.micros,
            custom:true, upc: food.upc });
          save(); toast("Saved to custom foods", "ok");
        }else{ toast("Already saved", "ok"); }
      });
    }
  );
}

// ---------- FEATURE 5: Anatomy heatmap ----------
const ANATOMY_TARGETS = { chest:10, back:12, shoulders:8, arms:8, legs:12, glutes:8, core:6 };
function _anatomyVolumeByPart(daysBack){
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - (daysBack||7));
  const counts = { chest:0, back:0, shoulders:0, arms:0, legs:0, glutes:0, core:0 };
  if(typeof BODY_PART_MAP === "undefined") return counts;
  Object.keys(state.days).forEach(k => {
    if(new Date(k) < cutoff) return;
    const day = state.days[k];
    (day.sessions || []).forEach(s => {
      const parts = partsForExercise(s.lift || s.exercise || s.name);
      const sets = (s.sets && s.sets.length) || 1;
      parts.forEach(p => { if(counts[p] !== undefined) counts[p] += sets; });
    });
  });
  return counts;
}
function openAnatomyDetail(part, sets){
  const target = ANATOMY_TARGETS[part] || 10;
  const status = sets === 0 ? "Missing" : sets < target * 0.6 ? "Under-trained" : "On track";
  const candidates = [];
  if(typeof BODY_PART_MAP !== "undefined"){
    Object.keys(BODY_PART_MAP).forEach(ex => {
      if(BODY_PART_MAP[ex].includes(part)) candidates.push(ex);
    });
  }
  const list = candidates.slice(0, 8).map(c => `<li style="padding:6px 0;border-bottom:1px solid #eee;text-transform:capitalize">${escape(c)}</li>`).join("");
  openModal(`${capitalize(part)} · ${status}`,
    `<p style="margin:0 0 10px;color:#555">Last 7 days: <strong>${sets} sets</strong> (target: ~${target}).</p>
     <p style="font-size:13px;color:#888;margin:0 0 14px">Suggested exercises:</p>
     <ul style="list-style:none;padding:0;margin:0 0 14px">${list || `<li style="color:#bbb">No suggestions available.</li>`}</ul>
     <button type="button" class="btn btn-cyan" id="anaGoFitness" data-go="fitness">Log a lift</button>`,
    () => { $("#anaGoFitness").addEventListener("click", closeModal); }
  );
}

// ---------- FEATURE 6: Programs ----------
function openProgramsModal(){
  const programs = (DATA.programs || []);
  if(!programs.length) return openModal("Programs", `<p>No programs available.</p>`);
  const cards = programs.map(p => `
    <div class="prog-card">
      <div class="prog-name">${escape(p.name)}</div>
      <div class="prog-meta">${p.days} days/week</div>
      <p class="prog-focus">${escape(p.focus)}</p>
      <div class="prog-sample">${escape(p.sample)}</div>
      <button type="button" class="btn btn-cyan btn-sm prog-apply" data-id="${p.id}">Apply program</button>
    </div>
  `).join("");
  openModal("Browse programs", `<div class="prog-list">${cards}</div>`, () => {
    $$(".prog-apply").forEach(b => b.addEventListener("click", () => openApplyProgramModal(b.dataset.id)));
  });
}
function openApplyProgramModal(programId){
  const prog = (DATA.programs || []).find(p => p.id === programId);
  if(!prog) return;
  const start = todayKey();
  openModal(`Apply: ${prog.name}`,
    `<p style="font-size:13px;color:#555;margin:0 0 12px">Write this program into your planner. Past weeks stay locked. Existing planned days are preserved.</p>
     <label style="display:block;margin-bottom:10px">
       <span style="font-size:11px;letter-spacing:1px;color:#888">Start date</span>
       <input type="date" id="papStart" value="${start}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:16px">
     </label>
     <label style="display:block;margin-bottom:10px">
       <span style="font-size:11px;letter-spacing:1px;color:#888">Number of weeks</span>
       <input type="number" id="papWeeks" value="4" min="1" max="12" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:16px">
     </label>
     <button type="button" class="btn btn-cyan" id="papGo">Apply ${escape(prog.name)}</button>`,
    () => {
      $("#papGo").addEventListener("click", () => applyProgram(prog, $("#papStart").value, parseInt($("#papWeeks").value, 10)));
    }
  );
}
function _isoWeekKeyForDate(date){
  if(typeof weekKey === "function") return weekKey(date);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const wk = Math.ceil((((d - yearStart)/86400000)+1)/7);
  return `${d.getUTCFullYear()}-W${String(wk).padStart(2,"0")}`;
}
const _PROG_DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function applyProgram(prog, startDateStr, nWeeks){
  const plan = _ensureSection("plan", {});
  const start = new Date(startDateStr + "T00:00:00");
  let conflicts = 0, scheduled = 0;
  const cur = new Date(start);
  const offset = (cur.getDay() + 6) % 7;
  cur.setDate(cur.getDate() - offset);
  for(let w = 0; w < nWeeks; w++){
    const wkDate = new Date(cur); wkDate.setDate(cur.getDate() + w*7);
    const wk = _isoWeekKeyForDate(wkDate);
    if(!plan[wk]) plan[wk] = {};
    Object.keys(prog.dayTemplates).forEach(idx => {
      const dayName = _PROG_DAY_NAMES[parseInt(idx,10)];
      const existing = plan[wk][dayName];
      if(existing && existing.type){ conflicts++; return; }
      plan[wk][dayName] = { type: prog.dayTemplates[idx], notes: `${prog.name} · auto-scheduled` };
      scheduled++;
    });
  }
  save();
  closeModal();
  toast(`Scheduled ${scheduled} workouts${conflicts ? " ("+conflicts+" days kept)" : ""}`, "ok");
}

// ---------- FEATURE 7: Apple Health workaround ----------
const AH_TEMPLATE = {
  exportedAt: "2026-04-26T23:00:00Z",
  date: "2026-04-26",
  weightLb: 150.0,
  steps: 8500,
  sleepHours: 7.5,
  activeEnergyKcal: 420
};
function copyHealthTemplate(){
  const txt = JSON.stringify(AH_TEMPLATE, null, 2);
  if(navigator.clipboard){
    navigator.clipboard.writeText(txt).then(
      () => toast("Template copied — paste into your Shortcut", "ok"),
      () => toast("Copy failed", "err")
    );
  }
}
function importHealthFile(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try{
        const data = JSON.parse(r.result);
        const records = Array.isArray(data) ? data : [data];
        let imported = 0;
        records.forEach(rec => {
          if(!rec.date) return;
          if(rec.weightLb) state.weights.push({ date: rec.date, val: rec.weightLb, source:"applehealth" });
          _ensureSection("appleHealth", []).push({
            date: rec.date, steps: rec.steps, sleepHours: rec.sleepHours,
            activeEnergyKcal: rec.activeEnergyKcal, importedAt: new Date().toISOString()
          });
          imported++;
        });
        save();
        const status = $("#ahStatus");
        if(status) status.textContent = `Imported ${imported} record(s) at ${new Date().toLocaleString()}.`;
        toast(`Imported ${imported} health record(s)`, "ok");
        renderAll();
        resolve(imported);
      }catch(err){ reject(err); }
    };
    r.onerror = reject;
    r.readAsText(file);
  });
}

// ---------- QUICK LOG + MEAL TEMPLATES ----------
function _trackRecent(food){
  if(!state.recentFoods) state.recentFoods = [];
  // Keep last 12, dedupe by name
  state.recentFoods = state.recentFoods.filter(x => x.name !== food.name);
  state.recentFoods.unshift({ name:food.name, serving:food.serving, cal:food.cal, p:food.p, c:food.c, f:food.f });
  state.recentFoods = state.recentFoods.slice(0, 12);
}
function renderQuickLogPane(meal, allFoods, filter){
  const recents = (state.recentFoods || []).slice(0, 8);
  const filterLower = (filter || "").toLowerCase();
  const matchAll = filter ? allFoods.filter(x => x.name.toLowerCase().includes(filterLower)) : allFoods;
  const renderRow = (food) => `
    <li class="ql-row" data-food='${escape(JSON.stringify({name:food.name,serving:food.serving,cal:food.cal,p:food.p,c:food.c,f:food.f}))}'>
      <div class="ql-info">
        <div class="ql-name">${escape(food.name)}</div>
        <div class="ql-meta">${escape(food.serving||"")} · ${food.cal} cal · P${food.p}</div>
      </div>
      <button class="ql-add" type="button">+</button>
    </li>
  `;
  const recList = $("#qlRecents");
  if(recList){
    const favs = (state.favFoods || []).filter(x =>
      !filter || x.name.toLowerCase().includes(filterLower));
    const favHtml = favs.length
      ? `<li class="ql-section-inline">FAVORITES</li>` + favs.map(renderRow).join("")
      : "";
    const recHtml = recents.length
      ? recents.map(renderRow).join("")
      : `<li class="ql-empty">No recents yet — log a few items to populate.</li>`;
    recList.innerHTML = favHtml + recHtml;
  }
  const allList = $("#qlAll");
  if(allList){
    allList.innerHTML = matchAll.slice(0, 100).map(renderRow).join("") || `<li class="ql-empty">No matches.</li>`;
  }
  document.querySelectorAll(".ql-row").forEach(li => {
    li.addEventListener("click", () => {
      const food = JSON.parse(li.dataset.food);
      const targetMeal = (typeof _activeFoodMeal === "string") ? _activeFoodMeal : meal;
      dayObj(currentDate).meals[targetMeal].push(mealItemFrom(food));
      _trackRecent(food);
      save();
      // Brief feedback then re-render quick log so user can keep tapping
      const btn = li.querySelector(".ql-add");
      if(btn){ btn.textContent = "✓"; btn.classList.add("added"); setTimeout(() => { btn.textContent = "+"; btn.classList.remove("added"); }, 600); }
      toast(`Added ${food.name} to ${targetMeal}`, "cyan");
      // Update day totals in background
      if(typeof renderAll === "function") renderAll();
    });
  });
}
function renderTemplatesPane(meal){
  const list = $("#tplList");
  if(!list) return;
  const tpls = state.mealTemplates || [];
  if(!tpls.length){
    list.innerHTML = `<li class="ql-empty">No templates yet. Build a meal in this slot, then save it as a template.</li>`;
    return;
  }
  list.innerHTML = tpls.map(t => `
    <li class="ql-row tpl-row" data-id="${t.id}">
      <div class="ql-info">
        <div class="ql-name">${escape(t.name)}</div>
        <div class="ql-meta">${t.items.length} items · ${t.totals.cal} cal · P${t.totals.p}</div>
      </div>
      <div class="tpl-actions">
        <button class="ql-add" type="button" data-act="apply">Apply</button>
        <button class="ql-del" type="button" data-act="del" title="Delete">×</button>
      </div>
    </li>
  `).join("");
  list.querySelectorAll(".tpl-row").forEach(row => {
    row.querySelector("[data-act='apply']").addEventListener("click", () => {
      const tpl = (state.mealTemplates || []).find(x => x.id === row.dataset.id);
      if(!tpl) return;
      const targetMeal = (typeof _activeFoodMeal === "string") ? _activeFoodMeal : meal;
      tpl.items.forEach(it => {
        dayObj(currentDate).meals[targetMeal].push(mealItemFrom(it));
      });
      save();
      toast(`Applied ${tpl.name} to ${targetMeal}`, "cyan");
      closeModal();
      if(typeof renderAll === "function") renderAll();
    });
    row.querySelector("[data-act='del']").addEventListener("click", () => {
      state.mealTemplates = (state.mealTemplates || []).filter(x => x.id !== row.dataset.id);
      save();
      renderTemplatesPane(meal);
    });
  });
}
function saveCurrentMealAsTemplate(meal){
  const items = (dayObj(currentDate).meals[meal] || []).map(x => ({
    name:x.name, serving:x.serving, cal:x.cal, p:x.p, c:x.c, f:x.f
  }));
  if(!items.length){ toast(`Add some items to ${capitalize(meal)} first`, "pink"); return; }
  const name = prompt("Name this template:", `My ${capitalize(meal)} ${new Date().toLocaleDateString()}`);
  if(!name) return;
  const totals = items.reduce((a,b) => ({
    cal: a.cal + (b.cal||0), p: a.p + (b.p||0), c: a.c + (b.c||0), f: a.f + (b.f||0)
  }), { cal:0, p:0, c:0, f:0 });
  ["cal","p","c","f"].forEach(k => totals[k] = Math.round(totals[k] * 10) / 10);
  if(!state.mealTemplates) state.mealTemplates = [];
  state.mealTemplates.unshift({ id: uid(), name, items, totals, createdAt: new Date().toISOString() });
  save();
  toast(`Saved template: ${name}`, "ok");
  renderTemplatesPane(meal);
}

// ---------- WIRING ----------
(function wireFeatures(){
  const ib = document.getElementById("inbodyBtn");
  if(ib) ib.addEventListener("click", openInBodyModal);
  const ibm = document.getElementById("inbodyManualBtn");
  if(ibm) ibm.addEventListener("click", openInBodyManualModal);
  const rerun = document.getElementById("rerunSetupBtn");
  if(rerun) rerun.addEventListener("click", window.bermoRerunSetup);
  const pb = document.getElementById("planBrowsePrograms");
  if(pb) pb.addEventListener("click", openProgramsModal);
  const ahCopy = document.getElementById("ahCopyTemplate");
  if(ahCopy) ahCopy.addEventListener("click", copyHealthTemplate);

  // Layout settings save
  const layoutSave = document.getElementById("setLayoutSave");
  if(layoutSave) layoutSave.addEventListener("click", () => {
    const stStart = document.getElementById("setStartTab");
    const stFood = document.getElementById("setFoodMode");
    state.profile.startTab = stStart ? stStart.value : "dashboard";
    state.profile.foodMode = stFood ? stFood.value : "search";
    save();
    toast("Layout saved", "ok");
  });
  const ahImp = document.getElementById("ahImportBtn");
  const ahFile = document.getElementById("ahFileInput");
  if(ahImp && ahFile){
    ahImp.addEventListener("click", () => ahFile.click());
    ahFile.addEventListener("change", (e) => {
      const f = e.target.files[0]; if(!f) return;
      importHealthFile(f).catch(err => toast("Import failed: " + err.message, "err"));
      ahFile.value = "";
    });
  }
})();


// =================================================================
// REMINDERS + IN-APP ACCOUNTABILITY BANNERS
// =================================================================
function getReminders(){
  if(!state.reminders) state.reminders = {
    enabled: true,
    notify: false,
    workoutOn: true,  workout: "05:30",
    waterOn:   true,  water:   "14:00",
    eodOn:     true,  eod:     "21:00",
  };
  // Migrate old meal-based reminder shape if present
  const r = state.reminders;
  if(r.workoutOn === undefined && r.breakfast !== undefined){
    r.workoutOn = true;  r.workout = "05:30";
    r.waterOn   = true;  r.water   = "14:00";
    r.eodOn     = true;  r.eod     = "21:00";
    delete r.breakfast; delete r.lunch; delete r.dinner; delete r.evening;
    save();
  }
  return state.reminders;
}
function _hmToMinutes(hm){
  if(!hm || typeof hm !== "string") return 0;
  const [h, m] = hm.split(":").map(n => parseInt(n,10));
  return (h||0) * 60 + (m||0);
}
function _nowMinutes(){
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}
function _todayHasAnyLog(){
  const day = state.days[currentDate];
  if(!day) return false;
  const meals = day.meals || {};
  const anyMeal = ["breakfast","lunch","dinner","snacks"].some(m => (meals[m] || []).length > 0);
  const anySession = (day.sessions || []).length > 0;
  const anyWater = (day.water || 0) > 0;
  const anyActivity = day.activity && ((day.activity.move||0) > 0 || (day.activity.exercise||0) > 0);
  const anyWeigh = (state.weights || []).some(w => w.date === currentDate);
  return anyMeal || anySession || anyWater || anyActivity || anyWeigh;
}
function _todayHasWorkout(){
  const day = state.days[currentDate];
  if(!day) return false;
  if((day.sessions || []).length > 0) return true;
  const ex = day.activity && (day.activity.exercise || 0);
  return ex >= 15; // count ≥15min cardio as a workout
}
function _todayWaterPct(){
  const day = state.days[currentDate];
  const goal = (state.goals && state.goals.water) || 64;
  const cur = (day && day.water) || 0;
  return goal > 0 ? cur / goal : 0;
}
function _bannerDismissed(key){
  return localStorage.getItem(`bermo.tracker.banner.${todayKey()}.${key}`) === "1";
}
function _dismissBanner(key){
  localStorage.setItem(`bermo.tracker.banner.${todayKey()}.${key}`, "1");
}

function renderSmartBanners(){
  const wrap = document.getElementById("smartBanners");
  if(!wrap) return;
  const r = getReminders();
  if(!r.enabled){ wrap.innerHTML = ""; return; }

  const now = _nowMinutes();
  const banners = [];

  // Morning workout call — fires from the set time until +3h, while no workout logged
  if(r.workoutOn){
    const t = _hmToMinutes(r.workout);
    if(now >= t && now < t + 180 && !_todayHasWorkout() && !_bannerDismissed("workout")){
      banners.push({
        key: "workout",
        title: "GET TO THE GYM.",
        sub: "Workout window is open. Hit start — even 20 minutes counts. Future you is watching.",
        primary: { label: "Log a lift now", action: "lift" },
        secondary: { label: "Quick activity", action: "activity" },
      });
    }
  }

  // 💧 Water-too-low — fires from the check time onward, at <50% of goal
  if(r.waterOn){
    const t = _hmToMinutes(r.water);
    const pct = _todayWaterPct();
    if(now >= t && pct < 0.5 && !_bannerDismissed("water")){
      const goal = (state.goals && state.goals.water) || 64;
      const cur = (state.days[currentDate] && state.days[currentDate].water) || 0;
      banners.push({
        key: "water",
        title: "WATER IS LOW.",
        sub: `${Math.round(cur)} of ${goal} ${unitVol()} so far · ${Math.round(pct*100)}% of goal. Crush a glass right now.`,
        primary: { label: "+ 16 oz", action: "water", oz: 16 },
        secondary: { label: "+ 8 oz", action: "water", oz: 8 },
      });
    }
  }

  // 🌙 End-of-day untracked alert — fires from the EOD time, when nothing logged today
  if(r.eodOn){
    const t = _hmToMinutes(r.eod);
    if(now >= t && !_todayHasAnyLog() && !_bannerDismissed("eod")){
      banners.push({
        key: "eod",
        title: "NOTHING TRACKED TODAY.",
        sub: "30-day chain is about to break. Log ANYTHING — water, a walk, what you ate. 10 seconds.",
        primary: { label: "Log activity", action: "activity" },
        secondary: { label: "Log food", action: "food" },
      });
    }
  }

  wrap.innerHTML = banners.map(b => `
    <div class="smart-banner" data-banner-key="${escape(b.key)}">
      <div class="sb-body">
        <div class="sb-title">${b.title}</div>
        <div class="sb-sub">${b.sub}</div>
      </div>
      <div class="sb-actions">
        <button class="btn btn-cyan btn-sm" data-banner-primary>${escape(b.primary.label)}</button>
        ${b.secondary ? `<button class="btn btn-ghost btn-sm" data-banner-secondary>${escape(b.secondary.label)}</button>` : ""}
        <button class="btn btn-ghost btn-sm" data-banner-dismiss aria-label="Dismiss">✕</button>
      </div>
    </div>
  `).join("");

  const runAction = (a) => {
    if(!a) return;
    if(a.action === "lift" && typeof openLiftModal === "function") openLiftModal();
    else if(a.action === "activity" && typeof openActivityLogModal === "function") openActivityLogModal();
    else if(a.action === "food" && typeof openFoodModal === "function"){
      const h = new Date().getHours();
      const meal = h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 18 ? "snacks" : "dinner";
      openFoodModal(meal);
    } else if(a.action === "water" && typeof addWater === "function"){
      addWater(a.oz || 8);
      toast(`+${a.oz || 8} ${unitVol()} water`, "cyan");
    }
  };

  wrap.querySelectorAll("[data-banner-dismiss]").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".smart-banner");
      _dismissBanner(card.dataset.bannerKey);
      card.remove();
    });
  });
  wrap.querySelectorAll("[data-banner-primary]").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".smart-banner");
      const b = banners.find(x => x.key === card.dataset.bannerKey);
      runAction(b && b.primary);
    });
  });
  wrap.querySelectorAll("[data-banner-secondary]").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".smart-banner");
      const b = banners.find(x => x.key === card.dataset.bannerKey);
      runAction(b && b.secondary);
    });
  });
}


// ---- Browser notifications (best-effort, while app/PWA is open) ----
let _reminderTimers = [];
function clearReminderTimers(){
  _reminderTimers.forEach(t => clearTimeout(t));
  _reminderTimers = [];
}
function scheduleReminderNotifications(){
  clearReminderTimers();
  if(!("Notification" in window)) return;
  if(Notification.permission !== "granted") return;
  const r = getReminders();
  if(!r.notify) return;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const items = [];
  if(r.workoutOn) items.push({ key:"workout", time:r.workout, title:"Workout time", body:"Get up. Get to the gym. 20 minutes minimum. No excuses." });
  if(r.waterOn)   items.push({ key:"water",   time:r.water,   title:"Water check",  body:"Half the day gone — how's your water? Tap to add a glass." });
  if(r.eodOn)     items.push({ key:"eod",     time:r.eod,     title:"Don't break the chain", body:"You haven't tracked anything today. Log something — anything — before bed." });
  for(const it of items){
    const [h, m] = (it.time || "00:00").split(":").map(n => parseInt(n,10));
    const target = new Date(today.getTime() + h*3600000 + m*60000);
    const delay = target - now;
    if(delay <= 0 || delay > 18*3600000) continue;
    const t = setTimeout(() => fireReminder(it.key, it.body, it.title), delay);
    _reminderTimers.push(t);
  }
}
async function fireReminder(key, body, title){
  // Skip if dismissed in-app today
  if(_bannerDismissed(key)) return;
  // Skip workout reminder if a workout is already logged
  if(key === "workout" && _todayHasWorkout()) return;
  // Skip water reminder if already at goal
  if(key === "water" && _todayWaterPct() >= 1) return;
  // Skip end-of-day reminder if anything is logged
  if(key === "eod" && _todayHasAnyLog()) return;
  const opts = {
    body,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "bermo-tracker-" + key,
    data: { url: "/tracker/" },
  };
  try{
    const reg = navigator.serviceWorker && await navigator.serviceWorker.ready;
    if(reg && reg.showNotification){ await reg.showNotification(title || "BERMO Tracker", opts); return; }
  }catch(e){ /* fall through */ }
  try{ new Notification(title || "BERMO Tracker", opts); }catch(e){}
}

onReady(() => {
  const enabledEl    = document.getElementById("remEnabled");
  const workoutOnEl  = document.getElementById("remWorkoutOn");
  const workoutEl    = document.getElementById("remWorkout");
  const waterOnEl    = document.getElementById("remWaterOn");
  const waterEl      = document.getElementById("remWater");
  const eodOnEl      = document.getElementById("remEodOn");
  const eodEl        = document.getElementById("remEod");
  const status       = document.getElementById("remStatus");
  const updateStatus = () => {
    if(!status) return;
    if(!("Notification" in window)){ status.textContent = "This browser doesn't support notifications."; return; }
    const r = getReminders();
    const perm = Notification.permission;
    const installedHint = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
      ? "PWA installed ✓"
      : "Tip: Add to Home Screen on iPhone for the best chance of receiving notifications.";
    status.textContent = `Permission: ${perm}. Browser notifications: ${r.notify ? "on" : "off"}. ${installedHint}`;
  };

  // Populate fields from saved state
  const r = getReminders();
  if(enabledEl)   enabledEl.checked  = !!r.enabled;
  if(workoutOnEl) workoutOnEl.checked = !!r.workoutOn;
  if(workoutEl)   workoutEl.value     = r.workout || "05:30";
  if(waterOnEl)   waterOnEl.checked   = !!r.waterOn;
  if(waterEl)     waterEl.value       = r.water   || "14:00";
  if(eodOnEl)     eodOnEl.checked     = !!r.eodOn;
  if(eodEl)       eodEl.value         = r.eod     || "21:00";

  const saveBtn = document.getElementById("remSaveBtn");
  if(saveBtn) saveBtn.addEventListener("click", () => {
    const r = getReminders();
    if(enabledEl)   r.enabled    = enabledEl.checked;
    if(workoutOnEl) r.workoutOn  = workoutOnEl.checked;
    if(workoutEl)   r.workout    = workoutEl.value;
    if(waterOnEl)   r.waterOn    = waterOnEl.checked;
    if(waterEl)     r.water      = waterEl.value;
    if(eodOnEl)     r.eodOn      = eodOnEl.checked;
    if(eodEl)       r.eod        = eodEl.value;
    state.reminders = r;
    save();
    scheduleReminderNotifications();
    if(typeof renderSmartBanners === "function") renderSmartBanners();
    toast("Reminders saved", "cyan");
    updateStatus();
  });

  const permBtn = document.getElementById("remPermBtn");
  if(permBtn) permBtn.addEventListener("click", async () => {
    if(!("Notification" in window)){ toast("Notifications not supported here", "pink"); return; }
    let perm = Notification.permission;
    if(perm === "default"){
      perm = await Notification.requestPermission();
    }
    const r = getReminders();
    r.notify = perm === "granted";
    state.reminders = r;
    save();
    if(perm === "granted"){
      scheduleReminderNotifications();
      toast("Notifications enabled", "cyan");
    } else if(perm === "denied"){
      toast("Permission denied — change in browser settings", "pink");
    }
    updateStatus();
  });

  const testBtn = document.getElementById("remTestBtn");
  if(testBtn) testBtn.addEventListener("click", () => {
    if(!("Notification" in window)){ toast("Notifications not supported here", "pink"); return; }
    if(Notification.permission !== "granted"){ toast("Enable notifications first", "pink"); return; }
    fireReminder("test", "If you see this, notifications work while the app is open. Add to Home Screen for best results.", "BERMO Tracker · test");
  });

  updateStatus();
  // Schedule today's notifications on load (if previously enabled)
  setTimeout(scheduleReminderNotifications, 500);
});

// Re-evaluate banners on tab focus + every 5 min
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible"){
    if(typeof renderSmartBanners === "function") try{ renderSmartBanners(); }catch(e){}
    scheduleReminderNotifications();
  }
});
setInterval(() => { try{ renderSmartBanners(); }catch(e){} }, 5*60*1000);

// Service worker is already registered earlier in the file — reused for showNotification



// =================================================================
// IRON DECK — daily+weekly rings, hit/fail strips, week schedule
// =================================================================
function _userWeightKg(){
  const w = (state.weights && state.weights.length) ? state.weights[state.weights.length-1].val : (state.profile.weightLb || 160);
  return state.profile.units === "metric" ? w : w * 0.4536;
}

// Per-day goal verdicts. food: hit = logged and within 5% of cal goal.
// workout: hit = any session or 15+ exercise min; fail only when a workout
// was planned or the past day has nothing at all.
function dayGoalStatus(k){
  const day = state.days[k];
  const isFuture = k > todayKey();
  const isToday = k === todayKey();
  const g = goalsForDay(k);
  const out = { food: "none", workout: "none" };
  if(isFuture) return out;

  const t = totalsFor(k);
  const anyFood = t.cal > 0;
  if(anyFood){
    out.food = (t.cal <= (g.cal || 2200) * 1.05) ? "hit" : "fail";
  } else if(!isToday){
    out.food = "fail";
  }

  const sessions = (day && day.sessions) || [];
  const act = getActivityForDay(k);
  const worked = sessions.length > 0 || (act.exercise || 0) >= 15;
  const dt = new Date(k + "T12:00:00");
  const dayName = ["sun","mon","tue","wed","thu","fri","sat"][dt.getDay()];
  const wk = weekKey(weekStart(dt));
  const planned = state.plan && state.plan[wk] && state.plan[wk][dayName] && state.plan[wk][dayName].type;
  const isRest = planned && /rest|recov/i.test(planned);
  if(worked) out.workout = "hit";
  else if(isRest) out.workout = "rest";
  else if(planned && !isToday) out.workout = "fail";
  else if(!isToday) out.workout = "miss";
  return out;
}

// Ring deck v3 — Apple-style. The day strip reads/writes currentDate:
// ONE selected-day state for the whole app, so the dashboard, nutrition,
// fitness, and every calendar stay in sync. Never add a second date state.

function drawRingStack(canvasId, rings){
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  const cx = w/2, cy = h/2;
  rings.forEach(ring => {
    ctx.beginPath();
    ctx.lineWidth = ring.lw;
    ctx.lineCap = "butt";
    ctx.strokeStyle = ring.track;
    ctx.arc(cx, cy, ring.r, 0, Math.PI*2);
    ctx.stroke();
    const pct = Math.min(1, ring.val / Math.max(1, ring.goal));
    if(pct > 0.005){
      ctx.beginPath();
      ctx.lineCap = "round";
      ctx.strokeStyle = ring.color;
      ctx.arc(cx, cy, ring.r, -Math.PI/2, -Math.PI/2 + pct * Math.PI*2);
      ctx.stroke();
    }
  });
}

function _liftedLbFor(k){
  return ((state.days[k] || {}).sessions || [])
    .reduce((n, x) => n + (x.weight||0)*(x.reps||0)*(x.sets||1), 0);
}

function _drawDayMini(canvas, k){
  // 3 tiny concentric rings per day: move / exercise / calories
  const ctx = canvas.getContext("2d");
  const g = getActivityGoals();
  const a = getActivityForDay(k);
  const cal = totalsFor(k).cal;
  const calG = state.goals.cal || 2200;
  const rings = [
    { color:"#ff4d9d", track:"#111622", val:a.move,     goal:g.move,     r:13, lw:3.5 },
    { color:"#00f5d4", track:"#111622", val:a.exercise, goal:g.exercise, r:9,  lw:3.5 },
    { color:"#4db8ff", track:"#111622", val:cal,        goal:calG,       r:5,  lw:3.5 },
  ];
  const w = canvas.width, h = canvas.height, cx = w/2, cy = h/2;
  ctx.clearRect(0,0,w,h);
  rings.forEach(ring => {
    ctx.beginPath(); ctx.lineWidth = ring.lw; ctx.lineCap = "butt";
    ctx.strokeStyle = ring.track; ctx.arc(cx, cy, ring.r, 0, Math.PI*2); ctx.stroke();
    const pct = Math.min(1, ring.val / Math.max(1, ring.goal));
    if(pct > 0.02){
      ctx.beginPath(); ctx.lineCap = "round"; ctx.strokeStyle = ring.color;
      ctx.arc(cx, cy, ring.r, -Math.PI/2, -Math.PI/2 + pct*Math.PI*2); ctx.stroke();
    }
  });
}

function renderDeck(){
  if(!document.getElementById("commandDeck")) return;
  const g = getActivityGoals();
  const gl = state.goals || {};
  const calG = gl.cal || 2200;
  const watG = gl.water || 64;

  // ---- Day selector strip (Mon–Sun, mini rings, tap to switch) ----
  const days = document.getElementById("deckDays");
  if(days){
    const mon = weekStart(new Date(currentDate + "T12:00:00"));
    let html = "";
    for(let i = 0; i < 7; i++){
      const d = new Date(mon.getTime() + i*86400000);
      const k = todayKey(d);
      const isSel = k === currentDate;
      const isToday = k === todayKey();
      html += `<button class="dk-dc ${isSel?"sel":""}" data-date="${k}">
        <span class="dk-dc-l ${isToday?"today":""}">${d.toLocaleDateString(undefined,{weekday:"narrow"})}</span>
        <canvas width="34" height="34"></canvas>
      </button>`;
    }
    days.innerHTML = html;
    days.querySelectorAll(".dk-dc").forEach(b => {
      _drawDayMini(b.querySelector("canvas"), b.dataset.date);
      b.addEventListener("click", () => { currentDate = b.dataset.date; renderAll(); });
    });
  }

  // ---- Fitness ring stack + stats for the selected day ----
  const a = getActivityForDay(currentDate);
  const lifted = _liftedLbFor(currentDate);
  drawRingStack("deckFitRings", [
    { color:"#ff4d9d", track:"#111622", val:a.move,     goal:g.move,     r:56, lw:13 },
    { color:"#00f5d4", track:"#111622", val:a.exercise, goal:g.exercise, r:41, lw:13 },
    { color:"#4db8ff", track:"#111622", val:a.stand,    goal:g.stand,    r:26, lw:13 },
  ]);
  const fs = document.getElementById("deckFitStats");
  if(fs) fs.innerHTML = `
    <div class="dds-h">FITNESS</div>
    <div class="dds"><i style="color:#ff4d9d">Move</i><b>${Math.round(a.move)}</b><s>/${g.move} cal</s></div>
    <div class="dds"><i style="color:#00f5d4">Exercise</i><b>${Math.round(a.exercise)}</b><s>/${g.exercise} min</s></div>
    <div class="dds"><i style="color:#4db8ff">Stand</i><b>${Math.round(a.stand)}</b><s>/${g.stand} hr</s></div>
    <div class="dds"><i style="color:#8b95a1">Lifted</i><b>${Math.round(lifted).toLocaleString()}</b><s>${unit()}</s></div>`;

  // ---- Nutrition ring stack + stats for the selected day ----
  const t = totalsFor(currentDate);
  drawRingStack("deckNutRings", [
    { color:"#b788ff", track:"#111622", val:t.cal, goal:calG,           r:56, lw:13 },
    { color:"#4db8ff", track:"#111622", val:t.p,   goal:gl.protein||1,  r:41, lw:13 },
    { color:"#00f5d4", track:"#111622", val:t.c,   goal:gl.carbs||1,    r:26, lw:13 },
  ]);
  const ns = document.getElementById("deckNutStats");
  if(ns) ns.innerHTML = `
    <div class="dds-h">NUTRITION</div>
    <div class="dds"><i style="color:#b788ff">Calories</i><b>${Math.round(t.cal)}</b><s>/${calG}</s></div>
    <div class="dds"><i style="color:#4db8ff">Protein</i><b>${Math.round(t.p)}</b><s>/${gl.protein||0} g</s></div>
    <div class="dds"><i style="color:#00f5d4">Carbs</i><b>${Math.round(t.c)}</b><s>/${gl.carbs||0} g</s></div>
    <div class="dds"><i style="color:#ff4d9d">Fat</i><b>${Math.round(t.f)}</b><s>/${gl.fat||0} g</s></div>`;

  // ---- Water row (one line, one-tap +8) ----
  const wr = document.getElementById("deckWaterRow");
  if(wr){
    const water = (state.days[currentDate] || {}).water || 0;
    wr.innerHTML = `
      <span class="dw-lbl">WATER</span>
      <div class="bar dw-bar"><div class="bar-fill" style="width:${Math.min(100,(water/watG)*100)}%;background:#4db8ff"></div></div>
      <b>${Math.round(water)}/${watG} oz</b>
      <button class="dn-w-add" id="deckWaterAdd">+8</button>`;
    wr.querySelector("#deckWaterAdd").addEventListener("click", () => {
      const day = dayObj(currentDate);
      day.water = (day.water || 0) + 8;
      save(); renderDeck();
      toast("+8 oz water", "cyan");
    });
  }

}

onReady(() => {
  on("#deckFitCol", "click", (e) => { if(!e.target.closest("button")) openDetail("move"); });
  on("#deckNutCol", "click", (e) => { if(!e.target.closest("button")) jumpToTab("nutrition"); });
});



// =================================================================
// CARDIO LOGGER — type picker, MET calories, live timer or manual
// =================================================================
const CARDIO_TYPES = [
  { id:"bike",      name:"Indoor Bike",     met:6.8 },
  { id:"walk",      name:"Walk",            met:3.3 },
  { id:"speedwalk", name:"Speed Walk",      met:4.8 },
  { id:"uphill",    name:"Uphill Walk",     met:6.0, incline:true },
  { id:"run",       name:"Run",             met:9.8 },
  { id:"elliptical",name:"Elliptical",      met:5.0 },
  { id:"stair",     name:"Stairmaster",     met:9.0 },
  { id:"row",       name:"Row Erg",         met:7.0 },
  { id:"swim",      name:"Swim",            met:7.0 },
  { id:"crossfit",  name:"CrossFit",        met:8.0 },
  { id:"hiitclass", name:"HIIT Class",      met:8.0 },
  { id:"spin",      name:"Spin Class",      met:8.5 },
  { id:"bootcamp",  name:"Bootcamp",        met:8.0 },
  { id:"zumba",     name:"Zumba",           met:6.6 },
  { id:"pilates",   name:"Pilates",         met:3.8 },
  { id:"yoga",      name:"Yoga",            met:3.0 },
];

let _cardioTimer = null, _cardioStart = null, _cardioElapsed = 0;
function _cardioMET(type, mph, level){
  if(!type.incline) return type.met;
  const v = parseFloat(mph) || 3.0;
  const inc = parseFloat(level) || 5;
  return Math.max(3, 2.0 + v * 0.9 + inc * 0.45);
}

function openCardioModal(){
  clearInterval(_cardioTimer); _cardioTimer = null; _cardioStart = null; _cardioElapsed = 0;
  const opts = CARDIO_TYPES.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  openModal("Log cardio", `
    <div class="form-grid">
      <label><span>Date</span><input id="cdDate" type="date" value="${currentDate}"></label>
      <label><span>Time of day <em style="font-style:normal;color:var(--iron-mute)">optional</em></span><input id="cdTime" type="time"></label>
    </div>
    <label><span>Type</span><select id="cdType">${opts}</select></label>
    <div id="cdIncline" class="form-grid" style="display:none">
      <label><span>Speed (mph)</span><input id="cdMph" type="number" step="0.1" min="1" max="6" value="3.0"></label>
      <label><span>Incline level</span><input id="cdLevel" type="number" step="1" min="1" max="15" value="5"></label>
    </div>
    <div class="cd-timer">
      <div class="cd-clock" id="cdClock">00:00</div>
      <div class="cd-timer-btns">
        <button type="button" class="btn btn-lime" id="cdStart">▶ START</button>
        <button type="button" class="btn btn-ghost" id="cdPause" disabled>⏸ PAUSE</button>
      </div>
      <div class="cd-or">— or enter manually —</div>
      <label><span>Duration (min)</span><input id="cdMin" type="number" min="1" max="600" placeholder="30"></label>
    </div>
    <div class="cd-cal-row">
      <span>Est. burn</span>
      <b id="cdCal">0</b>
      <span>kcal <i style="font-style:normal;color:#888">(based on your weight)</i></span>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="cdSave">SAVE SESSION</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => {
      clearInterval(_cardioTimer); closeModal();
    }));
    const typeEl = document.getElementById("cdType");
    const minEl = document.getElementById("cdMin");
    const calEl = document.getElementById("cdCal");
    const clock = document.getElementById("cdClock");
    const startB = document.getElementById("cdStart");
    const pauseB = document.getElementById("cdPause");

    const currentMinutes = () => {
      const manual = parseFloat(minEl.value);
      if(manual > 0) return manual;
      return _cardioElapsed / 60000;
    };
    const recalc = () => {
      const t = CARDIO_TYPES.find(x => x.id === typeEl.value);
      const met = _cardioMET(t, (document.getElementById("cdMph")||{}).value, (document.getElementById("cdLevel")||{}).value);
      const kcal = Math.round(met * _userWeightKg() * (currentMinutes() / 60));
      calEl.textContent = kcal;
      return kcal;
    };
    typeEl.addEventListener("change", () => {
      const t = CARDIO_TYPES.find(x => x.id === typeEl.value);
      document.getElementById("cdIncline").style.display = t.incline ? "grid" : "none";
      recalc();
    });
    ["cdMph","cdLevel","cdMin"].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.addEventListener("input", recalc);
    });

    const tick = () => {
      const now = Date.now();
      const total = _cardioElapsed + (_cardioStart ? now - _cardioStart : 0);
      const m = Math.floor(total/60000), sec = Math.floor((total%60000)/1000);
      clock.textContent = `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
      if(m > 0 || sec > 10) recalc();
    };
    startB.addEventListener("click", () => {
      if(_cardioStart) return;
      _cardioStart = Date.now();
      _cardioTimer = setInterval(tick, 500);
      startB.disabled = true; pauseB.disabled = false;
      startB.textContent = "RUNNING";
    });
    pauseB.addEventListener("click", () => {
      if(!_cardioStart) return;
      _cardioElapsed += Date.now() - _cardioStart;
      _cardioStart = null;
      clearInterval(_cardioTimer);
      startB.disabled = false; pauseB.disabled = true;
      startB.textContent = "▶ RESUME";
      tick();
    });

    document.getElementById("cdSave").addEventListener("click", () => {
      if(_cardioStart){ _cardioElapsed += Date.now() - _cardioStart; _cardioStart = null; }
      clearInterval(_cardioTimer);
      const mins = Math.round(currentMinutes());
      if(!mins || mins < 1){ toast("Add a duration — timer or manual", "pink"); return; }
      const t = CARDIO_TYPES.find(x => x.id === typeEl.value);
      const kcal = recalc();
      let name = t.name;
      if(t.incline){
        const mph = (document.getElementById("cdMph")||{}).value || "3";
        const lvl = (document.getElementById("cdLevel")||{}).value || "5";
        name = `Uphill Walk · L${lvl} @ ${mph}mph`;
      }
      const dateK = (document.getElementById("cdDate") || {}).value || currentDate;
      const timeV = (document.getElementById("cdTime") || {}).value || "";
      const day = dayObj(dateK);
      if(!day.sessions) day.sessions = [];
      day.sessions.push({
        id: uid(), name, lift: name,
        weight: 0, reps: 0, sets: 1,
        type: "cardio",
        durationMin: mins,
        calories: kcal,
        cardioId: t.id,
        time: timeV || undefined,
        mph: t.incline ? ((document.getElementById("cdMph")||{}).value || "") : undefined,
        level: t.incline ? ((document.getElementById("cdLevel")||{}).value || "") : undefined,
      });
      save(); closeModal(); renderAll();
      toast(`${name} · ${mins} min · ~${kcal} kcal · ${fmtDate(dateK)}`, "cyan");
    });
    recalc();
  });
}

onReady(() => {
  on("#fitNewCardio", "click", openCardioModal);
  on("#fitPlanDay", "click", () => {
    const dt = new Date(currentDate + "T12:00:00");
    const dayName = ["sun","mon","tue","wed","thu","fri","sat"][dt.getDay()];
    openPlanDayModal(weekKey(weekStart(dt)), dayName);
  });
});



// =================================================================
// WORKOUT LIBRARY — build named workouts, assign to days, start
// =================================================================
const MACHINE_LIST = [
  "Leg Press","Hack Squat","Leg Extension","Leg Curl","Calf Raise Machine",
  "Hip Thrust Machine","Hip Abductor","Hip Adductor","Smith Machine Squat",
  "Lat Pulldown","Seated Cable Row","T-Bar Row","Assisted Pull-up",
  "Chest Press Machine","Pec Deck","Cable Fly","Shoulder Press Machine",
  "Lateral Raise Machine","Cable Tricep Pushdown","Cable Curl","Preacher Curl Machine",
  "Ab Crunch Machine","Cable Woodchop","Back Extension"
];
const WORKOUT_STYLES = ["Lift Day","HIIT · Grouped Superset","Circuit","CrossFit","Cardio + Lift"];

function getWorkoutLib(){
  if(!state.workoutLib) state.workoutLib = [];
  return state.workoutLib;
}

function renderWorkoutLib(){
  let card = document.getElementById("workoutLibCard");
  const planView = document.getElementById("view-plan");
  if(!planView) return;
  if(!card){
    card = document.createElement("div");
    card.id = "workoutLibCard";
    card.className = "card wl-card";
    planView.appendChild(card);
  }
  const lib = getWorkoutLib();
  const rows = lib.map(w => `
    <div class="wl-row" data-id="${w.id}">
      <div class="wl-info">
        <div class="wl-name">${escape(w.name)}</div>
        <div class="wl-meta">${escape(w.style)} · ${w.exercises.length} exercises</div>
      </div>
      <div class="wl-actions">
        <button class="wl-btn wl-start" data-wl-start title="Start now">START</button>
        <button class="wl-btn" data-wl-assign title="Put on a weekday">ASSIGN</button>
        <button class="wl-btn" data-wl-edit title="Edit">✎</button>
        <button class="wl-btn wl-del" data-wl-del title="Delete">×</button>
      </div>
    </div>
  `).join("");
  card.innerHTML = `
    <div class="card-head">
      <span class="card-eyebrow">MY WORKOUTS — build once, run forever</span>
      <button class="link-btn-sm" id="wlNew">+ BUILD WORKOUT</button>
    </div>
    ${rows || `<p class="wl-empty">No saved workouts yet. Build Leg Day, Back Day, your HIIT circuit — pick the exact machines and lifts, then assign to weekdays.</p>`}
  `;
  card.querySelector("#wlNew").addEventListener("click", () => openWorkoutBuilder());
  card.querySelectorAll(".wl-row").forEach(row => {
    const w = lib.find(x => x.id === row.dataset.id);
    if(!w) return;
    row.querySelector("[data-wl-start]").addEventListener("click", () => startLibWorkout(w));
    row.querySelector("[data-wl-assign]").addEventListener("click", () => assignLibWorkout(w));
    row.querySelector("[data-wl-edit]").addEventListener("click", () => openWorkoutBuilder(w));
    row.querySelector("[data-wl-del]").addEventListener("click", () => {
      if(!confirm(`Delete "${w.name}"?`)) return;
      state.workoutLib = lib.filter(x => x.id !== w.id);
      save(); renderWorkoutLib();
    });
  });
}

function openWorkoutBuilder(existing){
  const w = existing || { name:"", style:"Lift Day", exercises:[] };
  const chosen = new Set(w.exercises.map(e => e.name));
  const favLifts = getFavLifts();
  const favCatHtml = favLifts.length ? `
    <div class="wb-cat">
      <div class="wb-cat-h">Favorites</div>
      <div class="wb-cat-list">
        ${favLifts.map(l => `
          <label class="wb-ex ${chosen.has(l)?"on":""}">
            <input type="checkbox" data-wb-ex="${escape(l)}" ${chosen.has(l)?"checked":""}>
            <span>${escape(l)}</span>
          </label>
        `).join("")}
      </div>
    </div>` : "";
  const catHtml = favCatHtml + LIFT_CATEGORIES.map(cat => `
    <div class="wb-cat">
      <div class="wb-cat-h">${escape(cat.name)}</div>
      <div class="wb-cat-list">
        ${cat.lifts.map(l => `
          <label class="wb-ex ${chosen.has(l)?"on":""}">
            <input type="checkbox" data-wb-ex="${escape(l)}" ${chosen.has(l)?"checked":""}>
            <span>${escape(l)}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `).join("");
  const machHtml = `
    <div class="wb-cat">
      <div class="wb-cat-h">Machines</div>
      <div class="wb-cat-list">
        ${MACHINE_LIST.map(l => `
          <label class="wb-ex ${chosen.has(l)?"on":""}">
            <input type="checkbox" data-wb-ex="${escape(l)}" ${chosen.has(l)?"checked":""}>
            <span>${escape(l)}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
  const styleOpts = WORKOUT_STYLES.map(st => `<option ${st===w.style?"selected":""}>${st}</option>`).join("");
  openModal(existing ? "Edit workout" : "Build workout", `
    <div class="form-grid">
      <label><span>Name it</span><input id="wbName" type="text" maxlength="30" placeholder="Leg Day / Back + Bis / HIIT A" value="${escape(w.name)}"></label>
      <label><span>Style</span><select id="wbStyle">${styleOpts}</select></label>
    </div>
    <p class="wb-hint">Tap every lift + machine that belongs in this workout. Log sets live when you run it.</p>
    <div class="wb-picker">${catHtml}${machHtml}</div>
    <label style="margin-top:8px"><span>Custom exercise (optional)</span><input id="wbCustom" type="text" placeholder="e.g. Sled Push — press Enter to add" maxlength="40"></label>
    <div id="wbCustomList" class="wb-custom-list">${w.exercises.filter(e => e.custom).map(e => `<span class="wb-chip" data-name="${escape(e.name)}">${escape(e.name)} <b>×</b></span>`).join("")}</div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="wbSave">${existing ? "SAVE CHANGES" : "SAVE WORKOUT"}</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    root.querySelectorAll(".wb-ex input").forEach(cb => cb.addEventListener("change", () => {
      cb.closest(".wb-ex").classList.toggle("on", cb.checked);
    }));
    const customInput = document.getElementById("wbCustom");
    const customList = document.getElementById("wbCustomList");
    const addChip = (name) => {
      const span = document.createElement("span");
      span.className = "wb-chip"; span.dataset.name = name;
      span.innerHTML = `${escape(name)} <b>×</b>`;
      span.querySelector("b").addEventListener("click", () => span.remove());
      customList.appendChild(span);
    };
    customList.querySelectorAll(".wb-chip b").forEach(b => b.addEventListener("click", () => b.closest(".wb-chip").remove()));
    customInput.addEventListener("keydown", (e) => {
      if(e.key === "Enter"){
        e.preventDefault();
        const v = customInput.value.trim();
        if(v){ addChip(v); customInput.value = ""; }
      }
    });
    document.getElementById("wbSave").addEventListener("click", () => {
      const name = document.getElementById("wbName").value.trim();
      if(!name){ toast("Name the workout", "pink"); return; }
      const picked = Array.from(root.querySelectorAll(".wb-ex input:checked")).map(cb => ({ name: cb.dataset.wbEx }));
      const customs = Array.from(customList.querySelectorAll(".wb-chip")).map(c => ({ name: c.dataset.name, custom: true }));
      const exercises = [...picked, ...customs];
      if(!exercises.length){ toast("Pick at least one exercise", "pink"); return; }
      const lib = getWorkoutLib();
      if(existing){
        existing.name = name;
        existing.style = document.getElementById("wbStyle").value;
        existing.exercises = exercises;
      } else {
        lib.unshift({ id: uid(), name, style: document.getElementById("wbStyle").value, exercises });
      }
      save(); closeModal(); renderWorkoutLib();
      toast(`Saved: ${name} (${exercises.length} exercises)`, "cyan");
    });
  });
}

function assignLibWorkout(w){
  const names = ["sun","mon","tue","wed","thu","fri","sat"];
  const labels = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  openModal(`Assign "${w.name}"`, `
    <p class="wb-hint">Pick the day(s) this week. It lands on the planner with the full exercise list — the session logger reads it from there.</p>
    <div class="wb-days">
      ${labels.map((l,i) => `<label class="wb-dayrow"><input type="checkbox" data-day="${names[i]}"><span>${l}</span></label>`).join("")}
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="wbAssignGo">ASSIGN</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("wbAssignGo").addEventListener("click", () => {
      const days = Array.from(root.querySelectorAll("[data-day]:checked")).map(cb => cb.dataset.day);
      if(!days.length){ toast("Pick a day", "pink"); return; }
      const plan = getPlan();
      const wk = weekKey(weekStart(new Date()));
      if(!plan[wk]) plan[wk] = {};
      days.forEach(d => {
        plan[wk][d] = { type: w.name, exercises: w.exercises.map(e => ({ name: e.name, scheme: e.scheme || "" })) };
      });
      save(); closeModal();
      renderDeck();
      toast(`${w.name} → ${days.length} day${days.length===1?"":"s"}`, "cyan");
    });
  });
}

function startLibWorkout(w){
  const plan = getPlan();
  const wk = weekKey(weekStart(new Date()));
  const dayName = ["sun","mon","tue","wed","thu","fri","sat"][new Date().getDay()];
  if(!plan[wk]) plan[wk] = {};
  plan[wk][dayName] = { type: w.name, exercises: w.exercises.map(e => ({ name: e.name, scheme: e.scheme || "" })) };
  save();
  openWorkoutSession(todayKey());
}


// =================================================================
// ACCOUNTABILITY — slack detection + progress trend callouts
// =================================================================
function _volumeForRange(startDate, endDate){
  let vol = 0;
  Object.keys(state.days).forEach(k => {
    if(k >= startDate && k < endDate){
      ((state.days[k] || {}).sessions || []).forEach(s => {
        vol += (s.weight || 0) * (s.reps || 0) * (s.sets || 1);
      });
    }
  });
  return vol;
}


// Resolve body parts for ANY exercise name: exact map first, then keywords
// (covers machines like Lat Pulldown / Leg Press and free-typed customs).
function partsForExercise(name){
  const n = (name || "").toLowerCase();
  if(BODY_PART_MAP[n]) return BODY_PART_MAP[n];
  const out = new Set();
  if(/squat|lunge|leg press|leg extension|leg curl|hamstring|quad|calf|step.?up|sled|thruster|\brdl\b/.test(n)){ out.add("legs"); }
  if(/squat|deadlift|\brdl\b|hip thrust|thruster|glute|kick.?back|abduct|bridge/.test(n)){ out.add("glutes"); }
  if(/deadlift|\brdl\b|row\b|pull.?down|pull.?up|chin.?up|pullover|back extension|shrug|face pull|t-bar|lat\b/.test(n)){ out.add("back"); }
  if(/bench|push.?up|chest|pec|fly|dip/.test(n)){ out.add("chest"); }
  if(/press$|overhead|shoulder|lateral raise|front raise|arnold|jerk|snatch/.test(n)){ out.add("shoulders"); }
  if(/curl|tricep|extension$|pushdown|skull|close.?grip|dip/.test(n)){ out.add("arms"); }
  if(/ab |abs\b|crunch|plank|sit.?up|woodchop|core|hollow|l-sit|leg raise/.test(n)){ out.add("core"); }
  // leg-machine names must not hit arms via "curl"/"extension$"
  if(/leg (curl|extension)|hamstring/.test(n)){ out.delete("arms"); }
  return Array.from(out);
}

function _bodyPartLastHit(){
  const lastHit = {};
  const keys = Object.keys(state.days).sort().reverse().slice(0, 60);
  for(const k of keys){
    ((state.days[k] || {}).sessions || []).forEach(s => {
      const parts = partsForExercise(s.name);
      parts.forEach(p => { if(!lastHit[p] || k > lastHit[p]) lastHit[p] = k; });
    });
  }
  return lastHit;
}

function accountabilityCallouts(){
  const out = [];
  const today = new Date(); today.setHours(0,0,0,0);

  // 1. Missed planned workout yesterday
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const yk = todayKey(y);
  const yName = ["sun","mon","tue","wed","thu","fri","sat"][y.getDay()];
  const yWk = weekKey(weekStart(y));
  const yPlan = state.plan && state.plan[yWk] && state.plan[yWk][yName];
  const yWorked = ((state.days[yk] || {}).sessions || []).length > 0;
  if(yPlan && yPlan.type && !/rest|recov/i.test(yPlan.type) && !yWorked){
    out.push({
      key: "missed-" + yk,
      title: `You planned ${yPlan.type} yesterday. You didn't show.`,
      sub: "Doesn't reset the week — run it today. Tap to start.",
      primary: { label: "RUN IT NOW", action: () => {
        const plan = getPlan();
        const wk = weekKey(weekStart(new Date()));
        const dn = ["sun","mon","tue","wed","thu","fri","sat"][new Date().getDay()];
        if(!plan[wk]) plan[wk] = {};
        if(!plan[wk][dn] || !plan[wk][dn].type) plan[wk][dn] = yPlan;
        save();
        openWorkoutSession(todayKey());
      }},
    });
  }

  // 2. Neglected body part — only with real lift history
  const totalSessions = Object.values(state.days).reduce((n, d) => n + ((d.sessions || []).length), 0);
  if(totalSessions >= 10 && typeof BODY_PART_MAP !== "undefined"){
    const lastHit = _bodyPartLastHit();
    const parts = ["legs","back","chest","shoulders","arms","glutes","core"];
    for(const p of parts){
      if(!lastHit[p]) continue;
      const days = Math.round((today - new Date(lastHit[p] + "T00:00:00")) / 86400000);
      if(days >= 8){
        out.push({
          key: "neglect-" + p,
          title: `${p.toUpperCase()}: ${days} DAYS UNTOUCHED.`,
          sub: `Last trained ${fmtDate(lastHit[p])}. That's how imbalances start.`,
          primary: { label: "LOG " + p.toUpperCase(), action: () => openLiftModal() },
        });
        break; // one neglect callout at a time — the loudest one
      }
    }
  }

  // 3. Volume backslide — this week vs 3-week average, judged Thu onward
  const mon = weekStart(new Date());
  const monKey = todayKey(mon);
  const elapsed = Math.max(1, Math.round((today - mon) / 86400000) + 1);
  if(elapsed >= 4){
    const thisVol = _volumeForRange(monKey, todayKey(new Date(today.getTime() + 86400000)));
    let prevSum = 0;
    for(let w = 1; w <= 3; w++){
      const s2 = new Date(mon.getTime() - w*7*86400000);
      const e2 = new Date(s2.getTime() + elapsed*86400000);
      prevSum += _volumeForRange(todayKey(s2), todayKey(e2));
    }
    const prevAvg = prevSum / 3;
    if(prevAvg > 1000 && thisVol < prevAvg * 0.7){
      out.push({
        key: "backslide-" + weekKey(mon),
        title: `VOLUME DOWN ${Math.round(100 - (thisVol/prevAvg)*100)}% vs your 3-week average.`,
        sub: `${Math.round(thisVol).toLocaleString()} vs usual ${Math.round(prevAvg).toLocaleString()} ${unit()}·reps by this point in the week. Pick it up.`,
        primary: { label: "LOG A LIFT", action: () => openLiftModal() },
      });
    }
  }

  return out;
}

// Called from the dashboard pipeline right after renderSmartBanners()
function appendAccountabilityBanners(){
  const wrap = document.getElementById("smartBanners");
  if(!wrap) return;
  const r = getReminders();
  if(!r.enabled) return;
  accountabilityCallouts().forEach(c => {
    if(_bannerDismissed(c.key)) return;
    if(wrap.querySelector(`[data-banner-key="${c.key}"]`)) return;
    const div = document.createElement("div");
    div.className = "smart-banner sb-aggr";
    div.dataset.bannerKey = c.key;
    div.innerHTML = `
      <div class="sb-body">
        <div class="sb-title">${c.title}</div>
        <div class="sb-sub">${c.sub}</div>
      </div>
      <div class="sb-actions">
        <button class="btn btn-cyan btn-sm" data-acc-go>${escape(c.primary.label)}</button>
        <button class="btn btn-ghost btn-sm" data-acc-x aria-label="Dismiss">✕</button>
      </div>
    `;
    div.querySelector("[data-acc-go]").addEventListener("click", c.primary.action);
    div.querySelector("[data-acc-x]").addEventListener("click", () => {
      _dismissBanner(c.key);
      div.remove();
    });
    wrap.appendChild(div);
  });
}



// =================================================================
// HOME CARDS — Today's Nutrition + Workouts This Week (editable)
// =================================================================
function renderDashWorkList(){
  const list = document.getElementById("dwList");
  if(!list) return;
  const mon = weekStart(new Date());
  const wk = weekKey(mon);
  const wkPlan = (state.plan && state.plan[wk]) || {};
  const names = ["sun","mon","tue","wed","thu","fri","sat"];
  let html = "";
  for(let i = 0; i < 7; i++){
    const d = new Date(mon.getTime() + i*86400000);
    const k = todayKey(d);
    const p = wkPlan[names[i]] || {};
    const sessions = (state.days[k] && state.days[k].sessions) || [];
    const done = sessions.length > 0;
    const isToday = k === todayKey();
    const past = k < todayKey();
    // What actually happened / is planned
    const cardio = sessions.find(x => x.type === "cardio");
    const doneName = done ? (p.type || (cardio ? cardio.name : sessions[0].name)) : null;
    const vol = sessions.reduce((n, x) => n + (x.weight||0)*(x.reps||0)*(x.sets||1), 0);
    const kcal = sessions.reduce((n, x) => n + (x.calories||0), 0);
    const statParts = [];
    if(done){
      statParts.push(`${sessions.length} ${sessions.length===1?"entry":"entries"}`);
      if(vol > 0) statParts.push(`${Math.round(vol).toLocaleString()} ${unit()}`);
      if(kcal > 0) statParts.push(`${Math.round(kcal)} kcal`);
    }
    const label = done ? doneName : (p.type || "Rest / unplanned");
    const mark = done ? "✓" : (p.type ? (past ? "✕" : (isToday ? "▶" : "·")) : "");
    const cls = done ? "done" : (p.type ? (past ? "missed" : (isToday ? "today-up" : "planned")) : "empty");
    const timeTag = p.time ? ` <em class="dw-time">${escape(fmtTime12(p.time))}</em>` : "";
    const extras = (p.extra || []).map(x =>
      `<small class="dw-extra">+ ${escape(x.name)}${x.time ? ` · ${escape(fmtTime12(x.time))}` : ""}${x.why ? ` — ${escape(x.why)}` : ""}</small>`).join("");
    html += `<button class="dw-row ${cls} ${isToday?"today":""}" data-day="${names[i]}" data-date="${k}">
      <span class="dw-day">${d.toLocaleDateString(undefined,{weekday:"short"}).toUpperCase()}<i>${d.getDate()}</i></span>
      <span class="dw-info">
        <b>${escape(String(label))}${timeTag}</b>
        ${statParts.length ? `<small>${escape(statParts.join(" · "))}</small>` : ""}${extras}
        ${p.why ? `<small class="dw-why">why: ${escape(p.why)}</small>` : ""}
      </span>
      <span class="dw-mark">${mark}</span>
    </button>`;
  }
  list.innerHTML = html;
  // Tap a row → edit that day's plan (move/change/clear); today with plan → offer start
  list.querySelectorAll(".dw-row").forEach(row => {
    row.addEventListener("click", () => {
      const dayName = row.dataset.day;
      const k = row.dataset.date;
      const isToday = k === todayKey();
      const p = wkPlan[dayName];
      if(isToday && p && p.type && (p.exercises || []).length){
        openWorkoutSession(todayKey());
      } else {
        openPlanDayModal(wk, dayName);
      }
    });
  });
}

onReady(() => {
  on("#dwEditPlan", "click", () => go("plan"));
});


// =================================================================
// GOALS VIEW — contract + targets + weight-vs-goal
// =================================================================
function renderGoalsView(){
  try{ renderPlanCard(); }catch(e){ console.warn("plan card", e); }
  try{ renderMacroCalc("goalsMacroCalc"); }catch(e){ console.warn("goals macro calc", e); }
  const grid = document.getElementById("gsGrid");
  if(grid){
    const gl = state.goals || {};
    const cells = [
      ["Calories", (gl.cal||0) + " kcal"],
      ["Protein", (gl.protein||0) + " g"],
      ["Carbs", (gl.carbs||0) + " g"],
      ["Fat", (gl.fat||0) + " g"],
      ["Water", (gl.water||0) + " " + unitVol()],
      ["Goal weight", gl.weight ? gl.weight + " " + unit() : "not set"],
    ];
    grid.innerHTML = cells.map(([l,v]) => `<div class="gs-cell"><span>${l}</span><b>${escape(String(v))}</b></div>`).join("");
  }
  // Weight vs goal mini chart (plain canvas, newest 20 weigh-ins)
  const cv = document.getElementById("gpChart");
  if(cv && cv.getContext){
    const ctx = cv.getContext("2d");
    const wts = (state.weights || []).slice(-20);
    const goalW = (state.goals || {}).weight;
    cv.width = cv.clientWidth || 320;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const meta = document.getElementById("gpMeta");
    if(wts.length < 2){
      if(meta) meta.textContent = "log 2+ weigh-ins to see the trend";
    } else {
      const vals = wts.map(w => w.val);
      const min = Math.min(...vals, goalW || Infinity) - 2;
      const max = Math.max(...vals, goalW || -Infinity) + 2;
      const X = (i) => 6 + (i/(wts.length-1)) * (cv.width - 12);
      const Y = (v) => 6 + (1 - (v - min)/(max - min)) * (cv.height - 12);
      if(goalW){
        ctx.strokeStyle = "#00f5d4"; ctx.setLineDash([4,4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, Y(goalW)); ctx.lineTo(cv.width, Y(goalW)); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = "#4db8ff"; ctx.lineWidth = 2;
      ctx.beginPath();
      wts.forEach((w, i) => { i ? ctx.lineTo(X(i), Y(w.val)) : ctx.moveTo(X(i), Y(w.val)); });
      ctx.stroke();
      const last = vals[vals.length-1];
      if(meta) meta.textContent = goalW
        ? `${last} ${unit()} now · ${Math.abs(last - goalW).toFixed(1)} ${unit()} to ${goalW}`
        : `${last} ${unit()} — set a goal weight in Settings`;
    }
  }
}

onReady(() => {
  on("#goalsEditBtn", "click", () => {
    go("settings");
    setTimeout(() => {
      const f = document.getElementById("goalsForm");
      if(f) f.scrollIntoView({ behavior:"smooth", block:"center" });
    }, 150);
  });
});



// =================================================================
// MUSCLE MAP v2 — Fitbod-style recency map + fresh groups stats
// =================================================================
const MUSCLE_PARTS = ["chest","back","shoulders","arms","legs","glutes","core"];
function _daysSincePart(){
  // days since each part was last trained (null = never in 60d window)
  const lastHit = _bodyPartLastHit();
  const today = new Date(); today.setHours(0,0,0,0);
  const out = {};
  MUSCLE_PARTS.forEach(p => {
    out[p] = lastHit[p] ? Math.round((today - new Date(lastHit[p] + "T00:00:00")) / 86400000) : null;
  });
  return out;
}
function _muscleFill(days){
  if(days === null) return "#20262e";       // never trained — neutral
  if(days <= 2) return "#ff4d9d";           // just hit — recovering (red like Fitbod's worked)
  if(days <= 5) return "#b788ff";           // recently
  if(days <= 8) return "#00f5d4";           // fresh — ready to train
  return "#3d4a63";                          // stale — going cold
}
function renderMuscleMap(){
  const fit = document.getElementById("view-fitness");
  if(!fit) return;
  let card = document.getElementById("muscleMapCard");
  const grid = fit.querySelector(".grid-12");
  if(!card){
    card = document.createElement("div");
    card.id = "muscleMapCard";
    card.className = "card span-12";
    card.dataset.fsec = "summary";
    if(grid) grid.insertBefore(card, grid.firstChild);
    else fit.appendChild(card);
  }
  const ds = _daysSincePart();
  // Fitbod-style headline stats
  const allDays = Object.values(ds).filter(v => v !== null);
  const daysSinceWorkout = allDays.length ? Math.min(...allDays) : null;
  const fresh = MUSCLE_PARTS.filter(p => ds[p] === null || ds[p] >= 3).length;
  const stale = MUSCLE_PARTS.filter(p => ds[p] !== null && ds[p] >= 9);
  const F = (p) => _muscleFill(ds[p]);
  card.innerHTML = `
    <div class="mm-stats">
      <div class="mm-stat"><b>${daysSinceWorkout === null ? "—" : daysSinceWorkout}</b><span>${daysSinceWorkout === 1 ? "DAY" : "DAYS"} SINCE<br>LAST WORKOUT</span></div>
      <div class="mm-stat mm-right"><b>${fresh}</b><span>FRESH MUSCLE<br>GROUPS</span></div>
    </div>
    <div class="mm-wrap">
      <svg class="mm-svg" viewBox="0 0 230 250" xmlns="http://www.w3.org/2000/svg">
        <!-- FRONT -->
        <g stroke="#0c0f13" stroke-width="1.2">
          <ellipse cx="60" cy="18" rx="11" ry="13" fill="#2a313b"/>
          <path d="M52 32 L68 32 L67 40 L53 40 Z" fill="#2a313b"/>
          <path data-part="shoulders" d="M34 42 Q42 36 52 40 L50 56 Q38 54 34 48 Z" fill="${F("shoulders")}"/>
          <path data-part="shoulders" d="M86 42 Q78 36 68 40 L70 56 Q82 54 86 48 Z" fill="${F("shoulders")}"/>
          <path data-part="chest" d="M50 42 Q60 38 70 42 L69 62 Q60 67 51 62 Z" fill="${F("chest")}"/>
          <path data-part="core" d="M52 64 Q60 68 68 64 L67 96 Q60 101 53 96 Z" fill="${F("core")}"/>
          <path data-part="arms" d="M33 50 L28 88 L36 90 L42 58 Z" fill="${F("arms")}"/>
          <path data-part="arms" d="M87 50 L92 88 L84 90 L78 58 Z" fill="${F("arms")}"/>
          <path data-part="legs" d="M52 100 L48 168 L58 168 L60 102 Z" fill="${F("legs")}"/>
          <path data-part="legs" d="M68 100 L72 168 L62 168 L60 102 Z" fill="${F("legs")}"/>
          <path d="M48 170 L58 170 L57 182 L49 182 Z" fill="#2a313b"/>
          <path d="M72 170 L62 170 L63 182 L71 182 Z" fill="#2a313b"/>
        </g>
        <!-- BACK -->
        <g stroke="#0c0f13" stroke-width="1.2">
          <ellipse cx="170" cy="18" rx="11" ry="13" fill="#2a313b"/>
          <path d="M162 32 L178 32 L177 40 L163 40 Z" fill="#2a313b"/>
          <path data-part="shoulders" d="M144 42 Q152 36 162 40 L160 56 Q148 54 144 48 Z" fill="${F("shoulders")}"/>
          <path data-part="shoulders" d="M196 42 Q188 36 178 40 L180 56 Q192 54 196 48 Z" fill="${F("shoulders")}"/>
          <path data-part="back" d="M160 42 Q170 38 180 42 L179 76 Q170 82 161 76 Z" fill="${F("back")}"/>
          <path data-part="glutes" d="M161 80 Q170 84 179 80 L178 100 Q170 106 162 100 Z" fill="${F("glutes")}"/>
          <path data-part="arms" d="M143 50 L138 88 L146 90 L152 58 Z" fill="${F("arms")}"/>
          <path data-part="arms" d="M197 50 L202 88 L194 90 L188 58 Z" fill="${F("arms")}"/>
          <path data-part="legs" d="M162 104 L158 168 L168 168 L170 106 Z" fill="${F("legs")}"/>
          <path data-part="legs" d="M178 104 L182 168 L172 168 L170 106 Z" fill="${F("legs")}"/>
          <path d="M158 170 L168 170 L167 182 L159 182 Z" fill="#2a313b"/>
          <path d="M182 170 L172 170 L173 182 L181 182 Z" fill="#2a313b"/>
        </g>
        <text x="60" y="196" font-size="8" fill="#8b95a1" text-anchor="middle" letter-spacing="2">FRONT</text>
        <text x="170" y="196" font-size="8" fill="#8b95a1" text-anchor="middle" letter-spacing="2">BACK</text>
        <!-- legend -->
        <g font-size="7" fill="#8b95a1">
          <rect x="18" y="214" width="8" height="8" fill="#ff4d9d"/><text x="30" y="221">Just hit (0-2d)</text>
          <rect x="90" y="214" width="8" height="8" fill="#b788ff"/><text x="102" y="221">Recent (3-5d)</text>
          <rect x="162" y="214" width="8" height="8" fill="#00f5d4"/><text x="174" y="221">Fresh (6-8d)</text>
          <rect x="18" y="230" width="8" height="8" fill="#3d4a63"/><text x="30" y="237">Going cold (9d+)</text>
          <rect x="90" y="230" width="8" height="8" fill="#20262e"/><text x="102" y="237">No data yet</text>
        </g>
      </svg>
    </div>
    ${stale.length ? `<div class="mm-callout">GOING COLD: ${stale.map(p => p.toUpperCase()).join(" · ")} — ${ds[stale[0]]}+ days. Build them into this week.</div>` : ""}
  `;
  card.querySelectorAll("[data-part]").forEach(el => {
    el.style.cursor = "pointer";
    el.addEventListener("click", () => {
      const counts = _anatomyVolumeByPart(7);
      openAnatomyDetail(el.dataset.part, counts[el.dataset.part] || 0);
    });
  });
}


// =================================================================
// SUB-NAVS — fitness (Summary/PRs/Progress/Calendar/Saved) +
//            nutrition (Tracker/Summary/Saved/Calendar)
// =================================================================
function _tagFitnessSections(){
  // Assign each fitness card to a sub-section so chips can toggle them
  const tag = (sel, sec) => { const el = document.querySelector(sel); if(el){ const card = el.closest(".card, .plan-mini") || el; card.dataset.fsec = sec; } };
  tag("#muscleMapCard", "summary");
  tag("#fitWeekCard", "summary");
  tag("#fitDayCard", "summary");
  tag("#sessionCard", "summary");
  tag("#calCard", "calendar");
  tag("#liftsCard", "prs");
  tag("#heatmap", "progress");
  tag("#fitWodTitle", "summary");
  const bp = document.getElementById("bodyCoverageCard");
  if(bp) bp.dataset.fsec = "progress";
  const an = document.getElementById("anatomyCard");
  if(an) an.dataset.fsec = "summary";
}
let _fitSub = "summary";
function applyFitSub(){
  _tagFitnessSections();
  document.querySelectorAll("#fitSubnav .sub-chip").forEach(c =>
    c.classList.toggle("active", c.dataset.fsub === _fitSub));
  document.querySelectorAll('#view-fitness [data-fsec]').forEach(el => {
    el.classList.toggle("hidden", el.dataset.fsec !== _fitSub);
  });
}
onReady(() => {
  document.querySelectorAll("#fitSubnav .sub-chip").forEach(c => {
    c.addEventListener("click", () => {
      const sub = c.dataset.fsub;
      if(sub === "saved"){ go("library"); return; }
      _fitSub = sub;
      applyFitSub();
    });
  });
  // Nutrition chips: toggle sub-sections; Calendar opens the full
  // nutrition history overlay (Day/Week/Month/90D/Year)
  const NUT_SECTIONS = {
    diary:     ["#diaryCard", "#usualsRow"],
    calories:  ["#calSubCard"],
    nutrients: ["#nutSummaryCard", "#nutCalcCard", "#detailCard"],
    macros:    ["#macroSubCard"],
  };
  const applyNutSub = (sub) => {
    document.querySelectorAll("#nutSubnav .sub-chip").forEach(x =>
      x.classList.toggle("active", x.dataset.nsub === sub));
    const all = new Set(Object.values(NUT_SECTIONS).flat());
    all.forEach(sel => {
      document.querySelectorAll("#view-nutrition " + sel).forEach(el => el.classList.add("nsec-hide"));
    });
    (NUT_SECTIONS[sub] || []).forEach(sel => {
      document.querySelectorAll("#view-nutrition " + sel).forEach(el => el.classList.remove("nsec-hide"));
    });
    window._nutSub = sub;
    // Charts must draw AFTER their canvas is visible
    if(sub === "calories") renderCalSub();
    else if(sub === "macros") renderMacroSub();
    else if(sub === "nutrients"){
      const d = document.getElementById("detailCard");
      if(d) d.open = true;
      renderNutrientsTable();
    }
  };
  window._nutSub = "diary";
  document.querySelectorAll("#nutSubnav .sub-chip").forEach(c => {
    c.addEventListener("click", () => applyNutSub(c.dataset.nsub));
  });
});



// =================================================================
// v9 — section rings, training-volume progress, nutrients table,
//       body composition
// =================================================================
function drawSectionRing(canvasId, pct, color){
  const cv = document.getElementById(canvasId);
  if(!cv) return;
  const ctx = cv.getContext("2d");
  const w = cv.width, h = cv.height;
  ctx.clearRect(0,0,w,h);
  const cx = w/2, cy = h/2, r = (Math.min(w,h)/2) - 6;
  ctx.beginPath(); ctx.lineWidth = 6; ctx.lineCap = "butt";
  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
  const p = Math.max(0, Math.min(1, pct));
  if(p > 0){
    ctx.beginPath(); ctx.lineCap = "round"; ctx.strokeStyle = color;
    ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + p*Math.PI*2); ctx.stroke();
  }
  ctx.fillStyle = "#f2f5f7";
  ctx.font = "800 11px 'Inter Tight', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(Math.round(p*100) + "%", cx, cy);
}
function renderFitRing(){
  const g = getActivityGoals();
  const a = getActivityForDay(currentDate);
  drawRingStack("fitMiniRings", [
    { color:"#ff4d9d", track:"#111622", val:a.move,     goal:g.move,     r:40, lw:9 },
    { color:"#00f5d4", track:"#111622", val:a.exercise, goal:g.exercise, r:29, lw:9 },
    { color:"#4db8ff", track:"#111622", val:a.stand,    goal:g.stand,    r:18, lw:9 },
  ]);
}
function renderNutRing(){
  const t = totalsFor(currentDate);
  const g = goalsForDay(currentDate);
  drawRingStack("nutMiniRings", [
    { color:"#b788ff", track:"#111622", val:t.cal, goal:g.cal || 2200,   r:40, lw:9 },
    { color:"#00f5d4", track:"#111622", val:t.p,   goal:g.protein || 1,  r:29, lw:9 },
    { color:"#4db8ff", track:"#111622", val:t.c,   goal:g.carbs || 1,    r:18, lw:9 },
  ]);
}
function renderBodyRing(){
  const wts = state.weights || [];
  const goal = (state.goals || {}).weight;
  if(!wts.length || !goal){ drawSectionRing("bodyRing", 0, "#4db8ff"); return; }
  const start = wts[0].val, cur = wts[wts.length-1].val;
  const total = Math.abs(start - goal);
  const done = Math.abs(start - cur);
  const movingRightWay = (start > goal && cur <= start) || (start < goal && cur >= start);
  drawSectionRing("bodyRing", total < 0.1 ? 1 : (movingRightWay ? done/total : 0), "#4db8ff");
}

// ---- Training volume progress (Fitbod Overall Strength style) ----
let _fpScale = "m";
let _fpChartRef = null;
function _volumeBuckets(scale){
  // Returns [{label, vol}] oldest -> newest
  const out = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const dayVol = (k) => ((state.days[k] || {}).sessions || [])
    .reduce((n, s) => n + (s.weight||0)*(s.reps||0)*(s.sets||1), 0);
  if(scale === "w"){
    for(let i = 6; i >= 0; i--){
      const d = new Date(today.getTime() - i*86400000);
      out.push({ label: d.toLocaleDateString(undefined,{weekday:"narrow"}), vol: dayVol(todayKey(d)) });
    }
  } else if(scale === "m" || scale === "6m"){
    const weeks = scale === "m" ? 5 : 26;
    for(let w = weeks-1; w >= 0; w--){
      const start = new Date(weekStart(today).getTime() - w*7*86400000);
      let v = 0;
      for(let i = 0; i < 7; i++) v += dayVol(todayKey(new Date(start.getTime() + i*86400000)));
      out.push({ label: start.toLocaleDateString(undefined,{month:"numeric",day:"numeric"}), vol: v });
    }
  } else {
    for(let m = 11; m >= 0; m--){
      const d = new Date(today.getFullYear(), today.getMonth()-m, 1);
      const end = new Date(d.getFullYear(), d.getMonth()+1, 1);
      let v = 0;
      Object.keys(state.days).forEach(k => {
        const dk = new Date(k + "T12:00:00");
        if(dk >= d && dk < end) v += dayVol(k);
      });
      out.push({ label: d.toLocaleDateString(undefined,{month:"narrow"}), vol: v });
    }
  }
  return out;
}
function renderFitProgress(){
  const cv = document.getElementById("fpChart");
  if(!cv || typeof Chart === "undefined") return;
  const data = _volumeBuckets(_fpScale);
  const vols = data.map(d => d.vol);
  const total = vols.reduce((a,b) => a+b, 0);
  const nonzero = vols.filter(v => v > 0);
  const best = nonzero.length ? Math.max(...nonzero) : 0;
  const avg = nonzero.length ? total/nonzero.length : 0;
  const half = Math.floor(vols.length/2);
  const firstHalf = vols.slice(0, half).reduce((a,b)=>a+b,0);
  const secondHalf = vols.slice(half).reduce((a,b)=>a+b,0);
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set("fpBig", total > 0 ? Math.round(total).toLocaleString() + " " + unit() : "No data");
  set("fpSub", total > 0 ? `total volume (${unit()} × reps) this period` : "log lifts to see your volume trend");
  set("fpBest", best ? Math.round(best).toLocaleString() : "—");
  set("fpAvg", avg ? Math.round(avg).toLocaleString() : "—");
  set("fpTrend", (firstHalf > 0 || secondHalf > 0)
    ? (secondHalf >= firstHalf
        ? "▲ up " + (firstHalf ? Math.round(((secondHalf-firstHalf)/firstHalf)*100) + "%" : "")
        : "▼ down " + Math.round(((firstHalf-secondHalf)/Math.max(1,firstHalf))*100) + "%")
    : "—");
  document.querySelectorAll(".fp-scale").forEach(b =>
    b.classList.toggle("active", b.dataset.fp === _fpScale));
  if(_fpChartRef){ _fpChartRef.destroy(); _fpChartRef = null; }
  _fpChartRef = new Chart(cv.getContext("2d"), {
    type: "bar",
    data: {
      labels: data.map(d => d.label),
      datasets: [{ data: vols, backgroundColor: vols.map(v => v > 0 ? "#00f5d4" : "#20262e"), borderRadius: 2 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#8b95a1", font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
        y: { grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "#8b95a1", font: { size: 9 }, maxTicksLimit: 5 } },
      },
    },
  });
}
onReady(() => {
  document.querySelectorAll(".fp-scale").forEach(b => {
    b.addEventListener("click", () => { _fpScale = b.dataset.fp; renderFitProgress(); });
  });
});

// ---- Nutrients table (MFP-style Total / Goal / Left) ----
function renderNutrientsTable(){
  const el = document.getElementById("ntTable");
  if(!el) return;
  const day = dayObj(currentDate);
  let cal=0,p=0,c=0,f=0,fiber=0,sugar=0;
  ["breakfast","lunch","dinner","snacks"].forEach(m => {
    (day.meals[m]||[]).forEach(it => {
      cal += it.cal||0; p += it.p||0; c += it.c||0; f += it.f||0;
      fiber += it.fiber||0; sugar += it.sugar||0;
    });
  });
  const g = goalsForDay(currentDate);
  const rows = [
    ["Calories", Math.round(cal), g.cal || 2200, ""],
    ["Protein", Math.round(p), g.protein || 0, "g"],
    ["Carbohydrates", Math.round(c), g.carbs || 0, "g"],
    ["Fiber", Math.round(fiber), g.fiber || 25, "g"],
    ["Sugar", Math.round(sugar), g.sugar || 25, "g"],
    ["Fat", Math.round(f), g.fat || 0, "g"],
  ];
  el.innerHTML = `
    <div class="nt-row nt-head"><span>Nutrient</span><b>Total</b><b>Goal</b><b>Left</b></div>
    ${rows.map(([name, tot, goal, u]) => {
      const left = Math.max(0, goal - tot);
      const over = tot > goal && goal > 0;
      const pct = goal > 0 ? Math.min(100, (tot/goal)*100) : 0;
      return `<div class="nt-block">
        <div class="nt-row">
          <span>${name}</span>
          <b>${tot}${u}</b>
          <b class="nt-goal">${goal}${u}</b>
          <b class="${over ? "nt-over" : "nt-left"}">${over ? (tot-goal)+u+" over" : left+u}</b>
        </div>
        <div class="nt-bar"><i style="width:${pct}%;background:${over ? "var(--iron-red)" : "var(--iron-volt)"}"></i></div>
      </div>`;
    }).join("")}
  `;
}

// ---- Body composition (Fitbod Results style) ----
function renderBodyComp(){
  const grid = document.getElementById("bcGrid");
  if(!grid) return;
  const wts = state.weights || [];
  const lastW = wts.length ? wts[wts.length-1] : null;
  const bfEntry = (state.measurements || []).slice().reverse().find(m => m.type === "bodyfat");
  const bf = bfEntry ? parseFloat(bfEntry.val) : null;
  const wLb = lastW ? (state.profile.units === "metric" ? lastW.val * 2.2046 : lastW.val) : null;
  const heightIn = state.profile.heightIn || null;
  const fatMass = (wLb != null && bf != null) ? wLb * bf/100 : null;
  const leanMass = (wLb != null && bf != null) ? wLb - fatMass : null;
  const bmi = (wLb != null && heightIn) ? (wLb * 703) / (heightIn * heightIn) : null;
  // Katch-McArdle when BF known, else Mifflin-St Jeor
  let bmr = null;
  if(wLb != null){
    const kg = wLb * 0.4536;
    if(leanMass != null){
      bmr = 370 + 21.6 * (leanMass * 0.4536);
    } else if(heightIn && state.profile.ageYears){
      const cm = heightIn * 2.54;
      const male = state.profile.sex === "male" || state.profile.sex === "m";
      bmr = 10*kg + 6.25*cm - 5*(state.profile.ageYears) + (male ? 5 : -161);
    }
  }
  const u = unit();
  const cells = [
    ["Weight", lastW ? `${lastW.val} ${u}` : "—", lastW ? fmtDate(lastW.date) : "log a weigh-in"],
    ["Body fat", bf != null ? `${bf}%` : "—", bfEntry ? fmtDate(bfEntry.date) : "add in measurements"],
    ["Lean mass", leanMass != null ? `${leanMass.toFixed(1)} lb` : "—", leanMass != null ? "" : "needs weight + BF%"],
    ["Fat mass", fatMass != null ? `${fatMass.toFixed(1)} lb` : "—", ""],
    ["BMI", bmi != null ? bmi.toFixed(1) : "—", bmi != null ? "" : "needs height"],
    ["Metabolic rate", bmr != null ? `${Math.round(bmr)} kcal` : "—", bmr != null ? "at rest (BMR)" : ""],
  ];
  grid.innerHTML = cells.map(([l, v, sub]) => `
    <div class="bc-cell">
      <span>${l}</span><b>${escape(String(v))}</b>${sub ? `<small>${escape(sub)}</small>` : ""}
    </div>`).join("");
}



// =================================================================
// COMPARE CARD — this week vs a chosen week
// =================================================================
let _cmpOffset = 1;      // weeks back
let _cmpCustomStart = null; // YYYY-MM-DD of any day in the custom week
function _weekMetrics(monDate){
  const out = { workouts:0, volume:0, calDays:0, calSum:0, waterSum:0, days:0 };
  for(let i = 0; i < 7; i++){
    const d = new Date(monDate.getTime() + i*86400000);
    const k = todayKey(d);
    if(k > todayKey()) break; // don't count future days
    out.days++;
    const day = state.days[k] || {};
    const sessions = day.sessions || [];
    if(sessions.length) out.workouts++;
    out.volume += sessions.reduce((n,x) => n + (x.weight||0)*(x.reps||0)*(x.sets||1), 0);
    const cal = totalsFor(k).cal;
    if(cal > 0){ out.calDays++; out.calSum += cal; }
    out.waterSum += day.water || 0;
  }
  return out;
}
function renderCompareCard(){
  const wrap = document.getElementById("cmpRows");
  if(!wrap) return;
  const thisMon = weekStart(new Date());
  let thatMon;
  if(_cmpCustomStart){
    thatMon = weekStart(new Date(_cmpCustomStart + "T12:00:00"));
  } else {
    thatMon = new Date(thisMon.getTime() - _cmpOffset*7*86400000);
  }
  const A = _weekMetrics(thisMon);
  // For the comparison week, count the same number of elapsed days for fairness
  const B = _weekMetrics(thatMon);
  const bDays = Math.min(B.days, A.days) || 1;
  const label = thatMon.toLocaleDateString(undefined,{month:"short",day:"numeric"});
  const row = (name, a, b, fmt, higherBetter=true) => {
    const diff = a - b;
    const arrow = diff === 0 ? "—" : (diff > 0 ? "▲" : "▼");
    const good = diff === 0 ? "" : ((diff > 0) === higherBetter ? "cmp-good" : "cmp-bad");
    return `<div class="cmp-row">
      <span>${name}</span>
      <b>${fmt(a)}</b>
      <s>vs ${fmt(b)}</s>
      <em class="${good}">${arrow} ${fmt(Math.abs(diff))}</em>
    </div>`;
  };
  const n0 = (v) => Math.round(v).toLocaleString();
  wrap.innerHTML = `
    <div class="cmp-sub">This week (${A.days}d) vs week of ${label}</div>
    ${row("Workouts", A.workouts, B.workouts, n0)}
    ${row("Volume (" + unit() + ")", A.volume, B.volume, n0)}
    ${row("Avg cal/day", A.calDays ? A.calSum/A.calDays : 0, B.calDays ? B.calSum/B.calDays : 0, n0, false)}
    ${row("Water (oz)", A.waterSum, B.waterSum, n0)}
  `;
}
onReady(() => {
  const sel = document.getElementById("cmpWeekSel");
  const custom = document.getElementById("cmpCustom");
  if(sel) sel.addEventListener("change", () => {
    if(sel.value === "custom"){
      custom.style.display = "";
      if(custom.value){ _cmpCustomStart = custom.value; renderCompareCard(); }
    } else {
      custom.style.display = "none";
      _cmpCustomStart = null;
      _cmpOffset = parseInt(sel.value, 10) || 1;
      renderCompareCard();
    }
  });
  if(custom) custom.addEventListener("change", () => {
    if(custom.value){ _cmpCustomStart = custom.value; renderCompareCard(); }
  });
});



// =================================================================
// v11 NUTRITION — MFP-style diary + sub-pages + item actions
// =================================================================
const MEAL_ORDER = ["breakfast","lunch","dinner","snacks"];
const MEAL_LABEL = { breakfast:"Breakfast", lunch:"Lunch", dinner:"Dinner", snacks:"Snacks" };
let _dySelectMode = false;
let _dySelected = new Set(); // "meal|id"

function getFavFoods(){
  if(!state.favFoods) state.favFoods = [];
  return state.favFoods;
}

function _mealTotals(meal){
  const day = dayObj(currentDate);
  return (day.meals[meal]||[]).reduce((a,it) => ({
    cal:a.cal+(it.cal||0), p:a.p+(it.p||0), c:a.c+(it.c||0), f:a.f+(it.f||0)
  }), {cal:0,p:0,c:0,f:0});
}

// ---- Top stat row (one line under the brain row) ----
function renderNutTopStats(){
  const el = document.getElementById("nutTopStats");
  if(!el) return;
  const t = totalsFor(currentDate);
  const g = goalsForDay(currentDate);
  const water = (state.days[currentDate]||{}).water || 0;
  el.innerHTML = `
    ${g.mode ? `<span class="cyc-tag cyc-${g.mode}">${g.mode === "training" ? "TRAINING DAY" : "REST DAY"} CARBS</span>` : ""}
    <span><i style="color:#b788ff">Cal</i> <b>${Math.round(t.cal)}</b>/${g.cal||0}</span>
    <span><i style="color:#4db8ff">P</i> <b>${Math.round(t.p)}</b>/${g.protein||0}</span>
    <span><i style="color:#00f5d4">C</i> <b>${Math.round(t.c)}</b>/${g.carbs||0}</span>
    <span><i style="color:#ff4d9d">F</i> <b>${Math.round(t.f)}</b>/${g.fat||0}</span>
    <span><i style="color:#4db8ff">Water</i> <b>${Math.round(water)}</b>/${g.water||64}</span>`;
}
function renderFitTopStats(){
  const el = document.getElementById("fitTopStats");
  if(!el) return;
  const a = getActivityForDay(currentDate);
  const g = getActivityGoals();
  const lifted = _liftedLbFor(currentDate);
  el.innerHTML = `
    <span><i style="color:#ff4d9d">Move</i> <b>${Math.round(a.move)}</b>/${g.move}</span>
    <span><i style="color:#00f5d4">Ex</i> <b>${Math.round(a.exercise)}</b>/${g.exercise}m</span>
    <span><i style="color:#4db8ff">Stand</i> <b>${Math.round(a.stand)}</b>/${g.stand}h</span>
    <span><i style="color:#8b95a1">Lifted</i> <b>${Math.round(lifted).toLocaleString()}</b> ${unit()}</span>`;
}
function renderBodyTopStats(){
  const el = document.getElementById("bodyTopStats");
  if(!el) return;
  const wts = state.weights || [];
  const last = wts.length ? wts[wts.length-1] : null;
  const goal = (state.goals||{}).weight;
  el.innerHTML = last
    ? `<span><i style="color:#4db8ff">Now</i> <b>${last.val}</b> ${unit()}</span>
       <span><i style="color:#00f5d4">Goal</i> <b>${goal || "—"}</b>${goal ? " "+unit() : ""}</span>
       <span><i style="color:#8b95a1">To go</i> <b>${goal ? Math.abs(last.val-goal).toFixed(1) : "—"}</b></span>`
    : `<span><i style="color:#8b95a1">No weigh-ins yet</i></span>`;
}

// ---- DIARY (one box, per-meal macros, item actions) ----
function renderDiary(){
  const list = document.getElementById("diaryList");
  if(!list) return;
  const day = dayObj(currentDate);
  list.innerHTML = MEAL_ORDER.map(meal => {
    const items = day.meals[meal] || [];
    const mt = _mealTotals(meal);
    const rows = items.map(it => {
      const key = meal + "|" + it.id;
      return `<div class="dy-item ${_dySelected.has(key) ? "sel" : ""}" data-meal="${meal}" data-id="${it.id}">
        ${_dySelectMode ? `<span class="dy-check">${_dySelected.has(key) ? "☑" : "☐"}</span>` : ""}
        <div class="dy-item-info">
          <b>${escape(it.name)}</b>
          <small>${escape(it.serving||"")}${it.serving ? " · " : ""}P${Math.round(it.p||0)} C${Math.round(it.c||0)} F${Math.round(it.f||0)}</small>
        </div>
        <span class="dy-item-cal">${Math.round(it.cal||0)}</span>
      </div>`;
    }).join("");
    return `<div class="dy-meal" data-meal="${meal}">
      <div class="dy-meal-head">
        <b>${MEAL_LABEL[meal]}</b>
        <small>${Math.round(mt.cal)} cal · P${Math.round(mt.p)} C${Math.round(mt.c)} F${Math.round(mt.f)}</small>
        <span class="dy-meal-btns">
          <button class="dy-add" data-dy-add="${meal}" title="Add food">+ ADD</button>
          <button class="dy-macros" data-dy-macros="${meal}" title="Log macros only, no food item">±M</button>
        </span>
      </div>
      ${rows || `<div class="dy-empty">Nothing logged</div>`}
    </div>`;
  }).join("");

  list.querySelectorAll("[data-dy-add]").forEach(b =>
    b.addEventListener("click", () => openFoodModal(b.dataset.dyAdd)));
  list.querySelectorAll("[data-dy-macros]").forEach(b =>
    b.addEventListener("click", () => openMacrosOnlyModal(b.dataset.dyMacros)));
  list.querySelectorAll(".dy-item").forEach(row => {
    row.addEventListener("click", () => {
      const meal = row.dataset.meal, id = row.dataset.id;
      if(_dySelectMode){
        const key = meal + "|" + id;
        _dySelected.has(key) ? _dySelected.delete(key) : _dySelected.add(key);
        const cnt = document.getElementById("dySelCount");
        if(cnt) cnt.textContent = _dySelected.size + " selected";
        renderDiary();
      } else {
        openDiaryItemSheet(meal, id);
      }
    });
  });
  const bar = document.getElementById("dySelectBar");
  if(bar) bar.classList.toggle("hidden", !_dySelectMode);
  const selBtn = document.getElementById("dySelectBtn");
  if(selBtn) selBtn.textContent = _dySelectMode ? "DONE" : "SELECT";
}

// ---- Item action sheet: move / duplicate / favorite / delete ----
function openDiaryItemSheet(meal, id){
  const day = dayObj(currentDate);
  const it = (day.meals[meal]||[]).find(x => x.id === id);
  if(!it) return;
  const others = MEAL_ORDER.filter(m => m !== meal);
  openModal(escape(it.name), `
    <p class="wb-hint" style="margin:0 0 10px">${Math.round(it.cal||0)} cal · P${Math.round(it.p||0)} C${Math.round(it.c||0)} F${Math.round(it.f||0)}${it.serving ? " · " + escape(it.serving) : ""}</p>
    <div class="dy-sheet">
      <div class="dy-sheet-h">Move to</div>
      <div class="dy-sheet-row">${others.map(m => `<button class="btn btn-ghost btn-sm" data-mv="${m}">${MEAL_LABEL[m]}</button>`).join("")}</div>
      <div class="dy-sheet-h">Duplicate to</div>
      <div class="dy-sheet-row">
        <select id="dupMeal">${MEAL_ORDER.map(m => `<option value="${m}" ${m===meal?"selected":""}>${MEAL_LABEL[m]}</option>`).join("")}</select>
        <input type="date" id="dupDate" value="${currentDate}">
        <button class="btn btn-cyan btn-sm" id="dupGo">COPY</button>
      </div>
      <div class="dy-sheet-row" style="margin-top:10px">
        <button class="btn btn-ghost btn-sm" id="itFav">☆ FAVORITE</button>
        <button class="btn btn-ghost btn-sm" id="itEdit">✎ EDIT</button>
        <button class="btn btn-pink btn-sm" id="itDel">DELETE</button>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" data-close>Close</button></div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    root.querySelectorAll("[data-mv]").forEach(b => b.addEventListener("click", () => {
      day.meals[meal] = day.meals[meal].filter(x => x.id !== id);
      day.meals[b.dataset.mv].push(it);
      save(); closeModal(); renderAll();
      toast(`Moved to ${MEAL_LABEL[b.dataset.mv]}`, "cyan");
    }));
    document.getElementById("dupGo").addEventListener("click", () => {
      const dMeal = document.getElementById("dupMeal").value;
      const dDate = document.getElementById("dupDate").value;
      if(!dDate) return;
      const target = dayObj(dDate);
      target.meals[dMeal].push({ ...it, id: uid() });
      save(); closeModal(); renderAll();
      toast(`Copied to ${MEAL_LABEL[dMeal]} · ${fmtDate(dDate)}`, "cyan");
    });
    document.getElementById("itFav").addEventListener("click", () => {
      const favs = getFavFoods();
      if(!favs.find(f => f.name === it.name)){
        favs.unshift({ name:it.name, serving:it.serving, cal:it.cal, p:it.p, c:it.c, f:it.f });
        state.favFoods = favs.slice(0, 30);
        save(); toast("Saved to favorites ★", "cyan");
      } else toast("Already in favorites", "cyan");
    });
    document.getElementById("itEdit").addEventListener("click", () => {
      closeModal();
      openMacrosOnlyModal(meal, it);
    });
    document.getElementById("itDel").addEventListener("click", () => {
      day.meals[meal] = day.meals[meal].filter(x => x.id !== id);
      save(); closeModal(); renderAll();
      toast("Deleted", "pink");
    });
  });
}

// ---- Macros-only quick entry (also doubles as item editor) ----
function openMacrosOnlyModal(meal, existing){
  const it = existing || { name:"", cal:"", p:"", c:"", f:"", serving:"" };
  openModal(existing ? "Edit item" : "Log macros only", `
    <label><span>Name (optional)</span><input id="moName" type="text" maxlength="40" value="${escape(it.name||"")}" placeholder="e.g. Quick macros"></label>
    <div class="form-grid">
      <label><span>Calories</span><input id="moCal" type="number" min="0" max="4000" value="${it.cal !== "" ? Math.round(it.cal) : ""}"></label>
      <label><span>Protein g</span><input id="moP" type="number" min="0" max="300" step="0.1" value="${it.p !== "" ? it.p : ""}"></label>
      <label><span>Carbs g</span><input id="moC" type="number" min="0" max="500" step="0.1" value="${it.c !== "" ? it.c : ""}"></label>
      <label><span>Fat g</span><input id="moF" type="number" min="0" max="200" step="0.1" value="${it.f !== "" ? it.f : ""}"></label>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="moSave">${existing ? "SAVE" : "+ LOG"}</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("moSave").addEventListener("click", () => {
      const cal = parseFloat(document.getElementById("moCal").value) || 0;
      const p = parseFloat(document.getElementById("moP").value) || 0;
      const c = parseFloat(document.getElementById("moC").value) || 0;
      const f = parseFloat(document.getElementById("moF").value) || 0;
      const name = document.getElementById("moName").value.trim() || "Quick macros";
      if(!cal && !p && !c && !f){ toast("Enter at least one number", "pink"); return; }
      const day = dayObj(currentDate);
      if(existing){
        existing.name = name; existing.cal = cal; existing.p = p; existing.c = c; existing.f = f;
      } else {
        day.meals[meal].push({ id: uid(), name, serving:"", cal, p, c, f });
      }
      save(); closeModal(); renderAll();
      toast(existing ? "Updated" : `Logged to ${MEAL_LABEL[meal]}`, "cyan");
    });
  });
}



// ---- Multi-select → save as meal ----
function saveSelectionAsMeal(){
  if(!_dySelected.size){ toast("Tap items to select first", "pink"); return; }
  const day = dayObj(currentDate);
  const items = [];
  _dySelected.forEach(key => {
    const [meal, id] = key.split("|");
    const it = (day.meals[meal]||[]).find(x => x.id === id);
    if(it) items.push({ name:it.name, serving:it.serving, cal:it.cal, p:it.p, c:it.c, f:it.f });
  });
  if(!items.length) return;
  const name = prompt("Name this meal:", "My meal");
  if(!name) return;
  const totals = items.reduce((a,b) => ({
    cal:a.cal+(b.cal||0), p:a.p+(b.p||0), c:a.c+(b.c||0), f:a.f+(b.f||0)
  }), {cal:0,p:0,c:0,f:0});
  ["cal","p","c","f"].forEach(k => totals[k] = Math.round(totals[k]*10)/10);
  if(!state.mealTemplates) state.mealTemplates = [];
  state.mealTemplates.unshift({ id: uid(), name, items, totals, createdAt: currentDate });
  save();
  _dySelectMode = false; _dySelected.clear();
  renderDiary();
  toast(`Saved meal: ${name} (${items.length} items)`, "cyan");
}

// ---- CALORIES sub-page (MFP: donut by meal + totals rows) ----
const MEAL_COLORS = { breakfast:"#4d8dff", lunch:"#1f5fd6", dinner:"#7ab0ff", snacks:"#2e77e6" };
let _calDonutRef = null, _macroDonutRef = null;
function renderCalSub(){
  const cv = document.getElementById("calDonut");
  if(!cv || typeof Chart === "undefined") return;
  const totals = MEAL_ORDER.map(m => _mealTotals(m).cal);
  const totalCal = totals.reduce((a,b) => a+b, 0);
  if(_calDonutRef){ _calDonutRef.destroy(); _calDonutRef = null; }
  _calDonutRef = new Chart(cv.getContext("2d"), {
    type: "doughnut",
    data: {
      labels: MEAL_ORDER.map(m => MEAL_LABEL[m]),
      datasets: [{
        data: totalCal ? totals : [1],
        backgroundColor: totalCal ? MEAL_ORDER.map(m => MEAL_COLORS[m]) : ["#161b22"],
        borderColor: "#07080a", borderWidth: 2,
      }],
    },
    options: { responsive:true, maintainAspectRatio:false, cutout:"62%",
      plugins:{ legend:{ display:false }, tooltip:{ enabled: totalCal > 0 } } },
  });
  const legend = document.getElementById("calLegend");
  if(legend) legend.innerHTML = MEAL_ORDER.map((m,i) => {
    const pct = totalCal ? Math.round((totals[i]/totalCal)*100) : 0;
    return `<div class="dl-row"><span class="dl-swatch" style="background:${MEAL_COLORS[m]}"></span>
      <b>${MEAL_LABEL[m]}</b><small>${pct}% (${Math.round(totals[i])} cal)</small></div>`;
  }).join("");
  const t = totalsFor(currentDate);
  const a = getActivityForDay(currentDate);
  const g = goalsForDay(currentDate);
  const rowsEl = document.getElementById("calTotals");
  if(rowsEl) rowsEl.innerHTML = `
    <div class="mfp-row"><span>Total Calories</span><b>${Math.round(t.cal)}</b></div>
    <div class="mfp-row"><span>Exercise Burn</span><b>${a.move ? "-" + Math.round(a.move) : "0"}</b></div>
    <div class="mfp-row"><span>Net Calories</span><b>${Math.round(t.cal - (a.move||0))}</b></div>
    <div class="mfp-row"><span>Goal</span><b class="mfp-goal">${g.cal || 0}</b></div>`;
}

// ---- MACROS sub-page (MFP: split donut + total% vs goal%) ----
function renderMacroSub(){
  const cv = document.getElementById("macroDonut");
  if(!cv || typeof Chart === "undefined") return;
  const t = totalsFor(currentDate);
  const g = goalsForDay(currentDate);
  const calFrom = { c: t.c*4, f: t.f*9, p: t.p*4 };
  const totalMacroCal = calFrom.c + calFrom.f + calFrom.p;
  const goalCal = { c:(g.carbs||0)*4, f:(g.fat||0)*9, p:(g.protein||0)*4 };
  const goalTotal = goalCal.c + goalCal.f + goalCal.p || 1;
  const COLORS = { c:"#00f5d4", f:"#b788ff", p:"#b788ff" };
  if(_macroDonutRef){ _macroDonutRef.destroy(); _macroDonutRef = null; }
  _macroDonutRef = new Chart(cv.getContext("2d"), {
    type:"doughnut",
    data:{
      labels:["Carbohydrates","Fat","Protein"],
      datasets:[{
        data: totalMacroCal ? [calFrom.c, calFrom.f, calFrom.p] : [1],
        backgroundColor: totalMacroCal ? [COLORS.c, COLORS.f, COLORS.p] : ["#161b22"],
        borderColor:"#07080a", borderWidth:2,
      }],
    },
    options:{ responsive:true, maintainAspectRatio:false, cutout:"62%",
      plugins:{ legend:{ display:false }, tooltip:{ enabled: totalMacroCal > 0 } } },
  });
  const pct = (v) => totalMacroCal ? Math.round((v/totalMacroCal)*100) : 0;
  const gpct = (v) => Math.round((v/goalTotal)*100);
  const rows = document.getElementById("macroRows");
  if(rows) rows.innerHTML = `
    <div class="mfp-row mfp-head"><span></span><b>Total</b><b class="mfp-goal">Goal</b></div>
    <div class="mfp-row"><span><i class="dl-swatch" style="background:${COLORS.c}"></i>Carbohydrates (${Math.round(t.c)}g)</span><b>${pct(calFrom.c)}%</b><b class="mfp-goal">${gpct(goalCal.c)}%</b></div>
    <div class="mfp-row"><span><i class="dl-swatch" style="background:${COLORS.f}"></i>Fat (${Math.round(t.f)}g)</span><b>${pct(calFrom.f)}%</b><b class="mfp-goal">${gpct(goalCal.f)}%</b></div>
    <div class="mfp-row"><span><i class="dl-swatch" style="background:${COLORS.p}"></i>Protein (${Math.round(t.p)}g)</span><b>${pct(calFrom.p)}%</b><b class="mfp-goal">${gpct(goalCal.p)}%</b></div>`;
}

onReady(() => {
  on("#fwOpenPlanner", "click", () => go("plan"));
  on("#dySelectBtn", "click", () => {
    _dySelectMode = !_dySelectMode;
    if(!_dySelectMode) _dySelected.clear();
    renderDiary();
  });
  on("#dySaveMeal", "click", saveSelectionAsMeal);
  on("#dySelCancel", "click", () => { _dySelectMode = false; _dySelected.clear(); renderDiary(); });
});



// =================================================================
// v12 FITNESS — week plan mini-list + day view + hearts
// =================================================================
function getFavLifts(){
  if(!state.favLifts) state.favLifts = [];
  return state.favLifts;
}

// Compact Sun–Sat plan list (mirrors the nutrition diary's density);
// tapping a row selects that day (shared currentDate) and shows it below.
function renderFitWeekList(){
  const el = document.getElementById("fitWeekList");
  if(!el) return;
  const sun = weekStart(new Date(currentDate + "T12:00:00"));
  const wk = weekKey(sun);
  const wkPlan = (state.plan && state.plan[wk]) || {};
  const names = ["sun","mon","tue","wed","thu","fri","sat"];
  let html = "";
  for(let i = 0; i < 7; i++){
    const d = new Date(sun.getTime() + i*86400000);
    const k = todayKey(d);
    const p = wkPlan[names[i]] || {};
    const done = ((state.days[k] || {}).sessions || []).length > 0;
    const isSel = k === currentDate;
    const label = p.type || "—";
    const extras = (p.extra || []).length ? ` +${p.extra.length}` : "";
    html += `<button class="fw-row ${isSel?"sel":""} ${done?"done":""}" data-date="${k}" data-day="${names[i]}">
      <span class="fw-d">${d.toLocaleDateString(undefined,{weekday:"short"}).toUpperCase()}</span>
      <b>${escape(label)}${extras}</b>
      ${p.time ? `<em>${escape(fmtTime12(p.time))}</em>` : ""}
      <span class="fw-mark">${done ? "✓" : ""}</span>
    </button>`;
  }
  el.innerHTML = html;
  el.querySelectorAll(".fw-row").forEach(r => {
    r.addEventListener("click", () => { currentDate = r.dataset.date; renderAll(); });
  });
}

// Day view: planned workout(s) for the selected day — movements, gym,
// time — with START / EDIT / heart-to-save.
function renderFitDayCard(){
  const card = document.getElementById("fitDayCard");
  if(!card) return;
  const dt = new Date(currentDate + "T12:00:00");
  const dayName = ["sun","mon","tue","wed","thu","fri","sat"][dt.getDay()];
  const wk = weekKey(weekStart(dt));
  const p = (state.plan && state.plan[wk] && state.plan[wk][dayName]) || null;
  const sessions = ((state.days[currentDate] || {}).sessions || []);
  const head = `
    <div class="card-head">
      <span class="card-eyebrow">${fmtDate(currentDate)}${p && p.gym ? " · " + escape(p.gym) : ""}</span>
      <button class="link-btn-sm" id="fdEdit">${p ? "EDIT DAY" : "+ PLAN DAY"}</button>
    </div>`;
  if(!p || !p.type){
    card.innerHTML = head + `<p class="wl-empty">Nothing planned. Tap + PLAN DAY — pick a saved workout or type your movements.</p>
      ${sessions.length ? `<p class="fd-logged">✓ ${sessions.length} entr${sessions.length===1?"y":"ies"} logged anyway — nice.</p>` : ""}`;
  } else {
    const workouts = [{ name:p.type, time:p.time, why:p.why, exercises:p.exercises || [] }].concat(p.extra || []);
    card.innerHTML = head + workouts.map((w, wi) => `
      <div class="fd-workout">
        <div class="fd-w-head">
          <b>${escape(w.name)}</b>
          ${w.time ? `<em>${escape(fmtTime12(w.time))}</em>` : ""}
          <button class="fd-heart" data-fdw="${wi}" title="Save to My Workouts">♥</button>
        </div>
        ${w.why ? `<p class="fd-why">Why: ${escape(w.why)}</p>` : ""}
        ${(w.exercises || []).length
          ? `<ul class="fd-moves">${w.exercises.map(e => `<li>${escape(e.name)}${e.scheme ? ` <i>${escape(e.scheme)}</i>` : ""}</li>`).join("")}</ul>`
          : `<p class="fd-nomoves">No movements listed — EDIT DAY to add them.</p>`}
      </div>`).join("") + `
      <div class="fd-actions">
        <button class="btn btn-lime" id="fdStart">▶ START WORKOUT</button>
        <button class="btn btn-ghost" id="fdLogSet">+ QUICK SET</button>
      </div>
      ${sessions.length ? `<p class="fd-logged">✓ ${sessions.length} entr${sessions.length===1?"y":"ies"} logged</p>` : ""}`;
    on2(card, "#fdStart", () => openWorkoutSession(currentDate));
    on2(card, "#fdLogSet", () => openLiftModal());
    card.querySelectorAll(".fd-heart").forEach(b => b.addEventListener("click", () => {
      const w = workouts[parseInt(b.dataset.fdw, 10)];
      if(!w || !(w.exercises || []).length){ toast("Add movements first, then save", "pink"); return; }
      const lib = getWorkoutLib();
      if(lib.find(x => x.name === w.name)){ toast("Already in My Workouts", "cyan"); return; }
      lib.unshift({ id: uid(), name: w.name, style: "Lift Day", exercises: w.exercises.map(e => ({ name:e.name, scheme:e.scheme||"" })) });
      save(); toast(`♥ Saved: ${w.name}`, "cyan");
    }));
  }
  on2(card, "#fdEdit", () => openPlanDayModal(wk, dayName));
}
// bind inside a rerendered card without double-adding
function on2(root, sel, fn){
  const el = root.querySelector(sel);
  if(el) el.addEventListener("click", fn);
}



// =================================================================
// v17 — unified TODAY'S SESSION (lift + cardio in one, editable),
//        LIFT HUB (workouts, not single lifts), interval builder
// =================================================================

// ---- One session card for the selected day: lifts AND cardio ----
function renderSessionCard(){
  const card = document.getElementById("sessionCard");
  if(!card) return;
  const day = state.days[currentDate] || {};
  const sessions = day.sessions || [];
  const lifts = sessions.filter(s => s.type !== "cardio");
  const cardio = sessions.filter(s => s.type === "cardio");
  const vol = lifts.reduce((n,s) => n + (s.weight||0)*(s.reps||0)*(s.sets||1), 0);
  const kcal = cardio.reduce((n,s) => n + (s.calories||0), 0);
  const mins = sessions.reduce((n,s) => n + (s.durationMin||0), 0);

  const row = (s) => {
    const bits = [];
    if(s.type === "cardio"){
      if(s.durationMin) bits.push(`${s.durationMin} min`);
      if(s.level) bits.push(`L${s.level}`);
      if(s.mph) bits.push(`${s.mph} mph`);
      if(s.calories) bits.push(`${Math.round(s.calories)} kcal`);
    } else {
      bits.push(`${s.weight||0} ${unit()} × ${s.reps||0}${(s.sets||1) > 1 ? ` × ${s.sets}` : ""}`);
      if(s.durationMin) bits.push(`${s.durationMin} min`);
    }
    return `<button class="se-row ${s.type === "cardio" ? "se-cardio" : "se-lift"}" data-sid="${s.id}">
      <span class="se-kind">${s.type === "cardio" ? "CARDIO" : "LIFT"}</span>
      <span class="se-info">
        <b>${escape(s.name || "Untitled")}</b>
        <small>${escape(bits.join(" · "))}${s.notes ? " · " + escape(s.notes) : ""}</small>
      </span>
      ${s.time ? `<em class="se-time">${escape(fmtTime12(s.time))}</em>` : ""}
      <span class="se-edit">EDIT</span>
    </button>`;
  };

  card.innerHTML = `
    <div class="card-head">
      <span class="card-eyebrow">Today's session · ${fmtDate(currentDate)}</span>
      <span class="card-meta">${sessions.length} ${sessions.length===1?"entry":"entries"}</span>
    </div>
    ${sessions.length ? `<div class="se-totals">
      ${vol ? `<span><i>Volume</i><b>${Math.round(vol).toLocaleString()}</b> ${unit()}</span>` : ""}
      ${kcal ? `<span><i>Burn</i><b>${Math.round(kcal)}</b> kcal</span>` : ""}
      ${mins ? `<span><i>Time</i><b>${mins}</b> min</span>` : ""}
    </div>` : ""}
    <div class="se-list">${sessions.map(row).join("") || `<p class="wl-empty">Nothing logged for this day yet.</p>`}</div>
    <div class="se-actions">
      <button class="btn btn-cyan" id="seAddLift">+ LIFT</button>
      <button class="btn btn-ghost" id="seAddCardio">+ CARDIO</button>
      <button class="btn btn-ghost" id="seAddInterval">+ INTERVALS</button>
    </div>`;

  card.querySelectorAll(".se-row").forEach(r =>
    r.addEventListener("click", () => openSessionEditor(r.dataset.sid)));
  const on2 = (sel, fn) => { const el = card.querySelector(sel); if(el) el.addEventListener("click", fn); };
  on2("#seAddLift", () => openLiftModal());
  on2("#seAddCardio", () => openCardioModal());
  on2("#seAddInterval", () => openIntervalModal());
}

// ---- Edit ANY logged entry: date, time, type, and type-specific fields ----
function openSessionEditor(sid){
  let srcDate = currentDate, item = null;
  const d0 = state.days[currentDate];
  if(d0) item = (d0.sessions || []).find(x => x.id === sid);
  if(!item){
    for(const k of Object.keys(state.days)){
      const f = (state.days[k].sessions || []).find(x => x.id === sid);
      if(f){ item = f; srcDate = k; break; }
    }
  }
  if(!item) return;
  const isCardio = item.type === "cardio";
  const cardioOpts = CARDIO_TYPES.map(t =>
    `<option value="${t.id}" ${item.cardioId === t.id ? "selected" : ""}>${t.name}</option>`).join("");

  openModal("Edit entry", `
    <div class="form-grid">
      <label><span>Date</span><input id="seDate" type="date" value="${srcDate}"></label>
      <label><span>Time of day</span><input id="seTime" type="time" value="${escape(item.time || "")}"></label>
    </div>
    <label><span>Kind</span>
      <select id="seKind">
        <option value="lift" ${!isCardio ? "selected" : ""}>Lift / strength</option>
        <option value="cardio" ${isCardio ? "selected" : ""}>Cardio</option>
      </select>
    </label>
    <div id="seCardioFields" style="${isCardio ? "" : "display:none"}">
      <label><span>Cardio type</span><select id="seCardioType">${cardioOpts}</select></label>
      <div class="form-grid">
        <label><span>Minutes</span><input id="seMin" type="number" min="0" max="600" value="${item.durationMin || ""}"></label>
        <label><span>Calories</span><input id="seKcal" type="number" min="0" max="3000" value="${Math.round(item.calories || 0)}"></label>
        <label><span>Speed (mph)</span><input id="seMph" type="number" step="0.1" min="0" max="20" value="${escape(String(item.mph || ""))}"></label>
        <label><span>Incline / level</span><input id="seLevel" type="number" step="1" min="0" max="30" value="${escape(String(item.level || ""))}"></label>
      </div>
    </div>
    <div id="seLiftFields" style="${isCardio ? "display:none" : ""}">
      <label><span>Movement</span><input id="seName" type="text" value="${escape(item.name || "")}"></label>
      <div class="form-grid">
        <label><span>Weight (${unit()})</span><input id="seWeight" type="number" step="2.5" min="0" value="${item.weight || ""}"></label>
        <label><span>Reps</span><input id="seReps" type="number" min="0" max="500" value="${item.reps || ""}"></label>
        <label><span>Sets</span><input id="seSets" type="number" min="1" max="30" value="${item.sets || 1}"></label>
        <label><span>Minutes</span><input id="seLiftMin" type="number" min="0" max="600" value="${item.durationMin || ""}"></label>
      </div>
    </div>
    <label><span>Notes</span><input id="seNotes" type="text" value="${escape(item.notes || "")}"></label>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-pink" id="seDel">DELETE</button>
      <button class="btn btn-cyan" id="seSave">SAVE</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const kind = document.getElementById("seKind");
    kind.addEventListener("change", () => {
      document.getElementById("seCardioFields").style.display = kind.value === "cardio" ? "" : "none";
      document.getElementById("seLiftFields").style.display = kind.value === "cardio" ? "none" : "";
    });
    document.getElementById("seDel").addEventListener("click", () => {
      const arr = state.days[srcDate].sessions;
      state.days[srcDate].sessions = arr.filter(x => x.id !== sid);
      save(); closeModal(); renderAll();
      toast("Deleted", "pink");
    });
    document.getElementById("seSave").addEventListener("click", () => {
      const newDate = document.getElementById("seDate").value || srcDate;
      const time = document.getElementById("seTime").value || "";
      const notes = document.getElementById("seNotes").value.trim();
      const asCardio = kind.value === "cardio";
      let updated;
      if(asCardio){
        const t = CARDIO_TYPES.find(x => x.id === document.getElementById("seCardioType").value) || CARDIO_TYPES[0];
        const mph = document.getElementById("seMph").value;
        const level = document.getElementById("seLevel").value;
        let nm = t.name;
        if(t.incline && (mph || level)) nm = `${t.name}${level ? ` · L${level}` : ""}${mph ? ` @ ${mph}mph` : ""}`;
        updated = { ...item, name: nm, lift: nm, type: "cardio", cardioId: t.id,
          durationMin: parseInt(document.getElementById("seMin").value,10) || 0,
          calories: parseInt(document.getElementById("seKcal").value,10) || 0,
          mph: mph || undefined, level: level || undefined,
          weight: 0, reps: 0, sets: 1 };
      } else {
        updated = { ...item,
          name: document.getElementById("seName").value.trim() || item.name,
          type: item.type === "cardio" ? "strength" : item.type,
          weight: parseFloat(document.getElementById("seWeight").value) || 0,
          reps: parseInt(document.getElementById("seReps").value,10) || 0,
          sets: parseInt(document.getElementById("seSets").value,10) || 1,
          durationMin: parseInt(document.getElementById("seLiftMin").value,10) || undefined,
          calories: undefined, cardioId: undefined, mph: undefined, level: undefined };
      }
      updated.time = time || undefined;
      updated.notes = notes || undefined;
      // remove from old day, add to (possibly new) day
      state.days[srcDate].sessions = (state.days[srcDate].sessions || []).filter(x => x.id !== sid);
      const target = dayObj(newDate);
      target.sessions = target.sessions || [];
      target.sessions.push(updated);
      if(!asCardio && updated.reps && updated.reps <= 10 && updated.weight){
        const est = Math.round(updated.weight * (1 + updated.reps/30));
        const cur = state.prs[updated.name];
        if(!cur || est > cur.val){
          state.prs[updated.name] = { val: est, date: newDate, unit: unit() };
          toast(`New PR: ${updated.name} ~ ${est}${unit()}`, "cyan");
        }
      }
      save(); closeModal(); renderAll();
      toast("Updated", "cyan");
    });
  });
}

// ---- Interval builder: several blocks logged as one session ----
function openIntervalModal(){
  const opts = CARDIO_TYPES.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
  const blockRow = (i) => `
    <div class="iv-row" data-i="${i}">
      <select class="iv-type">${opts}</select>
      <input class="iv-min" type="number" min="1" max="240" placeholder="min">
      <input class="iv-mph" type="number" step="0.1" min="0" max="20" placeholder="mph">
      <input class="iv-lvl" type="number" step="1" min="0" max="30" placeholder="lvl">
      <button type="button" class="iv-del">×</button>
    </div>`;
  openModal("Log intervals", `
    <div class="form-grid">
      <label><span>Date</span><input id="ivDate" type="date" value="${currentDate}"></label>
      <label><span>Time of day <em style="font-style:normal;color:var(--iron-mute)">optional</em></span><input id="ivTime" type="time"></label>
    </div>
    <label><span>Session name</span><input id="ivName" type="text" maxlength="40" placeholder="e.g. Cardio intervals"></label>
    <p class="wb-hint">One block per line — type, minutes, and (for walks/bikes) speed + incline. Each block is logged separately so calories are accurate.</p>
    <div class="iv-list" id="ivList">${blockRow(0)}${blockRow(1)}${blockRow(2)}</div>
    <button type="button" class="btn btn-ghost btn-sm" id="ivAdd" style="width:100%;margin-top:6px">+ ADD BLOCK</button>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="ivSave">SAVE ALL</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const list = document.getElementById("ivList");
    const wire = (r) => r.querySelector(".iv-del").addEventListener("click", () => {
      if(list.children.length > 1) r.remove();
    });
    list.querySelectorAll(".iv-row").forEach(wire);
    document.getElementById("ivAdd").addEventListener("click", () => {
      const div = document.createElement("div");
      div.innerHTML = blockRow(list.children.length);
      const r = div.firstElementChild;
      list.appendChild(r); wire(r);
    });
    document.getElementById("ivSave").addEventListener("click", () => {
      const dateK = document.getElementById("ivDate").value || currentDate;
      const timeV = document.getElementById("ivTime").value || "";
      const label = document.getElementById("ivName").value.trim();
      const day = dayObj(dateK);
      day.sessions = day.sessions || [];
      let added = 0;
      list.querySelectorAll(".iv-row").forEach(r => {
        const mins = parseInt(r.querySelector(".iv-min").value, 10);
        if(!mins) return;
        const t = CARDIO_TYPES.find(x => x.id === r.querySelector(".iv-type").value) || CARDIO_TYPES[0];
        const mph = r.querySelector(".iv-mph").value;
        const lvl = r.querySelector(".iv-lvl").value;
        const met = _cardioMET(t, mph, lvl);
        const kcal = Math.round(met * _userWeightKg() * (mins / 60));
        let nm = t.name;
        if(lvl) nm += ` · L${lvl}`;
        if(mph) nm += ` @ ${mph}mph`;
        if(label) nm = `${label} — ${nm}`;
        day.sessions.push({ id: uid(), name: nm, lift: nm, type: "cardio",
          weight:0, reps:0, sets:1, durationMin: mins, calories: kcal,
          cardioId: t.id, mph: mph || undefined, level: lvl || undefined,
          time: timeV || undefined });
        added++;
      });
      if(!added){ toast("Add minutes to at least one block", "pink"); return; }
      save(); closeModal(); renderAll();
      toast(`Logged ${added} interval block${added===1?"":"s"}`, "cyan");
    });
  });
}

// ---- LIFT HUB: workouts first, not a single-lift form ----
function openLiftHub(){
  const lib = getWorkoutLib();
  const favs = getFavLifts();
  openModal("Add to your training", `
    <div class="lh-sec">
      <div class="lh-h">Saved workouts</div>
      ${lib.length ? `<div class="lh-list">${lib.map(w => `
        <button class="lh-row" data-lh-w="${w.id}">
          <span class="lh-info"><b>${escape(w.name)}</b><small>${escape(w.style)} · ${w.exercises.length} movements</small></span>
          <span class="lh-go">USE</span>
        </button>`).join("")}</div>`
        : `<p class="wl-empty">No saved workouts yet — build one in the Exercise Library.</p>`}
    </div>
    <div class="lh-sec">
      <div class="lh-h">Add a single lift</div>
      ${favs.length ? `<div class="lh-chips">${favs.slice(0,8).map(f =>
        `<button class="lh-chip" data-lh-fav="${escape(f)}">${escape(f)}</button>`).join("")}</div>` : ""}
      <button class="btn btn-ghost" id="lhAnyLift" style="width:100%">CHOOSE A MOVEMENT →</button>
    </div>
    <div class="lh-sec">
      <div class="lh-h">Log a workout type</div>
      <div class="lh-chips">${WORKOUT_TYPES.slice(0,14).map(t =>
        `<button class="lh-chip" data-lh-type="${escape(t)}">${escape(t)}</button>`).join("")}</div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" data-close>Close</button></div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    root.querySelectorAll("[data-lh-w]").forEach(b => b.addEventListener("click", () => {
      const w = lib.find(x => x.id === b.dataset.lhW);
      closeModal();
      if(w) openScheduleWorkoutModal(w.name, w.exercises);
    }));
    root.querySelectorAll("[data-lh-fav]").forEach(b => b.addEventListener("click", () => {
      closeModal(); openLiftModal(b.dataset.lhFav);
    }));
    root.querySelectorAll("[data-lh-type]").forEach(b => b.addEventListener("click", () => {
      closeModal(); openScheduleWorkoutModal(b.dataset.lhType, []);
    }));
    const any = document.getElementById("lhAnyLift");
    if(any) any.addEventListener("click", () => { closeModal(); openLiftModal(); });
  });
}

// ---- Pick day + time for a chosen workout / type ----
function openScheduleWorkoutModal(name, exercises){
  openModal(`Schedule: ${name}`, `
    <div class="form-grid">
      <label><span>Day</span><input id="swDate" type="date" value="${currentDate}"></label>
      <label><span>Time of day <em style="font-style:normal;color:var(--iron-mute)">optional</em></span><input id="swTime" type="time"></label>
    </div>
    <label><span>Gym / location <em style="font-style:normal;color:var(--iron-mute)">optional</em></span><input id="swGym" type="text" maxlength="40" placeholder="Planet Fitness"></label>
    ${(exercises||[]).length ? `<p class="wb-hint">${exercises.length} movements come with it.</p>` : ""}
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="swSave">ADD TO DAY</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("swSave").addEventListener("click", () => {
      const dateK = document.getElementById("swDate").value || currentDate;
      const time = document.getElementById("swTime").value || "";
      const gym = document.getElementById("swGym").value.trim();
      const dt = new Date(dateK + "T12:00:00");
      const dayName = ["sun","mon","tue","wed","thu","fri","sat"][dt.getDay()];
      const wk = weekKey(weekStart(dt));
      const plan = getPlan();
      if(!plan[wk]) plan[wk] = {};
      const existing = plan[wk][dayName];
      if(existing && existing.type){
        existing.extra = existing.extra || [];
        existing.extra.push({ name, time: time || undefined, exercises: exercises || [] });
      } else {
        plan[wk][dayName] = { type: name, time: time || undefined,
          gym: gym || undefined, exercises: (exercises||[]).length ? exercises : undefined };
      }
      currentDate = dateK;
      save(); closeModal(); renderAll();
      toast(`${name} → ${fmtDate(dateK)}${time ? " · " + fmtTime12(time) : ""}`, "cyan");
    });
  });
}



// =================================================================
// v17 — PR CALLOUTS + readable/editable PR list
// =================================================================
function _prsThisMonth(){
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const recent = [], stale = [];
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  Object.keys(state.prs || {}).forEach(name => {
    const pr = state.prs[name];
    if(!pr || !pr.date) return;
    if(pr.date >= todayKey(cutoff)) recent.push({ name, ...pr });
  });
  // Lifts trained this month but never within 10 lb of their PR
  const bestThisMonth = {};
  Object.keys(state.days).forEach(k => {
    if(!k.startsWith(ym)) return;
    ((state.days[k] || {}).sessions || []).forEach(s => {
      if(s.type === "cardio" || !s.weight || !s.reps) return;
      const est = Math.round(s.weight * (1 + s.reps/30));
      if(!bestThisMonth[s.name] || est > bestThisMonth[s.name]) bestThisMonth[s.name] = est;
    });
  });
  Object.keys(bestThisMonth).forEach(name => {
    const pr = (state.prs || {})[name];
    if(!pr || !pr.val) return;
    const gap = pr.val - bestThisMonth[name];
    if(gap > 10) stale.push({ name, gap: Math.round(gap), pr: pr.val, best: bestThisMonth[name] });
  });
  recent.sort((a,b) => b.date.localeCompare(a.date));
  stale.sort((a,b) => b.gap - a.gap);
  return { recent: recent.slice(0,6), stale: stale.slice(0,4) };
}

function renderPrCallout(){
  const el = document.getElementById("prCallout");
  if(!el) return;
  const { recent, stale } = _prsThisMonth();
  if(!recent.length && !stale.length){
    el.innerHTML = `<div class="prc-empty">Log lifts with reps and weight — new PRs and lifts drifting off pace show up here.</div>`;
    return;
  }
  el.innerHTML = `
    ${recent.length ? `<div class="prc-block prc-win">
      <div class="prc-h">NEW PRs · LAST 30 DAYS</div>
      <div class="prc-rows">${recent.map(r => `
        <div class="prc-row"><b>${escape(r.name)}</b><span>${r.val} ${r.unit || unit()}</span><em>${fmtDate(r.date)}</em></div>`).join("")}</div>
    </div>` : ""}
    ${stale.length ? `<div class="prc-block prc-warn">
      <div class="prc-h">OFF PACE THIS MONTH</div>
      <div class="prc-rows">${stale.map(r => `
        <div class="prc-row"><b>${escape(r.name)}</b><span>${r.gap} ${unit()} under</span><em>best ${r.best} · PR ${r.pr}</em></div>`).join("")}</div>
    </div>` : ""}`;
}

// ---- Readable, editable PR list (replaces the dark unreadable drill-down) ----
function renderPrList(){
  const el = document.getElementById("prSimpleList");
  if(!el) return;
  const entries = Object.keys(state.prs || {})
    .map(name => ({ name, ...state.prs[name] }))
    .filter(x => x.val)
    .sort((a,b) => (b.date||"").localeCompare(a.date||""));
  el.innerHTML = entries.length ? entries.map(e => `
    <button class="prl-row" data-pr="${escape(e.name)}">
      <span class="prl-name">${escape(e.name)}</span>
      <span class="prl-val">${e.val} <i>${e.unit || unit()}</i></span>
      <span class="prl-date">${e.date ? fmtDate(e.date) : ""}</span>
      <span class="prl-edit">EDIT</span>
    </button>`).join("")
    : `<p class="wl-empty">No PRs yet. They fill in automatically when you log a lift with weight and reps, or add one manually.</p>`;
  el.querySelectorAll(".prl-row").forEach(b =>
    b.addEventListener("click", () => openPrEditModal(b.dataset.pr)));
}

function openPrEditModal(name){
  const existing = name ? (state.prs || {})[name] : null;
  const moves = [...DATA.movements, ...DATA.prLifts].filter((v,i,a)=>a.indexOf(v)===i);
  openModal(existing ? `Edit PR: ${name}` : "Add a PR", `
    <label><span>Movement</span>
      <input list="prmovelist" id="prName" type="text" value="${escape(name || "")}" ${existing ? "readonly" : ""} placeholder="Back Squat">
      <datalist id="prmovelist">${moves.map(m=>`<option value="${escape(m)}">`).join("")}</datalist>
    </label>
    <div class="form-grid">
      <label><span>Best (${unit()})</span><input id="prVal" type="number" min="0" step="2.5" value="${existing ? existing.val : ""}"></label>
      <label><span>Date</span><input id="prDate" type="date" value="${existing && existing.date ? existing.date : currentDate}"></label>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      ${existing ? `<button class="btn btn-pink" id="prDel">DELETE</button>` : ""}
      <button class="btn btn-cyan" id="prSave">SAVE</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const del = document.getElementById("prDel");
    if(del) del.addEventListener("click", () => {
      delete state.prs[name];
      save(); closeModal(); renderAll();
      toast("PR removed", "pink");
    });
    document.getElementById("prSave").addEventListener("click", () => {
      const nm = document.getElementById("prName").value.trim();
      const val = parseFloat(document.getElementById("prVal").value);
      const date = document.getElementById("prDate").value || currentDate;
      if(!nm || isNaN(val)){ toast("Name and weight required", "pink"); return; }
      state.prs[nm] = { val: Math.round(val * 10) / 10, date, unit: unit() };
      save(); closeModal(); renderAll();
      toast(`PR saved: ${nm} ${val}${unit()}`, "cyan");
    });
  });
}

onReady(() => {
  on("#prAddBtn", "click", () => openPrEditModal());
});



// =================================================================
// v17 — INLINE MACRO ⇄ CALORIE CALCULATOR (lives on the page, no modal)
// 4 kcal/g protein + carbs, 9 kcal/g fat. Editing macros updates
// calories live; editing calories offers a split you can dial in.
// =================================================================
const KCAL = { p:4, c:4, f:9 };
// =================================================================
// CARB CYCLING — training-day vs rest-day macro targets.
// state.goals stays the single base record; state.goals.cycle holds the
// two variants. Every DAY-SCOPED display reads goalsForDay(key) so the
// number on screen is the number that applies to THAT day.
// =================================================================
function goalsForDay(key){
  const g = state.goals || {};
  const base = { cal:g.cal, protein:g.protein, carbs:g.carbs, fat:g.fat, fiber:g.fiber, sugar:g.sugar, water:g.water, mode:null };
  const cyc = g.cycle;
  if(!cyc || !cyc.on) return base;
  const k = key || currentDate;
  const day = state.days[k];
  let trained = !!(day && ((day.sessions || []).length > 0 || ((day.activity || {}).exercise || 0) >= 20));
  if(!trained){
    // Today / future days have no log yet — fall back to what's PLANNED.
    const dt = new Date(k + "T12:00:00");
    const dayName = ["sun","mon","tue","wed","thu","fri","sat"][dt.getDay()];
    const wk = weekKey(weekStart(dt));
    const planned = state.plan && state.plan[wk] && state.plan[wk][dayName];
    if(planned && planned.type && !/rest|recov|off\b/i.test(planned.type)) trained = true;
  }
  return Object.assign({}, base, trained
    ? { carbs: cyc.trainC, fat: cyc.trainF, mode: "training" }
    : { carbs: cyc.restC,  fat: cyc.restF,  mode: "rest" });
}

// Split a base carb/fat target into a high-carb training day and a
// low-carb rest day at the SAME calories (carbs swap with fat 1:1 by kcal).
function buildCarbCycle(carbs, fat, weightLb){
  const fatFloor = Math.max(35, Math.round((weightLb || 150) * 0.25));
  let up = Math.round(carbs * 0.35);                       // +35% carbs on training days
  let fatCut = Math.round(up * 4 / 9);
  if(fat - fatCut < fatFloor){                             // never starve fat below the floor
    fatCut = Math.max(0, fat - fatFloor);
    up = Math.round(fatCut * 9 / 4);
  }
  const down = Math.round(carbs * 0.30);
  return {
    on: true,
    trainC: carbs + up,   trainF: fat - fatCut,
    restC:  carbs - down, restF:  fat + Math.round(down * 4 / 9),
  };
}

function macroCals(g){ return (g.p||0)*KCAL.p + (g.c||0)*KCAL.c + (g.f||0)*KCAL.f; }

function renderMacroCalc(hostId){
  const host = document.getElementById(hostId);
  if(!host) return;
  const g = state.goals || {};
  const cur = { p:g.protein||0, c:g.carbs||0, f:g.fat||0 };
  const fromMacros = macroCals(cur);
  const calGoal = g.cal || fromMacros || 2000;
  const diff = calGoal - fromMacros;
  const pct = (grams, k) => fromMacros ? Math.round((grams*k/fromMacros)*100) : 0;

  host.innerHTML = `
    <div class="mc-top">
      <div class="mc-cal">
        <label>Calorie goal</label>
        <input id="${hostId}_cal" type="number" min="800" max="6000" step="10" value="${Math.round(calGoal)}">
      </div>
      <div class="mc-from">from macros <b>${Math.round(fromMacros)}</b> kcal</div>
    </div>
    <div class="mc-grid">
      ${[["p","Protein","#00f5d4"],["c","Carbs","#4db8ff"],["f","Fat","#ff4d9d"]].map(([k,label,col]) => `
        <div class="mc-macro">
          <div class="mc-m-head"><i style="background:${col}"></i><span>${label}</span><em>${pct(cur[k], KCAL[k])}%</em></div>
          <input id="${hostId}_${k}" type="number" min="0" max="600" step="1" value="${Math.round(cur[k])}">
          <div class="mc-m-cal">${Math.round(cur[k]*KCAL[k])} kcal</div>
        </div>`).join("")}
    </div>
    <div class="mc-status ${Math.abs(diff) <= 5 ? "ok" : "off"}" id="${hostId}_status">
      ${Math.abs(diff) <= 5
        ? `Macros match your calorie goal.`
        : `${diff > 0 ? "Add" : "Cut"} <b>${Math.abs(Math.round(diff))}</b> kcal — choose where:`}
    </div>
    <div class="mc-split ${Math.abs(diff) <= 5 ? "hidden" : ""}" id="${hostId}_split">
      <div class="mc-split-row">
        ${[["p","Protein"],["c","Carbs"],["f","Fat"]].map(([k,label]) => `
          <label class="mc-check"><input type="checkbox" data-mcsplit="${k}" ${k === "c" ? "checked" : ""}><span>${label}</span></label>`).join("")}
      </div>
      <button class="btn btn-cyan btn-sm" id="${hostId}_apply">APPLY ${Math.abs(Math.round(diff))} KCAL</button>
      <div class="mc-preview" id="${hostId}_preview"></div>
    </div>
    <button class="btn btn-cyan" id="${hostId}_save" style="width:100%;margin-top:10px">SAVE GOALS</button>
  `;

  const $$id = (suffix) => document.getElementById(hostId + suffix);
  const read = () => ({
    cal: parseFloat($$id("_cal").value) || 0,
    p: parseFloat($$id("_p").value) || 0,
    c: parseFloat($$id("_c").value) || 0,
    f: parseFloat($$id("_f").value) || 0,
  });
  const refreshPreview = () => {
    const v = read();
    const d = v.cal - macroCals(v);
    const picks = Array.from(host.querySelectorAll("[data-mcsplit]:checked")).map(x => x.dataset.mcsplit);
    const prev = $$id("_preview");
    if(!picks.length){ if(prev) prev.textContent = "Pick at least one macro to absorb the change."; return; }
    const per = d / picks.length;
    if(prev) prev.innerHTML = picks.map(k => {
      const grams = per / KCAL[k];
      const label = { p:"Protein", c:"Carbs", f:"Fat" }[k];
      return `<span>${label} <b>${grams >= 0 ? "+" : ""}${grams.toFixed(1)}g</b></span>`;
    }).join("");
  };

  // Live: editing any macro recomputes calories shown; editing calories shows the split
  ["_p","_c","_f"].forEach(sfx => {
    const el = $$id(sfx);
    if(el) el.addEventListener("input", () => {
      const v = read();
      $$id("_cal").value = Math.round(macroCals(v));
      renderMacroCalcSoft(hostId, v);
    });
  });
  const calEl = $$id("_cal");
  if(calEl) calEl.addEventListener("input", () => { refreshPreview(); updateStatus(); });
  host.querySelectorAll("[data-mcsplit]").forEach(cb => cb.addEventListener("change", refreshPreview));

  function updateStatus(){
    const v = read();
    const d = v.cal - macroCals(v);
    const st = $$id("_status"), sp = $$id("_split");
    if(!st) return;
    if(Math.abs(d) <= 5){
      st.className = "mc-status ok"; st.innerHTML = "Macros match your calorie goal.";
      if(sp) sp.classList.add("hidden");
    } else {
      st.className = "mc-status off";
      st.innerHTML = `${d > 0 ? "Add" : "Cut"} <b>${Math.abs(Math.round(d))}</b> kcal — choose where:`;
      if(sp) sp.classList.remove("hidden");
      const ap = $$id("_apply");
      if(ap) ap.textContent = `APPLY ${Math.abs(Math.round(d))} KCAL`;
      refreshPreview();
    }
  }

  const applyBtn = $$id("_apply");
  if(applyBtn) applyBtn.addEventListener("click", () => {
    const v = read();
    const d = v.cal - macroCals(v);
    const picks = Array.from(host.querySelectorAll("[data-mcsplit]:checked")).map(x => x.dataset.mcsplit);
    if(!picks.length){ toast("Pick a macro to absorb the change", "pink"); return; }
    const per = d / picks.length;
    picks.forEach(k => {
      const el = $$id("_" + k);
      el.value = Math.max(0, Math.round((parseFloat(el.value) || 0) + per / KCAL[k]));
    });
    updateStatus();
    renderMacroCalcSoft(hostId, read());
  });

  const saveBtn = $$id("_save");
  if(saveBtn) saveBtn.addEventListener("click", () => {
    const v = read();
    state.goals.protein = Math.round(v.p);
    state.goals.carbs = Math.round(v.c);
    state.goals.fat = Math.round(v.f);
    state.goals.cal = Math.round(v.cal || macroCals(v));
    save(); renderAll();
    toast("Goals saved", "cyan");
  });

  updateStatus();
}

// Update just the % + kcal readouts without rebuilding (keeps focus in inputs)
function renderMacroCalcSoft(hostId, v){
  const host = document.getElementById(hostId);
  if(!host) return;
  const total = macroCals(v);
  [["p",0],["c",1],["f",2]].forEach(([k, i]) => {
    const box = host.querySelectorAll(".mc-macro")[i];
    if(!box) return;
    const pctEl = box.querySelector("em");
    const calEl = box.querySelector(".mc-m-cal");
    if(pctEl) pctEl.textContent = total ? Math.round((v[k]*KCAL[k]/total)*100) + "%" : "0%";
    if(calEl) calEl.textContent = Math.round(v[k]*KCAL[k]) + " kcal";
  });
  const from = host.querySelector(".mc-from b");
  if(from) from.textContent = Math.round(total);
}



// =================================================================
// v18 — EXERCISE LIBRARY: search, filter, photos, favorites
// Replaces the old Planner page (its editing lives on day cards).
// Photos are compressed to ~240px thumbnails so localStorage holds.
// =================================================================
const EQUIP_TAGS = { machine:"Machine", barbell:"Barbell", dumbbell:"Dumbbell", bodyweight:"Bodyweight", cable:"Cable", other:"Other" };
function equipFor(name){
  const n = (name || "").toLowerCase();
  if(/machine|press$|pulldown|extension|curl machine|smith|hack|pec deck|leg press/.test(n) && !/barbell|dumbbell/.test(n)) return "machine";
  if(/cable|pushdown|woodchop|fly/.test(n)) return "cable";
  if(/barbell|squat|deadlift|clean|snatch|jerk|bench press|rdl|thruster/.test(n)) return "barbell";
  if(/dumbbell|db |curl|lateral raise/.test(n)) return "dumbbell";
  if(/push.?up|pull.?up|chin.?up|dip|plank|sit.?up|box jump|burpee|air squat|lunge/.test(n)) return "bodyweight";
  return "other";
}
function getExPhotos(){ if(!state.exPhotos) state.exPhotos = {}; return state.exPhotos; }

function allLibraryExercises(){
  const set = new Set();
  LIFT_CATEGORIES.forEach(c => c.lifts.forEach(l => set.add(l)));
  MACHINE_LIST.forEach(m => set.add(m));
  (DATA.movements || []).forEach(m => set.add(m));
  (state.favLifts || []).forEach(m => set.add(m));
  Object.keys(getExPhotos()).forEach(m => set.add(m));
  (state.customExercises || []).forEach(m => set.add(m));
  return Array.from(set);
}

let _libSub = "all", _libQuery = "", _libFilters = { part:"", equip:"" }, _libSortAZ = true;

function renderLibraryFilters(){
  const host = document.getElementById("libFilters");
  if(!host) return;
  const parts = ["legs","glutes","back","chest","shoulders","arms","core"];
  host.innerHTML = `
    <div class="lf-row">
      <button class="lf-chip ${!_libFilters.part ? "on" : ""}" data-lfpart="">All body parts</button>
      ${parts.map(p => `<button class="lf-chip ${_libFilters.part===p?"on":""}" data-lfpart="${p}">${p}</button>`).join("")}
    </div>
    <div class="lf-row">
      <button class="lf-chip ${!_libFilters.equip ? "on" : ""}" data-lfeq="">All equipment</button>
      ${Object.keys(EQUIP_TAGS).map(k => `<button class="lf-chip ${_libFilters.equip===k?"on":""}" data-lfeq="${k}">${EQUIP_TAGS[k]}</button>`).join("")}
    </div>`;
  host.querySelectorAll("[data-lfpart]").forEach(b => b.addEventListener("click", () => {
    _libFilters.part = b.dataset.lfpart; renderLibrary();
  }));
  host.querySelectorAll("[data-lfeq]").forEach(b => b.addEventListener("click", () => {
    _libFilters.equip = b.dataset.lfeq; renderLibrary();
  }));
}

function renderLibrary(){
  const listEl = document.getElementById("libList");
  if(!listEl) return;
  renderLibraryFilters();
  const wcard = document.getElementById("libWorkoutsCard");
  const lcard = document.getElementById("libListCard");
  const filtersEl = document.getElementById("libFilters");
  const searchEl = document.querySelector(".lib-search");
  const showWorkouts = _libSub === "workouts";
  if(wcard) wcard.classList.toggle("nsec-hide", !showWorkouts);
  if(lcard) lcard.classList.toggle("nsec-hide", showWorkouts);
  if(filtersEl) filtersEl.classList.toggle("nsec-hide", showWorkouts);
  if(searchEl) searchEl.classList.toggle("nsec-hide", showWorkouts);
  if(showWorkouts){ renderWorkoutLib(); return; }

  const favs = state.favLifts || [];
  const photos = getExPhotos();
  let items = allLibraryExercises();
  if(_libSub === "favs") items = items.filter(x => favs.includes(x));
  if(_libQuery){
    const q = _libQuery.toLowerCase();
    items = items.filter(x => x.toLowerCase().includes(q));
  }
  if(_libFilters.part) items = items.filter(x => partsForExercise(x).includes(_libFilters.part));
  if(_libFilters.equip) items = items.filter(x => equipFor(x) === _libFilters.equip);
  items.sort((a,b) => _libSortAZ ? a.localeCompare(b) : b.localeCompare(a));

  const cnt = document.getElementById("libCount");
  if(cnt) cnt.textContent = `${items.length} movement${items.length===1?"":"s"}`;

  listEl.innerHTML = items.length ? items.map(name => {
    const parts = partsForExercise(name);
    const ph = photos[name];
    return `<div class="lx-row" data-lx="${escape(name)}">
      <span class="lx-thumb">${ph ? `<img src="${ph}" alt="">` : `<i>+</i>`}</span>
      <span class="lx-info">
        <b>${escape(name)}</b>
        <small>${escape(EQUIP_TAGS[equipFor(name)])}${parts.length ? " · " + parts.join(", ") : ""}</small>
      </span>
      <button class="lx-fav ${favs.includes(name) ? "on" : ""}" data-lxfav="${escape(name)}" title="Favorite">${favs.includes(name) ? "♥" : "♡"}</button>
    </div>`;
  }).join("") : `<p class="wl-empty">Nothing matches. Clear a filter or search for something else.</p>`;

  listEl.querySelectorAll(".lx-row").forEach(r => {
    r.addEventListener("click", (e) => {
      if(e.target.closest("[data-lxfav]")) return;
      openExerciseSheet(r.dataset.lx);
    });
  });
  listEl.querySelectorAll("[data-lxfav]").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const name = b.dataset.lxfav;
    const f = getFavLifts();
    const i = f.indexOf(name);
    if(i >= 0) f.splice(i,1); else f.unshift(name);
    state.favLifts = f.slice(0,60);
    save(); renderLibrary();
  }));
}

// ---- Exercise detail: photo, body parts, PR, add to a day ----
function openExerciseSheet(name){
  const photos = getExPhotos();
  const ph = photos[name];
  const parts = partsForExercise(name);
  const pr = (state.prs || {})[name];
  const favs = getFavLifts();
  openModal(name, `
    <div class="ex-sheet">
      <div class="ex-photo ${ph ? "has" : ""}" id="exPhotoBox">
        ${ph ? `<img src="${ph}" alt="">` : `<span>No photo yet</span>`}
      </div>
      <div class="ex-photo-actions">
        <button class="btn btn-ghost btn-sm" id="exSnap">${ph ? "REPLACE PHOTO" : "ADD PHOTO"}</button>
        ${ph ? `<button class="btn btn-ghost btn-sm" id="exRmPhoto">REMOVE</button>` : ""}
        <input type="file" id="exFile" accept="image/*" capture="environment" style="display:none">
      </div>
      <div class="ex-meta">
        <span><i>Equipment</i><b>${escape(EQUIP_TAGS[equipFor(name)])}</b></span>
        <span><i>Works</i><b>${parts.length ? escape(parts.join(", ")) : "—"}</b></span>
        <span><i>Your PR</i><b>${pr ? `${pr.val} ${pr.unit || unit()}` : "—"}</b></span>
      </div>
      <div class="ex-actions">
        <button class="btn btn-cyan" id="exLog">LOG THIS LIFT</button>
        <button class="btn btn-ghost" id="exFav">${favs.includes(name) ? "♥ FAVORITED" : "♡ FAVORITE"}</button>
      </div>
    </div>
    <div class="modal-foot"><button class="btn btn-ghost" data-close>Close</button></div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const file = document.getElementById("exFile");
    document.getElementById("exSnap").addEventListener("click", () => file.click());
    file.addEventListener("change", async () => {
      if(!file.files[0]) return;
      try{
        // small thumbnail so localStorage survives many photos
        const b64 = await compressImage(file.files[0], 240);
        const dataUrl = "data:image/jpeg;base64," + b64;
        try{
          getExPhotos()[name] = dataUrl;
          save();
        }catch(err){
          delete getExPhotos()[name];
          toast("Storage full — remove some photos first", "pink");
          return;
        }
        closeModal(); renderLibrary();
        toast("Photo saved", "cyan");
      }catch(err){ toast("Couldn't read that photo", "pink"); }
    });
    const rm = document.getElementById("exRmPhoto");
    if(rm) rm.addEventListener("click", () => {
      delete getExPhotos()[name];
      save(); closeModal(); renderLibrary();
      toast("Photo removed", "pink");
    });
    document.getElementById("exLog").addEventListener("click", () => {
      closeModal(); openLiftModal(name);
    });
    document.getElementById("exFav").addEventListener("click", () => {
      const f = getFavLifts();
      const i = f.indexOf(name);
      if(i >= 0) f.splice(i,1); else f.unshift(name);
      state.favLifts = f.slice(0,60);
      save(); closeModal(); renderLibrary();
    });
  });
}

onReady(() => {
  document.querySelectorAll("#libSubnav .sub-chip").forEach(c => c.addEventListener("click", () => {
    document.querySelectorAll("#libSubnav .sub-chip").forEach(x => x.classList.toggle("active", x === c));
    _libSub = c.dataset.lsub;
    renderLibrary();
  }));
  const srch = document.getElementById("libSearch");
  if(srch) srch.addEventListener("input", () => { _libQuery = srch.value.trim(); renderLibrary(); });
  on("#libSort", "click", () => {
    _libSortAZ = !_libSortAZ;
    const b = document.getElementById("libSort");
    if(b) b.textContent = _libSortAZ ? "A–Z" : "Z–A";
    renderLibrary();
  });
  on("#libNewWorkout", "click", () => openWorkoutBuilder());
});



// =================================================================
// v18 — MONTH CALENDAR (replaces the old week Planner page)
// UX call: one readable month grid like the MFP/MacroFactor sheets.
// Each cell = date + two dots (food / workout). Tap = go to that day.
// =================================================================
let _calMonth = null; // Date anchored to the 1st of the shown month
function renderMonthCalendar(){
  const host = document.getElementById("calGrid");
  if(!host) return;
  if(!_calMonth){
    const d = new Date(currentDate + "T12:00:00");
    _calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  }
  const label = document.getElementById("calLabel");
  if(label) label.textContent = _calMonth.toLocaleDateString(undefined,{month:"long", year:"numeric"});

  const first = new Date(_calMonth.getFullYear(), _calMonth.getMonth(), 1);
  const daysInMonth = new Date(_calMonth.getFullYear(), _calMonth.getMonth()+1, 0).getDate();
  const lead = first.getDay(); // Sunday-first
  const head = ["S","M","T","W","T","F","S"]
    .map(d => `<div class="cal-hd">${d}</div>`).join("");
  let cells = "";
  for(let i = 0; i < lead; i++) cells += `<div class="cal-cell cal-blank"></div>`;
  for(let dnum = 1; dnum <= daysInMonth; dnum++){
    const d = new Date(_calMonth.getFullYear(), _calMonth.getMonth(), dnum);
    const k = todayKey(d);
    const st = dayGoalStatus(k);
    const isToday = k === todayKey();
    const isSel = k === currentDate;
    const future = k > todayKey();
    const dot = (v) => v === "hit" ? "hit" : v === "fail" ? "miss" : v === "rest" ? "rest" : "none";
    cells += `<button class="cal-cell ${isToday?"today":""} ${isSel?"sel":""} ${future?"future":""}" data-date="${k}">
      <span class="cal-n">${dnum}</span>
      <span class="cal-dots">
        <i class="cal-dot food ${dot(st.food)}"></i>
        <i class="cal-dot work ${dot(st.workout)}"></i>
      </span>
    </button>`;
  }
  host.innerHTML = `<div class="cal-head">${head}</div><div class="cal-body">${cells}</div>`;
  host.querySelectorAll("[data-date]").forEach(b => b.addEventListener("click", () => {
    currentDate = b.dataset.date;
    renderAll();
    toast(fmtDate(b.dataset.date), "cyan");
  }));
}
onReady(() => {
  on("#calPrev", "click", () => {
    _calMonth = new Date(_calMonth.getFullYear(), _calMonth.getMonth()-1, 1);
    renderMonthCalendar();
  });
  on("#calNext", "click", () => {
    _calMonth = new Date(_calMonth.getFullYear(), _calMonth.getMonth()+1, 1);
    renderMonthCalendar();
  });
  on("#calToday", "click", () => {
    currentDate = todayKey();
    _calMonth = new Date();
    _calMonth = new Date(_calMonth.getFullYear(), _calMonth.getMonth(), 1);
    renderAll();
  });
});



// =================================================================
// v19 — CORRELATIONS ENGINE
// Two questions the user asked for:
//   (a) body part worked -> is it progressing or stalling?
//   (b) food -> does what I eat move my training and how I feel?
// Everything is computed from logged data only. Correlations use
// Pearson r on paired daily values and are always shown with the
// sample size, because n=6 is a hint, not a finding.
// =================================================================
function _pearson(pairs){
  const n = pairs.length;
  if(n < 4) return null;
  const xs = pairs.map(p => p[0]), ys = pairs.map(p => p[1]);
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let num = 0, dx = 0, dy = 0;
  for(let i=0;i<n;i++){
    const a = xs[i]-mx, b = ys[i]-my;
    num += a*b; dx += a*a; dy += b*b;
  }
  if(dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx*dy);
}
function _strength(r){
  const a = Math.abs(r);
  if(a >= 0.6) return "strong";
  if(a >= 0.35) return "moderate";
  if(a >= 0.2) return "slight";
  return "none";
}

// ---------- (a) BODY PART PROGRESS ----------
// Volume per body part, this 4 weeks vs the previous 4 weeks.
function bodyPartTrends(){
  const today = new Date(); today.setHours(0,0,0,0);
  const winA = new Date(today.getTime() - 28*86400000);   // last 4 weeks
  const winB = new Date(today.getTime() - 56*86400000);   // the 4 before that
  const cur = {}, prev = {}, sets = {};
  MUSCLE_PARTS.forEach(p => { cur[p] = 0; prev[p] = 0; sets[p] = 0; });
  Object.keys(state.days).forEach(k => {
    const d = new Date(k + "T12:00:00");
    if(d < winB || d > today) return;
    const inCur = d >= winA;
    ((state.days[k] || {}).sessions || []).forEach(s => {
      if(s.type === "cardio") return;
      const vol = (s.weight||0) * (s.reps||0) * (s.sets||1);
      if(!vol) return;
      partsForExercise(s.name).forEach(p => {
        if(cur[p] === undefined) return;
        if(inCur){ cur[p] += vol; sets[p] += (s.sets||1); }
        else prev[p] += vol;
      });
    });
  });
  return MUSCLE_PARTS.map(p => {
    const c = cur[p], pv = prev[p];
    let pct = null;
    if(pv > 0) pct = Math.round(((c - pv) / pv) * 100);
    else if(c > 0) pct = 100;
    return { part: p, cur: c, prev: pv, pct, sets: sets[p] };
  }).sort((a,b) => b.cur - a.cur);
}

function renderBodyPartTrends(){
  const host = document.getElementById("bpTrendList");
  if(!host) return;
  const rows = bodyPartTrends();
  const any = rows.some(r => r.cur > 0 || r.prev > 0);
  if(!any){
    host.innerHTML = `<p class="wl-empty">Log a few weeks of lifts and each muscle group's trend shows here.</p>`;
    return;
  }
  const max = Math.max(1, ...rows.map(r => r.cur));
  host.innerHTML = rows.map(r => {
    const w = Math.round((r.cur / max) * 100);
    let tag = "flat", label = "—";
    if(r.pct === null){ tag = "none"; label = "no data"; }
    else if(r.pct >= 10){ tag = "up"; label = `+${r.pct}%`; }
    else if(r.pct <= -10){ tag = "down"; label = `${r.pct}%`; }
    else { tag = "flat"; label = `${r.pct > 0 ? "+" : ""}${r.pct}%`; }
    return `<div class="bpt-row">
      <span class="bpt-name">${r.part}</span>
      <span class="bpt-bar"><i style="width:${w}%"></i></span>
      <span class="bpt-vol">${r.cur ? Math.round(r.cur).toLocaleString() : "0"}</span>
      <span class="bpt-tag t-${tag}">${label}</span>
    </div>`;
  }).join("") + `<p class="bpt-foot">Volume (${unit()} × reps) this 4 weeks vs the 4 before it.</p>`;
}

// ---------- (b) FOOD -> TRAINING / HEALTH ----------
// Build day rows, then correlate nutrition inputs against outputs.
function _dailyRows(daysBack){
  const rows = [];
  const today = new Date(); today.setHours(0,0,0,0);
  for(let i = daysBack; i >= 1; i--){
    const d = new Date(today.getTime() - i*86400000);
    const k = todayKey(d);
    const day = state.days[k];
    if(!day) continue;
    const t = totalsDetailFor(k);
    const q = dayFoodQuality(k);
    const sessions = day.sessions || [];
    const vol = sessions.reduce((n,s) => n + (s.weight||0)*(s.reps||0)*(s.sets||1), 0);
    const trained = sessions.length > 0;
    const ci = day.checkin || {};
    rows.push({
      key: k,
      cal: t.cal, p: t.p, c: t.c, f: t.f,
      fiber: t.fiber, sugar: t.sugar,
      knownFib: t.knownFib, knownSug: t.knownSug, items: t.count,
      glutenItems: q.glutenItems, dairyItems: q.dairyItems,
      exposures: day.exposures || [],
      ultraPct: q.ultraPct, wholePct: q.wholePct, fatPct: q.fatPct,
      water: day.water || 0,
      vol, trained,
      mins: sessions.reduce((n,s) => n + (s.durationMin||0), 0),
      sleep: ci.sleep != null ? +ci.sleep : null,
      energy: ci.energy != null ? +ci.energy : (ci.qMove != null ? ci.qMove * 5 : null),
      mood: ci.mood != null ? +ci.mood : null,
      symptoms: (day.symptoms || []).length,
    });
  }
  return rows;
}

function foodCorrelations(){
  const rows = _dailyRows(90).filter(r => r.cal > 0);
  const out = [];
  const pairUp = (xKey, yKey, filterFn) => {
    const src = filterFn ? rows.filter(filterFn) : rows;
    return src.filter(r => r[xKey] != null && r[yKey] != null && !(r[yKey] === 0 && yKey === "vol"))
              .map(r => [r[xKey], r[yKey]]);
  };

  // Protein -> training volume (on days trained)
  const pv = pairUp("p", "vol", r => r.trained);
  const rpv = _pearson(pv);
  if(rpv !== null && _strength(rpv) !== "none"){
    out.push({
      tone: rpv > 0 ? "good" : "watch",
      title: `Protein ${rpv > 0 ? "tracks with" : "runs against"} your training volume`,
      body: `On the ${pv.length} training days you logged food, higher-protein days line up with ${rpv > 0 ? "heavier" : "lighter"} sessions (${_strength(rpv)} link).`,
      action: rpv > 0 ? "Eat protein BEFORE the session, not just after — that's the day this shows up in." : "",
      n: pv.length, r: rpv,
    });
  }
  // Calories -> next-day volume (fuel effect)
  const fuel = [];
  for(let i = 0; i < rows.length - 1; i++){
    const a = rows[i], b = rows[i+1];
    const gap = (new Date(b.key) - new Date(a.key)) / 86400000;
    if(gap === 1 && a.cal > 0 && b.trained) fuel.push([a.cal, b.vol]);
  }
  const rf = _pearson(fuel);
  if(rf !== null && _strength(rf) !== "none"){
    out.push({
      tone: rf > 0 ? "good" : "watch",
      title: `Yesterday's calories ${rf > 0 ? "show up in" : "drag on"} today's session`,
      body: `Across ${fuel.length} back-to-back day pairs, eating more the day before lines up with ${rf > 0 ? "more" : "less"} volume the next day (${_strength(rf)} link).`,
      action: rf > 0 ? "Fuel the day BEFORE a heavy lift, not the morning of." : "",
      n: fuel.length, r: rf,
    });
  }
  // Water -> training volume
  const wv = pairUp("water", "vol", r => r.trained);
  const rw = _pearson(wv);
  if(rw !== null && _strength(rw) !== "none"){
    out.push({
      tone: rw > 0 ? "good" : "watch",
      title: `Water ${rw > 0 ? "tracks with" : "runs against"} how much you lift`,
      body: `${wv.length} training days compared — ${_strength(rw)} link between hydration and session volume.`,
      action: rw > 0 ? "Get half your water in before you walk into the gym." : "",
      n: wv.length, r: rw,
    });
  }
  // Sleep -> volume
  const sv = pairUp("sleep", "vol", r => r.trained);
  const rs = _pearson(sv);
  if(rs !== null && _strength(rs) !== "none"){
    out.push({
      tone: rs > 0 ? "good" : "watch",
      title: `Sleep ${rs > 0 ? "lifts" : "isn't lifting"} your training`,
      body: `${sv.length} nights matched to the next session — ${_strength(rs)} ${rs > 0 ? "positive" : "negative"} link.`,
      action: rs > 0 ? "Sleep is training. Protect the night before a heavy day like you'd protect the session." : "",
      n: sv.length, r: rs,
    });
  }
  // Sugar-ish (carbs) -> symptoms
  const cs = rows.filter(r => r.symptoms != null).map(r => [r.c, r.symptoms]);
  const rcs = _pearson(cs);
  if(rcs !== null && Math.abs(rcs) >= 0.35){
    out.push({
      tone: rcs > 0 ? "watch" : "good",
      title: `Carb intake ${rcs > 0 ? "lines up with more" : "lines up with fewer"} symptoms`,
      body: `${cs.length} days compared. ${rcs > 0 ? "Higher-carb days tend to be symptom days for you." : "Higher-carb days tend to be your cleaner days."} Worth watching, not proof.`,
      n: cs.length, r: rcs,
    });
  }
  // Trained vs not: mood / energy split
  const tE = rows.filter(r => r.trained && r.energy != null).map(r => r.energy);
  const nE = rows.filter(r => !r.trained && r.energy != null).map(r => r.energy);
  if(tE.length >= 3 && nE.length >= 3){
    const avg = (a) => a.reduce((x,y)=>x+y,0)/a.length;
    const diff = avg(tE) - avg(nE);
    if(Math.abs(diff) >= 0.5){
      out.push({
        tone: diff > 0 ? "good" : "watch",
        title: `You feel ${diff > 0 ? "better" : "worse"} on days you train`,
        body: `Energy averages ${avg(tE).toFixed(1)} on ${tE.length} training days vs ${avg(nE).toFixed(1)} on ${nE.length} rest days.`,
        action: diff > 0 ? "On a low day, the workout is the fix, not the thing to skip." : "",
        n: tE.length + nE.length, r: null,
      });
    }
  }
  // Hitting protein goal -> consistency
  const g = state.goals || {};
  if(g.protein){
    const hit = rows.filter(r => r.p >= g.protein * 0.9);
    if(rows.length >= 7){
      out.push({
        tone: hit.length / rows.length >= 0.6 ? "good" : "watch",
        title: `Protein goal hit on ${hit.length} of ${rows.length} logged days`,
        body: `${Math.round((hit.length/rows.length)*100)}% of days at or near ${g.protein}g. ${hit.length/rows.length >= 0.6 ? "That consistency is doing the work." : "Raising this is the highest-leverage change available."}`,
        n: rows.length, r: null,
      });
    }
  }
  return out.sort((a,b) => Math.abs(b.r || 0) - Math.abs(a.r || 0));
}

function renderCorrelations(){
  const host = document.getElementById("corrList");
  if(!host) return;
  const rows = _dailyRows(90).filter(r => r.cal > 0);
  const items = foodCorrelations();
  const meta = document.getElementById("corrMeta");
  if(meta) meta.textContent = `${rows.length} logged days`;
  if(rows.length < 6){
    host.innerHTML = `<p class="wl-empty">Log food and training on the same days for about a week — correlations need paired days to say anything honest. ${rows.length}/6 so far.</p>`;
    return;
  }
  if(!items.length){
    host.innerHTML = `<p class="wl-empty">Nothing stands out yet across ${rows.length} days. No strong links between what you eat, how you sleep, and how you train — that's a real result, not an error.</p>`;
    return;
  }
  host.innerHTML = items.map(it => `
    <div class="corr-card corr-${it.tone}">
      <div class="corr-title">${escape(it.title)}</div>
      <div class="corr-body">${escape(it.body)}</div>
      ${it.action ? `<div class="corr-act">${escape(it.action)}</div>` : ""}
      <div class="corr-meta">
        <span>${it.n} days</span>
        ${it.r !== null ? `<span>r = ${it.r.toFixed(2)} · ${_strength(it.r)}</span>` : ""}
      </div>
    </div>`).join("")
    + `<p class="corr-foot">Correlation is not causation — these are patterns in your own log, strongest first.</p>`;
}



// =================================================================
// v20 — DEEP SIGNAL
//   (a) SUB-MUSCLE resolution + week-to-week gap detection
//       "I did back — did I actually hit lats AND lower back?"
//   (b) FOOD QUALITY tagging (gluten / processed / whole / fat / dairy)
//       correlated against symptoms, energy, mood and training
//   (c) BIGGER PICTURE — every factor looked at together, not in pairs
// All of it is computed from logged data only. Nothing is invented.
// =================================================================

// ---------- (a) SUB-MUSCLE MAP ----------
// Each parent body part breaks into the regions a program can miss.
const SUB_MUSCLES = {
  back:      [["lats","lats"],["midback","mid-back / rhomboids"],["traps","upper traps"],["reardelt","rear delts"],["erectors","lower back / erectors"]],
  legs:      [["quads","quads"],["adductors","inner thigh / adductors"],["hams","hamstrings"],["calves","calves"]],
  glutes:    [["glutemax","glute max"],["glutemed","glute med / abductors"]],
  chest:     [["upperchest","upper chest"],["midchest","mid chest"],["lowerchest","lower chest"]],
  shoulders: [["frontdelt","front delts"],["sidedelt","side delts"],["reardelt","rear delts"]],
  arms:      [["biceps","biceps"],["triceps","triceps"],["forearms","forearms / grip"]],
  core:      [["abs","abs"],["obliques","obliques"],["deepcore","deep core / anti-extension"]],
};

// One concrete fix per region — a gap is only useful with the answer attached.
const SUB_FIX = {
  "back.lats":        "Lat Pulldown or Pull-up",
  "back.midback":     "Seated Cable Row or Chest-Supported Row",
  "back.traps":       "Barbell Shrug or Farmer Carry",
  "back.reardelt":    "Face Pull or Reverse Pec Deck",
  "back.erectors":    "Back Extension or Romanian Deadlift",
  "legs.quads":       "Leg Extension or Front Squat",
  "legs.adductors":   "Adductor Machine or Cossack Squat",
  "legs.hams":        "Lying Leg Curl or Romanian Deadlift",
  "legs.calves":      "Standing Calf Raise",
  "glutes.glutemax":  "Hip Thrust or Bulgarian Split Squat",
  "glutes.glutemed":  "Cable Abduction or Banded Lateral Walk",
  "chest.upperchest": "Incline Dumbbell Press",
  "chest.midchest":   "Flat Bench Press or Push-up",
  "chest.lowerchest": "Dip or Decline Press",
  "shoulders.frontdelt": "Overhead Press",
  "shoulders.sidedelt":  "Lateral Raise",
  "shoulders.reardelt":  "Face Pull or Rear Delt Fly",
  "arms.biceps":      "Dumbbell Curl or Chin-up",
  "arms.triceps":     "Cable Pushdown or Close-Grip Bench",
  "arms.forearms":    "Farmer Carry or Wrist Curl",
  "core.abs":         "Hanging Leg Raise or Cable Crunch",
  "core.obliques":    "Pallof Press or Russian Twist",
  "core.deepcore":    "Plank or Ab Wheel Rollout",
};

function subLabel(id){
  const [part, sub] = String(id).split(".");
  const row = (SUB_MUSCLES[part] || []).find(r => r[0] === sub);
  return row ? row[1] : sub;
}

// Resolve an exercise name down to the REGIONS it actually trains.
// Returns ids like "back.lats". Empty array = name too vague to tell.
function subMusclesForExercise(name){
  const raw = (name || "").toLowerCase();
  const n = " " + raw.replace(/[-_\/,+]+/g, " ").replace(/\s+/g, " ").trim() + " ";
  const s = new Set();
  const has = (re) => re.test(n);
  const tri = has(/tricep/);
  const incline = has(/incline/);
  const decline = has(/decline/);

  /* BACK */
  if(has(/pull ?down|pull ?up|chin ?up|pullover|straight ?arm| lats? |lat pull|muscle ?up|chest to bar/)) s.add("back.lats");
  if(has(/ rows? |seated row|cable row|t bar|inverted row|meadows|pendlay|bent (over )?row|rhomboid|chest supported/)) s.add("back.midback");
  if(has(/shrug|upright row|rack pull|high pull|farmer|trap bar|carry/)) s.add("back.traps");
  if(has(/face pull|rear delt|reverse fly|reverse flye|reverse pec|bent over fly/)){ s.add("back.reardelt"); s.add("shoulders.reardelt"); }
  if(has(/deadlift|\brdl\b|romanian|good morning|back extension|hyperextension|superman|erector|clean pull|snatch pull/)) s.add("back.erectors");

  /* LEGS */
  if(has(/squat|leg press|leg extension|lunge|split squat|step ?up|sissy|wall sit|hack|pistol|thruster|wall ball|box jump/)) s.add("legs.quads");
  if(has(/adduct|inner thigh|copenhagen|cossack|sumo|wide stance/)) s.add("legs.adductors");
  if(has(/leg curl|hamstring|\brdl\b|romanian|good morning|nordic|glute ham|stiff ?leg|deadlift/)) s.add("legs.hams");
  if(has(/calf|calves|donkey raise|toe raise|jump rope|double under/)) s.add("legs.calves");

  /* GLUTES */
  if(has(/hip thrust|glute bridge|\bbridge\b|glute|squat|lunge|step ?up|deadlift|\brdl\b|romanian|thruster|good morning/)) s.add("glutes.glutemax");
  if(has(/kick ?back/) && !tri) s.add("glutes.glutemax");
  if(has(/abduct|clam ?shell|curtsy|monster walk|fire hydrant|side ?lying|lateral (band|walk|step)|banded walk/)) s.add("glutes.glutemed");

  /* CHEST */
  if(incline && has(/bench|press|fly|flye|chest|dumbbell|barbell/)) s.add("chest.upperchest");
  if((decline || has(/\bdips?\b/)) && !tri) s.add("chest.lowerchest");
  if(has(/bench press|chest press|push ?up|pec deck|chest fly|cable fly|\bflye?\b|floor press|db bench/) && !incline && !decline && !has(/shoulder|overhead/)) s.add("chest.midchest");

  /* SHOULDERS */
  if(has(/overhead press|shoulder press|military|arnold|push press|\bjerk\b|front raise|landmine press|\bohp\b|strict press|\bpress\b.*shoulder|handstand|snatch|overhead squat/)) s.add("shoulders.frontdelt");
  if(has(/lateral raise|side raise|upright row|lateral delt|\bhalo\b|\by raise\b/)) s.add("shoulders.sidedelt");

  /* ARMS */
  if(has(/curl/) && !has(/leg curl|hamstring|nordic|wrist curl|reverse curl/)) s.add("arms.biceps");
  if(has(/chin ?up/)) s.add("arms.biceps");
  if(tri || has(/pushdown|push down|skull|close ?grip bench|overhead extension|jm press|\bdips?\b|kick ?back/)) s.add("arms.triceps");
  if(has(/kick ?back/) && !tri) s.delete("arms.triceps");
  if(has(/wrist curl|reverse curl|hammer curl|farmer|\bgrip\b|dead ?hang|plate pinch|carry/)) s.add("arms.forearms");

  /* CORE */
  if(has(/crunch|sit ?up|leg raise|knee raise|toes to bar|\bv ?ups?\b|hollow|\babs?\b|\bttb\b|gh ?d/)) s.add("core.abs");
  if(has(/russian twist|side plank|wood ?chop|oblique|side bend|windmill|pallof|anti ?rotation|landmine twist/)) s.add("core.obliques");
  if(has(/plank|dead ?bug|roll ?out|ab wheel|hollow hold|\bl ?sit\b|bird ?dog|suitcase|farmer|front squat|zercher/)) s.add("core.deepcore");

  return Array.from(s);
}

// Every logged lift in a date range, resolved to regions.
// Returns { subs:{id:{sets,vol,names:Set}}, parts:{part:{sets,vol,subs:Set}}, vague:[names] }
function subCoverageForRange(startKey, endKey){
  const subs = {}, parts = {}, vague = [];
  Object.keys(state.days).forEach(k => {
    if(k < startKey || k > endKey) return;
    ((state.days[k] || {}).sessions || []).forEach(s => {
      if(s.type === "cardio") return;
      const nm = s.name || "";
      if(!nm) return;
      const sets = s.sets || 1;
      const vol  = (s.weight||0) * (s.reps||0) * sets;
      const ids  = subMusclesForExercise(nm);
      if(!ids.length){
        // Not resolvable to a region — still credit the parent part if we can.
        const pp = partsForExercise(nm);
        if(!pp.length){ vague.push(nm); return; }
        pp.forEach(p => {
          if(!parts[p]) parts[p] = { sets:0, vol:0, subs:new Set(), unresolved:0 };
          parts[p].sets += sets; parts[p].vol += vol; parts[p].unresolved++;
        });
        return;
      }
      ids.forEach(id => {
        const p = id.split(".")[0];
        if(!subs[id]) subs[id] = { sets:0, vol:0, names:new Set() };
        subs[id].sets += sets; subs[id].vol += vol; subs[id].names.add(nm);
        if(!parts[p]) parts[p] = { sets:0, vol:0, subs:new Set(), unresolved:0 };
        parts[p].sets += sets; parts[p].vol += vol; parts[p].subs.add(id);
      });
    });
  });
  return { subs, parts, vague };
}

// Sunday-start week windows, newest first. n = how many weeks back.
function _weekWindows(n){
  const out = [];
  const thisStart = weekStart(new Date());
  for(let i = 0; i < n; i++){
    const s = new Date(thisStart); s.setDate(s.getDate() - i*7);
    const e = new Date(s); e.setDate(e.getDate() + 6);
    out.push({
      startKey: todayKey(s), endKey: todayKey(e),
      label: i === 0 ? "This week" : (i === 1 ? "Last week" : `${i} weeks ago`),
    });
  }
  return out;
}

// The headline feature: per body part, what got hit and what got skipped.
// Scope: "week" = current Sunday-start week, "month" = last 28 days.
function subMuscleGaps(scope){
  const weeks = _weekWindows(4);
  const win = scope === "month"
    ? { startKey: todayKey(new Date(Date.now() - 27*86400000)), endKey: todayKey(new Date()), label:"Last 4 weeks" }
    : weeks[0];
  const cov = subCoverageForRange(win.startKey, win.endKey);

  // "Last hit" per region over 90 days, so a gap can be dated.
  const lastHit = {};
  const start90 = todayKey(new Date(Date.now() - 89*86400000));
  Object.keys(state.days).sort().forEach(k => {
    if(k < start90) return;
    ((state.days[k] || {}).sessions || []).forEach(s => {
      if(s.type === "cardio") return;
      subMusclesForExercise(s.name || "").forEach(id => { lastHit[id] = k; });
    });
  });
  const daysAgo = (k) => k ? Math.round((new Date(todayKey()) - new Date(k)) / 86400000) : null;

  const report = [];
  Object.keys(SUB_MUSCLES).forEach(part => {
    const pInfo = cov.parts[part];
    if(!pInfo || pInfo.sets === 0) return;             // part not trained in window — not a "gap", just a rest
    const all = SUB_MUSCLES[part].map(r => part + "." + r[0]);
    const hit = all.filter(id => cov.subs[id] && cov.subs[id].sets > 0);
    const missing = all.filter(id => !hit.includes(id));
    report.push({
      part,
      sets: pInfo.sets,
      vol: pInfo.vol,
      unresolved: pInfo.unresolved || 0,
      hit: hit.map(id => ({ id, label: subLabel(id), sets: cov.subs[id].sets, names: Array.from(cov.subs[id].names) })),
      missing: missing.map(id => ({ id, label: subLabel(id), fix: SUB_FIX[id] || "", stale: daysAgo(lastHit[id]) })),
    });
  });
  report.sort((a,b) => b.sets - a.sets);

  // Week-to-week: regions trained in an earlier week but dropped this week.
  const dropped = [];
  if(scope !== "month" && weeks.length > 1){
    const now  = subCoverageForRange(weeks[0].startKey, weeks[0].endKey);
    const back = subCoverageForRange(weeks[3].startKey, weeks[1].endKey);
    Object.keys(back.subs).forEach(id => {
      if(now.subs[id]) return;
      const part = id.split(".")[0];
      if(!now.parts[part]) return;                     // whole part is resting — fine
      dropped.push({ id, label: subLabel(id), part, weeksSets: back.subs[id].sets, fix: SUB_FIX[id] || "", stale: daysAgo(lastHit[id]) });
    });
    dropped.sort((a,b) => b.weeksSets - a.weeksSets);
  }

  return { window: win, report, dropped, vague: Array.from(new Set(cov.vague)).slice(0, 6) };
}

function renderSubMuscles(){
  const host = document.getElementById("smList");
  if(!host) return;
  const scope = (state.ui && state.ui.smScope) || "week";
  const data = subMuscleGaps(scope);
  const meta = document.getElementById("smMeta");
  if(meta) meta.textContent = data.window.label;
  document.querySelectorAll("[data-smscope]").forEach(b => {
    b.classList.toggle("on", b.getAttribute("data-smscope") === scope);
  });

  if(!data.report.length){
    host.innerHTML = `<p class="wl-empty">No lifts logged ${scope === "month" ? "in the last 4 weeks" : "this week"} yet. Log a session with exercise names (Back Squat, Lat Pulldown…) and this breaks it down muscle by muscle.</p>`;
    return;
  }

  let html = `<div class="bp-lead">Every lift you logged, resolved down to the region it actually trains — so a back day that skipped your lower back shows up as a gap, not a checkmark.</div>`
    + data.report.map(r => {
    const chips = r.hit.map(h => `<span class="sm-chip on" title="${escape(h.names.join(", "))}">${escape(h.label)} <i>${h.sets}</i></span>`).join("")
      + r.missing.map(m => `<span class="sm-chip off">${escape(m.label)}</span>`).join("");
    const gaps = r.missing.length
      ? `<div class="sm-gap"><b>Missing:</b> ${r.missing.map(m =>
          `${escape(m.label)}${m.stale != null ? ` <i>(${m.stale}d ago)</i>` : ` <i>(never logged)</i>`}`).join(", ")}
          <div class="sm-fix">Fix it: ${r.missing.slice(0,2).map(m => escape(m.fix)).filter(Boolean).join(" · ")}</div>
        </div>`
      : `<div class="sm-full">Full coverage — every region of ${r.part} got work.</div>`;
    return `<div class="sm-part">
      <div class="sm-head"><span class="sm-name">${escape(r.part)}</span><span class="sm-sets">${r.sets} sets</span></div>
      <div class="sm-chips">${chips}</div>
      ${gaps}
    </div>`;
  }).join("");

  if(data.dropped.length){
    html += `<div class="sm-part sm-drop">
      <div class="sm-head"><span class="sm-name">Dropped this week</span><span class="sm-sets">vs last 3 weeks</span></div>
      <div class="sm-gap">${data.dropped.slice(0,5).map(d =>
        `<div>${escape(d.label)} — trained ${d.weeksSets} sets in the last 3 weeks, nothing this week. <i>${escape(d.fix)}</i></div>`).join("")}</div>
    </div>`;
  }
  if(data.vague.length){
    html += `<p class="sm-foot">Couldn't tell which muscles these hit: ${data.vague.map(escape).join(", ")}. Log the movement name (e.g. "Lat Pulldown") instead of just the day name and they'll count.</p>`;
  }
  host.innerHTML = html;
}

// ---------- (b) FOOD QUALITY ----------
// Macros answer "how much". These answer "what kind" — the question the
// user actually asked: gluten, processed vs real food, fat quality, dairy.
// Name-based, deliberately conservative: unknown stays unknown.
const FQ_GLUTEN = /bread|bagel|baguette|biscuit|bun\b|roll\b|toast|sandwich|sub\b|wrap|tortilla|pita|naan|flatbread|cracker|pretzel|crouton|breaded|panko|batter|flour|pasta|noodle|spaghetti|penne|macaroni|lasagna|ramen|udon|couscous|orzo|farro|barley|\brye\b|wheat|seitan|cereal|granola|muesli|pancake|waffle|french toast|crepe|muffin|croissant|donut|doughnut|pastry|danish|cake|cupcake|brownie|cookie|pie\b|pizza|calzone|dumpling|gyoza|wonton|burrito|quesadilla|taco shell|beer\b|stout|ale\b|malt|soy sauce|teriyaki|hoisin|gravy|breadstick|stuffing|pop ?tart|graham/i;
const FQ_DAIRY  = /milk|cheese|yogurt|yoghurt|butter|cream|whey|casein|latte|cappuccino|ice cream|gelato|kefir|queso|ricotta|mozzarella|cheddar|parmesan|feta|custard|half and half|frappu/i;
const FQ_ULTRA  = /candy|chocolate bar|chips|crisps|soda|cola|pepsi|coke\b|energy drink|monster|red bull|cookie|cake|cupcake|brownie|donut|doughnut|pastry|ice cream|cereal|granola bar|protein bar|snack bar|hot dog|sausage|bacon|salami|pepperoni|bologna|deli meat|lunch ?meat|nugget|fries|french fry|tater tot|onion ring|frozen (pizza|meal|dinner)|instant|packaged|fast food|mcdonald|burger king|wendy|taco bell|chick.?fil|dunkin|starbucks|pop ?tart|pretzel|cracker|ramen|mac and cheese|processed|american cheese|creamer|syrup|dressing|ketchup|bbq sauce|mayo|jam\b|jelly|pudding|jello|marshmallow|gummy|gummies|licorice|toaster|frosting|whipped topping|slushie|milkshake|frappu|nutella|cheez|dorito|cheeto|pringle|oreo|pop ?corn, microwave/i;
const FQ_WHOLE  = /\begg|chicken|turkey|beef|steak|pork|lamb|bison|salmon|tuna|cod\b|tilapia|halibut|shrimp|scallop|sardine|fish\b|tofu|tempeh|lentil|chickpea|black bean|kidney bean|pinto|edamame|\brice\b|quinoa|oat|potato|sweet potato|squash|broccoli|spinach|kale|lettuce|arugula|cabbage|cauliflower|carrot|celery|cucumber|tomato|pepper|onion|garlic|mushroom|zucchini|asparagus|brussels|green bean|pea\b|beet|avocado|apple|banana|berry|berries|orange|grape|melon|peach|pear|plum|mango|pineapple|kiwi|cherry|almond|walnut|pecan|cashew|pistachio|peanut|chia|flax|hemp seed|olive oil|coconut oil|water|greek yogurt, plain|cottage cheese/i;

// Fats worth separating — the user asked about "fat intake" as a quality
// question, not just grams.
const FQ_GOODFAT = /avocado|olive oil|salmon|sardine|tuna|mackerel|almond|walnut|pecan|cashew|pistachio|chia|flax|hemp seed|nut butter|almond butter|peanut butter|tahini|egg\b/i;
const FQ_SATFAT  = /butter|cream|bacon|sausage|cheese|ice cream|lard|coconut oil|ribeye|ground beef 8|whole milk|fried|deep fried/i;

function foodTags(item){
  const n = (item && item.name) || "";
  const gluten = FQ_GLUTEN.test(n);
  const dairy  = FQ_DAIRY.test(n);
  const ultra  = FQ_ULTRA.test(n);
  const whole  = !ultra && FQ_WHOLE.test(n);
  return {
    gluten, dairy,
    kind: ultra ? "ultra" : (whole ? "whole" : "mixed"),
    goodFat: FQ_GOODFAT.test(n),
    satFat: FQ_SATFAT.test(n),
  };
}

// Roll a day's diary up into quality numbers.
function dayFoodQuality(key){
  const day = dayObj(key);
  const o = { cal:0, glutenCal:0, glutenItems:0, dairyItems:0, ultraCal:0, wholeCal:0,
              mixedCal:0, items:0, fatG:0, goodFatCal:0, satFatCal:0 };
  ["breakfast","lunch","dinner","snacks"].forEach(m => {
    (day.meals[m] || []).forEach(it => {
      const cal = +it.cal || 0;
      const t = foodTags(it);
      o.cal += cal; o.items++;
      o.fatG += (+it.f || 0);
      if(t.gluten){ o.glutenCal += cal; o.glutenItems++; }
      if(t.dairy) o.dairyItems++;
      if(t.kind === "ultra") o.ultraCal += cal;
      else if(t.kind === "whole") o.wholeCal += cal;
      else o.mixedCal += cal;
      if(t.goodFat) o.goodFatCal += (+it.f || 0) * 9;
      if(t.satFat)  o.satFatCal  += (+it.f || 0) * 9;
    });
  });
  o.ultraPct = o.cal ? Math.round(o.ultraCal / o.cal * 100) : 0;
  o.wholePct = o.cal ? Math.round(o.wholeCal / o.cal * 100) : 0;
  o.fatPct   = o.cal ? Math.round((o.fatG * 9) / o.cal * 100) : 0;
  return o;
}

// Compare an outcome between two groups of days (the honest way to read
// "gluten days vs gluten-free days" — a mean split, not a correlation).
function _splitCompare(rows, predicate, valueKey){
  const a = rows.filter(r => predicate(r) && r[valueKey] != null).map(r => +r[valueKey]);
  const b = rows.filter(r => !predicate(r) && r[valueKey] != null).map(r => +r[valueKey]);
  if(a.length < 3 || b.length < 3) return null;
  const mean = (x) => x.reduce((m,v)=>m+v,0)/x.length;
  return { aN:a.length, bN:b.length, aAvg:mean(a), bAvg:mean(b), diff:mean(a)-mean(b) };
}

function foodQualityCorrelations(){
  const rows = _dailyRows(90).filter(r => r.cal > 0);
  const out = [];
  if(rows.length < 6) return out;
  const corr = (xKey, yKey, filterFn) => {
    const src = filterFn ? rows.filter(filterFn) : rows;
    const pairs = src.filter(r => r[xKey] != null && r[yKey] != null).map(r => [+r[xKey], +r[yKey]]);
    return { r: _pearson(pairs), n: pairs.length };
  };
  const push = (o) => { if(o) out.push(o); };

  // 1. GLUTEN — day-split against symptoms (the question she actually asked)
  const gDays = rows.filter(r => r.glutenItems > 0);
  if(gDays.length >= 3 && rows.length - gDays.length >= 3){
    const sym = _splitCompare(rows, r => r.glutenItems > 0, "symptoms");
    if(sym){
      const worse = sym.diff > 0.3, better = sym.diff < -0.3;
      push({
        tone: worse ? "watch" : "good",
        title: worse ? "Gluten days run with more symptoms"
             : (better ? "Gluten days aren't your symptom days" : "Gluten looks neutral for you"),
        body: `${sym.aAvg.toFixed(1)} symptoms on the ${sym.aN} days with gluten vs ${sym.bAvg.toFixed(1)} on ${sym.bN} without.`,
        action: worse ? "Try two clean weeks with gluten swapped out (rice, potato, corn tortilla) and check this card again."
                      : "No reason to cut gluten on this data. Keep logging.",
        n: rows.length, r: null, weight: Math.abs(sym.diff),
      });
    }
    const en = _splitCompare(rows, r => r.glutenItems > 0, "energy");
    if(en && Math.abs(en.diff) >= 0.4){
      push({
        tone: en.diff < 0 ? "watch" : "good",
        title: `Energy runs ${en.diff < 0 ? "lower" : "higher"} on gluten days`,
        body: `Average energy ${en.aAvg.toFixed(1)} with gluten vs ${en.bAvg.toFixed(1)} without (${en.aN} vs ${en.bN} days).`,
        action: en.diff < 0 ? "Move the gluten to a rest day and see if training-day energy lifts." : "",
        n: en.aN + en.bN, r: null, weight: Math.abs(en.diff),
      });
    }
  }

  // 2. PROCESSED vs REAL FOOD
  const upSym = corr("ultraPct", "symptoms");
  if(upSym.r !== null && Math.abs(upSym.r) >= 0.25){
    push({
      tone: upSym.r > 0 ? "watch" : "good",
      title: `Processed food ${upSym.r > 0 ? "lines up with more" : "lines up with fewer"} symptoms`,
      body: `${upSym.n} days compared — ${_strength(upSym.r)} link between the share of calories from packaged/processed food and symptom count.`,
      action: upSym.r > 0 ? "Swap one packaged item a day for a whole-food version. That's the whole change." : "",
      n: upSym.n, r: upSym.r, weight: Math.abs(upSym.r),
    });
  }
  const upEn = corr("ultraPct", "energy");
  if(upEn.r !== null && Math.abs(upEn.r) >= 0.25){
    push({
      tone: upEn.r < 0 ? "watch" : "good",
      title: `Processed food ${upEn.r < 0 ? "drags on" : "tracks with"} your energy`,
      body: `${upEn.n} days with both a diary and a check-in — ${_strength(upEn.r)} link.`,
      action: upEn.r < 0 ? "Your lowest-energy days are your most processed days. Front-load real food before 2pm." : "",
      n: upEn.n, r: upEn.r, weight: Math.abs(upEn.r),
    });
  }
  const wpVol = corr("wholePct", "vol", r => r.trained);
  if(wpVol.r !== null && Math.abs(wpVol.r) >= 0.25){
    push({
      tone: wpVol.r > 0 ? "good" : "watch",
      title: `Real food ${wpVol.r > 0 ? "shows up in" : "isn't showing in"} your training volume`,
      body: `${wpVol.n} training days — ${_strength(wpVol.r)} link between the whole-food share of your calories and how much you lifted.`,
      action: wpVol.r > 0 ? "Highest-volume days are your cleanest-eating days. Eat like that the day before a heavy session." : "",
      n: wpVol.n, r: wpVol.r, weight: Math.abs(wpVol.r),
    });
  }

  // 3. FAT INTAKE (as a share of calories, not raw grams)
  const fpEn = corr("fatPct", "energy");
  if(fpEn.r !== null && Math.abs(fpEn.r) >= 0.25){
    push({
      tone: fpEn.r > 0 ? "good" : "watch",
      title: `Higher-fat days feel ${fpEn.r > 0 ? "better" : "worse"}`,
      body: `${fpEn.n} days — ${_strength(fpEn.r)} link between the share of calories from fat and your energy rating.`,
      action: fpEn.r > 0 ? "You run well on fat. Don't cut it to hit a calorie number — cut refined carbs instead."
                         : "Try shifting ~20g of fat into protein or carbs on training days.",
      n: fpEn.n, r: fpEn.r, weight: Math.abs(fpEn.r),
    });
  }
  const fpSym = corr("fatPct", "symptoms");
  if(fpSym.r !== null && Math.abs(fpSym.r) >= 0.3){
    push({
      tone: fpSym.r > 0 ? "watch" : "good",
      title: `Fat share ${fpSym.r > 0 ? "lines up with more" : "lines up with fewer"} symptoms`,
      body: `${fpSym.n} days compared — ${_strength(fpSym.r)} link.`,
      action: fpSym.r > 0 ? "Check what kind of fat: fried and creamy days behave differently from avocado and salmon days." : "",
      n: fpSym.n, r: fpSym.r, weight: Math.abs(fpSym.r),
    });
  }

  // 4. DAIRY — same day-split treatment as gluten
  const dDays = rows.filter(r => r.dairyItems > 0);
  if(dDays.length >= 3 && rows.length - dDays.length >= 3){
    const sym = _splitCompare(rows, r => r.dairyItems > 0, "symptoms");
    if(sym && Math.abs(sym.diff) >= 0.3){
      push({
        tone: sym.diff > 0 ? "watch" : "good",
        title: `Dairy days run with ${sym.diff > 0 ? "more" : "fewer"} symptoms`,
        body: `${sym.aAvg.toFixed(1)} symptoms on the ${sym.aN} dairy days vs ${sym.bAvg.toFixed(1)} on ${sym.bN} without.`,
        action: sym.diff > 0 ? "Dairy is the easier elimination to test than gluten — swap to lactose-free for two weeks." : "",
        n: rows.length, r: null, weight: Math.abs(sym.diff),
      });
    }
  }

  // 5. SUGAR + FIBER (already tracked per item, estimated when missing)
  // Only trust fiber/sugar where the FOODS actually carried those numbers —
  // otherwise they are estimated from carbs and would just re-discover carbs.
  const realSug = rows.filter(r => r.items > 0 && r.knownSug / r.items >= 0.5);
  const realFib = rows.filter(r => r.items > 0 && r.knownFib / r.items >= 0.5);
  const corrOn = (src, xKey, yKey) => {
    const pairs = src.filter(r => r[xKey] != null && r[yKey] != null).map(r => [+r[xKey], +r[yKey]]);
    return { r: _pearson(pairs), n: pairs.length };
  };
  const sugSym = realSug.length >= 8 ? corrOn(realSug, "sugar", "symptoms") : { r:null, n:0 };
  if(sugSym.r !== null && Math.abs(sugSym.r) >= 0.3){
    push({
      tone: sugSym.r > 0 ? "watch" : "good",
      title: `Sugar ${sugSym.r > 0 ? "lines up with more" : "lines up with fewer"} symptoms`,
      body: `${sugSym.n} days where your foods carried real sugar numbers — ${_strength(sugSym.r)} link.`,
      action: sugSym.r > 0 ? "The cheapest cut is liquid sugar — drinks and creamers first." : "",
      n: sugSym.n, r: sugSym.r, weight: Math.abs(sugSym.r),
    });
  }
  const fibSym = realFib.length >= 8 ? corrOn(realFib, "fiber", "symptoms") : { r:null, n:0 };
  if(fibSym.r !== null && Math.abs(fibSym.r) >= 0.3){
    push({
      tone: fibSym.r < 0 ? "good" : "watch",
      title: `Fiber ${fibSym.r < 0 ? "lines up with fewer" : "lines up with more"} symptoms`,
      body: `${fibSym.n} days — ${_strength(fibSym.r)} link.`,
      action: fibSym.r < 0 ? "More fiber is doing real work for you. 30g/day is the target." : "Raise fiber slowly — a jump can cause the same symptoms it fixes.",
      n: fibSym.n, r: fibSym.r, weight: Math.abs(fibSym.r),
    });
  }

  return out.sort((a,b) => (b.weight || 0) - (a.weight || 0)).slice(0, 5);
}

function renderFoodQuality(){
  const host = document.getElementById("fqList");
  if(!host) return;
  const rows = _dailyRows(90).filter(r => r.cal > 0);
  const meta = document.getElementById("fqMeta");
  if(meta) meta.textContent = rows.length ? `${rows.length} logged days` : "—";
  if(!rows.length){
    host.innerHTML = `<p class="wl-empty">Log meals for a week and this breaks your food down by <b>kind</b>, not just calories — gluten, processed vs real food, fat share and dairy.</p>`;
    return;
  }

  // The composition picture always shows, even before correlations are possible.
  const last14 = rows.slice(-14);
  const avg = (f) => last14.reduce((a,r)=>a+f(r),0)/last14.length;
  const wholeP = Math.round(avg(r => r.wholePct));
  const ultraP = Math.round(avg(r => r.ultraPct));
  const mixedP = Math.max(0, 100 - wholeP - ultraP);
  const glutenDays = last14.filter(r => r.glutenItems > 0).length;
  const dairyDays  = last14.filter(r => r.dairyItems > 0).length;
  const fatP = Math.round(avg(r => r.fatPct));

  let html = `<div class="bp-lead">What you eat, not just how much — gluten, processed vs real food, fat share and dairy, checked against how you feel and train. Last ${Math.min(14, rows.length)} days.</div>
  <div class="fq-comp">
    <div class="fq-bar">
      <i class="fq-w" style="width:${wholeP}%"></i>
      <i class="fq-m" style="width:${mixedP}%"></i>
      <i class="fq-u" style="width:${ultraP}%"></i>
    </div>
    <div class="fq-key">
      <span><b class="fq-w"></b>Real food ${wholeP}%</span>
      <span><b class="fq-m"></b>Mixed ${mixedP}%</span>
      <span><b class="fq-u"></b>Processed ${ultraP}%</span>
    </div>
    <div class="fq-stats">
      <div><b>${glutenDays}<i>/${last14.length}</i></b><span>days with gluten</span></div>
      <div><b>${dairyDays}<i>/${last14.length}</i></b><span>days with dairy</span></div>
      <div><b>${fatP}<i>%</i></b><span>calories from fat</span></div>
    </div>
  </div>`;

  const items = foodQualityCorrelations();
  if(rows.length < 6){
    html += `<p class="wl-empty">${rows.length}/6 days — a few more and this starts telling you which of those actually affects how you feel and train.</p>`;
  } else if(!items.length){
    html += `<p class="wl-empty">Nothing in your food <i>kind</i> is moving your symptoms, energy or training yet. That's a real answer: on this data, gluten and processed food aren't your problem.</p>`;
  } else {
    html += items.map(it => `
      <div class="corr-card corr-${it.tone}">
        <div class="corr-title">${escape(it.title)}</div>
        <div class="corr-body">${escape(it.body)}</div>
        ${it.action ? `<div class="corr-act">${escape(it.action)}</div>` : ""}
        <div class="corr-meta">
          <span>${it.n} days</span>
          ${it.r != null ? `<span>r = ${it.r.toFixed(2)} · ${_strength(it.r)}</span>` : `<span>mean split</span>`}
        </div>
      </div>`).join("");
  }
  html += `<p class="corr-foot">Food kind is read from the item name. Foods it can't classify count as "mixed" rather than guessing.</p>`;
  host.innerHTML = html;
}

// ---------- (c) THE BIGGER PICTURE ----------
// Pairwise correlations answer "does X move Y". They can't answer
// "what does a good day actually look like for me". This does:
//   1. score every day on how it FELT (energy + mood - symptoms)
//   2. rank every input by how hard it pulls that score
//   3. profile the best third of days against the worst third
//   4. measure what happens when the habits STACK
const BP_FACTORS = [
  { key:"p",        label:"Protein",        unit:"g",  fmt:v => Math.round(v) + "g" },
  { key:"cal",      label:"Calories",       unit:"",   fmt:v => Math.round(v) },
  { key:"c",        label:"Carbs",          unit:"g",  fmt:v => Math.round(v) + "g" },
  { key:"fatPct",   label:"Fat share",      unit:"%",  fmt:v => Math.round(v) + "%" },
  { key:"water",    label:"Water",          unit:"oz", fmt:v => Math.round(v) + " " + unitVol() },
  { key:"sleep",    label:"Sleep",          unit:"h",  fmt:v => v.toFixed(1) + "h" },
  { key:"ultraPct", label:"Processed food", unit:"%",  fmt:v => Math.round(v) + "%" },
  { key:"wholePct", label:"Real food",      unit:"%",  fmt:v => Math.round(v) + "%" },
  { key:"fiber",    label:"Fiber",          unit:"g",  fmt:v => Math.round(v) + "g", measuredOnly:"knownFib" },
  { key:"sugar",    label:"Sugar",          unit:"g",  fmt:v => Math.round(v) + "g", measuredOnly:"knownSug" },
  { key:"vol",      label:"Training volume",unit:"",   fmt:v => Math.round(v).toLocaleString() },
  { key:"mins",     label:"Minutes trained",unit:"min",fmt:v => Math.round(v) + " min" },
];

// 0-100 "how the day felt". Needs a check-in — no check-in, no score.
function _dayFeelScore(r, useSymptoms){
  const parts = [];
  if(r.energy != null) parts.push(Math.max(0, Math.min(1, r.energy / 5)));
  if(r.mood   != null) parts.push(Math.max(0, Math.min(1, r.mood   / 5)));
  if(!parts.length) return null;
  if(useSymptoms) parts.push(Math.max(0, 1 - (r.symptoms || 0) / 4));
  return Math.round((parts.reduce((a,b)=>a+b,0) / parts.length) * 100);
}

function bigPicture(){
  const all = _dailyRows(90).filter(r => r.cal > 0 || r.trained);
  const useSymptoms = all.some(r => r.symptoms > 0);
  const rows = all.map(r => Object.assign({}, r, { score: _dayFeelScore(r, useSymptoms) }))
                  .filter(r => r.score != null);
  if(rows.length < 8) return { ready:false, n:rows.length, need:8 };

  // 1. Rank the drivers.
  const drivers = [];
  BP_FACTORS.forEach(f => {
    const pairs = rows.filter(r => r[f.key] != null && !(f.key === "sleep" && !r.sleep)
                        && !(f.measuredOnly && !(r.items > 0 && r[f.measuredOnly] / r.items >= 0.5)))
                      .map(r => [+r[f.key], r.score]);
    if(pairs.length < 6) return;
    const r = _pearson(pairs);
    if(r === null || Math.abs(r) < 0.2) return;
    drivers.push({ key:f.key, label:f.label, r, n:pairs.length, fmt:f.fmt });
  });
  drivers.sort((a,b) => Math.abs(b.r) - Math.abs(a.r));

  // 2. Best third vs worst third — what those days actually looked like.
  const sorted = rows.slice().sort((a,b) => b.score - a.score);
  const cut = Math.max(3, Math.floor(rows.length / 3));
  const top = sorted.slice(0, cut), bot = sorted.slice(-cut);
  const meanOf = (set, key) => {
    const v = set.filter(r => r[key] != null).map(r => +r[key]);
    return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null;
  };
  const deltas = [];
  BP_FACTORS.forEach(f => {
    if(f.measuredOnly) return;                           // estimated values don't belong in a profile
    const a = meanOf(top, f.key), b = meanOf(bot, f.key);
    if(a === null || b === null) return;
    if(a === 0 && b === 0) return;
    const base = Math.max(Math.abs(a), Math.abs(b));
    const relDiff = base ? (a - b) / base : 0;
    if(Math.abs(relDiff) < 0.12) return;                 // too small to be worth a sentence
    deltas.push({ key:f.key, label:f.label, best:a, worst:b, relDiff, fmt:f.fmt });
  });
  deltas.sort((a,b) => Math.abs(b.relDiff) - Math.abs(a.relDiff));

  // 3. The stack: how many of the core habits were true that day.
  const g = state.goals || {};
  const habits = [
    { id:"protein", label:`Protein ≥ ${Math.round((g.protein||0)*0.9)}g`, test:r => g.protein ? r.p >= g.protein*0.9 : null },
    { id:"sleep",   label:"Sleep ≥ 7h",                                   test:r => r.sleep != null ? r.sleep >= 7 : null },
    { id:"water",   label:`Water ≥ ${g.water||64} ${unitVol()}`,          test:r => r.water != null ? r.water >= (g.water||64) : null },
    { id:"clean",   label:"Processed ≤ 25% of calories",                  test:r => r.cal > 0 ? r.ultraPct <= 25 : null },
    { id:"train",   label:"Trained",                                      test:r => !!r.trained },
  ];
  const scored = rows.map(r => {
    let met = 0, known = 0;
    habits.forEach(h => { const v = h.test(r); if(v === null) return; known++; if(v) met++; });
    return { score:r.score, met, known };
  }).filter(r => r.known >= 3);
  const buckets = [
    { label:"0–1 habits", min:0, max:1, scores:[] },
    { label:"2 habits",   min:2, max:2, scores:[] },
    { label:"3 habits",   min:3, max:3, scores:[] },
    { label:"4–5 habits", min:4, max:9, scores:[] },
  ];
  scored.forEach(r => {
    const b = buckets.find(b => r.met >= b.min && r.met <= b.max);
    if(b) b.scores.push(r.score);
  });
  const stack = buckets.filter(b => b.scores.length >= 2).map(b => ({
    label: b.label, n: b.scores.length,
    avg: Math.round(b.scores.reduce((a,c)=>a+c,0) / b.scores.length),
  }));

  // Per-habit lift: score with vs without, so she can see which one earns its place.
  const perHabit = habits.map(h => {
    const withH = rows.filter(r => h.test(r) === true).map(r => r.score);
    const without = rows.filter(r => h.test(r) === false).map(r => r.score);
    if(withH.length < 3 || without.length < 3) return null;
    const m = (x) => x.reduce((a,b)=>a+b,0)/x.length;
    return { label:h.label, lift: Math.round(m(withH) - m(without)), withN:withH.length, withoutN:without.length };
  }).filter(Boolean).sort((a,b) => b.lift - a.lift);

  return {
    ready:true, n:rows.length, useSymptoms,
    avgScore: Math.round(rows.reduce((a,r)=>a+r.score,0)/rows.length),
    drivers, deltas, stack, perHabit,
    bestAvg: Math.round(top.reduce((a,r)=>a+r.score,0)/top.length),
    worstAvg: Math.round(bot.reduce((a,r)=>a+r.score,0)/bot.length),
    cut,
  };
}

function renderBigPicture(){
  const host = document.getElementById("bigPicList");
  if(!host) return;
  const d = bigPicture();
  const meta = document.getElementById("bigPicMeta");
  if(meta) meta.textContent = d.ready ? `${d.n} scored days` : `${d.n}/${d.need || 8} days`;

  if(!d.ready){
    host.innerHTML = `<p class="wl-empty">This needs a daily <b>check-in</b> (energy + mood) alongside your food and training — that's the only way to score how a day actually went. ${d.n} of ${d.need || 8} so far. Tap <b>+ CHECK-IN</b> above; it takes three taps.</p>`;
    return;
  }

  let html = `<div class="bp-lead">Every day you checked in scores <b>0–100</b> on how it felt${d.useSymptoms ? " (energy, mood, symptoms)" : " (energy, mood)"}. Your average is <b>${d.avgScore}</b>. Here is what separates the good ones.</div>`;

  // The stack — the actual "bigger picture": habits compound.
  if(d.stack.length >= 2){
    const max = Math.max(...d.stack.map(s => s.avg), 1);
    const first = d.stack[0], last = d.stack[d.stack.length-1];
    html += `<div class="bp-block">
      <div class="bp-h">Habits stack</div>
      ${d.stack.map(s => `<div class="bp-row">
        <span class="bp-lbl">${escape(s.label)}</span>
        <span class="bp-bar"><i style="width:${Math.round(s.avg/max*100)}%"></i></span>
        <span class="bp-val">${s.avg}</span>
        <span class="bp-n">${s.n}d</span>
      </div>`).join("")}
      <div class="bp-note">${last.avg - first.avg > 5
        ? `Stacking them is worth <b>+${last.avg - first.avg} points</b> a day over doing one or none. No single habit does that on its own — that's the point.`
        : `On your data the habits aren't compounding much yet. Keep logging — this is the number to watch.`}</div>
    </div>`;
  }

  // Best vs worst day profile.
  if(d.deltas.length){
    html += `<div class="bp-block">
      <div class="bp-h">Your best ${d.cut} days vs your worst ${d.cut}</div>
      <div class="bp-cmp-head"><span></span><span>Best (${d.bestAvg})</span><span>Worst (${d.worstAvg})</span></div>
      ${d.deltas.slice(0,7).map(x => `<div class="bp-cmp">
        <span class="bp-lbl">${escape(x.label)}</span>
        <span class="bp-b">${escape(String(x.fmt(x.best)))}</span>
        <span class="bp-w">${escape(String(x.fmt(x.worst)))}</span>
      </div>`).join("")}
    </div>`;
  }

  // What pulls the score hardest.
  if(d.drivers.length){
    const max = Math.max(...d.drivers.map(x => Math.abs(x.r)));
    html += `<div class="bp-block">
      <div class="bp-h">What moves the score, strongest first</div>
      ${d.drivers.slice(0,6).map(x => `<div class="bp-row">
        <span class="bp-lbl">${escape(x.label)}</span>
        <span class="bp-bar ${x.r > 0 ? "pos" : "neg"}"><i style="width:${Math.round(Math.abs(x.r)/max*100)}%"></i></span>
        <span class="bp-val ${x.r > 0 ? "pos" : "neg"}">${x.r > 0 ? "+" : ""}${x.r.toFixed(2)}</span>
        <span class="bp-n">${x.n}d</span>
      </div>`).join("")}
    </div>`;
  } else {
    html += `<div class="bp-block"><div class="bp-note">No single input is pulling your score yet across ${d.n} days. That's a real result — keep logging and the ranking fills in.</div></div>`;
  }

  // Per-habit lift, with the one instruction that follows from it.
  if(d.perHabit.length){
    const best = d.perHabit[0];
    html += `<div class="bp-block">
      <div class="bp-h">What each habit is worth to you</div>
      ${d.perHabit.map(h => `<div class="bp-cmp">
        <span class="bp-lbl">${escape(h.label)}</span>
        <span class="bp-b ${h.lift >= 0 ? "" : "neg"}">${h.lift >= 0 ? "+" : ""}${h.lift} pts</span>
        <span class="bp-w">${h.withN}d vs ${h.withoutN}d</span>
      </div>`).join("")}
      ${best.lift > 3 ? `<div class="bp-note">If you only defend one thing this week, defend <b>${escape(best.label)}</b> — it's worth ${best.lift} points a day to you.</div>` : ""}
    </div>`;
  }

  html += `<p class="corr-foot">Every number here is from your own log. Patterns, not proof — but they are your patterns.</p>`;
  host.innerHTML = html;
}

// Week / 4-week toggle on the muscle-coverage card.
onReady(() => {
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-smscope]");
    if(!b) return;
    if(!state.ui) state.ui = {};
    state.ui.smScope = b.getAttribute("data-smscope");
    save();
    renderSubMuscles();
  });
});



// =================================================================
// v21 — THE "WHY" LAYER
// She writes a one-line reason on a planned workout ("hungover, so
// cardio"). That line is the missing variable: it explains the days
// the numbers alone can't. This reads every why she has written,
// classifies it, and — the point — profiles what the DAY BEFORE
// looked like for her most common reason.
// =================================================================
const WHY_PRESETS = ["hungover","tired","sore","sick","period","no time","traveling","stressed","injured","feeling great"];

const WHY_MAP = [
  ["hungover", "Hungover",       /hung ?over|hangover|drank|drinking|too many|wine|tequila|vodka|beers?\b|booze|bar\b|party|cocktail/i],
  ["tired",    "Tired",          /tired|exhaust|no sleep|slept (bad|badly|like)|wiped|drained|fatigue|late night|up all night|zonked/i],
  ["sore",     "Sore",           /sore|doms|beat ?up|achy|wrecked from/i],
  ["sick",     "Sick",           /sick|cold\b|flu\b|fever|sinus|strep|covid|throat|congest|cough/i],
  ["injured",  "Injured",        /injur|tweak|hurt|strain|pulled|sprain|knee|shoulder pain|back pain|flare/i],
  ["period",   "Period / cycle", /period|cramp|pms\b|menstr|cycle day|time of the month/i],
  ["notime",   "No time",        /no time|busy|rushed|short on time|slammed|meetings?|packed|work ran|late for/i],
  ["travel",   "Traveling",      /travel|flight|airport|hotel|away|road trip|vacation|out of town/i],
  ["stress",   "Stressed",       /stress|anxious|anxiety|overwhelm|burn(ed|t)? out|mental|rough day|emotional/i],
  ["weather",  "Weather",        /weather|snow|storm|rain|ice\b|heat wave|too cold|too hot/i],
  ["good",     "Feeling good",   /feel(ing)? (great|good|amazing|strong)|energiz|fresh|pumped|fired up|ready/i],
  ["deload",   "Deload / easy",  /deload|easy day|recovery|light day|back off/i],
];

function whyTags(text){
  const t = String(text || "");
  if(!t.trim()) return [];
  const out = [];
  WHY_MAP.forEach(([id, label, re]) => { if(re.test(t)) out.push({ id, label }); });
  return out;
}
function whyLabel(id){
  const row = WHY_MAP.find(r => r[0] === id);
  return row ? row[1] : id;
}

// Walk real dates back through the plan so a why can be tied to a day.
// Returns [{ date, why, tags, planned, trained, vol, mins, cardioOnly }]
function whyEntries(daysBack){
  const out = [];
  const plan = state.plan || {};
  const names = ["sun","mon","tue","wed","thu","fri","sat"];
  const today = new Date(); today.setHours(0,0,0,0);
  for(let i = daysBack; i >= 0; i--){
    const d = new Date(today.getTime() - i*86400000);
    const k = todayKey(d);
    const wk = weekKey(weekStart(d));
    const p = (plan[wk] || {})[names[d.getDay()]];
    if(!p) continue;
    const whys = [];
    if(p.why) whys.push({ why: p.why, planned: p.type });
    (p.extra || []).forEach(x => { if(x.why) whys.push({ why: x.why, planned: x.name }); });
    if(!whys.length) continue;
    const day = state.days[k] || {};
    const sessions = day.sessions || [];
    const vol = sessions.reduce((n,s) => n + (s.weight||0)*(s.reps||0)*(s.sets||1), 0);
    whys.forEach(w => out.push({
      date: k,
      why: w.why,
      planned: w.planned,
      tags: whyTags(w.why),
      trained: sessions.length > 0,
      vol,
      mins: sessions.reduce((n,s) => n + (s.durationMin||0), 0),
      cardioOnly: sessions.length > 0 && sessions.every(s => s.type === "cardio"),
      dow: d.getDay(),
    }));
  }
  return out;
}

// What did the day BEFORE a given set of dates look like? This is where
// a reason turns into a pattern she can act on.
function _nightBefore(dates){
  const rows = [];
  dates.forEach(k => {
    const d = new Date(k + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const pk = todayKey(d);
    if(!state.days[pk]) return;
    const t = totalsDetailFor(pk);
    const q = dayFoodQuality(pk);
    const ci = (state.days[pk].checkin) || {};
    rows.push({
      cal: t.cal, ultraPct: q.ultraPct, water: state.days[pk].water || 0,
      sleep: ci.sleep != null ? +ci.sleep : null,
      // Alcohol rarely gets logged as a food, so read it from the diary text too.
      booze: ["breakfast","lunch","dinner","snacks"].some(m =>
        (state.days[pk].meals[m] || []).some(it => /wine|beer|vodka|tequila|whiskey|seltzer|cocktail|margarita|liquor|alcohol|prosecco|champagne/i.test(it.name || ""))),
    });
  });
  if(!rows.length) return null;
  const mean = (f) => {
    const v = rows.map(f).filter(x => x != null);
    return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null;
  };
  return {
    n: rows.length,
    cal: mean(r => r.cal), ultraPct: mean(r => r.ultraPct),
    water: mean(r => r.water), sleep: mean(r => r.sleep),
    boozeNights: rows.filter(r => r.booze).length,
  };
}

// Baseline for comparison: every logged day that ISN'T in the given set.
function _baselineDays(excludeKeys){
  const ex = new Set(excludeKeys);
  const rows = _dailyRows(90).filter(r => !ex.has(r.key) && r.cal > 0);
  if(rows.length < 3) return null;
  const mean = (f) => {
    const v = rows.map(f).filter(x => x != null);
    return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null;
  };
  return { n: rows.length, cal: mean(r => r.cal), ultraPct: mean(r => r.ultraPct),
           water: mean(r => r.water), sleep: mean(r => r.sleep),
           vol: mean(r => r.trained ? r.vol : null) };
}

function whyAnalysis(){
  const entries = whyEntries(90);
  if(!entries.length) return { ready:false, n:0 };

  // Tally by reason
  const counts = {};
  entries.forEach(e => e.tags.forEach(t => {
    if(!counts[t.id]) counts[t.id] = { id:t.id, label:t.label, n:0, dates:[], trained:0, cardioOnly:0, vols:[] };
    const c = counts[t.id];
    c.n++; c.dates.push(e.date);
    if(e.trained) c.trained++;
    if(e.cardioOnly) c.cardioOnly++;
    if(e.trained && e.vol > 0) c.vols.push(e.vol);
  }));
  const untagged = entries.filter(e => !e.tags.length).length;
  const ranked = Object.values(counts).sort((a,b) => b.n - a.n);

  // Deep-dive the most frequent reason (needs at least 3 to say anything)
  let top = null;
  if(ranked.length && ranked[0].n >= 3){
    const r = ranked[0];
    const before = _nightBefore(r.dates);
    const base = _baselineDays(r.dates);
    const dows = {};
    entries.filter(e => e.tags.some(t => t.id === r.id)).forEach(e => { dows[e.dow] = (dows[e.dow]||0)+1; });
    const topDow = Object.entries(dows).sort((a,b)=>b[1]-a[1])[0];
    const avgVol = r.vols.length ? r.vols.reduce((a,b)=>a+b,0)/r.vols.length : null;
    top = {
      id:r.id, label:r.label, n:r.n, trained:r.trained, cardioOnly:r.cardioOnly,
      before, base, avgVol,
      dowName: topDow ? ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][topDow[0]] : null,
      dowCount: topDow ? topDow[1] : 0,
      volDelta: (avgVol != null && base && base.vol) ? Math.round((avgVol - base.vol) / base.vol * 100) : null,
    };
  }

  return { ready:true, n:entries.length, ranked, untagged, top, entries: entries.slice(-6).reverse() };
}

function renderWhy(){
  const host = document.getElementById("whyList");
  if(!host) return;
  const d = whyAnalysis();
  const meta = document.getElementById("whyMeta");
  if(meta) meta.textContent = d.ready ? `${d.n} logged` : "—";

  if(!d.ready){
    host.innerHTML = `<p class="wl-empty">When you change a planned workout, write one line of <b>why</b> in the day editor — "hungover, so cardio", "no time", "sore". Fitness &gt; tap a day &gt; EDIT DAY. Those lines are the variable the numbers can't see, and this card turns them into a pattern.</p>`;
    return;
  }

  const max = Math.max(1, ...d.ranked.map(r => r.n));
  let html = `<div class="bp-lead">The line you write when you swap a workout is the variable the numbers can't see. Read back over 90 days${d.untagged ? `, ${d.untagged} of them uncategorised (still counted below)` : ""}.</div>`;

  if(d.ranked.length){
    html += `<div class="bp-block">
      <div class="bp-h">Reasons, ranked</div>
      ${d.ranked.map(r => `<div class="bp-row">
        <span class="bp-lbl">${escape(r.label)}</span>
        <span class="bp-bar"><i style="width:${Math.round(r.n/max*100)}%"></i></span>
        <span class="bp-val">${r.n}×</span>
        <span class="bp-n">${r.trained}/${r.n} trained</span>
      </div>`).join("")}
    </div>`;
  }

  if(d.top){
    const t = d.top;
    const b = t.before, base = t.base;
    const lines = [];
    if(t.dowCount >= 2 && t.dowName) lines.push(`${t.dowCount} of ${t.n} landed on a ${t.dowName}.`);
    if(b && b.n >= 2){
      const bits = [];
      if(b.sleep != null && base && base.sleep != null)
        bits.push(`${b.sleep.toFixed(1)}h sleep the night before vs ${base.sleep.toFixed(1)}h normally`);
      if(b.ultraPct != null && base && base.ultraPct != null)
        bits.push(`${Math.round(b.ultraPct)}% processed calories vs ${Math.round(base.ultraPct)}%`);
      if(b.boozeNights > 0) bits.push(`alcohol logged on ${b.boozeNights} of those ${b.n} nights`);
      if(bits.length) lines.push(`Those days followed: ${bits.join(", ")}.`);
    }
    if(t.trained === t.n) lines.push(`You still trained every one of them — that's the part worth knowing.`);
    else if(t.trained > 0) lines.push(`You still trained on ${t.trained} of ${t.n}.`);
    else lines.push(`None of those days ended in a session.`);
    if(t.cardioOnly > 0) lines.push(`${t.cardioOnly} became cardio instead of a lift.`);
    if(t.volDelta != null) lines.push(`Volume on those days ran ${t.volDelta > 0 ? "+" : ""}${t.volDelta}% vs your normal training day.`);

    html += `<div class="bp-block why-top">
      <div class="bp-h">${escape(t.label)} — ${t.n}× in 90 days</div>
      <div class="bp-note">${lines.map(escape).join(" ")}</div>
      ${t.id === "hungover" && b && b.boozeNights > 0
        ? `<div class="corr-act">Your own log says this one is upstream of the gym, not at the gym. The lever is the night before.</div>`
        : ""}
      ${t.id === "tired" && b && b.sleep != null && base && base.sleep != null && b.sleep < base.sleep - 0.5
        ? `<div class="corr-act">Short nights are showing up as skipped lifts a day later. Guard the night before a heavy day.</div>`
        : ""}
      ${t.id === "notime"
        ? `<div class="corr-act">Time is the reason you swap most. A saved 30-minute version of your main lift days would take this off the table.</div>`
        : ""}
    </div>`;
  }

  if(d.entries.length){
    html += `<div class="bp-block">
      <div class="bp-h">Most recent</div>
      ${d.entries.map(e => `<div class="why-row">
        <span class="why-date">${new Date(e.date + "T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>
        <span class="why-txt">${escape(e.why)}</span>
        <span class="why-plan">${escape(e.planned || "")}</span>
      </div>`).join("")}
    </div>`;
  }

  html += `<p class="corr-foot">Reasons are read from what you typed. Anything it can't categorise still counts and still shows here.</p>`;
  host.innerHTML = html;
}



// =================================================================
// GOAL DESIGNER
// The old calculator asked "lose / maintain / gain" and handed back a
// number. This asks what she actually wants — lean out to a body-fat
// target while holding muscle — and designs around three constraints
// she sets herself: a calorie FLOOR she won't go under, a rate she can
// live with, and protein high enough to defend lean mass in a deficit.
// Every output is editable before it's applied.
// =================================================================

// Katch-McArdle when body fat is known (it beats Mifflin once you have
// a real body-comp number), Mifflin-St Jeor when it isn't.
function _bmrFor(weightLb, bfPct, sex, ageYears, heightIn){
  const kg = weightLb * 0.4536;
  if(bfPct != null && bfPct > 3 && bfPct < 60){
    const leanKg = kg * (1 - bfPct/100);
    return { bmr: Math.round(370 + 21.6 * leanKg), formula: "Katch-McArdle (uses your body fat %)" };
  }
  const cm = (heightIn || 66) * 2.54;
  const age = ageYears || 35;
  return {
    bmr: Math.round(10*kg + 6.25*cm - 5*age + (sex === "m" ? 5 : -161)),
    formula: "Mifflin-St Jeor (no body fat % logged yet)",
  };
}

// Activity multiplier from training days rather than a vague dropdown.
function _activityFor(days, lifts){
  const d = Math.max(0, Math.min(7, days || 0));
  const base = 1.2 + d * 0.055;
  return Math.round((base + (lifts ? 0.03 : 0)) * 1000) / 1000;
}

// The plan itself. Returns every intermediate number so the UI can show
// its work instead of asking her to trust it.
function designGoalPlan(input){
  const {
    weightLb, bfPct, targetBfPct, targetWeightLb, mode,
    floorCal, days, lifts, ratePctPerWk, sex, ageYears, heightIn,
  } = input;

  const { bmr, formula } = _bmrFor(weightLb, bfPct, sex, ageYears, heightIn);
  const act  = _activityFor(days, lifts);
  const tdee = Math.round(bmr * act);

  const lean = bfPct != null ? Math.round(weightLb * (1 - bfPct/100) * 10) / 10 : null;
  const fatMass = lean != null ? Math.round((weightLb - lean) * 10) / 10 : null;

  // Where she's going. A body-fat target is the honest one — it holds
  // lean mass constant and solves for the weight that implies.
  let goalWeight = targetWeightLb || null;
  let goalFat = null;
  if(targetBfPct != null && lean != null){
    goalWeight = Math.round((lean / (1 - targetBfPct/100)) * 10) / 10;
    goalFat = Math.round((goalWeight - lean) * 10) / 10;
  }
  const toLose = goalWeight != null ? Math.round((weightLb - goalWeight) * 10) / 10 : null;

  // Rate: a share of bodyweight per week, capped at 1% (above that you
  // start paying in muscle, which is the whole thing she's avoiding).
  const ratePct = Math.min(1.0, Math.max(0.15, ratePctPerWk || 0.6));
  const wantedLbWk = Math.round(weightLb * ratePct / 100 * 100) / 100;

  let dailyDelta = 0;
  if(mode === "lose")        dailyDelta = -Math.round(wantedLbWk * 3500 / 7);
  else if(mode === "recomp") dailyDelta = -Math.round(tdee * 0.08);   // small, deliberate
  else if(mode === "build")  dailyDelta =  Math.round(tdee * 0.10);
  else                       dailyDelta = 0;

  // The floor is hers, not the formula's.
  const floor = floorCal || 1400;
  let cal = tdee + dailyDelta;
  let floored = false;
  if(dailyDelta < 0 && cal < floor){ cal = floor; floored = true; }
  // Never design a deficit steeper than 25% of maintenance.
  const maxDeficit = Math.round(tdee * 0.75);
  let capped = false;
  if(dailyDelta < 0 && cal < maxDeficit){ cal = maxDeficit; capped = true; }
  cal = Math.round(cal / 10) * 10;

  const actualDelta = cal - tdee;
  const actualLbWk = Math.round(Math.abs(actualDelta) * 7 / 3500 * 100) / 100;
  const weeks = (toLose != null && actualLbWk > 0.05 && actualDelta < 0)
    ? Math.ceil(toLose / actualLbWk) : null;

  // PROTEIN is the muscle-sparing lever. Per pound of LEAN mass, not
  // total weight — that's why body fat % matters here.
  const proteinBase = lean != null ? lean : weightLb * 0.75;
  let gPerLbLean = 1.0;
  if(actualDelta < 0 && lifts) gPerLbLean = 1.15;      // deficit + lifting = the highest need
  else if(actualDelta < 0)     gPerLbLean = 1.05;
  else if(mode === "build")    gPerLbLean = 1.0;
  let protein = Math.round(proteinBase * gPerLbLean);

  // FAT floor — hormones, and she said low fat, so this is the guard rail.
  let fat = Math.round(weightLb * 0.35);
  let carbs = Math.round((cal - protein*4 - fat*9) / 4);
  if(carbs < 60){                                       // squeeze fat first, then protein
    fat = Math.max(Math.round(weightLb * 0.28), Math.round((cal - protein*4 - 60*4) / 9));
    carbs = Math.round((cal - protein*4 - fat*9) / 4);
  }
  if(carbs < 40){
    protein = Math.round((cal - fat*9 - 40*4) / 4);
    carbs = Math.round((cal - protein*4 - fat*9) / 4);
  }
  carbs = Math.max(0, carbs);

  const notes = [];
  if(floored) notes.push(`Your ${floor} kcal floor is holding — the math wanted lower, so the timeline stretched instead of the food shrinking. That's the right trade.`);
  if(capped)  notes.push(`Capped at a 25% deficit. Steeper than that and you start paying in muscle.`);
  if(lean == null) notes.push(`No body fat % logged, so protein is set from total weight. Log an InBody or a body fat estimate and this gets sharper.`);
  if(mode === "recomp") notes.push(`Recomp runs a small deficit with protein high and lifting hard. The scale barely moves — body fat % and the mirror are the read, not weight.`);
  if(lifts && actualDelta < 0) notes.push(`${protein}g protein is ${gPerLbLean.toFixed(2)}g per lb of lean mass — that's the number that decides whether the weight you lose is fat or muscle.`);

  return {
    bmr, formula, act, tdee, lean, fatMass,
    goalWeight, goalFat, toLose, weeks,
    cal, protein, carbs, fat,
    actualDelta, actualLbWk, ratePct, floored, capped, notes,
    gPerLbLean,
  };
}

function _latestBodyFat(){
  const m = (state.measurements || []).slice().reverse().find(x => x.type === "bodyfat");
  return m ? +m.val : null;
}
function _latestWeight(){
  const w = (state.weights || [])[state.weights.length - 1];
  return w ? +w.val : (state.profile.weightLb || null);
}

function openGoalDesigner(){
  const w0  = _latestWeight() || 150;
  const bf0 = _latestBodyFat();
  const g   = state.goals || {};
  const saved = g.plan || {};
  const age = state.profile.birthYear ? (new Date().getFullYear() - state.profile.birthYear) : "";

  openModal("Design my plan", `
    <p class="gd-intro">Tell it what you actually want and what you're not willing to do. It designs around both — and shows its work, so you can change any number before it saves.</p>

    <div class="gd-sec">
      <div class="gd-h">1 · What are you after</div>
      <div class="gd-modes">
        <button type="button" class="gd-mode ${(saved.mode||"lose")==="lose"?"on":""}" data-mode="lose">
          <b>Lose fat</b><span>Drop fat, hold the muscle you have</span></button>
        <button type="button" class="gd-mode ${saved.mode==="recomp"?"on":""}" data-mode="recomp">
          <b>Lean out / recomp</b><span>Slow fat loss while building — scale barely moves</span></button>
        <button type="button" class="gd-mode ${saved.mode==="build"?"on":""}" data-mode="build">
          <b>Build muscle</b><span>Small surplus, accept a little fat</span></button>
        <button type="button" class="gd-mode ${saved.mode==="maintain"?"on":""}" data-mode="maintain">
          <b>Maintain</b><span>Hold where you are</span></button>
      </div>
    </div>

    <div class="gd-sec">
      <div class="gd-h">2 · Where you are</div>
      <div class="form-grid">
        <label><span>Weight (${unit()})</span><input id="gdW" type="number" step="0.1" value="${w0}"></label>
        <label><span>Body fat %<i class="gd-hint" data-explain="bf">?</i></span><input id="gdBF" type="number" step="0.1" value="${bf0 != null ? bf0 : ""}" placeholder="from InBody"></label>
        <label><span>Age</span><input id="gdAge" type="number" min="14" max="90" value="${age}"></label>
        <label><span>Height (in)</span><input id="gdHt" type="number" step="0.5" value="${state.profile.height || ""}"></label>
      </div>
    </div>

    <div class="gd-sec">
      <div class="gd-h">3 · Where you're going</div>
      <div class="form-grid">
        <label><span>Goal body fat %<i class="gd-hint" data-explain="bf">?</i></span>
          <input id="gdTargetBF" type="number" step="0.5" value="${saved.targetBf != null ? saved.targetBf : (bf0 != null ? Math.max(15, Math.round(bf0 - 5)) : "")}" placeholder="e.g. 24"></label>
        <label><span>Or goal weight (${unit()})</span>
          <input id="gdTargetW" type="number" step="0.1" value="${saved.targetWeight || g.weight || ""}" placeholder="optional"></label>
      </div>
      <p class="gd-note">Body fat % is the better target — it holds your lean mass constant and works out the weight that implies. Fill either one.</p>
    </div>

    <div class="gd-sec">
      <div class="gd-h">4 · What you're not willing to do</div>
      <div class="form-grid">
        <label><span>Never eat below (kcal)</span><input id="gdFloor" type="number" step="10" value="${saved.floor || 1400}"></label>
        <label><span>Training days / week</span><input id="gdDays" type="number" min="0" max="7" value="${saved.days != null ? saved.days : 4}"></label>
      </div>
      <label class="gd-check"><input type="checkbox" id="gdLifts" ${saved.lifts === false ? "" : "checked"}> I lift weights (raises your protein target)</label>
      <label><span>Pace</span>
        <select id="gdRate">
          <option value="0.35" ${saved.ratePct==0.35?"selected":""}>Gentle — 0.35% of bodyweight a week</option>
          <option value="0.6" ${(saved.ratePct||0.6)==0.6?"selected":""}>Steady — 0.6% a week (best for holding muscle)</option>
          <option value="0.85" ${saved.ratePct==0.85?"selected":""}>Faster — 0.85% a week</option>
        </select>
      </label>
    </div>

    <div id="gdResult" class="gd-result hidden"></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="gdBuild">BUILD MY PLAN</button>
      <button class="btn btn-lime hidden" id="gdApply">SAVE AS MY GOALS</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    let mode = saved.mode || "lose";
    let plan = null;

    root.querySelectorAll(".gd-mode").forEach(b => b.addEventListener("click", () => {
      root.querySelectorAll(".gd-mode").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      mode = b.getAttribute("data-mode");
    }));
    root.querySelectorAll("[data-explain]").forEach(b =>
      b.addEventListener("click", () => openExplainer(b.getAttribute("data-explain"))));

    const num = (id) => { const v = parseFloat((document.getElementById(id)||{}).value); return isNaN(v) ? null : v; };

    document.getElementById("gdBuild").addEventListener("click", () => {
      const weightLb = num("gdW");
      if(!weightLb){ toast("Enter your weight", "pink"); return; }
      plan = designGoalPlan({
        weightLb,
        bfPct: num("gdBF"),
        targetBfPct: num("gdTargetBF"),
        targetWeightLb: num("gdTargetW"),
        mode,
        floorCal: num("gdFloor"),
        days: num("gdDays"),
        lifts: document.getElementById("gdLifts").checked,
        ratePctPerWk: parseFloat(document.getElementById("gdRate").value),
        sex: state.profile.sex === "male" || state.profile.sex === "m" ? "m" : "f",
        ageYears: num("gdAge"),
        heightIn: num("gdHt"),
      });
      const eta = plan.weeks
        ? new Date(Date.now() + plan.weeks*7*86400000).toLocaleDateString(undefined,{month:"long",year:"numeric"})
        : null;
      const res = document.getElementById("gdResult");
      res.classList.remove("hidden");
      res.innerHTML = `
        <div class="gd-h">Your plan</div>
        <div class="gd-grid">
          <div><span>BMR<i class="gd-hint" data-explain="bmr">?</i></span><b>${plan.bmr}</b><em>${escape(plan.formula)}</em></div>
          <div><span>Maintenance</span><b>${plan.tdee}</b><em>×${plan.act} for ${num("gdDays")||0} training days</em></div>
          <div class="gd-hi"><span>Eat</span><b>${plan.cal}</b><em>${plan.actualDelta === 0 ? "at maintenance" : `${plan.actualDelta > 0 ? "+" : ""}${plan.actualDelta} · ~${plan.actualLbWk} ${unit()}/wk`}</em></div>
        </div>
        <div class="gd-macros">
          <div><span>Protein</span><b>${plan.protein}g</b><em>${plan.lean ? plan.gPerLbLean.toFixed(2) + "g per lb lean" : "from bodyweight"}</em></div>
          <div><span>Carbs</span><b>${plan.carbs}g</b><em>the rest of the fuel</em></div>
          <div><span>Fat</span><b>${plan.fat}g</b><em>floor for hormones</em></div>
        </div>
        ${plan.lean != null ? `<div class="gd-body">
          <div><span>Lean mass now</span><b>${plan.lean} ${unit()}</b></div>
          <div><span>Fat mass now</span><b>${plan.fatMass} ${unit()}</b></div>
          ${plan.goalWeight ? `<div><span>Goal weight at that body fat</span><b>${plan.goalWeight} ${unit()}</b></div>` : ""}
          ${plan.toLose != null ? `<div><span>Fat to lose</span><b>${plan.toLose} ${unit()}</b></div>` : ""}
          ${eta ? `<div><span>Gets you there around</span><b>${eta}</b></div>` : ""}
        </div>` : ""}
        ${plan.notes.length ? `<ul class="gd-notes">${plan.notes.map(n => `<li>${escape(n)}</li>`).join("")}</ul>` : ""}
        <div class="gd-h" style="margin-top:14px">Adjust anything before you save</div>
        <div class="form-grid">
          <label><span>Calories</span><input id="gdFinalCal" type="number" step="10" value="${plan.cal}"></label>
          <label><span>Protein (g)</span><input id="gdFinalP" type="number" value="${plan.protein}"></label>
          <label><span>Carbs (g)</span><input id="gdFinalC" type="number" value="${plan.carbs}"></label>
          <label><span>Fat (g)</span><input id="gdFinalF" type="number" value="${plan.fat}"></label>
        </div>
      `;
      res.querySelectorAll("[data-explain]").forEach(b =>
        b.addEventListener("click", () => openExplainer(b.getAttribute("data-explain"))));
      document.getElementById("gdApply").classList.remove("hidden");
    });

    document.getElementById("gdApply").addEventListener("click", () => {
      if(!plan) return;
      const gi = (id, fb) => { const v = parseInt((document.getElementById(id)||{}).value, 10); return isNaN(v) ? fb : v; };
      state.goals.cal     = gi("gdFinalCal", plan.cal);
      state.goals.protein = gi("gdFinalP", plan.protein);
      state.goals.carbs   = gi("gdFinalC", plan.carbs);
      state.goals.fat     = gi("gdFinalF", plan.fat);
      if(plan.goalWeight) state.goals.weight = plan.goalWeight;
      // Keep the top-level energy numbers in step — adaptive macros reads them.
      state.goals.bmr = plan.bmr;
      state.goals.tdee = plan.tdee;
      state.goals.plan = {
        mode,
        targetBf: num("gdTargetBF"),
        targetWeight: plan.goalWeight,
        floor: num("gdFloor"),
        days: num("gdDays"),
        lifts: document.getElementById("gdLifts").checked,
        ratePct: parseFloat(document.getElementById("gdRate").value),
        tdee: plan.tdee,
        startWeight: num("gdW"),
        startBf: num("gdBF"),
        createdAt: todayKey(),
      };
      save(); closeModal(); renderAll();
      toast("Plan saved as your goals", "cyan");
    });
  });
}

// The plan card on Goals — what she's eating, why, and how far along.
function renderPlanCard(){
  const host = document.getElementById("planBody");
  if(!host) return;
  const g = state.goals || {};
  const p = g.plan;
  const meta = document.getElementById("planMeta");

  if(!p){
    if(meta) meta.textContent = "not set";
    host.innerHTML = `<p class="wl-empty">Your targets are set to defaults. Tap <b>DESIGN MY PLAN</b> and it'll build one around a body fat target, a calorie floor you won't go under, and protein set from your lean mass — then show its work so you can change any number.</p>`;
    return;
  }

  const MODE = { lose:"Lose fat", recomp:"Lean out / recomp", build:"Build muscle", maintain:"Maintain" };
  if(meta) meta.textContent = MODE[p.mode] || p.mode;

  const nowW  = _latestWeight();
  const nowBf = _latestBodyFat();
  const rows = [];
  rows.push(["Eating", `${g.cal} kcal`, p.tdee ? `maintenance ~${p.tdee}` : ""]);
  rows.push(["Protein", `${g.protein}g`, "set from lean mass"]);
  rows.push(["Carbs / Fat", `${g.carbs}g / ${g.fat}g`, ""]);
  if(p.floor) rows.push(["Your floor", `${p.floor} kcal`, "never designed below this"]);

  let progress = "";
  if(p.targetBf != null && nowBf != null && p.startBf != null){
    const done = p.startBf - nowBf, need = p.startBf - p.targetBf;
    const pct = need > 0 ? Math.max(0, Math.min(100, Math.round(done / need * 100))) : 0;
    progress = `<div class="plan-prog">
      <div class="plan-prog-h"><span>Body fat ${p.startBf}% → ${p.targetBf}%</span><b>${nowBf}% now</b></div>
      <div class="plan-prog-bar"><i style="width:${pct}%"></i></div>
      <div class="plan-prog-sub">${done > 0 ? `${done.toFixed(1)} points down, ${(need-done).toFixed(1)} to go` : `Starting point. Log an InBody or a scale body fat % to move this.`}</div>
    </div>`;
  } else if(p.targetWeight && nowW){
    const done = (p.startWeight || nowW) - nowW, need = (p.startWeight || nowW) - p.targetWeight;
    const pct = need > 0 ? Math.max(0, Math.min(100, Math.round(done / need * 100))) : 0;
    progress = `<div class="plan-prog">
      <div class="plan-prog-h"><span>${p.startWeight || nowW} → ${p.targetWeight} ${unit()}</span><b>${nowW} now</b></div>
      <div class="plan-prog-bar"><i style="width:${pct}%"></i></div>
      <div class="plan-prog-sub">${p.targetBf != null ? `Log a body fat % and this switches to tracking fat, not just weight.` : ""}</div>
    </div>`;
  }

  host.innerHTML = progress + `<div class="plan-rows">
    ${rows.map(([k,v,sub]) => `<div class="plan-row"><span>${escape(k)}</span><b>${escape(v)}</b><em>${escape(sub||"")}</em></div>`).join("")}
  </div>
  <div class="plan-acts">
    <button type="button" class="btn btn-ghost btn-sm" id="planRedo">REDESIGN</button>
    <button type="button" class="btn btn-ghost btn-sm" id="planWhatIs">WHAT IS BMR VS BMI?</button>
  </div>`;
  const redo = document.getElementById("planRedo");
  if(redo) redo.addEventListener("click", openGoalDesigner);
  const wi = document.getElementById("planWhatIs");
  if(wi) wi.addEventListener("click", () => openExplainer("bmr"));
}

onReady(() => {
  const n = document.getElementById("trNoteBtn");
  if(n) n.addEventListener("click", () => openHealthNoteModal());
  const a = document.getElementById("goalPlanBtn");
  if(a) a.addEventListener("click", openGoalDesigner);
  const b = document.getElementById("goalPlanBtn2");
  if(b) b.addEventListener("click", openGoalDesigner);
});

// ---------- Plain-language explainers ----------
// She asked what BMR is vs BMI. The answer belongs in the app, next to
// the numbers, not in a chat she has to go find again.
const EXPLAINERS = {
  bmr: {
    title: "BMR vs BMI — they measure completely different things",
    body: `<p><b>BMR — Basal Metabolic Rate.</b> The calories your body burns doing nothing at all: breathing, pumping blood, keeping you warm, running your brain. If you slept for 24 hours straight, this is roughly what you'd burn. It's measured in calories.</p>
      <p>It's the floor your whole food plan is built on. Your <b>maintenance</b> (TDEE) is BMR multiplied by how much you move — so a heavier, more muscular person has a higher BMR, which is one reason muscle is worth defending in a deficit.</p>
      <p><b>BMI — Body Mass Index.</b> Just your weight compared to your height. One formula, no idea what you're made of. A lean athlete and someone with much more body fat at the same height and weight get the identical BMI. It's a population statistic, not a description of you.</p>
      <p class="ex-key">The short version: <b>BMR is about energy</b> — how much you burn, so how much to eat. <b>BMI is about size</b> — and it can't tell muscle from fat, which is exactly the difference you're training for. Body fat % is the number worth tracking instead.</p>`,
  },
  bf: {
    title: "Body fat % — and why the plan is built on it",
    body: `<p>Body fat % splits your weight into <b>fat mass</b> and <b>lean mass</b> (muscle, bone, organs, water). It's the number that tells you whether the scale moving is good news.</p>
      <p>Setting a body fat <i>target</i> lets the app hold your lean mass constant and work out what weight that implies. Drop from 30% to 24% while keeping every pound of muscle and it can tell you the exact weight that lands you at — usually higher than people guess, which is the point.</p>
      <p>It also sets your protein. Protein is prescribed per pound of <b>lean</b> mass, not total weight, because muscle is what you're feeding.</p>
      <p><b>Getting the number:</b> an InBody or DEXA scan is the accurate route — log it under Body. A smart scale is roughly right and consistent enough to track a trend. Without one the app falls back to a formula that only knows height and weight.</p>`,
  },
};
function openExplainer(key){
  const e = EXPLAINERS[key];
  if(!e) return;
  openModal(e.title, `<div class="explainer">${e.body}</div>
    <div class="modal-foot"><button class="btn btn-cyan" data-close>Got it</button></div>`,
    (root) => root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal)));
}



// =================================================================
// HEALTH NOTES — parsed LOCALLY, no AI, no key, no credits.
// "no sleep, bloated, ate gluten, drank last night, twisted my knee,
//  air is bad from the fires" — all of that becomes structured data:
// sleep hours on the check-in, symptoms with a suspected trigger, and
// exposure tags the Health page can correlate against.
// =================================================================

// Exposures — things that happen TO her, not symptoms she feels.
const NOTE_EXPOSURES = [
  ["alcohol",   "Alcohol",        /\b(drank|drinking|hungover|hung ?over|wine|beers?|vodka|tequila|whiskey|cocktails?|margarita|seltzers?|prosecco|champagne|booze|bar\b|happy hour)\b/i],
  ["gluten",    "Gluten",         /\b(gluten|bread|pasta|bagel|pizza|beer|cracker|tortilla|pastry|donut|cake|cookie)\b/i],
  ["dairy",     "Dairy",          /\b(dairy|milk|cheese|yogurt|ice cream|latte|cream)\b/i],
  ["sugar",     "Sugar",          /\b(sugar|sweets|candy|dessert|soda|chocolate)\b/i],
  ["caffeine",  "Caffeine",       /\b(caffeine|coffee|espresso|energy drink|pre.?workout)\b/i],
  ["airquality","Air quality",    /\b(smoke|smoky|wildfire|fire pollution|air quality|aqi|pollution|smog|pollen|allergens?)\b/i],
  ["travel",    "Travel",         /\b(flight|flew|airport|travel|hotel|jet ?lag|road trip)\b/i],
  ["stress",    "Stress",         /\b(stress|stressed|anxious|overwhelmed|rough day|burn(ed|t)? out)\b/i],
  ["poorsleep", "Poor sleep",     /\b(no sleep|barely slept|couldn'?t sleep|bad sleep|slept (badly|like crap|terrible)|insomnia|up all night|tossed and turned)\b/i],
  ["latemeal",  "Late meal",      /\b(ate late|late dinner|midnight snack|ate at \d)/i],
];

// Symptoms — mapped onto the app's existing vocabulary so they land in
// the same place as a manually logged symptom and feed the same engine.
const NOTE_SYMPTOMS = [
  [/\bbloat(ed|ing)?\b/i,                          "Bloating"],
  [/\b(stomach ache|stomachache|tummy|gut hurts?)\b/i, "Stomach ache"],
  [/\bnause(a|ous|ated)\b/i,                       "Nausea"],
  [/\bheart ?burn|acid reflux|reflux\b/i,          "Heartburn"],
  [/\bconstipat/i,                                 "Constipation"],
  [/\bdiarrh?ea|the runs\b/i,                      "Diarrhea"],
  [/\bmigraine\b/i,                                "Migraine"],
  [/\bhead ?ache\b/i,                              "Headache"],
  [/\bbrain fog|foggy\b/i,                         "Brain fog"],
  [/\bdizzy|dizziness|light ?headed\b/i,           "Dizziness"],
  [/\banxi(ous|ety)\b/i,                           "Anxiety"],
  [/\b(weepy|crying|emotional)\b/i,                "Emotional / weepy"],
  [/\birritab(le|ility)|snappy\b/i,                "Irritability"],
  [/\b(low energy|no energy|drained|wiped|zapped)\b/i, "Low energy"],
  [/\b(exhausted|fatigue[d]?|knackered)\b/i,       "Fatigue"],
  [/\b(insomnia|couldn'?t fall asleep)\b/i,        "Insomnia"],
  [/\b(restless sleep|tossed and turned|kept waking)\b/i, "Restless sleep"],
  [/\bcraving(s)?\b/i,                             "Cravings"],
  [/\bsore throat|throat hurts?\b/i,               "Sore throat"],
  [/\blaryngitis|lost my voice\b/i,                "Laryngitis"],
  [/\bcough(ing)?\b/i,                             "Cough"],
  [/\brunny nose\b/i,                              "Runny nose"],
  [/\b(stuffy|congested|congestion)\b/i,           "Stuffy nose"],
  [/\bsinus\b/i,                                   "Sinus pressure"],
  [/\b(feel sick|feeling sick|getting sick|came down with|cold\b|the flu|flu\b)\b/i, "Sick (cold/flu)"],
  [/\bfever\b/i,                                   "Fever"],
  [/\bchills\b/i,                                  "Chills"],
  [/\b(acne|breakout|broke out)\b/i,               "Acne"],
  [/\b(canker|mouth ulcer)\b/i,                    "Mouth ulcer / canker sore"],
  [/\brash|hives\b/i,                              "Rash"],
  [/\braynaud/i,                                   "Raynaud's flare"],
  [/\bcold hands|cold feet\b/i,                    "Cold hands/feet"],
  [/\b(twisted|tweaked|hurt|strained|jacked up) (my )?knee|knee (pain|hurts?)\b/i, "Knee pain"],
  [/\b(twisted|tweaked|hurt|strained) (my )?(lower )?back|back (pain|hurts?)\b/i,  "Back pain"],
  [/\bshoulder (pain|hurts?)|tweaked (my )?shoulder\b/i, "Shoulder pain"],
  [/\bneck (pain|hurts?)|stiff neck\b/i,           "Neck pain"],
  [/\b(sore|doms|beat ?up)\b/i,                    "Sore muscles"],
  [/\bjoint(s)? (pain|ache|hurt)\b/i,              "Joint pain"],
  [/\b(period cramps|cramping|cramps)\b/i,         "Period cramps"],
  [/\bpms\b/i,                                     "PMS"],
  [/\bnight sweats\b/i,                            "Night sweats"],
  [/\ballerg(y|ies|ic)\b/i,                        "Allergies"],
  [/\bpuffy|water retention|swollen\b/i,           "Water retention"],
  [/\beye strain|eyes hurt\b/i,                    "Eye strain"],
];

// Which exposure best explains a symptom, for the trigger field.
const NOTE_TRIGGER_FOR = { alcohol:"alcohol", gluten:"gluten", dairy:"dairy", sugar:"sugar",
  caffeine:"caffeine", poorsleep:"poor sleep", stress:"stress", airquality:"weather" };

function parseHealthNote(text){
  const t = String(text || "");
  const out = { sleep:null, energy:null, mood:null, water:null,
                symptoms:[], exposures:[], raw:t.trim() };
  if(!out.raw) return out;

  // Sleep: "5 hours sleep", "slept 6.5", "6h sleep", "4 hrs"
  let m = t.match(/\bslept\s*(?:for\s*)?(\d{1,2}(?:\.\d)?)\s*(?:hours?|hrs?|h)?\b/i)
       || t.match(/\b(\d{1,2}(?:\.\d)?)\s*(?:hours?|hrs?|h)\b[^.,;]{0,14}\bsleep\b/i)
       || t.match(/\bsleep[^.,;]{0,10}?(\d{1,2}(?:\.\d)?)\s*(?:hours?|hrs?|h)\b/i);
  if(m){
    const v = parseFloat(m[1]);
    if(v >= 0 && v <= 16) out.sleep = v;
  }
  // Energy / mood if stated as "energy 3/5" or "felt like a 2"
  m = t.match(/\benergy\s*(?:was\s*)?(\d)(?:\s*\/\s*5)?\b/i);
  if(m) out.energy = Math.max(1, Math.min(5, parseInt(m[1], 10)));
  m = t.match(/\bmood\s*(?:was\s*)?(\d)(?:\s*\/\s*5)?\b/i);
  if(m) out.mood = Math.max(1, Math.min(5, parseInt(m[1], 10)));
  // Water: "80 oz water"
  m = t.match(/(\d{2,3})\s*(?:oz|ounces)\b[^.,;]{0,10}\bwater\b/i)
   || t.match(/\bwater[^.,;]{0,10}?(\d{2,3})\s*(?:oz|ounces)\b/i);
  if(m) out.water = parseInt(m[1], 10);

  NOTE_EXPOSURES.forEach(([id, label, re]) => { if(re.test(t)) out.exposures.push({ id, label }); });
  const seen = new Set();
  NOTE_SYMPTOMS.forEach(([re, name]) => {
    if(re.test(t) && !seen.has(name)){ seen.add(name); out.symptoms.push(name); }
  });
  // "no sleep" is a symptom AND a sleep signal, but never a number.
  if(out.exposures.some(e => e.id === "poorsleep") && !out.symptoms.includes("Restless sleep") && !out.symptoms.includes("Insomnia")){
    out.symptoms.push("Restless sleep");
  }
  return out;
}

function _noteHasAnything(n){
  return !!(n.sleep != null || n.energy != null || n.mood != null || n.water != null
            || n.symptoms.length || n.exposures.length);
}

// Write a parsed note onto a day. Non-destructive: it won't overwrite a
// sleep number she already entered, and it won't duplicate a symptom.
function applyHealthNote(dateKey, n){
  const day = dayObj(dateKey);
  if(!day.checkin) day.checkin = {};
  const applied = [];
  if(n.sleep != null && day.checkin.sleep == null){ day.checkin.sleep = n.sleep; applied.push(`sleep ${n.sleep}h`); }
  else if(n.sleep != null){ applied.push(`sleep already logged (${day.checkin.sleep}h) — kept`); }
  if(n.energy != null && day.checkin.energy == null){ day.checkin.energy = n.energy; applied.push(`energy ${n.energy}/5`); }
  if(n.mood != null && day.checkin.mood == null){ day.checkin.mood = n.mood; applied.push(`mood ${n.mood}/5`); }
  if(n.water != null){ day.water = Math.max(day.water || 0, n.water); applied.push(`water ${n.water} ${unitVol()}`); }

  if(!day.symptoms) day.symptoms = [];
  const trigger = (n.exposures.map(e => NOTE_TRIGGER_FOR[e.id]).filter(Boolean))[0] || null;
  n.symptoms.forEach(name => {
    if(day.symptoms.some(s => (s.name || "").toLowerCase() === name.toLowerCase())) return;
    day.symptoms.push({ id: uid(), name, severity: 3, time: "all-day",
                        trigger, note: n.raw.slice(0, 120), loggedAt: Date.now(), fromNote: true });
    applied.push(name);
  });

  if(n.exposures.length){
    if(!day.exposures) day.exposures = [];
    n.exposures.forEach(e => { if(!day.exposures.includes(e.id)) day.exposures.push(e.id); });
    applied.push(n.exposures.map(e => e.label).join(", "));
  }
  if(!day.notes) day.notes = [];
  day.notes.push({ id: uid(), text: n.raw, at: Date.now() });
  save();
  return applied;
}

function openHealthNoteModal(prefill){
  openModal("Health note · " + fmtDate(currentDate), `
    <p class="hn-intro">Type it how you'd say it. This runs on your phone — no AI, no key, nothing to pay for. It pulls out sleep hours, symptoms and exposures and files them where the Health page can use them.</p>
    <textarea id="hnText" rows="4" class="search-input" style="resize:vertical;min-height:96px;font-size:14px;width:100%"
      placeholder="5 hours sleep, bloated all day, ate gluten at lunch, drank last night, air is bad from the fires">${escape(prefill || "")}</textarea>
    <div class="hn-ex">Try: <i>no sleep · bloated · ate gluten · drank wine · twisted my knee · feel sick · smoke from the fires · stressed · 80 oz water</i></div>
    <div id="hnPreview" class="hn-preview"></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="hnSave" disabled>SAVE TO TODAY</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    const ta = document.getElementById("hnText");
    const prev = document.getElementById("hnPreview");
    const btn = document.getElementById("hnSave");
    const refresh = () => {
      const n = parseHealthNote(ta.value);
      if(!_noteHasAnything(n)){
        prev.innerHTML = ta.value.trim()
          ? `<div class="hn-none">Nothing recognised yet — it still saves as a plain note, but sleep hours, symptoms and exposures are what make it show up in patterns.</div>`
          : "";
        btn.disabled = !ta.value.trim();
        return;
      }
      const bits = [];
      if(n.sleep != null) bits.push(`<span class="hn-chip">sleep ${n.sleep}h</span>`);
      if(n.energy != null) bits.push(`<span class="hn-chip">energy ${n.energy}/5</span>`);
      if(n.mood != null) bits.push(`<span class="hn-chip">mood ${n.mood}/5</span>`);
      if(n.water != null) bits.push(`<span class="hn-chip">water ${n.water}</span>`);
      n.symptoms.forEach(s => bits.push(`<span class="hn-chip sym">${escape(s)}</span>`));
      n.exposures.forEach(e => bits.push(`<span class="hn-chip exp">${escape(e.label)}</span>`));
      prev.innerHTML = `<div class="hn-h">It read this</div><div class="hn-chips">${bits.join("")}</div>`;
      btn.disabled = false;
    };
    ta.addEventListener("input", refresh);
    refresh();
    setTimeout(() => ta.focus(), 100);

    btn.addEventListener("click", () => {
      const n = parseHealthNote(ta.value);
      const applied = applyHealthNote(currentDate, n);
      closeModal(); renderAll();
      toast(applied.length ? `Logged: ${applied.slice(0,3).join(", ")}` : "Note saved", "cyan");
    });
  });
}

// Exposures logged in health notes ("drank", "smoke from the fires",
// "no sleep") tested against how the day went. Mean split, not a
// correlation — an exposure is a yes/no, so that's the honest test.
function exposureFindings(){
  const rows = _dailyRows(90);
  const withNotes = rows.filter(r => (r.exposures || []).length);
  if(withNotes.length < 3) return [];
  const ids = {};
  rows.forEach(r => (r.exposures || []).forEach(id => { ids[id] = (ids[id] || 0) + 1; }));
  const out = [];
  Object.keys(ids).forEach(id => {
    const label = (NOTE_EXPOSURES.find(e => e[0] === id) || [id, id])[1];
    const has = (r) => (r.exposures || []).includes(id);
    const sym = _splitCompare(rows, has, "symptoms");
    const en  = _splitCompare(rows, has, "energy");
    const bits = [];
    if(sym && Math.abs(sym.diff) >= 0.3)
      bits.push(`${sym.aAvg.toFixed(1)} symptoms vs ${sym.bAvg.toFixed(1)} without`);
    if(en && Math.abs(en.diff) >= 0.4)
      bits.push(`energy ${en.aAvg.toFixed(1)} vs ${en.bAvg.toFixed(1)}`);
    if(!bits.length) return;
    const bad = (sym && sym.diff > 0) || (en && en.diff < 0);
    out.push({
      id, label, n: ids[id], tone: bad ? "watch" : "good",
      body: `On the ${ids[id]} days you logged ${label.toLowerCase()}: ${bits.join(", ")}.`,
    });
  });
  return out.sort((a,b) => b.n - a.n).slice(0, 4);
}

// Recent notes, shown on Health so they aren't write-only.
function renderNotesCard(){
  const host = document.getElementById("notesList");
  if(!host) return;
  const rows = [];
  Object.keys(state.days).sort().reverse().forEach(k => {
    (state.days[k].notes || []).forEach(n => rows.push({ key:k, ...n }));
  });
  const meta = document.getElementById("notesMeta");
  if(meta) meta.textContent = rows.length ? `${rows.length} note${rows.length===1?"":"s"}` : "—";
  if(!rows.length){
    host.innerHTML = `<p class="wl-empty">Tap <b>+ NOTE</b> at the top of this page and type how the day actually went — "5 hours sleep, bloated, ate gluten, air is bad." It runs on your phone, files the sleep and symptoms for you, and everything above starts using it.</p>`;
    return;
  }
  let head = "";
  try{
    const fx = exposureFindings();
    if(fx.length){
      head = `<div class="bp-block" style="margin-bottom:10px">
        <div class="bp-h">What your notes line up with</div>
        ${fx.map(f => `<div class="note-find note-${f.tone}"><b>${escape(f.label)}</b> · ${escape(f.body)}</div>`).join("")}
      </div>`;
    }
  }catch(e){ console.warn("exposures", e); }
  host.innerHTML = head + rows.slice(0, 12).map(n => `<div class="note-row">
    <span class="note-date">${new Date(n.key + "T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>
    <span class="note-txt">${escape(n.text)}</span>
  </div>`).join("");
}


// =================================================================
// TEST SEAM — the only thing this IIFE exposes. Pure functions only, so
// the smoke suite can assert on the maths without the UI in the way.
// Never put state mutators here.
// =================================================================
window.__bermo = {
  parseHealthNote,
  designGoalPlan,
  subMusclesForExercise,
  whyTags,
  foodTags,
  _pearson,
};


// =================================================================

// PIPELINES — explicit composition (replaces the old wrapper chains).

// Order preserved from the original patch application order.

// =================================================================

function renderSettings(){
  renderSettingsBase();
  renderAISetup();
}

function renderBody(){
  renderBodyBase();
  try{ renderBodyComp(); }catch(e){ console.warn("body comp", e); }
  try{ renderBodyRing(); }catch(e){ console.warn("body ring", e); }
  try{ renderBodyTopStats(); }catch(e){ console.warn("body top", e); }
}

function renderFitness(){
  renderFitnessBase();
  renderLiftsList();
  renderBodyCoverage();
  try{ renderFitWeekList(); }catch(e){ console.warn("fit week", e); }
  try{ renderFitDayCard(); }catch(e){ console.warn("fit day", e); }
  try{ renderSessionCard(); }catch(e){ console.warn("session card", e); }
  try{ renderPrCallout(); }catch(e){ console.warn("pr callout", e); }
  try{ renderPrList(); }catch(e){ console.warn("pr list", e); }
  try{ renderMuscleMap(); }catch(e){ console.warn("muscle map", e); }
  try{ renderFitProgress(); }catch(e){ console.warn("fit progress", e); }
  try{ renderFitRing(); }catch(e){ console.warn("fit ring", e); }
  try{ renderFitTopStats(); }catch(e){ console.warn("fit top", e); }
  try{ renderMonthCalendar(); }catch(e){ console.warn("calendar", e); }
  try{ applyFitSub(); }catch(e){ console.warn("fit subnav", e); }
}

function renderDashboard(){
  renderDashboardBase();
  drawActivityRings();
  applyRedFlags();
  renderHubsAll();
  renderDashboardStep_RDForAcc();
  renderDashboardStep_RDForToday();
  try{ renderAdaptiveCard(); }catch(e){ console.warn("adaptive card", e); }
  try{ renderSmartBanners(); }catch(e){ console.warn("smart banners", e); }
  try{ appendAccountabilityBanners(); }catch(e){ console.warn("accountability", e); }
  try{ renderDeck(); }catch(e){ console.warn("deck", e); }
  try{ renderDashWorkList(); }catch(e){ console.warn("dash work", e); }
  try{ renderCompareCard(); }catch(e){ console.warn("compare", e); }
}

function openLiftDetail(lift){
  openLiftDetailBase(lift);
  openLiftDetailStep_OpenLiftDetail(lift);
}

function renderNutritionWeek(){
  renderNutritionWeekBase();
  renderNutritionWeekStep_RNW();
}

function drawActivityRings(){
  drawActivityRingsBase();
  drawActivityRingsStep_DrawRingsForStrip();
}

function renderNutritionHub(){
  renderNutritionHubBase();
  renderNutritionWeek();
}

function renderDetailView(){
  renderDetailViewBase();
  ensureMetricTabs();
}

function renderHubsAll(){
  renderHubsAllBase();
  renderHubsAllStep_RenderHubsAll();
}

function go(tab){
  goBase(tab);
  goStep_GoForTrends(tab);
}

function renderTrends(){
  renderTrendsBase();
  try{ renderBigPicture(); }catch(e){ console.warn("big picture", e); }
  try{ renderWhy(); }catch(e){ console.warn("why", e); }
  try{ renderNotesCard(); }catch(e){ console.warn("notes", e); }
  try{ renderSubMuscles(); }catch(e){ console.warn("sub muscles", e); }
  try{ renderFoodQuality(); }catch(e){ console.warn("food quality", e); }
  try{ renderBodyPartTrends(); }catch(e){ console.warn("bp trends", e); }
  try{ renderCorrelations(); }catch(e){ console.warn("correlations", e); }
  renderTrendsStep_RenderTrendsForSym();
}

function renderNutrition(){
  renderNutritionBase();
  try{ renderDiary(); }catch(e){ console.warn("diary", e); }
  renderNutritionStep_RenderNutritionForFlags(); // decorates diary items — must follow renderDiary
  renderDetail();
  try{ renderNutRing(); }catch(e){ console.warn("nut ring", e); }
  try{ renderNutTopStats(); }catch(e){ console.warn("nut top", e); }
  try{ renderNutrientsTable(); }catch(e){ console.warn("nutrients", e); }
  try{ renderMicros(); }catch(e){ console.warn("micros", e); }
  try{ renderMacroCalc("nutMacroCalc"); }catch(e){ console.warn("macro calc", e); }
  try{
    if(window._nutSub === "calories") renderCalSub();
    else if(window._nutSub === "macros") renderMacroSub();
  }catch(e){ console.warn("nut sub", e); }
}

// ---------- SINGLE INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  for(const step of INIT_QUEUE){
    try { step(); }
    catch(err){ console.error("[bermo] init step failed:", err); }
  }
});

})();

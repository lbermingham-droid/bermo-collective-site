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
  on("#dashCopyYesterday", "click", copyYesterday);

  // WOD shuffle
  on("#wodShuffle", "click", shuffleWod);
  on("#fitShuffle", "click", shuffleWod);
  on("#fitWodPicker", "change", (e) => { dayObj(currentDate).wodId = parseInt(e.target.value,10); save(); renderAll(); });

  // Fitness logging
  on("#fitNewLift", "click", openLiftModal);
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
      <button type="button" class="food-tab" data-fmode="quicklog">⚡ Quick log</button>
      <button type="button" class="food-tab" data-fmode="search">🔍 Search</button>
      <button type="button" class="food-tab" data-fmode="templates">📋 Templates</button>
      <button type="button" class="food-tab" data-fmode="ai">📸 AI</button>
      <button type="button" class="food-tab" data-fmode="barcode">📷 Barcode</button>
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
      <button type="button" class="btn btn-cyan" id="foodAIPhotoBtn" style="width:100%;margin-bottom:8px">📸 Snap a photo of food</button>
      <button type="button" class="btn btn-ghost" id="foodAITextBtn" style="width:100%;margin-bottom:8px">💬 Type what you ate</button>
      <button type="button" class="btn btn-ghost btn-sm" id="foodAISetupBtn" style="width:100%;font-size:11px">⚙ Set up / change API key</button>
    </div>
    <div class="food-pane" data-pane="barcode">
      <button type="button" class="btn btn-cyan" id="foodBarcodeBtn" style="width:100%;margin-bottom:8px">📷 Scan with camera</button>
      <button type="button" class="btn btn-ghost" id="foodBarcodeManualBtn" style="width:100%">⌨ Type UPC manually</button>
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
          dayObj(currentDate).meals[_activeFoodMeal].push({
            id: uid(), name:food.name, serving:food.serving,
            cal:food.cal, p:food.p, c:food.c, f:food.f
          });
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
        backgroundColor: over > 0 ? ["#ff5c8a","#0a0a0a"] : ["#c8f500","#f0efe9"],
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
        y:{beginAtZero:true, grid:{color:"#eee"}, ticks:{color:"#888",font:{size:10}}},
        x:{grid:{display:false}, ticks:{color:"#888",font:{size:10}}}
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

  // Today's sessions
  const list = $("#todaySessions");
  list.innerHTML = (day.sessions||[]).map(s => `
    <li class="session-row">
      <div>
        <div class="s-name">${escape(s.name)}</div>
        <div class="s-meta">${s.weight ? s.weight+unit()+" × "+s.reps+" × "+s.sets+"  " : ""}${s.notes ? "· "+escape(s.notes) : ""}</div>
      </div>
      <span class="s-tag t-${s.type}">${s.type}</span>
    </li>`).join("");
  s_meta: { const n = (day.sessions||[]).length; $("#todaySessionsMeta").textContent = n + (n === 1 ? " entry" : " entries"); }

  if(day.wodResult){
    list.innerHTML += `<li class="session-row">
      <div>
        <div class="s-name">${escape(wod.name)} · WOD result</div>
        <div class="s-meta">${escape(day.wodResult.score)} ${day.wodResult.notes ? "· "+escape(day.wodResult.notes) : ""}</div>
      </div>
      <span class="s-tag t-wod">wod</span>
    </li>`;
  }

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

function openLiftModal(){
  const moves = [...DATA.movements, ...DATA.prLifts].filter((v,i,a)=>a.indexOf(v)===i);
  openModal("Log a lift", `
    <label class="form-label">Movement</label>
    <input list="movelist" id="liftName" class="search-input" placeholder="Back Squat" required>
    <datalist id="movelist">${moves.map(m=>`<option value="${escape(m)}">`).join("")}</datalist>
    <div class="form-grid">
      <label><span>Weight (${unit()})</span><input id="liftWeight" type="number" min="0" step="2.5" required></label>
      <label><span>Reps</span><input id="liftReps" type="number" min="1" max="500" value="5" required></label>
      <label><span>Sets</span><input id="liftSets" type="number" min="1" max="20" value="1" required></label>
      <label><span>Type</span>
        <select id="liftType">
          <option value="strength">Strength</option>
          <option value="oly">Olympic</option>
          <option value="accessory">Accessory</option>
          <option value="cardio">Cardio</option>
        </select>
      </label>
    </div>
    <label><span>Notes</span><input id="liftNotes" type="text" placeholder="Felt strong, RPE 8"></label>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-cyan" id="liftSave">+ Save</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    $("#liftSave").addEventListener("click", () => {
      const name = $("#liftName").value.trim();
      const weight = parseFloat($("#liftWeight").value);
      const reps = parseInt($("#liftReps").value, 10);
      const sets = parseInt($("#liftSets").value, 10);
      const type = $("#liftType").value;
      const notes = $("#liftNotes").value.trim();
      if(!name || isNaN(weight) || isNaN(reps)) { toast("Fill in name, weight, reps","pink"); return; }
      const day = dayObj(currentDate);
      day.sessions = day.sessions || [];
      day.sessions.push({ id: uid(), name, weight, reps, sets, type, notes });
      // PR auto-track: 1RM estimated via Epley for any strength/oly lift
      if((type === "strength" || type === "oly") && reps <= 10){
        const est = Math.round(weight * (1 + reps/30));
        const cur = state.prs[name];
        if(!cur || est > cur.val){
          state.prs[name] = { val: est, date: currentDate, unit: unit() };
          toast(`New PR: ${name} ~ ${est}${unit()}`, "cyan");
        }
      }
      save(); closeModal(); renderAll();
    });
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
        y:{grid:{color:"#eee"}, ticks:{color:"#888",font:{size:10}}},
        x:{grid:{display:false}, ticks:{color:"#888",font:{size:10},maxRotation:0,autoSkip:true}}
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
  $("#setWater").value = state.goals.water;
  $("#setGoalWeight").value = state.goals.weight || "";
  // Layout card
  const stStart = $("#setStartTab"); if(stStart) stStart.value = state.profile.startTab || "dashboard";
  const stFood = $("#setFoodMode"); if(stFood) stFood.value = state.profile.foodMode || "search";
  const hubsList = $("#setHubsList");
  if(hubsList && typeof getHubPrefs === "function" && typeof ALL_HUBS !== "undefined"){
    const prefs = getHubPrefs();
    hubsList.innerHTML = ALL_HUBS.map(h => `
      <label class="set-hub-row">
        <input type="checkbox" data-hub="${h}" ${prefs.hidden.includes(h) ? "" : "checked"}>
        <span>${HUB_LABELS[h] || h}</span>
      </label>
    `).join("");
  }

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
    { color:"#a8f000", track:"#1a2400", val:a.exercise, goal:g.exercise, r:65, lw:18 }, // Exercise (lime)
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
      <button type="button" class="btn btn-cyan" id="awSnapBtn" style="width:100%">📸 Snap Apple Watch / Health screen</button>
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
          <option value="leanbulk">Build muscle (+250 cal)</option>
          <option value="bulk">Bulk (+500 cal)</option>
        </select>
      </label>
      <label><span>Macro split</span>
        <select id="mcSplit">
          <option value="balanced" selected>Balanced 30/40/30</option>
          <option value="highprotein">High protein 40/35/25</option>
          <option value="lowcarb">Low carb 30/20/50</option>
          <option value="endurance">Endurance 20/55/25</option>
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
      const adj = { cut:-500, cutmild:-250, maintain:0, leanbulk:250, bulk:500 }[goal];
      const cal = Math.round(tdee + adj);

      const splits = {
        balanced:    [.30,.40,.30],
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

      computed = { cal, protein: finalProtein, carbs, fat };

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
      `;
      document.getElementById("mcApply").classList.remove("hidden");
    });
    document.getElementById("mcApply").addEventListener("click", () => {
      if(!computed) return;
      state.goals.cal = computed.cal;
      state.goals.protein = computed.protein;
      state.goals.carbs = computed.carbs;
      state.goals.fat = computed.fat;
      save(); closeModal(); renderAll();
      toast("Goals updated", "cyan");
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
      banner.textContent = `⚠️ Within ${g.cal - t.cal} kcal of goal — careful`;
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

function renderDetail(){
  const card = document.getElementById("detailCard");
  if(!card) return;
  const grid = document.getElementById("detailGrid");
  const note = document.getElementById("detailNote");
  const t = totalsDetailFor(currentDate);
  const fiberGoal = state.goals.fiber || 30;
  const sugarLimit = state.goals.sugar || 50; // soft cap (AHA: <25g women, <36g men, plus natural fruit sugar)
  const proteinDensity = t.cal ? (t.p / t.cal * 100).toFixed(1) : "0.0";
  const carbDensity    = t.cal ? (t.c / t.cal * 100).toFixed(1) : "0.0";

  grid.innerHTML = `
    <div class="detail-pill ${t.fiber < fiberGoal*0.5 ? "over" : ""}">
      <div class="dp-lbl">Fiber</div>
      <div class="dp-val">${t.fiber}<i>g / ${fiberGoal}g</i></div>
      <div class="dp-bar"><span style="width:${Math.min(100, (t.fiber/fiberGoal)*100)}%;background:#0a8538"></span></div>
    </div>
    <div class="detail-pill ${t.sugar > sugarLimit ? "over" : ""}">
      <div class="dp-lbl">Sugar</div>
      <div class="dp-val">${t.sugar}<i>g / ${sugarLimit}g cap</i></div>
      <div class="dp-bar"><span style="width:${Math.min(100, (t.sugar/sugarLimit)*100)}%;background:${t.sugar > sugarLimit ? 'var(--pink)' : '#ffb347'}"></span></div>
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
        ["menstrual","🌑","#ff5c8a","1-5"],
        ["follicular","🌒","#c8f500","5-13"],
        ["ovulation","🌕","#00f5d4","13-16"],
        ["luteal","🌗","#888","16-"+cycle.avgLen],
      ].map(([p,e,c,r]) => `<div class="cph ${p===phase?"on":""}" style="--cc:${c}">${e}<span>${p}</span><i>${r}</i></div>`).join("")}
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
            icon: "💤",
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
        icon: "💧",
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
          icon: "🌗",
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
      icon: pct > 70 ? "🔥" : "⚠️",
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
      icon: "🥩",
      tier: "watch",
      headline: `Hit your protein goal on only ${proteinPct}% of logged days`,
      body: `Goal is ${state.goals.protein}g. Adding a protein shake or extra serving once a day is the cheapest fix.`
    });
  }

  return insights;
}

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
      <div class="ins-icon">${i.icon}</div>
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
      scales:{ y:{beginAtZero:true, grid:{color:"#eee"}, ticks:{color:"#888",font:{size:10}}}, x:{grid:{display:false}, ticks:{color:"#888",font:{size:10}}} }
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
      { data, borderColor:"#c8f500", backgroundColor:"rgba(200,245,0,0.15)", fill:true, tension:.3, pointRadius:2, borderWidth:2, spanGaps:true },
      { type:"line", data:labels.map(()=>7), borderColor:"#888", borderWidth:1, borderDash:[4,4], pointRadius:0 }
    ] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{min:0, max:12, grid:{color:"#eee"}, ticks:{color:"#888",font:{size:10}}}, x:{grid:{display:false}, ticks:{display:false}} } }
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
    ["💤 Sleep on training days", sleep.length ? avg(sleep).toFixed(1)+" h" : "—", "Goal: 7+ h"],
    ["💧 Water on training days", Math.round(avg(water))+" oz", "Goal: 64+ oz"],
    ["🥩 Protein on training days", Math.round(avg(protein))+" g", "Goal: " + state.goals.protein + "+ g"],
    ["⚡ Reported energy", energy.length ? (avg(energy).toFixed(1)+" / 5") : "—", "Log via daily check-in"],
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
              <span class="sym-r-name">${escape(s.name)} <span class="sev sev-${s.severity}">${s.severity}/5</span></span>
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
          icon:"💤", tier:"watch",
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
        icon:"💧", tier:"watch",
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
          icon:"🎯", tier:"info",
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
            icon:"🌗", tier:"info",
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
          icon:"🤧", tier:"info",
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
          <div class="ins-icon">${i.icon}</div>
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
  openModal("📸 Snap or upload food photo", `
    <p style="font-size:12px;color:#666;margin:0">Upload a photo of your food. Claude/GPT analyzes it and fills in calories + macros. You'll review before saving.</p>
    <input id="aiPhotoFile" type="file" accept="image/*" capture="environment" style="display:none">
    <button id="aiPhotoPick" class="btn btn-cyan" style="width:100%;justify-content:center">📸 Choose photo</button>
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
  openModal("💬 Type what you ate", `
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
  openModal("🧠 Brain dump", `
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
      <button type="button" class="btn btn-ghost btn-sm" id="bdAddPhoto">📸 Add photo (food / watch)</button>
      <input type="file" id="bdFile" accept="image/*" multiple style="display:none">
    </div>
    <div id="bdThumbs" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"></div>
    <div id="bdStatus" style="font-size:12px;color:#666;text-align:center;padding:10px"></div>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
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
          if(status) status.innerHTML = '<span style="color:var(--iron-volt)">🎤 Listening — just talk. Tap Parse when done.</span>';
          // stop dictation when modal closes or parse starts
          const stopRec = () => { try{ rec.stop(); }catch(e){} };
          document.getElementById("bdGo").addEventListener("click", stopRec, { once:true });
          document.querySelector("#modal [data-close]").addEventListener("click", stopRec, { once:true });
        } catch(e){ ta.focus(); }
      } else {
        // iOS Safari: no Web Speech — focus the box so the keyboard mic works
        ta.focus();
        const status = document.getElementById("bdStatus");
        if(status) status.innerHTML = '<span style="color:var(--iron-mute)">Tap the 🎤 on your keyboard and just talk.</span>';
      }
    }
    document.getElementById("bdGo").addEventListener("click", async () => {
      const text = document.getElementById("bdText").value.trim();
      if(!text && _brainImages.length === 0){ toast("Type something or add a photo","pink"); return; }
      const status = document.getElementById("bdStatus");
      status.innerHTML = `<span style="color:var(--cyan)">Parsing… (10–20 sec)</span>`;
      document.getElementById("bdGo").disabled = true;
      try {
        const parsed = await aiBrainDump(text, _brainImages);
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

let planViewDate = new Date();

function renderPlanBase(){
  const grid = document.getElementById("planGrid");
  if(!grid) return;
  const wkStart = weekStart(planViewDate);
  const wkKey = weekKey(wkStart);
  const plan = getPlan();
  const weekData = plan[wkKey] || {};
  const isPast = wkKey < weekKey(weekStart(new Date()));
  const isFuture = wkKey > weekKey(weekStart(new Date()));

  document.getElementById("planWeekLabel").innerHTML = `
    <b>${wkStart.toLocaleDateString(undefined,{month:"short",day:"numeric"})} – ${new Date(wkStart.getTime()+6*86400000).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</b>
    <span class="plan-week-tag">${wkKey}${isPast?" · locked":isFuture?" · future":" · this week"}</span>
  `;

  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  let html = "";
  for(let i=0;i<7;i++){
    const date = new Date(wkStart.getTime() + i*86400000);
    const dayKey = todayKey(date);
    const dayPlan = weekData[dayNames[i].toLowerCase()] || {};
    const planType = dayPlan.type || null;
    const sessions = (state.days[dayKey] && state.days[dayKey].sessions) || [];
    const wodResult = state.days[dayKey] && state.days[dayKey].wodResult;
    const isToday = dayKey === todayKey();
    const logged = sessions.length > 0 || !!wodResult;

    html += `<div class="plan-day ${isToday?"today":""} ${isPast?"past":""}" data-day="${dayNames[i].toLowerCase()}" data-date="${dayKey}">
      <div class="pd-head">
        <span class="pd-name">${dayNames[i]}</span>
        <span class="pd-date">${date.toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span>
      </div>
      ${planType
        ? `<div class="pd-type ${typeColor(planType)}">${escape(planType)}${dayPlan.time ? ` <em class="pd-time">${escape(fmtTime12(dayPlan.time))}</em>` : ""}</div>`
          + ((dayPlan.extra || []).map(x => `<div class="pd-type pd-type-extra ${typeColor(x.name)}">${escape(x.name)}${x.time ? ` <em class="pd-time">${escape(fmtTime12(x.time))}</em>` : ""}</div>`).join(""))
        : `<button class="pd-add ${isPast?"hidden":""}">+ Plan</button>`}
      ${logged
        ? `<div class="pd-logged">✓ ${sessions.length}${sessions.length?" set"+(sessions.length===1?"":"s"):""}${wodResult?" · WOD":""}</div>`
        : `<div class="pd-empty">${isPast?"":(isToday?"Log when done":"")}</div>`}
    </div>`;
  }
  grid.innerHTML = html;

  grid.querySelectorAll(".plan-day").forEach(d => {
    d.addEventListener("click", (e) => {
      if(e.target.closest(".pd-add")) return;
      // Click → log workout for that date
      const dk = d.dataset.date;
      currentDate = dk;
      const t = document.querySelector('.tab[data-tab="fitness"]');
      if(t) t.click();
    });
  });
  grid.querySelectorAll(".pd-add").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const dayName = b.closest(".plan-day").dataset.day;
    openPlanDayModal(wkKey, dayName);
  }));
}

function typeColor(t){
  const lower = t.toLowerCase();
  if(/leg|squat|lower|glute/.test(lower)) return "pt-cyan";
  if(/push|chest|shoulder|press/.test(lower)) return "pt-pink";
  if(/pull|back|row/.test(lower)) return "pt-lime";
  if(/cross|wod|hiit|olym|power/.test(lower)) return "pt-orange";
  if(/run|cycl|swim|row|cardio/.test(lower)) return "pt-blue";
  if(/yoga|pilat|barre|mobil|stretch|recov|rest/.test(lower)) return "pt-purple";
  return "pt-gray";
}

function autofillFromLastWeek(){
  const plan = getPlan();
  const wkStart_ = weekStart(planViewDate);
  const wkKey_ = weekKey(wkStart_);
  const prevDate = new Date(wkStart_.getTime() - 7*86400000);
  const prevKey = weekKey(prevDate);
  const prev = plan[prevKey];
  if(!prev || !Object.keys(prev).length){ toast("No previous week to copy","pink"); return; }
  if(!plan[wkKey_]) plan[wkKey_] = {};
  let copied = 0;
  ["sun","mon","tue","wed","thu","fri","sat"].forEach(d => {
    if(prev[d] && !plan[wkKey_][d]){
      plan[wkKey_][d] = { ...prev[d] };
      copied++;
    }
  });
  save(); renderPlan();
  toast(copied ? `Copied ${copied} day${copied===1?"":"s"} from last week` : "No empty days to fill","cyan");
}

// Hook tab routing
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function goStep_GoForPlan(tab){
  if(tab === "plan") renderPlan();
}

// Wire planner buttons
onReady(() => {
  const p = document.getElementById("planPrevWeek");
  if(p) p.addEventListener("click", () => { planViewDate = new Date(weekStart(planViewDate).getTime() - 7*86400000); renderPlan(); });
  const n = document.getElementById("planNextWeek");
  if(n) n.addEventListener("click", () => { planViewDate = new Date(weekStart(planViewDate).getTime() + 7*86400000); renderPlan(); });
  const a = document.getElementById("planAutofill");
  if(a) a.addEventListener("click", autofillFromLastWeek);
});

// Hook openLiftModal to also update rep PRs (intercept its save)
// We attach a delegated listener so once a session is added, we update PRs.
// (The original openLiftModal already pushes the session to day.sessions.)
document.addEventListener("click", (e) => {
  if(e.target && e.target.id === "liftSave"){
    setTimeout(() => {
      const day = dayObj(currentDate);
      const last = (day.sessions||[])[(day.sessions||[]).length-1];
      if(last && last.weight && last.reps) updateRepPRsFromSet(last);
    }, 80);
  }
});


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
    eyebrow: "Fat", title: "Fat Intake", color: "#ff5c8a", unitLbl: "g",
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
        y: { beginAtZero: true, grid:{color:"rgba(0,0,0,0.06)"}, ticks:{color:"#888",font:{size:10}}},
        x: { grid:{display:false}, ticks:{color:"#888",font:{size:10},maxRotation:0,autoSkip:true,autoSkipPadding:8}}
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
        y: { beginAtZero: true, grid:{color:"rgba(0,0,0,0.06)"}, ticks:{color:"#888",font:{size:10}}},
        x: { grid:{display:false}, ticks:{color:"#888",font:{size:10},maxRotation:0,autoSkip:true,autoSkipPadding:8}}
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
    { c1:"#ff5c8a", c2:"#ff6b35", track:"rgba(255,45,122,.10)", val:a.move,     goal:g.move,     r:80, lw:16 },
    { c1:"#c8f500", c2:"#7be600", track:"rgba(200,245,0,.10)",  val:a.exercise, goal:g.exercise, r:60, lw:16 },
    { c1:"#00f5d4", c2:"#00b8a3", track:"rgba(0,245,212,.10)",  val:a.stand,    goal:g.stand,    r:40, lw:16 },
    { c1:"#ffb347", c2:"#ff8c1a", track:"rgba(255,179,71,.10)", val:calVal,     goal:calGoal,    r:20, lw:16 },
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
          <div class="rwk-bar rwk-move"><span style="height:${m}%;background:#ff5c8a"></span></div>
          <div class="rwk-bar rwk-ex"><span style="height:${e}%;background:#c8f500"></span></div>
          <div class="rwk-bar rwk-st"><span style="height:${s}%;background:#00f5d4"></span></div>
          <div class="rwk-bar rwk-nut"><span style="height:${n}%;background:#ffb347"></span></div>
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
    else if(t.cal > g.cal*0.9) bar.style.background = "#ffb347";
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
      <span class="hi-icon">${i.icon}</span>
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

// ---- HUB ORDER + VISIBILITY ----
const ALL_HUBS = ["activity","nutrition","fitness","health","trends","weight"];
const HUB_LABELS = {
  activity: "Activity Rings",
  nutrition: "Nutrition",
  fitness: "Fitness",
  health: "Health",
  trends: "Trends",
  weight: "Weight vs Goal",
};
function getHubPrefs(){
  if(!state.hubPrefs) state.hubPrefs = { order: [...ALL_HUBS], hidden: [] };
  // Heal: ensure order has all, no duplicates
  const present = new Set(state.hubPrefs.order);
  ALL_HUBS.forEach(h => { if(!present.has(h)) state.hubPrefs.order.push(h); });
  state.hubPrefs.order = state.hubPrefs.order.filter(h => ALL_HUBS.includes(h));
  return state.hubPrefs;
}

function applyHubPrefs(){
  const prefs = getHubPrefs();
  const grid = document.querySelector(".hubs-grid");
  if(!grid) return;
  // Reorder DOM
  const map = {};
  grid.querySelectorAll(".hub").forEach(el => { map[el.dataset.hub] = el; });
  prefs.order.forEach(h => {
    if(map[h]){
      grid.appendChild(map[h]);
      map[h].classList.toggle("hidden", prefs.hidden.includes(h));
    }
  });
}

function openCustomizeModal(){
  const prefs = getHubPrefs();
  const rows = prefs.order.map((h, i) => `
    <div class="custom-row" data-hub="${h}">
      <div class="cr-grip">⋮⋮</div>
      <div class="cr-name">${HUB_LABELS[h]}</div>
      <div class="cr-actions">
        <button class="cr-up" data-up title="Move up">↑</button>
        <button class="cr-dn" data-dn title="Move down">↓</button>
        <label class="cr-vis">
          <input type="checkbox" ${prefs.hidden.includes(h) ? "" : "checked"} data-vis>
          <span>Show</span>
        </label>
      </div>
    </div>
  `).join("");
  openModal("Customize dashboard hubs", `
    <p style="font-size:12px;color:#666;margin:0 0 8px">Reorder with ↑↓. Uncheck to hide a hub. Changes save instantly.</p>
    <div class="custom-list">${rows}</div>
    <div class="modal-foot">
      <button class="btn btn-ghost" id="hubReset">Reset to default</button>
      <button class="btn btn-cyan" data-close>Done</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => { closeModal(); applyHubPrefs(); }));

    const refresh = () => {
      // Re-render the modal list to reflect new order
      const list = document.querySelector(".custom-list");
      const order = getHubPrefs().order;
      list.innerHTML = order.map(h => `
        <div class="custom-row" data-hub="${h}">
          <div class="cr-grip">⋮⋮</div>
          <div class="cr-name">${HUB_LABELS[h]}</div>
          <div class="cr-actions">
            <button class="cr-up" data-up title="Move up">↑</button>
            <button class="cr-dn" data-dn title="Move down">↓</button>
            <label class="cr-vis">
              <input type="checkbox" ${getHubPrefs().hidden.includes(h) ? "" : "checked"} data-vis>
              <span>Show</span>
            </label>
          </div>
        </div>
      `).join("");
      bindRows();
    };

    function bindRows(){
      document.querySelectorAll(".custom-row").forEach(row => {
        const h = row.dataset.hub;
        row.querySelector("[data-up]").addEventListener("click", () => {
          const order = getHubPrefs().order;
          const i = order.indexOf(h);
          if(i > 0){ [order[i-1], order[i]] = [order[i], order[i-1]]; save(); refresh(); applyHubPrefs(); }
        });
        row.querySelector("[data-dn]").addEventListener("click", () => {
          const order = getHubPrefs().order;
          const i = order.indexOf(h);
          if(i < order.length-1){ [order[i+1], order[i]] = [order[i], order[i+1]]; save(); refresh(); applyHubPrefs(); }
        });
        row.querySelector("[data-vis]").addEventListener("change", (e) => {
          const prefs = getHubPrefs();
          if(e.target.checked){ prefs.hidden = prefs.hidden.filter(x => x !== h); }
          else if(!prefs.hidden.includes(h)){ prefs.hidden.push(h); }
          save(); applyHubPrefs();
        });
      });
    }
    bindRows();
    document.getElementById("hubReset").addEventListener("click", () => {
      state.hubPrefs = { order: [...ALL_HUBS], hidden: [] };
      save(); refresh(); applyHubPrefs();
      toast("Reset","cyan");
    });
  });
}

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
  applyHubPrefs();
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
  const btn = document.getElementById("hubCustomizeBtn");
  if(btn) btn.addEventListener("click", openCustomizeModal);
  applyHubPrefs();
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
    const dotColor = m === "move" ? "#ff5c8a" : m === "exercise" ? "#c8f500" : m === "stand" ? "#00f5d4" : "#ffb347";
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

// ---- CUSTOMIZE relocations ----
onReady(() => {
  // Bottom button (re-create binding since the cloned hubs may have shadowed)
  const btn = document.getElementById("hubCustomizeBtn");
  if(btn && typeof openCustomizeModal === "function"){
    const nb = btn.cloneNode(true);
    btn.parentNode.replaceChild(nb, btn);
    nb.addEventListener("click", openCustomizeModal);
  }
});


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
        <div class="qv-ring"><div class="qv-lbl">Move</div><div class="qv-val" style="color:#ff5c8a">${Math.round(a.move)}<i>/${g.move}</i></div></div>
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
        <div class="qv-ring"><div class="qv-lbl">Carbs</div><div class="qv-val">${t.c}g<i>/${state.goals.carbs}g</i></div></div>
        <div class="qv-ring"><div class="qv-lbl">Fat</div><div class="qv-val">${t.f}g<i>/${state.goals.fat}g</i></div></div>
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
  const items = [{ name: cur.type || "", time: cur.time || "", exercises: cur.exercises || [] }]
    .concat((cur.extra || []).map(x => ({ name: x.name || "", time: x.time || "", exercises: x.exercises || [] })));

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
    return `<div class="pde-row-wrap" data-i="${i}">
      <div class="pde-row">
        <select class="pde-sel">${optionsHtml(sel)}</select>
        <input class="pde-custom" type="text" placeholder="Custom name (e.g. Legs — glute/ham focus)" maxlength="40"
          value="${sel === "custom" ? escape(it.name) : ""}" style="${sel === "custom" ? "" : "display:none"}">
        <input class="pde-time" type="time" value="${escape(it.time || "")}" title="Time of day">
        <button type="button" class="pde-del" title="Remove">×</button>
      </div>
      <textarea class="pde-moves" rows="3" placeholder="Movements — one per line:\nthruster machine\nRDL\nkickback machine\nhamstring curls">${escape(moves)}</textarea>
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
      row.querySelector(".pde-del").addEventListener("click", () => {
        if(list.children.length > 1) row.remove();
        else { sel.value = ""; custom.value = ""; custom.style.display = "none"; row.querySelector(".pde-time").value = ""; if(moves) moves.value = ""; }
      });
    };
    list.querySelectorAll(".pde-row-wrap").forEach(wireRow);
    document.getElementById("pdeAdd").addEventListener("click", () => {
      const div = document.createElement("div");
      div.innerHTML = rowHtml({ name:"", time:"", exercises:[] }, list.children.length);
      const row = div.firstElementChild;
      list.appendChild(row);
      wireRow(row);
    });
    document.getElementById("pdeSave").addEventListener("click", () => {
      const rows = Array.from(list.querySelectorAll(".pde-row-wrap"));
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
          return { name: w.name, time, exercises: moves.length ? moves : w.exercises.map(e => ({ name: e.name, scheme: e.scheme || "" })) };
        }
        if(v.startsWith("cat:")) return { name: v.slice(4), time, exercises: moves };
        if(v === "custom"){
          const name = row.querySelector(".pde-custom").value.trim();
          return name ? { name, time, exercises: moves } : null;
        }
        return null;
      }).filter(Boolean);
      if(!parsed.length){ toast("Pick at least one workout (or Clear day)", "pink"); return; }
      const main = parsed[0];
      const gym = (document.getElementById("pdeGym") || {}).value || "";
      plan[wkKey][dayName] = {
        type: main.name,
        time: main.time || undefined,
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
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function renderPlanStep_RenderPlan(){
  // Add exercise preview to each plan-day card
  document.querySelectorAll(".plan-day").forEach(d => {
    const dayKey = d.dataset.date;
    const dayName = d.dataset.day;
    const wkKey_ = weekKey(weekStart(new Date(dayKey + "T00:00:00")));
    const data = (state.plan && state.plan[wkKey_] && state.plan[wkKey_][dayName]) || {};
    if(data.exercises && data.exercises.length && !d.querySelector(".pd-exercises")){
      const ex = document.createElement("div");
      ex.className = "pd-exercises";
      ex.innerHTML = data.exercises.slice(0,3).map(e =>
        `<div class="pd-ex">• ${escape(e.name)}${e.scheme?` <i>${escape(e.scheme)}</i>`:""}</div>`
      ).join("") + (data.exercises.length > 3 ? `<div class="pd-ex pd-ex-more">+${data.exercises.length-3} more</div>` : "");
      // Insert before pd-logged
      const after = d.querySelector(".pd-logged, .pd-empty");
      if(after) d.insertBefore(ex, after);
      else d.appendChild(ex);
    }
  });
}

// (planMini removed — fitWeekList + fitDayCard replaced it)


// =================================================================
// WORKOUT SESSION — Fitbod/Hevy-style inline logger + rest timer
// =================================================================

const SET_KINDS = [
  {k:"normal",  lbl:"Normal",  c:"#00f5d4"},
  {k:"warmup",  lbl:"Warm-up", c:"#7cd9f1"},
  {k:"drop",    lbl:"Drop Set",c:"#ffb347"},
  {k:"fail",    lbl:"Failure", c:"#ff5c8a"},
];

let _restTimer = null;
let _restEndAt = 0;

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
// Pipeline step (extracted from a wrapper patch; composed at EOF).
function renderPlanStep_RenderPlanForWorkoutBtn(){
  document.querySelectorAll(".plan-day").forEach(d => {
    const dayKey = d.dataset.date;
    const dayName = d.dataset.day;
    const wkKey_ = weekKey(weekStart(new Date(dayKey+"T12:00:00")));
    const planned = (state.plan && state.plan[wkKey_] && state.plan[wkKey_][dayName] && state.plan[wkKey_][dayName].exercises) || [];
    if(planned.length && !d.querySelector(".pd-start")){
      const btn = document.createElement("button");
      btn.className = "pd-start";
      btn.textContent = "▶ Start";
      btn.title = "Start workout session";
      btn.addEventListener("click", (e) => { e.stopPropagation(); openWorkoutSession(dayKey); });
      d.appendChild(btn);
    }
  });
}


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
    suggestion = `<div class="bp-suggest"><b>⚠️ Missing in last 14 days:</b> ${missing.map(m=>m.charAt(0).toUpperCase()+m.slice(1)).join(", ")}.<br><i>Try: ${PART_SUGGESTIONS[missing[0]]}</i></div>`;
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

// ---------- FEATURE 2: InBody scan ----------
function openInBodyModal(){
  if(!state.ai || !state.ai.key){
    openModal("InBody scan",
      `<p style="line-height:1.6;color:#555">You need an AI key to parse scans automatically.</p>
       <p style="line-height:1.6;color:#888;font-size:13px">Add a Claude or OpenAI key in Settings → AI Setup, then come back.</p>
       <button type="button" class="btn btn-cyan" data-go="settings" id="ibToSettings" style="margin-top:12px">Go to Settings</button>`,
      () => { $("#ibToSettings").addEventListener("click", closeModal); }
    );
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
        dayObj(currentDate).meals[meal].push({
          id: uid(),
          name: food.name, serving: `${mult} × ${food.serving}`,
          cal: Math.round(food.cal*mult), p: Math.round(food.p*mult*10)/10,
          c: Math.round(food.c*mult*10)/10, f: Math.round(food.f*mult*10)/10
        });
        save(); closeModal(); renderAll();
        toast(`Added ${food.name}`, "cyan");
      });
      $("#bcSaveCustom").addEventListener("click", () => {
        const id = "f-bc-" + food.upc;
        if(!state.customFoods.find(x => x.id === id)){
          state.customFoods.push({ id, name: food.name, serving: food.serving,
            cal: food.cal, p: food.p, c: food.c, f: food.f, custom:true, upc: food.upc });
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
  if(typeof renderPlan === "function") renderPlan();
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
      ? `<li class="ql-section-inline">★ FAVORITES</li>` + favs.map(renderRow).join("")
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
      dayObj(currentDate).meals[targetMeal].push({
        id: uid(),
        name: food.name, serving: food.serving,
        cal: food.cal, p: food.p, c: food.c, f: food.f
      });
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
        dayObj(currentDate).meals[targetMeal].push({ id: uid(), name:it.name, serving:it.serving, cal:it.cal, p:it.p, c:it.c, f:it.f });
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
    if(typeof getHubPrefs === "function"){
      const prefs = getHubPrefs();
      const checks = document.querySelectorAll("#setHubsList input[type=checkbox][data-hub]");
      const hidden = [];
      checks.forEach(cb => { if(!cb.checked) hidden.push(cb.dataset.hub); });
      prefs.hidden = hidden;
      state.hubPrefs = prefs;
    }
    save();
    if(typeof applyHubPrefs === "function") applyHubPrefs();
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

  // 🔥 Morning workout call — fires from the set time until +3h, while no workout logged
  if(r.workoutOn){
    const t = _hmToMinutes(r.workout);
    if(now >= t && now < t + 180 && !_todayHasWorkout() && !_bannerDismissed("workout")){
      banners.push({
        key: "workout",
        title: "🔥 Get your ass to the gym.",
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
        title: "💧 Water is low.",
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
        title: "🌙 Nothing tracked today.",
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
  if(r.workoutOn) items.push({ key:"workout", time:r.workout, title:"🔥 Workout time", body:"Get up. Get to the gym. 20 minutes minimum. No excuses." });
  if(r.waterOn)   items.push({ key:"water",   time:r.water,   title:"💧 Water check",  body:"Half the day gone — how's your water? Tap to add a glass." });
  if(r.eodOn)     items.push({ key:"eod",     time:r.eod,     title:"🌙 Don't break the chain", body:"You haven't tracked anything today. Log something — anything — before bed." });
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
  const g = state.goals || {};
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
    { color:"#ff5c8a", track:"#2a1420", val:a.move,     goal:g.move,     r:13, lw:3.5 },
    { color:"#2ee6c8", track:"#0e2b26", val:a.exercise, goal:g.exercise, r:9,  lw:3.5 },
    { color:"#7ec8f5", track:"#16222e", val:cal,        goal:calG,       r:5,  lw:3.5 },
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
    { color:"#ff5c8a", track:"#2a1420", val:a.move,     goal:g.move,     r:56, lw:13 },
    { color:"#2ee6c8", track:"#0e2b26", val:a.exercise, goal:g.exercise, r:41, lw:13 },
    { color:"#7ec8f5", track:"#16222e", val:a.stand,    goal:g.stand,    r:26, lw:13 },
  ]);
  const fs = document.getElementById("deckFitStats");
  if(fs) fs.innerHTML = `
    <div class="dds-h">FITNESS</div>
    <div class="dds"><i style="color:#ff5c8a">Move</i><b>${Math.round(a.move)}</b><s>/${g.move} cal</s></div>
    <div class="dds"><i style="color:#2ee6c8">Exercise</i><b>${Math.round(a.exercise)}</b><s>/${g.exercise} min</s></div>
    <div class="dds"><i style="color:#7ec8f5">Stand</i><b>${Math.round(a.stand)}</b><s>/${g.stand} hr</s></div>
    <div class="dds"><i style="color:#8b95a1">Lifted</i><b>${Math.round(lifted).toLocaleString()}</b><s>${unit()}</s></div>`;

  // ---- Nutrition ring stack + stats for the selected day ----
  const t = totalsFor(currentDate);
  drawRingStack("deckNutRings", [
    { color:"#f5c542", track:"#2b2415", val:t.cal, goal:calG,           r:56, lw:13 },
    { color:"#7ec8f5", track:"#16222e", val:t.p,   goal:gl.protein||1,  r:41, lw:13 },
    { color:"#2ee6c8", track:"#0e2b26", val:t.c,   goal:gl.carbs||1,    r:26, lw:13 },
  ]);
  const ns = document.getElementById("deckNutStats");
  if(ns) ns.innerHTML = `
    <div class="dds-h">NUTRITION</div>
    <div class="dds"><i style="color:#f5c542">Calories</i><b>${Math.round(t.cal)}</b><s>/${calG}</s></div>
    <div class="dds"><i style="color:#7ec8f5">Protein</i><b>${Math.round(t.p)}</b><s>/${gl.protein||0} g</s></div>
    <div class="dds"><i style="color:#2ee6c8">Carbs</i><b>${Math.round(t.c)}</b><s>/${gl.carbs||0} g</s></div>
    <div class="dds"><i style="color:#ff5c8a">Fat</i><b>${Math.round(t.f)}</b><s>/${gl.fat||0} g</s></div>`;

  // ---- Water row (one line, one-tap +8) ----
  const wr = document.getElementById("deckWaterRow");
  if(wr){
    const water = (state.days[currentDate] || {}).water || 0;
    wr.innerHTML = `
      <span class="dw-lbl">💧 WATER</span>
      <div class="bar dw-bar"><div class="bar-fill" style="width:${Math.min(100,(water/watG)*100)}%;background:#7ec8f5"></div></div>
      <b>${Math.round(water)}/${watG} oz</b>
      <button class="dn-w-add" id="deckWaterAdd">+8</button>`;
    wr.querySelector("#deckWaterAdd").addEventListener("click", () => {
      const day = dayObj(currentDate);
      day.water = (day.water || 0) + 8;
      save(); renderDeck();
      toast("+8 oz water", "cyan");
    });
  }

  // ---- Month strip (kept: one-line month hit/fail) ----
  const moStrip = document.getElementById("deckMonthStrip");
  if(moStrip){
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const lbl = document.getElementById("deckMonthLabel");
    if(lbl) lbl.textContent = now.toLocaleDateString(undefined,{month:"short"}).toUpperCase();
    let html = "";
    for(let dnum = 1; dnum <= daysInMonth; dnum++){
      const d = new Date(now.getFullYear(), now.getMonth(), dnum);
      const k = todayKey(d);
      const st = dayGoalStatus(k);
      let cls = "off";
      if(k > todayKey()) cls = "future";
      else if(st.food === "hit" && (st.workout === "hit" || st.workout === "rest")) cls = "on";
      else if(st.food === "hit" || st.workout === "hit") cls = "half";
      else cls = "bad";
      html += `<button class="dk-mdot ${cls} ${k===todayKey()?"today":""}" data-date="${k}" title="${k}"></button>`;
    }
    moStrip.innerHTML = html;
    moStrip.querySelectorAll(".dk-mdot").forEach(b => b.addEventListener("click", () => {
      currentDate = b.dataset.date;
      renderAll();
    }));
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
      const day = dayObj(currentDate);
      if(!day.sessions) day.sessions = [];
      day.sessions.push({
        id: uid(), name, lift: name,
        weight: 0, reps: 0, sets: 1,
        type: "cardio",
        durationMin: mins,
        calories: kcal,
        cardioId: t.id,
      });
      save(); closeModal(); renderAll();
      toast(`${name} · ${mins} min · ~${kcal} kcal`, "cyan");
    });
    recalc();
  });
}

onReady(() => {
  on("#fitNewCardio", "click", openCardioModal);
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
      <div class="wb-cat-h">♥ Favorites</div>
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
      renderPlan();
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
      title: `✕ You planned ${yPlan.type} yesterday. You didn't show.`,
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
          title: `⚠ ${p.toUpperCase()}: ${days} days untouched.`,
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
        title: `▼ Volume down ${Math.round(100 - (thisVol/prevAvg)*100)}% vs your 3-week average.`,
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
      `<small class="dw-extra">+ ${escape(x.name)}${x.time ? ` · ${escape(fmtTime12(x.time))}` : ""}</small>`).join("");
    html += `<button class="dw-row ${cls} ${isToday?"today":""}" data-day="${names[i]}" data-date="${k}">
      <span class="dw-day">${d.toLocaleDateString(undefined,{weekday:"short"}).toUpperCase()}<i>${d.getDate()}</i></span>
      <span class="dw-info">
        <b>${escape(String(label))}${timeTag}</b>
        ${statParts.length ? `<small>${escape(statParts.join(" · "))}</small>` : ""}${extras}
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
        ctx.strokeStyle = "#2ee6c8"; ctx.setLineDash([4,4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, Y(goalW)); ctx.lineTo(cv.width, Y(goalW)); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = "#7ec8f5"; ctx.lineWidth = 2;
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
  if(days <= 2) return "#ff5c8a";           // just hit — recovering (red like Fitbod's worked)
  if(days <= 5) return "#f5c542";           // recently
  if(days <= 8) return "#2ee6c8";           // fresh — ready to train
  return "#5b6673";                          // stale — going cold
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
          <rect x="18" y="214" width="8" height="8" fill="#ff5c8a"/><text x="30" y="221">Just hit (0-2d)</text>
          <rect x="90" y="214" width="8" height="8" fill="#f5c542"/><text x="102" y="221">Recent (3-5d)</text>
          <rect x="162" y="214" width="8" height="8" fill="#2ee6c8"/><text x="174" y="221">Fresh (6-8d)</text>
          <rect x="18" y="230" width="8" height="8" fill="#5b6673"/><text x="30" y="237">Going cold (9d+)</text>
          <rect x="90" y="230" width="8" height="8" fill="#20262e"/><text x="102" y="237">No data yet</text>
        </g>
      </svg>
    </div>
    ${stale.length ? `<div class="mm-callout">⚠ GOING COLD: ${stale.map(p => p.toUpperCase()).join(" · ")} — ${ds[stale[0]]}+ days. Build them into this week.</div>` : ""}
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
  tag("#todaySessions", "summary");
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
      if(sub === "calendar"){ go("plan"); return; }
      if(sub === "saved"){
        go("plan");
        setTimeout(() => {
          const lib = document.getElementById("workoutLibCard");
          if(lib) lib.scrollIntoView({ behavior:"smooth", block:"start" });
        }, 200);
        return;
      }
      _fitSub = sub;
      applyFitSub();
    });
  });
  // Nutrition chips: toggle sub-sections; Calendar opens the full
  // nutrition history overlay (Day/Week/Month/90D/Year)
  const NUT_SECTIONS = {
    diary:     ["#diaryCard", "#usualsRow"],
    calories:  ["#calSubCard"],
    nutrients: ["#nutSummaryCard", "#detailCard"],
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
  drawSectionRing("fitRing", (a.exercise || 0) / Math.max(1, g.exercise), "#2ee6c8");
}
function renderNutRing(){
  const t = totalsFor(currentDate);
  drawSectionRing("nutRing", t.cal / Math.max(1, state.goals.cal || 2200), "#f5c542");
}
function renderBodyRing(){
  const wts = state.weights || [];
  const goal = (state.goals || {}).weight;
  if(!wts.length || !goal){ drawSectionRing("bodyRing", 0, "#7ec8f5"); return; }
  const start = wts[0].val, cur = wts[wts.length-1].val;
  const total = Math.abs(start - goal);
  const done = Math.abs(start - cur);
  const movingRightWay = (start > goal && cur <= start) || (start < goal && cur >= start);
  drawSectionRing("bodyRing", total < 0.1 ? 1 : (movingRightWay ? done/total : 0), "#7ec8f5");
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
      datasets: [{ data: vols, backgroundColor: vols.map(v => v > 0 ? "#2ee6c8" : "#20262e"), borderRadius: 2 }],
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
  const g = state.goals || {};
  const rows = [
    ["Calories", Math.round(cal), g.cal || 2200, ""],
    ["Protein", Math.round(p), g.protein || 0, "g"],
    ["Carbohydrates", Math.round(c), g.carbs || 0, "g"],
    ["Fiber", Math.round(fiber), g.fiber || 25, "g"],
    ["Sugar", Math.round(sugar), g.sugar || 50, "g"],
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
  const g = state.goals || {};
  const water = (state.days[currentDate]||{}).water || 0;
  el.innerHTML = `
    <span><i style="color:#f5c542">Cal</i> <b>${Math.round(t.cal)}</b>/${g.cal||0}</span>
    <span><i style="color:#7ec8f5">P</i> <b>${Math.round(t.p)}</b>/${g.protein||0}</span>
    <span><i style="color:#2ee6c8">C</i> <b>${Math.round(t.c)}</b>/${g.carbs||0}</span>
    <span><i style="color:#ff5c8a">F</i> <b>${Math.round(t.f)}</b>/${g.fat||0}</span>
    <span><i style="color:#7ec8f5">💧</i> <b>${Math.round(water)}</b>/${g.water||64}</span>`;
}
function renderFitTopStats(){
  const el = document.getElementById("fitTopStats");
  if(!el) return;
  const a = getActivityForDay(currentDate);
  const g = getActivityGoals();
  const lifted = _liftedLbFor(currentDate);
  el.innerHTML = `
    <span><i style="color:#ff5c8a">Move</i> <b>${Math.round(a.move)}</b>/${g.move}</span>
    <span><i style="color:#2ee6c8">Ex</i> <b>${Math.round(a.exercise)}</b>/${g.exercise}m</span>
    <span><i style="color:#7ec8f5">Stand</i> <b>${Math.round(a.stand)}</b>/${g.stand}h</span>
    <span><i style="color:#8b95a1">Lifted</i> <b>${Math.round(lifted).toLocaleString()}</b> ${unit()}</span>`;
}
function renderBodyTopStats(){
  const el = document.getElementById("bodyTopStats");
  if(!el) return;
  const wts = state.weights || [];
  const last = wts.length ? wts[wts.length-1] : null;
  const goal = (state.goals||{}).weight;
  el.innerHTML = last
    ? `<span><i style="color:#7ec8f5">Now</i> <b>${last.val}</b> ${unit()}</span>
       <span><i style="color:#2ee6c8">Goal</i> <b>${goal || "—"}</b>${goal ? " "+unit() : ""}</span>
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
  const g = state.goals || {};
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
  const g = state.goals || {};
  const calFrom = { c: t.c*4, f: t.f*9, p: t.p*4 };
  const totalMacroCal = calFrom.c + calFrom.f + calFrom.p;
  const goalCal = { c:(g.carbs||0)*4, f:(g.fat||0)*9, p:(g.protein||0)*4 };
  const goalTotal = goalCal.c + goalCal.f + goalCal.p || 1;
  const COLORS = { c:"#2ee6c8", f:"#b18cff", p:"#f5c542" };
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
    const workouts = [{ name:p.type, time:p.time, exercises:p.exercises || [] }].concat(p.extra || []);
    card.innerHTML = head + workouts.map((w, wi) => `
      <div class="fd-workout">
        <div class="fd-w-head">
          <b>${escape(w.name)}</b>
          ${w.time ? `<em>${escape(fmtTime12(w.time))}</em>` : ""}
          <button class="fd-heart" data-fdw="${wi}" title="Save to My Workouts">♥</button>
        </div>
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
  try{ renderMuscleMap(); }catch(e){ console.warn("muscle map", e); }
  try{ renderFitProgress(); }catch(e){ console.warn("fit progress", e); }
  try{ renderFitRing(); }catch(e){ console.warn("fit ring", e); }
  try{ renderFitTopStats(); }catch(e){ console.warn("fit top", e); }
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

function renderPlan(){
  renderPlanBase();
  renderPlanStep_RenderPlan();
  renderPlanStep_RenderPlanForWorkoutBtn();
  try{ renderWorkoutLib(); }catch(e){ console.warn("workout lib", e); }
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
  goStep_GoForPlan(tab);
}

function renderTrends(){
  renderTrendsBase();
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

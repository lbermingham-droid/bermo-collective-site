/* BERMO TRACKER — application logic */
(function(){
"use strict";

const DATA = window.BERMO_DATA;
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

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
}
function showGate(){
  $("#gate").classList.remove("hidden");
  $("#app").classList.add("hidden");
  $("#gateForm").addEventListener("submit", onGateSubmit);
}
function onGateSubmit(e){
  e.preventDefault();
  state.profile.name = $("#gateName").value.trim() || "Athlete";
  state.profile.units = $("#gateUnits").value;
  state.goals.cal = parseInt($("#gateCal").value, 10) || 2200;
  // proportional macro defaults: 30/40/30
  state.goals.protein = Math.round(state.goals.cal * 0.30 / 4);
  state.goals.carbs   = Math.round(state.goals.cal * 0.40 / 4);
  state.goals.fat     = Math.round(state.goals.cal * 0.30 / 9);
  state.profile.onboarded = true;
  save();
  enterApp();
}
function enterApp(){
  $("#gate").classList.add("hidden");
  $("#app").classList.remove("hidden");
  renderAll();
}

// ---------- TABS ----------
function go(tab){
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
  $("#nutDateInput").addEventListener("change", (e) => { currentDate = e.target.value; renderAll(); });
  $("#nutPrev").addEventListener("click", () => shiftDate(-1));
  $("#nutNext").addEventListener("click", () => shiftDate(1));

  // Water
  $$("#view-dashboard [data-water]").forEach(b => b.addEventListener("click", () => addWater(parseInt(b.dataset.water,10))));
  $("#waterReset").addEventListener("click", () => { dayObj(currentDate).water = 0; save(); renderAll(); });

  // Meal add buttons
  $$(".btn-add[data-add-meal]").forEach(b => b.addEventListener("click", () => openFoodModal(b.dataset.addMeal)));

  // Quick chips
  $("#dashCopyYesterday").addEventListener("click", copyYesterday);

  // WOD shuffle
  $("#wodShuffle").addEventListener("click", shuffleWod);
  $("#fitShuffle").addEventListener("click", shuffleWod);
  $("#fitWodPicker").addEventListener("change", (e) => { dayObj(currentDate).wodId = parseInt(e.target.value,10); save(); renderAll(); });

  // Fitness logging
  $("#fitNewLift").addEventListener("click", openLiftModal);
  $("#fitNewWod").addEventListener("click", openWodResultModal);
  $("#fitLogResult").addEventListener("click", openWodResultModal);
  $("#addPrBtn").addEventListener("click", openPrModal);

  // Body
  $("#weighInBtn").addEventListener("click", openWeighInModal);
  $("#measureBtn").addEventListener("click", openMeasureModal);

  // History filter
  $("#historyFilter").addEventListener("change", renderHistory);
  $("#exportBtn").addEventListener("click", exportData);

  // Settings forms
  $("#profileForm").addEventListener("submit", saveProfile);
  $("#goalsForm").addEventListener("submit", saveGoals);
  $("#customFoodForm").addEventListener("submit", addCustomFood);
  $("#logoutBtn").addEventListener("click", logout);
  $("#resetBtn").addEventListener("click", resetAll);

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
function openFoodModal(meal){
  const allFoods = [...DATA.foodDB, ...state.customFoods];
  openModal(`Add to ${capitalize(meal)}`, `
    <input type="search" id="foodSearch" class="search-input" placeholder="Search foods…" autocomplete="off">
    <ul class="search-results" id="searchResults"></ul>
  `, () => {
    const input = $("#foodSearch");
    const list = $("#searchResults");
    const render = (q="") => {
      const f = allFoods.filter(x => x.name.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
      list.innerHTML = f.map(x => `
        <li class="search-result" data-id="${x.id}">
          <div>
            <div class="sr-name">${escape(x.name)}</div>
            <div class="sr-meta">${escape(x.serving||"")} · P${x.p} C${x.c} F${x.f}</div>
          </div>
          <div class="sr-cal">${x.cal} kcal</div>
        </li>
      `).join("") || `<li style="padding:14px;color:#bbb;font-style:italic">No matches.</li>`;
      list.querySelectorAll(".search-result").forEach(li => {
        li.addEventListener("click", () => {
          const food = allFoods.find(x => x.id === li.dataset.id);
          dayObj(currentDate).meals[meal].push({
            id: uid(), name:food.name, serving:food.serving,
            cal:food.cal, p:food.p, c:food.c, f:food.f
          });
          save(); closeModal(); renderAll();
          toast(`Added ${food.name}`, "cyan");
        });
      });
    };
    render();
    input.addEventListener("input", () => render(input.value));
    input.focus();
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
window.BERMO_TRACKER = { go, removeMealItem };

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
}

// ---------- DASHBOARD ----------
let calRingChart, weeklyChart, weightChart, fitnessHeatChartRef = null;
function renderDashboard(){
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
        backgroundColor: over > 0 ? ["#ff2d7a","#0a0a0a"] : ["#c8f500","#f0efe9"],
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
function renderNutrition(){
  $("#nutDate").textContent = fmtMed(currentDate);
  $("#nutDateInput").value = currentDate;

  const t = totalsFor(currentDate);
  const g = state.goals;
  $("#nutCal").textContent = t.cal;
  $("#nutCalGoal").textContent = "/ " + g.cal;
  $("#nutP").textContent = t.p + "g";   $("#nutPGoal").textContent = "/ " + g.protein + "g";
  $("#nutC").textContent = t.c + "g";   $("#nutCGoal").textContent = "/ " + g.carbs + "g";
  $("#nutF").textContent = t.f + "g";   $("#nutFGoal").textContent = "/ " + g.fat + "g";
  $("#nutRem").textContent = Math.max(0, g.cal - t.cal);

  const day = dayObj(currentDate);
  ["breakfast","lunch","dinner","snacks"].forEach(meal => {
    const list = $(`.meal-list[data-list="${meal}"]`);
    let mealCal = 0;
    list.innerHTML = day.meals[meal].map(it => {
      mealCal += it.cal;
      return `<li class="meal-item">
        <div>
          <div class="mi-name">${escape(it.name)}</div>
          <div class="mi-meta">${escape(it.serving||"")} · P${Math.round(it.p)} C${Math.round(it.c)} F${Math.round(it.f)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span class="mi-cal">${Math.round(it.cal)} kcal</span>
          <button class="mi-del" data-meal="${meal}" data-id="${it.id}" aria-label="Remove">×</button>
        </div>
      </li>`;
    }).join("");
    $(`.meal-cal[data-cal="${meal}"]`).textContent = Math.round(mealCal) + " cal";
    list.querySelectorAll(".mi-del").forEach(b => b.addEventListener("click", () => removeMealItem(b.dataset.meal, b.dataset.id)));
  });

  // quick chips
  const chips = $("#quickChips");
  const allFoods = [...DATA.foodDB, ...state.customFoods];
  chips.innerHTML = DATA.quickFoods.map(name => {
    const f = allFoods.find(x => x.name === name);
    if(!f) return "";
    return `<button class="qchip" data-id="${f.id}">${escape(f.name)} <i>${f.cal}kcal</i></button>`;
  }).join("");
  chips.querySelectorAll(".qchip").forEach(b => b.addEventListener("click", () => {
    const f = allFoods.find(x => x.id === b.dataset.id);
    dayObj(currentDate).meals.snacks.push({ id: uid(), ...f });
    save(); renderAll();
    toast(`Added ${f.name}`, "cyan");
  }));
}

// ---------- FITNESS VIEW ----------
function renderFitness(){
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

  // PR cards — SugarWOD-style per-lift rep-range board
  $("#prList").outerHTML = `<div id="prList" class="pr-cards">${renderPrCards()}</div>`;

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
  $("#todaySessionsMeta").textContent = (day.sessions||[]).length + " entries";

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
function renderBody(){
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
function renderSettings(){
  $("#setName").value = state.profile.name;
  $("#setUnits").value = state.profile.units;
  $("#setCal").value = state.goals.cal;
  $("#setP").value = state.goals.protein;
  $("#setC").value = state.goals.carbs;
  $("#setF").value = state.goals.fat;
  $("#setWater").value = state.goals.water;
  $("#setGoalWeight").value = state.goals.weight || "";

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
document.addEventListener("DOMContentLoaded", init);


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

function importHealthCSV(text){
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
document.addEventListener("DOMContentLoaded", () => {
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
function getActivityForDay(key){
  const day = dayObj(key);
  if(!day.activity) day.activity = { move:0, exercise:0, stand:0 };
  return day.activity;
}
function getActivityGoals(){
  if(!state.activityGoals) state.activityGoals = { move:800, exercise:60, stand:16 };
  return state.activityGoals;
}

function drawActivityRings(){
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
  openModal("Log activity for " + fmtDate(currentDate), `
    <p style="font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;font-weight:700;margin:0">From your Apple Watch summary, etc.</p>
    <div class="form-grid">
      <label><span>Move (cal burned)</span><input id="actMove" type="number" min="0" max="5000" value="${a.move||""}" placeholder="0"></label>
      <label><span>Exercise (min)</span><input id="actEx" type="number" min="0" max="600" value="${a.exercise||""}" placeholder="0"></label>
      <label><span>Stand (hrs)</span><input id="actSt" type="number" min="0" max="24" value="${a.stand||""}" placeholder="0"></label>
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
      <button class="btn btn-cyan" id="actSave">Save</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("actSave").addEventListener("click", () => {
      const day = dayObj(currentDate);
      day.activity = {
        move: parseFloat(document.getElementById("actMove").value) || 0,
        exercise: parseFloat(document.getElementById("actEx").value) || 0,
        stand: parseFloat(document.getElementById("actSt").value) || 0,
      };
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
const _origRenderDashboard = typeof renderDashboard === "function" ? renderDashboard : null;
if(_origRenderDashboard){
  renderDashboard = function(){
    _origRenderDashboard();
    drawActivityRings();
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const a = document.getElementById("logActivityBtn");
  if(a) a.addEventListener("click", openActivityLogModal);
  const m = document.getElementById("macroCalcBtn");
  if(m) m.addEventListener("click", openMacroCalcModal);
});

// Also import Active Energy + Apple Exercise Time from Health CSV if present
const _origImportHealthCSV = typeof importHealthCSV === "function" ? importHealthCSV : null;
if(_origImportHealthCSV){
  importHealthCSV = function(text){
    const result = _origImportHealthCSV(text);
    // Re-parse to pick up activity columns
    const lines = text.split(/\r?\n/).filter(l=>l.trim());
    if(lines.length < 2) return result;
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,"").toLowerCase());
    const findCol = (...n) => { for(let i=0;i<headers.length;i++) if(n.some(x => headers[i].includes(x))) return i; return -1; };
    const dateIdx = findCol("date","start","time");
    const moveIdx = findCol("active energy","activeenergy","active_energy");
    const exIdx   = findCol("apple exercise time","exercise time","exercisetime");
    const standIdx= findCol("apple stand hours","stand hours","standhours");
    if(dateIdx === -1) return result;
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
    return result;
  };
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
function classifyFood(item){
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
    grid.innerHTML = `<div class="usuals-empty">No usuals saved yet. Use the <b>★ Save as usual</b> button on any meal block to save it.</div>`;
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

  // Mark items in meal lists by macro-based tier (indulgent / watch / clean)
  const day = dayObj(currentDate);
  ["breakfast","lunch","dinner","snacks"].forEach(meal => {
    const lis = document.querySelectorAll(`.meal-list[data-list="${meal}"] .meal-item`);
    (day.meals[meal] || []).forEach((item, i) => {
      const li = lis[i];
      if(!li) return;
      li.classList.remove("cheat","watch","clean");
      const { tier, reason } = classifyFood(item);
      li.classList.add(tier);
      li.title = reason;
    });
  });
}

// =================================================================
// HOOKS — extend existing renders without rewriting them
// =================================================================
const _origRenderNutritionForFlags = (typeof renderNutrition === "function") ? renderNutrition : null;
if(_origRenderNutritionForFlags){
  renderNutrition = function(){
    _origRenderNutritionForFlags();
    renderUsuals();
    addSaveAsUsualButtons();
    applyRedFlags();
  };
}
const _origRenderDashboardForFlags = (typeof renderDashboard === "function") ? renderDashboard : null;
if(_origRenderDashboardForFlags){
  renderDashboard = function(){
    _origRenderDashboardForFlags();
    applyRedFlags();
  };
}

function addSaveAsUsualButtons(){
  // Each meal-head gets a "★ Save as usual" button (idempotent)
  document.querySelectorAll(".meal-head").forEach(head => {
    if(head.querySelector(".save-usual")) return;
    const meal = head.parentElement.dataset.meal;
    if(!meal) return;
    const btn = document.createElement("button");
    btn.className = "save-usual";
    btn.type = "button";
    btn.textContent = "★ Save as usual";
    btn.title = "Save this meal as a one-tap template";
    btn.addEventListener("click", () => saveMealAsTemplate(meal));
    head.appendChild(btn);
  });
}

// Mark cheat foods in their data attribute when rendering meal items
const _origRender = renderNutrition;


// =================================================================
// APP-LIKE TOPBAR — settings gear + user menu
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
  const sg = document.getElementById("tbSettingsBtn");
  if(sg) sg.addEventListener("click", () => {
    document.querySelectorAll(".tab,.mtab").forEach(t => t.classList.toggle("active", t.dataset.tab === "settings"));
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-settings"));
    if(typeof renderAll === "function"){
      // currentTab is inside the IIFE; trigger via simulated tab click instead
      const ev = new Event("click");
      // Find any settings-tab element and click it to keep state in sync
      const t = document.querySelector('.tab[data-tab="settings"], .mtab[data-tab="settings"]');
      if(t) t.click();
    }
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
        const t = document.querySelector(`.tab[data-tab="${tab}"], .mtab[data-tab="${tab}"]`);
        if(t) t.click();
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
const _origRenderNutritionForDetail = (typeof renderNutrition === "function") ? renderNutrition : null;
if(_origRenderNutritionForDetail){
  renderNutrition = function(){
    _origRenderNutritionForDetail();
    renderDetail();
  };
}

// Extend custom food form to read fiber + sugar inputs
document.addEventListener("DOMContentLoaded", () => {
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
const _origClassify = (typeof classifyFood === "function") ? classifyFood : null;
if(_origClassify){
  classifyFood = function(item){
    const base = _origClassify(item);
    if(item.sugar != null && item.sugar >= 15)
      return { tier:"indulgent", reason:`high sugar — ${item.sugar}g per serving` };
    if(item.sugar != null && item.sugar >= 8 && base.tier === "clean")
      return { tier:"watch", reason:`moderate sugar — ${item.sugar}g per serving` };
    return base;
  };
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
        ["menstrual","🌑","#ff2d7a","1-5"],
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

function renderTrends(){
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
const _origGoForTrends = (typeof go === "function") ? go : null;
if(_origGoForTrends){
  go = function(tab){
    _origGoForTrends(tab);
    if(tab === "trends") renderTrends();
  };
}

// Wire buttons
document.addEventListener("DOMContentLoaded", () => {
  const c = document.getElementById("trCheckinBtn");
  if(c) c.addEventListener("click", openCheckinModal);
  const r = document.getElementById("trRefreshBtn");
  if(r) r.addEventListener("click", renderTrends);
  const p = document.getElementById("trCyclePeriod");
  if(p) p.addEventListener("click", logPeriodStart);
});

// Expand Apple Health CSV to also import Sleep Analysis hours
const _origImportForSleep = (typeof importHealthCSV === "function") ? importHealthCSV : null;
if(_origImportForSleep){
  importHealthCSV = function(text){
    const result = _origImportForSleep(text);
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if(lines.length < 2) return result;
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,"").toLowerCase());
    const findCol = (...n) => { for(let i=0;i<headers.length;i++) if(n.some(x => headers[i].includes(x))) return i; return -1; };
    const dateIdx = findCol("date","start","time");
    const sleepIdx = findCol("sleep analysis","sleep hours","asleep","sleep time");
    if(dateIdx === -1 || sleepIdx === -1) return result;
    let added = 0;
    for(let i=1; i<lines.length; i++){
      const cells = parseCsvLine(lines[i]);
      const date = parseDate((cells[dateIdx]||"").trim());
      if(!date) continue;
      let hrs = parseFloat(cells[sleepIdx]);
      if(isNaN(hrs) || hrs <= 0) continue;
      // If value looks like minutes (>15), convert
      if(hrs > 15) hrs = hrs / 60;
      const day = dayObj(date);
      if(!day.checkin) day.checkin = {};
      day.checkin.sleep = Math.round(hrs * 4) / 4; // round to 0.25h
      added++;
    }
    if(added) result.sleep = added;
    return result;
  };
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
function renderSmartBanners(){
  const wrap = document.getElementById("smartBanners");
  if(!wrap) return;
  const banners = [];
  const today = todayKey();
  const todayLogged = totalsFor(today).cal > 0 || (state.days[today] && state.days[today].sessions || []).length > 0;

  // Missed log streak
  let missed = 0;
  const d = new Date();
  while(true){
    const k = todayKey(d);
    const has = totalsFor(k).cal > 0 || (state.days[k] && (state.days[k].sessions||[]).length > 0);
    if(has) break;
    missed++;
    d.setDate(d.getDate()-1);
    if(missed > 14) break;
  }
  if(missed === 1){
    banners.push({ tier:"watch", icon:"📅", text:"You haven't logged today yet. Small log keeps the streak alive." });
  } else if(missed >= 2 && missed < 14){
    banners.push({ tier:"alert", icon:"⚠️", text:`${missed} days without a log. Tap a "My Usual" or quick add to restart.` });
  }

  // Over-calorie alert (today specifically)
  const t = totalsFor(today);
  if(t.cal > state.goals.cal){
    banners.push({ tier:"alert", icon:"🔴", text:`Over by ${t.cal - state.goals.cal} kcal today. Tomorrow is the reset.` });
  } else if(t.cal > state.goals.cal * 0.9){
    banners.push({ tier:"warn", icon:"⚠️", text:`Within ${state.goals.cal - t.cal} kcal of today's goal — careful with the rest of the day.` });
  }

  // Streak win
  const streak = (function(){
    let n = 0; const c = new Date();
    while(true){
      const k = todayKey(c);
      const has = totalsFor(k).cal > 0 || (state.days[k] && (state.days[k].sessions||[]).length > 0);
      if(!has) break;
      n++; c.setDate(c.getDate()-1);
      if(n > 365) break;
    }
    return n;
  })();
  if(streak >= 7 && todayLogged){
    banners.push({ tier:"good", icon:"🔥", text:`${streak}-day logging streak. Consistency is the variable that actually matters.` });
  }

  wrap.innerHTML = banners.map(b => `<div class="sbanner sbanner-${b.tier}"><span class="sb-icon">${b.icon}</span>${escape(b.text)}</div>`).join("");
}

// ---------- Hooks ----------
const _origRenderTrendsForSym = (typeof renderTrends === "function") ? renderTrends : null;
if(_origRenderTrendsForSym){
  renderTrends = function(){
    _origRenderTrendsForSym();
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
  };
}
const _origRenderDashForSb = (typeof renderDashboard === "function") ? renderDashboard : null;
if(_origRenderDashForSb){
  renderDashboard = function(){
    _origRenderDashForSb();
    renderSmartBanners();
  };
}

document.addEventListener("DOMContentLoaded", () => {
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

document.addEventListener("DOMContentLoaded", () => {
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
  // Hook into renderSettings to refresh
  const _origRS = (typeof renderSettings === "function") ? renderSettings : null;
  if(_origRS){
    renderSettings = function(){ _origRS(); renderAISetup(); };
  }

  // Wire AI buttons on Nutrition tab
  const photo = document.getElementById("aiPhotoBtn");
  if(photo) photo.addEventListener("click", openAIPhotoModal);
  const text = document.getElementById("aiTextBtn");
  if(text) text.addEventListener("click", openAITextModal);
});

// ---- API caller ----
async function aiRequest(prompt, imageBase64){
  const ai = getAI();
  if(!ai.key) throw new Error("No AI key — set up in Settings first");
  if(ai.provider === "openai") return openaiCall(prompt, imageBase64, ai.key);
  return claudeCall(prompt, imageBase64, ai.key);
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

// ---- Photo modal ----
function openAIPhotoModal(){
  if(!getAI().key){
    toast("Set up your AI key in Settings first","pink");
    setTimeout(() => {
      const t = document.querySelector('.tab[data-tab="settings"], .mtab[data-tab="settings"]');
      if(t) t.click();
    }, 600);
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
    toast("Set up your AI key in Settings first","pink");
    setTimeout(() => {
      const t = document.querySelector('.tab[data-tab="settings"], .mtab[data-tab="settings"]');
      if(t) t.click();
    }, 600);
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

document.addEventListener("DOMContentLoaded", () => {
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
          // Open food modal for default meal (lunch by time of day)
          setTimeout(() => {
            const h = new Date().getHours();
            const meal = h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 18 ? "snacks" : "dinner";
            const btn = document.querySelector(`.btn-add[data-add-meal="${meal}"]`);
            if(btn) btn.click();
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

  // First-time help banner
  const seen = localStorage.getItem("bermo.tracker.helpSeen");
  if(!seen){
    const banner = document.getElementById("helpBanner");
    if(banner){
      // Show after gate dismissed
      const tryShow = () => {
        if(!document.getElementById("app").classList.contains("hidden")){
          banner.classList.remove("hidden");
        } else {
          setTimeout(tryShow, 500);
        }
      };
      tryShow();
    }
  }
  const helpClose = document.getElementById("helpClose");
  if(helpClose) helpClose.addEventListener("click", () => {
    document.getElementById("helpBanner").classList.add("hidden");
    localStorage.setItem("bermo.tracker.helpSeen", "1");
  });

  // Escape closes FAB
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeFAB(); });
});

// Hint markers on initial views (subtle)
function addHints(){
  // Add a subtle "← log here" hint to the breakfast meal block first-time
  const seen = localStorage.getItem("bermo.tracker.mealHintSeen");
  if(seen) return;
  const firstAdd = document.querySelector('.btn-add[data-add-meal="breakfast"]');
  if(firstAdd && !firstAdd.dataset.hinted){
    firstAdd.dataset.hinted = "1";
    firstAdd.style.boxShadow = "0 0 0 4px rgba(0,245,212,.4)";
    firstAdd.style.animation = "pulseAdd 1.5s ease-in-out 3";
  }
}

// Hook into dashboard render to mark hints
const _origRDForHints = (typeof renderDashboard === "function") ? renderDashboard : null;
if(_origRDForHints){
  renderDashboard = function(){
    _origRDForHints();
    setTimeout(addHints, 50);
  };
}


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

function openLiftDetail(lift){
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
const _origRenderFitness = (typeof renderFitness === "function") ? renderFitness : null;
if(_origRenderFitness){
  renderFitness = function(){
    _origRenderFitness();
    renderLiftsList();
  };
}

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
  // Monday-start
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

let planViewDate = new Date();

function renderPlan(){
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

  const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  let html = "";
  for(let i=0;i<7;i++){
    const date = new Date(wkStart.getTime() + i*86400000);
    const dayKey = todayKey(date);
    const planType = (weekData[dayNames[i].toLowerCase()] || {}).type || null;
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
        ? `<div class="pd-type ${typeColor(planType)}">${escape(planType)}</div>`
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

function openPlanDayModal(wkKey, dayName){
  const plan = getPlan();
  if(!plan[wkKey]) plan[wkKey] = {};
  const cur = plan[wkKey][dayName] || {};
  const opts = WORKOUT_TYPES.map(t => `<option value="${escape(t)}" ${t===cur.type?"selected":""}>${escape(t)}</option>`).join("");
  openModal(`Plan ${dayName.charAt(0).toUpperCase()+dayName.slice(1)}`, `
    <label><span>Workout type</span>
      <select id="planType">${opts}</select>
    </label>
    <label><span>Or custom</span><input id="planCustom" type="text" placeholder="(leave blank to use selected above)" maxlength="40"></label>
    <label><span>Notes</span><input id="planNotes" type="text" maxlength="120" value="${escape(cur.notes||"")}" placeholder="Specific exercises, sets, etc."></label>
    <div class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancel</button>
      ${cur.type ? `<button class="btn btn-pink" id="planClear">Clear</button>` : ""}
      <button class="btn btn-cyan" id="planSave">Save</button>
    </div>
  `, (root) => {
    root.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeModal));
    document.getElementById("planSave").addEventListener("click", () => {
      const custom = document.getElementById("planCustom").value.trim();
      const type = custom || document.getElementById("planType").value;
      const notes = document.getElementById("planNotes").value.trim();
      plan[wkKey][dayName] = { type, notes: notes||undefined };
      save(); closeModal(); renderPlan();
      toast(`Planned: ${type}`,"cyan");
    });
    const clear = document.getElementById("planClear");
    if(clear) clear.addEventListener("click", () => {
      delete plan[wkKey][dayName];
      save(); closeModal(); renderPlan();
    });
  });
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
  ["mon","tue","wed","thu","fri","sat","sun"].forEach(d => {
    if(prev[d] && !plan[wkKey_][d]){
      plan[wkKey_][d] = { ...prev[d] };
      copied++;
    }
  });
  save(); renderPlan();
  toast(copied ? `Copied ${copied} day${copied===1?"":"s"} from last week` : "No empty days to fill","cyan");
}

// Hook tab routing
const _origGoForPlan = (typeof go === "function") ? go : null;
if(_origGoForPlan){
  go = function(tab){
    _origGoForPlan(tab);
    if(tab === "plan") renderPlan();
  };
}

// Wire planner buttons
document.addEventListener("DOMContentLoaded", () => {
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

document.addEventListener("DOMContentLoaded", () => {
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
    eyebrow: "Fat", title: "Fat Intake", color: "#ff2d7a", unitLbl: "g",
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
  detailMetric = metric;
  detailScale = "7d";
  document.getElementById("detailOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
  document.querySelectorAll(".ds-btn").forEach(b => b.classList.toggle("on", b.dataset.scale === "7d"));
  renderDetailView();
}
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

function renderDetailView(){
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
document.addEventListener("DOMContentLoaded", () => {
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
function _weekStart(d){ const x = new Date(d); x.setHours(0,0,0,0); const dow = x.getDay(); const diff = dow === 0 ? -6 : 1-dow; x.setDate(x.getDate()+diff); return x; }
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
const _origOpenDetail = openDetail;
openDetail = function(metric){
  detailRefDate = new Date();
  _origOpenDetail(metric);
};

// Update scale-button click handler so it preserves refDate
document.addEventListener("DOMContentLoaded", () => {
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

  // Brand-flavored colors (NOT Apple's exact)
  const rings = [
    { color:"#ff2d7a", track:"#3a0a18", val:a.move,     goal:g.move,     r:78, lw:14 }, // Move (pink)
    { color:"#c8f500", track:"#2a3300", val:a.exercise, goal:g.exercise, r:60, lw:14 }, // Exercise (lime)
    { color:"#00f5d4", track:"#003028", val:a.stand,    goal:g.stand,    r:42, lw:14 }, // Stand (cyan)
    { color:"#ffb347", track:"#3a2b10", val:calVal,     goal:calGoal,    r:24, lw:14 }, // Nutrition (orange)
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
          <div class="rwk-bar rwk-move"><span style="height:${m}%;background:#ff2d7a"></span></div>
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
function renderNutritionHub(){
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

function renderHubsAll(){
  drawActivityRings();
  renderNutritionHub();
  renderFitnessHub();
  renderHealthHub();
  renderTrendsHub();
  renderWeightHub();
}

// Hook into dashboard render
const _origRDForHubs = renderDashboard;
renderDashboard = function(){
  if(_origRDForHubs) _origRDForHubs();
  renderHubsAll();
};

// ---- Hub click + log button wiring ----
document.addEventListener("DOMContentLoaded", () => {
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

})();

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

  // PR list
  const pl = $("#prList");
  const prs = Object.entries(state.prs).sort((a,b)=> (b[1].date||"").localeCompare(a[1].date||""));
  pl.innerHTML = prs.length ? prs.map(([lift, p]) => `
    <li class="pr-row">
      <div>
        <div class="pr-name">${escape(lift)}</div>
        <div class="pr-date">${fmtDate(p.date)}</div>
      </div>
      <div class="pr-val">${p.val}${p.unit||unit()}</div>
    </li>`).join("") : "";

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

})();

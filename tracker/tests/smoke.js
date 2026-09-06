// BERMO Tracker browser smoke test.
// Run from repo root:
//   python3 -m http.server 8901 &          (serve the site)
//   cd <scratch> && npm i playwright       (browsers: use system chromium)
//   node tracker/tests/smoke.js
// In the Claude Code cloud env, launch chromium via
// executablePath /opt/pw-browsers/chromium (see below) — do NOT
// run `npx playwright install`.
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:8901/tracker/";
const results = [];
const consoleErrors = [];
const pageErrors = [];

function ok(name){ results.push(["PASS", name]); }
function fail(name, err){ results.push(["FAIL", name + " — " + String(err).split("\n")[0].slice(0, 140)]); }

(async () => {
  const proxy = process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" }
    : undefined;
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", proxy });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(6000);

  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => pageErrors.push(String(e.stack || e).slice(0, 600)));

  // 1. Load
  try {
    await page.goto(BASE, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(1200);
    ok("page loads");
  } catch (e) { fail("page loads", e); await browser.close(); return print(); }

  // 2. Chart.js loaded? (CDN dependency)
  try {
    const hasChart = await page.evaluate(() => typeof Chart !== "undefined");
    hasChart ? ok("Chart.js CDN loaded") : fail("Chart.js CDN loaded", "Chart undefined");
  } catch (e) { fail("Chart.js check", e); }

  // 3. Wizard onboarding (3 steps)
  try {
    await page.fill("#wizName", "SmokeTest");
    await page.click("#wizNext");            // -> step 2
    await page.waitForTimeout(250);
    await page.click("#wizNext");            // -> step 3 (review)
    await page.waitForTimeout(400);
    await page.click("#wizApply");
    await page.waitForTimeout(900);
    const appVisible = await page.isVisible("#app");
    appVisible ? ok("wizard completes -> app shows") : fail("wizard completes", "#app hidden");
  } catch (e) { fail("wizard completes", e); }

  // 4. Horizontal overflow at 390px
  try {
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    overflow <= 1 ? ok("no horizontal overflow at 390px")
                  : fail("no horizontal overflow at 390px", overflow + "px bleed");
  } catch (e) { fail("overflow check", e); }

  // 5. Navigate every view via whichever tab set is visible on mobile
  const tabSel = (await page.isVisible('.mtab[data-tab="fitness"]')) ? ".mtab" : ".tab";
  const tabs = await page.$$eval(tabSel, els => els.map(e => e.dataset.tab));
  for (const tab of tabs) {
    try {
      await page.click(`${tabSel}[data-tab="${tab}"]`, { timeout: 4000 });
      await page.waitForTimeout(350);
      const active = await page.evaluate(t =>
        !!document.getElementById("view-" + t)?.classList.contains("active"), tab);
      const bleed = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if(!active) fail(`tab '${tab}'`, "view not active after click");
      else if(bleed > 1) fail(`tab '${tab}' overflow`, bleed + "px sideways bleed at 390px");
      else ok(`tab '${tab}' activates its view (no bleed)`);
    } catch (e) {
      // Diagnose what intercepted the click
      const blocker = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return "element missing";
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return "zero-size (hidden)";
        const top = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
        return top === el || el.contains(top) ? "clickable (timing?)" :
          "covered by " + (top ? top.tagName + (top.id ? "#"+top.id : "") + "." + (typeof top.className === "string" ? top.className.split(" ")[0] : "") : "nothing");
      }, `${tabSel}[data-tab="${tab}"]`);
      fail(`tab '${tab}'`, blocker);
    }
  }

  // 6. Food logging end-to-end
  try {
    await page.click(`${tabSel}[data-tab="nutrition"]`).catch(()=>{});
    await page.click(`${tabSel}[data-tab="food"]`).catch(()=>{});
    await page.waitForTimeout(400);
    await page.click('[data-dy-add="breakfast"]', { timeout: 4000 });
    await page.waitForTimeout(500);
    if (!(await page.isVisible("#modal.open"))) fail("food modal opens", "modal not open");
    else {
      await page.fill("#foodSearch", "egg");
      await page.waitForTimeout(350);
      await page.click("#searchResults .lrow", { timeout: 4000 });
      await page.waitForTimeout(500);
      const logged = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem("bermo.tracker.v1"));
        const t = new Date().toISOString().slice(0, 10);
        return !!(s.days[t] && s.days[t].meals.breakfast.length);
      });
      logged ? ok("food logs to breakfast + persists") : fail("food logs", "breakfast empty in state");
    }
  } catch (e) { fail("food logging flow", e); }

  // 7. Modal X closes
  try {
    if (await page.isVisible("#modal.open")) await page.click("#modal .modal-close");
    await page.click('[data-dy-add="lunch"]', { timeout: 4000 });
    await page.waitForTimeout(350);
    await page.click("#modal .modal-close", { timeout: 3000 });
    await page.waitForTimeout(350);
    !(await page.isVisible("#modal.open")) ? ok("modal X closes") : fail("modal X closes", "still open");
  } catch (e) { fail("modal X", e); }

  // 8. Lift logging end-to-end THROUGH THE ONE SCREEN (v39).
  //    day sheet -> Build workout -> pick -> Save -> tap the lift ->
  //    sets -> Save. Sets on a day that already happened must land in
  //    day.sessions, or nothing downstream sees the workout.
  try {
    await page.click(`${tabSel}[data-tab="fitness"]`).catch(()=>{});
    await page.waitForTimeout(400);
    await page.click("#fitWriteOut", { timeout: 6000 });
    await page.waitForTimeout(600);
    await page.click("#dsBuild", { timeout: 6000 });
    await page.waitForTimeout(800);
    await page.fill("#bwSearch", "Back Squat");
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const r = [...document.querySelectorAll("#bwList .bw-row")]
        .find(x => /back squat/i.test(x.querySelector(".mrow-title").textContent));
      if(r) r.click();
    });
    await page.waitForTimeout(300);
    await page.click("#bwSave");
    await page.waitForTimeout(800);
    await page.evaluate(() => { const r = document.querySelector("#dsList .ds-row"); if(r) r.click(); });
    await page.waitForTimeout(700);
    await page.fill(".lset .lset-reps", "5");
    await page.fill(".lset .lset-w", "135");
    await page.click("#lsSave");
    await page.waitForTimeout(700);
    const logged = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("bermo.tracker.v1"));
      const t = new Date().toISOString().slice(0, 10);
      return (s.days[t] && (s.days[t].sessions || []).filter(x => /back squat/i.test(x.name || ""))) || [];
    });
    await page.evaluate(() => {
      if(typeof closeModal === "function") closeModal();
      document.querySelectorAll("#modal.open,.modal.open").forEach(m => m.classList.remove("open"));
      document.querySelectorAll(".workout-overlay.open").forEach(o => o.classList.remove("open"));
      document.body.style.overflow = "";
    });
    await page.waitForTimeout(300);
    (logged.length === 1 && logged[0].reps === 5 && logged[0].weight === 135)
      ? ok("v39 one screen: build -> sets -> logged + persists")
      : fail("v39 one screen logging", JSON.stringify(logged));
  } catch (e) { fail("v39 one screen logging", e); }

  // 9. Return to dashboard, hubs render
  try {
    await page.click(`${tabSel}[data-tab="dashboard"]`).catch(()=>{});
    await page.click(`${tabSel}[data-tab="home"]`).catch(()=>{});
    await page.waitForTimeout(600);
    // v8 IA: hubs are hidden — dashboard = deck rings + nutrition card + workouts week list
    const dash = await page.evaluate(() => ({
      days: document.querySelectorAll("#hmStrip .hm-day").length,
      rings: document.querySelectorAll(".hm-ringwrap .hm-ring").length === 2,
      water: true,                                   // v42: water moved off Home by spec
      work: document.querySelectorAll("#hmRows .hm-row").length,
      cmp: document.querySelectorAll(".hm-deltas > div").length,   // v43: the vs-last-period row
      brain: document.querySelectorAll(".js-brain").length >= 3,
    }));
    (dash.days === 7 && dash.rings && dash.water && dash.work >= 7 && dash.cmp === 7 && dash.brain)
      ? ok(`dashboard renders (day strip + dual rings + water + ${dash.work}-day list + compare)`)
      : fail("dashboard renders", JSON.stringify(dash));
  } catch (e) { fail("dashboard re-render", e); }

  // 10. Calendars connected: one selected-day state across pages
  try {
    await page.click(`${tabSel}[data-tab="dashboard"]`);
    await page.waitForTimeout(500);
    const tapped = await page.$eval("#hmStrip .hm-day:first-child", el => el.dataset.date);
    await page.click("#hmStrip .hm-day:first-child");
    await page.waitForTimeout(400);
    await page.click(`${tabSel}[data-tab="nutrition"]`);
    await page.waitForTimeout(400);
    const nutDate = await page.$eval("#nutDateInput", el => el.value);
    // now move the date in nutrition and confirm the dashboard follows
    const prev = await page.evaluate(() => {
      const el = document.getElementById("nutPrev");
      el.click();
      return document.getElementById("nutDateInput").value;
    });
    await page.click(`${tabSel}[data-tab="dashboard"]`);
    await page.waitForTimeout(400);
    const deckSel = await page.$eval("#hmStrip .hm-day.sel", el => el.dataset.date).catch(() => null);
    (nutDate === tapped && deckSel === prev)
      ? ok("calendars connected (dashboard day strip <-> nutrition date)")
      : fail("calendars connected", JSON.stringify({ tapped, nutDate, prev, deckSel }));
  } catch (e) { fail("calendars connected", e); }

  // 11. v20 Health engines: sub-muscle gap detection + food quality + big picture.
  //     Seeds a leg day that hits hams/glutes/calves but NEVER quads, plus a
  //     gluten day, and asserts the app names the gap instead of a checkmark.
  try {
    await page.evaluate(() => {
      const KEY = "bermo.tracker.v1";
      const st = JSON.parse(localStorage.getItem(KEY));
      const dk = (o) => { const d = new Date(); d.setDate(d.getDate()-o); return d.toISOString().slice(0,10); };
      for(let i = 0; i < 3; i++){
        const k = dk(i);
        st.days[k] = st.days[k] || { meals:{breakfast:[],lunch:[],dinner:[],snacks:[]}, water:0, sessions:[] };
        st.days[k].sessions = [
          { id:"sm"+i, name:"Hip Thrust",          weight:185, reps:10, sets:4, type:"strength" },
          { id:"sn"+i, name:"Lying Leg Curl",      weight:70,  reps:12, sets:3, type:"strength" },
          { id:"so"+i, name:"Standing Calf Raise", weight:120, reps:15, sets:3, type:"strength" },
        ];
        st.days[k].meals.breakfast = [{ id:"sf"+i, name:"Bagel", serving:"1", cal:280, p:11, c:55, f:2 }];
      }
      localStorage.setItem(KEY, JSON.stringify(st));
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const b = document.querySelector('[data-tab="trends"]'); if(b) b.click(); });
    await page.waitForTimeout(900);
    const health = await page.evaluate(() => {
      const sm = document.getElementById("smList");
      const txt = sm ? sm.innerText.toLowerCase() : "";
      return {
        legs: /legs/.test(txt),
        quadGap: /missing:[^\n]*quads/.test(txt),
        hamHit: /hamstrings/.test(txt),
        fix: /leg extension|front squat/i.test(txt),
        fq: !!document.querySelector("#fqList .fq-bar"),
        bp: !!document.getElementById("bigPicList") && document.getElementById("bigPicList").innerText.length > 20,
      };
    });
    (health.legs && health.quadGap && health.hamHit && health.fix && health.fq && health.bp)
      ? ok("v20 health engines (quad gap named + fix + food quality + big picture)")
      : fail("v20 health engines", JSON.stringify(health));
  } catch (e) { fail("v20 health engines", e); }

  // 12. v21 "why" layer: the reason line on a planned workout feeds Health.
  //     Seeds hungover Sundays that follow wine-and-chips Saturdays and
  //     asserts the app names the reason AND the night before it.
  try {
    await page.evaluate(() => {
      const KEY = "bermo.tracker.v1";
      const st = JSON.parse(localStorage.getItem(KEY));
      const names = ["sun","mon","tue","wed","thu","fri","sat"];
      const wkStart = (d) => { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate()-x.getDay()); return x; };
      const wkKey = (date) => { const d = new Date(date); d.setHours(0,0,0,0);
        d.setDate(d.getDate() + 4 - (d.getDay()||7));
        const y0 = new Date(d.getFullYear(),0,1);
        const w = Math.ceil(((d - y0) / 86400000 + 1)/7);
        return `${d.getFullYear()}-W${String(w).padStart(2,"0")}`; };
      st.plan = st.plan || {};
      for(let i = 1; i <= 42; i++){
        const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
        const k = d.toISOString().slice(0,10);
        const wk = wkKey(wkStart(d));
        st.plan[wk] = st.plan[wk] || {};
        const sun = d.getDay() === 0, sat = d.getDay() === 6;
        st.plan[wk][names[d.getDay()]] = sun
          ? { type:"Cardio", why:"hungover, so cardio" }
          : { type:"Legs" };
        const meals = { breakfast:[{id:"wm"+i,name:"Eggs",serving:"2",cal:180,p:12,c:1,f:14}], lunch:[], dinner:[], snacks:[] };
        if(sat) meals.dinner.push({ id:"ww"+i, name:"Red wine", serving:"3 glasses", cal:375, p:0, c:12, f:0 });
        st.days[k] = { meals, water: sat ? 30 : 80,
          sessions: sun ? [{id:"wc"+i,name:"Treadmill",type:"cardio",durationMin:35}]
                        : [{id:"wl"+i,name:"Back Squat",weight:135,reps:8,sets:4,type:"strength"}],
          checkin: { sleep: sat ? 4.9 : 7.6, energy: sun ? 3 : 8, mood: sun ? 4 : 8 }, symptoms: [] };
      }
      localStorage.setItem(KEY, JSON.stringify(st));
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const b = document.querySelector('[data-tab="trends"]'); if(b) b.click(); });
    await page.waitForTimeout(1000);
    const why = await page.evaluate(() => {
      const el = document.getElementById("whyList");
      const t = el ? el.innerText : "";
      return {
        reason: /hungover/i.test(t),
        sunday: /Sunday/i.test(t),
        night: /night before/i.test(t),
        booze: /alcohol logged/i.test(t),
      };
    });
    (why.reason && why.sunday && why.night && why.booze)
      ? ok("v21 why layer (reason ranked + night-before profile)")
      : fail("v21 why layer", JSON.stringify(why));
  } catch (e) { fail("v21 why layer", e); }

  // 13. v22: health-note parser (no AI), goal designer, micronutrients.
  try {
    const note = await page.evaluate(() => {
      const n = window.__bermo.parseHealthNote("5 hours sleep, bloated all day, ate gluten at lunch, drank wine last night, twisted my knee, smoke from the fires");
      return { sleep:n.sleep, symptoms:n.symptoms, exposures:n.exposures.map(e => e.id) };
    });
    const okNote = note.sleep === 5
      && note.symptoms.includes("Bloating") && note.symptoms.includes("Knee pain")
      && note.exposures.includes("alcohol") && note.exposures.includes("gluten")
      && note.exposures.includes("airquality");
    okNote ? ok("v22 health note parses sleep + symptoms + exposures with no AI")
           : fail("v22 health note", JSON.stringify(note));
  } catch (e) { fail("v22 health note", e); }

  try {
    const plan = await page.evaluate(() => window.__bermo.designGoalPlan({
      weightLb:168, bfPct:31, targetBfPct:24, mode:"lose",
      floorCal:1460, days:4, lifts:true, ratePctPerWk:0.6,
      sex:"f", ageYears:35, heightIn:66,
    }));
    // lean mass held constant => goal weight must exceed a naive guess,
    // protein must come off LEAN mass, and the floor must be respected.
    const okPlan = plan.lean > 110 && plan.lean < 120
      && plan.goalWeight > 150 && plan.goalWeight < 156
      && plan.cal >= 1460
      && plan.protein >= Math.round(plan.lean) && plan.protein <= Math.round(plan.lean * 1.5);
    okPlan ? ok(`v22 goal designer (lean ${plan.lean}, goal ${plan.goalWeight}, eat ${plan.cal}, protein ${plan.protein})`)
           : fail("v22 goal designer", JSON.stringify(plan));
  } catch (e) { fail("v22 goal designer", e); }

  try {
    const floored = await page.evaluate(() => window.__bermo.designGoalPlan({
      weightLb:168, bfPct:31, targetBfPct:24, mode:"lose",
      floorCal:1900, days:4, lifts:true, ratePctPerWk:0.85,
      sex:"f", ageYears:35, heightIn:66,
    }));
    (floored.cal >= 1900 && floored.floored)
      ? ok("v22 calorie floor holds (plan stretches the timeline, not the food)")
      : fail("v22 calorie floor", JSON.stringify({ cal:floored.cal, floored:floored.floored }));
  } catch (e) { fail("v22 calorie floor", e); }

  try {
    await page.click(`${tabSel}[data-tab="nutrition"]`);
    await page.waitForTimeout(500);
    const micro = await page.evaluate(() => {
      const chip = [...document.querySelectorAll(".sub-chip")].find(c => /NUTRIENTS/i.test(c.textContent));
      if(chip) chip.click();
      return !!document.getElementById("microTable");
    });
    micro ? ok("v22 micronutrient card present")
          : fail("v22 micronutrients", "no #microTable");
  } catch (e) { fail("v22 micronutrients", e); }

  // 14. v23: food search must NEVER dead-end. This is the bug she hit —
  //     when OpenFoodFacts failed, the list silently emptied with no
  //     explanation and no way forward. Simulate the outage.
  try {
    await page.click(`${tabSel}[data-tab="nutrition"]`).catch(()=>{});
    await page.waitForTimeout(400);
    // test 13 left the NUTRIENTS sub-tab open — go back to DIARY
    await page.evaluate(() => {
      const c = [...document.querySelectorAll(".sub-chip")].find(x => /DIARY/i.test(x.textContent));
      if(c) c.click();
    });
    await page.waitForTimeout(500);
    await page.click('[data-dy-add="breakfast"]', { timeout: 6000 });
    await page.waitForTimeout(400);
    // the modal opens on Recent for a returning user — switch to Search
    await page.evaluate(() => {
      const t = document.querySelector('.food-tab[data-fmode="search"]');
      if(t) t.click();
    });
    await page.waitForTimeout(300);
    // (a) a food that only exists in the expanded local DB
    await page.fill("#foodSearch", "english muffin");
    await page.waitForTimeout(400);
    const localHit = await page.evaluate(() =>
      [...document.querySelectorAll("#searchResults .lrow-title")].some(e => /english muffin/i.test(e.textContent)));
    // (b) kill the network and confirm we get an actionable error, not a blank list
    await page.route("**/openfoodfacts.org/**", r => r.abort());
    await page.fill("#foodSearch", "zzzznotafood");
    // wait for the request to actually resolve rather than a fixed sleep —
    // under load the spinner was still up when the assertion ran
    await page.waitForFunction(() => {
      const l = document.getElementById("searchResults");
      return l && !l.querySelector(".sr-loading");
    }, { timeout: 15000 }).catch(()=>{});
    await page.waitForTimeout(200);
    const state14 = await page.evaluate(() => {
      const l = document.getElementById("searchResults");
      return {
        empty: !l || l.children.length === 0,
        actionable: !!(l && l.querySelector("[data-create], [data-retry]")),
        text: l ? l.innerText.slice(0, 80) : "",
      };
    });
    await page.unroute("**/openfoodfacts.org/**");
    (localHit && !state14.empty && state14.actionable)
      ? ok("v23 food search never dead-ends (local hit + actionable offline state)")
      : fail("v23 food search", JSON.stringify({ localHit, ...state14 }));
  } catch (e) { fail("v23 food search", e); }

  // 15. v23: one nav component — every tab strip resolves to the same styling.
  try {
    const consistent = await page.evaluate(() => {
      const sel = [".food-tab", ".sub-chip", ".sm-tab", ".meal-slot"];
      const radii = new Set();
      sel.forEach(s2 => {
        const el = document.querySelector(s2);
        if(el) radii.add(getComputedStyle(el).borderRadius);
      });
      return { radii:[...radii], count:radii.size };
    });
    consistent.count <= 1
      ? ok("v23 nav components render identically across the app")
      : fail("v23 nav consistency", JSON.stringify(consistent));
  } catch (e) { fail("v23 nav consistency", e); }

  // 16. v24: surface + flow. Three defects that made it look homemade:
  //     a view-level background slab (the "box" at the edges and bottom),
  //     zero elevation, and a different header layout on every page.
  try {
    const surfaces = await page.evaluate(() => {
      const out = { slabs:[], flat:0, headers:[] };
      const ground = getComputedStyle(document.body).backgroundColor;
      document.querySelectorAll(".view").forEach(v => {
        const bg = getComputedStyle(v).backgroundColor;
        if(bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && bg !== ground) out.slabs.push(v.id + ":" + bg);
      });
      const c = document.querySelector(".view.active .card");
      if(c && getComputedStyle(c).boxShadow === "none") out.flat++;
      return out;
    });
    (surfaces.slabs.length === 0 && surfaces.flat === 0)
      ? ok("v24 one ground, no view slab, cards are elevated")
      : fail("v24 surfaces", JSON.stringify(surfaces));
  } catch (e) { fail("v24 surfaces", e); }

  try {
    const heads = [];
    for(const tab of ["fitness","nutrition","body","trends"]){
      await page.click(`${tabSel}[data-tab="${tab}"]`).catch(()=>{});
      await page.waitForTimeout(350);
      const h = await page.evaluate(() => {
        const v = document.querySelector(".view.active");
        const t = v && v.querySelector(".view-h1");
        if(!t) return null;
        const r = t.getBoundingClientRect();
        return {
          align: getComputedStyle(t).textAlign,
          left: Math.round(r.left),
          overflows: r.right > window.innerWidth + 1,
        };
      });
      heads.push(h);
    }
    const good = heads.every(h => h && h.align === "left" && !h.overflows)
      && new Set(heads.map(h => h.left)).size === 1;
    good ? ok("v24 every page header aligns and fits identically")
         : fail("v24 header flow", JSON.stringify(heads));
  } catch (e) { fail("v24 header flow", e); }

  // 17. save() must survive a full disk. A bare setItem threw, lost the
  //     write, and unwound whatever render was in flight.
  try {
    const res = await page.evaluate(() => {
      const real = Storage.prototype.setItem;
      let threw = false;
      Storage.prototype.setItem = function(){ const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
      try { window.__bermo.save(); } catch(e){ threw = true; }
      Storage.prototype.setItem = real;
      return { threw, alive: !!document.querySelector(".view.active") };
    });
    (!res.threw && res.alive)
      ? ok("v25 save() survives a full storage quota without throwing")
      : fail("v25 quota safety", JSON.stringify(res));
  } catch (e) { fail("v25 quota safety", e); }

  // 18. v26: spacing + sizing consistency. Her words: "this gapping in
  //     between is too much", "so much space on the left", "make sure
  //     boxes next to each other are all the same size".
  try {
    // an earlier test leaves the food modal open, which blocks tab clicks
    await page.evaluate(() => { if(typeof closeModal === "function") closeModal();
      document.querySelectorAll("#modal.open, .modal.open").forEach(m => m.classList.remove("open")); });
    await page.waitForTimeout(250);
    await page.evaluate(() => { const b = document.querySelector('.mtab[data-tab="body"], .tab[data-tab="body"]'); if(b) b.click(); });
    await page.waitForTimeout(700);
    const layout = await page.evaluate(() => {
      const out = { gaps:[], tileSizes:[], bandWaste:0 };
      const v = document.querySelector(".view.active");
      // only elements that actually occupy space — hidden sub-sections and
      // zero-height wrappers would otherwise report phantom gaps
      const kids = [...v.children].filter(e => {
        const r = e.getBoundingClientRect();
        return getComputedStyle(e).display !== "none" && r.height > 4;
      });
      for(let i=1;i<kids.length;i++){
        const a = kids[i-1].getBoundingClientRect(), b = kids[i].getBoundingClientRect();
        if(b.top >= a.bottom) out.gaps.push(Math.round(b.top - a.bottom));
      }
      // every row of side-by-side cards must be identical in size
      const rows = {};
      document.querySelectorAll(".view.active .grid-12 > .card").forEach(c => {
        const r = c.getBoundingClientRect();
        const key = Math.round(r.top);
        (rows[key] = rows[key] || []).push(Math.round(r.width) + "x" + Math.round(r.height));
      });
      Object.values(rows).forEach(cells => {
        if(cells.length > 1 && new Set(cells).size > 1) out.tileSizes.push(cells);
      });
      // the stat band must use the full width, not float in dead space
      out.bandCells = 0;
      const band = v.querySelector(".stat-band .page-stats");   // ACTIVE view only — hidden views measure 0
      if(band){
        const cells = [...band.querySelectorAll(".sb-cell")];
        out.bandCells = cells.length;
        if(cells.length){
          const bandW = band.getBoundingClientRect().width;
          const first = cells[0].getBoundingClientRect();
          const last = cells[cells.length-1].getBoundingClientRect();
          const spanned = last.right - first.left;   // gaps included, edge to edge
          out.bandWaste = Math.round((1 - spanned / bandW) * 100);
        }
      }
      return out;
    });
    const uniformGaps = new Set(layout.gaps).size <= 1;
    const equalTiles = layout.tileSizes.length === 0;
    // only meaningful when the band actually has stats in it
    const packed = layout.bandCells === 0 || (layout.bandWaste != null && layout.bandWaste < 25);
    (uniformGaps && equalTiles && packed)
      ? ok(`v26 uniform ${layout.gaps[0] || 0}px gaps, equal side-by-side cards${layout.bandCells ? `, band ${100-layout.bandWaste}% used` : ""}`)
      : fail("v26 spacing/sizing", JSON.stringify(layout));
  } catch (e) { fail("v26 spacing/sizing", e); }

  // 19. v27: the step attribute rejected real calorie targets, height was
  //     asked for in inches, and the plan prescribed food but no training.
  try {
    const stepOk = await page.evaluate(() => {
      const el = document.getElementById("setCal");
      if(!el) return null;
      el.value = "1473";                       // step="50" used to reject this
      return el.checkValidity();
    });
    stepOk ? ok("v27 calorie goal accepts any number (step bug fixed)")
           : fail("v27 step bug", "1473 still rejected by the input");
  } catch (e) { fail("v27 step bug", e); }

  try {
    const prog = await page.evaluate(() => {
      const p = window.__bermo.buildProgram({
        mode:"lose", days:4, lifts:true, dailyDelta:-365,
        protein:101, carbs:157, fat:43, weightLb:122,
      });
      return {
        days: p.liftDays.length,
        exPerDay: p.liftDays.map(d => d.exercises.length),
        regions: [...new Set(p.liftDays.flatMap(d => d.exercises.map(e => e.region.split(".")[0])))].sort(),
        cardio: p.cardio.total,
        meals: p.food.meals,
        compoundScheme: (p.liftDays[0].exercises.find(e => /squat/i.test(e.name)) || {}).scheme,
      };
    });
    const covers = ["arms","back","chest","core","glutes","legs","shoulders"].every(r => prog.regions.includes(r));
    (prog.days === 4 && prog.exPerDay.every(n => n >= 4) && covers
      && prog.cardio > 0 && prog.meals >= 3 && /6-8/.test(prog.compoundScheme || ""))
      ? ok(`v27 program: ${prog.days} training days covering all 7 regions + ${prog.cardio}min cardio + ${prog.meals} meals`)
      : fail("v27 program", JSON.stringify(prog));
  } catch (e) { fail("v27 program", e); }

  // 20. v28: four bugs she hit in the Goal Designer.
  try {
    const r = await page.evaluate(() => {
      const base = { weightLb:122, bfPct:22, targetBfPct:20, mode:"recomp", floorCal:1400,
                     days:6, lifts:true, sex:"f", ageYears:36, heightIn:66 };
      const D = window.__bermo.designGoalPlan;
      const slow = D(Object.assign({}, base, {ratePctPerWk:0.35}));
      const fast = D(Object.assign({}, base, {ratePctPerWk:0.85}));
      const mine = D(Object.assign({}, base, {ratePctPerWk:0.6, targetCal:1460}));
      const hiP  = D(Object.assign({}, base, {ratePctPerWk:0.6, targetCal:1460, macroStyle:"highprotein"}));
      return {
        paceMoves: slow.cal !== fast.cal && fast.cal < slow.cal,
        proteinShare: slow.pctP, carbShare: slow.pctC,
        honoursTarget: mine.cal === 1460 && mine.manual === true,
        hiProtein: hiP.pctP >= 35 && hiP.pctC <= 36,
      };
    });
    // the pace selector did nothing outside "lose"; protein was 23% of
    // calories and carbs 56%; her own number was overridden by the estimate
    (r.paceMoves && r.proteinShare >= 28 && r.carbShare <= 50 && r.honoursTarget && r.hiProtein)
      ? ok(`v28 goal designer: pace applies, protein ${r.proteinShare}%/carbs ${r.carbShare}%, own target honoured`)
      : fail("v28 goal designer", JSON.stringify(r));
  } catch (e) { fail("v28 goal designer", e); }

  try {
    // tapping "?" used to call openModal(), replacing the designer and
    // wiping everything typed into it
    const kept = await page.evaluate(async () => {
      const btn = document.getElementById("goalPlanBtn");
      if(!btn) return null;
      btn.click();
      await new Promise(r => setTimeout(r, 400));
      const age = document.getElementById("gdAge");
      if(!age) return null;
      age.value = "36";
      const q = document.querySelector("#modal [data-explain], .modal [data-explain]");
      if(!q) return null;
      q.click();
      await new Promise(r => setTimeout(r, 300));
      const sheet = !!document.getElementById("explainSheet");
      document.querySelector("#explainSheet [data-xclose]").click();
      await new Promise(r => setTimeout(r, 200));
      const survived = (document.getElementById("gdAge") || {}).value === "36";
      if(typeof closeModal === "function") closeModal();
      return { sheet, survived };
    });
    (kept && kept.sheet && kept.survived)
      ? ok("v28 explainer layers above the form instead of destroying it")
      : fail("v28 explainer", JSON.stringify(kept));
  } catch (e) { fail("v28 explainer", e); }

  // 21. v29: body-part splits, snack-aware meals, deadline maths, and a
  //     cardio dose grounded in the concurrent-training literature.
  try {
    const r = await page.evaluate(() => {
      const p = window.__bermo.buildProgram({ mode:"lose", days:5, lifts:true, dailyDelta:-400,
        protein:140, carbs:128, fat:45, weightLb:122, splitStyle:"bodypart", meals:6 });
      return {
        bodypart: /back \+ biceps/i.test(p.liftDays[0].name) && p.liftDays.some(d => /chest \+ triceps/i.test(d.name)),
        snacks: p.food.snacks === 3 && p.food.mainMeals === 3,
        // lifting is the priority at 5 days -> cardio capped, running warned off
        cardioCapped: p.cardio.total <= 120,
        hasRules: (p.cardio.rules || []).length >= 3 && !!p.cardio.source,
      };
    });
    (r.bodypart && r.snacks && r.cardioCapped && r.hasRules)
      ? ok("v29 body-part split + snacks + evidence-based cardio dose")
      : fail("v29 program options", JSON.stringify(r));
  } catch (e) { fail("v29 program options", e); }

  try {
    const d = await page.evaluate(() => {
      const near = new Date(Date.now() + 42*86400000).toISOString().slice(0,10);
      const base = { weightLb:150, bfPct:30, targetBfPct:22, mode:"lose", floorCal:1400,
                     days:5, lifts:true, ratePctPerWk:0.6, sex:"f", ageYears:36, heightIn:66 };
      const p = window.__bermo.designGoalPlan(Object.assign({}, base, {byDate:near}));
      return { need:p.deadline.needPct, realistic:p.deadline.realistic,
               rate:p.ratePct, safeWeeks:p.deadline.safeWeeks,
               warned: p.notes.some(n => /1%\/week|muscle with the fat/i.test(n)) };
    });
    // an impossible date must be flagged, capped at the 1%/wk evidence
    // ceiling, and answered with an honest timeline instead
    (d.need > 1 && d.realistic === false && d.rate <= 1 && d.safeWeeks > 6 && d.warned)
      ? ok(`v29 deadline capped at the safe rate (asked ${d.need}%/wk, honest answer ${d.safeWeeks} weeks)`)
      : fail("v29 deadline", JSON.stringify(d));
  } catch (e) { fail("v29 deadline", e); }

  try {
    const cmp = await page.evaluate(() => {
      const el = document.getElementById("cmpRows");
      return el ? el.innerText : "";
    });
    /lift days/i.test(cmp) && /working sets/i.test(cmp) && /cardio/i.test(cmp)
      ? ok("v29 week comparison includes lifts, sets and cardio")
      : fail("v29 compare card", cmp.slice(0, 120));
  } catch (e) { fail("v29 compare card", e); }

  // 22. v30: start a workout with NOTHING planned and build it as you go.
  //     It used to refuse — a confirm() then a click on a "plan" tab that
  //     was deleted in v18, so OK did nothing either. Two constants used
  //     by the session (SET_KINDS, the rest-timer state) were also never
  //     declared, so the overlay threw the moment an exercise rendered.
  try {
    const dialogs = [];
    const onDialog = async (d) => { dialogs.push(d.message()); await d.dismiss(); };
    page.on("dialog", onDialog);
    await page.evaluate(() => {
      const KEY = "bermo.tracker.v1";
      const st = JSON.parse(localStorage.getItem(KEY));
      const names = ["sun","mon","tue","wed","thu","fri","sat"];
      const d = new Date();
      const ws = new Date(d); ws.setHours(0,0,0,0); ws.setDate(ws.getDate() - ws.getDay());
      const wk = (date) => { const x = new Date(date); x.setHours(0,0,0,0);
        x.setDate(x.getDate() + 4 - (x.getDay()||7));
        const y0 = new Date(x.getFullYear(),0,1);
        return x.getFullYear() + "-W" + String(Math.ceil(((x - y0)/86400000 + 1)/7)).padStart(2,"0"); };
      st.plan = st.plan || {};
      st.plan[wk(ws)] = st.plan[wk(ws)] || {};
      st.plan[wk(ws)][names[d.getDay()]] = { type:"LEGS" };   // a type, but NO exercises
      delete (st.days[new Date().toISOString().slice(0,10)] || {}).workoutSession;
      localStorage.setItem(KEY, JSON.stringify(st));
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1100);
    await page.click(`${tabSel}[data-tab="fitness"]`).catch(()=>{});
    await page.waitForTimeout(600);
    await page.evaluate(() => { const b = document.getElementById("fdStart"); if(b) b.click(); });
    await page.waitForTimeout(700);
    const sess = await page.evaluate(() => {
      const o = document.getElementById("workoutOverlay");
      return { open: !!o && getComputedStyle(o).display !== "none",
               clock: (document.getElementById("woClock")||{}).textContent || "",
               canAdd: !!document.getElementById("wsAddEx") };
    });
    page.off("dialog", onDialog);
    (sess.open && sess.canAdd && dialogs.length === 0 && /⏸/.test(sess.clock))
      ? ok("v30 empty session opens, clock auto-starts, exercises addable")
      : fail("v30 empty session", JSON.stringify({ ...sess, dialogs }));
  } catch (e) { fail("v30 empty session", e); }

  // 23. Drive the WHOLE session flow and require zero page errors.
  //     A regex scan for undeclared identifiers was tried here and produced
  //     false positives; exercising the path is both simpler and stricter.
  //     This is what would have caught SET_KINDS and the rest-timer state:
  //     both were referenced and never declared, and only threw once an
  //     exercise actually rendered and a set was actually logged.
  try {
    const before = pageErrors.length;
    await page.evaluate(() => { const b = document.getElementById("wsAddEx"); if(b) b.click(); });
    await page.waitForTimeout(500);
    await page.fill("#axSearch", "hip thrust").catch(()=>{});
    await page.waitForTimeout(350);
    await page.evaluate(() => { const li = document.querySelector("#axList .mrow"); if(li) li.click(); });
    await page.waitForTimeout(500);
    // log a set — this is where the rest timer fires
    await page.evaluate(() => {
      const set = document.querySelector(".ws-set");
      if(!set) return;
      const reps = set.querySelector(".ws-reps");
      reps.value = "12";
      reps.dispatchEvent(new Event("change", { bubbles:true }));
      set.querySelector("[data-log]").click();
    });
    await page.waitForTimeout(700);
    // cycle a set kind — this is where SET_KINDS was referenced
    await page.evaluate(() => { const b = document.querySelector("[data-kind-cycle]"); if(b) b.click(); });
    await page.waitForTimeout(400);
    const logged = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem("bermo.tracker.v1"));
      const k = new Date().toISOString().slice(0, 10);
      const sess = ((st.days[k] || {}).sessions || []);
      return { rows: sess.length, hasHipThrust: sess.some(x => /hip thrust/i.test(x.name || "")) };
    });
    const newErrors = pageErrors.slice(before);
    (newErrors.length === 0 && logged.hasHipThrust)
      ? ok("v30 full session flow (add lift, log a bodyweight set, cycle set kind) throws nothing")
      : fail("v30 session flow", JSON.stringify({ newErrors: newErrors.slice(0,3), logged }));
  } catch (e) { fail("v30 session flow", e); }

  // 24. v31: what she actually typed into the day editor.
  //     "1.5 hours." became an EXERCISE and the whole comma-separated line
  //     became ONE exercise with a 70-character name, because the parser
  //     split on newlines only. Nothing carried into the log either.
  try {
    const parsed = await page.evaluate(() => window.__bermo.parseMovementText(
      "1.5 hours.\nThruster machine, kick back machine, abductor machine inner and outer and walked 20 min"));
    const names = parsed.movements.map(m => m.name);
    const okParse = parsed.durationMin === 90
      && parsed.movements.length === 4
      && names.includes("Thruster machine")
      && names.includes("kick back machine")
      && names.includes("abductor machine inner and outer")   // "inner and outer" must NOT split
      && parsed.movements.some(m => m.cardio && m.minutes === 20);
    okParse ? ok("v31 movement text parses duration, commas, and cardio separately")
            : fail("v31 movement parse", JSON.stringify(parsed));
  } catch (e) { fail("v31 movement parse", e); }

  try {
    const flow = await page.evaluate(() => {
      const KEY = "bermo.tracker.v1";
      const st = JSON.parse(localStorage.getItem(KEY));
      const names = ["sun","mon","tue","wed","thu","fri","sat"];
      const d = new Date();
      const ws = new Date(d); ws.setHours(0,0,0,0); ws.setDate(ws.getDate() - ws.getDay());
      const wk = (x0) => { const x = new Date(x0); x.setHours(0,0,0,0);
        x.setDate(x.getDate() + 4 - (x.getDay()||7));
        const y0 = new Date(x.getFullYear(),0,1);
        return x.getFullYear() + "-W" + String(Math.ceil(((x - y0)/86400000 + 1)/7)).padStart(2,"0"); };
      const p = window.__bermo.parseMovementText("1.5 hours.\nSquat, hip thrust, walked 20 min");
      st.plan = {}; st.plan[wk(ws)] = {};
      st.plan[wk(ws)][names[d.getDay()]] = { type:"LEGS", durationMin:p.durationMin, exercises:p.movements };
      const k = new Date().toISOString().slice(0,10);
      if(st.days[k]) st.days[k].sessions = [];
      localStorage.setItem(KEY, JSON.stringify(st));
      return true;
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1100);
    await page.click(`${tabSel}[data-tab="fitness"]`).catch(()=>{});
    await page.waitForTimeout(600);
    const had = await page.evaluate(() => !!document.getElementById("fdDone"));
    await page.evaluate(() => { const b = document.getElementById("fdDone"); if(b) b.click(); });
    await page.waitForTimeout(700);
    const logged = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem("bermo.tracker.v1"));
      const k = new Date().toISOString().slice(0,10);
      const sess = ((st.days[k] || {}).sessions || []);
      return { n: sess.length, cardio: sess.filter(x => x.type === "cardio").length,
               mins: sess.reduce((a,x) => a + (x.durationMin||0), 0) };
    });
    (had && logged.n === 3 && logged.cardio === 1 && logged.mins >= 85)
      ? ok(`v31 "already did it" logs the planned day (${logged.n} entries, ${logged.mins} min)`)
      : fail("v31 plan to log", JSON.stringify({ had, logged }));
  } catch (e) { fail("v31 plan to log", e); }

  // 25. v32: ONE entry point must reach EVERY downstream surface.
  //     Eight places used to push into day.sessions directly and each did
  //     something different afterwards — Quick Set updated the 1RM estimate,
  //     the session logger updated rep PRs but not the 1RM, the brain dump
  //     and cardio loggers updated neither. Everything goes through
  //     logSession() now.
  try {
    const conn = await page.evaluate(() => {
      const KEY = "bermo.tracker.v1";
      const st = JSON.parse(localStorage.getItem(KEY));
      const k = new Date().toISOString().slice(0,10);
      if(st.days[k]) { st.days[k].sessions = []; }
      st.prs = {};
      localStorage.setItem(KEY, JSON.stringify(st));
      return true;
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1400);
    const result = await page.evaluate(() => {
      const B = window.__bermo;
      const k = new Date().toISOString().slice(0,10);
      // ONE typed sentence, logged once
      const p = B.parseWorkoutText("1.5 hours\nback squat 3x8 at 135, lat pulldown 3x10\nwalked 20 min");
      p.rows.forEach(r => B.logSession(k, r, { quiet: true }));
      const st = JSON.parse(localStorage.getItem("bermo.tracker.v1"));
      const day = st.days[k] || {};
      return {
        rows: (day.sessions || []).length,
        cardio: (day.sessions || []).filter(x => x.type === "cardio").length,
        prSet: Object.keys(st.prs || {}).length > 0,
        repPRs: Object.keys(st.prsRep || {}).length > 0,
        // rings are DERIVED from sessions, not stored — assert the derivation
        activity: (function(){
          const a = window.__bermo.activityFor ? window.__bermo.activityFor(k) : null;
          return !!(a && a.exercise > 0);
        })(),
      };
    });
    await page.waitForTimeout(400);
    // and it must be visible on the surfaces that read the log
    const surfaces = await page.evaluate(() => {
      const out = {};
      const w = document.querySelector('.mtab[data-tab="fitness"]'); if(w) w.click();
      return new Promise(r => setTimeout(() => {
        out.sessionCard = /back squat/i.test((document.getElementById("sessionCard")||{}).innerText || "");
        out.fitStats = /2,?\d{3}|3,?\d{3}/.test((document.getElementById("fitTopStats")||{}).innerText || "");
        const d = document.querySelector('.mtab[data-tab="dashboard"]'); if(d) d.click();
        setTimeout(() => {
          out.compare = /LIFTS LOGGED/i.test((document.getElementById("cmpRows")||{}).innerText || "");
          r(out);
        }, 500);
      }, 500));
    });
    const allConnected = result.rows === 3 && result.cardio === 1 && result.prSet
      && result.activity && surfaces.sessionCard && surfaces.fitStats && surfaces.compare;
    allConnected
      ? ok("v32 one typed workout reaches log, PRs, activity, session card, stats and week comparison")
      : fail("v32 connectedness", JSON.stringify({ ...result, ...surfaces }));
  } catch (e) { fail("v32 connectedness", e); }

  // 26. Nothing may bypass logSession() — a direct push skips PRs + activity.
  try {
    const pushes = await page.evaluate(async () => {
      const src = await (await fetch("/tracker/app.js")).text();
      // count on the raw source — stripping comments with a regex was itself
      // eating chunks of the file and reporting zero
      return (src.match(/sessions\.push\(/g) || []).length;
    });
    pushes === 1
      ? ok("v32 exactly one write path into day.sessions")
      : fail("v32 write paths", pushes + " direct pushes into day.sessions (expected 1, inside logSession)");
  } catch (e) { fail("v32 write paths", e); }

  // 27. v33: the whole journey, in order, on one page load. This is the
  //     "can she actually use it" test — onboard, design a plan, log food,
  //     write out a workout, add a health note, weigh in, and confirm it all
  //     survives a reload. Any page error in any step fails it.
  try {
    const before = pageErrors.length;
    const journey = await page.evaluate(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const out = {};
      const st0 = JSON.parse(localStorage.getItem("bermo.tracker.v1"));
      const k = new Date().toISOString().slice(0,10);
      // profile facts must be readable by every calculator from ONE place
      out.heightIn = window.__bermo.profileHeightIn ? window.__bermo.profileHeightIn() : null;
      out.ageYears = window.__bermo.profileAgeYears ? window.__bermo.profileAgeYears() : null;
      // free-text workout -> log
      const p = window.__bermo.parseWorkoutText("45 min\nback squat 4x8 at 135\nwalked 15 min");
      p.rows.forEach(r => window.__bermo.logSession(k, r, { quiet:true }));
      await wait(50);
      const st = JSON.parse(localStorage.getItem("bermo.tracker.v1"));
      const d = st.days[k] || {};
      out.sessions = (d.sessions || []).length;
      out.cardio = (d.sessions || []).filter(x => x.type === "cardio").length;
      out.prs = Object.keys(st.prs || {}).length;
      // health note -> check-in + exposures
      const n = window.__bermo.parseHealthNote("7 hours sleep, drank wine");
      out.noteSleep = n.sleep;
      out.noteExposure = n.exposures.length;
      return out;
    });
    const errs = pageErrors.slice(before);
    const good = journey.sessions >= 2 && journey.cardio >= 1 && journey.prs > 0
      && journey.noteSleep === 7 && journey.noteExposure > 0
      && journey.heightIn > 0 && journey.ageYears > 0 && errs.length === 0;
    good ? ok(`v33 full journey (profile ${journey.heightIn}in/${journey.ageYears}y, ${journey.sessions} sessions, ${journey.prs} PRs)`)
         : fail("v33 full journey", JSON.stringify({ ...journey, errs: errs.slice(0,2) }));
  } catch (e) { fail("v33 full journey", e); }

  // 28. No native prompt()/confirm()/alert() may reach the user.
  try {
    const natives = await page.evaluate(async () => {
      const src = await (await fetch("/tracker/app.js")).text();
      const hits = [];
      // ignore the PWA install prompt and any mention inside a comment line
      src.split("\n").forEach((line, i) => {
        if(/^\s*\/\//.test(line)) return;
        if(/(^|[^.\w])(prompt|confirm|alert)\s*\(/.test(line) && !/deferredInstallPrompt/.test(line)){
          hits.push((i+1) + ": " + line.trim().slice(0,70));
        }
      });
      return hits;
    });
    natives.length === 0
      ? ok("v33 no native prompt/confirm/alert anywhere in the app")
      : fail("v33 native dialogs", natives.slice(0,4).join(" | "));
  } catch (e) { fail("v33 native dialogs", e); }

  // 29. v34: modals opened from INSIDE the workout overlay must be VISIBLE,
  //     not merely present. The overlay is z-index 350 and modals were 200,
  //     so "+ ADD EXERCISE" opened behind an opaque full-screen layer: in the
  //     DOM, marked .open, and completely invisible. The earlier test asserted
  //     presence, which is why it passed while the button looked dead.
  //     Also: START WORKOUT only existed on a PLANNED day, so an unplanned
  //     day had no way to start a session at all.
  try {
    await page.evaluate(() => {
      const KEY = "bermo.tracker.v1";
      const st = JSON.parse(localStorage.getItem(KEY));
      const k = new Date().toISOString().slice(0,10);
      st.plan = {};                                  // deliberately UNPLANNED
      if(st.days[k]) delete st.days[k].workoutSession;
      localStorage.setItem(KEY, JSON.stringify(st));
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1100);
    await page.click(`${tabSel}[data-tab="fitness"]`).catch(()=>{});
    await page.waitForTimeout(600);
    const canStart = await page.evaluate(() => !!document.getElementById("fdStart"));
    await page.evaluate(() => { const b = document.getElementById("fdStart"); if(b) b.click(); });
    await page.waitForTimeout(700);
    const overlay = await page.evaluate(() => !!document.querySelector("#workoutOverlay.open"));

    const seen = {};
    for(const id of ["wsAddEx","wsLoadSaved"]){
      await page.evaluate((i) => { const b = document.getElementById(i); if(b) b.click(); }, id);
      await page.waitForTimeout(500);
      seen[id] = await page.evaluate(() => {
        const m = document.querySelector("#modal.open, .modal.open");
        if(!m) return "absent";
        const card = m.querySelector(".modal-card, .modal-inner, .modal > div") || m;
        const r = card.getBoundingClientRect();
        if(r.width < 10 || r.height < 10) return "zero-size";
        // the real check: what is actually painted on top at that point
        const top = document.elementFromPoint(r.left + r.width/2, r.top + Math.min(r.height/2, 200));
        return (top && (m === top || m.contains(top))) ? "visible" : "covered";
      });
      await page.evaluate(() => {
        if(typeof closeModal === "function") closeModal();
        document.querySelectorAll("#modal.open,.modal.open").forEach(x => x.classList.remove("open"));
      });
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => {
      const o = document.getElementById("workoutOverlay");
      if(o) o.classList.remove("open");
      document.body.style.overflow = "";
    });
    (canStart && overlay && seen.wsAddEx === "visible" && seen.wsLoadSaved === "visible")
      ? ok("v34 unplanned day can start a session, and in-session modals are visible above the overlay")
      : fail("v34 modal stacking", JSON.stringify({ canStart, overlay, ...seen }));
  } catch (e) { fail("v34 modal stacking", e); }

  // 30b. v37: THE LOST WORKOUT. Sets only reached day.sessions when the
  //      per-row "Log" button was tapped. She filled the rows, hit Done, and
  //      the entire session disappeared. Anything typed must survive Done.
  try {
    await page.evaluate(() => {
      const KEY = "bermo.tracker.v1";
      const st = JSON.parse(localStorage.getItem(KEY));
      const k = new Date().toISOString().slice(0,10);
      st.plan = {};
      if(st.days[k]){ delete st.days[k].workoutSession; st.days[k].sessions = []; }
      localStorage.setItem(KEY, JSON.stringify(st));
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1100);
    await page.click(`${tabSel}[data-tab="fitness"]`).catch(()=>{});
    await page.waitForTimeout(600);
    await page.evaluate(() => { const b = document.getElementById("fdStart"); if(b) b.click(); });
    await page.waitForTimeout(700);
    // add one exercise through the real UI
    await page.evaluate(() => { const b = document.getElementById("wsAddEx"); if(b) b.click(); });
    await page.waitForTimeout(600);
    await page.fill("#axSearch", "hip thrust").catch(()=>{});
    await page.waitForTimeout(400);
    await page.evaluate(() => { const li = document.querySelector("#axList .mrow"); if(li) li.click(); });
    await page.waitForTimeout(700);
    // untouched rows must show placeholders, not pre-filled values
    const blankBefore = await page.evaluate(() =>
      [...document.querySelectorAll("#workoutOverlay .ws-set .ws-reps")].every(i => i.value === ""));
    // type into the first two rows and DO NOT tap Log
    const dbg = await page.evaluate(() => ({
      overlay: !!document.querySelector("#workoutOverlay.open"),
      axSearch: !!document.getElementById("axSearch"),
      exCount: document.querySelectorAll("#workoutOverlay .ws-ex").length,
      setCount: document.querySelectorAll("#workoutOverlay .ws-set").length,
      modalOpen: !!document.querySelector("#modal.open"),
    }));
    const typed = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("#workoutOverlay .ws-set")].slice(0,2);
      rows.forEach((r, i) => {
        const reps = r.querySelector(".ws-reps"), w = r.querySelector(".ws-weight");
        reps.value = String(10 + i); reps.dispatchEvent(new Event("input", { bubbles:true }));
        w.value = "45";              w.dispatchEvent(new Event("input", { bubbles:true }));
      });
      return rows.length;
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => { const b = document.getElementById("woDone"); if(b) b.click(); });
    await page.waitForTimeout(900);
    const saved = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem("bermo.tracker.v1"));
      const k = new Date().toISOString().slice(0,10);
      const s = ((st.days[k] || {}).sessions || []);
      return { n: s.length, reps: s.map(x => x.reps).sort(), w: s.map(x => x.weight) };
    });
    (blankBefore && typed === 2 && saved.n === 2 && saved.w.every(x => x === 45))
      ? ok("v37 typed sets survive Done even if the per-row Log was never tapped")
      : fail("v37 lost workout", JSON.stringify({ blankBefore, typed, saved, dbg }));
  } catch (e) { fail("v37 lost workout", e); }

  // 30. v39: ONE fitness screen. "There should be no other add fitness
  //     options outside this." Every entry point must land on the SAME
  //     day sheet, with the same three actions.
  try {
    const shot = async (openFn) => {
      await page.evaluate(openFn);
      await page.waitForTimeout(800);
      const r = await page.evaluate(() => {
        const m = document.querySelector("#modal.open, .modal.open");
        if(!m) return null;
        return {
          title: ((m.querySelector(".modal-head h3, .modal-title, #modalTitle") || {}).textContent || "").trim(),
          build: !!m.querySelector("#dsBuild"),
          timer: !!m.querySelector("#dsTimer"),
          time:  !!m.querySelector("#dsTime"),
          type:  !!m.querySelector("#dsType"),
        };
      });
      await page.evaluate(() => {
        if(typeof closeModal === "function") closeModal();
        document.querySelectorAll("#modal.open,.modal.open").forEach(m => m.classList.remove("open"));
      });
      await page.waitForTimeout(250);
      return r;
    };
    const fromHeader = await shot(() => { const b = document.getElementById("fitWriteOut"); if(b) b.click(); });
    const fromWeek   = await shot(() => { const r = document.querySelector("#fitWeekList .fw-row"); if(r) r.click(); });
    const fromPlan   = await shot(() => { const b = document.getElementById("fdEdit"); if(b) b.click(); });
    const all = [fromHeader, fromWeek, fromPlan].filter(Boolean);
    // Titles differ on purpose — each entry point carries its own day.
    // What must be identical is the SCREEN.
    const same = all.length === 3
      && all.every(x => x.build && x.timer && x.time && x.type)
      && all.every(x => /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/.test(x.title));
    same ? ok("v39 every fitness entry point opens the same day sheet")
         : fail("v39 one fitness screen", JSON.stringify(all));
  } catch (e) { fail("v39 one fitness screen", e); }

  // 31. v41: NO BUTTON MAY BLANK THE APP.
  //     "I clicked edit week and it goes black." #dwEditPlan called
  //     go("plan") — a view deleted back in v18 — so every view unmounted
  //     and she was left on a black screen with no way back. Third time a
  //     control has pointed at a dead view. Two checks now:
  //     (a) every navigation target resolves to a real view, and
  //     (b) clicking every nav-ish control leaves something painted.
  try {
    const navAudit = await page.evaluate(() => {
      const views = new Set([...document.querySelectorAll(".view")].map(v => v.id.replace("view-", "")));
      const targets = new Set([...document.querySelectorAll("[data-tab]")].map(t => t.dataset.tab));
      return { views:[...views], dead:[...targets].filter(t => !views.has(t)) };
    });
    navAudit.dead.length === 0
      ? ok("v41 every navigation target resolves to a real view")
      : fail("v41 dead nav target", JSON.stringify(navAudit));
  } catch (e) { fail("v41 nav targets", e); }

  try {
    const CONTROLS = ["#dwEditPlan", "#fitWriteOut", "#calToday"];
    const blanked = [];
    for(const sel of CONTROLS){
      await page.evaluate(() => { const b = document.getElementById("dwEditPlan"); }); // noop, keeps eval warm
      await page.evaluate(s => { const b = document.querySelector(s); if(b) b.click(); }, sel);
      await page.waitForTimeout(600);
      const st = await page.evaluate(() => ({
        views: document.querySelectorAll(".view.active").length,
        text: (document.body.innerText || "").trim().length,
      }));
      if(st.views === 0 || st.text < 50) blanked.push(sel + " -> " + JSON.stringify(st));
      await page.evaluate(() => {
        if(typeof closeModal === "function") closeModal();
        document.querySelectorAll("#modal.open,.modal.open").forEach(m => m.classList.remove("open"));
        document.querySelectorAll(".workout-overlay.open").forEach(o => o.classList.remove("open"));
        document.body.style.overflow = "";
      });
      await page.waitForTimeout(200);
    }
    // and the guard itself: an invented tab must fall back, not unmount
    const guard = await page.evaluate(() => {
      const t = document.querySelector('[data-tab="dashboard"]');
      if(t) t.click();
      return true;
    });
    blanked.length === 0
      ? ok("v41 no control leaves a black screen")
      : fail("v41 black screen", blanked.join(" | "));
  } catch (e) { fail("v41 black screen", e); }


  await browser.close();
  print();
})();

function print() {
  console.log("\n===== SMOKE RESULTS =====");
  for (const [s, n] of results) console.log(`${s}  ${n}`);
  console.log(`\n===== CONSOLE ERRORS (${consoleErrors.length}) =====`);
  [...new Set(consoleErrors)].slice(0, 10).forEach(e => console.log("• " + e));
  console.log(`\n===== PAGE ERRORS (full stacks) =====`);
  [...new Set(pageErrors)].slice(0, 5).forEach(e => console.log(e + "\n---"));
  const failed = results.filter(r => r[0] === "FAIL").length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(0);
}

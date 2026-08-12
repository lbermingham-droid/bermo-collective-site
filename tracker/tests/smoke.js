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

  // 8. Lift logging end-to-end
  try {
    await page.click(`${tabSel}[data-tab="fitness"]`).catch(()=>{});
    await page.click(`${tabSel}[data-tab="lift"]`).catch(()=>{});
    await page.waitForTimeout(400);
    await page.click("#fitNewLift", { timeout: 4000 });   // opens the Lift Hub
    await page.waitForTimeout(500);
    await page.click("#lhAnyLift", { timeout: 4000 });     // -> single-lift form
    await page.waitForTimeout(500);
    await page.fill("#liftName", "Back Squat");
    await page.fill("#liftWeight", "135");
    await page.fill("#liftReps", "5");
    await page.click("#liftSave");
    await page.waitForTimeout(500);
    const logged = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("bermo.tracker.v1"));
      const t = new Date().toISOString().slice(0, 10);
      return !!(s.days[t] && (s.days[t].sessions || []).some(x => x.name === "Back Squat"));
    });
    logged ? ok("lift logs + persists") : fail("lift logs", "session missing in state");
  } catch (e) { fail("lift logging flow", e); }

  // 9. Return to dashboard, hubs render
  try {
    await page.click(`${tabSel}[data-tab="dashboard"]`).catch(()=>{});
    await page.click(`${tabSel}[data-tab="home"]`).catch(()=>{});
    await page.waitForTimeout(600);
    // v8 IA: hubs are hidden — dashboard = deck rings + nutrition card + workouts week list
    const dash = await page.evaluate(() => ({
      days: document.querySelectorAll("#deckDays .dk-dc").length,
      rings: !!document.getElementById("deckFitRings") && !!document.getElementById("deckNutRings"),
      water: !!document.getElementById("deckWaterAdd"),
      work: document.querySelectorAll("#dwList .dw-row").length,
      cmp: document.querySelectorAll("#cmpRows .cmp-row").length,
      brain: document.querySelectorAll(".js-brain").length >= 3,
    }));
    (dash.days === 7 && dash.rings && dash.water && dash.work === 7 && dash.cmp >= 3 && dash.brain)
      ? ok(`dashboard renders (day strip + dual rings + water + ${dash.work}-day list + compare)`)
      : fail("dashboard renders", JSON.stringify(dash));
  } catch (e) { fail("dashboard re-render", e); }

  // 10. Calendars connected: one selected-day state across pages
  try {
    await page.click(`${tabSel}[data-tab="dashboard"]`);
    await page.waitForTimeout(500);
    const tapped = await page.$eval("#deckDays .dk-dc:first-child", el => el.dataset.date);
    await page.click("#deckDays .dk-dc:first-child");
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
    const deckSel = await page.$eval("#deckDays .dk-dc.sel", el => el.dataset.date).catch(() => null);
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
    await page.click(`${tabSel}[data-tab="trends"]`);
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
    await page.click(`${tabSel}[data-tab="trends"]`);
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
      && plan.protein >= Math.round(plan.lean) && plan.protein <= Math.round(plan.lean * 1.4);
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
    await page.waitForTimeout(1200);
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

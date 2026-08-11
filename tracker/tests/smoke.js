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
      active ? ok(`tab '${tab}' activates its view`)
             : fail(`tab '${tab}'`, "view not active after click");
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
      await page.click(".search-result", { timeout: 4000 });
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

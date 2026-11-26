// Captures the real app screens used by the ad, with Lexi's review data
// entered through the app's own write path (logSession).
//   python3 -m http.server 8901   (repo root)   then   npm run capture
const { chromium } = require("playwright");
const path = require("path");
const data = require("./review-data.js");
const OUT = path.join(__dirname, "..", "public", "shots");
const TODAY = "2026-11-20";
(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } : undefined;
  const b = await chromium.launch({ executablePath: process.env.CI ? undefined : "/opt/pw-browsers/chromium", proxy });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  // freeze "today" so the capture is repeatable
  await p.addInitScript((today) => { const R = Date; const fixed = new R(today + "T10:30:00").getTime(); const off = fixed - R.now();
    class D extends R { constructor(...a){ if(a.length) super(...a); else super(R.now() + off); } static now(){ return R.now() + off; } } window.Date = D; }, TODAY);
  const errs = []; p.on("pageerror", e => errs.push(String(e.message)));
  await p.goto("http://127.0.0.1:8901/tracker/", { waitUntil: "load" }); await p.waitForTimeout(800);
  await p.fill("#wizName", "Lexi"); await p.fill("#wizWeight", "140");
  await p.click("#wizNext"); await p.waitForTimeout(200); await p.click('[data-goal="lean"]'); await p.click("#wizNext"); await p.waitForTimeout(300);
  await p.fill("#wizCal", String(data.goals.cal)); await p.fill("#wizP", String(data.goals.protein)); await p.fill("#wizC", String(data.goals.carbs)); await p.fill("#wizF", String(data.goals.fat));
  await p.click("#wizApply"); await p.waitForTimeout(800);
  const n = await p.evaluate((days) => { let n = 0; Object.keys(days).sort().forEach(k => days[k].forEach(r => { window.__bermo.logSession(k, Object.assign({ lift: r.name }, r), { quiet: true }); n++; })); window.__bermo.save(); return n; }, data.days);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("bermo.tracker.v1")); s.ui = s.ui || {}; s.ui.mmSex = "female"; s.ui.hmPeriod = "month"; s.coach = Object.assign(s.coach || {}, { enabled: false }); localStorage.setItem("bermo.tracker.v1", JSON.stringify(s)); });
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(1000);
  // the app's real tab bar, one per active tab, overlaid on the phone
  for(const t of ["dashboard", "fitness", "nutrition", "lifts", "more"]){ await p.evaluate(t => document.querySelector(`[data-tab="${t}"]`).click(), t); await p.waitForTimeout(500); await (await p.$(".mobnav")).screenshot({ path: path.join(OUT, `nav-${t}.png`) }); }
  await p.addStyleTag({ content: `.toast,#toast,.mobnav,.topbar{display:none!important} .main,#app{padding-bottom:0!important}` });
  const go = async (t) => { await p.evaluate(t => document.querySelector(`[data-tab="${t}"]`).click(), t); await p.waitForTimeout(900); };
  const full = async (name) => { await p.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true }); };
  await go("dashboard"); await full("home");
  await go("fitness"); await full("workouts");
  await go("lifts"); await full("lifts");
  console.log("deadlift row at (css px):", JSON.stringify(await p.evaluate(() => { const r = document.querySelector('#lifts [data-lift="Deadlift"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 + window.scrollY }; })));
  await p.evaluate(() => document.querySelector('#lifts [data-lift="Deadlift"]').click()); await p.waitForTimeout(500); await full("lift-deadlift");
  await p.evaluate(() => document.getElementById("lfBack").click()); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('#lifts [data-lift="Back Squat"]').click()); await p.waitForTimeout(500); await full("lift-squat");
  await go("nutrition"); await full("nutrition");
  // coach hub with the demo gym
  await go("settings"); await p.evaluate(() => document.getElementById("coachDemoBtn").click()); await p.waitForTimeout(900);
  for(const i of [0, 1, 3, 4]){ await p.evaluate(i => document.querySelectorAll("#coach [data-att]")[i].click(), i); await p.waitForTimeout(250); }
  { const c0 = await p.$$("#coach tr.on td input[data-cell]"); const v0 = [65, 95, 35, 30, 50, 75, 30, 25, 90, 135, 50, 40, 55, 85, 30, 30]; for(let i = 0; i < c0.length && i < v0.length; i++){ await c0[i].fill(String(v0[i])); await c0[i].dispatchEvent("change"); } }
  await p.waitForTimeout(250); await full("coach-class-a");   // before the tap: four members in
  const tapBox = await p.evaluate(() => { const el = document.querySelectorAll("#coach .co-chk i")[6]; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 + window.scrollY }; });
  console.log("class tap at (css px):", JSON.stringify(tapBox));
  await p.evaluate(() => document.querySelectorAll("#coach [data-att]")[6].click()); await p.waitForTimeout(250);
  const cells = await p.$$("#coach tr.on td input[data-cell]");
  const vals = [65, 95, 35, 30, 50, 75, 30, 25, 90, 135, 50, 40, 55, 85, 30, 30, 70, 105, 40, 35];
  for(let i = 0; i < cells.length && i < vals.length; i++){ await cells[i].fill(String(vals[i])); await cells[i].dispatchEvent("change"); }
  await p.waitForTimeout(300); await full("coach-class");
  await p.evaluate(() => document.querySelector('[data-cotab="calendar"]').click()); await p.waitForTimeout(400); await full("coach-calendar");
  await p.evaluate(() => document.querySelector('[data-cotab="members"]').click()); await p.waitForTimeout(400); await full("coach-members");
  // body figure cutouts: lift the SVG out of the app onto a blank transparent page
  // the Nov 16 workout: only the muscles that session used are lit
  await p.evaluate(() => window.BERMO_TRACKER.setCurrentDate("2026-11-16"));
  await go("fitness"); await full("workout-body");
  const lists = await p.evaluate(() => [...document.querySelectorAll("#muscleMapCard .mm-lists > div")].map(d => d.innerText.replace(/\n/g, " | ")));
  console.log("workout lists:", JSON.stringify(lists));
  const grab = async () => p.evaluate(() => { const svg = document.querySelector("#muscleMapCard .mm-svg"); const c = svg.cloneNode(true);
    const src = svg.querySelectorAll("path"), dst = c.querySelectorAll("path");
    src.forEach((el, i) => { const cs = getComputedStyle(el); dst[i].setAttribute("style", `fill:${cs.fill};stroke:${cs.stroke};stroke-width:${cs.strokeWidth};stroke-linejoin:round`); });
    return c.outerHTML; });
  const add = await p.evaluate(() => { const d = document.querySelector("#muscleMapCard .mm-add"); return d ? d.innerText.replace(/\n/g, " | ") : null; });
  console.log("add one more:", JSON.stringify(add));
  const liftRow = await p.evaluate(() => 0);
  const front = await grab();
  await p.evaluate(() => document.getElementById("mmFlip").click()); await p.waitForTimeout(300);
  const back = await grab();
  const p2 = await ctx.newPage();
  const grey = (h) => h.replace(/fill: ?rgb\(255, 77, 157\)/g, "fill:rgb(91, 97, 112)");
  for(const [name, html] of [["body-front", front], ["body-back", back], ["body-front-off", grey(front)]]){
    await p2.setContent(`<html><body style="margin:0;background:transparent"><div id="w" style="width:360px;height:760px;display:flex;justify-content:center">${html.replace('class="mm-svg"', 'style="height:760px;width:auto"')}</div></body></html>`);
    await (await p2.$("#w")).screenshot({ path: path.join(OUT, name + ".png"), omitBackground: true });
  }
  const sizes = await p.evaluate(() => 1);
  console.log("logged rows:", n, "errors:", JSON.stringify(errs));
  await b.close();
})();

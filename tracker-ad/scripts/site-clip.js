// Records the real app (demo mode) being used, for the site's phone slot.
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const OUT = process.argv[2];
(async () => {
  fs.readdirSync(OUT).filter(f => f.endsWith(".webm")).forEach(f => fs.unlinkSync(path.join(OUT, f)));
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const W = 320, H = 655;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, recordVideo: { dir: OUT, size: { width: W * 2, height: H * 2 } } });
  const p = await ctx.newPage(); const t0 = Date.now(); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://127.0.0.1:8901/tracker/?demo=gym", { waitUntil: "load" });
  await p.addStyleTag({ content: "#appVer,.toast,#toast{display:none!important} html{scroll-behavior:smooth}" });
  await p.waitForTimeout(1800);
  const marks = []; const mark = (n) => marks.push([n, (Date.now() - t0) / 1000]);
  const wait = (ms) => p.waitForTimeout(ms);
  // click the element itself (never a neighbour), after bringing it clear of the fixed bars
  const tapEl = async (h) => { await h.evaluate(el => { let e = el; while(e && !(e.getBoundingClientRect().width > 4)) e = e.parentElement; const r0 = e.getBoundingClientRect(); if(r0.top < 70 || r0.bottom > innerHeight - 90) e.scrollIntoView({ block: "center" }); }); await p.waitForTimeout(350); await h.evaluate(el => { if(el.matches("input:not([type=checkbox])")) el.focus(); else el.click(); }); };
  const tap = async (sel, i = 0) => { const l = await p.$$(sel); if(!l[i]) throw new Error("missing " + sel + " #" + i); return tapEl(l[i]); };
  const scrollTo = (y) => p.evaluate(y => window.scrollTo({ top: y, behavior: "smooth" }), y);
  mark("start");
  // 1 class sheet: tick two members in, type a weight
  await wait(900);
  await tap("#coach [data-att]", 2); await wait(800);
  { const row = await p.evaluateHandle(() => document.querySelectorAll("#coach [data-att]")[2].closest("tr")); const cell = (await row.asElement().$$("input[data-cell]"))[0];
    await tapEl(cell); await wait(250); await cell.fill(""); await p.keyboard.type("145", { delay: 150 }); await p.keyboard.press("Tab"); await wait(500); }
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await tap("#coach [data-att]", 5); await wait(1100);
  mark("calendar");
  await tap('[data-cotab="calendar"]'); await wait(900); await scrollTo(330); await wait(1500);
  mark("members");
  await scrollTo(0); await wait(900); await tap('[data-cotab="members"]'); await wait(600); if(!(await p.$("#coach [data-member]"))) await p.evaluate(() => document.querySelector('[data-cotab="members"]').click()); await wait(900);
  await tap("#coach [data-member]", 4); await wait(1000); await scrollTo(260); await wait(1500);
  mark("member-app");
  await scrollTo(0); await wait(800);
  await p.evaluate(() => document.querySelector('[data-tab="dashboard"]').click()); await wait(1700);
  await p.evaluate(() => document.querySelector('[data-tab="lifts"]').click()); await wait(1100);
  await tap('#lifts [data-lift="Hip Thrust"]'); await wait(1000); await scrollTo(300); await wait(1400);
  mark("body");
  await p.evaluate(() => document.querySelector('[data-tab="fitness"]').click()); await wait(500);
  await p.evaluate(() => { const el = document.querySelector("#muscleMapCard"); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 60, behavior: "smooth" }); }); await wait(1700);
  await tap("#mmFlip"); await wait(1800);
  mark("end");
  console.log(JSON.stringify({ marks, errs }));
  await ctx.close(); await b.close();
  const f = fs.readdirSync(OUT).find(f => f.endsWith(".webm")); fs.renameSync(path.join(OUT, f), path.join(OUT, "raw.webm"));
})();

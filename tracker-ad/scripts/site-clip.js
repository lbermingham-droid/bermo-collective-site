// Records the real app (demo mode) being used, for the website's phone slot.
// Every frame is a true 3x screenshot (1080x2208), so the clip is sharp and
// fills the whole frame. Scrolls are stepped by this script at 30 fps with
// an ease-out; after each click a short real-time burst catches the app's
// own transition, then the settled screen is held.
//   python3 -m http.server 8901   (repo root)
//   node tracker-ad/scripts/site-clip.js <frames-dir>
//   then see the ffmpeg lines in tracker-ad/README.md
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const OUT = process.argv[2];
(async () => {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CI ? undefined : "/opt/pw-browsers/chromium" });
  const W = 360, H = 736;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://127.0.0.1:8901/tracker/?demo=gym", { waitUntil: "load" });
  await p.addStyleTag({ content: "#appVer,.toast,#toast{display:none!important} html{scroll-behavior:auto!important}" });
  await p.waitForTimeout(1800);

  const frames = []; let n = 0;
  const snap = async (dur) => { const name = String(n++).padStart(5, "0") + ".jpg"; await p.screenshot({ path: path.join(OUT, name), type: "jpeg", quality: 93 }); frames.push([name, dur]); };
  const hold = (sec) => snap(sec);
  // real-time burst: catches a transition as it plays
  const live = async (ms) => { const end = Date.now() + ms; let t = Date.now(); while(Date.now() < end){ const i = frames.length; await snap(0); const now = Date.now(); frames[i][1] = (now - t) / 1000; t = now; } };
  const scroll = async (to, steps = 20) => { const from = await p.evaluate(() => window.scrollY); for(let i = 1; i <= steps; i++){ const k = 1 - Math.pow(1 - i / steps, 3); await p.evaluate(y => window.scrollTo(0, y), from + (to - from) * k); await snap(1 / 30); } };
  const click = async (sel, i = 0) => { const l = await p.$$(sel); if(!l[i]) throw new Error("missing " + sel + " #" + i); await l[i].evaluate(el => el.click()); };
  const go = async (tab) => p.evaluate(t => document.querySelector(`[data-tab="${t}"]`).click(), tab);

  // 1 the morning class sheet: tick a member in, type what they lifted
  await hold(1.0);
  await click("#coach [data-att]", 2); await live(450); await hold(0.5);
  { const cell = await p.evaluateHandle(() => document.querySelectorAll("#coach [data-att]")[2].closest("tr").querySelector("input[data-cell]"));
    await cell.asElement().evaluate(el => { el.focus(); el.value = ""; }); await hold(0.3);
    for(const ch of "145"){ await p.keyboard.type(ch); await hold(0.17); }
    await cell.asElement().evaluate(el => { el.dispatchEvent(new Event("change", { bubbles: true })); el.blur(); }); await hold(0.5); }
  await click("#coach [data-att]", 5); await live(450); await hold(0.9);
  // 2 the month, planned
  await click('[data-cotab="calendar"]'); await live(350); await hold(0.8);
  await scroll(300, 24); await hold(1.3);
  // 3 every member, then one member
  await p.evaluate(() => window.scrollTo(0, 0)); await click('[data-cotab="members"]'); await live(350); await hold(1.2);
  await click("#coach [data-member]", 4); await live(350); await hold(0.9);
  await scroll(260, 22); await hold(1.2);
  // 4 that member's own app
  await p.evaluate(() => window.scrollTo(0, 0)); await go("dashboard"); await live(900); await hold(1.2);
  await go("lifts"); await live(350); await hold(1.0);
  await click('#lifts [data-lift="Hip Thrust"]'); await live(350); await hold(0.8);
  await scroll(300, 22); await hold(1.1);
  // 5 what today's class worked
  await go("fitness"); await p.waitForTimeout(300);
  await p.evaluate(() => { const el = document.querySelector("#muscleMapCard"); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 70); }); await live(350); await hold(1.3);
  await click("#mmFlip"); await live(900); await hold(1.0);
  { const y = await p.evaluate(() => { const el = document.querySelector("#muscleMapCard .mm-lists") || document.querySelector("#muscleMapCard"); return el.getBoundingClientRect().top + scrollY - 150; }); await scroll(y, 22); await hold(1.6); }

  let list = ""; let total = 0; frames.forEach(([name, d]) => { const dur = Math.max(0.02, d); total += dur; list += `file '${name}'\nduration ${dur.toFixed(4)}\n`; });
  list += `file '${frames[frames.length - 1][0]}'\n`; fs.writeFileSync(path.join(OUT, "list.txt"), list);
  console.log(JSON.stringify({ frames: frames.length, seconds: +total.toFixed(1), errs }));
  await ctx.close(); await b.close();
})();

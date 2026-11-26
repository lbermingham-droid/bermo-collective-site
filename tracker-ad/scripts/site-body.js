// Lifts the body figure out of the demo app (today's class lit, and an
// all-grey copy) as transparent cutouts for the website clip.
const { chromium } = require("playwright"); const path = require("path");
const OUT = path.join(__dirname, "..", "public", "site");
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CI ? undefined : "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const p = await ctx.newPage();
  await p.goto("http://127.0.0.1:8901/tracker/?demo=gym&view=member", { waitUntil: "load" }); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('[data-tab="fitness"]').click()); await p.waitForTimeout(800);
  const grab = () => p.evaluate(() => { const svg = document.querySelector("#muscleMapCard .mm-svg"); const c = svg.cloneNode(true);
    const src = svg.querySelectorAll("path"), dst = c.querySelectorAll("path");
    src.forEach((el, i) => { const cs = getComputedStyle(el); dst[i].setAttribute("style", `fill:${cs.fill};stroke:${cs.stroke};stroke-width:${cs.strokeWidth};stroke-linejoin:round`); });
    return c.outerHTML; });
  console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("#muscleMapCard .mm-lists > div, #muscleMapCard .mm-add")].map(d => d.innerText.replace(/\n/g, " | ")))));
  const front = await grab(); await p.evaluate(() => document.getElementById("mmFlip").click()); await p.waitForTimeout(500); const back = await grab();
  // the app is violet since v65; the "off" copy just greys the worked muscles
  const grey = (h) => h.replace(/fill: ?rgb\(124, 108, 255\)/g, "fill:rgb(74, 76, 86)").replace(/fill: ?rgb\(91, 97, 112\)/g, "fill:rgb(74, 76, 86)");
  const acc = (h) => h.replace(/fill: ?rgb\(91, 97, 112\)/g, "fill:rgb(74, 76, 86)");
  const p2 = await ctx.newPage();
  for(const [name, html] of [["body-front", acc(front)], ["body-front-off", grey(front)], ["body-back", acc(back)], ["body-back-off", grey(back)]]){
    await p2.setContent(`<html><body style="margin:0;background:transparent"><div id="w" style="width:360px;height:760px;display:flex;justify-content:center">${html.replace('class="mm-svg"', 'style="height:760px;width:auto"')}</div></body></html>`);
    await (await p2.$("#w")).screenshot({ path: path.join(OUT, name + ".png"), omitBackground: true });
  }
  await b.close();
})();

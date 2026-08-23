// BERMO Tracker — WEEK DURABILITY.
// Written the day she said "my week of workouts ruined if this does not
// work". Plans a real week, logs it, reloads, edits, reloads again, and
// proves nothing is lost. Run this alongside smoke.js before every push.
// It caught a data-loss bug: the sets editor opened blank over a workout
// logged in the live session, and saving one set deleted all five.
const { chromium } = require("playwright");
const OUT="/tmp/claude-0/-home-user-bermo-collective-site/c7d32ac6-d4be-5d4f-8642-fda62668f4a6/scratchpad";
const R=[]; const ok=(n,d)=>R.push(["PASS",n,d]); const bad=(n,d)=>R.push(["FAIL",n,d]);
(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass:"127.0.0.1,localhost" } : undefined;
  const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium", proxy });
  const ctx = await b.newContext({ viewport:{width:390,height:844} });
  const p = await ctx.newPage(); p.setDefaultTimeout(9000);
  const errs=[]; p.on("pageerror",e=>errs.push(String(e.message)));
  await p.goto("http://127.0.0.1:8901/tracker/",{waitUntil:"load",timeout:20000});
  await p.waitForTimeout(1200);
  await p.fill("#wizName","Lexi"); await p.click("#wizNext"); await p.waitForTimeout(250);
  await p.click("#wizNext"); await p.waitForTimeout(400); await p.click("#wizApply"); await p.waitForTimeout(1000);
  const tabSel = (await p.isVisible('.mtab[data-tab="fitness"]')) ? ".mtab" : ".tab";

  const openDay = async (offset) => {
    await p.evaluate(o => {
      const d=new Date(); d.setDate(d.getDate()+o);
      const k=d.toISOString().slice(0,10);
      const el=[...document.querySelectorAll("#fitWeekList .fw-row")].find(r=>r.dataset.date===k);
      if(el) el.click(); 
    }, offset);
    await p.waitForTimeout(700);
    return p.evaluate(()=> !!document.getElementById("dsBuild"));
  };
  const buildPick = async (names) => {
    await p.click("#dsBuild"); await p.waitForTimeout(800);
    for(const n of names){
      await p.fill("#bwSearch", n); await p.waitForTimeout(450);
      await p.evaluate(nm => {
        const r=[...document.querySelectorAll("#bwList .bw-row")]
          .find(x=>x.querySelector(".mrow-title").textContent.trim().toLowerCase()===nm.toLowerCase());
        if(r) r.click();
      }, n);
      await p.waitForTimeout(250);
    }
    const sel = await p.evaluate(()=> (document.querySelector("#bwOverlay .wt-eyebrow")||{}).textContent);
    await p.click("#bwSave"); await p.waitForTimeout(800);
    return sel;
  };
  const setActivity = async (label) => {
    await p.evaluate(l => {
      const s=document.getElementById("dsType");
      const o=[...s.options].find(x=>x.textContent.trim()===l);
      if(o){ s.value=o.value; s.dispatchEvent(new Event("change",{bubbles:true})); }
    }, label);
    await p.waitForTimeout(400);
  };
  const saveDay = async () => { await p.click("#dsSave"); await p.waitForTimeout(800); };

  await p.click(`${tabSel}[data-tab="fitness"]`); await p.waitForTimeout(600);

  // ---- plan a real week: 3 lifting days + 1 cardio ----
  const plans = [
    { off:0, act:"Legs",  ex:["Back Squat","Hip Thrust"] },
    { off:1, act:"Chest", ex:["Bench Press"] },
    { off:2, act:"Back",  ex:["Lat Pulldown"] },
  ];
  for(const pl of plans){
    const opened = await openDay(pl.off);
    if(!opened){ bad(`day +${pl.off} opens`, "no sheet"); continue; }
    await setActivity(pl.act);
    const sel = await buildPick(pl.ex);
    await saveDay();
    ok(`day +${pl.off} planned`, `${pl.act} / ${sel}`);
  }

  // ---- reload: is the week still there? ----
  await p.reload({waitUntil:"domcontentloaded",timeout:20000}); await p.waitForTimeout(1400);
  const afterReload = await p.evaluate(() => {
    const st=JSON.parse(localStorage.getItem("bermo.tracker.v1"));
    const out={};
    Object.entries(st.plan||{}).forEach(([wk,days])=>{
      Object.entries(days).forEach(([dn,d])=>{ out[dn]={type:d.type,ex:(d.exercises||[]).map(e=>e.name)}; });
    });
    return out;
  });
  const planned = Object.values(afterReload).filter(d=>d.ex.length);
  planned.length >= 3 ? ok("week survives reload", JSON.stringify(afterReload))
                      : bad("week survives reload", JSON.stringify(afterReload));

  // ---- log sets on today, reload, verify they're in the LOG ----
  await p.click(`${tabSel}[data-tab="fitness"]`); await p.waitForTimeout(600);
  await openDay(0);
  await p.evaluate(()=>{ const r=document.querySelector("#dsList .ds-row"); if(r) r.click(); });
  await p.waitForTimeout(700);
  await p.fill(".lset .lset-reps","8"); await p.fill(".lset .lset-w","95");
  await p.click("#lsAdd"); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const rows=[...document.querySelectorAll(".lset")]; const r=rows[1];
    r.querySelector(".lset-reps").value="6"; r.querySelector(".lset-w").value="115"; });
  await p.click("#lsSave"); await p.waitForTimeout(900);

  await p.reload({waitUntil:"domcontentloaded",timeout:20000}); await p.waitForTimeout(1400);
  const logged = await p.evaluate(()=>{
    const st=JSON.parse(localStorage.getItem("bermo.tracker.v1"));
    const k=new Date().toISOString().slice(0,10);
    const ss=(st.days[k]||{}).sessions||[];
    const dn=["sun","mon","tue","wed","thu","fri","sat"][new Date(k+"T12:00:00").getDay()];
    let planEx=[];
    Object.values(st.plan||{}).forEach(d=>{ if(d[dn]) planEx=(d[dn].exercises||[]).map(e=>({n:e.name,sets:(e.sets||[]).length})); });
    return { sessions: ss.map(x=>({n:x.name,r:x.reps,w:x.weight})), planEx };
  });
  const sq = logged.sessions.filter(x=>/back squat/i.test(x.n));
  (sq.length===2 && sq.some(x=>x.r===8&&x.w===95) && sq.some(x=>x.r===6&&x.w===115))
    ? ok("sets logged + survive reload", JSON.stringify(logged.sessions))
    : bad("sets logged + survive reload", JSON.stringify(logged));
  // the plan must still hold the OTHER exercise (Hip Thrust) untouched
  (logged.planEx.length===2 && logged.planEx.some(e=>/hip thrust/i.test(e.n)))
    ? ok("editing one lift does not drop the others", JSON.stringify(logged.planEx))
    : bad("editing one lift does not drop the others", JSON.stringify(logged.planEx));

  // ---- re-open and CANCEL: must not destroy anything ----
  await p.click(`${tabSel}[data-tab="fitness"]`); await p.waitForTimeout(600);
  await openDay(0);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll("#modal [data-close]")][0]; if(b) b.click(); });
  await p.waitForTimeout(600);
  const afterCancel = await p.evaluate(()=>{
    const st=JSON.parse(localStorage.getItem("bermo.tracker.v1"));
    const k=new Date().toISOString().slice(0,10);
    const dn=["sun","mon","tue","wed","thu","fri","sat"][new Date(k+"T12:00:00").getDay()];
    let ex=[]; Object.values(st.plan||{}).forEach(d=>{ if(d[dn]) ex=(d[dn].exercises||[]).map(e=>e.name); });
    return { ex, sessions:((st.days[k]||{}).sessions||[]).length };
  });
  (afterCancel.ex.length===2 && afterCancel.sessions===2)
    ? ok("cancel preserves the day", JSON.stringify(afterCancel))
    : bad("cancel preserves the day", JSON.stringify(afterCancel));

  // ---- re-open and SAVE with no changes: must not wipe fields ----
  await openDay(0);
  await saveDay();
  const afterResave = await p.evaluate(()=>{
    const st=JSON.parse(localStorage.getItem("bermo.tracker.v1"));
    const k=new Date().toISOString().slice(0,10);
    const dn=["sun","mon","tue","wed","thu","fri","sat"][new Date(k+"T12:00:00").getDay()];
    let d={}; Object.values(st.plan||{}).forEach(x=>{ if(x[dn]) d=x[dn]; });
    return { type:d.type, ex:(d.exercises||[]).map(e=>({n:e.name,sets:(e.sets||[]).length})),
             sessions:((st.days[k]||{}).sessions||[]).length };
  });
  (afterResave.ex.length===2 && afterResave.type && afterResave.sessions===2
    && afterResave.ex.some(e=>e.sets===2))
    ? ok("re-save keeps sets + type", JSON.stringify(afterResave))
    : bad("re-save keeps sets + type", JSON.stringify(afterResave));

  // ---- THE KILLER: log in the live session, then open the day sheet ----
  // Five sets logged live. The plan carries no `sets`, so the editor used to
  // open blank and one save wiped all five.
  await p.evaluate(()=>{
    const k=new Date().toISOString().slice(0,10);
    const st=JSON.parse(localStorage.getItem("bermo.tracker.v1"));
    st.days[k]=st.days[k]||{meals:{breakfast:[],lunch:[],dinner:[],snacks:[]},sessions:[]};
    st.days[k].sessions=[
      {id:"l1",name:"Hip Thrust",weight:135,reps:12,sets:1,type:"strength"},
      {id:"l2",name:"Hip Thrust",weight:155,reps:10,sets:1,type:"strength"},
      {id:"l3",name:"Hip Thrust",weight:175,reps:8,sets:1,type:"strength"},
      {id:"l4",name:"Hip Thrust",weight:185,reps:6,sets:1,type:"strength"},
      {id:"l5",name:"Hip Thrust",weight:185,reps:6,sets:1,type:"strength"},
    ];
    localStorage.setItem("bermo.tracker.v1", JSON.stringify(st));
  });
  await p.reload({waitUntil:"domcontentloaded",timeout:20000}); await p.waitForTimeout(1400);
  await p.click(`${tabSel}[data-tab="fitness"]`); await p.waitForTimeout(600);
  await openDay(0);
  await p.evaluate(()=>{
    const r=[...document.querySelectorAll("#dsList .ds-row")]
      .find(x=>/hip thrust/i.test(x.querySelector(".mrow-title").textContent));
    if(r) r.click();
  });
  await p.waitForTimeout(800);
  const shown = await p.evaluate(()=> [...document.querySelectorAll(".lset")].map(r=>({
    reps:r.querySelector(".lset-reps").value, w:r.querySelector(".lset-w").value })));
  (shown.length===5 && shown[0].reps==="12" && shown[4].w==="185")
    ? ok("live-session sets appear in the editor", JSON.stringify(shown))
    : bad("live-session sets appear in the editor", JSON.stringify(shown));
  await p.click("#lsSave"); await p.waitForTimeout(900);
  const kept = await p.evaluate(()=>{
    const st=JSON.parse(localStorage.getItem("bermo.tracker.v1"));
    const k=new Date().toISOString().slice(0,10);
    return ((st.days[k]||{}).sessions||[]).filter(x=>/hip thrust/i.test(x.name)).length;
  });
  kept===5 ? ok("saving the editor does NOT destroy the logged workout", kept+" sets")
           : bad("saving the editor does NOT destroy the logged workout", kept+" sets left of 5");

  console.log("\n===== WEEK DURABILITY =====");
  R.forEach(([s,n,d])=>console.log(s.padEnd(5),n,"—",d));
  console.log("PAGE ERRORS:", errs.length, errs.slice(0,4));
  console.log(`${R.filter(r=>r[0]==="PASS").length}/${R.length}`);
  await b.close();
})();

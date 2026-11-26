// Node test for the ChatGPT API core (no Netlify, fake store).
//   node tracker/tests/gpt-core.mjs
import { handle, validateAction, summary, liftBests, weekKey, weekStartKey } from "../../netlify/gpt-core.mjs";

const R = []; const ok = (n, d) => R.push(["PASS", n, d || ""]); const bad = (n, d) => R.push(["FAIL", n, d || ""]);
const eq = (n, a, b) => (JSON.stringify(a) === JSON.stringify(b) ? ok(n) : bad(n, JSON.stringify(a) + " != " + JSON.stringify(b)));

function fakeStore(){
  const m = new Map();
  return {
    async get(k){ return m.has(k) ? JSON.parse(m.get(k)) : null; },
    async setJSON(k, v){ m.set(k, JSON.stringify(v)); },
    async list({ prefix }){ return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; },
    async delete(k){ m.delete(k); },
    _m: m,
  };
}
const TOKEN = "test-token-0123456789abcdef";
const env = { GPT_API_TOKEN: TOKEN };
const base = "https://example.netlify.app/api/gpt";
const req = (path, init = {}, auth = true) => {
  const headers = { "content-type": "application/json", ...(init.headers || {}) };
  if(auth) headers.authorization = "Bearer " + TOKEN;
  return new Request(base + path, { ...init, headers });
};

const state = {
  profile: { name: "Lexi", units: "imperial" },
  goals: { cal: 1500, protein: 130, carbs: 130, fat: 50, water: 80 },
  days: {
    "2026-11-09": { meals: { breakfast: [{ name: "Eggs", cal: 210, p: 18, c: 1, f: 15 }], lunch: [], dinner: [], snacks: [] }, water: 40,
      sessions: [{ name: "Back Squat", type: "strength", weight: 135, reps: 5, sets: 1 }, { name: "Back Squat", type: "strength", weight: 155, reps: 3, sets: 1 }, { name: "Walk", type: "cardio", durationMin: 30 }] },
  },
  weights: [{ date: "2026-11-09", val: 142.2 }],
  prs: { "Back Squat": { val: 170, date: "2026-11-09", unit: "lb" } },
  plan: { "2026-W45": { mon: { type: "Legs", lines: [{ id: "a", text: "Legs", done: false }, { id: "b", text: "Back Squat", done: true }] } } },
};

(async () => {
  // dates: the app keys plans by the Sunday's ISO week
  eq("week start of a Monday is the Sunday", weekStartKey("2026-11-09"), "2026-11-08");
  eq("week key matches the app", weekKey("2026-11-08"), "2026-W45");

  // validate
  let v = validateAction({ meals: { lunch: [{ name: "Chicken bowl", cal: 520, p: 42, c: 50, f: 14 }] } }, "2026-11-09");
  v.action && v.action.date === "2026-11-09" && v.count === 1 ? ok("meal action validates, defaults to today") : bad("meal action", JSON.stringify(v));
  v = validateAction({ sessions: [{ name: "Legs", lifts: [{ exercise: "Back Squat", sets: [{ weight: 9999, reps: 5 }, { weight: 135, reps: 0 }] }] }] }, "2026-11-09");
  v.action && v.action.sessions[0].lifts[0].sets.length === 1 && v.action.sessions[0].lifts[0].sets[0].weight === 2000 ? ok("sets clamp weight, drop zero-rep sets") : bad("sets clamp", JSON.stringify(v));
  v = validateAction({ date: "not-a-date", water_oz: 20 }, "2026-11-09");
  v.action && v.action.date === "2026-11-09" ? ok("bad date falls back to today") : bad("bad date", JSON.stringify(v));
  v = validateAction({}, "2026-11-09"); v.error ? ok("empty action rejected") : bad("empty action accepted");
  v = validateAction({ plan: { lines: ["Legs", "Back Squat"], mode: "replace" } }, "2026-11-10");
  v.action && v.action.plan.mode === "replace" && v.action.plan.lines.length === 2 ? ok("plan action validates") : bad("plan action", JSON.stringify(v));

  // read side (pure)
  const s = summary(state, "2026-11-09", "2026-11-09");
  s.days[0].totals.cal === 210 && s.days[0].sessions.length === 3 && s.days[0].weight === 142.2 && s.days[0].water_oz === 40 ? ok("summary day has totals, sessions, weight, water") : bad("summary day", JSON.stringify(s.days[0]));
  eq("summary plan lines for Monday", s.plan.days["2026-11-09"].lines.map(l => l.text), ["Legs", "Back Squat"]);
  const lifts = liftBests(state);
  lifts[0].lift === "Back Squat" && lifts[0].heaviest.weight === 155 && lifts[0].est_1rm.value === 171 ? ok("lift bests: heaviest and Epley") : bad("lift bests", JSON.stringify(lifts));

  // router
  const store = fakeStore();
  let r = await handle(req("/openapi.json", {}, false), store, env);
  const spec = await r.json();
  spec.openapi === "3.1.0" && spec.servers[0].url === base && spec.paths["/actions"].post ? ok("openapi served without auth") : bad("openapi", JSON.stringify(spec).slice(0, 200));
  r = await handle(req("/summary", {}, false), store, env); r.status === 401 ? ok("no token -> 401") : bad("no token", r.status);
  r = await handle(req("/summary", { headers: { authorization: "Bearer wrong-token-xxxxxxxxxxxxxxx" } }, false), store, env); r.status === 401 ? ok("wrong token -> 401") : bad("wrong token", r.status);
  r = await handle(req("/summary"), store, { GPT_API_TOKEN: "" }); r.status === 503 ? ok("unset token -> 503 not configured") : bad("unset token", r.status);
  r = await handle(req("/summary"), store, env); r.status === 404 ? ok("no snapshot yet -> 404 with guidance") : bad("no snapshot", r.status);

  r = await handle(req("/state", { method: "PUT", body: JSON.stringify({ state, today: "2026-11-09" }) }), store, env);
  r.status === 200 ? ok("app pushes snapshot") : bad("push", r.status + " " + await r.text());
  r = await handle(req("/summary"), store, env); let j = await r.json();
  j.range.from === "2026-11-03" && j.range.to === "2026-11-09" && j.days.length === 7 && j.today === "2026-11-09" ? ok("summary defaults to 7 days ending the phone's today") : bad("summary range", JSON.stringify(j.range));
  r = await handle(req("/day/2026-11-09"), store, env); j = await r.json(); j.totals.cal === 210 ? ok("day endpoint") : bad("day", JSON.stringify(j));
  r = await handle(req("/plan?date=2026-11-11"), store, env); j = await r.json(); j.week_of === "2026-11-08" ? ok("plan endpoint uses the Sunday week") : bad("plan", JSON.stringify(j));
  r = await handle(req("/lifts"), store, env); j = await r.json(); j.lifts.length === 1 ? ok("lifts endpoint") : bad("lifts", JSON.stringify(j));

  r = await handle(req("/actions", { method: "POST", body: JSON.stringify({ meals: { dinner: [{ name: "Salmon", cal: 400, p: 35, c: 0, f: 25 }] }, water_oz: 16 }) }), store, env);
  j = await r.json(); j.queued && j.items === 2 && j.date === "2026-11-09" ? ok("ChatGPT queues an action") : bad("queue", JSON.stringify(j));
  const id = j.id;
  r = await handle(req("/actions", { method: "POST", body: "{not json" }), store, env); r.status === 400 ? ok("bad JSON -> 400") : bad("bad json", r.status);
  r = await handle(req("/actions"), store, env); j = await r.json(); j.pending.length === 1 && j.pending[0].action.meals.dinner[0].name === "Salmon" ? ok("pending list shows it") : bad("pending", JSON.stringify(j));
  r = await handle(req("/actions/ack", { method: "POST", body: JSON.stringify({ ids: [id] }) }), store, env); j = await r.json(); j.acked === 1 ? ok("app acks") : bad("ack", JSON.stringify(j));
  r = await handle(req("/actions"), store, env); j = await r.json(); j.pending.length === 0 ? ok("queue empty after ack") : bad("after ack", JSON.stringify(j));
  r = await handle(req("/health", {}, false), store, env); j = await r.json(); j.configured && j.has_state ? ok("health") : bad("health", JSON.stringify(j));
  r = await handle(req("/nope"), store, env); r.status === 404 ? ok("unknown -> 404") : bad("unknown", r.status);

  console.log("\n===== GPT CORE =====");
  R.forEach(([s, n, d]) => console.log(`${s}  ${n}${d ? " — " + d : ""}`));
  const f = R.filter(x => x[0] === "FAIL").length;
  console.log(`\n${R.length - f}/${R.length}`);
  process.exit(f ? 1 : 0);
})();

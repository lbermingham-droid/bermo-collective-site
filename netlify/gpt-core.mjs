// BERMO Tracker — ChatGPT API core. Pure logic, no Netlify imports, so it
// runs in Node for tests and in the Deno edge runtime for real.
//
// Model: the phone is still the source of truth. The app PUSHES a snapshot
// of its state here after every save; ChatGPT READS from that snapshot and
// WRITES by queueing actions, which the app pulls and applies through its
// own one write path (logSession, meals, plan lines). Nothing here mutates
// the snapshot, so there is no second writer to fight the phone.
//
// Store interface (Netlify Blobs or a fake in tests):
//   get(key, {type:"json"}) -> value|null, setJSON(key, value),
//   list({prefix}) -> {blobs:[{key}]}, delete(key)

export const API_VERSION = "1";
const SLOTS = ["breakfast", "lunch", "dinner", "snacks"];
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MAX_STATE_BYTES = 4 * 1024 * 1024;
const MAX_ACTION_BYTES = 64 * 1024;
const MAX_PENDING = 200;

// ---- auth -------------------------------------------------------------
export function safeEqual(a, b){
  a = String(a || ""); b = String(b || "");
  if(a.length !== b.length) return false;
  let r = 0;
  for(let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export function bearer(req){
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if(m) return m[1].trim();
  return (req.headers.get("x-api-key") || "").trim();
}
export function authorized(req, token){
  if(!token || token.length < 16) return false;
  return safeEqual(bearer(req), token);
}

// ---- dates ------------------------------------------------------------
export const isDateKey = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !isNaN(new Date(s + "T12:00:00").getTime());
export function dateKey(d){
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export function addDays(key, n){ const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + n); return dateKey(d); }
// The app keys plans by the SUNDAY's ISO week (weekKey(weekStart(d))).
export function weekStartKey(key){ const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() - d.getDay()); return dateKey(d); }
export function weekKey(key){
  const d = new Date(key + "T12:00:00"); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const y0 = new Date(d.getFullYear(), 0, 1);
  const w = Math.ceil(((d - y0) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(w).padStart(2, "0")}`;
}
const round1 = (n) => Math.round((+n || 0) * 10) / 10;

// ---- read side ---------------------------------------------------------
function totals(day){
  const t = { cal: 0, p: 0, c: 0, f: 0 };
  SLOTS.forEach(s => ((day.meals || {})[s] || []).forEach(it => { t.cal += +it.cal || 0; t.p += +it.p || 0; t.c += +it.c || 0; t.f += +it.f || 0; }));
  return { cal: Math.round(t.cal), p: round1(t.p), c: round1(t.c), f: round1(t.f) };
}
function epley(w, r){ return r > 0 && w > 0 ? Math.round(w * (1 + r / 30)) : 0; }

export function daySummary(state, key){
  const day = (state.days || {})[key] || {};
  const units = (state.profile || {}).units === "metric" ? "kg" : "lb";
  const meals = {};
  SLOTS.forEach(s => { meals[s] = ((day.meals || {})[s] || []).map(it => ({ name: it.name, serving: it.serving || "", cal: Math.round(+it.cal || 0), p: round1(it.p), c: round1(it.c), f: round1(it.f) })); });
  const sessions = (day.sessions || []).map(s => {
    const o = { name: s.name, type: s.type === "cardio" ? "cardio" : (s.type === "wod" ? "wod" : "lift") };
    if(o.type === "cardio"){ if(s.durationMin != null) o.duration_min = +s.durationMin || 0; }
    else { o.weight = +s.weight || 0; o.reps = +s.reps || 0; o.sets = +s.sets || 1; }
    if(s.durationMin && o.type !== "cardio") o.duration_min = +s.durationMin;
    return o;
  });
  const weight = (state.weights || []).filter(w => w.date === key).map(w => +w.val).pop();
  const out = { date: key, weekday: DAYS[new Date(key + "T12:00:00").getDay()], units, meals, totals: totals(day), water_oz: +day.water || 0, sessions };
  if(weight != null) out.weight = weight;
  if(day.activity) out.activity = { move: +day.activity.move || 0, exercise_min: +day.activity.exercise || 0, stand: +day.activity.stand || 0 };
  if(day.checkin) out.checkin = day.checkin;
  out.plan = planLines(state, key);
  return out;
}

export function planLines(state, key){
  const wk = weekKey(weekStartKey(key)), dn = DAYS[new Date(key + "T12:00:00").getDay()];
  const d = ((state.plan || {})[wk] || {})[dn];
  if(!d) return [];
  if(Array.isArray(d.lines) && d.lines.length) return d.lines.map(l => ({ text: l.text, done: !!l.done }));
  const lines = [];
  if(d.type) lines.push({ text: d.type, done: !!d.done });
  (d.extra || []).forEach(x => lines.push({ text: x.name, done: false }));
  (d.exercises || []).forEach(e => lines.push({ text: e.name, done: (e.sets || []).some(s => s.done) }));
  return lines;
}

export function weekPlan(state, key){
  const start = weekStartKey(key);
  const days = {};
  for(let i = 0; i < 7; i++){ const k = addDays(start, i); days[k] = { weekday: DAYS[i], lines: planLines(state, k) }; }
  return { week_of: start, days };
}

export function liftBests(state){
  const by = {};
  Object.entries(state.days || {}).forEach(([k, day]) => (day.sessions || []).forEach(s => {
    if(s.type === "cardio" || !s.name || !(+s.weight > 0)) return;
    const b = by[s.name] = by[s.name] || { lift: s.name, sessions: new Set(), heaviest: null, est_1rm: null, last: null };
    b.sessions.add(k);
    const w = +s.weight, r = +s.reps || 0, e = epley(w, r);
    if(!b.heaviest || w > b.heaviest.weight) b.heaviest = { weight: w, reps: r, date: k };
    if(e && (!b.est_1rm || e > b.est_1rm.value)) b.est_1rm = { value: e, date: k };
    if(!b.last || k > b.last) b.last = k;
  }));
  const units = (state.profile || {}).units === "metric" ? "kg" : "lb";
  return Object.values(by).map(b => ({ ...b, sessions: b.sessions.size, units })).sort((a, b) => (b.last > a.last ? 1 : -1));
}

export function summary(state, from, to){
  const days = [];
  for(let k = from; k <= to; k = addDays(k, 1)) days.push(daySummary(state, k));
  const p = state.profile || {}, g = state.goals || {};
  return {
    api_version: API_VERSION,
    profile: { name: p.name || "", units: p.units === "metric" ? "kg" : "lb" },
    goals: { cal: g.cal, protein: g.protein, carbs: g.carbs, fat: g.fat, water_oz: g.water, goal_weight: g.weight || null },
    range: { from, to },
    days,
    plan: weekPlan(state, to),
    prs: Object.fromEntries(Object.entries(state.prs || {}).slice(0, 60).map(([k, v]) => [k, { est_1rm: v.val, date: v.date, units: v.unit }])),
  };
}

// ---- write side: validate an action -------------------------------------
const num = (v, lo, hi) => { const n = +v; return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0; };
export function validateAction(body, today){
  if(!body || typeof body !== "object" || Array.isArray(body)) return { error: "Body must be a JSON object." };
  const a = { date: isDateKey(body.date) ? body.date : today, source: "chatgpt" };
  let n = 0;
  if(body.meals && typeof body.meals === "object"){
    a.meals = {};
    SLOTS.forEach(s => {
      const items = Array.isArray(body.meals[s]) ? body.meals[s].slice(0, 30) : [];
      const clean = items.filter(it => it && typeof it.name === "string" && it.name.trim()).map(it => ({
        name: it.name.trim().slice(0, 80), serving: String(it.serving || "").slice(0, 40),
        cal: Math.round(num(it.cal, 0, 5000)), p: round1(num(it.p, 0, 500)), c: round1(num(it.c, 0, 1000)), f: round1(num(it.f, 0, 500)),
      }));
      if(clean.length){ a.meals[s] = clean; n += clean.length; }
    });
    if(!n) delete a.meals;
  }
  if(Array.isArray(body.sessions)){
    a.sessions = body.sessions.slice(0, 20).filter(s => s && typeof s === "object").map(s => {
      const type = ["lift", "cardio", "wod"].includes(s.type) ? s.type : (Array.isArray(s.lifts) && s.lifts.length ? "lift" : "wod");
      const o = { name: String(s.name || (type === "lift" ? "Workout" : type)).slice(0, 60), type };
      if(s.duration_min != null) o.duration_min = Math.round(num(s.duration_min, 0, 600));
      if(Array.isArray(s.lifts)){
        o.lifts = s.lifts.slice(0, 30).filter(l => l && typeof l.exercise === "string" && l.exercise.trim()).map(l => ({
          exercise: l.exercise.trim().slice(0, 60),
          sets: (Array.isArray(l.sets) ? l.sets.slice(0, 20) : []).map(st => ({ weight: num(st && st.weight, 0, 2000), reps: Math.round(num(st && st.reps, 0, 200)) })).filter(st => st.reps > 0),
        })).filter(l => l.sets.length);
        n += o.lifts.reduce((c, l) => c + l.sets.length, 0);
      }
      if(!o.lifts || !o.lifts.length){ delete o.lifts; n++; }
      return o;
    });
    if(!a.sessions.length) delete a.sessions;
  }
  if(body.water_oz != null){ a.water_oz = num(body.water_oz, 0, 400); if(a.water_oz > 0) n++; else delete a.water_oz; }
  if(body.weight != null){ a.weight = round1(num(body.weight, 20, 1000)); n++; }
  if(body.plan && typeof body.plan === "object" && Array.isArray(body.plan.lines)){
    const lines = body.plan.lines.filter(l => typeof l === "string" && l.trim()).map(l => l.trim().slice(0, 80)).slice(0, 20);
    if(lines.length || body.plan.mode === "replace"){ a.plan = { lines, mode: body.plan.mode === "replace" ? "replace" : "add" }; n++; }
  }
  if(typeof body.note === "string" && body.note.trim()) a.note = body.note.trim().slice(0, 500);
  if(!n) return { error: "Nothing to log. Send meals, sessions, water_oz, weight or plan." };
  return { action: a, count: n };
}

// ---- OpenAPI ------------------------------------------------------------
export function openapi(origin){
  const item = { type: "object", required: ["name", "cal"], properties: { name: { type: "string" }, serving: { type: "string" }, cal: { type: "number" }, p: { type: "number", description: "protein g" }, c: { type: "number", description: "carbs g" }, f: { type: "number", description: "fat g" } } };
  const action = {
    type: "object",
    description: "Everything to log for one day. Weights are in the user's unit (see /summary profile.units). Omit anything you do not know; never invent numbers.",
    properties: {
      date: { type: "string", format: "date", description: "YYYY-MM-DD. Defaults to the user's today." },
      meals: { type: "object", properties: { breakfast: { type: "array", items: item }, lunch: { type: "array", items: item }, dinner: { type: "array", items: item }, snacks: { type: "array", items: item } } },
      sessions: { type: "array", items: { type: "object", properties: {
        name: { type: "string" }, type: { type: "string", enum: ["lift", "cardio", "wod"] }, duration_min: { type: "integer" },
        lifts: { type: "array", items: { type: "object", required: ["exercise", "sets"], properties: { exercise: { type: "string" }, sets: { type: "array", items: { type: "object", required: ["reps"], properties: { weight: { type: "number" }, reps: { type: "integer" } } } } } } },
      } } },
      water_oz: { type: "number" },
      weight: { type: "number", description: "body weight in the user's unit" },
      plan: { type: "object", description: "Planned workout lines for that day, e.g. ['Legs','Back Squat','Hip Thrust'].", properties: { lines: { type: "array", items: { type: "string" } }, mode: { type: "string", enum: ["add", "replace"], default: "add" } } },
      note: { type: "string" },
    },
  };
  const auth = [{ bearer: [] }];
  const ok = (schema) => ({ "200": { description: "OK", content: { "application/json": { schema: schema || { type: "object" } } } } });
  return {
    openapi: "3.1.0",
    info: { title: "BERMO Tracker", version: API_VERSION, description: "Read the user's nutrition, workouts, body weight and weekly plan, and log new entries. Entries are queued and applied the next time the app is open on the user's phone." },
    servers: [{ url: origin + "/api/gpt" }],
    components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } }, schemas: { Action: action } },
    security: auth,
    paths: {
      "/summary": { get: { operationId: "getSummary", summary: "Days with meals, totals, sessions, weight and the week plan.", parameters: [
        { name: "from", in: "query", schema: { type: "string", format: "date" }, description: "Default: 6 days before 'to'." },
        { name: "to", in: "query", schema: { type: "string", format: "date" }, description: "Default: the user's today." },
      ], responses: ok() } },
      "/day/{date}": { get: { operationId: "getDay", summary: "One day in full.", parameters: [{ name: "date", in: "path", required: true, schema: { type: "string", format: "date" } }], responses: ok() } },
      "/plan": { get: { operationId: "getPlan", summary: "The planned workout lines for the week containing a date.", parameters: [{ name: "date", in: "query", schema: { type: "string", format: "date" } }], responses: ok() } },
      "/lifts": { get: { operationId: "getLifts", summary: "Every lift ever logged with heaviest set and estimated 1RM.", responses: ok() } },
      "/actions": {
        get: { operationId: "listPending", summary: "Entries queued but not yet applied on the phone.", responses: ok() },
        post: { operationId: "logEntries", summary: "Queue meals, workouts, water, weight or a plan for a day.", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Action" } } } }, responses: ok({ type: "object", properties: { id: { type: "string" }, queued: { type: "boolean" }, items: { type: "integer" }, message: { type: "string" } } }) },
      },
    },
  };
}

// ---- router ---------------------------------------------------------------
const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS", "access-control-allow-headers": "authorization, content-type, x-api-key" };

export async function handle(req, store, env){
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/gpt/, "").replace(/\/+$/, "") || "/";
  const method = req.method.toUpperCase();
  if(method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  const token = env.GPT_API_TOKEN || "";

  if(path === "/openapi.json" && method === "GET") return json(openapi(url.origin), 200, CORS);
  if(path === "/health" && method === "GET"){
    const snap = await store.get("state", { type: "json" });
    return json({ ok: true, configured: token.length >= 16, has_state: !!snap, pushed_at: snap ? snap.pushedAt : null }, 200, CORS);
  }
  if(token.length < 16) return json({ error: "Not configured. Set GPT_API_TOKEN (16+ characters) in Netlify environment variables." }, 503, CORS);
  if(!authorized(req, token)) return json({ error: "Unauthorized." }, 401, CORS);

  // --- app <-> server
  if(path === "/state" && method === "PUT"){
    const text = await req.text();
    if(text.length > MAX_STATE_BYTES) return json({ error: "Snapshot too large." }, 413, CORS);
    let body; try{ body = JSON.parse(text); }catch(e){ return json({ error: "Invalid JSON." }, 400, CORS); }
    if(!body || typeof body.state !== "object") return json({ error: "Expected { state, today }." }, 400, CORS);
    const snap = { state: body.state, today: isDateKey(body.today) ? body.today : dateKey(new Date()), pushedAt: new Date().toISOString() };
    await store.setJSON("state", snap);
    return json({ ok: true, pushed_at: snap.pushedAt }, 200, CORS);
  }
  if(path === "/state" && method === "GET"){
    const snap = await store.get("state", { type: "json" });
    if(!snap) return json({ error: "No snapshot yet. Open the app once with the link turned on." }, 404, CORS);
    return json(snap, 200, CORS);
  }
  if(path.startsWith("/actions/") && method === "DELETE"){
    const id = path.slice("/actions/".length);
    if(!/^[\w-]+$/.test(id)) return json({ error: "Bad id." }, 400, CORS);
    await store.delete("queue/" + id);
    return json({ ok: true }, 200, CORS);
  }
  if(path === "/actions/ack" && method === "POST"){
    let body; try{ body = await req.json(); }catch(e){ body = {}; }
    const ids = Array.isArray(body.ids) ? body.ids.filter(x => /^[\w-]+$/.test(String(x))).slice(0, 200) : [];
    for(const id of ids) await store.delete("queue/" + id);
    return json({ ok: true, acked: ids.length }, 200, CORS);
  }

  // --- everything below reads the snapshot
  const snap = await store.get("state", { type: "json" });
  const today = (snap && snap.today) || dateKey(new Date());

  if(path === "/actions" && method === "POST"){
    const text = await req.text();
    if(text.length > MAX_ACTION_BYTES) return json({ error: "Request too large." }, 413, CORS);
    let body; try{ body = JSON.parse(text); }catch(e){ return json({ error: "Invalid JSON." }, 400, CORS); }
    const v = validateAction(body, today);
    if(v.error) return json({ error: v.error }, 400, CORS);
    const pending = await store.list({ prefix: "queue/" });
    if((pending.blobs || []).length >= MAX_PENDING) return json({ error: "Too many unapplied entries. Open the app so it can catch up." }, 429, CORS);
    const id = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
    await store.setJSON("queue/" + id, { id, queuedAt: new Date().toISOString(), action: v.action });
    return json({ id, queued: true, items: v.count, date: v.action.date, message: "Queued. It is applied the next time the app is open on the phone." }, 200, CORS);
  }
  if(path === "/actions" && method === "GET"){
    const pending = await store.list({ prefix: "queue/" });
    const items = [];
    for(const b of (pending.blobs || []).slice(0, MAX_PENDING)){ const it = await store.get(b.key, { type: "json" }); if(it) items.push(it); }
    items.sort((a, b) => (a.queuedAt < b.queuedAt ? -1 : 1));
    return json({ pending: items }, 200, CORS);
  }

  if(!snap) return json({ error: "No data yet. Open the app once with the ChatGPT link turned on so it can send its first snapshot." }, 404, CORS);
  const st = snap.state;

  if(path === "/summary" && method === "GET"){
    const to = isDateKey(url.searchParams.get("to")) ? url.searchParams.get("to") : today;
    let from = isDateKey(url.searchParams.get("from")) ? url.searchParams.get("from") : addDays(to, -6);
    if(from > to) from = to;
    if(addDays(from, 31) < to) from = addDays(to, -31);
    return json({ ...summary(st, from, to), today, pushed_at: snap.pushedAt }, 200, CORS);
  }
  const dm = path.match(/^\/day\/(\d{4}-\d{2}-\d{2})$/);
  if(dm && method === "GET"){
    if(!isDateKey(dm[1])) return json({ error: "Bad date." }, 400, CORS);
    return json(daySummary(st, dm[1]), 200, CORS);
  }
  if(path === "/plan" && method === "GET"){
    const d = isDateKey(url.searchParams.get("date")) ? url.searchParams.get("date") : today;
    return json(weekPlan(st, d), 200, CORS);
  }
  if(path === "/lifts" && method === "GET") return json({ lifts: liftBests(st).slice(0, 200) }, 200, CORS);

  return json({ error: "Not found." }, 404, CORS);
}

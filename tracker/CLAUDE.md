# BERMO Tracker — handoff for the next Claude

**Read this whole file before touching anything.** It is written to get you
productive in one pass and to stop you repeating mistakes that have already
been made and paid for.

---

## 1. Who this is for and what it is

A personal nutrition + fitness + accountability app ("BERMO TRACKER" /
BERMO.Fit) built for **Lexi** (bermocollective.com / BERMO.COLLECTIVE),
a single user with strong, specific opinions. It is a single-page web app
at `/tracker/` inside her marketing site, deployed on Netlify, installable
on iPhone as a PWA. It is deliberately **not** linked from the site nav.

- Repo: `lbermingham-droid/bermo-collective-site`
- Work branch: `claude/fix-links-quick-log-4saeO`
- **Every push must ALSO go to `claude/nutrition-fitness-tracker-iS7XZ`**,
  because draft PR #1 builds the preview from that branch:
  ```
  git push -u origin claude/fix-links-quick-log-4saeO
  git push origin claude/fix-links-quick-log-4saeO:claude/nutrition-fitness-tracker-iS7XZ
  ```
  Forgetting the second push has burned a whole exchange before — she opened
  the link, saw no change, and reported the app as broken.
- Preview: `https://deploy-preview-1--quiet-youtiao-0e2544.netlify.app/tracker/`
  Netlify rebuilds ~60s after a push.
- Current build: **v25**.

### Working with her — read this twice
- **She asked explicitly for no yes-man.** When she is wrong, say so plainly
  and show the evidence. In the last exchange she said the Fitness and
  Dashboard headers "match well"; they matched each other but the title was
  clipping off the right edge on both. Saying so was the correct move.
- **Send the preview link in every single reply.** She has asked for this
  more than once: "Send link. Send every time so I don't have to search."
- **Always bump the version marker** (`index.html` `>vNN<`, the `?v=NN` on
  css/js, and the `sw.js` cache name). It is how she confirms her phone
  actually got the new build. Stale cache has caused several false bug reports.
- She is learning to code but is not an engineer. Plain language. Be honest
  about what is tested vs untested, what costs money, and what is a guess.
- Reference apps she likes and compares against: **MyFitnessPal, Fitbod,
  Strong, MacroFactor, Hevy, Caliber, Fitia, SugarWOD**.

---

## 2. Non-negotiable rules

These are all things she rejected or corrected at least once. Breaking them
means redoing the work.

| Rule | Detail |
|---|---|
| **Palette** | Exactly four accents: electric teal `#00f5d4` (primary), bright blue `#4db8ff`, purple `#b788ff`, hot pink `#ff4d9d`. **No yellow or amber, ever.** No muted/faded blues. |
| **Bright, not faded** | She reported "faded" twice. Causes were: colour-tinted ring tracks, grey text on grey panels, and translucent `rgba(...,.05)` tint fills behind bordered rows. Ring/bar troughs are one neutral `#111622`. |
| **Border rule** | Status = a **full 1px coloured border + matching coloured text**. **Never a left-edge accent rail** — she rejected those explicitly. |
| **Icon rule** | **No emoji in the UI.** Inline stroke SVGs only (`.bi` wrapper, or `INS_ICONS` for insight cards). Emoji are fine in code comments and AI prompts. |
| **Weeks start Sunday** | `weekStart()` is the single source. Plan keys are day-name based. |
| **No military time** | `fmtTime12()` for anything displayed. `<input type=time>` stays 24h internally. |
| **Labels people use** | Not template words. "Templates" became "My meals". "Where you're going" became "Your target". |
| **Everything connects** | Her standing instruction: "always make sure it all works and connects to the dashboard and any other page related. Calendars should all be connected." |

---

## 3. Architecture — the parts that will bite you

### One selected day
`currentDate` is the **single source of truth** for "which day am I looking
at". The dashboard day strip, month strip, nutrition date input, fitness
stats and diary all read and write it. **Never introduce a second date
variable for a view.** Guarded by the smoke test "calendars connected",
which was written after exactly that bug.

### Local-first, and this is the biggest risk in the project
Everything is in `localStorage["bermo.tracker.v1"]`. No account, no server,
no sync. One browser, one device. Clearing site data loses everything.
See §8 — fixing this is the top priority for any serious next step.

`state` shape:
```js
{
  profile, goals,            // goals.plan = the Goal Designer output; goals.cycle = carb cycling
  customFoods, favFoods, recentFoods, mealTemplates,
  days: { "YYYY-MM-DD": {
    meals:{breakfast,lunch,dinner,snacks}, water, sessions[], workoutSession,
    activity:{move,exercise,stand}, checkin:{sleep,energy,mood},
    symptoms[], exposures[], notes[], wodResult
  }},
  weights[], measurements[], prs, prsRep,
  plan: { "YYYY-W##": { mon:{type,time,gym,why,exercises[],extra[]} } },
  cycle, contract, activityGoals, equipment, exPhotos, favLifts,
  workoutLib, customExercises, ai, ui, wodIndex
}
```

### Explicit pipelines — monkey-patching is BANNED
Feature renders are composed in **one place**, the `PIPELINES` block near the
end of `app.js`:
```js
function renderTrends(){
  renderTrendsBase();
  try{ renderBigPicture(); }catch(e){ console.warn("big picture", e); }
  try{ renderWhy(); }catch(e){ console.warn("why", e); }
  ...
}
```
To extend a render, **add a call there**. Do **not** reintroduce
`const _orig = f; f = function(){...}`. The codebase was cleaned of wrapper
chains once already; they made the render order unknowable.

### Single init
Modules register startup code with `onReady(fn)`. One `DOMContentLoaded`
listener runs the queue with each step isolated, so a throw in one step
cannot kill the rest. Bind static elements with `on(sel, evt, fn)` — it
warns instead of crashing when the element is missing.

### Test seam
`window.__bermo` at the end of the IIFE exposes **pure functions only**
(`save`, `parseHealthNote`, `designGoalPlan`, `subMusclesForExercise`,
`whyTags`, `foodTags`, `_pearson`) so the smoke suite can assert on the maths
without driving the UI. **Never put state mutators on it.**

### save() is deliberately defensive — do not simplify it
It was one unguarded `localStorage.setItem`. On quota it threw, the write was
lost, and the exception unwound whatever render was in flight. It now returns
a boolean, never throws, sheds `state.exPhotos` first (photos are always the
cause), then offers an export. Guarded by a smoke test that patches
`Storage.prototype.setItem` to throw.

### Editing app.js
It is **12.6k lines, 381 functions, one IIFE**. New code gets spliced inside
the IIFE before the final `})();`. **A python3 heredoc splice is the working
method** — giant single `Write` calls have caused API stream timeouts. Append
in chunks. Always `node --check tracker/app.js` before committing.

---

## 4. Files

| File | What it is |
|---|---|
| `tracker/index.html` (~1.4k) | SPA shell. Views: dashboard, nutrition, fitness, library, body, goals, trends (**Health**), history, settings. Version marker + `?v=NN` cache-busting. |
| `tracker/app.js` (~12.6k) | Everything. Has a CODE MAP comment at the top. |
| `tracker/styles.css` (~4.1k) | **Layered — bottom wins.** Has a LAYER MAP header. Because legacy layers use `!important`, hide things with a **class**, never inline `style.display`. |
| `tracker/data.js` (~520) | Food DB (~355 items), WOD library, movements, programs, activity levels. |
| `tracker/sw.js` + `manifest.json` | PWA. SW is **network-first for HTML/CSS/JS** so deploys land without a hard refresh; cache-first for images. |
| `tracker/tests/smoke.js` | 26 Playwright tests. See §6. |
| `netlify/functions/ai-parse.js` | Hosted Claude proxy for Brain Dump. Key comes from Netlify env (accepts `ANTHROPIC_API_KEY` plus `BERMO.Fit`-style aliases, with a last-resort scan for anything starting `sk-ant-`). Users need no key. |

### CSS design system (v23/v24) — use these, don't invent new ones
- `.seg` / `.seg-btn` — **every** tab strip. `.food-tabs`, `.subnav`/`.sub-chip`,
  `.sm-scope`/`.sm-tab`, `.meal-slot-row` all map onto it. A smoke test compares
  their computed border-radius and fails if they diverge.
- `.sfield` — search input with icon. 15px font so iOS doesn't zoom on focus.
- `.lrow` — one list row (title / mono sub / heart / +). Used by search results,
  recents, favourites, saved meals, exercise library.
- `.msel` — grouped multi-select with check circles and per-group "All".
- **Elevation ramp** (`:root`): `--surf-0..3` (gradient surfaces, not flat greys),
  `--edge-top` (1px inset white specular highlight), `--lift-1/2` (wide soft
  ambient shadow), `--hairline` (rgba white .055).
  **On near-black, drop shadows are invisible — depth comes from a lit
  surface.** A grey 1px outline reads as a drawn box, which is what made it
  look homemade. Things inside a card step **up** a level, not down.
- **Page skeleton**: `.view.active` is a flex column with a fixed order —
  header(0) → subnav(1) → brain row(2) → stat band(3) → banners(4) →
  content(5). This is why every page's top matches regardless of markup order.
  A smoke test asserts all four page titles share a left edge and don't overflow.

---

## 5. Feature inventory

**Nutrition** — MFP-style diary (per-meal macros, item action sheet, select
mode → save as meal), food modal with **Search / Recent / Favorites / My meals
/ Scan**, OpenFoodFacts search + barcode scan, quick-add-by-hand, water,
calories donut, macros donut, nutrients table, **micronutrients** (real data
only, always reports its own coverage), fiber/sugar goals, inline macro
calculator, red-flag food classifier, carb cycling day tags.

**Fitness** — Sunday-first week list, day card, Fitbod-style live session
logger (inline sets, set kinds, rest timer at the bottom, previous
performance, YouTube how-to), categorised lifts with 1/2/3/5RM drill-down and
percentages, PR tracking, cardio logger (16 MET types incl. uphill walk),
month calendar, **Library** (searchable movements, photos, favourites,
exercise sheet, workout builder), **My Gym** equipment multi-select, muscle
map, body-part coverage, 12-week heatmap, volume chart.

**Body** — weigh-ins, measurements, **manual body-comp entry** (InBody / DEXA /
scale), InBody photo parse (needs an AI key), body composition grid, adaptive
TDEE, weight trend chart.

**Goals** — **Goal Designer** (`designGoalPlan`): asks goal / current numbers /
**target body-fat %** / limits, uses Katch-McArdle when body fat is known,
prescribes protein **per lb of lean mass** (1.15 g/lb in a deficit while
lifting), clamps the deficit by her own calorie floor first and 25% of TDEE
second, and **stretches the timeline rather than shrinking the food** when the
floor binds. Every output editable before saving. Plan card shows progress
toward the body-fat target. Plain-language **BMR vs BMI** and body-fat
explainers. Goal contract, consistency chain, restart card.

**Health** (view id is `view-trends`) — the differentiated part:
- **The bigger picture** — every day with a check-in scores 0–100 on how it
  felt; ranks all inputs against that score, profiles the best third of days
  vs the worst third, and measures **habit stacking**.
- **Health notes** — `parseHealthNote()` runs **locally, no AI**: pulls sleep
  hours, ~45 symptoms mapped onto `COMMON_SYMPTOMS`, and 10 exposures
  (alcohol, gluten, dairy, sugar, caffeine, air quality, travel, stress, poor
  sleep, late meal). Non-destructive. `exposureFindings()` mean-splits each
  exposure against symptoms and energy.
- **Why you changed the plan** — a one-line reason on any planned workout,
  classified into 12 reasons, then `_nightBefore()` profiles the **previous
  day** (sleep, processed %, water, alcohol read from diary item names).
- **Food quality** — gluten / dairy / processed-vs-real / fat share, correlated
  against symptoms, energy and volume. **Binary exposures use a mean split,
  not Pearson r** — that's the honest test.
- **Muscle coverage** — `subMusclesForExercise()` resolves any logged lift to
  the region it trains (back → lats/mid-back/traps/rear delts/erectors; legs →
  quads/adductors/hams/calves; etc.), reports what a workout **missed**, dates
  the gap, and attaches the fix. Week / 4-week scope + a "dropped this week"
  detector.
- v19 correlations (protein×volume, yesterday's calories×today's volume,
  water, sleep, carbs×symptoms), 11-rule insight engine, cycle tracking,
  symptom tracker, charts.

**Cross-cutting** — Brain Dump (natural language + photos → structured log),
reminders (workout wake / water low / end-of-day untracked), Apple Health CSV
import, Apple Watch screenshot parse, JSON export/import, PWA install,
pull-to-refresh.

### Honesty guardrails already built in — keep them
The analysis is only credible because it refuses to overclaim. Do not remove:
- Correlations need ≥6 paired days, show `n` and `r`, and say
  "nothing stands out yet — that's a real result, not an error".
- Fiber/sugar findings only run on days where ≥50% of foods carried **real**
  values, because `totalsDetailFor()` estimates them from carbs otherwise and
  the correlation would just re-discover carbs.
- Micronutrients state their coverage instead of implying a total.
- Food kind is read from the item name; unclassifiable foods count as "mixed"
  rather than being guessed at.
- Exercises the resolver can't place are **named**, not silently dropped.

---

## 6. Testing — required before every commit

```bash
node --check tracker/app.js && node --check tracker/data.js
python3 -m http.server 8901 &          # serve repo root
NODE_PATH=$SCRATCH/node_modules node tracker/tests/smoke.js
```
Playwright is already installed in the scratchpad. Launch chromium with
`executablePath: "/opt/pw-browsers/chromium"` and proxy
`{ server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" }`.
**Do not run `npx playwright install`.**

**Expected: 26/26 and zero page errors.** (Two console errors about
`ERR_CONNECTION_RESET` are the sandbox blocking a CDN — pre-existing, ignore.)

The suite covers: load, wizard, **sideways overflow on every page**, all tabs,
food + lift logging end to end, modal close, dashboard re-render, cross-page
date sync, the v20 health engines, the v21 why layer, the v22 note parser +
goal maths + calorie floor, v23 search-never-dead-ends + nav consistency,
v24 surfaces + header flow, v25 quota safety.

Also do a **screenshot pass** — the scratchpad has working scripts
(`tops.js`, `v20pages.js`, `v23check.js`). Seed state via `localStorage` then
capture. Several bugs were only visible in a screenshot, never in a test.

---

## 7. Hygiene rule (learned the hard way, twice)

Any change that removes or replaces UI **must sweep for orphans in the same
batch**: dead render functions, dead bindings (grep the removed ids/classes
across `app.js`), and dead CSS rules (grep each removed class in `index.html`
and `app.js`; zero refs = delete the rule). Twice, removing a UI block left
`list.innerHTML` referencing an undefined variable, which threw on **every**
render of that page.

---

## 8. Honest state assessment

This is a strong **single-player prototype**: ~19k lines, 26 automated tests,
and an analysis layer that genuinely has no equivalent in MyFitnessPal,
Fitbod or Strong. It is **not** a product yet. In priority order:

1. **No backend.** Everything is in one browser on one device. No account, no
   sync, no server. Clearing site data loses everything, a new phone starts
   over, and there is **no way to know how many users exist** — which makes it
   unfundable regardless of feature quality. Supabase (auth + Postgres + RLS)
   is the natural fit. ~2–3 weeks. **Do this before anything else.**
2. **No privacy policy, no terms, no delete-my-data.** It processes health
   data. This is a legal requirement and an App Store blocker. ~2 days.
3. **No error tracking, no analytics.** If it breaks for her you will never
   know. ~2 days.
4. **Content depth is 1–2% of the incumbents.** 355 foods vs MFP's ~20M
   (OpenFoodFacts covers ~2M packaged goods but few whole foods); 86 exercises
   vs Strong's ~500 and Fitbod's ~1,000 with video. Fix with **USDA FoodData
   Central** (free, official, real micronutrients) and a licensed exercise
   library (wger is open source; ExerciseDB ~$20/mo). ~1–2 weeks.
5. **AI cost is unmetered.** `ai-parse.js` bills the project owner per call
   with no rate limit or per-user cap.
6. **`app.js` is 12.6k lines in one file.** It works and the pipeline
   architecture is sound, but onboarding a second developer is expensive and
   technical diligence will flag it.

### On the App Store question
She asked about this after reading a Perplexity answer written for a
*different* app (her CRM, on Vercel + Supabase). The three options — PWA,
wrapper, native — are correct, but for the tracker specifically:
- The reason to wrap is **HealthKit**, not store presence. A PWA can never
  read Apple Health; that's why the app currently relies on CSV import and
  screenshot parsing.
- Apple rejects thin wrappers under **Guideline 4.2 (Minimum Functionality)**.
  A WebView shell of the current app would likely be rejected; the same shell
  *with* HealthKit sync and real notifications would likely pass.
- iOS PWAs **do** support push since 16.4 when installed to the home screen.
- Costs: Apple $99/yr, Google $25 once.
- **Recommendation: don't chase the store yet.** Distribution is not the
  bottleneck; data integrity is. Backend first.

---

## 9. Backlog

**Blocked on her:**
- Brain Dump is code-complete but the Anthropic account behind the Netlify key
  is out of credits.
- App icon: she wants the KIERA husky photo. Drop a 512×512 at
  `tracker/icon.png` and it ships.
- Moving the tracker to its own repo (asked twice; ~20 min once she says go).
- Weekly buddy-email recap via `send-emails.js` — needs a recipient.
- Twilio SMS (~$2–3/mo) — she hasn't opted in.

**Buildable now:**
- **The empty ring canvases on Food and Fitness.** Flagged twice, still
  unresolved. When the day is empty they're a big dark donut taking real
  estate for zero information. Either show something useful at zero or don't
  reserve the space until there's data. She was asked to choose and hasn't yet.
- **Settings never got the page-by-page design pass** that Dashboard,
  Nutrition, Fitness, Body and Health got. It's still walls of paragraph text.
- Muscle map is geometric, not anatomical (she asked for prettier).
- Muscle coverage reads **logged** sessions only; it could pre-check a
  **planned** workout and warn before she trains.
- USDA FoodData Central for real whole-food micronutrients.

---

## 10. Version history (one line each)

`v7` aggressive IRON restyle · `v8` 6-section IA, dashboard declutter ·
`v9` section rings, volume chart, `partsForExercise()` · `v10` Apple-style ring
deck, multi-workout day editor · `v11` MFP nutrition rebuild · `v12` usable
lifting flow, Sunday weeks, 12h time · `v13` brand retheme to
bermocollective.com · `v15–17` contrast fixes, session rework, lift hub, PR
overhaul, inline macro calc · `v18` Exercise Library w/ photos, month calendar ·
`v19` correlations engine · `v20` sub-muscle gaps, food quality, bigger
picture, carb cycling, dead-UI sweep · `v21` the WHY layer · `v22`
micronutrients, Goal Designer, local health-note parser, manual body comp ·
`v23` food-search dead-end fix, design system, My Gym · `v24` surface, depth
and page-flow rebuild · `v25` `save()` made fail-safe.

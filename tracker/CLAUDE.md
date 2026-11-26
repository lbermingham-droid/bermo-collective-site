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
- Current build: **v65**.

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
| **Palette (changed in v65)** | **ONE accent: violet `#7c6cff`** (`--acc`), with lavender tints (`#9b8cff`, `#b3a9ff`) for secondary data, on true black with white text and neutral iOS greys. She said "I hate the cyan" and the cyan + pink combo — **never reintroduce teal/cyan or pink.** Still no yellow or amber. Red `#ff453a` is for destructive actions only. The old four-accent rule is dead. |
| **Native, not "vibe coded" (v65)** | Filled grey cells (`--cell` `#1c1c1e`, `--cell-2` `#2c2c2e`) on `#000`, hairline separators (`--sep`), **no outlined boxes, no glow, no blur, no gradients on surfaces**. One type family (`--font`: SF on iPhone, Inter elsewhere); the wide display face (`--wide`, Archivo 900) only for hero numbers. Exercise art sits on a raised 3D tile. The whole look lives in the "v65 — NATIVE" layer at the end of `styles.css`; change it there, not with new layers. |
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
  workoutLib, customExercises, ai, ui, wodIndex,
  inbodyScans[],             // body-comp scans (setup wizard + Body page)
  coach: { enabled, members[], logs{memberId:{date:[rows]}}, workouts[], plan{date:workoutId}, att{date:{memberId:true}}, ui },
  gpt:   { token, lastPush, lastPull, applied[] },   // ChatGPT link; never pushed to the server
  schema                     // SCHEMA = 3, migrated in load()
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
It is **~15.2k lines, one IIFE**. New code gets spliced inside
the IIFE before the final `})();`. **A python3 heredoc splice is the working
method** — giant single `Write` calls have caused API stream timeouts. Append
in chunks. Always `node --check tracker/app.js` before committing.

---

## 4. Files

| File | What it is |
|---|---|
| `tracker/index.html` (~1.4k) | SPA shell. Views: dashboard (Home), fitness (Workouts), nutrition, progress, more, lifts, coach, library, body, goals, trends (**Health**), history, settings. Version marker + `?v=NN` cache-busting. |
| `tracker/app.js` (~15.2k) | Everything. Has a CODE MAP comment at the top. |
| `tracker/styles.css` (~5.1k) | **Layered — bottom wins.** Has a LAYER MAP header. Because legacy layers use `!important`, hide things with a **class**, never inline `style.display`. |
| `tracker/data.js` (~520) | Food DB (~355 items), WOD library, movements, programs, activity levels. |
| `tracker/bryl.js` (43KB) | **Workout Guide by Bryl Lim**: 302 exercises, white-on-transparent line art (3 frames; we use frame 1), equipment, primary/secondary muscle. Assets **CC BY-SA 4.0** (76 first poses adapted from Everkinetic). Used unmodified from the npm CDN (`BRYL_IMG(path)`), credited on More. The style that actually matches the dark UI. |
| `tracker/repdb.js` (125KB) | **RepDB free tier** (repdb.co): 701 exercises — name, category, body part, primary/secondary muscles (fine anatomy: gluteus_medius, posterior_deltoid, rhomboids…), bodyweight flag, MET, image kind. Illustrations from jsDelivr via `REPDB_IMG(id, kind)`, cache-first. **Licence requires the visible credit** on the More screen (`.credits`) — never remove it. In-app use only; never republish as a dataset. |
| `tracker/exdb.js` (150KB) | **free-exercise-db**, public domain (The Unlicense): 873 exercises — name, primary/secondary muscles, equipment, category, level. Photos come from jsDelivr (`EXDB_IMG(id, 0|1)`), cache-first in the SW. Regenerate from the upstream `dist/exercises.json` by dropping `instructions` and keeping `{i,n,p,s,e,c,l,m,f}`. |
| `tracker/body.js` (130KB) | **Body figures** — male + female, front + back, every muscle a separate shape. From **react-native-body-highlighter v3.2.0, MIT** (c) 2022 ELABBASSI Hicham; paths unmodified, credited on More. `window.BODYFIG[sex][side] = {vb, o (outline), p:[[ourPart, slug, [paths]]]}`. Rebuild script: scratchpad `body/build.js`. |
| `tracker/sw.js` + `manifest.json` | PWA. SW is **network-first for HTML/CSS/JS** so deploys land without a hard refresh; cache-first for images. |
| `tracker/tests/smoke.js` | 49 Playwright tests. See §6. |
| `tracker/tests/week.js` | 10 week-durability tests (plan, log, reload, edit, reload). |
| `tracker/tests/gpt-core.mjs` | 27 Node tests for the ChatGPT API core against a fake store. |
| `.github/workflows/tracker-tests.yml` | CI: syntax, API core, smoke, week on every push touching `tracker/`. |
| `netlify/gpt-core.mjs` + `netlify/gpt-fn.src.mjs` → `netlify/functions/gpt.mjs` | **The ChatGPT API** at `/api/gpt/*`. Pure core (routing, validation, summaries, OpenAPI) + a thin shell (Netlify Blobs store `bermo-tracker`, token from `GPT_API_TOKEN`). The function file is a **generated bundle** — run `bash netlify/build-gpt.sh`, never edit it by hand. See `tracker/GPT-SETUP.md`. |
| `netlify/functions/ai-parse.js` | Hosted Claude proxy for Brain Dump. Key is `ANTHROPIC_API_KEY` (or `BERMO_FIT_KEY`) from Netlify env — explicit names only since v54; origin allowlist, daily cap (`AI_DAILY_CAP`, default 300), 200KB body limit. |

### CSS design system (v23/v24) — use these, don't invent new ones
- `.seg` / `.seg-btn` — **every** tab strip. `.food-tabs`, `.subnav`/`.sub-chip`,
  `.sm-scope`/`.sm-tab`, `.meal-slot-row` all map onto it. A smoke test compares
  their computed border-radius and fails if they diverge.
- `.sfield` — search input with icon. 15px font so iOS doesn't zoom on focus.
- `.lrow` — one list row (title / mono sub / heart / +). Used by search results,
  recents, favourites, saved meals, exercise library.
- `.msel` — grouped multi-select with check circles and per-group "All".
- `statBandHtml(items)` — **the one page stat band**. Equal cells across the
  full width, each with label / value / goal / progress bar. Used by
  `renderNutTopStats`, `renderFitTopStats`, `renderBodyTopStats`. It replaced
  a tiny ring canvas that floated in dead space on the left with the numbers
  stacked beside it — five rows tall to show four values. Do not reintroduce a
  ring here; the dashboard's big Apple rings are the ones that earn their space.
- **Elevation ramp** (`:root`): `--surf-0..3` (gradient surfaces, not flat greys),
  `--edge-top` (1px inset white specular highlight), `--lift-1/2` (wide soft
  ambient shadow), `--hairline` (rgba white .055).
  **On near-black, drop shadows are invisible — depth comes from a lit
  surface.** A grey 1px outline reads as a drawn box, which is what made it
  look homemade. Things inside a card step **up** a level, not down.
- **Number inputs**: use `step="1"` (integers) or `step="any"` (decimals),
  never a coarse step. `#setCal` had `step="50"`, so typing 1473 was rejected
  by the browser with "Enter a valid value" and she could not save her calorie
  goal. Always add `inputmode` too so iOS shows the right keypad.
- **Height**: `heightFieldHtml(idBase, valueIn)` / `readHeightField(idBase)`.
  Renders **feet + inches** for imperial and cm for metric, reads back a single
  number in the unit the maths expects. Nobody knows they are 66 inches tall.
- **Spacing**: exactly 12px between every top-level section of a view, set in
  one rule. Never add a `.card + .card` margin — it applies inside grids and
  knocks side-by-side cards out of alignment (this happened in v24).
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

**Fitness** — Sunday-first week list, day card, the ten-screen Hevy-style
workout flow (v45; the older Fitbod-style live logger was removed in v54),
the male/female front/back body figure coloured per muscle (v59/v60), categorised lifts with 1/2/3/5RM drill-down and
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
explainers. Goal contract, consistency chain. (The restart card, streak
counter and weekly adaptive-macro check lived only on the legacy dashboard
and were removed with it in v60 — rebuild on Home/Progress if she asks.)

**Goal Designer maths — four bugs fixed in v28, do not regress them:**
1. The pace selector did **nothing** outside "lose" mode — recomp was
   hard-coded to -8% of TDEE and build to +10%, so picking "faster" changed
   no number on screen. Every mode now scales by `paceScale = ratePct/0.6`.
2. Protein was set from lean mass alone. For a lighter person that produced
   109g at 1870 kcal — **23% of calories, with carbs mopping up 56%**, which
   is backwards for a lean-out goal. Protein is now the highest of: per lb
   lean, per lb **goal** bodyweight (1.0 g/lb in a deficit while lifting;
   goal weight rather than current so it doesn't feed fat mass), and a
   share-of-calories floor. Carbs are capped by `macroStyle` rather than
   absorbing everything left over.
3. `macroStyle` — balanced / highprotein / lowercarb / morecarb. She asked
   for roughly 1460 · P130 · C130 · F49; "higher protein, lower carb" at
   1460 returns P140 C128 F43.
4. `input.targetCal` — if she types a calorie number it **wins over the
   estimate**, because the activity multiplier is a guess and her experience
   of her own body is not. It is not clamped by the floor or the 25% rule;
   those only apply to numbers the app designs. It flags the implied rate.
Also: the form now asks **sex** (it silently read the profile), and the
"change anything" fields are live — editing calories rebalances the macros,
editing a macro updates a running tally with a REBALANCE button.

**The explainer sheet** — `openExplainer()` used to call `openModal()`, which
**replaced** whatever modal was open. Tapping "?" inside the Goal Designer
destroyed the form and dumped her on the main screen with everything she had
typed gone. It is now its own `.xsheet` layered on top of `document.body`;
nothing underneath is touched. **Never route a secondary panel through
`openModal()` while another modal is open.**

**BUTTON BUDGET (v36).** She counted the buttons before I did: "so many
buttons and options". Fitness had **32**, the dashboard **37**, including
three separate water buttons and five header actions that all opened the same
sheet. Now: Fitness header is ONE action (`+ LOG A WORKOUT`), the day card is
ONE (`START WORKOUT`, plus `ALREADY DID IT` only when there is something to
log), the session card is ONE (`+ ADD TO THIS DAY`). Everything else on those
pages is navigation, not actions. **Before adding a button, ask which
existing one it duplicates.**
Removed: `+ WORKOUT` / `+ CARDIO` / `PLAN DAY` / `+ WOD` from the header,
`+ QUICK SET` and `WRITE IT OUT` from the day card, `+ LIFT` / `+ CARDIO` /
`+ INTERVALS` from the session card, `FULL PLANNER` (which pointed at a view
deleted in v18 and could never have worked), the dashboard WOD card, and the
second water button on the low-water banner.
**I broke the app doing it** — removing the dashboard WOD card left
`renderWodCard()` writing into four elements that no longer existed, so it
threw on EVERY dashboard render and killed the render chain behind it. That
is the orphan-sweep rule in §7, ignored in a hurry. It is now guarded.

**THE LIFTS PAGE (v53).** *"A lift page that is just tracking lift weight
by lift… shows the PR, click it and tracks the date and rep and volume by
date. This should not impact any of the other pages, but it reads from
them."* Built exactly that: `view-lifts` (Progress → Lifts & PRs),
`renderLifts()`, `.lf-*`. **Read-only by contract** — it builds everything
from `day.sessions` via `_liftIndex()` and writes nothing except its own UI
state (`state.ui.liftsSel / liftsSort / liftsQ`).
- List: every lift ever logged, search, Recent / Heaviest / A–Z. Row =
  tile · "N sessions · last date" · name · "Best 175 lb × 3 · date".
- Detail: four tiles — Heaviest (weight × reps, date), Est. 1RM (Epley,
  date), Best session volume (date), Most reps (at weight, date) — then
  **every session by date**: sets, top set, volume, PR day outlined pink.
- Tapping a date: if that day's saved plan contains the lift → the sets
  screen's History tab; otherwise → the day sheet for that date. The first
  version called `_wkGet(k)`, which **creates** a plan for a day that has
  none — a write from a page that promised none. It uses `_dayPlan(k)`
  (read) now. **`_wkGet` is a writer; never call it from a read-only
  surface.** Verified: plan count stays 0 after tapping a date.
- The old PRs list on Workouts (`renderPrList`, opens an *edit* modal) and
  the Library lift-detail (`openLiftDetail`, last 20 sets) are now
  redundant with this page — fold them into the step 6 sweep.

**LAST TIME + LIFTS UP/DOWN (v52).** She asked whether the app notices PRs
and a week doing less — overall load, gym time, effort, or one lift. Honest
audit: PRs yes (Epley 1RM PR + rep PRs + per-set `pr` flag); load, time and
lift days yes (vs Last Week); **effort no** — she said *"leave out effort"*,
so no RPE field, ever; a single lift going backwards was only visible by
opening that lift. Two additions:
- `_lastTimeSets(dateKey, name)` — the most recent EARLIER day's logged
  sets for the lift, in logged order. The sets screen shows a "Last time ·
  date · 115×8, 115×8" line above the table and the matching set under each
  set number (`.hv-set-n small`). Hevy's best feature; the data was already
  there.
- `_liftBests()` / `_liftDeltas(cur, prev)` — best Epley estimate per lift
  in each period, compared for lifts logged in BOTH. One line under the vs
  Last Week deltas (`.hm-lifts`): "1 down Bench Press −10 lb · 1 up Back
  Squat +10 lb · 1 same" — top-2 names each way, **weight delta** when the
  weight changed, else the estimated-1RM delta. Numbers only, no grade, taps
  through to Workouts. Follows the period selector (week/month/year).

Seeding note for screenshots/tests: the app's plan keys come from
`weekKey(weekStart(d))` — the SUNDAY — which lands in the previous ISO week
for Sun..Wed. Seed with the Sunday, not today, or the plan is invisible.

**OPTION D — HER PICK (v51).** Shown five tint options on her background
(`scratchpad/tint.html`); she chose **D: teal→blue gradient**, "unless it
looks bad on screen". It does not. Implementation:
- `exTile(name, cls)` is now the ONE builder for every exercise image — list
  thumbs (`mrow-thumb`), logger thumbs (`hv-thumb`) and the sets hero
  (`hv-hero`). Her own photo → `art-photo` `<img>`; Bryl Lim line art →
  `art-line` with `<i class="art-mask" style="--m:url(...)">`; otherwise
  `art-glyph` with the muscle glyph stroked by the shared `#artGrad`
  gradient (an `<svg><defs>` in `index.html` before `#app`).
- `.art-mask` uses the PNG as a **CSS mask** over `linear-gradient(135deg,
  #00f5d4, #4db8ff)`. The image file is untouched, so CC BY-SA share-alike
  is never triggered and the credit line is the only obligation.
- Placeholders are stroked with the same gradient (`stroke:url(#artGrad)
  !important` — a plain CSS `stroke` colour was overriding the attribute).
  Result: every list is one teal-blue style, whether the row has art or not.
- The hero is `exTile` too — RepDB and the photos are no longer shown
  anywhere; they remain in the app only as **data** (anatomy, equipment,
  names). `exHero()` is dead and can go in the step 6 sweep.

**week.js was lying (fixed in v51).** It failed reproducibly and the app
was fine. Two separate test bugs:
1. Playwright's `page.click` retries when the handler closes the sheet
   under the pointer, then waits forever for the now-hidden button. The
   Build click is dispatched in-page now. **Prefer in-page clicks for any
   control whose handler replaces or closes its own container.**
2. "day +2" on a Friday is next Sunday, which is not in the visible week
   list. The row click hit nothing, the *previous* day's sheet was still in
   the DOM (closeModal only removes `.open`), `#dsBuild` existed, so the
   test believed the sheet had opened and wrote Sunday's workout onto
   Saturday. `openDay()` now requires `#modal.open` with the right date in
   the title, and plan days are chosen inside the current Sun–Sat week.
   **A bare "element exists" check inside `#modalBody` proves nothing.**

**THREE LIBRARIES, ONE LOOK (v50).** She looked at RepDB and said *"those
are kinda bad… these don't match my app"*, and she was right: light-blue
cards on a black UI. ChatGPT's list named Bryl Lim's Workout Guide — 302
exercises as **white line art on transparent**, which is the one style that
sits on our background. Licences, checked: Bryl Lim assets CC BY-SA 4.0
(used unmodified → no share-alike obligation; credit shown), RepDB free tier
(credit shown), free-exercise-db public domain.

Rules now encoded, in order of importance:
1. **One style per surface.** `exPhoto()` (lists, thumbs) returns her own
   photo → Bryl Lim line art → **null** (placeholder glyph). It never returns
   a flat drawing or a photo, because a list mixing three styles is exactly
   "different on every screen". `exHero()` (the sets-screen hero only) may
   fall back to RepDB flat → free-exercise-db photo. `exPhotoKind()` tags the
   tile (`art-line` / `art-flat` / `art-photo`) so CSS can fit line art
   (contain + dark tile) vs photos (cover).
2. **Never substitute a look-alike for a different movement** (her rule,
   via ChatGPT). `_libMatch()` now refuses any library name whose *extra*
   words are in `_LIB_HARD` — equipment or variant words (barbell, dumbbell,
   cable, smith, trx, ez, incline, seated, sumo, bulgarian, box…). Only
   `_LIB_SOFT` words (pause, tempo, deficit, pin) are stripped for a retry.
   So "Front Box Squat" shows the placeholder rather than a back squat, and
   RepDB's "EZ-Bar Bench Press" is **not** used for "Bench Press". The
   comparison sheet caught that one: RepDB has no plain bench press or face
   pull at all.
3. `_LIB_SYN` values are now **ordered candidate lists**, tried against
   whichever library is being searched ("back squat" → "squat" in Bryl Lim,
   "barbell squat" in free-exercise-db).

Coverage of ChatGPT's 154-name wish list (rough, python matcher): RepDB
103, Bryl Lim 80, free-exercise-db 78; 31 in none of the three, mostly
boxing (jab/cross/hook), Seacoast Kettlebell's own names (crush curl,
pullover sit-up, plank drag) and a few naming mismatches. Those get the
placeholder until she adds a photo — never a wrong image.

Paid option if she wants transparent *colour* art: RepDB Stills $299 one-time
(classic style, transparent backgrounds, muscle highlights; female character
+$59). Not bought; her call.

**REPDB ILLUSTRATIONS (v49).** She sent ChatGPT's list; RepDB was on it and
it is the better visual fit: 701 exercises drawn in **one flat style with one
character** — the Hevy look — plus finer anatomy than free-exercise-db.
Licence (LICENSE-DATA.md): free personal + commercial **in-app** use; the
credit *"Exercise data by RepDB (repdb.co)"* must be visible in about/credits
(it is, on More, `.credits`); do not republish or repackage as a dataset or
API; do not feed the images to generative AI. Images are AI-generated by
RepDB's own commission, which is their business, not ours.

Precedence everywhere: **her photo → RepDB illustration → free-exercise-db
photo → glyph tile.** `exPhoto()` encodes it. Anatomy: `BODY_PART_MAP` →
`repdbParts()` → `exdbParts()` → name regexes. Both libraries share ONE fuzzy
matcher, `_libMatch(idx, key)` over a `_libIndex(list)`: exact → `_LIB_SYN`
→ equipment prefix → all-our-tokens-present (a name with the **same** words in
a different order beats one with extra words, else shortest) → strip variant
words and retry. `allLibraryExercises()` merges both, deduped case-insensitively.
Hero crop: the illustrations are square; `object-position:center 28%` keeps
the head in a 180px-tall hero.

**THE EXERCISE LIBRARY (v48).** *"There are def free libraries for
exercises."* She was right and the handoff had said otherwise. free-exercise-db
(github.com/yuhonas/free-exercise-db) is **The Unlicense** — public domain —
with 873 exercises, two studio photos each, primary + secondary muscles,
equipment, category, level. Shipped as `tracker/exdb.js` (150KB, instructions
dropped; `EXDB_JSON(id)` fetches them on demand).

How it is wired — our data wins, the library fills the gaps:
- `allLibraryExercises()` adds every non-stretching entry.
- `exPhoto(name)` → her own photo, else `exdbPhoto(name)`. So `mrowThumb`,
  `_bwThumb`, `_wkThumb` and the sets-screen hero all show real photos.
- `partsForExercise()` → `BODY_PART_MAP` first, then `exdbParts()` (library
  muscles → our seven parts via `_EXDB_PART`), then the name regexes.
- `equipOf()` and `liftCatOf()` read the library's equipment/category.
- **`exdbGet(name)` is fuzzy, in four steps, cached:** exact → `_EXDB_SYN`
  (our names → theirs: "back squat"→"barbell squat", "lat pulldown"→"wide-grip
  lat pulldown"…) → equipment prefixes ("barbell "+name) → every token of ours
  inside a library name, shortest wins → strip variant words (pause, box,
  high bar, deficit, tempo…) and retry, so "Pause Squat" borrows Barbell
  Squat's photo. Search-row photo coverage went 54/64 → 64/64 on "squat".
- SW: `exdb.js` is precached; the jsDelivr photo host is **cache-first**.

Known: the photos are one model in one studio, not Hevy's style. Honest, and
free. Step 3 (set-counted coverage) should use `exdbGet(name).p`/`.s` for
primary/secondary credit — that data is now in the app.

**ICONS AND THE BODY (v46).** *"Fix the body images, remove AI icons and
clean up icons."* The muscle map figure was blocky rectangles; it is now an
anatomical SVG — pecs, abs/obliques, delts, biceps/forearms, quads, calves on
the front; traps, lats, erectors, glutes, hamstrings, calves on the back —
each region still carrying `data-part` so recency colouring and tap-through
work unchanged. The seven brain-dump buttons used a four-point sparkle (the
universal "AI" glyph); they are a pencil now. `_MG_ICON` glyphs (used by the
media-row thumb and Left This Week) were abstract shapes and now read as the
muscle they stand for. **No sparkle anywhere in the UI** — grep for
`M12 3.2l1.9 4.6` returns zero.

**THE WORKOUT FLOW (v45, step 2 of 6).** She sent a ten-screen mockup:
*"Exact replica — this is how it should look for each thing you click."*
One module (`HV_SCREENS` / `HV_BIND`, `.hv-*` CSS), one overlay
(`#hvOverlay`, z 360, under modals at 400), a tiny screen stack
(`hvOpen` / `hvPush` / `hvReplace` / `hvBack` / `hvClose`).

    1 select   ← Home row ▷, Fitness START WORKOUT      (hvOpen(date,"select"))
    2 logger   ← Start Workout, day sheet "Start timer"  (clock runs from p.startedAt)
    3 sets     ← tap an exercise: Log · History · Stats tabs (6 lives here)
    4 rest     ← ticking a set: ring countdown, ±15s, bell, Skip/Stop, Next Up
    5 finish   ← Finish: duration · working sets · volume · PRs · Save/Note/Share
    7 search   ← Add Exercise: All / Favorites / Custom, tap adds; replace mode
    8 edit     ← Edit Exercises: pointer-drag reorder, Add Superset / Circuit
    9 notes    ← workout note, or per-exercise note (params.idx)
    10 more    ← ···: rename, move day, duplicate, save as template, replace,
                  note, view stats, share, delete

**Data.** The workout *is* the day's plan: `plan[wk][dn].exercises[]` =
`{ name, sets:[{reps, weight, done, warmup, pr, touched}], note, group }`.
`group` ties consecutive exercises into a superset ("A") or circuit ("CA").
Order is array order. `_wkSeed()` seeds sets from `day.sessions` so a lift
logged anywhere else shows up done — the v40 rule. `_wkSyncLog(date, name)`
rewrites that exercise's log rows from its done, non-warm-up sets through
`logSession()`; unticking rewrites honestly; a future date writes no log.
PR flag: a set is `pr` when its Epley estimate beats the prior best.

**Three things that bit during the build — do not repeat:**
- A screen's bind threw on the History/Stats tabs (`#hvWarm` only exists on
  Log), and because the back button was bound *after* the screen bind, she
  would have been trapped on that screen. `hvRender()` now binds navigation
  FIRST and wraps the screen bind in try/catch. **A screen bug must never
  trap her.**
- Smoke test 23 ticked set 0 — which in the suite's accumulated state was a
  set seeded from today's log, so "ticking" un-ticked it. **Tests must target
  the set they just added (the last row), never index 0.**
- Tests 29/30b assumed the flow was still open after earlier tests reloaded
  the page. They open it themselves now.
- **The v37 rule again:** typed-but-unticked sets (`touched`) are swept into
  the log on Save Workout, and she is told how many.

**Honest limits, stated in the UI:** the rest alert (beep + vibrate +
Notification) works while the app is open; iOS suspends page timers in the
background, and a background alert needs web push from a server. Exercise
"photos" are the glyph tile unless she has added her own (`exPhoto`).

**Orphan to sweep in step 6:** `openWorkoutSession()` (the old live
session overlay, `#workoutOverlay`, `.ws-*`) is no longer reachable from any
UI — `#fdStart`, the day sheet and Home all open the new flow. Its tests
were rewritten against the new flow. Remove it with its CSS in step 6.

**EVERYTHING ROUTES, NOTHING DUPLICATES (v44).** *"Make sure everything is
clickable and usable but not replicated — it all goes to connected places
within its category. And I should be able to scroll the rings to previous
weeks or calendar view like Apple."*

- Every element on Home carries `data-go="<view>"` or opens the one sheet
  for its job. Fitness ring, the four fitness stats, Left This Week cells
  and the five fitness deltas → **Workouts** (`fitness`). Nutrition ring,
  the four nutrition stats and the two nutrition deltas → **Nutrition**.
  Date → the month calendar. Gear → Settings. Row day/date → selects that
  day; ▷ and ··· → the day sheet; + → focuses the row's text. **No element
  on Home opens a second copy of anything.** `bindHome()` binds `[data-go]`
  in one loop — add the attribute, do not add a handler.
- **The rings strip is a snap-scrolling track** (`#hmTrack`) of five week
  panels (−2…+2). The centre panel keeps `id="hmStrip"` so the calendar-sync
  test still reads it. Landing on another panel shifts `currentDate` by
  whole weeks and re-renders, which re-centres the track — so it scrolls
  forever in either direction. `calshot.js` verifies: Sep 6 → Aug 30 and
  re-centred at panel 2.
- **`openHomeCalendar()`** — month grid, each day with its two mini rings,
  prev/next month, Today. Tap a day to select it. Like Apple Fitness.
- The selected tile is `#25262e`, one step above the ring track `#1a1b21`,
  or the ring vanishes on the selected day.

**HOME TO THE MOCKUP (v43).** She sent a rendered mockup and said
*"Replicate this look exactly."* v42's Home was replaced wholesale — same
scoped module pattern (`renderHome()`, `.hm-*`), different layout. The
mockup overrides several earlier decisions; follow the picture, not the
transcript, where they differ:

- **Five tabs**, not three: Home · Workouts · Nutrition · Progress · More.
  `view-progress` and `view-more` are hub pages of `.hub-row[data-tab]`
  buttons that `go()` to the real views (body, goals, trends, library,
  history, settings). The desktop `.tab` strip still lists every view, so
  `document.querySelector('[data-tab="trends"]').click()` works from
  tests even though no `.mtab` for it exists — `element.click()` fires on
  hidden elements. **Tests and audit scripts must use `[data-tab=…]`, not
  `.mtab[data-tab=…]`** — three journey steps failed on exactly this.
- **Brain dump bar on Home**, with Photo and Voice. The buttons carry
  `.js-brain` + `data-bmode` ("", "photo", "speak") and the existing
  delegated click handler picks them up. Nothing new was bound.
- **The top bar is hidden on Home** (`body.on-home .topbar`). `goBase()`
  toggles the class and `renderHome()` sets it on first paint — the first
  attempt only did the former, so the logo bar showed until a tab was tapped.
- **Under the Fitness ring: active min · active cal · working sets · load**
  (the mockup's choice; "lift days" now lives in *vs Last Week* as a delta).
  Active cal is "—" until Apple Health has synced today.
- **This Week rows**: day · date · tick · one editable comma-joined line ·
  ▷ and ··· (or + on empty/rest days). Eight rows — the mockup shows next
  Sunday too. The text cell is `contenteditable`; blur or Enter commits it
  by splitting on commas into `plan[wk][dn].lines[]`. The selected day gets
  a magenta tint. Both ▷ and ··· open the day sheet until the Hevy logger
  lands (step 2).
- **vs Last Week / Month / Year** (`_periodStats`, `_periodRanges`) — seven
  deltas: active time, active cal (— unless synced days exist), lift days,
  weight load, cardio, protein-target days, calories-on-target days (±10%).
  Persisted choice in `state.ui.hmPeriod`. **No grade, no colour by sign.**
- **Overflow lesson**: a CSS grid of `1fr` columns has a *minimum* of its
  content, so a `white-space:nowrap` "+6,520 lb" pushed the whole page 72px
  wide. Every Home grid is `minmax(0,1fr)` now, and the delta unit stacks
  under its number. The smoke suite's overflow check would have caught it;
  the screenshot caught it first.

Still honest-but-ugly: **Left This Week** shows sub-region names
("Glute Med / Abductors") with "0 sets". Step 3 replaces this with muscle
groups and set counts against her own targets.

**THE REBUILD — HOME (v42, step 1 of 6).** After four rounds of "it looks
homegrown," she gave a full spec (ChatGPT-assisted, then corrected by her):
Apple Fitness on the main screen, Hevy when you open a workout, MyFitnessPal
for food, one app, three tabs. The agreed build order is in the transcript
and repeated here so the next step is unambiguous:

1. **Home** ✅ — week strip · two rings · notepad plan · Left this week
2. **The Hevy logger** ✅ (v45) — see THE WORKOUT FLOW
3. **Fitness numbers** — set-counted coverage with fractional credit for
   indirect work, editable targets inferred from her trailing 4 weeks
4. **Change** — WEEK · MONTH · YEAR deltas vs the previous period, no grade
5. **Apple Watch Shortcut** — reads Health, opens the tracker with the
   numbers; runs hourly. A PWA cannot read HealthKit; this is the bridge.
6. **Progress** tab + delete the legacy dashboard with a proper orphan sweep

How Home is built, and why it is the first thing that has not looked
homegrown: it is **one scoped module** (`renderHome()`, `.hm-*` CSS, ~300
lines) that inherits nothing from the legacy dashboard's stacked layers.
The legacy dashboard DOM is still in `index.html` inside `#dashLegacy`
(`display:none`) and its renders still run into it, so nothing throws.
**Step 6 removes it — do not remove it piecemeal before then** (see §7).

Decisions she made, verbatim where it matters — do not relitigate:
- **Both rings are TODAY**, like Apple Watch. Fitness = Apple's Exercise
  minutes vs her goal; until the Shortcut has run today it fills from logged
  minutes and shows a "not synced" chip. **Active calories show "—" when
  not synced** — the auto-estimate (`sets×reps×weight×0.0008`) is a guess
  and read as "4 Cal", which is worse than nothing.
- **Lifting accountability is the `4 / 5` number, not the ring.** A cardio
  day closes the ring; seven full rings cannot hide a 2/5.
- **Weeks start Sunday** (her rule; the ChatGPT spec said Monday).
- **No motivational copy.** `#dashGreeting` is now just "Home".
- **The plan is a notepad.** `plan[wk][dn].lines[]` — `{id,text,done}`.
  `planLinesFor()` migrates `type`/`extra[]` into lines on first read and
  `setPlanLines()` mirrors line 0 back into `type` and the rest into
  `extra[]`, so every older consumer (day sheet, program, week list) keeps
  working. Tap the text to edit; the arrow opens the workout (day sheet now,
  Hevy logger after step 2). Enter adds a line, Backspace on an empty line
  removes it, blur saves. **Typing never re-renders** — that is what makes
  it feel like Notes.
- A line is a *lift* unless it matches `_NOT_A_LIFT` (rest/cardio words).
  Lift days planned = days with a lift line; done = days with a strength
  session; planned is never shown lower than done.
- **Left this week** currently lists sub-regions with zero sets this week
  from `subMuscleGaps("week")`. Step 3 replaces this with set counts against
  targets. It is honest data now, but the labels are jargon — known.

Orphan caught in this step: v39 removed the tab sheet, and with it the only
UI route to `openLogWorkoutText()`. The day sheet now carries a
"Write it out instead" link (`#dsWrite`). The journey script found it.

**THE BLACK SCREEN (v41).** *"I clicked edit week and it goes black."*
`#dwEditPlan` called `go("plan")`. **`view-plan` was deleted in v18.**
`goBase()` toggles `.active` onto `view-<tab>` and off everything else, so a
missing view unmounted the entire app and left her staring at black with no
way back — mid-workout.

This was the **third** control found pointing at a dead view (`FULL PLANNER`
in v36, a `[data-tab="plan"]` click inside a `confirm()` in v30). So the fix
is not just the button:

1. `goBase()` now **refuses to unmount**. If `view-<tab>` does not exist it
   logs, falls back to the dashboard, and carries on. A bad target can no
   longer produce a blank screen.
2. `#dwEditPlan` goes to **Fitness**, where the week list lives and tapping a
   day opens the day sheet.
3. **Smoke test 31** greps every `[data-tab]` in the DOM against the views
   that actually exist and fails on any orphan, then clicks the nav controls
   and fails if the body is left empty. Run it before every push.

**RULE: never let a navigation target be trusted.** Views get deleted;
buttons outlive them.

**WEEK DURABILITY (v40) — and the data-loss bug it caught.** She said *"Fix
it! My week of workouts ruined if this does not work."* So the answer was to
stop shipping features and prove the data survives. `tracker/tests/week.js`
plans a real week, logs it, reloads, edits, cancels, re-saves, and reloads
again. **Run it alongside `smoke.js` before every push.**

It immediately found a bug I had introduced in v39 that would have done
exactly what she feared:

> `_setDayExerciseSets()` **replaces** the day's rows for one exercise. But
> `openLiftSets()` seeded its rows from `plan.exercises[].sets` only. A
> workout logged in the **live session** never writes `sets` onto the plan —
> it writes `day.sessions`. So tapping that lift on the day sheet opened a
> **blank** editor, and saving a single set **deleted all five logged sets**.

Two fixes, both required:
1. `_loggedSetsFor(dateKey, name)` — the editor now seeds from `day.sessions`
   whenever the plan carries no sets, so it always shows the truth no matter
   which surface wrote it (live session, write-it-out, brain dump).
2. `_setDayExerciseSets()` returns early on an empty set list. An empty editor
   must never silently delete a logged workout; the row's `×` is for removing
   a lift.

**RULE: any code that REPLACES rows in `day.sessions` must first read what is
already there.** Replacing is fine; replacing something you never loaded is
destruction.

**ONE FITNESS SCREEN (v39).** Her spec, verbatim: *"This one screen is the
same for fitness page. There should be no other add fitness options outside
this. This feeds all of it."*

    week list (main screen OR fitness) -> tap a day -> THE DAY SHEET
      dropdown: activity / saved / create new   (saved AUTOFILLS)
      Build workout · Start timer · Add time
      the workout list, blank or filled; tap a lift -> sets & weights

- `openDaySheet(dateKey)` is THE screen. `openAddWorkout()` and
  `openPlanDayModal()` are now thin wrappers onto it, and the dashboard and
  fitness week rows both call it. **Do not add another way to add fitness.**
  `openLogWorkoutText()` survives only because it is text entry that writes
  into this same day, not a second add screen.
- `openBuildWorkout(date, preselect, onSave)` — full-screen picker with four
  facet pills (lift type / machine / body part / workout type) all derived
  from data we already had (`LIFT_CATEGORIES`, `MACHINE_LIST`,
  `partsForExercise`, `WORKOUT_TYPES`). Selection lives in a `Set` and
  toggling a row does **not** re-render, so it survives filter changes.
- `openLiftSets(date, name)` — numbered set rows, `+` copies the last one.
  Cardio names (`isCardioName()`) get minutes / speed / grade instead.
- **Sets on a past-or-today day are LOGGED, not planned.** `_setDayExerciseSets()`
  clears that exercise's existing rows for the day and re-writes them through
  `logSession()`, so rings, PRs, week comparison and Totals all see it. A
  future date stays a plan and writes nothing.
- **Photos are in IndexedDB, not localStorage** (`exPhotoSet` / `exPhotoLoadAll`),
  downscaled to 320px on capture. `save()` sheds `state.exPhotos` FIRST on a
  quota error, so a photo she took would have vanished silently.
- NOT possible as asked: "find photo online". There is no image search we can
  call, and the results would be third-party copyrighted images. Her own
  photo works; the generated glyph tile is the blank default.

**BUILD TO THE REFERENCE (v38).** She sent Ladder/Flex screenshots four
separate times and asked why the app did not look like them. It did not,
and the reason was that I kept fixing bugs inside my own layout instead of
building their components. The gap was measurable: **146** uppercase CSS
rules, **56** full-width solid buttons, **0** thumbnails, **21** paragraphs
explaining the UI. `.btn` had `text-transform:uppercase; letter-spacing:2px`
at the base class, so every action in the app was a billboard by
construction.

What v38 added:
- **`mrowHtml()` / `mrowThumb()` — THE media row.** thumb → grey eyebrow →
  bold sentence-case title → grey meta → chevron. This is the row every
  Ladder list uses. Use it for any new list. Do not write another bespoke row.
- **Sentence case everywhere.** 81 hard-coded ALL-CAPS labels rewritten in
  `index.html` and `app.js`, plus a CSS layer neutralising `.btn`.
  Small-caps survives only on card eyebrows — that *is* the reference.
- **Filter pills** (`.fpill`) and one unified nav component: `.food-tab`,
  `.sub-chip`, `.sm-tab`, `.meal-slot` all resolve to the same 38px pill.
  Smoke test 15 enforces it — making one a pill and leaving the rest at 9px
  is precisely the "different on every screen" complaint.
- **`renderFitTotals()`** — the Ladder TOTALS block: big numbers with filled
  bars, plus a 4-week completion grid. Ladder compares to a team percentile;
  we have no team, so it compares against **her own best week**. Never invent
  a cohort.
- **Empty states show content, not instructions.** The live session used to
  be a headline, two full-width neon slabs and a paragraph explaining what
  "Log" does. It now lists her actual lifts (planned → recent → favourites),
  tappable. **Ladder never explains its own UI. Neither do we.**

STILL NOT CONVERTED: the nutrition diary, food search results and the
dashboard cards still use the older row styles. Convert them to `.mrow`.

**THE LOST WORKOUT (v37).** "I just did a workout and logged it and nothing
shows or saved." She was right and it was not a save bug. Adding an exercise
to a live session seeded five set rows **pre-filled** with a suggested rep
count and last session's weight. Sets only reached `day.sessions` when the
per-row `Log` button was tapped. Fill the rows in, hit Done, and the whole
session evaporated — nothing on the dashboard, nothing in the week comparison,
and no warning. Two changes:
1. Untouched rows now render **placeholders, not values** (this is what
   Strong and Hevy do), so a filled field always means she typed it.
2. `finish()` runs `sweepUnlogged()` before closing: any set marked `touched`
   with reps > 0 goes through `logSession()` and she is told how many were
   saved. Test *"v37 typed sets survive Done"* covers it.
**Never let typed input sit in `workoutSession.exercises` without a path into
`day.sessions`.**

**THREE TABS, NOT FIVE (v37).** The v35 sheet carried five tabs. At 390px the
strip overflowed and the active tab rendered half off-screen — she sent a
photo of it. The tab row is now a 3-column grid (Write it out / One lift /
Cardio) that cannot overflow; `Plan a day ahead` and `Log interval blocks`
moved to footer links via `workoutFooterHtml()`, which `bindWorkoutTabs()`
**appends itself** so the five sheets cannot drift apart again. The Plan
tab's optional fields (why-chips, gym, double-day) collapse behind `<details>`
disclosures. Smoke test asserts every tab is fully inside the strip.

**ONE ADD-WORKOUT SHEET, ONE ADD-FOOD SHEET (v35).** There were FIVE
separate workout modals with five different layouts — Log a lift, Log cardio,
Log intervals, the plan-day editor, Write it out — so reaching the same job
from Home, from Fitness, or from inside a session gave three different
screens. They now all render `workoutTabsHtml()` (Write it out · Lift ·
Cardio · Intervals · Plan the day), share the title "Add a workout", and
switching between them is one tap via `bindWorkoutTabs()`.
**`openAddWorkout(dateKey, tab)` is the single entry point — call that, never
the individual modals.** The food side gets the same treatment:
`foodTabsHtml()` / `bindFoodTabs()` put the identical strip on the satellites
(By hand, Scan barcode, Enter UPC) that the main food modal already had, and
`openFoodModal(meal, forceTab)` accepts a starting tab.
`openLiftHub()` became unreachable and was removed, along with its 8 orphaned
CSS rules (hygiene rule).
Guarded by smoke test 30, which opens the sheet from three different entry
points and fails if the tab list, the title, or the active tab diverges.

**Z-INDEX ORDER — page < overlay(350) < modal(400) < sheet(9999) (v34).**
The workout session overlay is a full-screen OPAQUE layer at 350. Modals were
at 200, so every modal opened from inside a running session — ADD EXERCISE,
LOAD A SAVED WORKOUT, SAVE THIS AS A WORKOUT — rendered *behind* it. The
modal was in the DOM and marked `.open`; the button just looked dead.
**TESTING LESSON, and this is the important part:** the earlier test asserted
the modal ELEMENT EXISTED. Presence is not visibility. Smoke test 29 now uses
`document.elementFromPoint()` at the modal's centre and requires the modal to
be the thing actually painted there. Use that pattern for anything layered.

**START WORKOUT ON AN UNPLANNED DAY (v34).** The button lived only in the
planned branch of the day card, so a day with nothing planned had no way to
start a session at all — you had to go and plan it first, which is the
opposite of the build-as-you-go flow. The unplanned branch now carries
START WORKOUT and WRITE IT OUT.

**NO NATIVE DIALOGS (v33).** `prompt()` and `confirm()` are banned in the
UI — unstyleable, blocking, and on iOS a system dialog mid-flow reads as
phishing. There were **seven**. Replacements: `openNameModal()` for naming
things, `confirmDestructive()` for anything that deletes (it names the
consequence and offers an export first). Routine actions that were asking
permission unnecessarily now just act. **Smoke test 28 greps the source and
fails on any `prompt(`/`confirm(`/`alert(`** outside the PWA install prompt.

**ONE PROFILE SOURCE (v33).** The wizard wrote `profile.heightIn` and
`profile.ageYears`; the Goal Designer and macro calculator read
`profile.height` and `profile.birthYear` — names nothing ever wrote. So after
onboarding, both calculators still opened with height and age blank.
`profileHeightIn()` / `profileAgeYears()` / `profileSex()` are the accessors
(they fall back to the legacy keys), and `rememberBodyFacts()` writes back
whatever she types into a calculator so it is never asked for twice.

**ONE SAVED-MEAL PATH (v33).** There were three: `saveMealAsTemplate`
(orphaned, wrote a template with **no** `totals` — which the render read
unguarded, so it would have thrown), `saveCurrentMealAsTemplate`, and
`saveSelectedAsMeal`. Now one `saveMealTemplate(items, name)` with one shape,
and the render derives totals defensively for anything saved by an old build.

**ONE WRITE PATH — `logSession()` (v32). Do not bypass it.**
`day.sessions` is the hub: rings, week comparison, health correlations,
body-part trends, muscle coverage, previous-performance, PRs and the day
verdict all read it. But **eight** places used to `push()` into it directly
and each did something different afterwards — Quick Set updated the 1RM
estimate, the session logger updated rep PRs but NOT the 1RM, the brain dump
and cardio loggers updated neither. The same lift entered from two screens
produced two different results.
Everything now goes through `logSession(dateKey, row, opts)`, which handles
the 1RM estimate, rep PRs and the save. **Smoke test 26 counts
`sessions.push(` in the source and fails if it is not exactly 1.**
Note: the activity rings need no call — `autoComputeActivity()` is a PURE
function that derives them from `day.sessions` on every read.

**"WRITE IT OUT" — one free-text logger, reachable from everywhere (v32).**
`parseWorkoutText()` builds on `parseMovementText()` and additionally reads
`3x10`, `at 90`, `12 reps`. `openLogWorkoutText()` is the sheet; it runs
**on device, no AI, no credits**. Reachable from the Fitness header, the
Today's-session card, and inside Brain Dump (LOG WORKOUT), and the rings
modal's free-text box now runs through the same parser instead of storing
the whole sentence as one unusable cardio row.

**PLANNING vs LOGGING was the confusion (v31).** She typed what she had
already done into the day editor's movements box and expected it in the log.
Two separate failures:
1. `parseMovementText()` — the old parser split on **newlines only**. She
   typed `1.5 hours.` on one line and a comma-separated list on the next, so
   "1.5 hours." became an *exercise* and the entire second line became ONE
   exercise with a 70-character name. It now splits on newlines, commas and
   semicolons, pulls a duration-only line out as `durationMin`, recognises
   cardio words and their minutes, and splits on `" and "` **only** when a
   cardio verb follows — so "abductor machine inner and outer and walked 20
   min" becomes two items while "inner and outer" stays intact. The day
   editor also has a real **duration field** now.
2. `logPlannedDay()` + the **ALREADY DID IT — LOG IT ALL** button on the day
   card. Planning never fed the log, so "Today's session" stayed at 0 entries
   with no explanation. It writes the movements in as sessions, splits the
   session length across the lifts, gives cardio its own minutes, and marks
   lifts `needsNumbers` so they render as "tap to add weight + reps" rather
   than a broken-looking `0 lb × 0`.

**The session is BUILD-AS-YOU-GO (v30).** This is how she actually trains:
walk in, hit START WORKOUT, start the clock, and add each lift as she gets to
it — numbers filled in during the set or after. Some days she loads a saved
workout instead; some days she builds one and saves it at the end.
- `day.workoutSession.list` is the **live** exercise list. It seeds from the
  plan when there is one and grows from there. `renderWorkoutSession` and
  `bindWorkoutSession` read it, not the `planned` array.
- `openWorkoutSession` **never refuses to open.** It used to throw a
  `confirm()` — "No exercises planned, open the planner?" — and then click a
  `[data-tab="plan"]` that was **deleted in v18**, so OK did nothing either.
  Opening with an empty list auto-starts the clock.
- In-session: `openSessionAddExercise` (search library / favourites / recent,
  or invent a movement), `openSessionLoadSaved`, `openSessionSaveAs`.
- A set logs with **reps only** — weight defaults to 0 so bodyweight work
  counts. It used to demand both.

**Two constants were used and never declared** — `SET_KINDS` (4 references)
and the rest-timer state `_restTimer` / `_restEndAt` (4 references). The
session overlay threw `ReferenceError` the moment an exercise rendered and
again the moment a set was logged. It stayed hidden because the `confirm()`
above meant the crashing path was rarely reached. **Smoke test 23 now drives
the entire session flow — add a lift, log a bodyweight set, cycle a set kind
— and fails on any page error.** A regex scan for undeclared identifiers was
tried first and produced false positives; exercising the path is simpler and
stricter. Prefer that pattern.

**Evidence the program is built on — cite it, don't re-guess it.** She
explicitly asked for this to be looked up rather than invented:
- **Cardio dose / interference.** Wilson et al. 2012, *J Strength Cond Res*
  (meta-analysis, 21 studies, 422 effect sizes): interference scales with the
  **frequency and duration** of endurance work; **running** blunted strength
  and hypertrophy while **cycling did not**; 3 days/wk interfered less than 5.
  A 2017 systematic review on intra-session sequence found the effect is
  largely a **same-session** problem — separate days, or 6+ hours apart, and
  it shrinks. Steps/NEAT don't interfere at all, which is why they carry most
  of the load in the prescription. Encoded in `buildProgram()`'s cardio block:
  ≤3 sessions and ≤100 min/wk when lifting is the priority, cycling/incline
  walking/elliptical named over running, never in the same session as legs.
- **Rate of loss.** Helms et al. 2014 (JISSN) — 0.5–1% of bodyweight per week
  to maximise muscle retention. Garthe et al. 2011 — 0.7%/wk **gained** lean
  mass and lost 31% of fat mass, while 1.4%/wk held lean mass flat and lost
  only 21%. This is the ceiling `designGoalPlan` enforces when a target date
  demands more; it reports the honest timeline instead of designing the
  unsafe one. Explainer key `"rate"`.
- **Sex.** A 2023 Frontiers review found no good evidence for programming
  around menstrual-cycle phase, and a 2020 JSCR meta-analysis found women and
  men respond similarly to resistance training. So the app asks for sex (it
  affects the Mifflin fallback) but does **not** cycle-sync training.

**The program** (v27, extended v29) — `buildProgram()` turns the Goal Designer's answers
into what to actually DO: a training split from `SPLIT_TEMPLATES` (2-6 days),
exercises chosen per sub-muscle region from `REGION_EXERCISES` and filtered by
`gymHasExercise()` so it only prescribes kit she has, rep schemes that follow
the goal (`_schemeFor`), a cardio prescription scaled to the size of the
deficit, and a food plan with per-meal protein and real examples.
`splitStyle` picks the template family: **`bodypart` is the default** —
back+biceps, chest+triceps, legs, shoulders+arms, glutes+hams — because she
does not train upper/lower/push/pull. `classic` keeps the old templates.
`meals` (3-6) splits protein across meals **and snacks**, since she feeds
protein 5-6 times a day. `input.byDate` on the goal derives the required
rate from a deadline. `programAccountability()` / `renderProgramCallout()`
put a card at the top of Fitness holding her to the prescribed lifting days,
priced in the volume each missed day costs.
`applyProgramToPlan()` writes the split into `state.plan` for the current week
with sensible weekday spacing. Saved as `state.goals.program` and surfaced on
the Goals plan card. The split is deliberately built to cover all seven
regions across the week — the same thing the Muscle coverage card audits.

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

**Expected: 49/49 and zero page errors**, `node tracker/tests/week.js` **10/10**, `node tracker/tests/gpt-core.mjs` **27/27**, and the scratchpad's `hvdrive.js` **13/13**. (Two console errors about
`ERR_CONNECTION_RESET` are the sandbox blocking a CDN — pre-existing, ignore.)

The suite covers: load, wizard, **sideways overflow on every page**, all tabs,
food + lift logging end to end, modal close, dashboard re-render, cross-page
date sync, the v20 health engines, the v21 why layer, the v22 note parser +
goal maths + calorie floor, v23 search-never-dead-ends + nav consistency,
v24 surfaces + header flow, v25 quota safety, v26 uniform gaps + equal
side-by-side cards + stat-band width use.

Also do a **screenshot pass** — the scratchpad has working scripts
(`tops.js`, `v20pages.js`, `v23check.js`). Seed state via `localStorage` then
capture. Several bugs were only visible in a screenshot, never in a test.

---

## 6b. The three audit scripts (scratchpad) — run these, not just the suite

- **`audit.js`** — clicks EVERY visible control on every page, records page
  errors, blocking dialogs, controls that do nothing, and whether each modal
  opens AND closes. Change detection compares the full HTML, the stored
  state, `currentDate` and the count of `.active/.on/.sel` — a weaker check
  produced dozens of false "dead control" reports.
- **`journey.js`** — the real user story in order: onboard → design a plan →
  log food by search → write out a workout → health note → weigh in →
  dashboard shows it → survives a reload.
- **`dupes.js`** — cross-surface data flow. Does a weigh-in prefill the Goal
  Designer? Does saving a plan update Settings and the inline calculator?
  Does dashboard water show on Nutrition?

The scratchpad is wiped between sessions, so these scripts may need
rewriting; `pass.js` / `errs.js` (v60) are the current equivalents: every
screen screenshotted with seeded data, plus console warnings and
`window.__errs` collected across all tabs.

Last full run (v33): **0 page errors, 0 dead controls, 0 stuck modals, 47
modals verified, 8/8 journey steps, no sideways overflow on any page.**

## 7. Hygiene rule (learned the hard way, twice)

Any change that removes or replaces UI **must sweep for orphans in the same
batch**: dead render functions, dead bindings (grep the removed ids/classes
across `app.js`), and dead CSS rules (grep each removed class in `index.html`
and `app.js`; zero refs = delete the rule). Twice, removing a UI block left
`list.innerHTML` referencing an undefined variable, which threw on **every**
render of that page.

---

**THIS WORKOUT ON THE BODY FIGURE (v61).** *"It highlights only muscle
groups used during the workout and shows what's not. The app should do
that."* The body card has a second mode, **This workout | Recovery**
(`state.ui.mmMode`). This workout is the default whenever the selected day
(`currentDate`) has lifts: muscles those lifts used are pink, everything
else grey, with two lists underneath — "worked" and "not worked"
(`_slugsWorkedOn`, `SLUG_NAME`). Recovery is the v60 days-since colouring.
First capture over-claimed (lats, traps, calves on a deadlift day) because
two of her lifts were unknown to `subMusclesForExercise()` and fell back
to whole body parts; **Z-press / Z-sit press / seesaw press → front
delts and pull-through → glutes + hamstrings are now in the resolver.**
When a lift lights too much, fix the resolver, not the figure.

**ADD ONE MORE (v63).** She asked that after showing what a workout
lit up, the app "say something about adding one more". In This workout
mode a third box appears: **Add one more** — the missed group that has
gone longest without work (never-trained first) plus one lift that fixes
it, from `SUB_FIX` (`_addOneMore`). For Nov 16 it says Chest · Incline
Dumbbell Press. The ad shows exactly this, nothing invented.

**THE AD (tracker-ad/, Remotion).** She asked for an Instagram ad aimed at
gym owners, showing the app in use with her own data. `tracker-ad/` is a
separate Remotion project (own `package.json`; `node_modules` and `out/`
are gitignored; `/tracker-ad/*` is 404'd on the public site in
`netlify.toml`). Read `tracker-ad/README.md` first.
- 1080x1920, 30 fps, 600 frames (20 s), 12 shots, none over 2 s. 120px
  safe margin: captions in the top band, phone / clip / body figure in the
  stage below, number chips in the empty bottom of each screen.
- Screens are REAL captures (`scripts/capture.js`, Playwright, DPR 3,
  `Date` frozen to 2026-11-20) with her Oct 20–Nov 20 review entered
  through `__bermo.logSession` from `scripts/review-data.js`. The body
  figure is lifted out of the app onto a transparent page for a clean
  cutout.
- Four footage slots (`public/clips/gym|run|food|beach.mp4`);
  `scripts/clips.js` writes `src/clips.json` so missing clips show a
  labelled placeholder. She will supply the clips.
- Render: `npm run render` (uses `/opt/pw-browsers/chromium`), ~90 s.
- Style reference was a Ladder reel (instagram.com/reel/DQUR0j0jgrK).
  The link yields caption text only, not the visuals — ask her for
  screenshots before claiming a style match.
- **Second cut (her feedback):** no gradient/ombré backdrop ("obviously
  AI") — the background is her own footage, blurred and darkened; chips,
  tags and the body plinth are frosted glass (`GLASS`). The phone is drawn
  to iPhone 16 Pro proportions (1206x2622 screen, Dynamic Island, status
  bar, side buttons, home indicator) with the app's real tab bar captured
  per tab (`shots/nav-*.png`). Chips are siblings of the phone inside
  `Stage`, not children, because `backdrop-filter` breaks under 3D.
- Her clips: gym = hip thrust (screen recording, black bars cropped),
  run = legs POV, beach = jump over the barbell. Trimmed to 3 s with
  system `ffmpeg` (the Remotion-bundled ffmpeg cannot write stills).
  **The raw clips are gitignored** — the repo is public — so a new session
  needs her to re-upload them. No food clip yet.
- The body shots use the app's new "This workout" view for Nov 16.
- **Third cut — text is IN the scene, not placed on it.** She sent a
  Ladder frame (huge grey condensed capitals with the athlete standing in
  front of the letters) and said "all text should be part of the video".
  `BigText` draws stacked Anton capitals, each line stretched to the safe
  width with SVG `textLength`, BEHIND the subject. For her footage that
  needs a per-frame cutout: `scripts/matte.py` (rembg `u2net`, run with
  `/usr/local/bin/python3.13`) writes `public/mattes/<clip>/NNN.webp`;
  `ClipScene` layers video → text → cutout. On phone shots the text sits
  above the phone, which overlaps the last line; on body shots it sits
  behind the figure. The caption band is gone. Mattes are gitignored too.
  Keep lines 5–9 letters: 2–3 letter lines stretch badly.
- **Fourth cut — she finally sent the Ladder reel as screen recordings
  and said the earlier cuts looked "home done AI… not a real phone" and
  the text was "dumb".** What the reel actually does (watched frame by
  frame): almost all filmed footage; small clean sentence-case text, white
  with ONE accent italic key word, building word by word, with a repeated
  opener that stays put while the last word swaps ("Your … body. / workouts.
  / results."); the app on a REAL phone in a hand or as an angled macro
  close-up; a three-band split screen with a big condensed number per
  band; an ending of three short lines then the logo. The cut now follows
  that: `Word` / `Pair` / `Build` (text), `Macro` (angled screen close-up
  with depth-of-field, replaces the drawn phone), `Band` (split screen),
  `Turn` (a touch dot swipes and the figure rotates front to back in 3D —
  no "front and back" caption), `Footage` (full-screen clip; words passed
  as `behind` sit behind her cutout). Copy: "Your gym still runs on
  paper." → "Mine runs on this." → "Every lift. / PR. / muscle. / run. /
  member. / month. / macro." → "Your gym. Your app. Built for you." →
  BERMO.
- **Fifth cut (her notes on the fourth):** the screen kept changing
  angle and confused her → ONE fixed `ANGLE` for every `Macro`. "Do any
  screens show it actually working?" → a finger dot drags while the page
  scrolls, taps the Deadlift row before the PR shot, and ticks a member
  on the class sheet (`swap` from `coach-class-a` to `coach-class`, count
  4 → 5). The figure arrives grey and the worked muscles LIGHT UP
  (`LightUp`, `body-front-off.png`), then she turns and the app's own
  "Add one more" suggestion lands (`Turn`). "Every" and its key word sit
  together (no gap). Calendar line: "Every month, planned." Food line:
  "Even every macro." 13 shots, max 1.8 s.
- **Sixth cut:** she hated the white tap circle and asked for a realistic
  phone. The circle is gone everywhere — pro app ads either film a thumb
  or draw NO pointer and let the UI react, so `Macro` takes a `press`
  rect (the tapped row dims for a few frames) and pages scroll with an
  ease-out. `Macro` now renders a FULL iPhone 16 Pro (titanium band with
  specular edge, antenna breaks, buttons, stacked slices for thickness,
  Dynamic Island with lens, status bar, real tab bar, home indicator,
  glass reflection) at one steady angle. Still a render, not a photo.
- **Seventh cut — she asked "no yes man, is the angle right? should
  there be more depth?"** Honest answer was no and yes: the phone was
  turned 17° AND rolled 1.5°, which reads as tipping over / stock mockup,
  and it floated in a black void. Now `rotateY(-9) rotateX(2.5)`, no roll,
  slow push-in, and each `Macro` takes `bg` — her footage far out of focus
  behind the phone for real depth and light. Also fixed a capture bug:
  `.main::after` is a FIXED bottom fade, so full-page captures froze it
  mid-list and ghost text showed above the tab bar — hide it (and the
  page, when shooting the translucent tab bar) in `capture.js`.
- **Eighth cut — the upright phone was WRONG.** "No! Not that angle! I
  can't read that… the angle should be as if the person is holding it."
  Upright made the screen small. The phone is now a held-in-hand POV:
  `scale(1.07) rotateX(19) rotateY(-4) rotateZ(-4)`, perspective 1700 with
  the origin low, so you look down at it and the top tilts away. The
  bottom edge runs just off the frame, where a hand would be. Rule:
  **readability first; a phone shot she cannot read is a failed shot.**
- **Ninth cut — back to the screen close-up.** She pointed at the fifth
  cut's close-up and asked "straight or angled? no yes man". Answer given:
  angled (straight reads as a flat screenshot), but with half the sideways
  roll so text reads faster. `Macro` is the close-up again: plane 900px
  wide, `ANGLE = { rx: 24, ry: -8, rz: -4 }`, top and bottom out of focus,
  plain near-black behind (the `bg` prop is accepted but unused). No
  circle; taps are the row dimming. PR number sits bottom-left.
- **Still not Ladder quality, and why:** Ladder's is professionally shot
  and graded, with a real hand-held phone. Hers is three phone clips. To
  close the gap she needs to FILM her phone showing the app (in hand at
  the gym, on a bench, held up at the beach) and send screen recordings
  of using it. A drawn or tilted screen will never read as a real phone.
- Honesty rules that apply to the ad too: only dated entries with numbers
  are logged; ranges use the lower bound; year-only historical bests (450
  lb leg press, 2021) are NOT entered because the app needs a date.

**THE APP TAKES THE VIDEO'S LOOK (v65).** After the site clip finally
landed ("Yes!"), she said "make the app look like that… every page run
through and clean the code". What was done:
- **Recolour by value, everywhere** (`styles.css`, `app.js`, `index.html`):
  every teal / blue / purple / pink / lime / orange / green literal and
  `rgba()` → the violet family; blue-grey neutrals → iOS neutrals; dark
  "text on teal" → white. ~650 substitutions. A hue scan of all hex and
  rgba values now finds only violet, neutral and the one red.
- **The v58 glass layer was replaced in place** by the "v65 — NATIVE"
  layer: new tokens (`--acc`, `--cell*`, `--sep`, `--txt*`, `--font`,
  `--wide`), the old `--g-*`, `--surf-*`, `--edge-top`, `--lift-*`
  tokens redefined flat so older rules follow, borders and shadows off,
  segmented controls / pills / inputs / search in the native style,
  `text-shadow` off globally, buttons in sentence case, eyebrows grey.
- **Type:** JetBrains Mono, Inter Tight and Montserrat are gone (CSS,
  canvas fonts, the Google Fonts link). `fonts/archivo-wide-900.woff2`
  is self-hosted for the hero numbers.
- **Tiles:** `.mrow-thumb / .hv-thumb / .lf-tile` are raised keys;
  `.art-mask` paints the line art white → lavender.
- **Rings:** Home fitness = violet, nutrition = light lavender.
- "Add one more" for obliques now says **Side Plank or Russian Twist**
  (she did not know what a Pallof press is).
- **Dead-code sweep:** 271 CSS rules removed and 54 selector lists
  trimmed (270 KB → 245 KB, 4921 → 4534 lines); the JS orphan scan found
  none. Method: a rule is dead when any class/id in the selector appears
  nowhere in `app.js` / `index.html` / `data.js` as a word, allowing for
  dynamic prefixes (`"tl-" + x`, `` `t-${x}` ``). 18 page screenshots were
  compared before and after the sweep: 17 byte-identical, Lifts
  visually identical.
- Smoke test 16 ("v24 surfaces") asserted the OLD rule (cards must have
  a shadow). It now asserts the new one: a card is a filled cell with no
  border.
- `tracker-ad/scripts/site-body.js` expects the app's violet now.
- **Not done:** the Coach hub still stores ONE weight per member per
  lift; the video shows a per-set table. The setup wizard, modals and
  deep sub-screens got the token/colour pass but not an individual
  screenshot review. Layout and information density were not redesigned
  — this pass is colour, surfaces, type and tiles.

**INSTAGRAM IN THE NEW LOOK (`tracker-ad/src/Insta.tsx`).** Two
compositions, both keeping **130 px clear on each side** (her number):
- `InstaPhoto` (Still, 1080x1350): OUR layout — one phone turned in
  space showing the class set table, with the white "NEW PR" card and
  the violet "4 MONDAYS" block floating in front of it, the reel's
  caption style at the top ("Every lift. Every member.") and BERMO at
  the bottom. The first version copied a Ladder site image (two upright
  overlapping phones) and she said "don't make it exact — use ours".
  **Take inspiration from references, never their composition.** Render:
  `npx remotion still src/index.ts InstaPhoto out/insta-photo.png`.
- `InstaReel` (1080x1920, ~26 s): her gym clip ("Your gym still runs on
  paper."), then the app in a phone playing four ranges of `SiteClip`
  under the "Mine runs on this. / Every month, planned. / Every member.
  / Every PR. / Every lift. / Every muscle." captions, then her beach
  clip and the BERMO end card. Replaces the old `Ad` cut, which still
  shows the teal screenshots. Needs `public/clips/*` (gitignored), so
  the rendered reel is NOT committed; the photo is in `site/`.
- **Colourway mocks.** She sent four reference palettes (yellow +
  cobalt, sky + tomato, red + cream, cobalt + black) and asked what the
  APP would look like in them — the app's own screens, not the poster
  background (I got that wrong first: `InstaColorways`). `AppColorways`
  (Still, 2200x2130) shows the class set table and the member page in
  all four. `SiteClip`'s palette `C` is mutable and `<Themed theme>`
  swaps it for a subtree; `T` reads it through getters. No colourway
  has been chosen; the app is still violet.
- To show `SiteClip` from a given frame inside another composition use
  `<Sequence from={-n}>`. `<Freeze>` did not hold its nested Sequences.

**THE WEBSITE SHOWCASE + DEMO MODE (v64).** She asked for a version
"purely for my website… a mini app example. Buyer: gyms." Answer given: on
a website a live demo beats a video, so it is a page, not another cut.
- `/gym-app/` (`gym-app/index.html` + six webp screens) in the MARKETING
  site's style (Inter Tight caps, cyan/pink, pill buttons — the site's
  rules, not the app's). Coach side first, because the gym owner is the
  buyer; members second. Not linked from the nav or sitemap yet — her call.
- The phone in the hero cycles real screens until "Tap to try it", then
  loads the real app in an iframe (390x800, CSS-scaled). Coach / Member
  toggle. Under 900px wide the button opens the demo full screen instead
  (an iframe phone inside a phone traps scrolling).
- **Demo mode:** `/tracker/?demo=gym` (`DEMO` at the top of app.js). Own
  storage key `bermo.tracker.demo`, rebuilt from scratch on every load
  (`demoSeed`): the demo gym, this morning's class part-ticked, and one
  member ("Maya") whose own app is filled from her class history. No
  service worker, no notification prompt, no ChatGPT sync. It never reads
  or writes `bermo.tracker.v1`. `&view=member` starts on Home.
- The page promises only what exists. Member sign-in and storage are
  described as "scoped with you", because there is no backend yet (§8).
- **`/gym-app/` was styled for the OLD site.** She then said the live
  site is the new one (bermo-site--quiet-youtiao-0e2544.netlify.app:
  light theme, lives OUTSIDE this repo). There, app examples are a silent
  looping phone recording: `media/apps/fitness.mp4` (360x736, 24 fps,
  ~25 s) + poster `fitness-p.jpg`, shown in a 176px phone and a small
  "Fitness app · Live" tile. The old clip was the pre-rebuild brain dump.
  The replacement is in `tracker-ad/site/`: `fitness.mp4` (720x1472,
  same aspect as the slot), `fitness-p.jpg`, `fitness-full.mp4`
  (1080x2208), made by `tracker-ad/scripts/site-clip.js`: class check-in
  → calendar → members → a member → her Home, lifts, body.
  Someone with the new site's repo has to drop the files in.
  **The first version was broken and she caught it:** Playwright's
  `recordVideo` with a `size` larger than the viewport does NOT scale up;
  it pads with grey, so the app sat in the top-left quarter, blurry. The
  CDP screencast ignores the device scale factor too. What works: true 3x
  `page.screenshot` frames with script-stepped scrolling, joined with an
  ffmpeg concat list. **Always look at a frame pulled from the FINAL
  file**, not from an intermediate sheet.
- **The screen recording was rejected too** ("looks so ghetto… this
  should be Monday.com level"). A raw recording of a dense phone UI never
  reads as a product video. The site clip is now a DESIGNED animation:
  `tracker-ad/src/SiteClip.tsx` (Remotion composition `SiteClip`,
  1080x2208, 20 s, loops). Five scenes, each the app's screen redrawn
  large and animated: class sheet (ticks, count 4→6, weight typed), month
  calendar filling in, one member (stats count up, lift chart draws, PR
  badge), her app (rings draw, week ticks), body figure lighting up with
  "Add one more". Names and numbers are the demo gym's. Body cutouts come
  from `scripts/site-body.js`. Render: `npx remotion render src/index.ts
  SiteClip out/site-master.mp4 --browser-executable=/opt/pw-browsers/chromium`,
  then ffmpeg to `site/fitness.mp4` (720x1472) and `fitness-full.mp4`.
  **Second pass, from the gym's real paper sheets (she sent photos):**
  scene 1 is now the coach typing Monday's actual workout (Back Squat,
  Arnold Press, Back Lunge, Plank Pull-Through), "Repeat: Every Monday,
  Dec 1 – Dec 28", Save, then December with every Monday filling in;
  scene 2 is the coach entering the lift + rounds x reps, then every
  member appears with that lift and their weight is typed. 25 s total.
  **The app does not have that exact "repeat on a weekday between two
  dates" save yet** (it has a weekday pattern + Fill the month); build
  it if she wants the app to match the video. Never use the real
  members' names from her sheet photos.
  **Third pass — I had misread the sheets and she called it out.** On
  the gym's cards each PERSON logs their own sets as reps x weight, the
  weight climbs set to set, set counts and reps differ per person, and
  some add a "bonus" set (her card: Squat 8x95, 8x115, 8x135, 6x115,
  6x125, 6x130, 3x135 bonus). The coach's plan sheet only carries the
  prescription (3x8, 3x6/6) and a progression note. So the class scene is
  now: one lift + plan, then a row per member with their own set chips.
  **The real Coach hub still stores ONE weight per member per lift** —
  the app needs per-set entry to match the gym and the video.
  She also said the look was "a bit vibe coded vs a strong app": the clip
  was restyled flat and restrained (neutral surfaces, hairlines, one
  accent for the primary action, no glows or gradients, an app bar with
  sliding tabs). The real app still has the neon/glow look.
  **Fourth pass — "still looks vibe coded vs Hevy / Fitbod / Ladder that
  I would download".** Recolouring was not the problem. What those apps
  share, now followed in `SiteClip.tsx`: native iPhone conventions
  (status bar, nav bar with Cancel/Save and back, grouped lists, bottom
  tab bar with icons, push transitions); true black with FILLED grey
  cells and hairline separators, no outlined boxes; a real exercise
  PHOTO beside every lift (`public/site/ex/*.jpg`, free-exercise-db,
  public domain); Inter variable (`fonts/inter-var.woff2`) with regular
  body text and bold only where it matters; ONE accent (teal), pink only
  for worked muscles. The class scene is a Hevy-style set table (Set /
  Previous / Lbs / Reps / check) for one member, then the others'
  set summaries. **These are the rules to apply if the real app gets
  the same treatment** — its neon multi-accent look is the same tell.
  **Fifth pass (she sent Ladder's site and pointed at Monday.com):**
  - "I hate the cyan" and the cyan + pink combo. The clip is now ONE
    accent, violet `#7c6cff`, on black with white. **This contradicts the
    four-accent palette rule in §2 for the real app — ask before
    recolouring the app, but do not use cyan in new marketing work.**
  - She prefers the app's ORIGINAL line-art exercise images over stock
    photos, "with a 3D element, not glowing": `Thumb` is a raised tile
    (top highlight, hard bottom edge, soft drop shadow) with the Bryl Lim
    art masked white→lavender (`public/site/art/`). **CC BY-SA 4.0: the
    credit "Exercise art: Workout Guide by Bryl Lim" must appear wherever
    the clip is published.** The stock photos are no longer used.
  - "Cool but no wow moment": each key beat now LIFTS OUT of the screen
    on a white card over the dimmed UI, tilting up from perspective, with
    a wide display numeral (Archivo 125/900) and a solid accent block —
    Monday.com's move. Calendar save → "4 MONDAYS"; Chris's bonus set →
    "NEW PR 175 lb × 3" with bars. Also: Mondays rise as raised pucks,
    the member's lift is a growing bar chart with an attendance grid,
    and the body figure turns front to back in perspective.
  - Do not use `backdrop-filter: blur` under Remotion for this: it
    mirrored text at the edges. Plain dim only. And never mix a
    `background` shorthand with a conditional `backgroundColor`/
    `borderColor` — frames render in one page and the reset wipes it.
  Rule learned: for her WEBSITE, show big simple animated pieces of the
  product, never a full dense screen.
- Screens are re-shot with scratchpad `demoshot.js` (viewport 390x800,
  DPR 2, then ffmpeg to 585px webp).

**LEGACY DASHBOARD REMOVED + FINER MUSCLES + SCREEN PASS (v60).**
- `#dashLegacy` (243 lines of hidden DOM, 63 ids) is GONE. `renderDashboard()`
  is now just `renderHome()`. Swept with it: 33 functions (the hubs, deck,
  compare card, streak, restart card, WOD card, weekly chart, calorie ring,
  adaptive-macro check — all of which only ever painted into the hidden
  block), 5 dead bindings, 136 CSS rules + 25 trimmed selector lists.
  Method: delete DOM → trim the pipeline → run every screen collecting
  console warnings + `window.__errs` → loop "function with exactly one
  whole-word reference = orphan" until empty → CSS selectors whose class /
  id appears nowhere in index.html or app.js. Two smoke tests read the old
  `#cmpRows`; they now read Home's `.hm-deltas`. **Self-referencing dead
  code (`renderCompareCard` calling itself from its own binder) is not
  caught by the refs==1 scan — check binders by hand.**
- Body figure colours **per drawn muscle**, not per part: `_daysSinceSlug()`
  runs each logged lift through `subMusclesForExercise()` and maps regions
  to the figure's slugs (`SLUG_REGIONS`). A curl lights biceps only, a lat
  pulldown the upper back only. Lifts the resolver cannot place fall back
  to colouring their whole part. Tap-through still uses `data-part`.
- Screen pass under the glass layer: diary items and weigh-ins are flat
  rows with hairlines (were bordered boxes); weigh-in deltas are plain
  grey numbers (were light pink/green badges); small buttons 8px radius.

**THE BODY FIGURE (v59).** She sent Fitbod's recovery screen: *"identical
to this but female and male option and front and back."* My hand-drawn SVG
was never going to get there, so it is replaced by an MIT-licensed figure
set (`body.js`). `bodyFigureHtml(F)` shows ONE view at a time with a
round flip button (Fitbod's layout), a Female / Male toggle (defaults to
`profileSex()`, stored in `state.ui.mmSex` / `mmSide`), and a legend.
Library slugs map onto our seven parts in the build script (abs+obliques
→ core, traps/upper/lower back → back, quads/hams/adductors/calves/
tibialis/knees → legs…). Each shape keeps `data-part`, so recency colour
and tap-through are unchanged. **Emit one `<path>` per shape** — the
female paths begin with relative moves, and merging left + right into one
`d` scattered them across the figure (caught in the screenshot).
Untrained / stale muscles are neutral grey `#5b6170`; worked is pink.

**COACH HUB v2 + GLASS (v58).** She called v56 "a home done hub" and
explained the real workflow: the coach writes the MONTH plan (every Monday
is X), never presets individuals because she does not know who will come,
and in the morning adds the workout to whoever showed up. So v56's
per-member "Apply workout" and `planned` rows are GONE. Now:
- Four underline tabs: **Class · Calendar · Members · Workouts**.
- `coach.plan[date] = workoutId`, `coach.att[date][memberId]`.
- **Class sheet** (`renderCoachToday`): a spreadsheet — sticky member
  column with a tick box, one column per lift in the day's workout, weight
  inputs that save on change (no re-render while typing), last weight as
  the placeholder. Ticking in copies the workout's lifts to that member.
- **Calendar**: weekday-pattern selects + "Fill the month"
  (`coachFillMonth`), month grid showing workout and how many came; tap a
  day to open its sheet.
- **Members / member / lift / workouts** are tables (`.co-table`), sortable.
- Entry rows are one labelled table (`coachRowsHtml`) with 16px inputs —
  the v56 editor had unlabelled 13px fields that made iOS zoom and jump,
  which is the "glitch" she hit editing demo text.
- **Glass layer** (end of styles.css, `--g-*` tokens): translucent lit
  surfaces + backdrop blur on cards, modals, nav, top bar; 12px radii
  instead of pills on buttons, segmented controls, filters. The body
  figure only got a finish pass (hairline strokes, glow). **It is still a
  hand-drawn SVG; a genuinely professional anatomy figure needs a licensed
  asset** — told her so.

**THE SETUP WIZARD (v57).** She said the setup was "the old UI", only
offered up to 6 days, had the wrong goals, and gave her no say in the
macros. Rebuilt as `.ob-*` (the old `.gate*` / `.wiz-*` / `.ga-*` CSS is
swept; ids `wizName/wizNext/wizApply` kept because every test uses them).
- Goals: **lose / lean / gain / maintain** (`profile.goal`). "Get lean" is
  a 12% deficit that **never goes under BMR** (8% if scans show muscle
  falling) — her words: "that's not 1200 cal". `checkAdaptiveMacros`
  treats `lean` as a loss goal.
- Days: 2–7 plus **"7 + doubles"** (`profile.doubles`). Daily burn adds
  0.025 x sessions to the activity multiplier, so the choice changes the
  number. Splits are body-part named (she does not train upper/lower).
- Step 3: eating style pills (balanced / high protein low fat / low carb
  / keto) recompute; calories and all three macros are **inputs**; a tally
  shows the split and offers to reconcile calories. What is typed is what
  is saved.
- Scans: manual rows (date, weight, body fat %, muscle) → `inbodyScans`.
  Body fat switches BMR to Katch-McArdle and protein to lean mass; a
  muscle drop of 1 lb+ between the last two scans raises protein and
  trims the deficit, and says so. Photo parsing of a printout still needs
  an AI key (Body page), so setup is typed entry.

**THE COACH HUB (v56).** *"A hub for a coach that lists every gym member
and lets them track… daily, weekly, monthly, annual, all time or custom…
how much they lift, PR, times they come… select a lift or type it in…
create workouts and save them, to apply if the workout will be the same 5
workouts that month. They are using a paper Excel sheet now."* Built as
one scoped module (`state.coach`, `renderCoach()`, `.co-*`), OFF by
default. Settings → Coach hub toggles it; then a **Coach** pill sits next
to the gear on Home and a row appears on More. "Load demo gym" seeds six
members with ten weeks of deterministic training so it demos instantly.
- **Separate data.** `state.coach.logs[memberId][date][]` — nothing
  touches her own `state.days`; smoke 48 asserts her days are byte-equal
  before and after logging + applying in the hub.
- Screens: members (period seg · 4 tiles · search · member rows) →
  member (Log a lift · Apply workout · period seg · Visits / Volume /
  Working sets / PRs with deltas vs the previous period · Planned days ·
  Lifts this period with best + delta · Sessions by date, PR days pink)
  → one lift by date. Workouts list → editor (name + rows of lift / sets
  / reps / weight). Everything borrows the Lifts page look.
- Period maths: `coachRange()` — day / week / month / year reuse
  `_periodRanges`, `all`, and `custom` (previous period = same length
  before). PRs are computed over all history first (`coachPRSet`), then
  filtered into the period, so a PR is always relative to everything
  before it.
- Apply workout = pick a saved workout, a month, and weekdays; days with
  rows are skipped; **future days are `planned:true`** and do not count as
  visits, sets or PRs until "Mark done". That is the honest reading of
  "apply for the month" without inventing attendance.
- Lift entry is a text field with the library as suggestions
  (`<datalist>`), so the coach can pick or type anything.
- Not done: no login per coach, no per-member sharing, no export to the
  gym's sheet. It is a demo-grade hub on one phone, like everything else
  until the backend exists.

**THE CHATGPT API (v55).** *"Are you also able to add an api so chat gpt
can access and add to it and work in it."* Yes, with one honest constraint:
the data lives in her phone's localStorage, so an API needs a copy on a
server. Minimal backend chosen: **Netlify Blobs** (already on her plan, no
new account) behind a **Netlify Function** (`netlify/functions/gpt.mjs`), which is a
**committed, self-contained esbuild bundle** of `netlify/gpt-fn.src.mjs` +
`gpt-core.mjs` + `@netlify/blobs`. Regenerate with `bash
netlify/build-gpt.sh` after touching either source, then commit. Two
failed attempts explain why: (1) an Edge Function with a bare
`@netlify/blobs` import — the edge bundler could not resolve it, deploy
failed with exit code 2; (2) a Function with `netlify/functions/package.json`
— the deploy succeeded but Netlify did **not** install it, and the function
died at runtime with "Cannot find package '@netlify/blobs'". A root
`package.json` was never an option: `publish = "."` would ship
`node_modules`. Vendoring the bundle removes every install question.

Model — **the phone stays the source of truth**:
- `save()` schedules `gptPush()` (4s debounce) → `PUT /api/gpt/state`
  with `{state minus exPhotos/gpt, today}`. ChatGPT reads from that.
- ChatGPT writes with `POST /api/gpt/actions` (same JSON shape as the
  brain dump: meals / sessions+lifts+sets / water_oz / weight / plan lines).
  The server **validates and queues** (`queue/<id>` blobs); it never edits
  the snapshot, so there is no second writer.
- `gptPull()` runs on open, on foreground, every 90s while visible, and
  on `online`. Each pending entry goes through `applyGptAction()` which
  calls **`logSession` / `day.meals[slot].push` / `setPlanLines`** — the
  same paths the buttons use — then acks (`POST /actions/ack`). Applied ids
  are remembered (`state.gpt.applied`, last 300) so a failed ack cannot
  double-log.
- Auth: one `GPT_API_TOKEN` in Netlify env (16+ chars, constant-time
  compare). She pastes the same value in Settings → ChatGPT link and in the
  GPT Action (API Key, Bearer). **No token ever in code or chat.**
- `GET /api/gpt/openapi.json` is public and is what the GPT imports.
  Reads: `/summary?from&to` (≤32 days), `/day/{date}`, `/plan?date`,
  `/lifts`, `/actions` (pending). `/health` is public, no data.
- Settings card `#gptCard` (`renderGptLink`): token, Save / Sync now /
  Turn off, status "on · sent 2 min ago · checked just now", spec URL.
- Tests: `gpt-core.mjs` (27, Node, fake store) and smoke 47 (mocks
  `fetch` in-page, dispatches `visibilitychange`, asserts the meal, lift,
  water, weight and plan line landed once and were acked).
- Store scope: `getStore("bermo-tracker")` is **site-wide** — the deploy
  preview and production share it, which is what she needs because the
  preview IS her app. Deleting the store = `store.deleteAll()`.
- Not done, say so if asked: no background sync on iPhone (a PWA cannot),
  so ChatGPT's entries land when the app is next opened; summaries are as
  fresh as the last push.

**THE HARDENING PASS + SWEEP (v54).** Executive-level QC she asked for,
then "go and fix all of it":
- `todayKey()` is **local time** (was `toISOString`, so after ~7pm Eastern
  "today" was tomorrow). Tests use local keys too.
- `SCHEMA = 3` + `migrate()` in `load()`. **Declared before `load()` runs** —
  the first cut hit the temporal dead zone and every test went red.
- `_report(where, err)` ring (`window.__errs`, 30) + `window.onerror` /
  `unhandledrejection`; 20 empty catches now report. **Settings →
  Diagnostics** shows schema, storage used, days, offline state, last 8
  errors, Copy report, Export JSON.
- Clamps at `logSession` and the hv set reader (weight 0–2000, reps 0–200,
  minutes 0–600, incline 0–40) + `max` attrs.
- Switching units converts stored weights (`convertStoredWeights`) instead
  of relabelling 135 lb as 135 kg.
- `ai-parse.js`: explicit key names, origin allowlist, daily cap, body cap.
- Duplicate `openApplyProgramModal` — the later declaration (takes an
  object) shadowed the earlier (takes an id), so "Apply program" from the
  library was passing a string into `program.split`. Renamed
  `openApplyProgramByIdModal`.
- The orphan sweep: the old live-session logger and its modals, 17
  zero-caller functions, 12 helpers orphaned by them, the dead rest-timer /
  `SET_KINDS` block, 44 `.ws-`/`.wo-` CSS rules. `openLiftModal(name)` is a
  five-line wrapper onto the Hevy flow. Method that worked: **count
  whole-word refs across app.js + index.html; refs == 1 means orphan;
  delete bottom-up; re-scan; run both suites.** `#dashLegacy` is still in
  the DOM (hidden) — 63 ids referenced by legacy renders; removing it is
  its own batch.

## 8. Honest state assessment

This is a strong **single-player prototype**: ~22k lines, 86 automated tests (49 browser smoke, 10 week-durability, 27 API),
and an analysis layer that genuinely has no equivalent in MyFitnessPal,
Fitbod or Strong. It is **not** a product yet. In priority order:

1. **No backend for accounts.** v55 added a server-side *copy* (Netlify
   Blobs) for the ChatGPT API, which doubles as a restore point
   (`GET /api/gpt/state`), but there is still no account, no multi-device
   sync and no second user. Clearing site data loses everything, a new phone starts
   over, and there is **no way to know how many users exist** — which makes it
   unfundable regardless of feature quality. Supabase (auth + Postgres + RLS)
   is the natural fit. ~2–3 weeks. **Do this before anything else.**
2. **No privacy policy, no terms, no delete-my-data.** It processes health
   data. This is a legal requirement and an App Store blocker. ~2 days.
3. **No error tracking, no analytics.** If it breaks for her you will never
   know. ~2 days.
4. **Food depth is 1–2% of MFP.** 355 foods vs ~20M (OpenFoodFacts covers
   ~2M packaged goods but few whole foods). Fix with **USDA FoodData Central**
   (free, official, real micronutrients). Exercises are solved as of v48 —
   873 with photos, public domain.
5. **AI cost is unmetered.** `ai-parse.js` bills the project owner per call
   with no rate limit or per-user cap.
6. **`app.js` is ~15.2k lines in one file.** It works and the pipeline
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

**What she still has to do herself (told her at v59):** add to Home
Screen from Safari; reload the demo gym; test editing a saved coach
workout on a real iPhone; set `GPT_API_TOKEN` in Netlify + paste it in
Settings + create the GPT Action; add Anthropic credits; send a 512×512
icon; decide App Store (Apple Developer $99/yr + a Mac) vs backend first
(Supabase project) — recommendation is backend first.

**Buildable now:**
- **Settings never got the page-by-page design pass** that Dashboard,
  Nutrition, Fitness, Body and Health got. It's still walls of paragraph text.
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
and page-flow rebuild · `v25` `save()` made fail-safe · `v26` stat band
rebuilt, uniform gaps, equal side-by-side cards · `v27` step-attribute bug,
feet+inches height, and the training/cardio/food program · `v28` Goal Designer maths and the
explainer sheet · `v29` target date, body-part splits, researched cardio dose,
lift comparison and the program call-out · `v30` build-as-you-go session +
two never-declared constants · `v31` movement-text parsing and plan-to-log ·
`v32` one write path + write-it-out logging from any screen ·
`v33` full-app audit: no native dialogs, no dead controls, one profile source ·
`v34` modal stacking + START WORKOUT on unplanned days ·
`v35` one add-workout sheet and one add-food sheet from every entry point ·
`v36` button cull — Fitness header 5 actions -> 1 ·
`v37` three tabs not five, collapsed optional fields, and THE LOST WORKOUT ·
`v38` built to the reference: media rows, filter pills, totals block, no shouting ·
`v39` ONE fitness screen — the day sheet, the build-workout picker, sets/weights ·
`v40` week durability: the sets editor no longer deletes a logged workout ·
`v41` BLACK SCREEN — a button pointed at a view deleted in v18 ·
`v42` HOME — week strip, two rings, notepad plan, Left this week (step 1 of the rebuild) ·
`v43` HOME rebuilt to her mockup: five-tab nav, brain dump bar, gradient rings, This Week rows, vs Last Week ·
`v44` everything on Home routes into its category; the rings strip scrolls by week; month calendar with rings ·
`v45` THE WORKOUT FLOW — ten Hevy-style screens behind ▷ (step 2 of the rebuild) ·
`v46` anatomical body figure, muscle glyphs that read as muscles, AI sparkle removed ·
`v47` ring-centre runner and fork glyphs and the nav dumbbell/fork replaced with clean filled icons ·
`v48` free-exercise-db: 873 public-domain exercises with photos, muscles and equipment ·
`v49` RepDB: 701 flat illustrations in one style + finer anatomy; one fuzzy matcher for both libraries; credit line on More ·
`v50` Bryl Lim line art first (matches the dark UI); one style per surface; strict no-look-alike matching; three credits ·
`v51` OPTION D — line art painted teal→blue via CSS mask; placeholders match; one tile builder; week.js hardened ·
`v52` "last time" under every set on the logger; lifts up/down line under vs Last Week. Effort/RPE deliberately left out ·
`v53` LIFTS page — read-only, by lift: PRs, then every session by date with sets, volume, best ·
`v54` hardening pass (local date keys, schema migrate, error ring + Diagnostics, input clamps, unit conversion, AI function lockdown) and the step 6 orphan sweep (old live-session logger, 29 dead functions, 44 CSS rules) ·
`v55` THE CHATGPT API — `/api/gpt/*` Netlify Function on Netlify Blobs; app pushes a snapshot after every save, pulls and applies queued entries through the one write path ·
`v56` COACH HUB — every member, periods with deltas, PRs, log a lift, saved workouts applied to a month; off by default, demo gym included ·
`v57` SETUP rebuilt in the current look: four goals, 7 + doubles, eating styles, editable macros, body-comp scans feeding the plan ·
`v58` COACH HUB v2 (class sheet, month calendar with weekday pattern, CRM tables) and the app-wide glass + depth layer, pills removed ·
`v59` BODY FIGURE replaced with an MIT anatomical set: male + female, front + back, flip button, Fitbod layout ·
`v60` legacy dashboard deleted with a full orphan sweep; body figure coloured per muscle; row cleanup on Nutrition and Body ·
`v61` body figure gets a "This workout" mode: only the muscles that session used are lit, with worked / not worked lists ·
`v62` swipe the body figure sideways and she turns in 3D (front to back); the round button does the same ·
`v63` "Add one more": the workout view names the missed muscle group and a lift for it. ·
`v64` demo mode (`?demo=gym`) and the `/gym-app/` website showcase page for gym owners. ·
`v65` the app takes the video's look: one violet accent, native filled cells, one typeface, raised line-art tiles; 271 dead CSS rules removed.

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
- Current build: **v42**.

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

**THE REBUILD — HOME (v42, step 1 of 6).** After four rounds of "it looks
homegrown," she gave a full spec (ChatGPT-assisted, then corrected by her):
Apple Fitness on the main screen, Hevy when you open a workout, MyFitnessPal
for food, one app, three tabs. The agreed build order is in the transcript
and repeated here so the next step is unambiguous:

1. **Home** ✅ — week strip · two rings · notepad plan · Left this week
2. **The Hevy logger** — data change first for order + supersets
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

**Expected: 47/47 and zero page errors**, plus `node tracker/tests/week.js` at **10/10**. (Two console errors about
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
`v42` HOME — week strip, two rings, notepad plan, Left this week (step 1 of the rebuild).

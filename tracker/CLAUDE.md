# BERMO Tracker — CLAUDE.md (project handoff)

Read this first in any new conversation about the tracker.

## What this is
Personal nutrition + fitness + accountability app ("BERMO TRACKER" / BERMO.Fit)
for Lexi (BERMO.COLLECTIVE). A single-page web app at `/tracker/` inside the
bermoco.com static site, deployed on Netlify, installable on iPhone as a PWA.
Deliberately NOT linked from the main site nav — it's a standalone app.

- Repo: `lbermingham-droid/bermo-collective-site`
- Branch: `claude/nutrition-fitness-tracker-iS7XZ` — ALL tracker work goes here, never main
- Draft PR #1 exists ("preview only — do not merge")
- Preview URL: `https://deploy-preview-1--quiet-youtiao-0e2544.netlify.app/tracker/`
- Netlify rebuilds the preview ~60s after each push

## Files
- `tracker/index.html` — SPA shell: onboarding gate, topbar, dashboard hubs,
  all views (food/lift/plan/body/trends/history/settings), modals, overlays,
  PWA meta. Has a visible BUILD version marker — bump it each deploy so the
  user can confirm cache refresh.
- `tracker/app.js` (~11k lines) — ONE giant IIFE with all logic
- `tracker/styles.css` — BRAND theme (v15, matches bermocollective.com):
  deep navy #0a0c12, rounded 16px cards. Palette is EXACTLY four
  accents — electric teal #00f5d4 (primary), bright blue #4db8ff,
  purple #b788ff, hot pink #ff4d9d. NO YELLOW/AMBER anywhere (user
  rejected it) and no muted blues. Ring/bar TRACKS are one neutral
  dark navy #151b29 — never color-tinted (reads "muddy").
  BORDER RULE: status is shown with a FULL 1px colored border +
  matching colored text (like the site's cards) — never a left-edge
  accent rail; the user explicitly rejected left rails.
  ICON RULE: no emoji in the UI — clean inline stroke SVGs only
  (.bi wrapper). Emoji may remain in code comments/prompts.
  The BRAND LAYER at the bottom redefines the --iron-* variables; JS
  ring/chart hexes use the same palette. The user approved this look
  from her marketing site screenshots — do not revert to the older
  red/volt IRON palette. Fonts: Inter + Inter Tight + JetBrains Mono
- `tracker/data.js` — food DB (5x expanded), WOD library, movements,
  `programs` (StrongLifts/PPL/Upper-Lower/FullBody3x/BroSplit), activity levels
- `tracker/manifest.json` + `tracker/sw.js` — PWA; SW is network-first for
  HTML/CSS/JS so deploys show up without hard refresh
- `netlify/functions/ai-parse.js` — hosted Claude proxy for Brain Dump;
  key from Netlify env var (accepts `ANTHROPIC_API_KEY` and BERMO.Fit-style
  aliases; has a last-resort env scan). Users need NO key.
- `netlify/functions/send-emails.js` — email function

## Architecture (critical to know)
- **ONE selected-day state**: `currentDate` is the single source of truth
  for "which day am I looking at" — the dashboard deck day strip, month
  strip, nutrition date input, fitness stats, and diary all read/write
  it. NEVER introduce a second date variable for a view; wire new
  calendars to currentDate + renderAll() (guarded by the smoke test
  "calendars connected").
- **Local-first**: all data in `localStorage["bermo.tracker.v1"]`. No accounts.
- Global `state`: `profile`, `goals`, `customFoods`, `days`, `weights`,
  `measurements`, `prs`, `prsRep`, `mealTemplates`, `plan` (keyed `YYYY-W##`),
  `cycle`, `contract`, `activityGoals`, `hubPrefs`, `ai`, `wodIndex`, + more
- `state.days["YYYY-MM-DD"]` = `{ meals:{breakfast,lunch,dinner,snacks},
  water, sessions[], wodResult, activity:{move,exercise,stand}, checkin,
  symptoms[], workoutSession }`
- **Explicit pipelines (wrapper chains are GONE as of the 2026-07 cleanup)**:
  feature renders are composed in ONE place — the "PIPELINES" block near
  the end of app.js. `renderDashboard()` etc. call `renderXxxBase()` plus
  named steps in order. To extend a render, add a call in its composed
  function there. Do NOT reintroduce `const _orig = f; f = function(){...}`
  monkey-patching — it is banned.
- **Single init**: modules register startup code with `onReady(fn)`; one
  DOMContentLoaded listener runs the queue with each step isolated, so a
  throw in one step cannot kill the rest. Bind static elements with
  `on(sel, evt, fn)` — it warns instead of crashing if the element is
  missing. ALWAYS run `node --check tracker/app.js` before committing.
- New JS gets spliced INSIDE the IIFE before the final `})();` — a python3
  heredoc splice has been the working method. Avoid giant single Write calls
  (they caused API stream timeouts); append in chunks instead.

## Feature inventory (all built & deployed)
Nutrition: meal blocks, expanded food DB, OpenFoodFacts search + iOS barcode
scan, My Usuals templates, 1-tap quick log row, copy-yesterday, water grid,
macro pills, fiber/sugar detail, macro-based food classifier (red-flags),
smart macro reconcile.
AI: **Brain Dump** — natural-language day entry + photos (food plates, Apple
Watch rings, gym whiteboards) → `netlify/functions/ai-parse.js` → structured
JSON → confirm → routed into meals/sessions/activity. No user API key needed.
Legacy BYOK photo/text food logging also exists.
Fitness: SugarWOD-style categorized lifts w/ 1/2/3/5RM drill-down +
percentages + Hevy-style summary stats, Fitbod-style Workout Session overlay
(inline set logger, set kinds, rest timer, previous-performance, YouTube
How-To), Body Part Coverage (14-day, missing/under-trained suggestions),
anatomy heatmap, 12-wk heatmap, WOD suggestion (bottom).
Library (v18, replaced the weekly Planner page): #view-library —
searchable/filterable movement list (body part + equipment chips,
A-Z/Z-A), per-exercise PHOTOS (compressed to 240px thumbs in
state.exPhotos, guarded against quota), favorites hearts, exercise
detail sheet (photo, equipment, muscles, PR, LOG THIS LIFT), and the
workout builder (MY WORKOUTS tab). Reached via Fitness > SAVED.
Calendar (v18): month grid on Fitness > CALENDAR — Sunday-first, two
dots per day (food/workout), tap a date to select it app-wide.
Body: weigh-ins, measurements, InBody scan parse, adaptive macros
(Macrofactor-style TDEE recalc), smart onboarding wizard (sex/age/activity →
TDEE → macros + program), macro calculator (Mifflin-St Jeor / Katch-McArdle).
Health/Deep signal (v20): three cards above the v19 ones.
  #bigPicCard "The bigger picture" — every day with a check-in is scored
  0-100 on how it FELT (energy + mood - symptoms); the card then ranks
  every input against that score, profiles the best third of days vs the
  worst third, shows what happens when habits STACK (0-1 / 2 / 3 / 4-5
  habits met -> average score), and prices each habit in points.
  #fqCard "Food quality" — name-based tagging (FQ_GLUTEN / FQ_DAIRY /
  FQ_ULTRA / FQ_WHOLE / fat quality) rolled up per day by
  dayFoodQuality(); shows a real-vs-mixed-vs-processed composition bar
  plus gluten/dairy/fat-share counts, then correlates those against
  symptoms, energy and volume. Gluten and dairy use a MEAN SPLIT
  (days-with vs days-without) not a Pearson r — that's the honest test
  for a binary exposure. Fiber/sugar findings only run on days where
  >=50% of the foods carried real fiber/sugar numbers, because
  totalsDetailFor() estimates them from carbs otherwise and the
  correlation would just re-discover carbs. Capped at 5 findings.
  #smCard "Muscle coverage" — subMusclesForExercise() resolves ANY
  logged lift down to the region it trains (SUB_MUSCLES: back ->
  lats/mid-back/traps/rear delts/erectors; legs -> quads/adductors/
  hams/calves; glutes -> max/med; chest -> upper/mid/lower; shoulders,
  arms, core). subMuscleGaps(scope) reports, per part TRAINED in the
  window, which regions got work and which were skipped, dates the gap
  from a 90-day last-hit index, and attaches the fix from SUB_FIX.
  Week / 4-week toggle (state.ui.smScope) + a "dropped this week"
  detector vs the prior 3 weeks. Exercises it can't resolve are named,
  not silently dropped.
  Every finding across all these cards carries an `action` line.
Carb cycling (v20): state.goals.cycle = {on,trainC,trainF,restC,restF}
  built by buildCarbCycle() (carbs swap with fat 1:1 by kcal, fat never
  below max(35g, 0.25g/lb)). goalsForDay(key) is the accessor every
  DAY-SCOPED macro display uses — it picks the training or rest target
  from logged sessions, >=20 min of Apple exercise, or the PLANNED
  workout for that weekday. Nutrition page shows a TRAINING DAY / REST
  DAY CARBS tag. Macro calculator gained a "Recomp" goal (-150 cal) and
  a "Lean / recomp 40/40/20" split.
Health/Correlations (v19): #corrCard runs a Pearson-r engine over
paired daily rows (_dailyRows -> foodCorrelations): protein x volume,
yesterday's calories x today's volume, water x volume, sleep x volume,
carbs x symptom count, trained-vs-rest energy split, protein-goal hit
rate. Every card shows n and r with a strength word, needs >=6 paired
days, and says so honestly when nothing correlates. #bpTrendCard shows
per-body-part volume for the last 4 weeks vs the 4 before (+/-% tags).
Trends: 11-rule insight engine (day-of-week cal, sleep×PR, water×training,
cycle phase, logging %, protein rate, symptom×sleep/water/trigger/cycle,
seasonal sickness), cycle tracking, symptom tracker (80+ incl mouth ulcers,
Raynaud's, pneumonia, laryngitis, acne, emotional), charts.
Accountability: Goal Contract (identity/goal/deadline/consequence/reward +
consistency chain), compassionate Restart card (3+ missed days), 3-tap
check-in, smart banners, reminders (workout / water / end-of-day-untracked).
Rings: 4 rings (Move/Exercise/Stand/Nutrition) in distinct BERMO colors,
auto/manual modes, day-strip that swaps the viewed date, Apple Watch
screenshot import ("Apple Watch snap").
IRON layer (v7): aggressive restyle — near-black, sharp 3-4px corners (no
pills), blood red #ff2231 / volt #d8ff00 / cyan #00e5ff palette, compact.
Command Deck at dashboard top: daily + weekly rings, one-line week strip
(food + workout verdict dots), one-line month strip, week schedule
(planned/done/missed). Workout Library on Plan tab (state.workoutLib):
build named workouts from categorized lifts + 24 machines + custom,
START (-> session logger) / ASSIGN to weekdays / edit / delete.
Cardio logger: 16 MET-based types incl. uphill walk (incline + mph),
live timer or manual minutes, kcal from body weight, feeds rings via
autoComputeActivity cardio branch. Accountability callouts appended
after smart banners: missed-planned-yesterday ("RUN IT NOW"), body-part
neglect (8+ days), weekly volume backslide vs 3-week average.
IA v8: 6-section nav (Home / Fitness / Nutrition / Body / Goals / Health
+ gear -> Settings; Plan + History off the main nav — Plan reachable via
Fitness > Calendar/Saved chips + "EDIT WEEK"). Dashboard decluttered to:
banners -> mini-log row -> 4-ring deck (Move / Workout / Nutrition-cal /
Water, today + week aggregate) -> week + month hit/fail strips ->
Today's Nutrition card (cal bar, P/C/F bars, water bar + one-tap +8oz) ->
Workouts This Week editable list (tap row = edit plan day; today w/
exercises = start session). Hubs/WOD/contract hidden from dashboard
(CSS), contract + restart moved to new view-goals (+ targets grid +
weight-vs-goal canvas chart). Fitness sub-chips: Summary (muscle map,
plan mini, today's sessions) / PRs / Progress (heatmap + coverage) /
Calendar / Saved. Nutrition chips scroll-anchor. Muscle Map v2
(#muscleMapCard): front+back SVG colored by per-part training recency
(red just-hit -> orange -> volt fresh -> gray going-cold), Fitbod-style
"days since last workout" + "fresh muscle groups" stats, GOING COLD
callout, parts tap into exercise suggestions.
v9: per-section header rings (fitness volt / nutrition orange / body
cyan %), Fitness PROGRESS training-volume Chart.js card (W/M/6M/Y,
best/avg/trend), Nutrition SUMMARY = real sub-toggle (class .nsec-hide
beats legacy !important) with MFP-style nutrients table (Total/Goal/
Left incl fiber+sugar), Body composition grid (weight/BF%/lean/fat/
BMI/BMR Katch-McArdle), partsForExercise() fuzzy body-part resolver
(machines + customs now hit the muscle map/coverage/neglect), 4-ring
deck now Move/Workout/NutritionCal/Water. QA pass: legacy cream
components restyled to IRON (ai-btns, nut-pills, detail card, body
coverage, date picker, help banner rewritten for new nav), stranded
dashboard greeting hidden, singular/plural fixes. Screenshot QA loop:
seed data via localStorage then capture every page (scratchpad
shots.js pattern).
v10 dashboard refinement (user page-by-page pass, page 1): greeting
moved to top; mini quick-log buttons REMOVED (brain dump covers them);
brain dump is one line — red BRAIN DUMP + photo + speak buttons (speak
uses webkitSpeechRecognition when available, else focuses the textarea
for the iOS keyboard mic; photo auto-opens the picker). Ring deck v3:
Apple-style — 7-day mini-ring selector strip (tap a day => deckDate
drives BOTH ring stacks + stats + water), fitness rings (move/exercise/
stand) + nutrition rings (cal/protein/carbs) side by side in ONE flat
card, stat lines include Lifted lb + fat, one-line water bar w/ +8 that
logs to the selected day, month strip kept. Today's Nutrition card
REMOVED (deck stats replaced it). openPlanDayModal REPLACED by
multi-workout day editor: N workouts per day (double days), each with
saved-workout / category / custom picker + time-of-day; storage
back-compat {type,time,exercises,extra:[]}; week list shows time tags
+ "+ second workout" sub-lines. New Compared To card: this week vs
last/2/4-weeks-ago/custom week — workouts, volume, avg cal/day
(lower=better), water, with delta arrows; fair same-elapsed-days
comparison.
v11 nutrition rebuild (page-by-page pass, page 2 — MFP reference):
brain row (type/photo/speak, .js-brain delegated) + one-line stat row
now on EVERY section page (nutrition Cal/P/C/F/water; fitness Move/Ex/
Stand/Lifted; body Now/Goal/To-go). Nutrition tabs = DIARY / CALORIES /
NUTRIENTS / MACROS (real section swaps; charts render after unhide).
DIARY: one box, meals with per-meal cal+P/C/F, +ADD and ±M
(macros-only quick log, doubles as item editor) per meal; tap item =
action sheet (move to meal, duplicate to any date+meal, favorite,
edit, delete); SELECT mode -> multi-pick -> SAVE AS MEAL (template);
red-flag tiers now border diary items. CALORIES: MFP donut by meal
(blue palette) + legend % + Total/Exercise-Burn/Net/Goal rows.
MACROS: MFP split donut (teal/purple/orange) + Total%-vs-Goal% rows.
NUTRIENTS: Total/Goal/Left rows now with progress bars. Favorites
(state.favFoods) show atop the food-modal Quick log pane. Removed:
meal-grid, nut-summary pills, ai-quick-row, quick chips, save-as-usual
buttons (swept per hygiene rule; .meal-item CSS kept — custom foods
list uses it). Old smoke food-step now uses [data-dy-add].
v12 fitness rebuild (page-by-page pass, page 3): WEEKS START SUNDAY
globally (weekStart() is the single source; plan keys are day-name
based so data survived) + fmtTime12() for all displayed times (inputs
stay type=time). Fitness Summary mirrors nutrition: THIS WEEK compact
Sun-Sat list (tap row = select that day via currentDate) -> fitDayCard
day view (title, gym, time, movement list, START WORKOUT -> session
logger, + QUICK SET, EDIT DAY, heart saves workout to workoutLib).
Day editor gained a GYM field + a MOVEMENTS textarea per workout (one
per line, "name — scheme" supported; picking a saved workout prefills
it); editor save calls renderAll() so every page refreshes. Session
overlay: optional start/pause CLOCK in the header (saves durationMin
on Done when >=1 min), per-exercise heart -> state.favLifts (favorites
render as the first category in the workout builder). Rest-timer bar
moved to the BOTTOM (was covering the header buttons — caught by e2e).
partsForExercise extended with real gym vocabulary (thruster, RDL,
hamstring, kickback, bridge, lat) + hamstring-curl no longer maps to
arms. planMini + lift-mini-strip removed (dead). "1 entry" grammar.
Cleanup (v9.1): dead code removed — legacy anatomy heatmap card (muscle
map replaced it), hidden deck week-schedule strip (Workouts card replaced
it), Customize-hubs menu item + dead dashboard header bindings. app.js
has a CODE MAP comment at the top; styles.css has a STYLESHEET LAYER MAP
explaining the layered cascade (bottom wins; use classes not inline
display to hide because legacy layers use !important).
Shell: 6 dashboard hubs (hidden on dashboard since v8), detail drill-down
overlay (Day/Week/Month/90D/Year + date navigation), back buttons everywhere,
navy theme + density pass, mobile layout on any touch device <1100px,
iOS safe-area fixes, FAB hidden on mobile (mini quick-log row instead),
pull-to-refresh, Apple Health CSV import (Health Auto Export), JSON
export/import, PWA install.

## Known constraints
- Web apps CANNOT read Apple HealthKit directly. Workarounds in place:
  CSV import + Apple Watch screenshot parsing via Brain Dump. Real auto-sync
  requires a native/Capacitor iOS app ($99/yr Apple dev, separate project).
- Real SMS needs Twilio (~$2-3/mo) + a function; email function exists.
- TESTING (required before every commit): browser smoke test at
  `tracker/tests/smoke.js` (Playwright). Serve repo root on :8901,
  `npm i playwright` in the scratchpad, launch chromium with
  `executablePath: "/opt/pw-browsers/chromium"` and proxy
  `{ server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" }`
  (do NOT `npx playwright install`). Covers load, wizard onboarding,
  mobile overflow ON EVERY PAGE (not just the dashboard), all tabs,
  food + lift logging end-to-end, modal close, dashboard re-render,
  cross-page date sync, and the v20 health engines (seeds a quad-free
  leg week and asserts the gap is named WITH a fix).
  Expected: 16/16 + zero page errors.
  Also always `node --check tracker/app.js`. The user additionally
  tests on iPhone — when something breaks there, ask for a screenshot
  + the exact element tapped.

## Working conventions
- HYGIENE RULE: any change that removes or replaces UI must sweep for
  orphans in the same batch — dead render functions, dead bindings
  (grep the removed ids/classes across app.js), and dead CSS rules
  (grep each removed class in index.html + app.js; 0 refs = delete the
  rule). Verify with smoke + a screenshot compare before committing.
- Descriptive commits; push each batch; remind user to wait ~60s + check the
  BUILD marker to confirm the new version loaded
- `node --check` on app.js AND data.js before every commit
- Keep the BERMO brand but compressed/clean — reference apps the user loves:
  MacroFactor, Hevy, Fitbod, Caliber, Fitia, SugarWOD, MyFitnessPal
- User is learning to code but non-expert: plain language, be honest about
  tested vs untested, costs, and privacy (photos/text go to Anthropic via
  the Netlify function)
- Macro goal modes she cares about: gain (~2100), lose (~1100),
  **lean/recomp (~1450, high protein / low fat / mod-high carbs)**, and
  carb cycling (training days high carb, rest days low). Check whether the
  lean + carb-cycling presets made it in; if not, they're the top backlog item.

## Backlog / next up (audited 2026-08, v20)
BLOCKED ON THE USER (cannot be built without her):
- Brain Dump is code-complete but returns "credit balance too low" —
  needs credits on the Anthropic account behind the Netlify env key.
- App icon: she wants the KIERA husky photo; the image was never
  uploaded. Drop it at tracker/icon.png (512x512) and it ships.
- Moving the tracker to its own repo: needs her to create the repo +
  Netlify site (asked twice; ~20 minutes once she says go).
- Weekly buddy-email recap via send-emails.js — needs a recipient.
- Twilio SMS — ~$2-3/mo, she hasn't opted in.

STILL OPEN (buildable):
- Body / Goals / Settings never got the page-by-page refinement pass
  that Dashboard / Nutrition / Fitness / Health got. Settings is still
  long-form paragraphs.
- Muscle map is geometric, not anatomical (she asked for prettier).
- Sub-muscle coverage reads LOGGED sessions only; it could also
  pre-check a PLANNED workout and warn BEFORE she trains.
- Native iOS wrapper (Capacitor) for true HealthKit sync — future
  project, $99/yr Apple dev.

DONE IN v20 (was top of this list): Lean/Recomp + carb-cycling presets.

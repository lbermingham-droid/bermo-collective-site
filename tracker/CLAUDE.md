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
- `tracker/app.js` (~8k lines) — ONE giant IIFE with all logic
- `tracker/styles.css` — brand theme (cyan #00f5d4 / lime #c8f500 /
  pink #ff2d7a on navy/dark), Inter + Inter Tight + Montserrat + JetBrains Mono
- `tracker/data.js` — food DB (5x expanded), WOD library, movements,
  `programs` (StrongLifts/PPL/Upper-Lower/FullBody3x/BroSplit), activity levels
- `tracker/manifest.json` + `tracker/sw.js` — PWA; SW is network-first for
  HTML/CSS/JS so deploys show up without hard refresh
- `netlify/functions/ai-parse.js` — hosted Claude proxy for Brain Dump;
  key from Netlify env var (accepts `ANTHROPIC_API_KEY` and BERMO.Fit-style
  aliases; has a last-resort env scan). Users need NO key.
- `netlify/functions/send-emails.js` — email function

## Architecture (critical to know)
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
Plan: Mon–Sun weekly planner, 28 types + custom, per-day exercise lists w/
schemes, auto-fill from prior week, past weeks locked, pre-built programs.
Body: weigh-ins, measurements, InBody scan parse, adaptive macros
(Macrofactor-style TDEE recalc), smart onboarding wizard (sex/age/activity →
TDEE → macros + program), macro calculator (Mifflin-St Jeor / Katch-McArdle).
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
Shell: 6 dashboard hubs (reorder/hide via Customize), detail drill-down
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
  mobile overflow, all tabs, food + lift logging end-to-end, modal
  close, dashboard re-render. Expected: 14/14 + zero page errors.
  Also always `node --check tracker/app.js`. The user additionally
  tests on iPhone — when something breaks there, ask for a screenshot
  + the exact element tapped.

## Working conventions
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

## Backlog / next up
- Verify + polish everything above on the phone (screenshot-driven QA)
- Lean/Recomp + carb-cycling macro presets (if not yet present)
- Weekly buddy-email recap via send-emails.js (needs recipient + schedule)
- Twilio SMS (optional, user hasn't opted in)
- Native iOS wrapper (Capacitor) for true HealthKit sync — future project

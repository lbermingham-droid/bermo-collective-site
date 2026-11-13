# Connecting ChatGPT to the tracker

This gives a custom GPT read and write access to your tracker. It takes about
ten minutes and you never paste a key into a chat.

## How it works, honestly

Your phone is still where the data lives. The app sends a copy to the
server a few seconds after every save. ChatGPT reads that copy. When ChatGPT
logs something, it goes into a queue on the server, and the app pulls the
queue and applies it the next time it is open (on open, when you come back to
it, and every 90 seconds while it is on screen). So:

- Ask ChatGPT "what did I eat this week" or "how is my squat trending" and it
  answers from the last copy the app sent.
- Tell ChatGPT "log a chicken bowl for lunch, 520 cal" and it appears in the
  app the next time you open it, with a toast saying what was added.
- Everything ChatGPT adds goes through the same code the buttons use, so
  rings, PRs, week comparison and the Lifts page all see it.

Storage is Netlify Blobs on your own site. One token protects everything.

## Setup

1. **Make a token.** Any long random string, 16 characters or more. A
   password manager's generator is fine.
2. **Netlify.** Site configuration, Environment variables, add
   `GPT_API_TOKEN` with that value. Redeploy once (or just push the next
   build).
3. **The app.** Settings, ChatGPT link, paste the same value, Save. The
   status line turns teal and says when it last sent and checked. Tap
   "Sync now" once.
4. **ChatGPT.** Explore GPTs, Create. In Configure, scroll to Actions,
   Create new action.
   - Authentication: API Key, Auth type **Bearer**, paste the same token.
   - Schema: **Import from URL** and paste the address shown in the app's
     ChatGPT link card. It ends in `/api/gpt/openapi.json`.
   - Privacy policy: only needed if you publish the GPT. Keep it "Only me".
5. Paste these instructions into the GPT's Instructions box:

```
You are Lexi's fitness and nutrition assistant with access to her BERMO
Tracker. Before answering anything about her food, workouts, weight or plan,
call getSummary (and getLifts for lift questions). When she tells you what
she ate or did, call logEntries with the date she means (default today) and
only the numbers she gave or that you estimated and told her. Weights are in
the units from profile.units. Never invent entries. After logging, say what
you queued and that it lands in the app when she opens it. Weeks start on
Sunday. Do not grade her or add motivational commentary; give numbers and
plain comparisons.
```

## What the GPT can call

| Call | What it returns or does |
|---|---|
| `getSummary(from, to)` | Each day: meals with macros, totals, water, weight, sessions, plan lines. Plus goals, PRs and the week's plan. Default last 7 days. Max 32 days. |
| `getDay(date)` | One day in full. |
| `getPlan(date)` | The seven planned days of the week containing that date. |
| `getLifts()` | Every lift logged, with heaviest set, estimated 1RM and last date. |
| `logEntries(...)` | Queue meals, lifts with sets, cardio, water, weight or plan lines for a date. |
| `listPending()` | What is queued but not yet applied on the phone. |

## Limits worth knowing

- ChatGPT cannot see anything logged since the app last sent a copy. Open
  the app and it sends within a few seconds.
- Entries ChatGPT logs are not in the app until the app is opened. There is
  no background sync on iPhone without a native app.
- The deploy preview and the live site share one store, since you use the
  preview as the app. If that ever changes, the store name in
  `netlify/functions/gpt.mjs` should change with it.
- Rotate the token any time: change it in Netlify, in the app, and in the
  GPT's action. The old one stops working at once.

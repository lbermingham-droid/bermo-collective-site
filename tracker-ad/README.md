# BERMO tracker ad (Remotion)

A 20-second, 1080 x 1920 Instagram reel advertising custom tracking apps to
gym owners. It uses real screens captured from `/tracker/` with Lexi's own
Oct 20 – Nov 20, 2026 training data entered through the app.

## Adding your footage

Put clips in `tracker-ad/public/clips/` with exactly these names (`.mp4`
or `.mov`). Any that are missing show a labelled placeholder card.

| File | Where it appears | On screen for |
|---|---|---|
| `gym.mp4` | opening shot | 1.5 s |
| `run.mp4` | "Runs, walks, all of it." | 1.5 s |
| `food.mp4` | not used in the current cut (slot kept for later) | – |
| `beach.mp4` | end card | 1.5 s |

The raw clips are gitignored because this repository is public. Vertical footage works best. Each clip is cropped to fill a tall rounded
card; the first 1.5 seconds are used (change `startFrom` on the
`ClipCard` in `src/Ad.tsx` to start later, in frames at 30 fps).

## After adding or changing a clip

The big text sits behind you, so each clip needs a cutout of you per frame:

    pip install rembg onnxruntime pillow
    /usr/local/bin/python3.13 scripts/matte.py

## Commands (from `tracker-ad/`)

    npm install
    npm run render      # writes out/bermo-ad.mp4
    npm run studio      # live preview and scrubbing
    npm run capture     # re-capture app screens (serve the repo root on :8901 first)

## Layout rules the code holds to

- 120 px safe margin on every side for text and the phone. Footage runs
  full-screen behind. The big text is drawn BEHIND the subject (you, the
  phone, the body figure), so it never covers anything; small glass chips
  sit in the empty bottom of each screen.
- No shot is longer than 2 seconds (see `SHOTS` in `src/Ad.tsx`).
- Every number on screen is real: it is either read off the captured app
  screen or comes straight from `scripts/review-data.js`.

## What the data file does and does not include

`scripts/review-data.js` holds only entries that have a date and numbers.
Ranges use the lower bound. kg implements are converted to lb per hand.
Sessions without recorded numbers are logged by name only. Historical
bests that have a year but no date (leg press 450 x 2 in 2021 and so on)
are NOT entered, because the app needs a date and inventing one would turn
a memory into a record.

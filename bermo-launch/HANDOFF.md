# BERMO Launch — Build Handoff

Status as of this handoff: planning phase, hero copy LOCKED, image processing pending, build pending.

---

## Where things live

- GitHub: `lbermingham-droid/bermo-collective-site`
- Working branch: `claude/plan-bermo-launch-zcU7q`
- Live preview branch: `gh-pages` (has `.nojekyll`, awaiting Pages enable in repo settings)
- Bermoco.com: separate Netlify site `quiet-youtiao-0e2544` — DO NOT TOUCH
- Local download URL (gets latest preview as ZIP):
  `github.com/lbermingham-droid/bermo-collective-site/archive/refs/heads/gh-pages.zip`

---

## Brand system (locked)

### Colors
```
--black: #0a0a0a
--cyan:  #00f5d4   /* primary accent */
--lime:  #c8f500   /* secondary accent */
--cream: #f0efe9   /* light background */
--off:   #f5f5f0
--gray:  #888888
```
No pink. No script fonts.

### Fonts
- Display: Inter Tight 800
- Body: Inter 400/500/600
- Wordmark only: Montserrat 900 (the BERMO. logo)

### Voice
- First person, direct, unfiltered. Short punchy sentences.
- NO dashes anywhere in copy.
- BANNED words until June 1: staffing, recruiting, hiring agency, placement, talent acquisition, headhunting, workforce solutions.
- Approved framing: deploy, snap-in, execution, alignment, command center, marketplace, pod, scan.

### Mascots
- **Kiera the wolf** — quality guardian, scanner, hunter. "Finds what is not connecting."
- **BB the bot** — alignment infrastructure operator, handoff guardian. "Always there. Human led."
- Rule: write as personas, not cartoons. Show them PERFORMING the role, not standing beside it.

---

## Positioning (locked)

- Category: **Talent Alignment Marketplace for Founder-Led Teams**
- The offer: **BERMO Scan + Growth Blueprint** — first 5 businesses get it free
- Single primary CTA across the site: **Claim a Scan + Blueprint**
- Single secondary CTA: **Get on the waitlist to learn more**

---

## HERO (LOCKED)

| Element | Copy |
|---|---|
| Tag (above headline) | Talent Alignment Marketplace for Founder-Led Teams |
| Headline | Your entire growth team. Under one roof. |
| One gradient word | "roof" in cyan |
| Support line | Pre-vetted specialists. Less than the salary of one full-time hire. Often deployed in under a week. |
| Sub-head | You've tried hiring specialists, tweaking the site, and adding tools, but growth still feels stuck. BERMO shows you why. We find the missing piece behind your stalled revenue, then deploy pre-vetted specialists and execution pods from one command center, often in under a week. |
| CTA label above button | Find the missing piece with a BERMO Scan + Growth Blueprint. |
| Primary button | Claim a Scan + Blueprint |
| Incentive line | First 5 businesses get it free. |
| Secondary (text link) | Get on the waitlist to learn more |
| Hero visual | Kiera standing in-frame (kiera-portrait.png) — NO wave background |

---

## Design rules

### What NOT to do
- NO gradient wave background (that's Stripe, not BERMO)
- NO multiple disconnected boxes for one topic
- NO mascots floating decoratively
- NO dashes in copy

### What TO do
- White/cream dominant page, bold ink and cyan accents
- Solid color blocks per section (cream / ink / cyan), full-width
- Each section owns ONE topic — bullets stay inside ONE card, not split across multiple
- One colored word per headline (Stripe pattern)
- Horizontally-scrollable card carousels for feature sets (not grids)
- Cards contain UI mockups inside them
- Sticky bottom CTA bar that follows scroll: "Claim a Scan + Blueprint" + "Get on the waitlist"
- Mascots PERFORM their role inside section visuals (Salesforce Astro pattern)

---

## Section plan (post-hero, all pending lock)

1. **Hero** — locked above
2. **Platform card** — dark/ink section, `platform-preview.png` (WIP dashboard) full width, caption: "One command center. Every pod. Every outcome." — replace image when real platform ships
3. **Network diagram** — animated CSS/SVG showing Founder → Scan (Kiera) → Gap → Pod Assembly (BB) → Specialists → Outcome (escrow vault). No real platform needed, illustrated concept only.
4. **How it works** — single cyan block, headline above ("To deploy a growth pod you need:"), 4 internal items: Scan + Blueprint / Pod Match / Snap-In Deploy / Outcome Vault
5. **Founder quote** — Lexi's 15-year credibility line + "BERMO turns that instinct into a system"
6. **The 5 founders this month offer** — urgency frame, primary CTA repeats
7. **Footer** — specialist link "Have a specialty? Join BERMO."

---

## Specialist landing page (separate file, noindex until June 1)

- Path: `specialist.html`
- Tag: A new kind of marketplace for freelancers and founder-led startups
- Headline: Bring your specialty. We'll bring the pre-vetted client.
- Sub: BERMO connects freelancers, founder-led startups, small shops, or anyone with a strong specialty looking to help with projects with clients who already know the real gap and are ready to execute with you as part of a pod. No more lead hunts or low-context projects.
- Primary CTA: Apply to the BERMO network
- Secondary CTA: See how pods work
- Bullets (one card, not separate):
  - No more explaining the basics. Founders arrive with a Scan + Blueprint.
  - No more scouting scattered leads.
  - No more chasing invoices and handoff chaos.
  - No more racing to the bottom on generic marketplaces.
- Linked from main page footer only, NOT in nav.

---

## Mascot images

User has uploaded JPEGs from iPhone with random filenames. Mapping:

| iPhone filename starts with | Rename to | Description |
|---|---|---|
| `C0DF93F0...` | `kiera-portrait.png` | Kiera solo, white background |
| `03A9225F...` | `bb-portrait.png` | BB solo, white background |
| `79690F1F...` | `kiera-gap.png` | Kiera sniffing crack with BB (cyan bg) |
| `43558341...` | `bb-loading.png` | BB in solution room (dark bg) |
| `76605E0E...` | `kiera-bb-duo.png` | Kiera + BB at open door |
| `AB05517B...` | `kiera-bb-triptych.png` | Kiera + BB napping |
| `EF6508E7...` | `kiera-solo-gap.png` | Kiera at gap without BB |
| `24C40788...` | `bb-alt.png` | Alternate BB (correct color) |
| (platform mockup) | `platform-preview.png` | WIP dashboard screenshot |

### Processing rules
- `rembg` and `pillow` installed via `pip install rembg pillow`
- Portraits (kiera-portrait, bb-portrait, kiera-bb-duo): REMOVE white background, export as PNG with transparency
- Scene images (kiera-gap, bb-loading, triptych): KEEP backgrounds intact, just convert JPEG → PNG
- All output to `bermo-launch/assets/images/`

Sample rembg script:
```python
from rembg import remove
from PIL import Image
img = Image.open("input.jpg")
out = remove(img)
out.save("output.png")
```

---

## Build order (when planning is locked)

1. Process mascot images: rename, remove backgrounds where needed, save to `assets/images/`
2. Rewrite `assets/css/global.css` — remove gradient wave styles, define solid section blocks
3. Rewrite `assets/css/components.css` — sticky CTA bar, horizontal carousel, network diagram, contained-bullet card pattern
4. Rebuild `index.html` with locked hero + sections 2-7
5. Build new `specialist.html` (noindex, unlinked from nav)
6. Update `social/instagram-grid.html` with new positioning copy
7. Update `social/linkedin-posts.html` with new positioning copy
8. Update `business-card/card.html` if positioning copy changed
9. Update `mascot-strategy.html` with new Kiera/BB role definitions
10. Commit and push to `claude/plan-bermo-launch-zcU7q`
11. Push subtree to `gh-pages` for live preview
12. User downloads ZIP from gh-pages, reviews locally

---

## Reference inspiration (use structure/interaction patterns, NOT visual style)

- **Stripe.com** — bento card structure, sticky bottom CTA, horizontal carousel pattern, one-word-gradient headlines
- **Salesforce Instagram** — mascot performing function, single-block-per-topic structure, irreverent meme content for engagement, role-explainer cards

---

## What's pending from the user

1. Upload mascot JPEGs to:
   `github.com/lbermingham-droid/bermo-collective-site/upload/gh-pages/assets/images`
2. Lock platform card section copy
3. Lock network diagram node labels
4. Lock "How it works" 4-item copy
5. Lock founder quote section
6. Lock 5-founder offer urgency framing

After 1 + 2-6 are done, build can begin.

---

## Active todos / blockers

- GitHub Pages enabled? Last check: 403. User to confirm Pages settings has source set to gh-pages branch.
- Netlify `bermo-launch` site exists (id: 200e5b33-0b57-4d26-8dc0-037652a986da) but unused — user wants to avoid Netlify due to storage limits.
- Repo is now PUBLIC (user changed visibility manually).

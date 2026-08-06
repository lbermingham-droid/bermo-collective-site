#!/usr/bin/env python3
"""Builds the four August single-slide ads (1080x1350) on the approved
BERMO. ad chassis (src/chassis.css + src/fonts.css + src/mascot.b64,
vendored from carousels/ad-revenue-gap-scan.html) and renders PNGs.

Run: python3 build_ads.py            (writes html + png/ )
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
FONTS = open(os.path.join(SRC, "fonts.css")).read()
CHASSIS = open(os.path.join(SRC, "chassis.css")).read()
MASCOT = '<img src="data:image/png;base64,%s" alt="" class="msct" style="border-radius:50%%;display:block;"/>' % open(os.path.join(SRC, "mascot.b64")).read().strip()

# additions for the three UI cards this set introduces; everything else
# reuses the approved chassis classes untouched
EXTRA = """
.askrow{display:flex;gap:14px;align-items:flex-start;margin-bottom:22px;}
.askrow .who{flex-shrink:0;width:44px;height:44px;border-radius:50%;background:#242424;color:#e8e8e8;display:flex;align-items:center;justify-content:center;font:700 18px 'Inter',sans-serif;}
.askrow p{font:500 24px/1.4 'Inter',sans-serif;color:#e8e8e8;background:#1c1c1c;border:1px solid #2c2c2c;border-radius:4px 16px 16px 16px;padding:14px 20px;}
.ansrow{display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:10px;margin-bottom:10px;background:#161616;}
.ansrow .n{font:800 20px 'Inter Tight',sans-serif;color:#9a9a9a;width:28px;}
.ansrow .nm{flex:1;font:600 22px 'Inter',sans-serif;color:#e8e8e8;}
.ansrow.you{background:rgba(255,45,122,0.10);border:1px solid rgba(255,45,122,0.35);}
.ansrow.you .nm{color:#ff6ba0;}
.mailhead{display:flex;justify-content:space-between;align-items:center;padding:22px 28px;border-bottom:1px solid #ececea;}
.mailhead .s{font:800 24px 'Inter Tight',sans-serif;color:var(--ink);}
.mailmsg{display:flex;gap:14px;padding:20px 28px;align-items:flex-start;}
.mailmsg .who{flex-shrink:0;width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 17px 'Inter',sans-serif;background:#0a0a0a;color:#00f5d4;}
.mailmsg .who.buyer{background:#ececea;color:#555;}
.mailmsg .m .from{font:700 19px 'Inter',sans-serif;color:var(--ink);}
.mailmsg .m .from span{font-weight:400;color:#8a8a8a;font-size:16px;margin-left:8px;}
.mailmsg .m p{font:500 22px/1.4 'Inter',sans-serif;color:#333;margin-top:4px;}
.mailwarn{display:flex;align-items:center;gap:12px;background:rgba(255,45,122,0.08);border-top:1px solid rgba(255,45,122,0.25);padding:18px 28px;font:700 22px 'Inter',sans-serif;color:#e0246d;}
.feedgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:24px;}
.feedgrid .tilep{height:150px;border-radius:8px;background:#1c1c1c;position:relative;overflow:hidden;}
.feedgrid .tilep i{position:absolute;inset:0;background:linear-gradient(140deg,rgba(255,255,255,0.05),transparent 60%);}
.feedhead{display:flex;align-items:center;gap:14px;padding:22px 24px;border-bottom:1px solid rgba(255,255,255,0.08);}
.feedhead .av2{width:52px;height:52px;border-radius:50%;background:#242424;display:flex;align-items:center;justify-content:center;font:900 18px 'Montserrat',sans-serif;color:#00f5d4;}
.feedhead .h .u2{font:700 21px 'Inter',sans-serif;color:#fff;}
.feedhead .h .st{font:500 17px 'Inter',sans-serif;color:#9a9a9a;}
.bubble{position:absolute;right:34px;top:150px;background:#fff;color:var(--ink);font:600 22px/1.35 'Inter',sans-serif;padding:16px 22px;border-radius:16px 16px 4px 16px;box-shadow:0 20px 50px rgba(0,0,0,0.5);max-width:330px;z-index:4;}
.kwline{font:900 28px 'Inter Tight',sans-serif;color:var(--off);}
.kwline b{color:var(--cyan);}
"""

def ad(name, note, h1, h2, card, verdict, chip, cta):
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{name}</title>
<style>{FONTS}
{CHASSIS}
{EXTRA}</style></head><body>
<div class="pagehead"><strong>{name}</strong><br>{note}</div>
<div class="slide dark cover"><div class="bar"><div class="wordmark">BERMO.</div><span class="cover-shadow-tr">{MASCOT}Shadow.</span></div>
<div class="content" style="align-items:flex-start;text-align:left;gap:36px;justify-content:center;padding-top:20px;">
  <div>
    <h1 style="font-size:82px;line-height:1.06;letter-spacing:-2.5px;">{h1}</h1>
    <h2 style="font-size:38px;line-height:1.25;letter-spacing:-1px;margin-top:14px;">{h2}</h2>
  </div>
  <div class="adwin"><div class="adwin-in">
    {card}
    <div class="adverdict">
      <span class="av">{MASCOT}</span>
      <p><b>Shadow.</b> {verdict}</p>
      <span class="chip">{chip}</span>
    </div>
  </div></div>
  <div style="display:flex;gap:22px;align-items:center;width:100%;">
    <span class="cta" style="background:var(--cyan);color:var(--ink);font-size:31px;padding:26px 44px;white-space:nowrap;">{cta}</span>
    <span style="font:900 27px 'Inter Tight',sans-serif;color:var(--off);">bermoco.com</span>
  </div>
</div></div>
</body></html>"""

ADS = {}

ADS["ad-found-ai-answers.html"] = ad(
  "BERMO. ad · FOUND · AI answers", "1 slide, 1080x1350, black · comment keyword FOUND",
  'AI just recommended <span class="hl">3 businesses.</span>',
  "Yours wasn't one of them. Buyers ask ChatGPT now.",
  f"""<div class="adbar">
      <span class="d" style="background:#ff5f57;"></span><span class="d" style="background:#c8f500;"></span><span class="d" style="background:#00f5d4;"></span>
      <span class="u">chatgpt.com</span>
      <span class="live">&#9679; Answering</span>
    </div>
    <div style="padding:28px 28px 14px;">
      <div class="askrow"><span class="who">?</span><p>Who's the best in your industry near me?</p></div>
      <div class="ansrow"><span class="n">1</span><span class="nm">Competitor one</span><span class="utag cy">In the answer</span></div>
      <div class="ansrow"><span class="n">2</span><span class="nm">Competitor two</span><span class="utag cy">In the answer</span></div>
      <div class="ansrow"><span class="n">3</span><span class="nm">Competitor three</span><span class="utag cy">In the answer</span></div>
      <div class="ansrow you"><span class="n">&mdash;</span><span class="nm">Your business</span><span class="utag am">Not found</span></div>
    </div>""",
  "Invisible to AI. The buyer never saw you. Fixable in weeks, not months.",
  "Visible on AI within 4 weeks",
  "Comment FOUND, I&rsquo;ll check yours free &#8594;")

ADS["ad-site-5-seconds.html"] = ad(
  "BERMO. ad · SITE · the 5-second test", "1 slide, 1080x1350, black · comment keyword SITE",
  'Your website has <span class="hl">5 seconds.</span>',
  "That's how long a buyer looks before they leave.",
  f"""<div class="adbar">
      <span class="d" style="background:#ff5f57;"></span><span class="d" style="background:#c8f500;"></span><span class="d" style="background:#00f5d4;"></span>
      <span class="u">yourbusiness.com</span>
      <span class="live">&#9679; 5-second test</span>
    </div>
    <div style="padding:28px 28px 14px;">
      <div class="adrows">
        <div class="adrow"><span class="nm">Loads fast, looks clean</span><span class="utag cy">Pass</span></div>
        <div class="adrow"><span class="nm">What you do, in one sentence</span><span class="utag am">Unclear</span></div>
        <div class="adrow"><span class="nm">Who it's for</span><span class="utag am">Can't tell</span></div>
        <div class="adrow"><span class="nm">One clear next step</span><span class="utag am">Missing</span></div>
      </div>
    </div>""",
  "Pretty isn't the problem. A buyer can't tell what you do, or what to do next.",
  "71% more Google clicks after launch",
  "Comment SITE, get the free Gap Scan &#8594;")

ADS["ad-hours-follow-up.html"] = ad(
  "BERMO. ad · HOURS · the follow-up that never went out", "1 slide, 1080x1350, black · comment keyword HOURS",
  'Deals don&rsquo;t die on <span class="hl">no.</span>',
  "They die on the follow-up that never went out.",
  f"""<div style="background:#fff;border-radius:23px 23px 0 0;overflow:hidden;">
      <div class="mailhead"><span class="s">Re: Great meeting you both</span><span class="utag gr">Tuesday</span></div>
      <div class="mailmsg"><span class="who buyer">JT</span><div class="m"><div class="from">J. Turner <span>&middot; Buyer</span></div><p>Loved the walkthrough. Can you send pricing and next steps?</p></div></div>
      <div class="mailmsg"><span class="who">You</span><div class="m"><div class="from">You <span>&middot; Tuesday</span></div><p>Absolutely, sending this afternoon.</p></div></div>
      <div class="mailwarn">&#9888;&nbsp; No follow up sent &middot; 6 days and counting</div>
    </div>""",
  "Not a sales problem. A founder doing nine jobs. Let the system send it on time, sounding like you.",
  "Answered in minutes, not days",
  "Comment HOURS, get your first workflow &#8594;")

ADS["ad-window-silent-feed.html"] = ad(
  "BERMO. ad · WINDOW · silence reads as closed", "1 slide, 1080x1350, black · comment keyword WINDOW",
  'Silence reads as <span class="hl">closed.</span>',
  "Buyers check your feed before they ever call you.",
  f"""<div class="feedhead"><span class="av2">YB</span><div class="h"><div class="u2">yourbusiness</div><div class="st">Last post &middot; 4 months ago</div></div><span style="margin-left:auto;" class="utag am">Gone quiet</span></div>
    <div class="feedgrid">
      <div class="tilep"><i></i></div><div class="tilep"><i></i></div><div class="tilep"><i></i></div>
      <div class="tilep"><i></i></div><div class="tilep"><i></i></div><div class="tilep"><i></i></div>
    </div>
    <div class="bubble">"Are they even still open?" &mdash; every buyer who checked this week</div>""",
  "The feed answers for you before every sale. Right now it's saying nothing.",
  "Checked before every sale",
  "Comment WINDOW, get the free Gap Scan &#8594;")

for name, html in ADS.items():
    with open(os.path.join(HERE, name), "w") as f:
        f.write(html)
    print("wrote", name)

if "--html-only" not in sys.argv:
    render = os.path.join(HERE, "render_png.py")
    subprocess.run([sys.executable, render], check=True)

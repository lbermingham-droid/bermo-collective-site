#!/usr/bin/env python3
"""Builds the four August single-slide ads (1080x1350) on the approved
BERMO. chassis (src/chassis.css + src/fonts.css + src/mascot.b64, vendored
from carousels/ad-revenue-gap-scan.html), bright mint edition.

Direction (per Lexi, Aug 2026): stupid-obvious buyer pain in the headline,
bright not black, no perspective-tilted UI, every mockup looks like the
real product (ChatGPT, a browser, Messages, Instagram) — not an abstract
dashboard.

Run: python3 build_ads.py            (writes html + png/ )
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
FONTS = open(os.path.join(SRC, "fonts.css")).read()
CHASSIS = open(os.path.join(SRC, "chassis.css")).read()
MASCOT = '<img src="data:image/png;base64,%s" alt="" class="msct" style="border-radius:50%%;display:block;"/>' % open(os.path.join(SRC, "mascot.b64")).read().strip()

EXTRA = """
/* flat product card: real-app mockups, no rotation, depth from layered shadow */
.app{position:relative;width:100%;background:#fff;border-radius:24px;overflow:hidden;
  box-shadow:0 2px 0 rgba(10,10,10,0.04), 0 24px 48px -12px rgba(10,60,50,0.28), 0 60px 120px -30px rgba(10,60,50,0.35);}
.sticker{position:absolute;background:#ff2d7a;color:#fff;font:800 26px 'Inter Tight',sans-serif;
  padding:16px 26px;border-radius:14px;box-shadow:0 16px 36px rgba(224,36,109,0.45);transform:rotate(-3deg);z-index:5;}
.freebadge{background:#c8f500;color:#0a0a0a;font:800 21px 'Inter Tight',sans-serif;padding:14px 22px;border-radius:12px;white-space:nowrap;}
.subline{font:600 34px/1.35 'Inter',sans-serif;color:rgba(10,10,10,0.78);max-width:900px;letter-spacing:-0.5px;}
.subline b{color:#0a0a0a;}

/* --- ChatGPT --- */
.gpt-head{display:flex;align-items:center;justify-content:center;position:relative;padding:22px;border-bottom:1px solid #ececec;}
.gpt-head .t{font:700 24px 'Inter',sans-serif;color:#0d0d0d;}
.gpt-head .t span{color:#8e8e8e;font-weight:500;}
.gpt-head .dots{position:absolute;left:24px;display:flex;gap:8px;}
.gpt-head .dots i{width:12px;height:12px;border-radius:50%;background:#e4e4e4;}
.gpt-body{padding:28px 32px 20px;}
.gpt-user{display:flex;justify-content:flex-end;margin-bottom:24px;}
.gpt-user p{background:#f1f1f1;color:#111;font:500 25px/1.4 'Inter',sans-serif;padding:16px 24px;border-radius:22px;max-width:78%;}
.gpt-ans p{font:500 25px/1.45 'Inter',sans-serif;color:#111;margin-bottom:16px;}
.gpt-rec{display:flex;align-items:center;gap:14px;padding:15px 4px;border-bottom:1px solid #f0f0f0;}
.gpt-rec:last-of-type{border-bottom:0;}
.gpt-rec .n{font:700 22px 'Inter',sans-serif;color:#8e8e8e;width:26px;}
.gpt-rec .nm{flex:1;font:700 24px 'Inter',sans-serif;color:#111;}
.gpt-rec .star{font:600 21px 'Inter',sans-serif;color:#666;}
.gpt-input{margin:8px 32px 28px;display:flex;align-items:center;justify-content:space-between;
  border:1px solid #e2e2e2;border-radius:100px;padding:16px 12px 16px 26px;}
.gpt-input span{font:500 23px 'Inter',sans-serif;color:#a5a5a5;}
.gpt-input .send{width:44px;height:44px;border-radius:50%;background:#0d0d0d;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;}

/* --- browser + meh website --- */
.br-tabs{background:#e9e9ee;padding:14px 18px 0;display:flex;align-items:center;gap:14px;}
.br-tabs .tdots{display:flex;gap:8px;padding-bottom:12px;}
.br-tabs .tdots i{width:14px;height:14px;border-radius:50%;}
.br-tab{background:#fff;border-radius:12px 12px 0 0;font:500 20px 'Inter',sans-serif;color:#333;padding:12px 26px;}
.br-url{background:#fff;border-bottom:1px solid #ececec;padding:14px 22px;}
.br-url span{display:block;background:#f1f1f4;border-radius:100px;font:500 21px 'Inter',sans-serif;color:#555;padding:12px 24px;max-width:420px;}
.site{padding:30px 36px 40px;}
.site-nav{display:flex;align-items:center;gap:26px;margin-bottom:38px;}
.site-nav .logo{width:38px;height:38px;border-radius:10px;background:#d9d9de;}
.site-nav span{font:500 20px 'Inter',sans-serif;color:#b3b3b8;}
.site h3{font:800 44px/1.15 'Inter Tight',sans-serif;color:#3c3c40;letter-spacing:-1px;}
.site .l1{height:16px;border-radius:8px;background:#e7e7ea;width:64%;margin-top:18px;}
.site .l2{height:16px;border-radius:8px;background:#e7e7ea;width:46%;margin-top:10px;}
.site .btn{display:inline-block;margin-top:26px;background:#dcdce1;color:#8b8b90;font:700 21px 'Inter',sans-serif;border-radius:10px;padding:14px 30px;}
.statcard{position:absolute;right:26px;bottom:24px;background:#fff;border-radius:18px;padding:22px 28px;
  box-shadow:0 20px 50px rgba(10,10,10,0.25);z-index:5;border:1px solid #f0f0f0;}
.statcard .cap{font:700 17px 'Inter',sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:#9a9aa0;margin-bottom:8px;}
.statcard .big{margin-right:6px;font:900 40px 'Inter Tight',sans-serif;color:#111;letter-spacing:-1px;}
.statcard .bad{margin-right:6px;font:900 40px 'Inter Tight',sans-serif;color:#e0246d;letter-spacing:-1px;}
.statcard .row{display:flex;gap:26px;align-items:baseline;}
.statcard .lbl{font:600 20px 'Inter',sans-serif;color:#8a8a90;}

/* --- messages --- */
.msg-head{display:flex;align-items:center;gap:16px;padding:20px 26px;border-bottom:1px solid #ececec;background:#fafafa;}
.msg-head .av{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#b9c0c9,#8d97a5);display:flex;align-items:center;justify-content:center;color:#fff;font:700 20px 'Inter',sans-serif;}
.msg-head .who{font:700 24px 'Inter',sans-serif;color:#111;}
.msg-head .st{font:500 19px 'Inter',sans-serif;color:#8e8e93;}
.msg-body{padding:26px 26px 34px;display:flex;flex-direction:column;gap:6px;}
.msg-time{font:600 17px 'Inter',sans-serif;color:#a0a0a5;text-align:center;margin:8px 0 10px;}
.mb{max-width:76%;font:500 25px/1.4 'Inter',sans-serif;padding:16px 24px;border-radius:24px;}
.mb.in{background:#e9e9eb;color:#111;border-bottom-left-radius:8px;align-self:flex-start;}
.mb.out{background:#0a84ff;color:#fff;border-bottom-right-radius:8px;align-self:flex-end;}
.msg-sys{display:flex;align-items:center;gap:10px;justify-content:center;background:rgba(255,45,122,0.09);
  border:1px solid rgba(255,45,122,0.3);border-radius:14px;padding:16px 20px;margin-top:18px;
  font:700 23px 'Inter',sans-serif;color:#d61e68;}

/* --- instagram --- */
.ig-head{display:flex;align-items:center;gap:22px;padding:26px 28px 18px;}
.ig-av{width:92px;height:92px;border-radius:50%;padding:4px;background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf);}
.ig-av i{display:block;width:100%;height:100%;border-radius:50%;background:#e8e8ec;border:4px solid #fff;}
.ig-id .u{font:700 27px 'Inter',sans-serif;color:#111;}
.ig-stats{display:flex;gap:34px;margin-top:8px;}
.ig-stats span{font:500 21px 'Inter',sans-serif;color:#333;}
.ig-stats b{font-weight:800;}
.ig-follow{margin-left:auto;background:#0095f6;color:#fff;font:700 22px 'Inter',sans-serif;border-radius:10px;padding:12px 30px;}
.ig-warn{display:flex;align-items:center;justify-content:center;gap:10px;background:rgba(255,45,122,0.09);
  border-top:1px solid rgba(255,45,122,0.25);border-bottom:1px solid rgba(255,45,122,0.25);
  padding:15px;font:700 23px 'Inter',sans-serif;color:#d61e68;}
.ig-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;}
.ig-grid i{display:block;height:158px;}
.ig-grid i:nth-child(1){background:linear-gradient(135deg,#ffe4d6,#ffc9b0);}
.ig-grid i:nth-child(2){background:linear-gradient(135deg,#dce9ff,#b9d0f5);}
.ig-grid i:nth-child(3){background:linear-gradient(135deg,#ffe0ec,#f6bdd6);}
.ig-grid i:nth-child(4){background:linear-gradient(135deg,#e4f6e9,#bfe6cc);}
.ig-grid i:nth-child(5){background:linear-gradient(135deg,#fff3cf,#f5dfa1);}
.ig-grid i:nth-child(6){background:linear-gradient(135deg,#eee2ff,#d4c2f2);}
.ig-grid{filter:saturate(0.55) brightness(0.98);}
"""

def ad(name, note, h1, sub, card, sticker, cta):
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{name}</title>
<style>{FONTS}
{CHASSIS}
{EXTRA}</style></head><body>
<div class="pagehead"><strong>{name}</strong><br>{note}</div>
<div class="slide mint cover"><div class="orb o1"></div><div class="orb o2"></div>
<div class="bar"><div class="wordmark">BERMO.</div><span class="cover-shadow-tr">{MASCOT}Shadow.</span></div>
<div class="content" style="align-items:flex-start;text-align:left;gap:34px;justify-content:center;padding-top:10px;">
  <div>
    <h1 style="font-size:78px;line-height:1.05;letter-spacing:-2.5px;">{h1}</h1>
    <p class="subline" style="margin-top:18px;">{sub}</p>
  </div>
  <div style="position:relative;width:100%;">
    <div class="app">{card}</div>
    {sticker}
  </div>
  <div style="display:flex;gap:18px;align-items:center;width:100%;">
    <span class="cta" style="font-size:27px;padding:22px 32px;white-space:nowrap;">{cta}</span>
    <span class="freebadge">FREE</span>
    <span style="font:900 24px 'Inter Tight',sans-serif;color:var(--ink);margin-left:auto;">bermoco.com</span>
  </div>
</div></div>
</body></html>"""

ADS = {}

ADS["ad-found-ai-answers.html"] = ad(
  "BERMO. ad · FOUND · customers can't find you", "1 slide, 1080x1350, mint · comment keyword FOUND",
  'Customers can&rsquo;t <span class="ombre">find you</span> online.',
  "So they hire whoever shows up. On Google <b>and now on ChatGPT.</b> We make sure that&rsquo;s you.",
  """<div class="gpt-head"><span class="dots"><i></i><i></i><i></i></span><span class="t">ChatGPT <span>&#8964;</span></span></div>
    <div class="gpt-body">
      <div class="gpt-user"><p>Who's the best near me?</p></div>
      <div class="gpt-ans">
        <p>Here are the top 3 I'd recommend:</p>
        <div class="gpt-rec"><span class="n">1</span><span class="nm">Your competitor</span><span class="star">&#9733; 4.8</span></div>
        <div class="gpt-rec"><span class="n">2</span><span class="nm">Your other competitor</span><span class="star">&#9733; 4.7</span></div>
        <div class="gpt-rec"><span class="n">3</span><span class="nm">That one down the street</span><span class="star">&#9733; 4.6</span></div>
      </div>
    </div>
    <div class="gpt-input"><span>Message ChatGPT</span><span class="send">&#8593;</span></div>""",
  '<span class="sticker" style="right:30px;bottom:96px;">You&rsquo;re not on this list.</span>',
  "Comment FOUND, I&rsquo;ll check your business &#8594;")

ADS["ad-site-no-calls.html"] = ad(
  "BERMO. ad · SITE · visits but no calls", "1 slide, 1080x1350, mint · comment keyword SITE",
  'Your website gets visits. <span class="ombre">You get no calls.</span>',
  "We rebuild it so people actually book, call, and buy. One rebuild brought <b>71% more Google clicks.</b>",
  """<div class="br-tabs"><span class="tdots"><i style="background:#ff5f57;"></i><i style="background:#febc2e;"></i><i style="background:#28c840;"></i></span><span class="br-tab">Your Website</span></div>
    <div class="br-url"><span>yourbusiness.com</span></div>
    <div class="site">
      <div class="site-nav"><span class="logo"></span><span>Home</span><span>About</span><span>Services</span><span>Contact</span></div>
      <h3>We do quality work.</h3>
      <div class="l1"></div><div class="l2"></div>
      <span class="btn">Learn More</span>
    </div>""",
  """<span class="statcard" style="right:26px;bottom:24px;transform:none;">
      <span class="cap">This month</span>
      <span class="row"><span><span class="big">214</span> <span class="lbl">visits</span></span>
      <span><span class="bad">2</span> <span class="lbl">calls</span></span></span>
    </span>""",
  "Comment SITE, get the free 2-minute scan &#8594;")

ADS["ad-hours-slow-reply.html"] = ad(
  "BERMO. ad · HOURS · the late reply", "1 slide, 1080x1350, mint · comment keyword HOURS",
  'You replied 3 days later. <span class="ombre">They already hired someone.</span>',
  "Our AI answers your leads in minutes and follows up for you. <b>It sounds like you, not a robot.</b>",
  """<div class="msg-head"><span class="av">NL</span><div><div class="who">New Lead</div><div class="st">Mobile</div></div></div>
    <div class="msg-body">
      <div class="msg-time">Tuesday 9:41 AM</div>
      <div class="mb in">Hi! Are you free to take on a job this week?</div>
      <div class="msg-time" style="margin-top:22px;">Friday 4:12 PM</div>
      <div class="mb out">So sorry for the late reply! Yes, we'd love to help&hellip;</div>
      <div class="msg-sys">&#9888;&nbsp; This lead already booked someone else</div>
    </div>""",
  "",
  "Comment HOURS, get your first fix &#8594;")

ADS["ad-window-last-post-april.html"] = ad(
  "BERMO. ad · WINDOW · last post April", "1 slide, 1080x1350, mint · comment keyword WINDOW",
  'They checked your Instagram. <span class="ombre">Last post: April.</span>',
  "People look you up before they buy. We plan, write, and post <b>every week, in your voice.</b>",
  """<div class="ig-head">
      <span class="ig-av"><i></i></span>
      <div class="ig-id"><div class="u">yourbusiness</div>
        <div class="ig-stats"><span><b>26</b> posts</span><span><b>812</b> followers</span><span><b>410</b> following</span></div>
      </div>
      <span class="ig-follow">Follow</span>
    </div>
    <div class="ig-warn">&#9888;&nbsp; Last post &middot; 4 months ago</div>
    <div class="ig-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div>""",
  "",
  "Comment WINDOW, get the free plan &#8594;")

for name, html in ADS.items():
    with open(os.path.join(HERE, name), "w") as f:
        f.write(html)
    print("wrote", name)

if "--html-only" not in sys.argv:
    render = os.path.join(HERE, "render_png.py")
    subprocess.run([sys.executable, render], check=True)

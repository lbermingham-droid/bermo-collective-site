#!/usr/bin/env python3
"""Builds the BERMO. carousel HTML files. Run: python3 build_carousels.py"""
import os

OUT = os.path.dirname(os.path.abspath(__file__))

FONTS = open(os.path.join(OUT, "fonts_embedded.css")).read()

CSS = FONTS + """
*{margin:0;padding:0;box-sizing:border-box;}
:root{--ink:#0a0a0a;--off:#f5f5f0;--cyan:#00f5d4;}
body{background:#141414;font-family:'Inter',sans-serif;display:flex;flex-direction:column;align-items:center;gap:48px;padding:48px 0;}
.pagehead{color:#888;font:500 14px/1.5 'Inter',sans-serif;text-align:center;max-width:640px;}
.pagehead strong{color:#fff;}
.slide{width:1080px;height:1350px;position:relative;overflow:hidden;flex-shrink:0;display:flex;flex-direction:column;padding:150px 80px;}
.slide.light{background-color:var(--off);background-image:radial-gradient(rgba(10,10,10,0.13) 1.6px, transparent 1.6px);background-size:26px 26px;color:var(--ink);}
.slide.mint{background:linear-gradient(180deg,#f2fffc 0%,#c9fbf1 38%,#5deed3 78%,#0ee2c2 100%);color:var(--ink);}
.slide.mint::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(10,10,10,0.12) 1.6px, transparent 1.6px);background-size:26px 26px;pointer-events:none;}
.slide>*{position:relative;z-index:2;}
/* header */
.bar{position:absolute;top:64px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center;z-index:3;}
.wordmark{font:900 34px 'Montserrat',sans-serif;letter-spacing:1px;color:var(--ink);}
.site{font:600 17px 'Inter',sans-serif;letter-spacing:0.5px;color:rgba(10,10,10,0.55);}
/* footer nav */
.next{position:absolute;bottom:56px;left:50%;transform:translateX(-50%);width:64px;height:64px;border-radius:50%;background:var(--ink);color:var(--cyan);display:flex;align-items:center;justify-content:center;font:700 28px 'Inter',sans-serif;z-index:3;}
.next.cy{background:var(--cyan);color:var(--ink);}
.pager{position:absolute;bottom:70px;right:80px;font:700 17px 'Barlow Condensed',sans-serif;letter-spacing:3px;color:rgba(10,10,10,0.45);z-index:3;}
/* type */
.kicker{font:700 21px 'Barlow Condensed',sans-serif;letter-spacing:6px;text-transform:uppercase;color:rgba(10,10,10,0.6);margin-bottom:22px;}
h1{font:900 84px/1.06 'Inter Tight',sans-serif;letter-spacing:-2px;text-wrap:balance;}
h2{font:900 62px/1.1 'Inter Tight',sans-serif;letter-spacing:-1.5px;text-wrap:balance;}
h1 .hl,h2 .hl{background:var(--cyan);padding:0 14px;box-decoration-break:clone;-webkit-box-decoration-break:clone;}
.body{font:500 31px/1.5 'Inter',sans-serif;color:rgba(10,10,10,0.82);text-wrap:pretty;}
.body b{font-weight:700;color:var(--ink);}
.body .hl{background:var(--cyan);padding:1px 8px;font-weight:700;color:var(--ink);box-decoration-break:clone;-webkit-box-decoration-break:clone;}
.hand{font:700 34px 'Caveat',cursive;color:rgba(10,10,10,0.75);}
.center{text-align:center;align-items:center;}
.vcenter{justify-content:center;}
.gap28{display:flex;flex-direction:column;gap:28px;}
.gap28>div{width:100%;}
.scan,.save,.plan,.dash,.room,.cmp,.store{text-align:left;}
/* CTA button */
.cta{display:inline-flex;align-items:center;gap:14px;background:var(--cyan);color:var(--ink);font:800 30px 'Inter Tight',sans-serif;padding:26px 52px;border-radius:16px;box-shadow:0 14px 40px rgba(0,229,196,0.45);}
.cta.dark{background:var(--ink);color:var(--cyan);box-shadow:0 14px 40px rgba(10,10,10,0.35);}
/* ---------- components ---------- */
/* gap scan card */
.scan{background:#0d0d0d;border-radius:24px;padding:36px;width:100%;box-shadow:0 30px 70px rgba(10,10,10,0.35);border:1px solid rgba(255,255,255,0.07);}
.scan-top{display:flex;gap:14px;margin-bottom:26px;}
.scan-url{flex:1;background:#1c1c1c;border:1px solid #2c2c2c;border-radius:10px;padding:15px 20px;font:500 21px 'Inter',sans-serif;color:#e8e8e8;display:flex;align-items:center;}
.scan-url .caret{display:inline-block;width:2px;height:24px;background:var(--cyan);margin-left:4px;}
.scan-btn{background:var(--cyan);color:var(--ink);font:800 21px 'Inter Tight',sans-serif;border-radius:10px;padding:15px 30px;display:flex;align-items:center;}
.scan-row{display:flex;align-items:center;gap:16px;padding:15px 18px;border-radius:10px;margin-bottom:10px;background:#161616;}
.dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;}
.dot.g{background:var(--cyan);}.dot.y{background:#ffb020;}.dot.gr{background:#555;}
.scan-name{font:600 21px 'Inter',sans-serif;color:#f0f0f0;flex:1;}
.scan-num{font:700 21px 'Inter',sans-serif;color:#cfcfcf;margin-right:10px;}
.tag{font:700 13px 'Inter',sans-serif;letter-spacing:1px;text-transform:uppercase;border-radius:100px;padding:6px 14px;}
.tag.s{background:rgba(0,245,212,0.15);color:var(--cyan);}
.tag.gp{background:rgba(255,176,32,0.15);color:#ffb020;}
.tag.sc{background:#242424;color:#9a9a9a;}
.scan-note{margin-top:22px;background:#141414;border:1px solid rgba(0,245,212,0.35);border-radius:12px;padding:18px 20px;display:flex;gap:14px;align-items:flex-start;}
.scan-note .ico{width:34px;height:34px;border-radius:50%;background:var(--cyan);color:var(--ink);display:flex;align-items:center;justify-content:center;font:800 17px 'Inter Tight',sans-serif;flex-shrink:0;}
.scan-note p{font:500 20px/1.4 'Inter',sans-serif;color:#e6e6e6;}
.scan-note b{color:var(--cyan);font-weight:700;}
/* savings card */
.save{background:#fff;border-radius:24px;padding:44px 40px;width:100%;box-shadow:0 26px 60px rgba(10,10,10,0.12);border:1px solid rgba(10,10,10,0.06);position:relative;}
.save-row{display:flex;gap:24px;align-items:flex-start;margin-bottom:30px;}
.save-row:last-child{margin-bottom:0;}
.pill{background:var(--ink);color:var(--cyan);font:700 16px 'Barlow Condensed',sans-serif;letter-spacing:2px;text-transform:uppercase;border-radius:100px;padding:9px 18px;flex-shrink:0;margin-top:4px;}
.save-main{font:900 40px 'Inter Tight',sans-serif;letter-spacing:-0.5px;}
.save-main .hl{background:var(--cyan);padding:0 10px;}
.save-sub{font:500 22px/1.4 'Inter',sans-serif;color:rgba(10,10,10,0.6);margin-top:6px;}
.spark{position:absolute;top:40px;right:40px;text-align:right;}
.spark .badge{background:var(--ink);color:var(--cyan);font:800 20px 'Inter Tight',sans-serif;border-radius:100px;padding:8px 18px;display:inline-block;margin-bottom:10px;}
/* stat tiles */
.tiles{display:flex;gap:22px;width:100%;}
.tile{flex:1;background:#fff;border-radius:20px;padding:34px 26px;text-align:center;box-shadow:0 18px 44px rgba(10,10,10,0.10);border:1px solid rgba(10,10,10,0.06);}
.tile .n{font:900 46px 'Inter Tight',sans-serif;letter-spacing:-1px;}
.tile .n span{color:#00c9ab;}
.tile .d{font:500 19px/1.35 'Inter',sans-serif;color:rgba(10,10,10,0.6);margin-top:10px;}
/* store grid */
.store{display:grid;grid-template-columns:1fr 1fr;gap:22px;width:100%;}
.prod{background:#fff;border-radius:18px;padding:28px 24px;box-shadow:0 16px 40px rgba(10,10,10,0.10);border:1px solid rgba(10,10,10,0.06);position:relative;}
.prod .pico{width:52px;height:52px;border-radius:12px;background:var(--ink);color:var(--cyan);display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px;}
.prod .pt{font:800 25px 'Inter Tight',sans-serif;letter-spacing:-0.3px;}
.prod .pd{font:500 18px/1.4 'Inter',sans-serif;color:rgba(10,10,10,0.58);margin-top:8px;}
.prod .add{position:absolute;top:22px;right:22px;background:var(--ink);color:var(--cyan);font:700 14px 'Inter',sans-serif;border-radius:100px;padding:6px 14px;}
/* blueprint / order list */
.plan{background:#0d0d0d;border-radius:24px;padding:40px;width:100%;box-shadow:0 30px 70px rgba(10,10,10,0.35);}
.plan-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px;}
.plan-h .t{font:800 24px 'Inter Tight',sans-serif;color:#fff;}
.plan-h .tag{background:rgba(0,245,212,0.15);color:var(--cyan);}
.step{display:flex;align-items:center;gap:18px;background:#161616;border-radius:12px;padding:18px 20px;margin-bottom:12px;}
.step:last-child{margin-bottom:0;}
.step .num{width:40px;height:40px;border-radius:10px;background:var(--cyan);color:var(--ink);font:800 20px 'Inter Tight',sans-serif;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.step .num.off{background:#242424;color:#8a8a8a;}
.step .st{font:600 22px 'Inter',sans-serif;color:#f0f0f0;flex:1;}
.step .ss{font:500 17px 'Inter',sans-serif;color:#8a8a8a;}
.step .chk{color:var(--cyan);font-size:22px;}
/* chip cloud */
.chips{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;}
.chip{background:#fff;border:1px solid rgba(10,10,10,0.1);box-shadow:0 10px 26px rgba(10,10,10,0.08);border-radius:100px;padding:16px 30px;font:700 24px 'Inter Tight',sans-serif;}
.chip.on{background:var(--ink);color:var(--cyan);border-color:var(--ink);}
/* compare card */
.cmp{display:flex;gap:22px;width:100%;}
.cmp-col{flex:1;border-radius:20px;padding:34px 28px;}
.cmp-col.a{background:#fff;border:1px solid rgba(10,10,10,0.08);box-shadow:0 16px 40px rgba(10,10,10,0.10);}
.cmp-col.b{background:var(--ink);color:#fff;box-shadow:0 20px 50px rgba(10,10,10,0.3);}
.cmp-col .ct{font:700 17px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;color:rgba(10,10,10,0.5);}
.cmp-col.b .ct{color:var(--cyan);}
.cmp-col .cbig{font:900 38px 'Inter Tight',sans-serif;letter-spacing:-1px;}
.cmp-col ul{list-style:none;margin-top:18px;}
.cmp-col li{font:500 20px/1.45 'Inter',sans-serif;color:rgba(10,10,10,0.65);padding:7px 0;display:flex;gap:10px;}
.cmp-col.b li{color:rgba(255,255,255,0.8);}
.cmp-col li::before{content:'\\2192';font-weight:700;color:#b6b6b6;}
.cmp-col.b li::before{color:var(--cyan);}
/* mini dashboard */
.dash{background:#0d0d0d;border-radius:24px;padding:34px;width:100%;box-shadow:0 30px 70px rgba(10,10,10,0.35);}
.dash-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;}
.dash-top .dt{font:800 24px 'Inter Tight',sans-serif;color:#fff;}
.dash-tabs{display:flex;gap:8px;}
.dash-tabs span{font:600 16px 'Inter',sans-serif;color:#8a8a8a;background:#1a1a1a;border-radius:100px;padding:8px 18px;}
.dash-tabs span.on{background:var(--cyan);color:var(--ink);font-weight:700;}
.dash-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;}
.dcell{background:#161616;border-radius:12px;padding:20px;}
.dcell .dl{font:600 15px 'Inter',sans-serif;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;}
.dcell .dv{font:900 38px 'Inter Tight',sans-serif;color:#fff;margin-top:8px;}
.dcell .dv em{font-style:normal;color:var(--cyan);}
.dchat{background:#161616;border:1px solid rgba(0,245,212,0.3);border-radius:12px;padding:18px 20px;display:flex;gap:14px;align-items:center;}
.dchat .ico{width:38px;height:38px;border-radius:10px;background:var(--cyan);color:var(--ink);display:flex;align-items:center;justify-content:center;font:800 17px 'Inter Tight',sans-serif;flex-shrink:0;}
.dchat p{font:500 19px 'Inter',sans-serif;color:#dedede;}
.dchat b{color:var(--cyan);}
/* room card (post 6) */
.room{background:#fff;border-radius:24px;padding:40px;width:100%;box-shadow:0 26px 60px rgba(10,10,10,0.12);border:1px solid rgba(10,10,10,0.06);}
.room-h{font:700 17px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:uppercase;color:rgba(10,10,10,0.5);margin-bottom:20px;}
.sig{display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:12px;background:#f6f6f2;margin-bottom:12px;border:1px solid rgba(10,10,10,0.05);}
.sig:last-child{margin-bottom:0;}
.sig .si{width:44px;height:44px;border-radius:10px;background:var(--ink);color:var(--cyan);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.sig .sn{font:700 22px 'Inter Tight',sans-serif;flex:1;}
.sig .sv{font:700 15px 'Inter',sans-serif;letter-spacing:1px;text-transform:uppercase;border-radius:100px;padding:7px 14px;}
.sig .sv.ok{background:rgba(0,201,171,0.14);color:#009e86;}
.sig .sv.miss{background:rgba(255,176,32,0.16);color:#c07f00;}
"""

def header():
    return ('<div class="bar"><div class="wordmark">BERMO.</div>'
            '<div class="site">bermoco.com</div></div>')

def slide(bg, body, idx, total, arrow=True, arrow_cy=False):
    nxt = ''
    if arrow and idx < total:
        nxt = f'<div class="next{" cy" if arrow_cy else ""}">&#8594;</div>'
    pager = f'<div class="pager">{idx} / {total}</div>'
    return f'<div class="slide {bg}">{header()}{body}{nxt}{pager}</div>'

# ---------- shared components ----------
SCAN_CARD = """
<div class="scan">
  <div class="scan-top">
    <div class="scan-url">yourstartup.com<span class="caret"></span></div>
    <div class="scan-btn">Scan</div>
  </div>
  <div class="scan-row"><span class="dot g"></span><span class="scan-name">AI discovery</span><span class="scan-num">80</span><span class="tag s">Strength</span></div>
  <div class="scan-row"><span class="dot y"></span><span class="scan-name">Messaging</span><span class="scan-num">40</span><span class="tag gp">Gap</span></div>
  <div class="scan-row"><span class="dot y"></span><span class="scan-name">Website</span><span class="scan-num">30</span><span class="tag gp">Gap</span></div>
  <div class="scan-row"><span class="dot gr"></span><span class="scan-name">Social</span><span class="tag sc">Scanning</span></div>
  <div class="scan-note"><div class="ico">S</div><p><b>Gap found.</b> Your message is not reaching the right buyer.</p></div>
</div>"""

SAVE_CARD = """
<div class="save">
  <div class="spark"><span class="badge">+50%</span>
    <svg width="150" height="70" viewBox="0 0 150 70"><path d="M4 62 C 40 60, 70 48, 95 34 S 135 10, 146 5" fill="none" stroke="#00e5c4" stroke-width="5" stroke-linecap="round"/><path d="M4 62 C 40 60, 70 48, 95 34 S 135 10, 146 5 L146 70 L4 70 Z" fill="rgba(0,229,196,0.18)"/></svg>
  </div>
  <div class="save-row"><span class="pill">Week 1</span><div><div class="save-main">$25K <span class="hl">saved</span></div><div class="save-sub">for a hospitality founder</div></div></div>
  <div class="save-row"><span class="pill">Next</span><div><div class="save-main">Reallocated</div><div class="save-sub">to the work that actually grows revenue</div></div></div>
  <div class="save-row"><span class="pill">Today</span><div><div class="save-main">Up <span class="hl">50%+</span></div><div class="save-sub">in under 2 months</div></div></div>
</div>"""

TILES = """
<div class="tiles">
  <div class="tile"><div class="n">$130K</div><div class="d">saved for an AI startup founder in month one</div></div>
  <div class="tile"><div class="n">98<span>%</span></div><div class="d">permanent placement retention</div></div>
  <div class="tile"><div class="n">5<span>-day</span></div><div class="d">specialist deploy, not weeks</div></div>
</div>"""

STORE = """
<div class="store">
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#9881;</div><div class="pt">AI + Automation</div><div class="pd">Custom agents, integrations and workflows built around you</div></div>
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#9639;</div><div class="pt">Website, UI and UX</div><div class="pd">A site built to convert, with copy that sells</div></div>
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#9740;</div><div class="pt">AI Discovery</div><div class="pd">SEO, GEO and AEO. Get found and chosen in AI search</div></div>
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#9998;</div><div class="pt">Brand + Messaging</div><div class="pd">Positioning translated so buyers actually get it</div></div>
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#9654;</div><div class="pt">Content + Social</div><div class="pd">Founder led content in your voice, every week</div></div>
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#10035;</div><div class="pt">Strategy + Hiring</div><div class="pd">Scale plans, warm GTM intros and vetted permanent hires</div></div>
</div>"""

PLAN = """
<div class="plan">
  <div class="plan-h"><span class="t">Your growth blueprint</span><span class="tag s">In order</span></div>
  <div class="step"><span class="num">1</span><span class="st">Messaging</span><span class="ss">fix what buyers hear first</span><span class="chk">&#10003;</span></div>
  <div class="step"><span class="num">2</span><span class="st">Website</span><span class="ss">turn visits into conversations</span><span class="chk">&#10003;</span></div>
  <div class="step"><span class="num off">3</span><span class="st">AI + CRM</span><span class="ss">follow up without the busywork</span></div>
  <div class="step"><span class="num off">4</span><span class="st">Content</span><span class="ss">stay visible in your voice</span></div>
  <div class="step"><span class="num off">5</span><span class="st">Hiring</span><span class="ss">add people when the work is ready</span></div>
</div>"""

DASH = """
<div class="dash">
  <div class="dash-top"><span class="dt">BERMO. Dashboard</span>
    <div class="dash-tabs"><span class="on">Pipeline</span><span>Deals</span><span>Revenue</span></div>
  </div>
  <div class="dash-grid">
    <div class="dcell"><div class="dl">Active projects</div><div class="dv">4</div></div>
    <div class="dcell"><div class="dl">Open deals</div><div class="dv">10</div></div>
    <div class="dcell"><div class="dl">This month</div><div class="dv"><em>+$18K</em></div></div>
  </div>
  <div class="dchat"><div class="ico">S</div><p><b>Shadow.</b> Your proposal for Thursday is drafted and your follow ups are queued.</p></div>
</div>"""

ROOM = """
<div class="room">
  <div class="room-h">What buyers checked this week</div>
  <div class="sig"><div class="si">&#9639;</div><span class="sn">Your website</span><span class="sv ok">Read twice</span></div>
  <div class="sig"><div class="si">&#9998;</div><span class="sn">Your messaging</span><span class="sv miss">Unclear</span></div>
  <div class="sig"><div class="si">&#9654;</div><span class="sn">Your social</span><span class="sv ok">Watched</span></div>
  <div class="sig"><div class="si">&#9993;</div><span class="sn">Your follow up</span><span class="sv miss">Went quiet</span></div>
</div>"""

CTA_SCAN = '<div style="display:flex;justify-content:center;"><span class="cta dark">Get my free Gap Scan &#8594;</span></div>'

def page(title, note, slides):
    body = "\n".join(slides)
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{title}</title>
<style>{CSS}</style></head><body>
<div class="pagehead"><strong>{title}</strong><br>{note}</div>
{body}
</body></html>"""

posts = {}

# ---------------- POST 1 : Who is BERMO.? ----------------
posts["post-1-who-is-bermo.html"] = page(
 "BERMO. Carousel · Post 1 · Who is BERMO.?",
 "5 slides · 1080&times;1350 · screenshot each slide or use the exported PNGs",
 [
  slide("mint", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <div class="kicker">The Growth Store for Founder Led Companies</div>
     <h1>Who is <span class="hl">BERMO.</span>?</h1>
     <p class="body" style="max-width:760px;">Your entire growth team, under one roof. Here is what that actually means.</p>
     <div style="margin-top:26px;">{DASH}</div>
   </div>""", 1, 5),
  slide("mint", """
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>We help founder led companies <span class="hl">grow revenue.</span></h2>
     <p class="body">BERMO. is your one stop shop for all of your growth needs.</p>
     <p class="body">Sometimes that is the solution you already know you need. Sometimes it is us finding what is stalling growth, <b>before you spend time or money fixing something that was never the gap.</b></p>
     <p class="hand" style="margin-top:10px;">One partner. Every piece talking to each other.</p>
   </div>""", 2, 5),
  slide("mint", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>Growth can stall <span class="hl">anywhere.</span></h2>
     <p class="body">Your website, brand, messaging, social, AI workflows, CRM, hiring, training, UI and UX, SEO, GEO, even your target market.</p>
     <div style="margin-top:10px;">{STORE}</div>
     <p class="body" style="margin-top:6px;">BERMO. organizes what matters most first, <b>so the business moves together.</b></p>
   </div>""", 3, 5),
  slide("mint", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>We find the gap. We map the fix. <span class="hl">You see the ROI.</span></h2>
     <p class="body">Not ten random tools. Not five disconnected vendors. Just the work that actually moves the business, in the right order.</p>
     <div style="margin-top:14px;">{SAVE_CARD}</div>
   </div>""", 4, 5),
  slide("mint", f"""
   <div class="vcenter gap28 center" style="flex:1;display:flex;flex-direction:column;">
     <h2>Gap scan first. Then the <span class="hl">right next move.</span></h2>
     <p class="body" style="max-width:800px;">Free, no pitch, just the gaps. See what is stalling your revenue this week.</p>
     <div style="margin-top:10px;text-align:left;">{SCAN_CARD}</div>
     <div style="margin-top:30px;">{CTA_SCAN}</div>
   </div>""", 5, 5, arrow=False),
 ])

# ---------------- POST 2 : Why do founders use BERMO.? ----------------
posts["post-2-why-founders-use-bermo.html"] = page(
 "BERMO. Carousel · Post 2 · Why do founders use BERMO.?",
 "5 slides · 1080&times;1350",
 [
  slide("light", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <div class="kicker">For Founder Led Companies</div>
     <h1>Why do founders use <span class="hl">BERMO.</span>?</h1>
     <p class="body" style="max-width:780px;">The honest answer, in four slides.</p>
     <div style="margin-top:26px;">{SCAN_CARD}</div>
   </div>""", 1, 5),
  slide("light", """
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>When you are deep in the business, it is hard to see what is <span class="hl">slowing growth.</span></h2>
     <p class="body">You are closing deals, running the team, and putting out fires. Getting that close to the work makes the real bottleneck almost impossible to spot from the inside.</p>
     <p class="hand" style="margin-top:10px;">Every founder we work with knows this feeling.</p>
   </div>""", 2, 5),
  slide("light", """
   <div class="vcenter gap28 center" style="flex:1;display:flex;flex-direction:column;">
     <h2>The bottleneck hides in <span class="hl">plain sight.</span></h2>
     <p class="body" style="max-width:820px;">It might be any of these, and it is rarely the loudest one.</p>
     <div class="chips" style="margin-top:16px;">
       <span class="chip">Messaging</span><span class="chip on">Your website</span><span class="chip">Systems behind the scenes</span>
       <span class="chip on">Target market</span><span class="chip">Hires that need training</span><span class="chip on">Follow up</span>
     </div>
   </div>""", 3, 5),
  slide("light", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>BERMO. finds the gap and puts the work <span class="hl">in the right order.</span></h2>
     <p class="body">So your money goes where it will actually grow revenue, not where the noise is loudest.</p>
     <div style="margin-top:14px;">{PLAN}</div>
   </div>""", 4, 5),
  slide("light", f"""
   <div class="vcenter gap28 center" style="flex:1;display:flex;flex-direction:column;">
     <h2>Stop paying for the loudest symptom. Start investing in what <span class="hl">drives growth.</span></h2>
     <div style="margin-top:14px;">{TILES}</div>
     <div style="margin-top:34px;">{CTA_SCAN}</div>
     <p class="body" style="margin-top:20px;">Free, no pitch, just the gaps. bermoco.com</p>
   </div>""", 5, 5, arrow=False),
 ])

# ---------------- POST 3 : What does BERMO. actually help with? ----------------
posts["post-3-what-bermo-helps-with.html"] = page(
 "BERMO. Carousel · Post 3 · What does BERMO. actually help with?",
 "5 slides · 1080&times;1350",
 [
  slide("mint", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <div class="kicker">The Growth Store</div>
     <h1>What does BERMO. <span class="hl">actually</span> help with?</h1>
     <div style="margin-top:26px;">{STORE}</div>
   </div>""", 1, 5),
  slide("mint", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>Get <span class="hl">found.</span> Get understood.</h2>
     <p class="body">Website, SEO, GEO and AI discovery, so people can find you and understand you. Buyers now ask AI before they ever hit your site. We make sure you show up in both places.</p>
     <div style="margin-top:14px;">{SCAN_CARD}</div>
   </div>""", 2, 5),
  slide("mint", """
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>Stay clear when you are <span class="hl">not in the room.</span></h2>
     <p class="body">Branding, messaging and content, built in your voice. Your business keeps saying the right thing while you are heads down running it.</p>
     <div class="chips" style="margin-top:16px;justify-content:flex-start;">
       <span class="chip on">Brand + Messaging</span><span class="chip">Positioning buyers get</span><span class="chip on">Content + Social</span><span class="chip">Founder led, weekly</span>
     </div>
     <p class="hand" style="margin-top:14px;">Clear beats clever, every time.</p>
   </div>""", 3, 5),
  slide("mint", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>Run smoother <span class="hl">behind the scenes.</span></h2>
     <p class="body">Systems, CRM, AI workflows and training, so follow ups happen, data stays in one place, and nothing slips.</p>
     <div style="margin-top:14px;">{DASH}</div>
   </div>""", 4, 5),
  slide("mint", f"""
   <div class="vcenter gap28 center" style="flex:1;display:flex;flex-direction:column;">
     <h2>And when you need people, <span class="hl">the right help.</span></h2>
     <p class="body" style="max-width:820px;">Hiring and execution support in the right place, at the right time.</p>
     <div style="margin-top:14px;">{TILES}</div>
     <div style="margin-top:34px;"><span class="cta dark">Shop your growth stack &#8594;</span></div>
     <p class="body" style="margin-top:20px;">bermoco.com</p>
   </div>""", 5, 5, arrow=False),
 ])

# ---------------- POST 4 : How does BERMO. do it? ----------------
posts["post-4-how-bermo-does-it.html"] = page(
 "BERMO. Carousel · Post 4 · How does BERMO. do it?",
 "5 slides · 1080&times;1350",
 [
  slide("light", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <div class="kicker">The BERMO. Method</div>
     <h1>How does BERMO. <span class="hl">do it?</span></h1>
     <p class="body" style="max-width:760px;">Scan, blueprint, build. Here is the whole process.</p>
     <div style="margin-top:26px;">{PLAN}</div>
   </div>""", 1, 5),
  slide("light", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>Step 1. The <span class="hl">Gap Scan.</span></h2>
     <p class="body">BERMO. reads your business the way a buyer does, then shows you exactly what is stalling growth. Free, no pitch, just the gaps.</p>
     <div style="margin-top:14px;">{SCAN_CARD}</div>
   </div>""", 2, 5),
  slide("light", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>Step 2. A blueprint you can <span class="hl">actually use.</span></h2>
     <p class="body">The scan becomes a clear plan. What to fix, what to skip, and what order pays you back fastest.</p>
     <div style="margin-top:14px;">{PLAN}</div>
   </div>""", 3, 5),
  slide("light", """
   <div class="vcenter gap28 center" style="flex:1;display:flex;flex-direction:column;">
     <h2>Step 3. The right work, in the <span class="hl">right order.</span></h2>
     <p class="body" style="max-width:840px;">Brand, website, AI, CRM, content, hiring or training. We do the work with you, one right move at a time.</p>
     <div class="chips" style="margin-top:16px;">
       <span class="chip on">Brand</span><span class="chip">Website</span><span class="chip on">AI</span><span class="chip">CRM</span><span class="chip on">Content</span><span class="chip">Hiring</span><span class="chip on">Training</span>
     </div>
   </div>""", 4, 5),
  slide("light", f"""
   <div class="vcenter gap28 center" style="flex:1;display:flex;flex-direction:column;">
     <h2>Stop guessing. Spend smarter. <span class="hl">Move faster.</span></h2>
     <div style="margin-top:14px;">{SAVE_CARD}</div>
     <div style="margin-top:34px;">{CTA_SCAN}</div>
     <p class="body" style="margin-top:20px;">bermoco.com</p>
   </div>""", 5, 5, arrow=False),
 ])

# ---------------- POST 5 : Why BERMO. instead of hiring too early? ----------------
posts["post-5-before-you-hire.html"] = page(
 "BERMO. Carousel · Post 5 · Why BERMO. instead of hiring too early?",
 "5 slides · 1080&times;1350",
 [
  slide("mint", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <div class="kicker">Before Your Next Hire</div>
     <h1>Why BERMO. instead of <span class="hl">hiring too early?</span></h1>
     <p class="body" style="max-width:780px;">A full team on payroll is a big bet. Make it after you know what the business needs.</p>
     <div style="margin-top:26px;">{DASH}</div>
   </div>""", 1, 5),
  slide("mint", """
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>Most founders hire before they know what the business <span class="hl">actually needs.</span></h2>
     <p class="body">A salary is a twelve month commitment to one skill set. Growth usually needs three or four different skills in the same quarter, and the mix changes as you grow.</p>
     <p class="hand" style="margin-top:10px;">The gap moves. A single hire cannot chase it.</p>
   </div>""", 2, 5),
  slide("mint", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>BERMO. is your entire growth team, <span class="hl">under one roof.</span></h2>
     <p class="body">Brand, website, AI, CRM, content, hiring and training, working as one team on the same plan.</p>
     <div style="margin-top:14px;">{STORE}</div>
   </div>""", 3, 5),
  slide("mint", """
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>Often for less than <span class="hl">one full time hire.</span></h2>
     <div style="margin-top:14px;" class="cmp">
       <div class="cmp-col a"><div class="ct">One early hire</div><div class="cbig">One skill set</div>
         <ul><li>Salary plus benefits</li><li>Weeks to ramp up</li><li>Covers one gap only</li></ul></div>
       <div class="cmp-col b"><div class="ct">BERMO.</div><div class="cbig">Whole growth team</div>
         <ul><li>5 day specialist deploy</li><li>Every skill, one plan</li><li>Scales up or down with you</li></ul></div>
     </div>
   </div>""", 4, 5),
  slide("mint", f"""
   <div class="vcenter gap28 center" style="flex:1;display:flex;flex-direction:column;">
     <h2>Then your team takes it over, <span class="hl">ready to run.</span></h2>
     <p class="body" style="max-width:820px;">When the time is right we help you make the hire, and it sticks. 98% of our permanent placements stay.</p>
     <div style="margin-top:14px;">{TILES}</div>
     <div style="margin-top:34px;">{CTA_SCAN}</div>
   </div>""", 5, 5, arrow=False),
 ])

# ---------------- POST 6 : Not in the room ----------------
posts["post-6-not-in-the-room.html"] = page(
 "BERMO. Carousel · Post 6 · What is your business saying when you are not in the room?",
 "5 slides · 1080&times;1350",
 [
  slide("light", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <div class="kicker">Every Buyer Checks First</div>
     <h1>What is your business saying when you are <span class="hl">not in the room?</span></h1>
     <div style="margin-top:26px;">{ROOM}</div>
   </div>""", 1, 5),
  slide("light", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>Your business is talking <span class="hl">every day.</span></h2>
     <p class="body">Your website, brand, content, systems and follow up are all speaking for you, before every call, after every meeting, whether you are there or not.</p>
     <div style="margin-top:14px;">{ROOM}</div>
   </div>""", 2, 5),
  slide("light", """
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>When those pieces do not line up, buyers <span class="hl">feel it fast.</span></h2>
     <p class="body">The website says one thing. The pitch says another. The follow up goes quiet. Each piece is fine on its own, and together they cost you the deal.</p>
     <p class="hand" style="margin-top:10px;">Buyers rarely tell you. They just move on.</p>
   </div>""", 3, 5),
  slide("light", f"""
   <div class="vcenter gap28" style="flex:1;display:flex;flex-direction:column;">
     <h2>BERMO. shows you what buyers <span class="hl">actually see.</span></h2>
     <p class="body">What is coming across, what is getting missed, and what needs to change first.</p>
     <div style="margin-top:14px;">{SCAN_CARD}</div>
   </div>""", 4, 5),
  slide("light", f"""
   <div class="vcenter gap28 center" style="flex:1;display:flex;flex-direction:column;">
     <h2>Growth gets easier when your business says the <span class="hl">right thing.</span></h2>
     <p class="body" style="max-width:820px;">Run the free Gap Scan and hear your business the way buyers do.</p>
     <div style="margin-top:14px;">{SAVE_CARD}</div>
     <div style="margin-top:34px;">{CTA_SCAN}</div>
   </div>""", 5, 5, arrow=False),
 ])

for name, html in posts.items():
    with open(os.path.join(OUT, name), "w") as f:
        f.write(html)
    print("wrote", name)

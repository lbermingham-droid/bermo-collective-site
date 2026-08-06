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

import json
LOGOS = json.load(open(os.path.join(SRC, "logos.json")))
def icon(key, size, color):
    return ('<svg width="%d" height="%d" viewBox="0 0 24 24" style="display:block;">'
            '<path fill="%s" d="%s"/></svg>') % (size, size, color, LOGOS[key])
# colored Chrome mark, drawn to scale (wedges + blue core)
CHROME = '''<svg width="26" height="26" viewBox="0 0 48 48" style="display:block;">
<circle cx="24" cy="24" r="22" fill="#fff"/>
<path d="M24 2a22 22 0 0 1 19.05 11H24a11 11 0 0 0-9.53 5.5L7.3 6.9A21.94 21.94 0 0 1 24 2z" fill="#ea4335"/>
<path d="M45.9 17a22 22 0 0 1-16.4 28.4L36.4 30a11 11 0 0 0 .1-11z" fill="#fbbc05" transform="rotate(120 24 24)"/>
<path d="M45.9 17a22 22 0 0 1-16.4 28.4L36.4 30a11 11 0 0 0 .1-11z" fill="#34a853" transform="rotate(0 24 24)"/>
<circle cx="24" cy="24" r="11" fill="#fff"/>
<circle cx="24" cy="24" r="9" fill="#4285f4"/>
</svg>'''


EXTRA = """
/* flat product card: real-app mockups, no rotation, depth from layered shadow */
.app{position:relative;width:100%;background:#fff;border-radius:24px;overflow:hidden;
  box-shadow:0 2px 0 rgba(10,10,10,0.04), 0 24px 48px -12px rgba(10,60,50,0.28), 0 60px 120px -30px rgba(10,60,50,0.35);}
.sticker{position:absolute;background:#ff2d7a;color:#fff;font:800 26px 'Inter Tight',sans-serif;
  padding:16px 26px;border-radius:14px;box-shadow:0 16px 36px rgba(224,36,109,0.45);transform:rotate(-3deg);z-index:5;}
.freebadge{background:#c8f500;color:#0a0a0a;font:800 21px 'Inter Tight',sans-serif;padding:14px 22px;border-radius:12px;white-space:nowrap;}
.statchip{position:absolute;background:#c8f500;color:#0a0a0a;font:800 22px 'Inter Tight',sans-serif;
  padding:15px 24px;border-radius:12px;box-shadow:0 16px 36px rgba(120,150,0,0.35);transform:rotate(-1.5deg);z-index:5;}
.pgrid .vb{position:absolute;top:10px;right:12px;color:#fff;font:800 21px 'Inter Tight',sans-serif;text-shadow:0 2px 10px rgba(0,0,0,0.5);}
/* --- google docs --- */
.doc-head{display:flex;align-items:center;gap:16px;padding:20px 26px 12px;}
.doc-icon{width:40px;height:52px;border-radius:6px;background:#4285f4;position:relative;flex-shrink:0;}
.doc-icon:before{content:'';position:absolute;left:9px;right:9px;top:14px;height:4px;background:#fff;border-radius:2px;box-shadow:0 9px 0 #fff, 0 18px 0 #fff;}
.doc-title{font:600 26px 'Inter',sans-serif;color:#202124;}
.doc-sub{font:500 18px 'Inter',sans-serif;color:#9a9aa0;margin-top:2px;}
.doc-share{margin-left:auto;background:#c2e7ff;color:#001d35;font:700 19px 'Inter',sans-serif;border-radius:100px;padding:11px 26px;}
.doc-menu{font:500 18px 'Inter',sans-serif;color:#5f6368;padding:0 26px 14px;border-bottom:1px solid #eee;display:flex;gap:22px;}
.doc-wrap{display:flex;gap:20px;padding:26px;}
.doc-list{flex:1.3;}
.doc-item{font:500 24px/1.4 'Inter',sans-serif;color:#333;padding:9px 0;display:flex;gap:14px;align-items:center;}
.doc-item .box{width:22px;height:22px;border:2.5px solid #b9b9c0;border-radius:5px;flex-shrink:0;}
.doc-item.hl{background:#fef3c0;border-radius:6px;padding-left:8px;margin-left:-8px;}
.doc-cmt{flex:1;background:#fff;border:1px solid #e6e6e6;border-radius:12px;padding:18px;box-shadow:0 10px 28px rgba(10,10,10,0.10);align-self:flex-start;}
.doc-cmt .ch{display:flex;gap:10px;align-items:center;margin-bottom:8px;}
.doc-cmt .cav{width:36px;height:36px;border-radius:50%;background:#0a0a0a;color:#00f5d4;display:flex;align-items:center;justify-content:center;font:700 15px 'Inter',sans-serif;}
.doc-cmt .cn{font:700 19px 'Inter',sans-serif;color:#111;}
.doc-cmt p{font:500 20px/1.4 'Inter',sans-serif;color:#333;}
.doc-cmt p b{color:#0a0a0a;}
.doc-cmt .rep{font:600 17px 'Inter',sans-serif;color:#4285f4;margin-top:8px;display:block;}
/* --- receipt --- */
.rcpt{width:640px;margin:0 auto;background:#fff;border-radius:14px;padding:38px 44px 30px;position:relative;
  box-shadow:0 2px 0 rgba(10,10,10,0.04), 0 24px 48px -12px rgba(10,60,50,0.28), 0 60px 120px -30px rgba(10,60,50,0.35);}
.rcpt .rh{text-align:center;border-bottom:2px dashed #e0e0e0;padding-bottom:18px;margin-bottom:10px;}
.rcpt .rh .rw{font:900 30px 'Montserrat',sans-serif;color:#0a0a0a;letter-spacing:1px;}
.rcpt .rh .rl{font:700 16px 'Inter',sans-serif;color:#9a9aa0;letter-spacing:3px;text-transform:uppercase;margin-top:6px;}
.rcpt-item{display:flex;align-items:baseline;gap:10px;padding:13px 0;}
.rcpt-item .k{font:600 23px 'Inter',sans-serif;color:#333;white-space:nowrap;}
.rcpt-item .dots2{flex:1;border-bottom:3px dotted #d8d8de;transform:translateY(-5px);}
.rcpt-item .v{font:900 26px 'Inter Tight',sans-serif;color:#0a0a0a;white-space:nowrap;font-variant-numeric:tabular-nums;}
.rcpt .barcode{height:44px;margin-top:16px;background:repeating-linear-gradient(90deg,#111 0 3px,transparent 3px 6px,#111 6px 8px,transparent 8px 13px,#111 13px 15px,transparent 15px 19px);}
.rcpt .rfoot{font:700 18px 'Inter',sans-serif;color:#9a9aa0;text-align:center;margin-top:10px;letter-spacing:2px;}
.subline{font:600 34px/1.35 'Inter',sans-serif;color:rgba(10,10,10,0.78);max-width:900px;letter-spacing:-0.5px;}
.subline b{color:#0a0a0a;}
.subline .pain{display:block;font-weight:800;color:#0a0a0a;font-size:38px;letter-spacing:-1px;margin-bottom:10px;}

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
.ig-grid i,.ig-grid .blank{height:158px;}
.ig-grid .blank{display:flex;}
.ig-grid i{display:block;}
.ig-grid i:nth-child(1){background:linear-gradient(135deg,#ffe4d6,#ffc9b0);}
.ig-grid i:nth-child(2){background:linear-gradient(135deg,#dce9ff,#b9d0f5);}
.phones{display:flex;gap:26px;width:100%;align-items:stretch;}
.phone{flex:1;background:#111;border-radius:38px;padding:12px;box-shadow:0 30px 60px -18px rgba(10,60,50,0.4);}
.phone .screen{background:#fff;border-radius:28px;overflow:hidden;height:100%;}
.ph-bar{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #f0f0f0;}
.ph-bar .pu{font:800 21px 'Inter',sans-serif;color:#111;}
.ph-bar .ph-dots{margin-left:auto;color:#111;font:800 22px 'Inter',sans-serif;letter-spacing:2px;}
.ph-bar .ph-search{flex:1;background:#eef3f8;border-radius:8px;font:500 18px 'Inter',sans-serif;color:#666;padding:8px 14px;}
.pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;padding:3px;}
.pgrid i{position:relative;display:block;height:128px;}
.pgrid i b{position:absolute;left:10px;bottom:10px;height:10px;width:70%;border-radius:6px;background:rgba(255,255,255,0.85);}
.pgrid .g1{background:linear-gradient(135deg,#ffd9c4,#f7a882);}
.pgrid .g2{background:linear-gradient(135deg,#cfe0fb,#9dbcf0);}
.pgrid .g3{background:linear-gradient(135deg,#ffd3e4,#efa3c4);}
.pgrid .g4{background:linear-gradient(135deg,#d5efdc,#a3d6b4);}
.pgrid .g5{background:linear-gradient(135deg,#ffedbf,#eed28d);}
.pgrid .g6{background:linear-gradient(135deg,#e7dbfb,#c3abee);}
.pgrid{filter:saturate(0.75);}
.li-post{padding:16px 18px 10px;}
.lp-head{display:flex;gap:12px;align-items:center;margin-bottom:12px;}
.lp-av{width:48px;height:48px;border-radius:50%;background:#dfe6ee;color:#4a5b6d;display:flex;align-items:center;justify-content:center;font:700 18px 'Inter',sans-serif;}
.lp-n{font:700 21px 'Inter',sans-serif;color:#111;}
.lp-d{font:500 17px 'Inter',sans-serif;color:#8e8e93;}
.lp-txt{font:500 20px/1.4 'Inter',sans-serif;color:#222;margin-bottom:12px;}
.lp-img{height:118px;border-radius:10px;background:linear-gradient(135deg,#cfe0fb,#f7c8dd);filter:saturate(0.75);}
.lp-act{display:flex;justify-content:space-between;padding:14px 6px 8px;font:600 18px 'Inter',sans-serif;color:#5f6a75;}
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
    <h1 style="font-size:84px;line-height:1.04;letter-spacing:-2.5px;">{h1}</h1>
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
  'Hiring an <span class="ombre">SEO expert?</span>',
  '<span class="pain">Customers can&rsquo;t find you online.</span>They hire whoever shows up, on Google and now on ChatGPT. We make sure that&rsquo;s you.',
  f"""<div class="gpt-head"><span class="dots"><i></i><i></i><i></i></span><span class="t" style="display:flex;align-items:center;gap:10px;">{icon('gpt',26,'#0d0d0d')} ChatGPT <span>&#8964;</span></span></div>
    <div class="gpt-body">
      <div class="gpt-user"><p>Need help getting my sales up. Who should I hire?</p></div>
      <div class="gpt-ans">
        <p>Here are the top 3 I'd recommend:</p>
        <div class="gpt-rec"><span class="n">1</span><span class="nm">Your competitor</span><span class="star">&#9733; 4.8</span></div>
        <div class="gpt-rec"><span class="n">2</span><span class="nm">Your other competitor</span><span class="star">&#9733; 4.7</span></div>
        <div class="gpt-rec"><span class="n">3</span><span class="nm">That one down the street</span><span class="star">&#9733; 4.6</span></div>
      </div>
    </div>
    <div class="gpt-input"><span>Message ChatGPT</span><span class="send">&#8593;</span></div>""",
  '<span class="sticker" style="right:30px;bottom:96px;">You&rsquo;re not on this list.</span><span class="statchip" style="left:30px;bottom:-18px;">Client result: unranked &#8594; Google Top 3</span>',
  "Comment FOUND, I&rsquo;ll check your business &#8594;")

ADS["ad-site-no-calls.html"] = ad(
  "BERMO. ad · SITE · visits but no calls", "1 slide, 1080x1350, mint · comment keyword SITE",
  'Hiring a <span class="ombre">web designer?</span>',
  '<span class="pain">Your website gets visits. You get no calls.</span>We rebuild it so people book, call, and buy &mdash; a site built to turn visitors into qualified leads.',
  f"""<div class="br-tabs"><span class="tdots"><i style="background:#ff5f57;"></i><i style="background:#febc2e;"></i><i style="background:#28c840;"></i></span><span class="br-tab" style="display:flex;align-items:center;gap:10px;">{CHROME} Your Website</span></div>
    <div class="br-url"><span>yourbusiness.com</span></div>
    <div class="site">
      <div class="site-nav"><span class="logo"></span><span>Home</span><span>About</span><span>Services</span><span>Contact</span></div>
      <h3>Welcome to T&amp;M Co.</h3>
      <p style="font:500 22px Inter,sans-serif;color:#9a9aa0;margin-top:14px;">Proudly serving our customers since 2015.</p><div class="l1" style="margin-top:20px;"></div>
      <span class="btn">Learn More</span>
    </div>""",
  """<span class="statcard" style="right:26px;bottom:24px;transform:none;">
      <span class="cap">This month</span>
      <span class="row"><span><span class="big">214</span> <span class="lbl">visits</span></span>
      <span><span class="bad">2</span> <span class="lbl">calls</span></span></span>
    </span><span class="statchip" style="left:30px;bottom:-18px;">After our rebuild: 71% more buyers chose their site on Google</span>""",
  "Comment SITE, get the free 2-minute scan &#8594;")

ADS["ad-hours-slow-reply.html"] = ad(
  "BERMO. ad · HOURS · the AI assistant", "1 slide, 1080x1350, mint · comment keyword HOURS",
  'Hiring a <span class="ombre">virtual assistant?</span>',
  '<span class="pain">Your leads wait days, then hire someone else.</span>We build you an AI assistant that replies in minutes, follows up, and books the job. It sounds like you.',
  f"""<div class="msg-head"><span style="width:52px;height:52px;border-radius:12px;background:linear-gradient(180deg,#6ee86e,#28c840);display:flex;align-items:center;justify-content:center;">{icon('imsg',30,'#ffffff')}</span><div><div class="who">New Lead</div><div class="st">Text Message</div></div></div>
    <div class="msg-body">
      <div class="msg-time">Tuesday 9:41 AM</div>
      <div class="mb in">Hi! Are you free to take on a job this week?</div>
      <div class="msg-time" style="margin-top:22px;">Friday 4:12 PM</div>
      <div class="mb out">So sorry for the late reply! Yes, we'd love to help&hellip;</div>
      <div class="msg-sys">&#9888;&nbsp; This lead already booked someone else</div>
    </div>""",
  '<span class="sticker" style="right:24px;top:16px;transform:rotate(2deg);font-size:22px;padding:14px 22px;">Your AI assistant replies in 90 seconds.</span><span class="statchip" style="left:30px;bottom:-18px;">Clients get 5&ndash;10 hours back, every week</span>',
  "Comment HOURS for a free demo &#8594;")

ADS["ad-window-last-post-april.html"] = ad(
  "BERMO. ad · WINDOW · last post April", "1 slide, 1080x1350, mint · comment keyword WINDOW",
  'Hiring a <span class="ombre">social media manager?</span>',
  '<span class="pain">Buyers check you out before they call.</span>We plan, write, and post every week &mdash; Instagram and LinkedIn, in your voice.',
  f"""<div class="phones">
      <div class="phone"><div class="screen">
        <div class="ph-bar">{icon('ig',26,'#111111')}<span class="pu">yourbusiness</span><span class="ph-dots">&#8942;</span></div>
        <div class="ig-warn" style="font-size:19px;padding:11px;">&#9888;&nbsp; Last post &middot; 4 months ago</div>
        <div class="pgrid">
          <i class="g1"><b></b></i><i class="g2"><b style="width:56%;"></b><span class="vb">&#9654; 28K</span></i><i class="g3"><b style="width:44%;"></b></i>
          <i class="g4"><b style="width:60%;"></b></i><i class="g5"><b></b></i><i class="g6"><b style="width:50%;"></b></i>
        </div>
      </div></div>
      <div class="phone"><div class="screen">
        <div class="ph-bar">{icon('li',26,'#0A66C2')}<span class="ph-search">Search</span><span class="ph-dots">&#8942;</span></div>
        <div class="li-post">
          <div class="lp-head"><span class="lp-av">YB</span><div><div class="lp-n">Your Business</div><div class="lp-d">Posted &middot; March 12</div></div></div>
          <p class="lp-txt">Excited to share what we've been working on this spring&hellip;</p>
          <div class="lp-img"></div>
          <div class="lp-act"><span>&#128077; Like</span><span>&#128172; Comment</span><span>&#8631; Repost</span></div>
        </div>
        <div class="ig-warn" style="font-size:19px;padding:11px;border-bottom:0;">&#9888;&nbsp; Nothing since March</div>
      </div></div>
    </div>""",
  '<span class="statchip" style="left:30px;bottom:-18px;">28K views in 24 hours &mdash; from 34 followers</span>',
  "Comment WINDOW, get the free plan &#8594;")


ADS["ad-grow-marketing-plan.html"] = ad(
  "BERMO. ad · GROW · the marketing plan nobody opened", "1 slide, 1080x1350, mint · comment keyword GROW",
  'Hiring a <span class="ombre">marketing agency?</span>',
  '<span class="pain">Marketing feels like guessing.</span>Message, target market, website, social &mdash; we build one plan, then actually do it with you.',
  f"""<div class="doc-head"><span class="doc-icon"></span><div><div class="doc-title">Marketing plan 2026</div><div class="doc-sub">Last edit was 7 months ago</div></div><span class="doc-share">Share</span></div>
    <div class="doc-menu"><span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span><span>Tools</span></div>
    <div class="doc-wrap">
      <div class="doc-list">
        <div class="doc-item"><span class="box"></span>Figure out our message</div>
        <div class="doc-item"><span class="box"></span>Pick a target market</div>
        <div class="doc-item hl"><span class="box"></span>Fix the website</div>
        <div class="doc-item"><span class="box"></span>Post on social every week</div>
        <div class="doc-item"><span class="box"></span>Actual strategy??</div>
      </div>
      <div class="doc-cmt">
        <div class="ch"><span class="cav">B.</span><span class="cn">BERMO.</span></div>
        <p>We find an average of <b>$125K in revenue opportunities</b> hiding in plans like this.</p>
        <span class="rep">Reply</span>
      </div>
    </div>""",
  '<span class="sticker" style="right:40px;bottom:-20px;transform:rotate(-2deg);">Sound familiar?</span>',
  "Comment GROW, get the free Gap Scan &#8594;")

ADS["ad-proof-receipt.html"] = ad(
  "BERMO. ad · PROOF · the receipts", "1 slide, 1080x1350, mint · comment keyword PROOF",
  'Proof, <span class="ombre">not promises.</span>',
  '<span class="pain">Everyone says they&rsquo;re the best.</span>Here&rsquo;s what actually happened for BERMO. clients &mdash; scan it in three seconds.',
  f"""<div class="rcpt" style="box-shadow:none;">
      <div class="rh"><div class="rw">BERMO.</div><div class="rl">Client results &middot; receipt</div></div>
      <div class="rcpt-item"><span class="k">Revenue opportunities identified</span><span class="dots2"></span><span class="v">$125K</span></div>
      <div class="rcpt-item"><span class="k">Cost savings, first two weeks</span><span class="dots2"></span><span class="v">$25K</span></div>
      <div class="rcpt-item"><span class="k">High-intent buyer searches</span><span class="dots2"></span><span class="v">Google Top 3</span></div>
      <div class="rcpt-item"><span class="k">Views in 24h, from 34 followers</span><span class="dots2"></span><span class="v">28K+</span></div>
      <div class="rcpt-item"><span class="k">Manual work cut, every week</span><span class="dots2"></span><span class="v">5&ndash;10 hrs</span></div>
      <div class="barcode"></div>
      <div class="rfoot">HUMAN-LED &middot; AI-LEVERAGED &middot; BERMOCO.COM</div>
    </div>""",
  "",
  "Comment PROOF, get the free Gap Scan &#8594;")

for name, html in ADS.items():
    with open(os.path.join(HERE, name), "w") as f:
        f.write(html)
    print("wrote", name)

if "--html-only" not in sys.argv:
    render = os.path.join(HERE, "render_png.py")
    subprocess.run([sys.executable, render], check=True)

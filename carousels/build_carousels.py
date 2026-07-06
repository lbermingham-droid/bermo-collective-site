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
.slide.cover{padding-left:120px;padding-right:120px;}
.slide.light{background-color:var(--off);background-image:radial-gradient(rgba(10,10,10,0.13) 1.6px, transparent 1.6px);background-size:26px 26px;color:var(--ink);}
.slide.mint{background:linear-gradient(180deg,#f2fffc 0%,#c9fbf1 38%,#5deed3 78%,#0ee2c2 100%);color:var(--ink);}
.slide.mint::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(10,10,10,0.12) 1.6px, transparent 1.6px);background-size:26px 26px;pointer-events:none;}
.slide.dark{background-color:#0a0a0a;background-image:radial-gradient(rgba(245,245,240,0.16) 1.6px, transparent 1.6px);background-size:26px 26px;color:var(--off);}
.slide>*{position:relative;z-index:2;}
/* header */
.bar{position:absolute;top:64px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center;z-index:3;}
.cover .bar{left:120px;right:120px;}
.wordmark{font:900 34px 'Montserrat',sans-serif;letter-spacing:1px;color:var(--ink);}
.site{font:600 17px 'Inter',sans-serif;letter-spacing:0.5px;color:rgba(10,10,10,0.55);}
.dark .wordmark{color:var(--off);}
.dark .site{color:rgba(245,245,240,0.55);}
/* footer nav */
.next{position:absolute;bottom:56px;left:50%;transform:translateX(-50%);width:64px;height:64px;border-radius:50%;background:var(--ink);color:var(--cyan);display:flex;align-items:center;justify-content:center;font:700 28px 'Inter',sans-serif;z-index:3;}
.dark .next{background:var(--cyan);color:var(--ink);}
.pager{position:absolute;bottom:70px;right:80px;font:700 17px 'Barlow Condensed',sans-serif;letter-spacing:3px;color:rgba(10,10,10,0.45);z-index:3;}
.dark .pager{color:rgba(245,245,240,0.5);}
/* content area: centered, fills the canvas */
.content{flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding-top:72px;align-items:center;text-align:center;gap:46px;width:100%;}
/* type */
.kicker{font:700 22px 'Barlow Condensed',sans-serif;letter-spacing:7px;text-transform:uppercase;color:rgba(10,10,10,0.6);}
.dark .kicker{color:rgba(245,245,240,0.6);}
h1{font:900 92px/1.05 'Inter Tight',sans-serif;letter-spacing:-2.5px;text-wrap:balance;width:100%;}
h2{font:900 58px/1.12 'Inter Tight',sans-serif;letter-spacing:-1.5px;text-wrap:balance;width:100%;}
.dark h1,.dark h2{color:var(--off);}
/* emphasis: cyan highlight box on offwhite only, cyan text on dark, plain on mint */
.light .hl{background:var(--cyan);padding:0 14px;box-decoration-break:clone;-webkit-box-decoration-break:clone;}
.dark .hl{color:var(--cyan);}
.body{font:500 32px/1.5 'Inter',sans-serif;color:rgba(10,10,10,0.82);text-wrap:pretty;max-width:880px;}
.body b{font-weight:700;color:var(--ink);}
.dark .body{color:rgba(245,245,240,0.85);}
.dark .body b{color:#fff;}
.hand{font:700 36px 'Caveat',cursive;color:rgba(10,10,10,0.75);}
.dark .hand{color:rgba(245,245,240,0.8);}
/* CTA button */
.cta{display:inline-flex;align-items:center;gap:14px;background:var(--ink);color:var(--cyan);font:800 30px 'Inter Tight',sans-serif;padding:26px 52px;border-radius:16px;box-shadow:0 14px 40px rgba(10,10,10,0.35);}
.dark .cta{background:var(--cyan);color:var(--ink);box-shadow:0 14px 40px rgba(0,229,196,0.25);}
/* ================= UI components (each used ONCE across the set) ================= */
.ui{width:100%;text-align:left;}
.card-d{background:#0d0d0d;border:1px solid rgba(255,255,255,0.09);border-radius:24px;box-shadow:0 30px 70px rgba(10,10,10,0.35);}
.dark .card-d{background:#111;border-color:rgba(255,255,255,0.13);box-shadow:0 30px 70px rgba(0,0,0,0.6);}
.card-w{background:#fff;border:1px solid rgba(10,10,10,0.06);border-radius:24px;box-shadow:0 26px 60px rgba(10,10,10,0.12);color:var(--ink);}
.dark .card-w{box-shadow:0 30px 70px rgba(0,0,0,0.55);}
.uihead{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;}
.uihead .t{font:800 24px 'Inter Tight',sans-serif;}
.card-d .uihead .t{color:#fff;}
.utag{font:700 13px 'Inter',sans-serif;letter-spacing:1px;text-transform:uppercase;border-radius:100px;padding:6px 14px;}
.utag.cy{background:rgba(0,245,212,0.15);color:#00c9ab;}
.card-d .utag.cy{color:var(--cyan);}
.utag.am{background:rgba(255,176,32,0.16);color:#c07f00;}
.card-d .utag.am{background:rgba(255,176,32,0.15);color:#ffb020;}
.utag.gr{background:#ececea;color:#777;}
.card-d .utag.gr{background:#242424;color:#9a9a9a;}
/* gap scan card */
.scan{padding:36px;}
.scan-top{display:flex;gap:14px;margin-bottom:26px;}
.scan-url{flex:1;background:#1c1c1c;border:1px solid #2c2c2c;border-radius:10px;padding:15px 20px;font:500 21px 'Inter',sans-serif;color:#e8e8e8;display:flex;align-items:center;}
.scan-url .caret{display:inline-block;width:2px;height:24px;background:var(--cyan);margin-left:4px;}
.scan-btn{background:var(--cyan);color:var(--ink);font:800 21px 'Inter Tight',sans-serif;border-radius:10px;padding:15px 30px;display:flex;align-items:center;}
.scan-row{display:flex;align-items:center;gap:16px;padding:15px 18px;border-radius:10px;margin-bottom:10px;background:#161616;}
.dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;}
.dot.g{background:var(--cyan);}.dot.y{background:#ffb020;}.dot.gr{background:#555;}
.scan-name{font:600 21px 'Inter',sans-serif;color:#f0f0f0;flex:1;}
.scan-num{font:700 21px 'Inter',sans-serif;color:#cfcfcf;margin-right:10px;}
.scan-note{margin-top:22px;background:#141414;border:1px solid rgba(0,245,212,0.35);border-radius:12px;padding:18px 20px;display:flex;gap:14px;align-items:flex-start;}
.scan-note .ico{width:34px;height:34px;border-radius:50%;background:var(--cyan);color:var(--ink);display:flex;align-items:center;justify-content:center;font:800 17px 'Inter Tight',sans-serif;flex-shrink:0;}
.scan-note p{font:500 20px/1.4 'Inter',sans-serif;color:#e6e6e6;}
.scan-note b{color:var(--cyan);font-weight:700;}
/* savings card */
.save{padding:44px 40px;position:relative;}
.save-row{display:flex;gap:24px;align-items:flex-start;margin-bottom:30px;text-align:left;}
.save-row:last-child{margin-bottom:0;}
.pill{background:var(--ink);color:var(--cyan);font:700 16px 'Barlow Condensed',sans-serif;letter-spacing:2px;text-transform:uppercase;border-radius:100px;padding:9px 18px;flex-shrink:0;margin-top:4px;}
.save-main{font:900 40px 'Inter Tight',sans-serif;letter-spacing:-0.5px;}
.save-main .sv{background:var(--cyan);padding:0 10px;}
.save-sub{font:500 22px/1.4 'Inter',sans-serif;color:rgba(10,10,10,0.6);margin-top:6px;}
.spark{position:absolute;top:40px;right:40px;text-align:right;}
.spark .badge{background:var(--ink);color:var(--cyan);font:800 20px 'Inter Tight',sans-serif;border-radius:100px;padding:8px 18px;display:inline-block;margin-bottom:10px;}
/* stat tiles */
.tiles{display:flex;gap:22px;}
.tile{flex:1;border-radius:20px;padding:34px 26px;text-align:center;background:#fff;border:1px solid rgba(10,10,10,0.06);box-shadow:0 18px 44px rgba(10,10,10,0.10);}
.tile .n{font:900 46px 'Inter Tight',sans-serif;letter-spacing:-1px;color:var(--ink);}
.tile .n span{color:#00c9ab;}
.tile .d{font:500 19px/1.35 'Inter',sans-serif;color:rgba(10,10,10,0.6);margin-top:10px;}
/* store grid */
.store{display:grid;grid-template-columns:1fr 1fr;gap:22px;}
.prod{background:#fff;border-radius:18px;padding:28px 24px;box-shadow:0 16px 40px rgba(10,10,10,0.10);border:1px solid rgba(10,10,10,0.06);position:relative;text-align:left;}
.prod .pico{width:52px;height:52px;border-radius:12px;background:var(--ink);color:var(--cyan);display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px;}
.prod .pt{font:800 25px 'Inter Tight',sans-serif;letter-spacing:-0.3px;color:var(--ink);}
.prod .pd{font:500 18px/1.4 'Inter',sans-serif;color:rgba(10,10,10,0.58);margin-top:8px;}
.prod .add{position:absolute;top:22px;right:22px;background:var(--ink);color:var(--cyan);font:700 14px 'Inter',sans-serif;border-radius:100px;padding:6px 14px;}
/* diagnostic areas grid */
.areas{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;}
.area{background:#fff;border-radius:16px;padding:26px 24px;border:1px solid rgba(10,10,10,0.06);box-shadow:0 14px 36px rgba(10,10,10,0.10);text-align:left;}
.area .an{font:800 24px 'Inter Tight',sans-serif;color:var(--ink);}
.area .asc{font:900 42px 'Inter Tight',sans-serif;margin-top:6px;color:var(--ink);}
.area .abar{height:9px;border-radius:5px;background:#ececea;margin-top:14px;overflow:hidden;}
.area .abar i{display:block;height:100%;border-radius:5px;}
/* scan summary ring */
.scansum{padding:40px;display:flex;gap:36px;align-items:center;}
.ringwrap{flex-shrink:0;position:relative;width:210px;height:210px;}
.ringwrap .rv{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;}
.ringwrap .rv .rn{font:900 56px 'Inter Tight',sans-serif;}
.ringwrap .rv .rl{font:600 16px 'Inter',sans-serif;color:#9a9a9a;letter-spacing:1px;text-transform:uppercase;}
.sumrows{flex:1;}
.sumrow{display:flex;align-items:center;gap:16px;background:#161616;border-radius:12px;padding:17px 20px;margin-bottom:12px;}
.sumrow:last-child{margin-bottom:0;}
.sumrow .sl{font:600 15px 'Barlow Condensed',sans-serif;letter-spacing:2px;text-transform:uppercase;color:#8a8a8a;width:110px;flex-shrink:0;text-align:left;}
.sumrow .sn{font:700 22px 'Inter',sans-serif;color:#f0f0f0;flex:1;text-align:left;}
/* shadow brief chat */
.brief{padding:36px;}
.brief-msg{background:#161616;border-radius:14px;padding:22px 24px;margin-bottom:14px;text-align:left;}
.brief-msg p{font:500 21px/1.45 'Inter',sans-serif;color:#e6e6e6;}
.brief-item{display:flex;gap:14px;align-items:center;background:#161616;border-radius:12px;padding:16px 20px;margin-bottom:10px;}
.brief-item .bx{width:26px;height:26px;border-radius:7px;border:2px solid #3a3a3a;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--cyan);font-weight:800;font-size:16px;}
.brief-item .bx.on{background:rgba(0,245,212,0.12);border-color:var(--cyan);}
.brief-item p{font:500 20px 'Inter',sans-serif;color:#dedede;text-align:left;flex:1;}
.brief-input{margin-top:20px;background:#1c1c1c;border:1px solid #2c2c2c;border-radius:100px;padding:15px 24px;font:500 19px 'Inter',sans-serif;color:#8a8a8a;display:flex;justify-content:space-between;align-items:center;}
.brief-input .send{width:34px;height:34px;border-radius:50%;background:var(--cyan);color:var(--ink);display:flex;align-items:center;justify-content:center;font-weight:800;}
/* funnel */
.funnel{padding:40px;}
.frow{display:flex;align-items:center;gap:18px;margin-bottom:16px;}
.frow:last-child{margin-bottom:0;}
.frow .fl{width:210px;font:600 21px 'Inter',sans-serif;color:rgba(10,10,10,0.7);text-align:left;flex-shrink:0;}
.frow .fbar{flex:1;height:44px;border-radius:10px;background:#f0f0ec;overflow:hidden;position:relative;}
.frow .fbar i{position:absolute;inset:0 auto 0 0;border-radius:10px;background:var(--ink);}
.frow .fv{width:80px;font:800 22px 'Inter Tight',sans-serif;text-align:right;flex-shrink:0;color:var(--ink);}
/* plan checklist */
.plan{padding:40px;}
.step{display:flex;align-items:center;gap:18px;background:#161616;border-radius:12px;padding:18px 20px;margin-bottom:12px;}
.step:last-child{margin-bottom:0;}
.step .num{width:40px;height:40px;border-radius:10px;background:var(--cyan);color:var(--ink);font:800 20px 'Inter Tight',sans-serif;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.step .num.off{background:#242424;color:#8a8a8a;}
.step .st{font:600 22px 'Inter',sans-serif;color:#f0f0f0;flex:1;text-align:left;}
.step .ss{font:500 17px 'Inter',sans-serif;color:#8a8a8a;text-align:right;}
.step .chk{color:var(--cyan);font-size:22px;}
/* shop rows */
.shop{padding:36px;}
.shoprow{display:flex;align-items:center;gap:20px;background:#161616;border-radius:14px;padding:20px 22px;margin-bottom:12px;}
.shoprow:last-child{margin-bottom:0;}
.shoprow .sico{width:52px;height:52px;border-radius:12px;background:#0a0a0a;border:1px solid rgba(0,245,212,0.35);color:var(--cyan);display:flex;align-items:center;justify-content:center;font-size:23px;flex-shrink:0;}
.shoprow .sm{flex:1;text-align:left;}
.shoprow .sm .st1{font:800 23px 'Inter Tight',sans-serif;color:#fff;}
.shoprow .sm .st2{font:500 18px 'Inter',sans-serif;color:#9a9a9a;margin-top:4px;}
.shoprow .sadd{background:var(--cyan);color:var(--ink);font:800 17px 'Inter Tight',sans-serif;border-radius:100px;padding:10px 22px;flex-shrink:0;}
/* AI search */
.aisearch{padding:36px;}
.aiq{background:#1c1c1c;border-radius:14px 14px 14px 4px;padding:20px 24px;font:600 21px 'Inter',sans-serif;color:#f0f0f0;text-align:left;margin-bottom:18px;max-width:80%;}
.aia{background:#161616;border:1px solid rgba(0,245,212,0.25);border-radius:14px 14px 4px 14px;padding:24px 26px;text-align:left;margin-left:auto;max-width:92%;}
.aia p{font:500 21px/1.5 'Inter',sans-serif;color:#e6e6e6;}
.aia b{color:var(--cyan);}
.aisrc{display:inline-flex;align-items:center;gap:8px;margin-top:16px;background:#0a0a0a;border:1px solid #2c2c2c;border-radius:100px;padding:8px 16px;font:600 16px 'Inter',sans-serif;color:#9a9a9a;}
.aisrc .sd{width:8px;height:8px;border-radius:50%;background:var(--cyan);}
/* linkedin post */
.li{padding:0;overflow:hidden;}
.li-head{display:flex;gap:14px;padding:24px 26px 0;align-items:flex-start;text-align:left;}
.li-av{width:56px;height:56px;border-radius:50%;background:var(--ink);color:var(--cyan);display:flex;align-items:center;justify-content:center;font:900 19px 'Montserrat',sans-serif;flex-shrink:0;}
.li-name{font:700 21px 'Inter',sans-serif;color:#191919;}
.li-sub{font:400 16px 'Inter',sans-serif;color:#666;margin-top:2px;}
.li-body{padding:16px 26px 0;text-align:left;}
.li-body p{font:400 20px/1.5 'Inter',sans-serif;color:#191919;}
.li-stats{display:flex;justify-content:space-between;padding:14px 26px;font:400 16px 'Inter',sans-serif;color:#666;border-bottom:1px solid #e8e8e8;margin-top:14px;}
.li-actions{display:flex;justify-content:space-around;padding:12px 10px;}
.li-actions span{font:600 17px 'Inter',sans-serif;color:#555;}
/* crm kanban */
.crm{padding:32px;}
.crm-cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;}
.crm-col .ch{font:700 15px 'Barlow Condensed',sans-serif;letter-spacing:2px;text-transform:uppercase;color:#8a8a8a;margin-bottom:12px;text-align:left;display:flex;justify-content:space-between;}
.crm-card{background:#161616;border-radius:12px;padding:16px;margin-bottom:12px;text-align:left;}
.crm-card .cc1{font:700 19px 'Inter',sans-serif;color:#f0f0f0;}
.crm-card .cc2{font:500 16px 'Inter',sans-serif;color:#8a8a8a;margin-top:5px;}
.crm-card .ccbar{margin-top:12px;display:flex;align-items:center;gap:8px;}
.crm-card .ccav{width:26px;height:26px;border-radius:50%;background:#242424;color:#bdbdbd;font:700 12px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;}
.crm-card.won{border:1px solid rgba(0,245,212,0.4);}
/* hiring shortlist */
.hire{padding:36px;}
.cand{display:flex;align-items:center;gap:18px;background:#f6f6f2;border:1px solid rgba(10,10,10,0.05);border-radius:14px;padding:18px 20px;margin-bottom:12px;}
.cand:last-child{margin-bottom:0;}
.cand .cav{width:52px;height:52px;border-radius:50%;background:var(--ink);color:#fff;font:700 19px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cand .cm{flex:1;text-align:left;}
.cand .cm .cn{font:700 22px 'Inter Tight',sans-serif;color:var(--ink);}
.cand .cm .cr{font:500 17px 'Inter',sans-serif;color:rgba(10,10,10,0.55);margin-top:3px;}
.cand .match{font:800 22px 'Inter Tight',sans-serif;color:#00a58c;margin-right:6px;}
/* stepper */
.stepper{display:flex;gap:0;align-items:stretch;}
.sstep{flex:1;background:#fff;border:1px solid rgba(10,10,10,0.07);border-radius:18px;padding:30px 24px;box-shadow:0 16px 40px rgba(10,10,10,0.10);text-align:left;}
.sstep .sn{width:46px;height:46px;border-radius:12px;background:var(--ink);color:var(--cyan);font:800 22px 'Inter Tight',sans-serif;display:flex;align-items:center;justify-content:center;margin-bottom:16px;}
.sstep .st1{font:800 26px 'Inter Tight',sans-serif;color:var(--ink);}
.sstep .st2{font:500 18px/1.4 'Inter',sans-serif;color:rgba(10,10,10,0.6);margin-top:8px;}
.sarr{align-self:center;font:800 30px 'Inter',sans-serif;color:rgba(10,10,10,0.5);padding:0 12px;}
/* blueprint board */
.board{padding:36px;}
.brow{display:grid;grid-template-columns:56px 1fr 200px 130px;gap:14px;align-items:center;background:#161616;border-radius:12px;padding:16px 20px;margin-bottom:11px;}
.brow.h{background:none;padding:6px 20px;margin-bottom:8px;}
.brow.h span{font:700 14px 'Barlow Condensed',sans-serif;letter-spacing:2px;text-transform:uppercase;color:#8a8a8a;text-align:left;}
.brow .bn{width:38px;height:38px;border-radius:10px;background:var(--cyan);color:var(--ink);font:800 19px 'Inter Tight',sans-serif;display:flex;align-items:center;justify-content:center;}
.brow .bn.off{background:#242424;color:#8a8a8a;}
.brow .bt{font:600 21px 'Inter',sans-serif;color:#f0f0f0;text-align:left;}
.brow .bw{font:500 18px 'Inter',sans-serif;color:#9a9a9a;text-align:left;}
/* revenue chart */
.chart{padding:40px;}
.chart .cx{display:flex;justify-content:space-between;margin-top:14px;}
.chart .cx span{font:600 16px 'Inter',sans-serif;color:rgba(10,10,10,0.45);}
/* team roster */
.team{padding:36px;}
.trow{display:flex;align-items:center;gap:18px;background:#f6f6f2;border:1px solid rgba(10,10,10,0.05);border-radius:14px;padding:17px 20px;margin-bottom:12px;}
.trow:last-child{margin-bottom:0;}
.trow .tav{width:50px;height:50px;border-radius:50%;color:#fff;font:700 18px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.trow .tm{flex:1;text-align:left;}
.trow .tm .tn{font:700 22px 'Inter Tight',sans-serif;color:var(--ink);}
.trow .tm .tr{font:500 17px 'Inter',sans-serif;color:rgba(10,10,10,0.55);margin-top:3px;}
/* placement timeline */
.place{padding:40px;}
.prow{display:flex;gap:20px;margin-bottom:8px;}
.prail{display:flex;flex-direction:column;align-items:center;flex-shrink:0;}
.pdot{width:22px;height:22px;border-radius:50%;background:var(--cyan);border:5px solid rgba(0,201,171,0.25);}
.pdot.off{background:#d5d5d0;border-color:#ebebe6;}
.pline{width:3px;flex:1;background:#e3e3de;margin:4px 0;}
.pbody{padding-bottom:26px;text-align:left;}
.pbody .pd1{font:800 23px 'Inter Tight',sans-serif;color:var(--ink);}
.pbody .pd2{font:500 19px 'Inter',sans-serif;color:rgba(10,10,10,0.6);margin-top:4px;}
/* room signals */
.room{padding:40px;}
.sig{display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:12px;background:#f6f6f2;margin-bottom:12px;border:1px solid rgba(10,10,10,0.05);}
.sig:last-child{margin-bottom:0;}
.sig .si{width:44px;height:44px;border-radius:10px;background:var(--ink);color:var(--cyan);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.sig .sn{font:700 22px 'Inter Tight',sans-serif;flex:1;text-align:left;color:var(--ink);}
/* email thread */
.mail{padding:0;overflow:hidden;}
.mail-top{padding:22px 28px;border-bottom:1px solid #ececea;text-align:left;}
.mail-top .ms{font:700 22px 'Inter',sans-serif;color:#191919;}
.mail-msg{padding:20px 28px;border-bottom:1px solid #f1f1ee;text-align:left;display:flex;gap:16px;}
.mail-av{width:44px;height:44px;border-radius:50%;font:700 16px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;}
.mail-b{flex:1;}
.mail-b .mh{display:flex;justify-content:space-between;font:700 18px 'Inter',sans-serif;color:#191919;}
.mail-b .mh span:last-child{font-weight:500;color:#999;font-size:16px;}
.mail-b p{font:400 19px/1.45 'Inter',sans-serif;color:#444;margin-top:6px;}
.mail-alert{margin:20px 28px 24px;background:rgba(255,176,32,0.12);border:1px solid rgba(255,176,32,0.5);border-radius:12px;padding:16px 20px;font:600 19px 'Inter',sans-serif;color:#8a5a00;text-align:left;}
/* browser view */
.brw{padding:0;overflow:hidden;}
.brw-bar{background:#ececea;padding:14px 20px;display:flex;align-items:center;gap:14px;}
.brw-bar .bdots{display:flex;gap:7px;}
.brw-bar .bdots i{width:12px;height:12px;border-radius:50%;background:#cfcfca;display:block;}
.brw-bar .burl{flex:1;background:#fff;border-radius:8px;padding:9px 16px;font:500 17px 'Inter',sans-serif;color:#777;text-align:left;}
.brw-page{padding:34px 30px 30px;text-align:left;}
.brw-page .bh{font:900 38px 'Inter Tight',sans-serif;color:var(--ink);letter-spacing:-1px;}
.brw-page .bp{font:500 20px/1.45 'Inter',sans-serif;color:rgba(10,10,10,0.6);margin-top:10px;max-width:520px;}
.brw-note{display:flex;align-items:center;gap:12px;margin-top:16px;font:600 19px 'Inter',sans-serif;}
.brw-note .ok{color:#00a58c;}
.brw-note .warn{color:#c07f00;}
/* report contents */
.report{padding:38px;}
.rrow{display:flex;align-items:center;gap:18px;background:#161616;border-radius:12px;padding:18px 20px;margin-bottom:12px;}
.rrow:last-child{margin-bottom:0;}
.rrow .ri{width:44px;height:44px;border-radius:10px;background:#0a0a0a;border:1px solid rgba(0,245,212,0.35);color:var(--cyan);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.rrow p{font:600 21px 'Inter',sans-serif;color:#e6e6e6;flex:1;text-align:left;}
/* mint posts: one size, one weight, left aligned outside UI on non-cover slides */
.mint:not(.cover) .content{align-items:flex-start;text-align:left;}
.mint:not(.cover) h2{font:900 50px/1.28 'Inter Tight',sans-serif;letter-spacing:-1.2px;}
.mint:not(.cover) .body{font:900 50px/1.28 'Inter Tight',sans-serif;letter-spacing:-1.2px;color:var(--ink);max-width:920px;}
/* hero composite (post 1 cover) */
.hero{position:relative;width:100%;height:580px;}
.hero-main{position:absolute;left:60px;right:60px;top:60px;bottom:44px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.09);border-radius:24px;box-shadow:0 34px 80px rgba(10,10,10,0.4);padding:30px 32px;text-align:left;}
.hero-kpis{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;}
.hero-kpi{background:#161616;border-radius:12px;padding:16px 18px;}
.hero-kpi .kl{font:600 13px 'Inter',sans-serif;letter-spacing:1px;text-transform:uppercase;color:#8a8a8a;}
.hero-kpi .kv{font:900 32px 'Inter Tight',sans-serif;color:#fff;margin-top:6px;}
.hero-kpi .kv em{font-style:normal;color:var(--cyan);}
.hero-rows .hr1{display:flex;align-items:center;gap:12px;background:#161616;border-radius:10px;padding:13px 16px;margin-bottom:9px;}
.hero-rows .hr1 .hd{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.hero-rows .hr1 p{font:500 17px 'Inter',sans-serif;color:#dedede;flex:1;}
.hero-rows .hr1 .ht{font:600 14px 'Inter',sans-serif;color:#8a8a8a;}
.hero-float{position:absolute;background:#fff;border-radius:16px;box-shadow:0 24px 56px rgba(10,10,10,0.30);border:1px solid rgba(10,10,10,0.06);text-align:left;}
.hero-chart{top:0;right:0;width:250px;padding:20px;transform:rotate(3deg);}
.hero-chart .hc1{font:600 15px 'Inter',sans-serif;color:rgba(10,10,10,0.55);}
.hero-chart .hc2{font:900 30px 'Inter Tight',sans-serif;color:var(--ink);margin:2px 0 8px;}
.hero-msg{bottom:0;left:0;width:330px;padding:18px 20px;transform:rotate(-3deg);display:flex;gap:12px;align-items:flex-start;}
.hero-msg .ico{width:36px;height:36px;border-radius:10px;background:var(--ink);color:var(--cyan);display:flex;align-items:center;justify-content:center;font:800 16px 'Inter Tight',sans-serif;flex-shrink:0;}
.hero-msg p{font:500 17px/1.4 'Inter',sans-serif;color:var(--ink);}
/* services board (post 1, the shop) */
.shopboard{padding:32px;}
.svc{display:flex;align-items:center;gap:16px;background:#f6f6f2;border:1px solid rgba(10,10,10,0.05);border-radius:13px;padding:15px 18px;margin-bottom:10px;}
.svc .sno{font:800 17px 'Barlow Condensed',sans-serif;color:rgba(10,10,10,0.4);width:30px;flex-shrink:0;}
.svc .snm{font:700 21px 'Inter Tight',sans-serif;color:var(--ink);flex:1;text-align:left;}
.svc .sds{font:500 16px 'Inter',sans-serif;color:rgba(10,10,10,0.5);text-align:left;flex:1.4;}
.packs{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-top:18px;}
.pack{background:var(--ink);border-radius:12px;padding:16px 14px;text-align:left;}
.pack .pk1{font:800 18px 'Inter Tight',sans-serif;color:#fff;}
.pack .pk2{font:500 14px/1.35 'Inter',sans-serif;color:#9a9a9a;margin-top:5px;}
.pack.first{background:var(--cyan);}
.pack.first .pk1{color:var(--ink);}
.pack.first .pk2{color:rgba(10,10,10,0.65);}
/* work board, monday style (post 5 cover) */
.wb{padding:30px 32px;}
.wb-cols{display:grid;grid-template-columns:1.5fr 70px 150px 1fr;gap:12px;align-items:center;padding:0 16px 10px;}
.wb-cols span{font:700 13px 'Barlow Condensed',sans-serif;letter-spacing:2px;text-transform:uppercase;color:#8a8a8a;text-align:left;}
.wb-row{display:grid;grid-template-columns:1.5fr 70px 150px 1fr;gap:12px;align-items:center;background:#161616;border-radius:12px;padding:14px 16px;margin-bottom:10px;border-left:5px solid #2c2c2c;}
.wb-row.c1{border-left-color:var(--cyan);}
.wb-row.c2{border-left-color:#ffb020;}
.wb-row .wt{font:600 19px 'Inter',sans-serif;color:#f0f0f0;text-align:left;}
.wb-row .wav{width:34px;height:34px;border-radius:50%;background:#242424;color:#cfcfcf;font:700 13px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;}
.wb-row .wst{font:700 15px 'Inter',sans-serif;border-radius:8px;padding:9px 0;text-align:center;}
.wb-row .wst.done{background:var(--cyan);color:var(--ink);}
.wb-row .wst.doing{background:#ffb020;color:#3a2800;}
.wb-row .wst.q{background:#242424;color:#9a9a9a;}
.wb-row .wtl{height:12px;border-radius:6px;background:#242424;overflow:hidden;}
.wb-row .wtl i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#00c9ab,#00f5d4);}
/* results receipts (post 5 close) */
.rcpt{padding:34px 36px;}
.rc-row{display:flex;align-items:center;gap:18px;border-bottom:1px solid rgba(255,255,255,0.08);padding:17px 4px;}
.rc-row:last-child{border-bottom:none;}
.rc-row .rcv{font:900 34px 'Inter Tight',sans-serif;color:var(--cyan);width:190px;flex-shrink:0;text-align:left;}
.rc-row p{font:500 21px 'Inter',sans-serif;color:#e6e6e6;flex:1;text-align:left;}
.rc-row .rck{color:var(--cyan);font-size:24px;}
/* growth stack cards (replica of bermoco.com) */
.stack{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;}
.stk{background:#fff;border:1px solid rgba(10,10,10,0.06);border-radius:20px;padding:38px 30px;box-shadow:0 18px 44px rgba(10,10,10,0.10);text-align:left;display:flex;flex-direction:column;}
.stk .ski{width:66px;height:66px;border-radius:18px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;}
.stk h4{font:800 32px 'Inter Tight',sans-serif;letter-spacing:-0.5px;color:var(--ink);}
.stk .sd{font:500 20px/1.5 'Inter',sans-serif;color:rgba(10,10,10,0.62);margin-top:10px;flex:1;}
.stk .sl{border-top:1px solid #ececea;margin-top:18px;padding-top:15px;font:500 17px/1.55 'Inter',sans-serif;color:#9a9a95;}
.stk .see{font:700 18px 'Inter',sans-serif;color:var(--ink);margin-top:13px;}
/* where should we start path picker (replica) */
.path{padding:44px;}
.path-q{border-radius:15px;padding:2.5px;background:linear-gradient(90deg,#ff9a3d,#ff2d7a,#00f5d4);}
.path-qi{background:#141414;border-radius:12.5px;display:flex;gap:16px;align-items:center;padding:22px 26px;font:600 25px 'Inter',sans-serif;color:#f0f0f0;text-align:left;}
.path-qi .mag{color:var(--cyan);font-size:22px;}
.path-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:30px;}
.pcard{background:#fff;border-radius:16px;padding:32px 18px;text-align:center;}
.pcard .pl{font:500 17px 'Inter',sans-serif;color:#8a8a8a;}
.pcard .pi{width:58px;height:58px;border-radius:15px;background:var(--cyan);margin:18px auto 16px;display:flex;align-items:center;justify-content:center;color:var(--ink);}
.pcard .pn{font:800 25px 'Inter Tight',sans-serif;color:var(--ink);}
.path-note{margin-top:24px;text-align:center;font:600 20px 'Inter',sans-serif;color:#9a9a9a;}
.path-note b{color:var(--cyan);}
/* code editor product panel (replica) */
.code{padding:0;overflow:hidden;}
.code-top{display:flex;justify-content:space-between;align-items:center;padding:18px 24px;}
.code-top .ct1{font:700 24px 'Inter',sans-serif;color:#fff;display:flex;gap:12px;align-items:center;}
.code-top .ct1 .gl{width:30px;height:30px;border-radius:8px;background:rgba(0,245,212,0.12);color:var(--cyan);display:flex;align-items:center;justify-content:center;font-size:16px;}
.badge-cd{font:700 13px 'Inter',sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:var(--cyan);background:rgba(0,245,212,0.10);border:1px solid rgba(0,245,212,0.3);border-radius:100px;padding:7px 15px;}
.badge-cd .bdot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--cyan);margin-right:7px;}
.code-tabs{display:flex;gap:6px;background:#141414;padding:12px 20px 0;}
.code-tab{font:500 18px 'Inter',sans-serif;padding:10px 18px;border-radius:9px 9px 0 0;color:#8a8a8a;}
.code-tab.on{background:#050505;color:#f0f0f0;}
.code-body{background:#050505;padding:28px 28px 34px;font:500 23px/1.85 'SF Mono','Menlo',monospace;text-align:left;color:#e6e6e6;}
.code-body .ln{color:#4a4a4a;display:inline-block;width:42px;}
.code-body .tg{color:var(--cyan);}
.code-body .tx{color:#c8f500;}
.code-body .cur{display:inline-block;width:11px;height:22px;background:var(--cyan);vertical-align:middle;}
/* content engine panel (replica) */
.ce{padding:0;overflow:hidden;background:linear-gradient(135deg,#1c1016,#241019);border:1px solid rgba(255,45,122,0.2);}
.ce-top{display:flex;justify-content:space-between;align-items:center;padding:18px 24px;}
.ce-top .ct1{font:700 24px 'Inter',sans-serif;color:#fff;display:flex;gap:12px;align-items:center;}
.ce-top .ct1 .gl{width:30px;height:30px;border-radius:8px;background:rgba(255,45,122,0.15);color:#ff2d7a;display:flex;align-items:center;justify-content:center;font-size:15px;}
.badge-li{font:700 13px 'Inter',sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:#ff6ba0;background:rgba(255,45,122,0.12);border:1px solid rgba(255,45,122,0.35);border-radius:100px;padding:7px 15px;}
.ce-li{background:#fff;border-radius:13px;margin:0 22px 22px;padding:24px 26px;text-align:left;}
.ce-h{display:flex;gap:13px;align-items:flex-start;}
.ce-av{width:46px;height:46px;border-radius:50%;background:var(--ink);color:var(--cyan);display:flex;align-items:center;justify-content:center;font:900 16px 'Montserrat',sans-serif;flex-shrink:0;}
.ce-nm{font:700 21px 'Inter',sans-serif;color:#191919;}
.ce-sb{font:400 15px 'Inter',sans-serif;color:#666;margin-top:2px;}
.ce-in{margin-left:auto;width:26px;height:26px;border-radius:5px;background:#0a66c2;color:#fff;font:800 14px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;}
.ce-tx{font:400 20px/1.5 'Inter',sans-serif;color:#191919;margin-top:12px;}
.ce-img{position:relative;height:190px;border-radius:11px;background:linear-gradient(100deg,#ff2d7a,#b44bf0);margin-top:14px;padding:26px 22px;}
.ce-img .cb1{height:13px;border-radius:7px;background:rgba(255,255,255,0.95);width:72%;}
.ce-img .cb2{height:13px;border-radius:7px;background:rgba(255,255,255,0.55);width:46%;margin-top:10px;}
.ce-img .cnew{position:absolute;right:16px;bottom:14px;background:#c8f500;color:var(--ink);font:800 13px 'Inter',sans-serif;letter-spacing:0.5px;border-radius:6px;padding:6px 12px;}
.ce-img .cwm{position:absolute;left:22px;bottom:12px;font:900 13px 'Montserrat',sans-serif;color:rgba(255,255,255,0.85);letter-spacing:1px;}
.ce-st{display:flex;justify-content:space-between;font:400 15px 'Inter',sans-serif;color:#666;padding:13px 2px;border-bottom:1px solid #e8e8e8;}
.ce-ac{display:flex;justify-content:space-around;padding-top:12px;}
.ce-ac span{font:600 16px 'Inter',sans-serif;color:#555;}
"""

def header():
    return ('<div class="bar"><div class="wordmark">BERMO.</div>'
            '<div class="site">bermoco.com</div></div>')

def slide(bg, body, idx, total, cover=False):
    nxt = '<div class="next">&#8594;</div>' if idx < total else ''
    pager = f'<div class="pager">{idx} / {total}</div>'
    cov = ' cover' if cover else ''
    return (f'<div class="slide {bg}{cov}">{header()}'
            f'<div class="content">{body}</div>{nxt}{pager}</div>')

# ============ UI components, each used exactly once across all six posts ============

STORE = """<div class="ui store">
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#9881;</div><div class="pt">AI + Automation</div><div class="pd">Custom agents, integrations and workflows built around you</div></div>
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#9639;</div><div class="pt">Website, UI and UX</div><div class="pd">A site built to convert, with copy that sells</div></div>
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#9740;</div><div class="pt">AI Discovery</div><div class="pd">SEO, GEO and AEO. Get found and chosen in AI search</div></div>
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#9998;</div><div class="pt">Brand + Messaging</div><div class="pd">Positioning translated so buyers actually get it</div></div>
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#9654;</div><div class="pt">Content + Social</div><div class="pd">Founder led content in your voice, every week</div></div>
  <div class="prod"><span class="add">+ Add</span><div class="pico">&#10035;</div><div class="pt">Strategy + Hiring</div><div class="pd">Scale plans, warm GTM intros and vetted permanent hires</div></div>
</div>"""

AREAS = """<div class="ui areas">
  <div class="area"><div class="an">Website</div><div style="margin-top:14px;"><span class="utag am">Gap found</span></div></div>
  <div class="area"><div class="an">Messaging</div><div style="margin-top:14px;"><span class="utag am">Gap found</span></div></div>
  <div class="area"><div class="an">AI discovery</div><div style="margin-top:14px;"><span class="utag cy">Strength</span></div></div>
  <div class="area"><div class="an">CRM + follow up</div><div style="margin-top:14px;"><span class="utag gr">Scanning</span></div></div>
  <div class="area"><div class="an">Social</div><div style="margin-top:14px;"><span class="utag gr">Scanning</span></div></div>
  <div class="area"><div class="an">Hiring</div><div style="margin-top:14px;"><span class="utag cy">Strength</span></div></div>
</div>"""

SAVE = """<div class="ui card-w save">
  <div class="spark"><span class="badge">+50%</span>
    <svg width="150" height="70" viewBox="0 0 150 70"><path d="M4 62 C 40 60, 70 48, 95 34 S 135 10, 146 5" fill="none" stroke="#00e5c4" stroke-width="5" stroke-linecap="round"/><path d="M4 62 C 40 60, 70 48, 95 34 S 135 10, 146 5 L146 70 L4 70 Z" fill="rgba(0,229,196,0.18)"/></svg>
  </div>
  <div class="save-row"><span class="pill">Week 1</span><div><div class="save-main">$25K <span class="sv">saved</span></div><div class="save-sub">for a hospitality founder</div></div></div>
  <div class="save-row"><span class="pill">Next</span><div><div class="save-main">Reallocated</div><div class="save-sub">to the work that actually grows revenue</div></div></div>
  <div class="save-row"><span class="pill">Today</span><div><div class="save-main">Up <span class="sv">50%+</span></div><div class="save-sub">in under 2 months</div></div></div>
</div>"""

SCANSUM = """<div class="ui card-d scansum">
  <div class="ringwrap">
    <svg width="210" height="210" viewBox="0 0 210 210">
      <circle cx="105" cy="105" r="92" fill="none" stroke="#242424" stroke-width="16"/>
      <circle cx="105" cy="105" r="92" fill="none" stroke="#00f5d4" stroke-width="16" stroke-linecap="round" stroke-dasharray="335 578" transform="rotate(-90 105 105)"/>
    </svg>
    <div class="rv"><span class="rn">58</span><span class="rl">of 100</span></div>
  </div>
  <div class="sumrows">
    <div class="sumrow"><span class="sl">Fix first</span><span class="sn">Messaging</span><span class="utag am">Gap</span></div>
    <div class="sumrow"><span class="sl">Then</span><span class="sn">Website</span><span class="utag am">Gap</span></div>
    <div class="sumrow"><span class="sl">Keep</span><span class="sn">AI discovery</span><span class="utag cy">Strength</span></div>
  </div>
</div>"""

BRIEF = """<div class="ui card-d brief">
  <div class="uihead"><span class="t">Shadow &middot; Monday brief</span><span class="utag cy">Live</span></div>
  <div class="brief-msg"><p>Good morning. Three things need you today, everything else is handled.</p></div>
  <div class="brief-item"><span class="bx on">&#10003;</span><p>Reply to the Hilton intro, warm from Thursday</p></div>
  <div class="brief-item"><span class="bx"></span><p>Approve the new homepage copy before it ships</p></div>
  <div class="brief-item"><span class="bx"></span><p>Two vetted candidates ready for your review</p></div>
  <div class="brief-input">Ask Shadow anything<span class="send">&#8594;</span></div>
</div>"""

FUNNEL = """<div class="ui card-w funnel">
  <div class="uihead"><span class="t">Your funnel this month</span><span class="utag am">Drop off found</span></div>
  <div class="frow"><span class="fl">Website visits</span><div class="fbar"><i style="width:100%;"></i></div><span class="fv">1,240</span></div>
  <div class="frow"><span class="fl">Conversations</span><div class="fbar"><i style="width:56%;"></i></div><span class="fv">62</span></div>
  <div class="frow"><span class="fl">Proposals</span><div class="fbar"><i style="width:30%;background:#ffb020;"></i></div><span class="fv">18</span></div>
  <div class="frow"><span class="fl">Closed</span><div class="fbar"><i style="width:12%;"></i></div><span class="fv">6</span></div>
</div>"""

PLAN = """<div class="ui card-d plan">
  <div class="uihead"><span class="t">Your growth blueprint</span><span class="utag cy">In order</span></div>
  <div class="step"><span class="num">1</span><span class="st">Messaging</span><span class="ss">fix what buyers hear first</span><span class="chk">&#10003;</span></div>
  <div class="step"><span class="num">2</span><span class="st">Website</span><span class="ss">turn visits into conversations</span><span class="chk">&#10003;</span></div>
  <div class="step"><span class="num off">3</span><span class="st">AI + CRM</span><span class="ss">follow up without the busywork</span></div>
  <div class="step"><span class="num off">4</span><span class="st">Content</span><span class="ss">stay visible in your voice</span></div>
  <div class="step"><span class="num off">5</span><span class="st">Hiring</span><span class="ss">add people when the work is ready</span></div>
</div>"""

TILES = """<div class="ui tiles">
  <div class="tile"><div class="n">$130K</div><div class="d">saved for an AI startup founder in month one</div></div>
  <div class="tile"><div class="n">98<span>%</span></div><div class="d">permanent placement retention</div></div>
  <div class="tile"><div class="n">5<span>-day</span></div><div class="d">specialist deploy, not weeks</div></div>
</div>"""

SHOP = """<div class="ui card-d shop">
  <div class="uihead"><span class="t">The Growth Store</span><span class="utag cy">Open</span></div>
  <div class="shoprow"><div class="sico">&#9639;</div><div class="sm"><div class="st1">Website, UI and UX</div><div class="st2">Built to convert, with copy that sells</div></div><span class="sadd">Add</span></div>
  <div class="shoprow"><div class="sico">&#9881;</div><div class="sm"><div class="st1">AI + Automation</div><div class="st2">Agents and workflows built around you</div></div><span class="sadd">Add</span></div>
  <div class="shoprow"><div class="sico">&#9998;</div><div class="sm"><div class="st1">Brand + Messaging</div><div class="st2">Positioning buyers actually get</div></div><span class="sadd">Add</span></div>
  <div class="shoprow"><div class="sico">&#10035;</div><div class="sm"><div class="st1">Strategy + Hiring</div><div class="st2">Scale plans and vetted permanent hires</div></div><span class="sadd">Add</span></div>
</div>"""

AISEARCH = """<div class="ui card-d aisearch">
  <div class="uihead"><span class="t">AI search</span><span class="utag gr">Buyer view</span></div>
  <div class="aiq">Who helps founder led companies find what is stalling their growth?</div>
  <div class="aia"><p><b>BERMO.</b> is a talent and growth marketplace for founder led companies. It starts with a free Gap Scan that reads your business the way a buyer does, then handles the fix, from brand and website to AI, CRM and hiring.</p>
  <span class="aisrc"><span class="sd"></span>bermoco.com</span></div>
</div>"""

LINKEDIN = """<div class="ui card-w li">
  <div class="li-head"><div class="li-av">B.</div>
    <div><div class="li-name">BERMO.</div><div class="li-sub">Talent and growth marketplace &middot; 2h</div></div>
  </div>
  <div class="li-body"><p>Your voice is the only unfair advantage left in an AI generated feed. We build content systems that keep it yours, every single week.</p></div>
  <div class="li-stats"><span>&#128077; 126</span><span>14 comments &middot; 9 reposts</span></div>
  <div class="li-actions"><span>&#128077; Like</span><span>&#128172; Comment</span><span>&#128257; Repost</span><span>&#10148; Send</span></div>
</div>"""

CRM = """<div class="ui card-d crm">
  <div class="uihead"><span class="t">Pipeline</span><span class="utag cy">Synced</span></div>
  <div class="crm-cols">
    <div class="crm-col"><div class="ch"><span>Leads</span><span>2</span></div>
      <div class="crm-card"><div class="cc1">Harbor Group</div><div class="cc2">Intro call Friday</div><div class="ccbar"><span class="ccav">LB</span></div></div>
      <div class="crm-card"><div class="cc1">Northline</div><div class="cc2">Warm referral</div><div class="ccbar"><span class="ccav">LB</span></div></div>
    </div>
    <div class="crm-col"><div class="ch"><span>In motion</span><span>1</span></div>
      <div class="crm-card"><div class="cc1">Fieldhouse</div><div class="cc2">Proposal sent, follow up queued</div><div class="ccbar"><span class="ccav">S</span></div></div>
    </div>
    <div class="crm-col"><div class="ch"><span>Won</span><span>1</span></div>
      <div class="crm-card won"><div class="cc1">Lakeview Co</div><div class="cc2">Kickoff Monday</div><div class="ccbar"><span class="ccav">&#10003;</span></div></div>
    </div>
  </div>
</div>"""

HIRE = """<div class="ui card-w hire">
  <div class="uihead"><span class="t">Open role &middot; AI Automation Engineer</span><span class="utag cy">2 vetted</span></div>
  <div class="cand"><div class="cav">MK</div><div class="cm"><div class="cn">M. Keller</div><div class="cr">CRM builds, agent workflows, 6 yrs</div></div><span class="match">94%</span><span class="utag cy">Interview set</span></div>
  <div class="cand"><div class="cav">DR</div><div class="cm"><div class="cn">D. Reyes</div><div class="cr">Data and AI automation, 8 yrs</div></div><span class="match">91%</span><span class="utag gr">Shortlisted</span></div>
</div>"""

STEPPER = """<div class="ui stepper">
  <div class="sstep"><div class="sn">1</div><div class="st1">Scan</div><div class="st2">The free Gap Scan reads your business like a buyer</div></div>
  <span class="sarr">&#8594;</span>
  <div class="sstep"><div class="sn">2</div><div class="st1">Blueprint</div><div class="st2">A clear plan, in the order that pays back fastest</div></div>
  <span class="sarr">&#8594;</span>
  <div class="sstep"><div class="sn">3</div><div class="st1">Build</div><div class="st2">We do the work with you, one right move at a time</div></div>
</div>"""

SCAN = """<div class="ui card-d scan">
  <div class="scan-top">
    <div class="scan-url">yourstartup.com<span class="caret"></span></div>
    <div class="scan-btn">Scan</div>
  </div>
  <div class="scan-row"><span class="dot g"></span><span class="scan-name">AI discovery</span><span class="scan-num">80</span><span class="utag cy">Strength</span></div>
  <div class="scan-row"><span class="dot y"></span><span class="scan-name">Messaging</span><span class="scan-num">40</span><span class="utag am">Gap</span></div>
  <div class="scan-row"><span class="dot y"></span><span class="scan-name">Website</span><span class="scan-num">30</span><span class="utag am">Gap</span></div>
  <div class="scan-row"><span class="dot gr"></span><span class="scan-name">Social</span><span class="utag gr">Scanning</span></div>
  <div class="scan-note"><div class="ico">S</div><p><b>Gap found.</b> Your message is not reaching the right buyer.</p></div>
</div>"""

BOARD = """<div class="ui card-d board">
  <div class="uihead"><span class="t">Blueprint &middot; next 6 weeks</span><span class="utag cy">Yours to keep</span></div>
  <div class="brow h"><span></span><span>Fix</span><span>Owner</span><span>Week</span></div>
  <div class="brow"><span class="bn">1</span><span class="bt">Messaging rewrite</span><span class="bw">BERMO. + you</span><span class="bw">Week 1</span></div>
  <div class="brow"><span class="bn">2</span><span class="bt">Homepage rebuild</span><span class="bw">BERMO.</span><span class="bw">Week 2</span></div>
  <div class="brow"><span class="bn off">3</span><span class="bt">CRM follow up flows</span><span class="bw">BERMO.</span><span class="bw">Week 3</span></div>
  <div class="brow"><span class="bn off">4</span><span class="bt">Weekly founder content</span><span class="bw">You, guided</span><span class="bw">Week 4</span></div>
</div>"""

CHART = """<div class="ui card-w chart">
  <div class="uihead"><span class="t">Revenue after the fix</span><span class="utag cy">Up 50%+ in under 2 months</span></div>
  <svg width="100%" height="220" viewBox="0 0 840 220" preserveAspectRatio="none">
    <line x1="0" y1="55" x2="840" y2="55" stroke="#ececea" stroke-width="2"/>
    <line x1="0" y1="110" x2="840" y2="110" stroke="#ececea" stroke-width="2"/>
    <line x1="0" y1="165" x2="840" y2="165" stroke="#ececea" stroke-width="2"/>
    <path d="M10 185 C 150 180, 260 168, 380 140 S 620 60, 830 22" fill="none" stroke="#00e5c4" stroke-width="7" stroke-linecap="round"/>
    <path d="M10 185 C 150 180, 260 168, 380 140 S 620 60, 830 22 L830 220 L10 220 Z" fill="rgba(0,229,196,0.14)"/>
    <circle cx="380" cy="140" r="9" fill="#0a0a0a"/>
  </svg>
  <div class="cx"><span>Scan</span><span>Fix shipped</span><span>Week 4</span><span>Week 8</span></div>
</div>"""

TEAM = """<div class="ui card-w team">
  <div class="uihead"><span class="t">Your growth team</span><span class="utag cy">All active</span></div>
  <div class="trow"><div class="tav" style="background:#0a0a0a;">BS</div><div class="tm"><div class="tn">Brand strategist</div><div class="tr">Messaging and positioning</div></div><span class="utag cy">On it</span></div>
  <div class="trow"><div class="tav" style="background:#2c2c2c;">WD</div><div class="tm"><div class="tn">Web designer</div><div class="tr">Site, UI and UX</div></div><span class="utag cy">On it</span></div>
  <div class="trow"><div class="tav" style="background:#0a0a0a;">AE</div><div class="tm"><div class="tn">AI engineer</div><div class="tr">Agents, CRM and workflows</div></div><span class="utag cy">On it</span></div>
  <div class="trow"><div class="tav" style="background:#2c2c2c;">RC</div><div class="tm"><div class="tn">Recruiter</div><div class="tr">Vetted permanent hires</div></div><span class="utag gr">On call</span></div>
</div>"""

CMP = """<div class="ui" style="display:flex;gap:22px;">
  <div class="card-w" style="flex:1;padding:34px 28px;text-align:left;">
    <div style="font:700 17px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;color:rgba(10,10,10,0.5);">The usual way</div>
    <div style="font:900 38px 'Inter Tight',sans-serif;letter-spacing:-1px;">Ten tools, five vendors</div>
    <ul style="list-style:none;margin-top:18px;">
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(10,10,10,0.65);padding:7px 0;">&#8594;&nbsp; Everyone sells their own lane</li>
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(10,10,10,0.65);padding:7px 0;">&#8594;&nbsp; No one owns the order</li>
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(10,10,10,0.65);padding:7px 0;">&#8594;&nbsp; Budget chases the loudest symptom</li>
    </ul>
  </div>
  <div class="card-d" style="flex:1;padding:34px 28px;text-align:left;">
    <div style="font:700 17px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;color:#00f5d4;">BERMO.</div>
    <div style="font:900 38px 'Inter Tight',sans-serif;letter-spacing:-1px;color:#fff;">One team, one plan</div>
    <ul style="list-style:none;margin-top:18px;">
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(255,255,255,0.8);padding:7px 0;"><span style="color:#00f5d4;">&#8594;</span>&nbsp; The gap decides the order</li>
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(255,255,255,0.8);padding:7px 0;"><span style="color:#00f5d4;">&#8594;</span>&nbsp; 5 day specialist deploy</li>
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(255,255,255,0.8);padding:7px 0;"><span style="color:#00f5d4;">&#8594;</span>&nbsp; Scales up or down with you</li>
    </ul>
  </div>
</div>"""

PLACE = """<div class="ui card-w place">
  <div class="uihead"><span class="t">Placement timeline</span><span class="utag cy">98% stay</span></div>
  <div class="prow"><div class="prail"><span class="pdot"></span><span class="pline"></span></div><div class="pbody"><div class="pd1">Day 1 &middot; Role brief</div><div class="pd2">We map the work the business is ready for</div></div></div>
  <div class="prow"><div class="prail"><span class="pdot"></span><span class="pline"></span></div><div class="pbody"><div class="pd1">Day 3 &middot; Vetted shortlist</div><div class="pd2">Candidates who match the plan, not just the title</div></div></div>
  <div class="prow"><div class="prail"><span class="pdot"></span></div><div class="pbody" style="padding-bottom:0;"><div class="pd1">Day 5 &middot; Specialist deployed</div><div class="pd2">Ready to run with the blueprint in hand</div></div></div>
</div>"""

ROOM = """<div class="ui card-w room">
  <div class="uihead"><span class="t">What buyers checked this week</span><span class="utag gr">Silent signals</span></div>
  <div class="sig"><div class="si">&#9639;</div><span class="sn">Your website</span><span class="utag cy">Read twice</span></div>
  <div class="sig"><div class="si">&#9998;</div><span class="sn">Your messaging</span><span class="utag am">Unclear</span></div>
  <div class="sig"><div class="si">&#9654;</div><span class="sn">Your social</span><span class="utag cy">Watched</span></div>
  <div class="sig"><div class="si">&#9993;</div><span class="sn">Your follow up</span><span class="utag am">Went quiet</span></div>
</div>"""

MAIL = """<div class="ui card-w mail">
  <div class="mail-top"><div class="ms">Re: Great meeting you both</div></div>
  <div class="mail-msg"><div class="mail-av" style="background:#5b5b56;">JT</div>
    <div class="mail-b"><div class="mh"><span>J. Turner &middot; Buyer</span><span>Tue</span></div>
    <p>Loved the walkthrough. Can you send pricing and next steps?</p></div></div>
  <div class="mail-msg"><div class="mail-av" style="background:#0a0a0a;">You</div>
    <div class="mail-b"><div class="mh"><span>You</span><span>Tue</span></div>
    <p>Absolutely, sending this afternoon.</p></div></div>
  <div class="mail-alert">&#9888;&nbsp; No follow up sent &middot; 6 days and counting</div>
</div>"""

BROWSER = """<div class="ui card-w brw">
  <div class="brw-bar"><div class="bdots"><i></i><i></i><i></i></div><div class="burl">yourstartup.com</div></div>
  <div class="brw-page">
    <div class="bh">We help you grow.</div>
    <div class="bp">Solutions for modern businesses of every size, everywhere.</div>
    <div class="brw-note"><span class="ok">&#10003;</span><span>Loads fast, looks clean</span></div>
    <div class="brw-note"><span class="warn">&#9888;</span><span>A buyer cannot tell who it is for</span></div>
    <div class="brw-note"><span class="warn">&#9888;</span><span>No clear next step to take</span></div>
  </div>
</div>"""

REPORT = """<div class="ui card-d report">
  <div class="uihead"><span class="t">Your Gap Scan report</span><span class="utag cy">Free</span></div>
  <div class="rrow"><div class="ri">&#9679;</div><p>A score for every part of your funnel</p></div>
  <div class="rrow"><div class="ri">&#9888;</div><p>The gap that is stalling revenue right now</p></div>
  <div class="rrow"><div class="ri">1</div><p>The first fix, and why it pays back fastest</p></div>
</div>"""

STACK = """<div class="ui stack">
  <div class="stk"><div class="ski" style="background:var(--cyan);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/></svg></div>
    <h4>Get found</h4><div class="sd">Be discovered and chosen by the buyers already looking for you.</div>
    <div class="sl">Website + SEO/GEO &middot; Content Engine &middot; Strategy and Brand</div>
    <div class="see">See what is inside &#8594;</div></div>
  <div class="stk"><div class="ski" style="background:#ff2d7a;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,17 9,11 13,15 21,7"/><polyline points="15,7 21,7 21,13"/></svg></div>
    <h4>Convert and sell</h4><div class="sd">Turn the attention you earn into booked, closed revenue.</div>
    <div class="sl">Sales Pipeline &middot; AI and Automation &middot; Systems and CRM</div>
    <div class="see">See what is inside &#8594;</div></div>
  <div class="stk"><div class="ski" style="background:#c8f500;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2.4" stroke-linecap="round"><circle cx="9" cy="8" r="3.4"/><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 15.2c2.6 0 4.5 1.7 4.5 4.3"/></svg></div>
    <h4>Hire and build</h4><div class="sd">Place the permanent team to run it, vetted and matched.</div>
    <div class="sl">Recruiting &middot; Permanent placement</div>
    <div class="see">See what is inside &#8594;</div></div>
</div>"""

PATH = """<div class="ui card-d path">
  <div class="path-q"><div class="path-qi"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f5d4" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/></svg>Where should we start?</div></div>
  <div class="path-grid">
    <div class="pcard"><div class="pl">Not sure what I need</div><div class="pi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/></svg></div><div class="pn">Gap Scan</div></div>
    <div class="pcard"><div class="pl">I know what I need</div><div class="pi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l1.5-4h13L20 8"/><path d="M4 8h16v3a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 11z"/><path d="M6 13.5V20h12v-6.5"/></svg></div><div class="pn">Growth Store</div></div>
    <div class="pcard"><div class="pl">I need a hire</div><div class="pi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="8" r="3.8"/><path d="M5 20.5c0-3.6 3.1-6 7-6s7 2.4 7 6"/></svg></div><div class="pn">Recruiting</div></div>
  </div>
  <div class="path-note">Most people start with the <b>Gap Scan</b></div>
</div>"""

CODEPANEL = """<div class="ui card-d code">
  <div class="code-top"><span class="ct1"><span class="gl">&#9737;</span>Website and SEO/GEO</span><span class="badge-cd"><span class="bdot"></span>Coding</span></div>
  <div class="code-tabs"><span class="code-tab on">index.html</span><span class="code-tab">styles.css</span></div>
  <div class="code-body">
    <div><span class="ln">1</span><span class="tg">&lt;section</span> class=<span class="tx">"hero"</span><span class="tg">&gt;</span></div>
    <div><span class="ln">2</span>&nbsp;&nbsp;<span class="tg">&lt;h1&gt;</span>Grow with BERMO.<span class="tg">&lt;/h1&gt;</span></div>
    <div><span class="ln">3</span>&nbsp;&nbsp;<span class="tg">&lt;p&gt;</span>Your growth stack.<span class="tg">&lt;/p&gt;</span></div>
    <div><span class="ln">4</span>&nbsp;&nbsp;<span class="tg">&lt;button&gt;</span>Get my scan<span class="tg">&lt;/button&gt;</span></div>
    <div><span class="ln">5</span><span class="tg">&lt;/section&gt;</span></div>
    <div><span class="ln">&nbsp;</span><span class="cur"></span></div>
  </div>
</div>"""

CE = """<div class="ui ce">
  <div class="ce-top"><span class="ct1"><span class="gl">&#128172;</span>Content Engine</span><span class="badge-li">&#9673; LinkedIn</span></div>
  <div class="ce-li">
    <div class="ce-h"><div class="ce-av">B.</div>
      <div><div class="ce-nm">Lexi Bermingham</div><div class="ce-sb">Founder, BERMO.CO &middot; 1st</div></div>
      <div class="ce-in">in</div></div>
    <div class="ce-tx">Fresh on brand post templates, ready to publish. Here is this week&rsquo;s set.</div>
    <div class="ce-img"><div class="cb1"></div><div class="cb2"></div><span class="cwm">BERMO.</span><span class="cnew">NEW</span></div>
    <div class="ce-st"><span>&#128077; 842</span><span>34 comments</span></div>
    <div class="ce-ac"><span>&#128077; Like</span><span>&#128172; Comment</span><span>&#128257; Repost</span></div>
  </div>
</div>"""

HERO = """

<div class="ui hero">
  <div class="hero-main">
    <div class="uihead" style="margin-bottom:18px;"><span class="t" style="color:#fff;">BERMO. HQ</span><span class="utag cy">Live</span></div>
    <div class="hero-kpis">
      <div class="hero-kpi"><div class="kl">Active projects</div><div class="kv">4</div></div>
      <div class="hero-kpi"><div class="kl">Open deals</div><div class="kv">10</div></div>
      <div class="hero-kpi"><div class="kl">This month</div><div class="kv"><em>+$18K</em></div></div>
    </div>
    <div class="hero-rows">
      <div class="hr1"><span class="hd" style="background:#00f5d4;"></span><p>Homepage rebuild shipped to production</p><span class="ht">Today</span></div>
      <div class="hr1"><span class="hd" style="background:#ffb020;"></span><p>Two vetted candidates ready for review</p><span class="ht">9:00</span></div>
      <div class="hr1"><span class="hd" style="background:#ffb020;"></span><p>Follow up queued for the Hilton intro</p><span class="ht">11:30</span></div>
      <div class="hr1"><span class="hd" style="background:#00f5d4;"></span><p>Gap Scan report sent to a new founder</p><span class="ht">Done</span></div>
    </div>
  </div>
  <div class="hero-float hero-chart">
    <div class="hc1">Revenue</div><div class="hc2">Up 50%+</div>
    <svg width="100%" height="52" viewBox="0 0 210 52"><path d="M4 46 C 55 44, 95 34, 130 24 S 190 6, 206 4" fill="none" stroke="#00e5c4" stroke-width="5" stroke-linecap="round"/><path d="M4 46 C 55 44, 95 34, 130 24 S 190 6, 206 4 L206 52 L4 52 Z" fill="rgba(0,229,196,0.16)"/></svg>
  </div>
  <div class="hero-float hero-msg"><div class="ico">S</div><p><b>Shadow.</b> Your proposal is drafted and your follow ups are queued.</p></div>
</div>"""

SHOPBOARD = """<div class="ui card-w shopboard">
  <div class="uihead"><span class="t">The Bermo Shop</span><span class="utag cy">All in one place</span></div>
  <div class="svc"><span class="sno">01</span><span class="snm">Brand Growth, Strategy + Execution</span><span class="sds">We decide what matters, then we actually do it</span></div>
  <div class="svc"><span class="sno">02</span><span class="snm">AI Translation</span><span class="sds">Use AI without losing your voice</span></div>
  <div class="svc"><span class="sno">03</span><span class="snm">Brand Positioning + Social Content</span><span class="sds">Positioning that is instantly understood</span></div>
  <div class="svc"><span class="sno">04</span><span class="snm">Hiring + Affiliate Marketing</span><span class="sds">The right people, at the right time</span></div>
  <div class="svc"><span class="sno">05</span><span class="snm">Immersive + Experience Marketing</span><span class="sds">Pop ups and events that turn attention into demand</span></div>
  <div class="packs">
    <div class="pack first"><div class="pk1">The Try On</div><div class="pk2">Free audit and intro call</div></div>
    <div class="pack"><div class="pk1">The Edit</div><div class="pk2">Strategy session and custom plan</div></div>
    <div class="pack"><div class="pk1">The Launch</div><div class="pk2">A 12 week brand build</div></div>
    <div class="pack"><div class="pk1">The Drop</div><div class="pk2">Fractional executive support</div></div>
  </div>
</div>"""

WORKBOARD = """<div class="ui card-d wb">
  <div class="uihead"><span class="t">This week, your startup &times; BERMO.</span><span class="utag cy">On track</span></div>
  <div class="wb-cols"><span>Work</span><span>Owner</span><span>Status</span><span>Timeline</span></div>
  <div class="wb-row c1"><span class="wt">Messaging rewrite</span><span class="wav">LB</span><span class="wst done">Shipped</span><span class="wtl"><i style="width:100%;"></i></span></div>
  <div class="wb-row c2"><span class="wt">Homepage rebuild</span><span class="wav">WD</span><span class="wst doing">In motion</span><span class="wtl"><i style="width:64%;"></i></span></div>
  <div class="wb-row c2"><span class="wt">CRM follow up flows</span><span class="wav">AE</span><span class="wst doing">In motion</span><span class="wtl"><i style="width:38%;"></i></span></div>
  <div class="wb-row"><span class="wt">Vetted hiring shortlist</span><span class="wav">RC</span><span class="wst q">Queued</span><span class="wtl"><i style="width:12%;"></i></span></div>
</div>"""

RECEIPTS = """<div class="ui card-d rcpt">
  <div class="uihead"><span class="t">Real results, real numbers</span><span class="utag cy">Verified</span></div>
  <div class="rc-row"><span class="rcv">$25K</span><p>saved for a hospitality founder in week one</p><span class="rck">&#10003;</span></div>
  <div class="rc-row"><span class="rcv">$130K</span><p>saved for an AI startup founder in month one</p><span class="rck">&#10003;</span></div>
  <div class="rc-row"><span class="rcv">98%</span><p>of our permanent placements stay</p><span class="rck">&#10003;</span></div>
  <div class="rc-row"><span class="rcv">5 days</span><p>to deploy a specialist, not weeks</p><span class="rck">&#10003;</span></div>
</div>"""

HIRECHECK = """<div class="ui card-w hire">
  <div class="uihead"><span class="t">Hire readiness check</span><span class="utag cy">Ready</span></div>
  <div class="cand"><div class="cav" style="background:#00c9ab;">&#10003;</div><div class="cm"><div class="cn">The gap is mapped</div><div class="cr">You know what is stalling revenue</div></div></div>
  <div class="cand"><div class="cav" style="background:#00c9ab;">&#10003;</div><div class="cm"><div class="cn">The work is defined</div><div class="cr">The role has a blueprint waiting for it</div></div></div>
  <div class="cand"><div class="cav" style="background:#0a0a0a;">3</div><div class="cm"><div class="cn">Make the hire</div><div class="cr">Vetted, matched to the plan, built to stay</div></div></div>
</div>"""

CTA_SCAN = '<div><span class="cta">Get my free Gap Scan &#8594;</span></div>'

def page(title, note, slides):
    body = "\n".join(slides)
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>{title}</title>
<style>{CSS}</style></head><body>
<div class="pagehead"><strong>{title}</strong><br>{note}</div>
{body}
</body></html>"""

posts = {}

# ---------------- POST 1 : Who is BERMO.? (mint, 6 slides) ----------------
posts["post-1-who-is-bermo.html"] = page(
 "BERMO. Carousel · Post 1 · Who is BERMO.?",
 "6 slides · 1080&times;1350 · mint",
 [
  slide("mint", f"""
     <div class="kicker">The Growth Store for Founder Led Companies</div>
     <h1>Who is BERMO.?</h1>
     {HERO}""", 1, 6, cover=True),
  slide("mint", """
     <h2>We help founder led companies grow revenue, all under one roof.</h2>
     <p class="body">BERMO. is your one stop shop for all of your growth needs, whether that is the solution you already know you need, or us finding what is stalling growth before you spend on something that was never the gap.</p>
     <p class="body">One partner, with every piece talking to each other.</p>""", 2, 6),
  slide("mint", f"""
     <h2>Here is everything we offer, and there are three ways in.</h2>
     {STACK}""", 3, 6),
  slide("mint", f"""
     <h2>Growth can stall anywhere in the business, and it is rarely where the noise is.</h2>
     <p class="body">It could be your website, brand, messaging, social, AI workflows, CRM, hiring, or even your target market, so we organize what matters most first.</p>
     {AREAS}""", 4, 6),
  slide("mint", f"""
     <h2>We find the gap, we map the fix, and you see the ROI.</h2>
     {SAVE}""", 5, 6),
  slide("mint", f"""
     <h2>The Gap Scan comes first, and the right next move follows.</h2>
     {PATH}
     {CTA_SCAN}""", 6, 6),
 ])

# ---------------- POST 2 : Why do founders use BERMO.? (offwhite) ----------------
posts["post-2-why-founders-use-bermo.html"] = page(
 "BERMO. Carousel · Post 2 · Why do founders use BERMO.?",
 "5 slides · 1080&times;1350 · offwhite",
 [
  slide("light", f"""
     <div class="kicker">For Founder Led Companies</div>
     <h1>Why do founders use <span class="hl">BERMO.</span>?</h1>
     {BRIEF}""", 1, 5, cover=True),
  slide("light", """
     <h2>When you are too close to the brand, it can be hard to see what is <span class="hl">right in front of you.</span></h2>
     <p class="body">It can be hard to see what is truly stalling growth and what the next step should be, because you are closing deals, running the team, and putting out fires all at once.</p>
     <p class="hand">Every founder we work with knows this feeling.</p>""", 2, 5),
  slide("light", f"""
     <h2>The bottleneck hides in <span class="hl">plain sight.</span></h2>
     <p class="body">It might be messaging, your website, the systems behind the scenes, your target market, or hires that need training, and it is rarely the loudest one.</p>
     {FUNNEL}""", 3, 5),
  slide("light", f"""
     <h2>BERMO. finds the gap and puts the work <span class="hl">in the right order.</span></h2>
     <p class="body">So your money goes where it will actually grow revenue, not where the noise is loudest.</p>
     {PLAN}""", 4, 5),
  slide("light", f"""
     <h2>Stop paying for the loudest symptom, and start investing in what <span class="hl">drives growth.</span></h2>
     {TILES}
     {CTA_SCAN}
     <p class="body">It is free, with no pitch, just the gaps, at bermoco.com.</p>""", 5, 5),
 ])

# ---------------- POST 3 : What does BERMO. actually help with? (dark) ----------------
posts["post-3-what-bermo-helps-with.html"] = page(
 "BERMO. Carousel · Post 3 · What does BERMO. actually help with?",
 "5 slides · 1080&times;1350 · black",
 [
  slide("dark", f"""
     <div class="kicker">The Growth Store</div>
     <h1>What does BERMO. <span class="hl">actually</span> help with?</h1>
     {SHOP}""", 1, 5, cover=True),
  slide("dark", f"""
     <h2>Get <span class="hl">found,</span> and get understood.</h2>
     <p class="body">We handle website, SEO, GEO and AI discovery, so people can find you and understand you. Buyers now ask AI before they ever hit your site, so we make sure you show up in both places.</p>
     {CODEPANEL}""", 2, 5),
  slide("dark", f"""
     <h2>Stay clear when you are <span class="hl">not in the room.</span></h2>
     <p class="body">We build branding, messaging and content in your voice, so your business keeps saying the right thing while you are heads down running it.</p>
     {CE}""", 3, 5),
  slide("dark", f"""
     <h2>Run smoother <span class="hl">behind the scenes.</span></h2>
     <p class="body">We set up systems, CRM, AI workflows and training, so follow ups happen, data stays in one place, and nothing slips.</p>
     {CRM}""", 4, 5),
  slide("dark", f"""
     <h2>And when you need people, we bring <span class="hl">the right help.</span></h2>
     <p class="body">We bring hiring and execution support in the right place, at the right time, with people who are vetted and matched to the plan.</p>
     {HIRE}
     <div><span class="cta">Shop your growth stack &#8594;</span></div>""", 5, 5),
 ])

# ---------------- POST 4 : How does BERMO. do it? (offwhite) ----------------
posts["post-4-how-bermo-does-it.html"] = page(
 "BERMO. Carousel · Post 4 · How does BERMO. do it?",
 "5 slides · 1080&times;1350 · offwhite",
 [
  slide("light", f"""
     <div class="kicker">The BERMO. Method</div>
     <h1>How does BERMO. <span class="hl">do it?</span></h1>
     {STEPPER}""", 1, 5, cover=True),
  slide("light", f"""
     <h2>Step one is the free <span class="hl">Gap Scan.</span></h2>
     <p class="body">BERMO. reads your business the way a buyer does, then shows you exactly what is stalling growth, free, with no pitch, just the gaps.</p>
     {SCAN}""", 2, 5),
  slide("light", f"""
     <h2>Step two is a blueprint you can <span class="hl">actually use.</span></h2>
     <p class="body">The scan becomes a clear plan that shows what to fix, what to skip, and which order pays you back fastest.</p>
     {BOARD}""", 3, 5),
  slide("light", """
     <h2>Step three is the right work, done in the <span class="hl">right order.</span></h2>
     <p class="body">Whether it is brand, website, AI, CRM, content, hiring or training, we do the work with you, one right move at a time.</p>
     <p class="hand">No guessing, no busywork, just the next right move.</p>""", 4, 5),
  slide("light", f"""
     <h2>Stop guessing, spend smarter, and <span class="hl">move faster.</span></h2>
     {CHART}
     {CTA_SCAN}
     <p class="body">It all starts at bermoco.com.</p>""", 5, 5),
 ])

# ---------------- POST 5 : What makes BERMO. different? (mint) ----------------
posts["post-5-what-makes-bermo-different.html"] = page(
 "BERMO. Carousel · Post 5 · What makes BERMO. different?",
 "5 slides · 1080&times;1350 · mint",
 [
  slide("mint", f"""
     <div class="kicker">Human Led. AI Leveraged.</div>
     <h1>What makes BERMO. different?</h1>
     {WORKBOARD}""", 1, 5, cover=True),
  slide("mint", """
     <h2>Most founder led businesses do not stall because of demand, they stall because the pieces are not aligned.</h2>
     <p class="body">BERMO. steps inside your business, clarifies what matters most, and then actually does the work with you.</p>
     <p class="body">We are human led and AI leveraged, and your voice stays yours.</p>""", 2, 5),
  slide("mint", f"""
     <h2>You get your entire growth team under one roof, working on the same plan.</h2>
     {TEAM}""", 3, 5),
  slide("mint", f"""
     <h2>You are not buying ten tools, you are getting one plan that puts money where it pays back first.</h2>
     {CMP}""", 4, 5),
  slide("mint", f"""
     <h2>The results speak in real numbers, and the free Gap Scan is where it starts.</h2>
     {RECEIPTS}
     {CTA_SCAN}""", 5, 5),
 ])

# ---------------- POST 6 : Not in the room (dark) ----------------
posts["post-6-not-in-the-room.html"] = page(
 "BERMO. Carousel · Post 6 · What is your business saying when you are not in the room?",
 "5 slides · 1080&times;1350 · black",
 [
  slide("dark", f"""
     <div class="kicker">Every Buyer Checks First</div>
     <h1>What is your business saying when you are <span class="hl">not in the room?</span></h1>
     {ROOM}""", 1, 5, cover=True),
  slide("dark", f"""
     <h2>Your business is talking <span class="hl">every day.</span></h2>
     <p class="body">Your website, brand, content, systems and follow up are all speaking for you, before every call, after every meeting, whether you are there or not.</p>
     {MAIL}""", 2, 5),
  slide("dark", """
     <h2>When those pieces do not line up, buyers <span class="hl">feel it fast.</span></h2>
     <p class="body">The website says one thing, the pitch says another, and the follow up goes quiet, so each piece looks fine on its own while together they cost you the deal.</p>
     <p class="hand">Buyers rarely tell you, they just move on.</p>""", 3, 5),
  slide("dark", f"""
     <h2>BERMO. shows you what buyers <span class="hl">actually see.</span></h2>
     <p class="body">What is coming across, what is getting missed, and what needs to change first.</p>
     {BROWSER}""", 4, 5),
  slide("dark", f"""
     <h2>Growth gets easier when your business says the <span class="hl">right thing.</span></h2>
     {REPORT}
     {CTA_SCAN}
     <p class="body">It is free, with no pitch, just the gaps, at bermoco.com.</p>""", 5, 5),
 ])

for name, html in posts.items():
    with open(os.path.join(OUT, name), "w") as f:
        f.write(html)
    print("wrote", name)

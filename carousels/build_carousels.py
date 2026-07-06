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
.content{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:36px;width:100%;}
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
.area .an{font:600 19px 'Inter',sans-serif;color:rgba(10,10,10,0.55);}
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
  <div class="area"><div class="an">Website</div><div class="asc">62</div><div class="abar"><i style="width:62%;background:#ffb020;"></i></div></div>
  <div class="area"><div class="an">Messaging</div><div class="asc">41</div><div class="abar"><i style="width:41%;background:#ffb020;"></i></div></div>
  <div class="area"><div class="an">AI discovery</div><div class="asc">78</div><div class="abar"><i style="width:78%;background:#00e5c4;"></i></div></div>
  <div class="area"><div class="an">CRM + follow up</div><div class="asc">55</div><div class="abar"><i style="width:55%;background:#ffb020;"></i></div></div>
  <div class="area"><div class="an">Social</div><div class="asc">47</div><div class="abar"><i style="width:47%;background:#ffb020;"></i></div></div>
  <div class="area"><div class="an">Hiring</div><div class="asc">70</div><div class="abar"><i style="width:70%;background:#00e5c4;"></i></div></div>
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
    <div style="font:700 17px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;color:rgba(10,10,10,0.5);">One early hire</div>
    <div style="font:900 38px 'Inter Tight',sans-serif;letter-spacing:-1px;">One skill set</div>
    <ul style="list-style:none;margin-top:18px;">
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(10,10,10,0.65);padding:7px 0;">&#8594;&nbsp; Salary plus benefits</li>
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(10,10,10,0.65);padding:7px 0;">&#8594;&nbsp; Weeks to ramp up</li>
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(10,10,10,0.65);padding:7px 0;">&#8594;&nbsp; Covers one gap only</li>
    </ul>
  </div>
  <div class="card-d" style="flex:1;padding:34px 28px;text-align:left;">
    <div style="font:700 17px 'Barlow Condensed',sans-serif;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;color:#00f5d4;">BERMO.</div>
    <div style="font:900 38px 'Inter Tight',sans-serif;letter-spacing:-1px;color:#fff;">Whole growth team</div>
    <ul style="list-style:none;margin-top:18px;">
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(255,255,255,0.8);padding:7px 0;"><span style="color:#00f5d4;">&#8594;</span>&nbsp; 5 day specialist deploy</li>
      <li style="font:500 20px/1.45 'Inter',sans-serif;color:rgba(255,255,255,0.8);padding:7px 0;"><span style="color:#00f5d4;">&#8594;</span>&nbsp; Every skill, one plan</li>
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

# ---------------- POST 1 : Who is BERMO.? (mint) ----------------
posts["post-1-who-is-bermo.html"] = page(
 "BERMO. Carousel · Post 1 · Who is BERMO.?",
 "5 slides · 1080&times;1350 · mint",
 [
  slide("mint", f"""
     <div class="kicker">The Growth Store for Founder Led Companies</div>
     <h1>Who is BERMO.?</h1>
     {STORE}""", 1, 5, cover=True),
  slide("mint", """
     <h2>We help founder led companies grow revenue.</h2>
     <p class="body">BERMO. is your one stop shop for all of your growth needs. Sometimes that is the solution you already know you need. Sometimes it is us finding what is stalling growth, before you spend time or money fixing something that was never the gap.</p>
     <p class="hand">One partner. Every piece talking to each other.</p>""", 2, 5),
  slide("mint", f"""
     <h2>Growth can stall anywhere.</h2>
     <p class="body">Website, brand, messaging, social, AI workflows, CRM, hiring, training, SEO, GEO, even your target market. BERMO. organizes what matters most first, so the business moves together.</p>
     {AREAS}""", 3, 5),
  slide("mint", f"""
     <h2>We find the gap. We map the fix. You see the ROI.</h2>
     <p class="body">Not ten random tools. Not five disconnected vendors. Just the work that actually moves the business, in the right order.</p>
     {SAVE}""", 4, 5),
  slide("mint", f"""
     <h2>Gap scan first. Then the right next move.</h2>
     <p class="body">Free, no pitch, just the gaps. See what is stalling your revenue this week.</p>
     {SCANSUM}
     {CTA_SCAN}""", 5, 5),
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
     <h2>When you are deep in the business, it is hard to see what is <span class="hl">slowing growth.</span></h2>
     <p class="body">You are closing deals, running the team, and putting out fires. Getting that close to the work makes the real bottleneck almost impossible to spot from the inside.</p>
     <p class="hand">Every founder we work with knows this feeling.</p>""", 2, 5),
  slide("light", f"""
     <h2>The bottleneck hides in <span class="hl">plain sight.</span></h2>
     <p class="body">It might be messaging, your website, the systems behind the scenes, your target market, or hires that need training. It is rarely the loudest one.</p>
     {FUNNEL}""", 3, 5),
  slide("light", f"""
     <h2>BERMO. finds the gap and puts the work <span class="hl">in the right order.</span></h2>
     <p class="body">So your money goes where it will actually grow revenue, not where the noise is loudest.</p>
     {PLAN}""", 4, 5),
  slide("light", f"""
     <h2>Stop paying for the loudest symptom. Start investing in what <span class="hl">drives growth.</span></h2>
     {TILES}
     {CTA_SCAN}
     <p class="body">Free, no pitch, just the gaps. bermoco.com</p>""", 5, 5),
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
     <h2>Get <span class="hl">found.</span> Get understood.</h2>
     <p class="body">Website, SEO, GEO and AI discovery, so people can find you and understand you. Buyers now ask AI before they ever hit your site. We make sure you show up in both places.</p>
     {AISEARCH}""", 2, 5),
  slide("dark", f"""
     <h2>Stay clear when you are <span class="hl">not in the room.</span></h2>
     <p class="body">Branding, messaging and content, built in your voice. Your business keeps saying the right thing while you are heads down running it.</p>
     {LINKEDIN}""", 3, 5),
  slide("dark", f"""
     <h2>Run smoother <span class="hl">behind the scenes.</span></h2>
     <p class="body">Systems, CRM, AI workflows and training, so follow ups happen, data stays in one place, and nothing slips.</p>
     {CRM}""", 4, 5),
  slide("dark", f"""
     <h2>And when you need people, <span class="hl">the right help.</span></h2>
     <p class="body">Hiring and execution support in the right place, at the right time.</p>
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
     <h2>Step 1. The <span class="hl">Gap Scan.</span></h2>
     <p class="body">BERMO. reads your business the way a buyer does, then shows you exactly what is stalling growth. Free, no pitch, just the gaps.</p>
     {SCAN}""", 2, 5),
  slide("light", f"""
     <h2>Step 2. A blueprint you can <span class="hl">actually use.</span></h2>
     <p class="body">The scan becomes a clear plan. What to fix, what to skip, and what order pays you back fastest.</p>
     {BOARD}""", 3, 5),
  slide("light", """
     <h2>Step 3. The right work, in the <span class="hl">right order.</span></h2>
     <p class="body">Brand, website, AI, CRM, content, hiring or training. We do the work with you, one right move at a time.</p>
     <p class="hand">No guessing. No busywork. Just the next right move.</p>""", 4, 5),
  slide("light", f"""
     <h2>Stop guessing. Spend smarter. <span class="hl">Move faster.</span></h2>
     {CHART}
     {CTA_SCAN}
     <p class="body">bermoco.com</p>""", 5, 5),
 ])

# ---------------- POST 5 : Why BERMO. instead of hiring too early? (mint) ----------------
posts["post-5-before-you-hire.html"] = page(
 "BERMO. Carousel · Post 5 · Why BERMO. instead of hiring too early?",
 "5 slides · 1080&times;1350 · mint",
 [
  slide("mint", f"""
     <div class="kicker">Before Your Next Hire</div>
     <h1>Why BERMO. instead of hiring too early?</h1>
     {TEAM}""", 1, 5, cover=True),
  slide("mint", """
     <h2>Most founders hire before they know what the business actually needs.</h2>
     <p class="body">A salary is a twelve month commitment to one skill set. Growth usually needs three or four different skills in the same quarter, and the mix changes as you grow.</p>
     <p class="hand">The gap moves. A single hire cannot chase it.</p>""", 2, 5),
  slide("mint", f"""
     <h2>BERMO. is your entire growth team, under one roof.</h2>
     <p class="body">Brand, website, AI, CRM, content, hiring and training, working as one team on the same plan.</p>
     {CMP}""", 3, 5),
  slide("mint", f"""
     <h2>Then your team takes it over, ready to run.</h2>
     <p class="body">When the time is right we help you make the hire, and it sticks. 98% of our permanent placements stay.</p>
     {PLACE}""", 4, 5),
  slide("mint", f"""
     <h2>Know the gap before you sign the offer letter.</h2>
     <p class="body">The free Gap Scan shows what the business needs first, so your next hire lands on work that is ready for them.</p>
     {HIRECHECK}
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
     <p class="body">The website says one thing. The pitch says another. The follow up goes quiet. Each piece is fine on its own, and together they cost you the deal.</p>
     <p class="hand">Buyers rarely tell you. They just move on.</p>""", 3, 5),
  slide("dark", f"""
     <h2>BERMO. shows you what buyers <span class="hl">actually see.</span></h2>
     <p class="body">What is coming across, what is getting missed, and what needs to change first.</p>
     {BROWSER}""", 4, 5),
  slide("dark", f"""
     <h2>Growth gets easier when your business says the <span class="hl">right thing.</span></h2>
     {REPORT}
     {CTA_SCAN}
     <p class="body">Free, no pitch, just the gaps. bermoco.com</p>""", 5, 5),
 ])

for name, html in posts.items():
    with open(os.path.join(OUT, name), "w") as f:
        f.write(html)
    print("wrote", name)

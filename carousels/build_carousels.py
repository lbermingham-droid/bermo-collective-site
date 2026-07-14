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
.slide.cover{padding-left:100px;padding-right:100px;}
.slide.light{background-color:var(--off);background-image:radial-gradient(rgba(10,10,10,0.13) 1.6px, transparent 1.6px);background-size:26px 26px;color:var(--ink);}
.slide.mint{background:linear-gradient(180deg,#f2fffc 0%,#c9fbf1 38%,#5deed3 78%,#0ee2c2 100%);color:var(--ink);}
.slide.mint::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(10,10,10,0.12) 1.6px, transparent 1.6px);background-size:26px 26px;pointer-events:none;}
.slide.dark{background-color:#0a0a0a;background-image:radial-gradient(rgba(245,245,240,0.16) 1.6px, transparent 1.6px);background-size:26px 26px;color:var(--off);}
.slide>*{position:relative;z-index:2;}
.orb{position:absolute;border-radius:50%;filter:blur(90px);z-index:1;pointer-events:none;}
.o1{width:560px;height:560px;top:-160px;right:-180px;}
.o2{width:620px;height:620px;bottom:-200px;left:-200px;}
.mint .o1{background:rgba(255,255,255,0.55);}
.mint .o2{background:rgba(0,170,140,0.30);}
.light .o1{background:rgba(0,245,212,0.22);}
.light .o2{background:rgba(255,45,122,0.10);}
.dark .o1{background:rgba(0,245,212,0.13);}
.dark .o2{background:rgba(255,45,122,0.10);}
/* header */
.bar{position:absolute;top:64px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center;z-index:3;}
.cover .bar{left:100px;right:100px;}
.wordmark{font:900 34px 'Montserrat',sans-serif;letter-spacing:1px;color:var(--ink);}
.dark .wordmark{color:var(--off);}
/* footer nav */
.next{position:absolute;bottom:56px;left:50%;transform:translateX(-50%);width:64px;height:64px;border-radius:50%;background:var(--ink);color:var(--cyan);display:flex;align-items:center;justify-content:center;font:700 28px 'Inter',sans-serif;z-index:3;}
.dark .next{background:var(--cyan);color:var(--ink);}
.pager{position:absolute;bottom:70px;right:80px;font:700 17px 'Barlow Condensed',sans-serif;letter-spacing:3px;color:var(--ink);z-index:3;}
.dark .pager{color:var(--off);}
/* content area: centered, fills the canvas */
.content{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:46px;width:100%;}
/* type */
.kicker{font:700 22px 'Barlow Condensed',sans-serif;letter-spacing:7px;text-transform:uppercase;color:var(--ink);}
.dark .kicker{color:var(--cyan);}
h1{font:900 92px/1.05 'Inter Tight',sans-serif;letter-spacing:-2.5px;text-wrap:balance;width:100%;}
h2{font:900 58px/1.12 'Inter Tight',sans-serif;letter-spacing:-1.5px;text-wrap:balance;width:100%;}
.dark h1,.dark h2{color:var(--off);}
/* emphasis: cyan highlight box on offwhite only, cyan text on dark, plain on mint */
.light .hl{background:var(--cyan);padding:0 14px;box-decoration-break:clone;-webkit-box-decoration-break:clone;}
.dark .hl{color:var(--cyan);}
.body{font:500 32px/1.5 'Inter',sans-serif;color:var(--ink);text-wrap:pretty;max-width:880px;}
.body b{font-weight:700;color:var(--ink);}
.dark .body{color:var(--off);}
.dark .body b{color:#fff;}
/* CTA button */
.cta{display:inline-flex;align-items:center;gap:14px;background:var(--ink);color:var(--cyan);font:800 30px 'Inter Tight',sans-serif;padding:26px 52px;border-radius:16px;box-shadow:0 14px 40px rgba(10,10,10,0.35);}
.dark .cta{background:var(--cyan);color:var(--ink);box-shadow:0 14px 40px rgba(0,229,196,0.25);}
/* ================= UI components (each used ONCE across the set) ================= */
.ui{width:100%;text-align:left;transform:perspective(1600px) rotateX(2.6deg);transform-origin:50% 100%;}
.card-d{background:#0d0d0d;border:1px solid rgba(255,255,255,0.09);border-radius:28px;box-shadow:0 10px 22px rgba(10,10,10,0.18), 0 70px 130px -30px rgba(10,10,10,0.55);}
.dark .card-d{background:#111;border-color:rgba(255,255,255,0.13);box-shadow:0 30px 70px rgba(0,0,0,0.6);}
.card-w{background:#fff;border:1px solid rgba(10,10,10,0.05);border-radius:28px;color:var(--ink);box-shadow:0 10px 22px rgba(10,10,10,0.08), 0 70px 130px -30px rgba(10,10,10,0.40);}
.dark .card-w{box-shadow:0 30px 70px rgba(0,0,0,0.55);}
.uihead{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;}
.uihead .t{font:800 24px 'Inter Tight',sans-serif;}
.card-d .uihead .t{color:#fff;}
.utag{font:700 13px 'Inter',sans-serif;letter-spacing:1px;text-transform:uppercase;border-radius:100px;padding:6px 14px;}
.utag.cy{background:rgba(0,245,212,0.15);color:#00c9ab;}
.card-d .utag.cy{color:var(--cyan);}
.utag.am{background:rgba(255,45,122,0.12);color:#e0246d;}
.card-d .utag.am{background:rgba(255,45,122,0.18);color:#ff6ba0;}
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
.dot.g{background:var(--cyan);}.dot.y{background:#ff2d7a;}.dot.gr{background:#555;}
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
.mail-alert{margin:20px 28px 24px;background:rgba(255,45,122,0.10);border:1px solid rgba(255,45,122,0.5);border-radius:12px;padding:16px 20px;font:600 19px 'Inter',sans-serif;color:#c21b5e;text-align:left;}
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
.brw-note .warn{color:#e0246d;}
/* report contents */
.report{padding:38px;}
.rrow{display:flex;align-items:center;gap:18px;background:#161616;border-radius:12px;padding:18px 20px;margin-bottom:12px;}
.rrow:last-child{margin-bottom:0;}
.rrow .ri{width:44px;height:44px;border-radius:10px;background:#0a0a0a;border:1px solid rgba(0,245,212,0.35);color:var(--cyan);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.rrow p{font:600 21px 'Inter',sans-serif;color:#e6e6e6;flex:1;text-align:left;}
/* middle slides (not cover, not CTA closer): one text size outside UI, every post */
.slide.mid h2{font-size:46px;line-height:1.3;letter-spacing:-1px;}
.slide.mid .body{font-size:46px;line-height:1.35;max-width:920px;}
/* mint posts: one size, one weight, left aligned outside UI on non-cover slides */
.mint .content{align-items:flex-start;text-align:left;}
.ombre{background:linear-gradient(92deg,#ff9a3d 0%,#ff2d7a 75%,#ff2d7a 100%);-webkit-background-clip:text;background-clip:text;color:transparent;}
.mint:not(.cover) h2{font:900 58px/1.22 'Inter Tight',sans-serif;letter-spacing:-1.5px;}
.mint:not(.cover) .body{font:900 58px/1.22 'Inter Tight',sans-serif;letter-spacing:-1.5px;color:var(--ink);max-width:920px;}
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
.wb-row.c2{border-left-color:#ff2d7a;}
.wb-row .wt{font:600 19px 'Inter',sans-serif;color:#f0f0f0;text-align:left;}
.wb-row .wav{width:34px;height:34px;border-radius:50%;background:#242424;color:#cfcfcf;font:700 13px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;}
.wb-row .wst{font:700 15px 'Inter',sans-serif;border-radius:8px;padding:9px 0;text-align:center;}
.wb-row .wst.done{background:var(--cyan);color:var(--ink);}
.wb-row .wst.doing{background:#ff2d7a;color:#fff;}
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
/* clickup-style cover: glow input box + mascot */
.glowbox{position:relative;border-radius:30px;padding:3px;background:linear-gradient(90deg,#ff9a3d,#ff2d7a,#00f5d4);width:100%;box-shadow:0 12px 26px rgba(10,10,10,0.14), 0 80px 140px -30px rgba(10,10,10,0.45);}
.glowbox-in{background:#fff;border-radius:27px;padding:34px 38px 30px;text-align:left;}
.gb-line{font:600 31px 'Inter',sans-serif;color:var(--ink);}
.gb-line .caret{display:inline-block;width:3px;height:34px;background:var(--cyan);vertical-align:middle;margin:0 3px;}
.gb-line .ghost{color:rgba(10,10,10,0.32);}
.gb-row{display:flex;align-items:center;justify-content:space-between;margin-top:26px;}
.shchip{display:inline-flex;align-items:center;gap:11px;background:#f0f0ec;border:1px solid rgba(10,10,10,0.07);border-radius:13px;padding:10px 18px;font:800 22px 'Inter Tight',sans-serif;color:var(--ink);}
.shchip img.msct{width:30px;height:30px;}
.cover-shadow-tr img.msct{width:38px;height:38px;}
.gb-mascot img.msct{width:100%;height:100%;}
.shchip .cv{font-size:15px;color:rgba(10,10,10,0.5);}
.gb-status{display:inline-flex;align-items:center;gap:10px;font:700 20px 'Inter',sans-serif;color:#00b894;}
.gb-status .pd{width:11px;height:11px;border-radius:50%;background:var(--cyan);box-shadow:0 0 0 5px rgba(0,245,212,0.25);}
.gb-mascot{position:absolute;top:-60px;right:-8px;width:128px;height:128px;border-radius:50%;overflow:hidden;filter:drop-shadow(0 14px 28px rgba(10,10,10,0.3));}
.cover-shadow-tr{display:inline-flex;align-items:center;gap:10px;font:900 26px 'Inter Tight',sans-serif;color:var(--ink);}

/* shadow chat hero: shadow responding */
.sc{padding:34px;}
.sc-msg{max-width:78%;border-radius:16px 16px 4px 16px;background:#242424;padding:18px 22px;margin-left:auto;margin-bottom:14px;}
.sc-msg p{font:600 21px/1.4 'Inter',sans-serif;color:#fff;text-align:left;}
.sc-reply{max-width:88%;border-radius:16px 16px 16px 4px;background:#161616;border:1px solid rgba(0,245,212,0.4);padding:20px 24px;text-align:left;}
.sc-reply .sh{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.sc-reply .sh .si{width:30px;height:30px;border-radius:9px;background:var(--cyan);color:var(--ink);display:flex;align-items:center;justify-content:center;font:800 15px 'Inter Tight',sans-serif;}
.sc-reply .sh b{font:800 19px 'Inter Tight',sans-serif;color:var(--cyan);}
.sc-reply p{font:500 21px/1.45 'Inter',sans-serif;color:#f0f0f0;}
.sc-acts{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;}
/* money flow */
.mf{padding:36px 38px;}
.mf-rows{margin-bottom:6px;}
.mf-row{display:flex;align-items:center;gap:16px;border-bottom:1px solid #ececea;padding:16px 2px;}
.mf-row:last-child{border-bottom:none;}
.mf-row .mv{font:900 40px 'Inter Tight',sans-serif;color:var(--ink);width:170px;text-align:left;flex-shrink:0;}
.mf-row p{font:600 20px 'Inter',sans-serif;color:var(--ink);flex:1;text-align:left;}
.mf-flow{display:flex;align-items:center;gap:12px;background:#0a0a0a;border-radius:14px;padding:18px 22px;margin-top:18px;}
.mf-step{font:800 20px 'Inter Tight',sans-serif;color:#fff;background:#242424;border-radius:9px;padding:12px 18px;}
.mf-step.on{background:var(--cyan);color:var(--ink);}
.mf-arr{color:var(--cyan);font-size:22px;font-weight:800;}
/* growth list hero: the team that handled it before you added it */
.gl{padding:34px;}
.gl-team{display:flex;align-items:center;}
.gl-team .ga{width:38px;height:38px;border-radius:50%;border:3px solid #0d0d0d;font:700 14px 'Inter',sans-serif;display:flex;align-items:center;justify-content:center;color:#fff;margin-left:-10px;}
.gl-team .ga:first-child{margin-left:0;}
.gl-row{display:flex;align-items:center;gap:16px;background:#161616;border-radius:12px;padding:17px 20px;margin-bottom:11px;}
.gl-row .gchk{width:30px;height:30px;border-radius:9px;background:var(--cyan);color:var(--ink);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;flex-shrink:0;}
.gl-row .gchk.off{background:#242424;color:#ff6ba0;}
.gl-row p{font:600 21px 'Inter',sans-serif;color:#f0f0f0;flex:1;text-align:left;}
.gl-add{display:flex;align-items:center;gap:14px;background:#1c1c1c;border:1px solid #2c2c2c;border-radius:12px;padding:16px 20px;margin-top:16px;}
.gl-add .gc{width:2px;height:24px;background:var(--cyan);}
.gl-add p{font:500 20px 'Inter',sans-serif;color:#e8e8e8;flex:1;text-align:left;}
/* scan grid: search bar + 3x2 status tiles */
.sg{padding:38px;}
.sg-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:26px;}
.sg-tile{background:#fff;border-radius:16px;padding:24px 18px;text-align:center;}
.sg-tile .sn{font:800 23px 'Inter Tight',sans-serif;color:var(--ink);}
.sg-tile .st{margin-top:12px;}
/* priority map: organize what matters first */
.pm{padding:36px;}
.pm-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.pm-box{display:flex;align-items:center;gap:14px;background:#f6f6f2;border:1px solid rgba(10,10,10,0.07);border-radius:12px;padding:16px 18px;}
.pm-box .pi2{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font:900 17px 'Barlow Condensed',sans-serif;flex-shrink:0;}
.pm-box p{font:700 20px 'Inter Tight',sans-serif;color:var(--ink);flex:1;text-align:left;}
/* case study card */
.case{padding:38px 40px;position:relative;}
.case-big{font:900 54px 'Inter Tight',sans-serif;letter-spacing:-1px;color:var(--ink);}
.case-big .cv{background:var(--cyan);padding:0 12px;}
.case-line{font:600 22px/1.45 'Inter',sans-serif;color:var(--ink);margin-top:12px;text-align:left;}
.case-svc{border-top:1px solid #ececea;margin-top:22px;padding-top:18px;font:600 19px/1.6 'Inter',sans-serif;color:var(--ink);text-align:left;}
.case-done{margin-top:20px;background:var(--ink);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:12px;}
.case-done .cd{width:28px;height:28px;border-radius:8px;background:var(--cyan);color:var(--ink);display:flex;align-items:center;justify-content:center;font-weight:800;}
.case-done p{font:700 20px 'Inter',sans-serif;color:#fff;flex:1;text-align:left;}
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

def header(cover=False):
    right = f'<span class="cover-shadow-tr">{MASCOT}Shadow.</span>' if cover else ''
    return f'<div class="bar"><div class="wordmark">BERMO.</div>{right}</div>'

def slide(bg, body, idx, total, cover=False):
    nxt = '<div class="next">&#8594;</div>' if idx < total else ''
    pager = f'<div class="pager">{idx} / {total}</div>'
    cov = ' cover' if cover else ''
    mid = ' mid' if (not cover and idx < total) else ''
    return (f'<div class="slide {bg}{cov}{mid}"><div class="orb o1"></div><div class="orb o2"></div>{header(cover)}'
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
  <div class="brief-item"><span class="bx on">&#10003;</span><p>Reply to the warm intro from Thursday</p></div>
  <div class="brief-item"><span class="bx"></span><p>Approve the new homepage copy before it ships</p></div>
  <div class="brief-item"><span class="bx"></span><p>Two vetted candidates ready for your review</p></div>
  <div class="brief-input">Ask Shadow anything<span class="send">&#8594;</span></div>
</div>"""

FUNNEL = """<div class="ui card-w funnel">
  <div class="uihead"><span class="t">Your funnel this month</span><span class="utag am">Drop off found</span></div>
  <div class="frow"><span class="fl">Website visits</span><div class="fbar"><i style="width:100%;"></i></div><span class="fv">1,240</span></div>
  <div class="frow"><span class="fl">Conversations</span><div class="fbar"><i style="width:56%;"></i></div><span class="fv">62</span></div>
  <div class="frow"><span class="fl">Proposals</span><div class="fbar"><i style="width:30%;background:#ff2d7a;"></i></div><span class="fv">18</span></div>
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
      <div class="crm-card"><div class="cc1">Harborlight Co</div><div class="cc2">Intro call Friday</div><div class="ccbar"><span class="ccav">LB</span></div></div>
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

MASCOT = """<img src="data:image/png;base64,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" alt="" class="msct" style="border-radius:50%;display:block;"/>"""

GLOWBOX = f"""<div class="ui glowbox">
  <div class="glowbox-in">
    <div class="gb-line">Where is my revenue actually stalling?<span class="caret"></span><span class="ghost"> and what should we fix first</span></div>
    <div class="gb-row">
      <span class="shchip">{MASCOT}Shadow.<span class="cv">&#9662;</span></span>
      <span class="gb-status"><span class="pd"></span>Your Gap Scan is running</span>
    </div>
  </div>
</div>"""

SHADOWCHAT = """<div class="ui card-d sc">
  <div class="sc-msg"><p>Can we add the homepage rewrite to this week's list?</p></div>
  <div class="sc-reply">
    <div class="sh"><span class="si">S</span><b>Shadow.</b></div>
    <p>Already done, it shipped yesterday, and your follow ups are queued. Your AI engineer shortlist is next, two vetted candidates are ready for you.</p>
    <div class="sc-acts"><span class="utag cy">Homepage shipped</span><span class="utag cy">Follow ups queued</span><span class="utag am">Shortlist in motion</span></div>
  </div>
</div>"""

MONEYFLOW = """<div class="ui card-w mf">
  <div class="uihead"><span class="t">Revenue saved, then put to work</span><span class="utag cy">Real clients</span></div>
  <div class="mf-rows">
    <div class="mf-row"><span class="mv">$25K</span><p>saved for a hospitality SaaS startup in week one</p></div>
    <div class="mf-row"><span class="mv">$130K</span><p>saved for an AI startup in month one</p></div>
  </div>
  <div class="mf-flow"><span class="mf-step on">Gap Scan</span><span class="mf-arr">&#8594;</span><span class="mf-step">Reallocated</span><span class="mf-arr">&#8594;</span><span class="mf-step on">Up 50%+</span></div>
</div>"""

GROWTHLIST = """<div class="ui card-d gl">
  <div class="uihead"><span class="t" style="color:#fff;">Your growth list &middot; run by BERMO.</span>
    <span class="gl-team"><span class="ga" style="background:#00b894;color:#0a0a0a;">LB</span><span class="ga" style="background:#2c2c2c;">WD</span><span class="ga" style="background:#00f5d4;color:#0a0a0a;">AE</span><span class="ga" style="background:#2c2c2c;">RC</span></span></div>
  <div class="gl-row"><span class="gchk">&#10003;</span><p>Rewrite the homepage message for buyers</p><span class="utag cy">Done before Monday</span></div>
  <div class="gl-row"><span class="gchk">&#10003;</span><p>Fix the follow up flow in the CRM</p><span class="utag cy">Done Tuesday</span></div>
  <div class="gl-row"><span class="gchk off">&#8635;</span><p>Shortlist your AI automation engineer</p><span class="utag am">In motion</span></div>
  <div class="gl-add"><span class="gc"></span><p>Add something to the list</p><span class="utag cy">Already handled</span></div>
</div>"""

SCANGRID = """<div class="ui card-d sg">
  <div class="path-q"><div class="path-qi"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f5d4" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/></svg>Where should we start?</div></div>
  <div class="sg-grid">
    <div class="sg-tile"><div class="sn">Website</div><div class="st"><span class="utag am">Gap found</span></div></div>
    <div class="sg-tile"><div class="sn">Messaging</div><div class="st"><span class="utag am">Gap found</span></div></div>
    <div class="sg-tile"><div class="sn">AI discovery</div><div class="st"><span class="utag cy">Strength</span></div></div>
    <div class="sg-tile"><div class="sn">AI workflows + automation</div><div class="st"><span class="utag gr">Scanning</span></div></div>
    <div class="sg-tile"><div class="sn">Social</div><div class="st"><span class="utag gr">Scanning</span></div></div>
    <div class="sg-tile"><div class="sn">Hiring</div><div class="st"><span class="utag cy">Strength</span></div></div>
  </div>
</div>"""

PRIORITYMAP = """<div class="ui card-w pm">
  <div class="uihead"><span class="t">What matters most, first</span><span class="utag cy">In order</span></div>
  <div class="pm-grid">
    <div class="pm-box"><span class="pi2" style="background:#00f5d4;color:#0a0a0a;">01</span><p>Messaging</p></div>
    <div class="pm-box"><span class="pi2" style="background:#ff2d7a;color:#fff;">02</span><p>Website UX and UI</p></div>
    <div class="pm-box"><span class="pi2" style="background:#c8f500;color:#0a0a0a;">03</span><p>AI discovery</p></div>
    <div class="pm-box"><span class="pi2" style="background:#00f5d4;color:#0a0a0a;">04</span><p>Brand</p></div>
    <div class="pm-box"><span class="pi2" style="background:#ff2d7a;color:#fff;">05</span><p>AI workflows</p></div>
    <div class="pm-box"><span class="pi2" style="background:#c8f500;color:#0a0a0a;">06</span><p>Social</p></div>
    <div class="pm-box"><span class="pi2" style="background:#00f5d4;color:#0a0a0a;">07</span><p>Hiring</p></div>
    <div class="pm-box"><span class="pi2" style="background:#ff2d7a;color:#fff;">08</span><p>Target market</p></div>
  </div>
</div>"""

CASECARD = """<div class="ui card-w case">
  <div class="uihead"><span class="t">Hospitality SaaS startup</span><span class="utag cy">Week 1 result</span></div>
  <div class="case-big">$25K <span class="cv">saved</span></div>
  <div class="case-line">Reallocated to the work that actually grows revenue, then up 50%+ in discovery, listed in AI search, found and cited, with a bigger client pipeline, all in under 2 months.</div>
  <div class="case-svc">Website UI and UX &middot; Branding &middot; SEO, GEO and AEO &middot; Messaging targeted to buyers &middot; Full company revenue gap scan &middot; Training new hires to take over</div>
  <div class="case-done"><span class="cd">&#10003;</span><p>Project complete, and the company remains part of BERMO.'s referral market.</p></div>
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
      <div class="hr1"><span class="hd" style="background:#ff2d7a;"></span><p>Two vetted candidates ready for review</p><span class="ht">9:00</span></div>
      <div class="hr1"><span class="hd" style="background:#ff2d7a;"></span><p>Follow up queued for Thursday's warm intro</p><span class="ht">11:30</span></div>
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
     <h1 style="font-size:63px;line-height:1.2;letter-spacing:-1.5px;"><span class="ombre">Who is BERMO.?</span> Imagine a team that knew what your growth needed next, and had it handled before you even added it to your list.</h1>
     <div style="height:14px;"></div>
     {GLOWBOX}""", 1, 6, cover=True),
  slide("mint", f"""
     <h2>You start your day with $20K to $100K+ in revenue saved, reallocated into the moves that actually shift the needle.</h2>
     {MONEYFLOW}""", 2, 6),
  slide("mint", f"""
     <h2>Our companies see results in under a month, and this is how we do it.</h2>
     {SCANGRID}""", 3, 6),
  slide("mint", f"""
     <h2>When growth stalls it is often not the loudest noise, and it can be hard to spot when you are too close to see it.</h2>
     {PRIORITYMAP}""", 4, 6),
  slide("mint", f"""
     <h2>We find the gap, we map the fix, and you see the ROI.</h2>
     {CASECARD}""", 5, 6),
  slide("mint", f"""
     <h2>Are you ready to meet the team you just imagined?</h2>
     {PATH}
     {CTA_SCAN}
     <p class="body"><b>bermoco.com</b> &middot; Follow @bermo.co and share this with a founder who needs it.</p>""", 6, 6),
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
     <p class="body"><b>Every founder we work with knows this feeling.</b></p>""", 2, 5),
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
     <p class="body"><b>No guessing, no busywork, just the next right move.</b></p>""", 4, 5),
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
     <p class="body"><b>Buyers rarely tell you, they just move on.</b></p>""", 3, 5),
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


# ---------------- AD : Revenue Gap Scan, single slide (black) ----------------
AD_SLIDE = f"""<div class="slide dark cover"><div class="orb o1"></div><div class="orb o2"></div>{header(True)}
<div class="content" style="align-items:flex-start;text-align:left;">
  <h1 style="font-size:76px;line-height:1.1;letter-spacing:-2px;">Your revenue has <span class="hl">gaps.</span></h1>
  <h2 style="font-size:44px;line-height:1.25;letter-spacing:-1px;margin-top:-8px;">Shadow finds them in 2 minutes, free, with no pitch.</h2>
  <div class="ui glowbox" style="margin-top:10px;"><div class="glowbox-in" style="background:#141414;">
    <div class="gb-line" style="color:#f5f5f0;">Where is my revenue stalling?<span class="caret"></span></div>
    <div class="gb-row">
      <span class="shchip" style="background:#242424;border-color:rgba(255,255,255,0.1);color:#f5f5f0;">{MASCOT}Shadow.<span class="cv" style="color:#f5f5f0;">&#9662;</span></span>
      <span class="gb-status">
        <span class="pd"></span>Your Gap Scan is running</span>
    </div>
  </div></div>
  <div class="ui sg-grid" style="grid-template-columns:1fr 1fr 1fr;margin-top:6px;">
    <div class="sg-tile"><div class="sn">Website</div><div class="st"><span class="utag am">Gap found</span></div></div>
    <div class="sg-tile"><div class="sn">Messaging</div><div class="st"><span class="utag am">Gap found</span></div></div>
    <div class="sg-tile"><div class="sn">AI discovery</div><div class="st"><span class="utag cy">Strength</span></div></div>
  </div>
  <div style="display:flex;gap:14px;align-items:center;margin-top:8px;width:100%;">
    <span class="cta" style="background:var(--cyan);color:var(--ink);font-size:34px;padding:28px 54px;">Get my free Gap Scan &#8594;</span>
    <span style="font:900 30px 'Inter Tight',sans-serif;color:var(--off);">bermoco.com</span>
  </div>
  <p style="font:700 26px 'Inter',sans-serif;color:var(--cyan);margin-top:4px;">$25K found in week one &middot; $130K in month one &middot; 98% retention.</p>
</div></div>"""

with open(os.path.join(OUT, "ad-revenue-gap-scan.html"), "w") as f:
    f.write(f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>BERMO. Revenue Gap Scan Ad</title>
<style>{CSS}</style></head><body>
<div class="pagehead"><strong>Revenue Gap Scan ad</strong><br>1 slide, 1080x1350, black</div>
{AD_SLIDE}
</body></html>""")
print("wrote ad-revenue-gap-scan.html")

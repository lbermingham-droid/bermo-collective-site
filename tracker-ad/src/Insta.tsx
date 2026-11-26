import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SiteClip, Themed, SiteTheme } from "./SiteClip";
import { Footage, Word, fontFace as adFonts } from "./Ad";

// Instagram pieces in the v65 look (black, white, one violet accent):
//   InstaPhoto  1080 x 1350 feed post: two overlapping phones + one line
//   InstaReel   1080 x 1920 reel: her footage bookends, the app in a phone
// Both keep 130 px clear on each side. The screens are the SiteClip scenes
// (the app redrawn and animated), frozen for the photo, playing in the reel.
export const INSTA_FPS = 30;
const PAD = 130, ACC = "#7c6cff";
const wide = `@font-face{font-family:InterVar;font-weight:100 900;src:url(${staticFile("fonts/inter-var.woff2")}) format("woff2")}
@font-face{font-family:ArchivoWide;font-weight:900;src:url(${staticFile("fonts/archivo-wide-900.woff2")}) format("woff2")}`;

// An iPhone drawn around a 1080 x 2208 screen. `w` = outer width in px.
const Phone: React.FC<{ w: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ w, style, children }) => {
  const b = w * 0.032, sw = w - b * 2, k = sw / 1080, sh = 2208 * k, r = w * 0.155;
  const btn = (top: number, h: number, left: boolean): React.CSSProperties => ({ position: "absolute", top: top * (sh + b * 2), height: h * (sh + b * 2), width: w * 0.012, [left ? "left" : "right"]: -w * 0.009, borderRadius: w * 0.006, background: "#2a2a2f" } as React.CSSProperties);
  return <div style={{ position: "absolute", width: w, height: sh + b * 2, ...style }}>
    <div style={btn(0.19, 0.045, true)} /><div style={btn(0.27, 0.075, true)} /><div style={btn(0.36, 0.075, true)} /><div style={btn(0.3, 0.11, false)} />
    <div style={{ position: "absolute", inset: 0, borderRadius: r, background: "linear-gradient(145deg,#6b6b73 0%,#2b2b30 18%,#141416 50%,#2f2f35 82%,#5a5a62 100%)", boxShadow: `0 ${w * 0.1}px ${w * 0.16}px rgba(0,0,0,.75)` }} />
    <div style={{ position: "absolute", inset: b * 0.34, borderRadius: r - b * 0.34, background: "#000" }} />
    <div style={{ position: "absolute", left: b, top: b, width: sw, height: sh, borderRadius: r - b, overflow: "hidden", background: "#000" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 2208, transform: `scale(${k})`, transformOrigin: "0 0" }}>{children}</div>
      <div style={{ position: "absolute", left: "50%", top: sw * 0.032, width: sw * 0.3, height: sw * 0.088, marginLeft: -sw * 0.15, borderRadius: sw * 0.05, background: "#000" }}><div style={{ position: "absolute", right: "16%", top: "30%", width: "13%", height: "40%", borderRadius: "50%", background: "#11131c" }} /></div>
    </div>
  </div>;
};
// SiteClip starting at one of its own frames
const Clip: React.FC<{ start: number }> = ({ start }) => <Sequence from={-start} layout="none"><SiteClip /></Sequence>;

// ---- the feed post -------------------------------------------------------
// OUR composition, not Ladder's two upright phones: one phone turned in
// space, and the two things the product is about pulled OUT of the screen
// in front of it (the PR card and the "4 Mondays" block), with the reel's
// own caption style. 130 px clear each side.
const Tile: React.FC<{ id: string; size: number }> = ({ id, size }) => { const url = staticFile(`site/art/${id}.png`);
  return <div style={{ width: size, height: size, flex: "none", borderRadius: size * 0.26, position: "relative", background: "linear-gradient(150deg,#2b2b31,#151518)", boxShadow: `inset 0 2px 0 rgba(255,255,255,.22), 0 ${size * 0.06}px 0 #0d0d10, 0 ${size * 0.14}px ${size * 0.18}px rgba(0,0,0,.45)` }}>
    <div style={{ position: "absolute", inset: size * 0.07, background: "linear-gradient(160deg,#fff 35%,#b9b0ff)", WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
  </div>; };
// A colourway for the photo. `hue` turns the app's violet on the phone screen toward the accent.
type Theme = { name: string; bg: string; ink: string; acc: string; card: string; cardInk: string; cardEdge: string; block: string; blockInk: string; blockEdge: string; soft: string; hue: number };
const BASE: Theme = { name: "", bg: "#050506", ink: "#fff", acc: ACC, card: "#fff", cardInk: "#0b0b0d", cardEdge: "#cfcfd6", block: ACC, blockInk: "#fff", blockEdge: "#4a3fc4", soft: "#d9d6ee", hue: 0 };
const Photo: React.FC<{ t: Theme }> = ({ t }) => { const cap = (key: string) => <span style={{ color: t.acc, display: "inline-block", transform: "skewX(-9deg)" }}>{key}</span>;
  return <AbsoluteFill style={{ background: t.bg, fontFamily: "InterVar, InterTight, sans-serif", color: t.ink }}>
  <style>{adFonts}</style><style>{wide}</style>
  <div style={{ position: "absolute", left: PAD, top: 92, fontFamily: "InterTight", fontWeight: 800, fontSize: 82, letterSpacing: -2.6, lineHeight: 1.05 }}>Every {cap("lift.")}<br />Every {cap("member.")}</div>
  <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1350, perspective: 2200, perspectiveOrigin: "50% 40%" }}>
    <div style={{ position: "absolute", left: 356, top: 322, width: 440, transform: "rotateY(-17deg) rotateX(7deg) rotateZ(3deg)", transformOrigin: "50% 50%" }}><Phone w={440} style={{ left: 0, top: 0 }}><div style={{ position: "absolute", inset: 0, filter: t.hue ? `hue-rotate(${t.hue}deg) saturate(1.15)` : "none" }}><Clip start={362} /></div></Phone></div>
  </div>
  <div style={{ position: "absolute", left: 494, top: 706, width: 456, transform: "rotate(-3deg)", background: t.card, color: t.cardInk, borderRadius: 34, boxShadow: `0 6px 0 ${t.cardEdge}, 0 50px 90px rgba(0,0,0,${t.bg === "#050506" ? 0.8 : 0.35})`, overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 24px 8px" }}>
      <Tile id="squat" size={60} />
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.7 }}>Chris Walker</div><div style={{ fontSize: 19, color: "#6b6b76", whiteSpace: "nowrap" }}>Back Squat · bonus set</div></div>
      <div style={{ background: t.block, color: t.blockInk, borderRadius: 13, padding: "9px 13px", fontSize: 17, fontWeight: 800, letterSpacing: 0.8, whiteSpace: "nowrap", flex: "none" }}>NEW PR</div>
    </div>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 26px 24px" }}>
      <div><div style={{ fontFamily: "ArchivoWide", fontWeight: 900, fontSize: 84, lineHeight: 1.04, letterSpacing: -2, whiteSpace: "nowrap" }}>175<span style={{ fontFamily: "InterVar, InterTight", fontWeight: 700, fontSize: 28, marginLeft: 10, letterSpacing: 0 }}>lb × 3</span></div>
        <div style={{ fontSize: 22, fontWeight: 600, color: t.block === t.card ? t.cardInk : t.block }}>+10 lb on his best</div></div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>{[0.52, 0.6, 0.66, 0.74, 1].map((h, i) => <div key={i} style={{ width: 21, height: 100 * h, borderRadius: 6, background: i === 4 ? t.block : t.soft }} />)}</div>
    </div>
  </div>
  <div style={{ position: "absolute", left: PAD, top: 992, width: 372, transform: "rotate(4deg)", background: t.block, color: t.blockInk, borderRadius: 30, boxShadow: `0 6px 0 ${t.blockEdge}, 0 44px 80px rgba(0,0,0,${t.bg === "#050506" ? 0.75 : 0.3})`, padding: "22px 26px 24px" }}>
    <div style={{ fontFamily: "ArchivoWide", fontWeight: 900, fontSize: 66, lineHeight: 1 }}>4<span style={{ fontSize: 26, marginLeft: 12 }}>MONDAYS</span></div>
    <div style={{ fontSize: 22, fontWeight: 600, marginTop: 8, opacity: 0.94 }}>Planned from one entry</div>
  </div>
  <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 62, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
    <div style={{ fontFamily: "InterTight", fontWeight: 800, fontSize: 46, letterSpacing: -1.5 }}>BERMO<span style={{ color: t.acc }}>.</span></div>
    <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.75 }}>Custom apps for gyms</div>
  </div>
    {t.name ? <div style={{ position: "absolute", right: PAD, top: 96, textAlign: "right", fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.7 }}>{t.name}</div> : null}
  </AbsoluteFill>; };
export const InstaPhoto: React.FC = () => <Photo t={BASE} />;
// Four colourways she sent as references, on one sheet (2160 x 2700).
const WAYS: Theme[] = [
  { name: "A · Sun + cobalt", bg: "#F6CE45", ink: "#2A54B4", acc: "#2A54B4", card: "#fff", cardInk: "#16264f", cardEdge: "#d8b232", block: "#2A54B4", blockInk: "#F6CE45", blockEdge: "#1b3a80", soft: "#cfd9f1", hue: -22 },
  { name: "B · Sky + tomato", bg: "#C5EEF2", ink: "#E2332A", acc: "#E2332A", card: "#fff", cardInk: "#3a1512", cardEdge: "#9fd3d9", block: "#E2332A", blockInk: "#fff", blockEdge: "#a8211a", soft: "#f6cfcc", hue: 118 },
  { name: "C · Red + cream", bg: "#D8352B", ink: "#F7EFDD", acc: "#111", card: "#F7EFDD", cardInk: "#1a1210", cardEdge: "#a3241c", block: "#111", blockInk: "#F7EFDD", blockEdge: "#000", soft: "#e2d6bd", hue: 118 },
  { name: "D · Cobalt + black", bg: "#4257F2", ink: "#fff", acc: "#B9C3FF", card: "#fff", cardInk: "#0b0d1f", cardEdge: "#2c3bbd", block: "#0b0b0d", blockInk: "#fff", blockEdge: "#000", soft: "#cfd5fb", hue: -16 },
];
export const InstaColorways: React.FC = () => <AbsoluteFill style={{ background: "#000" }}>
  {WAYS.map((t, i) => <div key={i} style={{ position: "absolute", left: (i % 2) * 1080, top: Math.floor(i / 2) * 1350, width: 1080, height: 1350, overflow: "hidden" }}><Photo t={t} /></div>)}
</AbsoluteFill>;

// ---- the reel ------------------------------------------------------------
type W = { t: string; k?: boolean; br?: boolean };
const Line: React.FC<{ words: W[]; y: number; size?: number; step?: number }> = ({ words, y, size = 84, step = 4 }) =>
  <div style={{ position: "absolute", left: PAD, right: PAD, top: y, display: "flex", flexWrap: "wrap", columnGap: 20 }}>
    {words.map((w, i) => <React.Fragment key={i}>{w.br ? <div style={{ flexBasis: "100%", height: 0 }} /> : null}<Word t={w.t} at={1 + i * step} k={w.k} c={ACC} size={size} /></React.Fragment>)}
  </div>;
const every = (w: string, tail?: string): W[] => [{ t: "Every" }, { t: w, k: true }, ...(tail ? [{ t: tail }] : [])];
// [SiteClip start frame, length, captions as [at, words]]
const PARTS: [number, number, [number, W[]][]][] = [
  [20, 224, [[0, [{ t: "Mine" }, { t: "runs" }, { t: "on" }, { t: "this.", k: true }]], [50, every("month,", "planned.")]]],
  [264, 162, [[0, every("member.")], [100, every("PR.")]]],
  [488, 118, [[0, every("lift.")]]],
  [740, 132, [[0, every("muscle.")]]],
];
const GYM = 50, APP = PARTS.reduce((a, p) => a + p[1], 0), BEACH = 46, END = 42;
export const REEL_DURATION = GYM + APP + BEACH + END;
const AppSection: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const s = spring({ frame: f, fps, config: { damping: 20, stiffness: 120, mass: 0.9 } });
  const out = interpolate(f, [APP - 8, APP], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }); const PW = 740;
  let at = 0; const parts = PARTS.map(p => { const from = at; at += p[1]; return { from, p }; });
  return <AbsoluteFill style={{ background: "#000" }}>
    <div style={{ position: "absolute", left: (1080 - PW) / 2, top: 336, transform: `translateY(${(1 - s) * 900 + out * 60}px) scale(${1 - out * 0.04})`, opacity: 1 - out, transformOrigin: "50% 0%" }}>
      <Phone w={PW} style={{ left: 0, top: 0 }}>{parts.map(({ from, p }, i) => <Sequence key={i} from={from} durationInFrames={p[1]} layout="none"><Clip start={p[0]} /></Sequence>)}</Phone>
    </div>
    {parts.map(({ from, p }) => p[2].map(([c, words], j) => { const end = j + 1 < p[2].length ? p[2][j + 1][0] : p[1]; return <Sequence key={from + "-" + j} from={from + c} durationInFrames={end - c} layout="none"><Line words={words} y={PAD + 26} size={words.length > 2 && words[2].t.length > 5 ? 76 : 88} step={5} /></Sequence>; }))}
  </AbsoluteFill>;
};
const End: React.FC = () => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); const a = spring({ frame: f - 2, fps, config: { damping: 18, stiffness: 170 } }), b = spring({ frame: f - 12, fps, config: { damping: 18, stiffness: 170 } });
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: "InterTight" }}>
    <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -5, color: "#fff", opacity: a, transform: `scale(${0.9 + 0.1 * a})` }}>BERMO<span style={{ color: ACC }}>.</span></div>
    <div style={{ fontSize: 33, fontWeight: 600, color: "rgba(255,255,255,.85)", marginTop: 18, opacity: b, transform: `translateY(${(1 - b) * 16}px)` }}>Custom apps for gyms · bermoco.com</div>
  </AbsoluteFill>; };
export const InstaReel: React.FC = () => <AbsoluteFill style={{ background: "#000" }}>
  <style>{adFonts}</style><style>{wide}</style>
  <Sequence from={0} durationInFrames={GYM} layout="none"><Footage name="gym" len={GYM} behind={<Line y={520} size={100} words={[{ t: "Your" }, { t: "gym" }, { t: "still" }, { t: "runs", br: true }, { t: "on" }, { t: "paper.", k: true }]} />} /></Sequence>
  <Sequence from={GYM} durationInFrames={APP} layout="none"><AppSection /></Sequence>
  <Sequence from={GYM + APP} durationInFrames={BEACH} layout="none"><Footage name="beach" len={BEACH} dim={0.7}><Line y={150} size={96} step={8} words={[{ t: "Your gym." }, { t: "Your app.", br: true }, { t: "Built for you.", k: true, br: true }]} /></Footage></Sequence>
  <Sequence from={GYM + APP + BEACH} durationInFrames={END} layout="none"><Footage name="beach" len={END} from={BEACH} dim={0.38}><End /></Footage></Sequence>
</AbsoluteFill>;

// ---- the APP in each colourway (she meant the app's own screens, not the poster) ----
const APPS: [string, Partial<SiteTheme>][] = [
  ["A · Sun + cobalt", { bg: "#F6CE45", cell: "#FBDF7C", cell2: "#FFEFAF", sep: "rgba(42,84,180,.22)", text: "#1F4398", sec: "rgba(31,67,152,.72)", ter: "rgba(31,67,152,.4)", acc: "#2A54B4", accDeep: "#1b3a80", onAcc: "#F6CE45", tab: "rgba(246,206,69,.97)", thumb: "linear-gradient(150deg,#3566cf,#1f4296)", art: "linear-gradient(160deg,#fff,#F6CE45)", fig: "hue-rotate(-22deg)" }],
  ["B · Sky + tomato", { bg: "#C5EEF2", cell: "#FFFFFF", cell2: "#E4F7F9", sep: "rgba(226,51,42,.2)", text: "#C3271E", sec: "rgba(150,38,30,.75)", ter: "rgba(150,38,30,.4)", acc: "#E2332A", accDeep: "#a8211a", onAcc: "#fff", tab: "rgba(197,238,242,.97)", thumb: "linear-gradient(150deg,#f0483f,#c2251d)", art: "linear-gradient(160deg,#fff,#ffe1de)", fig: "hue-rotate(118deg)" }],
  ["C · Red + cream", { bg: "#D8352B", cell: "#C12A21", cell2: "#A9221A", sep: "rgba(247,239,221,.25)", text: "#F7EFDD", sec: "rgba(247,239,221,.74)", ter: "rgba(247,239,221,.42)", acc: "#141110", accDeep: "#000", onAcc: "#F7EFDD", tab: "rgba(196,43,34,.97)", thumb: "linear-gradient(150deg,#2a2422,#0e0c0b)", art: "linear-gradient(160deg,#fff,#F7EFDD)", fig: "grayscale(1) brightness(1.7)" }],
  ["D · Cobalt + black", { bg: "#4257F2", cell: "#566AF5", cell2: "#6D7EF8", sep: "rgba(255,255,255,.24)", text: "#fff", sec: "rgba(255,255,255,.78)", ter: "rgba(255,255,255,.45)", acc: "#0b0b0d", accDeep: "#000", onAcc: "#fff", tab: "rgba(58,78,226,.97)", thumb: "linear-gradient(150deg,#26262b,#0b0b0d)", art: "linear-gradient(160deg,#fff,#cfd5fb)", fig: "grayscale(1) brightness(1.9)" }],
];
const ROWS = [362, 603];   // the class set table, the member page
export const AppColorways: React.FC = () => <AbsoluteFill style={{ background: "#101012", fontFamily: "InterVar, InterTight, sans-serif", color: "#fff" }}>
  <style>{adFonts}</style><style>{wide}</style>
  {APPS.map(([name, theme], c) => <React.Fragment key={c}>
    <div style={{ position: "absolute", left: 40 + c * 530, top: 44, width: 490, textAlign: "center", fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.8 }}>{name}</div>
    {ROWS.map((frame, r) => <Phone key={r} w={470} style={{ left: 50 + c * 530, top: 110 + r * 1010 }}><Themed theme={theme}><Clip start={frame} /></Themed></Phone>)}
  </React.Fragment>)}
</AbsoluteFill>;

// ---- the direction she described: black ground, cobalt primary, light-blue tint,
// red secondary, bright yellow highlight, white only for the big pops ----
// Black ground. The BLOCKS are the secondary colour (cobalt, with lighter blue inside them);
// the POP colours (yellow, red, white) are for tiles and pop items. No grey anywhere.
const DARK: Partial<SiteTheme> = { bg: "#000", cell: "#3D50EE", cell2: "#596CF6", sep: "rgba(255,255,255,.24)", text: "#fff", sec: "rgba(206,218,255,.92)", ter: "rgba(206,218,255,.55)",
  acc: "#fff", accDeep: "#C5EEF2", onAcc: "#2B3CD6", tab: "rgba(0,0,0,.96)", thumb: "linear-gradient(150deg,#FFE27A 0%,#F6CE45 55%,#E3B92F 100%)", art: "linear-gradient(160deg,#101a6b,#1b2aa8)",
  up: "#F6CE45", hi: "#F6CE45", ring2: "#F6CE45", pr: "#E8382E", prDeep: "#C22A21", muscle: "#E8382E", soft: "#C5EEF2", conf: "#F6CE45",
  avatar: "#C5EEF2", avatarInk: "#2B3CD6", cardSub: "#3D50EE", cardEdge: "#C5EEF2", figSet: "-b" };
const SWATCH: [string, string, string][] = [["#000000", "Black", "Background"], ["#3D50EE", "Cobalt", "The blocks"], ["#C5EEF2", "Light blue", "Inside blocks, labels"], ["#F6CE45", "Yellow", "Pop: tiles, highlights"], ["#E8382E", "Red", "Pop: PRs, muscles"], ["#FFFFFF", "White", "Pop: ticks, numbers, cards"]];
const SHOTS: [number, string][] = [[362, "Class"], [398, "A PR"], [228, "Calendar"], [603, "Member"], [730, "Today"], [800, "Muscles"]];
export const AppDark: React.FC = () => <AbsoluteFill style={{ background: "#101012", fontFamily: "InterVar, InterTight, sans-serif", color: "#fff" }}>
  <style>{adFonts}</style><style>{wide}</style>
  <div style={{ position: "absolute", left: 60, right: 60, top: 44, display: "flex", gap: 18 }}>
    {SWATCH.map(([c, n, use]) => <div key={n} style={{ flex: 1, display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 62, height: 62, borderRadius: 16, background: c, border: c === "#000000" ? "2px solid #3a3a3c" : "none", flex: "none" }} /><div><div style={{ fontSize: 23, fontWeight: 700 }}>{n}</div><div style={{ fontSize: 17, color: "rgba(255,255,255,.6)" }}>{use}</div></div></div>)}
  </div>
  {SHOTS.map(([frame, name], i) => <React.Fragment key={i}>
    <Phone w={470} style={{ left: 95 + (i % 3) * 560, top: 170 + Math.floor(i / 3) * 1040 }}><Themed theme={DARK}><Clip start={frame} /></Themed></Phone>
    <div style={{ position: "absolute", left: 95 + (i % 3) * 560, width: 470, top: 170 + Math.floor(i / 3) * 1040 + 968, textAlign: "center", fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,.6)" }}>{name}</div>
  </React.Fragment>)}
</AbsoluteFill>;

// ---- all four colourways in that same treatment: black ground, the colourway's main
// colour as the BLOCKS, its other colours as the pops, no grey ----
const RED = "#E8382E";
const BLOCKS: [string, Partial<SiteTheme>][] = [
  ["A · Sun blocks, cobalt pops", { bg: "#000", text: "#fff", sec: "rgba(246,206,69,.95)", ter: "rgba(246,206,69,.55)", sep: "rgba(246,206,69,.3)", cell: "#F6CE45", cell2: "#FFE994", cellText: "#17307A", cellSec: "rgba(23,48,122,.8)", cellTer: "rgba(23,48,122,.48)", cellSep: "rgba(23,48,122,.24)",
    acc: "#2A54B4", accDeep: "#1b3a80", onAcc: "#F6CE45", link: "#F6CE45", tab: "rgba(0,0,0,.96)", thumb: "linear-gradient(150deg,#3b6be0,#1f4296)", art: "linear-gradient(160deg,#fff,#FFE994)", up: "#2A54B4", hi: RED, ring2: RED, pr: RED, prDeep: "#C22A21", muscle: RED, soft: "#FFE994", conf: "#2A54B4", avatar: "#2A54B4", avatarInk: "#F6CE45", cardSub: "#2A54B4", cardEdge: "#F6CE45", figSet: "-b" }],
  ["B · Sky blocks, tomato pops", { bg: "#000", text: "#fff", sec: "rgba(197,238,242,.95)", ter: "rgba(197,238,242,.55)", sep: "rgba(197,238,242,.3)", cell: "#C5EEF2", cell2: "#FFFFFF", cellText: "#8E1B14", cellSec: "rgba(142,27,20,.82)", cellTer: "rgba(142,27,20,.48)", cellSep: "rgba(142,27,20,.2)",
    acc: "#E2332A", accDeep: "#a8211a", onAcc: "#fff", link: "#C5EEF2", tab: "rgba(0,0,0,.96)", thumb: "linear-gradient(150deg,#f4554c,#c2251d)", art: "linear-gradient(160deg,#fff,#ffe1de)", up: "#E2332A", hi: "#E2332A", ring2: "#8E1B14", pr: "#E2332A", prDeep: "#a8211a", muscle: "#E2332A", soft: "#C5EEF2", conf: "#C5EEF2", avatar: "#E2332A", avatarInk: "#fff", cardSub: "#E2332A", cardEdge: "#C5EEF2", figSet: "-b" }],
  ["C · Red blocks, cream pops", { bg: "#000", text: "#F7EFDD", sec: "rgba(247,239,221,.9)", ter: "rgba(247,239,221,.5)", sep: "rgba(247,239,221,.26)", cell: "#D8352B", cell2: "#B5271E", cellText: "#F7EFDD", cellSec: "rgba(247,239,221,.85)", cellTer: "rgba(247,239,221,.52)", cellSep: "rgba(247,239,221,.26)",
    acc: "#F7EFDD", accDeep: "#d9cfb8", onAcc: "#C22A21", link: "#F7EFDD", tab: "rgba(0,0,0,.96)", thumb: "linear-gradient(150deg,#fffaf0,#e9dcc3)", art: "linear-gradient(160deg,#7a1610,#b5271e)", up: "#F7EFDD", hi: "#F7EFDD", ring2: "#141110", pr: "#141110", prDeep: "#141110", muscle: "#F7EFDD", soft: "#E9DCC3", conf: "#F7EFDD", avatar: "#F7EFDD", avatarInk: "#C22A21", cardSub: "#C22A21", cardEdge: "#E9DCC3", figSet: "-b" }],
  ["D · Cobalt blocks, yellow + red pops", { ...DARK, cellText: "#fff" }],
];
const BROWS = [362, 603, 730];   // class set table, member page, today
export const AppBlocks: React.FC = () => <AbsoluteFill style={{ background: "#101012", fontFamily: "InterVar, InterTight, sans-serif", color: "#fff" }}>
  <style>{adFonts}</style><style>{wide}</style>
  {BLOCKS.map(([name, theme], c) => <React.Fragment key={c}>
    <div style={{ position: "absolute", left: 30 + c * 540, top: 40, width: 510, textAlign: "center", fontSize: 23, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.85 }}>{name}</div>
    {BROWS.map((frame, r) => <Phone key={r} w={470} style={{ left: 50 + c * 540, top: 104 + r * 1000 }}><Themed theme={theme}><Clip start={frame} /></Themed></Phone>)}
  </React.Fragment>)}
</AbsoluteFill>;

// ---- the agreed palette only (black, blue, light blue, red + yellow / red / white pops),
// in the layout of the first colourway sheet: which colour the BLOCKS take ----
const LB = "#C5EEF2", BL = "#3D50EE", YL = "#F6CE45";
const AGREED: [string, Partial<SiteTheme>][] = [
  ["A · Blue blocks", { ...DARK, cellText: "#fff" }],
  ["B · Light blue blocks", { ...DARK, cell: LB, cell2: "#FFFFFF", cellText: "#1B2AA8", cellSec: "rgba(27,42,168,.82)", cellTer: "rgba(27,42,168,.45)", cellSep: "rgba(27,42,168,.2)", acc: BL, accDeep: "#2B3CD6", onAcc: "#fff", link: "#fff", up: RED, ring2: RED, avatar: BL, avatarInk: "#fff" }],
  ["C · Red blocks", { ...DARK, cell: RED, cell2: "#F0625A", cellText: "#fff", cellSec: "rgba(255,255,255,.88)", cellTer: "rgba(255,255,255,.5)", cellSep: "rgba(255,255,255,.26)", acc: "#fff", onAcc: RED, link: "#fff", up: YL, pr: YL, prDeep: "#b8901a", muscle: YL, avatar: LB, avatarInk: "#2B3CD6" }],
  ["D · Blue + red blocks", { ...DARK, cellText: "#fff", cells: [{ cell: BL, cell2: "#596CF6" }, { cell: RED, cell2: "#F0625A" }], up: YL, pr: YL }],
];
export const AppAgreed: React.FC = () => <AbsoluteFill style={{ background: "#101012", fontFamily: "InterVar, InterTight, sans-serif", color: "#fff" }}>
  <style>{adFonts}</style><style>{wide}</style>
  {AGREED.map(([name, theme], c) => <React.Fragment key={c}>
    <div style={{ position: "absolute", left: 40 + c * 530, top: 44, width: 490, textAlign: "center", fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.8 }}>{name}</div>
    {ROWS.map((frame, r) => <Phone key={r} w={470} style={{ left: 50 + c * 530, top: 110 + r * 1010 }}><Themed theme={theme}><Clip start={frame} /></Themed></Phone>)}
  </React.Fragment>)}
</AbsoluteFill>;

// ---- colourway A inverted as she described: black ground, BLUE blocks, and YELLOW doing
// everything cobalt did in the original (ticks, bars, tiles, and in the second column the text too) ----
const A_INV: Partial<SiteTheme> = { ...DARK, cellText: "#fff", acc: YL, accDeep: "#E3B92F", onAcc: "#1B2AA8", link: YL, up: YL, hi: YL, ring2: "#fff", avatar: YL, avatarInk: "#1B2AA8", sec: "rgba(246,206,69,.95)", ter: "rgba(246,206,69,.55)", cardSub: BL, conf: YL };
const A_SET: [string, Partial<SiteTheme>][] = [
  ["Yellow accents, white text", A_INV],
  ["Yellow text too", { ...A_INV, text: YL, cellText: YL, cellSec: "rgba(246,206,69,.85)", cellTer: "rgba(246,206,69,.5)", cellSep: "rgba(246,206,69,.28)" }],
];
const A_ROWS = [362, 603, 730];
export const AppBlueYellow: React.FC = () => <AbsoluteFill style={{ background: "#101012", fontFamily: "InterVar, InterTight, sans-serif", color: "#fff" }}>
  <style>{adFonts}</style><style>{wide}</style>
  {A_SET.map(([name, theme], r) => <React.Fragment key={r}>
    <div style={{ position: "absolute", left: 50, top: 40 + r * 1050, fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.8 }}>{name}</div>
    {A_ROWS.map((frame, c) => <Phone key={c} w={470} style={{ left: 50 + c * 530, top: 96 + r * 1050 }}><Themed theme={theme}><Clip start={frame} /></Themed></Phone>)}
  </React.Fragment>)}
</AbsoluteFill>;

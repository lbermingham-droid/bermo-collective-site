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
const DARK: Partial<SiteTheme> = { acc: "#4A5DFF", accDeep: "#2E3ECC", onAcc: "#fff", up: "#A9DDF0", soft: "#C5EEF2", conf: "#F6CE45", pr: "#E8382E", prDeep: "#C22A21", hi: "#F6CE45", ring2: "#F6CE45", muscle: "#E8382E", fig: "hue-rotate(118deg) saturate(1.2)", art: "linear-gradient(160deg,#ffffff 35%,#C5EEF2 100%)" };
const SWATCH: [string, string, string][] = [["#000000", "Black", "Background"], ["#4A5DFF", "Cobalt", "Buttons, ticks, charts"], ["#C5EEF2", "Light blue", "Tints, trends"], ["#E8382E", "Red", "PRs, muscles worked"], ["#F6CE45", "Yellow", "Small highlights"], ["#FFFFFF", "White", "The big pops"]];
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

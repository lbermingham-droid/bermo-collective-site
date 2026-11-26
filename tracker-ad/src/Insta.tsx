import React from "react";
import { AbsoluteFill, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SiteClip } from "./SiteClip";
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
const cap = (key: string) => <span style={{ color: ACC, display: "inline-block", transform: "skewX(-9deg)" }}>{key}</span>;
export const InstaPhoto: React.FC = () => <AbsoluteFill style={{ background: "#050506", fontFamily: "InterVar, InterTight, sans-serif", color: "#fff" }}>
  <style>{adFonts}</style><style>{wide}</style>
  <div style={{ position: "absolute", left: PAD, top: 92, fontFamily: "InterTight", fontWeight: 800, fontSize: 82, letterSpacing: -2.6, lineHeight: 1.05 }}>Every {cap("lift.")}<br />Every {cap("member.")}</div>
  <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1350, perspective: 2200, perspectiveOrigin: "50% 40%" }}>
    <div style={{ position: "absolute", left: 356, top: 322, width: 440, transform: "rotateY(-17deg) rotateX(7deg) rotateZ(3deg)", transformOrigin: "50% 50%" }}><Phone w={440} style={{ left: 0, top: 0 }}><Clip start={362} /></Phone></div>
  </div>
  <div style={{ position: "absolute", left: 494, top: 706, width: 456, transform: "rotate(-3deg)", background: "#fff", color: "#0b0b0d", borderRadius: 34, boxShadow: "0 6px 0 #cfcfd6, 0 50px 90px rgba(0,0,0,.8)", overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 24px 8px" }}>
      <Tile id="squat" size={60} />
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.7 }}>Chris Walker</div><div style={{ fontSize: 19, color: "#6b6b76", whiteSpace: "nowrap" }}>Back Squat · bonus set</div></div>
      <div style={{ background: ACC, color: "#fff", borderRadius: 13, padding: "9px 13px", fontSize: 17, fontWeight: 800, letterSpacing: 0.8, whiteSpace: "nowrap", flex: "none" }}>NEW PR</div>
    </div>
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 26px 24px" }}>
      <div><div style={{ fontFamily: "ArchivoWide", fontWeight: 900, fontSize: 84, lineHeight: 1.04, letterSpacing: -2, whiteSpace: "nowrap" }}>175<span style={{ fontFamily: "InterVar, InterTight", fontWeight: 700, fontSize: 28, marginLeft: 10, letterSpacing: 0 }}>lb × 3</span></div>
        <div style={{ fontSize: 22, fontWeight: 600, color: "#4a3fc4" }}>+10 lb on his best</div></div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>{[0.52, 0.6, 0.66, 0.74, 1].map((h, i) => <div key={i} style={{ width: 21, height: 100 * h, borderRadius: 6, background: i === 4 ? ACC : "#d9d6ee" }} />)}</div>
    </div>
  </div>
  <div style={{ position: "absolute", left: PAD, top: 992, width: 372, transform: "rotate(4deg)", background: ACC, borderRadius: 30, boxShadow: "0 6px 0 #4a3fc4, 0 44px 80px rgba(0,0,0,.75)", padding: "22px 26px 24px" }}>
    <div style={{ fontFamily: "ArchivoWide", fontWeight: 900, fontSize: 66, lineHeight: 1 }}>4<span style={{ fontSize: 26, marginLeft: 12 }}>MONDAYS</span></div>
    <div style={{ fontSize: 22, fontWeight: 600, marginTop: 8, opacity: 0.94 }}>Planned from one entry</div>
  </div>
  <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 62, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
    <div style={{ fontFamily: "InterTight", fontWeight: 800, fontSize: 46, letterSpacing: -1.5 }}>BERMO<span style={{ color: ACC }}>.</span></div>
    <div style={{ fontSize: 24, fontWeight: 600, color: "rgba(255,255,255,.7)" }}>Custom apps for gyms</div>
  </div>
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

import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import clips from "./clips.json";

// 1080 x 1920 Instagram reel, cut in the style of Ladder's "Ladder
// Nutrition" launch reel (studied frame by frame from a screen recording):
//   - footage carries the piece, full-screen, fast cuts
//   - text is small, clean, sentence case; white with ONE accent italic
//     key word; it builds word by word, and a repeated opener ("Every")
//     stays put while the last word swaps
//   - the app is shown as an angled CLOSE-UP of the screen, not a drawn phone
//   - a three-band split screen with a big number on each band
//   - the ending builds three short lines, then the name
// All text and UI stay inside a 120px safe margin.
export const FPS = 30;
export const DURATION = 600; // 20s
const SAFE = 120;
const C = { teal: "#00f5d4", blue: "#4db8ff", purple: "#b788ff", pink: "#ff4d9d" };
const FONT = "InterTight";
const fontFace = `@font-face{font-family:${FONT};font-weight:800;src:url(${staticFile("fonts/intertight-800.woff2")}) format("woff2")}
@font-face{font-family:Anton;font-weight:400;src:url(${staticFile("fonts/anton.woff2")}) format("woff2")}
@font-face{font-family:${FONT};font-weight:600;src:url(${staticFile("fonts/intertight-600.woff2")}) format("woff2")}`;

type ClipName = "gym" | "run" | "beach";
const mattes = (clips as any).mattes as Record<ClipName, number> | undefined;
const pad3 = (n: number) => String(n).padStart(3, "0");
const useSpring = (delay: number, stiffness = 210) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return spring({ frame: f - delay, fps, config: { damping: 18, stiffness, mass: 0.7 } }); };

// ---- text ---------------------------------------------------------------
// One word that pops in. `k` = the accent key word (italic, coloured).
const Word: React.FC<{ t: string; at: number; k?: boolean; c?: string; size?: number }> = ({ t, at, k, c = C.teal, size = 92 }) => {
  const s = useSpring(at); const f = useCurrentFrame();
  if (f < at) return <span style={{ opacity: 0, fontSize: size }}>{t}</span>;
  return <span style={{ display: "inline-block", fontFamily: FONT, fontWeight: 800, fontSize: size, letterSpacing: -2.5, lineHeight: 1.04, color: k ? c : "#fff",
    transform: `translateY(${(1 - s) * 22}px) scale(${interpolate(s, [0, 1], [0.9, 1])})${k ? " skewX(-9deg)" : ""}`, opacity: Math.min(1, s * 1.4), textShadow: "0 2px 24px rgba(0,0,0,.45)" }}>{t}</span>;
};
// "Every ............ lift."  — opener pinned left, key word pinned right.
const Pair: React.FC<{ left: string; right: string; y: number; c?: string; at?: number }> = ({ left, right, y, c, at = 7 }) =>
  <div style={{ position: "absolute", left: SAFE, right: SAFE, top: y, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
    <Word t={left} at={0} /><Word t={right} at={at} k c={c} />
  </div>;
// A sentence that builds word by word, left aligned, wrapping.
const Build: React.FC<{ words: { t: string; k?: boolean; c?: string; br?: boolean }[]; y: number; step?: number; size?: number }> = ({ words, y, step = 4, size }) =>
  <div style={{ position: "absolute", left: SAFE, right: SAFE, top: y, display: "flex", flexWrap: "wrap", columnGap: 22, rowGap: 0 }}>
    {words.map((w, i) => <React.Fragment key={i}>{w.br ? <div style={{ flexBasis: "100%", height: 0 }} /> : null}<Word t={w.t} at={1 + i * step} k={w.k} c={w.c} size={size} /></React.Fragment>)}
  </div>;
// Big condensed number, Ladder's "90g" treatment.
const Num: React.FC<{ n: string; unit?: string; label: string; c?: string; at?: number; style?: React.CSSProperties }> = ({ n, unit, label, c = C.teal, at = 3, style }) => {
  const s = useSpring(at, 180);
  return <div style={{ position: "absolute", opacity: s, transform: `translateY(${(1 - s) * 30}px)`, ...style }}>
    <div style={{ fontFamily: "Anton", fontSize: 150, lineHeight: 0.92, color: c, letterSpacing: -1, textShadow: "0 4px 30px rgba(0,0,0,.5)" }}>{n}<span style={{ fontSize: 62, marginLeft: 8 }}>{unit}</span></div>
    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 46, color: "#fff", letterSpacing: -1, marginTop: 6, textShadow: "0 2px 20px rgba(0,0,0,.6)" }}>{label}</div>
  </div>;
};

// ---- footage ------------------------------------------------------------
// Full-screen clip. Anything passed as `behind` is drawn between the scene
// and her cut-out, so words can sit behind her.
const Footage: React.FC<{ name: ClipName; len: number; from?: number; behind?: React.ReactNode; children?: React.ReactNode; dim?: number }> = ({ name, len, from = 0, behind, children, dim = 0.82 }) => {
  const f = useCurrentFrame(); const src = clips[name]; const n = mattes ? mattes[name] : 0;
  const zoom = interpolate(f, [0, len], [1.07, 1]); const fit: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };
  return <AbsoluteFill style={{ background: "#08090b" }}>
    {src ? <AbsoluteFill style={{ transform: `scale(${zoom})` }}><OffthreadVideo src={staticFile(src)} muted startFrom={from} style={{ ...fit, filter: `brightness(${dim}) contrast(1.06) saturate(1.08)` }} /></AbsoluteFill> : null}
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,.28), transparent 26%, transparent 70%, rgba(0,0,0,.36))" }} />
    {behind}
    {src && behind && n > 0 ? <AbsoluteFill style={{ transform: `scale(${zoom})` }}><Img src={staticFile(`mattes/${name}/${pad3(Math.min(n, from + f + 1))}.webp`)} style={{ ...fit, filter: `brightness(${dim}) contrast(1.06) saturate(1.08)` }} /></AbsoluteFill> : null}
    {children}
  </AbsoluteFill>;
};

// ---- the app, as a close-up of the screen ---------------------------------
// The captured screen fills the frame at an angle, like a macro shot of a
// phone: tilted, edges falling out of focus, a soft glare, scrolling.
const SHOT_W = 1170;
const Macro: React.FC<{ shot: string; shotH: number; from: number; to: number; len: number; rz?: number; rx?: number; ry?: number; scale?: number; x?: number; y?: number }> = ({ shot, shotH, from, to, len, rz = -9, rx = 26, ry = -10, scale = 1.0, x = 0, y = 0 }) => {
  const f = useCurrentFrame(); const W = 900; const k = W / SHOT_W; const viewH = 1560;
  const max = Math.max(0, shotH * k - viewH);
  const scroll = interpolate(f, [4, len - 4], [Math.min(from, max), Math.min(to, max)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const push = interpolate(f, [0, len], [0.94, 1.02]);
  return <AbsoluteFill style={{ background: "#040507", perspective: 1900, perspectiveOrigin: "50% 42%", overflow: "hidden" }}>
    <div style={{ position: "absolute", left: (1080 - W) / 2 + x, top: 330 + y, width: W, height: viewH, transform: `scale(${scale * push}) rotateX(${rx}deg) rotateY(${ry + interpolate(f, [0, len], [-2, 2])}deg) rotateZ(${rz}deg)`, transformOrigin: "50% 45%" }}>
      <div style={{ position: "absolute", inset: -22, borderRadius: 96, background: "linear-gradient(140deg,#3b3d44,#0b0c0f 40%,#26282e)", boxShadow: "0 120px 160px -40px rgba(0,0,0,.9)" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 78, overflow: "hidden", background: "#05060a" }}>
        <Img src={staticFile(`shots/${shot}.png`)} style={{ width: "100%", display: "block", transform: `translateY(${-scroll}px)` }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(112deg, rgba(255,255,255,.13), transparent 26%, transparent 74%, rgba(255,255,255,.05))" }} />
      </div>
    </div>
    {/* depth of field: top and bottom fall out of focus and into shadow */}
    <AbsoluteFill style={{ backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)", maskImage: "linear-gradient(180deg, #000 0%, transparent 24%, transparent 76%, #000 100%)", WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 24%, transparent 76%, #000 100%)" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, transparent 42%, rgba(0,0,0,.72) 100%)" }} />
  </AbsoluteFill>;
};

// ---- the figure: a finger swipes and she turns in 3D ------------------------
const Turn: React.FC<{ len: number }> = ({ len }) => {
  const f = useCurrentFrame(); const inn = useSpring(0, 130);
  const t = interpolate(f, [16, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const deg = t * 180; const back = deg > 90;
  const touchX = interpolate(f, [12, 34], [690, 380], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const touchO = interpolate(f, [8, 13, 33, 38], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#040507", perspective: 1700 }}>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(255,255,255,.07), transparent 60%)" }} />
    <div style={{ position: "absolute", left: 230, top: 1540, width: 620, height: 70, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(0,0,0,.9), transparent 70%)" }} />
    <Img src={staticFile(`shots/body-${back ? "back" : "front"}.png`)} style={{ position: "absolute", left: (1080 - 640) / 2, top: 380, width: 640,
      transform: `translateY(${(1 - inn) * 120}px) rotateY(${back ? deg - 180 : deg}deg) scale(${interpolate(inn, [0, 1], [0.86, 1])})`, opacity: Math.min(1, inn * 1.5), filter: "drop-shadow(0 50px 50px rgba(0,0,0,.7))" }} />
    <div style={{ position: "absolute", left: touchX - 46, top: 1010, width: 92, height: 92, borderRadius: "50%", background: "rgba(255,255,255,.22)", border: "3px solid rgba(255,255,255,.75)", opacity: touchO, boxShadow: "0 0 40px rgba(255,255,255,.35)" }} />
  </AbsoluteFill>;
};
const Legend: React.FC<{ at: number }> = ({ at }) => { const s = useSpring(at);
  return <div style={{ position: "absolute", left: SAFE, right: SAFE, bottom: SAFE + 10, display: "flex", justifyContent: "center", gap: 46, fontFamily: FONT, fontWeight: 800, fontSize: 38, color: "#fff", opacity: s }}>
    <span><i style={{ display: "inline-block", width: 26, height: 26, borderRadius: 7, background: C.pink, marginRight: 14, verticalAlign: -2 }} />Trained</span>
    <span style={{ color: "rgba(255,255,255,.7)" }}><i style={{ display: "inline-block", width: 26, height: 26, borderRadius: 7, background: "#5b6170", marginRight: 14, verticalAlign: -2 }} />Missed</span>
  </div>; };

// ---- three stacked bands of footage, a real number on each -------------------
const Band: React.FC<{ name: ClipName; i: number; n: string; unit?: string; label: string; c: string; pos: string }> = ({ name, i, n, unit, label, c, pos }) => {
  const s = useSpring(i * 4, 150); const src = clips[name]; const H = 1920 / 3;
  return <div style={{ position: "absolute", left: 0, right: 0, top: i * H, height: H - (i < 2 ? 6 : 0), overflow: "hidden", transform: `translateX(${(1 - s) * (i % 2 ? 1080 : -1080)}px)`, background: "#0a0b0e" }}>
    {src ? <OffthreadVideo src={staticFile(src)} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: pos, filter: "brightness(.62) contrast(1.06)" }} /> : null}
    <Num n={n} unit={unit} label={label} c={c} at={5 + i * 4} style={{ left: SAFE, top: i === 0 ? SAFE + 30 : 150 }} />
  </div>;
};

// ---- shots: nothing on screen longer than 2 seconds ---------------------------
type Shot = { len: number; el: (len: number) => React.ReactNode };
const MID = 760;   // y for words over footage
const TOP = SAFE + 40;   // y for words over a screen close-up
const SHOTS: Shot[] = [
  { len: 48, el: (len) => <Footage name="gym" len={len} behind={<Build y={520} words={[{ t: "Your" }, { t: "gym" }, { t: "still" }, { t: "runs" }, { t: "on", br: true }, { t: "paper.", k: true, c: C.pink }]} step={4} size={108} />} /> },
  { len: 50, el: (len) => <><Macro shot="home" shotH={3753} from={0} to={420} len={len} /><Build y={TOP} words={[{ t: "Mine" }, { t: "runs" }, { t: "on" }, { t: "this.", k: true }]} step={4} /></> },
  { len: 46, el: (len) => <><Macro shot="lifts" shotH={2532} from={0} to={520} len={len} rz={8} ry={12} /><Pair left="Every" right="lift." y={TOP} /></> },
  { len: 56, el: (len) => <><Macro shot="lift-deadlift" shotH={2532} from={0} to={40} len={len} rz={-6} rx={22} scale={1.12} y={-60} /><Pair left="Every" right="PR." y={TOP} c={C.pink} />
      <Num n="175" unit="lb x 3" label="Deadlift · Nov 16" c={C.pink} at={12} style={{ left: SAFE, bottom: SAFE + 20 }} /></> },
  { len: 60, el: (len) => <><Turn len={len} /><Pair left="Every" right="muscle." y={TOP} c={C.pink} /><Legend at={10} /></> },
  { len: 44, el: (len) => <Footage name="run" len={len} dim={0.6} behind={<Pair left="Every" right="run." y={MID} c={C.blue} />} /> },
  { len: 54, el: () => <AbsoluteFill style={{ background: "#000" }}>
      <Band name="gym" i={0} n="+11" label="Lift days" c={C.teal} pos="50% 70%" /><Band name="run" i={1} n="+205" unit="min" label="Cardio" c={C.blue} pos="50% 80%" /><Band name="beach" i={2} n="+13,035" unit="lb" label="Moved, vs last month" c={C.pink} pos="50% 40%" /></AbsoluteFill> },
  { len: 48, el: (len) => <><Macro shot="coach-class" shotH={2532} from={0} to={300} len={len} rz={7} ry={10} /><Pair left="Every" right="member." y={TOP} /></> },
  { len: 44, el: (len) => <><Macro shot="coach-calendar" shotH={2688} from={140} to={520} len={len} rz={-8} /><Pair left="Every" right="month." y={TOP} c={C.blue} /></> },
  { len: 46, el: (len) => <><Macro shot="nutrition" shotH={2568} from={0} to={260} len={len} rz={6} ry={9} /><Pair left="Every" right="macro." y={TOP} /></> },
  { len: 52, el: (len) => <Footage name="beach" len={len} dim={0.7}><div style={{ position: "absolute", left: SAFE, top: 140 }}><Word t="Your gym." at={2} size={98} /></div><div style={{ position: "absolute", left: SAFE, top: 256 }}><Word t="Your app." at={14} size={98} /></div><div style={{ position: "absolute", left: SAFE, top: 372 }}><Word t="Built for you." at={26} size={98} k /></div></Footage> },
  { len: 52, el: (len) => <Footage name="beach" len={len} from={52} dim={0.38}><EndCard /></Footage> },
];

const EndCard: React.FC = () => { const a = useSpring(2, 170), b = useSpring(12, 170);
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
    <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -5, color: "#fff", opacity: a, transform: `scale(${interpolate(a, [0, 1], [0.9, 1])})` }}>BERMO<span style={{ color: C.teal }}>.</span></div>
    <div style={{ fontSize: 33, fontWeight: 600, letterSpacing: 0.5, color: "rgba(255,255,255,.85)", marginTop: 18, opacity: b, transform: `translateY(${(1 - b) * 16}px)` }}>Custom apps for gyms · bermocollective.com</div>
  </AbsoluteFill>; };

export const Ad: React.FC = () => {
  let at = 0;
  return <AbsoluteFill style={{ background: "#000" }}>
    <style>{fontFace}</style>
    {SHOTS.map((s, i) => { const from = at; at += s.len; return <Sequence key={i} from={from} durationInFrames={s.len} layout="none"><AbsoluteFill>{s.el(s.len)}</AbsoluteFill></Sequence>; })}
  </AbsoluteFill>;
};

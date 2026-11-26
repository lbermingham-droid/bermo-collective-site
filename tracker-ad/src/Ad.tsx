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
// A full iPhone, rendered to real proportions (6.3in, 1206 x 2622 screen),
// held at ONE steady angle for every shot. No pointer is ever drawn: like
// pro app ads, the app itself reacts — the pressed row dims, then the
// screen changes — and pages scroll with a natural ease and settle.
const PW = 664, BEZ = 17, BAND = 6;                      // device width, glass bezel, titanium band
const SW = PW - BEZ * 2, SH = Math.round(SW * 2622 / 1206), PH = SH + BEZ * 2;
const PT = SW / 393;                                      // iOS points -> px
const STATUS_H = Math.round(54 * PT), NAV_H = Math.round(SW * 201 / 1170), HOME_H = Math.round(21 * PT);
const VIEW_H = SH - STATUS_H - NAV_H - HOME_H;
const NAVS: Record<string, string> = { home: "dashboard", lifts: "lifts", "lift-deadlift": "lifts", nutrition: "nutrition", "coach-class": "more", "coach-class-a": "more", "coach-calendar": "more" };
type Press = { x: number; y: number; w: number; h: number; at: number; r?: number };   // app CSS px, page coordinates
const Macro: React.FC<{ shot: string; shotH: number; from: number; to: number; len: number; scrollEnd?: number; press?: Press; swap?: { shot: string; at: number }; bg?: ClipName }> = ({ shot, shotH, from, to, len, scrollEnd, press, swap, bg = "gym" }) => {
  const f = useCurrentFrame(); const inn = useSpring(0, 120);
  const k = SW / SHOT_W; const max = Math.max(0, shotH * k - VIEW_H); const sc = SW / 900;   // scroll values were authored at 900px
  const s1 = scrollEnd || len - 6;
  const scroll = interpolate(f, [6, s1], [Math.min(from * sc, max), Math.min(to * sc, max)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.22, 0.9, 0.24, 1) });
  const img = swap && f >= swap.at ? swap.shot : shot;
  const pressO = press ? interpolate(f, [press.at, press.at + 2, press.at + 6, press.at + 9], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const drift = interpolate(f, [0, len], [-0.8, 0.8]);
  const depth = Array.from({ length: 9 }, (_, i) => i);   // stacked slices give the body real thickness
  const btn = (side: "left" | "right", top: number, h: number) => <div style={{ position: "absolute", [side]: -5, top, width: 7, height: h, borderRadius: 4, background: "linear-gradient(90deg,#9a9da5,#4a4c53 45%,#2a2c31)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.35)" }} />;
  const bgSrc = clips[bg];
  return <AbsoluteFill style={{ background: "#050608", perspective: 1700, perspectiveOrigin: "50% 62%" }}>
    {bgSrc ? <AbsoluteFill style={{ transform: `scale(${interpolate(f, [0, len], [1.22, 1.3])})` }}><OffthreadVideo src={staticFile(bgSrc)} muted playbackRate={0.6} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(34px) brightness(.5) saturate(.9)" }} /></AbsoluteFill> : null}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 52%, rgba(5,6,8,.15) 0%, rgba(5,6,8,.62) 62%, rgba(5,6,8,.9) 100%)" }} />
    <div style={{ position: "absolute", left: (1080 - PW) / 2 - 40, top: 1760, width: PW + 80, height: 70, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(0,0,0,.95), transparent 70%)", filter: "blur(6px)" }} />
    <div style={{ position: "absolute", left: (1080 - PW) / 2, top: 345, width: PW, height: PH, transformStyle: "preserve-3d",
        // held-in-hand POV: looking down at it, top tilted away, turned the way a right hand holds a phone, close enough to read
        transformOrigin: "50% 42%", transform: `translate(-14px, ${(1 - inn) * 60 + 44}px) scale(${1.07 * interpolate(inn, [0, 1], [0.96, 1]) * interpolate(f, [0, len], [1, 1.025])}) rotateX(19deg) rotateY(${-4 + drift}deg) rotateZ(-4deg)` }}>
      {depth.map(i => <div key={i} style={{ position: "absolute", inset: 0, borderRadius: 104, transform: `translateZ(${-i * 3}px)`, background: i === 0 ? "transparent" : "linear-gradient(90deg,#6b6e76,#2c2e34 30%,#55585f 70%,#1d1e22)" }} />)}
      {btn("left", 214, 50)}{btn("left", 306, 96)}{btn("left", 422, 96)}{btn("right", 340, 150)}
      {/* titanium band: brushed gradient + a hairline specular edge */}
      <div style={{ position: "absolute", inset: 0, borderRadius: 104, background: "linear-gradient(125deg,#a9acb4 0%,#4b4d54 16%,#8a8d95 38%,#3a3c42 60%,#7c7f87 82%,#33353a 100%)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,.28), inset 0 0 6px rgba(0,0,0,.6), 0 70px 110px -30px rgba(0,0,0,.85)" }} />
      <div style={{ position: "absolute", left: 0, top: 150, width: BAND, height: 5, background: "#1b1c20" }} /><div style={{ position: "absolute", right: 0, top: 150, width: BAND, height: 5, background: "#1b1c20" }} />
      <div style={{ position: "absolute", left: 0, bottom: 150, width: BAND, height: 5, background: "#1b1c20" }} /><div style={{ position: "absolute", right: 0, bottom: 150, width: BAND, height: 5, background: "#1b1c20" }} />
      {/* black glass */}
      <div style={{ position: "absolute", inset: BAND, borderRadius: 98, background: "#000", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.07)" }} />
      <div style={{ position: "absolute", left: BEZ, top: BEZ, width: SW, height: SH, borderRadius: 88, overflow: "hidden", background: "#05060a" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: STATUS_H, height: VIEW_H, overflow: "hidden" }}>
          <Img src={staticFile(`shots/${img}.png`)} style={{ width: "100%", display: "block", transform: `translateY(${-scroll}px)` }} />
          {swap && swap.shot !== shot ? <Img src={staticFile(`shots/${swap.shot}.png`)} style={{ position: "absolute", left: 0, top: 0, width: "100%", opacity: 0 }} /> : null}
          {press ? <div style={{ position: "absolute", left: press.x * PT * (393 / 390), top: press.y * PT * (393 / 390) - scroll, width: press.w * PT, height: press.h * PT, borderRadius: (press.r ?? 14) * PT, background: "rgba(255,255,255,.16)", opacity: pressO }} /> : null}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: STATUS_H, background: "#05060a", fontFamily: FONT, color: "#fff" }}>
          <div style={{ position: "absolute", left: 54, top: 29, fontSize: 27, fontWeight: 600, letterSpacing: -0.3 }}>9:41</div>
          <div style={{ position: "absolute", left: "50%", top: 18, width: Math.round(124 * PT), height: Math.round(36 * PT), marginLeft: -Math.round(62 * PT), borderRadius: 40, background: "#000" }}>
            <div style={{ position: "absolute", right: 22, top: "50%", width: 20, height: 20, marginTop: -10, borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #2a3350, #07080d 60%)", boxShadow: "0 0 0 2px #0c0d12" }} />
          </div>
          <div style={{ position: "absolute", right: 46, top: 31, display: "flex", alignItems: "center", gap: 9 }}>
            <svg width="30" height="20" viewBox="0 0 27 18"><rect x="0" y="12" width="5" height="6" rx="1.2" fill="#fff" /><rect x="7" y="8" width="5" height="10" rx="1.2" fill="#fff" /><rect x="14" y="4" width="5" height="14" rx="1.2" fill="#fff" /><rect x="21" y="0" width="5" height="18" rx="1.2" fill="#fff" /></svg>
            <svg width="29" height="20" viewBox="0 0 26 18"><path d="M13 16.5 9.6 13a4.8 4.8 0 0 1 6.8 0z M5 8.4a11.3 11.3 0 0 1 16 0l-2 2a8.5 8.5 0 0 0-12 0z M0.6 4a17.6 17.6 0 0 1 24.8 0l-2 2a14.8 14.8 0 0 0-20.8 0z" fill="#fff" /></svg>
            <svg width="44" height="21" viewBox="0 0 40 19"><rect x="0.8" y="0.8" width="34" height="17.4" rx="5.5" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.6" /><rect x="3.2" y="3.2" width="29.2" height="12.6" rx="3.4" fill="#fff" /><rect x="36.4" y="6" width="2.8" height="7" rx="1.4" fill="rgba(255,255,255,.5)" /></svg>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: NAV_H + HOME_H, background: "#0a0b10" }}>
          <Img src={staticFile(`shots/nav-${NAVS[shot] || "dashboard"}.png`)} style={{ width: "100%", display: "block" }} />
          <div style={{ position: "absolute", left: "50%", bottom: 12, width: Math.round(139 * PT), height: 8, marginLeft: -Math.round(69.5 * PT), borderRadius: 4, background: "#fff" }} />
        </div>
        {/* glass: a soft window reflection and a darkened rim */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.03) 22%, transparent 38%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: 88, boxShadow: "inset 0 0 26px rgba(0,0,0,.55)", pointerEvents: "none" }} />
      </div>
    </div>
  </AbsoluteFill>;
};

// ---- the figure ----------------------------------------------------------
const FIG: React.CSSProperties = { position: "absolute", left: (1080 - 640) / 2, top: 380, width: 640 };
const Floor: React.FC = () => <><AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(255,255,255,.07), transparent 60%)" }} />
  <div style={{ position: "absolute", left: 230, top: 1540, width: 620, height: 70, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(0,0,0,.9), transparent 70%)" }} /></>;
// A: she arrives grey, then the muscles this workout used light up.
const LightUp: React.FC = () => {
  const f = useCurrentFrame(); const inn = useSpring(0, 130);
  const on = interpolate(f, [13, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const flash = interpolate(f, [13, 20, 32], [0, 1, 0.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t = `translateY(${(1 - inn) * 120}px) scale(${interpolate(inn, [0, 1], [0.86, 1])})`;
  return <AbsoluteFill style={{ background: "#040507" }}><Floor />
    <Img src={staticFile("shots/body-front-off.png")} style={{ ...FIG, transform: t, opacity: Math.min(1, inn * 1.5), filter: "drop-shadow(0 50px 50px rgba(0,0,0,.7))" }} />
    <Img src={staticFile("shots/body-front.png")} style={{ ...FIG, transform: t, opacity: on, filter: `drop-shadow(0 0 ${30 + flash * 50}px rgba(255,77,157,${0.12 + flash * 0.5}))` }} />
  </AbsoluteFill>;
};
// B: a finger swipes and she turns in 3D; then the app's suggestion lands.
const Turn: React.FC = () => {
  const f = useCurrentFrame();
  const t = interpolate(f, [8, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const deg = t * 180; const back = deg > 90;
  const touchX = interpolate(f, [5, 26], [700, 380], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const touchO = interpolate(f, [2, 6, 25, 30], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = useSpring(27, 190);
  return <AbsoluteFill style={{ background: "#040507", perspective: 1700 }}><Floor />
    <Img src={staticFile(`shots/body-${back ? "back" : "front"}.png`)} style={{ ...FIG, transform: `rotateY(${back ? deg - 180 : deg}deg)`, filter: "drop-shadow(0 0 26px rgba(255,77,157,.2)) drop-shadow(0 50px 50px rgba(0,0,0,.7))" }} />
    <div style={{ position: "absolute", left: SAFE, right: SAFE, bottom: SAFE, padding: "26px 32px", borderRadius: 26, fontFamily: FONT, opacity: s, transform: `translateY(${(1 - s) * 50}px)`,
        background: "rgba(22,24,30,.62)", backdropFilter: "blur(26px)", WebkitBackdropFilter: "blur(26px)", border: `2px solid ${C.teal}`, boxShadow: "inset 0 1.5px 0 rgba(255,255,255,.3), 0 30px 60px -20px rgba(0,0,0,.8)" }}>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", color: C.teal }}>Chest was missed · try</div>
      <div style={{ fontSize: 50, fontWeight: 800, letterSpacing: -1.5, color: "#fff", marginTop: 6 }}>Incline Dumbbell Press</div>
    </div>
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
const MID = 760;        // y for words over footage
const TOP = SAFE + 40;  // y for words over a screen close-up
// "Every lift." — the two words sit together; only the last one changes.
const Every: React.FC<{ w: string; c?: string; y?: number; lead?: string; tail?: string }> = ({ w, c, y = TOP, lead = "Every", tail }) =>
  <Build y={y} step={6} words={[{ t: lead }, { t: w, k: true, c }, ...(tail ? [{ t: tail }] : [])]} />;
const SHOTS: Shot[] = [
  { len: 46, el: (len) => <Footage name="gym" len={len} behind={<Build y={520} words={[{ t: "Your" }, { t: "gym" }, { t: "still" }, { t: "runs" }, { t: "on", br: true }, { t: "paper.", k: true, c: C.pink }]} step={4} size={108} />} /> },
  { len: 48, el: (len) => <><Macro shot="home" shotH={3753} from={0} to={520} len={len} /><Build y={TOP} words={[{ t: "Mine" }, { t: "runs" }, { t: "on" }, { t: "this.", k: true }]} step={4} /></> },
  { len: 46, el: (len) => <><Macro shot="lifts" shotH={2532} from={0} to={250} len={len} scrollEnd={24} press={{ x: 12, y: 302, w: 366, h: 76, at: 31 }} /><Every w="lift." /></> },
  { len: 54, el: (len) => <><Macro shot="lift-deadlift" shotH={2532} from={0} to={0} len={len} /><Every w="PR." c={C.pink} />
      <Num n="175" unit="lb x 3" label="Deadlift · Nov 16" c={C.pink} at={12} style={{ right: SAFE + 6, top: SAFE + 24, textAlign: "right", transform: "scale(.56)", transformOrigin: "100% 0%" }} /></> },
  { len: 50, el: () => <><LightUp /><Every w="muscle." c={C.pink} /><Legend at={20} /></> },
  { len: 50, el: () => <><Turn /><Build y={TOP} step={5} words={[{ t: "Add" }, { t: "one" }, { t: "more.", k: true }]} /></> },
  { len: 42, el: (len) => <Footage name="run" len={len} dim={0.6} behind={<Every w="run." c={C.blue} y={MID} />} /> },
  { len: 52, el: () => <AbsoluteFill style={{ background: "#000" }}>
      <Band name="gym" i={0} n="+11" label="Lift days" c={C.teal} pos="50% 70%" /><Band name="run" i={1} n="+205" unit="min" label="Cardio" c={C.blue} pos="50% 80%" /><Band name="beach" i={2} n="+13,035" unit="lb" label="Moved, vs last month" c={C.pink} pos="50% 40%" /></AbsoluteFill> },
  { len: 48, el: (len) => <><Macro bg="beach" shot="coach-class-a" shotH={2532} from={0} to={300} len={len} scrollEnd={20} press={{ x: 12, y: 591, w: 366, h: 47, at: 26, r: 0 }} swap={{ shot: "coach-class", at: 29 }} /><Every w="member." /></> },
  { len: 44, el: (len) => <><Macro bg="beach" shot="coach-calendar" shotH={2688} from={120} to={560} len={len} /><Every w="month," c={C.blue} tail="planned." /></> },
  { len: 44, el: (len) => <><Macro bg="beach" shot="nutrition" shotH={2568} from={0} to={300} len={len} /><Every w="macro." lead="Even every" /></> },
  { len: 40, el: (len) => <Footage name="beach" len={len} dim={0.7}><div style={{ position: "absolute", left: SAFE, top: 140 }}><Word t="Your gym." at={1} size={98} /></div><div style={{ position: "absolute", left: SAFE, top: 256 }}><Word t="Your app." at={10} size={98} /></div><div style={{ position: "absolute", left: SAFE, top: 372 }}><Word t="Built for you." at={19} size={98} k /></div></Footage> },
  { len: 36, el: (len) => <Footage name="beach" len={len} from={40} dim={0.38}><EndCard /></Footage> },
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

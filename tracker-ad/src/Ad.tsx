import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import clips from "./clips.json";

// 1080 x 1920 Instagram reel. Everything that matters stays inside a
// 120px safe margin: captions live in the top band, the phone / clip /
// figure lives in the stage below it, so text never covers the subject.
export const FPS = 30;
export const DURATION = 600; // 20s
const SAFE = 120;
const C = { bg: "#05060a", teal: "#00f5d4", blue: "#4db8ff", purple: "#b788ff", pink: "#ff4d9d", text: "#ffffff", mute: "#8b93a1" };
const FONT = "InterTight";
const fontFace = `@font-face{font-family:${FONT};font-weight:800;src:url(${staticFile("fonts/intertight-800.woff2")}) format("woff2")}
@font-face{font-family:${FONT};font-weight:600;src:url(${staticFile("fonts/intertight-600.woff2")}) format("woff2")}`;

const useIn = (delay = 0, stiffness = 150) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return spring({ frame: f - delay, fps, config: { damping: 17, stiffness, mass: 0.8 } }); };
// every shot leaves fast: last 5 frames scale down + fade
const useOut = (len: number) => { const f = useCurrentFrame(); return interpolate(f, [len - 5, len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) }); };

const Backdrop: React.FC = () => {
  const f = useCurrentFrame(); const t = f / 30;
  return <AbsoluteFill style={{ background: C.bg }}>
    <div style={{ position: "absolute", width: 1300, height: 1300, left: -420 + Math.sin(t * 0.7) * 90, top: -260, borderRadius: "50%", background: `radial-gradient(circle, ${C.teal}2e, transparent 62%)` }} />
    <div style={{ position: "absolute", width: 1400, height: 1400, right: -520 + Math.cos(t * 0.6) * 110, bottom: -420, borderRadius: "50%", background: `radial-gradient(circle, ${C.blue}2a, transparent 62%)` }} />
    <div style={{ position: "absolute", width: 900, height: 900, left: 240, top: 700 + Math.sin(t) * 60, borderRadius: "50%", background: `radial-gradient(circle, ${C.pink}14, transparent 60%)` }} />
    <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "120px 120px", maskImage: "radial-gradient(ellipse at 50% 45%, #000 20%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 45%, #000 20%, transparent 75%)" }} />
  </AbsoluteFill>;
};

// Caption band: top of the safe area, never over the stage.
const Caption: React.FC<{ kicker?: string; lines: React.ReactNode[]; len: number }> = ({ kicker, lines, len }) => {
  const out = useOut(len);
  return <div style={{ position: "absolute", left: SAFE, right: SAFE, top: SAFE, height: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end", opacity: 1 - out, fontFamily: FONT }}>
    {kicker ? <Line i={0} style={{ fontSize: 30, fontWeight: 600, letterSpacing: 6, textTransform: "uppercase", color: C.teal, marginBottom: 14 }}>{kicker}</Line> : null}
    {lines.map((l, i) => <Line key={i} i={i + (kicker ? 1 : 0)} style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2.5, color: C.text }}>{l}</Line>)}
  </div>;
};
const Line: React.FC<{ i: number; style: React.CSSProperties; children: React.ReactNode }> = ({ i, style, children }) => {
  const s = useIn(2 + i * 3, 190);
  return <div style={{ overflow: "hidden" }}><div style={{ ...style, transform: `translateY(${(1 - s) * 110}%)`, filter: `blur(${(1 - s) * 8}px)` }}>{children}</div></div>;
};
const Hi: React.FC<{ c?: string; children: React.ReactNode }> = ({ c = C.teal, children }) => <span style={{ color: c }}>{children}</span>;

// The stage: everything below the caption band, inside the safe margin.
const STAGE = { left: SAFE, top: 450, width: 1080 - SAFE * 2, height: 1920 - SAFE - 450 }; // 840 x 1350
const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ position: "absolute", ...STAGE, perspective: 2400, perspectiveOrigin: "50% 40%" }}>{children}</div>;

const PHONE_W = 600, PHONE_H = 1300, SHOT_W = 1170;
// A phone showing a real captured screen that scrolls like it is in use.
const Phone: React.FC<{ shot: string; shotH: number; from: number; to: number; len: number; ry?: [number, number]; rx?: number; x?: number; children?: React.ReactNode }> = ({ shot, shotH, from, to, len, ry = [-26, -9], rx = 7, x = 0, children }) => {
  const f = useCurrentFrame(); const s = useIn(0, 120); const out = useOut(len);
  const k = (PHONE_W - 24) / SHOT_W; const max = Math.max(0, shotH * k - (PHONE_H - 24));
  const scroll = interpolate(f, [8, len - 8], [Math.min(from, max), Math.min(to, max)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const rot = interpolate(s, [0, 1], [ry[0] - 30, ry[0]]) + interpolate(f, [0, len], [0, ry[1] - ry[0]]);
  return <div style={{ position: "absolute", left: (STAGE.width - PHONE_W) / 2 + x, top: 20, width: PHONE_W, height: PHONE_H, transformStyle: "preserve-3d",
      transform: `translateY(${(1 - s) * 500}px) rotateY(${rot}deg) rotateX(${rx}deg) scale(${interpolate(s, [0, 1], [0.8, 1]) * (1 - out * 0.12)})`, opacity: Math.min(1, s * 1.6) * (1 - out) }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 84, background: "linear-gradient(145deg,#2b2e38,#0d0e13)", boxShadow: `0 80px 140px -30px rgba(0,0,0,.9), 0 0 0 2px rgba(255,255,255,.08), 0 0 120px -10px ${C.teal}40` }} />
    <div style={{ position: "absolute", inset: 12, borderRadius: 72, overflow: "hidden", background: "#05060a" }}>
      <Img src={staticFile(`shots/${shot}.png`)} style={{ width: "100%", display: "block", transform: `translateY(${-scroll}px)` }} />
      <div style={{ position: "absolute", left: "50%", top: 16, width: 170, height: 40, marginLeft: -85, borderRadius: 24, background: "#000" }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 72, background: "linear-gradient(120deg, rgba(255,255,255,.10), transparent 32%)", pointerEvents: "none" }} />
    </div>
    {children}
  </div>;
};

// A glass chip floating in front of the phone on its own depth layer.
const Chip: React.FC<{ x: number; y: number; z?: number; delay?: number; c?: string; big: string; small: string }> = ({ x, y, z = 160, delay = 12, c = C.teal, big, small }) => {
  const s = useIn(delay, 200); const f = useCurrentFrame();
  return <div style={{ position: "absolute", left: x, top: y + Math.sin((f + delay * 7) / 14) * 6, transform: `translateZ(${z}px) scale(${s})`, opacity: s, padding: "20px 26px", borderRadius: 26, fontFamily: FONT,
      background: "linear-gradient(180deg, rgba(34,38,48,.92), rgba(14,16,22,.94))", border: `2px solid ${c}`, boxShadow: `0 30px 60px -18px rgba(0,0,0,.85), 0 0 50px -8px ${c}66, inset 0 1px 0 rgba(255,255,255,.18)`, whiteSpace: "nowrap" }}>
    <div style={{ fontSize: 46, fontWeight: 800, color: "#fff", letterSpacing: -1.5, lineHeight: 1 }}>{big}</div>
    <div style={{ fontSize: 20, fontWeight: 600, color: c, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 8 }}>{small}</div>
  </div>;
};

// A slot for Lexi's own footage. Real clip if present, labelled card if not.
const ClipCard: React.FC<{ name: keyof typeof clips; label: string; len: number; startFrom?: number; ry?: number; children?: React.ReactNode }> = ({ name, label, len, startFrom = 0, ry = 10, children }) => {
  const s = useIn(0, 130); const out = useOut(len); const f = useCurrentFrame(); const src = clips[name];
  return <div style={{ position: "absolute", left: 30, top: 20, width: STAGE.width - 60, height: 1280, transformStyle: "preserve-3d",
      transform: `translateY(${(1 - s) * 420}px) rotateY(${interpolate(f, [0, len], [ry, ry * 0.3])}deg) rotateX(4deg) scale(${interpolate(s, [0, 1], [0.86, 1]) * (1 - out * 0.1)})`, opacity: Math.min(1, s * 1.6) * (1 - out) }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 56, overflow: "hidden", background: "linear-gradient(160deg,#151821,#0a0b10)", boxShadow: `0 80px 140px -30px rgba(0,0,0,.9), 0 0 0 2px rgba(255,255,255,.10), 0 0 110px -14px ${C.blue}55` }}>
      {src ? <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${interpolate(f, [0, len], [1.08, 1])})` }} />
        : <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT, backgroundImage: `repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 26px, transparent 26px 52px)` }}>
            <div style={{ width: 150, height: 150, borderRadius: "50%", border: `3px solid ${C.blue}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 34 }}><div style={{ width: 0, height: 0, borderLeft: `46px solid ${C.blue}`, borderTop: "30px solid transparent", borderBottom: "30px solid transparent", marginLeft: 12 }} /></div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: 6, color: C.blue, textTransform: "uppercase" }}>Your clip goes here</div>
            <div style={{ fontSize: 60, fontWeight: 800, color: "#fff", marginTop: 12, letterSpacing: -1.5 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: C.mute, marginTop: 14 }}>public/clips/{name}.mp4</div>
          </AbsoluteFill>}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(255,255,255,.09), transparent 30%)" }} />
    </div>
    {children}
  </div>;
};

// The body figure as a free-floating cutout with a glow, on its own layer.
const Body: React.FC<{ side: "front" | "back"; len: number; flipIn?: boolean; children?: React.ReactNode }> = ({ side, len, flipIn, children }) => {
  const s = useIn(0, 110); const out = useOut(len); const f = useCurrentFrame();
  const ry = flipIn ? interpolate(s, [0, 1], [-180, 0]) + interpolate(f, [0, len], [8, -8]) : interpolate(f, [0, len], [-14, 10]);
  return <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", opacity: (1 - out) }}>
    <div style={{ position: "absolute", left: 140, top: 250, width: 560, height: 900, borderRadius: "50%", background: `radial-gradient(ellipse, ${C.pink}33, ${C.purple}22 40%, transparent 68%)`, transform: `translateZ(-200px) scale(${s})` }} />
    <div style={{ position: "absolute", left: 130, top: 1235, width: 580, height: 70, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(0,0,0,.75), transparent 70%)", transform: "translateZ(-80px)" }} />
    <Img src={staticFile(`shots/body-${side}.png`)} style={{ position: "absolute", left: (STAGE.width - 600) / 2, top: 10, width: 600, backfaceVisibility: "hidden",
      transform: `translateY(${flipIn ? 0 : (1 - s) * 300}px) rotateY(${ry}deg) scale(${interpolate(s, [0, 1], [flipIn ? 1 : 0.8, 1]) * (1 - out * 0.1)})`, opacity: flipIn ? 1 : Math.min(1, s * 1.5), filter: "drop-shadow(0 40px 50px rgba(0,0,0,.7))" }} />
    {children}
  </div>;
};
const Tag: React.FC<{ x: number; y: number; c: string; t: string; d: number }> = ({ x, y, c, t, d }) => { const s = useIn(d, 220);
  return <div style={{ position: "absolute", left: x, top: y, transform: `translateZ(180px) scale(${s})`, opacity: s, fontFamily: FONT, fontSize: 25, fontWeight: 800, color: "#fff", padding: "11px 16px", borderRadius: 18, background: "rgba(14,16,22,.92)", border: `2px solid ${c}`, boxShadow: `0 0 40px -8px ${c}88`, whiteSpace: "nowrap" }}><span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: c, marginRight: 12 }} />{t}</div>; };

// ---------------------------------------------------------------- shots
type Shot = { len: number; el: (len: number) => React.ReactNode };
const SHOTS: Shot[] = [
  { len: 45, el: (len) => <><Caption len={len} kicker="Gym owners" lines={[<>Still running on</>, <>a <Hi c={C.pink}>spreadsheet?</Hi></>]} /><Stage><ClipCard name="gym" label="Gym: lifting" len={len} /></Stage></> },
  { len: 55, el: (len) => <><Caption len={len} lines={[<>One app.</>, <>Built for <Hi>your gym.</Hi></>]} /><Stage><Phone shot="home" shotH={3753} from={0} to={300} len={len} /></Stage></> },
  { len: 50, el: (len) => <><Caption len={len} kicker="vs last month" lines={[<>Progress you</>, <>can <Hi>prove.</Hi></>]} /><Stage><Phone shot="home" shotH={3753} from={300} to={470} len={len} ry={[10, 18]}>
      <Chip x={30} y={1080} big="+11" small="lift days" delay={10} /><Chip x={270} y={1080} big="+13,035 lb" small="weight moved" delay={16} c={C.blue} /></Phone></Stage></> },
  { len: 50, el: (len) => <><Caption len={len} lines={[<>Every lift.</>, <>Every <Hi c={C.blue}>date.</Hi></>]} /><Stage><Phone shot="lifts" shotH={2532} from={0} to={560} len={len} ry={[-20, -6]} /></Stage></> },
  { len: 60, el: (len) => <><Caption len={len} kicker="Nov 16, 2026" lines={[<>Deadlift.</>, <><Hi c={C.pink}>New PR.</Hi></>]} /><Stage><Phone shot="lift-deadlift" shotH={2532} from={0} to={120} len={len} ry={[16, 4]}>
      <Chip x={10} y={900} z={220} big="175 lb × 3" small="personal record" delay={9} c={C.pink} /><Chip x={270} y={1070} z={180} big="193 lb" small="est. one-rep max" delay={17} c={C.purple} /></Phone></Stage></> },
  { len: 55, el: (len) => <><Caption len={len} lines={[<>See what's</>, <>been <Hi c={C.pink}>trained.</Hi></>]} /><Stage><Body side="front" len={len}><Tag x={14} y={930} c={C.pink} t="Quads · yesterday" d={12} /><Tag x={520} y={1040} c={C.purple} t="Shoulders · 4 days" d={18} /></Body></Stage></> },
  { len: 50, el: (len) => <><Caption len={len} lines={[<>Front</>, <>and <Hi c={C.purple}>back.</Hi></>]} /><Stage><Body side="back" len={len} flipIn><Tag x={525} y={930} c={C.pink} t="Glutes · yesterday" d={14} /><Tag x={14} y={1040} c={C.pink} t="Lats · yesterday" d={20} /></Body></Stage></> },
  { len: 45, el: (len) => <><Caption len={len} kicker="Cardio counts" lines={[<>Runs, walks,</>, <><Hi c={C.blue}>all of it.</Hi></>]} /><Stage><ClipCard name="run" label="Outside: the run" len={len} ry={-10}><Chip x={210} y={1090} z={160} big="+205 min" small="cardio vs last month" delay={10} c={C.blue} /></ClipCard></Stage></> },
  { len: 45, el: (len) => <><Caption len={len} lines={[<>Snap your</>, <><Hi>food.</Hi></>]} /><Stage><ClipCard name="food" label="Food photo" len={len} ry={9} /></Stage></> },
  { len: 50, el: (len) => <><Caption len={len} kicker="Daily targets" lines={[<>Macros,</>, <><Hi>handled.</Hi></>]} /><Stage><Phone shot="nutrition" shotH={2568} from={0} to={330} len={len} ry={[-18, -5]}>
      <Chip x={40} y={1080} big="1,450" small="calories" delay={9} /><Chip x={330} y={1080} big="130 g" small="protein" delay={15} c={C.blue} /></Phone></Stage></> },
  { len: 50, el: (len) => <><Caption len={len} kicker="For coaches" lines={[<>The whole class.</>, <><Hi>One sheet.</Hi></>]} /><Stage><Phone shot="coach-class" shotH={2532} from={0} to={420} len={len} ry={[18, 6]} /></Stage></> },
  { len: 45, el: (len) => <End len={len} /> },
];

const End: React.FC<{ len: number }> = ({ len }) => {
  const a = useIn(2, 160), b = useIn(9, 160), c = useIn(18, 200);
  return <>
    <Stage><ClipCard name="beach" label="Beach: the finish" len={len + 10} ry={-6} /></Stage>
    <div style={{ position: "absolute", left: SAFE, right: SAFE, top: SAFE, height: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end", fontFamily: FONT }}>
      <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: 6, textTransform: "uppercase", color: C.teal, marginBottom: 14, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>BERMO Collective</div>
      <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2.5, color: "#fff", opacity: b, transform: `translateY(${(1 - b) * 40}px)` }}>Custom apps</div>
      <div style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2.5, color: "#fff", opacity: b, transform: `translateY(${(1 - b) * 40}px)` }}>for <Hi>your gym.</Hi></div>
    </div>
    <div style={{ position: "absolute", left: SAFE, right: SAFE, bottom: SAFE, display: "flex", justifyContent: "center" }}>
      <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 800, color: "#03211c", padding: "24px 44px", borderRadius: 24, background: "linear-gradient(180deg,#2ffbe0,#00d9bd)", boxShadow: `0 20px 50px -14px ${C.teal}aa, inset 0 1px 0 rgba(255,255,255,.5)`, transform: `scale(${c})`, opacity: c }}>bermocollective.com</div>
    </div>
  </>;
};

export const Ad: React.FC = () => {
  let at = 0;
  return <AbsoluteFill style={{ background: C.bg }}>
    <style>{fontFace}</style>
    <Backdrop />
    {SHOTS.map((s, i) => { const from = at; at += s.len; return <Sequence key={i} from={from} durationInFrames={s.len} layout="none"><AbsoluteFill>{s.el(s.len)}</AbsoluteFill></Sequence>; })}
  </AbsoluteFill>;
};

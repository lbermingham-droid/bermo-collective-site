import React from "react";
import { AbsoluteFill, Img, Loop, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
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

// Background: her real footage, heavily blurred and darkened. No colour
// gradients. Everything floating above it is frosted glass.
const BG_FOR = (shot: number): keyof typeof clips => shot < 5 ? "gym" : shot < 9 ? "run" : "beach";
const Backdrop: React.FC<{ name: keyof typeof clips }> = ({ name }) => {
  const src = clips[name];
  return <AbsoluteFill style={{ background: "#08090b" }}>
    {src ? <Loop durationInFrames={170}><OffthreadVideo src={staticFile(src)} muted playbackRate={0.5} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.25)", filter: "blur(54px) brightness(.34) saturate(.75)" }} /></Loop> : null}
    <AbsoluteFill style={{ background: "rgba(6,7,9,.42)" }} />
  </AbsoluteFill>;
};
const GLASS: React.CSSProperties = { background: "rgba(26,28,34,.46)", backdropFilter: "blur(26px) saturate(150%)", WebkitBackdropFilter: "blur(26px) saturate(150%)", border: "1.5px solid rgba(255,255,255,.30)", boxShadow: "0 30px 60px -22px rgba(0,0,0,.75), inset 0 1.5px 0 rgba(255,255,255,.38), inset 0 -1px 0 rgba(255,255,255,.06)" };

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
const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => <div style={{ position: "absolute", ...STAGE, perspective: 2600, perspectiveOrigin: "50% 40%" }}>{children}</div>;

// iPhone 16 Pro proportions: 6.3in display at 1206 x 2622 (19.5:9), thin
// even bezel, titanium band, Dynamic Island, side buttons, home indicator.
const PH = { w: 584, bezel: 15, band: 5 };
const SCREEN_W = PH.w - PH.bezel * 2;                    // 554
const SCREEN_H = Math.round(SCREEN_W * 2622 / 1206);    // 1204
const PHONE_H = SCREEN_H + PH.bezel * 2;                // 1234
const K = SCREEN_W / 393;                                // iOS points -> px
const STATUS_H = Math.round(54 * K), NAV_H = Math.round(SCREEN_W * 201 / 1170), HOME_H = Math.round(20 * K);
const SHOT_W = 1170;
const NAV: Record<string, string> = { home: "dashboard", lifts: "lifts", "lift-deadlift": "lifts", nutrition: "nutrition", "coach-class": "more", "coach-calendar": "more", "workout-body": "fitness" };

const Phone: React.FC<{ shot: string; shotH: number; from: number; to: number; len: number; ry?: [number, number]; rx?: number }> = ({ shot, shotH, from, to, len, ry = [-24, -8], rx = 6 }) => {
  const f = useCurrentFrame(); const s = useIn(0, 120); const out = useOut(len);
  const k = SCREEN_W / SHOT_W; const viewH = SCREEN_H - STATUS_H - NAV_H - HOME_H; const max = Math.max(0, shotH * k - viewH);
  const scroll = interpolate(f, [8, len - 8], [Math.min(from, max), Math.min(to, max)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const rot = interpolate(s, [0, 1], [ry[0] - 28, ry[0]]) + interpolate(f, [0, len], [0, ry[1] - ry[0]]);
  const btn = (side: "left" | "right", top: number, h: number) => <div style={{ position: "absolute", [side]: -4, top, width: 5, height: h, borderRadius: 3, background: "linear-gradient(90deg,#5d6068,#2b2d33)" }} />;
  return <div style={{ position: "absolute", left: (STAGE.width - PH.w) / 2, top: 30, width: PH.w, height: PHONE_H,
      transform: `translateY(${(1 - s) * 480}px) rotateY(${rot}deg) rotateX(${rx}deg) scale(${interpolate(s, [0, 1], [0.82, 1]) * (1 - out * 0.12)})`, opacity: Math.min(1, s * 1.6) * (1 - out) }}>
    {btn("left", 190, 44)}{btn("left", 270, 84)}{btn("left", 372, 84)}{btn("right", 300, 132)}
    <div style={{ position: "absolute", inset: 0, borderRadius: 92, background: "linear-gradient(135deg,#8b8e96 0%,#3a3c43 22%,#6f727a 50%,#2a2c32 78%,#7d8088 100%)", boxShadow: "0 90px 120px -40px rgba(0,0,0,.85), 0 30px 50px -20px rgba(0,0,0,.6)" }} />
    <div style={{ position: "absolute", inset: PH.band, borderRadius: 88, background: "#000" }} />
    <div style={{ position: "absolute", left: PH.bezel, top: PH.bezel, width: SCREEN_W, height: SCREEN_H, borderRadius: 78, overflow: "hidden", background: "#05060a" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: STATUS_H, height: viewH, overflow: "hidden" }}>
        <Img src={staticFile(`shots/${shot}.png`)} style={{ width: "100%", display: "block", transform: `translateY(${-scroll}px)` }} />
      </div>
      {/* status bar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: STATUS_H, background: "#05060a", fontFamily: FONT, color: "#fff" }}>
        <div style={{ position: "absolute", left: 46, top: 24, fontSize: 24, fontWeight: 600, letterSpacing: -0.3 }}>9:41</div>
        <div style={{ position: "absolute", left: "50%", top: 16, width: Math.round(126 * K), height: Math.round(37 * K), marginLeft: -Math.round(63 * K), borderRadius: 30, background: "#000" }} />
        <div style={{ position: "absolute", right: 40, top: 27, display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="27" height="18" viewBox="0 0 27 18"><rect x="0" y="12" width="5" height="6" rx="1.2" fill="#fff" /><rect x="7" y="8" width="5" height="10" rx="1.2" fill="#fff" /><rect x="14" y="4" width="5" height="14" rx="1.2" fill="#fff" /><rect x="21" y="0" width="5" height="18" rx="1.2" fill="#fff" /></svg>
          <svg width="26" height="18" viewBox="0 0 26 18"><path d="M13 16.5 9.6 13a4.8 4.8 0 0 1 6.8 0z M5 8.4a11.3 11.3 0 0 1 16 0l-2 2a8.5 8.5 0 0 0-12 0z M0.6 4a17.6 17.6 0 0 1 24.8 0l-2 2a14.8 14.8 0 0 0-20.8 0z" fill="#fff" /></svg>
          <svg width="40" height="19" viewBox="0 0 40 19"><rect x="0.8" y="0.8" width="34" height="17.4" rx="5.5" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.6" /><rect x="3.2" y="3.2" width="29.2" height="12.6" rx="3.4" fill="#fff" /><rect x="36.4" y="6" width="2.8" height="7" rx="1.4" fill="rgba(255,255,255,.5)" /></svg>
        </div>
      </div>
      {/* the app's own tab bar + home indicator */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: NAV_H + HOME_H, background: "#0a0b10" }}>
        <Img src={staticFile(`shots/nav-${NAV[shot] || "dashboard"}.png`)} style={{ width: "100%", display: "block" }} />
        <div style={{ position: "absolute", left: "50%", bottom: 11, width: Math.round(139 * K), height: 7, marginLeft: -Math.round(69.5 * K), borderRadius: 4, background: "#fff" }} />
      </div>
      <div style={{ position: "absolute", inset: 0, borderRadius: 78, background: "linear-gradient(118deg, rgba(255,255,255,.085), transparent 30%)", pointerEvents: "none" }} />
    </div>
  </div>;
};

// A frosted-glass chip floating in front of the stage.
const Chip: React.FC<{ x: number; y: number; delay?: number; c?: string; big: string; small: string }> = ({ x, y, delay = 12, c = C.teal, big, small }) => {
  const s = useIn(delay, 200); const f = useCurrentFrame();
  return <div style={{ position: "absolute", left: x, top: y + Math.sin((f + delay * 7) / 14) * 5 + (1 - s) * 40, transform: `scale(${interpolate(s, [0, 1], [0.85, 1])})`, opacity: s, padding: "20px 28px", borderRadius: 26, fontFamily: FONT, whiteSpace: "nowrap", ...GLASS }}>
    <div style={{ fontSize: 46, fontWeight: 800, color: "#fff", letterSpacing: -1.5, lineHeight: 1 }}>{big}</div>
    <div style={{ fontSize: 20, fontWeight: 600, color: c, letterSpacing: 2.5, textTransform: "uppercase", marginTop: 8 }}>{small}</div>
  </div>;
};

// A slot for Lexi's own footage, framed in glass. Placeholder if missing.
const ClipCard: React.FC<{ name: keyof typeof clips; label: string; len: number; startFrom?: number; ry?: number; children?: React.ReactNode }> = ({ name, label, len, startFrom = 0, ry = 9, children }) => {
  const s = useIn(0, 130); const out = useOut(len); const f = useCurrentFrame(); const src = clips[name];
  return <div style={{ position: "absolute", left: 50, top: 20, width: STAGE.width - 100, height: 1290,
      transform: `translateY(${(1 - s) * 420}px) rotateY(${interpolate(f, [0, len], [ry, ry * 0.25])}deg) rotateX(4deg) scale(${interpolate(s, [0, 1], [0.86, 1]) * (1 - out * 0.1)})`, opacity: Math.min(1, s * 1.6) * (1 - out) }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 60, overflow: "hidden", background: "#0c0d11", border: "2px solid rgba(255,255,255,.32)", boxShadow: "0 90px 120px -40px rgba(0,0,0,.85), inset 0 2px 0 rgba(255,255,255,.35)" }}>
      {src ? <OffthreadVideo src={staticFile(src)} muted startFrom={startFrom} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${interpolate(f, [0, len], [1.07, 1])})` }} />
        : <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT, backgroundImage: `repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 26px, transparent 26px 52px)` }}>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: 6, color: C.blue, textTransform: "uppercase" }}>Your clip goes here</div>
            <div style={{ fontSize: 60, fontWeight: 800, color: "#fff", marginTop: 12, letterSpacing: -1.5 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: C.mute, marginTop: 14 }}>public/clips/{name}.mp4</div>
          </AbsoluteFill>}
    </div>
    {children}
  </div>;
};

// The body figure as a free-floating cutout: pink = worked that session,
// grey = not worked. Sits on a frosted glass plinth.
const Body: React.FC<{ side: "front" | "back"; len: number; flipIn?: boolean; children?: React.ReactNode }> = ({ side, len, flipIn, children }) => {
  const s = useIn(0, 110); const out = useOut(len); const f = useCurrentFrame();
  const ry = flipIn ? interpolate(s, [0, 1], [-180, 0]) + interpolate(f, [0, len], [7, -7]) : interpolate(f, [0, len], [-12, 9]);
  return <div style={{ position: "absolute", inset: 0, opacity: (1 - out) }}>
    <div style={{ position: "absolute", left: 60, top: 40, width: STAGE.width - 120, height: 1270, borderRadius: 60, opacity: s, ...GLASS, background: "rgba(255,255,255,.07)" }} />
    <Img src={staticFile(`shots/body-${side}.png`)} style={{ position: "absolute", left: (STAGE.width - 560) / 2, top: 70, width: 560, backfaceVisibility: "hidden",
      transform: `translateY(${flipIn ? 0 : (1 - s) * 300}px) rotateY(${ry}deg) scale(${interpolate(s, [0, 1], [flipIn ? 1 : 0.8, 1]) * (1 - out * 0.1)})`, opacity: flipIn ? 1 : Math.min(1, s * 1.5), filter: "drop-shadow(0 40px 46px rgba(0,0,0,.6))" }} />
    {children}
  </div>;
};
const Tag: React.FC<{ x: number; y: number; on: boolean; t: string; d: number }> = ({ x, y, on, t, d }) => { const s = useIn(d, 220);
  return <div style={{ position: "absolute", left: x, top: y + (1 - s) * 24, opacity: s, fontFamily: FONT, fontSize: 25, fontWeight: 800, color: on ? "#fff" : "rgba(255,255,255,.72)", padding: "11px 16px", borderRadius: 16, whiteSpace: "nowrap", ...GLASS }}><span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: on ? C.pink : "#5b6170", marginRight: 11 }} />{t}</div>; };

// ---------------------------------------------------------------- shots
type Shot = { len: number; el: (len: number) => React.ReactNode };
const SHOTS: Shot[] = [
  { len: 45, el: (len) => <><Caption len={len} kicker="Gym owners" lines={[<>Still running on</>, <>a <Hi c={C.pink}>spreadsheet?</Hi></>]} /><Stage><ClipCard name="gym" label="Gym: lifting" len={len} /></Stage></> },
  { len: 55, el: (len) => <><Caption len={len} lines={[<>One app.</>, <>Built for <Hi>your gym.</Hi></>]} /><Stage><Phone shot="home" shotH={3753} from={0} to={300} len={len} /></Stage></> },
  { len: 50, el: (len) => <><Caption len={len} kicker="vs last month" lines={[<>Progress you</>, <>can <Hi>prove.</Hi></>]} /><Stage><Phone shot="home" shotH={3753} from={300} to={470} len={len} ry={[10, 18]} />
      <Chip x={10} y={1130} big="+11" small="lift days" delay={10} /><Chip x={300} y={1130} big="+13,035 lb" small="weight moved" delay={16} c={C.blue} /></Stage></> },
  { len: 50, el: (len) => <><Caption len={len} lines={[<>Every lift.</>, <>Every <Hi c={C.blue}>date.</Hi></>]} /><Stage><Phone shot="lifts" shotH={2532} from={0} to={560} len={len} ry={[-20, -6]} /></Stage></> },
  { len: 60, el: (len) => <><Caption len={len} kicker="Nov 16, 2026" lines={[<>Deadlift.</>, <><Hi c={C.pink}>New PR.</Hi></>]} /><Stage><Phone shot="lift-deadlift" shotH={2532} from={0} to={24} len={len} ry={[16, 4]} />
      <Chip x={10} y={960} big="175 lb × 3" small="personal record" delay={9} c={C.pink} /><Chip x={430} y={1010} big="193 lb" small="est. one-rep max" delay={17} c={C.purple} /></Stage></> },
  { len: 55, el: (len) => <><Caption len={len} kicker="Nov 16 workout" lines={[<>Only what</>, <>you <Hi c={C.pink}>trained.</Hi></>]} /><Stage><Body side="front" len={len}>
      <Tag x={90} y={1080} on t="Quads" d={10} /><Tag x={90} y={1150} on t="Shoulders" d={14} /><Tag x={90} y={1220} on t="Biceps" d={18} /><Tag x={500} y={1150} on={false} t="Chest: not worked" d={22} /><Tag x={500} y={1220} on={false} t="Abs: not worked" d={26} /></Body></Stage></> },
  { len: 50, el: (len) => <><Caption len={len} lines={[<>And what</>, <>you <Hi c={C.purple}>missed.</Hi></>]} /><Stage><Body side="back" len={len} flipIn>
      <Tag x={90} y={1080} on t="Glutes" d={12} /><Tag x={90} y={1150} on t="Hamstrings" d={16} /><Tag x={90} y={1220} on t="Lower back" d={20} /><Tag x={500} y={1150} on={false} t="Lats: not worked" d={24} /><Tag x={500} y={1220} on={false} t="Calves: not worked" d={28} /></Body></Stage></> },
  { len: 45, el: (len) => <><Caption len={len} kicker="Cardio counts" lines={[<>Runs, walks,</>, <><Hi c={C.blue}>all of it.</Hi></>]} /><Stage><ClipCard name="run" label="Outside: the run" len={len} ry={-9} /><Chip x={90} y={70} big="+205 min" small="cardio vs last month" delay={10} c={C.blue} /></Stage></> },
  { len: 50, el: (len) => <><Caption len={len} kicker="Daily targets" lines={[<>Macros,</>, <><Hi>handled.</Hi></>]} /><Stage><Phone shot="nutrition" shotH={2568} from={0} to={300} len={len} ry={[-18, -5]} />
      <Chip x={20} y={1130} big="1,450" small="calories" delay={9} /><Chip x={470} y={1130} big="130 g" small="protein" delay={15} c={C.blue} /></Stage></> },
  { len: 50, el: (len) => <><Caption len={len} kicker="For coaches" lines={[<>The whole class.</>, <><Hi>One sheet.</Hi></>]} /><Stage><Phone shot="coach-class" shotH={2532} from={0} to={380} len={len} ry={[18, 6]} /></Stage></> },
  { len: 45, el: (len) => <><Caption len={len} kicker="For coaches" lines={[<>Plan the month.</>, <><Hi c={C.blue}>One tap.</Hi></>]} /><Stage><Phone shot="coach-calendar" shotH={2688} from={120} to={560} len={len} ry={[-16, -5]} /></Stage></> },
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
      <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 800, color: "#fff", padding: "24px 44px", borderRadius: 24, ...GLASS, transform: `scale(${c})`, opacity: c }}>bermocollective.com</div>
    </div>
  </>;
};

export const Ad: React.FC = () => {
  let at = 0;
  return <AbsoluteFill style={{ background: C.bg }}>
    <style>{fontFace}</style>
    {SHOTS.map((s, i) => { const from = at; at += s.len; return <Sequence key={i} from={from} durationInFrames={s.len} layout="none"><AbsoluteFill><Backdrop name={BG_FOR(i)} />{s.el(s.len)}</AbsoluteFill></Sequence>; })}
  </AbsoluteFill>;
};

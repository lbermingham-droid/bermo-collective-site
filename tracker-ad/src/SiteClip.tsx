import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, Easing } from "remotion";

// The website's phone-slot clip (1080 x 2208 = a 360 x 736 pt iPhone screen
// at 3x). NOT a screen recording: the app's screens redrawn and animated.
//
// LOOK (fourth pass). She compared it to Hevy / Fitbod / Ladder and said it
// still read as "vibe coded". What those apps share, and what this follows:
//   - native iPhone conventions: status bar, nav bar (Cancel / title / Save),
//     grouped lists, bottom tab bar with icons, push transitions
//   - true black, FILLED grey cells, hairline separators, NO outlined boxes
//   - real exercise photos beside every lift (free-exercise-db, public domain)
//   - a real type scale: regular for body, semibold/bold only where it matters
//   - ONE accent (violet). She hates the cyan and the cyan + pink combo.
//   - exercise art is the app's own line drawings on a raised 3D tile (no glow)
//   - each scene has ONE lift-out moment: the item that matters is pulled
//     toward the viewer on a white card over the dimmed screen (Monday.com).
//
// CONTENT follows the gym's paper sheets (she sent photos): the coach writes
// Monday's lifts once and they repeat all month; in class each PERSON logs
// their own sets as weight x reps, climbing, with different set counts.
export const SITE_FPS = 30;
const OVER = 12;
const LENS = [244, 244, 132, 120, 132];
export const SITE_DURATION = LENS.reduce((a, b) => a + b, 0);
const U = 3;                                  // px per pt
const u = (n: number) => n * U;
const BASE_THEME = { bg: "#000", cell: "#1c1c1e", cell2: "#2c2c2e", sep: "rgba(84,84,88,.55)", text: "#fff", sec: "rgba(235,235,245,.6)", ter: "rgba(235,235,245,.3)", acc: "#7c6cff", accDeep: "#4a3fc4",
  onAcc: "#fff", tab: "rgba(18,18,20,.94)", thumb: "linear-gradient(150deg,#3a3a41 0%,#26262b 55%,#1d1d21 100%)", art: "linear-gradient(160deg,#ffffff 35%,#b9b0ff 100%)", fig: "none",
  // roles a multi-colour palette can split out; by default they all fall back to the one accent
  pr: "", up: "", hi: "", muscle: "", ring2: "#8e8e93", soft: "#d9d6ee", conf: "#b9b0ff", prDeep: "" };
export type SiteTheme = typeof BASE_THEME;
// The palette every screen reads. Mutable on purpose: <Themed> swaps it for a subtree
// (used by the colourway mock). React renders depth-first, so a Themed's children read
// its palette before a sibling Themed changes it.
const fill = (t: SiteTheme): SiteTheme => ({ ...t, pr: t.pr || t.acc, up: t.up || t.acc, hi: t.hi || t.acc, muscle: t.muscle || t.acc, prDeep: t.prDeep || t.accDeep });
const C: SiteTheme = fill({ ...BASE_THEME });
export const Themed: React.FC<{ theme?: Partial<SiteTheme>; children: React.ReactNode }> = ({ theme, children }) => { Object.assign(C, fill({ ...BASE_THEME, ...(theme || {}) })); return <>{children}</>; };
const FONT = "InterVar", WIDE = "ArchivoWide";
const fontFace = `@font-face{font-family:${FONT};font-weight:100 900;src:url(${staticFile("fonts/inter-var.woff2")}) format("woff2")}
@font-face{font-family:ArchivoWide;font-weight:900;src:url(${staticFile("fonts/archivo-wide-900.woff2")}) format("woff2")}`;
const PAD = u(16), STATUS = u(50), TAB = u(83);
const T = { get body(): React.CSSProperties { return { fontSize: u(17), fontWeight: 400, letterSpacing: -0.4 * U }; }, get sub(): React.CSSProperties { return { fontSize: u(14), fontWeight: 400, color: C.sec, letterSpacing: -0.2 * U }; }, get foot(): React.CSSProperties { return { fontSize: u(12.5), fontWeight: 500, color: C.sec, letterSpacing: 0.3 * U, textTransform: "uppercase" }; } };
const tint = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const sp = (f: number, at: number, stiff = 240, damp = 22) => spring({ frame: f - at, fps: SITE_FPS, config: { damping: damp, stiffness: stiff, mass: 0.8 } });
const ease = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.25, 0.8, 0.25, 1) });
const In: React.FC<{ at: number; y?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, y = 10, style, children }) => { const f = useCurrentFrame(); const k = ease(f, at, at + 9); return <div style={{ opacity: k, transform: `translateY(${(1 - k) * u(y)}px)`, ...style }}>{children}</div>; };

// ---- iPhone chrome -------------------------------------------------------
const StatusBar: React.FC = () => <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: STATUS, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: `0 ${u(30)}px ${u(8)}px`, fontWeight: 600, fontSize: u(16), letterSpacing: -0.3 * U }}>
  <span>9:41</span>
  <span style={{ display: "flex", alignItems: "center", gap: u(6) }}>
    <svg width={u(18)} height={u(12)} viewBox="0 0 18 12">{[0, 1, 2, 3].map(i => <rect key={i} x={i * 4.6} y={9 - i * 2.6} width={3.2} height={3 + i * 2.6} rx={0.8} fill={C.text} />)}</svg>
    <svg width={u(16)} height={u(12)} viewBox="0 0 16 12"><path d="M8 10.6l2-2.1a2.9 2.9 0 0 0-4 0zM3.3 5.8a6.7 6.7 0 0 1 9.4 0l-1.4 1.4a4.7 4.7 0 0 0-6.6 0zM.6 3.1a10.5 10.5 0 0 1 14.8 0L14 4.5a8.5 8.5 0 0 0-12 0z" fill={C.text} /></svg>
    <svg width={u(26)} height={u(12)} viewBox="0 0 26 12"><rect x={0.5} y={0.5} width={22} height={11} rx={3.2} fill="none" stroke={C.ter} /><rect x={2} y={2} width={19} height={8} rx={1.9} fill={C.text} /><rect x={23.6} y={4} width={1.6} height={4} rx={0.8} fill={C.ter} /></svg>
  </span>
</div>;
const ICON: Record<string, React.ReactNode> = {
  class: <><rect x="5" y="4" width="14" height="17" rx="2.5" /><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  members: <><circle cx="9" cy="8.5" r="3.4" /><path d="M2.8 20c.4-3.6 2.9-5.6 6.2-5.6s5.800 2 6.200 5.600M16 5.400a3.300 3.300 0 0 1 0 6.200M18 14.800c1.900.700 3 2.500 3.300 5.200" /></>,
  lifts: <path d="M3 12h2.500M18.500 12H21M5.500 8v8M8.500 6v12M15.500 6v12M18.500 8v8M8.500 12h7" />,
  more: <><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>,
  home: <path d="M3.500 11L12 3.800l8.500 7.200V20a1 1 0 0 1-1 1h-4.700v-6H9.200v6H4.500a1 1 0 0 1-1-1z" />,
  food: <path d="M6 3v7.500a2.500 2.500 0 0 0 5 0V3M8.500 3v18M17 21V3c-2.200 1.500-3.300 4.200-3.300 8H17" />,
  progress: <path d="M4 20V11M9.300 20V5M14.700 20v-7M20 20V8" />,
  body: <><circle cx="12" cy="5" r="2.400" /><path d="M5 9.500c4.500 1.300 9.500 1.300 14 0M9.200 10.300l-.7 5.200L7 21M14.800 10.300l.7 5.200L17 21" /></>,
};
const TabBar: React.FC<{ tabs: [string, string][]; active: number; o: number }> = ({ tabs, active, o }) => <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: TAB, background: C.tab, borderTop: `1px solid ${C.sep}`, opacity: o }}>
  <div style={{ display: "flex", padding: `${u(8)}px ${u(4)}px 0` }}>
    {tabs.map(([id, label], i) => { const on = Math.round(active) === i; return <div key={id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: u(3), color: on ? C.acc : C.sec }}>
      <svg width={u(26)} height={u(26)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{ICON[id]}</svg>
      <span style={{ fontSize: u(10.5), fontWeight: 500 }}>{label}</span>
    </div>; })}
  </div>
  <div style={{ position: "absolute", left: "50%", bottom: u(8), width: u(134), height: u(5), marginLeft: -u(67), borderRadius: u(3), background: C.text }} />
</div>;
const COACH: [string, string][] = [["class", "Class"], ["calendar", "Calendar"], ["members", "Members"], ["lifts", "Lifts"], ["more", "More"]];
const MEMBER: [string, string][] = [["home", "Home"], ["lifts", "Workouts"], ["food", "Nutrition"], ["progress", "Progress"], ["body", "Body"]];

// ---- building blocks -----------------------------------------------------
// A pushed screen: slides in from the right, leaves to the left (iOS push).
const Screen: React.FC<{ len: number; first?: boolean; children: React.ReactNode }> = ({ len, first, children }) => {
  const f = useCurrentFrame(); const a = first ? 1 : ease(f, 0, 13); const out = ease(f, len, len + OVER);
  return <AbsoluteFill style={{ top: STATUS, bottom: TAB, height: "auto", transform: `translateX(${(1 - a) * 1080 - out * 300}px)`, opacity: 1 - out, background: C.bg, overflow: "hidden", boxShadow: a < 1 ? "-30px 0 60px rgba(0,0,0,.6)" : "none" }}>{children}</AbsoluteFill>;
};
const Nav: React.FC<{ left?: React.ReactNode; title?: string; right?: React.ReactNode }> = ({ left, title, right }) => <div style={{ height: u(44), display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${PAD}px`, position: "relative" }}>
  <div style={{ ...T.body, color: C.acc, display: "flex", alignItems: "center", gap: u(3) }}>{left}</div>
  {title ? <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", fontSize: u(17), fontWeight: 600, letterSpacing: -0.4 * U, pointerEvents: "none" }}>{title}</div> : null}
  <div style={{ ...T.body, color: C.acc, fontWeight: 600 }}>{right}</div>
</div>;
const Back: React.FC<{ to: string }> = ({ to }) => <><svg width={u(12)} height={u(20)} viewBox="0 0 12 20" fill="none" stroke={C.acc} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M10 2L2 10l8 8" /></svg>{to}</>;
const Large: React.FC<{ children: React.ReactNode; sub?: string }> = ({ children, sub }) => <div style={{ padding: `${u(2)}px ${PAD}px ${u(12)}px` }}><div style={{ fontSize: u(33), fontWeight: 700, letterSpacing: -0.9 * U, lineHeight: 1.12 }}>{children}</div>{sub ? <div style={{ ...T.sub, fontSize: u(15), marginTop: u(2) }}>{sub}</div> : null}</div>;
const Group: React.FC<{ label?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ label, style, children }) => <div style={{ margin: `0 ${PAD}px ${u(18)}px`, ...style }}>{label ? <div style={{ ...T.foot, padding: `0 ${u(4)}px ${u(7)}px` }}>{label}</div> : null}<div style={{ background: C.cell, borderRadius: u(13), overflow: "hidden" }}>{children}</div></div>;
const Sep: React.FC<{ inset?: number }> = ({ inset = 16 }) => <div style={{ height: 1.5, background: C.sep, marginLeft: u(inset) }} />;
const ART: Record<string, string> = { Barbell_Squat: "squat", Arnold_Dumbbell_Press: "arnold-press", Dumbbell_Rear_Lunge: "reverse-lunge", Plank: "plank", Side_Plank: "side-plank", Barbell_Deadlift: "deadlift" };
// Workout Guide by Bryl Lim, CC BY-SA 4.0 (credit required wherever this clip is published).
const Thumb: React.FC<{ id: string; size?: number; light?: boolean }> = ({ id, size = 44, light }) => { const url = staticFile(`site/art/${ART[id]}.png`); const r = u(size * 0.26);
  return <div style={{ width: u(size), height: u(size), flex: "none", borderRadius: r, position: "relative", marginBottom: u(size * 0.06),
    background: light ? "linear-gradient(150deg,#2b2b31,#151518)" : C.thumb,
    boxShadow: `inset 0 ${u(1)}px 0 rgba(255,255,255,.22), inset 0 -${u(1)}px 0 rgba(0,0,0,.4), 0 ${u(size * 0.06)}px 0 #0d0d10, 0 ${u(size * 0.14)}px ${u(size * 0.18)}px rgba(0,0,0,.55)` }}>
    <div style={{ position: "absolute", inset: u(size * 0.07), background: light ? "linear-gradient(160deg,#ffffff 35%,#b9b0ff 100%)" : C.art, WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" }} />
    <Img src={url} style={{ position: "absolute", width: 1, height: 1, opacity: 0 }} />
  </div>; };
const Avatar: React.FC<{ name: string; size?: number; hue?: number }> = ({ name, size = 34, hue = 200 }) => <div style={{ width: u(size), height: u(size), borderRadius: u(size / 2), background: `hsl(${hue} 22% 30%)`, display: "flex", color: "#fff", alignItems: "center", justifyContent: "center", fontSize: u(size * 0.38), fontWeight: 600, flex: "none" }}>{name.split(" ").map(w => w[0]).join("")}</div>;
const Chevron: React.FC = () => <svg width={u(8)} height={u(14)} viewBox="0 0 8 14" fill="none" stroke={C.ter} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1.500 1.500L7 7l-5.500 5.500" /></svg>;
const CheckDot: React.FC<{ at: number; size?: number; square?: boolean }> = ({ at, size = 24, square }) => {
  const f = useCurrentFrame(); const s = sp(f, at, 320, 18); const d = ease(f, at + 1, at + 8);
  return <div style={{ width: u(size), height: u(size), borderRadius: square ? u(size * 0.3) : u(size / 2), background: s > 0.02 ? C.acc : C.cell2, transform: `scale(${1 + 0.14 * Math.sin(Math.min(1, s) * Math.PI)})`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
    <svg width={u(size * 0.56)} height={u(size * 0.56)} viewBox="0 0 24 24"><path d="M5 12.500l4.500 4.500L19 7.500" fill="none" stroke={s > 0.02 ? C.onAcc : C.ter} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={22} strokeDashoffset={s > 0.02 ? 22 * (1 - d) : 0} /></svg>
  </div>;
};
const Typed: React.FC<{ text: string; at: number; per?: number; ghost?: string }> = ({ text, at, per = 1.4, ghost }) => {
  const f = useCurrentFrame(); const n = Math.max(0, Math.min(text.length, Math.floor((f - at) / per))); const typing = f >= at - 5 && n < text.length;
  return <span>{n === 0 && ghost ? <span style={{ color: C.ter }}>{ghost}</span> : text.slice(0, n)}{typing ? <span style={{ display: "inline-block", width: u(1.6), height: "1.05em", background: C.acc, marginLeft: 2, verticalAlign: "-0.16em", opacity: Math.floor(f / 8) % 2 ? 0.15 : 1 }} /> : null}</span>;
};
const Lift: React.FC<{ at: number; end: number; top?: number; children: React.ReactNode }> = ({ at, end, top = 150, children }) => {
  const f = useCurrentFrame(); const k = sp(f, at, 150, 17); const out = ease(f, end, end + 9); const v = Math.min(1, k) * (1 - out);
  const bits = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2 + 0.4, d = ease(f, at + 3, at + 30) * u(150 + (i % 4) * 28); return { x: Math.cos(a) * d * 1.15, y: Math.sin(a) * d * 0.62 - ease(f, at + 3, at + 40) * u(10), c: i % 3 === 0 ? "#fff" : i % 3 === 1 ? C.pr : C.conf, r: i % 2 ? 4 : 6, o: ease(f, at + 2, at + 8) * (1 - ease(f, at + 24, at + 40)) }; });
  return <AbsoluteFill style={{ zIndex: 9 }}>
    <AbsoluteFill style={{ background: `rgba(0,0,0,${0.74 * v})` }} />
    <div style={{ position: "absolute", left: u(18), right: u(18), top: u(top), perspective: u(620) }}>
      {bits.map((b, i) => <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: u(b.r), height: u(b.r), borderRadius: i % 4 === 0 ? u(1.5) : u(b.r), background: b.c, opacity: b.o * (1 - out), transform: `translate(${b.x}px, ${b.y}px) rotate(${i * 40}deg)` }} />)}
      <div style={{ transform: `translateY(${(1 - k) * u(70) - out * u(20)}px) rotateX(${(1 - k) * 46}deg) scale(${0.82 + 0.18 * k - out * 0.08})`, transformOrigin: "50% 100%", opacity: Math.min(1, k * 1.8) * (1 - out), background: "#fff", color: "#0b0b0d", borderRadius: u(24), boxShadow: `0 ${u(4)}px 0 #cfcfd6, 0 ${u(36)}px ${u(60)}px rgba(0,0,0,.75)`, overflow: "hidden" }}>{children}</div>
    </div>
  </AbsoluteFill>;
};

// ---- 1. plan the month ---------------------------------------------------
const LIFTS: [string, string, string][] = [["Back Squat", "3 sets × 8 reps", "Barbell_Squat"], ["Arnold Press", "3 sets × 10 reps", "Arnold_Dumbbell_Press"], ["Back Lunge", "3 sets × 6 each side", "Dumbbell_Rear_Lunge"], ["Plank Pull-Through", "3 sets × 10 reps", "Plank"]];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PlanScreen: React.FC = () => {
  const f = useCurrentFrame(); const SAVE = 116;
  const starts = LIFTS.reduce((a: number[], _, i) => a.concat(i ? a[i - 1] + LIFTS[i - 1][0].length * 1.3 + 10 : 16), [] as number[]);
  const tap = ease(f, SAVE - 3, SAVE) * (1 - ease(f, SAVE + 1, SAVE + 6));
  return <>
    <Nav left="Cancel" title="New plan" right={<span style={{ opacity: 1 - tap * 0.7 }}>Save</span>} />
    <Large sub="Strength">Monday</Large>
    <Group label="Exercises">
      {LIFTS.map(([n, d, id], i) => { const at = starts[i]; const done = at + n.length * 1.3; const shown = f >= at - 6;
        return <React.Fragment key={n}>{i ? <Sep inset={72} /> : null}<div style={{ display: "flex", alignItems: "center", gap: u(12), padding: `0 ${u(14)}px`, height: u(64) }}>
          <div style={{ opacity: ease(f, at + 4, at + 10) }}><Thumb id={id} /></div>
          <div style={{ flex: 1 }}><div style={{ ...T.body, fontWeight: 500 }}>{shown ? <Typed text={n} at={at} per={1.3} ghost="Exercise" /> : <span style={{ color: C.ter }}>Exercise</span>}</div><div style={{ ...T.sub, marginTop: u(1), opacity: ease(f, done, done + 6) }}>{d}</div></div>
          <Chevron />
        </div></React.Fragment>; })}
    </Group>
    <In at={92}><Group label="Repeat">
      {[["Every", "Monday"], ["From", "Dec 1, 2026"], ["Until", "Dec 28, 2026"]].map(([k, v], i) => <React.Fragment key={k}>{i ? <Sep /> : null}<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `0 ${u(16)}px`, height: u(46), ...T.body }}><span>{k}</span><span style={{ color: i === 0 ? C.acc : C.sec }}>{v}</span></div></React.Fragment>)}
    </Group></In>
  </>;
};
const NOTE: (string | null)[] = [null, "Strength", "Upper", "Full", "Lower", "Upper", "Full"];
const CalendarScreen: React.FC = () => {
  const f = useCurrentFrame(); const FILL = 22; const cw = (1080 - PAD * 2) / 7;
  return <>
    <Nav title="Calendar" right={<span style={{ fontSize: u(26), fontWeight: 400 }}>+</span>} />
    <Large sub="6 classes a week · Sundays off">December</Large>
    <div style={{ padding: `0 ${PAD}px` }}>
      <div style={{ display: "flex", marginBottom: u(4) }}>{DOW.map((d, i) => <div key={d} style={{ width: cw, textAlign: "center", ...T.foot, color: i === 1 ? C.acc : C.ter }}>{d[0]}</div>)}</div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {Array.from({ length: 35 }, (_, i) => {
          const day = i - 1, dow = i % 7, row = Math.floor(i / 7); if(day < 1 || day > 31) return <div key={i} style={{ width: cw, height: u(58) }} />;   // Dec 1, 2026 is a Tuesday
          const mon = dow === 1; const s = mon ? sp(f, FILL + (row - 1) * 9, 280, 15) : 0;
          return <div key={i} style={{ width: cw, height: u(58), display: "flex", flexDirection: "column", alignItems: "center", borderTop: `1.500px solid ${C.sep}`, paddingTop: u(5) }}>
            <div style={{ width: u(31), height: u(31), borderRadius: u(16), background: tint(C.acc, Math.min(1, s * 1.3)), boxShadow: mon ? `0 ${u(3.5) * Math.min(1, s)}px 0 ${tint(C.accDeep, Math.min(1, s))}, 0 ${u(8) * Math.min(1, s)}px ${u(8)}px rgba(0,0,0,${0.5 * Math.min(1, s)})` : "none", transform: `translateY(${-u(3) * Math.min(1, s)}px) scale(${1 + 0.2 * Math.sin(Math.min(1, s) * Math.PI)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: u(17), fontWeight: mon && s > 0.5 ? 600 : 400, color: mon && s > 0.5 ? C.onAcc : dow === 0 ? C.ter : C.text }}>{day}</div>
            {NOTE[dow] ? <div style={{ fontSize: u(9.5), fontWeight: 500, marginTop: u(2), color: mon ? C.acc : C.ter, opacity: mon ? Math.min(1, s * 1.4) : 1 }}>{NOTE[dow]}</div> : null}
          </div>;
        })}
      </div>
    </div>
    <In at={66} style={{ marginTop: u(14) }}><Group label="Mondays in December">
      <div style={{ display: "flex", alignItems: "center", gap: u(12), padding: `0 ${u(14)}px`, height: u(64) }}>
        <div style={{ display: "flex" }}>{LIFTS.slice(0, 3).map(([, , id], i) => <div key={id} style={{ marginLeft: i ? -u(16) : 0, border: `${u(2)}px solid ${C.cell}`, borderRadius: u(13) }}><Thumb id={id} size={38} /></div>)}</div>
        <div style={{ flex: 1 }}><div style={{ ...T.body, fontWeight: 500 }}>Strength</div><div style={T.sub}>4 exercises · 4 Mondays</div></div>
        <CheckDot at={72} />
      </div>
    </Group></In>
    <Lift at={64} end={108} top={176}>
      <div style={{ display: "flex", alignItems: "center", gap: u(12), padding: `${u(16)}px ${u(16)}px ${u(14)}px` }}>
        <div style={{ display: "flex" }}>{LIFTS.slice(0, 3).map(([, , id], i) => <div key={id} style={{ marginLeft: i ? -u(14) : 0 }}><Thumb id={id} size={42} light /></div>)}</div>
        <div style={{ flex: 1 }}><div style={{ fontSize: u(19), fontWeight: 700, letterSpacing: -0.5 * U }}>Strength</div><div style={{ fontSize: u(14), color: "#6b6b76", whiteSpace: "nowrap" }}>Every Monday, Dec 1 – 28</div></div>
      </div>
      <div style={{ background: C.acc, color: C.onAcc, padding: `${u(14)}px ${u(18)}px ${u(16)}px` }}>
        <div style={{ fontFamily: WIDE, fontWeight: 900, fontSize: u(50), lineHeight: 1 }}>{Math.round(ease(f, 66, 84) * 4)}<span style={{ fontSize: u(20), marginLeft: u(9) }}>MONDAYS</span></div>
        <div style={{ fontSize: u(15), fontWeight: 600, marginTop: u(5), opacity: 0.92 }}>Planned from one entry</div>
      </div>
    </Lift>
  </>;
};

// ---- 2. the class: each member logs their own sets -----------------------
const SETS: [string, string, string][] = [["165 × 6", "135", "6"], ["165 × 6", "155", "6"], ["165 × 6", "165", "6"], ["–", "175", "3"]];
const OTHERS: [string, string, boolean, number][] = [["Ana Souza", "95 × 8 · 115 × 8 · 135 × 8", true, 150], ["Jordan Reyes", "65 × 8 · 75 × 8", false, 30], ["Lena Fischer", "95 × 8 · 115 × 6 · 125 × 6", false, 280], ["Maya Chen", "95 × 8 · 105 × 8 · 115 × 6", true, 330]];
const ClassScreen: React.FC = () => {
  const f = useCurrentFrame(); const ROW = 32, STEP = 24, REST = 186;
  const col: React.CSSProperties = { ...T.foot, fontSize: u(11.5) };
  const field: React.CSSProperties = { background: C.cell2, borderRadius: u(8), height: u(32), display: "flex", alignItems: "center", justifyContent: "center", fontSize: u(17), fontWeight: 600, fontVariantNumeric: "tabular-nums" };
  return <>
    <Nav left={<Back to="Calendar" />} title="Mon, Dec 7" right="Finish" />
    <div style={{ display: "flex", alignItems: "center", gap: u(12), padding: `${u(6)}px ${PAD}px ${u(12)}px` }}>
      <Thumb id="Barbell_Squat" size={52} />
      <div style={{ flex: 1 }}><div style={{ fontSize: u(24), fontWeight: 700, letterSpacing: -0.6 * U }}>Back Squat</div><div style={{ ...T.sub, fontSize: u(15) }}>Plan: 3 sets × 8 reps · 5 checked in</div></div>
    </div>
    <In at={10}><Group>
      <div style={{ display: "flex", alignItems: "center", gap: u(10), padding: `${u(12)}px ${u(14)}px ${u(8)}px` }}><Avatar name="Chris Walker" hue={210} /><div style={{ flex: 1, ...T.body, fontWeight: 600 }}>Chris Walker</div><div style={T.sub}>Last: 165 × 6</div></div>
      <div style={{ display: "grid", gridTemplateColumns: `${u(34)}px 1fr ${u(72)}px ${u(60)}px ${u(34)}px`, columnGap: u(8), alignItems: "center", padding: `${u(2)}px ${u(14)}px ${u(4)}px` }}>
        <div style={col}>Set</div><div style={col}>Previous</div><div style={{ ...col, textAlign: "center" }}>Lbs</div><div style={{ ...col, textAlign: "center" }}>Reps</div><div />
      </div>
      {SETS.map(([prev, w, r], i) => { const at = ROW + i * STEP; const done = f >= at + 13; const on = sp(f, at + 13, 260, 24);
        return <div key={i} style={{ display: "grid", gridTemplateColumns: `${u(34)}px 1fr ${u(72)}px ${u(60)}px ${u(34)}px`, columnGap: u(8), alignItems: "center", padding: `${u(4)}px ${u(14)}px`, background: tint(C.acc, 0.13 * on), opacity: i === 3 ? ease(f, at - 8, at - 2) : 1 }}>
          <div style={{ fontSize: u(17), fontWeight: 600, color: i === 3 ? C.hi : C.text }}>{i === 3 ? "+" : i + 1}</div>
          <div style={{ ...T.body, color: C.ter }}>{i === 3 ? "Bonus" : prev}</div>
          <div style={{ ...field, color: done ? C.text : undefined }}><Typed text={w} at={at} per={2.2} ghost={i === 3 ? "" : prev.split(" ")[0]} /></div>
          <div style={field}><Typed text={r} at={at + 8} per={2.2} ghost="6" /></div>
          <CheckDot at={at + 13} size={28} square />
        </div>; })}
      <div style={{ height: u(8) }} />
    </Group></In>
    <In at={16}><Group>
      {OTHERS.map(([name, sets, pr, hue], i) => { const at = REST + i * 12; const k = ease(f, at, at + 7);
        return <React.Fragment key={name}>{i ? <Sep inset={58} /> : null}<div style={{ display: "flex", alignItems: "center", gap: u(10), padding: `0 ${u(14)}px`, height: u(54) }}>
          <Avatar name={name} hue={hue} />
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ ...T.body, fontWeight: 500, display: "flex", alignItems: "center", gap: u(7) }}>{name}{pr ? <span style={{ opacity: k, fontSize: u(11), fontWeight: 700, color: C.pr, border: `1.500px solid ${C.pr}`, borderRadius: u(5), padding: `${u(1)}px ${u(5)}px`, letterSpacing: 0.4 * U }}>PR</span> : null}</div>
            <div style={{ ...T.sub, position: "relative", height: u(18) }}><span style={{ position: "absolute", opacity: 1 - k, whiteSpace: "nowrap" }}>Not logged yet</span><span style={{ position: "absolute", opacity: k, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{sets}</span></div></div>
          <CheckDot at={at} />
        </div></React.Fragment>; })}
    </Group></In>
    <Lift at={122} end={176} top={128}>
      <div style={{ display: "flex", alignItems: "center", gap: u(12), padding: `${u(16)}px ${u(16)}px ${u(6)}px` }}>
        <Thumb id="Barbell_Squat" size={46} light />
        <div style={{ flex: 1 }}><div style={{ fontSize: u(19), fontWeight: 700, letterSpacing: -0.5 * U }}>Chris Walker</div><div style={{ fontSize: u(14), color: "#6b6b76", whiteSpace: "nowrap" }}>Back Squat · bonus set</div></div>
        <div style={{ background: C.pr, color: "#fff", borderRadius: u(9), padding: `${u(7)}px ${u(11)}px`, fontSize: u(13), fontWeight: 800, letterSpacing: 0.6 * U, whiteSpace: "nowrap", flex: "none" }}>NEW PR</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: `0 ${u(18)}px ${u(16)}px` }}>
        <div><div style={{ fontFamily: WIDE, fontWeight: 900, fontSize: u(56), lineHeight: 1.02, letterSpacing: -1.2 * U, whiteSpace: "nowrap" }}>{Math.round(165 + ease(f, 126, 148) * 10)}<span style={{ fontFamily: FONT, fontWeight: 700, fontSize: u(19), marginLeft: u(7), letterSpacing: 0, whiteSpace: "nowrap" }}>lb × 3</span></div>
          <div style={{ fontSize: u(15), fontWeight: 600, color: C.prDeep, marginTop: u(2) }}>+10 lb on his best</div></div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: u(6), height: u(70) }}>{[0.52, 0.6, 0.66, 0.74, 1].map((h, i) => <div key={i} style={{ width: u(15), height: u(70) * h * ease(f, 128 + i * 3, 144 + i * 3), borderRadius: u(4), background: i === 4 ? C.pr : C.soft }} />)}</div>
      </div>
    </Lift>
  </>;
};

// ---- 3. one member -------------------------------------------------------
const SQ = [95, 95, 100, 105, 105, 110, 110, 115, 110, 115];
const MemberScreen: React.FC = () => {
  const f = useCurrentFrame(); const H = u(96);
    const stats: [number, string, string][] = [[10, "", "Classes"], [79.8, "K", "Volume (lb)"], [3, "", "PRs"]];
  return <>
    <Nav left={<Back to="Members" />} right={<span style={{ fontWeight: 400 }}>Edit</span>} />
    <div style={{ display: "flex", alignItems: "center", gap: u(14), padding: `${u(4)}px ${PAD}px ${u(16)}px` }}>
      <Avatar name="Maya Chen" size={62} hue={330} />
      <div><div style={{ fontSize: u(26), fontWeight: 700, letterSpacing: -0.7 * U }}>Maya Chen</div><div style={{ ...T.sub, fontSize: u(15) }}>Mon · Wed · Fri · since September</div></div>
    </div>
    <Group label="December">
      <div style={{ display: "flex" }}>{stats.map(([v, unit, l], i) => { const k = ease(f, 10 + i * 4, 36 + i * 4); return <div key={l} style={{ flex: 1, padding: `${u(14)}px 0 ${u(14)}px ${u(16)}px`, borderLeft: i ? `1.500px solid ${C.sep}` : "none" }}>
        <div style={{ fontFamily: WIDE, fontWeight: 900, fontSize: u(24), letterSpacing: -0.4 * U }}>{unit ? (v * k).toFixed(1) : Math.round(v * k)}{unit}</div><div style={T.sub}>{l}</div></div>; })}</div>
    </Group>
    <Group label="Back Squat · top set">
      <div style={{ padding: `${u(14)}px ${u(16)}px ${u(12)}px` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: u(10) }}><div style={{ fontFamily: WIDE, fontWeight: 900, fontSize: u(46), lineHeight: 1, letterSpacing: -1 * U }}>{Math.round(95 + ease(f, 22, 60) * 20)}<span style={{ fontSize: u(17), marginLeft: u(5), letterSpacing: 0 }}>lb</span></div><div style={{ ...T.sub, color: C.up, fontWeight: 600, opacity: ease(f, 60, 68) }}>+20 lb since October</div></div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: u(7), height: H, marginTop: u(12) }}>{SQ.map((v, i) => <div key={i} style={{ flex: 1, height: (H * (0.3 + 0.7 * (v - 90) / 25)) * ease(f, 24 + i * 3, 42 + i * 3), borderRadius: `${u(5)}px ${u(5)}px ${u(2)}px ${u(2)}px`, background: i === SQ.length - 1 ? C.text : C.acc }} />)}</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: u(7), ...T.sub, fontSize: u(12.5) }}><span>Oct 5</span><span>Nov 2</span><span>Dec 7</span></div>
      </div>
    </Group>
    <In at={36}><Group label="Attendance">
      <div style={{ padding: `${u(12)}px ${u(16)}px ${u(14)}px` }}>
        {[0, 1, 2].map(w => <div key={w} style={{ display: "flex", alignItems: "center", gap: u(7), marginTop: w ? u(7) : 0 }}>
          <div style={{ width: u(26), ...T.sub, fontSize: u(12.5) }}>W{w + 1}</div>
          {[0, 1, 2, 3, 4, 5, 6].map(dd => { const came = [1, 3, 5].includes(dd) && !(w === 1 && dd === 3); const k = came ? sp(f, 46 + w * 7 + dd * 2, 260, 16) : 0; return <div key={dd} style={{ flex: 1, height: u(26), borderRadius: u(6), background: came && k > 0.02 ? C.acc : C.cell2, opacity: came ? Math.max(0.35, Math.min(1, k)) : 1, transform: `scale(${came ? 0.8 + 0.2 * Math.min(1, k) : 1})` }} />; })}
        </div>)}
      </div>
    </Group></In>
  </>;
};

// ---- 4. her own app ------------------------------------------------------
const Ring: React.FC<{ at: number; pct: number; color: string; label: string; value: string }> = ({ at, pct, color, label, value }) => {
  const f = useCurrentFrame(); const S = u(106), R = u(42), CIRC = 2 * Math.PI * R; const k = ease(f, at, at + 36) * pct;
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: `${u(16)}px 0 ${u(14)}px` }}>
    <div style={{ position: "relative", width: S, height: S }}>
      <svg width={S} height={S} style={{ transform: "rotate(-90deg)" }}><circle cx={S / 2} cy={S / 2} r={R} fill="none" stroke={tint(color, 0.2)} strokeWidth={u(13)} /><circle cx={S / 2} cy={S / 2} r={R} fill="none" stroke={color} strokeWidth={u(13)} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - k)} /></svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: u(24), fontWeight: 700, letterSpacing: -0.6 * U, fontVariantNumeric: "tabular-nums" }}>{Math.round(k * 100)}%</div>
    </div>
    <div style={{ ...T.body, fontWeight: 600, marginTop: u(10) }}>{label}</div><div style={T.sub}>{value}</div>
  </div>;
};
const HomeScreen: React.FC = () => {
  const f = useCurrentFrame(); const week: [string, string, string, string, number | null][] = [["Mon", "Strength", "Back Squat 115 × 6 · PR", "Barbell_Squat", 60], ["Wed", "Full Body", "Planned", "Barbell_Deadlift", null], ["Fri", "Upper", "Planned", "Arnold_Dumbbell_Press", null]];
  return <>
    <div style={{ height: u(14) }} />
    <div style={{ position: "relative" }}><Large sub="Monday, December 7">Today</Large><div style={{ position: "absolute", right: PAD, top: u(6) }}><Avatar name="Maya Chen" size={36} hue={330} /></div></div>
    <Group><div style={{ display: "flex" }}><Ring at={10} pct={0.72} color={C.acc} label="Move" value="43 of 60 min" /><div style={{ width: 1.5, background: C.sep, margin: `${u(18)}px 0` }} /><Ring at={16} pct={0.64} color={C.ring2} label="Fuel" value="1,150 of 1,800 cal" /></div></Group>
    <In at={26}><Group label="This week">
      {week.map(([d, t, note, id, at], i) => { const done = at !== null && f >= at; return <React.Fragment key={d}>{i ? <Sep inset={72} /> : null}<div style={{ display: "flex", alignItems: "center", gap: u(12), padding: `0 ${u(14)}px`, height: u(60) }}>
        <Thumb id={id} />
        <div style={{ flex: 1 }}><div style={{ ...T.body, fontWeight: 500 }}>{t} <span style={{ color: C.sec, fontWeight: 400 }}>· {d}</span></div><div style={{ ...T.sub, color: done ? C.pr : C.sec }}>{at !== null && !done ? "In class now" : note}</div></div>
        {at === null ? <div style={{ width: u(24), height: u(24), borderRadius: u(12), border: `${u(1.6)}px solid ${C.ter}` }} /> : <CheckDot at={at} />}
      </div></React.Fragment>; })}
    </Group></In>
    <In at={34}><Group label="Lifts going up">
      {([["Back Squat", "115 lb", "+20"], ["Arnold Press", "30 lb", "+5"]] as string[][]).map(([n, v, dlt], i) => <React.Fragment key={n}>{i ? <Sep /> : null}<div style={{ display: "flex", alignItems: "center", padding: `0 ${u(16)}px`, height: u(48), ...T.body }}><span style={{ flex: 1 }}>{n}</span><span style={{ color: C.sec, marginRight: u(10), fontVariantNumeric: "tabular-nums" }}>{v}</span><span style={{ color: C.acc, fontWeight: 600, width: u(40), textAlign: "right" }}>{dlt}</span></div></React.Fragment>)}
    </Group></In>
  </>;
};

// ---- 5. what the class worked -------------------------------------------
const BodyScreen: React.FC = () => {
  const f = useCurrentFrame(); const lit = ease(f, 20, 42); const BH = u(318), BW = BH * (360 / 760);
  const turn = interpolate(f, [70, 96], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.5, 0, 0.2, 1) });
  const worked: [string, number][] = [["Quads", 1], ["Glutes", 0.8], ["Abs", 0.45]];
  return <>
    <Nav left={<Back to="Today" />} title="Mon, Dec 7" />
    <Large sub="Strength class">Muscles worked</Large>
    <Group>
      <div style={{ position: "relative", height: BH + u(24) }}>
        <div style={{ position: "absolute", right: u(18) + BW * 0.12, bottom: u(8), width: BW * 0.76, height: u(20), borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,0,0,.75), transparent)" }} />
        <div style={{ position: "absolute", right: u(18), top: u(12), width: BW, height: BH, perspective: u(900) }}>
          <div style={{ position: "absolute", inset: 0, transform: `rotateY(${turn * 180}deg)`, transformStyle: "preserve-3d" }}>
            <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
              <Img src={staticFile("site/body-front-off.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
              <Img src={staticFile("site/body-front.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: lit, filter: C.fig }} />
            </div>
            <div style={{ position: "absolute", inset: 0, transform: "rotateY(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
              <Img src={staticFile("site/body-back.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: u(16), top: u(20), width: u(128) }}>
          {worked.map(([t, v], i) => { const k = ease(f, 40 + i * 6, 58 + i * 6); return <div key={t} style={{ marginBottom: u(16), opacity: ease(f, 36 + i * 6, 44 + i * 6) }}>
            <div style={{ display: "flex", justifyContent: "space-between", ...T.body, fontWeight: 500 }}><span>{t}</span><span style={{ color: C.sec, fontVariantNumeric: "tabular-nums" }}>{Math.round(v * k * 100)}%</span></div>
            <div style={{ height: u(5), borderRadius: u(3), background: C.cell2, marginTop: u(6), overflow: "hidden" }}><div style={{ width: `${v * k * 100}%`, height: "100%", borderRadius: u(3), background: C.muscle }} /></div>
          </div>; })}
          <div style={{ ...T.sub, marginTop: u(4), opacity: ease(f, 60, 68) }}>Not worked: chest, back, shoulders, obliques</div>
        </div>
      </div>
    </Group>
    <In at={98}><Group label="Add one more">
      <div style={{ display: "flex", alignItems: "center", gap: u(12), padding: `0 ${u(14)}px`, height: u(66) }}>
        <Thumb id="Side_Plank" />
        <div style={{ flex: 1 }}><div style={{ ...T.body, fontWeight: 500 }}>Side Plank</div><div style={T.sub}>Obliques were missed</div></div>
        <div style={{ background: C.acc, color: C.onAcc, borderRadius: u(16), padding: `${u(7)}px ${u(18)}px`, fontSize: u(15), fontWeight: 700 }}>Add</div>
      </div>
    </Group></In>
  </>;
};

export const SiteClip: React.FC = () => {
  const f = useCurrentFrame(); const st = LENS.map((_, i) => LENS.slice(0, i).reduce((a, b) => a + b, 0));
  const PLAN = 124;                                          // plan editor -> calendar, inside scene 1
  const member = ease(f, st[3] + 2, st[3] + 12);
  const coachTab = f < st[1] + 6 ? 1 : f < st[2] + 6 ? 0 : 2; const memberTab = f < st[4] + 6 ? 0 : 4;
  return <AbsoluteFill style={{ background: C.bg, fontFamily: FONT, color: C.text }}>
    <style>{fontFace}</style>
    <Sequence from={0} durationInFrames={PLAN + OVER} layout="none"><Screen len={PLAN} first><PlanScreen /></Screen></Sequence>
    <Sequence from={PLAN} durationInFrames={LENS[0] - PLAN + OVER} layout="none"><Screen len={LENS[0] - PLAN}><CalendarScreen /></Screen></Sequence>
    <Sequence from={st[1]} durationInFrames={LENS[1] + OVER} layout="none"><Screen len={LENS[1]}><ClassScreen /></Screen></Sequence>
    <Sequence from={st[2]} durationInFrames={LENS[2] + OVER} layout="none"><Screen len={LENS[2]}><MemberScreen /></Screen></Sequence>
    <Sequence from={st[3]} durationInFrames={LENS[3] + OVER} layout="none"><Screen len={LENS[3]}><HomeScreen /></Screen></Sequence>
    <Sequence from={st[4]} durationInFrames={LENS[4]} layout="none"><Screen len={LENS[4] + 99}><BodyScreen /></Screen></Sequence>
    <StatusBar />
    <TabBar tabs={COACH} active={coachTab} o={1 - member} />
    <TabBar tabs={MEMBER} active={memberTab} o={member} />
  </AbsoluteFill>;
};

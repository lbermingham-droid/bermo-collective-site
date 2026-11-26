import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";

// The website's phone-slot clip (1080 x 2208, the slot's 360:736 shape).
// NOT a screen recording: each scene is the app's own screen redrawn large
// and animated, the way product sites show software. Five scenes, loops.
// The first two follow the gym's real paper sheets: the coach writes
// Monday's workout once and it repeats all month; in class the coach enters
// the lift and rounds x reps, and every member gets a row for their weight. Names and numbers are the demo gym's (tracker/?demo=gym).
export const SITE_FPS = 30;
const SCENE = 120, OVER = 14;
const LENS = [216, 174, 120, 120, 120];   // plan the month, run the class, one member, her app, the body
export const SITE_DURATION = LENS.reduce((a, b) => a + b, 0);
const C = { teal: "#00f5d4", blue: "#4db8ff", purple: "#b788ff", pink: "#ff4d9d", ink: "#06070b", dim: "rgba(255,255,255,.52)", line: "rgba(255,255,255,.09)" };
const FONT = "InterTight";
const fontFace = `@font-face{font-family:${FONT};font-weight:800;src:url(${staticFile("fonts/intertight-800.woff2")}) format("woff2")}
@font-face{font-family:${FONT};font-weight:600;src:url(${staticFile("fonts/intertight-600.woff2")}) format("woff2")}`;
const M = 64;
const CARD: React.CSSProperties = { background: "linear-gradient(165deg,#1a1d27 0%,#0f1118 70%)", border: `2px solid ${C.line}`, borderRadius: 48, boxShadow: "inset 0 2px 0 rgba(255,255,255,.07), 0 40px 80px -30px rgba(0,0,0,.8)" };

const useS = (delay: number, stiff = 170, damp = 17) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return spring({ frame: f - delay, fps, config: { damping: damp, stiffness: stiff, mass: 0.8 } }); };
const ease = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
const Pop: React.FC<{ at: number; y?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, y = 46, style, children }) => { const s = useS(at); return <div style={{ opacity: Math.min(1, s * 1.6), transform: `translateY(${(1 - s) * y}px) scale(${0.96 + 0.04 * s})`, ...style }}>{children}</div>; };

// One scene: rises in, holds, lifts away.
const Scene: React.FC<{ len?: number; children: React.ReactNode }> = ({ len = SCENE, children }) => {
  const f = useCurrentFrame(); const s = useS(0, 120, 19);
  const out = ease(f, len - 2, len + OVER - 2);
  return <AbsoluteFill style={{ opacity: Math.min(1, s * 1.5) * (1 - out), transform: `translateY(${(1 - s) * 150 - out * 110}px) scale(${1 - out * 0.04})`, padding: `0 ${M}px 40px`, display: "flex", flexDirection: "column", justifyContent: "center", fontFamily: FONT, color: "#fff" }}>{children}</AbsoluteFill>;
};
const Head: React.FC<{ eyebrow: string; title: string; color?: string; right?: React.ReactNode }> = ({ eyebrow, title, color = C.teal, right }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 54 }}>
    <div>
      <Pop at={2}><div style={{ fontWeight: 600, fontSize: 34, letterSpacing: 7, color, textTransform: "uppercase", marginBottom: 14 }}>{eyebrow}</div></Pop>
      <Pop at={5}><div style={{ fontWeight: 800, fontSize: 118, letterSpacing: -4, lineHeight: 1 }}>{title}</div></Pop>
    </div>
    {right}
  </div>
);
const Check: React.FC<{ at: number; size?: number }> = ({ at, size = 76 }) => {
  const s = useS(at, 260, 14); const f = useCurrentFrame(); const draw = ease(f, at + 2, at + 10);
  return <div style={{ width: size, height: size, borderRadius: size * 0.28, border: `3px solid ${s > 0.02 ? C.teal : "rgba(255,255,255,.28)"}`, background: `rgba(0,245,212,${s})`, transform: `scale(${1 + 0.22 * Math.sin(Math.min(1, s) * Math.PI) * (s < 1 ? 1 : 0)})`, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", boxShadow: s > 0.5 ? "0 0 40px rgba(0,245,212,.45)" : "none" }}>
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={C.ink} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={22} strokeDashoffset={22 * (1 - draw)} /></svg>
  </div>;
};

// text that types itself, with a caret while it is being written
const Typed: React.FC<{ text: string; at: number; per?: number; style?: React.CSSProperties; ghost?: string }> = ({ text, at, per = 1.4, style, ghost }) => {
  const f = useCurrentFrame(); const n = Math.max(0, Math.min(text.length, Math.floor((f - at) / per))); const typing = f >= at - 4 && n < text.length;
  return <span style={style}>{n === 0 && ghost ? <span style={{ color: "rgba(255,255,255,.25)" }}>{ghost}</span> : text.slice(0, n)}{typing ? <span style={{ display: "inline-block", width: 5, height: "0.95em", background: C.teal, marginLeft: 4, verticalAlign: "-0.12em", opacity: Math.floor(f / 8) % 2 ? 0.25 : 1 }} /> : null}</span>;
};

// ---- 2. the class: enter the lift once, every member gets a row ---------
const PEOPLE: [string, string][] = [["Ana Souza", "95"], ["Chris Walker", "135"], ["Jordan Reyes", "115"], ["Lena Fischer", "75"], ["Maya Chen", "95"], ["Priya Nair", "65"]];
const ClassScene: React.FC = () => {
  const f = useCurrentFrame(); const LIFT_AT = 14, SET_AT = 34, ROWS_AT = 58, W_AT = 84;
  const field: React.CSSProperties = { background: "#0a0c12", border: `2px solid ${C.line}`, borderRadius: 28, height: 118, display: "flex", alignItems: "center", padding: "0 34px", fontWeight: 800, fontSize: 58, letterSpacing: -1 };
  const lab: React.CSSProperties = { fontWeight: 600, fontSize: 28, letterSpacing: 4, color: C.dim, textTransform: "uppercase", marginBottom: 12 };
  const glow = (a: number, b: number) => (f >= a - 4 && f < b ? { borderColor: C.teal, boxShadow: "0 0 0 6px rgba(0,245,212,.12)" } : { borderColor: C.line, boxShadow: "none" });
  return <Scene len={LENS[1]}>
    <Head eyebrow="Monday class" title="Today" right={<Pop at={8}><div style={{ textAlign: "right" }}><div style={{ fontWeight: 800, fontSize: 150, lineHeight: 0.9, color: C.teal, textShadow: "0 0 60px rgba(0,245,212,.4)" }}>6</div><div style={{ fontWeight: 600, fontSize: 36, color: C.dim, marginTop: 8 }}>of 8 here</div></div></Pop>} />
    <Pop at={8} style={{ ...CARD, padding: "36px 40px 40px", marginBottom: 26 }}>
      <div style={lab}>Lift</div>
      <div style={{ ...field, ...glow(LIFT_AT, SET_AT) }}><Typed text="Back Squat" at={LIFT_AT} per={1.6} ghost="Type a lift" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 20, marginTop: 24 }}>
        <div><div style={lab}>Rounds</div><div style={{ ...field, ...glow(SET_AT, SET_AT + 9) }}><Typed text="3" at={SET_AT} per={3} ghost="–" /></div></div>
        <div><div style={lab}>Reps</div><div style={{ ...field, ...glow(SET_AT + 9, ROWS_AT - 6) }}><Typed text="8" at={SET_AT + 10} per={3} ghost="–" /></div></div>
      </div>
    </Pop>
    <div style={{ ...CARD, overflow: "hidden", opacity: ease(f, ROWS_AT - 8, ROWS_AT), transform: `translateY(${(1 - ease(f, ROWS_AT - 8, ROWS_AT + 6)) * 50}px)` }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "30px 44px", borderBottom: `2px solid ${C.line}`, fontWeight: 600, fontSize: 30, letterSpacing: 4, color: C.dim, textTransform: "uppercase" }}><span>Member</span><span>Weight</span></div>
      {PEOPLE.map(([name, w], i) => { const at = W_AT + i * 11; const active = f >= at - 3 && f < at + 9;
        return <Pop key={name} at={ROWS_AT + i * 3} y={30}><div style={{ display: "flex", alignItems: "center", gap: 22, padding: "0 40px", height: 150, borderBottom: i < PEOPLE.length - 1 ? `2px solid ${C.line}` : "none", background: `rgba(0,245,212,${active ? 0.09 : 0})` }}>
          <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 47, letterSpacing: -1.2, whiteSpace: "nowrap" }}>{name}</div>
          <div style={{ fontWeight: 600, fontSize: 30, color: C.teal, background: "rgba(0,245,212,.1)", borderRadius: 16, padding: "10px 16px", whiteSpace: "nowrap", flex: "none" }}>Back Squat · 3 × 8</div>
          <div style={{ width: 168, height: 100, borderRadius: 26, border: `2px solid ${active ? C.teal : C.line}`, background: "#0a0c12", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 54, flex: "none" }}><Typed text={w} at={at} per={3} ghost="–" /></div>
        </div></Pop>; })}
    </div>
  </Scene>;
};

// ---- 1. plan the month: write Monday once, it repeats -------------------
const LIFTS: [string, string][] = [["Back Squat", "3 × 8"], ["Arnold Press", "3 × 10"], ["Back Lunge", "3 × 10"], ["Plank Pull-Through", "3 × 12"]];
const WK: [string, string][] = [["Strength", C.teal], ["Upper", C.blue], ["Full", C.purple], ["Lower", C.pink], ["Upper", C.blue], ["Full", C.purple]];   // Mon..Sat
const MonthScene: React.FC = () => {
  const f = useCurrentFrame(); const SAVE = 112, FLIP = 126, FILL = 156;
  const starts = LIFTS.reduce((a: number[], [n], i) => a.concat(i ? a[i - 1] + LIFTS[i - 1][0].length * 1.3 + 9 : 16), [] as number[]);
  const press = ease(f, SAVE - 3, SAVE + 2) * (1 - ease(f, SAVE + 3, SAVE + 9)); const saved = f >= SAVE + 3;
  const a = 1 - ease(f, FLIP - 6, FLIP + 4), b = ease(f, FLIP, FLIP + 12);
  const cellW = (1080 - M * 2 - 60 - 6 * 14) / 7;
  return <Scene len={LENS[0]}>
    <Pop at={2}><div style={{ fontWeight: 600, fontSize: 34, letterSpacing: 7, color: C.blue, textTransform: "uppercase", marginBottom: 14 }}>Plan the month</div></Pop>
    <div style={{ position: "relative", height: 1400 }}>
      <div style={{ position: "absolute", inset: 0, opacity: a, transform: `translateY(${-(1 - a) * 90}px) scale(${0.96 + 0.04 * a})` }}>
        <Pop at={5}><div style={{ display: "flex", alignItems: "baseline", gap: 26, marginBottom: 46 }}><div style={{ fontWeight: 800, fontSize: 118, letterSpacing: -4, lineHeight: 1 }}>Monday</div><div style={{ fontWeight: 600, fontSize: 46, color: C.teal }}>Strength</div></div></Pop>
        <Pop at={9} style={{ ...CARD, overflow: "hidden" }}>
          {LIFTS.map(([n, sets], i) => { const at = starts[i]; const done = at + n.length * 1.3; const s = spring({ frame: f - done, fps: SITE_FPS, config: { damping: 14, stiffness: 240 } });
            return <div key={n} style={{ display: "flex", alignItems: "center", gap: 26, padding: "0 44px", height: 158, borderBottom: `2px solid ${C.line}`, opacity: f >= at - 6 ? 1 : 0.28 }}>
              <div style={{ width: 62, fontWeight: 800, fontSize: 40, color: C.dim }}>{i + 1}</div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 56, letterSpacing: -1 }}><Typed text={n} at={at} per={1.3} ghost="Add a lift" /></div>
              <div style={{ fontWeight: 800, fontSize: 44, color: C.ink, background: C.teal, borderRadius: 20, padding: "10px 24px", opacity: Math.min(1, s * 1.5), transform: `scale(${0.6 + 0.4 * s})` }}>{sets}</div>
            </div>; })}
          <Pop at={90} y={24}><div style={{ display: "flex", alignItems: "center", gap: 20, padding: "34px 44px" }}>
            <div style={{ fontWeight: 600, fontSize: 28, letterSpacing: 4, color: C.dim, textTransform: "uppercase" }}>Repeat</div>
            <div style={{ fontWeight: 800, fontSize: 40, border: `2.5px solid ${C.teal}`, color: C.teal, borderRadius: 22, padding: "12px 24px", whiteSpace: "nowrap" }}>Every Monday</div>
            <div style={{ fontWeight: 800, fontSize: 40, border: `2.5px solid ${C.line}`, borderRadius: 22, padding: "12px 24px", whiteSpace: "nowrap" }}>Dec 1 – Dec 28</div>
          </div></Pop>
        </Pop>
        <Pop at={98} style={{ marginTop: 30 }}><div style={{ height: 134, borderRadius: 40, background: saved ? "rgba(0,245,212,.14)" : C.teal, border: `3px solid ${C.teal}`, color: saved ? C.teal : C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 54, letterSpacing: -1, transform: `scale(${1 - press * 0.05})`, boxShadow: saved ? "none" : "0 24px 60px -18px rgba(0,245,212,.6)" }}>{saved ? "Saved to 4 Mondays" : "Save to every Monday"}</div></Pop>
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: b, transform: `translateY(${(1 - b) * 110}px)` }}>
        <div style={{ fontWeight: 800, fontSize: 118, letterSpacing: -4, lineHeight: 1, marginBottom: 46 }}>December</div>
        <div style={{ ...CARD, padding: 30 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cellW}px)`, gap: 14 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontWeight: 600, fontSize: 30, color: i === 1 ? C.teal : C.dim, paddingBottom: 8 }}>{d}</div>)}
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 1, dow = i % 7, row = Math.floor(i / 7); if(day < 1 || day > 31) return <div key={i} />;   // Dec 1, 2026 is a Tuesday
              const w = dow === 0 ? null : WK[dow - 1]; const mon = dow === 1;
              const s = mon ? spring({ frame: f - (FILL + (row - 1) * 9), fps: SITE_FPS, config: { damping: 11, stiffness: 230, mass: 0.8 } }) : 1;
              const flash = mon ? Math.max(0, 1 - Math.abs(f - (FILL + (row - 1) * 9 + 6)) / 16) : 0;
              return <div key={i} style={{ height: 196, borderRadius: 24, background: "#0a0c12", border: `2.5px solid ${mon && s > 0.05 ? C.teal : C.line}`, padding: "14px 14px", position: "relative", boxShadow: mon ? `0 0 ${60 * flash}px rgba(0,245,212,${0.7 * flash})` : "none", transform: `scale(${1 + flash * 0.09})`, zIndex: mon ? 2 : 1 }}>
                <div style={{ fontWeight: 600, fontSize: 34 }}>{day}</div>
                {w ? <div style={{ position: "absolute", left: 9, right: 9, bottom: 12, height: 64, borderRadius: 16, background: w[1], opacity: mon ? Math.min(1, s * 1.4) : 0.82, transform: `scale(${mon ? 0.4 + 0.6 * s : 1})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: mon ? 20.5 : 26, color: C.ink, letterSpacing: mon ? -1 : -0.6 }}>{w[0]}</div> : null}
              </div>;
            })}
          </div>
        </div>
        <div style={{ marginTop: 34, display: "flex", alignItems: "center", gap: 20, opacity: ease(f, FILL + 30, FILL + 40) }}><Check at={FILL + 30} size={64} /><div style={{ fontWeight: 600, fontSize: 46 }}>Every Monday is set. <span style={{ color: C.dim }}>One entry.</span></div></div>
      </div>
    </div>
  </Scene>;
};

// ---- 3. one member -------------------------------------------------------
const HT = [135, 135, 140, 145, 145, 150, 150, 155, 150, 150];
const MemberScene: React.FC = () => {
  const f = useCurrentFrame(); const W = 1080 - M * 2 - 96, H = 420;
  const pts = HT.map((v, i) => [i * (W / (HT.length - 1)), H - 40 - ((v - 130) / 30) * (H - 100)] as [number, number]);
  const d = pts.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)).join(" "); const draw = ease(f, 44, 82); const len = 1500;
  const tiles: [string, number, string, string][] = [["Visits", 10, "", "#fff"], ["Volume", 79.8, "K", "#fff"], ["PRs", 11, "", C.pink]];
  return <Scene>
    <Pop at={2}><div style={{ fontWeight: 600, fontSize: 34, letterSpacing: 7, color: C.purple, textTransform: "uppercase", marginBottom: 30 }}>Every member</div></Pop>
    <Pop at={5} style={{ display: "flex", alignItems: "center", gap: 34, marginBottom: 50 }}>
      <div style={{ width: 150, height: 150, borderRadius: 46, background: `linear-gradient(140deg, ${C.teal}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 60, color: C.ink, flex: "none" }}>MC</div>
      <div><div style={{ fontWeight: 800, fontSize: 96, letterSpacing: -3, lineHeight: 1 }}>Maya Chen</div><div style={{ fontWeight: 600, fontSize: 38, color: C.dim, marginTop: 10 }}>This month</div></div>
    </Pop>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 20, marginBottom: 28 }}>
      {tiles.map(([l, v, u, col], i) => { const k = ease(f, 16 + i * 5, 46 + i * 5); const val = v * k; return <Pop key={l} at={12 + i * 4} style={{ ...CARD, borderRadius: 36, padding: "30px 32px 34px" }}>
        <div style={{ fontWeight: 600, fontSize: 30, letterSpacing: 4, color: C.dim, textTransform: "uppercase" }}>{l}</div>
        <div style={{ fontWeight: 800, fontSize: 104, letterSpacing: -3, color: col, lineHeight: 1.05, marginTop: 8 }}>{u ? val.toFixed(1) : Math.round(val)}<span style={{ fontSize: 56 }}>{u}</span></div>
      </Pop>; })}
    </div>
    <Pop at={28} style={{ ...CARD, padding: "40px 48px 34px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><div style={{ fontWeight: 800, fontSize: 60, letterSpacing: -1.5 }}>Hip Thrust</div><div style={{ fontWeight: 600, fontSize: 34, color: C.dim }}>10 sessions</div></div>
      <div style={{ position: "relative", height: H, marginTop: 120 }}>
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          {[0, 1, 2].map(i => <line key={i} x1={0} x2={W} y1={60 + i * 130} y2={60 + i * 130} stroke="rgba(255,255,255,.07)" strokeWidth={2} />)}
          <defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stopColor={C.teal} /><stop offset="1" stopColor={C.blue} /></linearGradient></defs>
          <path d={d} fill="none" stroke="url(#lg)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
          {pts.map(([x, y], i) => { const s = spring({ frame: f - (46 + i * 3.6), fps: SITE_FPS, config: { damping: 12, stiffness: 240 } }); const pr = i === 7; return <circle key={i} cx={x} cy={y} r={(pr ? 20 : 11) * s} fill={pr ? C.pink : C.ink} stroke={pr ? C.pink : C.teal} strokeWidth={5} style={pr ? { filter: "drop-shadow(0 0 18px rgba(255,77,157,.9))" } : undefined} />; })}
        </svg>
        <Pop at={78} y={24} style={{ position: "absolute", left: pts[7][0] - 250, top: pts[7][1] - 140 }}><div style={{ background: C.pink, color: "#fff", borderRadius: 26, padding: "16px 28px", fontWeight: 800, fontSize: 42, whiteSpace: "nowrap", boxShadow: "0 20px 50px -10px rgba(255,77,157,.7)" }}>New PR · 155 lb × 10</div></Pop>
      </div>
    </Pop>
  </Scene>;
};

// ---- 4. her own app ------------------------------------------------------
const Ring: React.FC<{ at: number; pct: number; a: string; b: string; label: string; id: string }> = ({ at, pct, a, b, label, id }) => {
  const f = useCurrentFrame(); const R = 176, CIRC = 2 * Math.PI * R; const k = ease(f, at, at + 40) * pct;
  return <Pop at={at - 6} style={{ position: "relative", width: 440, height: 440 }}>
    <svg width={440} height={440} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
      <defs><linearGradient id={id} x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <circle cx={220} cy={220} r={R} fill="none" stroke="#151821" strokeWidth={46} />
      <circle cx={220} cy={220} r={R} fill="none" stroke={`url(#${id})`} strokeWidth={46} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - k)} style={{ filter: `drop-shadow(0 0 22px ${a}88)` }} />
    </svg>
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><div style={{ fontWeight: 800, fontSize: 84, letterSpacing: -2 }}>{Math.round(k * 100)}%</div><div style={{ fontWeight: 600, fontSize: 36, color: C.dim }}>{label}</div></div>
  </Pop>;
};
const WEEK: [string, string, number | null][] = [["Mon", "Lower A class", -99], ["Wed", "Full Body class", -99], ["Thu", "Lower B class", 74], ["Fri", "Upper B class", null]];
const AppScene: React.FC = () => {
  const f = useCurrentFrame();
  return <Scene>
    <Head eyebrow="In her pocket" title="Thu, Nov 26" color={C.pink} />
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 56 }}>
      <Ring at={14} pct={0.72} a={C.pink} b={C.purple} label="Fitness" id="r1" />
      <Ring at={20} pct={0.64} a={C.teal} b={C.blue} label="Nutrition" id="r2" />
    </div>
    <Pop at={36} style={{ ...CARD, overflow: "hidden" }}>
      <div style={{ padding: "34px 44px 26px", fontWeight: 800, fontSize: 56, letterSpacing: -1.5 }}>This week</div>
      {WEEK.map(([d, t, at], i) => { const press = at !== null && at > 0 ? ease(f, at - 3, at + 3) * (1 - ease(f, at + 10, at + 24)) : 0; return <Pop key={d} at={42 + i * 4} y={26}><div style={{ display: "flex", alignItems: "center", gap: 30, padding: "0 44px", height: 150, borderTop: `2px solid ${C.line}`, background: `rgba(255,77,157,${press * 0.14})`, opacity: at === null ? 0.5 : 1 }}>
        <div style={{ width: 96, fontWeight: 600, fontSize: 40, color: C.dim }}>{d}</div>
        {at === null ? <div style={{ width: 70, height: 70, borderRadius: 35, border: "3px solid rgba(255,255,255,.28)", flex: "none" }} /> : <Check at={at as number} size={70} />}
        <div style={{ fontWeight: 600, fontSize: 50, letterSpacing: -1 }}>{t}</div>
      </div></Pop>; })}
    </Pop>
  </Scene>;
};

// ---- 5. what the class worked -------------------------------------------
const BodyScene: React.FC = () => {
  const f = useCurrentFrame(); const lit = ease(f, 26, 48); const BH = 1180, BW = BH * (360 / 760);
  const chips: [string, number][] = [["Abs", 50], ["Glutes", 56], ["Quads", 62]];
  return <Scene>
    <Head eyebrow="After class" title="What it worked" color={C.pink} />
    <div style={{ display: "flex", gap: 18, marginTop: -14 }}>
      {chips.map(([t, at]) => <Pop key={t} at={at} y={22}><div style={{ background: "rgba(255,77,157,.16)", border: `2.5px solid ${C.pink}`, borderRadius: 26, padding: "14px 34px", fontWeight: 800, fontSize: 48 }}>{t}</div></Pop>)}
    </div>
    <div style={{ position: "relative", height: BH, marginTop: 30 }}>
      <div style={{ position: "absolute", left: (1080 - M * 2 - 860) / 2, top: 180, width: 860, height: 860, borderRadius: "50%", background: `radial-gradient(closest-side, rgba(255,77,157,${0.24 * lit}), transparent)` }} />
      <Pop at={10} y={70} style={{ position: "absolute", left: (1080 - M * 2 - BW) / 2, top: 0, width: BW, height: BH }}>
        <Img src={staticFile("site/body-front-off.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <Img src={staticFile("site/body-front.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: lit }} />
      </Pop>
    </div>
    <Pop at={84} y={80} style={{ ...CARD, marginTop: 24, padding: "34px 44px", border: `2.5px solid rgba(0,245,212,.55)`, background: "linear-gradient(165deg, rgba(14,40,40,.96), rgba(10,16,22,.96))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div><div style={{ fontWeight: 600, fontSize: 30, letterSpacing: 5, color: C.teal, textTransform: "uppercase" }}>Add one more</div><div style={{ fontWeight: 800, fontSize: 62, letterSpacing: -1.5, marginTop: 8 }}>Pallof Press</div><div style={{ fontWeight: 600, fontSize: 36, color: C.dim, marginTop: 4 }}>Obliques were missed</div></div>
      <div style={{ width: 104, height: 104, borderRadius: 52, background: C.teal, color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 76, lineHeight: 1, flex: "none" }}>+</div>
    </Pop>
  </Scene>;
};

export const SiteClip: React.FC = () => {
  const scenes: [React.FC, number][] = [[MonthScene, 0], [ClassScene, 0], [() => <MemberScene />, 0], [() => <AppScene />, 0], [() => <BodyScene />, 0]];
  let from = 0;
  return <AbsoluteFill style={{ background: C.ink }}>
    <style>{fontFace}</style>
    <AbsoluteFill style={{ background: "radial-gradient(900px 700px at 80% -6%, rgba(0,245,212,.13), transparent 70%), radial-gradient(800px 800px at 0% 100%, rgba(77,184,255,.08), transparent 70%)" }} />
    {scenes.map(([S], i) => { const at = from; from += LENS[i]; return <Sequence key={i} from={at} durationInFrames={LENS[i] + OVER} layout="none"><S /></Sequence>; })}
  </AbsoluteFill>;
};

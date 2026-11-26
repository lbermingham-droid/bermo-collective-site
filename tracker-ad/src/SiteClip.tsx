import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";

// The website's phone-slot clip (1080 x 2208, the slot's 360:736 shape).
// NOT a screen recording: each scene is the app's screen redrawn large and
// animated, the way product sites show software. Five scenes, loops.
//
// Scenes 1-2 follow the gym's real paper sheets (she sent photos):
//  - the coach's plan sheet lists Monday's lifts with a prescription (3 x 8,
//    3 x 6/6 per side) and it is the same every Monday of the month;
//  - what each person DID goes on their own card as reps x weight per set.
//    Weight climbs set to set, people do different numbers of sets and
//    reps, and some add a bonus set. Never one weight per person.
//
// Look: restrained on purpose. Flat neutral surfaces, hairlines, one accent
// used only for the primary action / active state. No glows, no gradients.
export const SITE_FPS = 30;
const OVER = 12;
const LENS = [216, 196, 120, 120, 120];
export const SITE_DURATION = LENS.reduce((a, b) => a + b, 0);
const C = { teal: "#00e0c2", blue: "#6aa9ff", purple: "#a895ff", pink: "#ff5c9a", bg: "#0b0c0f", surf: "#14161b", surf2: "#1c1f26", line: "rgba(255,255,255,.075)", text: "#f2f3f5", dim: "#8a8f9b", faint: "#555a66" };
const FONT = "InterTight";
const fontFace = `@font-face{font-family:${FONT};font-weight:800;src:url(${staticFile("fonts/intertight-800.woff2")}) format("woff2")}
@font-face{font-family:${FONT};font-weight:600;src:url(${staticFile("fonts/intertight-600.woff2")}) format("woff2")}`;
const M = 56, TOP = 330;
const CARD: React.CSSProperties = { background: C.surf, border: `2px solid ${C.line}`, borderRadius: 28 };
const LABEL: React.CSSProperties = { fontWeight: 600, fontSize: 27, letterSpacing: 3, color: C.dim, textTransform: "uppercase" };
const tint = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

const useS = (delay: number, stiff = 190, damp = 22) => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return spring({ frame: f - delay, fps, config: { damping: damp, stiffness: stiff, mass: 0.8 } }); };
const sp = (f: number, at: number, stiff = 220, damp = 20) => spring({ frame: f - at, fps: SITE_FPS, config: { damping: damp, stiffness: stiff, mass: 0.8 } });
const ease = (f: number, a: number, b: number, from = 0, to = 1) => interpolate(f, [a, b], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
const Pop: React.FC<{ at: number; y?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ at, y = 28, style, children }) => { const s = useS(at); return <div style={{ opacity: Math.min(1, s * 1.8), transform: `translateY(${(1 - s) * y}px)`, ...style }}>{children}</div>; };

// One screen: slides in under the app bar, holds, slides away.
const Scene: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame(); const s = useS(0, 150, 24); const out = ease(f, len - 2, len + OVER - 2);
  return <AbsoluteFill style={{ top: TOP, opacity: Math.min(1, s * 1.6) * (1 - out), transform: `translateY(${(1 - s) * 70 - out * 50}px)`, padding: `0 ${M}px`, fontFamily: FONT, color: C.text }}>{children}</AbsoluteFill>;
};
const Title: React.FC<{ children: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }> = ({ children, sub, right }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40 }}>
    <div><div style={{ fontWeight: 800, fontSize: 86, letterSpacing: -2.6, lineHeight: 1 }}>{children}</div>{sub ? <div style={{ fontWeight: 600, fontSize: 38, color: C.dim, marginTop: 12 }}>{sub}</div> : null}</div>
    {right}
  </div>
);
const Tick: React.FC<{ at: number; size?: number }> = ({ at, size = 60 }) => {
  const f = useCurrentFrame(); const s = sp(f, at, 300, 18); const draw = ease(f, at + 2, at + 9);
  return <div style={{ width: size, height: size, borderRadius: size / 2, border: `3px solid ${s > 0.02 ? C.teal : C.faint}`, background: tint(C.teal, s), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
    <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={C.bg} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={22} strokeDashoffset={22 * (1 - draw)} /></svg>
  </div>;
};
// text that types itself, with a caret while it is being written
const Typed: React.FC<{ text: string; at: number; per?: number; ghost?: string }> = ({ text, at, per = 1.4, ghost }) => {
  const f = useCurrentFrame(); const n = Math.max(0, Math.min(text.length, Math.floor((f - at) / per))); const typing = f >= at - 4 && n < text.length;
  return <span>{n === 0 && ghost ? <span style={{ color: C.faint }}>{ghost}</span> : text.slice(0, n)}{typing ? <span style={{ display: "inline-block", width: 4, height: "0.95em", background: C.teal, marginLeft: 3, verticalAlign: "-0.12em", opacity: Math.floor(f / 8) % 2 ? 0.2 : 1 }} /> : null}</span>;
};

// ---- the app bar: one product, the active tab slides ---------------------
const COACH_TABS = ["Class", "Calendar", "Members"], MEMBER_TABS = ["Home", "Lifts", "Body"];
const AppBar: React.FC = () => {
  const f = useCurrentFrame(); const starts = LENS.map((_, i) => LENS.slice(0, i).reduce((a, b) => a + b, 0));
  const member = ease(f, starts[3] - 4, starts[3] + 8);                    // coach side -> her own app
  const idx = (tabsAt: [number, number][]) => tabsAt.reduce((v, [at, to], i) => v + (to - (i ? tabsAt[i - 1][1] : tabsAt[0][1])) * sp(f, at, 170, 22), tabsAt[0][1]);
  const ci = idx([[0, 1], [starts[1], 0], [starts[2], 2]]), mi = idx([[0, 0], [starts[4], 2]]);
  const Tabs: React.FC<{ tabs: string[]; i: number }> = ({ tabs, i }) => <div style={{ position: "relative", display: "flex", gap: 54, borderBottom: `2px solid ${C.line}` }}>
    {tabs.map((t, k) => <div key={t} style={{ width: 190, fontWeight: 600, fontSize: 40, paddingBottom: 22, color: Math.abs(i - k) < 0.5 ? C.text : C.dim }}>{t}</div>)}
    <div style={{ position: "absolute", left: i * 244, bottom: -2, width: 120, height: 5, borderRadius: 3, background: C.teal }} />
  </div>;
  const Side: React.FC<{ o: number; name: string; who: string; tabs: string[]; i: number }> = ({ o, name, who, tabs, i }) => <div style={{ position: "absolute", left: M, right: M, top: 84, opacity: o }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}><div style={{ width: 60, height: 60, borderRadius: 16, background: C.text, color: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 36 }}>B</div><div style={{ fontWeight: 800, fontSize: 42, letterSpacing: -1 }}>{name}</div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontWeight: 600, fontSize: 34, color: C.dim }}>{who}<div style={{ width: 60, height: 60, borderRadius: 30, background: C.surf2, border: `2px solid ${C.line}`, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 28 }}>{who.split(" ").map(w => w[0]).join("")}</div></div>
    </div>
    <Tabs tabs={tabs} i={i} />
  </div>;
  return <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
    <Side o={1 - member} name="Coach" who="Kim R" tabs={COACH_TABS} i={ci} />
    <Side o={member} name="My training" who="Maya C" tabs={MEMBER_TABS} i={mi} />
  </AbsoluteFill>;
};

// ---- 1. plan the month: write Monday once, it repeats -------------------
const LIFTS: [string, string][] = [["Back Squat", "3 × 8"], ["Arnold Press", "3 × 10"], ["Back Lunge", "3 × 6/6"], ["Plank Pull-Through", "3 × 10"]];
const WK: [string, string][] = [["Strength", C.teal], ["Upper", C.blue], ["Full", C.purple], ["Lower", C.pink], ["Upper", C.blue], ["Full", C.purple]];   // Mon..Sat
const MonthScene: React.FC = () => {
  const f = useCurrentFrame(); const SAVE = 112, FLIP = 126, FILL = 156;
  const starts = LIFTS.reduce((a: number[], _, i) => a.concat(i ? a[i - 1] + LIFTS[i - 1][0].length * 1.3 + 9 : 14), [] as number[]);
  const press = ease(f, SAVE - 3, SAVE + 2) * (1 - ease(f, SAVE + 3, SAVE + 9)); const saved = f >= SAVE + 3;
  const a = 1 - ease(f, FLIP - 6, FLIP + 4), b = ease(f, FLIP, FLIP + 12);
  const cellW = (1080 - M * 2 - 44 - 6 * 10) / 7;
  const field: React.CSSProperties = { flex: 1, background: C.bg, border: `2px solid ${C.line}`, borderRadius: 18, padding: "18px 26px" };
  return <Scene len={LENS[0]}>
    <div style={{ position: "relative", height: 1700 }}>
      <div style={{ position: "absolute", inset: 0, opacity: a, transform: `translateY(${-(1 - a) * 50}px)` }}>
        <Title sub="Strength · the plan for this day">Monday</Title>
        <Pop at={6} style={{ ...CARD, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "26px 36px", borderBottom: `2px solid ${C.line}`, ...LABEL }}><span>Lift</span><span>Sets × reps</span></div>
          {LIFTS.map(([n, sets], i) => { const at = starts[i]; const done = at + n.length * 1.3;
            return <div key={n} style={{ display: "flex", alignItems: "center", gap: 24, padding: "0 36px", height: 140, borderBottom: `2px solid ${C.line}`, background: f >= at - 4 && f < done + 6 ? C.surf2 : "transparent" }}>
              <div style={{ width: 44, fontWeight: 600, fontSize: 36, color: C.faint }}>{i + 1}</div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 50, letterSpacing: -0.8 }}><Typed text={n} at={at} per={1.3} ghost="Add a lift" /></div>
              <div style={{ fontWeight: 600, fontSize: 46, color: C.text, opacity: ease(f, done, done + 6), fontVariantNumeric: "tabular-nums" }}>{sets}</div>
            </div>; })}
          <Pop at={88} y={16}><div style={{ padding: "30px 36px 34px" }}>
            <div style={{ ...LABEL, marginBottom: 16 }}>Repeat</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={field}><div style={{ fontWeight: 600, fontSize: 28, color: C.dim }}>Every</div><div style={{ fontWeight: 600, fontSize: 46, marginTop: 4 }}>Monday</div></div>
              <div style={field}><div style={{ fontWeight: 600, fontSize: 28, color: C.dim }}>From</div><div style={{ fontWeight: 600, fontSize: 46, marginTop: 4 }}>Dec 1</div></div>
              <div style={field}><div style={{ fontWeight: 600, fontSize: 28, color: C.dim }}>Until</div><div style={{ fontWeight: 600, fontSize: 46, marginTop: 4 }}>Dec 28</div></div>
            </div>
          </div></Pop>
        </Pop>
        <Pop at={98} style={{ marginTop: 26 }}><div style={{ height: 120, borderRadius: 22, background: saved ? C.surf2 : C.teal, color: saved ? C.text : C.bg, display: "flex", alignItems: "center", justifyContent: "center", gap: 18, fontWeight: 800, fontSize: 46, letterSpacing: -0.6, transform: `scale(${1 - press * 0.03})` }}>{saved ? "Saved to 4 Mondays" : "Save plan"}</div></Pop>
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: b, transform: `translateY(${(1 - b) * 60}px)` }}>
        <Title sub="Tap any day to open its class">December 2026</Title>
        <div style={{ ...CARD, padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(7, ${cellW}px)`, gap: 10 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} style={{ textAlign: "center", fontWeight: 600, fontSize: 28, color: C.dim, padding: "8px 0 10px" }}>{d}</div>)}
            {Array.from({ length: 35 }, (_, i) => {
              const day = i - 1, dow = i % 7, row = Math.floor(i / 7); if(day < 1 || day > 31) return <div key={i} />;   // Dec 1, 2026 is a Tuesday
              const w = dow === 0 ? null : WK[dow - 1]; const mon = dow === 1; const at = FILL + (row - 1) * 9;
              const s = mon ? sp(f, at, 240, 16) : 1; const hot = mon ? Math.max(0, 1 - Math.abs(f - at - 5) / 14) : 0;
              return <div key={i} style={{ height: 190, borderRadius: 16, background: mon && s > 0.05 ? C.surf2 : C.bg, border: `2px solid ${mon && s > 0.05 ? tint(C.teal, 0.3 + 0.7 * hot) : C.line}`, padding: "12px 12px", position: "relative" }}>
                <div style={{ fontWeight: 600, fontSize: 32, color: dow === 0 ? C.faint : C.text }}>{day}</div>
                {w ? <div style={{ position: "absolute", left: 8, right: 8, bottom: 10, height: 54, borderRadius: 10, background: mon ? C.teal : tint(w[1], 0.14), opacity: mon ? Math.min(1, s * 1.5) : 1, transform: `scale(${mon ? 0.7 + 0.3 * s : 1})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: mon ? 22 : 25, color: mon ? C.bg : w[1], letterSpacing: mon ? -0.8 : -0.3 }}>{w[0]}</div> : null}
              </div>;
            })}
          </div>
        </div>
        <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 20, opacity: ease(f, FILL + 30, FILL + 40) }}><Tick at={FILL + 30} size={56} /><div style={{ fontWeight: 600, fontSize: 42 }}>4 Mondays planned from one entry</div></div>
      </div>
    </div>
  </Scene>;
};

// ---- 2. the class: one lift, each member's own sets ---------------------
// reps x weight per set, like the gym's cards: weight climbs, set counts differ
type SetRow = [number, number, string?];
const CLASS: [string, string, SetRow[]][] = [
  ["Ana Souza", "Last 8 × 125", [[8, 95], [8, 115], [8, 135, "pr"]]],
  ["Chris Walker", "Last 6 × 165", [[6, 135], [6, 155], [6, 165], [3, 175, "bonus"]]],
  ["Jordan Reyes", "First time", [[8, 65], [8, 75]]],
  ["Lena Fischer", "Last 6 × 110", [[8, 95], [6, 115], [6, 125]]],
  ["Maya Chen", "Last 8 × 105", [[8, 95], [8, 105], [6, 115, "pr"]]],
];
const ClassScene: React.FC = () => {
  const f = useCurrentFrame(); const LIFT_AT = 12, ROWS_AT = 38, SETS_AT = 60, STEP = 7;
  let k = 0; const done = CLASS.reduce((n, [, , sets]) => n + sets.filter((_, j) => f >= SETS_AT + (k++ + 0) * STEP + j * 0).length, 0); k = 0;
  return <Scene len={LENS[1]}>
    <Title sub="Monday, Dec 7 · 5 checked in" right={<Pop at={SETS_AT - 6}><div style={{ textAlign: "right" }}><div style={{ fontWeight: 800, fontSize: 86, letterSpacing: -2, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{done}</div><div style={{ fontWeight: 600, fontSize: 32, color: C.dim, marginTop: 10 }}>sets logged</div></div></Pop>}>Class</Title>
    <Pop at={6} style={{ ...CARD, padding: "24px 32px 28px", marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "space-between", borderColor: f >= LIFT_AT - 4 && f < ROWS_AT - 4 ? tint(C.teal, 0.8) : C.line }}>
      <div><div style={{ ...LABEL, marginBottom: 8 }}>Lift</div><div style={{ fontWeight: 800, fontSize: 58, letterSpacing: -1.2 }}><Typed text="Back Squat" at={LIFT_AT} per={1.7} ghost="Choose or type a lift" /></div></div>
      <div style={{ textAlign: "right", opacity: ease(f, LIFT_AT + 20, LIFT_AT + 26) }}><div style={{ ...LABEL, marginBottom: 8 }}>Plan</div><div style={{ fontWeight: 600, fontSize: 46, color: C.dim }}>3 × 8</div></div>
    </Pop>
    <div style={{ ...CARD, overflow: "hidden", opacity: ease(f, ROWS_AT - 6, ROWS_AT + 2) }}>
      {CLASS.map(([name, last, sets], i) => {
        const first = k; k += sets.length; const live = f >= SETS_AT + first * STEP - 3 && f < SETS_AT + (first + sets.length) * STEP + 2;
        return <Pop key={name} at={ROWS_AT + i * 3} y={20}><div style={{ padding: "26px 32px 28px", borderBottom: i < CLASS.length - 1 ? `2px solid ${C.line}` : "none", background: live ? C.surf2 : "transparent" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}><div style={{ fontWeight: 600, fontSize: 48, letterSpacing: -0.8 }}>{name}</div><div style={{ fontWeight: 600, fontSize: 32, color: C.dim }}>{last}</div></div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {sets.map(([reps, w, tag], j) => { const at = SETS_AT + (first + j) * STEP; const s = sp(f, at, 300, 20); const col = tag === "pr" ? C.pink : C.text;
              return <div key={j} style={{ opacity: Math.min(1, s * 2), transform: `translateY(${(1 - s) * 14}px)`, background: tag === "pr" ? tint(C.pink, 0.14) : C.bg, border: `2px solid ${tag === "pr" ? tint(C.pink, 0.55) : C.line}`, borderRadius: 16, padding: "12px 18px 14px", minWidth: 150 }}>
                <div style={{ fontWeight: 600, fontSize: 24, letterSpacing: 2, color: tag === "pr" ? C.pink : C.dim, textTransform: "uppercase" }}>{tag === "pr" ? "PR" : tag === "bonus" ? "Bonus" : "Set " + (j + 1)}</div>
                <div style={{ fontWeight: 800, fontSize: 44, letterSpacing: -0.8, color: col, marginTop: 2, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{reps} <span style={{ color: C.dim, fontWeight: 600 }}>×</span> {w}</div>
              </div>; })}
            <div style={{ width: 62, height: 62, borderRadius: 31, border: `2px dashed ${C.faint}`, color: C.dim, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 40, lineHeight: 1, marginLeft: 6, opacity: ease(f, SETS_AT + (first + sets.length) * STEP, SETS_AT + (first + sets.length) * STEP + 6) }}>+</div>
          </div>
        </div></Pop>; })}
    </div>
  </Scene>;
};

// ---- 3. one member -------------------------------------------------------
const HT = [95, 95, 100, 105, 105, 110, 110, 115, 110, 115];
const MemberScene: React.FC = () => {
  const f = useCurrentFrame(); const W = 1080 - M * 2 - 72, H = 400;
  const pts = HT.map((v, i) => [i * (W / (HT.length - 1)), H - 40 - ((v - 90) / 30) * (H - 110)] as [number, number]);
  const d = pts.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)).join(" "); const draw = ease(f, 40, 78); const len = 1500;
  const tiles: [string, number, string, string][] = [["Visits", 10, "", "+2 vs Nov"], ["Volume", 79.8, "K", "lb this month"], ["PRs", 3, "", "this month"]];
  return <Scene len={LENS[2]}>
    <Pop at={2} style={{ display: "flex", alignItems: "center", gap: 28, marginBottom: 40 }}>
      <div style={{ width: 128, height: 128, borderRadius: 64, background: C.surf2, border: `2px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 48, flex: "none" }}>MC</div>
      <div><div style={{ fontWeight: 800, fontSize: 86, letterSpacing: -2.6, lineHeight: 1 }}>Maya Chen</div><div style={{ fontWeight: 600, fontSize: 38, color: C.dim, marginTop: 12 }}>Member since September · Mon, Wed, Fri</div></div>
    </Pop>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16, marginBottom: 22 }}>
      {tiles.map(([l, v, u, note], i) => { const kk = ease(f, 12 + i * 5, 40 + i * 5); const val = v * kk; return <Pop key={l} at={8 + i * 4} style={{ ...CARD, padding: "26px 28px 28px" }}>
        <div style={LABEL}>{l}</div>
        <div style={{ fontWeight: 800, fontSize: 92, letterSpacing: -2.4, lineHeight: 1.08, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{u ? val.toFixed(1) : Math.round(val)}<span style={{ fontSize: 50 }}>{u}</span></div>
        <div style={{ fontWeight: 600, fontSize: 28, color: C.dim, marginTop: 4 }}>{note}</div>
      </Pop>; })}
    </div>
    <Pop at={24} style={{ ...CARD, padding: "32px 36px 30px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><div style={{ fontWeight: 800, fontSize: 54, letterSpacing: -1.2 }}>Back Squat</div><div style={{ fontWeight: 600, fontSize: 32, color: C.dim }}>Top set, last 10 classes</div></div>
      <div style={{ position: "relative", height: H, marginTop: 110 }}>
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          {[0, 1, 2].map(i => <line key={i} x1={0} x2={W} y1={50 + i * 130} y2={50 + i * 130} stroke={C.line} strokeWidth={2} />)}
          <path d={d} fill="none" stroke={C.text} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
          {pts.map(([x, y], i) => { const s = sp(f, 42 + i * 3.6, 260, 16); const pr = i === 9; return <circle key={i} cx={x} cy={y} r={(pr ? 16 : 9) * s} fill={pr ? C.pink : C.surf} stroke={pr ? C.pink : C.text} strokeWidth={4} />; })}
        </svg>
        <Pop at={80} y={16} style={{ position: "absolute", right: -8, top: pts[9][1] - 118 }}><div style={{ background: C.pink, color: "#fff", borderRadius: 14, padding: "12px 22px", fontWeight: 800, fontSize: 38, whiteSpace: "nowrap" }}>PR · 6 × 115</div></Pop>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontWeight: 600, fontSize: 28, color: C.dim }}><span>Oct 5</span><span>Dec 7</span></div>
    </Pop>
    <Pop at={50} style={{ ...CARD, marginTop: 22, overflow: "hidden" }}>
      <div style={{ padding: "26px 36px", borderBottom: `2px solid ${C.line}`, ...LABEL }}>Recent classes</div>
      {([["Mon, Dec 7", "Strength", "8 × 95 · 8 × 105 · 6 × 115"], ["Fri, Dec 4", "Upper", "DB Bench 3 × 10 at 30"], ["Wed, Dec 2", "Full Body", "Deadlift 8 × 115 · 6 × 135"]] as [string, string, string][]).map(([d, w, sets], i) => <Pop key={d} at={56 + i * 4} y={16}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", height: 132, borderBottom: i < 2 ? `2px solid ${C.line}` : "none" }}>
        <div><div style={{ fontWeight: 600, fontSize: 42, letterSpacing: -0.6 }}>{w}</div><div style={{ fontWeight: 600, fontSize: 28, color: C.dim, marginTop: 2 }}>{d}</div></div>
        <div style={{ fontWeight: 600, fontSize: 34, color: C.dim, fontVariantNumeric: "tabular-nums" }}>{sets}</div>
      </div></Pop>)}
    </Pop>
  </Scene>;
};

// ---- 4. her own app ------------------------------------------------------
const Ring: React.FC<{ at: number; pct: number; color: string; label: string; value: string }> = ({ at, pct, color, label, value }) => {
  const f = useCurrentFrame(); const R = 150, CIRC = 2 * Math.PI * R; const kk = ease(f, at, at + 38) * pct;
  return <Pop at={at - 6} style={{ ...CARD, padding: "34px 0 30px", display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div style={{ position: "relative", width: 360, height: 360 }}>
      <svg width={360} height={360} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={180} cy={180} r={R} fill="none" stroke={C.surf2} strokeWidth={34} />
        <circle cx={180} cy={180} r={R} fill="none" stroke={color} strokeWidth={34} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - kk)} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><div style={{ fontWeight: 800, fontSize: 76, letterSpacing: -2, fontVariantNumeric: "tabular-nums" }}>{Math.round(kk * 100)}%</div></div>
    </div>
    <div style={{ fontWeight: 600, fontSize: 40, marginTop: 20 }}>{label}</div>
    <div style={{ fontWeight: 600, fontSize: 30, color: C.dim, marginTop: 4 }}>{value}</div>
  </Pop>;
};
const WEEK: [string, string, string, number | null][] = [["Mon", "Strength class", "Back Squat 6 × 115", 66], ["Wed", "Full Body class", "Planned", null], ["Fri", "Upper class", "Planned", null]];
const AppScene: React.FC = () => {
  const f = useCurrentFrame();
  return <Scene len={LENS[3]}>
    <Title sub="Monday, Dec 7">Today</Title>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginBottom: 22 }}>
      <Ring at={12} pct={0.72} color={C.pink} label="Fitness" value="43 of 60 min" />
      <Ring at={18} pct={0.64} color={C.teal} label="Nutrition" value="1,150 of 1,800 cal" />
    </div>
    <Pop at={34} style={{ ...CARD, overflow: "hidden" }}>
      <div style={{ padding: "26px 36px", borderBottom: `2px solid ${C.line}`, ...LABEL }}>This week</div>
      {WEEK.map(([d, t, note, at], i) => { const done = at !== null && f >= at; return <Pop key={d} at={40 + i * 4} y={18}><div style={{ display: "flex", alignItems: "center", gap: 26, padding: "0 36px", height: 150, borderBottom: i < WEEK.length - 1 ? `2px solid ${C.line}` : "none" }}>
        <div style={{ width: 86, fontWeight: 600, fontSize: 38, color: C.dim }}>{d}</div>
        {at === null ? <div style={{ width: 60, height: 60, borderRadius: 30, border: `3px solid ${C.faint}`, flex: "none" }} /> : <Tick at={at} />}
        <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 46, letterSpacing: -0.8 }}>{t}</div><div style={{ fontWeight: 600, fontSize: 30, color: done && at !== null ? C.pink : C.dim, marginTop: 4 }}>{at !== null && !done ? "In class now" : note}{done ? " · PR" : ""}</div></div>
      </div></Pop>; })}
    </Pop>
  </Scene>;
};

// ---- 5. what the class worked -------------------------------------------
const BodyScene: React.FC = () => {
  const f = useCurrentFrame(); const lit = ease(f, 24, 46); const BH = 1130, BW = BH * (360 / 760);
  return <Scene len={LENS[4]}>
    <Title sub="Monday's class, on her body">What it worked</Title>
    <div style={{ ...CARD, position: "relative", height: BH + 60, overflow: "hidden" }}>
      <Pop at={8} y={40} style={{ position: "absolute", left: (1080 - M * 2 - BW) / 2, top: 30, width: BW, height: BH }}>
        <Img src={staticFile("site/body-front-off.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        <Img src={staticFile("site/body-front.png")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: lit }} />
      </Pop>
      <div style={{ position: "absolute", left: 32, top: 32, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...LABEL, marginBottom: 4, opacity: ease(f, 44, 50) }}>Worked</div>
        {["Quads", "Glutes", "Abs"].map((t, i) => <Pop key={t} at={48 + i * 5} y={14}><div style={{ display: "flex", alignItems: "center", gap: 14, fontWeight: 600, fontSize: 42 }}><span style={{ width: 18, height: 18, borderRadius: 9, background: C.pink }} />{t}</div></Pop>)}
      </div>
    </div>
    <Pop at={80} y={40} style={{ ...CARD, marginTop: 20, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div><div style={LABEL}>Add one more</div><div style={{ fontWeight: 800, fontSize: 54, letterSpacing: -1.2, marginTop: 8 }}>Pallof Press</div><div style={{ fontWeight: 600, fontSize: 34, color: C.dim, marginTop: 4 }}>Obliques were missed today</div></div>
      <div style={{ height: 92, padding: "0 34px", borderRadius: 18, background: C.teal, color: C.bg, display: "flex", alignItems: "center", fontWeight: 800, fontSize: 40, flex: "none" }}>Add</div>
    </Pop>
  </Scene>;
};

export const SiteClip: React.FC = () => {
  const scenes: React.FC[] = [MonthScene, ClassScene, MemberScene, AppScene, BodyScene];
  let from = 0;
  return <AbsoluteFill style={{ background: C.bg }}>
    <style>{fontFace}</style>
    <AppBar />
    {scenes.map((S, i) => { const at = from; from += LENS[i]; return <Sequence key={i} from={at} durationInFrames={LENS[i] + OVER} layout="none"><S /></Sequence>; })}
  </AbsoluteFill>;
};

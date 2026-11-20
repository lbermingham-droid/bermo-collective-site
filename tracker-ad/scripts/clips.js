// Looks in public/clips for gym / run / beach / food (.mp4 or .mov) and
// writes src/clips.json so the ad uses real footage where it exists and a
// labelled placeholder where it does not.
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "public", "clips"); const out = {};
for (const name of ["gym", "run", "beach", "food"]) { const f = [".mp4", ".mov", ".webm"].map(e => name + e).find(f => fs.existsSync(path.join(dir, f))); out[name] = f ? "clips/" + f : null; }
// how many cut-out frames exist per clip (scripts/matte.py)
out.mattes = {}; for (const name of ["gym", "run", "beach"]) { const d = path.join(__dirname, "..", "public", "mattes", name); out.mattes[name] = fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith(".webp")).length : 0; }
fs.writeFileSync(path.join(__dirname, "..", "src", "clips.json"), JSON.stringify(out, null, 2) + "\n"); console.log("clips:", JSON.stringify(out));

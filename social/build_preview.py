"""Build a self-contained HTML preview with all 5 slides embedded as base64."""
import base64
from pathlib import Path

ROOT = Path(__file__).parent
slides = [ROOT / f"slide{i}.png" for i in range(1, 6)]

def embed(p):
    return base64.b64encode(p.read_bytes()).decode()

cards = ""
for i, p in enumerate(slides, 1):
    b64 = embed(p)
    cards += f"""
    <figure>
      <img src="data:image/png;base64,{b64}" alt="Slide {i}" />
      <figcaption>Slide {i} — long-press to save</figcaption>
    </figure>
    """

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Inside My Head — Carousel Preview</title>
<style>
  :root {{ --cyan: #00F5D4; }}
  body {{ background:#0a0a0a; color:#fff; font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif; margin:0; padding:24px; }}
  h1 {{ font-size:18px; font-weight:800; letter-spacing:-0.02em; margin:0 0 6px; }}
  p.note {{ color:#888; font-size:13px; margin:0 0 28px; }}
  figure {{ margin:0 0 32px; }}
  img {{ display:block; width:100%; height:auto; border:1px solid #222; border-radius:6px; }}
  figcaption {{ color:var(--cyan); font-size:12px; letter-spacing:0.08em; text-transform:uppercase; margin-top:8px; }}
</style>
</head>
<body>
  <h1>INSIDE MY HEAD — Carousel</h1>
  <p class="note">Long-press each image → "Save to Photos" → upload to Instagram in order.</p>
  {cards}
</body>
</html>
"""

out = ROOT / "preview.html"
out.write_text(html)
print(f"Built: {out}  ({out.stat().st_size // 1024} KB)")

"""Cut the subject out of each clip, frame by frame, so the ad's big text
can sit BEHIND her (text between the scene and the person).

    /usr/local/bin/python3.13 scripts/matte.py        (needs: pip install rembg onnxruntime pillow)

Reads public/clips/{gym,run,beach}.mp4, writes public/mattes/<clip>/NNN.webp
(RGBA, 1080 wide, first 50 frames at 30 fps). Output is gitignored.
"""
import os, subprocess, sys, glob
from rembg import remove, new_session
from PIL import Image
ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
N = 50
session = new_session("u2net")
for clip in ["gym", "run", "beach"]:
    src = os.path.join(ROOT, "clips", clip + ".mp4")
    if not os.path.exists(src): print("skip", clip); continue
    out = os.path.join(ROOT, "mattes", clip); tmp = os.path.join(out, "_src"); os.makedirs(tmp, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-frames:v", str(N), "-vf", "scale=1080:-2", os.path.join(tmp, "%03d.png")], check=True)
    for f in sorted(glob.glob(os.path.join(tmp, "*.png"))):
        cut = remove(Image.open(f).convert("RGB"), session=session, post_process_mask=True)
        cut.save(os.path.join(out, os.path.basename(f).replace(".png", ".webp")), "WEBP", quality=86, method=4)
        os.remove(f)
    os.rmdir(tmp); print(clip, len(glob.glob(os.path.join(out, "*.webp"))), "frames")

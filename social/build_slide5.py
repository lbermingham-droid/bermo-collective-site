"""Build Instagram Slide 5 CTA with Lexi photo + brand template."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).parent
PHOTO = ROOT.parent / "lexi-photo.jpg"
FONTS = ROOT / "fonts"
OUT = ROOT / "slide5-cta.png"

# Canvas — square IG carousel
W, H = 1080, 1080
BG = (255, 255, 255)
BLACK = (0, 0, 0)
CYAN = (0, 245, 212)  # #00F5D4
GREY = (140, 140, 140)

img = Image.new("RGB", (W, H), BG)

# === RIGHT HALF: photo ===
photo = Image.open(PHOTO).convert("RGB")
# Crop right portion of canvas for photo
photo_w = W // 2
photo_h = H
# Resize photo to fill right panel, preserve aspect
ratio = max(photo_w / photo.width, photo_h / photo.height)
new_w, new_h = int(photo.width * ratio), int(photo.height * ratio)
photo_resized = photo.resize((new_w, new_h), Image.LANCZOS)
# Center crop
left = (new_w - photo_w) // 2
top = (new_h - photo_h) // 2
photo_cropped = photo_resized.crop((left, top, left + photo_w, top + photo_h))
img.paste(photo_cropped, (W // 2, 0))

# === LEFT HALF: white panel with mint border ===
draw = ImageDraw.Draw(img)

# Mint border frame around left panel content
margin = 60
border_thickness = 8
panel_left = margin
panel_top = margin
panel_right = W // 2 - margin // 2
panel_bottom = H - margin

# Draw mint border (outline only)
for i in range(border_thickness):
    draw.rectangle(
        [panel_left + i, panel_top + i, panel_right - i, panel_bottom - i],
        outline=CYAN,
    )

# === TYPOGRAPHY ===
mont_black = lambda s: ImageFont.truetype(str(FONTS / "Montserrat-Black.ttf"), s)
inter_bold = lambda s: ImageFont.truetype(str(FONTS / "Inter-Bold.ttf"), s)
inter_reg = lambda s: ImageFont.truetype(str(FONTS / "Inter-Regular.ttf"), s)

# Inner text padding
tx = panel_left + 50
ty = panel_top + 70

# Small caps tag
tag_font = inter_reg(14)
tag = "BERMO.COLLECTIVE"
draw.text((tx, ty), tag, font=tag_font, fill=GREY, spacing=4)
ty += 30

# Mint accent bar (small, above headline)
draw.rectangle([tx, ty + 5, tx + 60, ty + 13], fill=CYAN)
ty += 40

# === HEADLINE BLOCK 1 (BLACK) ===
headline_font = mont_black(54)
black_lines = ["FIND THE", "EXACT", "PLACE", "YOUR", "BUSINESS", "BREAKS."]
for line in black_lines:
    draw.text((tx, ty), line, font=headline_font, fill=BLACK)
    ty += 60

ty += 20

# === PUNCHLINE BLOCK (CYAN) ===
punch_font = mont_black(72)
cyan_lines = ["LET'S", "CHAT."]
for line in cyan_lines:
    draw.text((tx, ty), line, font=punch_font, fill=CYAN)
    ty += 78

ty += 25

# Mint underline bar
draw.rectangle([tx, ty, tx + 90, ty + 10], fill=CYAN)
ty += 35

# === SUB ===
sub_font = inter_bold(20)
draw.text((tx, ty), "The fix is easier", font=sub_font, fill=BLACK)
ty += 28
draw.text((tx, ty), "than you think.", font=sub_font, fill=BLACK)
ty += 45

# === FOOT ===
foot_font = inter_reg(15)
draw.text((tx, ty), "Link in bio.", font=foot_font, fill=GREY)
ty += 22
draw.text((tx, ty), "the move before a", font=foot_font, fill=GREY)
ty += 20
draw.text((tx, ty), "specialist makes sense.", font=foot_font, fill=GREY)

img.save(OUT, "PNG", quality=95)
print(f"Built: {OUT}")
print(f"Size: {OUT.stat().st_size // 1024} KB")

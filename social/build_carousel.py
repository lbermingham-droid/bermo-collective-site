"""Build full 5-slide Instagram carousel using brand template."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

ROOT = Path(__file__).parent
PHOTO = ROOT.parent / "lexi-photo.jpg"
FONTS = ROOT / "fonts"

W = H = 1080
BG = (255, 255, 255)
BLACK = (0, 0, 0)
CYAN = (0, 245, 212)  # #00F5D4
GREY = (140, 140, 140)

mont = lambda s: ImageFont.truetype(str(FONTS / "Montserrat-Black.ttf"), s)
inter_b = lambda s: ImageFont.truetype(str(FONTS / "Inter-Bold.ttf"), s)
inter_r = lambda s: ImageFont.truetype(str(FONTS / "Inter-Regular.ttf"), s)


def text_w(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def fit_headline(draw, lines, max_w, max_h, start=130, min_size=44):
    """Pick biggest size where all lines fit width AND total height fits."""
    s = start
    while s > min_size:
        f = mont(s)
        line_h = int(s * 1.05)
        total_h = line_h * len(lines)
        if total_h <= max_h and all(text_w(draw, ln, f) <= max_w for ln in lines):
            return s
        s -= 4
    return min_size


def draw_panel(img, draw, panel_box, tag, black_lines, cyan_lines, sub_lines,
               foot_lines=None, head_max_h=None, force_size=None):
    pl, pt, pr, pb = panel_box
    inner_pad = 60
    tx = pl + inner_pad
    avail_w = (pr - pl) - inner_pad * 2
    avail_h = (pb - pt) - inner_pad * 2

    # Mint border
    border = 8
    for i in range(border):
        draw.rectangle([pl + i, pt + i, pr - i, pb - i], outline=CYAN)

    y = pt + 70

    # Tag
    draw.text((tx, y), tag, font=inter_r(15), fill=GREY)
    y += 28

    # Mint accent bar
    draw.rectangle([tx, y + 6, tx + 70, y + 16], fill=CYAN)
    y += 38

    # Reserve room for sub + foot
    sub_size = 24
    sub_h = len(sub_lines) * 32 if sub_lines else 0
    foot_h = (len(foot_lines) * 22 + 30) if foot_lines else 0
    underline_h = 35
    bottom_pad = 40

    if head_max_h is None:
        head_max_h = (pb - y) - sub_h - foot_h - underline_h - bottom_pad

    all_lines = black_lines + cyan_lines
    size = force_size or fit_headline(draw, all_lines, avail_w, head_max_h, start=130)
    head_f = mont(size)
    line_h = int(size * 1.05)

    for ln in black_lines:
        draw.text((tx, y), ln, font=head_f, fill=BLACK)
        y += line_h
    for ln in cyan_lines:
        draw.text((tx, y), ln, font=head_f, fill=CYAN)
        y += line_h

    y += 18
    draw.rectangle([tx, y, tx + 90, y + 10], fill=CYAN)
    y += 35

    sub_f = inter_b(sub_size)
    for ln in sub_lines:
        draw.text((tx, y), ln, font=sub_f, fill=BLACK)
        y += 32

    if foot_lines:
        foot_f = inter_r(16)
        fy = pb - inner_pad - len(foot_lines) * 22
        for ln in foot_lines:
            draw.text((tx, fy), ln, font=foot_f, fill=GREY)
            fy += 22


def build_full_panel(out, **kw):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    margin = 60
    draw_panel(img, draw, (margin, margin, W - margin, H - margin), **kw)
    img.save(out, "PNG")
    print(f"Built: {out.name}")


def draw_cta_panel(img, draw, panel_box, tag, top_lines, big_cyan_lines, sub_lines, foot_lines):
    """CTA-style: small black setup, MASSIVE cyan punchline."""
    pl, pt, pr, pb = panel_box
    inner_pad = 50
    tx = pl + inner_pad
    avail_w = (pr - pl) - inner_pad * 2

    border = 8
    for i in range(border):
        draw.rectangle([pl + i, pt + i, pr - i, pb - i], outline=CYAN)

    y = pt + 60

    draw.text((tx, y), tag, font=inter_r(13), fill=GREY)
    y += 24
    draw.rectangle([tx, y + 6, tx + 60, y + 14], fill=CYAN)
    y += 32

    # Small black setup
    setup_size = 32
    setup_f = mont(setup_size)
    setup_lh = int(setup_size * 1.05)
    for ln in top_lines:
        draw.text((tx, y), ln, font=setup_f, fill=BLACK)
        y += setup_lh

    y += 25

    # MASSIVE cyan punchline — fit aggressively
    big_size = fit_headline(draw, big_cyan_lines, avail_w, 400, start=170, min_size=80)
    big_f = mont(big_size)
    big_lh = int(big_size * 1.0)
    for ln in big_cyan_lines:
        draw.text((tx, y), ln, font=big_f, fill=CYAN)
        y += big_lh

    y += 18
    draw.rectangle([tx, y, tx + 80, y + 10], fill=CYAN)
    y += 28

    sub_f = inter_b(20)
    for ln in sub_lines:
        draw.text((tx, y), ln, font=sub_f, fill=BLACK)
        y += 26

    foot_f = inter_r(14)
    fy = pb - inner_pad - len(foot_lines) * 20
    for ln in foot_lines:
        draw.text((tx, fy), ln, font=foot_f, fill=GREY)
        fy += 20


def build_split_photo(out, **kw):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Photo: right half, cropped tighter (face/torso prominent)
    photo = Image.open(PHOTO).convert("RGB")
    pw, ph = W // 2, H
    # Zoom in more — scale up by 1.4x and crop to face/upper body
    ratio = max(pw / photo.width, ph / photo.height) * 1.15
    nw, nh = int(photo.width * ratio), int(photo.height * ratio)
    photo_r = photo.resize((nw, nh), Image.LANCZOS)
    left = (nw - pw) // 2
    top = max(0, int((nh - ph) * 0.25))  # bias upward
    photo_c = photo_r.crop((left, top, left + pw, top + ph))
    img.paste(photo_c, (W // 2, 0))

    margin = 50
    draw_cta_panel(img, draw, (margin, margin, W // 2 - 20, H - margin), **kw)
    img.save(out, "PNG")
    print(f"Built: {out.name}")


# === SLIDES ===

build_full_panel(
    ROOT / "slide1.png",
    tag="BERMO.COLLECTIVE",
    black_lines=["I'M THE", "NEED"],
    cyan_lines=["YOU DON'T", "KNOW YOU", "NEED."],
    sub_lines=["Before the hire.", "Before the specialist.", "Before the next thing you try."],
    foot_lines=None,  # caption carries the tagline; avoids overlap
)

build_full_panel(
    ROOT / "slide2.png",
    tag="BERMO.COLLECTIVE",
    black_lines=["HERE'S WHAT", "I LOOK AT"],
    cyan_lines=["BEFORE", "I TOUCH", "ANYTHING."],
    sub_lines=["The first 30 minutes tell me everything."],
)

build_full_panel(
    ROOT / "slide3.png",
    tag="BERMO.COLLECTIVE",
    black_lines=["NOT YOUR", "CONTENT.", "NOT YOUR ADS."],
    cyan_lines=["NOT YOUR", "NEXT HIRE."],
    sub_lines=["The fix lives one level deeper."],
)

build_full_panel(
    ROOT / "slide4.png",
    tag="BERMO.COLLECTIVE",
    black_lines=["I LOOK AT WHAT", "YOUR BRAND", "IS SAYING"],
    cyan_lines=["WHEN YOU'RE NOT", "IN THE ROOM."],
    sub_lines=["That gap between what you mean", "and what they hear,", "that's where growth breaks."],
)

build_split_photo(
    ROOT / "slide5.png",
    tag="BERMO.COLLECTIVE",
    top_lines=["FIND THE EXACT", "PLACE YOUR", "BUSINESS BREAKS."],
    big_cyan_lines=["LET'S", "CHAT."],
    sub_lines=["The fix is easier", "than you think."],
    foot_lines=["Link in bio.", "bermo.collective.", "the move before a", "specialist makes sense."],
)

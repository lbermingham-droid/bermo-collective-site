#!/usr/bin/env python3
"""Instagram Story (1080x1920) variants of the six feed ads.

Reads the built ad-*.html files, stretches the slide to 9:16 with the
content vertically centered, and keeps everything clear of the story UI
safe zones (~200px top, ~300px bottom). Renders to png-story/.

Run after build_ads.py:  python3 build_stories.py
"""
import glob, os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "png-story")
os.makedirs(OUT, exist_ok=True)

OVERRIDE = """<style>
.slide{height:1920px !important;padding-top:230px !important;padding-bottom:150px !important;}
.bar{top:190px !important;}
.content{gap:46px !important;}
</style>"""

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    page = browser.new_page(viewport={"width": 1240, "height": 2100})
    for path in sorted(glob.glob(os.path.join(HERE, "ad-*.html"))):
        html = open(path).read().replace("</head>", OVERRIDE + "</head>")
        tmp = path.replace(".html", ".story.tmp.html")
        open(tmp, "w").write(html)
        page.goto("file://" + tmp)
        page.wait_for_timeout(400)
        png = os.path.join(OUT, os.path.basename(path).replace(".html", "-story.png"))
        page.locator(".slide").screenshot(path=png)
        os.remove(tmp)
        print("rendered", os.path.basename(png))
    browser.close()

#!/usr/bin/env python3
"""Renders each ad-*.html slide to png/ at exact 1080x1350."""
import glob, os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "png")
os.makedirs(OUT, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    page = browser.new_page(viewport={"width": 1240, "height": 1600})
    for path in sorted(glob.glob(os.path.join(HERE, "ad-*.html"))):
        page.goto("file://" + path)
        page.wait_for_timeout(400)  # let embedded fonts settle
        slide = page.locator(".slide")
        png = os.path.join(OUT, os.path.basename(path).replace(".html", ".png"))
        slide.screenshot(path=png)
        print("rendered", os.path.basename(png))
    browser.close()

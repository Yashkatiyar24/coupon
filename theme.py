from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto("http://localhost:4321/"); pg.wait_for_load_state("networkidle")
    pg.screenshot(path="theme-home.png")
    pg.goto("http://localhost:4321/tag/back-to-school/"); pg.wait_for_load_state("networkidle")
    pg.screenshot(path="theme-tag.png")
    b.close()

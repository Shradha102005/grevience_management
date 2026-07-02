"""
scraper_worker.py
-----------------
Standalone worker script that scrapes myscheme.gov.in using Playwright.
Launched as a subprocess by scheme_scraper.py to avoid event-loop conflicts
with Uvicorn on Windows.

Confirmed DOM structure (headless browser inspection):
  div[role=article] .rounded-xl.shadow-md    <- card root
  ├── div.lg:shrink-0                         <- icon (often empty)
  └── div.p-4.lg:p-8
      ├── div.flex.flex-row
      │   └── div.flex.flex-col
      │       ├── H2                          <- wraps the scheme <a>
      │       │   └── A[href=/schemes/slug]   <- scheme name
      │       ├── H2[role=button]             <- ministry name
      │       └── SPAN.line-clamp-*           <- description
      └── div (tags grid)
          └── div[role=button] x N            <- tags
  Pagination: div[class*='overflow:hidden'] contains numbered buttons + next arrow

Output: JSON array of scheme dicts written to stdout.
Exits with code 0 on success, 1 on failure.
"""

# ── MUST be first: event-loop policy before any imports ───────────────────────
import sys
import asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import json
import logging

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("scraper_worker")

MYSCHEME_BASE = "https://www.myscheme.gov.in"
SEARCH_URL = f"{MYSCHEME_BASE}/search"

# ---------------------------------------------------------------------------
# JS helpers — run inside the browser context
# ---------------------------------------------------------------------------

_EXTRACT_JS = """() => {
    const BASE = "https://www.myscheme.gov.in";
    const results = [];

    // Each card is div[role=article]
    const cards = document.querySelectorAll("div[role='article']");

    for (const card of cards) {
        try {
            const link = card.querySelector("a[href^='/schemes/']");
            if (!link) continue;

            const slug = (link.getAttribute("href") || "")
                .replace(/^\\/schemes\\//, "").trim();
            if (!slug) continue;

            const name = link.innerText.trim();
            if (!name) continue;

            // link is inside H2 inside div.flex-col
            // div.flex-col structure: H2(name) | H2[role=button](ministry) | SPAN(desc)
            const nameH2  = link.closest("h2");
            const flexCol = nameH2 ? nameH2.parentElement : null;

            let ministry = "";
            let description = "";

            if (flexCol) {
                const mEl = flexCol.querySelector("h2[role='button']");
                ministry = mEl ? mEl.innerText.trim() : "";

                // Description SPAN is the one NOT inside the name <a> link
                const allSpans = Array.from(flexCol.querySelectorAll("span"));
                const dEl = allSpans.find(s => !link.contains(s));
                description = dEl ? dEl.innerText.trim() : "";
            } else {
                // fallback: search anywhere in card
                const mEl = card.querySelector("h2[role='button']");
                ministry = mEl ? mEl.innerText.trim() : "";
                const dEl = card.querySelector("span");
                description = dEl ? dEl.innerText.trim() : "";
            }

            // Tags: div[role=button] in card, excluding the ministry button
            const tagEls = Array.from(card.querySelectorAll("div[role='button']"));
            const tags = tagEls
                .map(t => t.innerText.trim())
                .filter(t => t && t.length < 60 && t !== ministry);

            results.push({
                id:          slug,
                name:        name,
                ministry:    ministry,
                description: description,
                tags:        tags,
                category:    tags.length > 0 ? tags[0] : "General",
                apply_url:   BASE + "/schemes/" + slug,
                source:      "myscheme.gov.in"
            });
        } catch (_) {}
    }
    return results;
}"""

_CLICK_NEXT_JS = """() => {
    // Pagination is a <ul> containing <li> page numbers and <svg> arrow icons.
    // Structure: [svg-prev] [li:1] [li:2] ... [li:N] [...] [li:last] [svg-next]
    // The "next" element is the LAST child of the UL (an SVG element).
    // Current page LI has class "bg-green-700".

    const uls = Array.from(document.querySelectorAll("ul"));
    const paginUL = uls.find(ul =>
        Array.from(ul.querySelectorAll("li")).some(li => /^\\d+$/.test((li.innerText || "").trim()))
    );
    if (!paginUL) return "no-pagin";

    // Last child is the next-arrow SVG
    const children = Array.from(paginUL.children);
    const nextArrow = children[children.length - 1];
    if (!nextArrow) return "no-arrow";

    // Check if it's disabled (has opacity-50 or cursor-not-allowed class)
    const cls = (nextArrow.getAttribute("class") || "");
    if (cls.includes("opacity-50") || cls.includes("cursor-not-allowed") || cls.includes("!cursor-not-allowed")) {
        return "disabled";
    }

    // Find the current active page number
    const activeLi = paginUL.querySelector("li[class*='bg-green-700']");
    const currentPage = activeLi ? parseInt(activeLi.innerText.trim()) : 1;

    // Click the next-arrow SVG using dispatchEvent (SVG doesn't support .click())
    // The SVG might be inside a clickable wrapper — try parent first
    const clickTarget = nextArrow.parentElement !== paginUL ? nextArrow.parentElement : nextArrow;
    clickTarget.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}));
    return currentPage;
}"""



# ---------------------------------------------------------------------------
# Main scrape coroutine
# ---------------------------------------------------------------------------

async def _scrape() -> list[dict]:
    from playwright.async_api import async_playwright, TimeoutError as PWTimeout

    schemes: list[dict] = []
    seen_slugs: set[str] = set()
    logger.info("🕷️  Starting Playwright scrape of myscheme.gov.in …")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            viewport={"width": 1280, "height": 900},
        )
        # Hide the webdriver flag to reduce bot detection
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = await context.new_page()

        # Block images/fonts to speed up loading (keep CSS & JS)
        await page.route(
            "**/*.{png,jpg,jpeg,gif,woff,woff2,ttf,eot,ico}",
            lambda route: route.abort(),
        )

        logger.info(f"  → Navigating to {SEARCH_URL}")
        await page.goto(SEARCH_URL, wait_until="domcontentloaded", timeout=60_000)

        # Wait for React hydration — first article card must appear
        try:
            await page.wait_for_selector("div[role='article']", timeout=45_000)
            await asyncio.sleep(2)  # let dynamic content settle
            logger.info("  ✅ Scheme cards detected — JS hydration complete.")
        except PWTimeout:
            logger.warning(
                f"  ⚠ No article cards found after 45s. "
                f"Page title: {await page.title()}"
            )
            await browser.close()
            return schemes

        page_num = 1

        while True:
            logger.info(f"  → Extracting page {page_num} …")

            page_cards: list[dict] = await page.evaluate(_EXTRACT_JS)
            new_on_page = 0
            for card in page_cards:
                slug = card.get("id", "")
                if not slug or slug in seen_slugs:
                    continue
                seen_slugs.add(slug)
                schemes.append(card)
                new_on_page += 1

            logger.info(
                f"    Found {new_on_page} new schemes on page {page_num} "
                f"(total: {len(schemes)})"
            )

            # ── Pagination: click the next-arrow SVG in the pagination UL ──
            click_result = await page.evaluate(_CLICK_NEXT_JS)
            logger.info(f"    Pagination click result: {click_result!r}")

            if click_result in ("no-pagin", "no-arrow"):
                logger.info("  ✅ No pagination controls found — only one page.")
                break

            if click_result == "disabled":
                logger.info("  ✅ Next arrow is disabled — last page reached.")
                break

            # click_result is the current page number before clicking
            # Wait for new articles to load
            try:
                await page.wait_for_load_state("networkidle", timeout=15_000)
            except PWTimeout:
                pass
            await asyncio.sleep(1.5)
            page_num += 1

            if page_num > 500:
                logger.warning("  ⚠ Reached page limit (500). Stopping.")
                break

        await browser.close()

    logger.info(f"✅ Scrape complete — {len(schemes)} total schemes.")
    return schemes


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    try:
        schemes = asyncio.run(_scrape())
        print(json.dumps(schemes))
        sys.exit(0)
    except Exception as e:
        logger.error(f"❌ Scraper worker failed: {e}", exc_info=True)
        print("[]")
        sys.exit(1)


if __name__ == "__main__":
    main()

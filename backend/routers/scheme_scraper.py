"""
scheme_scraper.py
-----------------
Scrapes myscheme.gov.in/schemes using Playwright (headless Chromium).
All scraped data is stored in-memory in _CACHE.
The scrape runs once at startup and refreshes every 24 hours.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Any

logger = logging.getLogger(__name__)

# ── In-memory cache ────────────────────────────────────────────────────────────

_CACHE: list[dict[str, Any]] = []
_LAST_SCRAPED: datetime | None = None
_SCRAPE_INTERVAL_HOURS = 24
_SCRAPING_LOCK = asyncio.Lock()
_IS_SCRAPING = False

MYSCHEME_BASE = "https://www.myscheme.gov.in"
SCHEMES_URL = f"{MYSCHEME_BASE}/schemes"


def get_cached_schemes() -> list[dict[str, Any]]:
    """Return the in-memory scheme cache."""
    return _CACHE


def get_scrape_status() -> dict:
    return {
        "total": len(_CACHE),
        "last_scraped": _LAST_SCRAPED.isoformat() if _LAST_SCRAPED else None,
        "is_scraping": _IS_SCRAPING,
        "source": "myscheme.gov.in" if _CACHE else "fallback",
    }


def is_cache_stale() -> bool:
    if not _LAST_SCRAPED:
        return True
    return datetime.now(timezone.utc) - _LAST_SCRAPED > timedelta(hours=_SCRAPE_INTERVAL_HOURS)


async def scrape_myscheme() -> list[dict[str, Any]]:
    """
    Use Playwright to render myscheme.gov.in/schemes and extract scheme cards.
    Returns a list of scheme dicts.
    """
    global _IS_SCRAPING
    _IS_SCRAPING = True
    schemes: list[dict[str, Any]] = []

    try:
        from playwright.async_api import async_playwright

        logger.info("🕷️  Starting Playwright scrape of myscheme.gov.in …")

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage"],
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
            page = await context.new_page()

            # Block images/fonts to speed things up
            await page.route(
                "**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot}",
                lambda route: route.abort(),
            )

            logger.info(f"  → Navigating to {SCHEMES_URL}")
            await page.goto(SCHEMES_URL, wait_until="networkidle", timeout=60_000)

            # Wait for scheme cards to appear
            try:
                await page.wait_for_selector("a[href*='/schemes/']", timeout=30_000)
            except Exception:
                logger.warning("  ⚠ Scheme links not found on initial load.")

            page_num = 1
            seen_slugs: set[str] = set()

            while True:
                logger.info(f"  → Scraping page {page_num} …")

                # Extract all scheme cards visible on the page
                cards = await page.query_selector_all("a[href*='/schemes/']")

                new_on_page = 0
                for card in cards:
                    try:
                        href = await card.get_attribute("href") or ""
                        # Only process individual scheme pages (e.g. /schemes/pm-kisan)
                        parts = href.strip("/").split("/")
                        if len(parts) < 2 or parts[0] != "schemes":
                            continue
                        slug = parts[1]
                        if not slug or slug in seen_slugs:
                            continue
                        seen_slugs.add(slug)

                        # Scheme name — look for heading inside the card
                        name_el = await card.query_selector("h2, h3, h4, [class*='title'], [class*='name']")
                        name = (await name_el.inner_text()).strip() if name_el else slug.replace("-", " ").title()

                        # Description
                        desc_el = await card.query_selector("p, [class*='desc'], [class*='detail']")
                        description = (await desc_el.inner_text()).strip() if desc_el else ""

                        # Tags — small badge-like elements
                        tag_els = await card.query_selector_all("[class*='tag'], [class*='badge'], [class*='pill'], [class*='chip']")
                        tags = []
                        for t in tag_els:
                            txt = (await t.inner_text()).strip()
                            if txt and len(txt) < 40:
                                tags.append(txt)

                        # State label
                        state_el = await card.query_selector("[class*='state'], [class*='location']")
                        state = (await state_el.inner_text()).strip() if state_el else "Central"

                        scheme = {
                            "id": slug,
                            "name": name,
                            "description": description,
                            "tags": tags,
                            "state": state,
                            "category": tags[0] if tags else "General",
                            "apply_url": f"{MYSCHEME_BASE}/schemes/{slug}",
                            "source": "myscheme.gov.in",
                        }
                        schemes.append(scheme)
                        new_on_page += 1

                    except Exception as e:
                        logger.debug(f"    Card parse error: {e}")
                        continue

                logger.info(f"    Found {new_on_page} new schemes on page {page_num}")

                # Try to find and click "Next" / "Load More" button
                next_btn = await page.query_selector(
                    "button:has-text('Next'), a:has-text('Next'), "
                    "[aria-label='Next'], [class*='next-page'], "
                    "button:has-text('Load More'), button:has-text('Show More')"
                )

                if not next_btn:
                    logger.info("  ✅ No more pages found.")
                    break

                is_disabled = await next_btn.get_attribute("disabled")
                if is_disabled is not None:
                    logger.info("  ✅ Next button is disabled — end of pages.")
                    break

                await next_btn.click()
                await page.wait_for_load_state("networkidle", timeout=15_000)
                await asyncio.sleep(1)  # polite delay
                page_num += 1

                # Safety limit
                if page_num > 200:
                    logger.warning("  ⚠ Reached page limit (200). Stopping.")
                    break

            await browser.close()

        logger.info(f"✅ Playwright scrape complete — {len(schemes)} schemes collected.")

    except ImportError:
        logger.error("❌ Playwright not installed. Run: pip install playwright && playwright install chromium")
    except Exception as e:
        logger.error(f"❌ Playwright scrape failed: {e}", exc_info=True)
    finally:
        _IS_SCRAPING = False

    return schemes


async def refresh_cache() -> None:
    """
    Scrape myscheme.gov.in and update the in-memory cache.
    Holds a lock so only one scrape runs at a time.
    """
    global _CACHE, _LAST_SCRAPED

    async with _SCRAPING_LOCK:
        if not is_cache_stale() and _CACHE:
            logger.info("Scheme cache is fresh — skipping scrape.")
            return

        scraped = await scrape_myscheme()

        if scraped:
            _CACHE = scraped
            _LAST_SCRAPED = datetime.now(timezone.utc)
            logger.info(f"Cache updated: {len(_CACHE)} schemes at {_LAST_SCRAPED}")
        else:
            logger.warning("Scrape returned 0 schemes — keeping existing cache / fallback.")


async def background_scrape_loop() -> None:
    """
    Long-running background coroutine:
    scrapes immediately at startup, then re-scrapes every 24 hours.
    """
    logger.info("📡 Scheme scraper background loop started.")
    while True:
        try:
            await refresh_cache()
        except Exception as e:
            logger.error(f"Background scrape loop error: {e}", exc_info=True)

        # Sleep until next scrape
        logger.info(f"💤 Next scrape in {_SCRAPE_INTERVAL_HOURS}h")
        await asyncio.sleep(_SCRAPE_INTERVAL_HOURS * 3600)

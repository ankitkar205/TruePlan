"""Automatic tariff updater (runs in GitHub Actions).

For each operator it opens the official prepaid page in a headless browser,
reads the visible text, finds (price, validity-days) pairs, and updates
plans.json:
  - existing plan with the same operator+price -> validity refreshed
  - existing plan whose price no longer appears on the page -> listed in
    data/alerts.json as "possibly discontinued" (never auto-deleted)
  - prices on the page that are not in plans.json -> listed as "new price"
Your notes/tags/colours are never touched. If a scrape looks broken
(too few prices found) that operator is skipped and the old data is kept.

Check the URLS below once; operators move their pages sometimes.
"""
import json, re, sys, datetime, pathlib
from playwright.sync_api import sync_playwright

PATH = pathlib.Path("plans.json")
ALERTS = pathlib.Path("alerts.json")
DEBUG = pathlib.Path("debug"); DEBUG.mkdir(exist_ok=True)

URLS = {
    "Jio":    "https://www.jio.com/selfcare/plans/mobility/prepaid-plans-list/",
    "Airtel": "https://www.airtel.in/recharge-online",
    "Vi":     "https://www.myvi.in/prepaid/online-prepaid-recharge-plans",
    "BSNL":   "https://www.bsnl.co.in/opencms/bsnl/BSNL/services/mobile/prepaid.html",
}
MIN_PRICES = 8  # fewer than this = scrape considered broken

PRICE = re.compile(r"(?:₹|Rs\.?|INR)\s*([\d,]{2,5})")
VALID = re.compile(r"(\d{1,3})\s*(?:days?|Days?)\b")

def pairs_from_text(text):
    """Split text on price markers; pair each price with the first validity after it."""
    out = {}
    ms = list(PRICE.finditer(text))
    for i, m in enumerate(ms):
        price = int(m.group(1).replace(",", ""))
        end = ms[i + 1].start() if i + 1 < len(ms) else len(text)
        chunk = text[m.end():min(end, m.end() + 400)]
        v = VALID.search(chunk)
        out.setdefault(price, set())
        if v:
            out[price].add(int(v.group(1)))
    return out

def scrape(page, op, url):
    page.goto(url, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(6000)  # let JS-rendered plan cards appear
    for _ in range(6):  # scroll to trigger lazy-loaded cards
        page.mouse.wheel(0, 2500); page.wait_for_timeout(600)
    text = page.inner_text("body")
    (DEBUG / f"{op}.txt").write_text(text, encoding="utf-8")
    return pairs_from_text(text)

def main():
    db = json.loads(PATH.read_text(encoding="utf-8"))
    plans = db["plans"]
    alerts, changed = [], 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(user_agent="Mozilla/5.0 (X11; Linux x86_64) Chrome/124 Safari/537.36")
        for op, url in URLS.items():
            page = b.new_page(user_agent="Mozilla/5.0 (X11; Linux x86_64) Chrome/124 Safari/537.36")  # fresh page per operator
            try:
                found = scrape(page, op, url)
            except Exception as e:
                print(f"[{op}] scrape failed: {e}")
                try: (DEBUG / f"{op}_error.txt").write_text(page.inner_text("body"), encoding="utf-8")
                except Exception: pass
                continue
            finally:
                page.close()
            print(f"[{op}] prices found: {len(found)}")
            if len(found) < MIN_PRICES:
                print(f"[{op}] too few prices, skipping (old data kept)"); continue
            known = set()
            for pl in plans:
                if pl["operator"] != op: continue
                known.add(pl["price"])
                if pl["price"] not in found:
                    alerts.append(f"{op} Rs{pl['price']} '{pl['name']}' not on official page - possibly discontinued")
                    continue
                vals = found[pl["price"]]
                if len(vals) == 1:
                    v = next(iter(vals))
                    if pl.get("validity", 0) > 0 and pl["validity"] != v and v != 0:  # validity 0 = booster, leave alone
                        alerts.append(f"{op} Rs{pl['price']} validity {pl.get('validity')} -> {v}")
                        pl["validity"] = v; changed += 1
            for price in sorted(set(found) - known):
                if 10 <= price <= 4500:
                    alerts.append(f"{op} new price on page: Rs{price} {sorted(found[price])} days")
        b.close()
    if changed:
        db["updatedAt"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        PATH.write_text(json.dumps(db, ensure_ascii=False, indent=1), encoding="utf-8")
    ALERTS.write_text(json.dumps({"checkedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                                  "alerts": alerts}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{changed} fields changed, {len(alerts)} alerts")

if __name__ == "__main__":
    main()

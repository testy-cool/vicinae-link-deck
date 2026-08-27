#!/usr/bin/env python3
import os
import sys
import json
import re
import asyncio
from urllib.parse import urlparse, urljoin
import wreq

DATA_FILE = os.path.expanduser("~/.config/vicinae/grouped-shortcuts.json")
FAVICON_DIR = os.path.expanduser("~/.local/share/vicinae/extensions/link-deck/assets/favicons")
VICINAE_FAVICON_DIR = os.path.expanduser("~/.local/share/vicinae/favicon-data")

os.makedirs(FAVICON_DIR, exist_ok=True)
os.makedirs(VICINAE_FAVICON_DIR, exist_ok=True)

def get_hosts():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            items = json.load(f)
    except Exception as e:
        print(f"Error loading shortcuts: {e}")
        return []

    hosts = set()
    for item in items:
        if item.get("type") == "url" and item.get("target"):
            try:
                u = urlparse(item["target"])
                if u.netloc:
                    hosts.add(u.netloc.lower())
            except Exception:
                pass
    return sorted(list(hosts))

def save_favicon(host, content):
    clean_host = host.split(':')[0]
    dest1 = os.path.join(FAVICON_DIR, f"{clean_host}.png")
    dest2 = os.path.join(VICINAE_FAVICON_DIR, clean_host)
    with open(dest1, "wb") as f:
        f.write(content)
    with open(dest2, "wb") as f:
        f.write(content)
    if host != clean_host:
        with open(os.path.join(FAVICON_DIR, f"{host}.png"), "wb") as f:
            f.write(content)
        with open(os.path.join(VICINAE_FAVICON_DIR, host), "wb") as f:
            f.write(content)

async def fetch_favicon_for_host(client, host):
    clean_host = host.split(':')[0]
    print(f"[*] Fetching favicon for: {host}")

    # 1. Google S2 High-Res 128px API
    try:
        s2_url = f"https://www.google.com/s2/favicons?domain={clean_host}&sz=128"
        resp = await client.get(s2_url)
        if resp.status.is_success():
            b = await resp.bytes()
            if len(b) > 400:
                save_favicon(host, b)
                print(f"  ✓ Saved 128px icon via Google S2 ({len(b)} bytes)")
                return True
    except Exception as e:
        print(f"  Google S2 failed: {e}")

    # 2. Try scraping HTML for <link rel="icon">
    for scheme in ["https", "http"]:
        try:
            site_url = f"{scheme}://{host}"
            resp = await client.get(site_url)
            if resp.status.is_success():
                html = await resp.text()
                matches = re.findall(r'<link[^>]+rel=["\'](?:shortcut )?(?:apple-touch-)?icon["\'][^>]+href=["\']([^"\']+)["\']', html, re.I)
                if not matches:
                    matches = re.findall(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\'](?:shortcut )?(?:apple-touch-)?icon["\']', html, re.I)
                if matches:
                    icon_href = matches[0]
                    icon_url = urljoin(site_url, icon_href)
                    icon_resp = await client.get(icon_url)
                    if icon_resp.status.is_success():
                        b = await icon_resp.bytes()
                        if len(b) > 100:
                            save_favicon(host, b)
                            print(f"  ✓ Saved icon from HTML link ({icon_url}) ({len(b)} bytes)")
                            return True
        except Exception:
            pass

    # 3. Direct /favicon.ico
    for scheme in ["https", "http"]:
        try:
            ico_url = f"{scheme}://{host}/favicon.ico"
            resp = await client.get(ico_url)
            if resp.status.is_success():
                b = await resp.bytes()
                if len(b) > 100:
                    save_favicon(host, b)
                    print(f"  ✓ Saved direct /favicon.ico ({len(b)} bytes)")
                    return True
        except Exception:
            pass

    print(f"  ✗ Could not fetch favicon for {host}")
    return False

async def main():
    hosts = get_hosts()
    print(f"Found {len(hosts)} hosts. Using wreq-python to grab favicons...\n")
    client = wreq.Client(redirect=wreq.redirect.Policy.limited(10))
    for h in hosts:
        await fetch_favicon_for_host(client, h)
    print("\nFavicons updated successfully!")

if __name__ == "__main__":
    asyncio.run(main())

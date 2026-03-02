#!/usr/bin/env python3
"""Generate XBWorld logo using Compass/Gemini image generation API.

Usage:
    COMPASS_API_KEY=your-key python scripts/generate_logo.py

Generates:
    - xbworld-web/src/main/webapp/images/xbworld-logo.png (main logo)
    - xbworld-web/src/main/webapp/images/xbworld-favicon.png (32x32 favicon)
    - xbworld-web/src/main/webapp/images/xbworld-touch-icon.png (touch icon)
"""

import base64
import json
import os
import sys

API_KEY = os.getenv("COMPASS_API_KEY", "")
BASE_URL = os.getenv("LLM_BASE_URL", "https://compass.llm.shopee.io/compass-api/v1")

LOGO_PROMPT = (
    "Modern minimalist logo for 'XBWorld', a civilization strategy game. "
    "Clean geometric design with a stylized globe or compass motif. "
    "Gold (#d4a017) and dark navy (#1a1a2e) color scheme. "
    "Suitable for web header, transparent background, 256x64 pixels."
)

ICON_PROMPT = (
    "Minimalist app icon for 'XBWorld' strategy game. "
    "Simple geometric globe with gold accent on dark background. "
    "Square format, clean edges, suitable for favicon. 128x128 pixels."
)

IMAGES_DIR = os.path.join(
    os.path.dirname(__file__), "..",
    "xbworld-web", "src", "main", "webapp", "images"
)


def generate_image(prompt: str, output_path: str):
    """Call Gemini image generation via Compass API."""
    import requests
    url = f"{BASE_URL}/images/generations"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "gemini-2.0-flash-exp",
        "prompt": prompt,
        "n": 1,
        "size": "256x256",
        "response_format": "b64_json",
    }

    print(f"Generating: {output_path}")
    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()

    data = resp.json()
    b64_data = data["data"][0]["b64_json"]
    img_bytes = base64.b64decode(b64_data)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(img_bytes)
    print(f"  Saved: {output_path} ({len(img_bytes)} bytes)")


def create_svg_fallback():
    """Create an SVG text-based logo as fallback when API is unavailable."""
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="120" height="32" viewBox="0 0 120 32">
  <rect width="120" height="32" rx="4" fill="#1a1a2e"/>
  <circle cx="16" cy="16" r="10" fill="none" stroke="#d4a017" stroke-width="1.5"/>
  <path d="M16 6 L16 26 M6 16 L26 16" stroke="#d4a017" stroke-width="0.8" opacity="0.5"/>
  <ellipse cx="16" cy="16" rx="6" ry="10" fill="none" stroke="#d4a017" stroke-width="0.8"/>
  <text x="32" y="21" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="14" font-weight="700" fill="#d4a017">XBWorld</text>
</svg>'''
    svg_path = os.path.join(IMAGES_DIR, "xbworld-logo.svg")
    os.makedirs(IMAGES_DIR, exist_ok=True)
    with open(svg_path, "w") as f:
        f.write(svg)
    print(f"Created SVG fallback: {svg_path}")

    favicon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#1a1a2e"/>
  <circle cx="16" cy="16" r="10" fill="none" stroke="#d4a017" stroke-width="2"/>
  <ellipse cx="16" cy="16" rx="6" ry="10" fill="none" stroke="#d4a017" stroke-width="1"/>
  <path d="M16 6 L16 26 M6 16 L26 16" stroke="#d4a017" stroke-width="0.8" opacity="0.6"/>
  <text x="11" y="20" font-family="sans-serif" font-size="8" font-weight="700" fill="#d4a017">XB</text>
</svg>'''
    favicon_path = os.path.join(IMAGES_DIR, "xbworld-favicon.svg")
    with open(favicon_path, "w") as f:
        f.write(favicon_svg)
    print(f"Created SVG favicon: {favicon_path}")
    return svg_path, favicon_path


def main():
    if not API_KEY:
        print("COMPASS_API_KEY not set. Creating SVG fallback logos...")
        create_svg_fallback()
        print("\nTo generate PNG logos, set COMPASS_API_KEY and re-run this script.")
        return

    try:
        generate_image(LOGO_PROMPT, os.path.join(IMAGES_DIR, "xbworld-logo.png"))
        generate_image(ICON_PROMPT, os.path.join(IMAGES_DIR, "xbworld-favicon.png"))
        generate_image(ICON_PROMPT, os.path.join(IMAGES_DIR, "xbworld-touch-icon.png"))
        print("\nAll logos generated successfully!")
    except Exception as e:
        print(f"API generation failed: {e}")
        print("Falling back to SVG logos...")
        create_svg_fallback()


if __name__ == "__main__":
    main()

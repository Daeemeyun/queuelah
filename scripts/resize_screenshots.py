#!/usr/bin/env python3
"""
Pads QueueLah App Store screenshots to 1284 × 2778 px (iPhone 6.5" requirement).
Run from anywhere: python3 resize_screenshots.py
Screenshots are read from ~/Desktop and saved to ~/Desktop/appstore_screenshots/
"""

import os
import glob
from pathlib import Path
from PIL import Image, ImageOps

TARGET_W = 1284
TARGET_H = 2778
BACKGROUND = (0, 0, 0)  # black — matches app background

desktop = Path.home() / "Desktop"
out_dir = desktop / "appstore_screenshots"
out_dir.mkdir(exist_ok=True)

# Find Simulator screenshots saved today on the Desktop
patterns = [
    str(desktop / "Simulator Screenshot*.png"),
    str(desktop / "Simulator Screens*.png"),
    str(desktop / "Screenshot*.png"),
]

files = []
for p in patterns:
    files.extend(glob.glob(p))

# Remove duplicates and sort
files = sorted(set(files))

if not files:
    print("❌ No screenshots found on your Desktop.")
    print("   Make sure you saved them with Cmd+S inside the Simulator.")
    exit(1)

print(f"Found {len(files)} screenshot(s):\n")

for i, path in enumerate(files, 1):
    img = Image.open(path).convert("RGB")
    w, h = img.size
    print(f"  [{i}] {Path(path).name}  ({w} × {h})")

    # Calculate padding to centre the image
    pad_left = (TARGET_W - w) // 2
    pad_right = TARGET_W - w - pad_left
    pad_top = (TARGET_H - h) // 2
    pad_bottom = TARGET_H - h - pad_top

    padded = ImageOps.expand(img, border=(pad_left, pad_top, pad_right, pad_bottom), fill=BACKGROUND)

    out_name = f"appstore_{i:02d}_{Path(path).stem}.png"
    out_path = out_dir / out_name
    padded.save(out_path, "PNG")
    print(f"      → saved as {out_name}  ({TARGET_W} × {TARGET_H})")

print(f"\n✅ Done! {len(files)} screenshot(s) saved to:")
print(f"   {out_dir}")

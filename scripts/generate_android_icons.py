#!/usr/bin/env python3
"""
Generate complete Android launcher icon suite:
- Legacy square icons (ic_launcher.png) across mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
- Legacy round icons (ic_launcher_round.png) across mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
- Android 8.0+ Adaptive foreground icons (ic_launcher_foreground.png) across all densities
- Google Play Store High-Res Icon (512x512)
"""

import os
from PIL import Image, ImageDraw, ImageOps

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES_DIR = os.path.join(BASE_DIR, "mobile-android", "app", "src", "main", "res")
SRC_LOGO = os.path.join(RES_DIR, "drawable", "logo.png")

# Densities and sizes
# Legacy icon sizes (dp = 48)
LEGACY_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Adaptive foreground canvas sizes (dp = 108)
ADAPTIVE_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

def make_circle_mask(size):
    # 4x supersampling for ultra smooth anti-aliased edge
    scale = 4
    large_size = size * scale
    mask = Image.new("L", (large_size, large_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, large_size, large_size), fill=255)
    return mask.resize((size, size), Image.Resampling.LANCZOS)

def generate_icons():
    print(f"Loading source logo: {SRC_LOGO}")
    base_img = Image.open(SRC_LOGO).convert("RGBA")
    w, h = base_img.size

    # 1. Google Play Store 512x512 High-Res Icon
    play_icon_path = os.path.join(BASE_DIR, "playstore-icon-512x512.png")
    play_icon = base_img.resize((512, 512), Image.Resampling.LANCZOS)
    play_icon.save(play_icon_path, format="PNG", optimize=True)
    print(f"[OK] Saved Play Store icon: {play_icon_path}")

    # Also save in mobile-android root
    mobile_play_icon = os.path.join(BASE_DIR, "mobile-android", "playstore-icon-512x512.png")
    play_icon.save(mobile_play_icon, format="PNG", optimize=True)

    # 2. Legacy Square & Round Icons for each density
    for folder, size in LEGACY_SIZES.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)

        # Square legacy icon
        square_icon = base_img.resize((size, size), Image.Resampling.LANCZOS)
        square_path = os.path.join(folder_path, "ic_launcher.png")
        square_icon.save(square_path, format="PNG", optimize=True)

        # Round legacy icon
        mask = make_circle_mask(size)
        round_icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        round_icon.paste(square_icon, (0, 0), mask)
        round_path = os.path.join(folder_path, "ic_launcher_round.png")
        round_icon.save(round_path, format="PNG", optimize=True)

        print(f"[OK] {folder}: ic_launcher.png ({size}x{size}), ic_launcher_round.png ({size}x{size})")

    # 3. Adaptive Foreground Icons for each density
    for folder, canvas_size in ADAPTIVE_SIZES.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)

        # Scale logo to ~72% of canvas so inner emblem is inside safe 66-72dp circle
        logo_size = int(canvas_size * 0.72)
        logo_resized = base_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

        # Apply circular soft mask to emblem
        emblem_mask = make_circle_mask(logo_size)

        fg_canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        offset = (canvas_size - logo_size) // 2
        fg_canvas.paste(logo_resized, (offset, offset), emblem_mask)

        fg_path = os.path.join(folder_path, "ic_launcher_foreground.png")
        fg_canvas.save(fg_path, format="PNG", optimize=True)
        print(f"[OK] {folder}: ic_launcher_foreground.png ({canvas_size}x{canvas_size})")

    print("\nAll Android icons generated successfully!")

if __name__ == "__main__":
    generate_icons()

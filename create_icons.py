#!/usr/bin/env python3
"""
Simple script to create placeholder icons for the Chrome extension
Creates 16x16, 48x48, and 128x128 PNG icons with a gradient background
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("PIL/Pillow not installed. Installing...")
    import subprocess
    subprocess.check_call(['pip3', 'install', 'Pillow'])
    from PIL import Image, ImageDraw, ImageFont
    PIL_AVAILABLE = True

def create_icon(size, filename):
    """Create a gradient icon with a lightning bolt symbol"""
    # Create image with gradient background
    img = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(img)

    # Draw gradient (purple to blue)
    for y in range(size):
        # Calculate color for this row
        ratio = y / size
        r = int(102 + (118 - 102) * ratio)  # 102 -> 118
        g = int(126 + (75 - 126) * ratio)   # 126 -> 75
        b = int(234 + (162 - 234) * ratio)  # 234 -> 162

        draw.line([(0, y), (size, y)], fill=(r, g, b))

    # Draw lightning bolt
    # Scale the bolt to 70% of icon size for good visibility
    bolt_height = int(size * 0.7)
    bolt_width = int(bolt_height * 0.5)  # Lightning bolt is typically narrower

    # Center the bolt
    offset_x = (size - bolt_width) // 2
    offset_y = (size - bolt_height) // 2

    # Define lightning bolt shape as a polygon (relative coordinates)
    # Classic zigzag lightning bolt with 7 points
    bolt_shape = [
        (0.45, 0.0),   # Top left
        (0.75, 0.0),   # Top right
        (0.45, 0.45),  # Middle right (zigzag point)
        (0.65, 0.45),  # Middle right extension
        (0.25, 1.0),   # Bottom tip (sharp point)
        (0.5, 0.55),   # Middle left (zigzag point)
        (0.3, 0.55),   # Middle left extension
    ]

    # Scale and offset the points
    bolt_points = [
        (int(x * bolt_width + offset_x), int(y * bolt_height + offset_y))
        for x, y in bolt_shape
    ]

    # Draw the lightning bolt with white fill
    draw.polygon(bolt_points, fill='white')

    # Add a subtle shadow/outline for depth (optional, for larger icons)
    if size >= 48:
        # Draw a slightly larger bolt in semi-transparent dark color first
        shadow_offset = 2
        shadow_points = [
            (x + shadow_offset, y + shadow_offset)
            for x, y in bolt_points
        ]
        shadow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow_img)
        shadow_draw.polygon(shadow_points, fill=(0, 0, 0, 50))

        # Composite shadow onto main image
        img_rgba = img.convert('RGBA')
        img_rgba = Image.alpha_composite(img_rgba, shadow_img)
        img = img_rgba.convert('RGB')

        # Redraw the bolt on top
        draw = ImageDraw.Draw(img)
        draw.polygon(bolt_points, fill='white')

    # Save
    img.save(filename)
    print(f"✓ Created {filename}")

def main():
    import os

    # Change to extension directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    extension_dir = os.path.join(script_dir, 'extension')

    if not os.path.exists(extension_dir):
        print(f"Error: {extension_dir} doesn't exist!")
        return

    os.chdir(extension_dir)

    print("Creating QuickSum extension icons with lightning bolt...")
    create_icon(16, 'icon16.png')
    create_icon(48, 'icon48.png')
    create_icon(128, 'icon128.png')
    print("\n✅ All icons created successfully!")
    print("\nYou can now load the extension in Chrome:")
    print("1. Go to chrome://extensions/")
    print("2. Enable 'Developer mode'")
    print("3. Click 'Load unpacked'")
    print(f"4. Select: {extension_dir}")

if __name__ == '__main__':
    main()

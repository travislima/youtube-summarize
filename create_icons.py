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
    """Create a simple gradient icon with 'YT' text"""
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

    # Add white text "YT"
    try:
        # Try to use a nice font
        font_size = size // 2
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        # Fallback to default font
        font = ImageDraw.Draw(img).getfont()

    text = "YT"
    # Get text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Center the text
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]

    draw.text((x, y), text, fill='white', font=font)

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

    print("Creating extension icons...")
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

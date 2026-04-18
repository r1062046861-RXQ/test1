from PIL import Image, ImageDraw, ImageFont
import os

# Paths
ASSETS_ROOT = os.path.join('public', 'assets')
os.makedirs(ASSETS_ROOT, exist_ok=True)

BACKGROUNDS = {
    'background_main_menu.png': {
        'text': 'Main Menu',
        'color': (245, 245, 220), # Light beige (TCM Paper-ish)
        'text_color': (60, 60, 60)
    },
    'background_map.png': {
        'text': 'Map Selection',
        'color': (230, 230, 210), # Slightly darker beige
        'text_color': (60, 60, 60)
    },
    'background_combat_act1.png': {
        'text': 'Combat - Act 1 (Wind/Cold)',
        'color': (200, 220, 240), # Light Blueish
        'text_color': (30, 50, 80)
    },
    'background_combat_act2.png': {
        'text': 'Combat - Act 2 (Damp/Stasis)',
        'color': (240, 230, 200), # Light Yellowish
        'text_color': (80, 70, 30)
    },
    'background_combat_act3.png': {
        'text': 'Combat - Act 3 (Five Elements)',
        'color': (220, 200, 240), # Light Purplish
        'text_color': (60, 30, 80)
    }
}

def create_background(filename, config):
    width, height = 1920, 1080
    bg_color = config['color']
    text_color = config['text_color']
    text = config['text']
    
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw Border
    draw.rectangle([0, 0, width-1, height-1], outline=text_color, width=20)
    
    # Try to load a font
    try:
        # Windows font path
        font = ImageFont.truetype("msyh.ttc", 100)
    except:
        font = ImageFont.load_default()

    # Draw Text (Centered)
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    draw.text(((width - text_width) / 2, (height - text_height) / 2), text, fill=text_color, font=font)
    
    # Add 16:9 marker text
    try:
        small_font = ImageFont.truetype("arial.ttf", 40)
    except:
        small_font = ImageFont.load_default()
        
    draw.text((50, 50), "1920 x 1080 (16:9)", fill=text_color, font=small_font)

    # Save
    full_path = os.path.join(ASSETS_ROOT, filename)
    img.save(full_path)
    print(f"Generated {full_path}")

def main():
    for filename, config in BACKGROUNDS.items():
        create_background(filename, config)

if __name__ == "__main__":
    main()

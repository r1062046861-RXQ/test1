import os
import re
import json
from PIL import Image, ImageDraw, ImageFont
import textwrap

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DESIGN_FILE = os.path.join(SCRIPT_DIR, 'design.txt')
OUTPUT_DIR = os.path.join(SCRIPT_DIR, 'public', 'cards_new')
MAPPING_FILE = os.path.join(SCRIPT_DIR, 'public', 'cards_mapping.json')
START_ID = 86
WIDTH = 512
HEIGHT = 768
DPI = 300

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def parse_design_file(file_path):
    cards = []
    
    if not os.path.exists(file_path):
        print(f"Error: Design file not found at {file_path}")
        return []

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.startswith('卡牌名称：'):
            card = {}
            
            # Extract Name
            name_match = re.search(r'卡牌名称：(.*?)。', line)
            if name_match:
                card['name'] = name_match.group(1)
            
            # Extract Type
            type_match = re.search(r'类型：(.*?)。', line)
            if type_match:
                card['type'] = type_match.group(1)
                
            # Extract Cost
            cost_match = re.search(r'消耗真气：(.*?)。', line)
            if cost_match:
                card['cost'] = cost_match.group(1)
            else:
                cost_match = re.search(r'消耗：(.*?)。', line)
                if cost_match:
                    card['cost'] = cost_match.group(1)
                
            # Extract Description
            desc_match = re.search(r'功能描述：(.*?)。中医知识', line)
            if desc_match:
                card['description'] = desc_match.group(1)
            
            # Extract TCM Knowledge
            tcm_match = re.search(r'中医知识：(.*?)。?$', line)
            if tcm_match:
                card['tcm_note'] = tcm_match.group(1)
                
            if 'name' in card:
                cards.append(card)
                
    return cards

def draw_text_wrapped(draw, text, font, max_width, start_y, color=(0, 0, 0), line_spacing=10):
    lines = []
    current_line = ""
    for char in text:
        test_line = current_line + char
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = char
    lines.append(current_line)
    
    y = start_y
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x = (WIDTH - text_width) / 2
        draw.text((x, y), line, font=font, fill=color)
        y += bbox[3] - bbox[1] + line_spacing
    return y

def generate_card_image(card, card_id, font_path):
    img = Image.new('RGBA', (WIDTH, HEIGHT), (255, 255, 255, 0)) # Transparent background
    draw = ImageDraw.Draw(img)
    
    # Draw Card Background
    bg_color = (240, 240, 230, 255)
    border_color = (0, 0, 0, 255)
    
    if '攻击' in card.get('type', ''):
        bg_color = (255, 230, 230, 255)
    elif '技能' in card.get('type', ''):
        bg_color = (230, 230, 255, 255)
    elif '能力' in card.get('type', ''):
        bg_color = (230, 255, 230, 255)
    
    draw.rounded_rectangle([(10, 10), (WIDTH-10, HEIGHT-10)], radius=20, fill=bg_color, outline=border_color, width=5)
    
    try:
        title_font = ImageFont.truetype(font_path, 48)
        body_font = ImageFont.truetype(font_path, 28)
        small_font = ImageFont.truetype(font_path, 20)
        large_number_font = ImageFont.truetype(font_path, 64)
    except IOError:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
        large_number_font = ImageFont.load_default()

    # ID
    draw.text((40, 40), str(card_id), font=large_number_font, fill=(100, 100, 100, 128))

    # Cost
    draw.ellipse([(WIDTH-80, 30), (WIDTH-30, 80)], fill=(50, 50, 200, 255))
    cost = str(card.get('cost', '0'))
    bbox = draw.textbbox((0, 0), cost, font=title_font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    draw.text((WIDTH-55 - w/2, 55 - h/2 - 5), cost, font=title_font, fill=(255, 255, 255, 255))

    # Name
    name = card.get('name', 'Unknown')
    bbox = draw.textbbox((0, 0), name, font=title_font)
    w = bbox[2] - bbox[0]
    draw.text(((WIDTH - w)/2, 100), name, font=title_font, fill=(0, 0, 0, 255))
    
    # Type
    ctype = card.get('type', 'Skill')
    bbox = draw.textbbox((0, 0), ctype, font=small_font)
    w = bbox[2] - bbox[0]
    draw.text(((WIDTH - w)/2, 160), ctype, font=small_font, fill=(100, 100, 100, 255))
    
    # Placeholder Area
    draw.rectangle([(50, 200), (WIDTH-50, 450)], outline=(150, 150, 150), width=2)
    draw.text(((WIDTH)/2 - 50, 310), "插画区域", font=body_font, fill=(200, 200, 200, 255))
    
    # Description
    desc = card.get('description', '')
    y = draw_text_wrapped(draw, desc, body_font, WIDTH-100, 480, color=(0, 0, 0))
    
    # Separator
    draw.line([(50, y + 20), (WIDTH-50, y + 20)], fill=(200, 200, 200), width=1)
    
    # TCM Note
    tcm = card.get('tcm_note', '')
    draw_text_wrapped(draw, tcm, small_font, WIDTH-100, y + 40, color=(100, 60, 0))

    # Save
    filename = f"{card_id}.png"
    img.save(os.path.join(OUTPUT_DIR, filename), dpi=(DPI, DPI))
    return filename

def main():
    print(f"Reading design file from: {DESIGN_FILE}")
    cards = parse_design_file(DESIGN_FILE)
    print(f"Found {len(cards)} cards.")
    
    mapping = {}
    
    # Font path
    font_path = "C:/Windows/Fonts/simhei.ttf"
    if not os.path.exists(font_path):
        font_path = "C:/Windows/Fonts/msyh.ttf"
        if not os.path.exists(font_path):
            font_path = "arial.ttf" 

    for i, card in enumerate(cards):
        card_id = START_ID + i
        print(f"Generating card {card_id}: {card['name']}")
        filename = generate_card_image(card, card_id, font_path)
        
        mapping[card_id] = {
            "name": card['name'],
            "file": filename,
            "type": card.get('type'),
            "cost": card.get('cost')
        }
        
    # Save Mapping
    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    
    print(f"Done! Cards generated in {OUTPUT_DIR}")
    print(f"Mapping saved to {MAPPING_FILE}")

if __name__ == "__main__":
    main()

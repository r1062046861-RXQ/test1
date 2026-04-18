import openpyxl
from PIL import Image, ImageDraw, ImageFont
import os

# Paths
EXCEL_PATH = 'CardMaster.xlsx'
ASSETS_ROOT = os.path.join('public', 'assets')
FOLDERS = {
    'player': os.path.join(ASSETS_ROOT, 'cards_player'),
    'enemy': os.path.join(ASSETS_ROOT, 'cards_enemy'),
    'special': os.path.join(ASSETS_ROOT, 'cards_special')
}

# Ensure folders exist
for folder in FOLDERS.values():
    os.makedirs(folder, exist_ok=True)

def get_color(card_type):
    card_type = str(card_type).lower()
    if 'attack' in card_type:
        return (255, 235, 238) # Red 50
    elif 'skill' in card_type:
        return (227, 242, 253) # Blue 50
    elif 'power' in card_type:
        return (255, 249, 196) # Yellow 100
    elif 'status' in card_type:
        return (243, 229, 245) # Purple 50
    elif 'special' in card_type:
        return (232, 245, 233) # Green 50
    else:
        return (245, 245, 245) # Grey 100

def get_border_color(card_type):
    card_type = str(card_type).lower()
    if 'attack' in card_type:
        return (183, 28, 28) # Red 900
    elif 'skill' in card_type:
        return (13, 71, 161) # Blue 900
    elif 'power' in card_type:
        return (245, 127, 23) # Yellow 900
    elif 'status' in card_type:
        return (74, 20, 140) # Purple 900
    elif 'special' in card_type:
        return (27, 94, 32) # Green 900
    else:
        return (33, 33, 33) # Grey 900

def create_placeholder(filename, idx, name, card_type, folder_path):
    width, height = 400, 600
    bg_color = get_color(card_type)
    border_color = get_border_color(card_type)
    
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw Border
    draw.rectangle([0, 0, width-1, height-1], outline=border_color, width=10)
    
    # Try to load a font, otherwise use default
    try:
        # Windows font path
        font_large = ImageFont.truetype("msyh.ttc", 40)
        font_small = ImageFont.truetype("msyh.ttc", 24)
        font_huge = ImageFont.truetype("arial.ttf", 80)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_huge = ImageFont.load_default()

    # Draw ID
    draw.text((20, 20), str(idx), fill=border_color, font=font_huge)
    
    # Draw Name (Centered)
    # Basic centering logic
    text_bbox = draw.textbbox((0, 0), name, font=font_large)
    text_width = text_bbox[2] - text_bbox[0]
    text_height = text_bbox[3] - text_bbox[1]
    
    draw.text(((width - text_width) / 2, height / 2 - 50), name, fill=border_color, font=font_large)
    
    # Draw Type
    type_text = str(card_type).upper()
    type_bbox = draw.textbbox((0, 0), type_text, font=font_small)
    type_width = type_bbox[2] - type_bbox[0]
    
    draw.text(((width - type_width) / 2, height / 2 + 20), type_text, fill=border_color, font=font_small)

    # Save
    full_path = os.path.join(folder_path, filename)
    img.save(full_path)
    return full_path

def main():
    try:
        wb = openpyxl.load_workbook(EXCEL_PATH)
        ws = wb.active
        
        # Headers are row 1
        # Data starts row 2
        # Columns (0-indexed logic for list, but 1-indexed for openpyxl):
        # A=1: 序号 (Idx)
        # B=2: 名称 (Name)
        # C=3: 占位图名称 (Image Path to be updated)
        # D=4: 功能描述
        # E=5: 出现位置 (Loc)
        # F=6: 类型 (Type)
        
        for row in ws.iter_rows(min_row=2, values_only=False):
            cell_idx = row[0]
            cell_name = row[1]
            cell_img = row[2]
            cell_loc = row[4]
            cell_type = row[5]
            
            if not cell_idx.value:
                continue
                
            idx = cell_idx.value
            name = cell_name.value
            loc = cell_loc.value
            card_type = cell_type.value
            
            # Determine folder
            if loc in ['PlayerDeck', 'Shop', 'Event']:
                target_folder_key = 'player'
                web_folder = '/assets/cards_player'
            elif loc in ['EnemyDeck']:
                target_folder_key = 'enemy'
                web_folder = '/assets/cards_enemy'
            else: # All, Special, etc.
                target_folder_key = 'special'
                web_folder = '/assets/cards_special'
                
            filename = f"{idx}.png"
            target_path = FOLDERS[target_folder_key]
            
            # Create Image
            create_placeholder(filename, idx, name, card_type, target_path)
            
            # Update Excel with Web Path
            web_path = f"{web_folder}/{filename}"
            cell_img.value = web_path
            
            print(f"Generated {filename} for {name} in {target_folder_key}")

        wb.save(EXCEL_PATH)
        print("All assets generated and Excel updated.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()

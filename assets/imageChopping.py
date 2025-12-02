from PIL import Image
import os

# Parameters
input_image = "toChop.png"
start_x = 45
start_y = 128
vignette_width = 85
vignette_height = 83
spacing_x = 129
spacing_y = 125.8
max_cols = 8
output_size = (80, 80)


def mirror_filename(filename):
    """
    Mirror the filename horizontally
    Order: TL(0), TR(1), BR(2), BL(3)
    Horizontal mirror: [0,1,2,3] -> [1,0,3,2]
    """
    name, ext = os.path.splitext(filename)
    if len(name) >= 4:
        # Get the base name (after the row/col prefix if present)
        if '_' in name:
            prefix, base = name.split('_', 1)
            if len(base) >= 4:
                mirrored = base[1] + base[0] + base[3] + base[2] + base[4:]
                return f"{prefix}_m{mirrored}{ext}"
        else:
            mirrored = name[1] + name[0] + name[3] + name[2] + name[4:]
            return f"m{mirrored}{ext}"
    return filename


def rotate_filename(filename):
    """
    Rotate the filename clockwise 90 degrees
    Order: TL(0), TR(1), BR(2), BL(3)
    Clockwise rotation: [0,1,2,3] -> [3,0,1,2]
    """
    name, ext = os.path.splitext(filename)
    if len(name) >= 4:
        # Get the base name (after the row/col prefix if present)
        if '_' in name:
            prefix, base = name.split('_', 1)
            if len(base) >= 4:
                # Clockwise 90°: [0,1,2,3] -> [3,0,1,2]
                rotated = base[3] + base[0] + base[1] + base[2] + base[4:]
                return f"{prefix}_r{rotated}{ext}"
        else:
            rotated = name[3] + name[0] + name[1] + name[2] + name[4:]
            return f"r{rotated}{ext}"
    return filename


def mirror(file_path, output_folder):
    """
    Create a horizontally mirrored image with mirrored filename
    """
    img = Image.open(file_path)
    mirrored_img = img.transpose(Image.FLIP_LEFT_RIGHT)
    
    filename = os.path.basename(file_path)
    new_filename = mirror_filename(filename)
    output_path = os.path.join(output_folder, new_filename)
    
    mirrored_img.save(output_path)
    print(f"  Mirrored: {new_filename}")
    return output_path


def rotate(file_path, output_folder):
    """
    Create a 90-degree clockwise rotated image with rotated filename
    """
    img = Image.open(file_path)
    rotated_img = img.rotate(-90, expand=True)
    
    filename = os.path.basename(file_path)
    new_filename = rotate_filename(filename)
    output_path = os.path.join(output_folder, new_filename)
    
    rotated_img.save(output_path)
    print(f"  Rotated: {new_filename}")
    return output_path


# part 1: 4 axial symmetry, no mirror no rotation
file_names_part1 = [
    # row 1
    ["wwww.png", "rrrr.png", "1111.png", "2222.png", "cccc.png"]
]

# part 2: 2 axial symmetry, - mirror to exhaust
file_names_part2 = [
    # row 2
    ["wrwr.png", "w1w1.png", "w2w2.png", "wcwc.png"],
    # row 3
    ["r1r1.png", "r2r2.png", "rcrc.png", "1212.png", "1c1c.png", "2c2c.png"]
]

# part 3: 1 axial symmetry, -rotate 3 times to exhaust
file_names_part3 = [
    # row 4
    ["wwrr.png", "ww11.png", "ww22.png", "wwcc.png", "rr11.png", "rr22.png", "rrcc.png"],
    # row 5
    ["1122.png", "11cc.png", "22cc.png"],
    # row 6
    ["wwrw.png", "ww1w.png", "ww2w.png", "wwcw.png", "rrwr.png", "rr1r.png", "rr2r.png", "rrcr.png"],
    # row 7
    ["11w1.png", "11r1.png", "1121.png", "11c1.png", "22w2.png", "22r2.png", "2212.png", "22c2.png"],
    # row 8
    ["ccwc.png", "ccrc.png", "cc1c.png", "cc2c.png"],
    # row 9
    ["w1wr.png", "w2wr.png", "wcwr.png", "w2w1.png", "wcw1.png", "wcw2.png"],
    # row 10
    ["r1rw.png", "r2rw.png", "rcrw.png", "r2r1.png", "rcr1.png", "rcr2.png"],
    # row 11
    ["1r1w.png", "121w.png", "1c1w.png", "121r.png", "1c1r.png", "1c12.png"],
    # row 12
    ["2r2w.png", "212w.png", "2c2w.png", "212r.png", "2c2r.png", "2c21.png"],
    # row 13
    ["crcw.png", "c1cw.png", "c2cw.png", "c1cr.png", "c2cr.png", "c2c1.png"]
]

# part 4: no symmetry, -rotate 3 times and each mirror
file_names_part4 = [
    # row 14
    ["wr21.png", "wrc1.png", "wr2c.png", "wc21.png", "cr21.png"],
    # row 15
    ["w2r1.png", "wcr1.png", "w2rc.png", "w2c1.png", "c2r1.png"],
    # row 16
    ["wr12.png", "wr1c.png", "wrc2.png", "wc12.png", "cr12.png"],
    # row 17
    ["ww1r.png", "ww2r.png", "wwcr.png", "ww21.png", "wwc1.png", "wwc2.png"],
    # row 18
    ["rr1w.png", "rr2w.png", "rrcw.png", "rr21.png", "rrc1.png", "rrc2.png"],
    # row 19
    ["11rw.png", "112w.png", "11cw.png", "112r.png", "11cr.png", "11c2.png"],
    # row 20
    ["22rw.png", "221w.png", "22cw.png", "221r.png", "22cr.png", "22c1.png"],
    # row 21
    ["ccrw.png", "cc1w.png", "cc2w.png", "cc1r.png", "cc2r.png", "cc21.png"]
]

# Combine all parts with their folder destinations
all_files = [
    ("part1_4axial", file_names_part1),
    ("part2_2axial", file_names_part2),
    ("part3_1axial", file_names_part3),
    ("part4_nosym", file_names_part4)
]

# Load the source image
img = Image.open(input_image)

# Create output folders
for folder_name, _ in all_files:
    os.makedirs(folder_name, exist_ok=True)

# Process all vignettes
file_index = 0
current_row = 1

for folder_name, rows_list in all_files:
    for row_files in rows_list:
        col = 1
        for file_name in row_files:
            # Calculate position (using 0-based indexing for actual position)
            x = start_x + (col - 1) * spacing_x
            y = start_y + (current_row - 1) * spacing_y
            
            # Crop the vignette
            box = (x, y, x + vignette_width, y + vignette_height)
            vignette = img.crop(box)
            
            # Resize to 80x80
            vignette_resized = vignette.resize(output_size, Image.Resampling.LANCZOS)
            
            # Create numbered filename: row_col_originalname
            numbered_name = f"{current_row:02d}{col:01d}_{file_name}"
            
            # Save to appropriate folder
            output_path = os.path.join(folder_name, numbered_name)
            vignette_resized.save(output_path)
            
            print(f"Created: {output_path} (row {current_row}, col {col})")
            
            col += 1
            file_index += 1
        
        # Move to next row after finishing current row
        current_row += 1

print(f"\nTotal vignettes created: {file_index}")
print(f"Final row: {current_row - 1}")
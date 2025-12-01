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
    Mirror the filename: 1234 becomes 2143
    Swaps positions: [0,1,2,3] -> [1,0,3,2]
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
    Rotate the filename clockwise: 1234 becomes 3142
    Rotates positions: [0,1,2,3] -> [2,0,3,1]
    """
    name, ext = os.path.splitext(filename)
    if len(name) >= 4:
        # Get the base name (after the row/col prefix if present)
        if '_' in name:
            prefix, base = name.split('_', 1)
            if len(base) >= 4:
                rotated = base[2] + base[0] + base[3] + base[1] + base[4:]
                return f"{prefix}_r{rotated}{ext}"
        else:
            rotated = name[2] + name[0] + name[3] + name[1] + name[4:]
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
    ["wrrw.png", "w11w.png", "w22w.png", "wccw.png"],
    # row 3
    ["r11r.png", "r22r.png", "rccr.png", "1221.png", "1cc1.png", "2cc2.png"]
]

# part 3: 1 axial symmetry, -rotate 3 times to exhaust
file_names_part3 = [
    # row 4
    ["wwrr.png", "ww11.png", "ww22.png", "wwcc.png", "rr11.png", "rr22.png", "rrcc.png"],
    # row 5
    ["1122.png", "11cc.png", "22cc.png"],
    # row 6
    ["wwwr.png", "www1.png", "www2.png", "wwwc.png", "rrrw.png", "rrr1.png", "rrr2.png", "rrrc.png"],
    # row 7
    ["111w.png", "111r.png", "1112.png", "111c.png", "222w.png", "222r.png", "2221.png", "222c.png"],
    # row 8
    ["cccw.png", "cccr.png", "ccc1.png", "ccc2.png"],
    # row 9
    ["w1rw.png", "w2rw.png", "wcrw.png", "w21w.png", "wc1w.png", "wc2w.png"],
    # row 10
    ["r1wr.png", "r2wr.png", "rcwr.png", "r21r.png", "rc1r.png", "rc2r.png"],
    # row 11
    ["1rw1.png", "12w1.png", "1cw1.png", "12r1.png", "1cr1.png", "1c21.png"],
    # row 12
    ["2rw2.png", "21w2.png", "2cw2.png", "21r2.png", "2cr2.png", "2c12.png"],
    # row 13
    ["crwc.png", "c1wc.png", "c2wc.png", "c1rc.png", "c2rc.png", "c21c.png"]
]

# part 4: no symmetry, -rotate 3 times and each mirror
file_names_part4 = [
    # row 14
    ["wr12.png", "wr1c.png", "wrc2.png", "wc12.png", "cr12.png"],
    # row 15
    ["w21r.png", "wc1r.png", "w2cr.png", "w21c.png", "c21r.png"],
    # row 16
    ["wr21.png", "wrc1.png", "wr2c.png", "wc21.png", "cr21.png"],
    # row 17
    ["wwr1.png", "wwr2.png", "wwrc.png", "ww12.png", "ww1c.png", "ww2c.png"],
    # row 18
    ["rrw1.png", "rrw2.png", "rrwc.png", "rr12.png", "rr1c.png", "rr2c.png"],
    # row 19
    ["11wr.png", "11w2.png", "11wc.png", "11r2.png", "11rc.png", "112c.png"],
    # row 20
    ["22wr.png", "22w1.png", "22wc.png", "22r1.png", "22rc.png", "221c.png"],
    # row 21
    ["ccwr.png", "ccw1.png", "ccw2.png", "ccr1.png", "ccr2.png", "cc12.png"]
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
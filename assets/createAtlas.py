from PIL import Image
import os

# Character to quinary digit mapping
CHAR_TO_DIGIT = {'w': 0, 'r': 1, '1': 2, '2': 3, 'c': 4}
DIGIT_TO_CHAR = {0: 'w', 1: 'r', 2: '1', 3: '2', 4: 'c'}

# Image settings
tile_size = 80
atlas_size = 25
atlas_width = atlas_size * tile_size  # 2000
atlas_height = atlas_size * tile_size  # 2000

# Directories containing the base patterns
folders = ["part1_4axial", "part2_2axial", "part3_1axial", "part4_nosym"]


def pattern_to_position(pattern):
    """
    Convert a 4-character pattern to (x, y) position in the atlas
    First 2 chars determine x position (0-24)
    Last 2 chars determine y position (0-24)
    """
    if len(pattern) != 4:
        return None
    
    # Convert to quinary
    x = CHAR_TO_DIGIT.get(pattern[0], 0) * 5 + CHAR_TO_DIGIT.get(pattern[1], 0)
    y = CHAR_TO_DIGIT.get(pattern[2], 0) * 5 + CHAR_TO_DIGIT.get(pattern[3], 0)
    
    return (x, y)


def rotate_pattern(pattern):
    """
    Rotate pattern clockwise 90 degrees
    Order: TL(0), TR(1), BR(2), BL(3)
    Clockwise rotation: [0,1,2,3] -> [3,0,1,2]
    """
    if len(pattern) != 4:
        return pattern
    return pattern[3] + pattern[0] + pattern[1] + pattern[2]


def mirror_pattern(pattern):
    """
    Mirror pattern horizontally
    Order: TL(0), TR(1), BR(2), BL(3)
    Horizontal mirror: [0,1,2,3] -> [1,0,3,2]
    """
    if len(pattern) != 4:
        return pattern
    return pattern[1] + pattern[0] + pattern[3] + pattern[2]


def rotate_image(img):
    """Rotate image 90 degrees clockwise"""
    return img.rotate(-90, expand=True)


def mirror_image(img):
    """Mirror image horizontally"""
    return img.transpose(Image.FLIP_LEFT_RIGHT)


def extract_pattern_from_filename(filename):
    """Extract the 4-character pattern from filename"""
    # Remove extension
    name = filename.replace('.png', '')
    # Remove prefix (like 011_)
    if '_' in name:
        name = name.split('_', 1)[1]
    # Remove 'm' or 'r' prefix only if it's a single prefix character
    # (not part of the actual pattern)
    # Don't remove if the pattern naturally starts with 'r' (like rr1w, r1rw, etc.)
    # The prefix would be followed by a different character pattern
    # Just return the first 4 characters as the pattern
    return name[:4] if len(name) >= 4 else None


def generate_all_patterns():
    """
    Generate all 625 patterns by rotating and mirroring the base patterns
    Returns a dict mapping pattern string to PIL Image
    """
    pattern_images = {}
    
    # Part 1: 4 axial symmetry - no rotation, no mirror (1 pattern each)
    folder = "part1_4axial"
    part1_count = 0
    part1_failed = []
    if os.path.exists(folder):
        files_found = [f for f in os.listdir(folder) if f.endswith('.png')]
        part1_expected = len(files_found) * 1  # 1 pattern each
        
        for filename in files_found:
            if not filename.endswith('.png'):
                continue
            
            filepath = os.path.join(folder, filename)
            if not os.path.exists(filepath):
                part1_failed.append(f"File not found: {filepath}")
                continue
            
            base_pattern = extract_pattern_from_filename(filename)
            if not base_pattern:
                part1_failed.append(f"Could not extract pattern from {filename}")
                continue
            
            try:
                base_img = Image.open(filepath)
                pattern_images[base_pattern] = base_img.copy()
                part1_count += 1
            except Exception as e:
                part1_failed.append(f"Could not open {filepath}: {e}")
    
    print(f"\nPart 1: {part1_count}/{part1_expected} patterns generated")
    if part1_failed:
        print(f"Part 1 FAILURES ({len(part1_failed)}):")
        for err in part1_failed:
            print(f"  - {err}")
    
    # Part 2: 2 axial symmetry - rotate 90° once (2 patterns each: 0° and 90°)
    folder = "part2_2axial"
    part2_count = 0
    part2_failed = []
    part2_duplicates = []
    if os.path.exists(folder):
        files_found = [f for f in os.listdir(folder) if f.endswith('.png')]
        part2_expected = len(files_found) * 2  # 2 patterns each
        
        for filename in files_found:
            if not filename.endswith('.png'):
                continue
            
            filepath = os.path.join(folder, filename)
            if not os.path.exists(filepath):
                part2_failed.append(f"File not found: {filepath}")
                continue
            
            base_pattern = extract_pattern_from_filename(filename)
            if not base_pattern:
                part2_failed.append(f"Could not extract pattern from {filename}")
                continue
            
            try:
                base_img = Image.open(filepath)
                
                # Original (0°)
                if base_pattern in pattern_images:
                    part2_duplicates.append(f"{base_pattern} (0° from {filename})")
                else:
                    pattern_images[base_pattern] = base_img.copy()
                    part2_count += 1
                
                # Rotate 90° once
                rotated_img = rotate_image(base_img)
                rotated_pattern = rotate_pattern(base_pattern)
                if rotated_pattern in pattern_images:
                    part2_duplicates.append(f"{rotated_pattern} (90° from {filename})")
                else:
                    pattern_images[rotated_pattern] = rotated_img.copy()
                    part2_count += 1
                
            except Exception as e:
                part2_failed.append(f"Could not open {filepath}: {e}")
    
    print(f"\nPart 2: {part2_count}/{part2_expected} patterns generated")
    if part2_failed:
        print(f"Part 2 FAILURES ({len(part2_failed)}):")
        for err in part2_failed:
            print(f"  - {err}")
    if part2_duplicates:
        print(f"Part 2 DUPLICATES ({len(part2_duplicates)}):")
        for dup in part2_duplicates:
            print(f"  - {dup}")
    
    # Part 3: 1 axial symmetry - rotate 3 times (4 patterns each)
    folder = "part3_1axial"
    part3_count = 0
    part3_failed = []
    part3_duplicates = []
    if os.path.exists(folder):
        files_found = [f for f in os.listdir(folder) if f.endswith('.png')]
        part3_expected = len(files_found) * 4  # 4 patterns each
        
        for filename in files_found:
            if not filename.endswith('.png'):
                continue
            
            filepath = os.path.join(folder, filename)
            if not os.path.exists(filepath):
                part3_failed.append(f"File not found: {filepath}")
                continue
            
            base_pattern = extract_pattern_from_filename(filename)
            if not base_pattern:
                part3_failed.append(f"Could not extract pattern from {filename}")
                continue
            
            try:
                base_img = Image.open(filepath)
                
                current_img = base_img.copy()
                current_pattern = base_pattern
                
                # Rotate 4 times (0°, 90°, 180°, 270°)
                for rotation in range(4):
                    if current_pattern not in pattern_images:
                        pattern_images[current_pattern] = current_img.copy()
                        part3_count += 1
                    else:
                        part3_duplicates.append(f"{current_pattern} ({rotation*90}° from {filename})")
                    
                    if rotation < 3:
                        current_img = rotate_image(current_img)
                        current_pattern = rotate_pattern(current_pattern)
                
            except Exception as e:
                part3_failed.append(f"Could not open {filepath}: {e}")
    
    print(f"\nPart 3: {part3_count}/{part3_expected} patterns generated")
    if part3_failed:
        print(f"Part 3 FAILURES ({len(part3_failed)}):")
        for err in part3_failed:
            print(f"  - {err}")
    if part3_duplicates:
        print(f"Part 3 DUPLICATES ({len(part3_duplicates)}):")
        for dup in part3_duplicates:
            print(f"  - {dup}")
    
    # Part 4: no symmetry - rotate 3 times and mirror each (8 patterns each)
    folder = "part4_nosym"
    part4_count = 0
    part4_failed = []
    part4_duplicates = []
    if os.path.exists(folder):
        files_found = [f for f in os.listdir(folder) if f.endswith('.png')]
        part4_expected = len(files_found) * 8  # 8 patterns each
        
        for filename in files_found:
            if not filename.endswith('.png'):
                continue
            
            filepath = os.path.join(folder, filename)
            if not os.path.exists(filepath):
                part4_failed.append(f"File not found: {filepath}")
                continue
            
            base_pattern = extract_pattern_from_filename(filename)
            if not base_pattern:
                part4_failed.append(f"Could not extract pattern from {filename}")
                continue
            
            try:
                base_img = Image.open(filepath)
                
                current_img = base_img.copy()
                current_pattern = base_pattern
                
                # Rotate 4 times (0°, 90°, 180°, 270°)
                for rotation in range(4):
                    # Original rotation
                    if current_pattern not in pattern_images:
                        pattern_images[current_pattern] = current_img.copy()
                        part4_count += 1
                    else:
                        part4_duplicates.append(f"{current_pattern} ({rotation*90}° from {filename})")
                    
                    # Mirrored rotation
                    mirrored_pattern = mirror_pattern(current_pattern)
                    mirrored_img = mirror_image(current_img)
                    if mirrored_pattern not in pattern_images:
                        pattern_images[mirrored_pattern] = mirrored_img.copy()
                        part4_count += 1
                    else:
                        part4_duplicates.append(f"{mirrored_pattern} ({rotation*90}°+mirror from {filename})")
                    
                    if rotation < 3:
                        current_img = rotate_image(current_img)
                        current_pattern = rotate_pattern(current_pattern)
                
            except Exception as e:
                part4_failed.append(f"Could not open {filepath}: {e}")
    
    print(f"\nPart 4: {part4_count}/{part4_expected} patterns generated")
    if part4_failed:
        print(f"Part 4 FAILURES ({len(part4_failed)}):")
        for err in part4_failed:
            print(f"  - {err}")
    if part4_duplicates:
        print(f"Part 4 DUPLICATES ({len(part4_duplicates)}):")
        for dup in part4_duplicates:
            print(f"  - {dup}")
    
    return pattern_images


def create_atlas(pattern_images):
    """
    Create a 25x25 atlas of all patterns
    """
    atlas = Image.new('RGBA', (atlas_width, atlas_height), (255, 255, 255, 0))
    
    placed_count = 0
    missing_patterns = []
    
    # Generate all possible patterns
    for first_digit in range(5):
        for second_digit in range(5):
            for third_digit in range(5):
                for fourth_digit in range(5):
                    pattern = (DIGIT_TO_CHAR[first_digit] + 
                              DIGIT_TO_CHAR[second_digit] + 
                              DIGIT_TO_CHAR[third_digit] + 
                              DIGIT_TO_CHAR[fourth_digit])
                    
                    x, y = pattern_to_position(pattern)
                    
                    if pattern in pattern_images:
                        img = pattern_images[pattern]
                        # Ensure image is 80x80
                        if img.size != (tile_size, tile_size):
                            img = img.resize((tile_size, tile_size), Image.Resampling.LANCZOS)
                        
                        atlas.paste(img, (x * tile_size, y * tile_size))
                        placed_count += 1
                    else:
                        missing_patterns.append(pattern)
    
    print(f"\nAtlas created: {placed_count}/625 patterns placed")
    if missing_patterns:
        print(f"\nMissing {len(missing_patterns)} patterns:")
        for pattern in missing_patterns:
            print(f"  {pattern}")
    
    return atlas


# Main execution
print("Generating all patterns...")
pattern_images = generate_all_patterns()
print(f"\nTotal unique patterns generated: {len(pattern_images)}")

print("\nCreating atlas...")
atlas = create_atlas(pattern_images)

output_file = "pattern_atlas.png"
atlas.save(output_file)
print(f"\nAtlas saved to {output_file}")
print(f"Atlas size: {atlas_width}x{atlas_height} pixels")

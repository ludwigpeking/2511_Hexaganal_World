# Quick Start Guide

## Getting Started in 3 Steps

### Step 1: Open the Application

1. Navigate to the project folder
2. Open `index.html` in your web browser
3. You'll see the main menu with parameter inputs

### Step 2: Generate Your First Map

1. Keep the default parameters (recommended for first try):
    - Hex Grid Diameter: 40
    - Hex Ring Count: 10
    - Random Seed: 0
    - Relaxation Iterations: 500
    - Relaxation Strength: 0.08
2. Click the **"Generate Map"** button
3. Wait a moment for generation to complete
4. Your quadrangulated map will appear!

### Step 3: Save or Export

-   Click **"Save Map"** to download the JSON file
-   Click **"Export Image"** to download a PNG image
-   Click **"Back to Menu"** to generate another map

## Your First Experiments

### Try Different Seeds

-   Change "Random Seed" to any number (e.g., 1, 42, 999)
-   Keep other parameters the same
-   Generate and see different patterns!

### Adjust the Size

-   Increase "Hex Ring Count" to 15 for a larger map
-   Or decrease to 5 for a smaller, faster map
-   Note: Larger maps take longer to generate

### Fine-tune Smoothness

-   Increase "Relaxation Iterations" to 1000 for smoother quads
-   Or decrease to 200 for a quicker, rougher result
-   Balance between quality and speed

## Understanding the Output

### Visual Display

-   **Quad tiles**: Each quadrilateral with visible edges
-   **Statistics**: Top-left corner shows totals
-   **Cross marks**: Inside each quad showing structure

### JSON File Structure

```json
{
  "params": { ... },  // Your generation parameters
  "tiles": [          // Array of all quad tiles
    {
      "id": 0,        // Unique tile identifier
      "vertices": [], // 4 corner points
      "center": {},   // Center point (x, y)
      "neighbors": [],// Adjacent tile IDs
      "area": 0       // Tile area
    }
  ]
}
```

## Common Tasks

### Generate Multiple Maps

1. Generate a map
2. Save it with a memorable name
3. Click "Back to Menu"
4. Change parameters or seed
5. Generate again
6. Repeat as needed

### Compare Different Parameters

1. Generate with seed=0, rings=10, iterations=500
2. Save as `map_smooth.json`
3. Back to menu
4. Change iterations to 200
5. Generate with same seed and rings
6. Save as `map_rough.json`
7. Load each to compare

### Create a Collection

Try these interesting combinations:

**Smooth Small Map**

-   Seed: 0
-   Rings: 5
-   Iterations: 1000

**Large Detailed Map**

-   Seed: 42
-   Rings: 15
-   Iterations: 800

**Quick Test Map**

-   Seed: 123
-   Rings: 7
-   Iterations: 100

**Organic Look**

-   Seed: 777
-   Rings: 12
-   Iterations: 600
-   Strength: 0.12

## Troubleshooting

### Generation Takes Too Long

-   **Solution**: Reduce "Relaxation Iterations" or "Hex Ring Count"
-   Try: rings=5, iterations=200 for fast results

### Map Looks Messy

-   **Solution**: Increase "Relaxation Iterations"
-   Try: iterations=1000 for smoother results

### Can't Load JSON File

-   **Ensure**: File is valid JSON format
-   **Check**: File was saved from this generator
-   **Verify**: File isn't corrupted

### Nothing Happens When Clicking Generate

-   **Check**: Browser console for errors (F12)
-   **Refresh**: The page and try again
-   **Verify**: All parameters are valid numbers

## Next Steps

1. **Read the Full Guide**: See `MAP_GENERATOR_GUIDE.md`
2. **Explore Examples**: Check `examples/USAGE_EXAMPLES.md`
3. **Review Changes**: See `CHANGES.md` for technical details
4. **Experiment**: Try different parameter combinations
5. **Use the Data**: Import JSON into your projects

## Tips for Success

✅ **Start Simple**: Use default values first  
✅ **Save Often**: Keep interesting maps  
✅ **Name Files**: Use descriptive names for JSON files  
✅ **Document Settings**: Note which parameters made good maps  
✅ **Iterate**: Try small changes to see effects  
✅ **Be Patient**: Large maps with many iterations take time

## Quick Reference

| Parameter  | Low  | Default | High |
| ---------- | ---- | ------- | ---- |
| Diameter   | 20   | 40      | 80   |
| Rings      | 3    | 10      | 20   |
| Seed       | 0    | 0       | 9999 |
| Iterations | 100  | 500     | 2000 |
| Strength   | 0.02 | 0.08    | 0.15 |

**Processing Time**:

-   Small (rings≤5): ~1 second
-   Medium (rings≤10): ~2-5 seconds
-   Large (rings≤15): ~5-15 seconds
-   Very Large (rings>15): ~15+ seconds

_Times vary based on iterations and hardware_

---

**Ready to create amazing quadrangulated maps! 🎨**

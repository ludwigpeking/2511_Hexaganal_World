# Quick Reference Card

## 🎮 Controls

### Main Menu

-   **Generate Map** - Create new quadrangulated map
-   **Load Map** - Import previously saved JSON file

### Result Screen

-   **Save Map** - Export map as JSON file
-   **Export Image** - Save visual as PNG
-   **Back to Menu** - Return to generate another map

## ⚙️ Parameters

| Parameter             | Range     | Default | Effect            |
| --------------------- | --------- | ------- | ----------------- |
| Hex Grid Diameter     | 20-80     | 40      | Cell size         |
| Hex Ring Count        | 3-20      | 10      | Map size          |
| Random Seed           | 0-9999    | 0       | Pattern variation |
| Relaxation Iterations | 100-2000  | 500     | Smoothness        |
| Relaxation Strength   | 0.02-0.15 | 0.08    | Convergence speed |

## 📊 Presets

### Quick Test

```
Diameter: 40
Rings: 5
Seed: 0
Iterations: 100
Strength: 0.08
→ Generation: ~1 second
```

### Balanced Default

```
Diameter: 40
Rings: 10
Seed: 0
Iterations: 500
Strength: 0.08
→ Generation: ~3 seconds
```

### Large Smooth

```
Diameter: 40
Rings: 15
Seed: 0
Iterations: 1000
Strength: 0.05
→ Generation: ~10 seconds
```

### Organic Look

```
Diameter: 50
Rings: 12
Seed: 777
Iterations: 600
Strength: 0.12
→ Generation: ~5 seconds
```

## 📁 Files

### Your Files

-   **index.html** - Main map generator
-   **viewer.html** - Standalone map viewer
-   **sketch.js** - Main generation logic
-   **classes.js** - Vertex and Face classes
-   **utils.js** - Helper functions

### Documentation

-   **QUICK_START.md** - 3-step tutorial
-   **MAP_GENERATOR_GUIDE.md** - Complete guide
-   **CHANGES.md** - Technical details
-   **examples/USAGE_EXAMPLES.md** - Code examples
-   **PROJECT_SUMMARY.md** - Overview

### Backup

-   **sketch_backup.js** - Original file backup

## 💾 Data Structure

```json
{
  "params": {
    "hexGridDiameter": 40,
    "hexRingCount": 10,
    "randomSeed": 0,
    "relaxationIterations": 500,
    "relaxationStrength": 0.08
  },
  "tiles": [
    {
      "id": 0,
      "vertices": [{x, y, index}, ...],
      "center": {x, y},
      "neighbors": [ids...],
      "area": number
    }
  ]
}
```

## 🔗 Tile Properties

-   **id**: Unique identifier (0 to n-1)
-   **vertices**: Array of 4 corner points
-   **center**: Centroid coordinates
-   **neighbors**: Adjacent tile IDs (share edge)
-   **area**: Tile area in pixels²

## 🛠️ Common Tasks

### Generate Multiple Maps

1. Generate → Save → Back to Menu → Repeat

### Compare Parameters

1. Generate with params A → Save as "mapA.json"
2. Change one parameter → Generate → Save as "mapB.json"
3. Load each in viewer to compare

### Find Best Seed

1. Keep all params same
2. Try seeds: 0, 42, 123, 777, 999, etc.
3. Save your favorites

## 📈 Performance Tips

-   **Faster**: Lower rings, fewer iterations
-   **Smoother**: More iterations, lower strength
-   **Larger**: More rings (exponential growth)
-   **Varied**: Different seeds

## 🐛 Troubleshooting

| Issue        | Solution                   |
| ------------ | -------------------------- |
| Too slow     | Reduce rings or iterations |
| Too rough    | Increase iterations        |
| No variety   | Try different seeds        |
| Can't load   | Verify JSON file           |
| Blank canvas | Check browser console      |

## 📞 Getting Help

1. Check **QUICK_START.md**
2. Read **MAP_GENERATOR_GUIDE.md**
3. Review **examples/USAGE_EXAMPLES.md**
4. Inspect browser console (F12)
5. Try default parameters

## 🎯 Use Cases

✅ Game map generation  
✅ Procedural content  
✅ Mesh research  
✅ Pathfinding grids  
✅ Territory systems  
✅ Visual art  
✅ Educational tool

## ⌨️ Keyboard Shortcuts

(None currently - all mouse/button driven)

## 🌐 Browser Compatibility

✅ Chrome / Edge (Chromium)  
✅ Firefox  
✅ Safari  
❌ Internet Explorer

## 📦 Export Formats

### JSON

-   Complete tile data
-   All parameters
-   Topology information
-   Use in any language

### PNG

-   Visual representation
-   800x800 pixels
-   For documentation
-   Quick sharing

## 💡 Pro Tips

1. **Name your files** descriptively
2. **Document good seeds** in notes
3. **Start with defaults** first time
4. **Save before experimenting** with new params
5. **Use viewer.html** for analysis
6. **Try small values** for quick tests

## 🎨 Seed Library

Try these interesting seeds:

-   **0** - Classic baseline
-   **42** - Dense organic
-   **123** - Regular pattern
-   **777** - Flowing lines
-   **999** - Clustered
-   **1337** - Balanced
-   **2048** - Sharp corners
-   **9999** - Extreme variation

## 📊 Statistics Shown

**In Generator:**

-   Total Quads
-   Total Vertices
-   Average Area

**In Viewer:**

-   All of above plus:
-   Min/Max Area
-   Average Neighbors
-   Selected tile details

## 🚀 Quick Workflow

```
1. Open index.html
2. Adjust params (optional)
3. Click "Generate Map"
4. Click "Save Map"
5. Click "Back to Menu"
6. Repeat or load saved map
```

## 📝 File Naming

Generated files use format:

```
quadmap_seed{SEED}_ring{RINGS}_{TIMESTAMP}.json
```

Example:

```
quadmap_seed0_ring10_1730851234567.json
```

---

**Keep this card handy for quick reference!**

_Last updated: November 6, 2025_

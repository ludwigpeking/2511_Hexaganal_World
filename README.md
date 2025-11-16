# Quadrangulized Map Generator

A powerful tool for generating procedural quadrangulated (quad-based) maps from hexagonal grids using Lloyd's relaxation algorithm. Originally inspired by the grid system used in Oskar Stålberg's game Townscaper, this generator has been transformed into a complete map creation and export system.

## 🎯 Features

-   **Interactive Parameter Controls**: Customize map generation with intuitive UI
-   **Batch Processing**: Generate maps instantly without watching animation
-   **Save/Load System**: Export and import maps as JSON files
-   **Image Export**: Save visual representations as PNG
-   **Complete Tile Data**: Access vertices, centers, neighbors, and areas
-   **Reproducible Results**: Same seed produces identical maps
-   **Standalone Viewer**: Separate HTML viewer for analyzing saved maps

## 🚀 Quick Start

1. **Open** `index.html` in your web browser
2. **Adjust** parameters (or use defaults)
3. **Click** "Generate Map"
4. **Save** your map as JSON or export as PNG
5. **Use** the data in your projects!

For detailed instructions, see **[QUICK_START.md](QUICK_START.md)**

## 📖 Documentation

-   **[QUICK_START.md](QUICK_START.md)** - Get started in 3 easy steps
-   **[MAP_GENERATOR_GUIDE.md](MAP_GENERATOR_GUIDE.md)** - Complete user guide
-   **[CHANGES.md](CHANGES.md)** - Technical changes and implementation details
-   **[examples/USAGE_EXAMPLES.md](examples/USAGE_EXAMPLES.md)** - Code examples for using the data

## 🎮 Try It Out

### Generate Your First Map

Open `quadrangulizedMapGenerator.html` and click "Generate Map" with default settings.

### View Existing Maps

Open `viewer.html` to load and analyze saved JSON maps.

## 🔧 Parameters

| Parameter             | Default | Description                  |
| --------------------- | ------- | ---------------------------- |
| Hex Grid Diameter     | 40      | Size of hexagonal cells      |
| Hex Ring Count        | 10      | Number of rings from center  |
| Random Seed           | 0       | Seed for reproducibility     |
| Relaxation Iterations | 500     | Smoothness iterations        |
| Relaxation Strength   | 0.08    | Movement speed per iteration |

## 📦 Map Data Structure

Generated maps contain complete topology information including vertex neighbor relationships:

```json
{
  "params": { ... },
  "tiles": [
    {
      "id": 0,
      "vertices": [{"x": 400, "y": 300, "index": 0}, ...],
      "center": {"x": 407.5, "y": 312.5},
      "neighbors": [1, 2, 5],
      "area": 325.5
    }
  ],
  "vertices": [
    {
      "x": 400,
      "y": 300,
      "index": 0,
      "neighbors": [1, 2, 3, 4],
      "adjacentFaces": [0, 1, 2]
    }
  ]
}
```

### Vertex Information

Each vertex includes:

-   **Position** (`x`, `y`): Coordinates in the map
-   **Index**: Unique identifier
-   **Neighbors**: Indices of connected vertices (sharing an edge)
-   **Adjacent Faces**: Indices of tiles this vertex belongs to

## 💡 Use Cases

-   **Game Development**: Procedural map generation for strategy games
-   **Mesh Research**: Study quadrilateral mesh properties
-   **Urban Planning**: Base grids for city layouts
-   **Data Visualization**: Unique grid structures
-   **Generative Art**: Creative quadrangulation patterns

## 🛠️ Technical Details

### Algorithm

-   Creates hexagonal grid from center
-   Merges triangles into quads
-   Subdivides mesh for detail
-   Applies Lloyd's relaxation
-   Calculates topology (neighbors, areas)

### Technologies

-   **p5.js** for rendering and UI
-   **JavaScript** for logic
-   **JSON** for data export
-   **Canvas** for visualization

## 📸 Examples

![Quadangulation Example](results/frame_0.png)
_Initial hexagonal grid_

![Quadangulation Example](results/frame_5.png)
_Early relaxation_

![Quadangulation Example](results/frame_20.png)
_Progressive smoothing_

![Quadangulation Example](results/frame_101.png)
_Converged quad mesh_

![Quadangulation Example](results/download.png)
_Final quadrangulated result_

## 🎯 Credits

Originally inspired by Oskar Stålberg's Townscaper grid system. Transformed into a complete map generation tool with save/load functionality and data export capabilities.

## 📄 License

This project is open source. Feel free to use, modify, and distribute.

## 🔗 Links

-   **Repository**: [quadangulation](https://github.com/ludwigpeking/quadangulation)
-   **Documentation**: See docs in this repository
-   **Issues**: Report bugs via GitHub issues

---

**Version 2.0** - Complete Map Generator System  
**Last Updated**: November 6, 2025

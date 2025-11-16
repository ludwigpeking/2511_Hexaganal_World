# Quadrangulized Map Generator Guide

## Overview

This tool generates quadrangulated (quad-based) maps from hexagonal grids with relaxation algorithms. Maps can be saved, loaded, and exported as images.

## Features

-   **Generate Maps**: Create new quadrangulated maps with customizable parameters
-   **Save Maps**: Export maps as JSON files containing complete tile data
-   **Load Maps**: Import previously generated maps
-   **Export Images**: Save visual representations as PNG files

## Parameters

### Hex Grid Diameter

-   **Default**: 40
-   **Description**: The size of each hexagonal cell in pixels
-   **Range**: 10-100 recommended

### Hex Ring Count

-   **Default**: 10
-   **Description**: Number of hexagonal rings from center
-   **Range**: 3-20 recommended
-   **Note**: Higher values create more tiles but increase generation time

### Random Seed

-   **Default**: 0
-   **Description**: Seed for random number generation
-   **Use**: Same seed with same parameters produces identical results

### Relaxation Iterations

-   **Default**: 500
-   **Description**: Number of times to apply the relaxation algorithm
-   **Range**: 100-1000 recommended
-   **Note**: More iterations = smoother quads but longer generation time

### Relaxation Strength

-   **Default**: 0.08
-   **Description**: How much vertices move toward centroids each iteration
-   **Range**: 0.01-0.2 recommended
-   **Note**: Higher values converge faster but may be less stable

## Map Data Structure

Generated maps are saved as JSON with the following structure:

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
            "vertices": [
                { "x": 400, "y": 300, "index": 0 },
                { "x": 420, "y": 310, "index": 1 },
                { "x": 415, "y": 325, "index": 2 },
                { "x": 395, "y": 315, "index": 3 }
            ],
            "center": { "x": 407.5, "y": 312.5 },
            "neighbors": [1, 2, 5],
            "area": 325.5
        }
        // ... more tiles
    ]
}
```

### Tile Properties

-   **id**: Unique tile identifier
-   **vertices**: Array of 4 vertices (quadrilateral)
    -   `x, y`: Position coordinates
    -   `index`: Global vertex index
-   **center**: Centroid coordinates of the tile
-   **neighbors**: Array of adjacent tile IDs (shares edges)
-   **area**: Area of the tile in pixels²

## Usage Workflow

1. **Start the Application**

    - Open `index.html` in a web browser

2. **Generate a New Map**

    - Adjust parameters as needed
    - Click "Generate Map"
    - Wait for generation to complete

3. **View Results**

    - See the generated quadrangulated mesh
    - Check statistics (total quads, vertices, average area)

4. **Save the Map**

    - Click "Save Map"
    - JSON file downloads automatically
    - Filename format: `quadmap_seed{seed}_ring{rings}_{timestamp}.json`

5. **Load Existing Map**

    - Click "Load Map" from menu
    - Select a JSON file
    - Map reconstructs and displays

6. **Export Image**
    - Click "Export Image" from result screen
    - PNG file downloads as `quadmap_result.png`

## Tips for Best Results

-   **Balanced Parameters**: Start with defaults and adjust incrementally
-   **Higher Ring Counts**: Require more iterations for good relaxation
-   **Seed Exploration**: Try different seeds for variety
-   **Strength vs Iterations**: Lower strength + more iterations = smoother results

## Use Cases

-   **Game Development**: Procedural map generation
-   **Mesh Research**: Quadrilateral mesh studies
-   **Visualization**: Demonstrating relaxation algorithms
-   **Data Export**: Use JSON data in other applications

## Technical Notes

-   The generation process uses Lloyd's relaxation algorithm
-   Vertices move toward weighted centroids of adjacent faces
-   Edge vertices are marked as "edgy" and don't move
-   Neighbor detection is based on shared edges (2+ vertices)
